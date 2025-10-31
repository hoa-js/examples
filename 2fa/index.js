import { Hoa } from 'hoa'
import { tinyRouter } from '@hoajs/tiny-router'
import TOTP from './totp.js'

const app = new Hoa()
app.extend(tinyRouter())

app.get('/assets/*', async (ctx) => {
  ctx.res.body = await ctx.env.ASSETS.fetch(ctx.req)
})

app.get('/', async (ctx) => {
  ctx.res.body = `
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>2FA Lite</title>
        <script src="/assets/tailwind.min.browser@4.js"></script>
        <script src="/assets/alpine.min.js" defer></script>
        <style type="text/tailwindcss">
            :root {
                --background: 255 255 255;
                --foreground: 9 9 11;
                --primary: 59 130 246;
                --primary-foreground: 255 255 255;
                --muted: 244 244 245;
                --muted-foreground: 113 113 122;
                --radius: 0.5rem;
            }

            body {
                background-color: rgb(var(--background));
                color: rgb(var(--foreground));
            }
            .btn {
                @apply inline-flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-medium transition bg-white hover:bg-gray-100 border-gray-300 text-gray-800;
            }
            .input {
                @apply w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500;
            }
            .label {
                @apply text-sm font-medium text-gray-700 mb-1;
            }
        </style>
        </head>
        <body class="min-h-screen">
            <div x-data="totp" class="flex flex-col items-center justify-center p-6">
                <div 
                    class="w-full max-w-6xl bg-white rounded-xl shadow-md border border-gray-200 p-6 space-y-6"
                >
                    <div class="space-y-2">
                        <label class="label" for="secret">* 2FA Secret Get code for two factor authentication easiest - Please store your 2FA secret safely</label>
                        <textarea
                            id="secret"
                            x-model="secret"
                            rows="3"
                            placeholder="BK5V TVQ7 D2RB..."
                            class="input font-mono focus-visible:border-ring focus-visible:ring-ring/50"
                        ></textarea>
                    </div>
                    <div class="flex justify-end">
                        <button
                            class="btn disabled:opacity-50 disabled:cursor-not-allowed"
                            :disabled="loading"
                            @click="genOTP"
                        >
                            <svg
                                x-show="loading"
                                class="animate-spin h-4 w-4 text-gray-500"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor"
                                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z">
                                </path>
                            </svg>

                            <span x-text="loading ? 'Submitting...' : 'Submit'"></span>
                        </button>
                    </div>
                </div>
                <div 
                    class="w-full max-w-6xl mt-6 bg-white rounded-xl shadow-md border border-gray-200 p-6 space-y-6"
                >
                    <div class="space-y-2">
                        <label class="label" for="secret">* 2FA Code 2-step verification code</label>
                        <textarea
                            id="secret"
                            :value="code"
                            rows="3"
                            placeholder="code"
                            class="input font-mono focus-visible:border-ring focus-visible:ring-ring/50"
                            disabled
                        ></textarea>
                    </div>
                    <div class="flex justify-end">
                        <button
                            class="btn"
                            @click="copy"
                        >
                            <span x-text="copyLabel"></span>
                        </button>
                    </div>
                </div>
            </div>
        </body>
        <script>
            document.addEventListener('alpine:init', () => {
                Alpine.data('totp', () => ({
                    secret: '',
                    code: '',
                    loading: false,
                    copyLabel: 'Copy',
                    copy() {
                        navigator.clipboard.writeText(this.code).then(() => {
                            this.copyLabel = 'Copied!'
                            setTimeout(() => {
                                this.copyLabel = 'Copy'
                            }, 3000)
                        })
                    },
                    genOTP() {
                        if(!this.secret) {
                            alert('Please input secret')
                            return false
                        }
                        if(this.loading) {
                            return false
                        }
                        this.loading = true
                        const url = window.location.origin + '/' + this.secret
                        fetch(url, {
                            headers: {
                                'Content-Type': 'application/json'
                            },
                        }).then(resp => {
                            return resp.json()
                        }).then(res => {
                            this.code = res.code
                        })
                        .finally(() => {
                            this.loading = false
                        })
                    }
                }))
            })
        </script>
        </html>
    `
})

app.get('/:token', async (ctx) => {
  const { token } = ctx.req.params
  const code = await new TOTP().generate(token)
  ctx.res.body = { code }
})

export default app
