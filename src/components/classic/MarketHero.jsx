import { fmt, marketChange, MARKET_COUNT } from '../../lib/market.js'

export default function MarketHero({ market, index, happyHourInfo }) {
  const { change, percentage, falling } = marketChange(market)
  return (
    <div className="hero">
      <div className={`beer-title${market.name.length > 5 ? ' long-name' : ''}`}>{market.name.toUpperCase()}</div>
      <div className="beer-price">
        <span id="bigPrice">{fmt(market.price)}</span>
        <small>{' €'}</small>
      </div>
      <div className="beer-sub">
        {`${falling ? '▼ −' : '▲ +'}${percentage} % `}
        <span>{`${falling ? '−' : '+'}${fmt(Math.abs(change))} € SEIT ERÖFFNUNG`}</span>
      </div>
      <div className={`rotation-info${happyHourInfo ? ' happy-hour-active' : ''}`} id="rotation-info">
        {happyHourInfo ?? `KURSÜBERSICHT ${index + 1} / ${MARKET_COUNT}`}
      </div>
    </div>
  )
}
