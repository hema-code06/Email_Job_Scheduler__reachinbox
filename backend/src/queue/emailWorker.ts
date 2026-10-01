import { DelayedError, Worker } from 'bullmq'
import { env } from '../config/env'
import { prisma } from '../config/prisma'
import { redis } from '../config/redis'
import { getTransport } from './mailer'
import { checkHourlyLimit } from './rateLimiter'
import { notifySlack } from './slackNotifier'
import { indexEmails } from '../modules/search/emailIndex'

export const emailWorker = new Worker(
  'emails',
  async (job, token) => {
    const { emailId } = job.data as { emailId: string }
    const claimed = await prisma.email.updateMany({
      where: { id: emailId, status: 'SCHEDULED' },
      data: { status: 'PROCESSING' }
    })
    if (claimed.count === 0) return

    const email = await prisma.email.findUniqueOrThrow({
      where: { id: emailId },
      include: { sender: true }
    })

    const limit = Math.min(
      email.hourlyLimit,
      env.MAX_EMAILS_PER_HOUR_PER_SENDER
    )
    const rate = await checkHourlyLimit(email.senderId, limit)

    if (!rate.allowed) {
      await prisma.email.update({
        where: { id: emailId },
        data: { status: 'SCHEDULED', scheduledAt: new Date(rate.retryAt) }
      })
      await indexEmails([emailId])

      const firstHit = await redis.set(
        `rl:notified:${email.senderId}:${rate.retryAt}`,
        '1',
        'EX',
        7200,
        'NX'
      )
      if (firstHit) {
        await notifySlack(
          email.userId,
          `Hourly limit (${limit}) reached for ${
            email.sender.email
          }. Pending emails rescheduled to ${new Date(
            rate.retryAt
          ).toISOString()}.`
        )
      }

      await job.moveToDelayed(rate.retryAt, token)
      throw new DelayedError()
    }

    try {
      await getTransport(email.sender).sendMail({
        from: email.sender.email,
        to: email.toEmail,
        subject: email.subject,
        html: email.body
      })
      await prisma.email.update({
        where: { id: emailId },
        data: { status: 'SENT', sentAt: new Date() }
      })
    } catch (err) {
      await prisma.email.update({
        where: { id: emailId },
        data: { status: 'FAILED', error: String(err), sentAt: new Date() }
      })
    }
    await indexEmails([emailId])
  },
  {
    connection: redis,
    concurrency: env.WORKER_CONCURRENCY,
    limiter: { max: 1, duration: env.MIN_DELAY_BETWEEN_EMAILS_MS }
  }
)
