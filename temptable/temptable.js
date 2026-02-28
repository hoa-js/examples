import { Hoa } from 'hoa'
import { tinyRouter } from '@hoajs/tiny-router'
import { cookie } from '@hoajs/cookie'

const app = new Hoa()
app.extend(tinyRouter())
app.extend(cookie())

app.get('/:path', async (ctx) => {
  const path = ctx.req.params.path
  if (!isValidPagePath(path)) {
    ctx.res.status = 204
    return
  }

  const type = ctx.req.query.type
  const tableData = await ctx.env.KV.get(path, 'json') || { data: [[]], columns: [] }

  ctx.res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0'
  })

  if (type === 'json') {
    ctx.res.type = 'json'
    ctx.res.body = convertToObjectArray(tableData)
    return
  }

  if (type === 'csv') {
    ctx.res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${path}.csv"`
    })
    ctx.res.body = '\uFEFF' + convertToCSV(tableData)
    return
  }

  const safeData = JSON.stringify(tableData).replace(/</g, '\\u003c')
  ctx.res.body = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Temp Table</title>
      <script src="https://cdn.jsdelivr.net/npm/jspreadsheet-ce/dist/index.min.js"></script>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/jspreadsheet-ce/dist/jspreadsheet.min.css" type="text/css" />
      <script src="https://cdn.jsdelivr.net/npm/jsuites/dist/jsuites.min.js"></script>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/jsuites/dist/jsuites.min.css" type="text/css" />
    </head>
    <body>
      <div id="spreadsheet"></div>

      <script id="__TABLE_DATA__" type="application/json">${safeData}</script>

      <script>
        window.addEventListener('DOMContentLoaded', function() {
          const tableData = JSON.parse(document.getElementById('__TABLE_DATA__').textContent || '{"data":[[]],"columns":[]}')
          let timer = null
          let lastData = JSON.stringify(tableData)

          const config = {
            worksheets: [{
              data: tableData.data || [[]],
              columns: tableData.columns || [],
              minDimensions: [10, 20]
            }],
            onchange: saveData,
            oninsertrow: saveData,
            ondeleterow: saveData,
            oninsertcolumn: saveData,
            ondeletecolumn: saveData,
            onpaste: saveData,
            onresizecolumn: saveData
          }

          const worksheets = jspreadsheet(document.getElementById('spreadsheet'), config)

          function saveData() {
            clearTimeout(timer)
            timer = setTimeout(() => {
              const worksheet = worksheets[0]
              const data = worksheet.getData()
              
              const columns = (worksheet.options.columns || []).map(col => ({
                type: col.type || 'text',
                title: col.title || '',
                width: col.width || 120
              }))
              
              const currentData = { data, columns }
              const dataStr = JSON.stringify(currentData)
              if (dataStr !== lastData) {
                fetch(window.location.href, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: dataStr
                }).then(() => {
                  lastData = dataStr
                })
              }
            }, 1000)
          }
        })
      </script>
    </body>
    </html>
  `
  await ctx.res.setCookie('last_path', path)
})

app.post('/:path', async (ctx) => {
  const path = ctx.req.params.path
  const text = (await ctx.req.text() || '').trim().slice(0, 65536)
  await ctx.env.KV.put(path, text, {
    expirationTtl: 86400 * 365
  })

  ctx.res.status = 200
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

function convertToObjectArray (tableData) {
  if (!tableData || !tableData.data || tableData.data.length === 0) {
    return []
  }

  const [headerRow, ...rows] = tableData.data
  if (!headerRow) return []

  const keyCount = Object.create(null)
  const keys = headerRow.map((v, index) => {
    const base = String(v ?? '').trim() || `Column${index + 1}`
    const count = keyCount[base] || 0
    keyCount[base] = count + 1
    return count === 0 ? base : `${base}_${count + 1}`
  })

  return rows.map(row => {
    const obj = {}
    for (let i = 0; i < keys.length; i++) {
      obj[keys[i]] = row?.[i]
    }
    return obj
  })
}

function convertToCSV (tableData) {
  if (!tableData || !tableData.data || tableData.data.length === 0) return ''

  const [headerRow, ...dataRows] = tableData.data
  const rows = []

  const headers = (headerRow || []).map((cell, index) => {
    const title = String(cell ?? '').trim() || `Column${index + 1}`
    if (title.includes(',') || title.includes('"') || title.includes('\n')) {
      return '"' + title.replace(/"/g, '""') + '"'
    }
    return title
  })
  rows.push(headers.join(','))

  dataRows.forEach(row => {
    const cells = row.map(cell => {
      const cellStr = String(cell || '')
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return '"' + cellStr.replace(/"/g, '""') + '"'
      }
      return cellStr
    })
    rows.push(cells.join(','))
  })

  return rows.join('\n')
}
