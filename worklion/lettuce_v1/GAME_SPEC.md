# 와구와구 게임 v2 — 게임 기획서 & 구현 명세

> **목적:** 이 문서만 보고 동일한 게임을 처음부터 재현할 수 있도록 작성됨.
> **빌드:** 별도 빌드 없음. `python3 -m http.server 8000` 후 브라우저에서 접속.

---

## 1. 게임 개요

| 항목 | 내용 |
|------|------|
| 게임명 | 와구와구 게임 (Lion Lettuce v2) |
| 대상 | 자폐 아동 재활치료 |
| 장르 | 2D 캐주얼 모션인식 게임 |
| 핵심 컨셉 | 아이가 직접 음식을 고르고, 사자로 와구와구 먹는 게임 |
| 입력 | MediaPipe Pose (웹캠) + 키보드/터치 fallback |
| 렌더링 | HTML5 Canvas 2D, 전체 뷰포트 |
| 사운드 | Web Audio API (합성음 + WAV 성우 녹음) |
| 외부 라이브러리 | MediaPipe Pose (CDN), Google Fonts Jua |

---

## 2. v1 대비 변경사항 (v2 핵심)

| 항목 | v1 | v2 |
|------|----|----|
| 음식 선택 | 없음 (양배추 고정) | 시작 시 음식 선택 화면 (19종, 4그룹) |
| 체력/물기 | 3번 물어야 터짐 | **2번 물면 터짐** |
| 프로그래스 UI | 숫자 N/10 | 5개 이모지가 하나씩 "팡!" 하고 켜짐 |
| 클리어 목표 | 10개 | **5개** |
| HP 표시 | 💚💚💚 하트 | 삭제 |
| 음식 종류 | 양배추만 | 과일/간식/디저트/사탕 19종 |
| 음식 이모지 렌더링 | 이미지 에셋 | `getEmojiImage()` 오프스크린 캔버스 캐싱 |
| 음성 | TTS만 | WAV 성우 녹음 (칭찬 + 준비/시작 + 음식별 보이스) |

---

## 3. 핵심 게임플레이 루프

```
[음식 선택 화면] → [음식 터치] → [음식 스폰 (바운싱)]
→ [사자 입 범위 충돌] → [attracted → stuck]
→ [물기 2회 (health 2→1→0)] → [폭발 + 점수 +1] → [다음 음식 스폰]
→ [5개 달성] → [레벨 클리어]
```

### 조작법
- **만세 (팔 올리기):** 사자 입 벌림 (jawOpen → 1.0)
- **팔 내리기:** 사자 입 닫힘 (스냅) → `tryBite()` 호출
- **키보드:** Space/Enter → 입 닫기 + 물기
- **터치:** 화면 터치 → 물기

### 레벨 시스템
- 레벨당 60초, 목표: **5개** 먹기 (`clearGoal: 5`)
- 목표 달성 → 레벨 클리어, Space로 다음 레벨
- 시간 종료 → 게임 오버, Space로 처음부터

---

## 4. 음식 선택 시스템

### 4.1 음식 그룹 (FOOD_GROUPS)

게임 시작 시 "오늘은 뭘 먹어볼까?" 화면이 표시되고, 아이가 원하는 음식을 직접 선택.

| 그룹 | label | 음식 목록 |
|------|-------|----------|
| 과일 | 과일 | 🍎사과, 🍌바나나, 🍇포도, 🍓딸기, 🍑복숭아, 🍊귤, 🍉수박, 🍒체리 |
| 간식 | 간식 | 🍕피자, 🍔햄버거, 🍟감자튀김, 🌭핫도그 |
| 디저트 | 디저트 | 🍩도넛, 🍰케이크, 🧁컵케이크, 🍦아이스크림, 🍪쿠키, 🍫초콜릿 |
| 사탕 | 사탕 | 🍭막대사탕, 🍬사탕, 🧃주스 |

### 4.2 데이터 구조

