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
  'Das Rad hat entschieden:',
  'Die nächste Runde geht auf:',
  'Heute empfiehlt die Bar:',
  'Und der Gewinner ist:',
  'Das Glück sagt eindeutig:',
  'Frisch vom Rad:',
  'Die Theke hat gesprochen:',
  'Jetzt ist es Zeit für:',
  'Das Schicksal bestellt:',
  'Ganz klar:'
];

export const FUN_LINES = [
  'Wer zögert, zahlt die nächste Runde.',
  'Prost auf den Zufall!',
  'Einfach an der Theke bestellen.',
  'Das Rad irrt sich nie.',
  'Gute Wahl – auch wenn sie nicht deine war.',
  'Auf ein Neues in der nächsten Runde!'
];
