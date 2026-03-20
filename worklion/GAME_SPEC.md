# 와구와구 게임 v3 — 게임 기획서 & 구현 명세

> **목적:** 이 문서만 보고 동일한 게임을 처음부터 재현할 수 있도록 작성됨.
> **빌드:** 별도 빌드 없음. `python3 -m http.server 8000` 후 브라우저에서 접속.

---

## 1. 게임 개요

| 항목 | 내용 |
|------|------|
| 게임명 | 와구와구 게임 (Crocodile Lettuce v3) |
| 대상 | 자폐 아동 재활치료 |
| 장르 | 2D 캐주얼 모션인식 AR 게임 |
| 핵심 컨셉 | 아이가 직접 음식을 고르고, 양팔로 악어 입 제스처를 해서 와구와구 먹는 자유 놀이 게임 |
| 핵심 목표 | **'재미 PMF' 측정** — 자발적 플레이 시간 & 다시하기 의사 확인 |
| 입력 | MediaPipe Pose (웹캠) + 키보드/터치 fallback |
| 렌더링 | HTML5 Canvas 2D, 전체 뷰포트 |
| 사운드 | Web Audio API (합성음 + WAV 성우 녹음) |
| 외부 라이브러리 | MediaPipe Pose (CDN), Google Fonts Jua |

---

## 2. 버전별 변경사항

### v2 (v1 대비)

| 항목 | v1 | v2 |
|------|----|----|
| 음식 선택 | 없음 (양배추 고정) | 시작 시 음식 선택 화면 (19종, 4그룹) |
| 프로그래스 UI | 숫자 N/10 | 5개 이모지가 하나씩 "팡!" 하고 켜짐 |
| 클리어 목표 | 10개 | **5개** |
| 음식 종류 | 양배추만 | 과일/간식/디저트/사탕 19종 |
| 음식 이모지 렌더링 | 이미지 에셋 | `getEmojiImage()` 오프스크린 캔버스 캐싱 |
| 음성 | TTS만 | WAV 성우 녹음 (칭찬 + 준비/시작 + 음식별 보이스) |

### v3 (v2 대비)

| 항목 | v2 | v3 |
|------|----|----|
| 캐릭터 | 사자 (이미지 에셋) | **악어 (캔버스 드로잉 AR)** — 사용자 팔 위에 상악/하악, 몸통에 악어 몸 |
| 체력/물기 | 2번 물면 터짐 | **3번 물면 터짐** (아삭→으적→와구!) |
| 조작법 | 만세(양팔 올리기) = 입 벌림 | **악어 입 제스처** (한쪽 팔 위, 한쪽 아래로 벌리기) |
| 입 닫기 | 양팔 내리기 | **양손 모으기** (반대방향 감지, 같은방향 흔들기 무시) |
| 아이템 물리 | 중력+바운스 | **당구대 스타일** (0중력, 4면 완전 반사, 최소속도 120) |
| 아이템 판정 | 사자 입 고정 위치 | **악어 상악~하악(어깨~손가락끝) 사이 영역** |
| 자석 위치 | 사자 입 중심 | **입 끝 (양 손가락끝 중간점)** |
| 타이머 | 60초 카운트다운 | **제거** — 시간 제한 없는 자유 놀이 |
| 게임 종료 | 시간 종료 or 클리어 | **5개 마일스톤마다 축하 → "한번 더?/그만할래" 선택** |
| 씹기 이펙트 | 단일 사운드 | **3단계** (playBite→playMidCrunch→playCrunchBite) + 프로그레시브 파티클/쉐이크 |
| 씹기 UI | 없음 | **3단계 진행도 표시** (●●● 위에 N/3) |
| 입안 크기 | 고정 | **스무스 보간** (1.4x→0.85x→eaten) |
| 측정/로그 | 없음 | **EventLogger** — 이벤트 CSV 다운로드 (PMF 분석용) |
| 튜토리얼 | 없음 | **게임 시작 전 튜토리얼 영상** 재생 |

---

## 3. 핵심 게임플레이 루프

