// Themen der Anzeige: Börse (Kurstafel), Getränkekarte und Geister-Glücksrad.
// Preise, Happy Hours und Alarm gelten für alle Themen; jedes Thema hat eigene Einstellungen.
export const TOPICS = [
  { id: 'exchange', label: 'Börse' },
  { id: 'menu', label: 'Getränkekarte' },
  { id: 'wheel', label: 'Glücksrad' }
];
export const TOPIC_IDS = TOPICS.map(topic => topic.id);
export const DEFAULT_TOPIC = 'exchange';

export const DEFAULT_MENU = {
  title: 'Getränkekarte',
  subtitle: 'Rupi Bar · Halloween',
  note: 'Alle Preise in Euro. Wohl bekomm’s!',
  showEmoji: true
};

export const DEFAULT_WHEEL = {
  title: 'Geister-Glücksrad',
  spinSeconds: 30,
  showPrices: true
};

const TEXT_LIMIT = 60;

function text(value, label, allowEmpty) {
  if (typeof value !== 'string') return { error: `${label}: bitte Text eingeben.` };
  const trimmed = value.trim();
  if (!allowEmpty && trimmed === '') return { error: `${label}: darf nicht leer sein.` };
  if (trimmed.length > TEXT_LIMIT) return { error: `${label}: höchstens ${TEXT_LIMIT} Zeichen.` };
  return { value: trimmed };
}

function flag(value, label) {
  return typeof value === 'boolean' ? { value } : { error: `${label}: an oder aus.` };
}

function seconds(value, label, min, max) {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max
    ? { value: number }
    : { error: `${label}: bitte ${min} bis ${max} Sekunden eingeben.` };
}

const MENU_FIELDS = {
  title: value => text(value, 'Titel', false),
  subtitle: value => text(value, 'Untertitel', true),
  note: value => text(value, 'Hinweis', true),
  showEmoji: value => flag(value, 'Emojis')
};

const WHEEL_FIELDS = {
  title: value => text(value, 'Titel', false),
  spinSeconds: value => seconds(value, 'Drehen alle', 10, 600),
  showPrices: value => flag(value, 'Preise')
};

// Teiländerung prüfen; liefert { value } mit den neuen Einstellungen oder { error }.
function merge(current, input, fields) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: 'Keine Einstellungen übergeben.' };
  const next = { ...current };
  for (const [key, value] of Object.entries(input)) {
    if (!(key in fields)) return { error: `Unbekannte Einstellung: ${key}` };
    const result = fields[key](value);
    if (result.error) return result;
    next[key] = result.value;
  }
  return { value: next };
}

export const mergeMenu = (current, input) => merge(current, input, MENU_FIELDS);
export const mergeWheel = (current, input) => merge(current, input, WHEEL_FIELDS);
