(function () {
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
    var note = document.getElementById('taxScenarioNote');
    if (!note || note.getAttribute('data-black-text-bound') === '1') return;
    note.setAttribute('data-black-text-bound', '1');
    makeTextBlack(note);
    var observer = new MutationObserver(function () {
      makeTextBlack(note);
    });
    observer.observe(note, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  function setDefaultStockValue() {
    var input = document.getElementById('spouseStock');
    if (!input || input.getAttribute('data-final-stock-default') === '1') return;
    input.value = '5.0';
    input.setAttribute('data-final-stock-default', '1');
    if (typeof calculate === 'function') calculate();
  }

  function removeStockPresetBox() {
    Array.from(document.querySelectorAll('.stockPreset')).forEach(function (button) {
      var box = button.closest('.rounded-2xl');
      if (box) box.remove();
    });
  }

  function bindStockInputRefresh() {
    var input = document.getElementById('spouseStock');
    if (!input || input.getAttribute('data-final-stock-bound') === '1') return;
    input.setAttribute('data-final-stock-bound', '1');
    ['input', 'change'].forEach(function (eventName) {
      input.addEventListener(eventName, function () {
        if (typeof calculate === 'function') calculate();
      });
    });
  }

  function makeTaxFormulaCollapsible() {
    var card = findTaxCard();
    if (!card || card.getAttribute('data-final-tax-collapse') === '1') return false;
    if (!document.getElementById('taxAutoPanel') || !document.getElementById('taxBreakdownWrap')) return false;

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
      if (child === originalHeader) {
        child.remove();
      } else {
        body.appendChild(child);
      }
    });

    card.appendChild(header);
    card.appendChild(body);

    makeTextBlack(document.getElementById('taxScenarioNote'));
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
      if (text.indexOf('후순위 확장 모듈') > -1 || text.indexOf('후순위 확장') > -1) {
        section.remove();
      }
    });
  }

  function applyFinalUiPatch() {
    removeLegacyExpansionModule();
    removeStockPresetBox();
    setDefaultStockValue();
    bindStockInputRefresh();
    observeTaxNoteColor();
    var ok = makeTaxFormulaCollapsible();
    if (!ok) window.setTimeout(applyFinalUiPatch, 120);
  }

  applyFinalUiPatch();
})();