```
[시작] → [튜토리얼 영상] → [음식 선택] → [카운트다운] → [자유 놀이]
→ [음식 스폰 (당구대 바운스)] → [악어 입 범위 충돌] → [attracted → stuck]
→ [물기 3회 (아삭→으적→와구!)] → [폭발 + 점진적 메시지] → [다음 음식 스폰]
→ [5개 달성] → [축하 + "한번 더?/그만할래" 선택]
→ [한번 더!] → [다음 사이클 (음식 재선택)] → 반복...
→ [그만할래] → [시작 화면 + 로그 CSV 자동 다운로드]
```

### 조작법
- **악어 입 제스처:** 양팔을 앞으로 뻗은 뒤, 한쪽 팔 위 + 한쪽 팔 아래로 벌리면 악어 입 벌림 (양손목 Y좌표 차이 기반)
- **팔 모으기:** 벌렸던 양손을 다시 모으면 악어 입 닫힘 (스냅) → `tryBite()` 호출
- **반대방향 감지:** 양 손목이 반대 방향으로 움직일 때만 "벌림"으로 인식, 같은 방향(몸 흔들기)은 무시
- **키보드:** Space/Enter → 입 닫기 + 물기
- **터치:** 화면 터치 → 물기

### 악어 AR 렌더링
- **상악:** Y좌표가 더 높은 팔(어깨→손가락끝)을 따라 악어 상악 캔버스 드로잉 (눈, 콧구멍, 이빨, 비늘)
- **하악:** 나머지 팔을 따라 악어 하악 드로잉 (배, 이빨)
- **몸통:** 양 어깨 사이에 악어 몸통 타원 (배, 비늘 줄무늬)
- **얼굴 비가림:** 어깨 아래만 렌더링, 사용자 얼굴은 가리지 않음
- **손가락끝 확장:** MediaPipe landmark 19/20 (검지 끝) 사용, 안 보이면 팔꿈치→손목 방향 30% 연장

### 충돌 판정
- **악어 상악~하악 사이 영역 (어깨~손가락끝 4점의 바운딩 박스)** 안에 있는 음식만 자석 끌어옴
- 양배추 가장자리(반지름 포함)가 범위에 닿으면 OK
- **peakBounds:** 입이 벌어져 있을 때(jawOpen>0.02) 스냅샷 저장, 물기 시점에 사용 (닫힘 시 범위 축소 문제 방지)
- **자석 끌어오기 위치:** 입 끝 (양 손가락끝 중간점, `getMouthTip()`)

### 3단계 씹기 시스템
| 단계 | health | 상태 | 사운드 | 입안 크기 | 이펙트 |
|------|--------|------|--------|----------|--------|
| 1번째 물기 | 3→2 | CRUSH1 | playBite (아삭) | 1.4x (크게) | biteSparkle, shake(10) |
| 2번째 물기 | 2→1 | CRUSH2 | playMidCrunch (으적) | 0.85x (작게) | crush+sparkle, shake(20), 주황플래시 |
| 3번째 물기 | 1→0 | exploding | playCrunchBite (와구!) | — | 대폭발, shake(35), 금색플래시 |

### 사이클 시스템 (타이머 없음)
- **시간 제한 없음** — 아이가 원하는 만큼 자유롭게 플레이
- 사이클당 목표: **5개** 먹기 (`clearGoal: 5`)
- 5개 달성 → 축하 연출 → **"한번 더!" / "그만할래"** 버튼 표시
- "한번 더!" → 다음 사이클 (음식 재선택, 누적 점수 유지)
- "그만할래" → 시작 화면 복귀 + 로그 CSV 자동 다운로드

### 점진적 변화 (사이클 내)
- 먹은 수에 따라 **음식 크기 점진적 증가** (100% → 140%)
- 먹기 메시지도 변화: "+1 🍎" → "더 큰 🍎!" → "🍎🍎 두 개!" → "🍎🍎🍎 세 개!" → "초거대 🍎!!"

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

### 4.2 선택 화면 UI

