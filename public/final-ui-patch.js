(function () {
  function findTaxCard() {
    var btn = document.querySelector('.taxPreset');
    return btn ? btn.closest('.rounded-2xl') : null;
  }

  function makeTaxFormulaCollapsible() {
    var card = findTaxCard();
    if (!card || card.getAttribute('data-final-tax-collapse') === '1') return false;
    if (!document.getElementById('taxAutoPanel') || !document.getElementById('taxBreakdownWrap')) return false;

    var heading = Array.from(card.querySelectorAll('p')).find(function (p) {
      return (p.textContent || '').trim() === '예상 양도세';
    });
    if (!heading) return false;

    heading.textContent = '예상 양도세 산출 공식';

    var header = heading.closest('.flex') || heading.parentElement;
    if (!header) return false;

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'mt-2 inline-flex items-center rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-black text-rose-700 hover:bg-rose-50 transition';
    button.textContent = '계산 과정 열기 ▼';

    var titleBox = heading.parentElement || header;
    titleBox.appendChild(button);

    var body = document.createElement('div');
    body.id = 'taxFormulaCollapseBody';
    body.className = 'hidden mt-3';

    Array.from(card.children).forEach(function (child) {
      if (child !== header && child !== body) body.appendChild(child);
    });
    card.appendChild(body);

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
      if (text.indexOf('후순위 확장 모듈') > -1 || text.indexOf('후순위 확장') > -1) {
        section.remove();
      }
    });
  }

  function applyFinalUiPatch() {
    removeLegacyExpansionModule();
    var ok = makeTaxFormulaCollapsible();
    if (!ok) window.setTimeout(applyFinalUiPatch, 120);
  }

  applyFinalUiPatch();
})();
