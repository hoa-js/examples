import { Hoa } from 'hoa'
import { router } from '@hoajs/router'

const app = new Hoa()
app.extend(router())

async function createPassword (password) {
  const SALT = 'demo'
  const data = new TextEncoder().encode(password + SALT)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function getHashedPasswordByPath (ctx) {
  const passwordKey = getPasswordKey(ctx)
  return ctx.env.KV.get(passwordKey)
}
function getPasswordKey (ctx) {
  return `pwd:${ctx.req.params.path}`
}

app.post('/:path/password', async (ctx, next) => {
  const passwordKey = getPasswordKey(ctx)
  const body = await ctx.req.json()
  const hashedPassword = await createPassword(body.password)
  await ctx.env.KV.put(passwordKey, hashedPassword, {
    expirationTtl: 86400 * 365
  })
  ctx.res.status = 200
  ctx.res.body = {
    password: hashedPassword
  }
})

app.get('/:path/validate', async (ctx, next) => {
  const storedPassword = await getHashedPasswordByPath(ctx)
  const hashedPassword = await createPassword(ctx.req.url.searchParams.get('password'))
  ctx.res.status = 200
  const res = { status: hashedPassword === storedPassword }
  if (res.status) {
    res['password'] = storedPassword
  }
  ctx.res.body = res
})

app.get('/:path', async (ctx, next) => {
  const path = ctx.req.params.path
  const pwd = ctx.req.url.searchParams.get('pwd')
  const storedPassword = await getHashedPasswordByPath(ctx)
  let note = ''
  if (!storedPassword || (storedPassword && storedPassword === pwd)) {
    note = await ctx.env.KV.get(path) || ''
  }
  const safeNote = note.replace(/<\/textarea>/gi, '<\\/textarea>')

  ctx.res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0'
  })
  const modalClass = 'modal' + (storedPassword && storedPassword !== pwd ? ' show' : '')
  const lockModal = `
    <div class="${modalClass}" id="unlockModal">
      <div class="modal-content">
        <h3>解锁</h3>
        <input type="password" id="unlockPasswordInput" placeholder="请输入密码">
        <div class="modal-footer">
          <button id="unlockButton">确认</button>
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
          bottom: 20%;
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
        <button class="menu-toggle" id="menuToggle">☰</button>
        <div class="submenu" id="submenu">
          <button class="btn" id="passwordSettingButton">设置密码</button>
          <button class="btn" id="shareButton">分享</button>
        </div>
      </div>
      ${lockModal}
      <div class="modal" id="passwordModal">
        <div class="modal-content">
          <h3>设置密码</h3>
          <input type="password" id="passwordInput" placeholder="请输入密码">
          <div class="modal-footer">
            <button id="savePasswordButton">保存</button>
            <button onclick="closeModal(passwordModal)">取消</button>
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

        const passwordModal = getDom('#passwordModal');
        const passwordInput = getDom('#passwordInput');
        const submenu = getDom('#submenu');
        const unlockModal = getDom('#unlockModal')
        const unlockPasswordInput = getDom('#unlockPasswordInput')
        const unlockPasswordButton = getDom('#unlockButton')
        const passworSettingButton = getDom('#passwordSettingButton')
        const savePasswordButton = getDom('#savePasswordButton')
        const menuToggle = getDom('#menuToggle')
        const shareButton = getDom('#shareButton')
        function openModal(dom) {
          dom.style.display = 'flex';
        }
        function closeModal(dom) {
          dom.style.display = 'none';
        }

        unlockPasswordButton.addEventListener('click', () => {
          if(!unlockPasswordInput.value) {
            alert("密码不能为空")
          }
          const url = window.location.origin + window.location.pathname + '/validate?password=' + unlockPasswordInput.value
          fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            },
          }).then(async (resp) => {
            const res = await resp.json()
            if(res.status && res.password) {
              const url = new URL(window.location.href)
              url.searchParams.delete('pwd')
              url.searchParams.append('pwd', res.password)
              window.location.href = url.href
            } else {
              alert('密码不正确')
            }
          })
        });

        passworSettingButton.addEventListener('click', () => {
          if(hasPassword) {
            return alert('已经设置过密码')
          }
          openModal(passwordModal);
        });

        savePasswordButton.addEventListener('click', () => {
          if(!passwordInput.value) {
            alert("密码不能为空")
          }
          const url = window.location.href + '/password'
          fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(\{ password: passwordInput.value \})
          }).then(() => {
            hasPassword = true
            closeModal(passwordModal);
            alert("密码设置成功");
          })
        });

        menuToggle.addEventListener('click', () => {
          submenu.classList.toggle('show');
        });

        shareButton.addEventListener('click', () => {
          if(!hasPassword){
            if(confirm("是否需要设置密码？")){
              openModal(passwordModal);
              document.getElementById('savePassword').onclick = () => {
                savedPassword = passwordInput.value;
                if(savedPassword){
                  hasPassword = true;
                  alert("密码设置成功");
                  closeModal(passwordModal);
                  if(confirm("是否继续分享？")){
                    copyToClipboard(window.location.href + "?pwd=" + savedPassword);
                  }
                }
              }
            } else {
              copyToClipboard(window.location.href);
            }
          } else {
            if(!window.location.href.includes("pwd=")){
              copyToClipboard(window.location.href + "?pwd=" + savedPassword);
            } else {
              copyToClipboard(window.location.href);
            }
          }
        });
        function copyToClipboard(text){
          navigator.clipboard.writeText(text).then(() => {
            alert("链接已复制至剪切板, 去分享");
          });
        }
      </script>
    </body>
    </html>
  `
})

app.post('/:path', async (ctx, next) => {
  const path = ctx.req.params.path
  const text = (await ctx.req.text() || '').trim().slice(0, 65536)
  await ctx.env.KV.put(path, text, {
    expirationTtl: 86400 * 365
  })
  ctx.res.append('Set-Cookie', `last_path=${path}`)
  ctx.res.status = 200
})

app.use(async (ctx, next) => {
  const cookie = parseCookie(ctx)
  if (cookie.last_path && isValidPath(cookie.last_path)) {
    ctx.res.redirect(cookie.last_path)
    return
  }
  ctx.res.redirect(randomPath())
})

function parseCookie (ctx) {
  const cookieStr = ctx.request.headers.get('cookie')
  return cookieStr.split(';').reduce((acc, pair) => {
    const [key, ...rest] = pair.trim().split('=')
    if (!key) return acc
    acc[key] = decodeURIComponent(rest.join('='))
    return acc
  }, {})
}
function isValidPath (path) {
  return /^[a-zA-Z0-9]{6}$/.test(path)
}
export default app

function randomPath (len = 6) {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let result = ''
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
