import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CATEGORIES, DRINKS } from '../src/lib/market.js'
import { DEFAULT_MENU, DEFAULT_WHEEL, TOPIC_IDS } from '../src/lib/topics.js'
import { FORTUNES, SEGMENT_DEG, SPIN_ANIMATION_MS, wheelRound } from '../src/lib/wheel.js'
import { createStore } from '../src/lib/store.js'

const T0 = 1800000000000

test('Themen: Börse, Getränkekarte, Glücksrad', () => {
  assert.deepEqual(TOPIC_IDS, ['exchange', 'menu', 'wheel'])
  const store = createStore()
  assert.equal(store.snapshot().topic, 'exchange')
  assert.equal(store.setTopic('menu').ok, true)
  assert.equal(store.setTopic('kino').ok, false)
  assert.equal(store.snapshot().topic, 'menu')
})

test('Jedes Getränk gehört zu einem Abschnitt der Getränkekarte', () => {
  const ids = CATEGORIES.map(category => category.id)
  for (const drink of DRINKS) assert(ids.includes(drink.category), drink.name)
})

test('Einstellungen je Thema, Preise bleiben global', () => {
  const store = createStore()
  assert.deepEqual(store.snapshot().menu, DEFAULT_MENU)
  assert.deepEqual(store.snapshot().wheel, DEFAULT_WHEEL)
  assert.equal(store.setMenu({ title: '  Karte  ', showEmoji: false }).ok, true)
  assert.equal(store.snapshot().menu.title, 'Karte')
  assert.equal(store.snapshot().menu.showEmoji, false)
  assert.equal(store.setMenu({ title: '' }).ok, false)
  assert.equal(store.setMenu({ subtitle: '' }).ok, true, 'Untertitel darf leer sein')
  assert.equal(store.setMenu({ title: 'x'.repeat(61) }).ok, false)
  assert.equal(store.setMenu({ farbe: 'rot' }).ok, false)
  assert.equal(store.setWheel({ spinSeconds: 15, showPrices: false }).ok, true)
  assert.equal(store.setWheel({ spinSeconds: 5 }).ok, false)
  assert.equal(store.snapshot().wheel.spinSeconds, 15)

  store.setPrices({ Vodka: 1.5 }, T0)
  store.setTopic('wheel')
  assert.equal(store.snapshot().prices.Vodka, 1.5)
  store.resetAll(T0)
  assert.equal(store.snapshot().topic, 'wheel', 'Thema bleibt beim Zurücksetzen')
  assert.equal(store.snapshot().wheel.spinSeconds, 15, 'Einstellungen bleiben')
})

test('Glücksrad: gleiche Runde, gleiches Ergebnis; Winkel zeigt auf den Gewinner', () => {
  const spinMs = 30000
  const a = wheelRound(T0, spinMs)
  const b = wheelRound(T0 + 1000, spinMs)
  assert.equal(a.round, b.round)
  assert.equal(a.winner, b.winner)
  assert(a.fortune >= 0 && a.fortune < FORTUNES.length)
  const seen = new Set()
  for (let round = 0; round < 400; round++) {
    const r = wheelRound(round * spinMs, spinMs)
    seen.add(r.winner)
    // Zeiger oben: Segment des Gewinners liegt nach der Drehung bei 0° (± halbe Segmentbreite).
    const pointerAt = (((r.winner * SEGMENT_DEG + r.angle) % 360) + 540) % 360 - 180
    assert(Math.abs(pointerAt) < SEGMENT_DEG / 2, `Runde ${round}: ${pointerAt}`)
  }
  assert.equal(seen.size, DRINKS.length, 'jedes Getränk kann gewinnen')
  assert.equal(wheelRound(T0 - (T0 % spinMs), spinMs).spinning, true)
  assert.equal(wheelRound(T0 - (T0 % spinMs) + SPIN_ANIMATION_MS, spinMs).spinning, false)
})
