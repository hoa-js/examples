import { Hoa } from 'hoa'
import { tinyRouter } from '@hoajs/tiny-router'

const app = new Hoa()
app.extend(tinyRouter())

app.get('/:ip', async (ctx) => {
  const ip = ctx.req.params.ip
  ctx.res.body = await getIpinfoJson(ctx.env, ip)
})

app.use(async (ctx) => {
  const ip = ctx.req.ip
  ctx.res.body = await getIpinfoJson(ctx.env, ip)
})

export default app

async function getIpinfoJson (env, ip) {
  const res = await fetch(`${env.IPINFO_HOST}/${ip}/json?token=${env.IPINFO_TOKEN}`)
  return res.json()
}
