import { Hoa } from 'hoa'
import { tinyRouter } from '@hoajs/tiny-router'
import { cookie } from '@hoajs/cookie'

const app = new Hoa()
app.extend(tinyRouter())
app.extend(cookie())

app.get('/:path', async (ctx, next) => {
  const path = ctx.req.params.path
  if (!/^[0-9a-zA-Z]+$/.test(path)) {
    ctx.res.status = 204
    return
  }

  const returnText = ctx.req.query.text === '1'
  const note = await ctx.env.KV.get(path) || ''

  ctx.res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0'
  })

  if (returnText) {
    ctx.res.type = 'text'
    ctx.res.body = note
    return
  }

  const safeNote = note.replace(/<\/textarea>/gi, '<\\/textarea>')
  ctx.res.body = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Temp Note</title>
      <style>
        html, body {
          height: 100%;
          margin: 0;
          padding: 8px;
          box-sizing: border-box;
          background: #f6f7f8;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        textarea {
          width: 100%;
          height: 100%;
          box-sizing: border-box;
          padding: 20px;
          border: none;
          resize: none;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial;
          font-size: 16px;
          line-height: 1.6;
          background: #ffffff;
          box-shadow: 0 6px 24px rgba(17, 24, 39, 0.06), 0 1px 2px rgba(17,24,39,0.04);
          border-radius: 6px;
          overflow: auto;
          -webkit-text-size-adjust: 100%;
          -webkit-appearance: none;
        }

        textarea:focus {
          outline: none;
          box-shadow: 0 6px 24px rgba(17, 24, 39, 0.06);
          -webkit-tap-highlight-color: transparent;
          -webkit-focus-ring-color: transparent;
        }

        textarea::-webkit-search-decoration,
        textarea::-webkit-search-cancel-button,
        textarea::-webkit-search-results-button,
        textarea::-webkit-search-results-decoration {
          display: none;
        }
      </style>
    </head>
    <body>
      <textarea name="note" placeholder="Please input..." maxlength="65536" autofocus>${safeNote}</textarea>

      <script>
        const textarea = document.querySelector('textarea')

        let timer = null
        let lastNote = textarea.value

        textarea.addEventListener('input', () => {
          clearTimeout(timer)
          timer = setTimeout(() => {
            if (textarea.value !== lastNote) {
              fetch(window.location.href, {
                method: 'POST',
                headers: {
                  'Content-Type': 'text/plain'
                },
                body: textarea.value
              }).then(() => {
                lastNote = textarea.value
              })
            }
          }, 500)
        })
      </script>
    </body>
    </html>
  `
  await ctx.res.setCookie('last_path', path)
})

app.post('/:path', async (ctx, next) => {
  const path = ctx.req.params.path
  const text = (await ctx.req.text() || '').trim().slice(0, 65536)
  await ctx.env.KV.put(path, text, {
    expirationTtl: 86400 * 365
  })

  ctx.res.status = 200
})

app.use(async (ctx, next) => {
  const lastPath = await ctx.req.getCookie('last_path')
  ctx.res.redirect(lastPath || randomPath())
})

export default app

function randomPath (len = 6) {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let result = ''
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
