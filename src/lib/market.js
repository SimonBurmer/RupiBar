// Ausgesetzter Bierhandel: letzter Kurs und Barpreis sind fest auf 2 Euro gesetzt.
export const NORMAL_BEER_PRICE = 2;

export const fmt = value => Number(value).toFixed(2).replace('.', ',');

const BASE_MARKETS = [
  { name: 'Bier', opening: 4.5, price: NORMAL_BEER_PRICE },
  { name: 'Gin Tonic', opening: 10, price: 4 },
  { name: 'Vodka Bull', opening: 9, price: 4 },
  { name: 'Aperol Spritz', opening: 8, price: 4 }
];

const BASE_DRINKS = [
  { name: 'Bier', emoji: '🍺', price: NORMAL_BEER_PRICE },
  { name: 'Weinschorle', emoji: '🥂', price: 2.5 },
  { name: 'Jägermeister', emoji: '🥃', price: 1 },
  { name: 'Tequila', emoji: '🥃', price: 1 },
  { name: 'Pfeffi', emoji: '🟢', price: 1 },
  { name: 'Vodka', emoji: '🥃', price: 1 },
  { name: 'Ficken', emoji: '🔴', price: 1 },
  { name: 'Gin Tonic', emoji: '🍸', price: 4 },
  { name: 'Vodka Bull', emoji: '🥤', price: 4 },
  { name: 'Aperol Spritz', emoji: '🍹', price: 4 }
];

export const MARKET_COUNT = BASE_MARKETS.length;
export const MARKET_ROTATION_MS = 60000;

// Kurse und Getränkekarte mit dem aktuellen Bierpreis (Happy Hour).
export function buildBoard(beerPrice) {
  const markets = BASE_MARKETS.map((market, index) => (index === 0 ? { ...market, price: beerPrice } : market));
  const drinks = BASE_DRINKS.map((drink, index) => (index === 0 ? { ...drink, price: beerPrice } : drink));
  return { markets, drinks };
}

export const isMarketName = name => BASE_MARKETS.some(market => market.name === name);

export function marketChange(market) {
  const change = market.opening - market.price;
  const percentage = (Math.abs(change) / market.opening * 100).toFixed(1).replace('.', ',');
  return { change, percentage, falling: change >= 0 };
}

const NORMALIZED = [[58, 0], [84, .02], [109, 0], [130, .04], [151, .03], [175, .06], [197, .03], [220, .07], [244, .05], [265, .1], [286, .08], [305, .19], [321, .15], [337, .37], [349, .32], [361, .63], [375, .77], [386, .73], [401, 1]];

const toPath = points => points.map(([x, py], index) => `${index ? 'L' : 'M'}${x} ${py.toFixed(2)}`).join(' ');

// Geometrie des Crash-Charts (viewBox 680 × 300).
// `trade` ist nur beim Bier gesetzt: { price, previousPrice, open }.
export function chartGeometry(market, trade) {
  const reference = market.name === 'Bier' ? NORMAL_BEER_PRICE : market.price;
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
