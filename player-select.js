(function () {
  window.playerCount = 1;

  function getLangSafe() {
    if (typeof getLang === 'function') return getLang();
    return localStorage.getItem('gemgem_lang') || 'ko';
  }

  function init() {
    const el = document.getElementById('player-select');
    if (!el) return;

    const max = parseInt(el.dataset.max, 10) || 1;
    if (max <= 1) return;

    const lang = getLangSafe();
    const labelText = lang === 'en' ? 'Players' : '인원 선택';
    const btnLabels = lang === 'en'
      ? ['1P', '2P', '3P']
      : ['1인', '2인', '3인'];

    el.innerHTML =
      '<div class="ps-label">' + labelText + '</div>' +
      '<div class="ps-btns">' +
      Array.from({ length: max }, function (_, i) {
        var label = btnLabels[i] !== undefined ? btnLabels[i] : ((i + 1) + (lang === 'en' ? 'P' : '인'));
        return '<button class="ps-btn' + (i === 0 ? ' active' : '') +
          '" data-n="' + (i + 1) + '">' + label + '</button>';
      }).join('') +
      '</div>';

    var style = document.createElement('style');
    style.textContent = [
      '#player-select { margin: 16px 0; text-align: center; }',
      '.ps-label { font-size: 0.85rem; color: rgba(255,255,255,0.65);',
      '  margin-bottom: 8px; letter-spacing: 1px; }',
      '.ps-btns { display: flex; gap: 10px; justify-content: center; }',
      '.ps-btn {',
      '  padding: 10px 24px; border-radius: 30px;',
      '  border: 2px solid rgba(255,255,255,0.35);',
      '  background: transparent; color: white;',
      '  font-size: 1rem; font-weight: 700;',
      '  cursor: pointer; transition: all 0.2s; min-width: 64px;',
      '  touch-action: manipulation;',
      '}',
      '.ps-btn:hover { background: rgba(255,255,255,0.15); }',
      '.ps-btn.active {',
      '  background: rgba(255,255,255,0.92);',
      '  color: #111; border-color: white;',
      '}'
    ].join('\n');
    document.head.appendChild(style);

    el.querySelectorAll('.ps-btn').forEach(function (btn) {
      function select() {
        el.querySelectorAll('.ps-btn').forEach(function (b) {
          b.classList.remove('active');
        });
        btn.classList.add('active');
        window.playerCount = parseInt(btn.dataset.n, 10);
      }
      btn.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        select();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
