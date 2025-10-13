import { Hoa } from 'hoa'
import { router } from '@hoajs/router'
import { cookie } from '@hoajs/cookie'
const app = new Hoa()
app.extend(router())
app.extend(cookie())

app.post('/:path/password', async (ctx, next) => {
  const passwordKey = getPasswordKey(ctx)
  const { password } = await ctx.req.json()
  await ctx.env.KV.put(passwordKey, password, {
    expirationTtl: 86400 * 365,
  })
  ctx.res.body = {
    password,
  }
})

app.get('/:path/verify', async (ctx, next) => {
  const storedPassword = await getPassword(ctx)
  const data = {
    status: ctx.req.query.pwd === storedPassword,
  }
  if (data.status) {
    data['password'] = storedPassword
  }
  ctx.res.body = data
})

app.get('/:path', async (ctx, next) => {
  const path = ctx.req.params.path
  if (path === 'favicon.ico') {
    ctx.res.status = 204
    return
  }
  const pwd = ctx.req.query.pwd
  const storedPassword = await getPassword(ctx)
  let note = ''
  if (!storedPassword || (storedPassword && storedPassword === pwd)) {
    note = (await ctx.env.KV.get(path)) || ''
  }
  const safeNote = note.replace(/<\/textarea>/gi, '<\\/textarea>')

  ctx.res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  })
  const lockNote = storedPassword && storedPassword !== pwd
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
        * {
            box-sizing: border-box;
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

        .menu {
          position: fixed;
          right: 20px;
          bottom: 20px;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 12px;
        }

        .menu-toggle {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: none;
          background: #333;
          color: #fff;
          font-size: 22px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(0,0,0,0.25);
          transition: transform 0.3s ease, background 0.3s ease;
        }

        .menu-toggle:hover {
          background: #444;
          transform: rotate(90deg);
        }

        .submenu {
          display: flex;
          flex-direction: column;
          gap: 10px;
          opacity: 0;
          pointer-events: none;
          transform: translateY(20px);
          transition: all 0.3s ease;
        }

        .submenu.show {
          opacity: 1;
          pointer-events: auto;
          transform: translateY(0);
        }

        .submenu button {
          padding: 10px 14px;
          border: none;
          border-radius: 6px;
          background: #444;
          color: #fff;
          font-size: 14px;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
          transition: background 0.3s ease, transform 0.2s ease;
        }

        .submenu button:hover {
          background: #555;
          transform: translateX(-3px);
        }
      </style>
    </head>
    <body>
      <textarea name="note" placeholder="Please input..." maxlength="65536" autofocus>${safeNote}</textarea>
      <div class="menu">
        <div class="submenu" id="submenu">
          <button class="btn" id="addPasswordButton">Add Password</button>
          <button class="btn" id="shareButton">Share</button>
        </div>
        <button class="menu-toggle" id="menuToggle">☰</button>
      </div>
      <script>
        const getDom = (selector) => document.querySelector(selector)
        const textarea = getDom('textarea[name="note"]')

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

        let hasPassword = ${!!storedPassword}
        let notePassword = ''
        let fromShare = false
        if(${lockNote}) {
          verify()
        }
        const submenu = getDom('#submenu')
        const addPasswordButton = getDom('#addPasswordButton')
        const menuToggle = getDom('#menuToggle')
        const shareButton = getDom('#shareButton')
        function verify() {
          const pwd = window.prompt('Please enter password')
          if (!pwd) {
            alert('Please enter password')
            return verify()
          } else {
            const url = window.location.origin + window.location.pathname + '/verify?pwd=' + pwd
            fetch(url, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json'
              },
            })
            .then(resp => resp.json())
            .then(res => {
              if (res.status && res.password) {
                const url = new URL(window.location.href)
                url.searchParams.delete('pwd')
                url.searchParams.append('pwd', res.password)
                window.location.href = url.href
              } else {
                alert('Password is error')
                return verify()
              }
            })
          }
        }
        function addPasswordToNote() {
          if (hasPassword) {
            alert('Already set password')
            return
          }
          const pwd = window.prompt('Please enter password')
          if (!pwd) {
            alert('Please enter password')
            return
          }
          const url = window.location.href + '/password'
          fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(\{ password: pwd \})
          })
          .then(resp => resp.json())
          .then(res => {
            hasPassword = true
            notePassword = res.password
            if (fromShare) {
              copyToClipboard(notePassword)
            }
          })
        }

        addPasswordButton.addEventListener('click', () => {
          menuToggle.click()
          addPasswordToNote()
        })

        menuToggle.addEventListener('click', () => {
          submenu.classList.toggle('show')
        })

        shareButton.addEventListener('click', () => {
          menuToggle.click()
          if (!hasPassword) {
            if (confirm('Set password to note?')) {
              fromShare = true
              addPasswordToNote()
            } else {
              copyToClipboard()
            }
          } else {
            copyToClipboard(notePassword)
          }
        })

        function copyToClipboard(password) {
          const shareLink = new URL(window.location.href)
          if (password) {
            shareLink.searchParams.keys().forEach((key) => shareLink.searchParams.delete(key))
            shareLink.searchParams.append('pwd', password)
          }
          navigator.clipboard.writeText(shareLink.href).then(() => {
            alert('share link is already paste to clipboard')
          })
        }
      </script>
    </body>
    </html>
  `
  await ctx.res.setCookie('last_path', path)
})

app.post('/:path', async (ctx, next) => {
  const path = ctx.req.params.path
  const text = ((await ctx.req.text()) || '').trim().slice(0, 65536)
  await ctx.env.KV.put(path, text, {
    expirationTtl: 86400 * 365
  })
  ctx.res.status = 200
})

app.use(async (ctx, next) => {
  const lastPath = await ctx.req.getCookie('last_path')
  if (lastPath) {
    ctx.res.redirect(lastPath)
    return
  }
  ctx.res.redirect(randomPath())
})

export default app

async function getPassword (ctx) {
  const passwordKey = getPasswordKey(ctx)
  return ctx.env.KV.get(passwordKey)
}

function getPasswordKey (ctx) {
  return `pwd:${ctx.req.params.path}`
}

function randomPath (len = 6) {
  const chars =
    '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let result = ''
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
