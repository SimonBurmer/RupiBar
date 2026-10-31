import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildBoard, chartGeometry, fmt } from '../src/lib/market.js'
import {
  INITIAL_STATE, STORAGE_KEY, bootState, bulletin, formatEnd, isExpired, isOpen,
  isPromotion, nextState, parseInput, saveState
} from '../src/lib/happyHour.js'

const memoryStorage = (map = new Map()) => ({
  getItem: key => map.get(key) ?? null,
  setItem: (key, value) => map.set(key, value)
})
const T0 = 1800000000000

test('Preisübernahme wirkt auf Kurs, Getränkekarte und Ticker', () => {
  const { markets, drinks } = buildBoard(1.5)
  assert.equal(markets[0].price, 1.5)
  assert.equal(drinks[0].price, 1.5)
  assert.equal(fmt(drinks[0].price), '1,50')
  assert.equal(buildBoard(2).markets[0].price, 2)
})

test('Handelsphasen: kurz geöffnet, danach ausgesetzt', () => {
  const state = nextState(INITIAL_STATE, 1.5, 30, T0)
  assert.equal(isOpen(state, T0), true)
  assert(bulletin(state, T0).headline.includes('ABGESTÜRZT'))
  assert.equal(isOpen(state, T0 + 6500), false)
  assert.equal(isPromotion(state), true)
})

test('Neuladen übernimmt gespeicherten Zustand', () => {
  const storage = memoryStorage()
  const state = nextState(INITIAL_STATE, 1.5, 30, T0)
  assert.equal(saveState(storage, state), true)
  const { state: loaded } = bootState(storage, T0 + 1000)
  assert.equal(loaded.price, 1.5)
  assert.equal(loaded.expiresAt, state.expiresAt)
})

test('Ablauf führt zur Kurserholung auf 2 Euro', () => {
  const state = nextState(INITIAL_STATE, 1.5, 30, T0)
  const end = T0 + 30 * 60000
  assert.equal(isExpired(state, end - 1), false)
  assert.equal(isExpired(state, end), true)
  const recovered = nextState(state, 2, 0, end)
  assert.equal(recovered.price, 2)
  assert(bulletin(recovered, end).headline.includes('ERHOLT'))
  const geometry = chartGeometry(buildBoard(2).markets[0], { ...recovered, open: true })
  assert.equal(geometry.recovery, true)
  assert.equal(geometry.trading, true)
  assert.notEqual(geometry.eventPath, '')
})

test('Unbegrenzte Laufzeit und manuelles Zurücksetzen', () => {
  const state = nextState(INITIAL_STATE, 1.25, 0, T0)
  assert.equal(state.expiresAt, null)
  assert.equal(isExpired(state, T0 + 8 * 3600000), false)
  assert.equal(formatEnd(state), 'bis zur Rücksetzung')
  const reset = nextState(state, 2, 0, T0 + 1)
  assert.equal(reset.price, 2)
  assert.equal(isPromotion(reset), false)
})

test('Eingabeprüfung', () => {
  assert.equal(parseInput('-1', '30'), null)
  assert.equal(parseInput('1.5', '0.5'), null)
  assert.equal(parseInput('100', '1'), null)
  assert.equal(parseInput('1', '10081'), null)
  assert.deepEqual(parseInput('0', '1'), { price: 0, minutes: 1 })
  assert.deepEqual(parseInput('1,555', '5'), { price: 1.56, minutes: 5 })
})

test('Abgelaufener Preis beim Neuladen fällt auf 2 Euro zurück', () => {
  const storage = memoryStorage()
  saveState(storage, nextState(INITIAL_STATE, 0, 1, T0))
  const { state } = bootState(storage, T0 + 61000)
  assert.equal(state.price, 2)
  assert.equal(state.previousPrice, 0)
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).price, 2)
})

test('Ungültiger oder fehlender Speicher startet mit Normalpreis', () => {
  assert.equal(bootState(memoryStorage(new Map([[STORAGE_KEY, '{"price":500}']])), T0).state.price, 2)
  assert.equal(bootState(null, T0).state.price, 2)
  assert.equal(saveState(null, INITIAL_STATE), false)
})