- DOM 오버레이 (`food-select-overlay`), 전체화면 반투명 배경 + blur
- 제목: "오늘은 뭘 먹어볼까?" (40px, 금색)
- 그룹별 라벨 + 5열 그리드로 이모지 버튼 배치
- 버튼 터치 → `engine.selectFood(food)` 호출 → 오버레이 숨김 → 게임 시작
- 선택 시 해당 음식의 **음성 파일 재생** (`playFoodVoice`)

---

## 5. 파일 구조

```
project/
├── index.html          # UI, HUD, MediaPipe 연동, 게임 루프
├── engine.js           # 모든 게임 로직
├── GAME_SPEC.md        # 이 문서
└── assets/
    ├── head/               # (레거시 — 미사용, 악어는 캔버스 드로잉)
    │   ├── upper_jaw.png
    │   └── lower_jaw.png
    ├── lettuce/
    │   ├── lettuce_normal.png
    │   ├── lettuce_crush1.png
    │   └── lettuce_crush2.png
    ├── main screen/
    │   └── mainIcon.png
    ├── startBt/
    │   └── Subject.png
    ├── video/
    │   └── tutorial_video.mov
    └── voice/
        ├── cheer/               # 칭찬 음성 (성우 WAV)
        ├── ready-set-go/        # 준비/시작 음성
        └── food/                # 음식별 음성 (19개)
```

---

## 6. engine.js 클래스 상세 명세

### 6.1 Assets (싱글톤 객체)
레거시 이미지 로더. lion.upper/lower는 더 이상 렌더링에 사용되지 않음 (악어는 캔버스 드로잉).
lettuce crush 이미지 3종은 계속 사용.

### 6.2 getEmojiImage(emoji, size)
오프스크린 캔버스에 이모지를 미리 렌더링하고 캐싱.

### 6.3 SoundManager

| 메서드 | 설명 |
|--------|------|
| `playBite()` | 1번째 물기 "아삭" — 3레이어 합성음 |
| `playMidCrunch()` | 2번째 물기 "으적" — 중간 강도 사운드 |
| `playCrunchBite()` | 3번째 물기 "와구!" — 4레이어 합성음 |
| `playEatComplete()` | 완식 징글 |
| `playCrush()` | 으스러지는 소리 |
| `playFanfare()` | 게임 종료 팡파레 |
| `playSlotPick()` | 음식 선택 확정 사운드 |
| `startBGM()` / `stopBGM()` | 루프 BGM (BPM 160) |
| `loadCheerVoices()` | 칭찬 WAV 로드 |
| `loadReadyVoice()` | 준비/시작 WAV 로드 |
| `loadFoodVoices()` | 음식별 WAV 19개 로드 |
| `playPraise(text)` | 칭찬 음성 순서대로 재생 |
| `playFoodVoice(voiceKey)` | 특정 음식 음성 재생 |

### 6.4 Cabbage (음식 상태머신)

**상수:**
```javascript
const CABBAGE_MAX_HEALTH = 3;  // 3번 물어야 터짐
const CABBAGE_STATES = { NORMAL: 0, CRUSH1: 1, CRUSH2: 2 };
```

**Phase 전이:**
```
bouncing → attracted → stuck → exploding → dead
```

| Phase | 동작 |
|-------|------|
| `bouncing` | 0중력 당구대. 4면 벽 반사, 최소속도 120 유지 |
| `attracted` | 0.25초간 lerp로 입 끝(손가락끝 중간점)으로 이동 |
| `stuck` | 악어 입 끝에 고정, 크기 스무스 보간 |
| `exploding` | 0.08초간 scale 확대 + opacity 급감 → dead |

**`bite()` (3단계):**
- health 3→2: CRUSH1, crushScale 변형, stuckSizeMultiplier=1.4, return false
- health 2→1: CRUSH2, crushScale 변형, stuckSizeMultiplier=0.85, return false
- health 1→0: exploding 전이, return true (완전히 먹힘)

### 6.5 Lion (악어 AR 렌더러)

**포즈 기반 렌더링 — 이미지 에셋 미사용, 캔버스 드로잉만 사용.**

