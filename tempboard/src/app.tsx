import * as React from 'react'
import { Editor } from 'components/editor'
import { Controls } from 'components/controls'
import { Panel } from 'components/panel'
import { useKeyboardShortcuts } from 'hooks'
import { app } from 'state'
import type { DrawShape } from 'types'

function randomPath(len = 6) {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let result = ''
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function getBoardPath(): string {
  const path = window.location.pathname.slice(1)
  if (/^[0-9a-zA-Z]{1,20}$/.test(path)) return path
  return ''
}

function DrawingBoard(): JSX.Element {
  useKeyboardShortcuts()

  return (
    <div className="app">
      <Editor />
      <Controls />
      <Panel />
    </div>
  )
}

export default function App() {
  const [ready, setReady] = React.useState(false)
  const boardPath = React.useMemo(() => getBoardPath(), [])

  React.useEffect(() => {
    if (!boardPath) {
      window.location.replace('/' + randomPath())
      return
    }

    // Load drawing data from KV
    fetch(`/api/${boardPath}`)
      .then((res) => res.json())
      .then((data: { shapes: Record<string, DrawShape> }) => {
        if (data.shapes && Object.keys(data.shapes).length > 0) {
          app.loadShapes(data.shapes)
        }
        setReady(true)
      })
      .catch(() => setReady(true))
  }, [boardPath])

  // Set up auto-save to KV
  React.useEffect(() => {
    if (!boardPath) return

    let timer: ReturnType<typeof setTimeout> | null = null

    app.setSaveCallback((shapes) => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        fetch(`/api/${boardPath}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shapes }),
        })
      }, 500)
    })

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [boardPath])

  if (!boardPath || !ready) return null

  return <DrawingBoard />
}
