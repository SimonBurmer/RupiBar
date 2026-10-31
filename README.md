# RUPI BAR – Halloween Exchange

Getränkebörse im Halloween-Stil für eine 16:9-Anzeige. Die Startseite zeigt die
fertige Börsenanzeige bildschirmfüllend in der vorhandenen Vite/React-App.

## Starten

Node.js ab Version 20:

```sh
npm ci
npm run build
npm start          # Server auf http://localhost:3000 (Anzeige und /admin)
npm test
```

Für die Entwicklung `npm run dev:server` und `npm run dev` parallel starten;
Vite leitet `/api` an den lokalen Server weiter.

Railway baut mit `npm run build` und startet `npm start`. Jeder Push auf `main`
wird automatisch deployt.

## Anzeige und Bedienung

- `/` – Anzeige für den Fernseher oder Beamer (16:9).
- `/admin` – Bedienung, z. B. vom Handy aus. Änderungen erscheinen sofort auf
  allen geöffneten Anzeigen.

Auf `/admin` wählt man das **Thema der Anzeige**:

- **Börse** – die Kurstafel (Details unten).
- **Getränkekarte** – ruhige Preistafel in drei Spalten; Happy-Hour-Preise mit
  durchgestrichenem Normalpreis. Einstellungen: Titel, Untertitel, Hinweis, Emojis.
- **Glücksrad** – das Geister-Glücksrad dreht sich im eingestellten Takt und kürt den
  „Drink der Runde“ (auf allen Anzeigen gleich). Einstellungen: Titel, Takt, Preise.

Preise, Happy Hours, Alarm und „Alles zurücksetzen“ gelten für alle Themen; die
Einstellungen sind je Thema getrennt.

### Börse

Wechsel der Kursübersicht (Standard alle 5 Sekunden, einstellbar): Bier, Gin Tonic, Vodka Bull, Aperol Spritz. Dazu Crash-Charts
mit ausgesetztem Handel, das animierte Reporterduo mit Eilmeldungen, Preisband und
zehn Getränkekacheln.

Auf `/admin`:

- **Getränkepreise** für alle zehn Getränke setzen (Normalpreise).
- **Happy Hour** für Bier, Gin Tonic, Vodka Bull oder Aperol Spritz: vorübergehender
  Preis mit Laufzeit (`0` Minuten = bis zur manuellen Rücksetzung), mehrere gleichzeitig
  möglich. Die Anzeige zeigt das Getränk eine Minute lang mit Handelsöffnung und
  Eilmeldung und blendet während einer Happy Hour alle 3 Minuten groß „HAPPY HOUR“ ein.
- **Design der Anzeige**: „Neu“ oder „Klassisch“ (das ursprüngliche Design).
- **Anzeige**: Wechseltakt der Kursübersicht mit Chart (Standard 5 s), Getränkeleiste laufend, blätternd (fünf je Seite) oder fest, Tempo in
  Sekunden, Szenenwechsel und Meldungsdauer der Reporter, und das Laufband unten an oder aus.
- **Alarm**: färbt alle Anzeigen für 6 Sekunden rot mit blinkendem ALARM.
- **Alles zurücksetzen**: Standardpreise, alle Happy Hours beendet, Alarm gestoppt
  (Design und Anzeige-Einstellungen bleiben).

Der Reporterbereich wechselt (Standard: alle 30 Sekunden, einstellbar) zwischen den Szenen in
`src/lib/scenes.js` (Studio, Brauerei, Getränkemarkt).

Die Preise liegen nur im Speicher des Servers. `/admin` ist nicht passwortgeschützt,
und nach jedem Deploy oder Neustart gelten wieder die Standardpreise.

## Dateien

- `server.js` – liefert die App aus und stellt die Preis-API bereit
  (`GET /api/state`, Live-Updates über `GET /api/events`, `PUT /api/prices`,
  `POST /api/happy-hour`, `POST /api/happy-hour/reset`, `POST /api/reset`,
  `POST /api/alarm`, `PUT /api/theme`, `PUT /api/settings`, `PUT /api/topic`,
  `PUT /api/menu`, `PUT /api/wheel`).
- `src/App.jsx` – wählt das Thema; `src/components/ExchangeBoard.jsx`, `MenuBoard.jsx`,
  `WheelBoard.jsx` – die drei Themen; `src/admin/AdminPage.jsx` – Admin-Seite.
- `src/lib/topics.js` – Themen und ihre Einstellungen; `src/lib/wheel.js` – Glücksrad.
- `src/components/` – Kopfzeile, Kursanzeige, Crash-Chart, Reporter,
  Getränkekacheln und Laufband.
- `src/lib/market.js` – Getränke, Standardpreise und Chart-Geometrie.
- `src/lib/happyHour.js` – Happy-Hour-Logik; `src/lib/store.js` – Preiszustand des Servers.
- `src/lib/useExchange.js` – Live-Verbindung des Browsers zum Server.
- `src/lib/reporterAnimation.js` – Dialog und Canvas-Animation der Reporter.
- `src/themes/modern.css` und `src/themes/classic.css` – die beiden Designs der Anzeige
  (Komponenten des klassischen Designs in `src/components/classic/`);
  `src/index.css` – Alarm- und Happy-Hour-Einblendung; `src/admin/admin.css` – `/admin`.

`tests/happy-hour.test.js` prüft Preisänderungen, Handelsphasen, Ablauf,
unbegrenzte Laufzeit, Zurücksetzen und die Eingabeprüfung.
