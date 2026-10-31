import { fmt, marketChange, MARKET_COUNT } from '../lib/market.js'

export default function MarketHero({ market, index, happyHourInfo }) {
  const { change, percentage, falling } = marketChange(market)
  const sign = falling ? '−' : '+'
  return (
    <div className="hero">
      <div className={`beer-title${market.name.length > 5 ? ' long-name' : ''}`}>{market.name}</div>
      <div className="beer-price">
        <span id="bigPrice">{fmt(market.price)}</span>
        <small>€</small>
      </div>
      <div className={`beer-sub${falling ? '' : ' up'}`}>
        {`${falling ? '▼' : '▲'} ${sign}${fmt(Math.abs(change))} € · ${sign}${percentage} %`}
        <span>seit Eröffnung ({fmt(market.opening)} €)</span>
      </div>
      <div className={`rotation-info${happyHourInfo ? ' happy-hour-active' : ''}`} id="rotation-info">
        {happyHourInfo ?? `Kursübersicht ${index + 1} von ${MARKET_COUNT}`}
      </div>
    </div>
  )
}
