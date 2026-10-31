export default function Header({ now }) {
  const clock = new Date(now).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  return (
    <header>
      <div>
        <div className="brand">
          {'🎃 HALLOWEEN '}
          <span>EXCHANGE</span>
          <span className="brand-venue">RUPI BAR</span>
          <span className="brand-skull" aria-label="Totenkopf">☠</span>
        </div>
        <div className="subtitle">GETRÄNKEBÖRSE LIVE</div>
      </div>
      <div className="header-right">
        <span id="clock">{clock}</span>
        <span className="live">● LIVE</span>
      </div>
    </header>
  )
}
