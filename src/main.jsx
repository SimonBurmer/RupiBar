import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import AdminPage from './admin/AdminPage.jsx'
import '@fontsource/ibm-plex-sans/latin-400.css'
import '@fontsource/ibm-plex-sans/latin-600.css'
import '@fontsource/ibm-plex-sans-condensed/latin-500.css'
import '@fontsource/ibm-plex-sans-condensed/latin-600.css'
import '@fontsource/ibm-plex-sans-condensed/latin-700.css'
import '@fontsource/ibm-plex-mono/latin-400.css'
import '@fontsource/ibm-plex-mono/latin-500.css'
import './themes/modern.css'
import './themes/classic.css'
import './topics.css'
import './index.css'
import { applyTheme, storedTheme } from './lib/theme.js'

const isAdmin = /^\/admin\/?$/.test(window.location.pathname)
// /admin nutzt immer das neue Design; die Anzeige startet mit dem zuletzt gesehenen.
applyTheme(isAdmin ? 'modern' : storedTheme())

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isAdmin ? <AdminPage /> : <App />}
  </React.StrictMode>,
)
