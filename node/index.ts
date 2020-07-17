import { Service, IOClients, ParamsContext, method } from '@vtex/api'

import { parseAndValidate } from './middlewares/parse'
import { throttle } from './middlewares/throttle'
import { pushNotification } from './middlewares/pushNotification'
import { notifyTargetWorkspace } from './middlewares/notifyTargetWorkspace'

const TREE_SECONDS_MS = 3 * 1000
const CONCURRENCY = 10

export default new Service<IOClients, State, ParamsContext>({
  clients: {
    options: {
      events: {
        exponentialTimeoutCoefficient: 2,
        exponentialBackoffCoefficient: 2,
        initialBackoffDelay: 50,
        retries: 1,
        timeout: TREE_SECONDS_MS,
        concurrency: CONCURRENCY,
      },
    },
  },
  routes: {
    notify: method({
      POST: [
        throttle,
        parseAndValidate,
        pushNotification,
        notifyTargetWorkspace,
      ],
    }),
  },
})