**핵심 메서드:**
| 메서드 | 설명 |
|--------|------|
| `setPose(data)` | index.html에서 매 프레임 포즈 데이터 전달 |
| `_getJawArms()` | 양 팔 중 Y가 높은 쪽=상악, 낮은 쪽=하악 판별 |
| `_getArmEnd(arm)` | 손가락끝(landmark 19/20) 또는 손목→30% 연장 |
| `_drawJaw(ctx, arm, isUpper)` | 악어 턱 캔버스 드로잉 (어깨→손가락끝 방향) |
| `_drawBody(ctx)` | 어깨 사이 악어 몸통 |
| `getCollisionBounds()` | 상악/하악 4점(어깨+손가락끝) 바운딩 박스 |
| `getBiteBounds()` | 물기 판정용 (jawOpen>0.02일 때 저장한 peakBounds) |
| `getMouthTip()` | 입 끝 (양 손가락끝 중간점) |

**상악 디테일:** 초록 머리형상, 눈(흰자+세로 슬릿 동공), 콧구멍 2개, 이빨 8개, 비늘 무늬, 물기 글로우
**하악 디테일:** 연초록, 밝은 배, 이빨 7개
**몸통:** 어깨 사이 타원, 초록+밝은배+비늘줄무늬

**포즈 없을 때 fallback:** 기본 위치에 간단한 악어 머리 캔버스 드로잉

### 6.6 ParticleSystem

| 이미터 | 개수 | 특징 |
|--------|------|------|
| `emitEat(x,y,intensity)` | 18*intensity | 이모지60%+원형. 중력500 |
| `emitCrush(x,y)` | 8 | 녹색 계열 작은 파티클 |
| `emitBiteSparkle(x,y)` | 6 | 흰색 작은 원, 방사형 |

### 6.7 FloatingText / ScreenShake / EndingSystem
- FloatingText: life 1.2초, 위로 떠오르며 사라짐
- ScreenShake: intensity 스택, random offset
- EndingSystem: 콘페티 3발, 별 등급, 점수 카운트업

### 6.8 GameEngine

**설정:**
```javascript
config = {
  cabbageSize: 140,
  fxIntensity: 1,
  maxCabbages: 5,
  spawnWaitSec: 10,
  clearGoal: 5
}
```

**tryBite() 플로우:**
1. 120ms 쿨다운 체크 (빠른 동작 대응, 연타 방지)
2. **stuck 음식 있으면** → `bite()` + 3단계별 사운드/이펙트
   - 1번째(health 3→2): 아삭! + playBite + shake(10)
   - 2번째(health 2→1): 으적! + playMidCrunch + shake(20) + 주황플래시
   - 3번째(health 1→0): 와구!! + playCrunchBite + 대폭발 + shake(35) + 금색플래시
3. **bouncing 음식 충돌** (peakBounds 내) → attracted → stuck, 아삭 사운드
4. **빈 물기** → 작은 쉐이크

---

## 7. index.html 상세 명세

### 7.1 MediaPipe Pose 연동

**사용 landmarks:**
- 11/12: 양 어깨 (위치, 스케일)
- 13/14: 양 팔꿈치
- 15/16: 양 손목 (입 벌림 감지)
- 19/20: 양 검지 끝 (악어 입 끝, 충돌 영역 확장)
- 23/24: 양 힙
- 0: 코

**입 열기/닫기 감지 (반대방향 필터링):**
```javascript
// 양 손목 Y 속도 추적
const lwVelY = lw.y - prevLwY;
const rwVelY = rw.y - prevRwY;
// 반대방향 점수: 양 손목이 반대로 움직이면 양수
const oppositeScore = -(lwVelY * rwVelY);

// jawAmount = 양 손목 Y 차이 기반
// jawPeak: 반대방향일 때만 갱신 (같은방향 흔들기 무시)
if (jawAmount > jawPeak && oppositeScore > 0.00001) jawPeak = jawAmount;
// 물기: 피크 0.12 이상 + 현재 0.04 이하 + 150ms 쿨다운
if (jawPeak >= 0.12 && jawAmount <= 0.04) → tryBite()
// 피크 서서히 감쇠 (오래된 피크 오발 방지)
```

