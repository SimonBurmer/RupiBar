import DrinkRow from '../DrinkRow.jsx'
import { fmt, isMarketName } from '../../lib/market.js'

const SPARK_CRASH = 'M0 2 L15 3 L30 2 L40 6 L47 5 L54 18 L100 18'
const SPARK_FLAT = 'M0 11 L100 11'

function Tile({ drink, active, hidden }) {
  return (
    <div className={`drink${active ? ' beer' : ''}`} data-drink={hidden ? undefined : drink.name} aria-hidden={hidden || undefined}>
      <div className="drink-name">{drink.name}</div>
      <div className="drink-emoji">{drink.emoji}</div>
      <div className="drink-price">{`${fmt(drink.price)} €`}</div>
      <svg className="spark" viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true">
        <path d={isMarketName(drink.name) ? SPARK_CRASH : SPARK_FLAT} />
      </svg>
    </div>
  )
}

export default function DrinkGrid(props) {
  return <DrinkRow {...props} Tile={Tile} />
}
