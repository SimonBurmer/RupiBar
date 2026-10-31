import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Im Dev-Modus gehen /api-Aufrufe an den lokalen Server (npm run dev:server).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://localhost:3000' },
  },
})
