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

Auf `/admin` lassen sich alle zehn Getränkepreise setzen. Der Bierpreis dort ist der
Normalpreis. Die **Happy Hour** setzt einen vorübergehenden Bierpreis mit frei
wählbarer Laufzeit (`0` Minuten = bis zur manuellen Rücksetzung); danach gilt wieder
der Normalpreis. Die Anzeige erzählt dazu eine kurze Handelsöffnung mit Preissturz
beziehungsweise Kurserholung und zeigt eine Minute lang das Bier.

Der Button **Alarm** auf `/admin` färbt alle Anzeigen für 6 Sekunden rot und lässt
in der Mitte einen großen ALARM-Schriftzug blinken.

Die Preise liegen nur im Speicher des Servers. `/admin` ist nicht passwortgeschützt,
und nach jedem Deploy oder Neustart gelten wieder die Standardpreise.

## Dateien

- `server.js` – liefert die App aus und stellt die Preis-API bereit
  (`GET /api/state`, Live-Updates über `GET /api/events`, `PUT /api/prices`,
  `POST /api/happy-hour`, `POST /api/happy-hour/reset`, `POST /api/alarm`).
- `src/App.jsx` – Börsenanzeige; `src/admin/AdminPage.jsx` – Admin-Seite.
- `src/components/` – Kopfzeile, Kursanzeige, Crash-Chart, Reporter,
  Getränkekacheln und Laufband.
- `src/lib/market.js` – Getränke, Standardpreise und Chart-Geometrie.
- `src/lib/happyHour.js` – Happy-Hour-Logik; `src/lib/store.js` – Preiszustand des Servers.
- `src/lib/useExchange.js` – Live-Verbindung des Browsers zum Server.
- `src/lib/reporterAnimation.js` – Dialog und Canvas-Animation der Reporter.
- `src/index.css` – Gestaltung der Anzeige; `src/admin/admin.css` – Gestaltung von `/admin`.

`tests/happy-hour.test.js` prüft Preisänderungen, Handelsphasen, Ablauf,
unbegrenzte Laufzeit, Zurücksetzen und die Eingabeprüfung.
