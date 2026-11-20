import { useEffect, useState } from 'react'
import { DRINKS, HAPPY_DRINKS, fmt, parsePrice } from '../lib/market.js'
import { ALARM_MS, MAX_MINUTES, activePromotions, formatEnd, isAlarmActive, isOpen } from '../lib/happyHour.js'
import { sendChange, useExchange } from '../lib/useExchange.js'
import { TOPICS } from '../lib/topics.js'
import './admin.css'

const toInput = price => price.toFixed(2)
const draftsFrom = prices => Object.fromEntries(DRINKS.map(({ name }) => [name, toInput(prices[name])]))
const TOPIC_DESCRIPTIONS = {
  exchange: 'Kurstafel mit Chart, Reportern und Laufband',
  menu: 'Ruhige Preisliste in drei Spalten',
  wheel: 'Das Rad kürt den Drink der Runde',
  pictures: 'Fotos der Gäste mit QR-Code zum Hochladen'
}
const THEME_OPTIONS = [['standard', 'Standard'], ['halloween', 'Halloween'], ['bunt', 'Bunt'], ['classic', 'Klassisch']]
const TILE_MODE_OPTIONS = [['scroll', 'Laufend'], ['page', 'Blättern'], ['fixed', 'Fest']]

// Sekunden-Einstellung in einer Zeile; „Speichern“ erscheint erst, wenn sich der Wert ändert.
function SecondsSetting({ id, label, min, max, value, disabled, onSave }) {
  const [draft, setDraft] = useState(null)
  const dirty = draft !== null && Number(draft) !== value
  const submit = async event => {
    event.preventDefault()
    if (await onSave(Number(draft))) setDraft(null)
  }
  return (
    <form className="admin-row" onSubmit={submit}>
      <label htmlFor={id}>{label}</label>
      <span className="admin-row-field">
        <input id={id} type="number" inputMode="numeric" min={min} max={max} step="1" required
          value={draft ?? String(value)} onChange={event => setDraft(event.target.value)} />
        <span className="admin-unit">s</span>
      </span>
      {dirty && <button type="submit" className="primary" disabled={disabled}>Speichern</button>}
    </form>
  )
}

// Textfeld; „Speichern“ erscheint erst, wenn sich etwas geändert hat.
function TextSetting({ id, label, value, allowEmpty = false, disabled, onSave }) {
  const [draft, setDraft] = useState(null)
  const dirty = draft !== null && draft.trim() !== value
  const submit = async event => {
    event.preventDefault()
    if (await onSave(draft.trim())) setDraft(null)
  }
  return (
    <form className="admin-row admin-row-text" onSubmit={submit}>
      <label htmlFor={id}>{label}</label>
      <input id={id} type="text" maxLength={60} required={!allowEmpty}
        value={draft ?? value} onChange={event => setDraft(event.target.value)} />
      {dirty && <button type="submit" className="primary" disabled={disabled}>Speichern</button>}
    </form>
  )
}

