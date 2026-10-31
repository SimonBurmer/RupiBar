// Liefert die gebaute React-App aus und hält die Preise für Anzeige und /admin.
// Die Anzeige erhält Änderungen sofort per Server-Sent Events (/api/events).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore } from './src/lib/store.js';

const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const PORT = Number(process.env.PORT) || 3000;
const MAX_BODY = 10_000;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8'
};

const store = createStore();
const clients = new Set();

const payload = () => JSON.stringify({ ...store.snapshot(), serverTime: Date.now() });
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
  'PUT /api/wheel': body => store.setWheel(body)
};

async function handleApi(req, res, pathname) {
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
  let pathname;
  try { pathname = new URL(req.url, 'http://localhost').pathname; } catch { res.writeHead(400); return res.end(); }
  if (pathname.startsWith('/api/')) {
    handleApi(req, res, pathname).catch(error => {
      console.error(error);
      if (!res.headersSent) sendJson(res, 500, { error: 'Serverfehler.' });
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
