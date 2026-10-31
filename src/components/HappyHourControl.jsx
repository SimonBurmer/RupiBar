import { useRef } from 'react'
import { fmt } from '../lib/market.js'
import { formatEnd, isPromotion } from '../lib/happyHour.js'

export default function HappyHourControl({ happy, feedback, onOpen, onSubmit, onReset }) {
  const dialogRef = useRef(null)
  const priceRef = useRef(null)
  const minutesRef = useRef(null)
  const promotion = isPromotion(happy)

  const open = () => {
    const state = onOpen()
    if (isPromotion(state)) {
      priceRef.current.value = state.price.toFixed(2)
      minutesRef.current.value = state.expiresAt ? Math.max(1, Math.ceil((state.expiresAt - Date.now()) / 60000)) : 0
    }
    dialogRef.current.showModal()
  }

  const submit = event => {
    event.preventDefault()
    onSubmit(priceRef.current.value, minutesRef.current.value)
  }

  return (
    <>
      <button className="admin-toggle" id="happy-toggle" type="button" aria-haspopup="dialog" onClick={open}>⚙ Happy Hour</button>
      <dialog className="happy-dialog" id="happy-dialog" aria-labelledby="happy-title" ref={dialogRef}>
        <h2 id="happy-title">Bierpreis &amp; Happy Hour</h2>
        <p id="happy-current">{`Aktuell: ${fmt(happy.price)} €${promotion ? ` · ${formatEnd(happy)}` : ' · Normalpreis'}`}</p>
        <form id="happy-form" onSubmit={submit}>
          <label htmlFor="happy-price">Neuer Bierpreis (€)</label>
          <input id="happy-price" ref={priceRef} type="number" min="0" max="99" step="0.01" defaultValue="1.50" required />
          <label htmlFor="happy-minutes">Laufzeit (Minuten)</label>
          <input id="happy-minutes" ref={minutesRef} type="number" min="0" max="10080" step="1" defaultValue="60" required />
          <small>0 = bis zur manuellen Rücksetzung. Nach Ablauf gilt wieder 2,00 €.</small>
          <div className="happy-actions">
            <button type="submit">Preis übernehmen</button>
            <button type="button" id="happy-reset" onClick={onReset}>Jetzt zurück auf 2,00 €</button>
            <button type="button" id="happy-close" onClick={() => dialogRef.current.close()}>Schließen</button>
          </div>
        </form>
        <p id="happy-feedback" role="status" aria-live="polite">{feedback}</p>
      </dialog>
    </>
  )
}
