import { useEffect, useState } from 'react'
import { DRINKS, HAPPY_DRINKS, fmt, parsePrice } from '../lib/market.js'
import { ALARM_MS, MAX_MINUTES, activePromotions, formatEnd, isAlarmActive, isOpen } from '../lib/happyHour.js'
import { sendChange, useExchange } from '../lib/useExchange.js'
import { TOPICS } from '../lib/topics.js'
import './admin.css'

const toInput = price => price.toFixed(2)
const draftsFrom = prices => Object.fromEntries(DRINKS.map(({ name }) => [name, toInput(prices[name])]))
const THEME_OPTIONS = [['modern', 'Neu'], ['classic', 'Klassisch']]
const TILE_MODE_OPTIONS = [['scroll', 'Laufend'], ['page', 'Blättern'], ['fixed', 'Fest']]

// Zahlenfeld für eine Sekunden-Einstellung mit eigenem Übernehmen-Knopf.
function SecondsSetting({ id, label, min, max, value, disabled, onSave }) {
  const [draft, setDraft] = useState(null)
  const submit = async event => {
    event.preventDefault()
    if (await onSave(Number(draft))) setDraft(null)
  }
  return (
    <form className="admin-inline" onSubmit={submit}>
      <label htmlFor={id}>{label}</label>
      <input id={id} type="number" inputMode="numeric" min={min} max={max} step="1" required
        value={draft ?? String(value)} onChange={event => setDraft(event.target.value)} />
      <button type="submit" disabled={disabled || draft === null || Number(draft) === value}>Übernehmen</button>
    </form>
  )
}

// Textfeld mit eigenem Übernehmen-Knopf.
function TextSetting({ id, label, value, allowEmpty = false, disabled, onSave }) {
  const [draft, setDraft] = useState(null)
  const submit = async event => {
    event.preventDefault()
    if (await onSave(draft.trim())) setDraft(null)
  }
  const current = draft ?? value
  return (
    <form className="admin-inline admin-text" onSubmit={submit}>
      <label htmlFor={id}>{label}</label>
      <input id={id} type="text" maxLength={60} required={!allowEmpty}
        value={current} onChange={event => setDraft(event.target.value)} />
      <button type="submit" disabled={disabled || draft === null || draft.trim() === value}>Übernehmen</button>
    </form>
  )
}

