import { useEffect, useMemo, useState } from 'react'
import ExchangeBoard from './components/ExchangeBoard.jsx'
import MenuBoard from './components/MenuBoard.jsx'
import WheelBoard from './components/WheelBoard.jsx'
import { buildBoard, fmt } from './lib/market.js'
import { happyFlash, isAlarmActive } from './lib/happyHour.js'
import { useExchange } from './lib/useExchange.js'
import { applyTheme, storedTheme } from './lib/theme.js'

// Anzeige: wählt das Thema aus /admin (Börse, Getränkekarte, Glücksrad). Alarm und
// Happy-Hour-Einblendung liegen über jedem Thema.
export default function App() {
  const live = useExchange()
  const { prices, happy, alarmAt, theme: serverTheme, topic: serverTopic, offset } = live
  const topic = serverTopic ?? 'exchange'
  const theme = serverTheme ?? storedTheme()
  const [now, setNow] = useState(() => Date.now())

  // Getränkekarte und Glücksrad nutzen die Farben und Schriften des neuen Designs.
  useEffect(() => {
    if (topic === 'exchange') applyTheme(theme, true)
    else applyTheme('modern')
  }, [topic, theme])

  useEffect(() => {
    const tick = () => setNow(Date.now())
    const clock = setInterval(tick, 500)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(clock)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])

  const { markets, drinks } = useMemo(
    () => buildBoard(prices, Object.fromEntries(Object.entries(happy).map(([name, state]) => [name, state.price]))),
    [prices, happy]
  )

  const serverNow = now + offset
  const alarm = isAlarmActive(alarmAt, serverNow)
  const flash = alarm ? [] : happyFlash(happy, prices, serverNow)

  return (
    <>
      {topic === 'menu' && <MenuBoard drinks={drinks} happy={happy} menu={live.menu} now={now} />}
      {topic === 'wheel' && <WheelBoard drinks={drinks} wheel={live.wheel} now={now} serverNow={serverNow} />}
      {topic === 'exchange' && (
        <ExchangeBoard
          prices={prices}
          happy={happy}
          markets={markets}
          drinks={drinks}
          theme={theme}
          settings={live.settings}
          offset={offset}
          synced={live.synced}
          now={now}
        />
      )}
      {alarm && (
        <div className="alarm-overlay" role="alert">
          <div className="alarm-text">⚠ ALARM ⚠</div>
        </div>
      )}
      {flash.length > 0 && (
        <div className="happy-overlay" role="status">
          <div className="happy-overlay-title">HAPPY HOUR</div>
          <div className="happy-overlay-offers">
            {flash.map(({ name, state: offer }) => (
              <span key={name}>{name}<b>{fmt(offer.price)} €</b></span>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
