import { Hoa } from 'hoa'
import { tinyRouter } from '@hoajs/tiny-router'

const app = new Hoa()
app.extend(tinyRouter())

export const onRequest = (context: {
  request: Request
  env: unknown
  waitUntil?: (promise: Promise<unknown>) => void
}) => {
  const executionCtx = context.waitUntil
    ? { waitUntil: context.waitUntil.bind(context) }
    : undefined

  return app.fetch(context.request, context.env, executionCtx)
}

app.get('/api/:path', async (ctx) => {
  const path = ctx.req.params.path
  if (!/^[0-9a-zA-Z]+$/.test(path)) {
    ctx.res.status = 400
    ctx.res.body = JSON.stringify({ error: 'Invalid path' })
    return
  }

  const data = await ctx.env.KV.get(path)
  ctx.res.set({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  })
  ctx.res.body = data || JSON.stringify({ shapes: {} })
})

app.post('/api/:path', async (ctx) => {
  const path = ctx.req.params.path
  if (!/^[0-9a-zA-Z]+$/.test(path)) {
    ctx.res.status = 400
    return
  }

  const body = await ctx.req.text()
  if (body.length > 1048576) {
    ctx.res.status = 413
    return
  }

  await ctx.env.KV.put(path, body, {
    expirationTtl: 86400 * 365,
  })
  ctx.res.status = 200
})

export default app
