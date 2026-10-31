// Zustand bleibt bei Neuladen auf diesem Browser erhalten.
(() => {
  const storageKey = 'rupi-happy-hour-v1';
  let state = { price: 2, previousPrice: 2, expiresAt: null, eventAt: 0 };
  const dialog = document.getElementById('happy-dialog');
  const priceInput = document.getElementById('happy-price');
  const minutesInput = document.getElementById('happy-minutes');
  const feedback = document.getElementById('happy-feedback');
  let lastPhase = '';

  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); }
    catch { feedback.textContent = 'Preis ist aktiv. Dieser Browser kann ihn jedoch nicht für einen Neustart speichern.'; }
  }

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && Number.isFinite(saved.price) && saved.price >= 0 && saved.price <= 99
      && Number.isFinite(saved.previousPrice) && saved.previousPrice >= 0 && saved.previousPrice <= 99
      && Number.isFinite(saved.eventAt) && (saved.expiresAt === null || Number.isFinite(saved.expiresAt))) state = saved;
  } catch { /* Ohne Speicher mit Normalpreis starten. */ }

  function isOpen() { return state.eventAt > 0 && Date.now() - state.eventAt < 6000; }
  function isPromotion() { return state.price !== 2 || state.expiresAt !== null; }
  function formatEnd() {
    return state.expiresAt ? new Date(state.expiresAt).toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'}) : 'bis zur Rücksetzung';
  }

  window.getBeerTradeState = () => ({ ...state, open: isOpen() });
  window.getHappyHourBulletin = () => {
    if (!state.eventAt || Date.now() - state.eventAt > 24000) return null;
    const lower = state.price < state.previousPrice;
    const same = state.price === state.previousPrice;
    return {
      headline: same ? 'HANDELSPAUSE VERLÄNGERT' : lower ? 'EIL: BIERPREIS ERNEUT ABGESTÜRZT' : 'EIL: BIERKURS ERHOLT SICH',
      text: same ? `Der Bierpreis bleibt bei ${fmt(state.price)} Euro. Axel Fridolin hat die neue Laufzeit bestätigt.`
        : lower ? `Handel kurz geöffnet – und direkt von ${fmt(state.previousPrice)} auf ${fmt(state.price)} Euro gefallen! Sarah ruft Johannes an. Axel Fridolin ruft die nächste Runde aus.`
        : `Kurze Erholung von ${fmt(state.previousPrice)} auf ${fmt(state.price)} Euro. Johannes atmet auf. Sarah hält die Cocktail-Schirmchen griffbereit. ${isOpen() ? 'Der Handel ist kurz geöffnet.' : 'Handel wieder ausgesetzt.'}`
    };
  };

  window.updateHappyHourStatus = () => {
    const beerVisible = getActiveMarket().name === 'Bier';
    const open = beerVisible && isOpen();
    const badge = document.querySelector('.halt-badge');
    badge.textContent = open ? '● HANDEL KURZ GEÖFFNET' : 'Ⅱ HANDEL AUSGESETZT';
    badge.classList.toggle('trading-open', open);
    const chart = document.querySelector('.crash-chart');
    chart.querySelector('text[font-size="19"]').textContent = open ? 'HANDEL GEÖFFNET' : 'HANDEL GESTOPPT';
    if (!open) chart.querySelector('.price-event').classList.remove('trading');
    document.querySelector('.halt-summary > span:first-child').textContent = open ? 'NEUER KURS' : 'BARPREIS FIXIERT';
    document.querySelector('.halt-summary > span:last-child').textContent = beerVisible && state.expiresAt
      ? `bis ${formatEnd()} Uhr` : 'bis zur Wiederaufnahme';
    const info = document.getElementById('rotation-info');
    info.classList.toggle('happy-hour-active', beerVisible && isPromotion());
    if (beerVisible && isPromotion()) info.textContent = `HAPPY HOUR · ${fmt(state.price)} € · ${state.expiresAt ? 'BIS ' : ''}${formatEnd().toUpperCase()}`;
    document.getElementById('happy-current').textContent = `Aktuell: ${fmt(state.price)} €${isPromotion() ? ` · ${formatEnd()}` : ' · Normalpreis'}`;
  };

  function applyToDisplay(focusBeer) {
    markets[0].price = state.price;
    drinks[0][2] = state.price;
    renderDrinks();
    document.querySelectorAll('[data-quote="0"]').forEach(quote => { quote.textContent = `${fmt(state.price)} €`; });
    setTickerSpeed();
    if (focusBeer) {
      rotationStarted = performance.now();
      marketPinnedUntil = Date.now() + 60000;
    }
    showMarket(focusBeer ? 0 : activeMarketIndex);
  }

  function setPrice(price, minutes) {
    state = { price, previousPrice: state.price, expiresAt: minutes > 0 ? Date.now() + minutes * 60000 : null, eventAt: Date.now() };
    feedback.textContent = '';
    save();
    applyToDisplay(true);
    if (!feedback.textContent) feedback.textContent = `Übernommen: ${fmt(price)} € · ${formatEnd()}.`;
  }

  function checkExpiry() {
    if (state.expiresAt !== null && Date.now() >= state.expiresAt) setPrice(2, 0);
    const phase = `${isOpen()}:${activeMarketIndex}`;
    if (phase !== lastPhase) {
      lastPhase = phase;
      window.updateHappyHourStatus();
    }
  }

  document.getElementById('happy-toggle').addEventListener('click', () => {
    checkExpiry();
    window.updateHappyHourStatus();
    if (isPromotion()) {
      priceInput.value = state.price.toFixed(2);
      minutesInput.value = state.expiresAt ? Math.max(1, Math.ceil((state.expiresAt - Date.now()) / 60000)) : 0;
    }
    dialog.showModal();
  });
  document.getElementById('happy-close').addEventListener('click', () => dialog.close());
  document.getElementById('happy-reset').addEventListener('click', () => setPrice(2, 0));
  document.getElementById('happy-form').addEventListener('submit', event => {
    event.preventDefault();
    const price = Number(priceInput.value.replace(',', '.'));
    const minutes = Number(minutesInput.value);
    if (!Number.isFinite(price) || price < 0 || price > 99 || !Number.isInteger(minutes) || minutes < 0 || minutes > 10080) {
      feedback.textContent = 'Bitte einen Preis von 0 bis 99 € und eine Laufzeit von 0 bis 10080 Minuten eingeben.';
      return;
    }
    setPrice(Math.round(price * 100) / 100, minutes);
  });
  document.addEventListener('visibilitychange', checkExpiry);
  if (state.expiresAt !== null && Date.now() >= state.expiresAt) {
    state = { price: 2, previousPrice: state.price, expiresAt: null, eventAt: Date.now() };
    save();
  }
  applyToDisplay(false);
  setInterval(checkExpiry, 500);
})();
