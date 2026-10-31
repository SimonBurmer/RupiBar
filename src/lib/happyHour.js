import { DEFAULT_PRICES, fmt, parsePrice } from './market.js';

export const TRADING_WINDOW_MS = 6000;
export const BULLETIN_MS = 24000;
export const MAX_MINUTES = 10080;
export const ALARM_MS = 6000;
export const INVALID_INPUT_MESSAGE = `Bitte einen Preis von 0 bis 99 € und eine Laufzeit von 0 bis ${MAX_MINUTES} Minuten eingeben.`;

// Bierkurs: aktueller Preis, Preis davor, Ablauf der Happy Hour (null = keine/unbegrenzt) und Zeitpunkt der letzten Änderung.
export const INITIAL_HAPPY = {
  price: DEFAULT_PRICES.Bier, previousPrice: DEFAULT_PRICES.Bier, expiresAt: null, eventAt: 0
};

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

// Happy-Hour-Eingabe prüfen; liefert null bei ungültigen Werten.
export function parseInput(priceValue, minutesValue) {
  const price = parsePrice(priceValue);
  const minutesText = String(minutesValue ?? '').trim();
  const minutes = Number(minutesText);
  if (price === null || minutesText === '' || !Number.isInteger(minutes) || minutes < 0 || minutes > MAX_MINUTES) return null;
  return { price, minutes };
}

export function bulletin(state, now) {
  if (!state.eventAt || now - state.eventAt > BULLETIN_MS) return null;
  const lower = state.price < state.previousPrice;
  const same = state.price === state.previousPrice;
  return {
    headline: same ? 'HANDELSPAUSE VERLÄNGERT' : lower ? 'EIL: BIERPREIS ERNEUT ABGESTÜRZT' : 'EIL: BIERKURS ERHOLT SICH',
    text: same ? `Der Bierpreis bleibt bei ${fmt(state.price)} Euro. Axel Fridolin hat die neue Laufzeit bestätigt.`
      : lower ? `Handel kurz geöffnet – und direkt von ${fmt(state.previousPrice)} auf ${fmt(state.price)} Euro gefallen! Sarah ruft Johannes an. Axel Fridolin ruft die nächste Runde aus.`
      : `Kurze Erholung von ${fmt(state.previousPrice)} auf ${fmt(state.price)} Euro. Johannes atmet auf. Sarah hält die Cocktail-Schirmchen griffbereit. ${isOpen(state, now) ? 'Der Handel ist kurz geöffnet.' : 'Handel wieder ausgesetzt.'}`
  };
}
