import { useEffect, useMemo, useRef, useState } from 'react'
import Header from './components/Header.jsx'
import MarketHero from './components/MarketHero.jsx'
import CrashChart from './components/CrashChart.jsx'
import Reporter from './components/Reporter.jsx'
import DrinkGrid from './components/DrinkGrid.jsx'
import Ticker from './components/Ticker.jsx'
import { MARKET_COUNT, MARKET_ROTATION_MS, buildBoard, fmt } from './lib/market.js'
import { formatEnd, isOpen, isPromotion } from './lib/happyHour.js'
import { useExchange } from './lib/useExchange.js'

export default function App() {
  const { prices, happy, offset, synced } = useExchange()
  const [now, setNow] = useState(() => Date.now())
  const [activeIndex, setActiveIndex] = useState(0)
  const rotationStarted = useRef(performance.now())
  const marketPinnedUntil = useRef(0)
  const lastEventAt = useRef(null)

  // Uhr und Handelsphasen aktualisieren; Kursübersicht im Minutentakt wechseln.
  useEffect(() => {
    const rotate = () => {
      if (Date.now() < marketPinnedUntil.current) return
      const index = Math.floor((performance.now() - rotationStarted.current) / MARKET_ROTATION_MS) % MARKET_COUNT
      setActiveIndex(index)
    }
    const tick = () => setNow(Date.now())
    const onVisibility = () => { rotate(); tick() }
    const rotation = setInterval(rotate, 1000)
    const clock = setInterval(tick, 500)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearInterval(rotation)
      clearInterval(clock)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  // Nach einer neuen Bierpreis-Meldung aus /admin eine Minute lang das Bier zeigen.
  useEffect(() => {
    if (!synced) return
    if (lastEventAt.current !== null && happy.eventAt !== lastEventAt.current) {
      rotationStarted.current = performance.now()
      marketPinnedUntil.current = Date.now() + MARKET_ROTATION_MS
      setActiveIndex(0)
    }
    lastEventAt.current = happy.eventAt
  }, [synced, happy.eventAt])

  const serverNow = now + offset
  const beerBase = prices.Bier
  const { markets, drinks } = useMemo(() => buildBoard(prices, happy.price), [prices, happy.price])
  const market = markets[activeIndex]
  const beerVisible = market.name === 'Bier'
  const open = beerVisible && isOpen(happy, serverNow)
  const promotion = beerVisible && isPromotion(happy, beerBase)
  const trade = beerVisible ? { ...happy, open: isOpen(happy, serverNow) } : null

  const liveRef = useRef(null)
  liveRef.current = { market, happy, offset }

  return (
    <div className="screen">
      <Header now={now} />
      <section className="main">
        <div className="market">
          <div className="market-top">
            <MarketHero
              market={market}
              index={activeIndex}
              happyHourInfo={promotion
                ? `HAPPY HOUR · ${fmt(happy.price)} € · ${happy.expiresAt ? 'BIS ' : ''}${formatEnd(happy).toUpperCase()}`
                : null}
            />
            <CrashChart
              market={market}
              trade={trade}
              beerBase={beerBase}
              open={open}
              haltUntil={beerVisible && happy.expiresAt ? `bis ${formatEnd(happy)} Uhr` : 'bis zur Wiederaufnahme'}
            />
          </div>
        </div>
        <Reporter liveRef={liveRef} />
      </section>
      <DrinkGrid drinks={drinks} activeName={market.name} />
      <Ticker drinks={drinks} />
    </div>
  )
}
