(function () {
  function applyScenarioPatch() {
    if (typeof calcAt !== 'function' || typeof findMaxPrice !== 'function' || typeof val !== 'function' || typeof fmt !== 'function') {
      window.setTimeout(applyScenarioPatch, 50);
      return;
    }

    window.scenarioPlanCell = function scenarioPlanCell(total, cost, diff) {
      var ok = diff >= 0;
      var statusCls = ok ? 'text-emerald-700' : 'text-rose-700';
      var main = ok ? '매매 가능' : '매매 불가';
      var sub = ok ? '잔여 ' + fmt(diff) + '억' : fmt(Math.abs(diff)) + '억 부족';
      return '' +
        '<div class="text-center leading-snug py-0.5">' +
        '<p class="text-[11px] text-slate-500 font-bold">총 조달액</p>' +
        '<p class="text-xs md:text-sm font-black text-slate-800">' + fmt(total) + '억</p>' +
        '<p class="mt-2 text-[11px] text-slate-500 font-bold">매수 총비용</p>' +
        '<p class="text-xs md:text-sm font-black text-slate-800">' + fmt(cost) + '억</p>' +
        '<p class="mt-1.5 text-sm md:text-base font-black ' + statusCls + '">' + main + '</p>' +
        '<p class="mt-1.5 text-base md:text-lg font-black ' + statusCls + '">' + sub + '</p>' +
        '</div>';
    };

    window.renderScenarioRows = function renderScenarioRows() {
      var target = val('targetPrice', 23.6);
      var maxA = findMaxPrice('A');
      var maxB = findMaxPrice('B');
      var planAHeader = document.getElementById('scenarioPlanAHeader');
      var planBHeader = document.getElementById('scenarioPlanBHeader');
      var rows = document.getElementById('scenarioRows');

      if (planAHeader) {
        planAHeader.innerHTML = '<span class="block">플랜 A(만기 전)</span><span class="block text-xs font-bold text-slate-500">해당 매매가별 조달액</span>';
      }
      if (planBHeader) {
        planBHeader.innerHTML = '<span class="block">플랜 B(만기 후)</span><span class="block text-xs font-bold text-slate-500">해당 매매가별 조달액</span>';
      }

      var scenarios = [
        { name: '플랜 A 최대 매매가', price: maxA },
        { name: '관심 매물가', price: target },
        { name: '플랜 B 최대 매매가', price: maxB }
      ];

      if (rows) {
        rows.innerHTML = scenarios.map(function (scenario) {
          var p = Math.max(0, scenario.price);
          var r = calcAt(p);
          return '' +
            '<tr>' +
            '<td class="py-3.5 px-2 text-center align-middle">' + scenarioNameCell(scenario.name) + '</td>' +
            '<td class="py-3.5 px-2 text-center font-black text-base num align-middle">' + fmt(p) + '억</td>' +
            '<td class="py-3.5 px-2 text-center text-base num align-middle">' + fmt(r.loan) + '억</td>' +
            '<td class="py-3.5 px-2 align-middle border-l border-slate-200">' + scenarioPlanCell(r.planATotal, r.purchaseCost, r.planAAfterReserve) + '</td>' +
            '<td class="py-3.5 px-2 align-middle border-l border-slate-200">' + scenarioPlanCell(r.planBTotal, r.purchaseCost, r.planBAfterReserve) + '</td>' +
            '</tr>';
        }).join('');
      }

      var table = rows && rows.closest('table');
      if (table && !document.getElementById('scenarioLoanNote')) {
        var note = document.createElement('p');
        note.id = 'scenarioLoanNote';
        note.className = 'mt-3 text-xs text-slate-500 leading-relaxed';
        note.textContent = '※ 시나리오별 총 조달액은 해당 매매가에서 다시 계산합니다. 자동 대출 기준에서는 25억 초과 시 ‘25억 초과 한도’가 적용되므로, 관심 매물가에서 4억 대출이 가능하더라도 플랜 B 최대 매매가가 25억을 넘으면 설정된 초과 구간 한도에 따라 조달액이 달라질 수 있습니다.';
        table.parentElement.insertAdjacentElement('afterend', note);
      }
    };

    if (typeof calculate === 'function') calculate();
  }

  applyScenarioPatch();
})();

