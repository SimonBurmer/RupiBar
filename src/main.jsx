import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import AdminPage from './admin/AdminPage.jsx'
import UploadPage from './upload/UploadPage.jsx'
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
const isUpload = /^\/upload\/?$/.test(window.location.pathname)
// /admin nutzt immer das Standard-Design; die Anzeige startet mit dem zuletzt gesehenen.
applyTheme(isAdmin || isUpload ? 'standard' : storedTheme())

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isAdmin ? <AdminPage /> : isUpload ? <UploadPage /> : <App />}
  </React.StrictMode>,
)
