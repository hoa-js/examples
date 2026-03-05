const FILE_ICON = {
  pdf: '📄',
  doc: '📝',
  docx: '📝',
  md: '📝',
  markdown: '📝',
  xls: '📊',
  xlsx: '📊',
  ppt: '📊',
  pptx: '📊',
  jpg: '🖼️',
  jpeg: '🖼️',
  png: '🖼️',
  gif: '🖼️',
  svg: '🖼️',
  bmp: '🖼️',
  webp: '🖼️',
  mp4: '🎬',
  avi: '🎬',
  mov: '🎬',
  mp3: '🎵',
  wav: '🎵',
  zip: '📦',
  rar: '📦',
  '7z': '📦',
  txt: '📃',
  js: '📜',
  json: '📜',
  html: '📜',
  css: '📜',
}

export function getFileIcon (fileName) {
  const ext = fileName.split('.').pop().toLowerCase()
  return FILE_ICON[ext] || '📄'
}

const CAN_PREVIEW_FILE_TYPES = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'md', 'markdown']

export function showFilePreviewBtn (fileName) {
  return CAN_PREVIEW_FILE_TYPES.includes(fileName.split('.').pop().toLowerCase())
}

export function formatFileDate (uploaded) {
  if (!uploaded) return ''
  const date = new Date(uploaded)
  const now = new Date()
  const diff = now - date
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return date.toLocaleDateString()
}

export const fileListTpl = `
 {{#fileList}}
    <div class="file-item">
      <div class="file-info">
        <div class="file-icon">{{icon}}</div>
        <div class="file-details">
          <div class="file-name">{{name}}</div>
          <div class="file-meta">{{size}} • {{uploadedText}}</div>
        </div>
      </div>
      <div class="file-actions">
        {{#canPreview}}
          <span class="btn" data-type="preview" data-name="{{name}}">👀</span>
        {{/canPreview}}
        <span class="btn" data-type="download" data-name="{{name}}">📥</span>
        <span class="btn" data-type="delete" data-name="{{name}}">🗑️</span>
      </div>
    </div>
 {{/fileList}}
 {{^fileList}}
    <div class="empty-state">
      <div class="empty-icon">📂</div>
      <div class="empty-text">No files yet. Upload your first file!</div>
    </div>
 {{/fileList}}
`

export function getFileListHtmlString (ctx, fileList) {
  const viewFileList = (fileList || []).map(file => {
    const icon = getFileIcon(file.name)
    const canPreview = showFilePreviewBtn(file.name)
    const uploadedText = formatFileDate(file.uploaded)
    return {
      ...file,
      icon,
      canPreview,
      uploadedText
    }
  })

  return ctx.render(fileListTpl, {
    fileList: viewFileList
  })
}

