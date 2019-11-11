import { LRUCache, method, Service } from '@vtex/api'

import { Clients } from './clients'
import { locale } from './middlewares/locale'
import { notify } from './middlewares/notify'
import { parseAndValidate } from './middlewares/parse'
import { settings } from './middlewares/settings'

const ONE_SECOND_MS = 1000

const vbaseCacheStorage = new LRUCache<string, any>({
  max: 5000,
})

const appsCacheStorage = new LRUCache<string, any>({
  max: 2500,
})

const catalogCacheStorage = new LRUCache<string, any>({
  max: 5000,
})

metrics.trackCache('vbase', vbaseCacheStorage)
metrics.trackCache('apps', appsCacheStorage)
metrics.trackCache('catalog', catalogCacheStorage)

export default new Service<Clients, State>({
  clients: {
    implementation: Clients,
    options: {
      default: {
        retries: 2,
        timeout: ONE_SECOND_MS,
      },
      vbase: {
        memoryCache: vbaseCacheStorage,
      },
      apps: {
        memoryCache: appsCacheStorage,
      },
      catalogGraphQL: {
        memoryCache: catalogCacheStorage,
      },
    },
  },
  routes: {
    notify: method({
      POST: [locale, settings, parseAndValidate, notify],
    }),
  },
})
