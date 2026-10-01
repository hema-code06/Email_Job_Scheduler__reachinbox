import { elastic } from '../../config/elastic'
import { prisma } from '../../config/prisma'
import { Email } from '../../generated/prisma/client'

const INDEX = 'emails'

const toDoc = (e: Email) => ({
  userId: e.userId,
  toEmail: e.toEmail,
  subject: e.subject,
  body: e.body,
  status: e.status,
  scheduledAt: e.scheduledAt,
  sentAt: e.sentAt
})

export async function ensureIndex () {
  if (await elastic.indices.exists({ index: INDEX })) return
  await elastic.indices.create({
    index: INDEX,
    mappings: {
      properties: {
        userId: { type: 'keyword' },
        status: { type: 'keyword' },
        toEmail: { type: 'text' },
        subject: { type: 'text' },
        body: { type: 'text' },
        scheduledAt: { type: 'date' },
        sentAt: { type: 'date' }
      }
    }
  })
}

export async function indexEmails (ids: string[]) {
  try {
    const emails = await prisma.email.findMany({ where: { id: { in: ids } } })
    if (!emails.length) return
    await elastic.bulk({
      operations: emails.flatMap(e => [
        { index: { _index: INDEX, _id: e.id } },
        toDoc(e)
      ])
    })
  } catch (err) {
    console.error('Indexing failed:', (err as Error).message)
  }
}

export async function reindexAll () {
  const all = await prisma.email.findMany({ select: { id: true } })
  await indexEmails(all.map(e => e.id))
}

export async function searchEmails (userId: string, q: string) {
  const result = await elastic.search({
    index: INDEX,
    size: 50,
    query: {
      bool: {
        filter: [{ term: { userId } }],
        must: [
          { multi_match: { query: q, fields: ['toEmail', 'subject', 'body'] } }
        ]
      }
    },
    sort: [{ scheduledAt: 'desc' }]
  })
  return result.hits.hits.map(h => ({ id: h._id, ...(h._source as object) }))
}
