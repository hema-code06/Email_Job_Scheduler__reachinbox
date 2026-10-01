const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g

export const parseEmails = (text: string) => [
  ...new Set(text.match(EMAIL_RE) ?? [])
]
