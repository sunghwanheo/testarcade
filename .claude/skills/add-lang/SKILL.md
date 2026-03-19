# /add-lang — 게임에 한/영 다국어 추가

현재 디렉토리의 게임 `index.html`에 한/영 언어 토글을 추가한다.

---

## 작업 순서

### Step 1. lang.js 생성
현재 디렉토리에 `lang.js`가 없으면 아래 내용으로 생성한다. 이미 있으면 건너뛴다.

```javascript
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
```

---

### Step 2. 메인 HTML 파일 찾기
현재 디렉토리의 HTML 파일 목록을 확인한다. `index.html`이 있으면 그것을 사용하고, 없으면 디렉토리명 또는 프로젝트명과 유사한 `.html` 파일을 찾아 사용한다. 여러 개일 경우 가장 메인이 될 것 같은 파일을 선택하고 사용자에게 확인한다.

### Step 3. 메인 HTML 분석
찾은 HTML 파일을 읽고 아래 항목을 파악한다:
- 사용자에게 보이는 **모든 한국어 텍스트** (버튼, 제목, 설명, 상태 메시지, 동적으로 JS에서 설정하는 텍스트 포함)
- **한국어 음성/오디오** 사용 여부 (base64 audio, speechSynthesis 등)
- 텍스트가 동적으로 바뀌는 시점 (게임 시작, 재시작, 스테이지 전환 등)

---

### Step 4. lang.js 스크립트 태그 추가
찾은 HTML 파일의 `<head>` 또는 첫 번째 `<script>` 태그 바로 앞에 추가한다:
```html
<script src="./lang.js"></script>
```

---

### Step 5. LANG 객체 + applyLang 구현
`<script>` 최상단에 추가한다.

```javascript
const LANG = {
  ko: {
    // Step 2에서 수집한 모든 한국어 텍스트
  },
  en: {
    // 자연스러운 영어 번역
  }
};

function applyLang(l) {
  const t = LANG[l];
  // 모든 텍스트 DOM 요소 업데이트
  // 예: document.getElementById('start-btn').textContent = t.startBtn;
}
```

---

### Step 6. 동적 텍스트 수정
JS 코드에서 하드코딩된 한국어 문자열을 `LANG[getLang()].키` 로 교체한다.

예시:
```javascript
// 변경 전
st.textContent = '🖐 손 인식 로딩중...';
// 변경 후
st.textContent = LANG[getLang()].handLoading;
```

게임 시작·재시작 등 텍스트가 초기화되는 모든 시점에 `LANG[getLang()]` 을 참조하도록 수정한다.

---

### Step 7. 오디오 처리 (음성이 있는 경우)
한국어 음성 재생 함수를 `speakLang()` 으로 교체한다.

```javascript
// 변경 전
speakKorean();
// 변경 후
speakLang(koAudioObject, LANG[getLang()].someText);
```

---

## 규칙
- 토글 버튼은 `lang.js`가 자동 주입하므로 HTML에 추가하지 않는다
- 기존 한국어 하드코딩 문자열은 모두 `LANG` 객체로 일원화한다
- `applyLang`은 페이지 로드 시 + 토글 시 자동 호출된다 (`lang.js`가 처리)
- `localStorage` 키 `gemgem_lang` 으로 저장되어 다른 게임에서도 언어 유지

## 완료 후 확인
1. 페이지 로드 시 저장된 언어로 자동 적용
2. 버튼 클릭 시 모든 텍스트·음성이 전환
3. 게임 재시작 후에도 선택 언어 유지
