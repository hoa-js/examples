import { Hoa } from 'hoa'
import { tinyRouter } from '@hoajs/tiny-router'
import TOTP from './totp.js'

const app = new Hoa()
app.extend(tinyRouter())

app.get('/', async (ctx) => {
  ctx.res.body = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>2FA</title>
      <script src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js" defer></script>
      <style>
        body { font-family: system-ui, sans-serif; background: #f9fafb; color: #111; margin: 0; padding: 20px; display: flex; justify-content: center; }
        .container { max-width: 600px; width: 100%; background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 20px; }
        textarea, button { border: 1px solid #ccc; border-radius: 4px; }
        textarea { box-sizing: border-box; width: 100%; padding: 8px; font: 14px monospace; }
        label { display: block; margin-bottom: 4px; font-weight: bold; }
        button { margin: 16px 0; padding: 6px 12px; background: #f0f0f0; cursor: pointer; }
        button:hover { background: #e5e5e5; }
        button:disabled { opacity: .6; cursor: not-allowed; }
      </style>
    </head>
    <body>
      <div x-data="totp" class="container">
        <div>
          <label for="secret">2FA Secret</label>
          <textarea id="secret" x-model="secret" rows="3" placeholder="BK5V TVQ7 D2RB..."></textarea>
          <button @click="genOTP">Submit</button>
        </div>

        <div>
          <label for="code">2FA Code</label>
          <textarea id="code" :value="code" rows="3" placeholder="code" disabled></textarea>
          <button @click="copy" x-text="copyLabel">Copy</button>
        </div>
      </div>

    <script>
      document.addEventListener('alpine:init', () => {
        Alpine.data('totp', () => ({
          secret: '',
          code: '',
          copyLabel: 'Copy',
          copy() {
            if (!this.code) return
            navigator.clipboard.writeText(this.code).then(() => {
              this.copyLabel = 'Copied'
              setTimeout(() => this.copyLabel = 'Copy', 2000)
            })
          },
          genOTP() {
            if (!this.secret) {
              alert('Please enter Secret')
              return
            }
            const url = window.location.origin + '/' + encodeURIComponent(this.secret)
            fetch(url)
              .then(r => r.json())
              .then(j => this.code = j.code || '')
          }
        }))
      })
    </script>
    </body>
    </html>
  `
})

app.get('/:token', async (ctx) => {
  const { token } = ctx.req.params
  const code = await new TOTP().generate(token)
  ctx.res.body = { code }
})

export default app
