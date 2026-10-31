import { NORMAL_BEER_PRICE, fmt } from './market.js';

// Zustand bleibt bei Neuladen auf diesem Browser erhalten.
export const STORAGE_KEY = 'rupi-happy-hour-v1';
export const TRADING_WINDOW_MS = 6000;
export const BULLETIN_MS = 24000;
export const SAVE_FAILED_MESSAGE = 'Preis ist aktiv. Dieser Browser kann ihn jedoch nicht für einen Neustart speichern.';
export const INVALID_INPUT_MESSAGE = 'Bitte einen Preis von 0 bis 99 € und eine Laufzeit von 0 bis 10080 Minuten eingeben.';

export const INITIAL_STATE = { price: NORMAL_BEER_PRICE, previousPrice: NORMAL_BEER_PRICE, expiresAt: null, eventAt: 0 };

const inPriceRange = value => Number.isFinite(value) && value >= 0 && value <= 99;

export function isValidState(saved) {
  return Boolean(saved && inPriceRange(saved.price) && inPriceRange(saved.previousPrice)
    && Number.isFinite(saved.eventAt) && (saved.expiresAt === null || Number.isFinite(saved.expiresAt)));
}

export function saveState(storage, state) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export const isExpired = (state, now) => state.expiresAt !== null && now >= state.expiresAt;
export const isOpen = (state, now) => state.eventAt > 0 && now - state.eventAt < TRADING_WINDOW_MS;
export const isPromotion = state => state.price !== NORMAL_BEER_PRICE || state.expiresAt !== null;

export function formatEnd(state) {
  return state.expiresAt
    ? new Date(state.expiresAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : 'bis zur Rücksetzung';
}

export function nextState(state, price, minutes, now) {
  return { price, previousPrice: state.price, expiresAt: minutes > 0 ? now + minutes * 60000 : null, eventAt: now };
}

// Gespeicherten Zustand laden; ein inzwischen abgelaufener Preis fällt auf 2 Euro zurück.
export function bootState(storage, now) {
  let state = INITIAL_STATE;
  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY));
    if (isValidState(saved)) state = saved;
  } catch { /* Ohne Speicher mit Normalpreis starten. */ }
  if (isExpired(state, now)) {
    state = nextState(state, NORMAL_BEER_PRICE, 0, now);
    return { state, saveFailed: !saveState(storage, state) };
  }
  return { state, saveFailed: false };
}

// Formulareingabe prüfen; liefert null bei ungültigen Werten.
export function parseInput(priceText, minutesText) {
  const price = Number(String(priceText).replace(',', '.'));
  const minutes = Number(minutesText);
  if (!inPriceRange(price) || !Number.isInteger(minutes) || minutes < 0 || minutes > 10080) return null;
  return { price: Math.round(price * 100) / 100, minutes };
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
