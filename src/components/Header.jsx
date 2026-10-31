export default function Header({ now }) {
  const time = new Date(now)
  const clock = time.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  const date = time.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <header>
      <div className="brand">
        <span className="brand-name">Rupi Bar</span>
        <span className="brand-sub">Halloween Exchange</span>
        <span className="brand-tag">Getränkebörse</span>
      </div>
      <div className="header-right">
        <span className="date">{date}</span>
        <span id="clock">{clock}</span>
        <span className="live">Live</span>
      </div>
    </header>
  )
}
