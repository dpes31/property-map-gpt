(function () {
  function byId(id) { return document.getElementById(id); }
  function nval(id, fallback) {
    var el = byId(id);
    if (!el) return fallback;
    var n = parseFloat(el.value);
    return Number.isFinite(n) ? n : fallback;
  }
  function eok(v) { return Number(v || 0).toFixed(2) + '억'; }
  function won(v) {
    var x = Number(v || 0);
    if (x >= 1) return x.toFixed(2) + '억';
    return Math.round(x * 10000).toLocaleString('ko-KR') + '만원';
  }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function rateRule(taxBase) {
    if (taxBase <= 0.14) return { rate: 0.06, ded: 0 };
    if (taxBase <= 0.50) return { rate: 0.15, ded: 0.0126 };
    if (taxBase <= 0.88) return { rate: 0.24, ded: 0.0576 };
    if (taxBase <= 1.50) return { rate: 0.35, ded: 0.1544 };
    if (taxBase <= 3.00) return { rate: 0.38, ded: 0.1994 };
    if (taxBase <= 5.00) return { rate: 0.40, ded: 0.2594 };
    if (taxBase <= 10.00) return { rate: 0.42, ded: 0.3594 };
    return { rate: 0.45, ded: 0.6594 };
  }

  function taxFromBase(base) {
    base = Math.max(0, base || 0);
    if (!base) return { taxBase: 0, rate: 0, progressiveDeduction: 0, nationalTax: 0, localTax: 0, totalTax: 0 };
    var r = rateRule(base);
    var national = Math.max(0, base * r.rate - r.ded);
    return {
      taxBase: base,
      rate: r.rate,
      progressiveDeduction: r.ded,
      nationalTax: national,
      localTax: national * 0.1,
      totalTax: national * 1.1
    };
  }

  function calcHighPriceOneHouse(sell, acq, extra, deductRate) {
    var brokerage = brokerFee(sell);
    var grossGain = Math.max(0, sell - acq - brokerage - extra);
    var taxableRatio = sell > 12 ? (sell - 12) / sell : 0;
    var taxableGain = grossGain * taxableRatio;
    var deductionRate = clamp(deductRate / 100, 0, 0.8);
    var deductionAmount = taxableGain * deductionRate;
    var afterDeduction = Math.max(0, taxableGain - deductionAmount);
    var tax = taxFromBase(Math.max(0, afterDeduction - 0.025));
    return Object.assign({
      kind: 'high', sell: sell, acq: acq, brokerage: brokerage, extra: extra,
      grossGain: grossGain, taxableRatio: taxableRatio, taxableGain: taxableGain,
      deductRate: deductRate, deductionAmount: deductionAmount, afterDeduction: afterDeduction
    }, tax);
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
    return Object.assign({
      kind: taxfree ? 'taxfree' : 'general', sell: sell, acq: acq, brokerage: brokerage, extra: extra,
      grossGain: grossGain, taxableRatio: taxfree ? 0 : 1, taxableGain: taxableGain,
      deductRate: taxfree ? 0 : deductRate, deductionAmount: deductionAmount, afterDeduction: afterDeduction
    }, tax);
  }

  function compute() {
    var nSell = nval('nSell', 15);
    var uSell = nval('uSell', 4);
    var nDeduct = nval('nDeductRate', 35);
    var uDeduct = nval('uDeductRate', 10);
    var uType = byId('uTaxType') ? byId('uTaxType').value : 'general';
    return {
      n: calcHighPriceOneHouse(nSell, nval('nAcq', 4.95), nval('nExtraExpense', 0), nDeduct),
      u: calcGeneral(uSell, nval('uAcq', 3.00), nval('uExtraExpense', 0), uDeduct, uType),
      nDeduct: nDeduct,
      uDeduct: uDeduct,
      uType: uType
    };
  }

  function basisText(t) {
    var nBasis = '1세대 1주택 고가주택 가정 / 12억 초과분만 과세 / 장특공제율 ' + t.nDeduct + '%';
    var uBasis;
    if (t.uType === 'taxfree') {
      uBasis = '비과세 인정 가정 / 예상세액 0원';
    } else if (t.uDeduct > 0) {
      var years = Math.round((t.uDeduct / 2) * 10) / 10;
      uBasis = '일반과세 가정 / 연 2% × ' + years + '년 보유 = 장특공제율 ' + t.uDeduct + '%';
    } else {
      uBasis = '일반과세 보수 가정 / 장특공제 미반영';
    }
    return { n: nBasis, u: uBasis };
  }

  function row(title, calc, value, strong) {
    return '<div class="flex items-start justify-between gap-3 py-2 border-b border-slate-100 last:border-b-0">' +
      '<div><p class="' + (strong ? 'font-black text-slate-950' : 'font-bold text-slate-600') + '">' + title + '</p>' +
      '<p class="text-[11px] text-slate-500 mt-0.5">' + calc + '</p></div>' +
      '<p class="' + (strong ? 'text-lg text-rose-700' : 'text-sm text-slate-900') + ' font-black num whitespace-nowrap">' + value + '</p>' +
      '</div>';
  }

  function card(title, subtitle, c, isHigh) {
    var pct = Math.round((c.taxableRatio || 0) * 1000) / 10;
    var rate = c.rate ? Math.round(c.rate * 100) + '%' : '-';
    var html = '';
    html += row('1. 전체 양도차익', eok(c.sell) + ' - 취득가 ' + eok(c.acq) + ' - 중개보수 ' + eok(c.brokerage) + ' - 필요경비 ' + eok(c.extra), eok(c.grossGain), false);
    if (isHigh) {
      html += row('2. 12억 초과 과세대상 차익', eok(c.grossGain) + ' × (매도가 - 12억) / 매도가 = ' + pct + '%', eok(c.taxableGain), false);
    } else if (c.kind === 'taxfree') {
      html += row('2. 과세대상 차익', '비과세 인정 가정', '0.00억', false);
    } else {
      html += row('2. 과세대상 차익', '일반과세이므로 양도차익 100% 과세대상', eok(c.taxableGain), false);
    }
    html += row('3. 장특공제 차감 후', eok(c.taxableGain) + ' × (1 - ' + c.deductRate + '%)', eok(c.afterDeduction), false);
    html += row('4. 기본공제 후 과세표준', eok(c.afterDeduction) + ' - 250만원', eok(c.taxBase), false);
    html += row('5. 세율·지방소득세 반영', '누진세율 ' + rate + ' - 누진공제 ' + won(c.progressiveDeduction) + ' + 지방소득세 10%', eok(c.totalTax), true);
    return '<article class="rounded-2xl bg-white border border-rose-100 p-4">' +
      '<div class="flex items-start justify-between gap-3 mb-3"><div><p class="text-xs font-black text-rose-700">' + subtitle + '</p>' +
      '<h4 class="text-base md:text-lg font-black text-slate-950 mt-0.5">' + title + '</h4></div>' +
      '<div class="text-right"><p class="text-[11px] font-bold text-slate-500">예상세액</p><p class="text-xl font-black text-rose-700 num">' + eok(c.totalTax) + '</p></div></div>' +
      '<div class="text-xs">' + html + '</div></article>';
  }

  function findTaxCard() {
    var btn = document.querySelector('.taxPreset');
    return btn ? btn.closest('.rounded-2xl') : null;
  }

  function render() {
    if (typeof brokerFee !== 'function' || !byId('nAcq') || !findTaxCard()) return;

    var taxCard = findTaxCard();
    var grid = taxCard.parentElement;
    if (grid) {
      grid.className = 'grid grid-cols-1 gap-3 mb-4';
      Array.from(grid.children).forEach(function (child) {
        if (child.textContent && child.textContent.indexOf('예상 주식 매도액') > -1 && child !== taxCard) {
          child.className = 'rounded-2xl bg-blue-50 border border-blue-100 p-4';
        }
      });
    }

    var t = compute();
    var b = basisText(t);
    var total = t.n.totalTax + t.u.totalTax;
    var note = byId('taxScenarioNote');
    if (note) {
      note.innerHTML = '<div class="space-y-2">' +
        '<p><strong>표준 산출 기준 · 합계 ' + eok(total) + '</strong></p>' +
        '<div class="grid grid-cols-1 lg:grid-cols-2 gap-2">' +
        '<div class="rounded-xl bg-white/70 border border-rose-100 p-3"><p class="font-black text-rose-950">녹번집</p><p>· ' + b.n + '</p></div>' +
        '<div class="rounded-xl bg-white/70 border border-rose-100 p-3"><p class="font-black text-rose-950">의정부집</p><p>· ' + b.u + '</p></div>' +
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
      if (panel) panel.insertAdjacentElement('afterend', wrap);
      else taxCard.appendChild(wrap);
    }
    wrap.className = 'mt-4 grid grid-cols-1 xl:grid-cols-2 gap-3';
    wrap.innerHTML = card('녹번 주택', b.n, t.n, true) + card('의정부 주택', b.u, t.u, false);
  }

  function attach() {
    ['nSell','uSell','nAcq','uAcq','nExtraExpense','uExtraExpense','nDeductRate','uDeductRate','uTaxType','taxMode'].forEach(function (id) {
      var el = byId(id);
      if (!el || el.getAttribute('data-tax-explain-listener') === '1') return;
      el.setAttribute('data-tax-explain-listener', '1');
      el.addEventListener('input', function () { setTimeout(render, 30); });
      el.addEventListener('change', function () { setTimeout(render, 30); });
    });
    document.addEventListener('click', function (e) {
      if (e.target && e.target.classList && e.target.classList.contains('taxPreset')) setTimeout(render, 80);
    }, true);
  }

  function boot() {
    if (!byId('nAcq') || typeof brokerFee !== 'function') {
      setTimeout(boot, 80);
      return;
    }
    attach();
    render();
  }

  boot();
})();
