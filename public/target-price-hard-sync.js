(function () {
  var lastValue = null;
  var busy = false;

  function byId(id) {
    return document.getElementById(id);
  }

  function readPrice() {
    var input = byId('targetPrice');
    var range = byId('targetPriceRange');
    var value = input ? parseFloat(input.value) : NaN;
    if (!Number.isFinite(value) && range) value = parseFloat(range.value);
    return Number.isFinite(value) ? value : 23.6;
  }

  function writeVisiblePrice(price) {
    var text = Number(price).toFixed(2) + '억';
    var sumTargetPrice = byId('sumTargetPrice');
    if (sumTargetPrice) sumTargetPrice.textContent = text;

    var mirror = byId('targetPriceMirror');
    if (mirror) {
      mirror.textContent = '현재 관심 매물가: ' + text + ' · 이 금액 기준으로 핵심 결과와 시나리오 표를 다시 계산합니다.';
    }

    var purchaseNote = byId('cardPurchaseNote');
    if (purchaseNote && purchaseNote.textContent.indexOf('매매가') === 0) {
      purchaseNote.textContent = purchaseNote.textContent.replace(/^매매가\s+[\d.]+억/, '매매가 ' + Number(price).toFixed(2) + '억');
    }
  }

  function runSync(source) {
    if (busy) return;
    busy = true;

    var input = byId('targetPrice');
    var range = byId('targetPriceRange');
    if (!input || !range) {
      busy = false;
      return;
    }

    if (source === range) input.value = range.value;
    if (source === input) {
      var inputValue = parseFloat(input.value);
      if (Number.isFinite(inputValue)) {
        var min = parseFloat(range.min);
        var max = parseFloat(range.max);
        range.value = String(Math.max(min, Math.min(max, inputValue)));
      }
    }

    var price = readPrice();
    writeVisiblePrice(price);

    window.requestAnimationFrame(function () {
      try {
        if (typeof window.calculate === 'function') window.calculate();
        if (typeof window.renderScenarioRows === 'function') window.renderScenarioRows();
      } finally {
        writeVisiblePrice(price);
        window.setTimeout(function () {
          writeVisiblePrice(readPrice());
          busy = false;
        }, 0);
      }
    });
  }

  function bind() {
    var input = byId('targetPrice');
    var range = byId('targetPriceRange');
    if (!input || !range) {
      window.setTimeout(bind, 80);
      return;
    }

    if (document.documentElement.getAttribute('data-target-price-hard-sync') === '1') return;
    document.documentElement.setAttribute('data-target-price-hard-sync', '1');

    document.addEventListener('input', function (event) {
      if (event.target === input || event.target === range) runSync(event.target);
    }, true);

    document.addEventListener('change', function (event) {
      if (event.target === input || event.target === range) runSync(event.target);
    }, true);

    document.addEventListener('keyup', function (event) {
      if (event.target === input) runSync(input);
    }, true);

    lastValue = readPrice();
    runSync(null);

    window.setInterval(function () {
      var current = readPrice();
      var displayed = byId('sumTargetPrice');
      var expected = Number(current).toFixed(2) + '억';
      if (current !== lastValue || (displayed && displayed.textContent.trim() !== expected)) {
        lastValue = current;
        runSync(null);
      }
    }, 250);
  }

  bind();
})();
