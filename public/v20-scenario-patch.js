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
