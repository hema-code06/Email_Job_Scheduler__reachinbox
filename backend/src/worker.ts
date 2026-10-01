import { emailWorker } from './queue/emailWorker'
import { reconcile } from './queue/reconcile'
import { ensureIndex, reindexAll } from './modules/search/emailIndex'

ensureIndex()
  .then(reindexAll)
  .catch(err => console.error('Search setup failed:', err.message))

emailWorker.on('failed', (job, err) =>
  console.error(`Job ${job?.id} failed: ${err.message}`)
)

reconcile().then(n =>
  console.log(`Worker ready, reconciled ${n} pending emails`)
)
