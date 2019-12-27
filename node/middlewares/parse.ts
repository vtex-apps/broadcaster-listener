import { json } from 'co-body'

export async function parseAndValidate(ctx: Context, next: () => Promise<any>) {
  const body = (await json(ctx.req)) as BroadcasterEvent

  // Temporary if, in the near future broadcaster will only notify us modifications in SKUs or product.
  if (!body.HasStockKeepingUnitModified && !body.PriceModified && !body.StockModified) {
    ctx.status = 204
    return
  }

  ctx.state = body

  await next()
}
