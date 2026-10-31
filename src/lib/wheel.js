import { DRINKS } from './market.js';

// Glücksrad: alle `spinMs` Millisekunden eine neue Runde. Gewinner und Drehwinkel hängen nur
// von der Rundennummer ab, damit alle Anzeigen dasselbe Ergebnis zeigen.
export const SPIN_ANIMATION_MS = 6000;
export const SEGMENT_DEG = 360 / DRINKS.length;

// Kleiner, gut verteilter Hash (mulberry32-Schritt) für die Rundennummer.
function hash(n) {
  let t = (n + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function wheelRound(now, spinMs) {
  const round = Math.floor(now / spinMs);
  const winner = Math.floor(hash(round) * DRINKS.length);
  const fortune = Math.floor(hash(round + 7919) * FORTUNES.length);
  // Zeiger oben (0°): Segment i liegt bei i·SEGMENT_DEG. Pro Runde 5 volle Umdrehungen dazu.
  const jitter = (hash(round + 104729) - 0.5) * SEGMENT_DEG * 0.6;
  const angle = round * 5 * 360 - winner * SEGMENT_DEG - jitter;
  const elapsed = now - round * spinMs;
  return { round, winner, fortune, angle, spinning: elapsed < SPIN_ANIMATION_MS, elapsed };
}

export const FORTUNES = [
  'Die Geister haben entschieden:',
  'Aus dem Jenseits flüstert es:',
  'Der Kürbis hat gesprochen:',
  'Die Kristallkugel zeigt eindeutig:',
  'Das Orakel der Theke verkündet:',
  'Ein Skelett an der Bar empfiehlt:',
  'Die Fledermäuse sind sich einig:',
  'Um Mitternacht trinkt man:',
  'Graf Dracula bestellt heute:',
  'Die Hexe hat umgerührt und sieht:'
];

export const SPOOKY_LINES = [
  'Wer nicht bestellt, wird heimgesucht.',
  'Widerstand ist zwecklos.',
  'Das Schicksal duldet keinen Aufschub.',
  'Die Geister zählen bis drei.',
  'Bestellt jetzt – oder spukt für immer.',
  'Mit freundlichen Grüßen aus der Gruft.'
];
