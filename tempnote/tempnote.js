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
  ctx.res.status = 200
  ctx.res.body = {
    password,
  }
})

app.get('/:path/validate', async (ctx, next) => {
  const storedPassword = await getPassword(ctx)
  ctx.res.status = 200
  const data = {
    status: ctx.req.url.searchParams.get('password') === storedPassword,
  }
  if (data.status) {
    data['password'] = storedPassword
  }
  ctx.res.body = data
})

app.get('/:path', async (ctx, next) => {
  const path = ctx.req.params.path
  if (!isValidPath(path)) {
    return await next()
  }
  const pwd = ctx.req.url.searchParams.get('pwd')
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
  const modalClass =
    'modal' + (storedPassword && storedPassword !== pwd ? ' show' : '')
  const lockModal = `
    <div class="${modalClass}" id="unlockModal">
      <div class="modal-content">
        <h3>Unlock</h3>
        <input type="password" id="unlockPasswordInput" placeholder="please enter password">
        <div class="modal-footer">
          <button id="unlockButton">confirm</button>
        </div>
      </div>
    </div>
  `
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

        .modal {
          position: fixed;
          top: 0; left: 0;
          width: 100%; height: 100%;
          background: rgba(0,0,0,0.5);
          display: none;
          justify-content: center;
          align-items: center;
        }
        .modal.show {
          display: flex;
        }
        .modal-content {
          background: #fff;
          padding: 12px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
          animation: fadeIn 0.3s ease;
          width: 80%;
          max-width: 400px;
        }
        .modal-content h3 {
          margin: 0 0 15px;
          font-size: 18px;
          color: #333;
        }
        .modal-content input {
          width: 100%;
          padding: 8px;
          margin-bottom: 12px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 14px;
        }
        .modal-content button {
          margin-right: 10px;
          padding: 8px 14px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          background: #333;
          color: #fff;
          transition: background 0.2s ease;
        }
        .modal-content button:hover {
          background: #555;
        }
        .modal-footer {
          display: flex;
          justify-content: center;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      </style>
    </head>
    <body>
      <textarea name="note" placeholder="Please input..." maxlength="65536" autofocus>${safeNote}</textarea>
      <div class="menu">
        <div class="submenu" id="submenu">
          <button class="btn" id="passwordSettingButton">Add Password</button>
          <button class="btn" id="shareButton">Share</button>
        </div>
        <button class="menu-toggle" id="menuToggle">☰</button>
      </div>
      ${lockModal}
      <div class="modal" id="passwordModal">
        <div class="modal-content">
          <h3>Add password to note</h3>
          <input type="password" id="passwordInput" placeholder="please enter password">
          <div class="modal-footer">
            <button id="savePasswordButton">save</button>
            <button onclick="closeModal(passwordModal)">cancel</button>
          </div>
        </div>
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
        const passwordModal = getDom('#passwordModal')
        const passwordInput = getDom('#passwordInput')
        const submenu = getDom('#submenu')
        const unlockModal = getDom('#unlockModal')
        const unlockPasswordInput = getDom('#unlockPasswordInput')
        const unlockPasswordButton = getDom('#unlockButton')
        const passworSettingButton = getDom('#passwordSettingButton')
        const savePasswordButton = getDom('#savePasswordButton')
        const menuToggle = getDom('#menuToggle')
        const shareButton = getDom('#shareButton')

        function openModal(dom) {
          dom.style.display = 'flex'
        }

        function closeModal(dom) {
          dom.style.display = 'none'
        }

        unlockPasswordButton.addEventListener('click', () => {
          if (!unlockPasswordInput.value) {
            alert('password cannot be empty')
          }
          const url = window.location.origin + window.location.pathname + '/validate?password=' + unlockPasswordInput.value
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
              alert('password is no correct')
            }
          })
        })

        passworSettingButton.addEventListener('click', () => {
          menuToggle.click()
          fromShare = false
          if (hasPassword) {
            return alert('already set password')
          }
          openModal(passwordModal)
        })

        savePasswordButton.addEventListener('click', () => {
          if (!passwordInput.value) {
            alert('password cannot be empty')
          }
          const url = window.location.href + '/password'
          fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(\{ password: passwordInput.value \})
          })
          .then(resp => resp.json())
          .then(res => {
            hasPassword = true
            notePassword = res.password
            closeModal(passwordModal)
            if (fromShare) {
              copyToClipboard(notePassword)
            }
          })
        })

        menuToggle.addEventListener('click', () => {
          submenu.classList.toggle('show')
        })

        shareButton.addEventListener('click', () => {
          menuToggle.click()
          if (!hasPassword) {
            if (confirm('set password to note?')) {
              fromShare = true
              openModal(passwordModal)
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
})

app.post('/:path', async (ctx, next) => {
  const path = ctx.req.params.path
  const text = ((await ctx.req.text()) || '').trim().slice(0, 65536)
  await ctx.env.KV.put(path, text, {
    expirationTtl: 86400 * 365,
  })
  ctx.res.setCookie('last_path', path)
  ctx.res.status = 200
})

app.use(async (ctx, next) => {
  const last_path = ctx.req.getCookie('last_path')
  if (isValidPath(last_path)) {
    ctx.res.redirect(last_path)
    return
  }
  ctx.res.redirect(randomPath())
})

export default app

function isValidPath (path) {
  return /^[a-zA-Z0-9]{6}$/.test(path)
}

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
