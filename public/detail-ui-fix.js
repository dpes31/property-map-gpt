(function () {
  'use strict';

  var OUTER_EOK_IDS = [
    'topEquity',
    'topEquityAfterDeposit',
    'topCurrentCash',
    'topNNet',
    'topUNet',
    'topStock',
    'topEquityMirror',
    'topEquityForPlanB',
    'topDepositUse',
    'topEquityAfterDepositMini',
    'cardPurchaseCost',
    'cardLoan',
    'cardMaxA'
  ];

  var scheduled = false;

  function byId(id) {
    return document.getElementById(id);
  }

  function numericText(value) {
    var match = String(value == null ? '' : value)
      .replace(/,/g, '')
      .match(/-?\d+(?:\.\d+)?/);
    return match ? match[0] : null;
  }

  function normalizeOuterUnitValues() {
    OUTER_EOK_IDS.forEach(function (id) {
      var el = byId(id);
      if (!el) return;
      var number = numericText(el.textContent);
      if (number == null) return;
      if (el.textContent.trim() !== number) el.textContent = number;
    });
  }

  function numberValue(id, fallback) {
    var el = byId(id);
    var value = el ? parseFloat(el.value) : NaN;
    return Number.isFinite(value) ? value : fallback;
  }

  function depositPresetValue(button, currentDeposit) {
    var raw = button.getAttribute('data-deposit');
    if (raw === 'max') return currentDeposit;
    if (raw === 'half') return currentDeposit / 2;
    var value = parseFloat(raw);
    return Number.isFinite(value) ? value : 0;
  }

  function setDepositButtonStyle(button, active) {
    button.className = active
      ? 'depositPreset rounded-xl border py-2 font-bold transition bg-emerald-600 text-white border-emerald-600 shadow-sm'
      : 'depositPreset rounded-xl border py-2 font-bold transition bg-white text-emerald-800 border-emerald-200';
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  }

  function updateDepositPresetStyles() {
    var currentDeposit = Math.max(0, numberValue('currentDeposit', 4.4));
    var depositUse = Math.max(0, Math.min(numberValue('depositUse', 0), currentDeposit));

    Array.prototype.forEach.call(document.querySelectorAll('.depositPreset'), function (button) {
      var preset = depositPresetValue(button, currentDeposit);
      setDepositButtonStyle(button, Math.abs(depositUse - preset) <= 0.051);
    });
  }

  function applyDepositPreset(button) {
    var currentDeposit = Math.max(0, numberValue('currentDeposit', 4.4));
    var value = Math.max(0, Math.min(depositPresetValue(button, currentDeposit), currentDeposit));
    var input = byId('depositUse');
    var range = byId('depositUseRange');

    if (input) input.value = value.toFixed(1);
    if (range) {
      range.max = String(currentDeposit);
      range.value = String(value);
    }

    if (typeof window.calculate === 'function') window.calculate();
  }

  function applyFixes() {
    scheduled = false;
    normalizeOuterUnitValues();
    updateDepositPresetStyles();
  }

  function scheduleFixes() {
    if (scheduled) return;
    scheduled = true;

    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(applyFixes);
    });

    window.setTimeout(applyFixes, 80);
  }

  function bind() {
    if (document.documentElement.getAttribute('data-detail-ui-fix') === '1') return;
    document.documentElement.setAttribute('data-detail-ui-fix', '1');

    document.addEventListener('click', function (event) {
      var target = event.target;
      var button = target && target.closest ? target.closest('.depositPreset') : null;
      if (!button) return;
      applyDepositPreset(button);
      scheduleFixes();
    }, false);

    document.addEventListener('input', function (event) {
      var target = event.target;
      if (!target) return;
      if (target.id === 'depositUseRange') {
        var input = byId('depositUse');
        if (input) input.value = target.value;
      }
      scheduleFixes();
    }, true);

    document.addEventListener('change', scheduleFixes, true);

    var observer = new MutationObserver(scheduleFixes);
    OUTER_EOK_IDS.forEach(function (id) {
      var el = byId(id);
      if (el) observer.observe(el, { childList: true, characterData: true, subtree: true });
    });

    applyFixes();
  }

  function boot() {
    if (!byId('depositUse') || !document.querySelector('.depositPreset')) {
      window.setTimeout(boot, 60);
      return;
    }
    bind();
  }

  boot();
})();
