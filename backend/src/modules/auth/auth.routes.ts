import { Router } from 'express'
import { OAuth2Client } from 'google-auth-library'
import jwt from 'jsonwebtoken'
import { env } from '../../config/env'
import { prisma } from '../../config/prisma'
import { AuthRequest, requireAuth } from '../../middleware/auth'

const router = Router()
const google = new OAuth2Client(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_REDIRECT_URI
)

router.get('/google', (_req, res) => {
  res.redirect(
    google.generateAuthUrl({
      scope: ['openid', 'email', 'profile'],
      prompt: 'select_account'
    })
  )
})

router.get('/google/callback', async (req, res) => {
  const { tokens } = await google.getToken(String(req.query.code))
  const ticket = await google.verifyIdToken({
    idToken: tokens.id_token!,
    audience: env.GOOGLE_CLIENT_ID
  })
  const p = ticket.getPayload()!

  const user = await prisma.user.upsert({
    where: { googleId: p.sub },
    update: { name: p.name!, avatarUrl: p.picture },
    create: {
      googleId: p.sub,
      email: p.email!,
      name: p.name!,
      avatarUrl: p.picture
    }
  })

  const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, {
    expiresIn: '7d'
  })
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  })
  res.redirect(`${env.FRONTEND_URL}/dashboard`)
})

router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { name: true, email: true, avatarUrl: true }
  })
  res.json(user)
})

router.post('/logout', (_req, res) => {
  res.clearCookie('token')
  res.json({ ok: true })
})

export default router
