import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import AdminPage from './admin/AdminPage.jsx'
import './index.css'

const isAdmin = /^\/admin\/?$/.test(window.location.pathname)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isAdmin ? <AdminPage /> : <App />}
  </React.StrictMode>,
)
