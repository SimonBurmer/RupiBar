import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_PRICES, HAPPY_DRINKS, buildBoard, chartGeometry, fmt, parsePrice } from '../src/lib/market.js'
import {
  ALARM_MS, HAPPY_FLASH_DELAY_MS, HAPPY_FLASH_EVERY_MS, HAPPY_FLASH_MS, activePromotions, bulletin, formatEnd,
  happyFlash, isAlarmActive, isExpired, isOpen, latestEvent, parseInput
} from '../src/lib/happyHour.js'
import { createStore } from '../src/lib/store.js'

const T0 = 1800000000000
const currentPrices = happy => Object.fromEntries(Object.entries(happy).map(([name, state]) => [name, state.price]))

test('Happy Hour gibt es für alle vier Kursübersichten', () => {
  assert.deepEqual(HAPPY_DRINKS, ['Bier', 'Gin Tonic', 'Vodka Bull', 'Aperol Spritz'])
})

test('Preise und Happy-Hour-Kurse wirken auf Kurse, Getränkekarte und Ticker', () => {
  const store = createStore()
  store.setPrices({ Vodka: '1,20' }, T0)
  store.setHappyHour('Gin Tonic', '2.5', '30', T0)
  const { prices, happy } = store.snapshot()
  const { markets, drinks } = buildBoard(prices, currentPrices(happy))
  assert.equal(markets.find(m => m.name === 'Gin Tonic').price, 2.5)
  assert.equal(drinks.find(d => d.name === 'Gin Tonic').price, 2.5)
  assert.equal(drinks.find(d => d.name === 'Vodka').price, 1.2)
  assert.equal(markets[0].price, 2)
  assert.equal(fmt(2.5), '2,50')
})

test('Handelsphase, Eilmeldung und Ablauf je Getränk', () => {
  const store = createStore()
  assert.equal(store.setHappyHour('Aperol Spritz', 3, 30, T0).ok, true)
  let { happy, prices } = store.snapshot()
  assert.equal(isOpen(happy['Aperol Spritz'], T0), true)
  assert.equal(isOpen(happy['Aperol Spritz'], T0 + 6500), false)
  assert.equal(latestEvent(happy), 'Aperol Spritz')
  assert.equal(bulletin(happy, T0).headline, 'EIL: APEROL SPRITZ ABGESTÜRZT')
  assert.deepEqual(activePromotions(happy, prices).map(p => p.name), ['Aperol Spritz'])

  const end = T0 + 30 * 60000
  assert.equal(store.tick(end - 1), false)
  assert.equal(store.tick(end), true)
  ;({ happy, prices } = store.snapshot())
  assert.equal(happy['Aperol Spritz'].price, 4)
  assert.equal(bulletin(happy, end).headline, 'EIL: APEROL SPRITZ ERHOLT SICH')
  const g = chartGeometry({ name: 'Aperol Spritz', opening: 8, price: 4 }, { ...happy['Aperol Spritz'], open: true }, 4)
  assert.equal(g.recovery, true)
  assert.equal(g.trading, true)
  assert.equal(activePromotions(happy, prices).length, 0)
})

test('Mehrere Happy Hours laufen unabhängig', () => {
  const store = createStore()
  store.setHappyHour('Bier', 1.5, 10, T0)
  store.setHappyHour('Vodka Bull', 2, 0, T0 + 1000)
  store.tick(T0 + 10 * 60000)
  const { happy, prices } = store.snapshot()
  assert.equal(happy.Bier.price, 2)
  assert.equal(happy['Vodka Bull'].price, 2)
  assert.equal(isExpired(happy['Vodka Bull'], T0 + 8 * 3600000), false)
  assert.equal(formatEnd(happy['Vodka Bull']), 'bis zur Rücksetzung')
  store.resetHappyHour('Vodka Bull', T0 + 11 * 60000)
  assert.equal(store.snapshot().happy['Vodka Bull'].price, 4)
  assert.equal(store.setHappyHour('Vodka', 1, 10, T0).ok, false, 'nur für Kursübersichten')
  assert.equal(prices.Bier, 2)
})

test('Neuer Normalpreis: Kurs folgt sofort, außer während einer Happy Hour', () => {
  const store = createStore()
  store.setPrices({ Bier: 2.5 }, T0)
  assert.equal(store.snapshot().happy.Bier.price, 2.5)
  store.setHappyHour('Gin Tonic', 2, 10, T0)
  store.setPrices({ 'Gin Tonic': 5 }, T0 + 1000)
  assert.equal(store.snapshot().happy['Gin Tonic'].price, 2, 'Happy Hour läuft weiter')
  store.tick(T0 + 10 * 60000)
  assert.equal(store.snapshot().happy['Gin Tonic'].price, 5, 'danach gilt der neue Normalpreis')
})

