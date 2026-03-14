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
          <div class="file-meta">{{size}} · {{uploadedText}}</div>
        </div>
      </div>
      <div class="file-actions">
        <button class="action-btn action-btn--download" data-type="download" data-name="{{name}}" title="Download">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        <button class="action-btn action-btn--copy" data-type="copy" data-name="{{name}}" title="Copy link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        </button>
        <button class="action-btn action-btn--delete" data-type="delete" data-name="{{name}}" title="Delete">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </button>
      </div>
    </div>
 {{/fileList}}
 {{^fileList}}
    <div class="empty-state">
      <div class="empty-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" opacity=".35"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
      </div>
      <div class="empty-text">No files yet</div>
      <div class="empty-sub">Files will be automatically deleted after 7 days</div>
    </div>
 {{/fileList}}
`

export function getFileListHtmlString (ctx, fileList) {
  const viewFileList = (fileList || []).map(file => {
    const icon = getFileIcon(file.name)
    const uploadedText = formatFileDate(file.uploaded)
    return {
      ...file,
      icon,
      uploadedText
    }
  })

  return ctx.render(fileListTpl, {
    fileList: viewFileList
  })
}

export function getFileManagementHtmlString () {
  const fileManagementHtmlString = `
    <div class="header-actions">
      <button class="header-btn" id="refreshBtn" title="Refresh">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
      </button>
      <button class="header-btn header-btn--primary" id="fileUpload" title="Upload">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <span>Upload</span>
      </button>
      <input type="file" id="fileInput" multiple class="hide" />
    </div>
  `
  const fileManagementScriptString = `
    <script>
      function initFileManagement() {
        const progressBar = document.getElementById('progressBar')
        const progressFill = document.getElementById('progressFill')
        const fileInput = document.getElementById('fileInput')
        const fileListContainer = document.getElementById('fileListContainer')
        const refreshBtn = document.getElementById('refreshBtn')
        const uploadBtn = document.getElementById('fileUpload')
        refreshBtn.addEventListener('click', loadFiles)
        let isLoading = false
        uploadBtn.addEventListener('click', () => {
          fileInput.click()
        })
        fileInput.addEventListener('change', (e) => {
          handleFiles(e.target.files)
        })
        fileListContainer.addEventListener('click', (e) => {
          const btn = e.target.closest('[data-type]')
          if (!btn) return
          const filename = btn.dataset.name
          switch (btn.dataset.type) {
            case 'delete':
              deleteFile(filename)
              break
            case 'copy':
              copyFileLink(filename)
              break
            case 'download':
              downloadFile(filename)
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
                    showToast('error', 'Failed to upload')
                  }
                  resolve()
                } else {
                  showToast('error', 'Failed to upload')
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

        function copyFileLink(name) {
          const link = window.location.origin + window.location.pathname + '/' + encodeURIComponent(name)
          navigator.clipboard.writeText(link).then(() => {
            showToast('success', 'Download link copied!')
          }).catch(() => {
            showToast('error', 'Failed to copy link')
          })
        }

        async function downloadFile(name) {
          const url = window.location.origin + window.location.pathname + '/' + encodeURIComponent(name)
          try {
            const response = await fetch(url)
            if (!response.ok) {
              showToast('error', 'Failed to download file')
              return
            }
            const blob = await response.blob()
            const objectUrl = URL.createObjectURL(blob)

            const a = document.createElement('a')
            a.href = objectUrl
            a.download = name
            document.body.appendChild(a)
            a.click()
            a.remove()

            URL.revokeObjectURL(objectUrl)
          } catch (error) {
            showToast('error', 'Failed to download file')
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
