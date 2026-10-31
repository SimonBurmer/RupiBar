// Unabhängige Happy Hours pro Getränk, gespeichert in diesem Browser.
(() => {
  const storageKey = 'rupi-happy-hour-v2';
  const dialog = document.getElementById('happy-dialog');
  const drinkInput = document.getElementById('happy-drink');
  const priceInput = document.getElementById('happy-price');
  const minutesInput = document.getElementById('happy-minutes');
  const feedback = document.getElementById('happy-feedback');
  const states = Object.fromEntries(markets.map(market => [market.name, {
    price: market.normalPrice, previousPrice: market.normalPrice, expiresAt: null, eventAt: 0
  }]));
  let lastPhase = '';
  let latestEventName = null;

  function valid(state) {
    return state && Number.isFinite(state.price) && state.price >= 0 && state.price <= 99
      && Number.isFinite(state.previousPrice) && state.previousPrice >= 0 && state.previousPrice <= 99
      && Number.isFinite(state.eventAt) && (state.expiresAt === null || Number.isFinite(state.expiresAt));
  }
  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(states)); }
    catch { feedback.textContent = 'Preise sind aktiv. Dieser Browser kann sie jedoch nicht für einen Neustart speichern.'; }
  }
  try {
    const savedText = localStorage.getItem(storageKey);
    if (savedText !== null) {
      const saved = JSON.parse(savedText);
      markets.forEach(market => { if (valid(saved?.[market.name])) states[market.name] = saved[market.name]; });
    } else {
      // Bereits laufende Bier-Happy-Hour aus der bisherigen Version übernehmen.
      const beer = JSON.parse(localStorage.getItem('rupi-happy-hour-v1'));
      if (valid(beer)) { states.Bier = beer; save(); }
    }
  } catch { /* Ohne gültigen Speicher mit den Normalpreisen starten. */ }

  function selectedIndex() {
    const index = Number(drinkInput.value);
    return Number.isInteger(index) && index >= 0 && index < markets.length ? index : 0;
  }
  function isOpen(state) { return state.eventAt > 0 && Date.now() - state.eventAt < 6000; }
  function isPromotion(market) {
    const state = states[market.name];
    return state.price !== market.normalPrice || state.expiresAt !== null;
  }
  function formatEnd(state) {
    return state.expiresAt ? new Date(state.expiresAt).toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    }) : 'bis zur Rücksetzung';
  }

  window.getMarketTradeState = name => states[name] ? { ...states[name], open: isOpen(states[name]) } : null;
  window.getHappyHourBulletin = () => {
    const market = latestEventName ? markets.find(item => item.name === latestEventName)
      : markets.reduce((latest, candidate) => states[candidate.name].eventAt > states[latest.name].eventAt ? candidate : latest, markets[0]);
    const state = states[market.name];
    if (!state.eventAt || Date.now() - state.eventAt > 24000) return null;
    const lower = state.price < state.previousPrice;
    const same = state.price === state.previousPrice;
    return {
      headline: same ? 'HANDELSPAUSE VERLÄNGERT' : lower ? 'EIL: KURS ERNEUT ABGESTÜRZT' : 'EIL: KURS ERHOLT SICH',
      text: same ? `${market.name} bleibt bei ${fmt(state.price)} Euro. Axel Fridolin hat die neue Laufzeit bestätigt.`
        : lower ? `${market.name}: Handel kurz geöffnet – von ${fmt(state.previousPrice)} auf ${fmt(state.price)} Euro gefallen! Sarah ruft Johannes an. Axel Fridolin ruft die nächste Runde aus.`
        : `${market.name} erholt sich von ${fmt(state.previousPrice)} auf ${fmt(state.price)} Euro. Johannes atmet auf. ${isOpen(state) ? 'Der Handel ist kurz geöffnet.' : 'Handel wieder ausgesetzt.'}`
    };
  };

  window.updateHappyHourStatus = () => {
    const market = getActiveMarket();
    const state = states[market.name];
    const open = isOpen(state);
    const badge = document.querySelector('.halt-badge');
    badge.textContent = open ? '● HANDEL KURZ GEÖFFNET' : 'Ⅱ HANDEL AUSGESETZT';
    badge.classList.toggle('trading-open', open);
    const chart = document.querySelector('.crash-chart');
    chart.querySelector('text[font-size="19"]').textContent = open ? 'HANDEL GEÖFFNET' : 'HANDEL GESTOPPT';
    if (!open) chart.querySelector('.price-event').classList.remove('trading');
    document.querySelector('.halt-summary > span:first-child').textContent = open ? 'NEUER KURS' : 'BARPREIS FIXIERT';
    document.querySelector('.halt-summary > span:last-child').textContent = state.expiresAt ? `bis ${formatEnd(state)}` : 'bis zur Wiederaufnahme';
    const info = document.getElementById('rotation-info');
    info.classList.toggle('happy-hour-active', isPromotion(market));
    info.textContent = isPromotion(market)
      ? `HAPPY HOUR · ${fmt(state.price)} € · ${state.expiresAt ? 'BIS ' : ''}${formatEnd(state).toUpperCase()}`
      : `KURSÜBERSICHT ${activeMarketIndex + 1} / ${markets.length}`;
    const selected = markets[selectedIndex()];
    const selectedState = states[selected.name];
    document.getElementById('happy-current').textContent = `${selected.name}: ${fmt(selectedState.price)} €${isPromotion(selected) ? ` · ${formatEnd(selectedState)}` : ' · Normalpreis'}`;
    document.getElementById('happy-help').textContent = `0 = bis zur manuellen Rücksetzung. Nach Ablauf gilt für ${selected.name} wieder ${fmt(selected.normalPrice)} €.`;
    document.getElementById('happy-reset').textContent = `Zurück auf ${fmt(selected.normalPrice)} €`;
    document.getElementById('happy-overview').innerHTML = markets.map(item =>
      `<li class="${isPromotion(item) ? 'promotion' : ''}">${item.name}: <strong>${fmt(states[item.name].price)} €</strong> · ${isPromotion(item) ? formatEnd(states[item.name]) : 'Normalpreis'}</li>`
    ).join('');
  };

  function fillInputs() {
    const market = markets[selectedIndex()];
    const state = states[market.name];
    priceInput.value = (isPromotion(market) ? state.price : Math.max(0, market.normalPrice - 0.5)).toFixed(2);
    minutesInput.value = isPromotion(market)
      ? (state.expiresAt ? Math.max(1, Math.ceil((state.expiresAt - Date.now()) / 60000)) : 0) : 60;
    window.updateHappyHourStatus();
  }
  function applyToDisplay(focusIndex = null) {
    markets.forEach(market => {
      market.price = states[market.name].price;
      const drinkIndex = drinks.findIndex(drink => drink[0] === market.name);
      drinks[drinkIndex][2] = market.price;
      document.querySelectorAll(`[data-quote="${drinkIndex}"]`).forEach(quote => { quote.textContent = `${fmt(market.price)} €`; });
    });
    renderDrinks();
    setTickerSpeed();
    if (focusIndex !== null) {
      rotationStarted = performance.now() - focusIndex * 60000;
      marketPinnedUntil = Date.now() + 60000;
    }
    showMarket(focusIndex ?? activeMarketIndex);
  }
  function changeState(index, price, minutes) {
    const name = markets[index].name;
    latestEventName = name;
    states[name] = { price, previousPrice: states[name].price, expiresAt: minutes > 0 ? Date.now() + minutes * 60000 : null, eventAt: Date.now() };
  }
  function setPrice(index, price, minutes) {
    changeState(index, price, minutes);
    feedback.textContent = '';
    save();
    applyToDisplay(index);
    if (!feedback.textContent) feedback.textContent = `${markets[index].name}: ${fmt(price)} € übernommen · ${formatEnd(states[markets[index].name])}.`;
  }
  function expireStates() {
    const expired = [];
    markets.forEach((market, index) => {
      const state = states[market.name];
      if (state.expiresAt !== null && Date.now() >= state.expiresAt) {
        changeState(index, market.normalPrice, 0);
        expired.push(index);
      }
    });
    return expired;
  }
  function checkExpiry() {
    const expired = expireStates();
    if (expired.length) { save(); applyToDisplay(expired[0]); }
    const phase = `${markets.map(market => isOpen(states[market.name])).join(':')}:${activeMarketIndex}`;
    if (phase !== lastPhase) { lastPhase = phase; window.updateHappyHourStatus(); }
  }

  drinkInput.addEventListener('change', () => { feedback.textContent = ''; fillInputs(); });
  document.getElementById('happy-toggle').addEventListener('click', () => {
    checkExpiry();
    drinkInput.value = String(activeMarketIndex);
    fillInputs();
    dialog.showModal();
  });
  document.getElementById('happy-close').addEventListener('click', () => dialog.close());
  document.getElementById('happy-reset').addEventListener('click', () => {
    const index = selectedIndex();
    setPrice(index, markets[index].normalPrice, 0);
    fillInputs();
  });
  document.getElementById('happy-form').addEventListener('submit', event => {
    event.preventDefault();
    const price = Number(priceInput.value.replace(',', '.'));
    const minutes = Number(minutesInput.value);
    if (!priceInput.value.trim() || !minutesInput.value.trim() || !Number.isFinite(price) || price < 0 || price > 99 || !Number.isInteger(minutes) || minutes < 0 || minutes > 10080) {
      feedback.textContent = 'Bitte einen Preis von 0 bis 99 € und eine Laufzeit von 0 bis 10080 Minuten eingeben.';
      return;
    }
    setPrice(selectedIndex(), Math.round(price * 100) / 100, minutes);
  });
  document.addEventListener('visibilitychange', checkExpiry);
  if (expireStates().length) save();
  applyToDisplay();
  fillInputs();
  setInterval(checkExpiry, 500);
})();
