import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

const PILE = 4

// Je größer die Fotos, desto weniger dürfen sie kippen und verrutschen, damit sie im Bild bleiben.
const SIZE_LAYOUT = {
  m: { tilt: 12, shiftX: 8, shiftY: 4 },
  l: { tilt: 8, shiftX: 5, shiftY: 3 },
  xl: { tilt: 4, shiftX: 2, shiftY: 1.5 }
}

// Gleichmäßig verteilte Zufallszahl 0..1 aus der Bildnummer, damit alle Anzeigen
// die Fotos gleich schräg auf den Stapel legen.
function hash(n) {
  let t = (n + 0x9e3779b9) | 0
  t = Math.imul(t ^ (t >>> 16), 0x85ebca6b)
  t = Math.imul(t ^ (t >>> 13), 0xc2b2ae35)
  return ((t ^ (t >>> 16)) >>> 0) / 4294967296
}

function useQrCode(url) {
  const [src, setSrc] = useState(null)
  useEffect(() => {
    let active = true
    QRCode.toDataURL(url, { margin: 1, width: 480, errorCorrectionLevel: 'M', color: { dark: '#0b1220', light: '#ffffff' } })
      .then(data => active && setSrc(data))
      .catch(() => active && setSrc(null))
    return () => { active = false }
  }, [url])
  return src
}

// Bilder: Fotos der Gäste fallen wie Polaroids nacheinander auf einen Stapel.
export default function PicturesBoard({ pictures, settings, serverNow }) {
  const uploadUrl = `${window.location.origin}/upload`
  const qr = useQrCode(uploadUrl)
  const live = pictures.filter(picture => picture.status === 'live').sort((a, b) => a.at - b.at)
  const intervalMs = settings.intervalSeconds * 1000
  const slot = Math.floor(serverNow / intervalMs)
  const count = live.length
  const size = SIZE_LAYOUT[settings.size] ? settings.size : 'l'
  const layout = SIZE_LAYOUT[size]

  // Nächstes Foto vorladen, damit es beim Fallen schon da ist.
  const next = count ? live[(slot + 1) % count] : null
  useEffect(() => {
    if (!next) return
    const image = new Image()
    image.src = `/api/pictures/${next.id}`
  }, [next?.id])

  const cards = []
  for (let k = Math.min(PILE, count) - 1; k >= 0; k--) {
    const s = slot - k
    const picture = live[((s % count) + count) % count]
    cards.push({
      key: s,
      picture,
      top: k === 0,
      depth: k,
      rotate: (hash(s) - 0.5) * layout.tilt,
      x: (hash(s + 101) - 0.5) * layout.shiftX,
      y: (hash(s + 202) - 0.5) * layout.shiftY
    })
  }
  const current = cards.at(-1)?.picture

  return (
    <div className={`pictures-screen size-${size}${settings.showQr ? '' : ' no-qr'}`}>
      {current && (
        <div key={current.id} className="pictures-backdrop" style={{ backgroundImage: `url(/api/pictures/${current.id})` }} aria-hidden="true" />
      )}

      <div className="pictures-stage">
        {count === 0 ? (
          <div className="pictures-empty">
            <p>Noch keine Fotos.</p>
            <p>Scanne den Code und lade das erste hoch!</p>
          </div>
        ) : cards.map(card => (
          <figure
            key={card.key}
            className={`polaroid${card.top ? ' top' : ''}`}
            style={{
              '--r': `${card.rotate}deg`,
              '--x': `${card.x}%`,
              '--y': `${card.y}%`,
              '--depth': card.depth,
              '--kb': `${settings.intervalSeconds}s`
            }}
          >
            <div className="polaroid-photo">
              <img src={`/api/pictures/${card.picture.id}`} alt={card.picture.name ? `Foto von ${card.picture.name}` : 'Foto eines Gastes'} />
            </div>
            <figcaption>{card.picture.name ? `von ${card.picture.name}` : ' '}</figcaption>
          </figure>
        ))}
      </div>

      {settings.showQr && (
        <aside className="pictures-panel">
          <h1>{settings.title}</h1>
          <div className="pictures-qr">
            {qr ? <img src={qr} alt={`QR-Code zum Hochladen: ${uploadUrl}`} /> : <span>{uploadUrl}</span>}
          </div>
          <p className="pictures-cta">Scannen &amp; Foto hochladen</p>
          <p className="pictures-url">{uploadUrl.replace(/^https?:\/\//, '')}</p>
          <p className="pictures-count">{count === 1 ? '1 Foto' : `${count} Fotos`}</p>
        </aside>
      )}
    </div>
  )
}
