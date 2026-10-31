import { chartGeometry, fmt, marketChange } from '../lib/market.js'

const LABEL_Y = [52, 87, 122, 157, 192, 227]

export default function CrashChart({ market, trade, base, open, haltUntil }) {
  const g = chartGeometry(market, trade, base)
  const { percentage } = marketChange(market)
  return (
    <div className="chart-wrap market-halted">
      <div className="chart-status">
        <span className={`halt-badge${open ? ' trading-open' : ''}`}>{open ? 'Handel kurz geöffnet' : 'Handel ausgesetzt'}</span>
        <span className="chart-pair">{`${market.name} / EUR`}</span>
      </div>
      <svg className="crash-chart" viewBox="0 0 680 300" role="img" aria-labelledby="crash-title crash-description">
        <title id="crash-title">{`${market.name}: Crash von ${fmt(market.opening)} auf ${fmt(market.price)} Euro`}</title>
        <desc id="crash-description">{`Kursverlust ${percentage} Prozent. Handel ausgesetzt. Preis fixiert bei ${fmt(market.price)} Euro.`}</desc>
        <defs>
          <linearGradient id="crash-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ece7dc" stopOpacity=".06" />
            <stop offset="100%" stopColor="#ece7dc" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g stroke="#ffffff0f" strokeWidth="1">
          <path d="M58 48H622 M58 83H622 M58 118H622 M58 153H622 M58 188H622 M58 223H622" />
          <path d="M58 48V242 M170 48V242 M282 48V242 M394 48V242 M506 48V242 M622 48V242" />
        </g>
        <g fill="#8f897c" fontSize="14">
          {g.labels.map((label, tick) => (
            <text key={tick} x="3" y={LABEL_Y[tick]}>{label}</text>
          ))}
          <text className="chart-word" x="58" y="273">Eröffnung</text>
          <text className="chart-word" x="302" y="273">Crash</text>
          <text className="chart-word" x="470" y="273">Handelspause</text>
        </g>
        <path d={g.fillPath} fill="url(#crash-fill)" />
        <rect x="401" y="35" width="221" height="207" fill="#e8b04a" opacity=".05" />
        <path d="M401 35V242" stroke="#e8b04a" strokeDasharray="3 5" opacity=".5" />
        <path className="price-history" d={g.historyPath} fill="none" />
        <path className="price-crash" d={g.crashPath} />
        <path
          className={`price-event${g.recovery ? ' recovery' : ''}${g.trading ? ' trading' : ''}`}
          pathLength="1"
          d={g.eventPath}
        />
        <path d={g.dashPath} stroke="#e8b04a" strokeWidth="1.5" strokeDasharray="5 4" />
        <circle cx={g.dotX} cy={g.dotY} r="4" fill="#e8b04a" />
        <g fontWeight="500">
          <text x="65" y={g.openingLabelY} fill="#ece7dc" fontSize="18">{`${fmt(market.opening)} €`}</text>
          <text className="chart-word" x="414" y="62" fill="#e8b04a" fontSize="16" fontWeight="600">{open ? 'Handel geöffnet' : 'Handel gestoppt'}</text>
          <text className="chart-word" x="414" y="84" fill="#8f897c" fontSize="14">{`Kurs fixiert bei ${fmt(market.price)} €`}</text>
          <text x="530" y={g.priceLabelY} fill="#e8b04a" fontSize="22">{`${fmt(market.price)} €`}</text>
        </g>
      </svg>
      <div className="halt-summary">
        <span>{open ? 'Neuer Kurs' : 'Barpreis fixiert'}</span>
        <strong>{`${fmt(market.price)} €`}</strong>
        <span>{haltUntil}</span>
      </div>
    </div>
  )
}
