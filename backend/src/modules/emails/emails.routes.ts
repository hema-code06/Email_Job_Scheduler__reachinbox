import { Router } from 'express'
import { prisma } from '../../config/prisma'
import { AuthRequest, requireAuth } from '../../middleware/auth'
import { scheduleSchema } from './emails.schema'
import { scheduleEmails } from './emails.service'
import { searchEmails } from '../search/emailIndex'
import { redis } from '../../config/redis'

const router = Router()
router.use(requireAuth)

router.get('/search', async (req: AuthRequest, res) => {
  const q = String(req.query.q ?? '').trim()
  if (!q) return res.json([])
  res.json(await searchEmails(req.userId!, q))
})

const fields = {
  id: true,
  toEmail: true,
  subject: true,
  scheduledAt: true,
  sentAt: true,
  status: true
}

router.post('/schedule', async (req: AuthRequest, res) => {
  const parsed = scheduleSchema.safeParse(req.body)
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() })

  const key = req.header('Idempotency-Key')
  const cacheKey = `idem:${req.userId}:${key}`
  if (key) {
    const cached = await redis.get(cacheKey)
    if (cached) return res.status(200).json(JSON.parse(cached))
  }

  const result = await scheduleEmails(req.userId!, parsed.data)
  if (!result) return res.status(404).json({ error: 'Sender not found' })
  if (key) await redis.set(cacheKey, JSON.stringify(result), 'EX', 86400)
  res.status(201).json(result)
})

router.get('/scheduled', async (req: AuthRequest, res) => {
  res.json(
    await prisma.email.findMany({
      where: {
        userId: req.userId,
        status: { in: ['SCHEDULED', 'PROCESSING'] }
      },
      orderBy: { scheduledAt: 'asc' },
      select: fields
    })
  )
})

router.get('/sent', async (req: AuthRequest, res) => {
  res.json(
    await prisma.email.findMany({
      where: { userId: req.userId, status: { in: ['SENT', 'FAILED'] } },
      orderBy: { sentAt: 'desc' },
      select: fields
    })
  )
})

export default router
