export interface User {
  name: string
  email: string
  avatarUrl: string | null
}

export type EmailStatus = 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED'

export interface Email {
  id: string
  toEmail: string
  subject: string
  scheduledAt: string
  sentAt: string | null
  status: EmailStatus
}

export interface Sender {
  id: string
  email: string
}
