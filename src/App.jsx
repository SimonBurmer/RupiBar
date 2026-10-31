import { useState } from 'react'

const menu = [
  { name: 'Espresso', price: 2.5, desc: 'Short, strong and smooth.' },
  { name: 'Flat White', price: 3.8, desc: 'Double shot with velvety milk.' },
  { name: 'Iced Matcha', price: 4.2, desc: 'Ceremonial-grade matcha over ice.' },
  { name: 'Banana Bread', price: 3.0, desc: 'Baked fresh every morning.' },
]

export default function App() {
  const [cart, setCart] = useState({})
  const add = (name) => setCart((c) => ({ ...c, [name]: (c[name] || 0) + 1 }))
  const count = Object.values(cart).reduce((a, b) => a + b, 0)
  const total = menu.reduce((sum, item) => sum + (cart[item.name] || 0) * item.price, 0)

  return (
    <div className="page">
      <header className="hero">
        <h1>RupiBar</h1>
        <p>Coffee, snacks and good vibes.</p>
      </header>

      <main>
        <h2>Menu</h2>
        <ul className="menu">
          {menu.map((item) => (
            <li key={item.name} className="card">
              <div>
                <h3>{item.name}</h3>
                <p>{item.desc}</p>
              </div>
              <div className="card-actions">
                <span className="price">€{item.price.toFixed(2)}</span>
                <button onClick={() => add(item.name)}>Add</button>
              </div>
            </li>
          ))}
        </ul>

        <section className="cart">
          <span>{count} item{count === 1 ? '' : 's'}</span>
          <strong>€{total.toFixed(2)}</strong>
          {count > 0 && (
            <button className="ghost" onClick={() => setCart({})}>Clear</button>
          )}
        </section>
      </main>

      <footer>Deployed on Railway · auto-deploys from main</footer>
    </div>
  )
}
