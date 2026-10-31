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

- `/` – Börsenanzeige für den Fernseher oder Beamer (16:9).
- `/admin` – Preise ändern, z. B. vom Handy aus. Änderungen erscheinen sofort auf
  allen geöffneten Anzeigen.

Wechsel im Minutentakt: Bier, Gin Tonic, Vodka Bull, Aperol Spritz. Dazu Crash-Charts
mit ausgesetztem Handel, das animierte Reporterduo mit Eilmeldungen, Preisband und
zehn Getränkekacheln.

Auf `/admin`:

- **Getränkepreise** für alle zehn Getränke setzen (Normalpreise).
- **Happy Hour** für Bier, Gin Tonic, Vodka Bull oder Aperol Spritz: vorübergehender
  Preis mit Laufzeit (`0` Minuten = bis zur manuellen Rücksetzung), mehrere gleichzeitig
  möglich. Die Anzeige zeigt das Getränk eine Minute lang mit Handelsöffnung und
  Eilmeldung und blendet während einer Happy Hour alle 3 Minuten groß „HAPPY HOUR“ ein.
- **Design der Anzeige**: „Neu“ oder „Klassisch“ (das ursprüngliche Design).
- **Alarm**: färbt alle Anzeigen für 6 Sekunden rot mit blinkendem ALARM.
- **Alles zurücksetzen**: Standardpreise, alle Happy Hours beendet, Alarm gestoppt
  (das Design bleibt).

Der Reporterbereich wechselt alle 30 Sekunden zwischen den Szenen in
`src/lib/scenes.js` (Studio, Brauerei, Getränkemarkt).

Die Preise liegen nur im Speicher des Servers. `/admin` ist nicht passwortgeschützt,
und nach jedem Deploy oder Neustart gelten wieder die Standardpreise.

## Dateien

- `server.js` – liefert die App aus und stellt die Preis-API bereit
  (`GET /api/state`, Live-Updates über `GET /api/events`, `PUT /api/prices`,
  `POST /api/happy-hour`, `POST /api/happy-hour/reset`, `POST /api/reset`,
  `POST /api/alarm`, `PUT /api/theme`).
- `src/App.jsx` – Börsenanzeige; `src/admin/AdminPage.jsx` – Admin-Seite.
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
