import { DEFAULT_PRICES, HAPPY_DRINKS, parsePrice } from './market.js';
import { INITIAL_HAPPY, INVALID_INPUT_MESSAGE, isExpired, isPromotion, nextState, parseInput } from './happyHour.js';

export const THEMES = ['modern', 'classic'];
export const DEFAULT_THEME = 'modern';

// Zustand des Servers. Liegt nur im Speicher und startet nach jedem Deploy mit den Standardwerten.
// Jede Methode liefert { ok: true } oder { ok: false, error }.
export function createStore() {
  let prices = { ...DEFAULT_PRICES };
  let happy = structuredClone(INITIAL_HAPPY);
  let alarmAt = 0;
  let theme = DEFAULT_THEME;

  const happyDrink = drink => (HAPPY_DRINKS.includes(drink) ? drink : null);

  return {
    snapshot: () => ({ prices: { ...prices }, happy: structuredClone(happy), alarmAt, theme }),

    setPrices(input, now) {
      if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, error: 'Keine Preise übergeben.' };
      const updates = {};
      for (const [name, value] of Object.entries(input)) {
        if (!(name in DEFAULT_PRICES)) return { ok: false, error: `Unbekanntes Getränk: ${name}` };
        const price = parsePrice(value);
        if (price === null) return { ok: false, error: `${name}: Bitte einen Preis von 0 bis 99 € eingeben.` };
        updates[name] = price;
      }
      const next = { ...happy };
      for (const [name, price] of Object.entries(updates)) {
        // Ohne laufende Happy Hour folgt der Kurs direkt dem neuen Normalpreis.
        if (name in happy && price !== prices[name] && !isPromotion(happy[name], prices[name])) {
          next[name] = nextState(happy[name], price, 0, now);
        }
      }
      prices = { ...prices, ...updates };
      happy = next;
      return { ok: true };
    },

    setHappyHour(drink, priceValue, minutesValue, now) {
      const name = happyDrink(drink);
      if (!name) return { ok: false, error: 'Happy Hour gibt es nur für Bier, Gin Tonic, Vodka Bull und Aperol Spritz.' };
      const input = parseInput(priceValue, minutesValue);
      if (!input) return { ok: false, error: INVALID_INPUT_MESSAGE };
      happy = { ...happy, [name]: nextState(happy[name], input.price, input.minutes, now) };
      return { ok: true };
    },

    resetHappyHour(drink, now) {
      const name = happyDrink(drink);
      if (!name) return { ok: false, error: 'Unbekanntes Getränk.' };
      happy = { ...happy, [name]: nextState(happy[name], prices[name], 0, now) };
      return { ok: true };
    },

    // Preise auf Standard, alle Happy Hours beenden, Alarm stoppen. Das Design bleibt.
    resetAll(now) {
      prices = { ...DEFAULT_PRICES };
      const next = { ...happy };
      for (const name of HAPPY_DRINKS) {
        if (happy[name].price !== prices[name] || happy[name].expiresAt !== null) {
          next[name] = nextState(happy[name], prices[name], 0, now);
        }
      }
      happy = next;
      alarmAt = 0;
      return { ok: true };
    },

    // Alarm auf allen Anzeigen auslösen (Dauer: ALARM_MS).
    triggerAlarm(now) {
      alarmAt = now;
      return { ok: true };
    },

    setTheme(value) {
      if (!THEMES.includes(value)) return { ok: false, error: 'Unbekanntes Design.' };
      theme = value;
      return { ok: true };
    },

    // Abgelaufene Happy Hours beenden; true, wenn sich etwas geändert hat.
    tick(now) {
      let changed = false;
      for (const name of HAPPY_DRINKS) {
        if (isExpired(happy[name], now)) {
          happy = { ...happy, [name]: nextState(happy[name], prices[name], 0, now) };
          changed = true;
        }
      }
      return changed;
    }
  };
}
