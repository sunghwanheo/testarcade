# Player Select — 인원 선택 기능 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 각 게임 시작 화면에 1인/2인/3인 인원 선택 토글을 추가해 `window.playerCount`에 선택값을 저장한다.

**Architecture:** 루트에 `player-select.js` 공통 스크립트를 생성하고, 각 게임 HTML의 시작 버튼 바로 위에 `<div id="player-select" data-max="N">` 한 줄을 삽입한다. 스크립트가 DOMContentLoaded 시점에 해당 div를 찾아 토글 버튼을 자동 렌더링하며, 선택값은 `window.playerCount`(기본값 1)에 저장된다.

**Tech Stack:** Vanilla JS, HTML, CSS (프레임워크 없음, 빌드 불필요)

---

## 파일 목록

| 작업 | 파일 |
|------|------|
| 생성 | `player-select.js` |
| 수정 | `balloon_pang/index.html` |
| 수정 | `pung/index.html` |
| 수정 | `ice_breaker/index.html` |
| 수정 | `mole/index.html` |
| 미수정 | `lion/index.html` (와구와구, 1인 고정) |

---

## Task 1: `player-select.js` 공통 모듈 생성

**Files:**
- Create: `player-select.js`

- [ ] **Step 1: 파일 생성**

`/player-select.js` 를 아래 내용으로 생성:

```js
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
        return '<button class="ps-btn' + (i === 0 ? ' active' : '') +
          '" data-n="' + (i + 1) + '">' + btnLabels[i] + '</button>';
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
      btn.addEventListener('click', select);
      btn.addEventListener('touchstart', function (e) {
        e.preventDefault();
        select();
      }, { passive: false });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
```

- [ ] **Step 2: 동작 확인용 테스트 HTML 작성**

