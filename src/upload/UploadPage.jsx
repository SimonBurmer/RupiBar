import { useEffect, useRef, useState } from 'react'
import { useExchange } from '../lib/useExchange.js'
import './upload.css'

const MAX_SIDE = 1600

// Foto auf dem Handy verkleinern und als JPEG neu speichern. Dabei fallen auch
// Metadaten wie der Aufnahmeort weg.
async function toJpeg(file) {
  let source
  try {
    source = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    const url = URL.createObjectURL(file)
    try {
      source = new Image()
      source.src = url
      await source.decode()
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 0)
    }
  }
  const width = source.width
  const height = source.height
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85))
  if (!blob) throw new Error('Das Foto konnte nicht gelesen werden.')
  return blob
}

export default function UploadPage() {
  const { pictureSettings, connected } = useExchange()
  const [files, setFiles] = useState([])
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState({ text: '', error: false })
  const inputRef = useRef(null)

  useEffect(() => { document.title = 'Foto hochladen' }, [])
  useEffect(() => () => files.forEach(item => URL.revokeObjectURL(item.preview)), [files])

  const choose = event => {
    const chosen = [...event.target.files].slice(0, 10)
    setFiles(chosen.map(file => ({ file, preview: URL.createObjectURL(file) })))
    setMessage({ text: '', error: false })
  }

  async function upload(event) {
    event.preventDefault()
    if (!files.length) return
    setBusy(true)
    setMessage({ text: '', error: false })
    let done = 0
    let pending = false
    try {
      for (const { file } of files) {
        const body = await toJpeg(file)
        const response = await fetch(`/api/pictures?name=${encodeURIComponent(name.trim())}`, {
          method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.error || `Fehler ${response.status}`)
        pending = pending || data.status === 'pending'
        done += 1
      }
      setFiles([])
      if (inputRef.current) inputRef.current.value = ''
      const text = done === 1
        ? `Danke! Dein Foto ${pending ? 'erscheint nach kurzer Freigabe auf der Leinwand.' : 'ist gleich auf der Leinwand.'}`
        : `Danke! Deine ${done} Fotos ${pending ? 'erscheinen nach kurzer Freigabe auf der Leinwand.' : 'sind gleich auf der Leinwand.'}`
      setMessage({ text, error: false })
    } catch (error) {
      setMessage({ text: `${done ? `${done} Foto(s) hochgeladen. ` : ''}${error.message}`, error: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="upload">
      <h1>Dein Foto auf die Leinwand</h1>
      <p className="upload-lead">Wähle ein Foto aus oder mach direkt eins – es erscheint an der Bar auf dem Bildschirm.</p>

      <form onSubmit={upload}>
        <label className="upload-pick">
          <input ref={inputRef} type="file" accept="image/*" multiple onChange={choose} disabled={busy} />
          <span>{files.length ? `${files.length} Foto${files.length === 1 ? '' : 's'} ausgewählt – ändern` : 'Foto auswählen'}</span>
        </label>

        {files.length > 0 && (
          <div className="upload-previews">
            {files.map(item => <img key={item.preview} src={item.preview} alt="" />)}
          </div>
        )}

        <label className="upload-name">
          Dein Name (optional)
          <input type="text" maxLength={40} value={name} onChange={event => setName(event.target.value)} placeholder="z. B. Lisa" />
        </label>

        <button type="submit" disabled={busy || !files.length || !connected}>
          {busy ? 'Wird hochgeladen …' : 'Hochladen'}
        </button>
      </form>

      <p className={`upload-message${message.error ? ' error' : ''}`} role="status" aria-live="polite">{message.text}</p>
      <p className="upload-note">
        {pictureSettings.requireApproval ? 'Fotos werden vor dem Anzeigen kurz von der Bar freigegeben. ' : ''}
        Bitte nur eigene Fotos und nichts, was andere nicht zeigen möchten.
      </p>
    </main>
  )
}
