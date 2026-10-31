export const fmt = value => Number(value).toFixed(2).replace('.', ',');

// Getränkekarte mit Standardpreisen. Die aktuellen Preise kommen vom Server (/admin).
export const DRINKS = [
  { name: 'Bier', emoji: '🍺', defaultPrice: 2 },
  { name: 'Weinschorle', emoji: '🥂', defaultPrice: 2.5 },
  { name: 'Jägermeister', emoji: '🥃', defaultPrice: 1 },
  { name: 'Tequila', emoji: '🥃', defaultPrice: 1 },
  { name: 'Pfeffi', emoji: '🟢', defaultPrice: 1 },
  { name: 'Vodka', emoji: '🥃', defaultPrice: 1 },
  { name: 'Ficken', emoji: '🔴', defaultPrice: 1 },
  { name: 'Gin Tonic', emoji: '🍸', defaultPrice: 4 },
  { name: 'Vodka Bull', emoji: '🥤', defaultPrice: 4 },
  { name: 'Aperol Spritz', emoji: '🍹', defaultPrice: 4 }
];

export const DEFAULT_PRICES = Object.fromEntries(DRINKS.map(drink => [drink.name, drink.defaultPrice]));

// Kursübersichten mit ihrem Eröffnungskurs.
const MARKETS = [
  { name: 'Bier', opening: 4.5 },
  { name: 'Gin Tonic', opening: 10 },
  { name: 'Vodka Bull', opening: 9 },
  { name: 'Aperol Spritz', opening: 8 }
];

export const MARKET_COUNT = MARKETS.length;
export const MARKET_ROTATION_MS = 60000;

// Kurse und Getränkekarte aus den Preisen; `beerPrice` ist der aktuelle Bierpreis (inkl. Happy Hour).
export function buildBoard(prices, beerPrice) {
  const priceOf = name => (name === 'Bier' ? beerPrice : prices[name]);
  return {
    markets: MARKETS.map(market => ({ ...market, price: priceOf(market.name) })),
    drinks: DRINKS.map(({ name, emoji }) => ({
      name, emoji, price: priceOf(name), opening: MARKETS.find(market => market.name === name)?.opening ?? null
    }))
  };
}

export const isMarketName = name => MARKETS.some(market => market.name === name);

export function marketChange(market) {
  const change = market.opening - market.price;
  const percentage = (Math.abs(change) / market.opening * 100).toFixed(1).replace('.', ',');
  return { change, percentage, falling: change >= 0 };
}

// Preis-Eingabe ("1,50" oder 1.5) prüfen: 0 bis 99 Euro, auf Cent gerundet; sonst null.
export function parsePrice(value) {
  const text = String(value ?? '').trim().replace(',', '.');
  if (text === '') return null;
  const price = Number(text);
  if (!Number.isFinite(price) || price < 0 || price > 99) return null;
  return Math.round(price * 100) / 100;
}

const NORMALIZED = [[58, 0], [84, .02], [109, 0], [130, .04], [151, .03], [175, .06], [197, .03], [220, .07], [244, .05], [265, .1], [286, .08], [305, .19], [321, .15], [337, .37], [349, .32], [361, .63], [375, .77], [386, .73], [401, 1]];

const toPath = points => points.map(([x, py], index) => `${index ? 'L' : 'M'}${x} ${py.toFixed(2)}`).join(' ');

// Geometrie des Crash-Charts (viewBox 680 × 300).
// `trade` ist nur beim Bier gesetzt: { price, previousPrice, open }; `beerBase` ist der Bier-Normalpreis.
export function chartGeometry(market, trade, beerBase) {
  const reference = market.name === 'Bier' ? beerBase : market.price;
  const previous = trade?.previousPrice ?? reference;
  const lower = Math.min(market.price, reference, previous);
  const upper = Math.max(market.opening, market.price, previous);
  const range = Math.max(0.5, upper - lower);
  const y = price => 48 + (upper - price) / range * 175;

  const points = NORMALIZED.map(([x, fraction]) => [x, y(market.opening - (market.opening - reference) * fraction)]);
  const hasEvent = Boolean(trade && (market.price !== reference || trade.previousPrice !== reference));
  if (hasEvent) {
    points.push([430, y(reference)], [450, y(trade.previousPrice)], [475, y(trade.previousPrice)], [510, y(market.price)]);
  }
  const historyPath = toPath(points);
  const lastX = points.at(-1)[0];

  return {
    labels: Array.from({ length: 6 }, (_, tick) => fmt(upper - range * tick / 5)),
    openingLabelY: y(market.opening) - 14,
    priceLabelY: y(market.price) - 14,
    historyPath,
    crashPath: toPath(points.slice(12)),
    fillPath: `${historyPath} L${lastX} 242 L58 242Z`,
    eventPath: hasEvent ? `M475 ${y(trade.previousPrice)} L510 ${y(market.price)}` : '',
    hasEvent,
    recovery: Boolean(trade && market.price > trade.previousPrice),
    trading: Boolean(hasEvent && trade.open),
    dashPath: `M${lastX} ${y(market.price)}H622`,
    dotX: lastX,
    dotY: y(market.price)
  };
}
