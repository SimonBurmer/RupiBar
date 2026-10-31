import { fmt, isMarketName } from '../lib/market.js'

const SPARK_CRASH = 'M0 2 L15 3 L30 2 L40 6 L47 5 L54 18 L100 18'
const SPARK_FLAT = 'M0 11 L100 11'

function changeOf(drink) {
  if (drink.opening === null) return { text: '±0,0 %', tone: '' }
  const percent = (drink.price - drink.opening) / drink.opening * 100
  const text = `${percent < 0 ? '−' : percent > 0 ? '+' : '±'}${Math.abs(percent).toFixed(1).replace('.', ',')} %`
  return { text, tone: percent < 0 ? ' down' : percent > 0 ? ' up' : '' }
}

export default function DrinkGrid({ drinks, activeName }) {
  return (
    <section className="drinks" id="drinks">
      {drinks.map(drink => {
        const change = changeOf(drink)
        return (
          <div key={drink.name} className={`drink${drink.name === activeName ? ' beer' : ''}`} data-drink={drink.name}>
            <div className="drink-name">{drink.name}</div>
            <div className="drink-price">{fmt(drink.price)}<small>€</small></div>
            <div className="drink-foot">
              <span className={`drink-change${change.tone}`}>{change.text}</span>
              <svg className={`spark${change.tone}`} viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true">
                <path d={isMarketName(drink.name) ? SPARK_CRASH : SPARK_FLAT} />
              </svg>
            </div>
          </div>
        )
      })}
    </section>
  )
}
