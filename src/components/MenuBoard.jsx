import { CATEGORIES, fmt } from '../lib/market.js'
import { formatEnd, isPromotion } from '../lib/happyHour.js'

// Getränkekarte: ruhige Preistafel in drei Spalten. Happy-Hour-Preise mit durchgestrichenem Normalpreis.
export default function MenuBoard({ drinks, happy, menu, now }) {
  const time = new Date(now)
  const clock = time.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  const offers = drinks.filter(drink => happy[drink.name] && isPromotion(happy[drink.name], drink.base))

  return (
    <div className="menu-screen">
      <header className="menu-header">
        <div>
          <h1 className="menu-title">{menu.title}</h1>
          {menu.subtitle && <p className="menu-subtitle">{menu.subtitle}</p>}
        </div>
        <span className="menu-clock">{clock}</span>
      </header>

      <main className="menu-columns">
        {CATEGORIES.map(category => (
          <section key={category.id} className="menu-section">
            <h2>{category.title}</h2>
            <ul>
              {drinks.filter(drink => drink.category === category.id).map(drink => {
                const state = happy[drink.name]
                const offer = state && isPromotion(state, drink.base)
                return (
                  <li key={drink.name} className={offer ? 'offer' : ''} data-drink={drink.name}>
                    <span className="menu-name">
                      {menu.showEmoji && <span className="menu-emoji" aria-hidden="true">{drink.emoji}</span>}
                      {drink.name}
                    </span>
                    <span className="menu-dots" aria-hidden="true" />
                    <span className="menu-price">
                      {offer && drink.base !== drink.price && <s>{fmt(drink.base)}</s>}
                      {fmt(drink.price)} €
                    </span>
                    {offer && (
                      <span className="menu-offer">Happy Hour {state.expiresAt ? `bis ${formatEnd(state)} Uhr` : 'läuft'}</span>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </main>

      <footer className="menu-footer">
        {offers.length > 0
          ? <span className="menu-footer-offer">Happy Hour: {offers.map(drink => `${drink.name} ${fmt(drink.price)} €`).join(' · ')}</span>
          : <span />}
        {menu.note && <span className="menu-note">{menu.note}</span>}
      </footer>
    </div>
  )
}
