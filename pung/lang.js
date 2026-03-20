/**
 * lang.js — 한/영 공통 언어 토글 모듈
 * 사용법: LANG 객체와 applyLang(l) 함수를 게임에서 정의하면 자동 동작
 */
(function () {
  const STORAGE_KEY = 'gemgem_lang';

  window.getLang = function () {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY, 'ko');
      return 'ko';
    }
    return stored;
  };

  function saveLang(l) {
    localStorage.setItem(STORAGE_KEY, l);
  }

  window.toggleLang = function () {
    const next = getLang() === 'ko' ? 'en' : 'ko';
    saveLang(next);
    updateBtn(next);
    if (typeof applyLang === 'function') applyLang(next);
  };

  // 한국어: 오디오 파일 재생 / 영어: Web Speech API TTS
  window.speakLang = function (koAudio, enText) {
    if (getLang() === 'ko') {
      if (!koAudio) return;
      koAudio.currentTime = 0;
      koAudio.play().catch(() => {});
    } else {
      if (!window.speechSynthesis) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(enText);
      u.lang = 'en-US';
      speechSynthesis.speak(u);
    }
  };

  function updateBtn(l) {
    const btn = document.getElementById('lang-btn');
    if (btn) btn.textContent = l === 'ko' ? 'EN' : '한';
  }

  function injectBtn() {
    if (document.getElementById('lang-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'lang-btn';
    btn.onclick = window.toggleLang;
    btn.style.cssText = [
      'position:fixed', 'top:10px', 'right:12px', 'z-index:9999',
      'background:rgba(255,255,255,.15)', 'border:1px solid rgba(255,255,255,.4)',
      'color:#fff', 'font-size:.72rem', 'font-weight:700',
      'padding:4px 10px', 'border-radius:10px', 'cursor:pointer',
    ].join(';');
    updateBtn(getLang());
    document.body.appendChild(btn);
  }

  function init() {
    injectBtn();
    if (typeof applyLang === 'function') applyLang(getLang());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
