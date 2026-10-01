# Email Job Scheduler

A small, production-style email scheduling service with a React dashboard. Emails are stored in PostgreSQL, scheduled as **BullMQ delayed jobs** on Redis (no cron anywhere), sent through Ethereal SMTP, indexed in Elasticsearch, and monitored from a live Bull Board dashboard. It survives restarts, enforces hourly limits per sender, and posts a Slack message when a limit is hit.

## Features

**Backend**

| Requirement | Implementation |
|---|---|
| Scheduler | BullMQ delayed jobs, no cron |
| Persistence | Redis AOF, Postgres as source of truth, startup reconcile |
| No duplicates | Job id, atomic claim, idempotency key |
| Concurrency | `WORKER_CONCURRENCY` |
| Delay between emails | BullMQ limiter, `MIN_DELAY_BETWEEN_EMAILS_MS` |
| Hourly limit | Redis `INCR` counters per sender per hour, over-limit jobs delayed to the next window |
| Multiple senders | `Sender` table, Ethereal accounts |
| Slack alerts | OAuth v2 flow, live webhook message on limit hit |
| Search | Elasticsearch indexing and search endpoint |
| Queue visibility | Bull Board at `/admin/queues` |

**Frontend**

- Google login, logout, and a header with name, email and avatar
- Scheduled and Sent tabs with live counts, loading, empty and error states
- Compose page with sender picker, CSV or text list upload with detected address count, subject, body, delay, hourly limit, Send Later and Schedule
- Search across both tabs
- Email detail page
- Connect and disconnect Slack from the header

## Tech stack

| Layer | Choice |
|---|---|
| API | Node.js, TypeScript, Express |
| Queue | BullMQ on Redis (AOF persistence enabled) |
| Database | PostgreSQL with Prisma 7 |
| Mail | Nodemailer with Ethereal (fake SMTP) |
| Search | Elasticsearch 8 |
| Auth | Google OAuth 2.0, JWT in an httpOnly cookie |
| Notifications | Slack OAuth v2 with incoming webhooks |
| Queue dashboard | Bull Board |
| Frontend | React, TypeScript, Vite, Tailwind CSS, TanStack Query |
| Infra | Docker Compose (Postgres, Redis, Elasticsearch) |

## Getting started

**Prerequisites:** Node.js 20+, Docker Desktop, a Google account, and a Slack workspace. Elasticsearch needs roughly 1 GB of free memory.

### 1. Start the infrastructure

```bash
docker compose up -d
docker compose ps
```

Postgres (5432), Redis (6379) and Elasticsearch (9200) should all show as running. Redis runs with `--appendonly yes` so delayed jobs are persisted to disk.

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
```

```bash
npx prisma generate
npx prisma migrate deploy
npm run dev
```

### 3. Worker (second terminal)

The worker is a separate process. Emails are only sent while it is running.

```bash
cd backend
npm run dev:worker
```

On startup it prints `Worker ready, reconciled N pending emails`.

### 4. Frontend (third terminal)

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173.

### Production builds

```bash
npm run build         # in backend/ and in frontend/
npm run start         # API
npm run start:worker  # worker
```

## Configuration

### Backend environment variables (`backend/.env`)

| Variable | Description |
|---|---|
| `PORT` | API port (default 4000) |
| `DATABASE_URL` | Postgres URL, e.g. `postgresql://app:app@localhost:5432/scheduler` |
| `REDIS_URL` | Redis URL, e.g. `redis://localhost:6379` |
| `ELASTICSEARCH_URL` | e.g. `http://localhost:9200` |
| `JWT_SECRET` | Random string, 16+ characters |
| `FRONTEND_URL` | e.g. `http://localhost:5173` (CORS origin and redirect target) |
| `WORKER_CONCURRENCY` | Jobs processed in parallel (default 5) |
| `MIN_DELAY_BETWEEN_EMAILS_MS` | Minimum gap between sends (default 2000) |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | Global cap per sender per hour (default 200) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | Google OAuth |
| `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_REDIRECT_URI` | Slack OAuth |


### Frontend environment variables (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend URL, e.g. `http://localhost:4000` |

### Google OAuth

1. In Google Cloud Console, create a project and configure the OAuth consent screen (External). Add your Google account under **Test users**.
2. Create an **OAuth client ID** of type Web application.
3. Add the authorized redirect URI `http://localhost:4000/api/auth/google/callback`.
4. Copy the client ID and secret into `.env`.

The consent screen is in Testing mode, so only listed test users can sign in.

### Slack OAuth

1. Create an app at https://api.slack.com/apps (from scratch).
2. Under **OAuth & Permissions**, add the bot scope `incoming-webhook`.
3. Add the redirect URL from `SLACK_REDIRECT_URI` and save it.
4. Copy the client ID and secret into `.env`.

### Ethereal (fake SMTP)

In **Compose**, click **+ New sender**. The backend creates an Ethereal test account and stores it as a sender. You can also add your own with `POST /api/senders`. To read the delivered mail, open https://ethereal.email/messages and log in with the sender's SMTP credentials (visible in the `Sender` table via `npx prisma studio`). Ethereal accounts expire after a while, so create a new sender if sends start failing with `535 Authentication failed`.

### Queue dashboard

Open http://localhost:4000/admin/queues while logged in to the app (it uses the same session cookie).

## How it works

