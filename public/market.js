// Normalpreise nach dem Crash; Happy Hours können jedes Getränk einzeln ändern.
const beer = 2;
const fmt = value => Number(value).toFixed(2).replace('.', ',');
const markets = [
  { name: 'Bier', opening: 4.5, price: 2, normalPrice: 2 },
  { name: 'Gin Tonic', opening: 10, price: 4, normalPrice: 4 },
  { name: 'Vodka Bull', opening: 9, price: 4, normalPrice: 4 },
  { name: 'Aperol Spritz', opening: 8, price: 4, normalPrice: 4 }
];
let activeMarketIndex = 0;
function getActiveMarket() { return markets[activeMarketIndex]; }
const drinks = [
  ['Bier', '🍺', beer], ['Weinschorle', '🥂', 2.5],
  ['Jägermeister', '🥃', 1], ['Tequila', '🥃', 1], ['Pfeffi', '🟢', 1],
  ['Vodka', '🥃', 1], ['Ficken', '🔴', 1], ['Gin Tonic', '🍸', 4],
  ['Vodka Bull', '🥤', 4], ['Aperol Spritz', '🍹', 4]
];

function renderDrinks() {
document.getElementById('drinks').innerHTML = drinks.map(([name, emoji, price], index) => `
  <div class="drink ${index === 0 ? 'beer' : ''}" data-drink="${name}">
    <div class="drink-name">${name}</div>
    <div class="drink-emoji">${emoji}</div>
    <div class="drink-price">${fmt(price)} €</div>
    <svg class="spark" viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true">
      <path d="${markets.some(market => market.name === name) ? 'M0 2 L15 3 L30 2 L40 6 L47 5 L54 18 L100 18' : 'M0 11 L100 11'}"/>
    </svg>
  </div>`).join('');
}
renderDrinks();

const quotes = drinks.map(([name, , price], index) =>
  `<span class="${index === 0 ? 'bier' : ''}"><b>${name.toUpperCase()}</b> &nbsp; <span data-quote="${index}">${fmt(price)} €</span></span>`
).join('');
const ticker = document.getElementById('ticker');
ticker.innerHTML = `<div class="ticker-group">${quotes}</div><div class="ticker-group" aria-hidden="true">${quotes}</div>`;

// Zwei exakt gleich breite Gruppen sorgen für einen nahtlosen Übergang.
// Die Geschwindigkeit bleibt unabhängig von Bildschirmbreite und Schrift gleich.
function setTickerSpeed() {
  const distance = ticker.firstElementChild.getBoundingClientRect().width;
  if (distance > 0) ticker.style.setProperty('--ticker-duration', `${distance / 48}s`);
}
setTickerSpeed();
new ResizeObserver(setTickerSpeed).observe(ticker.firstElementChild);
if (document.fonts) document.fonts.ready.then(setTickerSpeed);

function clock() {
  document.getElementById('clock').textContent = new Date().toLocaleTimeString('de-DE', {
    hour: '2-digit', minute: '2-digit'
  });
}
clock();
setInterval(clock, 15000);

