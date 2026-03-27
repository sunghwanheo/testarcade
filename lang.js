/**
 * lang.js — 한/영 공통 언어 토글 모듈
 *
 * [게임에서 사용법]
 * 1. <script src="../lang.js"></script> 추가
 * 2. LANG = { ko: {...}, en: {...} } 텍스트 객체 정의
 * 3. applyLang(l) 함수 구현 (텍스트 DOM 반영)
 * 4. 소리: speakLang(koAudio, enText) 로 호출
 */

(function () {
  const STORAGE_KEY = 'gemgem_lang';

  // ── 언어 조회 / 저장 ─────────────────────────────────────
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

  // ── 한/영 토글 ────────────────────────────────────────────
  window.toggleLang = function () {
    const next = getLang() === 'ko' ? 'en' : 'ko';
    saveLang(next);
    updateBtn(next);
    if (typeof applyLang === 'function') applyLang(next);
  };

  // ── 소리: 한국어는 오디오 파일, 영어는 TTS ───────────────
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

  // ── 버튼 텍스트 업데이트 ─────────────────────────────────
  function updateBtn(l) {
    const exitBtn = document.getElementById('exit-btn');
    if (exitBtn) exitBtn.textContent = l === 'en' ? 'Exit' : '나가기';
    const btn = document.getElementById('lang-btn');
    if (!btn) return;
    const koStyle = l === 'ko'
      ? 'color:#fff;font-weight:900;'
      : 'color:rgba(255,255,255,0.35);font-weight:400;';
    const enStyle = l === 'en'
      ? 'color:#fff;font-weight:900;'
      : 'color:rgba(255,255,255,0.35);font-weight:400;';
    btn.innerHTML =
      '<span style="' + koStyle + '">KO</span>' +
      '<span style="color:rgba(255,255,255,0.3);margin:0 4px;">|</span>' +
      '<span style="' + enStyle + '">EN</span>';
  }

  // ── 버튼 DOM 자동 주입 ───────────────────────────────────
  function injectBtn() {
    if (document.getElementById('lang-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'lang-btn';
    btn.onclick = window.toggleLang;
    btn.style.cssText = [
      'position:fixed', 'top:10px', 'right:12px', 'z-index:999',
      'background:rgba(255,255,255,.1)', 'border:1px solid rgba(255,255,255,.35)',
      'font-size:.8rem', 'padding:5px 12px', 'border-radius:12px',
      'cursor:pointer', 'display:flex', 'align-items:center', 'gap:0',
    ].join(';');
    document.body.appendChild(btn);
    updateBtn(getLang());
  }

  // ── 초기화: DOM 준비되면 버튼 주입 후 언어 적용 ──────────
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
