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
  const quotes = [element('quote1'), element('quote2')];
  const sandbox = {
    document: {
      getElementById: element, querySelector: element,
      querySelectorAll: selector => selector === '.drink' ? cards : quotes,
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
    sandbox, element, quotes, storage,
    eval: code => vm.runInContext(code, sandbox),
    tick(ms) { now += ms; timers.filter(timer => timer.ms <= 1000).forEach(timer => timer.fn()); },
    submit(price, minutes) {
      element('happy-price').value = String(price);
      element('happy-minutes').value = String(minutes);
      element('happy-form').events.submit({preventDefault() {}});
    },
    reset() { element('happy-reset').events.click(); },
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
assert.equal(b.sandbox.getBeerTradeState().open, true);
assert(b.sandbox.getHappyHourBulletin().headline.includes('ABGESTÜRZT'));
assert(b.element('.halt-badge').classList.contains('trading-open'));
b.tick(6500);
assert.equal(b.sandbox.getBeerTradeState().open, false);
assert.equal(b.element('.halt-badge').textContent, 'Ⅱ HANDEL AUSGESETZT');
const reload = browser(b.storage, b.now());
assert.equal(reload.eval('markets[0].price'), 1.5);
assert.equal(reload.sandbox.getBeerTradeState().expiresAt, b.sandbox.getBeerTradeState().expiresAt);
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
for (const name of ['market.js', 'happy-hour.js', 'reporter-dialog.js']) new Function(fs.readFileSync(name, 'utf8'));
console.log('Happy Hour: price propagation, trading phases, timed expiry, reload, expired reload, unlimited duration, reset, recovery, and validation passed.');
