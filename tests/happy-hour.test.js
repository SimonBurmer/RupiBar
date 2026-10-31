import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_PRICES, buildBoard, chartGeometry, fmt, parsePrice } from '../src/lib/market.js'
import { ALARM_MS, INITIAL_HAPPY, bulletin, isAlarmActive, formatEnd, isExpired, isOpen, isPromotion, nextState, parseInput } from '../src/lib/happyHour.js'
import { createStore } from '../src/lib/store.js'

const T0 = 1800000000000

test('Preise wirken auf Kurse, Getränkekarte und Ticker', () => {
  const { markets, drinks } = buildBoard({ ...DEFAULT_PRICES, 'Gin Tonic': 5 }, 1.5)
  assert.equal(markets[0].price, 1.5)
  assert.equal(drinks[0].price, 1.5)
  assert.equal(fmt(drinks[0].price), '1,50')
  assert.equal(markets.find(market => market.name === 'Gin Tonic').price, 5)
  assert.equal(drinks.find(drink => drink.name === 'Gin Tonic').price, 5)
})

test('Handelsphasen: kurz geöffnet, danach ausgesetzt', () => {
  const state = nextState(INITIAL_HAPPY, 1.5, 30, T0)
  assert.equal(isOpen(state, T0), true)
  assert(bulletin(state, T0).headline.includes('ABGESTÜRZT'))
  assert.equal(isOpen(state, T0 + 6500), false)
  assert.equal(isPromotion(state, 2), true)
})

test('Happy Hour läuft ab und der Kurs erholt sich auf den Normalpreis', () => {
  const store = createStore()
  assert.equal(store.setHappyHour('1.5', '30', T0).ok, true)
  assert.equal(store.snapshot().happy.price, 1.5)
  const end = T0 + 30 * 60000
  assert.equal(store.tick(end - 1), false)
  assert.equal(store.tick(end), true)
  const { happy } = store.snapshot()
  assert.equal(happy.price, 2)
  assert(bulletin(happy, end).headline.includes('ERHOLT'))
  const geometry = chartGeometry(buildBoard(DEFAULT_PRICES, 2).markets[0], { ...happy, open: true }, 2)
  assert.equal(geometry.recovery, true)
  assert.equal(geometry.trading, true)
  assert.notEqual(geometry.eventPath, '')
})

test('Unbegrenzte Laufzeit und manuelles Zurücksetzen', () => {
  const store = createStore()
  store.setHappyHour(1.25, 0, T0)
  const { happy } = store.snapshot()
  assert.equal(happy.expiresAt, null)
  assert.equal(isExpired(happy, T0 + 8 * 3600000), false)
  assert.equal(formatEnd(happy), 'bis zur Rücksetzung')
  store.resetHappyHour(T0 + 1)
  assert.equal(store.snapshot().happy.price, 2)
  assert.equal(isPromotion(store.snapshot().happy, 2), false)
})

test('Getränkepreise ändern', () => {
  const store = createStore()
  assert.equal(store.setPrices({ Vodka: '1,20', 'Aperol Spritz': 4.5 }, T0).ok, true)
  assert.equal(store.snapshot().prices.Vodka, 1.2)
  assert.equal(store.snapshot().prices['Aperol Spritz'], 4.5)
  assert.equal(store.snapshot().happy.eventAt, 0, 'andere Getränke lösen keine Biermeldung aus')
  assert.equal(store.setPrices({ Cola: 2 }, T0).ok, false)
  assert.equal(store.setPrices({ Vodka: -1 }, T0).ok, false)
  assert.equal(store.setPrices({ Vodka: '' }, T0).ok, false)
  assert.equal(store.setPrices(null, T0).ok, false)
  assert.equal(store.snapshot().prices.Vodka, 1.2, 'ungültige Eingaben ändern nichts')
})

test('Neuer Bier-Normalpreis: Kurs folgt sofort, außer während einer Happy Hour', () => {
  const store = createStore()
  store.setPrices({ Bier: 2.5 }, T0)
  assert.equal(store.snapshot().happy.price, 2.5)
  assert.equal(store.snapshot().happy.eventAt, T0)

  store.setHappyHour(1, 10, T0 + 1000)
  store.setPrices({ Bier: 3 }, T0 + 2000)
  assert.equal(store.snapshot().happy.price, 1, 'Happy Hour läuft weiter')
  store.tick(T0 + 1000 + 10 * 60000)
  assert.equal(store.snapshot().happy.price, 3, 'nach Ablauf gilt der neue Normalpreis')
})

test('Eingabeprüfung', () => {
  assert.equal(parseInput('-1', '30'), null)
  assert.equal(parseInput('1.5', '0.5'), null)
  assert.equal(parseInput('100', '1'), null)
  assert.equal(parseInput('1', '10081'), null)
  assert.equal(parseInput('', ''), null)
  assert.deepEqual(parseInput('0', '1'), { price: 0, minutes: 1 })
  assert.deepEqual(parseInput('1,555', '5'), { price: 1.56, minutes: 5 })
  assert.equal(parsePrice(' 2,5 '), 2.5)
  assert.equal(parsePrice('abc'), null)
})

test('Alarm ist für ALARM_MS aktiv', () => {
  const store = createStore()
  assert.equal(store.snapshot().alarmAt, 0)
  assert.equal(isAlarmActive(0, T0), false)
  store.triggerAlarm(T0)
  const { alarmAt } = store.snapshot()
  assert.equal(alarmAt, T0)
  assert.equal(isAlarmActive(alarmAt, T0), true)
  assert.equal(isAlarmActive(alarmAt, T0 + ALARM_MS - 1), true)
  assert.equal(isAlarmActive(alarmAt, T0 + ALARM_MS), false)
})