```javascript
const FOOD_GROUPS = [
  { label: '과일', items: [
    { emoji: '🍎', name: '사과', voice: 'apple' },
    { emoji: '🍌', name: '바나나', voice: 'banana' },
    { emoji: '🍇', name: '포도', voice: 'grape' },
    { emoji: '🍓', name: '딸기', voice: 'strawberry' },
    { emoji: '🍑', name: '복숭아', voice: 'peach' },
    { emoji: '🍊', name: '귤', voice: 'tangerine' },
    { emoji: '🍉', name: '수박', voice: 'watermelon' },
    { emoji: '🍒', name: '체리', voice: 'cherry' },
  ]},
  { label: '간식', items: [
    { emoji: '🍕', name: '피자', voice: 'pizza' },
    { emoji: '🍔', name: '햄버거', voice: 'hamburger' },
    { emoji: '🍟', name: '감자튀김', voice: 'fries' },
    { emoji: '🌭', name: '핫도그', voice: 'hotdog' },
  ]},
  { label: '디저트', items: [
    { emoji: '🍩', name: '도넛', voice: 'donut' },
    { emoji: '🍰', name: '케이크', voice: 'cake' },
    { emoji: '🧁', name: '컵케이크', voice: 'cupcake' },
    { emoji: '🍦', name: '아이스크림', voice: 'icecream' },
    { emoji: '🍪', name: '쿠키', voice: 'cookie' },
    { emoji: '🍫', name: '초콜릿', voice: 'chocolate' },
  ]},
  { label: '사탕', items: [
    { emoji: '🍭', name: '막대사탕', voice: 'lollipop' },
    { emoji: '🍬', name: '사탕', voice: 'candy' },
    { emoji: '🧃', name: '주스', voice: 'juice' },
  ]},
];
const FOODS = FOOD_GROUPS.flatMap(g => g.items); // 평탄화 배열 (19개)
```

### 4.3 선택 화면 UI

- DOM 오버레이 (`food-select-overlay`), 전체화면 반투명 배경 + blur
- 제목: "오늘은 뭘 먹어볼까?" (40px, 금색)
- 그룹별 라벨 + 5열 그리드로 이모지 버튼 배치
- 버튼 터치 → `engine.selectFood(food)` 호출 → 오버레이 숨김 → 게임 시작
- 선택 시 해당 음식의 **음성 파일 재생** (`playFoodVoice`)

### 4.4 선택 흐름

```
engine.start() → onShowFoodSelect 콜백 → DOM 오버레이 표시
→ _waitingForSelection = true (타이머 정지, 물기 차단)
→ 버튼 클릭 → engine.selectFood(food)
→ selectedVegetable 설정, _waitingForSelection = false
→ 음식 보이스 재생 + 음식 스폰
```

레벨 클리어 후 `startNextLevel()`에서도 동일하게 선택 화면 표시.

---

## 5. 파일 구조

```
project/
├── index.html          # UI, HUD, MediaPipe 연동, 게임 루프
├── engine.js           # 모든 게임 로직
├── GAME_SPEC.md        # 이 문서
└── assets/
    ├── head/
    │   ├── upper_jaw.png    # 상악 (349×306 원본)
    │   └── lower_jaw.png    # 하악 (253×151 원본)
    ├── lettuce/
    │   ├── lettuce_normal.png
    │   ├── lettuce_crush1.png
    │   └── lettuce_crush2.png
    ├── main screen/
    │   └── mainIcon.png     # 시작화면 아이콘
    ├── startBt/
    │   └── Subject.png      # 시작 버튼 이미지
    └── voice/
        ├── cheer/               # 칭찬 음성 (성우 WAV)
        │   ├── voice_cheer_04.wav
        │   ├── voice_cheer_07.wav
        │   ├── voice_cheer_09.wav
        │   └── voice_cheer_12.wav
        ├── ready-set-go/        # 준비/시작 음성
        │   └── voice_ready_start.wav
        └── food/                # 음식별 음성 (19개)
            ├── apple.wav        # "사과"
            ├── banana.wav       # "바나나"
            ├── grape.wav        # "포도"
            ├── strawberry.wav   # "딸기"
            ├── peach.wav        # "복숭아"
            ├── tangerine.wav    # "귤"
            ├── watermelon.wav   # "수박"
            ├── cherry.wav       # "체리"
            ├── pizza.wav        # "피자"
            ├── hamburger.wav    # "햄버거"
            ├── fries.wav        # "감자튀김"
            ├── hotdog.wav       # "핫도그"
            ├── donut.wav        # "도넛"
            ├── cake.wav         # "케이크"
            ├── cupcake.wav      # "컵케이크"
            ├── icecream.wav     # "아이스크림"
            ├── cookie.wav       # "쿠키"
            ├── chocolate.wav    # "초콜릿"
            ├── lollipop.wav     # "막대사탕"
            ├── candy.wav        # "사탕"
            └── juice.wav        # "주스"
```

