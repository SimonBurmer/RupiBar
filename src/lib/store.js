import { DEFAULT_PRICES, parsePrice } from './market.js';
import { INITIAL_HAPPY, INVALID_INPUT_MESSAGE, isExpired, isPromotion, nextState, parseInput } from './happyHour.js';

// Preiszustand des Servers. Liegt nur im Speicher und startet nach jedem Deploy mit den Standardpreisen.
// Jede Methode liefert { ok: true } oder { ok: false, error }.
export function createStore() {
  let prices = { ...DEFAULT_PRICES };
  let happy = { ...INITIAL_HAPPY };
  let alarmAt = 0;

  return {
    snapshot: () => ({ prices: { ...prices }, happy: { ...happy }, alarmAt }),

    setPrices(input, now) {
      if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, error: 'Keine Preise übergeben.' };
      const updates = {};
      for (const [name, value] of Object.entries(input)) {
        if (!(name in DEFAULT_PRICES)) return { ok: false, error: `Unbekanntes Getränk: ${name}` };
        const price = parsePrice(value);
        if (price === null) return { ok: false, error: `${name}: Bitte einen Preis von 0 bis 99 € eingeben.` };
        updates[name] = price;
      }
      const oldBase = prices.Bier;
      const promotion = isPromotion(happy, oldBase);
      prices = { ...prices, ...updates };
      // Ohne laufende Happy Hour folgt der Bierkurs direkt dem neuen Normalpreis.
      if ('Bier' in updates && updates.Bier !== oldBase && !promotion) happy = nextState(happy, updates.Bier, 0, now);
      return { ok: true };
    },

    setHappyHour(priceValue, minutesValue, now) {
      const input = parseInput(priceValue, minutesValue);
      if (!input) return { ok: false, error: INVALID_INPUT_MESSAGE };
      happy = nextState(happy, input.price, input.minutes, now);
      return { ok: true };
    },

    resetHappyHour(now) {
      happy = nextState(happy, prices.Bier, 0, now);
      return { ok: true };
    },

    // Alarm auf allen Anzeigen auslösen (Dauer: ALARM_MS).
    triggerAlarm(now) {
      alarmAt = now;
      return { ok: true };
    },

    // Abgelaufene Happy Hour beenden; true, wenn sich etwas geändert hat.
    tick(now) {
      if (!isExpired(happy, now)) return false;
      happy = nextState(happy, prices.Bier, 0, now);
      return true;
    }
  };
}