test('Alles zurücksetzen', () => {
  const store = createStore()
  store.setPrices({ Vodka: 3, Bier: 2.5 }, T0)
  store.setHappyHour('Gin Tonic', 1, 0, T0)
  store.triggerAlarm(T0)
  store.setTheme('classic')
  store.resetAll(T0 + 1000)
  const { prices, happy, alarmAt, theme } = store.snapshot()
  assert.deepEqual(prices, DEFAULT_PRICES)
  for (const name of HAPPY_DRINKS) assert.equal(happy[name].price, DEFAULT_PRICES[name])
  assert.equal(activePromotions(happy, prices).length, 0)
  assert.equal(alarmAt, 0)
  assert.equal(theme, 'classic', 'Design bleibt')
})

test('Design wählen', () => {
  const store = createStore()
  assert.equal(store.snapshot().theme, 'modern')
  assert.equal(store.setTheme('classic').ok, true)
  assert.equal(store.setTheme('neon').ok, false)
  assert.equal(store.snapshot().theme, 'classic')
})

test('Happy-Hour-Einblendung: nach dem Start, dann alle 3 Minuten', () => {
  const store = createStore()
  store.setHappyHour('Bier', 1, 0, T0)
  const { happy, prices } = store.snapshot()
  const at = ms => happyFlash(happy, prices, T0 + ms).length > 0
  assert.equal(at(0), false, 'nicht während der Handelsöffnung')
  assert.equal(at(HAPPY_FLASH_DELAY_MS), true)
  assert.equal(at(HAPPY_FLASH_DELAY_MS + HAPPY_FLASH_MS), false)
  assert.equal(at(HAPPY_FLASH_DELAY_MS + HAPPY_FLASH_EVERY_MS + 1), true)
  assert.deepEqual(happyFlash(happy, prices, T0 + HAPPY_FLASH_DELAY_MS).map(p => p.name), ['Bier'])
  const none = createStore().snapshot()
  assert.equal(happyFlash(none.happy, none.prices, T0 + HAPPY_FLASH_DELAY_MS).length, 0)
})

test('Alarm ist für ALARM_MS aktiv', () => {
  const store = createStore()
  assert.equal(isAlarmActive(0, T0), false)
  store.triggerAlarm(T0)
  const { alarmAt } = store.snapshot()
  assert.equal(isAlarmActive(alarmAt, T0 + ALARM_MS - 1), true)
  assert.equal(isAlarmActive(alarmAt, T0 + ALARM_MS), false)
})

test('Eingabeprüfung', () => {
  const store = createStore()
  assert.equal(store.setPrices({ Cola: 2 }, T0).ok, false)
  assert.equal(store.setPrices({ Vodka: '' }, T0).ok, false)
  assert.equal(parseInput('-1', '30'), null)
  assert.equal(parseInput('1.5', '0.5'), null)
  assert.equal(parseInput('', ''), null)
  assert.deepEqual(parseInput('1,555', '5'), { price: 1.56, minutes: 5 })
  assert.equal(parsePrice(' 2,5 '), 2.5)
})

test('Anzeige-Einstellungen: Getränkeleiste, Tempo, Laufband', () => {
  const store = createStore()
  assert.deepEqual(store.snapshot().settings, { tileMode: 'scroll', tileSeconds: 5, showTicker: true, sceneSeconds: 30, newsSeconds: 9 })
  assert.equal(store.setSettings({ tileMode: 'page', tileSeconds: 8 }).ok, true)
  assert.equal(store.setSettings({ showTicker: false }).ok, true)
  assert.deepEqual(store.snapshot().settings, { tileMode: 'page', tileSeconds: 8, showTicker: false, sceneSeconds: 30, newsSeconds: 9 })
  assert.equal(store.setSettings({ tileMode: 'wild' }).ok, false)
  assert.equal(store.setSettings({ tileSeconds: 0 }).ok, false)
  assert.equal(store.setSettings({ tileSeconds: 2.5 }).ok, false)
  assert.equal(store.setSettings({ showTicker: 'ja' }).ok, false)
  assert.equal(store.setSettings({ tileMode: 'fixed', tileSeconds: 999 }).ok, false, 'alles oder nichts')
  assert.equal(store.snapshot().settings.tileMode, 'page')
  store.resetAll(T0)
  assert.equal(store.snapshot().settings.showTicker, false, 'Zurücksetzen behält die Einstellungen')
})

test('Reporter-Takt einstellen', () => {
  const store = createStore()
  assert.equal(store.snapshot().settings.sceneSeconds, 30)
  assert.equal(store.snapshot().settings.newsSeconds, 9)
  assert.equal(store.setSettings({ sceneSeconds: 15, newsSeconds: 5 }).ok, true)
  assert.equal(store.setSettings({ sceneSeconds: 2 }).ok, false)
  assert.equal(store.setSettings({ newsSeconds: 120 }).ok, false)
  assert.equal(store.snapshot().settings.sceneSeconds, 15)
})
