import { DEFAULT_PRICES, HAPPY_DRINKS, parsePrice } from './market.js';
import { INITIAL_HAPPY, INVALID_INPUT_MESSAGE, isExpired, isPromotion, nextState, parseInput } from './happyHour.js';
import { DEFAULT_MENU, DEFAULT_TOPIC, DEFAULT_WHEEL, TOPIC_IDS, mergeMenu, mergeWheel } from './topics.js';

export const THEMES = ['modern', 'classic'];
export const DEFAULT_THEME = 'modern';
// Anzeige-Einstellungen: Getränkeleiste fest / laufend / blätternd, Tempo in Sekunden, Laufband an/aus.
export const TILE_MODES = ['scroll', 'page', 'fixed'];
// Reporter: Szenenwechsel und Meldungsdauer in Sekunden.
export const DEFAULT_SETTINGS = { tileMode: 'scroll', tileSeconds: 5, showTicker: true, sceneSeconds: 30, newsSeconds: 9, marketSeconds: 5 };
const SECOND_LIMITS = {
  tileSeconds: [1, 120, 'Tempo der Getränkeleiste'],
  marketSeconds: [3, 600, 'Kursübersicht'],
  sceneSeconds: [5, 600, 'Szenenwechsel'],
  newsSeconds: [3, 60, 'Meldungsdauer']
};

// Zustand des Servers. Liegt nur im Speicher und startet nach jedem Deploy mit den Standardwerten.
// Jede Methode liefert { ok: true } oder { ok: false, error }.
export function createStore() {
  let prices = { ...DEFAULT_PRICES };
  let happy = structuredClone(INITIAL_HAPPY);
  let alarmAt = 0;
  let theme = DEFAULT_THEME;
  let settings = { ...DEFAULT_SETTINGS };
  let topic = DEFAULT_TOPIC;
  let menu = { ...DEFAULT_MENU };
  let wheel = { ...DEFAULT_WHEEL };

  const happyDrink = drink => (HAPPY_DRINKS.includes(drink) ? drink : null);

  return {
    snapshot: () => ({ prices: { ...prices }, happy: structuredClone(happy), alarmAt, theme, settings: { ...settings }, topic, menu: { ...menu }, wheel: { ...wheel } }),

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

    // Preise auf Standard, alle Happy Hours beenden, Alarm stoppen. Thema, Design und Einstellungen bleiben.
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

    setTopic(value) {
      if (!TOPIC_IDS.includes(value)) return { ok: false, error: 'Unbekanntes Thema.' };
      topic = value;
      return { ok: true };
    },

    setMenu(input) {
      const result = mergeMenu(menu, input);
      if (result.error) return { ok: false, error: result.error };
      menu = result.value;
      return { ok: true };
    },

    setWheel(input) {
      const result = mergeWheel(wheel, input);
      if (result.error) return { ok: false, error: result.error };
      wheel = result.value;
      return { ok: true };
    },

    // Teilweise Änderung der Börsen-Einstellungen; ungültige Werte ändern nichts.
    setSettings(input) {
      if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, error: 'Keine Einstellungen übergeben.' };
      const next = { ...settings };
      if ('tileMode' in input) {
        if (!TILE_MODES.includes(input.tileMode)) return { ok: false, error: 'Unbekannter Modus für die Getränkeleiste.' };
        next.tileMode = input.tileMode;
      }
      for (const [key, [min, max, label]] of Object.entries(SECOND_LIMITS)) {
        if (!(key in input)) continue;
        const seconds = Number(input[key]);
        if (!Number.isInteger(seconds) || seconds < min || seconds > max) return { ok: false, error: `${label}: bitte ${min} bis ${max} Sekunden eingeben.` };
        next[key] = seconds;
      }
      if ('showTicker' in input) {
        if (typeof input.showTicker !== 'boolean') return { ok: false, error: 'Laufband: an oder aus.' };
        next.showTicker = input.showTicker;
      }
      settings = next;
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