export function getFileManagementHtmlString () {
  const fileManagementHtmlString = `
    <div class="note-actions">
      <button class="icon-btn" id="fileUpload">📤</button>
      <input type="file" id="fileInput" multiple class="hide" />
      <button class="icon-btn" id="refreshBtn">🔄</button>
    </div>
  `
  const fileManagementScriptString = `
    <script>
      function initFileManagement() {
        const progressBar = document.getElementById('progressBar')
        const progressFill = document.getElementById('progressFill')
        const fileInput = document.getElementById('fileInput')
        const previewContainer = document.getElementById('previewContainer')
        const fileListContainer = document.getElementById('fileListContainer')
        const refreshBtn = document.getElementById('refreshBtn')
        const uploadBtn = document.getElementById('fileUpload')
        refreshBtn.addEventListener('click', loadFiles)
        let previewFileUrl = null
        let isLoading = false
        previewContainer.addEventListener('click', function () {
          previewContainer.replaceChildren()
          previewContainer.classList.add('hide')
          previewFileUrl && window.URL.revokeObjectURL(previewFileUrl)
        })
        const imageFileMap = new Map()
        uploadBtn.addEventListener('click', () => {
          fileInput.click()
        })
        fileInput.addEventListener('change', (e) => {
          handleFiles(e.target.files)
        })
        fileListContainer.addEventListener('click', (e) => {
          switch (e.target.dataset.type) {
            case 'download':
              downloadFile(e.target.dataset.name)
              break
            case 'delete':
              deleteFile(e.target.dataset.name)
              break
            case 'preview':
              previewFile(e.target.dataset.name)
              break
          }
        })

        async function handleFiles(files) {
          if (files.length === 0) return

          progressBar.style.display = 'block'
          progressFill.style.width = '0%'

          const formData = new FormData()
          for (const file of files) {
            formData.append('files', file)
          }

          try {
            await new Promise((resolve, reject) => {
              const xhr = new XMLHttpRequest()
              xhr.open('POST', window.location.origin + window.location.pathname)
              xhr.upload.onprogress = (event) => {
                if (!event.lengthComputable) return
                const percent = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)))
                progressFill.style.width = percent + '%'
              }

              xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                  progressFill.style.width = '100%'
                  let ok = true
                  try {
                    const response = JSON.parse(xhr.responseText)
                    ok = !!(response && response.ok)
                  } catch (e) {
                    ok = true
                  }
                  if (ok) {
                    showToast('success', 'Uploaded successfully!')
                  } else {
                    showToast('error', 'Failed to upload ')
                  }
                  resolve()
                } else {
                  showToast('error', 'Failed to upload ')
                  reject(new Error('Upload failed with status ' + xhr.status))
                }
              }

              xhr.onerror = () => {
                showToast('error', 'Error uploading')
                reject(new Error('Network error'))
              }

              xhr.send(formData)
            })
            .then(() => {
              loadFiles()
            })
            .finally(() => {
              progressBar.style.display = 'none'
              fileInput.value = ''
            })
          } catch (error) {
            showToast('error', 'Error uploading')
          }
        }

        async function loadFiles() {
          try {
            const response = await fetch(window.location.origin + window.location.pathname + '/files')
            const result = await response.text()
            renderFiles(result)
          } catch (error) {
            showToast('error', 'Failed to load files')
          }
        }

        function renderFiles(files) {
          fileListContainer.innerHTML = files
        }

        async function previewFile(name) {
          if (isLoading) {
            return showToast('info', 'File is loading')
          }
          isLoading = true
          try {
            const ext = (name.split('.').pop() || '').toLowerCase()
            const isMarkdown = ext === 'md' || ext === 'markdown'

            const response = await fetch(window.location.origin + window.location.pathname + '/' + name)
            if (!response.ok) {
              showToast('error', 'Failed to load file')
              return
            }

            previewContainer.replaceChildren()
            previewFileUrl && window.URL.revokeObjectURL(previewFileUrl)
            previewFileUrl = null

            if (isMarkdown) {
              const mdText = await response.text()
              const unsafeHtml = window.marked ? window.marked.parse(mdText) : mdText
              const safeHtml = window.DOMPurify ? window.DOMPurify.sanitize(unsafeHtml) : unsafeHtml
              const wrapper = document.createElement('div')
              wrapper.className = 'markdown-preview'
              const body = document.createElement('div')
              body.className = 'markdown-preview-body'
              body.innerHTML = safeHtml
              wrapper.append(body)
              previewContainer.append(wrapper)
              previewContainer.classList.remove('hide')
              return
            }

            let fileBlob = imageFileMap.get(name)
            if (!fileBlob) {
              const blob = await response.blob()
              imageFileMap.set(name, fileBlob = blob)
            }
            previewFileUrl = window.URL.createObjectURL(fileBlob)
            const img = document.createElement('img')
            img.src = previewFileUrl
            previewContainer.append(img)
            previewContainer.classList.remove('hide')
          } finally {
            isLoading = false
          }
        }

        async function downloadFile(name) {
          if (isLoading) {
            return showToast('info', 'File is loading')
          }
          isLoading = true
          try {
            let fileBlob = imageFileMap.get(name)
            if (!fileBlob) {
              progressBar.style.display = 'block'
              progressFill.style.width = '0%'
              const response = await fetch(window.location.origin + window.location.pathname + '/' + name)
              if (!response.ok) {
                progressBar.style.display = 'none'
                return showToast('error', 'Failed to download file')
              }
              const contentLength = +response.headers.get('Content-Length')
              const reader = response.body.getReader()
              let receivedLength = 0
              let chunks = []
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                chunks.push(value)
                receivedLength += value.length
                if (contentLength) {
                  progressFill.style.width = \`\${(receivedLength / contentLength) * 100}%\`
                }
              }
              fileBlob = new Blob(chunks)
              imageFileMap.set(name, fileBlob)
              progressBar.style.display = 'none'
            }
            const url = window.URL.createObjectURL(fileBlob)
            const a = document.createElement('a')
            a.href = url
            a.download = name
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
            showToast('success', \`\${name} downloaded!\`)
          } catch (error) {
            progressBar.style.display = 'none'
            showToast('error', 'Error downloading file')
          } finally {
            isLoading = false
          }
        }

        async function deleteFile(name) {
          if (!confirm(\`Are you sure you want to delete "\${name}"?\`)) {
            return
          }
          try {
            const response = await fetch(window.location.origin + window.location.pathname + '/' + name, {
              method: 'DELETE'
            })
            if (response.ok) {
              imageFileMap.delete(name)
              showToast('success', \`\${name} deleted!\`)
              loadFiles()
            } else {
              showToast('error', 'Failed to delete file')
            }
          } catch (error) {
            showToast('error', 'Error deleting file')
          }
        }
      }
      initFileManagement()
    </script>
  `
  return {
    fileManagementHtmlString,
    fileManagementScriptString
  }
}