---

## 6. engine.js 클래스 상세 명세

### 6.1 Assets (싱글톤 객체)
```javascript
Assets = {
  lion: { upper: null, lower: null },
  lettuce: { normal: null, crush1: null, crush2: null },
  loaded: false,
  load(basePath = 'assets') → Promise  // 5개 이미지 로드
}
```

### 6.2 getEmojiImage(emoji, size)

캔버스에 이모지를 직접 `fillText`하면 카메라 배경 위에서 반투명하게 보이는 문제 해결.

```javascript
// 오프스크린 캔버스에 이모지를 미리 렌더링하고 캐싱
const _emojiCache = {};
function getEmojiImage(emoji, size) {
  const key = emoji + '|' + size;
  if (_emojiCache[key]) return _emojiCache[key];
  const off = document.createElement('canvas');
  off.width = size * 1.2; off.height = size * 1.2;
  const octx = off.getContext('2d');
  octx.font = `${size}px serif`;
  octx.textAlign = 'center'; octx.textBaseline = 'middle';
  octx.fillText(emoji, off.width/2, off.height/2);
  _emojiCache[key] = off;
  return off;
}
```

사용처:
- Cabbage.draw() — 인게임 음식 이모지
- 프로그래스 UI (DOM이므로 CSS로 처리)

### 6.3 SoundManager

Web Audio API 기반. 합성음 + WAV 파일 재생.

| 메서드 | 설명 |
|--------|------|
| `init()` | AudioContext 생성, resume |
| `playBite()` | 첫 물기 "아삭" — 3레이어 합성음 |
| `playCrunchBite()` | stuck 양배추 물기 "와구작" — 4레이어 합성음 |
| `playEatComplete()` | 완식 징글 — square + 상승 멜로디 |
| `playCrush()` | 으스러지는 소리 — sawtooth |
| `playFanfare()` | 게임 종료 팡파레 — 7음 멜로디 |
| `playSlotTick(pitch)` | 틱 사운드 (미사용, 레거시) |
| `playSlotPick()` | 음식 선택 확정 사운드 — 3음 트라이앵글 |
| `startBGM()` / `stopBGM()` | 루프 BGM (BPM 160, C→G→Am→F) |
| `loadCheerVoices(basePath)` | 칭찬 WAV 4개 로드 |
| `loadReadyVoice(basePath)` | 준비/시작 WAV 로드 |
| `loadFoodVoices(basePath)` | 음식별 WAV 19개 로드 |
| `playReady()` | 준비/시작 음성 재생 |
| `playPraise(text)` | 칭찬 음성 순서대로 재생 |
| `playFoodVoice(voiceKey)` | 특정 음식 음성 재생 |

**음식 보이스 재생 시점:**
1. **선택 시** — `selectFood()` 에서 `playFoodVoice(food.voice)` 호출
2. **물 때마다** — `tryBite()` 에서 매 물기마다 `playFoodVoice()` 호출

### 6.4 Cabbage (음식 상태머신)

**상수 (v2 변경):**
```javascript
const CABBAGE_MAX_HEALTH = 2;  // v1: 3 → v2: 2
const CABBAGE_STATES = { NORMAL: 0, CRUSH1: 1 };  // CRUSH2 삭제
```

**생성자 파라미터:** `(x, y, vx, vy, size, canvasW, canvasH)`

**추가 프로퍼티:** `vegEmoji` — 선택된 음식의 이모지 (스폰 시 설정)

**Phase 전이:**
```
bouncing → attracted → stuck → exploding → dead
```

| Phase | 동작 |
|-------|------|
| `bouncing` | 중력(350) + 바운스(0.72). 벽/바닥 반사 |
| `attracted` | 0.25초간 lerp(t=dt*18)으로 입 방향 이동 |
| `stuck` | 사자 턱 사이에 고정 |
| `exploding` | 0.08초간 scale 확대 + opacity 급감 → dead |

**`bite()` (v2):**
- health 2 → 1: CRUSH1 상태, 시각 변형, return false
- health 1 → 0: exploding 전이, return true (완전히 먹힘)

**이모지 렌더링:**
```javascript
draw(ctx) {
  // vegEmoji가 있으면 getEmojiImage()로 렌더링
  // 드롭 쉐도우만 적용 (동그라미 배경 없음)
  const img = getEmojiImage(this.vegEmoji, drawSize);
  ctx.filter = `drop-shadow(0 3px 6px rgba(0,0,0,0.4))`;
  ctx.drawImage(img, ...);
  ctx.filter = 'none';
}
```

