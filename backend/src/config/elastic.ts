import { Client } from '@elastic/elasticsearch'
import { env } from './env'

export const elastic = new Client({ node: env.ELASTICSEARCH_URL })
