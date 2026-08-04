(function () {
  'use strict';

  var renderQueued = false;

  function byId(id) { return document.getElementById(id); }
  function numberValue(id, fallback) {
    var el = byId(id);
    var n = el ? parseFloat(el.value) : NaN;
    return Number.isFinite(n) ? n : (fallback == null ? 0 : fallback);
  }
  function format(n, digits) { return Number(n || 0).toFixed(digits == null ? 2 : digits); }
  function money(n) { return format(n) + '억'; }
  function absMoney(n) { return format(Math.abs(n)) + '억'; }
  function setText(id, text) { var el = byId(id); if (el) el.textContent = text; }
  function setHtml(id, html) { var el = byId(id); if (el) el.innerHTML = html; }
  function setMoney(id, value) { setText(id, money(value)); }
  function setPlainNumber(id, value) { setText(id, format(value)); }

  function propertyType() {
    var checked = document.querySelector('input[name="propertyType"]:checked');
    return checked ? checked.value : 'vacant';
  }

  function brokerRate(price) {
    if (price < 0.5) return 0.006;
    if (price < 2) return 0.005;
    if (price < 9) return 0.004;
    if (price < 12) return 0.005;
    if (price < 15) return 0.006;
    return 0.007;
  }

  function brokerFeeAuthoritative(price) {
    return price * brokerRate(price) * 1.1;
  }

  function acquisitionTaxRate() {
    var areaType = byId('areaType');
    return areaType && areaType.value === 'over85' ? 0.035 : 0.033;
  }

  function autoLoanCap(price) {
    if (price <= 15) return numberValue('loanTierLow', 6.0);
    if (price <= 25) return numberValue('loanTierMid', 4.0);
    return numberValue('loanTierHigh', 2.0);
  }

  function loanForPrice(price) {
    var mode = byId('loanMode') ? byId('loanMode').value : 'auto';
    if (mode === 'zero') return 0;
    if (mode === 'manual') return Math.max(0, numberValue('manualLoan', 0));

    var loan = autoLoanCap(price);
    if (propertyType() === 'tenant') {
      loan *= Math.max(0, Math.min(100, numberValue('tenantLoanFactor', 100))) / 100;
    }
    return Math.max(0, loan);
  }

  function loanNoteAuthoritative(price) {
    var mode = byId('loanMode') ? byId('loanMode').value : 'auto';
    if (mode === 'zero') return '대출 미반영';
    if (mode === 'manual') return '직접 입력값 반영';
    var base = price <= 15 ? '15억 이하 구간' : (price <= 25 ? '15억 초과~25억 이하 구간' : '25억 초과 구간');
    if (propertyType() === 'tenant') {
      return base + ' · 승계 매물 반영률 ' + format(numberValue('tenantLoanFactor', 100), 0) + '%';
    }
    return base;
  }

  function currentTargetPrice() {
    var input = byId('targetPrice');
    var range = byId('targetPriceRange');
    var value = input ? parseFloat(input.value) : NaN;
    if (!Number.isFinite(value) && range) value = parseFloat(range.value);
    return Number.isFinite(value) ? value : 23.6;
  }

  function calcAtAuthoritative(price) {
    price = Math.max(0, Number(price) || 0);
    var type = propertyType();
    var tenantDeposit = type === 'tenant' ? Math.min(Math.max(0, numberValue('tenantDeposit', 0)), price) : 0;
    var loan = loanForPrice(price);

    var currentCash = numberValue('currentCash', 0);
    var nSell = numberValue('nSell', 0);
    var nJeonse = numberValue('nJeonse', 0);
    var nCgt = numberValue('nCgt', 0);
    var uSell = numberValue('uSell', 0);
    var uDeposit = numberValue('uDeposit', 0);
    var uCgt = numberValue('uCgt', 0);
    var stock = numberValue('spouseStock', 0);

    var nBroker = brokerFeeAuthoritative(nSell);
    var uBroker = brokerFeeAuthoritative(uSell);
    var nNet = nSell - nJeonse - nBroker - nCgt;
    var uNet = uSell - uDeposit - uBroker - uCgt;
    var equityBeforeLoan = currentCash + nNet + uNet + stock;

    var acqTax = price * acquisitionTaxRate();
    var buyBroker = brokerFeeAuthoritative(price);
    var otherCost = numberValue('otherCost', 0);
    var repairCost = numberValue('repairCost', 0);
    var basePriceNeed = price - tenantDeposit;
    var purchaseCost = basePriceNeed + acqTax + buyBroker + otherCost + repairCost;

    var currentDeposit = Math.max(0, numberValue('currentDeposit', 4.4));
    var depositUse = Math.max(0, Math.min(numberValue('depositUse', 0), currentDeposit));
    var reserveCash = Math.max(0, numberValue('reserveCash', 0));

    var planATotal = equityBeforeLoan + loan;
    var planBTotal = equityBeforeLoan + loan + depositUse;
    var planARemain = planATotal - purchaseCost;
    var planBRemain = planBTotal - purchaseCost;
    var planAAfterReserve = planARemain - reserveCash;
    var planBAfterReserve = planBRemain - reserveCash;

    return {
      price: price,
      propertyType: type,
      tenantDeposit: tenantDeposit,
      loan: loan,
      currentCash: currentCash,
      nSell: nSell,
      nJeonse: nJeonse,
      nCgt: nCgt,
      uSell: uSell,
      uDeposit: uDeposit,
      uCgt: uCgt,
      stock: stock,
      nBroker: nBroker,
      uBroker: uBroker,
      nNet: nNet,
      uNet: uNet,
      equityBeforeLoan: equityBeforeLoan,
      acqTax: acqTax,
      buyBroker: buyBroker,
      otherCost: otherCost,
      repairCost: repairCost,
      basePriceNeed: basePriceNeed,
      purchaseCost: purchaseCost,
      depositUse: depositUse,
      reserveCash: reserveCash,
      planATotal: planATotal,
      planBTotal: planBTotal,
      planARemain: planARemain,
      planBRemain: planBRemain,
      planAAfterReserve: planAAfterReserve,
      planBAfterReserve: planBAfterReserve
    };
  }

  function resultHtml(diff, dark) {
    var positive = diff >= 0;
    var cls = positive ? (dark ? 'text-emerald-300' : 'text-emerald-700') : (dark ? 'text-rose-300' : 'text-rose-700');
    return '<span class="' + cls + ' font-black">' + (positive ? '잔여 ' : '부족 ') + absMoney(diff) + '</span>';
  }

  function judgementAuthoritative(diff) {
    if (diff >= 1) return { label: '가능권', cls: 'bg-emerald-100 text-emerald-800' };
    if (diff >= 0) return { label: '여유 부족', cls: 'bg-amber-100 text-amber-800' };
    return { label: '부족', cls: 'bg-rose-100 text-rose-800' };
  }

  function setStatus(id, status, top) {
    var el = byId(id);
    if (!el) return;
    el.textContent = status.label;
    el.className = (top ? 'inline-flex px-2.5 py-1 rounded-full text-[11px] font-black ' : 'inline-flex shrink-0 px-3 py-1 rounded-full text-xs font-black ') + status.cls;
  }

  function findPriceForDiffAuthoritative(plan, targetDiff) {
    var lo = 0;
    var hi = 60;
    for (var i = 0; i < 80; i += 1) {
      var mid = (lo + hi) / 2;
      var r = calcAtAuthoritative(mid);
      var diff = plan === 'B' ? r.planBAfterReserve : r.planAAfterReserve;
      if (diff >= targetDiff) lo = mid;
      else hi = mid;
    }
    return lo;
  }

  function scenarioNameCellAuthoritative(name) {
    var cls = name === '관심 매물가' ? 'text-blue-700' : 'text-slate-700';
    return '<span class="font-black text-sm md:text-base ' + cls + '">' + name + '</span>';
  }

  function scenarioPlanCellAuthoritative(total, cost, diff) {
    var ok = diff >= 0;
    var cls = ok ? 'text-emerald-700' : 'text-rose-700';
    return '<div class="text-center leading-snug py-0.5">' +
      '<p class="text-[11px] text-slate-500 font-bold">총 조달액</p>' +
      '<p class="text-xs md:text-sm font-black text-slate-800">' + money(total) + '</p>' +
      '<p class="mt-2 text-[11px] text-slate-500 font-bold">매수 총비용</p>' +
      '<p class="text-xs md:text-sm font-black text-slate-800">' + money(cost) + '</p>' +
      '<p class="mt-1.5 text-sm md:text-base font-black ' + cls + '">' + (ok ? '매매 가능' : '매매 불가') + '</p>' +
      '<p class="mt-1.5 text-base md:text-lg font-black ' + cls + '">' + (ok ? '잔여 ' + absMoney(diff) : absMoney(diff) + ' 부족') + '</p>' +
      '</div>';
  }

  function renderScenarioRowsAuthoritative() {
    var target = currentTargetPrice();
    var maxA = findPriceForDiffAuthoritative('A', 0);
    var maxB = findPriceForDiffAuthoritative('B', 0);
    var current = calcAtAuthoritative(target);

    var aHeader = byId('scenarioPlanAHeader');
    var bHeader = byId('scenarioPlanBHeader');
    if (aHeader) aHeader.innerHTML = '<span class="block">플랜 A(만기 전)</span><span class="block text-xs font-bold text-slate-500">현재 조달액 ' + money(current.planATotal) + '</span>';
    if (bHeader) bHeader.innerHTML = '<span class="block">플랜 B(만기 후)</span><span class="block text-xs font-bold text-slate-500">현재 조달액 ' + money(current.planBTotal) + '</span>';

    var rows = byId('scenarioRows');
    if (!rows) return;
    var scenarios = [
      { name: '플랜 A 최대 매매가', price: maxA },
      { name: '관심 매물가', price: target },
      { name: '플랜 B 최대 매매가', price: maxB }
    ];

    rows.innerHTML = scenarios.map(function (scenario) {
      var r = calcAtAuthoritative(scenario.price);
      return '<tr>' +
        '<td class="py-3.5 px-2 text-center align-middle">' + scenarioNameCellAuthoritative(scenario.name) + '</td>' +
        '<td class="py-3.5 px-2 text-center font-black text-base num align-middle">' + money(scenario.price) + '</td>' +
        '<td class="py-3.5 px-2 text-center text-base num align-middle">' + money(r.loan) + '</td>' +
        '<td class="py-3.5 px-2 align-middle border-l border-slate-200">' + scenarioPlanCellAuthoritative(r.planATotal, r.purchaseCost, r.planAAfterReserve) + '</td>' +
        '<td class="py-3.5 px-2 align-middle border-l border-slate-200">' + scenarioPlanCellAuthoritative(r.planBTotal, r.purchaseCost, r.planBAfterReserve) + '</td>' +
        '</tr>';
    }).join('');
  }

  function syncControlPairs() {
    var targetInput = byId('targetPrice');
    var targetRange = byId('targetPriceRange');
    if (targetInput && targetRange) {
      var p = parseFloat(targetInput.value);
      if (Number.isFinite(p)) targetRange.value = String(Math.max(parseFloat(targetRange.min), Math.min(parseFloat(targetRange.max), p)));
    }

    var currentDeposit = Math.max(0, numberValue('currentDeposit', 4.4));
    var depositUse = Math.max(0, Math.min(numberValue('depositUse', 0), currentDeposit));
    var depositInput = byId('depositUse');
    var depositRange = byId('depositUseRange');
    if (depositInput) depositInput.value = format(depositUse, 1);
    if (depositRange) {
      depositRange.max = String(currentDeposit);
      depositRange.value = String(depositUse);
    }
  }

  function renderAuthoritative() {
    renderQueued = false;
    syncControlPairs();

    var price = currentTargetPrice();
    var r = calcAtAuthoritative(price);
    var maxA = findPriceForDiffAuthoritative('A', 0);
    var maxB = findPriceForDiffAuthoritative('B', 0);

    var tenantBox = byId('tenantBox');
    if (tenantBox) tenantBox.classList.toggle('hidden', r.propertyType !== 'tenant');
    var manualBox = byId('manualLoanBox');
    if (manualBox) manualBox.classList.toggle('hidden', !(byId('loanMode') && byId('loanMode').value === 'manual'));

    setPlainNumber('topCurrentCash', r.currentCash);
    setPlainNumber('topNNet', r.nNet);
    setPlainNumber('topUNet', r.uNet);
    setPlainNumber('topStock', r.stock);
    setPlainNumber('topEquity', r.equityBeforeLoan);
    setPlainNumber('topEquityMirror', r.equityBeforeLoan);
    setPlainNumber('topEquityForPlanB', r.equityBeforeLoan);
    setPlainNumber('topDepositUse', r.depositUse);
    setPlainNumber('topEquityAfterDeposit', r.equityBeforeLoan + r.depositUse);
    setPlainNumber('topEquityAfterDepositMini', r.equityBeforeLoan + r.depositUse);
    setText('topNNetLabel', '녹번 세후 순유입(' + format(r.nSell) + '억 기준)');
    setText('topUNetLabel', '의정부 세후 순유입(' + format(r.uSell) + '억 기준)');

    setText('cardPurchaseCost', format(r.purchaseCost));
    setText('cardPurchaseNote', r.propertyType === 'tenant'
      ? '매매가 ' + format(r.price) + '억 - 승계보증금 ' + format(r.tenantDeposit) + '억 + 부대비용'
      : '매매가 ' + format(r.price) + '억 + 취득세·중개·기타비용');
    setText('cardLoan', format(r.loan));
    setText('cardLoanNote', loanNoteAuthoritative(price));
    setHtml('cardPlanA', resultHtml(r.planAAfterReserve, false));
    setHtml('cardPlanB', resultHtml(r.planBAfterReserve, false));
    setText('cardMaxA', format(maxA));

    setMoney('tdNSell', r.nSell);
    setText('tdNDeposit', '-' + money(Math.abs(r.nJeonse)));
    setText('tdNBroker', '-' + money(Math.abs(r.nBroker)));
    setText('tdNCgt', '-' + money(Math.abs(r.nCgt)));
    setMoney('tdNNet', r.nNet);
    setMoney('tdUSell', r.uSell);
    setText('tdUDeposit', '-' + money(Math.abs(r.uDeposit)));
    setText('tdUBroker', '-' + money(Math.abs(r.uBroker)));
    setText('tdUCgt', '-' + money(Math.abs(r.uCgt)));
    setMoney('tdUNet', r.uNet);

    setMoney('sumCurrentCash', r.currentCash);
    setMoney('sumNNet', r.nNet);
    setMoney('sumUNet', r.uNet);
    setMoney('sumStock', r.stock);
    setMoney('sumEquity', r.equityBeforeLoan);
    setText('sumNNetLabel', '녹번 세후 순유입(' + format(r.nSell) + '억 기준)');
    setText('sumUNetLabel', '의정부 세후 순유입(' + format(r.uSell) + '억 기준)');

    setMoney('costBase', r.basePriceNeed);
    setMoney('costAcq', r.acqTax);
    setMoney('costBroker', r.buyBroker);
    setMoney('costOther', r.otherCost + r.repairCost);
    setMoney('costTotal', r.purchaseCost);

    setMoney('sumTargetPrice', r.price);
    setMoney('sumLoanApplied', r.loan);
    setText('sumLoanTier', loanNoteAuthoritative(r.price));

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

    var ja = judgementAuthoritative(r.planAAfterReserve);
    var jb = judgementAuthoritative(r.planBAfterReserve);
    setStatus('planAStatus', ja, false);
    setStatus('planBStatus', jb, false);
    setStatus('topPlanAStatus', ja, true);
    setStatus('topPlanBStatus', jb, true);

    var mirror = byId('targetPriceMirror');
    if (mirror) mirror.textContent = '현재 관심 매물가: ' + money(r.price) + ' · 이 금액 기준으로 핵심 결과와 시나리오 표를 다시 계산합니다.';

    renderScenarioRowsAuthoritative();

    var interpretation = byId('interpretation');
    if (interpretation) {
      interpretation.innerHTML = '<p>현재 매물 <strong>' + money(r.price) + '</strong> 기준 총 필요자금은 <strong>' + money(r.purchaseCost) + '</strong>입니다.</p>' +
        '<p>플랜 A는 최소 현금 차감 후 <strong>' + (r.planAAfterReserve >= 0 ? '잔여 ' : '부족 ') + absMoney(r.planAAfterReserve) + '</strong>, 플랜 B는 동탄 보증금 사용액 ' + money(r.depositUse) + ' 반영 후 <strong>' + (r.planBAfterReserve >= 0 ? '잔여 ' : '부족 ') + absMoney(r.planBAfterReserve) + '</strong>입니다.</p>' +
        '<p>현재 조건의 산술상 최대 매매가는 플랜 A 약 <strong>' + money(maxA) + '</strong>, 플랜 B 약 <strong>' + money(maxB) + '</strong>입니다.</p>';
    }
  }

  function queueRender() {
    if (renderQueued) return;
    renderQueued = true;
    window.setTimeout(renderAuthoritative, 0);
  }

  function bind() {
    if (document.documentElement.getAttribute('data-authoritative-budget-sync') === '1') return;
    document.documentElement.setAttribute('data-authoritative-budget-sync', '1');

    window.calcAt = calcAtAuthoritative;
    window.calculate = renderAuthoritative;
    window.findMaxPrice = function (plan) { return findPriceForDiffAuthoritative(plan, 0); };
    window.findPriceForDiff = findPriceForDiffAuthoritative;
    window.renderScenarioRows = renderScenarioRowsAuthoritative;
    window.getLoan = loanForPrice;

    document.addEventListener('input', function (event) {
      var target = event.target;
      if (!target) return;
      if (target.id === 'targetPriceRange') {
        var priceInput = byId('targetPrice');
        if (priceInput) priceInput.value = target.value;
      } else if (target.id === 'depositUseRange') {
        var depositInput = byId('depositUse');
        if (depositInput) depositInput.value = target.value;
      } else if (target.id === 'tenantDepositRange') {
        var tenantInput = byId('tenantDeposit');
        if (tenantInput) tenantInput.value = target.value;
      } else if (target.id === 'tenantLoanFactorRange') {
        var factorInput = byId('tenantLoanFactor');
        if (factorInput) factorInput.value = target.value;
      }
      queueRender();
    }, true);

    document.addEventListener('change', queueRender, true);
    document.addEventListener('click', function (event) {
      var target = event.target;
      if (target && (target.classList.contains('depositPreset') || target.classList.contains('taxPreset') || target.classList.contains('stockPreset'))) {
        window.setTimeout(renderAuthoritative, 0);
      }
    }, false);

    renderAuthoritative();
  }

  function boot() {
    if (!byId('targetPrice') || !byId('sumTargetPrice')) {
      window.setTimeout(boot, 50);
      return;
    }
    bind();
  }

  boot();
})();
