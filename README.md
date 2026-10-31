# RUPI BAR – Halloween Exchange

Getränkebörse im Halloween-Stil für eine 16:9-Anzeige. Die Startseite zeigt die
fertige Börsenanzeige bildschirmfüllend in der vorhandenen Vite/React-App.

## Starten

Node.js ab Version 20:

```sh
npm ci
npm run dev
npm test
npm run build
```

`npm start` stellt den Produktionsbuild auf dem von Railway gesetzten Port bereit.
Die bestehende Railway-Konfiguration bleibt erhalten. Laut bisherigem Setup
erfolgt das automatische Deployment bei einem Push auf `main`.

## Anzeige und Bedienung

- Wechsel im Minutentakt: Bier, Gin Tonic, Vodka Bull, Aperol Spritz.
- Crash-Charts mit ausgesetztem Handel und festen Barpreisen.
- Animiertes Reporterduo mit Eilmeldungen, Preisband und zehn Getränkekacheln.

Unten rechts öffnet **⚙ Happy Hour** die Bierpreissteuerung. Preis und Laufzeit
sind frei einstellbar; `0` Minuten bedeutet bis zur manuellen Rücksetzung.
Nach Ablauf oder per Rücksetztaste gilt wieder der Normalpreis von 2,00 €.
Die Anzeige erzählt dazu eine kurze Handelsöffnung mit Preissturz beziehungsweise
Kurserholung. Der Zustand wird im lokalen Browser gespeichert und wirkt nur dort,
nicht automatisch auf andere Geräte.

## Dateien

Die Anzeige ist eine React-App (Vite):

- `src/App.jsx` – Zustand (Happy Hour, Kursrotation, Uhr) und Aufbau der Anzeige.
- `src/components/` – Kopfzeile, Kursanzeige, Crash-Chart, Reporter, Getränkekacheln,
  Laufband und Happy-Hour-Dialog.
- `src/lib/market.js` – Kurse, Getränke und Chart-Geometrie.
- `src/lib/happyHour.js` – Happy-Hour-Logik und Speicherung im Browser.
- `src/lib/reporterAnimation.js` – Dialog und Canvas-Animation der Reporter.
- `src/index.css` – Gestaltung der 16:9-Anzeige.
- `src/assets/reporter-studio.png` – Studiobild der Reporter.

`tests/happy-hour.test.js` prüft Preisübernahme, Handelsphasen, Ablaufzeit,
Neuladen, unbegrenzte Laufzeit, manuelles Zurücksetzen und die Eingabeprüfung.