### 7.2 게임 루프 (렌더링 순서)
```
1. engine.tick(ts)
2. ctx.clearRect
3. ctx.save + screenShake translate
4. 카메라 배경 (미러링) 또는 그라디언트
5. 스켈레톤 (디버그 모드)
6. 악어 하악 drawLowerJaw (+ 몸통)
7. 악어 상악 drawUpperJaw
8. 음식 draw — getEmojiImage 사용
9. 씹기 진행도 UI (3단계 ●●●)
10. 파티클 draw
11. 플로팅텍스트 draw
12. 플래시 오버레이
13. 디버그 충돌 범위 (빨간 사각형)
14. 엔딩 draw
15. ctx.restore
16. HUD 업데이트 (DOM)
```

---

## 8. 시각 이펙트 상수 요약

| 이벤트 | screenShake | flash | particles |
|--------|-------------|-------|-----------|
| 빈 물기 | (4, 0.15) | — | — |
| 1번째 물기 (아삭) | (10, 0.2) | white 0.2 | biteSparkle |
| 2번째 물기 (으적) | (20, 0.35) | orange 0.35 | crush + biteSparkle |
| 3번째 물기 (와구!) | (35, 0.6) + 120ms후 (18, 0.3) | gold 0.7 + white 0.25 | emitEat(5) |
| 첫 잡기 (attracted) | (6, 0.15) | white 0.12 | biteSparkle + crush |
| 게임 종료 | (15, 0.4) | gold 0.6 | — |

---

## 9. 이벤트 로거 (PMF 측정)

### 수집 이벤트

| 이벤트 | 시점 | 추가 데이터 |
|--------|------|-------------|
| `session_start` | 게임 시작 | timestamp |
| `food_selected` | 음식 선택 | food, emoji, cycle |
| `eat` | 음식 완전히 먹힘 | type, food, cycleEaten, totalEaten, playTime |
| `bite` (miss) | 빈 물기 | result='miss', playTime |
| `cycle_complete` | 5개 마일스톤 달성 | cycle, score, cycleEaten, playTime |
| `choice` | "한번 더?/그만할래" 선택 | choice, reactionMs, cycle, playTime |
| `choice_timeout` | 10초 무응답 | playTime |
| `retry` | 다음 사이클 시작 | cycle, totalScore, playTime |

### 핵심 지표

| 지표 | 의미 | 계산 |
|------|------|------|
| **자발적 반복 횟수** | 재미 PMF 핵심 | `retry` 이벤트 수 |
| **총 플레이 시간** | 참여 지속성 | 마지막 이벤트 playTime |
| **선택 반응 시간** | 다시하기 즉각성 | choice.reactionMs |
| **빈 물기 비율** | 난이도 적합성 | miss / (miss + eat) |
| **음식 다양성** | 탐색 vs 고정 | 고유 food_selected 수 |

---

## 10. 재현 시 주의사항

1. **악어는 캔버스 드로잉**: 이미지 에셋 미사용. `_drawJaw()`로 직접 그림
2. **3-hit 시스템**: CABBAGE_MAX_HEALTH = 3, 3단계 크러시 (NORMAL→CRUSH1→CRUSH2→eaten)
3. **당구대 물리**: gravity=0, bounciness=1.0, 4면 반사, 최소속도 120
4. **반대방향 감지**: 양 손목 Y속도 곱이 음수(반대방향)일 때만 jawPeak 갱신
5. **peakBounds**: 입이 벌어져 있을 때 저장, 물기 판정에 사용 (닫힐 때 범위 축소 방지)
6. **손가락끝 확장**: MediaPipe landmark 19/20 사용, visibility<0.3이면 손목→30% 연장
7. **카메라 미러링**: drawImage 전 `ctx.translate(CW, 0); ctx.scale(-1, 1)` + 포즈 x좌표도 `1 - x`
8. **stuck 위치**: `getMouthTip()` = 양 손가락끝 중간점
9. **게임 종료 후 freeze 방지**: lion/particles/shake는 `!running`이어도 계속 update
10. **터치 이벤트**: `{ passive: true }` 필수
11. **120ms 엔진 쿨다운**: tryBite() 내부에서 연타 방지
