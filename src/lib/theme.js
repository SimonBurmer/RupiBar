// Design der Anzeige: 'modern' (Standard) oder 'classic'. Das gewählte Design kommt vom Server;
// der letzte Stand wird pro Browser gemerkt, damit beim Laden nicht kurz das falsche Design aufblitzt.
const KEY = 'rupi-theme'
const VALID = ['modern', 'classic']

export function storedTheme() {
  try {
    const value = window.localStorage.getItem(KEY)
    return VALID.includes(value) ? value : 'modern'
  } catch {
    return 'modern'
  }
}

export function applyTheme(theme, remember = false) {
  const value = VALID.includes(theme) ? theme : 'modern'
  document.body.classList.remove(...VALID.map(name => `theme-${name}`))
  document.body.classList.add(`theme-${value}`)
  if (remember) {
    try { window.localStorage.setItem(KEY, value) } catch { /* ohne Speicher */ }
  }
}
