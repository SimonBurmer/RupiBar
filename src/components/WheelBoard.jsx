import { useEffect, useRef, useState } from 'react'
import { fmt } from '../lib/market.js'
import { FORTUNES, FUN_LINES, SEGMENT_DEG, SPIN_ANIMATION_MS, wheelRound } from '../lib/wheel.js'

const point = (deg, radius) => {
  const rad = deg * Math.PI / 180
  return [Math.sin(rad) * radius, -Math.cos(rad) * radius]
}

function segmentPath(index, radius) {
  const [x1, y1] = point(index * SEGMENT_DEG - SEGMENT_DEG / 2, radius)
  const [x2, y2] = point(index * SEGMENT_DEG + SEGMENT_DEG / 2, radius)
  return `M0 0 L${x1.toFixed(3)} ${y1.toFixed(3)} A${radius} ${radius} 0 0 1 ${x2.toFixed(3)} ${y2.toFixed(3)} Z`
}

// Glücksrad: dreht sich im eingestellten Takt und kürt den „Drink der Runde“.
// Gewinner und Runde kommen aus der Serverzeit, damit alle Anzeigen dasselbe zeigen.
export default function WheelBoard({ drinks, wheel, now, serverNow }) {
  const spinMs = wheel.spinSeconds * 1000
  const round = wheelRound(serverNow, spinMs)
  const target = ((round.angle % 360) + 360) % 360

  // Eigene, fortlaufende Drehung: pro neuer Runde 5 Umdrehungen plus Weg bis zum Gewinner.
  const [rotation, setRotation] = useState(() => ({ deg: target, animate: false, round: round.round }))
  const lastRound = useRef(round.round)
  useEffect(() => {
    if (round.round === lastRound.current) return
    lastRound.current = round.round
    setRotation(prev => {
      const current = ((prev.deg % 360) + 360) % 360
      const delta = ((target - current) % 360 + 360) % 360
      return { deg: prev.deg + 5 * 360 + delta, animate: round.elapsed < SPIN_ANIMATION_MS, round: round.round }
    })
  }, [round.round, round.elapsed, target])

  const winner = drinks[round.winner]
  // Ergebnis erst zeigen, wenn das Rad steht (beim Laden mitten in einer Drehung sofort).
  const settled = !round.spinning || (rotation.round === round.round && !rotation.animate)
  const secondsLeft = Math.max(0, Math.ceil((spinMs - round.elapsed) / 1000))
  const clock = new Date(now).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="wheel-screen">
      <div className="wheel-stage">
        <svg className="wheel-svg" viewBox="-110 -114 220 224" role="img" aria-label={`Glücksrad mit ${drinks.length} Getränken`}>
          <g
            className={`wheel-disc${rotation.animate ? ' animate' : ''}`}
            style={{ transform: `rotate(${rotation.deg}deg)`, transitionDuration: `${SPIN_ANIMATION_MS}ms` }}
          >
            <circle r="102" className="wheel-rim" />
            {drinks.map((drink, index) => {
              const angle = index * SEGMENT_DEG
              return (
                <g key={drink.name}>
                  <path d={segmentPath(index, 98)} className={`wheel-seg c${index % 5}`} />
                  {angle > 180 ? (
                    // Linke Hälfte: um 180° gedreht, damit die Schrift nicht auf dem Kopf steht.
                    <g transform={`rotate(${angle + 90})`}>
                      <text x="-30" y="2.6" className="wheel-label" textAnchor="end">{drink.name}</text>
                      {wheel.showPrices && <text x="-94" y="2.4" className="wheel-price">{fmt(drink.price)}</text>}
                    </g>
                  ) : (
                    <g transform={`rotate(${angle - 90})`}>
                      <text x="30" y="2.6" className="wheel-label">{drink.name}</text>
                      {wheel.showPrices && <text x="94" y="2.4" className="wheel-price" textAnchor="end">{fmt(drink.price)}</text>}
                    </g>
                  )}
                </g>
              )
            })}
            {Array.from({ length: drinks.length }, (_, index) => {
              const [x, y] = point(index * SEGMENT_DEG + SEGMENT_DEG / 2, 102)
              return <circle key={index} cx={x} cy={y} r="2.2" className="wheel-stud" />
            })}
          </g>
          <circle r="22" className="wheel-hub" />
          <text y="7" className="wheel-hub-icon" textAnchor="middle">🍻</text>
          <path d="M-9 -113 L9 -113 L0 -96 Z" className="wheel-pointer" />
        </svg>
      </div>

      <aside className="wheel-panel">
        <header className="wheel-header">
          <h1>{wheel.title}</h1>
          <span className="wheel-clock">{clock}</span>
        </header>
        <div className={`wheel-result${settled ? ' settled' : ''}`} aria-live="polite">
          {settled ? (
            <>
              <p className="wheel-fortune">{FORTUNES[round.fortune]}</p>
              <p className="wheel-winner" data-drink={winner.name}>{winner.name}</p>
              {wheel.showPrices && <p className="wheel-winner-price">{fmt(winner.price)} €</p>}
              <p className="wheel-line">{FUN_LINES[round.round % FUN_LINES.length]}</p>
            </>
          ) : (
            <p className="wheel-spinning">Das Rad dreht sich …</p>
          )}
        </div>
        <footer className="wheel-footer">
          <span>Drink der Runde</span>
          <span>Nächste Drehung in <b>{secondsLeft}</b> s</span>
        </footer>
      </aside>
    </div>
  )
}
