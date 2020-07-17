import { BroadcasterClient } from './../clients/broadcaster';

const TIMEOUT_MS = 3000
const RETRIES = 2

export async function notifyTargetWorkspace(ctx: Context, next: () => Promise<any>) {
  if (ctx.vtex.workspace !== 'master') {
    return
  }


  const { targetWorkspace } = await ctx.clients.apps.getAppSettings(
    `${process.env.VTEX_APP_ID}`
  )

  if (!targetWorkspace || targetWorkspace === ctx.vtex.workspace) {
    return
  }

  const broadcasterClient = new BroadcasterClient(
    {
      ...ctx.vtex,
      workspace: targetWorkspace,
    },
    {
      retries: RETRIES,
      timeout: TIMEOUT_MS,
    }
  )
  broadcasterClient.notifyWorkspace(ctx.state.payload).catch(error => {
    if (error?.response?.status === 404) {
      ctx.vtex.logger.warn("Target workspace not set or doesn't exist")
    }
  })
  next()
}
