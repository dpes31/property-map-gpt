(function () {
  function byId(id) { return document.getElementById(id); }
  function num(v, fallback) {
    var n = parseFloat(v);
    return Number.isFinite(n) ? n : (fallback || 0);
  }
  function fmt2(v) { return Number(v || 0).toFixed(2); }
  function eok(v) { return fmt2(v) + '억'; }
  function setText(id, text) {
    var el = byId(id);
    if (el) el.textContent = text;
  }
  function setHtml(id, html) {
    var el = byId(id);
    if (el) el.innerHTML = html;
  }
  function setMoney(id, value) { setText(id, eok(value)); }
  function resultHtml(diff, dark) {
    var ok = diff >= 0;
    var cls = ok ? (dark ? 'text-emerald-300' : 'text-emerald-700') : (dark ? 'text-rose-300' : 'text-rose-700');
    var label = ok ? '잔여 ' : '부족 ';
    return '<span class="' + cls + ' font-black">' + label + eok(Math.abs(diff)) + '</span>';
  }

  function targetPriceValue() {
    var input = byId('targetPrice');
    var range = byId('targetPriceRange');
    var value = input ? num(input.value, NaN) : NaN;
    if (!Number.isFinite(value) && range) value = num(range.value, 23.6);
    return Number.isFinite(value) ? value : 23.6;
  }

  function updateTargetPriceMirror() {
    var mirror = byId('targetPriceMirror');
    if (!mirror) return;
    mirror.textContent = '현재 관심 매물가: ' + fmt2(targetPriceValue()) + '억 · 이 금액 기준으로 핵심 결과와 시나리오 표를 다시 계산합니다.';
  }

  function forceResultSync() {
    if (typeof calcAt !== 'function') return;
    var price = targetPriceValue();
    var r = calcAt(price);

    // 비용 요약/상세 계산 결과: 관심 매물 매매가가 23.60억으로 잔류하지 않도록 직접 동기화.
    setMoney('sumTargetPrice', r.price);
    setMoney('sumLoanApplied', r.loan);
    if (typeof loanNote === 'function') setText('sumLoanTier', loanNote(r.price));
    setText('costBase', fmt2(r.basePriceNeed));
    setMoney('costAcq', r.acqTax);
    setMoney('costBroker', r.buyBroker);
    setMoney('costOther', r.otherCost + r.repairCost);
    setMoney('costTotal', r.purchaseCost);

    // 상세 계산 결과 PLAN A/B.
    setMoney('planAEquity', r.equityBeforeLoan);
    setMoney('planALoan', r.loan);
    setMoney('planATotal', r.planATotal);
    setMoney('planACost', r.purchaseCost);
    setHtml('planARemain', resultHtml(r.planARemain, true));
    setHtml('planAReserveResult', resultHtml(r.planAAfterReserve, true));

    setMoney('planBEquity', r.equityBeforeLoan);
    setMoney('planBDeposit', r.depositUse);
    setMoney('planBLoan', r.loan);
    setMoney('planBTotal', r.planBTotal);
    setMoney('planBCost', r.purchaseCost);
    setHtml('planBRemain', resultHtml(r.planBRemain, true));
    setHtml('planBReserveResult', resultHtml(r.planBAfterReserve, true));

    // 핵심 결과 카드.
    setMoney('cardPurchaseCost', r.purchaseCost);
    setMoney('cardLoan', r.loan);
    setHtml('cardPlanA', resultHtml(r.planAAfterReserve, false));
    setHtml('cardPlanB', resultHtml(r.planBAfterReserve, false));
    if (typeof findMaxPrice === 'function') setText('cardMaxA', fmt2(findMaxPrice('A')));
    var cardPurchaseNote = byId('cardPurchaseNote');
    if (cardPurchaseNote) cardPurchaseNote.textContent = '매매가 ' + fmt2(r.price) + '억 + 취득세·중개·기타비용';
    var cardLoanNote = byId('cardLoanNote');
    if (cardLoanNote && typeof loanNote === 'function') cardLoanNote.textContent = loanNote(r.price);

    // 상단 산출근거.
    setMoney('topCurrentCash', r.currentCash);
    setMoney('topNNet', r.nNet);
    setMoney('topUNet', r.uNet);
    setMoney('topStock', r.stock);
    setMoney('topEquity', r.equityBeforeLoan);
    setMoney('topEquityMirror', r.equityBeforeLoan);
    setMoney('topEquityForPlanB', r.equityBeforeLoan);
    setMoney('topDepositUse', r.depositUse);
    setMoney('topEquityAfterDeposit', r.equityBeforeLoan + r.depositUse);
    setMoney('topEquityAfterDepositMini', r.equityBeforeLoan + r.depositUse);

    updateTargetPriceMirror();
  }

  function safeCalculate() {
    window.requestAnimationFrame(function () {
      if (typeof calculate === 'function') calculate();
      forceResultSync();
      if (typeof renderScenarioRows === 'function') renderScenarioRows();
      forceResultSync();
    });
  }

  function findTaxCard() {
    var btn = document.querySelector('.taxPreset');
    return btn ? btn.closest('.rounded-2xl') : null;
  }

  function makeTextBlack(root) {
    if (!root) return;
    var colorClasses = [
      'text-rose-50','text-rose-100','text-rose-200','text-rose-300','text-rose-400','text-rose-500',
      'text-rose-600','text-rose-700','text-rose-800','text-rose-900','text-rose-950'
    ];
    [root].concat(Array.from(root.querySelectorAll('*'))).forEach(function (el) {
      colorClasses.forEach(function (cls) { el.classList.remove(cls); });
      if (el.tagName !== 'BUTTON') el.classList.add('text-slate-900');
    });
  }

  function observeTaxNoteColor() {
    var note = byId('taxScenarioNote');
    if (!note || note.getAttribute('data-black-text-bound') === '1') return;
    note.setAttribute('data-black-text-bound', '1');
    makeTextBlack(note);
    var observer = new MutationObserver(function () { makeTextBlack(note); });
    observer.observe(note, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  function removeStockPresetBox() {
    Array.from(document.querySelectorAll('.stockPreset')).forEach(function (button) {
      var box = button.closest('.rounded-2xl');
      if (box) box.remove();
    });
  }

  function setDefaultStockValue() {
    var input = byId('spouseStock');
    if (!input || input.getAttribute('data-final-stock-default') === '1') return;
    input.setAttribute('data-final-stock-default', '1');
    var current = parseFloat(input.value);
    if (!Number.isFinite(current) || Math.abs(current - 7.0) < 0.001) {
      input.value = '5.0';
      input.setAttribute('value', '5.0');
      safeCalculate();
    }
  }

  function bindStockInputRefresh() {
    var input = byId('spouseStock');
    if (!input || input.getAttribute('data-final-stock-bound') === '1') return;
    input.setAttribute('data-final-stock-bound', '1');
    ['input', 'change'].forEach(function (eventName) { input.addEventListener(eventName, safeCalculate); });
  }

  function findSectionByHeading(text) {
    return Array.from(document.querySelectorAll('section')).find(function (section) {
      var h2 = section.querySelector('h2');
      return h2 && (h2.textContent || '').trim() === text;
    });
  }

  function moveInterestSectionToTop() {
    var section = findSectionByHeading('관심 매물 조건');
    var main = document.querySelector('main');
    var header = main && main.querySelector('header');
    if (!section || !header || section.getAttribute('data-final-moved-top') === '1') return;

    header.insertAdjacentElement('afterend', section);
    section.setAttribute('data-final-moved-top', '1');

    var badge = section.querySelector('.w-8.h-8');
    if (badge) {
      badge.textContent = '입력';
      badge.className = 'w-10 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0';
    }

    var desc = section.querySelector('h2 + p');
    if (desc) desc.textContent = '이 값이 핵심 결과와 매매가 시나리오의 관심 매물가에 직접 반영됩니다.';

    var priceInput = byId('targetPrice');
    var priceBox = priceInput && priceInput.closest('.rounded-2xl');
    if (priceBox && !byId('targetPriceMirror')) {
      var mirror = document.createElement('div');
      mirror.id = 'targetPriceMirror';
      mirror.className = 'mt-3 rounded-xl bg-blue-50 border border-blue-100 px-3 py-2 text-xs font-bold text-blue-800';
      priceBox.appendChild(mirror);
    }
    updateTargetPriceMirror();
  }

  function syncPair(inputId, rangeId) {
    var input = byId(inputId);
    var range = byId(rangeId);
    if (!input || !range || input.getAttribute('data-final-pair-bound') === '1') return;
    input.setAttribute('data-final-pair-bound', '1');
    range.setAttribute('data-final-pair-bound', '1');

    input.addEventListener('input', function () {
      var value = parseFloat(input.value);
      if (Number.isFinite(value)) {
        var min = parseFloat(range.min || '0');
        var max = parseFloat(range.max || String(value));
        range.value = String(Math.max(min, Math.min(max, value)));
      }
      safeCalculate();
    });
    input.addEventListener('change', safeCalculate);

    range.addEventListener('input', function () {
      input.value = range.value;
      safeCalculate();
    });
    range.addEventListener('change', function () {
      input.value = range.value;
      safeCalculate();
    });
  }

  function bindAllControlRefresh() {
    syncPair('targetPrice', 'targetPriceRange');
    syncPair('tenantDeposit', 'tenantDepositRange');
    syncPair('tenantLoanFactor', 'tenantLoanFactorRange');

    var ids = [
      'currentCash','nSell','nJeonse','nCgt','uSell','uDeposit','uCgt','spouseStock',
      'taxMode','nAcq','uAcq','nExtraExpense','uExtraExpense','uTaxType','nDeductRate','uDeductRate',
      'loanMode','manualLoan','loanTierLow','loanTierMid','loanTierHigh','reserveCash',
      'currentDeposit','depositUse','areaType','repairCost','otherCost','targetPrice','targetPriceRange',
      'tenantDeposit','tenantDepositRange','tenantLoanFactor','tenantLoanFactorRange'
    ];

    ids.forEach(function (id) {
      var el = byId(id);
      if (!el || el.getAttribute('data-final-calc-bound') === '1') return;
      el.setAttribute('data-final-calc-bound', '1');
      ['input', 'change', 'keyup'].forEach(function (eventName) { el.addEventListener(eventName, safeCalculate); });
    });

    Array.from(document.querySelectorAll('input[name="propertyType"]')).forEach(function (el) {
      if (el.getAttribute('data-final-calc-bound') === '1') return;
      el.setAttribute('data-final-calc-bound', '1');
      el.addEventListener('change', safeCalculate);
    });
  }

  function makeTaxFormulaCollapsible() {
    var card = findTaxCard();
    if (!card || card.getAttribute('data-final-tax-collapse') === '1') return false;
    if (!byId('taxAutoPanel') || !byId('taxBreakdownWrap')) return false;

    var heading = Array.from(card.querySelectorAll('p')).find(function (p) {
      var text = (p.textContent || '').trim();
      return text === '예상 양도세' || text === '예상 양도세 산출 공식';
    });
    if (!heading) return false;

    var originalHeader = heading.closest('.flex') || heading.parentElement;

    var header = document.createElement('div');
    header.id = 'taxFormulaHeader';
    header.className = 'flex items-center justify-between gap-3';

    var title = document.createElement('p');
    title.className = 'font-black text-slate-950';
    title.textContent = '예상 양도세 산출 공식';

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'inline-flex items-center rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-black text-slate-800 hover:bg-slate-50 transition shrink-0';
    button.textContent = '계산 과정 열기 ▼';

    header.appendChild(title);
    header.appendChild(button);

    var body = document.createElement('div');
    body.id = 'taxFormulaCollapseBody';
    body.className = 'hidden mt-3';

    Array.from(card.children).forEach(function (child) {
      if (child === originalHeader) child.remove();
      else body.appendChild(child);
    });

    card.appendChild(header);
    card.appendChild(body);

    makeTextBlack(byId('taxScenarioNote'));
    observeTaxNoteColor();

    button.addEventListener('click', function () {
      var isHidden = body.classList.contains('hidden');
      body.classList.toggle('hidden', !isHidden);
      button.textContent = isHidden ? '계산 과정 닫기 ▲' : '계산 과정 열기 ▼';
    });

    card.setAttribute('data-final-tax-collapse', '1');
    return true;
  }

  function removeLegacyExpansionModule() {
    Array.from(document.querySelectorAll('section')).forEach(function (section) {
      var text = section.textContent || '';
      if (text.indexOf('후순위 확장 모듈') > -1 || text.indexOf('후순위 확장') > -1) section.remove();
    });
  }

  function applyFinalUiPatch() {
    removeLegacyExpansionModule();
    removeStockPresetBox();
    setDefaultStockValue();
    bindStockInputRefresh();
    moveInterestSectionToTop();
    bindAllControlRefresh();
    observeTaxNoteColor();
    var ok = makeTaxFormulaCollapsible();
    safeCalculate();
    if (!ok) window.setTimeout(applyFinalUiPatch, 120);
  }

  applyFinalUiPatch();
})();
