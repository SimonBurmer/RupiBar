import { useEffect, useState } from 'react'
import { DRINKS, fmt, parsePrice } from '../lib/market.js'
import { ALARM_MS, MAX_MINUTES, formatEnd, isAlarmActive, isOpen, isPromotion } from '../lib/happyHour.js'
import { sendChange, useExchange } from '../lib/useExchange.js'
import './admin.css'

const toInput = price => price.toFixed(2)

export default function AdminPage() {
  const { prices, happy, alarmAt, offset, synced, connected } = useExchange()
  const [drafts, setDrafts] = useState(null)
  const [priceFeedback, setPriceFeedback] = useState({ text: '', error: false })
  const [happyFeedback, setHappyFeedback] = useState({ text: '', error: false })
  const [alarmFeedback, setAlarmFeedback] = useState({ text: '', error: false })
  const [happyPrice, setHappyPrice] = useState('1.50')
  const [happyMinutes, setHappyMinutes] = useState('60')
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => { document.title = 'RUPI BAR – Admin' }, [])
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(timer)
  }, [])
  // Eingabefelder einmalig mit den Serverpreisen füllen.
  useEffect(() => {
    if (synced && drafts === null) setDrafts(Object.fromEntries(DRINKS.map(({ name }) => [name, toInput(prices[name])])))
  }, [synced, drafts, prices])

  const changed = drafts
    ? DRINKS.filter(({ name }) => parsePrice(drafts[name]) !== prices[name]).map(({ name }) => name)
    : []
  const promotion = isPromotion(happy, prices.Bier)

  async function run(action, setFeedback, success) {
    setBusy(true)
    try {
      const state = await action()
      setFeedback({ text: success(state), error: false })
      return state
    } catch (error) {
      setFeedback({ text: error.message, error: true })
      return null
    } finally {
      setBusy(false)
    }
  }

  async function savePrices(event) {
    event.preventDefault()
    const invalid = DRINKS.find(({ name }) => parsePrice(drafts[name]) === null)
    if (invalid) {
      setPriceFeedback({ text: `${invalid.name}: Bitte einen Preis von 0 bis 99 € eingeben.`, error: true })
      return
    }
    const update = Object.fromEntries(changed.map(name => [name, parsePrice(drafts[name])]))
    const state = await run(() => sendChange('PUT', '/api/prices', { prices: update }), setPriceFeedback,
      () => (changed.length ? `Gespeichert: ${changed.join(', ')}.` : 'Keine Änderungen.'))
    if (state) setDrafts(Object.fromEntries(DRINKS.map(({ name }) => [name, toInput(state.prices[name])])))
  }

  function startHappyHour(event) {
    event.preventDefault()
    run(() => sendChange('POST', '/api/happy-hour', { price: happyPrice, minutes: happyMinutes }), setHappyFeedback,
      state => `Übernommen: ${fmt(state.happy.price)} € · ${formatEnd(state.happy)}.`)
  }

  function triggerAlarm() {
    run(() => sendChange('POST', '/api/alarm'), setAlarmFeedback, () => 'Alarm ausgelöst.')
  }

  function resetHappyHour() {
    run(() => sendChange('POST', '/api/happy-hour/reset'), setHappyFeedback,
      state => `Zurückgesetzt auf ${fmt(state.happy.price)} €.`)
  }

  return (
    <main className="admin">
      <header className="admin-header">
        <div>
          <h1>Rupi Bar <span>Admin</span></h1>
          <p className={`admin-status${connected ? ' online' : ''}`}>
            {connected ? 'Verbunden – Änderungen erscheinen sofort auf der Anzeige.' : 'Keine Verbindung zum Server …'}
          </p>
        </div>
        <a className="admin-link" href="/">Zur Anzeige →</a>
      </header>

      <section className="admin-card admin-alarm">
        <h2>Alarm</h2>
        <p className="admin-current">Färbt alle Anzeigen für {ALARM_MS / 1000} Sekunden rot mit blinkendem ALARM.</p>
        <button type="button" className="alarm-button" onClick={triggerAlarm} disabled={busy || !connected}>
          {isAlarmActive(alarmAt, now + offset) ? 'Alarm läuft …' : 'Alarm'}
        </button>
        <p className={`admin-feedback${alarmFeedback.error ? ' error' : ''}`} role="status" aria-live="polite">{alarmFeedback.text}</p>
      </section>

      <section className="admin-card">
        <h2>Bier · Happy Hour</h2>
        <p className="admin-current">
          Aktuell: <strong>{fmt(happy.price)} €</strong>
          {promotion ? ` · Happy Hour ${happy.expiresAt ? `bis ${formatEnd(happy)} Uhr` : 'bis zur Rücksetzung'}` : ' · Normalpreis'}
          {isOpen(happy, now + offset) && <span className="admin-pill">Handel kurz geöffnet</span>}
        </p>
        <form className="admin-happy" onSubmit={startHappyHour}>
          <label>
            Neuer Bierpreis (€)
            <input type="number" inputMode="decimal" min="0" max="99" step="0.01" required
              value={happyPrice} onChange={event => setHappyPrice(event.target.value)} />
          </label>
          <label>
            Laufzeit (Minuten)
            <input type="number" inputMode="numeric" min="0" max={MAX_MINUTES} step="1" required
              value={happyMinutes} onChange={event => setHappyMinutes(event.target.value)} />
          </label>
          <small>0 = bis zur manuellen Rücksetzung. Danach gilt wieder der Normalpreis von {fmt(prices.Bier)} €.</small>
          <div className="admin-actions">
            <button type="submit" className="primary" disabled={busy || !connected}>Happy Hour starten</button>
            <button type="button" onClick={resetHappyHour} disabled={busy || !connected}>
              Zurück auf {fmt(prices.Bier)} €
            </button>
          </div>
        </form>
        <p className={`admin-feedback${happyFeedback.error ? ' error' : ''}`} role="status" aria-live="polite">{happyFeedback.text}</p>
      </section>

      <section className="admin-card">
        <h2>Getränkepreise</h2>
        {drafts === null ? (
          <p className="admin-current">Preise werden geladen …</p>
        ) : (
          <form onSubmit={savePrices}>
            <ul className="admin-prices">
              {DRINKS.map(({ name }) => (
                <li key={name} className={changed.includes(name) ? 'changed' : ''}>
                  <label htmlFor={`price-${name}`}>
                    {name}
                    {name === 'Bier' && <small> (Normalpreis)</small>}
                  </label>
                  <div className="admin-price-input">
                    <input id={`price-${name}`} type="number" inputMode="decimal" min="0" max="99" step="0.01" required
                      value={drafts[name]} onChange={event => setDrafts({ ...drafts, [name]: event.target.value })} />
                    <span>€</span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="admin-actions">
              <button type="submit" className="primary" disabled={busy || !connected || changed.length === 0}>
                {changed.length ? `${changed.length} Preis${changed.length === 1 ? '' : 'e'} speichern` : 'Preise speichern'}
              </button>
              <button type="button" disabled={busy || changed.length === 0}
                onClick={() => setDrafts(Object.fromEntries(DRINKS.map(({ name }) => [name, toInput(prices[name])])))}>
                Änderungen verwerfen
              </button>
            </div>
          </form>
        )}
        <p className={`admin-feedback${priceFeedback.error ? ' error' : ''}`} role="status" aria-live="polite">{priceFeedback.text}</p>
      </section>

      <p className="admin-note">Preise werden auf dem Server gespeichert und gelten für alle Anzeigen. Nach einem neuen Deploy gelten wieder die Standardpreise.</p>
    </main>
  )
}
