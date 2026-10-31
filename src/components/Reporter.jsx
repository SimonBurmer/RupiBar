import { useEffect, useRef, useState } from 'react'
import { bulletin } from '../lib/happyHour.js'
import { startReporterAnimation } from '../lib/reporterAnimation.js'
import { SCENES, scheduleAt } from '../lib/scenes.js'

// `liveRef.current` hält { market, happy, offset } für den Animationsloop aktuell,
// ohne die Animation bei jedem Render neu zu starten.
export default function Reporter({ liveRef }) {
  const canvasRef = useRef(null)
  const imagesRef = useRef([])
  const loadedRef = useRef(SCENES.map(() => false))
  const startRef = useRef(null)
  const [loaded, setLoaded] = useState(() => SCENES.map(() => false))
  const [sceneIndex, setSceneIndex] = useState(0)
  const [dialogue, setDialogue] = useState({
    caption: 'Marktbericht',
    headline: 'BIER UNTER DRUCK',
    text: 'Dramatische Szenen an der Halloween Exchange. Der Bierindex steht unter massivem Druck.'
  })
  const ready = loaded[sceneIndex]
  const scene = SCENES[sceneIndex]

  // Alle Szenenbilder vorladen, damit ein Wechsel ohne leeres Bild auskommt.
  useEffect(() => {
    let cancelled = false
    imagesRef.current = SCENES.map((config, index) => {
      const image = new Image()
      image.src = config.image
      image.decode().catch(() => {}).then(() => {
        if (cancelled || !image.naturalWidth) return
        loadedRef.current[index] = true
        setLoaded(prev => prev.map((value, i) => value || i === index))
      })
      return image
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!ready) return undefined
    if (startRef.current === null) startRef.current = performance.now()
    const turns = scene.turns
    return startReporterAnimation(scene, imagesRef.current[sceneIndex], canvasRef.current, () => {
      const schedule = scheduleAt(performance.now() - startRef.current)
      const current = schedule.sceneIndex === sceneIndex
      // Nächste Szene erst zeigen, wenn ihr Bild geladen ist.
      if (!current && loadedRef.current[schedule.sceneIndex]) setSceneIndex(schedule.sceneIndex)
      const [speaker, headline, text] = turns[schedule.turnIndex % turns.length]
      const { market, happy, offset } = liveRef.current
      const news = bulletin(happy, Date.now() + offset)
      const next = {
        caption: scene.captions[speaker],
        headline: news ? news.headline : headline,
        text: news ? news.text : text(market)
      }
      setDialogue(prev => (prev.caption === next.caption && prev.headline === next.headline && prev.text === next.text ? prev : next))
      return { speaker, turnElapsed: schedule.turnElapsed }
    })
  }, [ready, scene, sceneIndex, liveRef])

  return (
    <aside className="reporter">
      <img
        className={ready ? 'reporter-source' : undefined}
        src={scene.image}
        alt={scene.alt}
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
