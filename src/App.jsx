export default function App() {
  return (
    <iframe
      className="exchange-display"
      src={`${import.meta.env.BASE_URL}halloween_exchange_animiert.html`}
      title="RUPI BAR – Halloween Exchange"
      allow="fullscreen"
    />
  )
}