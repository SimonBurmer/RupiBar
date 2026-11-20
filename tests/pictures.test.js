import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { MAX_BYTES, cleanName, createPictureStore, imageType } from '../server/pictureStore.js'
import { createStore } from '../src/lib/store.js'

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46])
const tempStore = async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rupibar-pictures-'))
  return { dir, store: createPictureStore({}, dir) }
}

test('Bildformat wird an den Bytes erkannt', () => {
  assert.equal(imageType(JPEG), 'image/jpeg')
  assert.equal(imageType(Buffer.from('<svg></svg>')), null)
  assert.equal(imageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])), 'image/png')
  assert.equal(cleanName('  Lisa\u0000\n  '), 'Lisa')
  assert.equal(cleanName('x'.repeat(80)).length, 40)
  assert(MAX_BYTES >= 5 * 1024 * 1024)
})

test('Fotos hochladen, freigeben, löschen, nach Neustart wieder laden', async () => {
  const { dir, store } = await tempStore()
  assert.equal(await store.load(), 0)
  const live = await store.add(JPEG, { name: 'Lisa', status: 'live' })
  const pending = await store.add(JPEG, { name: '', status: 'pending' })
  assert.equal(store.list().length, 2)
  assert.equal((await store.image(live.id)).type, 'image/jpeg')
  assert.equal(await store.image('../index'), null, 'keine fremden Pfade')
  await assert.rejects(store.add(Buffer.from('kein Bild'), { status: 'live' }), /JPEG/)

  assert.equal(await store.approve(pending.id), true)
  assert.equal(store.list().find(item => item.id === pending.id).status, 'live')
  assert.equal(await store.remove(live.id), true)
  assert.equal(await store.remove(live.id), false)

  const reloaded = createPictureStore({}, dir)
  assert.equal(await reloaded.load(), 1)
  assert.equal(reloaded.list()[0].id, pending.id)
  await fs.rm(dir, { recursive: true, force: true })
})

test('Einstellungen für Bilder', () => {
  const store = createStore()
  assert.deepEqual(store.snapshot().pictureSettings, { title: 'Eure Fotos', intervalSeconds: 8, size: 'l', requireApproval: false, showQr: true })
  assert.equal(store.setPictureSettings({ size: 'xl' }).ok, true)
  assert.equal(store.setPictureSettings({ size: 'riesig' }).ok, false)
  assert.equal(store.setPictureSettings({ intervalSeconds: 12, requireApproval: true }).ok, true)
  assert.equal(store.setPictureSettings({ intervalSeconds: 1 }).ok, false)
  assert.equal(store.setPictureSettings({ showQr: 'ja' }).ok, false)
  assert.equal(store.snapshot().pictureSettings.requireApproval, true)
  assert.equal(store.setTopic('pictures').ok, true)
})