(function () {
  var state = {
    mode: 'auto',
    scenario: 'standard',
    ready: false
  };

  var scenarioConfig = {
    optimistic: {
      label: '낙관',
      nDeductRate: 40,
      uTaxType: 'taxfree',
      uDeductRate: 10,
      nAcq: 4.95,
      uAcq: 3.00,
      nExtraExpense: 0,
      uExtraExpense: 0
    },
    standard: {
      label: '표준',
      nDeductRate: 35,
      uTaxType: 'general',
      uDeductRate: 10,
      nAcq: 4.95,
      uAcq: 3.00,
      nExtraExpense: 0,
      uExtraExpense: 0
    },
    conservative: {
      label: '보수',
      nDeductRate: 25,
      uTaxType: 'general',
      uDeductRate: 0,
      nAcq: 4.80,
      uAcq: 2.90,
      nExtraExpense: 0,
      uExtraExpense: 0
    }
  };

  function byId(id) { return document.getElementById(id); }
  function numberValue(id, fallback) {
    var el = byId(id);
    if (!el) return fallback;
    var n = parseFloat(el.value);
    return Number.isFinite(n) ? n : fallback;
  }
  function setValue(id, value, digits) {
    var el = byId(id);
    if (!el) return;
    el.value = Number(value || 0).toFixed(digits == null ? 2 : digits);
  }
  function formatAmount(n) { return Number(n || 0).toFixed(2) + '억'; }
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  function getRateAndDeduction(taxBase) {
    if (taxBase <= 0.14) return { rate: 0.06, deduction: 0 };
    if (taxBase <= 0.50) return { rate: 0.15, deduction: 0.0126 };
    if (taxBase <= 0.88) return { rate: 0.24, deduction: 0.0576 };
    if (taxBase <= 1.50) return { rate: 0.35, deduction: 0.1544 };
    if (taxBase <= 3.00) return { rate: 0.38, deduction: 0.1994 };
    if (taxBase <= 5.00) return { rate: 0.40, deduction: 0.2594 };
    if (taxBase <= 10.00) return { rate: 0.42, deduction: 0.3594 };
    return { rate: 0.45, deduction: 0.6594 };
  }

  function calcProgressiveTax(taxBase) {
    taxBase = Math.max(0, taxBase || 0);
    if (taxBase <= 0) return 0;
    var rule = getRateAndDeduction(taxBase);
    var nationalTax = Math.max(0, taxBase * rule.rate - rule.deduction);
    var localTax = nationalTax * 0.1;
    return nationalTax + localTax;
  }

  function calcHighPriceOneHouseTax(opts) {
    var sell = Math.max(0, opts.sell || 0);
    if (sell <= 12) return 0;
    var gain = Math.max(0, sell - (opts.acq || 0) - (opts.extraExpense || 0) - brokerFee(sell));
    if (gain <= 0) return 0;
    var taxableRatio = Math.max(0, (sell - 12) / sell);
    var taxableGain = gain * taxableRatio;
    var deduction = taxableGain * clamp((opts.deductRate || 0) / 100, 0, 0.8);
    var taxBase = Math.max(0, taxableGain - deduction - 0.025);
    return calcProgressiveTax(taxBase);
  }

  function calcGeneralTax(opts) {
    if (opts.taxType === 'taxfree') return 0;
    var sell = Math.max(0, opts.sell || 0);
    var gain = Math.max(0, sell - (opts.acq || 0) - (opts.extraExpense || 0) - brokerFee(sell));
    if (gain <= 0) return 0;
    var deduction = gain * clamp((opts.deductRate || 0) / 100, 0, 0.3);
    var taxBase = Math.max(0, gain - deduction - 0.025);
    return calcProgressiveTax(taxBase);
  }

  function currentParams() {
    return {
      nAcq: numberValue('nAcq', scenarioConfig[state.scenario].nAcq),
      uAcq: numberValue('uAcq', scenarioConfig[state.scenario].uAcq),
      nExtraExpense: numberValue('nExtraExpense', 0),
      uExtraExpense: numberValue('uExtraExpense', 0),
      nDeductRate: numberValue('nDeductRate', scenarioConfig[state.scenario].nDeductRate),
      uDeductRate: numberValue('uDeductRate', scenarioConfig[state.scenario].uDeductRate),
      uTaxType: byId('uTaxType') ? byId('uTaxType').value : scenarioConfig[state.scenario].uTaxType
    };
  }

  function estimateTaxes() {
    var p = currentParams();
    var nTax = calcHighPriceOneHouseTax({
      sell: numberValue('nSell', 15),
      acq: p.nAcq,
      extraExpense: p.nExtraExpense,
      deductRate: p.nDeductRate
    });
    var uTax = calcGeneralTax({
      sell: numberValue('uSell', 4),
      acq: p.uAcq,
      extraExpense: p.uExtraExpense,
      deductRate: p.uDeductRate,
      taxType: p.uTaxType
    });
    return { nTax: nTax, uTax: uTax, total: nTax + uTax, params: p };
  }

  function applyAutoTaxInputs() {
    if (state.mode !== 'auto') return;
    var taxes = estimateTaxes();
    setValue('nCgt', taxes.nTax, 2);
    setValue('uCgt', taxes.uTax, 2);
  }

  function setTaxInputsMode() {
    var auto = state.mode === 'auto';
    ['nCgt', 'uCgt'].forEach(function (id) {
      var el = byId(id);
      if (!el) return;
      el.readOnly = auto;
      el.classList.toggle('bg-slate-100', auto);
      el.classList.toggle('cursor-not-allowed', auto);
    });
  }

  function updateScenarioButtonLabels() {
    var currentScenario = state.scenario;
    ['optimistic', 'standard', 'conservative'].forEach(function (key) {
      state.scenario = key;
      var taxes = estimateTaxes();
      var btn = document.querySelector('.taxPreset[data-tax-scenario="' + key + '"]');
      if (btn) btn.textContent = scenarioConfig[key].label + ' ' + formatAmount(taxes.total);
    });
    state.scenario = currentScenario;
  }

  function styleScenarioButtons() {
    document.querySelectorAll('.taxPreset').forEach(function (btn) {
      var active = btn.getAttribute('data-tax-scenario') === state.scenario && state.mode === 'auto';
      btn.className = active
        ? 'taxPreset rounded-xl border py-2 font-bold transition bg-rose-600 text-white border-rose-600 shadow-sm'
        : 'taxPreset rounded-xl border py-2 font-bold transition bg-white text-rose-800 border-rose-200';
    });
  }

  function renderTaxNote() {
    var note = byId('taxScenarioNote');
    if (!note) return;
    if (state.mode !== 'auto') {
      note.innerHTML = '<p><strong>직접 입력 기준</strong></p><p>· 현재 입력된 예상 양도세·지방세 금액을 그대로 차감합니다.</p>';
      return;
    }
    var taxes = estimateTaxes();
    var cfg = scenarioConfig[state.scenario];
    var uText = taxes.params.uTaxType === 'taxfree' ? '비과세 0원' : '일반과세';
    note.innerHTML = '' +
      '<p><strong>' + cfg.label + ' 자동 산출 기준</strong> · 합계 ' + formatAmount(taxes.total) + '</p>' +
      '<p>· 녹번: 1세대1주택 고가주택 가정, 12억 초과분 과세, 장특공제율 ' + taxes.params.nDeductRate + '%.</p>' +
      '<p>· 의정부: ' + uText + ', 장특공제율 ' + taxes.params.uDeductRate + '%.</p>' +
      '<p class="text-rose-600">※ 매도가 변경 시 예상세액을 다시 계산합니다. 세무 신고용 확정 계산은 아닙니다.</p>';
  }

  function refreshTaxUi() {
    updateScenarioButtonLabels();
    styleScenarioButtons();
    renderTaxNote();
    setTaxInputsMode();
  }

  function runFullRecalc() {
    applyAutoTaxInputs();
    if (typeof calculate === 'function') calculate();
    refreshTaxUi();
  }

  function addTaxControlPanel() {
    if (byId('taxAutoPanel')) return;
    var buttons = document.querySelectorAll('.taxPreset');
    if (!buttons.length) return;

    buttons.forEach(function (btn, index) {
      var scenario = index === 0 ? 'optimistic' : index === 1 ? 'standard' : 'conservative';
      var clone = btn.cloneNode(true);
      clone.setAttribute('data-tax-scenario', scenario);
      clone.removeAttribute('data-ncgt');
      clone.removeAttribute('data-ucgt');
      clone.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        state.mode = 'auto';
        state.scenario = scenario;
        var mode = byId('taxMode');
        if (mode) mode.value = 'auto';
        var cfg = scenarioConfig[scenario];
        setValue('nAcq', cfg.nAcq, 2);
        setValue('uAcq', cfg.uAcq, 2);
        setValue('nExtraExpense', cfg.nExtraExpense, 2);
        setValue('uExtraExpense', cfg.uExtraExpense, 2);
        setValue('nDeductRate', cfg.nDeductRate, 0);
        setValue('uDeductRate', cfg.uDeductRate, 0);
        if (byId('uTaxType')) byId('uTaxType').value = cfg.uTaxType;
        runFullRecalc();
      }, true);
      btn.parentNode.replaceChild(clone, btn);
    });

    var container = document.querySelector('.taxPreset') && document.querySelector('.taxPreset').closest('.rounded-2xl');
    if (!container) return;
    var panel = document.createElement('div');
    panel.id = 'taxAutoPanel';
    panel.className = 'mt-3 rounded-2xl bg-white border border-rose-100 p-3';
    panel.innerHTML = '' +
      '<div class="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">' +
      '<label class="font-bold text-slate-600">예상세액 방식<select id="taxMode" class="mt-1 w-full rounded-xl border border-slate-200 px-2 py-2 bg-white font-black"><option value="auto" selected>매도가 연동 자동계산</option><option value="manual">직접 입력</option></select></label>' +
      '<label class="font-bold text-slate-600">녹번 취득가<input id="nAcq" type="number" value="4.95" step="0.01" class="mt-1 w-full rounded-xl border border-slate-200 px-2 py-2 text-right font-black num" /></label>' +
      '<label class="font-bold text-slate-600">의정부 취득가<input id="uAcq" type="number" value="3.00" step="0.01" class="mt-1 w-full rounded-xl border border-slate-200 px-2 py-2 text-right font-black num" /></label>' +
      '<label class="font-bold text-slate-600">녹번 추가 필요경비<input id="nExtraExpense" type="number" value="0.00" step="0.01" class="mt-1 w-full rounded-xl border border-slate-200 px-2 py-2 text-right font-black num" /></label>' +
      '<label class="font-bold text-slate-600">의정부 추가 필요경비<input id="uExtraExpense" type="number" value="0.00" step="0.01" class="mt-1 w-full rounded-xl border border-slate-200 px-2 py-2 text-right font-black num" /></label>' +
      '<label class="font-bold text-slate-600">의정부 과세유형<select id="uTaxType" class="mt-1 w-full rounded-xl border border-slate-200 px-2 py-2 bg-white font-black"><option value="general" selected>일반과세</option><option value="taxfree">비과세</option></select></label>' +
      '<label class="font-bold text-slate-600">녹번 장특공제율<input id="nDeductRate" type="number" value="35" step="1" class="mt-1 w-full rounded-xl border border-slate-200 px-2 py-2 text-right font-black num" /></label>' +
      '<label class="font-bold text-slate-600">의정부 장특공제율<input id="uDeductRate" type="number" value="10" step="1" class="mt-1 w-full rounded-xl border border-slate-200 px-2 py-2 text-right font-black num" /></label>' +
      '</div>' +
      '<p class="mt-2 text-[11px] text-rose-700 leading-relaxed">계산식: 양도차익 = 매도가 - 취득가 - 매도중개보수 - 추가 필요경비 → 장특공제 → 기본공제 250만원 → 누진세율 → 지방소득세 10%.</p>';
    container.appendChild(panel);
  }

  function bindTaxEvents() {
    var taxInputs = ['nSell', 'uSell', 'nAcq', 'uAcq', 'nExtraExpense', 'uExtraExpense', 'nDeductRate', 'uDeductRate', 'uTaxType'];
    taxInputs.forEach(function (id) {
      var el = byId(id);
      if (!el || el.getAttribute('data-tax-bound') === '1') return;
      el.setAttribute('data-tax-bound', '1');
      ['input', 'change'].forEach(function (eventName) {
        el.addEventListener(eventName, function () {
          window.setTimeout(function () {
            if (id === 'uTaxType') state.scenario = 'standard';
            applyAutoTaxInputs();
            if (typeof calculate === 'function') calculate();
            refreshTaxUi();
          }, 0);
        });
      });
    });

    var mode = byId('taxMode');
    if (mode && mode.getAttribute('data-tax-bound') !== '1') {
      mode.setAttribute('data-tax-bound', '1');
      mode.addEventListener('change', function () {
        state.mode = mode.value;
        runFullRecalc();
      });
    }
  }

  function initTaxPatch() {
    if (state.ready) return;
    if (typeof brokerFee !== 'function' || typeof calculate !== 'function' || !byId('nSell') || !byId('uSell')) {
      window.setTimeout(initTaxPatch, 50);
      return;
    }
    state.ready = true;
    addTaxControlPanel();
    bindTaxEvents();
    applyAutoTaxInputs();
    if (typeof calculate === 'function') calculate();
    refreshTaxUi();
  }

  initTaxPatch();
})();