브라우저에서 직접 열 수 있는 간단한 테스트 파일을 생성한다. `test-player-select.html` 을 루트에 생성:

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>player-select 테스트</title>
  <style>
    body { background: #111; color: white; font-family: sans-serif;
           display: flex; flex-direction: column; align-items: center;
           padding: 40px; gap: 20px; }
    button { padding: 12px 28px; font-size: 1rem; cursor: pointer;
             background: #333; color: white; border: none; border-radius: 8px; }
  </style>
  <script src="./player-select.js"></script>
</head>
<body>
  <h2>player-select 모듈 테스트</h2>

  <h3>max=3 (풍선팡팡/뿡뿡이/얼음깨기)</h3>
  <div id="player-select" data-max="3"></div>

  <button onclick="alert('playerCount = ' + window.playerCount)">
    현재 playerCount 확인
  </button>

  <p style="color:#aaa; font-size:0.85rem">
    1인/2인/3인 토글 → "현재 playerCount 확인" 클릭 → 값이 바뀌면 OK
  </p>
</body>
</html>
```

- [ ] **Step 3: 브라우저에서 테스트 파일 열어 확인**

`test-player-select.html` 을 브라우저에서 열어 아래 항목을 확인:
- [ ] 1인/2인/3인 버튼 3개 렌더링됨
- [ ] 기본값 1인이 활성화(흰 배경) 상태
- [ ] 버튼 클릭 시 활성화 버튼 변경됨
- [ ] "현재 playerCount 확인" 클릭 시 선택한 인원수(1/2/3)가 표시됨

- [ ] **Step 4: 커밋**

```bash
git add player-select.js test-player-select.html
git commit -m "feat: player-select 공통 모듈 추가"
```

---

## Task 2: 풍선팡팡에 인원 선택 추가

**Files:**
- Modify: `balloon_pang/index.html` (260번째 줄 근처, `#startBtn` 위)

- [ ] **Step 1: `player-select.js` 스크립트 태그 추가**

`balloon_pang/index.html` 의 `<script src="./lang.js">` 바로 위에 추가:

```html
<script src="../player-select.js"></script>
```

즉 277번째 줄 앞에 삽입 (현재 `<script src="./lang.js"></script>` 가 있는 위치):

```html
<!-- 변경 전 -->
<script src="./lang.js"></script>

<!-- 변경 후 -->
<script src="../player-select.js"></script>
<script src="./lang.js"></script>
```

- [ ] **Step 2: 시작 버튼 위에 인원 선택 div 삽입**

260번째 줄의 `<button id="startBtn">` 바로 위에 삽입:

```html
<!-- 변경 전 -->
    <button id="startBtn">🎈 게임 시작!</button>

<!-- 변경 후 -->
    <div id="player-select" data-max="3"></div>
    <button id="startBtn">🎈 게임 시작!</button>
```

- [ ] **Step 3: 브라우저에서 확인**

`balloon_pang/index.html?site=local` 을 브라우저에서 열어 확인:
- [ ] 시작 화면에 1인/2인/3인 토글 버튼이 표시됨
- [ ] 기본값 1인 활성화 상태
- [ ] 토글 선택 후 "게임 시작!" 클릭 시 게임이 정상 진행됨
- [ ] `window.playerCount` 값이 선택한 인원수로 저장됨 (콘솔에서 `window.playerCount` 확인)

- [ ] **Step 4: 커밋**

```bash
git add balloon_pang/index.html
git commit -m "feat: 풍선팡팡 인원 선택 추가"
```

---

## Task 3: 뿡뿡이에 인원 선택 추가

**Files:**
- Modify: `pung/index.html` (95번째 줄 근처, `#btn-start` 위)

- [ ] **Step 1: `player-select.js` 스크립트 태그 추가**

`pung/index.html` `<head>` 내 `<link rel="stylesheet" href="css/style.css">` 아래에 추가:

```html
<!-- 변경 전 -->
  <link rel="stylesheet" href="css/style.css">
</head>

<!-- 변경 후 -->
  <link rel="stylesheet" href="css/style.css">
  <script src="../player-select.js"></script>
</head>
```

- [ ] **Step 2: 시작 버튼 위에 인원 선택 div 삽입**

`<button id="btn-start">시작하기! 🚀</button>` 바로 위에 삽입:

```html
<!-- 변경 전 -->
    <button id="btn-start">시작하기! 🚀</button>

<!-- 변경 후 -->
    <div id="player-select" data-max="3"></div>
    <button id="btn-start">시작하기! 🚀</button>
```

- [ ] **Step 3: 브라우저에서 확인**

`pung/index.html?site=local` 을 브라우저에서 열어 확인:
- [ ] 시작 화면 설정 영역 아래, "시작하기!" 버튼 위에 1인/2인/3인 토글 표시됨
- [ ] 기본값 1인 활성화 상태
- [ ] 토글 선택 후 "시작하기!" 클릭 시 게임 정상 진행
- [ ] 콘솔에서 `window.playerCount` 값 선택한 인원수로 확인

- [ ] **Step 4: 커밋**

```bash
git add pung/index.html
git commit -m "feat: 뿡뿡이 인원 선택 추가"
```

---

## Task 4: 얼음깨기에 인원 선택 추가

**Files:**
- Modify: `ice_breaker/index.html` (532번째 줄 근처, `#startButton` 위)

- [ ] **Step 1: `player-select.js` 스크립트 태그 추가**

`ice_breaker/index.html` `<head>` 내 가장 마지막 `<script>` 태그 직전에 추가. `</head>` 바로 위:

```html
<script src="../player-select.js"></script>
</head>
```

- [ ] **Step 2: 시작 버튼 위에 인원 선택 div 삽입**

532번째 줄의 `<button id="startButton" class="dwell-btn">` 바로 위에 삽입:

```html
<!-- 변경 전 -->
            <button id="startButton" class="dwell-btn"><span>게임 시작 (카메라 권한 필요)</span></button>

<!-- 변경 후 -->
            <div id="player-select" data-max="3"></div>
            <button id="startButton" class="dwell-btn"><span>게임 시작 (카메라 권한 필요)</span></button>
```

- [ ] **Step 3: 브라우저에서 확인**

`ice_breaker/index.html?site=local` 을 브라우저에서 열어 확인:
- [ ] 시작 화면 레벨 선택 버튼 아래, "게임 시작" 버튼 위에 1인/2인/3인 토글 표시됨
- [ ] 기본값 1인 활성화 상태
- [ ] 토글 선택 후 게임 시작 시 정상 진행
- [ ] 콘솔에서 `window.playerCount` 값 확인

- [ ] **Step 4: 커밋**

```bash
git add ice_breaker/index.html
git commit -m "feat: 얼음깨기 인원 선택 추가"
```

---

## Task 5: 두더지에 인원 선택 추가

**Files:**
- Modify: `mole/index.html` (487번째 줄 근처, `#start-btn` 위)

- [ ] **Step 1: `player-select.js` 스크립트 태그 추가**

`mole/index.html` 에서 `<script src="./lang.js"></script>` 위에 추가:

```html
<!-- 변경 전 -->
<script src="./lang.js"></script>

<!-- 변경 후 -->
<script src="../player-select.js"></script>
<script src="./lang.js"></script>
```

- [ ] **Step 2: 시작 버튼 위에 인원 선택 div 삽입 (max=2)**

487번째 줄의 `<button id="start-btn"` 바로 위에 삽입. **두더지는 최대 2인이므로 `data-max="2"`**:

```html
<!-- 변경 전 -->
  <button id="start-btn" onclick="showTutorial()">🎮 게임 시작!</button>

<!-- 변경 후 -->
  <div id="player-select" data-max="2"></div>
  <button id="start-btn" onclick="showTutorial()">🎮 게임 시작!</button>
```

- [ ] **Step 3: 브라우저에서 확인**

`mole/index.html?site=local` 을 브라우저에서 열어 확인:
- [ ] 시작 화면에 1인/2인 토글 버튼 **2개**만 표시됨 (3인 없음)
- [ ] 기본값 1인 활성화 상태
- [ ] 토글 선택 후 "게임 시작!" 클릭 시 정상 진행
- [ ] 콘솔에서 `window.playerCount` 값 확인

- [ ] **Step 4: 커밋**

```bash
git add mole/index.html
git commit -m "feat: 두더지 인원 선택 추가 (max 2인)"
```

---

## Task 6: 전체 검증 및 정리

- [ ] **Step 1: 4개 게임 최종 확인**

각 게임을 브라우저에서 열어 아래 체크리스트 확인:

| 게임 | 토글 버튼 수 | 기본값 | playerCount 저장 | 게임 정상 시작 |
|------|------------|--------|----------------|--------------|
| 풍선팡팡 | 3개 | 1인 | ✓ | ✓ |
| 뿡뿡이 | 3개 | 1인 | ✓ | ✓ |
| 얼음깨기 | 3개 | 1인 | ✓ | ✓ |
| 두더지 | 2개 | 1인 | ✓ | ✓ |
| 와구와구 | 없음 | — | — | ✓ (기존과 동일) |

- [ ] **Step 2: 테스트 파일 제거**

구현 확인 후 임시 테스트 파일 삭제:

```bash
git rm test-player-select.html
git commit -m "chore: 임시 테스트 파일 제거"
```

- [ ] **Step 3: 최종 커밋 확인**

```bash
git log --oneline -6
```

예상 출력:
```
xxxxxxx chore: 임시 테스트 파일 제거
xxxxxxx feat: 두더지 인원 선택 추가 (max 2인)
xxxxxxx feat: 얼음깨기 인원 선택 추가
xxxxxxx feat: 뿡뿡이 인원 선택 추가
xxxxxxx feat: 풍선팡팡 인원 선택 추가
xxxxxxx feat: player-select 공통 모듈 추가
```
