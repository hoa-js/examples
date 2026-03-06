import { Hoa } from 'hoa'
import { tinyRouter } from '@hoajs/tiny-router'
import { cookie } from '@hoajs/cookie'
import { mustache } from '@hoajs/mustache'
import { getFileListHtmlString, getFileManagementHtmlString } from './tpl'

const FILE_EXPIRATION_TTL = 86400 * 365

const app = new Hoa()
app.extend(tinyRouter())
app.extend(cookie())
app.extend(mustache())

const generateUniqueKey = (ctx, name) => {
  return `${ctx.req.params.path}:${name}`
}

const fileManagment = {
  async upload (ctx, files) {
    await Promise.all(files.map(file => ctx.env.R2.put(generateUniqueKey(ctx, file.name), file)))
  },
  async get (ctx, fileInfo) {
    return await ctx.env.R2.get(generateUniqueKey(ctx, fileInfo.name))
  },
  async delete (ctx, fileInfo) {
    await ctx.env.R2.delete(generateUniqueKey(ctx, fileInfo.name))
  }
}

const fileInfoManagment = {
  async getList (ctx) {
    const path = ctx.req.params.path
    const list = await ctx.env.KV.get(path, 'json') || []
    return list
  },
  async delete (ctx, fileInfo) {
    const list = await fileInfoManagment.getList(ctx)
    const index = list.findIndex(f => f.name === fileInfo.name)
    const path = ctx.req.params.path
    const canDelete = index >= 0
    if (canDelete) {
      list.splice(index, 1)
      await ctx.env.KV.put(path, JSON.stringify(list), {
        expirationTtl: FILE_EXPIRATION_TTL,
      })
    }
    return canDelete
  },
  async update (ctx, files) {
    const fileInfos = files.map(file => fileInfoManagment.getInfo(file))
    const list = await fileInfoManagment.getList(ctx)
    fileInfos.forEach(file => {
      const index = list.findIndex(f => f.name === file.name)
      if (index >= 0) {
        list.splice(index, 1)
      }
      list.unshift(file)
    })
    const path = ctx.req.params.path
    await ctx.env.KV.put(path, JSON.stringify(list), {
      expirationTtl: FILE_EXPIRATION_TTL,
    })
    return list
  },
  getInfo (file) {
    return { name: file.name, size: fileInfoManagment.getSize(file), uploaded: new Date().toJSON() }
  },
  getSize (file) {
    const size = file.size
    if (size === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(size) / Math.log(k))
    return Math.round(size / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }
}

app.get('/:path', async (ctx) => {
  const path = ctx.req.params.path
  if (!isValidPagePath(path)) {
    ctx.res.status = 204
    return
  }

  ctx.res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0'
  })

  const fileList = await fileInfoManagment.getList(ctx)
  const fileListHtml = getFileListHtmlString(ctx, fileList)
  const {
    fileManagementHtmlString,
    fileManagementScriptString
  } = getFileManagementHtmlString()
  ctx.res.body = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Temp File</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        html, body {
          height: 100%;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          background: #f1f5f9;
          color: #0f172a;
        }

        .hide { display: none !important; }

        .container {
          max-width: 760px;
          margin: 0 auto;
          padding: 48px 20px;
          height: 100%;
        }

        #fileInput { display: none; }

        .module-container {
          background: #fff;
          border-radius: 20px;
          padding: 28px 32px;
          box-shadow: 0 1px 3px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.06);
          height: 100%;
          display: flex;
          flex-direction: column;
          border: 1px solid #e2e8f0;
        }

        .file-list-header {
          display: flex;
          flex: none;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 20px;
          border-bottom: 1px solid #e2e8f0;
        }

        .file-list-title {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -.025em;
          color: #0f172a;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .header-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          height: 38px;
          padding: 0 14px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: #fff;
          color: #475569;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all .15s ease;
        }

        .header-btn:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          color: #0f172a;
        }

        .header-btn--primary {
          background: #6366f1;
          border-color: #6366f1;
          color: #fff;
        }

        .header-btn--primary:hover {
          background: #4f46e5;
          border-color: #4f46e5;
          color: #fff;
        }

        .file-list-container {
          overflow-y: auto;
          overflow-x: hidden;
          flex: 1;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
          scroll-behavior: smooth;
        }

        .file-list-container::-webkit-scrollbar {
          width: 4px;
        }
        .file-list-container::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        .file-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          margin-bottom: 6px;
          background: #fff;
          border-radius: 12px;
          transition: all .15s ease;
          border: 1px solid transparent;
        }

        .file-item:hover {
          background: #f8fafc;
          border-color: #e2e8f0;
        }

        .file-info {
          display: flex;
          align-items: center;
          flex: 1;
          min-width: 0;
          gap: 14px;
        }

        .file-icon {
          font-size: 28px;
          flex-shrink: 0;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
          border-radius: 10px;
        }

        .file-details {
          flex: 1;
          min-width: 0;
        }

        .file-name {
          font-size: 14px;
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 2px;
          word-break: break-all;
          line-height: 1.4;
        }

        .file-meta {
          font-size: 12px;
          color: #94a3b8;
          font-weight: 400;
        }

        .file-actions {
          display: flex;
          gap: 4px;
          flex-shrink: 0;
          margin-left: 12px;
        }

        .action-btn {
          width: 34px;
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          background: transparent;
          color: #94a3b8;
          transition: all .15s ease;
        }

        .action-btn:hover {
          background: #f1f5f9;
          color: #475569;
        }

        .action-btn--copy:hover {
          color: #6366f1;
          background: #eef2ff;
        }

        .action-btn--download:hover {
          color: #059669;
          background: #ecfdf5;
        }

        .action-btn--delete:hover {
          color: #dc2626;
          background: #fef2f2;
        }

        /* ── Empty State ── */
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #94a3b8;
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          flex-direction: column;
          gap: 8px;
        }

        .empty-icon {
          margin-bottom: 8px;
          color: #cbd5e1;
        }

        .empty-text {
          font-size: 16px;
          font-weight: 600;
          color: #64748b;
        }

        .empty-sub {
          font-size: 13px;
          color: #94a3b8;
        }

        .progress-bar {
          width: 100%;
          height: 3px;
          background: transparent;
          overflow: hidden;
          position: fixed;
          top: 0;
          left: 0;
          z-index: 2000;
          display: none;
        }

        .progress-fill {
          height: 100%;
          background: #6366f1;
          width: 0%;
          transition: width 0.3s ease;
          border-radius: 0 2px 2px 0;
        }

        .toast {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 14px 20px;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 4px 24px rgba(0,0,0,.10);
          display: none;
          align-items: center;
          gap: 10px;
          z-index: 1000;
          animation: toastIn .25s cubic-bezier(.22,1,.36,1);
          border: 1px solid #e2e8f0;
        }

        @keyframes toastIn {
          from {
            transform: translateY(-12px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .toast.success { border-left: 3px solid #10b981; }
        .toast.error   { border-left: 3px solid #ef4444; }
        .toast.info    { border-left: 3px solid #6366f1; }

        .toast-icon { font-size: 20px; }

        .toast-message {
          font-size: 13px;
          font-weight: 500;
          color: #334155;
        }

        @media (max-width: 640px) {
          .container {
            padding: 16px 12px;
          }
          .module-container {
            padding: 20px 16px;
            border-radius: 16px;
          }
          .file-list-title {
            font-size: 18px;
          }
          .file-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
            padding: 14px;
          }
          .file-actions {
            width: 100%;
            justify-content: flex-end;
            margin-left: 0;
          }
          .header-btn span {
            display: none;
          }
          .header-btn--primary {
            padding: 0 12px;
          }
        }
    </style>
    </head>
    <body>
      <div class="progress-bar" id="progressBar">
        <div class="progress-fill" id="progressFill"></div>
      </div>
      <div class="container">
        <div class="module-container">
          <div class="file-list-header">
            <div class="file-list-title">Files</div>
            ${fileManagementHtmlString}
          </div>
          <div class='file-list-container' id="fileListContainer">
          ${fileListHtml}
          </div>
        </div>
      </div>
      <div class="toast" id="toast">
        <div class="toast-icon" id="toastIcon"></div>
        <div class="toast-message" id="toastMessage"></div>
      </div>
      <script>
        const toast = document.getElementById('toast')
        const toastIcon = document.getElementById('toastIcon')
        const toastMessage = document.getElementById('toastMessage')
        function showToast(type, message) {
          const icon = {success: '✅', error: '❌', info: '📢'}
          toast.className = \`toast \${type}\`
          toastIcon.textContent = icon[type]
          toastMessage.textContent = message
          toast.style.display = 'flex'

          setTimeout(() => {
            toast.style.display = 'none'
          }, 3000)
        }
      </script>
      ${fileManagementScriptString}
    </body>
    </html>
  `
  await ctx.res.setCookie('last_path', path)
})

app.get('/:path/files', async (ctx) => {
  const fileList = await fileInfoManagment.getList(ctx)
  const fileListHtml = getFileListHtmlString(ctx, fileList)
  ctx.res.body = fileListHtml
})

app.get('/:path/:filename', async (ctx) => {
  const { filename } = ctx.req.params
  const file = await fileManagment.get(ctx, { name: filename })
  if (!file) {
    ctx.res.status = 404
    ctx.res.body = 'File not found'
    return
  }
  ctx.res.body = await file.arrayBuffer()
  ctx.res.set({
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${filename}"`
  })
})

app.post('/:path', async (ctx) => {
  const formData = await ctx.req.formData()
  const files = formData.getAll('files')

  await fileInfoManagment.update(ctx, files)
  await fileManagment.upload(ctx, files)
  ctx.res.body = { ok: true }
})

app.delete('/:path/:filename', async (ctx) => {
  const { filename } = ctx.req.params
  const isDeleted = await fileInfoManagment.delete(ctx, { name: filename })
  isDeleted && await fileManagment.delete(ctx, { name: filename })
  ctx.res.body = { ok: true }
})

app.use(async (ctx) => {
  const lastPath = await ctx.req.getCookie('last_path')
  ctx.res.redirect(isValidPagePath(lastPath) ? lastPath : randomPath())
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

function isValidPagePath (path) {
  return path && /^[0-9a-zA-Z]+$/.test(path)
}
