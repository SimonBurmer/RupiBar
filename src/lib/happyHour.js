import { DEFAULT_PRICES, HAPPY_DRINKS, fmt, parsePrice } from './market.js';

export const TRADING_WINDOW_MS = 6000;
export const BULLETIN_MS = 24000;
export const MAX_MINUTES = 10080;
export const ALARM_MS = 6000;
// Happy-Hour-Einblendung: kurz nach dem Start (nach der Handelsöffnung), dann alle 3 Minuten für 6 Sekunden.
export const HAPPY_FLASH_DELAY_MS = 8000;
export const HAPPY_FLASH_EVERY_MS = 180000;
export const HAPPY_FLASH_MS = 6000;
export const INVALID_INPUT_MESSAGE = `Bitte einen Preis von 0 bis 99 € und eine Laufzeit von 0 bis ${MAX_MINUTES} Minuten eingeben.`;

// Kurs eines Happy-Hour-Getränks: aktueller Preis, Preis davor, Ablauf (null = keine/unbegrenzt)
// und Zeitpunkt der letzten Änderung.
export const initialHappy = price => ({ price, previousPrice: price, expiresAt: null, eventAt: 0 });
export const INITIAL_HAPPY = Object.fromEntries(HAPPY_DRINKS.map(name => [name, initialHappy(DEFAULT_PRICES[name])]));

export const isExpired = (state, now) => state.expiresAt !== null && now >= state.expiresAt;
export const isOpen = (state, now) => state.eventAt > 0 && now - state.eventAt < TRADING_WINDOW_MS;
export const isAlarmActive = (alarmAt, now) => alarmAt > 0 && now >= alarmAt - 1000 && now - alarmAt < ALARM_MS;
export const isPromotion = (state, base) => state.price !== base || state.expiresAt !== null;

export function formatEnd(state) {
  return state.expiresAt
    ? new Date(state.expiresAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : 'bis zur Rücksetzung';
}

export function nextState(state, price, minutes, now) {
  return { price, previousPrice: state.price, expiresAt: minutes > 0 ? now + minutes * 60000 : null, eventAt: now };
}

// Laufende Happy Hours: [{ name, state }] in Kartenreihenfolge.
export const activePromotions = (happy, prices) =>
  HAPPY_DRINKS.filter(name => isPromotion(happy[name], prices[name])).map(name => ({ name, state: happy[name] }));

// Happy-Hour-Einblendung gerade sichtbar? Liefert die laufenden Happy Hours oder [].
export function happyFlash(happy, prices, now) {
  const promotions = activePromotions(happy, prices);
  const showing = promotions.some(({ state }) => {
    const phase = now - state.eventAt - HAPPY_FLASH_DELAY_MS;
    return phase >= 0 && phase % HAPPY_FLASH_EVERY_MS < HAPPY_FLASH_MS;
  });
  return showing ? promotions : [];
}

// Getränk mit der jüngsten Kursänderung, oder null.
export function latestEvent(happy) {
  let latest = null;
  for (const name of HAPPY_DRINKS) {
    if (happy[name].eventAt > 0 && (!latest || happy[name].eventAt > happy[latest].eventAt)) latest = name;
  }
  return latest;
}

// Happy-Hour-Eingabe prüfen; liefert null bei ungültigen Werten.
export function parseInput(priceValue, minutesValue) {
  const price = parsePrice(priceValue);
  const minutesText = String(minutesValue ?? '').trim();
  const minutes = Number(minutesText);
  if (price === null || minutesText === '' || !Number.isInteger(minutes) || minutes < 0 || minutes > MAX_MINUTES) return null;
  return { price, minutes };
}

// Eilmeldung zur jüngsten Kursänderung (24 Sekunden lang), sonst null.
export function bulletin(happy, now) {
  const name = latestEvent(happy);
  if (!name) return null;
  const state = happy[name];
  if (now - state.eventAt > BULLETIN_MS) return null;
  const lower = state.price < state.previousPrice;
  const same = state.price === state.previousPrice;
  const beer = name === 'Bier';
  const from = fmt(state.previousPrice);
  const to = fmt(state.price);
  return {
    headline: same ? 'HANDELSPAUSE VERLÄNGERT'
      : lower ? (beer ? 'EIL: BIERPREIS ERNEUT ABGESTÜRZT' : `EIL: ${name.toUpperCase()} ABGESTÜRZT`)
      : (beer ? 'EIL: BIERKURS ERHOLT SICH' : `EIL: ${name.toUpperCase()} ERHOLT SICH`),
    text: same ? `${beer ? 'Der Bierpreis' : `${name}`} bleibt bei ${to} Euro. Axel Fridolin hat die neue Laufzeit bestätigt.`
      : lower ? `Handel kurz geöffnet – und ${beer ? 'der Bierpreis fällt' : `${name} fällt`} direkt von ${from} auf ${to} Euro! Sarah ruft Johannes an. Axel Fridolin ruft die nächste Runde aus.`
      : `Kurze Erholung ${beer ? 'beim Bier' : `bei ${name}`} von ${from} auf ${to} Euro. Johannes atmet auf. Sarah hält die Cocktail-Schirmchen griffbereit. ${isOpen(state, now) ? 'Der Handel ist kurz geöffnet.' : 'Handel wieder ausgesetzt.'}`
  };
}
