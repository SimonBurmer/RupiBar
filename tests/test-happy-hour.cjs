const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');

function browser(storage = new Map(), startTime = 1800000000000) {
  let now = startTime;
  const nodes = new Map();
  const timers = [];
  function element(key) {
    if (!nodes.has(key)) {
      const classes = new Set();
      const result = {
        textContent: '', innerHTML: '', value: '', dataset: {}, events: {}, attrs: {},
        classList: {
          toggle(name, active) { active ? classes.add(name) : classes.delete(name); },
          remove(name) { classes.delete(name); }, contains(name) { return classes.has(name); }
        },
        style: {setProperty() {}}, setAttribute(name, value) { this.attrs[name] = value; },
        addEventListener(event, fn) { this.events[event] = fn; },
        showModal() { this.open = true; }, close() { this.open = false; },
        querySelector(selector) { return element(key + ' ' + selector); },
        querySelectorAll() { return Array.from({length: 9}, (_, i) => element(key + ' label' + i)); }
      };
      nodes.set(key, result);
    }
    return nodes.get(key);
  }
  element('ticker').firstElementChild = {getBoundingClientRect: () => ({width: 2400})};
  const cards = ['Bier', 'Gin Tonic', 'Vodka Bull', 'Aperol Spritz'].map(name => {
    const card = element('card:' + name); card.dataset.drink = name; return card;
  });
  const quoteGroups = Object.fromEntries([0,7,8,9].map(index => [index, [element(`quote:${index}:1`), element(`quote:${index}:2`)]]));
  const quotes = quoteGroups[0];
  const sandbox = {
    document: {
      getElementById: element, querySelector: element,
      querySelectorAll: selector => selector === '.drink' ? cards : (quoteGroups[/data-quote="(\d+)"/.exec(selector)?.[1]] || []),
      addEventListener() {}
    },
    performance: {now: () => now - startTime},
    Date: class extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } },
    localStorage: {getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value)},
    ResizeObserver: class {observe() {}},
    setInterval: (fn, ms) => timers.push({fn, ms})
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const file of ['market.js', 'happy-hour.js']) vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox);
  return {
    sandbox, element, quotes, quoteGroups, storage,
    eval: code => vm.runInContext(code, sandbox),
    tick(ms) { now += ms; timers.filter(timer => timer.ms <= 1000).forEach(timer => timer.fn()); },
    submit(price, minutes, index = 0) {
      element('happy-drink').value = String(index);
      element('happy-price').value = String(price);
      element('happy-minutes').value = String(minutes);
      element('happy-form').events.submit({preventDefault() {}});
    },
    reset(index = 0) { element('happy-drink').value = String(index); element('happy-reset').events.click(); },
    now: () => now
  };
}

const b = browser();
assert.equal(b.eval('markets[0].price'), 2);
b.submit(1.5, 30);
assert.equal(b.eval('markets[0].price'), 1.5);
assert.equal(b.eval('drinks[0][2]'), 1.5);
assert.equal(b.element('bigPrice').textContent, '1,50');
assert(b.quotes.every(quote => quote.textContent === '1,50 €'));
assert.equal(b.sandbox.getMarketTradeState('Bier').open, true);
assert(b.sandbox.getHappyHourBulletin().headline.includes('ABGESTÜRZT'));
assert(b.element('.halt-badge').classList.contains('trading-open'));
b.tick(6500);
assert.equal(b.sandbox.getMarketTradeState('Bier').open, false);
assert.equal(b.element('.halt-badge').textContent, 'Ⅱ HANDEL AUSGESETZT');
const reload = browser(b.storage, b.now());
assert.equal(reload.eval('markets[0].price'), 1.5);
assert.equal(reload.sandbox.getMarketTradeState('Bier').expiresAt, b.sandbox.getMarketTradeState('Bier').expiresAt);
b.tick(30 * 60000);
assert.equal(b.eval('markets[0].price'), 2);
assert(b.sandbox.getHappyHourBulletin().headline.includes('ERHOLT'));
assert(b.element('.crash-chart .price-event').classList.contains('recovery'));
b.submit(1.25, 0);
b.tick(8 * 3600000);
assert.equal(b.eval('markets[0].price'), 1.25);
b.reset();
assert.equal(b.eval('markets[0].price'), 2);
b.submit(-1, 30);
assert.equal(b.eval('markets[0].price'), 2);
b.submit(1.5, 0.5);
assert.equal(b.eval('markets[0].price'), 2);
b.submit(0, 1);
assert.equal(b.eval('markets[0].price'), 0);
const expired = browser(b.storage, b.now() + 61000);
assert.equal(expired.eval('markets[0].price'), 2);

// Alle vier Aktionen sind unabhängig, inklusive Kachel, Laufband und Erholung.
const multi = browser();
multi.submit(1.5, 5, 0);
multi.submit(3, 10, 1);
multi.submit(2.75, 0, 2);
multi.submit(3.5, 15, 3);
assert.deepEqual(Array.from(multi.eval('markets.map(m => m.price)')), [1.5,3,2.75,3.5]);
for (const [index, drinkIndex, price] of [[0,0,1.5],[1,7,3],[2,8,2.75],[3,9,3.5]]) {
  assert.equal(multi.eval(`drinks[${drinkIndex}][2]`), price);
  assert(multi.quoteGroups[drinkIndex].every(quote => quote.textContent === price.toFixed(2).replace('.',',') + ' €'));
  assert.equal(multi.sandbox.getMarketTradeState(['Bier','Gin Tonic','Vodka Bull','Aperol Spritz'][index]).open, true);
}
const restored = browser(multi.storage, multi.now());
assert.deepEqual(Array.from(restored.eval('markets.map(m => m.price)')), [1.5,3,2.75,3.5]);
multi.tick(5 * 60000 + 1);
assert.deepEqual(Array.from(multi.eval('markets.map(m => m.price)')), [2,3,2.75,3.5]);
multi.reset(1);
assert.equal(multi.eval('markets[1].price'), 4);
assert(multi.sandbox.getHappyHourBulletin().text.includes('Gin Tonic'));
assert(multi.element('.crash-chart .price-event').classList.contains('recovery'));
multi.tick(60001);
assert.equal(multi.eval('activeMarketIndex'), 2, 'Rotation continues after the chosen drink');
multi.tick(10 * 60000);
assert.deepEqual(Array.from(multi.eval('markets.map(m => m.price)')), [2,4,2.75,4]);
multi.reset(2);
assert.equal(multi.eval('markets[2].price'), 4);
const simultaneous = browser();
simultaneous.submit(3, 1, 1);
simultaneous.submit(3, 1, 2);
simultaneous.submit(3, 1, 3);
simultaneous.tick(60001);
assert.deepEqual(Array.from(simultaneous.eval('markets.map(m => m.price)')), [2,4,4,4]);
const legacy = new Map([['rupi-happy-hour-v1', JSON.stringify({price:1.5,previousPrice:2,expiresAt:null,eventAt:1})]]);
assert.equal(browser(legacy).eval('markets[0].price'), 1.5);
const corrupt = new Map([['rupi-happy-hour-v2', JSON.stringify({'Gin Tonic':{price:-1}})]]);
assert.deepEqual(Array.from(browser(corrupt).eval('markets.map(m => m.price)')), [2,4,4,4]);
for (const name of ['market.js', 'happy-hour.js', 'reporter-dialog.js']) new Function(fs.readFileSync(name, 'utf8'));
console.log('Happy Hours: all four drinks, independent/simultaneous expiry, price propagation, reload, reset, recovery, rotation, legacy migration, and validation passed.');
