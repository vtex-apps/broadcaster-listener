import { AppClient, InstanceOptions, IOContext } from '@vtex/api'

export class BroadcasterClient extends AppClient {
  constructor(ioContext: IOContext, opts: InstanceOptions) {
    super('vtex.broadcaster@0.x', ioContext, {
      ...opts,
      headers: {
        VtexIdclientAutCookie: ioContext.authToken,
        ...opts?.headers,
      },
    })
  }

  public notifyWorkspace(payload: BroadcasterEvent): Promise<any> {
    return this.http.post(`/notify`, payload, {
      headers: {
        ...this.options?.headers,
      },
    })
  }
}
