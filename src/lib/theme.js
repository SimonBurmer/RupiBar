// Design der Anzeige. Das gewählte Design kommt vom Server; der letzte Stand wird pro Browser
// gemerkt, damit beim Laden nicht kurz das falsche Design aufblitzt.
// Standard, Halloween und Bunt nutzen das Stylesheet „modern“ (body.theme-modern) mit eigener
// Farbpalette (body.theme-standard / .theme-bunt); Klassisch hat ein eigenes Stylesheet.
const KEY = 'rupi-theme'
export const THEME_IDS = ['standard', 'halloween', 'bunt', 'classic']
const ALIASES = { modern: 'halloween' }

const CLASSES = {
  standard: ['theme-modern', 'theme-standard'],
  halloween: ['theme-modern'],
  bunt: ['theme-modern', 'theme-bunt'],
  classic: ['theme-classic']
}
const ALL_CLASSES = [...new Set(Object.values(CLASSES).flat())]

export const normalizeTheme = theme => {
  const value = ALIASES[theme] ?? theme
  return THEME_IDS.includes(value) ? value : 'standard'
}

export function storedTheme() {
  try {
    return normalizeTheme(window.localStorage.getItem(KEY))
  } catch {
    return 'standard'
  }
}

export function applyTheme(theme, remember = false) {
  const value = normalizeTheme(theme)
  document.body.classList.remove(...ALL_CLASSES)
  document.body.classList.add(...CLASSES[value])
  if (remember) {
    try { window.localStorage.setItem(KEY, value) } catch { /* ohne Speicher */ }
  }
}
