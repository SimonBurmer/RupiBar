import { useEffect, useRef, useState } from 'react'
import ModernHeader from './Header.jsx'
import ModernMarketHero from './MarketHero.jsx'
import ModernCrashChart from './CrashChart.jsx'
import ModernDrinkGrid from './DrinkGrid.jsx'
import ModernTicker from './Ticker.jsx'
import ClassicHeader from './classic/Header.jsx'
import ClassicMarketHero from './classic/MarketHero.jsx'
import ClassicCrashChart from './classic/CrashChart.jsx'
import ClassicDrinkGrid from './classic/DrinkGrid.jsx'
import ClassicTicker from './classic/Ticker.jsx'
import Reporter from './Reporter.jsx'
import { MARKET_COUNT, MARKET_PIN_MS, fmt } from '../lib/market.js'
import { formatEnd, isOpen, isPromotion, latestEvent } from '../lib/happyHour.js'

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

// Börse: Kurstafel mit rotierender Kursübersicht, Reporter, Getränkeleiste und Laufband.
export default function ExchangeBoard({ prices, happy, markets, drinks, theme, settings, offset, synced, now }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const rotationStarted = useRef(performance.now())
  const marketPinnedUntil = useRef(0)
  const lastEvent = useRef(null)

  // Kursübersicht im eingestellten Takt wechseln (Standard 5 s). Ein neues Tempo aus /admin
  // lässt das aktuelle Getränk stehen und startet den Takt von dort.
  const rotationMs = settings.marketSeconds * 1000
  const rotationMsRef = useRef(rotationMs)
  if (rotationMsRef.current !== rotationMs) {
    rotationStarted.current = performance.now() - activeIndex * rotationMs
    rotationMsRef.current = rotationMs
  }

  useEffect(() => {
    const rotate = () => {
      if (Date.now() < marketPinnedUntil.current) return
      const elapsed = Math.max(0, performance.now() - rotationStarted.current)
      setActiveIndex(Math.floor(elapsed / rotationMsRef.current) % MARKET_COUNT)
    }
    const rotation = setInterval(rotate, 250)
    document.addEventListener('visibilitychange', rotate)
    return () => {
      clearInterval(rotation)
      document.removeEventListener('visibilitychange', rotate)
    }
  }, [])

  // Nach einer Kursänderung aus /admin dieses Getränk zeigen.
  const eventName = latestEvent(happy)
  const eventKey = eventName ? `${eventName}@${happy[eventName].eventAt}` : ''
  useEffect(() => {
    if (!synced) return
    if (lastEvent.current !== null && eventKey && eventKey !== lastEvent.current) {
      const index = Math.max(0, markets.findIndex(market => market.name === eventName))
      // Getränk für die Dauer der Eilmeldung zeigen, danach im Takt ab diesem Getränk weiter.
      marketPinnedUntil.current = Date.now() + MARKET_PIN_MS
      rotationStarted.current = performance.now() + MARKET_PIN_MS - index * rotationMsRef.current
      setActiveIndex(index)
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

  const liveRef = useRef(null)
  liveRef.current = { market, happy, offset, timing: { sceneMs: settings.sceneSeconds * 1000, turnMs: settings.newsSeconds * 1000 } }

  const { Header, MarketHero, CrashChart, DrinkGrid, Ticker, happyInfo } = THEMES[theme] ?? THEMES.modern

  return (
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
  )
}
