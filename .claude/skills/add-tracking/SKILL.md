---
name: add-tracking
description: Add Supabase play tracking (trackPlay/trackComplete) to an HTML game in the testarcade project
---

# /add-tracking — 게임에 플레이 트래킹 추가

사용법:
```
/add-tracking <게임디렉토리명>
```
예시: `/add-tracking lion`, `/add-tracking newgame`

인자를 생략하면 현재 디렉토리를 대상으로 한다.

대상 디렉토리는 `d:/github/activearcade/testarcade/<게임디렉토리명>` 경로로 해석한다.

---

## 배경 지식

`tracking.js`는 `d:/github/activearcade/testarcade/tracking.js` (루트)에 위치하며 Supabase로 다음 이벤트를 전송한다:
- `game_start` — `trackPlay()` 호출 시
- `game_end` — `trackComplete()` 호출 시 (completed: true, duration 포함)
- `game_abandon` — 탭 닫기 시 자동 전송

게임 이름은 `<script data-game="게임이름">` 속성으로 지정한다.

---

## 작업 순서

### Step 1. 대상 디렉토리 및 메인 HTML 파일 찾기

인자로 받은 게임 디렉토리명을 기반으로 `d:/github/activearcade/testarcade/<게임디렉토리명>` 경로를 대상으로 한다. 인자가 없으면 현재 디렉토리를 사용한다.

해당 디렉토리에서 HTML 파일 목록을 확인한다. `index.html`이 있으면 그것을 사용하고, 없으면 디렉토리명과 유사한 `.html` 파일을 찾는다.

### Step 2. HTML 분석

찾은 HTML 파일을 읽고 아래 항목을 파악한다:
- 이미 `tracking.js`가 포함되어 있는지 확인 → 있으면 중복 추가하지 않는다
- `<script>` 태그 목록 및 순서
- JS 파일 위치 (인라인 vs 외부 파일)

### Step 3. JS 코드 분석

게임 로직 파일(main.js 또는 인라인 스크립트)을 읽고 아래를 파악한다:
- **게임 시작 지점**: 카운트다운 종료 후 실제 플레이가 시작되는 함수 (예: `startPlaying()`, `startGame()`, 카운트다운 콜백 등)
  - 단순 시작 화면 → 캘리브레이션 → 튜토리얼 같은 준비 단계는 제외하고, **실제 게임플레이가 시작되는 시점**을 찾는다
- **게임 완료 지점**: 게임이 정상 클리어되는 함수 (예: `endGame()`, `gameOver()`, `clearGame()`, 승리 조건 분기 등)
  - 실패/포기 경우는 `trackComplete()` 대상이 아니다

### Step 4. tracking.js 스크립트 태그 추가

HTML에서 다른 게임 스크립트들 **바로 앞**에 추가한다. `data-game` 값은 게임 디렉토리명 또는 제목을 기반으로 적절히 지정한다.

루트 디렉토리로부터의 상대 경로를 사용한다 (예: `../tracking.js`).

```html
<!-- ── 트래킹 ── -->
<script src="../tracking.js" data-game="게임이름"></script>
```

이미 `lang.js` 태그가 있으면 그 바로 앞에 추가한다.

### Step 5. trackPlay() 추가

Step 3에서 찾은 **게임 시작 지점 함수의 첫 줄**에 추가한다:

```javascript
if (typeof trackPlay === 'function') trackPlay();
```

### Step 6. trackComplete() 추가

Step 3에서 찾은 **게임 완료 지점 함수의 첫 줄**에 추가한다:

```javascript
if (typeof trackComplete === 'function') trackComplete();
```

---

## 규칙

- `typeof` 가드를 반드시 사용한다 — tracking.js 미포함 환경에서도 에러 없이 동작해야 한다
- 재시작(restart) 버튼 핸들러는 `trackPlay()`를 **호출하지 않는다** — 재시작 후 실제 게임 시작 함수가 다시 불릴 때 자연스럽게 호출된다
- 기존 코드를 최소한으로 수정한다 — 삽입 위치 외에는 변경하지 않는다
- `data-game` 값은 다른 게임들과 일관된 네이밍을 따른다 (예: `두더지 잡기`, `풍선 팡팡`, `방귀대장 뿡뿡이`)

## 완료 후 확인

1. `index.html`에 `<script src="../tracking.js" data-game="...">` 태그 존재 여부
2. 게임 시작 함수에 `trackPlay()` 호출 존재 여부
3. 게임 완료 함수에 `trackComplete()` 호출 존재 여부
4. 수정된 코드 위치를 사용자에게 요약 보고