export default function AdminPage() {
  const { prices, happy, alarmAt, theme, settings, topic, menu, wheel, offset, synced, connected } = useExchange()
  const [drafts, setDrafts] = useState(null)
  const [priceFeedback, setPriceFeedback] = useState({ text: '', error: false })
  const [happyFeedback, setHappyFeedback] = useState({ text: '', error: false })
  const [alarmFeedback, setAlarmFeedback] = useState({ text: '', error: false })
  const [topicFeedback, setTopicFeedback] = useState({ text: '', error: false })
  const [tabChoice, setTab] = useState(null)
  // Der Einstellungs-Reiter folgt dem aktiven Thema, bis man selbst einen Reiter wählt.
  const settingsTab = tabChoice ?? topic ?? 'exchange'
  const [resetFeedback, setResetFeedback] = useState({ text: '', error: false })
  const [happyDrink, setHappyDrink] = useState('Bier')
  const [displayFeedback, setDisplayFeedback] = useState({ text: '', error: false })
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
    if (synced && drafts === null) setDrafts(draftsFrom(prices))
  }, [synced, drafts, prices])

  const changed = drafts
    ? DRINKS.filter(({ name }) => parsePrice(drafts[name]) !== prices[name]).map(({ name }) => name)
    : []
  const serverNow = now + offset
  const promotions = activePromotions(happy, prices)

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
    if (state) setDrafts(draftsFrom(state.prices))
  }

  function startHappyHour(event) {
    event.preventDefault()
    const drink = happyDrink
    run(() => sendChange('POST', '/api/happy-hour', { drink, price: happyPrice, minutes: happyMinutes }), setHappyFeedback,
      state => `${drink}: ${fmt(state.happy[drink].price)} € · ${formatEnd(state.happy[drink])}.`)
  }

  function triggerAlarm() {
    run(() => sendChange('POST', '/api/alarm'), setAlarmFeedback, () => 'Alarm ausgelöst.')
  }

  function resetHappyHour(drink) {
    run(() => sendChange('POST', '/api/happy-hour/reset', { drink }), setHappyFeedback,
      state => `${drink}: zurück auf ${fmt(state.happy[drink].price)} €.`)
  }

  function chooseTheme(value) {
    run(() => sendChange('PUT', '/api/theme', { theme: value }), setDisplayFeedback,
      () => `Design „${THEME_OPTIONS.find(([key]) => key === value)[1]}“ wird angezeigt.`)
  }

  function chooseTopic(value) {
    run(() => sendChange('PUT', '/api/topic', { topic: value }), setTopicFeedback,
      () => `Thema „${TOPICS.find(item => item.id === value).label}“ wird angezeigt.`)
  }

  function changeTopicSettings(which, update, message) {
    return run(() => sendChange('PUT', `/api/${which}`, update), setDisplayFeedback, () => message)
  }

  function changeSettings(update, message) {
    return run(() => sendChange('PUT', '/api/settings', update), setDisplayFeedback, () => message)
  }

  async function resetAll() {
    if (!window.confirm('Wirklich alles zurücksetzen? Alle Preise gehen auf Standard, alle Happy Hours enden.')) return
    const state = await run(() => sendChange('POST', '/api/reset'), setResetFeedback, () => 'Alles zurückgesetzt.')
    if (state) setDrafts(draftsFrom(state.prices))
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
        <h2>Happy Hour</h2>
        {promotions.length === 0 ? (
          <p className="admin-current">Keine Happy Hour aktiv – alle Getränke zum Normalpreis.</p>
        ) : (
          <ul className="admin-running">
            {promotions.map(({ name, state }) => (
              <li key={name}>
                <span>
                  <b>{name}</b> <strong>{fmt(state.price)} €</strong>
                  {` · ${state.expiresAt ? `bis ${formatEnd(state)} Uhr` : 'bis zur Rücksetzung'}`}
                  {isOpen(state, serverNow) && <span className="admin-pill">Handel kurz geöffnet</span>}
                </span>
                <button type="button" onClick={() => resetHappyHour(name)} disabled={busy || !connected}>
                  Beenden ({fmt(prices[name])} €)
                </button>
              </li>
            ))}
          </ul>
        )}
        <form className="admin-happy" onSubmit={startHappyHour}>
          <fieldset className="admin-choice">
            <legend>Getränk</legend>
            {HAPPY_DRINKS.map(name => (
              <button key={name} type="button" aria-pressed={happyDrink === name}
                className={happyDrink === name ? 'selected' : ''} onClick={() => setHappyDrink(name)}>
                {name}
              </button>
            ))}
          </fieldset>
          <label>
            Happy-Hour-Preis (€)
            <input type="number" inputMode="decimal" min="0" max="99" step="0.01" required
              value={happyPrice} onChange={event => setHappyPrice(event.target.value)} />
          </label>
          <label>
            Laufzeit (Minuten)
            <input type="number" inputMode="numeric" min="0" max={MAX_MINUTES} step="1" required
              value={happyMinutes} onChange={event => setHappyMinutes(event.target.value)} />
          </label>
          <small>
            Normalpreis {happyDrink}: {fmt(prices[happyDrink])} €. 0 Minuten = bis zur manuellen Rücksetzung.
            Während einer Happy Hour blendet die Anzeige alle 3 Minuten „HAPPY HOUR“ ein.
          </small>
          <div className="admin-actions">
            <button type="submit" className="primary" disabled={busy || !connected}>Happy Hour für {happyDrink} starten</button>
          </div>
        </form>
        <p className={`admin-feedback${happyFeedback.error ? ' error' : ''}`} role="status" aria-live="polite">{happyFeedback.text}</p>
      </section>

      <section className="admin-card">
        <h2>Thema der Anzeige</h2>
        <div className="admin-choice admin-topics" role="group" aria-label="Thema">
          {TOPICS.map(({ id, label }) => (
            <button key={id} type="button" aria-pressed={topic === id}
              className={topic === id ? 'selected' : ''} onClick={() => chooseTopic(id)} disabled={busy || !connected}>
              {label}
            </button>
          ))}
        </div>
        <small className="admin-hint">Preise, Happy Hours und Alarm gelten für alle Themen.</small>
        <p className={`admin-feedback${topicFeedback.error ? ' error' : ''}`} role="status" aria-live="polite">{topicFeedback.text}</p>
      </section>

      <section className="admin-card">
        <h2>Einstellungen</h2>
        <div className="admin-tabs" role="tablist" aria-label="Einstellungen je Thema">
          {TOPICS.map(({ id, label }) => (
            <button key={id} type="button" role="tab" aria-selected={settingsTab === id}
              className={settingsTab === id ? 'selected' : ''} onClick={() => setTab(id)}>
              {label}{topic === id && <span className="admin-tab-live"> · aktiv</span>}
            </button>
          ))}
        </div>

        {settingsTab === 'exchange' && (
          <div role="tabpanel">
            <fieldset className="admin-choice">
              <legend>Design</legend>
              {THEME_OPTIONS.map(([value, label]) => (
                <button key={value} type="button" aria-pressed={theme === value}
                  className={theme === value ? 'selected' : ''} onClick={() => chooseTheme(value)} disabled={busy || !connected}>
                  {label}
                </button>
              ))}
            </fieldset>
            <div className="admin-spaced">
                <SecondsSetting id="market-seconds" label="Kursübersicht mit Chart wechseln alle (Sekunden)" min={3} max={600} value={settings.marketSeconds}
                  disabled={busy || !connected} onSave={value => changeSettings({ marketSeconds: value }, `Kursübersicht wechselt alle ${value} Sekunden.`)} />
                <small className="admin-hint">Bier → Gin Tonic → Vodka Bull → Aperol Spritz. Nach einer Preisänderung bleibt das Getränk 24 Sekunden stehen.</small>
                <fieldset className="admin-choice admin-spaced">
                  <legend>Getränkeleiste (über dem Laufband)</legend>
                  {TILE_MODE_OPTIONS.map(([value, label]) => (
                    <button key={value} type="button" aria-pressed={settings.tileMode === value}
                      className={settings.tileMode === value ? 'selected' : ''} disabled={busy || !connected}
                      onClick={() => changeSettings({ tileMode: value }, `Getränkeleiste: ${label}.`)}>
                      {label}
                    </button>
                  ))}
                </fieldset>
                <SecondsSetting id="tile-seconds" label="Tempo (Sekunden)" min={1} max={120} value={settings.tileSeconds}
                  disabled={busy || !connected} onSave={value => changeSettings({ tileSeconds: value }, `Tempo der Getränkeleiste: ${value} Sekunden.`)} />
                <small className="admin-hint">
                  Laufend: alle {settings.tileSeconds} s ein Getränk weiter. Blättern: alle {settings.tileSeconds} s die nächsten fünf Getränke. Fest: alle zehn stehen still.
                </small>
                <fieldset className="admin-choice admin-spaced">
                  <legend>Reporter</legend>
                </fieldset>
                <SecondsSetting id="scene-seconds" label="Szene wechseln alle (Sekunden)" min={5} max={600} value={settings.sceneSeconds}
                  disabled={busy || !connected} onSave={value => changeSettings({ sceneSeconds: value }, `Szenenwechsel alle ${value} Sekunden.`)} />
                <SecondsSetting id="news-seconds" label="Neue Meldung alle (Sekunden)" min={3} max={60} value={settings.newsSeconds}
                  disabled={busy || !connected} onSave={value => changeSettings({ newsSeconds: value }, `Neue Meldung alle ${value} Sekunden.`)} />
                <small className="admin-hint">
                  Die Szenen (Studio, Brauerei, Getränkemarkt …) wechseln der Reihe nach. Eilmeldungen zu Preisänderungen bleiben immer 24 Sekunden stehen.
                </small>
                <fieldset className="admin-choice admin-spaced">
                  <legend>Laufband unten</legend>
                  {[[true, 'An'], [false, 'Aus']].map(([value, label]) => (
                    <button key={label} type="button" aria-pressed={settings.showTicker === value}
                      className={settings.showTicker === value ? 'selected' : ''} disabled={busy || !connected}
                      onClick={() => changeSettings({ showTicker: value }, `Laufband ${label.toLowerCase()}.`)}>
                      {label}
                    </button>
                  ))}
                </fieldset>
            </div>
          </div>
        )}

        {settingsTab === 'menu' && (
          <div role="tabpanel">
            <TextSetting id="menu-title" label="Titel" value={menu.title} disabled={busy || !connected}
              onSave={value => changeTopicSettings('menu', { title: value }, 'Titel gespeichert.')} />
            <TextSetting id="menu-subtitle" label="Untertitel" value={menu.subtitle} allowEmpty disabled={busy || !connected}
              onSave={value => changeTopicSettings('menu', { subtitle: value }, 'Untertitel gespeichert.')} />
            <TextSetting id="menu-note" label="Hinweis unten" value={menu.note} allowEmpty disabled={busy || !connected}
              onSave={value => changeTopicSettings('menu', { note: value }, 'Hinweis gespeichert.')} />
            <fieldset className="admin-choice admin-spaced">
              <legend>Emojis vor den Getränken</legend>
              {[[true, 'An'], [false, 'Aus']].map(([value, label]) => (
                <button key={label} type="button" aria-pressed={menu.showEmoji === value}
                  className={menu.showEmoji === value ? 'selected' : ''} disabled={busy || !connected}
                  onClick={() => changeTopicSettings('menu', { showEmoji: value }, `Emojis ${label.toLowerCase()}.`)}>
                  {label}
                </button>
              ))}
            </fieldset>
          </div>
        )}

        {settingsTab === 'wheel' && (
          <div role="tabpanel">
            <TextSetting id="wheel-title" label="Titel" value={wheel.title} disabled={busy || !connected}
              onSave={value => changeTopicSettings('wheel', { title: value }, 'Titel gespeichert.')} />
            <SecondsSetting id="wheel-seconds" label="Drehen alle (Sekunden)" min={10} max={600} value={wheel.spinSeconds}
              disabled={busy || !connected} onSave={value => changeTopicSettings('wheel', { spinSeconds: value }, `Das Rad dreht sich alle ${value} Sekunden.`)} />
            <small className="admin-hint">Das Rad dreht sich 6 Sekunden lang und kürt dann den „Drink der Runde“ – auf allen Anzeigen gleich.</small>
            <fieldset className="admin-choice admin-spaced">
              <legend>Preise auf dem Rad</legend>
              {[[true, 'An'], [false, 'Aus']].map(([value, label]) => (
                <button key={label} type="button" aria-pressed={wheel.showPrices === value}
                  className={wheel.showPrices === value ? 'selected' : ''} disabled={busy || !connected}
                  onClick={() => changeTopicSettings('wheel', { showPrices: value }, `Preise ${label.toLowerCase()}.`)}>
                  {label}
                </button>
              ))}
            </fieldset>
          </div>
        )}

        <p className={`admin-feedback${displayFeedback.error ? ' error' : ''}`} role="status" aria-live="polite">{displayFeedback.text}</p>
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
                    {HAPPY_DRINKS.includes(name) && <small> (Normalpreis)</small>}
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

      <section className="admin-card admin-danger">
        <h2>Alles zurücksetzen</h2>
        <p className="admin-current">Setzt alle Preise auf Standard, beendet alle Happy Hours und stoppt den Alarm. Thema und Einstellungen bleiben.</p>
        <button type="button" className="danger" onClick={resetAll} disabled={busy || !connected}>Alles zurücksetzen</button>
        <p className={`admin-feedback${resetFeedback.error ? ' error' : ''}`} role="status" aria-live="polite">{resetFeedback.text}</p>
      </section>

      <p className="admin-note">Preise werden auf dem Server gespeichert und gelten für alle Anzeigen. Nach einem neuen Deploy gelten wieder die Standardpreise.</p>
    </main>
  )
}
