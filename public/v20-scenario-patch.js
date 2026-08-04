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
        note.textContent = '※ 시나리오별 총 조달액은 해당 매매가에서 다시 계산합니다. 자동 대출 기준에서는 25억 초과 시 초과 구간 한도가 적용됩니다.';
        table.parentElement.insertAdjacentElement('afterend', note);
      }
    };

    if (typeof calculate === 'function') calculate();
  }

  applyScenarioPatch();
})();

(function () {
  var state = { mode: 'auto', scenario: 'standard', ready: false };
  var configs = {
    optimistic: { label: '낙관', nDeductRate: 40, uTaxType: 'taxfree', uDeductRate: 10, nAcq: 4.95, uAcq: 3.00, nExtraExpense: 0, uExtraExpense: 0 },
    standard: { label: '표준', nDeductRate: 35, uTaxType: 'general', uDeductRate: 10, nAcq: 4.95, uAcq: 3.00, nExtraExpense: 0, uExtraExpense: 0 },
    conservative: { label: '보수', nDeductRate: 25, uTaxType: 'general', uDeductRate: 0, nAcq: 4.80, uAcq: 2.90, nExtraExpense: 0, uExtraExpense: 0 }
  };

  function byId(id) { return document.getElementById(id); }
  function nval(id, fallback) { var el = byId(id); var n = el ? parseFloat(el.value) : NaN; return Number.isFinite(n) ? n : fallback; }
  function setValue(id, value, digits) { var el = byId(id); if (el) el.value = Number(value || 0).toFixed(digits == null ? 2 : digits); }
  function eok(v) { return Number(v || 0).toFixed(2) + '억'; }
  function won(v) { var x = Number(v || 0); return x >= 1 ? x.toFixed(2) + '억' : Math.round(x * 10000).toLocaleString('ko-KR') + '만원'; }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function rateRule(base) {
    if (base <= 0.14) return { rate: 0.06, ded: 0 };
    if (base <= 0.50) return { rate: 0.15, ded: 0.0126 };
    if (base <= 0.88) return { rate: 0.24, ded: 0.0576 };
    if (base <= 1.50) return { rate: 0.35, ded: 0.1544 };
    if (base <= 3.00) return { rate: 0.38, ded: 0.1994 };
    if (base <= 5.00) return { rate: 0.40, ded: 0.2594 };
    if (base <= 10.00) return { rate: 0.42, ded: 0.3594 };
    return { rate: 0.45, ded: 0.6594 };
  }
  function taxFromBase(base) {
    base = Math.max(0, base || 0);
    if (!base) return { taxBase: 0, rate: 0, progressiveDeduction: 0, nationalTax: 0, localTax: 0, totalTax: 0 };
    var r = rateRule(base);
    var national = Math.max(0, base * r.rate - r.ded);
    return { taxBase: base, rate: r.rate, progressiveDeduction: r.ded, nationalTax: national, localTax: national * 0.1, totalTax: national * 1.1 };
  }
  function calcHighPriceOneHouse(sell, acq, extra, deductRate) {
    var brokerage = brokerFee(sell);
    var grossGain = Math.max(0, sell - acq - brokerage - extra);
    var ratio = sell > 12 ? (sell - 12) / sell : 0;
    var taxableGain = grossGain * ratio;
    var deductionRate = clamp(deductRate / 100, 0, 0.8);
    var deductionAmount = taxableGain * deductionRate;
    var afterDeduction = Math.max(0, taxableGain - deductionAmount);
    var tax = taxFromBase(Math.max(0, afterDeduction - 0.025));
    return Object.assign({ sell: sell, acq: acq, brokerage: brokerage, extra: extra, grossGain: grossGain, taxableRatio: ratio, taxableGain: taxableGain, deductRate: deductRate, deductionAmount: deductionAmount, afterDeduction: afterDeduction, kind: 'high' }, tax);
  }
  function calcGeneral(sell, acq, extra, deductRate, taxType) {
    var brokerage = brokerFee(sell);
    var grossGain = Math.max(0, sell - acq - brokerage - extra);
    var taxfree = taxType === 'taxfree';
    var taxableGain = taxfree ? 0 : grossGain;
    var deductionRate = taxfree ? 0 : clamp(deductRate / 100, 0, 0.3);
    var deductionAmount = taxableGain * deductionRate;
    var afterDeduction = Math.max(0, taxableGain - deductionAmount);
    var tax = taxFromBase(Math.max(0, afterDeduction - 0.025));
    return Object.assign({ sell: sell, acq: acq, brokerage: brokerage, extra: extra, grossGain: grossGain, taxableRatio: taxfree ? 0 : 1, taxableGain: taxableGain, deductRate: taxfree ? 0 : deductRate, deductionAmount: deductionAmount, afterDeduction: afterDeduction, kind: taxfree ? 'taxfree' : 'general' }, tax);
  }
  function params() {
    var cfg = configs[state.scenario] || configs.standard;
    return {
      nAcq: nval('nAcq', cfg.nAcq),
      uAcq: nval('uAcq', cfg.uAcq),
      nExtraExpense: nval('nExtraExpense', cfg.nExtraExpense),
      uExtraExpense: nval('uExtraExpense', cfg.uExtraExpense),
      nDeductRate: nval('nDeductRate', cfg.nDeductRate),
      uDeductRate: nval('uDeductRate', cfg.uDeductRate),
      uTaxType: byId('uTaxType') ? byId('uTaxType').value : cfg.uTaxType
    };
  }
  function compute() {
    var p = params();
    var n = calcHighPriceOneHouse(nval('nSell', 15), p.nAcq, p.nExtraExpense, p.nDeductRate);
    var u = calcGeneral(nval('uSell', 4), p.uAcq, p.uExtraExpense, p.uDeductRate, p.uTaxType);
    return { n: n, u: u, p: p, total: n.totalTax + u.totalTax };
  }
  function applyAutoTaxInputs() {
    if (state.mode !== 'auto') return;
    var t = compute();
    setValue('nCgt', t.n.totalTax, 2);
    setValue('uCgt', t.u.totalTax, 2);
  }
  function basisText(t) {
    var nBasis = '1세대 1주택 고가주택 가정 / 12억 초과분만 과세 / 장특공제율 ' + t.p.nDeductRate + '%';
    var uBasis;
    if (t.p.uTaxType === 'taxfree') uBasis = '비과세 인정 가정 / 예상세액 0원';
    else if (t.p.uDeductRate > 0) uBasis = '일반과세 가정 / 연 2% × ' + (t.p.uDeductRate / 2) + '년 보유 = 장특공제율 ' + t.p.uDeductRate + '%';
    else uBasis = '일반과세 보수 가정 / 장특공제 미반영';
    return { n: nBasis, u: uBasis };
  }
  function row(title, formula, value, strong) {
    return '<div class="flex items-start justify-between gap-3 py-2 border-b border-slate-100 last:border-b-0">' +
      '<div><p class="' + (strong ? 'font-black text-slate-950' : 'font-bold text-slate-600') + '">' + title + '</p>' +
      '<p class="text-[11px] text-slate-500 mt-0.5">' + formula + '</p></div>' +
      '<p class="' + (strong ? 'text-lg text-rose-700' : 'text-sm text-slate-900') + ' font-black num whitespace-nowrap">' + value + '</p>' +
      '</div>';
  }
  function breakdownCard(title, subtitle, c, high) {
    var pct = Math.round((c.taxableRatio || 0) * 1000) / 10;
    var rate = c.rate ? Math.round(c.rate * 100) + '%' : '-';
    var body = '';
    body += row('1. 전체 양도차익', eok(c.sell) + ' - 취득가 ' + eok(c.acq) + ' - 중개보수 ' + eok(c.brokerage) + ' - 필요경비 ' + eok(c.extra), eok(c.grossGain), false);
    if (high) body += row('2. 12억 초과 과세대상 차익', eok(c.grossGain) + ' × (매도가 - 12억) / 매도가 = ' + pct + '%', eok(c.taxableGain), false);
    else if (c.kind === 'taxfree') body += row('2. 과세대상 차익', '비과세 인정 가정', '0.00억', false);
    else body += row('2. 과세대상 차익', '일반과세이므로 양도차익 100% 과세대상', eok(c.taxableGain), false);
    body += row('3. 장특공제 차감 후', eok(c.taxableGain) + ' × (1 - ' + c.deductRate + '%)', eok(c.afterDeduction), false);
    body += row('4. 기본공제 후 과세표준', eok(c.afterDeduction) + ' - 250만원', eok(c.taxBase), false);
    body += row('5. 세율·지방소득세 반영', '누진세율 ' + rate + ' - 누진공제 ' + won(c.progressiveDeduction) + ' + 지방소득세 10%', eok(c.totalTax), true);
    return '<article class="rounded-2xl bg-white border border-rose-100 p-4">' +
      '<div class="flex items-start justify-between gap-3 mb-3"><div><p class="text-xs font-black text-rose-700">' + subtitle + '</p><h4 class="text-base md:text-lg font-black text-slate-950 mt-0.5">' + title + '</h4></div>' +
      '<div class="text-right"><p class="text-[11px] font-bold text-slate-500">예상세액</p><p class="text-xl font-black text-rose-700 num">' + eok(c.totalTax) + '</p></div></div>' +
      '<div class="text-xs">' + body + '</div></article>';
  }
  function findTaxCard() { var btn = document.querySelector('.taxPreset'); return btn ? btn.closest('.rounded-2xl') : null; }

  function renderExplanation() {
    var card = findTaxCard();
    if (!card || !byId('nAcq') || typeof brokerFee !== 'function') return;
    var grid = card.parentElement;
    if (grid) grid.className = 'grid grid-cols-1 gap-3 mb-4';
    var t = compute();
    var basis = basisText(t);
    var note = byId('taxScenarioNote');
    if (note) {
      note.innerHTML = '<div class="space-y-2">' +
        '<p><strong>' + (configs[state.scenario] || configs.standard).label + ' 산출 기준 · 합계 ' + eok(t.total) + '</strong></p>' +
        '<div class="grid grid-cols-1 lg:grid-cols-2 gap-2">' +
        '<div class="rounded-xl bg-white/70 border border-rose-100 p-3"><p class="font-black text-rose-950">녹번집</p><p>· ' + basis.n + '</p></div>' +
        '<div class="rounded-xl bg-white/70 border border-rose-100 p-3"><p class="font-black text-rose-950">의정부집</p><p>· ' + basis.u + '</p></div>' +
        '</div>' +
        '<p class="text-rose-700">계산식: 양도차익 = 매도가 - 취득가 - 매도중개보수 - 추가 필요경비 → 장특공제 → 기본공제 250만원 → 누진세율 → 지방소득세 10%</p>' +
        '<p class="text-rose-600">※ 매도가·취득가·장특공제율이 바뀌면 예상세액을 다시 계산합니다. 세무 신고용 확정 계산은 아닙니다.</p>' +
        '</div>';
    }
    var wrap = byId('taxBreakdownWrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'taxBreakdownWrap';
      wrap.className = 'mt-4 grid grid-cols-1 xl:grid-cols-2 gap-3';
      var panel = byId('taxAutoPanel');
      if (panel) panel.insertAdjacentElement('afterend', wrap); else card.appendChild(wrap);
    }
    wrap.innerHTML = breakdownCard('녹번 주택', basis.n, t.n, true) + breakdownCard('의정부 주택', basis.u, t.u, false);
  }

  function refreshTaxUi() {
    var t = compute();
    ['optimistic','standard','conservative'].forEach(function (key) {
      var old = state.scenario;
      state.scenario = key;
      var tt = compute();
      var btn = document.querySelector('.taxPreset[data-tax-scenario="' + key + '"]');
      if (btn) btn.textContent = configs[key].label + ' ' + eok(tt.total);
      state.scenario = old;
    });
    document.querySelectorAll('.taxPreset').forEach(function (btn) {
      var active = btn.getAttribute('data-tax-scenario') === state.scenario && state.mode === 'auto';
      btn.className = active ? 'taxPreset rounded-xl border py-2 font-bold transition bg-rose-600 text-white border-rose-600 shadow-sm' : 'taxPreset rounded-xl border py-2 font-bold transition bg-white text-rose-800 border-rose-200';
    });
    ['nCgt','uCgt'].forEach(function (id) { var el = byId(id); if (el) { el.readOnly = state.mode === 'auto'; el.classList.toggle('bg-slate-100', state.mode === 'auto'); } });
    renderExplanation();
  }
  function recalcAll() {
    applyAutoTaxInputs();
    if (typeof calculate === 'function') calculate();
    window.setTimeout(refreshTaxUi, 0);
  }
  function addTaxPanel() {
    if (byId('taxAutoPanel')) return;
    var buttons = Array.prototype.slice.call(document.querySelectorAll('.taxPreset'));
    if (!buttons.length) return;
    buttons.forEach(function (btn, idx) {
      var key = idx === 0 ? 'optimistic' : idx === 1 ? 'standard' : 'conservative';
      var clone = btn.cloneNode(true);
      clone.setAttribute('data-tax-scenario', key);
      clone.removeAttribute('data-ncgt'); clone.removeAttribute('data-ucgt');
      clone.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        state.mode = 'auto'; state.scenario = key;
        var cfg = configs[key];
        setValue('nAcq', cfg.nAcq, 2); setValue('uAcq', cfg.uAcq, 2);
        setValue('nExtraExpense', cfg.nExtraExpense, 2); setValue('uExtraExpense', cfg.uExtraExpense, 2);
        setValue('nDeductRate', cfg.nDeductRate, 0); setValue('uDeductRate', cfg.uDeductRate, 0);
        if (byId('uTaxType')) byId('uTaxType').value = cfg.uTaxType;
        if (byId('taxMode')) byId('taxMode').value = 'auto';
        recalcAll();
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
      '</div>';
    container.appendChild(panel);
  }
  function bind() {
    ['nSell','uSell','nAcq','uAcq','nExtraExpense','uExtraExpense','nDeductRate','uDeductRate','uTaxType','taxMode'].forEach(function (id) {
      var el = byId(id); if (!el || el.getAttribute('data-tax-bound') === '1') return;
      el.setAttribute('data-tax-bound', '1');
      el.addEventListener('input', function () { if (id === 'taxMode') state.mode = el.value; window.setTimeout(recalcAll, 0); });
      el.addEventListener('change', function () { if (id === 'taxMode') state.mode = el.value; window.setTimeout(recalcAll, 0); });
    });
  }
  function boot() {
    if (state.ready) return;
    if (typeof brokerFee !== 'function' || typeof calculate !== 'function' || !byId('nSell') || !byId('uSell')) { window.setTimeout(boot, 50); return; }
    state.ready = true;
    addTaxPanel();
    bind();
    recalcAll();
  }
  boot();
})();