```
Browser (React)
   |  POST /api/emails/schedule
   v
Express API ──> PostgreSQL (one row per recipient, status SCHEDULED)
   |
   └──> BullMQ delayed job per email (jobId = email id) ──> Redis
                                                              |
                                          Worker process <────┘
                                            1. claim row (SCHEDULED -> PROCESSING)
                                            2. check hourly limit (Redis counter)
                                            3. send via SMTP
                                            4. update row (SENT / FAILED) + index in Elasticsearch
                                            5. on limit hit: delay job + Slack message
```

### Scheduling

`POST /api/emails/schedule` takes a sender, subject, body, recipient list, start time, delay and hourly limit. It removes duplicate recipients, stores one `Email` row per recipient, and spaces them out: `scheduledAt = startTime + index * delaySeconds`. Each email becomes a BullMQ delayed job with `delay = scheduledAt - now`. There is no cron, no polling loop and no scheduler library.

### Persistence and restarts

Two layers protect against restarts:

- Redis runs with AOF persistence, so delayed jobs survive a Redis or machine restart.
- PostgreSQL is the source of truth. When the worker boots, `reconcile()` reads every `SCHEDULED` row and re-adds its job. BullMQ ignores a job whose id already exists, so surviving jobs are untouched and only genuinely missing ones are recreated.

Future emails still go out at the right time, and nothing is restarted from scratch.

### Idempotency (no duplicate sends)

There are three layers:

1. **Job id.** The BullMQ `jobId` is the email's id, so the same email can never be queued twice.
2. **Atomic claim.** Before sending, the worker runs `UPDATE ... SET status='PROCESSING' WHERE id=? AND status='SCHEDULED'`. Only one worker can win that update. A duplicate job finds count 0 and exits.
3. **Request level.** The schedule endpoint accepts an `Idempotency-Key` header. Repeating a request with the same key returns the original result (stored in Redis for 24 hours) without creating anything new. The compose page sends one key per page visit.

### Concurrency and delay between sends

- `WORKER_CONCURRENCY` sets how many jobs run in parallel. Safety under parallelism comes from the atomic claim above and from Redis counters.
- A BullMQ limiter (`max: 1` per `MIN_DELAY_BETWEEN_EMAILS_MS`, default **2 seconds**) enforces a minimum gap between sends. It is stored in Redis, so it holds across multiple workers. It applies to the whole queue, not per sender.

### Hourly rate limit

- Counters live in Redis under `rl:{senderId}:{hourWindow}`, where the window is the UTC clock hour. The worker uses an atomic `INCR` (with a 2-hour expiry), so counts stay correct across multiple workers or instances.
- The effective limit is `min(hourlyLimit from the compose form, MAX_EMAILS_PER_HOUR_PER_SENDER)`.
- When the limit is exceeded, the job is **not dropped or failed**. The row goes back to `SCHEDULED` with `scheduledAt` set to the start of the next hour, and the job is moved there with `moveToDelayed`. It then sends in the next window.

### Slack notification

When a sender hits its limit, the worker posts a message such as:

> Hourly limit (2) reached for someone@ethereal.email. Pending emails rescheduled to 2026-09-30T16:00:00.000Z.

- Users connect Slack through the real OAuth v2 flow. The webhook URL is stored per user.
- A `SET NX` key (`rl:notified:{sender}:{window}`) ensures only the first hit per sender per hour sends a message, even with several workers.
- If Slack is not connected, nothing is sent and nothing breaks. If the user connects later, notifications start working immediately without a redeploy. Disconnecting removes the stored webhook.
- A failed Slack call is logged and never affects email delivery.

### Behavior under load (1000+ emails at once)

All rows go in with one `createMany` and all jobs with one `addBulk`. The worker then sends at most one email per 2 seconds, up to the hourly limit per sender. Everything beyond the limit is pushed to the next hour window instead of being dropped. A batch of N emails with limit L takes about `ceil(N / L)` hours to drain. Order is preserved as far as BullMQ's delayed-job ordering allows (jobs moved to the same window share one timestamp).

### Search

Every email is indexed in Elasticsearch when it is created and again on every status change. The worker also backfills the index on startup. `GET /api/emails/search?q=` runs a multi-field match on recipient, subject and body, filtered to the logged-in user. Indexing errors are logged and never block sending.

## Assumptions, trade-offs and known limitations

- **Not deployed.** It runs locally with Docker Compose. The Google consent screen is in Testing mode, so reviewers should use their own Google credentials.
- **SMTP passwords are stored in plain text.** They belong to throwaway Ethereal accounts. A real system would encrypt them.
- **At-most-once sending.** If a worker is killed between claiming an email and finishing the send, that row stays `PROCESSING` and is not retried. This is deliberate, so an email is never sent twice.
- **No automatic retries.** A failed send is marked `FAILED` with the error saved.
- **The hourly window is a fixed UTC clock hour**, not a rolling window. The counter is per sender, so two batches from the same sender with different hourly limits share one counter.
- **The effective gap between sends** is the larger of the compose form's delay and `MIN_DELAY_BETWEEN_EMAILS_MS`.
- **Bull Board** is visible to any logged-in user, which is fine for a demo but not for production.
- **Plain-text bodies.** The Figma's rich-text toolbar, attachments, star icons and email and password login fields are not implemented. Login is Google only, as the requirements specify.
- **No pagination.** The tables load every email for the user, and search returns at most 50 results.
  
---