### 6.5 Lion (분리 턱 사자)

**핵심 치수:**
```javascript
UPPER_W = 340, UPPER_H = 340 * (306/349) ≈ 298.6
LOWER_W = 240, LOWER_H = 240 * (151/253) ≈ 143.2
jawMaxOffset = 60  // 하악 최대 열림 픽셀
```

**턱 스냅 속도:**
- 닫힐 때: speed = 35 (빠름)
- 열릴 때: speed = 20

**렌더링:**
- 상악: `drawImage(upper, -UPPER_W/2, -UPPER_H*0.72, UPPER_W, UPPER_H)`
- 하악: `drawImage(lower, -LOWER_W/2, 0, LOWER_W, LOWER_H)` — jawDown만큼 아래로
- 하악 아래에 bellyScale 타원 (먹으면 커짐)
- 상악에 maneGlow (물면 금색 섀도우)

**충돌 범위:** 상악 top ~ 하악 bottom 전체 사각형

### 6.6 ParticleSystem

| 이미터 | 개수 | 특징 |
|--------|------|------|
| `emitEat(x,y,intensity)` | 18*intensity | 이모지60%+원형. 중력500 |
| `emitCrush(x,y)` | 8 | 녹색 계열 작은 파티클 |
| `emitBiteSparkle(x,y)` | 6 | 흰색 작은 원, 방사형 |

### 6.7 FloatingText
- `add(text, x, y, color, size)` — life: 1.2초
- 매 프레임 y -= 40*dt, alpha = 1-age/life
- 바운스 스케일: `1 + sin(age*8)*0.06`

### 6.8 ScreenShake
```javascript
trigger(intensity, duration)
// intensity는 Math.max로 스택
// offset = random * intensity * (timer/duration)
```

### 6.9 EndingSystem
- 초기 폭발 콘페티 3발 (각 40개, 총 120개)
- 텍스트 오버레이 (캔버스에 직접 그림)
- 별 등급 (최대 3개), 점수 카운트업, 격려 메시지

### 6.10 GameEngine

**설정:**
```javascript
config = {
  cabbageSize: 140,
  fxIntensity: 1,
  maxCabbages: 5,
  spawnWaitSec: 10,
  clearGoal: 5        // v1: 10 → v2: 5
}
timeLeft = 60, totalTime = 60
```

**핵심 프로퍼티:**
- `selectedVegetable` — 현재 선택된 음식 객체 `{ emoji, name, voice }`
- `_waitingForSelection` — true이면 타이머 정지, 물기 차단
- `onShowFoodSelect` — 콜백, index.html에서 설정

**selectFood(food):**
```javascript
selectFood(food) {
  this.selectedVegetable = food;
  this._waitingForSelection = false;
  this.sound.playSlotPick();
  this.sound.playFoodVoice(food.voice);  // 음식 이름 음성
  this.spawnCabbage();
}
```

**spawnCabbage():**
- 스폰 시 `c.vegEmoji = this.selectedVegetable.emoji` 설정

**tryBite() 플로우:**
1. `_waitingForSelection`이면 무시
2. **stuck 음식 있으면** → `bite()` + 와구작 크런치 + **음식 보이스 재생**
   - 완전히 먹힘: score++, totalEaten++, 대폭발, 금색 플래시, 칭찬 음성
   - 아직 남음: 쉐이크, 크러시 파티클
3. **bouncing 음식 충돌** → attracted → stuck, 물기 사운드 + **음식 보이스 재생**
4. **빈 물기** → 작은 쉐이크

**인게임 칭찬 텍스트 (praisePool):**
```javascript
['잘했어!', '대단해!', '최고야!', '멋져!', '와 잘한다!', '굿!']
```

**게임 종료 칭찬 (endPraise):**
| 조건 | 텍스트 |
|------|--------|
| 5개 목표 달성 | "레벨 클리어! 대단해!" |
| 점수 10+ 타임오버 | "대단해요! 정말 최고야!" |
| 점수 5+ 타임오버 | "와 정말 잘했어!" |
| 점수 1+ 타임오버 | "잘했어요!" |
| 점수 0 타임오버 | "수고했어요!" |

---

## 7. index.html 상세 명세

