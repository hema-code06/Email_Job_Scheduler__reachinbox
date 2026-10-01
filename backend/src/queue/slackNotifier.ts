import axios from 'axios'
import { prisma } from '../config/prisma'

export async function notifySlack (userId: string, text: string) {
  const connection = await prisma.slackConnection.findUnique({
    where: { userId }
  })
  if (!connection) return
  try {
    await axios.post(connection.webhookUrl, { text })
  } catch (err) {
    console.error('Slack notification failed:', (err as Error).message)
  }
}
