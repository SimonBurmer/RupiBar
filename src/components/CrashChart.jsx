import { chartGeometry, fmt, marketChange } from '../lib/market.js'

const LABEL_Y = [52, 87, 122, 157, 192, 227]

export default function CrashChart({ market, trade, open, haltUntil }) {
  const g = chartGeometry(market, trade)
  const { percentage } = marketChange(market)
  return (
    <div className="chart-wrap market-halted">
      <div className="chart-status">
        <span className={`halt-badge${open ? ' trading-open' : ''}`}>{open ? '● HANDEL KURZ GEÖFFNET' : 'Ⅱ HANDEL AUSGESETZT'}</span>
        <span>{`${market.name.toUpperCase()} / EUR`}</span>
      </div>
      <svg className="crash-chart" viewBox="0 0 680 300" role="img" aria-labelledby="crash-title crash-description">
        <title id="crash-title">{`${market.name}: Crash von ${fmt(market.opening)} auf ${fmt(market.price)} Euro`}</title>
        <desc id="crash-description">{`Kursverlust ${percentage} Prozent. Handel ausgesetzt. Preis fixiert bei ${fmt(market.price)} Euro.`}</desc>
        <defs>
          <linearGradient id="crash-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8bb6de" stopOpacity=".055" />
            <stop offset="100%" stopColor="#ff334a" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g stroke="#ffffff13" strokeWidth="1">
          <path d="M58 48H622 M58 83H622 M58 118H622 M58 153H622 M58 188H622 M58 223H622" />
          <path d="M58 48V242 M170 48V242 M282 48V242 M394 48V242 M506 48V242 M622 48V242" />
        </g>
        <g fill="#c7d0de" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="600">
          {g.labels.map((label, tick) => (
            <text key={tick} x="3" y={LABEL_Y[tick]} fontSize="16">{label}</text>
          ))}
          <text x="58" y="273">ERÖFFNUNG</text>
          <text x="302" y="273">CRASH</text>
          <text x="470" y="273">HANDELSPAUSE</text>
        </g>
        <path d={g.fillPath} fill="url(#crash-fill)" />
        <rect x="401" y="35" width="221" height="207" fill="#e7b34b" opacity=".045" />
        <path d="M401 35V242" stroke="#e7b34b" strokeDasharray="4 5" opacity=".6" />
        <path className="price-history" d={g.historyPath} fill="none" />
        <path className="price-crash" d={g.crashPath} />
        <path
          className={`price-event${g.recovery ? ' recovery' : ''}${g.trading ? ' trading' : ''}`}
          pathLength="1"
          d={g.eventPath}
        />
        <path d={g.dashPath} stroke="#e7b34b" strokeWidth="2" strokeDasharray="6 4" />
        <circle cx={g.dotX} cy={g.dotY} r="4" fill="#e7b34b" />
        <g fontFamily="Arial, sans-serif" fontWeight="bold">
          <text x="65" y={g.openingLabelY} fill="#e1e6ef" fontSize="23">{`${fmt(market.opening)} €`}</text>
          <text x="418" y="62" fill="#e7b34b" fontSize="19">{open ? 'HANDEL GEÖFFNET' : 'HANDEL GESTOPPT'}</text>
          <text x="418" y="88" fill="#c7d0de" fontSize="16">{`Kurs bleibt bei ${fmt(market.price)} €`}</text>
          <text x="530" y={g.priceLabelY} fill="#e7b34b" fontSize="28">{`${fmt(market.price)} €`}</text>
        </g>
      </svg>
      <div className="halt-summary">
        <span>{open ? 'NEUER KURS' : 'BARPREIS FIXIERT'}</span>
        <strong>{`${fmt(market.price)} €`}</strong>
        <span>{haltUntil}</span>
      </div>
    </div>
  )
}
