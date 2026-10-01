import { prisma } from "../config/prisma";
import { emailQueue } from "./emailQueue";

export async function reconcile() {
  const pending = await prisma.email.findMany({
    where: { status: "SCHEDULED" },
    select: { id: true, scheduledAt: true },
  });

  await emailQueue.addBulk(
    pending.map((e) => ({
      name: "send",
      data: { emailId: e.id },
      opts: { jobId: e.id, delay: Math.max(e.scheduledAt.getTime() - Date.now(), 0) },
    }))
  );
  return pending.length;
}