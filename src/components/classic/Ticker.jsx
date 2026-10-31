import { useLayoutEffect, useRef } from 'react'
import { fmt } from '../../lib/market.js'

function Quotes({ drinks }) {
  return drinks.map((drink, index) => (
    <span key={drink.name} className={index === 0 ? 'bier' : ''}>
      <b>{drink.name.toUpperCase()}</b>
      {'   '}
      <span>{`${fmt(drink.price)} €`}</span>
    </span>
  ))
}

export default function Ticker({ drinks }) {
  const trackRef = useRef(null)
  const groupRef = useRef(null)

  // Zwei exakt gleich breite Gruppen sorgen für einen nahtlosen Übergang.
  // Die Geschwindigkeit bleibt unabhängig von Bildschirmbreite und Schrift gleich.
  useLayoutEffect(() => {
    const track = trackRef.current
    const group = groupRef.current
    const setSpeed = () => {
      const distance = group.getBoundingClientRect().width
      if (distance > 0) track.style.setProperty('--ticker-duration', `${distance / 48}s`)
    }
    setSpeed()
    const observer = new ResizeObserver(setSpeed)
    observer.observe(group)
    let active = true
    if (document.fonts) document.fonts.ready.then(() => active && setSpeed())
    return () => { active = false; observer.disconnect() }
  }, [])

  return (
    <footer className="ticker-outer">
      <div className="ticker-live">● LIVE</div>
      <div className="ticker-viewport">
        <div className="ticker-track" id="ticker" ref={trackRef}>
          <div className="ticker-group" ref={groupRef}><Quotes drinks={drinks} /></div>
          <div className="ticker-group" aria-hidden="true"><Quotes drinks={drinks} /></div>
        </div>
      </div>
    </footer>
  )
}
