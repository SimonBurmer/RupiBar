// Getränkeleiste für beide Designs. `Tile` rendert eine Kachel im jeweiligen Design.
// Modi: 'fixed' (alle zehn stehen), 'scroll' (läuft durch wie das Laufband, alle `seconds`
// Sekunden ein Getränk weiter) und 'page' (fünf Kacheln, alle `seconds` Sekunden umblättern).
export const PAGE_SIZE = 5

export default function DrinkRow({ drinks, activeName, mode = 'fixed', seconds = 5, now = Date.now(), Tile }) {
  const tile = (drink, key, hidden = false) => (
    <Tile key={key} drink={drink} active={drink.name === activeName} hidden={hidden} />
  )

  if (mode === 'scroll') {
    // Zwei identische Hälften sorgen für einen nahtlosen Übergang.
    return (
      <section className="drinks mode-scroll" id="drinks">
        <div className="drinks-track" style={{ '--drinks-duration': `${drinks.length * seconds}s` }}>
          {drinks.map(drink => tile(drink, drink.name))}
          {drinks.map(drink => tile(drink, `${drink.name}-copy`, true))}
        </div>
      </section>
    )
  }

  if (mode === 'page') {
    const pages = Math.ceil(drinks.length / PAGE_SIZE)
    const page = Math.floor(now / (seconds * 1000)) % pages
    return (
      <section key={page} className="drinks mode-page" id="drinks">
        {drinks.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE).map(drink => tile(drink, drink.name))}
      </section>
    )
  }

  return (
    <section className="drinks" id="drinks">
      {drinks.map(drink => tile(drink, drink.name))}
    </section>
  )
}