### 7.1 시작 화면 (Start Overlay)
- 풀스크린 오버레이, 배경 `linear-gradient(160deg, #FFF6E8, #F0FFF6)`
- mainIcon.png (160px)
- 제목 "와구와구 게임" (72px, #3a6e28)
- Subject.png 시작 버튼 (320px, 호버 1.08배)
- 배경 이모지 파티클 40개 + 반짝이 도트 25개

### 7.2 카운트다운
- "준비" (0.5초 후 표시) → "시작!" (2.0초 후 표시) → 게임 시작 (2.9초)
- 준비/시작 WAV 음성 재생 (`playReady()`)

### 7.3 음식 선택 화면 (Food Select Overlay)
```html
<div class="food-select-overlay" id="foodSelectOverlay">
  <div class="food-select-title">오늘은 뭘 먹어볼까?</div>
  <div class="food-select-grid" id="foodSelectGrid">
    <!-- JS로 동적 생성: 그룹 라벨 + 5열 그리드 -->
  </div>
</div>
```

**CSS:**
- 오버레이: `rgba(0,0,0,0.6)`, `backdrop-filter: blur(4px)`
- 그리드: flex column, 그룹별 라벨(22px 흰색) + 5열 그리드
- 버튼: 48px 이모지, 흰색 배경, 20px radius, 호버 시 1.15배 + 금색 테두리

### 7.4 인게임 HUD

| 요소 | 위치 | 설명 |
|------|------|------|
| 프로그래스 | 좌상단 | 5개 이모지 (선택된 음식), dimmed → lit 전환 + `progress-pop` 애니메이션 |
| 원형 타이머 | 우상단 | SVG circle, 10초 이하 빨간색 + pulse |
| 포즈 상태 | 좌하단 | idle/ready/detected/noperson |
| 힌트 | 하단 중앙 | "🦁 만세 → 입 벌림 · 팔 내리면 와구! (2번 물면 터짐!)" |
| 디버그 버튼 | 우하단 | 디버그, 추가, 강제클리어 |

**프로그래스 CSS:**
```css
.progress-dot {
  font-size: 36px;
  filter: grayscale(1) brightness(0.4);  /* dimmed */
  transform: scale(0.85);
}
.progress-dot.lit {
  filter: none;  /* 불 켜짐 */
  transform: scale(1);
  animation: progress-pop 0.5s cubic-bezier(0.34,1.56,0.64,1);
}
@keyframes progress-pop {
  0% { transform: scale(0.5) rotate(-15deg); }
  50% { transform: scale(1.4) rotate(8deg); }
  100% { transform: scale(1) rotate(0); }
}
```

### 7.5 MediaPipe Pose 연동

**CDN:**
```
@mediapipe/camera_utils/camera_utils.js
@mediapipe/pose/pose.js
```

**포즈 → 사자 위치:**
```javascript
lion.x = (1 - (ls.x + rs.x) / 2) * CW;  // 좌우 미러링
// 코(landmark 0)로 턱 위치 추정
chinY = noseY + (shoulderY - noseY) * 0.7;
lion.y = chinY + UPPER_H * 0.72 * sc * 0.3;
// 어깨 폭으로 스케일 결정
targetScale = clamp(0.3, shoulderWidthPx / UPPER_W * 1.3, 2.0);
```

**입 열기/닫기:**
```javascript
const avgUp = ((ls.y - lw.y) + (rs.y - rw.y)) / 2;
const jawAmount = avgUp > 0.12 ? min(1, avgUp / 0.2) : 0;
// 팔 내림(prevJaw >= 0.3 → jawAmount <= 0.05) = tryBite() (400ms 쿨다운)
```

### 7.6 게임 루프 (렌더링 순서)
```
1. engine.tick(ts)
2. ctx.clearRect
3. ctx.save + screenShake translate
4. 카메라 배경 (미러링) 또는 그라디언트
5. 스켈레톤 (디버그 모드)
6. 하악 drawLowerJaw
7. 상악 drawUpperJaw
8. 음식(양배추) draw — getEmojiImage 사용
9. 파티클 draw
10. 플로팅텍스트 draw
11. 플래시 오버레이
12. 엔딩 draw
13. ctx.restore
14. HUD 업데이트 (DOM)
```

---

## 8. 시각 이펙트 상수 요약

| 이벤트 | screenShake | flash | particles |
|--------|-------------|-------|-----------|
| 빈 물기 | (4, 0.15) | — | — |
| 첫 물기 (attracted) | (6, 0.15) | white 0.12 | biteSparkle + crush |
| 와구작 크런치 | (16, 0.3) | white 0.3 | biteSparkle + crush |
| 완식 폭발 | (35, 0.6) + 120ms후 (18, 0.3) | gold 0.7 + 120ms후 white 0.25 | emitEat(intensity=5) |
| 게임 종료 | (15, 0.4) | gold 0.6 | — |

---

## 9. 사운드 에셋 명세

### 9.1 성우 녹음 파일

**칭찬 음성** (`assets/voice/cheer/`):
- 현재 4개 WAV 파일, 순서대로 순환 재생
- 음식 먹을 때마다 1개씩 재생

**준비/시작** (`assets/voice/ready-set-go/`):
- `voice_ready_start.wav` — 카운트다운 시 재생

**음식별 음성** (`assets/voice/food/`):
- 각 음식 이름을 성우가 녹음한 WAV 파일
- **재생 시점:** (1) 선택 화면에서 음식 터치 시, (2) 인게임에서 물 때마다

| 파일명 | 한국어 | 그룹 |
|--------|--------|------|
| apple.wav | 사과 | 과일 |
| banana.wav | 바나나 | 과일 |
| grape.wav | 포도 | 과일 |
| strawberry.wav | 딸기 | 과일 |
| peach.wav | 복숭아 | 과일 |
| tangerine.wav | 귤 | 과일 |
| watermelon.wav | 수박 | 과일 |
| cherry.wav | 체리 | 과일 |
| pizza.wav | 피자 | 간식 |
| hamburger.wav | 햄버거 | 간식 |
| fries.wav | 감자튀김 | 간식 |
| hotdog.wav | 핫도그 | 간식 |
| donut.wav | 도넛 | 디저트 |
| cake.wav | 케이크 | 디저트 |
| cupcake.wav | 컵케이크 | 디저트 |
| icecream.wav | 아이스크림 | 디저트 |
| cookie.wav | 쿠키 | 디저트 |
| chocolate.wav | 초콜릿 | 디저트 |
| lollipop.wav | 막대사탕 | 사탕 |
| candy.wav | 사탕 | 사탕 |
| juice.wav | 주스 | 사탕 |

### 9.2 합성음 (Web Audio API)

| 사운드 | 설명 |
|--------|------|
| playBite() | 3레이어: square(400→80Hz) + 크런치노이즈(HP1800/LP6000) + 서브(120→40Hz) |
| playCrunchBite() | 4레이어: square더블탭 + bandpass노이즈(2800Hz) + sawtooth(1200→300) + 서브(90→25Hz) |
| playEatComplete() | square임팩트 + 상승 멜로디(523→1047Hz, 4음) |
| playCrush() | sawtooth(300→100Hz) |
| playFanfare() | 7음 멜로디(523→1318Hz) |
| playSlotPick() | 3음 트라이앵글(880, 1108, 1320Hz) |
| BGM | BPM 160, 코드: C→G→Am→F, 4파트(패드+베이스+멜로디+하이햇) |

---

## 10. 재현 시 주의사항

1. **이모지 투명도 문제**: 캔버스에 `fillText`로 이모지를 그리면 카메라 배경 위에서 반투명하게 보임. 반드시 `getEmojiImage()`로 오프스크린 캔버스에 미리 렌더링 후 `drawImage()` 사용
2. **2-hit 시스템**: v1의 3-hit가 아님. CABBAGE_MAX_HEALTH = 2, CRUSH2 상태 없음
3. **clearGoal = 5**: v1의 10이 아님
4. **카메라 미러링**: drawImage 전 `ctx.translate(CW, 0); ctx.scale(-1, 1)` + 포즈 x좌표도 `1 - x`
5. **상악 오프셋**: `-UPPER_H * 0.72` (상악의 72%가 y 위에 위치)
6. **stuck 위치**: `lion.y + UPPER_H * 0.28 * sc + jawDown * 0.35`
7. **게임 종료 후 freeze 방지**: lion/particles/shake는 `!running`이어도 계속 update
8. **터치 이벤트**: `{ passive: true }` 필수
9. **음식 보이스 로드**: `loadFoodVoices()`는 `init()`에서 `loadCheerVoices()`, `loadReadyVoice()`와 함께 호출
10. **_waitingForSelection**: true일 때 `tick()`은 early return (타이머 정지), `tryBite()`도 무시
