import { Hoa } from 'hoa'
import { tinyRouter } from '@hoajs/tiny-router'
import { cookie } from '@hoajs/cookie'
import { mustache } from '@hoajs/mustache'
import { getFileListHtmlString, getFileManagementHtmlString } from './tpl'

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
  async find (ctx, fileInfo) {
    return await ctx.env.R2.get(generateUniqueKey(ctx, fileInfo.name))
  },
  async delete (ctx, fileInfo) {
    await ctx.env.R2.delete(generateUniqueKey(ctx, fileInfo.name))
  }
}

const fileInfoManagment = {
  async getList (ctx) {
    const path = ctx.req.params.path
    const list = await ctx.env.KV.get(path) || '[]'
    return JSON.parse(list)
  },
  async delete (ctx, fileInfo) {
    const list = await fileInfoManagment.getList(ctx)
    const index = list.findIndex(f => f.name === fileInfo.name)
    const path = ctx.req.params.path
    const canDelete = index >= 0
    if (canDelete) {
      list.splice(index, 1)
      await ctx.env.KV.put(path, JSON.stringify(list), {
        expirationTtl: 86400 * 365,
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
      expirationTtl: 86400 * 365,
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
      <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js" defer></script>
      <script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.8/dist/purify.min.js" defer></script>
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
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px;
          height: 100%;
        }

        #fileInput {
          display: none;
        }
        .module-container {
          background: white;
          border-radius: 16px;
          padding: 30px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          height: 100%;
          display: flex;
          flex-flow: column wrap;
        }
        .file-list-header {
          display: flex;
          flex: none;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 2px solid #f0f0f0;
        }
        .file-list-title {
          font-size: 24px;
          font-weight: 700;
          color: #333;
        }
        .file-list-container {
          overflow-y: auto;
          overflow-x: hidden;
          flex: 1;
          -ms-overflow-style: none;
          scrollbar-width: none;
          scroll-behavior: smooth;
        }
        .file-list-container::-webkit-scrollbar {
          display: none;
        }
        .refresh-btn {
          padding: 10px 20px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .refresh-btn:hover {
          background: #764ba2;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .file-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px;
          margin-bottom: 12px;
          background: #f8f9ff;
          border-radius: 12px;
          transition: background-color 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
          border: 1px solid transparent;
        }

        .file-item:hover {
          background: #f0f2ff;
          border-color: #667eea;
          box-shadow: inset 3px 0 0 #667eea, 0 6px 14px rgba(102, 126, 234, 0.12);
        }

        .file-info {
          display: flex;
          align-items: center;
          flex: 1;
          min-width: 0;
        }

        .file-icon {
          font-size: 32px;
          margin-right: 15px;
          flex-shrink: 0;
        }

        .file-details {
          flex: 1;
          min-width: 0;
        }

        .file-name {
          font-size: 16px;
          font-weight: 600;
          color: #333;
          margin-bottom: 5px;
          word-break: break-all;
        }

        .file-meta {
          font-size: 13px;
          color: #666;
        }

        .file-actions {
          display: flex;
          gap: 10px;
          flex-shrink: 0;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .btn-download {
          background: #667eea;
          color: white;
        }

        .btn-download:hover {
          background: #5568d3;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .btn-delete {
          background: #ef4444;
          color: white;
        }

        .btn-delete:hover {
          background: #dc2626;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #999;
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          flex-flow: column wrap;
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 20px;
          opacity: 0.5;
        }

        .empty-text {
          font-size: 18px;
        }

        .progress-bar {
          width: 100%;
          height: 6px;
          background: #e0e0e0;
          overflow: hidden;
          position: fixed;
          top: 0;
          left: 0;
          z-index: 2000;
          display: none;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          width: 0%;
          transition: width 0.3s ease;
        }

        .toast {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 16px 24px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: none;
          align-items: center;
          gap: 12px;
          z-index: 1000;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .toast.success {
          border-left: 4px solid #10b981;
        }

        .toast.error {
          border-left: 4px solid #ef4444;
        }

        .toast.info {
          border-left: 4px solid blue;
        }

        .toast-icon {
          font-size: 24px;
        }

        .mask,
        .preview-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, .7);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .preview-container img {
          max-width: 80%;
          max-height: 80%;
          object-fit: contain;
        }
        .preview-container .markdown-preview {
          width: min(920px, 100%);
          max-height: calc(100vh - 48px);
          background: #ffffff;
          color: #111827;
          border-radius: 16px;
          padding: 20px 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, .35);
          overflow: hidden;
          line-height: 1.75;
          font-size: 15px;
        }
        .preview-container .markdown-preview-body {
          max-height: calc(100vh - 48px - 40px);
          overflow: auto;
          -webkit-overflow-scrolling: touch;
        }
        .preview-container .markdown-preview > :first-child {
          margin-top: 0;
        }
        .preview-container .markdown-preview > :last-child {
          margin-bottom: 0;
        }
        .preview-container .markdown-preview h1,
        .preview-container .markdown-preview h2,
        .preview-container .markdown-preview h3,
        .preview-container .markdown-preview h4,
        .preview-container .markdown-preview h5,
        .preview-container .markdown-preview h6 {
          margin: 18px 0 10px;
          line-height: 1.25;
          font-weight: 700;
        }
        .preview-container .markdown-preview h1 { font-size: 24px; }
        .preview-container .markdown-preview h2 { font-size: 20px; }
        .preview-container .markdown-preview h3 { font-size: 17px; }
        .preview-container .markdown-preview p {
          margin: 10px 0;
        }
        .preview-container .markdown-preview a {
          color: #2563eb;
          text-decoration: underline;
          word-break: break-word;
        }
        .preview-container .markdown-preview ul,
        .preview-container .markdown-preview ol {
          margin: 10px 0 10px 20px;
          padding: 0;
        }
        .preview-container .markdown-preview li {
          margin: 4px 0;
        }
        .preview-container .markdown-preview blockquote {
          margin: 12px 0;
          padding: 10px 12px;
          border-left: 4px solid #e5e7eb;
          background: #f9fafb;
          border-radius: 10px;
          color: #374151;
        }
        .preview-container .markdown-preview code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: .95em;
          background: #f3f4f6;
          padding: 2px 6px;
          border-radius: 8px;
        }
        .preview-container .markdown-preview pre {
          margin: 12px 0;
          padding: 12px 14px;
          overflow: auto;
          background: #0b1020;
          color: #e5e7eb;
          border-radius: 12px;
        }
        .preview-container .markdown-preview pre code {
          background: transparent;
          padding: 0;
          border-radius: 0;
          color: inherit;
        }
        .preview-container .markdown-preview hr {
          border: none;
          border-top: 1px solid #e5e7eb;
          margin: 16px 0;
        }
        .preview-container .markdown-preview table {
          width: 100%;
          border-collapse: collapse;
          margin: 12px 0;
          overflow: hidden;
          border-radius: 12px;
        }
        .preview-container .markdown-preview th,
        .preview-container .markdown-preview td {
          border: 1px solid #e5e7eb;
          padding: 8px 10px;
          text-align: left;
          vertical-align: top;
        }
        .preview-container .markdown-preview th {
          background: #f9fafb;
          font-weight: 700;
        }
        .preview-container .markdown-preview img {
          max-width: 100%;
          height: auto;
          border-radius: 12px;
        }
        @media (max-width: 480px) {
          .preview-container { padding: 12px; }
          .preview-container .markdown-preview {
            max-height: calc(100vh - 24px);
            padding: 14px 14px;
            border-radius: 14px;
          }
          .preview-container .markdown-preview-body {
            max-height: calc(100vh - 24px - 28px);
          }
        }
        .hide {
          display:none!important;
        }
        .toast-message {
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }
        .operate-button {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-top: 14px;
        }

        .operate-button button {
          height: 40px;
          padding: 0 14px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 700;
          transition: all 0.2s ease;
        }

        .operate-button button:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 18px rgba(0,0,0,0.12);
        }
        .note-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .note-actions .icon-btn {
          width: 40px;
          height: 40px;
          border-radius: 999px;
          border: 1px solid rgba(0,0,0,0.10);
          background: rgba(255, 255, 255, 0.8);
          -webkit-backdrop-filter: blur(10px);
          backdrop-filter: blur(10px);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          line-height: 1;
          transition: all 0.2s ease;
        }
        .note-actions .icon-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 22px rgba(0,0,0,0.15);
        }
        @media (max-width: 768px) {
          .note-actions .icon-btn {
            width: 36px;
            height: 36px;
            font-size: 17px;
          }
        }
        @media (max-width: 768px) {
          .file-list {
            padding: 20px;
          }
          .file-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 15px;
          }
          .file-actions {
            width: 100%;
            justify-content: flex-end;
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
      <div class='preview-container hide' id='previewContainer'></div>
      <div class="mask hide" id='mask'></div>
      <script>
        const toast = document.getElementById('toast')
        const toastIcon = document.getElementById('toastIcon')
        const mask = document.getElementById('mask')
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
  const file = await fileManagment.find(ctx, { name: filename })
  ctx.res.body = await file.arrayBuffer()
  ctx.res.type = filename.slice(filename.lastIndexOf('.') + 1)
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
  return /^[0-9a-zA-Z]+$/.test(path)
}
