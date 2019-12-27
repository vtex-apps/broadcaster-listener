import { IOContext } from '@vtex/api'
import { isEmpty, isNil } from 'ramda'

import { Clients } from '../clients'
import { USER_BUCKET } from '../constants'
import {
  objToHash,
  providerToVbaseFilename,
  Storage,
  toBrandProvider,
  toCategoryProvider,
  toProductProvider,
  toSkuProvider,
} from '../utils/catalog'
import {
  brandChanged,
  categoryChanged,
  productChanged,
  skuChanged,
} from './../utils/event'

const isStorage = (maybeStorage: {} | Storage | null): maybeStorage is Storage => {
  if (isNil(maybeStorage) || isEmpty(maybeStorage)) {
    return false
  }
  return true
}

const replaceIfChanged = async <T>(
  data: T,
  fileName: string,
  { vbase }: Clients
) => {
  const hash = objToHash(data)

  const oldHash = await vbase
    .getJSON<Storage | null>(USER_BUCKET, fileName, true)
    .then(maybeHash => isStorage(maybeHash) ? maybeHash.hash : null)
    
  if (oldHash !== hash) {
    await vbase.saveJSON<Storage>(USER_BUCKET, fileName, { hash })
    return true
  }

  return false
}

const logError = (logger: IOContext['logger']) => (err: any) => logger.error(err)

export async function notify(ctx: Context, next: () => Promise<any>) {
  const {
    clients: { catalogGraphQL, events },
    clients,
    state: { IdSku, PriceModified, StockModified },
    vtex: { production, logger },
  } = ctx
  const eventPromises = []
  const changedEntities: Record<string, 1> = {}
  const logWholeProductAndSku = {sku: {}, product: {}}

  // Modification in SKU
  const skuResponse = await catalogGraphQL.sku(IdSku).catch(logError(logger))
  if (!skuResponse || !skuResponse.sku) {
    return
  }
  const { sku } = skuResponse
  const filenameSku = providerToVbaseFilename(toSkuProvider(sku.id))
  let changed = (await replaceIfChanged(sku, filenameSku, clients)) || PriceModified || StockModified
  if (changed) {
    logWholeProductAndSku.sku = sku
    eventPromises.push(events.sendEvent('', skuChanged, sku))
    changedEntities.sku = 1
  }

  // Modification in Product
  const productResponse = await catalogGraphQL.product(sku.productId).catch(logError(logger))
  if (!productResponse || !productResponse.product) {
    return
  }
  const { product } = productResponse
  const filenameProduct = providerToVbaseFilename(
    toProductProvider(sku.productId)
  )
  changed = await replaceIfChanged(product, filenameProduct, clients)
  if (changed) {
    logWholeProductAndSku.product = product
    eventPromises.push(events.sendEvent('', productChanged, product))
    changedEntities.product = 1
  }

  // Modification in Brand
  const brandResponse = await catalogGraphQL.brand(product.brandId).catch(logError(logger))
  if (!brandResponse || !brandResponse.brand) {
    return
  }
  const { brand } = brandResponse
  const filenameBrand = providerToVbaseFilename(
    toBrandProvider(product.brandId)
  )
  changed = await replaceIfChanged(brand, filenameBrand, clients)
  if (changed) {
    eventPromises.push(events.sendEvent('', brandChanged, brand))
    changedEntities.brand = 1
  }

  // Modification in Category
  const categoryResponse = await catalogGraphQL.category(product.categoryId).catch(logError(logger))
  if (!categoryResponse || !categoryResponse.category) {
    return
  }
  const { category } = categoryResponse
  const filenameCategory = providerToVbaseFilename(
    toCategoryProvider(category.id)
  )
  changed = await replaceIfChanged(category, filenameCategory, clients)
  if (changed) {
    eventPromises.push(events.sendEvent('', categoryChanged, category))
    changedEntities.category = 1
  }

  // Wait for all events to be sent
  await Promise.all(eventPromises)

  metrics.batch('changed-entities', undefined, changedEntities)

  if(!isEmpty(logWholeProductAndSku.sku) && !isEmpty(logWholeProductAndSku.product)) {
    logger.debug({
      'sku': logWholeProductAndSku.sku,
      'product': logWholeProductAndSku.product
    })
  }

  if (!production) {
    console.log('changedEntities', changedEntities, {sku: sku.id, brand: brand.id, product: product.id, category: category.id})
  }

  ctx.status = 204

  await next()
}
