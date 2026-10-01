import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../config/prisma'
import { AuthRequest, requireAuth } from '../../middleware/auth'
import nodemailer from 'nodemailer'

const router = Router()
router.use(requireAuth)

const senderSchema = z.object({
  email: z.string().email(),
  smtpHost: z.string(),
  smtpPort: z.coerce.number(),
  smtpUser: z.string(),
  smtpPass: z.string()
})

router.post('/', async (req: AuthRequest, res) => {
  const parsed = senderSchema.safeParse(req.body)
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() })
  const sender = await prisma.sender.create({
    data: { ...parsed.data, userId: req.userId! },
    select: { id: true, email: true }
  })
  res.status(201).json(sender)
})

router.get('/', async (req: AuthRequest, res) => {
  res.json(
    await prisma.sender.findMany({
      where: { userId: req.userId },
      select: { id: true, email: true }
    })
  )
})

router.post('/ethereal', async (req: AuthRequest, res) => {
  const account = await nodemailer.createTestAccount()
  const sender = await prisma.sender.create({
    data: {
      userId: req.userId!,
      email: account.user,
      smtpHost: account.smtp.host,
      smtpPort: account.smtp.port,
      smtpUser: account.user,
      smtpPass: account.pass
    },
    select: { id: true, email: true }
  })
  res.status(201).json(sender)
})

export default router
