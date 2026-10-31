import { useEffect, useState } from 'react'
import { DEFAULT_PRICES } from './market.js'
import { INITIAL_HAPPY } from './happyHour.js'

// Live-Preise vom Server. `offset` gleicht die Uhr dieses Geräts an die Serverzeit an.
export function useExchange() {
  const [live, setLive] = useState({
    prices: DEFAULT_PRICES, happy: INITIAL_HAPPY, offset: 0, synced: false, connected: false
  })

  useEffect(() => {
    const source = new EventSource('/api/events')
    source.onmessage = event => {
      const data = JSON.parse(event.data)
      setLive({ prices: data.prices, happy: data.happy, offset: data.serverTime - Date.now(), synced: true, connected: true })
    }
    source.onerror = () => setLive(prev => ({ ...prev, connected: false }))
    return () => source.close()
  }, [])

  return live
}

// Änderung an den Server schicken; wirft einen Error mit der Servermeldung.
export async function sendChange(method, url, body) {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || `Fehler ${response.status}`)
  return data
}
