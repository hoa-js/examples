import { Hoa } from 'hoa'
import { tinyRouter } from '@hoajs/tiny-router'

const app = new Hoa()
app.extend(tinyRouter())

app.get('/', async (ctx) => {
  ctx.res.body = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Image Transformer</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 720px; margin: 40px auto; padding: 0 16px; }
      h1, h2 { text-align: center; }
      #dropzone { border: 2px dashed #888; border-radius: 8px; padding: 32px; text-align: center; color: #666; cursor: pointer; transition: border-color 0.2s, background-color 0.2s; }
      #dropzone.dragover { border-color: #2563eb; background-color: #eff6ff; color: #1d4ed8; }
      #file-input { display: none; }
      #controls { margin-top: 16px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
      #options-input { width: 250px; } 
      #upload-btn { padding: 8px 16px; border-radius: 6px; border: none; background: #2563eb; color: white; cursor: pointer; font-size: 14px; }
      #upload-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      #controls input { padding: 6px 8px; border-radius: 6px; border: 1px solid #d4d4d4; font-size: 14px; }
      #result { margin-top: 24px; }
      #result img { max-width: 100%; border-radius: 8px; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.15); }
      #image-url { margin-top: 8px; padding: 8px 10px; border-radius: 6px; background: #f9fafb; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 12px; word-break: break-all; }
    </style>
  </head>
  <body>
    <h1>Image Transformer</h1>

    <div id="dropzone">
      <p>Drag and drop an image here, or click to select a file</p>
    </div>
    <input id="file-input" type="file" accept="image/*" />

    <div id="controls">
      <label>
        Resizing options (cdn-cgi/image):
        <input id="options-input" type="text" value="width=800,fit=cover" placeholder="e.g. width=800,fit=cover" />
      </label>
      <button id="upload-btn" disabled>Upload and generate URL</button>
    </div>

    <div id="result" hidden>
      <h2>Transformed image</h2>
      <img id="preview" src="" alt="Transformed" />
      <div id="image-url"></div>
    </div>
    
    <script>
      const dropzone = document.getElementById('dropzone')
      const dropzoneTextElem = dropzone.querySelector('p')
      const fileInput = document.getElementById('file-input')
      const uploadBtn = document.getElementById('upload-btn')
      const resultElem = document.getElementById('result')
      const previewElem = document.getElementById('preview')
      const urlElem = document.getElementById('image-url')
      const optionsInput = document.getElementById('options-input')

      const initialDropzoneText = dropzoneTextElem.textContent
      let currentFile = null

      function setFile(file) {
        currentFile = file
        uploadBtn.disabled = !file
        if (file) {
          dropzoneTextElem.textContent = 'Selected: ' + file.name
        } else {
          dropzoneTextElem.textContent = initialDropzoneText
        }
      }

      dropzone.addEventListener('click', () => fileInput.click())

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault()
        dropzone.classList.add('dragover')
      })

      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover')
      })

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault()
        dropzone.classList.remove('dragover')
        const file = e.dataTransfer.files[0]
        if (file) setFile(file)
      })

      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0]
        if (file) setFile(file)
      })

      uploadBtn.addEventListener('click', async () => {
        if (!currentFile) return
        uploadBtn.disabled = true
        dropzoneTextElem.textContent = 'Uploading...'

        try {
          const formData = new FormData()
          formData.append('file', currentFile)

          const res = await fetch('/image', {
            method: 'POST',
            body: formData
          })

          if (!res.ok) {
            const text = await res.text()
            throw new Error(text || ('HTTP ' + res.status))
          }

          const data = await res.json()
          const path = data.path

          const opts = optionsInput.value || 'width=800,fit=cover'
          const url = '/cdn-cgi/image/' + opts + path

          previewElem.src = url
          urlElem.textContent = url
          resultElem.hidden = false
          dropzoneTextElem.textContent = initialDropzoneText
        } catch (err) {
          console.error(err)
          alert(err.message || err)
          dropzoneTextElem.textContent = initialDropzoneText
        } finally {
          uploadBtn.disabled = !currentFile
        }
      })
    </script>
  </body>
</html>`
})

app.post('/image', async (ctx) => {
  const form = await ctx.req.formData()
  const file = form.get('file')

  if (!file || typeof file === 'string') {
    ctx.throw(400, 'File is required')
  }
  const maxSize = 1 * 1024 * 1024 // 1MB
  if (file.size > maxSize) {
    ctx.throw(413, 'File too large')
  }

  const id = crypto.randomUUID()

  await ctx.env.R2.put(id, file.stream(), {
    httpMetadata: {
      contentType: file.type || 'application/octet-stream'
    }
  })

  ctx.res.body = { path: `/images/${id}` }
})

app.get('/images/:id', async (ctx) => {
  const id = ctx.req.params.id
  const obj = await ctx.env.R2.get(id)

  if (!obj) {
    ctx.throw(404, 'Image not found')
  }

  ctx.res.set('Cache-Control', 'public, max-age=604800, immutable')
  ctx.res.type = obj.httpMetadata?.contentType || 'application/octet-stream'
  ctx.res.body = obj.body
})

export default app
