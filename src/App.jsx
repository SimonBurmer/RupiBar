import { useEffect, useMemo, useRef, useState } from 'react'
import ModernHeader from './components/Header.jsx'
import ModernMarketHero from './components/MarketHero.jsx'
import ModernCrashChart from './components/CrashChart.jsx'
import ModernDrinkGrid from './components/DrinkGrid.jsx'
import ModernTicker from './components/Ticker.jsx'
import ClassicHeader from './components/classic/Header.jsx'
import ClassicMarketHero from './components/classic/MarketHero.jsx'
import ClassicCrashChart from './components/classic/CrashChart.jsx'
import ClassicDrinkGrid from './components/classic/DrinkGrid.jsx'
import ClassicTicker from './components/classic/Ticker.jsx'
import Reporter from './components/Reporter.jsx'
import { MARKET_COUNT, MARKET_ROTATION_MS, buildBoard, fmt } from './lib/market.js'
import { formatEnd, happyFlash, isAlarmActive, isOpen, isPromotion, latestEvent } from './lib/happyHour.js'
import { useExchange } from './lib/useExchange.js'
import { applyTheme, storedTheme } from './lib/theme.js'

const THEMES = {
  modern: {
    Header: ModernHeader, MarketHero: ModernMarketHero, CrashChart: ModernCrashChart, DrinkGrid: ModernDrinkGrid, Ticker: ModernTicker,
    happyInfo: (state) => `Happy Hour: ${fmt(state.price)} € ${state.expiresAt ? `bis ${formatEnd(state)} Uhr` : 'bis auf Weiteres'}`
  },
  classic: {
    Header: ClassicHeader, MarketHero: ClassicMarketHero, CrashChart: ClassicCrashChart, DrinkGrid: ClassicDrinkGrid, Ticker: ClassicTicker,
    happyInfo: (state) => `HAPPY HOUR · ${fmt(state.price)} € · ${state.expiresAt ? 'BIS ' : ''}${formatEnd(state).toUpperCase()}`
  }
}

export default function App() {
  const { prices, happy, alarmAt, theme: serverTheme, settings, offset, synced } = useExchange()
  const theme = serverTheme ?? storedTheme()
  const [now, setNow] = useState(() => Date.now())
  const [activeIndex, setActiveIndex] = useState(0)
  const rotationStarted = useRef(performance.now())
  const marketPinnedUntil = useRef(0)
  const lastEvent = useRef(null)

  useEffect(() => { applyTheme(theme, true) }, [theme])

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

  const { markets, drinks } = useMemo(
    () => buildBoard(prices, Object.fromEntries(Object.entries(happy).map(([name, state]) => [name, state.price]))),
    [prices, happy]
  )

  // Nach einer Kursänderung aus /admin dieses Getränk eine Minute lang zeigen.
  const eventName = latestEvent(happy)
  const eventKey = eventName ? `${eventName}@${happy[eventName].eventAt}` : ''
  useEffect(() => {
    if (!synced) return
    if (lastEvent.current !== null && eventKey && eventKey !== lastEvent.current) {
      rotationStarted.current = performance.now()
      marketPinnedUntil.current = Date.now() + MARKET_ROTATION_MS
      setActiveIndex(Math.max(0, markets.findIndex(market => market.name === eventName)))
    }
    lastEvent.current = eventKey
  }, [synced, eventKey, eventName, markets])

  const serverNow = now + offset
  const market = markets[activeIndex]
  const state = happy[market.name]
  const base = prices[market.name]
  const open = isOpen(state, serverNow)
  const trade = { ...state, open }
  const promotion = isPromotion(state, base)

  const alarm = isAlarmActive(alarmAt, serverNow)
  const flash = alarm ? [] : happyFlash(happy, prices, serverNow)

  const liveRef = useRef(null)
  liveRef.current = { market, happy, offset, timing: { sceneMs: settings.sceneSeconds * 1000, turnMs: settings.newsSeconds * 1000 } }

  const { Header, MarketHero, CrashChart, DrinkGrid, Ticker, happyInfo } = THEMES[theme] ?? THEMES.modern

  return (
    <>
      <div className={`screen${settings.showTicker ? '' : ' no-ticker'}`}>
        <Header now={now} />
        <section className="main">
          <div className="market">
            <div className="market-top">
              <MarketHero market={market} index={activeIndex} happyHourInfo={promotion ? happyInfo(state) : null} />
              <CrashChart
                market={market}
                trade={trade}
                base={base}
                open={open}
                haltUntil={state.expiresAt ? `bis ${formatEnd(state)} Uhr` : 'bis zur Wiederaufnahme'}
              />
            </div>
          </div>
          <Reporter liveRef={liveRef} />
        </section>
        <DrinkGrid drinks={drinks} activeName={market.name} mode={settings.tileMode} seconds={settings.tileSeconds} now={serverNow} />
        {settings.showTicker && <Ticker drinks={drinks} />}
      </div>
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
