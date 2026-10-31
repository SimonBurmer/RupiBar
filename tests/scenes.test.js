import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SCENES, SCENE_DURATION, TURN_DURATION, scheduleAt } from '../src/lib/scenes.js'

const MARKET = { name: 'Bier', opening: 4.5, price: 2 }

test('Szenen wechseln alle 30 Sekunden der Reihe nach', () => {
  assert.equal(SCENE_DURATION, 30000)
  assert(SCENES.length >= 2)
  for (let slot = 0; slot < SCENES.length * 3; slot++) {
    assert.equal(scheduleAt(slot * SCENE_DURATION).sceneIndex, slot % SCENES.length)
    assert.equal(scheduleAt(slot * SCENE_DURATION + SCENE_DURATION - 1).sceneIndex, slot % SCENES.length)
  }
  assert.equal(scheduleAt(-500).sceneIndex, 0)
})

test('Die erste Meldung jeder Szene steht die volle Meldungsdauer', () => {
  for (let slot = 0; slot < SCENES.length * 2; slot++) {
    const start = scheduleAt(slot * SCENE_DURATION)
    const end = scheduleAt(slot * SCENE_DURATION + TURN_DURATION - 1)
    assert.equal(start.turnElapsed, 0)
    assert.equal(start.turnIndex, end.turnIndex)
    assert.notEqual(scheduleAt(slot * SCENE_DURATION + TURN_DURATION).turnIndex, start.turnIndex)
  }
})

test('Der Dialog einer Szene geht beim nächsten Besuch weiter', () => {
  const first = scheduleAt(0).turnIndex
  const second = scheduleAt(SCENES.length * SCENE_DURATION).turnIndex
  assert.equal(scheduleAt(SCENES.length * SCENE_DURATION).sceneIndex, 0)
  assert.notEqual(first, second)
})

test('Jede Szene hat vollständige Konfiguration und Texte', () => {
  const ids = new Set()
  for (const scene of SCENES) {
    assert(scene.id && !ids.has(scene.id)); ids.add(scene.id)
    assert.equal(typeof scene.image, 'string')
    assert(scene.alt)
    assert(scene.width > 0 && scene.height > 0)
    assert.equal(scene.captions.length, 2)
    assert.equal(scene.faces.length, scene.captions.length)
    assert.equal(scene.bodies.length, scene.captions.length)
    for (const face of scene.faces) {
      for (const key of ['x', 'y', 'radius', 'phase', 'gain']) assert.equal(typeof face[key], 'number', key)
      assert(face.eyes.length >= 1)
      if (face.lipTop !== undefined) assert(face.lipTop < face.y && face.lipFade > 0)
    }
    for (const body of scene.bodies) {
      for (const key of ['x', 'headX', 'headY', 'phase']) assert.equal(typeof body[key], 'number', key)
    }
    const { mesh } = scene
    assert(mesh.top < mesh.bottom && mesh.bottom <= scene.height)
    assert(mesh.left < mesh.right && mesh.right <= scene.width)
    assert(scene.turns.length >= 4)
    for (const [speaker, headline, text] of scene.turns) {
      assert(scene.captions[speaker], 'Sprecher ohne Bauchbinde')
      assert(headline.length > 0)
      const body = text(MARKET)
      assert(body.length > 0 && !body.includes('undefined'))
    }
  }
})

test('Brauerei-Szene nutzt den Live-Kurs', () => {
  const brauerei = SCENES.find(scene => scene.id === 'brauerei')
  assert(brauerei.turns.some(([, , text]) => text(MARKET).includes('Bier bei 2,00 Euro')))
})

test('Szenen- und Meldungstakt sind einstellbar', () => {
  assert.equal(scheduleAt(10000, SCENES, 10000, 5000).sceneIndex, 1 % SCENES.length)
  assert.equal(scheduleAt(9999, SCENES, 10000, 5000).sceneIndex, 0)
  const turn = scheduleAt(5000, SCENES, 10000, 5000)
  assert.equal(turn.turnElapsed, 0)
  assert.equal(scheduleAt(4999, SCENES, 10000, 5000).turnIndex + 1, turn.turnIndex)
})
