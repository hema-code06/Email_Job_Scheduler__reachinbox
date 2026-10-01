import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { AuthRequest, requireAuth } from "../../middleware/auth";

const router = Router();
router.use(requireAuth);

const senderSchema = z.object({
  email: z.string().email(),
  smtpHost: z.string(),
  smtpPort: z.coerce.number(),
  smtpUser: z.string(),
  smtpPass: z.string(),
});

router.post("/", async (req: AuthRequest, res) => {
  const parsed = senderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const sender = await prisma.sender.create({
    data: { ...parsed.data, userId: req.userId! },
    select: { id: true, email: true },
  });
  res.status(201).json(sender);
});

router.get("/", async (req: AuthRequest, res) => {
  res.json(await prisma.sender.findMany({ where: { userId: req.userId }, select: { id: true, email: true } }));
});

export default router;