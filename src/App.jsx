import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Header from './components/Header.jsx'
import MarketHero from './components/MarketHero.jsx'
import CrashChart from './components/CrashChart.jsx'
import Reporter from './components/Reporter.jsx'
import DrinkGrid from './components/DrinkGrid.jsx'
import Ticker from './components/Ticker.jsx'
import HappyHourControl from './components/HappyHourControl.jsx'
import { MARKET_COUNT, MARKET_ROTATION_MS, NORMAL_BEER_PRICE, buildBoard, fmt } from './lib/market.js'
import {
  INVALID_INPUT_MESSAGE, SAVE_FAILED_MESSAGE, bootState, formatEnd, isExpired, isOpen,
  isPromotion, nextState, parseInput, saveState
} from './lib/happyHour.js'

function getStorage() {
  try { return window.localStorage } catch { return null }
}

export default function App() {
  const storage = useMemo(getStorage, [])
  const [boot] = useState(() => bootState(storage, Date.now()))
  const [happy, setHappy] = useState(boot.state)
  const [feedback, setFeedback] = useState(boot.saveFailed ? SAVE_FAILED_MESSAGE : '')
  const [now, setNow] = useState(() => Date.now())
  const [activeIndex, setActiveIndex] = useState(0)

  const happyRef = useRef(happy)
  const rotationStarted = useRef(performance.now())
  const marketPinnedUntil = useRef(0)

  const applyPrice = useCallback((price, minutes) => {
    const time = Date.now()
    const state = nextState(happyRef.current, price, minutes, time)
    happyRef.current = state
    setHappy(state)
    setNow(time)
    // Nach einer Preisänderung eine Minute lang das Bier zeigen.
    rotationStarted.current = performance.now()
    marketPinnedUntil.current = time + MARKET_ROTATION_MS
    setActiveIndex(0)
    setFeedback(saveState(storage, state) ? `Übernommen: ${fmt(price)} € · ${formatEnd(state)}.` : SAVE_FAILED_MESSAGE)
    return state
  }, [storage])

  const checkExpiry = useCallback(() => {
    const time = Date.now()
    if (isExpired(happyRef.current, time)) return applyPrice(NORMAL_BEER_PRICE, 0)
    setNow(time)
    return happyRef.current
  }, [applyPrice])

  // Kursübersicht im Minutentakt; nach einem inaktiven Tab direkt den richtigen Platz zeigen.
  useEffect(() => {
    const rotate = () => {
      if (Date.now() < marketPinnedUntil.current) return
      const index = Math.floor((performance.now() - rotationStarted.current) / MARKET_ROTATION_MS) % MARKET_COUNT
      setActiveIndex(index)
    }
    const onVisibility = () => { rotate(); checkExpiry() }
    const rotation = setInterval(rotate, 1000)
    const expiry = setInterval(checkExpiry, 500)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearInterval(rotation)
      clearInterval(expiry)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [checkExpiry])

  const { markets, drinks } = useMemo(() => buildBoard(happy.price), [happy.price])
  const market = markets[activeIndex]
  const beerVisible = market.name === 'Bier'
  const open = beerVisible && isOpen(happy, now)
  const promotion = beerVisible && isPromotion(happy)
  const trade = beerVisible ? { ...happy, open: isOpen(happy, now) } : null

  const liveRef = useRef(null)
  liveRef.current = { market, happy }

  const handleSubmit = (priceText, minutesText) => {
    const input = parseInput(priceText, minutesText)
    if (!input) {
      setFeedback(INVALID_INPUT_MESSAGE)
      return
    }
    applyPrice(input.price, input.minutes)
  }

  return (
    <>
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
      <HappyHourControl
        happy={happy}
        feedback={feedback}
        onOpen={checkExpiry}
        onSubmit={handleSubmit}
        onReset={() => applyPrice(NORMAL_BEER_PRICE, 0)}
      />
    </>
  )
}
