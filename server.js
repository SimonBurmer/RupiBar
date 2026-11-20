// Liefert die gebaute React-App aus und hält die Preise für Anzeige und /admin.
// Die Anzeige erhält Änderungen sofort per Server-Sent Events (/api/events).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore } from './src/lib/store.js';
import { MAX_BYTES, createPictureStore } from './server/pictureStore.js';

const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const PORT = Number(process.env.PORT) || 3000;
const MAX_BODY = 10_000;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8'
};

const store = createStore();
const pictures = createPictureStore();
const clients = new Set();
let picturesReady = false;
pictures.load()
  .then(count => { picturesReady = true; console.log(`Fotos: ${pictures.label}, ${count} vorhanden`); broadcast(); })
  .catch(error => console.error('Fotos konnten nicht geladen werden:', error.message));

const pictureList = () => pictures.list().map(({ id, name, at, status }) => ({ id, name, at, status }));
const payload = () => JSON.stringify({ ...store.snapshot(), pictures: pictureList(), serverTime: Date.now() });
function broadcast() {
  const message = `data: ${payload()}\n\n`;
  for (const client of clients) client.write(message);
}

setInterval(() => { if (store.tick(Date.now())) broadcast(); }, 500).unref();
// Hält die Verbindung über Proxys hinweg offen.
setInterval(() => { for (const client of clients) client.write(': ping\n\n'); }, 25000).unref();

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      body += chunk;
      if (body.length > MAX_BODY) { reject(new Error('Anfrage zu groß.')); req.destroy(); }
    });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('Ungültiges JSON.')); }
    });
    req.on('error', reject);
  });
}

function readBuffer(req, limit) {
  return new Promise((resolve, reject) => {
    if (Number(req.headers['content-length']) > limit) { reject(Object.assign(new Error('Foto zu groß.'), { status: 413 })); req.resume(); return; }
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > limit) { reject(Object.assign(new Error('Foto zu groß.'), { status: 413 })); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Höchstens 15 Fotos pro Gerät (IP) in 10 Minuten.
const uploads = new Map();
function allowUpload(req) {
  const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '').split(',')[0].trim();
  const now = Date.now();
  const recent = (uploads.get(ip) ?? []).filter(time => now - time < 600000);
  if (recent.length >= 15) return false;
  uploads.set(ip, [...recent, now]);
  return true;
}

async function handlePictures(req, res, pathname, url) {
  const [, , , id, extra] = pathname.split('/');
  if (!picturesReady) return sendJson(res, 503, { error: 'Fotos sind gerade nicht verfügbar.' });
  if (req.method === 'POST' && !id) {
    if (!allowUpload(req)) return sendJson(res, 429, { error: 'Zu viele Fotos auf einmal – bitte kurz warten.' });
    const buffer = await readBuffer(req, MAX_BYTES);
    const status = store.snapshot().pictureSettings.requireApproval ? 'pending' : 'live';
    const item = await pictures.add(buffer, { name: url.searchParams.get('name'), status });
    broadcast();
    return sendJson(res, 200, { id: item.id, status: item.status });
  }
  if (req.method === 'GET' && id && !extra) {
    const image = await pictures.image(id);
    if (!image) return sendJson(res, 404, { error: 'Foto nicht gefunden.' });
    res.writeHead(200, { 'Content-Type': image.type, 'Content-Length': image.body.length, 'Cache-Control': 'public, max-age=31536000, immutable' });
    return res.end(image.body);
  }
  if (req.method === 'DELETE' && id && !extra) {
    if (!(await pictures.remove(id))) return sendJson(res, 404, { error: 'Foto nicht gefunden.' });
    broadcast();
    return sendJson(res, 200, { ok: true });
  }
  if (req.method === 'POST' && id && extra === 'approve') {
    if (!(await pictures.approve(id))) return sendJson(res, 404, { error: 'Foto nicht gefunden.' });
    broadcast();
    return sendJson(res, 200, { ok: true });
  }
  return sendJson(res, 404, { error: 'Nicht gefunden.' });
}

const ACTIONS = {
  'PUT /api/prices': (body, now) => store.setPrices(body.prices, now),
  'POST /api/happy-hour': (body, now) => store.setHappyHour(body.drink ?? 'Bier', body.price, body.minutes, now),
  'POST /api/happy-hour/reset': (body, now) => store.resetHappyHour(body.drink ?? 'Bier', now),
  'POST /api/reset': (_body, now) => store.resetAll(now),
  'POST /api/alarm': (_body, now) => store.triggerAlarm(now),
  'PUT /api/theme': body => store.setTheme(body.theme),
  'PUT /api/settings': body => store.setSettings(body),
  'PUT /api/topic': body => store.setTopic(body.topic),
  'PUT /api/menu': body => store.setMenu(body),
  'PUT /api/wheel': body => store.setWheel(body),
  'PUT /api/picture-settings': body => store.setPictureSettings(body)
};

async function handleApi(req, res, pathname, url) {
  if (pathname === '/api/pictures' || pathname.startsWith('/api/pictures/')) return handlePictures(req, res, pathname, url);
  if (req.method === 'GET' && pathname === '/api/state') return sendJson(res, 200, JSON.parse(payload()));

  if (req.method === 'GET' && pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive', 'X-Accel-Buffering': 'no'
    });
    res.write(`retry: 3000\ndata: ${payload()}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return undefined;
  }

  const action = ACTIONS[`${req.method} ${pathname}`];
  if (!action) return sendJson(res, 404, { error: 'Nicht gefunden.' });
  let body;
  try { body = await readJson(req); } catch (error) { return sendJson(res, 400, { error: error.message }); }
  const result = action(body, Date.now());
  if (!result.ok) return sendJson(res, 400, { error: result.error });
  broadcast();
  return sendJson(res, 200, JSON.parse(payload()));
}

function serveStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end();
  }
  let file = path.normalize(path.join(DIST, decodeURIComponent(pathname)));
  if (!file.startsWith(DIST + path.sep)) file = path.join(DIST, 'index.html');
  let stat = fs.statSync(file, { throwIfNoEntry: false });
  if (!stat?.isFile()) {
    // Unbekannte Asset-Dateien sind 404, alle anderen Pfade (/, /admin) liefern die App.
    if (pathname.startsWith('/assets/')) { res.writeHead(404); return res.end(); }
    file = path.join(DIST, 'index.html');
    stat = fs.statSync(file);
  }
  const immutable = pathname.startsWith('/assets/');
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache'
  });
  if (req.method === 'HEAD') return res.end();
  return fs.createReadStream(file).pipe(res);
}

const server = http.createServer((req, res) => {
  let url;
  try { url = new URL(req.url, 'http://localhost'); } catch { res.writeHead(400); return res.end(); }
  const { pathname } = url;
  if (pathname.startsWith('/api/')) {
    handleApi(req, res, pathname, url).catch(error => {
      if (!error.status) console.error(error);
      if (!res.headersSent) sendJson(res, error.status ?? 500, { error: error.status ? error.message : 'Serverfehler.' });
    });
    return undefined;
  }
  return serveStatic(req, res, pathname);
});

server.listen(PORT, '0.0.0.0', () => console.log(`RUPI BAR läuft auf Port ${PORT}`));

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    for (const client of clients) client.end();
    server.close(() => process.exit(0));
  });
}
