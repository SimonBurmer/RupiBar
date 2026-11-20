export default function Header({ now, sub = 'Getränkebörse', tag = 'Live-Kurse' }) {
  const time = new Date(now)
  const clock = time.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  const date = time.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <header>
      <div className="brand">
        <span className="brand-name">Rupi Bar</span>
        <span className="brand-sub">{sub}</span>
        {tag && <span className="brand-tag">{tag}</span>}
      </div>
      <div className="header-right">
        <span className="date">{date}</span>
        <span id="clock">{clock}</span>
        <span className="live">Live</span>
      </div>
    </header>
  )
}