// Auswahl aus wenigen Knöpfen (z. B. An/Aus).
function Choice({ label, options, value, disabled, onChange }) {
  return (
    <div className="admin-choice-row">
      {label && <span className="admin-choice-label">{label}</span>}
      <div className="admin-choice" role="group" aria-label={label}>
        {options.map(([option, text]) => (
          <button key={String(option)} type="button" aria-pressed={value === option}
            className={value === option ? 'selected' : ''} disabled={disabled} onClick={() => value !== option && onChange(option, text)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

// Abschnitt innerhalb der Einstellungen mit kleiner Überschrift.
function Group({ title, children }) {
  return (
    <div className="admin-group">
      <h3>{title}</h3>
      {children}
    </div>
  )
}

const ON_OFF = [[true, 'An'], [false, 'Aus']]

export default function AdminPage() {
  const { prices, happy, alarmAt, theme, settings, topic, menu, wheel, pictureSettings, pictures, offset, synced, connected } = useExchange()
  const [drafts, setDrafts] = useState(null)
  const [priceFeedback, setPriceFeedback] = useState({ text: '', error: false })
  const [happyFeedback, setHappyFeedback] = useState({ text: '', error: false })
  const [alarmFeedback, setAlarmFeedback] = useState({ text: '', error: false })
  const [topicFeedback, setTopicFeedback] = useState({ text: '', error: false })
  const [photoFeedback, setPhotoFeedback] = useState({ text: '', error: false })
  const [resetFeedback, setResetFeedback] = useState({ text: '', error: false })
  const [happyDrink, setHappyDrink] = useState('Bier')
  const [displayFeedback, setDisplayFeedback] = useState({ text: '', error: false })
  const [happyPrice, setHappyPrice] = useState('1.50')
  const [happyMinutes, setHappyMinutes] = useState('60')
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  // Die Einstellungen zeigen immer das aktive Thema.
  const [pendingTopic, setPendingTopic] = useState(null)
  const shownTopic = pendingTopic ?? topic ?? 'exchange'
  const settingsTab = shownTopic
  const off = busy || !connected

  // Rückmeldung zum vorigen Thema ausblenden, sobald ein anderes Thema aktiv ist.
  useEffect(() => { setDisplayFeedback({ text: '', error: false }) }, [settingsTab])

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

  async function chooseTopic(value) {
    setPendingTopic(value)
    await run(() => sendChange('PUT', '/api/topic', { topic: value }), setTopicFeedback, () => '')
    setPendingTopic(null)
  }

  function changeTopicSettings(which, update, message) {
    return run(() => sendChange('PUT', `/api/${which}`, update), setDisplayFeedback, () => message)
  }

  async function pictureAction(method, url, message) {
    return run(() => sendChange(method, url), setPhotoFeedback, () => message)
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

      <section className="admin-card admin-topics-section">
        <h2>Thema der Anzeige</h2>
        <p className="admin-current">Tippe auf ein Thema, um es anzuzeigen. Darunter erscheinen seine Einstellungen.</p>
        <div className="topic-cards">
          {TOPICS.map(({ id, label }) => {
            const open = shownTopic === id
            return (
              <div key={id} className={`topic-card${open ? ' open' : ''}`}>
                <button type="button" className="topic-card-head" aria-expanded={open} disabled={off && !open}
                  onClick={() => !open && chooseTopic(id)}>
                  <span className="topic-card-text">
                    <span className="topic-card-name">{label}</span>
                    <span className="topic-card-desc">{TOPIC_DESCRIPTIONS[id]}</span>
                  </span>
                  {open ? <span className="topic-card-badge">Wird angezeigt</span> : <span className="topic-card-chevron" aria-hidden="true">›</span>}
                </button>
                {open && (
                  <div className="topic-card-body">

                  {settingsTab === 'exchange' && (
                    <>
                      <Group title="Design">
                        <Choice options={THEME_OPTIONS} value={theme} disabled={off} onChange={chooseTheme} />
                      </Group>
                      <Group title="Kursübersicht mit Chart">
                        <SecondsSetting id="market-seconds" label="Wechseln alle" min={3} max={600} value={settings.marketSeconds}
                          disabled={off} onSave={value => changeSettings({ marketSeconds: value }, `Kursübersicht wechselt alle ${value} Sekunden.`)} />
                        <small className="admin-hint">Bier → Gin Tonic → Vodka Bull → Aperol Spritz</small>
                      </Group>
                      <Group title="Getränkeleiste">
                        <Choice options={TILE_MODE_OPTIONS} value={settings.tileMode} disabled={off}
                          onChange={(value, label) => changeSettings({ tileMode: value }, `Getränkeleiste: ${label}.`)} />
                        {settings.tileMode !== 'fixed' && (
                          <>
                            <SecondsSetting id="tile-seconds" label={settings.tileMode === 'scroll' ? 'Ein Getränk weiter alle' : 'Umblättern alle'}
                              min={1} max={120} value={settings.tileSeconds} disabled={off}
                              onSave={value => changeSettings({ tileSeconds: value }, `Tempo der Getränkeleiste: ${value} Sekunden.`)} />
                          </>
                        )}
                      </Group>
                      <Group title="Reporter">
                        <SecondsSetting id="scene-seconds" label="Szene wechseln alle" min={5} max={600} value={settings.sceneSeconds}
                          disabled={off} onSave={value => changeSettings({ sceneSeconds: value }, `Szenenwechsel alle ${value} Sekunden.`)} />
                        <SecondsSetting id="news-seconds" label="Neue Meldung alle" min={3} max={60} value={settings.newsSeconds}
                          disabled={off} onSave={value => changeSettings({ newsSeconds: value }, `Neue Meldung alle ${value} Sekunden.`)} />
                      </Group>
                      <Group title="Laufband unten">
                        <Choice options={ON_OFF} value={settings.showTicker} disabled={off}
                          onChange={(value, label) => changeSettings({ showTicker: value }, `Laufband ${label.toLowerCase()}.`)} />
                      </Group>
                    </>
                  )}

                  {settingsTab === 'menu' && (
                    <>
                      <Group title="Texte">
                        <TextSetting id="menu-title" label="Titel" value={menu.title} disabled={off}
                          onSave={value => changeTopicSettings('menu', { title: value }, 'Titel gespeichert.')} />
                        <TextSetting id="menu-subtitle" label="Untertitel" value={menu.subtitle} allowEmpty disabled={off}
                          onSave={value => changeTopicSettings('menu', { subtitle: value }, 'Untertitel gespeichert.')} />
                        <TextSetting id="menu-note" label="Hinweis unten" value={menu.note} allowEmpty disabled={off}
                          onSave={value => changeTopicSettings('menu', { note: value }, 'Hinweis gespeichert.')} />
                      </Group>
                      <Group title="Emojis vor den Getränken">
                        <Choice options={ON_OFF} value={menu.showEmoji} disabled={off}
                          onChange={(value, label) => changeTopicSettings('menu', { showEmoji: value }, `Emojis ${label.toLowerCase()}.`)} />
                      </Group>
                    </>
                  )}

                  {settingsTab === 'wheel' && (
                    <>
                      <Group title="Texte">
                        <TextSetting id="wheel-title" label="Titel" value={wheel.title} disabled={off}
                          onSave={value => changeTopicSettings('wheel', { title: value }, 'Titel gespeichert.')} />
                      </Group>
                      <Group title="Rad">
                        <SecondsSetting id="wheel-seconds" label="Drehen alle" min={10} max={600} value={wheel.spinSeconds}
                          disabled={off} onSave={value => changeTopicSettings('wheel', { spinSeconds: value }, `Das Rad dreht sich alle ${value} Sekunden.`)} />
                        <Choice label="Preise auf dem Rad" options={ON_OFF} value={wheel.showPrices} disabled={off}
                          onChange={(value, label) => changeTopicSettings('wheel', { showPrices: value }, `Preise ${label.toLowerCase()}.`)} />
                      </Group>
                    </>
                  )}

                  {settingsTab === 'pictures' && (
                    <>
                      <Group title="Anzeige">
                        <TextSetting id="pictures-title" label="Titel neben dem QR-Code" value={pictureSettings.title} disabled={off}
                          onSave={value => changeTopicSettings('picture-settings', { title: value }, 'Titel gespeichert.')} />
                        <Choice label="Größe" options={[['m', 'Normal'], ['l', 'Groß'], ['xl', 'Sehr groß']]} value={pictureSettings.size} disabled={off}
                onChange={(value, label) => changeTopicSettings('picture-settings', { size: value }, `Bildgröße: ${label}.`)} />
              <SecondsSetting id="pictures-seconds" label="Bild wechseln alle" min={3} max={120} value={pictureSettings.intervalSeconds}
                          disabled={off} onSave={value => changeTopicSettings('picture-settings', { intervalSeconds: value }, `Neues Bild alle ${value} Sekunden.`)} />
                        <Choice label="QR-Code" options={ON_OFF} value={pictureSettings.showQr} disabled={off}
                          onChange={(value, label) => changeTopicSettings('picture-settings', { showQr: value }, `QR-Code ${label.toLowerCase()}.`)} />
                      </Group>
                      <Group title="Neue Fotos">
                        <Choice options={[[false, 'Sofort zeigen'], [true, 'Erst nach Freigabe']]} value={pictureSettings.requireApproval} disabled={off}
                          onChange={(value, label) => changeTopicSettings('picture-settings', { requireApproval: value }, `Neue Fotos: ${label}.`)} />
                        <small className="admin-hint">Hochladen: <a href="/upload" target="_blank" rel="noreferrer">{window.location.host}/upload</a></small>
                      </Group>
                    </>
                  )}

                  <p className={`admin-feedback${displayFeedback.error ? ' error' : ''}`} role="status" aria-live="polite">{displayFeedback.text}</p>
                    {id === 'pictures' && (
                      <>
                      {pictures.length === 0 ? (
                        <Group title="Fotos"><p className="admin-current">Noch keine Fotos hochgeladen.</p></Group>
                      ) : (
                        [['pending', 'Warten auf Freigabe'], ['live', 'Auf der Anzeige']].map(([status, label]) => {
                          const list = pictures.filter(picture => picture.status === status).sort((x, y) => y.at - x.at)
                          if (!list.length) return null
                          return (
                            <Group key={status} title={`${label} (${list.length})`}>
                              <ul className="admin-photos">
                                {list.map(picture => (
                                  <li key={picture.id}>
                                    <a href={`/api/pictures/${picture.id}`} target="_blank" rel="noreferrer">
                                      <img src={`/api/pictures/${picture.id}`} alt="" loading="lazy" />
                                    </a>
                                    <span className="admin-photo-name">{picture.name || 'ohne Namen'}</span>
                                    <span className="admin-photo-actions">
                                      {status === 'pending' && (
                                        <button type="button" className="primary" disabled={off}
                                          onClick={() => pictureAction('POST', `/api/pictures/${picture.id}/approve`, 'Foto freigegeben.')}>
                                          Freigeben
                                        </button>
                                      )}
                                      <button type="button" className="danger" disabled={off}
                                        onClick={() => window.confirm('Dieses Foto löschen?') && pictureAction('DELETE', `/api/pictures/${picture.id}`, 'Foto gelöscht.')}>
                                        Löschen
                                      </button>
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </Group>
                          )
                        })
                      )}
                      <p className={`admin-feedback${photoFeedback.error ? ' error' : ''}`} role="status" aria-live="polite">{photoFeedback.text}</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <small className="admin-hint">Preise, Happy Hours und Alarm gelten für alle Themen.</small>
        <p className={`admin-feedback${topicFeedback.error ? ' error' : ''}`} role="status" aria-live="polite">{topicFeedback.text}</p>
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
