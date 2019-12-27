import { ServiceContext } from '@vtex/api'

import { Clients } from './clients'

declare global {
  type Context = ServiceContext<Clients, State>

  type State = BroadcasterEvent

  interface BroadcasterEvent {
    HasStockKeepingUnitModified: boolean
    IdSku: string
    PriceModified: boolean
    StockModified: boolean
  }

  type ID = string
  type Float = number
  type Int = number
}
