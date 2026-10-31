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

Die eigenständig nutzbare Anzeige liegt in `public/halloween_exchange_animiert.html`.
Sie benötigt im selben Ordner `market.js`, `happy-hour.js`, `reporter-dialog.js`
und `Live Börsenstudio_ Rasende Reporter.png`. Vite übernimmt diese Dateien
unverändert in den Build. Die HTML-Datei lässt sich lokal auch direkt öffnen.

`tests/test-happy-hour.cjs` prüft Preisübernahme, Handelsphasen, Ablaufzeit,
Neuladen, unbegrenzte Laufzeit und manuelles Zurücksetzen.
