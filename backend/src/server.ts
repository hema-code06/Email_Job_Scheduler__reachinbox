import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { env } from './config/env'
import authRoutes from './modules/auth/auth.routes'
import senderRoutes from './modules/senders/senders.routes'
import emailRoutes from './modules/emails/emails.routes'
import slackRoutes from './modules/slack/slack.routes'
import { ensureIndex } from './modules/search/emailIndex'
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ExpressAdapter } from '@bull-board/express'
import { emailQueue } from './queue/emailQueue'
import { requireAuth } from './middleware/auth'

ensureIndex().catch(err => console.error('Search setup failed:', err.message))
const app = express()

app.use(cors({ origin: env.FRONTEND_URL, credentials: true }))
app.use(express.json())
app.use(cookieParser())

const boardAdapter = new ExpressAdapter()
boardAdapter.setBasePath('/admin/queues')
createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter: boardAdapter
})
app.use('/admin/queues', requireAuth, boardAdapter.getRouter())

app.use('/api/senders', senderRoutes)
app.use('/api/emails', emailRoutes)
app.use('/api/slack', slackRoutes)

app.get('/health', (_req, res) => res.json({ status: 'ok' }))
app.use('/api/auth', authRoutes)

app.listen(env.PORT, () => console.log(`API on ${env.PORT}`))