function showMarket(index) {
  activeMarketIndex = index % markets.length;
  const market = getActiveMarket();
  const change = market.opening - market.price;
  const percentage = (Math.abs(change) / market.opening * 100).toFixed(1).replace('.', ',');
  const title = document.querySelector('.beer-title');
  title.textContent = market.name.toUpperCase();
  title.classList.toggle('long-name', market.name.length > 5);
  document.getElementById('bigPrice').textContent = fmt(market.price);
  document.querySelector('.beer-sub').innerHTML = `${change >= 0 ? '▼ −' : '▲ +'}${percentage} % <span>${change >= 0 ? '−' : '+'}${fmt(Math.abs(change))} € SEIT ERÖFFNUNG</span>`;
  document.getElementById('rotation-info').textContent = `KURSÜBERSICHT ${activeMarketIndex + 1} / ${markets.length}`;
  document.querySelector('.chart-status > span:last-child').textContent = `${market.name.toUpperCase()} / EUR`;
  document.getElementById('crash-title').textContent = `${market.name}: Crash von ${fmt(market.opening)} auf ${fmt(market.price)} Euro`;
  document.getElementById('crash-description').textContent = `Kursverlust ${percentage} Prozent. Handel ausgesetzt. Preis fixiert bei ${fmt(market.price)} Euro.`;

  const chart = document.querySelector('.crash-chart');
  const trade = window.getMarketTradeState ? window.getMarketTradeState(market.name) : null;
  const reference = market.normalPrice;
  const lower = Math.min(market.price, reference, trade?.previousPrice ?? reference);
  const upper = Math.max(market.opening, market.price, trade?.previousPrice ?? reference);
  const range = Math.max(0.5, upper - lower);
  const y = price => 48 + (upper - price) / range * 175;
  const labels = chart.querySelectorAll('g[font-size="18"] text');
  for (let tick = 0; tick < 6; tick++) {
    labels[tick].textContent = fmt(upper - range * tick / 5);
    labels[tick].setAttribute('font-size', '16');
    labels[tick].setAttribute('x', '3');
  }
  chart.querySelector('text[font-size="23"]').textContent = `${fmt(market.opening)} €`;
  chart.querySelector('text[font-size="23"]').setAttribute('y', String(y(market.opening) - 14));
  chart.querySelector('text[font-size="16"][x="418"]').textContent = `Kurs bleibt bei ${fmt(market.price)} €`;
  chart.querySelector('text[font-size="28"]').textContent = `${fmt(market.price)} €`;
  chart.querySelector('text[font-size="28"]').setAttribute('y', String(y(market.price) - 14));
  const normalized = [[58,0],[84,.02],[109,0],[130,.04],[151,.03],[175,.06],[197,.03],[220,.07],[244,.05],[265,.1],[286,.08],[305,.19],[321,.15],[337,.37],[349,.32],[361,.63],[375,.77],[386,.73],[401,1]];
  const points = normalized.map(([x, fraction]) => [x, y(market.opening - (market.opening - reference) * fraction)]);
  if (trade && (market.price !== reference || trade.previousPrice !== reference)) {
    points.push([430,y(reference)],[450,y(trade.previousPrice)],[475,y(trade.previousPrice)],[510,y(market.price)]);
  }
  const path = points.map(([x,py],index) => `${index ? 'L' : 'M'}${x} ${py.toFixed(2)}`).join(' ');
  chart.querySelector('.price-history').setAttribute('d', path);
  chart.querySelector('.price-crash').setAttribute('d', points.slice(12).map(([x,py],index) => `${index ? 'L' : 'M'}${x} ${py.toFixed(2)}`).join(' '));
  const eventPath = chart.querySelector('.price-event');
  const hasEvent = trade && (market.price !== reference || trade.previousPrice !== reference);
  eventPath.setAttribute('d', hasEvent ? `M475 ${y(trade.previousPrice)} L510 ${y(market.price)}` : '');
  eventPath.classList.toggle('recovery', Boolean(trade && market.price > trade.previousPrice));
  eventPath.classList.toggle('trading', Boolean(hasEvent && trade.open));
  chart.querySelector('path[fill="url(#crash-fill)"]').setAttribute('d', `${path} L${points.at(-1)[0]} 242 L58 242Z`);
  chart.querySelector('path[stroke-dasharray="6 4"]').setAttribute('d', `M${points.at(-1)[0]} ${y(market.price)}H622`);
  chart.querySelector('circle').setAttribute('cx', points.at(-1)[0]);
  chart.querySelector('circle').setAttribute('cy', y(market.price));
  document.querySelector('.halt-summary strong').textContent = `${fmt(market.price)} €`;
  document.querySelectorAll('.drink').forEach(card => {
    card.classList.toggle('beer', card.dataset.drink === market.name);
  });
  if (window.updateHappyHourStatus) window.updateHappyHourStatus();
}

showMarket(0);
// Nach einem inaktiven Browser-Tab direkt wieder den richtigen Minutenplatz zeigen.
let rotationStarted = performance.now();
let marketPinnedUntil = 0;
function rotateMarket() {
  if (Date.now() < marketPinnedUntil) return;
  const index = Math.floor((performance.now() - rotationStarted) / 60000) % markets.length;
  if (index !== activeMarketIndex) showMarket(index);
}
setInterval(rotateMarket, 1000);
document.addEventListener('visibilitychange', rotateMarket);
