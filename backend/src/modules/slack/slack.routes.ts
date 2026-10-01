import axios from "axios";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";
import { AuthRequest, requireAuth } from "../../middleware/auth";

const router = Router();

router.get("/connect", requireAuth, (req: AuthRequest, res) => {
  const state = jwt.sign({ userId: req.userId }, env.JWT_SECRET, { expiresIn: "10m" });
  const params = new URLSearchParams({
    client_id: env.SLACK_CLIENT_ID,
    scope: "incoming-webhook",
    redirect_uri: env.SLACK_REDIRECT_URI,
    state,
  });
  res.redirect(`https://slack.com/oauth/v2/authorize?${params}`);
});

router.get("/callback", async (req, res) => {
  try {
    const { userId } = jwt.verify(String(req.query.state), env.JWT_SECRET) as { userId: string };
    const { data } = await axios.post(
      "https://slack.com/api/oauth.v2.access",
      new URLSearchParams({
        code: String(req.query.code),
        client_id: env.SLACK_CLIENT_ID,
        client_secret: env.SLACK_CLIENT_SECRET,
        redirect_uri: env.SLACK_REDIRECT_URI,
      })
    );
    if (!data.ok) throw new Error(data.error);

    const fields = {
      webhookUrl: data.incoming_webhook.url as string,
      channel: data.incoming_webhook.channel as string,
      teamName: data.team?.name as string | undefined,
    };
    await prisma.slackConnection.upsert({
      where: { userId },
      update: fields,
      create: { userId, ...fields },
    });
    res.redirect(`${env.FRONTEND_URL}/dashboard?slack=connected`);
  } catch {
    res.redirect(`${env.FRONTEND_URL}/dashboard?slack=error`);
  }
});

router.get("/status", requireAuth, async (req: AuthRequest, res) => {
  const connection = await prisma.slackConnection.findUnique({
    where: { userId: req.userId! },
    select: { teamName: true, channel: true },
  });
  res.json({ connected: !!connection, ...connection });
});

router.delete("/", requireAuth, async (req: AuthRequest, res) => {
  await prisma.slackConnection.deleteMany({ where: { userId: req.userId! } });
  res.json({ ok: true });
});

export default router;