import { z } from 'zod'

export const scheduleSchema = z.object({
  senderId: z.string().uuid(),
  subject: z.string().min(1),
  body: z.string().min(1),
  recipients: z.array(z.string().email()).min(1),
  startTime: z.coerce.date(),
  delaySeconds: z.coerce.number().int().min(0),
  hourlyLimit: z.coerce.number().int().min(1)
})

export type ScheduleInput = z.infer<typeof scheduleSchema>
