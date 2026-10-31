import { useEffect, useRef, useState } from 'react'
import studioImage from '../assets/reporter-studio.png'
import { bulletin } from '../lib/happyHour.js'
import { TURNS, TURN_DURATION, captionFor, startReporterAnimation } from '../lib/reporterAnimation.js'

// `liveRef.current` hält { market, happy } für den Animationsloop aktuell,
// ohne die Animation bei jedem Render neu zu starten.
export default function Reporter({ liveRef }) {
  const photoRef = useRef(null)
  const canvasRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [dialogue, setDialogue] = useState({
    caption: 'MARKET UPDATE',
    headline: 'BIER UNTER DRUCK',
    text: 'Dramatische Szenen an der Halloween Exchange. Der Bierindex steht unter massivem Druck.'
  })

  useEffect(() => {
    const photo = photoRef.current
    if (photo.complete && photo.naturalWidth) setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return undefined
    return startReporterAnimation(photoRef.current, canvasRef.current, time => {
      const [speaker, headline, text] = TURNS[Math.floor(time / TURN_DURATION) % TURNS.length]
      const { market, happy } = liveRef.current
      const news = bulletin(happy, Date.now())
      const next = {
        caption: captionFor(speaker),
        headline: news ? news.headline : headline,
        text: news ? news.text : text(market)
      }
      setDialogue(prev => (prev.caption === next.caption && prev.headline === next.headline && prev.text === next.text ? prev : next))
      return speaker
    })
  }, [ready, liveRef])

  return (
    <aside className="reporter">
      <img
        ref={photoRef}
        className={ready ? 'reporter-source' : undefined}
        src={studioImage}
        alt="Unsere beiden Reporter im Börsenstudio"
        onLoad={() => setReady(true)}
      />
      {ready && <canvas ref={canvasRef} className="reporter-portrait" aria-hidden="true" />}
      <div className="reporter-bottom">
        <div className="reporter-caption">{dialogue.caption}</div>
        <div className="reporter-headline" id="headline">{dialogue.headline}</div>
        <div className="reporter-text" id="report">{dialogue.text}</div>
      </div>
    </aside>
  )
}
