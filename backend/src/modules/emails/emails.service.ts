import { randomUUID } from 'crypto'
import { prisma } from '../../config/prisma'
import { emailQueue } from '../../queue/emailQueue'
import { ScheduleInput } from './emails.schema'
import { indexEmails } from '../search/emailIndex'

export async function scheduleEmails (userId: string, input: ScheduleInput) {
  const sender = await prisma.sender.findFirst({
    where: { id: input.senderId, userId }
  })
  if (!sender) return null

  const batchId = randomUUID()
  const recipients = [...new Set(input.recipients)]
  const start = input.startTime.getTime()

  const rows = recipients.map((toEmail, i) => ({
    id: randomUUID(),
    userId,
    senderId: sender.id,
    batchId,
    toEmail,
    subject: input.subject,
    body: input.body,
    scheduledAt: new Date(start + i * input.delaySeconds * 1000),
    delaySeconds: input.delaySeconds,
    hourlyLimit: input.hourlyLimit
  }))

  await prisma.email.createMany({ data: rows })
  await indexEmails(rows.map(r => r.id))
  await emailQueue.addBulk(
    rows.map(r => ({
      name: 'send',
      data: { emailId: r.id },
      opts: {
        jobId: r.id,
        delay: Math.max(r.scheduledAt.getTime() - Date.now(), 0)
      }
    }))
  )

  return { batchId, count: rows.length }
}
