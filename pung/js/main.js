// ============================================================
//  main.js  — 게임 루프, 포즈 감지, 렌더링 (이미지 에셋 포함)
//  2인 지원: MoveNet MultiPose Lightning
// ============================================================

// ── MoveNet 키포인트 인덱스 (COCO 17) ──────────────────────
const LM = {
  NOSE: 0,
  L_EYE: 1, R_EYE: 2,
  L_SHOULDER: 5, R_SHOULDER: 6,
  L_HIP: 11, R_HIP: 12,
};

// ── 레벨별 테마 (빨주노초파보 + 무지개 7단계) ──────────────
const LEVEL_THEMES = [
  { gasHue:   0, label: '빨강',   gaugeGrad: ['#ff6b6b','#ee0979'], rainbow: false },
  { gasHue:  28, label: '주황',   gaugeGrad: ['#ffb347','#ff6600'], rainbow: false },
  { gasHue:  55, label: '노랑',   gaugeGrad: ['#fff176','#f9d423'], rainbow: false },
  { gasHue: 120, label: '초록',   gaugeGrad: ['#a8e063','#56ab2f'], rainbow: false },
  { gasHue: 210, label: '파랑',   gaugeGrad: ['#43b0f1','#1a73e8'], rainbow: false },
  { gasHue: 270, label: '보라',   gaugeGrad: ['#c471ed','#7b2ff7'], rainbow: false },
  { gasHue:  -1, label: '무지개', gaugeGrad: ['#ff0080','#8000ff'], rainbow: true  },
];

function theme() {
  return LEVEL_THEMES[Math.min(level - 1, LEVEL_THEMES.length - 1)];
}

// 무지개 레벨에서 현재 hue (시간 기반 사이클)
function currentHue() {
  if (theme().rainbow) return (Date.now() / 8) % 360;
  return theme().gasHue;
}

// ============================================================
//  다국어 (한/영)
// ============================================================
const LANG = {
  ko: {
    pageTitle:        '💨 방귀대장 뿡뿡이',
    gameTitle:        '방귀대장 뿡뿡이',
    subtitle:         '앉았다 일어나면<br>방귀가 나와요!',
    subtitle2:        n => `방귀를 <strong id="display-target">${n}</strong>번 뀌면<br>💩이 날아가요!`,
    settingFartCount: '방귀 횟수',
    opt3: '3번', opt5: '5번', opt7: '7번', opt10: '10번',
    settingVolume:    '소리 크기',
    settingEffect:    '이펙트',
    effectLow: '약하게', effectMedium: '보통', effectStrong: '강하게',
    settingFever:     '피버타임',
    fever3: '3초', fever5: '5초', fever7: '7초',
    btnStart:         '시작하기! 🚀',
    btnStartLoading:  '모델 로딩 중... ⏳',
    calibTitle:       '게임을 진행할 위치에 서 주세요!',
    calibSub:         '3초 동안 기다려요…',
    introTitle:       '🌈 무지개 똥을 완성해봐요! 🌈',
    introSub:         '방귀를 모아서 색깔 똥을 하나씩 쌓아요!',
    levelAnnNext:     '다음은',
    feverTitle:       '🔥 피버타임!! 🔥',
    gaugeLabel:       '💨 방귀 게이지',
    fartCountLabel:   '💨 총 방귀',
    endTitle:         '게임 클리어!',
    endSub:           '7단계 모두 완주했어요! 최고야!',
    endFartLabel:     '💨 총 방귀 횟수',
    btnRestart:       '다시 하기! 🔄',
    countdownStart:   '시작!',
    hint:             '🦵 무릎을 굽혔다 펴 보세요! 🦵',
    fartTexts:        ['뿌우우웅!!', '뽕!!', '빵!', '뿌직!!', '뿌웅!!', '뿌우우우웅!!'],
    levelNames:       ['빨강', '주황', '노랑', '초록', '파랑', '보라', '무지개'],
  },
  en: {
    pageTitle:        '💨 Fart King Boomie',
    gameTitle:        'Fart King Boomie',
    subtitle:         'Squat down and stand up<br>to make a fart!',
    subtitle2:        n => `Fart <strong id="display-target">${n}</strong> times to launch 💩!`,
    settingFartCount: 'Fart Count',
    opt3: '3x', opt5: '5x', opt7: '7x', opt10: '10x',
    settingVolume:    'Volume',
    settingEffect:    'Effects',
    effectLow: 'Mild', effectMedium: 'Normal', effectStrong: 'Strong',
    settingFever:     'Fever Time',
    fever3: '3s', fever5: '5s', fever7: '7s',
    btnStart:         'Start! 🚀',
    btnStartLoading:  'Loading... ⏳',
    calibTitle:       'Stand where you will play!',
    calibSub:         'Hold still for 3 seconds…',
    introTitle:       '🌈 Complete the Rainbow Poop! 🌈',
    introSub:         'Collect farts to stack up colorful poops!',
    levelAnnNext:     'Next up',
    feverTitle:       '🔥 FEVER TIME!! 🔥',
    gaugeLabel:       '💨 Fart Gauge',
    fartCountLabel:   '💨 Total Farts',
    endTitle:         'Game Clear!',
    endSub:           'You cleared all 7 stages! Amazing!',
    endFartLabel:     '💨 Total Farts',
    btnRestart:       'Play Again! 🔄',
    countdownStart:   'Go!',
    hint:             '🦵 Try bending your knees! 🦵',
    fartTexts:        ['PRRRP!!', 'TOOT!!', 'POOT!', 'BLURT!!', 'BRAAAP!!', 'PFFFT!!'],
    levelNames:       ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple', 'Rainbow'],
  },
};

function applyLang(l) {
  const t  = LANG[l] || LANG.ko;
  const el = id => document.getElementById(id);

  document.title = t.pageTitle;

  // 로고: 한국어 → 이미지, 영어 → 텍스트
  const logoImg  = el('pung-logo-img');
  const logoText = el('pung-logo-text');
  if (l === 'en') {
    if (logoImg)  logoImg.style.display  = 'none';
    if (logoText) { logoText.style.display = 'block'; logoText.textContent = t.gameTitle; }
  } else {
    if (logoImg)  logoImg.style.display  = 'block';
    if (logoText) logoText.style.display = 'none';
  }

  // 시작 화면
  if (el('start-title'))    el('start-title').textContent    = t.gameTitle;
  if (el('start-subtitle')) el('start-subtitle').innerHTML   = t.subtitle;
  if (el('start-subtitle2')) el('start-subtitle2').innerHTML = t.subtitle2(cfg ? cfg.fartTarget : 3);

  if (el('lbl-fart-count')) el('lbl-fart-count').textContent = t.settingFartCount;
  if (el('lbl-volume'))     el('lbl-volume').textContent     = t.settingVolume;
  if (el('lbl-effect'))     el('lbl-effect').textContent     = t.settingEffect;
  if (el('lbl-fever'))      el('lbl-fever').textContent      = t.settingFever;

  const selTarget = el('sel-target');
  if (selTarget) {
    selTarget.options[0].text = t.opt3;
    selTarget.options[1].text = t.opt5;
    selTarget.options[2].text = t.opt7;
    selTarget.options[3].text = t.opt10;
  }
  const selEffect = el('sel-effect');
  if (selEffect) {
    selEffect.options[0].text = t.effectLow;
    selEffect.options[1].text = t.effectMedium;
    selEffect.options[2].text = t.effectStrong;
  }
  const selFever = el('sel-fever');
  if (selFever) {
    selFever.options[0].text = t.fever3;
    selFever.options[1].text = t.fever5;
    selFever.options[2].text = t.fever7;
  }
  const btnStart = el('btn-start');
  if (btnStart) btnStart.textContent = btnStart.disabled ? t.btnStartLoading : t.btnStart;

  // 캘리브레이션
  if (el('calib-title')) el('calib-title').textContent = t.calibTitle;
  if (el('calib-sub'))   el('calib-sub').textContent   = t.calibSub;

  // 인트로
  if (el('intro-title')) el('intro-title').textContent = t.introTitle;
  if (el('intro-sub'))   el('intro-sub').textContent   = t.introSub;

  // 레벨 알림
  if (el('level-ann-next'))  el('level-ann-next').textContent  = t.levelAnnNext;

  // 피버
  if (el('fever-title-text')) el('fever-title-text').textContent = t.feverTitle;

  // 게이지 / 카운터
  if (el('gauge-label'))      el('gauge-label').textContent      = t.gaugeLabel;
  if (el('fart-count-label')) el('fart-count-label').textContent = t.fartCountLabel;

  // 게임 종료
  if (el('end-title'))     el('end-title').textContent     = t.endTitle;
  if (el('end-subtitle'))  el('end-subtitle').textContent  = t.endSub;
  if (el('end-fart-label'))el('end-fart-label').textContent= t.endFartLabel;
  if (el('btn-restart'))   el('btn-restart').textContent   = t.btnRestart;

  // HUD (플레이 중 레벨명)
  if (typeof level !== 'undefined' && el('level-label-text')) {
    el('level-label-text').textContent = t.levelNames[Math.min(level - 1, 6)];
  }
}

// ── 게임 상태 ─────────────────────────────────────────────
let cfg = { fartTarget: 3, volume: 0.7, effectLevel: 'strong', feverDuration: 3 };
let phase      = 'start';
let gauge      = 0;
let level      = 1;
let roundFarts = 0;
let totalFarts = 0;

// 피버타임
let feverMode    = false;
let feverEndTime = 0;

// ── 2인 플레이어 상태 ─────────────────────────────────────
function makePlayer() {
  return {
    standingHipY:      null,
    standingShoulderY: null,
    calibFrames:       [],
    calibShoulderFrames: [],
    isSquatting: false,
    canTrigger:  true,
  };
}
let players = [makePlayer(), makePlayer()];

const CALIB_FRAMES = 90;
const SQUAT_THRESH = 0.05;  // 폴백 (동적 임계값 우선)

// ── 포즈 감지 상태 ────────────────────────────────────────
let detector    = null;
let latestPoses = [null, null];  // [좌측 플레이어, 우측 플레이어]
let isDetecting = false;

// ── 렌더링 ───────────────────────────────────────────────
let canvas, ctx, video;
let CW = 1280, CH = 720;
let tutorialVid = null;  // 튜토리얼 가이드 영상 전용 엘리먼트

// ── 게이지 파티클 ─────────────────────────────────────────
let gaugeParticles = [];

// ── 이미지 에셋 ──────────────────────────────────────────
const assets = { hat: null, costume: null };

function loadAssets() {
  return new Promise(resolve => {
    let loaded = 0;
    const total = Object.keys(assets).length;
    const done  = () => { if (++loaded >= total) resolve(); };

    const hatImg = new Image();
    hatImg.onload = () => { assets.hat = hatImg; done(); };
    hatImg.onerror = done;
    hatImg.src = 'assets/hat.svg';

    const cosImg = new Image();
    cosImg.onload = () => { assets.costume = cosImg; done(); };
    cosImg.onerror = done;
    cosImg.src = 'assets/costume.png';
  });
}

// ── DOM refs ─────────────────────────────────────────────
const $start    = document.getElementById('screen-start');
const $calib    = document.getElementById('screen-calib');
const $bigEvent = document.getElementById('screen-poop');
const $gaugeWrap= document.getElementById('gauge-wrap');
const $gaugeFill= document.getElementById('gauge-fill');
const $levelBdg = document.getElementById('level-badge');
const $levelIcon= document.getElementById('level-icon');
const $levelNum = document.getElementById('level-num');
const $levelLbl = document.getElementById('level-label-text');
const $fartCnt  = document.getElementById('fart-counter');
const $fartNum  = document.getElementById('fart-count-num');
const $calibBar = document.getElementById('calib-bar');
const $dispTgt  = document.getElementById('display-target');
const $screenEnd= document.getElementById('screen-end');
const $btnStart = document.getElementById('btn-start');

// ── 설정 UI ──────────────────────────────────────────────
document.getElementById('sel-target').addEventListener('change', e => {
  cfg.fartTarget = parseInt(e.target.value);
  $dispTgt.textContent = cfg.fartTarget;
});
document.getElementById('rng-volume').addEventListener('input', e => {
  cfg.volume = parseFloat(e.target.value);
  audio.setVolume(cfg.volume);
});
document.getElementById('sel-effect').addEventListener('change', e => {
  cfg.effectLevel = e.target.value;
});
document.getElementById('sel-fever').addEventListener('change', e => {
  cfg.feverDuration = parseInt(e.target.value);
});

// ── 시작 버튼 ─────────────────────────────────────────────
$btnStart.addEventListener('click', () => {
  if (!detector) return;  // 모델 로딩 중엔 무시
  audio.init();
  audio.setVolume(cfg.volume);
  const bgVid = document.getElementById('bg-tut-video');
  if (bgVid) bgVid.pause();
  $start.style.display = 'none';
  startCalibration(); // 튜토리얼 없이 바로 캘리브레이션
});

// ── 튜토리얼 영상 — 게임 캔버스에 가이드 영상 + 이펙트 직접 렌더링 ──
function showTutorial() {
  // 기존 overlay 화면은 숨김
  document.getElementById('screen-tutorial').style.display = 'none';

  phase = 'tutorial';

  // 가이드 영상 엘리먼트 생성
  tutorialVid = document.createElement('video');
  tutorialVid.src = 'assets/guide_raw.mp4';
  tutorialVid.muted = true;
  tutorialVid.playsInline = true;
  tutorialVid.style.display = 'none';
  document.body.appendChild(tutorialVid);

  // 튜토리얼 보이스 (한/영 선택)
  if (getLang() === 'ko') {
    const v1 = new Audio('pung_tut_1.wav');
    v1.volume = cfg.volume;
    v1.play().catch(() => {});
    setTimeout(() => {
      const v2 = new Audio('pung_tut_2.wav');
      v2.volume = cfg.volume;
      v2.play().catch(() => {});
    }, 7000);
  } else {
    const voiceSrc = 'assets/voice_tutorial_en-US.ogg';
    const playTutVoice = () => {
      const v = new Audio(voiceSrc);
      v.volume = cfg.volume;
      v.play().catch(() => {});
    };
    playTutVoice();
    setTimeout(playTutVoice, 7000);
  }

  // 이펙트 트리거 (게임과 동일한 이펙트 엔진 사용)
  let t1Done = false, t2Done = false;
  const effectTimer = setInterval(() => {
    if (!tutorialVid) { clearInterval(effectTimer); return; }
    const t = tutorialVid.currentTime;
    const hx = CW * 0.5, hy = CH * 0.63;
    if (!t1Done && t >= 4.0) {
      t1Done = true;
      fx.spawnFart(hx, hy, 0, cfg.effectLevel, true);
      showFartText(hx, hy - 90);
      new Audio('assets/fart_2.ogg').play().catch(() => {});
    }
    if (!t2Done && t >= 10.2) {
      t2Done = true;
      if (getSite() !== 'handong') fx.spawnPoopFountain(hx, hy, CW, cfg.effectLevel, 0, true, CH);
      showFartText(hx, hy - 90);
      new Audio('assets/fart_0.ogg').play().catch(() => {});
    }
  }, 33);

  tutorialVid.addEventListener('ended', function onEnd() {
    clearInterval(effectTimer);
    document.body.removeChild(tutorialVid);
    tutorialVid = null;
    startCalibration();
  });

  tutorialVid.play().catch(() => {
    // 재생 실패 시 튜토리얼 스킵
    clearInterval(effectTimer);
    if (tutorialVid) { document.body.removeChild(tutorialVid); tutorialVid = null; }
    startCalibration();
  });
}

// ============================================================
//  MoveNet 유틸
// ============================================================

// MoveNet 키포인트(픽셀좌표) → 정규화된 랜드마크 배열
function poseToLm(pose, vW, vH) {
  return pose.keypoints.map(kp => ({
    x:          kp.x / vW,
    y:          kp.y / vH,
    visibility: kp.score,
  }));
}

// 포즈의 바운딩박스 크기 (가까울수록 큰 값)
function poseSize(pose) {
  const vis = pose.keypoints.filter(kp => kp.score > 0.15);
  if (vis.length < 3) return 0;
  const xs = vis.map(kp => kp.x);
  const ys = vis.map(kp => kp.y);
  return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
}

// 가장 앞에 있는(크게 보이는) 2명을 선택, 왼쪽→오른쪽 슬롯 정렬
function selectTopTwo(poses) {
  const valid = (poses || []).filter(p => p.score > 0.12);
  const top   = [...valid].sort((a, b) => poseSize(b) - poseSize(a)).slice(0, 2);
  top.sort((a, b) => {
    const ax = a.keypoints.reduce((s, k) => s + k.x, 0) / a.keypoints.length;
    const bx = b.keypoints.reduce((s, k) => s + k.x, 0) / b.keypoints.length;
    return ax - bx;  // 왼쪽 → 슬롯 0, 오른쪽 → 슬롯 1
  });
  return [top[0] || null, top[1] || null];
}

// ============================================================
//  캘리브레이션
// ============================================================
function startCalibration() {
  // 튜토리얼 이펙트 잔상 제거
  fx.gas = []; fx.waves = []; fx.flashes = [];
  fx.poops = []; fx.physicPoops = []; fx.confetti = [];
  fx.fallingPoops = []; fx.explodingPoops = [];

  phase   = 'calibrating';
  players = [makePlayer(), makePlayer()];
  $calib.style.display = 'flex';
  $calibBar.style.width = '0%';
}

function processCalibration(topPoses) {
  if (phase !== 'calibrating') return;
  const vW = video.videoWidth  || 1280;
  const vH = video.videoHeight || 720;

  let maxProgress = 0;
  for (let i = 0; i < 2; i++) {
    const pose = topPoses[i];
    if (!pose) continue;
    const lm = poseToLm(pose, vW, vH);
    const lh = lm[LM.L_HIP], rh = lm[LM.R_HIP];
    const ls = lm[LM.L_SHOULDER], rs = lm[LM.R_SHOULDER];
    if (!lh || !rh || (lh.visibility < 0.2 && rh.visibility < 0.2)) continue;

    players[i].calibFrames.push((lh.y + rh.y) / 2);
    if (ls && rs && (ls.visibility > 0.2 || rs.visibility > 0.2)) {
      players[i].calibShoulderFrames.push((ls.y + rs.y) / 2);
    }
    maxProgress = Math.max(maxProgress, players[i].calibFrames.length);
  }

  $calibBar.style.width = ((maxProgress / CALIB_FRAMES) * 100) + '%';

  // 주요 플레이어(슬롯0 우선, 없으면 슬롯1)가 CALIB_FRAMES 채우면 완료
  const primary = players[0].calibFrames.length >= players[1].calibFrames.length ? 0 : 1;
  if (players[primary].calibFrames.length < CALIB_FRAMES) return;

  // 각 플레이어 기준값 확정
  for (let i = 0; i < 2; i++) {
    const p = players[i];
    if (p.calibFrames.length >= 10) {
      p.standingHipY = p.calibFrames.reduce((s, v) => s + v, 0) / p.calibFrames.length;
    }
    if (p.calibShoulderFrames.length >= 5) {
      p.standingShoulderY = p.calibShoulderFrames.reduce((s, v) => s + v, 0) / p.calibShoulderFrames.length;
    }
  }
  phase = 'intro';  // 재진입 방지 — 이 줄 없으면 detectLoop에서 반복 호출됨
  $calib.style.display = 'none';
  showIntro(() => startPlaying());
}

// ============================================================
//  플레이 시작
// ============================================================
function startPlaying() {
  if (typeof trackPlay === 'function') trackPlay();
  phase      = 'playing';
  gauge      = 0;
  roundFarts = 0;
  players.forEach(p => { p.isSquatting = false; p.canTrigger = true; });
  $gaugeWrap.style.display = 'block';
  $fartCnt.style.display   = 'block';
  document.getElementById('color-progress').style.display = 'flex';
  updateColorProgress();
  updateGaugeUI();
  updateHUD();
  audio.playVoice();
  setTimeout(() => audio.startBGM(), 2000);
}

// ── 게임 목표 인트로 ──
function showIntro(onDone) {
  const el = document.getElementById('screen-intro');
  el.style.display = 'flex';
  el.style.opacity = '1';
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => { el.style.display = 'none'; onDone(); }, 500);
  }, 2800);
}

// ── 레벨 전환 알림 ──
function showLevelAnnounce() {
  const names  = LANG[getLang()].levelNames;
  const icons  = ['🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '🌈'];
  const colors = ['#ff5555','#ff9944','#ffe033','#55dd55','#4499ff','#bb66ff','#ff88ee'];
  const idx = Math.min(level - 1, 6);

  const el  = document.getElementById('screen-level-announce');
  const col = document.getElementById('level-ann-color');
  col.textContent  = `${icons[idx]} ${names[idx]}!`;
  col.style.textShadow = `0 0 40px ${colors[idx]}, 0 0 80px ${colors[idx]}, 0 4px 20px rgba(0,0,0,0.6)`;
  col.style.animation  = 'none';
  void col.offsetWidth;
  col.style.animation  = '';

  el.style.display = 'flex';
  el.style.opacity = '1';
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => { el.style.display = 'none'; }, 500);
  }, 2000);
}

// ── 7색 슬롯 진행 업데이트 ──
function updateColorProgress() {
  const slots = document.querySelectorAll('.cp-slot');
  slots.forEach((slot, i) => {
    slot.className = 'cp-slot';
    if (i < level - 1)       slot.classList.add('done');
    else if (i === level - 1) slot.classList.add('current');
  });
}

// ============================================================
//  스쿼트 감지 (2인)
// ============================================================
function detectSquat(topPoses) {
  if (phase !== 'playing' && phase !== 'fever') return;
  const vW = video.videoWidth  || 1280;
  const vH = video.videoHeight || 720;

  for (let i = 0; i < 2; i++) {
    const pose   = topPoses[i];
    const player = players[i];

    if (!pose) {
      // 프레임에서 사라졌으면 스쿼트 상태 해제
      if (player.isSquatting) {
        player.isSquatting = false;
        setTimeout(() => { player.canTrigger = true; }, 250);
      }
      continue;
    }
    if (!player.standingHipY) continue;  // 캘리브 안 된 플레이어는 스킵

    detectPlayerSquat(poseToLm(pose, vW, vH), player);
  }
}

function detectPlayerSquat(lm, player) {
  const lh = lm[LM.L_HIP],      rh = lm[LM.R_HIP];
  const ls = lm[LM.L_SHOULDER],  rs = lm[LM.R_SHOULDER];
  if (!lh || !rh || (lh.visibility < 0.2 && rh.visibility < 0.2)) return;

  const hipY     = (lh.y + rh.y) / 2;
  const shoulderY = (ls && rs) ? (ls.y + rs.y) / 2 : null;

  // 몸 크기에 비례한 동적 임계값 — 멀리 서 있어도 인식
  let thresh = SQUAT_THRESH;
  if (shoulderY !== null && (ls.visibility > 0.15 || rs.visibility > 0.15)) {
    const bodyH = Math.abs(hipY - shoulderY);
    if (bodyH > 0.05) thresh = bodyH * 0.22;
  }

  // ① 얕은 스쿼트
  const isSquatPose = hipY > player.standingHipY + thresh;
  // ② 상체 숙이기
  const isLeanPose  = shoulderY !== null && player.standingShoulderY !== null &&
                      shoulderY > player.standingShoulderY + thresh * 0.9;

  const triggered = isSquatPose || isLeanPose;

  if (triggered && !player.isSquatting && player.canTrigger) {
    player.isSquatting = true;
    player.canTrigger  = false;
    onFart(lm);
  } else if (!triggered && player.isSquatting) {
    player.isSquatting = false;
    setTimeout(() => { player.canTrigger = true; }, 250);
  }
}

// ============================================================
//  방귀 이벤트
// ============================================================
function onFart(landmarks) {
  roundFarts++;
  totalFarts++;

  const lh = landmarks[LM.L_HIP], rh = landmarks[LM.R_HIP];
  const hx = CW - ((lh.x + rh.x) / 2) * CW;
  const hy = ((lh.y + rh.y) / 2) * CH;

  // ── 피버타임: 가스 없이 물리 똥만 ──
  if (feverMode) {
    fx.spawnPoopFountain(hx, hy, CW, cfg.effectLevel, currentHue(), theme().rainbow, CH);
    fx.shake.t         = 0.90;
    fx.shake.intensity = 22;
    fartFlash          = 1.0;
    showFartText(hx, hy - 90);
    audio.playFeverFart(1.0);
    audio.playPoopBurst();
    updateHUD();
    return;
  }

  // 가스 스폰 (일반 플레이만)
  fx.spawnFart(hx, hy, currentHue(), cfg.effectLevel, theme().rainbow);

  gauge++;
  audio.playFart(gauge / cfg.fartTarget);
  if (gauge === 2) audio.playCheer();

  fx.shake.t         = 0.65;
  fx.shake.intensity = 16;
  fartFlash          = 1.0;
  showFartText(hx, hy - 90);

  spawnGaugeParticles(hx, hy);

  updateGaugeUI();
  updateHUD();
  pulseGauge();

  if (gauge >= cfg.fartTarget) {
    setTimeout(() => triggerBigPoop(hx, hy), 200);
  }
}

function pulseGauge() {
  $gaugeFill.style.boxShadow = '0 0 22px 8px rgba(255,255,80,0.8)';
  setTimeout(() => { $gaugeFill.style.boxShadow = ''; }, 320);
  const p = document.getElementById('gauge-poop');
  p.style.transform = 'translateY(-50%) scale(1.5)';
  setTimeout(() => { p.style.transform = 'translateY(-50%) scale(1)'; }, 270);
}

function spawnGaugeParticles(hx, hy) {
  const count = 12;
  for (let i = 0; i < count; i++) {
    const hue = 60 + Math.random() * 80;
    gaugeParticles.push({
      x:    hx + (Math.random() - 0.5) * 60,
      y:    hy + (Math.random() - 0.5) * 40,
      tx:   CW * 0.3 + Math.random() * CW * 0.4,
      ty:   30 + Math.random() * 30,
      life: 1.0,
      size: 6 + Math.random() * 8,
      hue,
      speed: 0.06 + Math.random() * 0.06,
    });
  }
}

function drawGaugeParticles() {
  gaugeParticles = gaugeParticles.filter(p => {
    p.life -= 0.03;
    p.x += (p.tx - p.x) * p.speed;
    p.y += (p.ty - p.y) * p.speed;
    if (p.life <= 0) return false;
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.fillStyle   = `hsl(${p.hue}, 100%, 65%)`;
    ctx.shadowColor = `hsl(${p.hue}, 100%, 70%)`;
    ctx.shadowBlur  = 10;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return true;
  });
}

// ============================================================
//  똥 발사 빅이벤트
// ============================================================
function triggerBigPoop(hx, hy) {
  feverMode    = true;
  feverEndTime = Date.now() + cfg.feverDuration * 1000;
  phase        = 'fever';
  gauge        = 0;
  roundFarts   = 0;
  players.forEach(p => { p.isSquatting = false; p.canTrigger = true; });

  audio.playBigPoop();
  fx.launchPoop(hx, hy, CW, cfg.effectLevel, currentHue(), theme().rainbow);

  const ann = document.getElementById('fever-announce');
  ann.style.display = 'flex';
  setTimeout(() => { ann.style.display = 'none'; }, 700);

  document.getElementById('fever-timer').style.display = 'block';

  updateGaugeUI();
  updateHUD();
}

function endFever() {
  feverMode = false;
  phase     = 'end';  // render 루프 재진입 방지 (매 프레임 중복 호출 차단)
  document.getElementById('fever-timer').style.display   = 'none';
  document.getElementById('fever-announce').style.display = 'none';
  $gaugeFill.style.animation = '';

  if (level >= 7) {
    setTimeout(endGame, 800);
  } else {
    audio.playFeverEndCheer();
    nextRound();
  }
}

function endGame() {
  if (typeof trackComplete === 'function') trackComplete();
  phase = 'end';
  audio.stopBGM();
  audio.playApplause();
  fx.spawnEndGamePoops(CW, CH);
  document.getElementById('end-fart-num').textContent = totalFarts;
  document.querySelectorAll('.cp-slot').forEach(s => { s.className = 'cp-slot done'; });
  setTimeout(() => { $screenEnd.style.display = 'flex'; }, 3000);
}

function nextRound() {
  level++;
  gauge = 0; roundFarts = 0;
  players.forEach(p => { p.isSquatting = false; p.canTrigger = true; });
  phase = 'playing';

  audio.playLevelUp();
  fx.spawnCelebration(CW / 2, CH / 2);
  flashLevel();
  updateGaugeUI();
  updateHUD();
  updateColorProgress();
  showLevelAnnounce();
}

function flashLevel() {
  $levelBdg.style.transform = 'scale(1.6)';
  setTimeout(() => { $levelBdg.style.transform = 'scale(1)'; }, 400);
}

// ============================================================
//  UI 갱신
// ============================================================
function updateGaugeUI() {
  // 전체 7레벨 기준 진행도 (0~100%)
  let pct;
  if (feverMode) {
    pct = (level / 7) * 100;
    $gaugeFill.style.animation = 'fever-glow 0.65s ease-in-out infinite alternate';
  } else {
    pct = ((level - 1 + gauge / cfg.fartTarget) / 7) * 100;
    $gaugeFill.style.animation = '';
  }
  $gaugeFill.style.width = Math.min(pct, 100) + '%';

  // 그라데이션이 트랙 전체 너비에 걸치도록 background-size를 트랙 너비로 설정
  const track = document.getElementById('gauge-track');
  const trackW = track ? track.offsetWidth : 860;
  $gaugeFill.style.backgroundImage =
    'linear-gradient(90deg, #ff4444 0%, #ff9800 16.66%, #ffee00 33.33%, #44cc44 50%, #2288ff 66.66%, #9933ff 83.33%, #ff44aa 100%)';
  $gaugeFill.style.backgroundSize   = (trackW || 860) + 'px 100%';
  $gaugeFill.style.backgroundPosition = 'left center';
}

const LEVEL_ICONS = ['🔴','🟠','🟡','🟢','🔵','🟣','🌈'];
function updateHUD() {
  const idx  = Math.min(level - 1, LEVEL_ICONS.length - 1);
  $levelIcon.textContent = LEVEL_ICONS[idx];
  $levelNum.textContent  = `Lv.${level}`;
  $levelLbl.textContent  = LANG[getLang()].levelNames[Math.min(level - 1, 6)];
  $fartNum.textContent   = totalFarts;
}

// ============================================================
//  렌더 루프
// ============================================================
function render() {
  requestAnimationFrame(render);

  const sh = fx.getShakeOffset();
  ctx.save();
  ctx.translate(sh.x, sh.y);

  // ── 카메라 피드 (좌우 반전) — 튜토리얼 중엔 가이드 영상 사용 ──
  const drawSrc = (phase === 'tutorial' && tutorialVid) ? tutorialVid : video;
  if (drawSrc && drawSrc.readyState >= 2) {
    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-CW, 0);
    ctx.drawImage(drawSrc, 0, 0, CW, CH);
    ctx.restore();
  } else {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, CW, CH);
  }

  // ── 방귀 플래시 & 텍스트 ──
  drawFartFlash();
  drawGaugeParticles();

  // ── 피버타임 오버레이 + 타이머 ──
  drawFeverOverlay();
  if (phase === 'fever') {
    const rem = Math.max(0, Math.ceil((feverEndTime - Date.now()) / 1000));
    document.getElementById('fever-timer').textContent = getLang() === 'ko' ? `🔥 ${rem}초` : `🔥 ${rem}s`;
    if (Date.now() >= feverEndTime) endFever();
  }

  // ── 캐릭터 오버레이 (최대 2명) ──
  if (phase !== 'start' && phase !== 'tutorial') {
    const vW = video.videoWidth  || 1280;
    const vH = video.videoHeight || 720;
    for (let i = 0; i < 2; i++) {
      if (latestPoses[i]) {
        drawCharacter(poseToLm(latestPoses[i], vW, vH), players[i]);
      }
    }
  }

  // ── 모든 이펙트 (캐릭터 앞 최상위) ──
  fx.update();
  fx.draw(ctx);
  fx.drawPoops(ctx);
  drawFartTexts();

  // ── 첫 방귀 전 안내 ──
  if (phase === 'playing' && roundFarts === 0) drawHint();

  ctx.restore();
}

// ============================================================
//  카운트다운
// ============================================================
function startCountdown(onDone) {
  const overlay = document.getElementById('screen-countdown');
  const numEl   = document.getElementById('countdown-number');
  const steps   = ['3', '2', '1', LANG[getLang()].countdownStart];
  let idx = 0;

  overlay.style.display = 'flex';

  function next() {
    if (idx >= steps.length) {
      overlay.style.display = 'none';
      onDone();
      audio.playVoice('앉으면 방귀가 뿡');
      return;
    }
    const txt = steps[idx++];
    numEl.textContent = txt;
    numEl.classList.remove('pop');
    void numEl.offsetWidth;
    numEl.classList.add('pop');
    setTimeout(next, idx <= 3 ? 880 : 660);
  }
  next();
}

// ── 피버타임 무지개 테두리 오버레이 ──
function drawFeverOverlay() {
  if (phase !== 'fever') return;
  const t   = Date.now() / 1000;
  const hue = (t * 100) % 360;

  ctx.save();
  const bw = 12 + Math.sin(t * 10) * 4;
  ctx.lineWidth   = bw;
  ctx.strokeStyle = `hsla(${hue},100%,62%,0.9)`;
  ctx.strokeRect(bw / 2, bw / 2, CW - bw, CH - bw);
  ctx.lineWidth   = 6;
  ctx.strokeStyle = `hsla(${(hue + 140) % 360},100%,62%,0.55)`;
  ctx.strokeRect(bw + 8, bw + 8, CW - (bw + 8) * 2, CH - (bw + 8) * 2);
  ctx.restore();

  if (Math.random() < 0.10) {
    fx.spawnFeverSparkle(Math.random() * CW, Math.random() * CH * 0.80);
  }
}

// ============================================================
//  방귀 플래시 & 텍스트 이펙트
// ============================================================
let fartFlash = 0;
let fartTexts = [];

function showFartText(x, y) {
  const pool = LANG[getLang()].fartTexts;
  fartTexts.push({
    text: pool[Math.floor(Math.random() * pool.length)],
    x, y, life: 1.0, vy: -4.5, scale: 0.12
  });
}

function drawFartFlash() {
  if (fartFlash <= 0) return;
  ctx.save();
  ctx.globalAlpha = fartFlash * 0.40;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CW, CH);
  ctx.restore();
  fartFlash = Math.max(0, fartFlash - 0.10);
}

function drawFartTexts() {
  const lifeDecay = getSite() === 'handong' ? 0.013 : 0.026;
  fartTexts = fartTexts.filter(t => {
    t.life -= lifeDecay;
    t.scale = Math.min(1.0, t.scale + 0.17);
    t.y += t.vy;
    t.vy *= 0.90;
    return t.life > 0;
  });
  fartTexts.forEach(t => {
    const sz = 80 * t.scale;
    ctx.save();
    ctx.globalAlpha = Math.pow(t.life, 1.4);
    ctx.font = `bold ${sz}px "Arial Rounded MT Bold", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(2, sz * 0.10);
    ctx.strokeStyle = '#b03000';
    ctx.fillStyle = '#ffe600';
    ctx.shadowColor = '#ff5500';
    ctx.shadowBlur = 24;
    ctx.strokeText(t.text, t.x, t.y);
    ctx.fillText(t.text, t.x, t.y);
    ctx.restore();
  });
}

// ============================================================
//  캐릭터 오버레이 — 2등신 코믹 디자인
// ============================================================
function drawCharacter(lm, player) {
  const nose      = mp(lm[LM.NOSE]);
  const lShoulder = mp(lm[LM.L_SHOULDER]);
  const rShoulder = mp(lm[LM.R_SHOULDER]);

  if (!nose || !lShoulder || !rShoulder) return;

  const sw    = Math.abs(rShoulder.x - lShoulder.x);
  const midSX = (lShoulder.x + rShoulder.x) / 2;
  const headH = sw * 1.25;

  const cheekY = nose.y + headH * 0.04;
  const cheekW = sw * 0.14;
  const cheekH = sw * 0.08;
  ctx.save();
  ctx.globalAlpha = player.isSquatting ? 0.72 : 0.35;
  ctx.fillStyle = '#ff9eb5';
  ctx.beginPath();
  ctx.ellipse(nose.x - sw * 0.30, cheekY, cheekW, cheekH, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(nose.x + sw * 0.30, cheekY, cheekW, cheekH, 0, 0, Math.PI * 2);
  ctx.fill();

  if (player.isSquatting) {
    ctx.globalAlpha = 0.90;
    ctx.font = `${sw * 0.70}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💦', midSX + sw * 0.85, nose.y - headH * 0.22);
  }
  ctx.restore();
}

// 미러 좌표 변환 (정규화 → 캔버스 픽셀, 좌우반전)
function mp(lm) {
  if (!lm) return null;
  return { x: (1 - lm.x) * CW, y: lm.y * CH };
}

function drawHint() {
  ctx.save();
  ctx.globalAlpha  = 0.82 + 0.18 * Math.sin(Date.now() / 420);
  ctx.fillStyle    = '#fff';
  ctx.font         = 'bold 38px Arial Rounded MT Bold, Arial';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor  = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur   = 14;
  ctx.fillText(LANG[getLang()].hint, CW / 2, CH / 2);
  ctx.restore();
}

// ============================================================
//  TF.js MoveNet 초기화
// ============================================================
function setLoadingText(ko, en) {
  const el = document.getElementById('loading-text');
  if (el) el.textContent = getLang() === 'ko' ? ko : en;
}
function hideLoadingStatus() {
  const el = document.getElementById('loading-status');
  if (el) el.style.display = 'none';
}

async function initPose() {
  video  = document.getElementById('input-video');
  canvas = document.getElementById('game-canvas');
  ctx    = canvas.getContext('2d');

  function resize() {
    CW = canvas.width  = window.innerWidth;
    CH = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  setLoadingText('이미지 불러오는 중...', 'Loading assets...');
  await loadAssets();

  setLoadingText('카메라 연결 중...', 'Connecting camera...');
  // 카메라 스트림 시작
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
  });
  video.srcObject = stream;
  await new Promise(res => { video.onloadedmetadata = res; });
  await video.play();

  setLoadingText('AI 초기화 중... (잠깐만요!)', 'Initializing AI... (almost there!)');
  // TF.js 백엔드 초기화
  await tf.setBackend('webgl');
  await tf.ready();

  setLoadingText('AI 모델 다운로드 중... (조금만 기다려주세요)', 'Downloading AI model... (hang tight!)');
  // MoveNet MultiPose Lightning 로드
  detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    {
      modelType:    poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING,
      enableTracking: true,
      trackerType:  poseDetection.TrackerType.BoundingBox,
      minPoseScore: 0.12,
    }
  );

  // 모델 준비 완료 → 버튼 활성화
  hideLoadingStatus();
  $btnStart.disabled    = false;
  $btnStart.textContent = LANG[getLang()].btnStart;

  // 렌더 루프 & 감지 루프 시작
  requestAnimationFrame(render);
  detectLoop();
}

// 감지 루프 (렌더와 독립적으로 ~30fps)
async function detectLoop() {
  if (detector && video.readyState >= 2 && !isDetecting) {
    isDetecting = true;
    try {
      const poses = await detector.estimatePoses(video, { flipHorizontal: false });
      const top2  = selectTopTwo(poses);
      latestPoses = top2;

      if (phase === 'calibrating') processCalibration(top2);
      else if (phase === 'playing' || phase === 'fever') detectSquat(top2);
    } catch (_) { /* ignore */ }
    isDetecting = false;
  }
  setTimeout(detectLoop, 33);  // ~30fps
}

// ── 스페이스바 → 방귀 테스트 ──
window.addEventListener('keydown', e => {
  if (e.code !== 'Space') return;
  e.preventDefault();
  if (phase !== 'playing' && phase !== 'fever') return;
  const vW = video.videoWidth  || 1280;
  const vH = video.videoHeight || 720;
  if (latestPoses[0]) {
    onFart(poseToLm(latestPoses[0], vW, vH));
  } else {
    const fakeLm = [];
    fakeLm[LM.L_HIP] = { x: 0.45, y: 0.65, visibility: 1 };
    fakeLm[LM.R_HIP] = { x: 0.55, y: 0.65, visibility: 1 };
    onFart(fakeLm);
  }
});

// ── 다시 하기 버튼 ──────────────────────────────────────
document.getElementById('btn-restart').addEventListener('click', () => {
  $screenEnd.style.display = 'none';
  fx.fallingPoops = [];
  // 상태 초기화
  level      = 1;
  totalFarts = 0;
  gauge      = 0;
  roundFarts = 0;
  feverMode  = false;
  players    = [makePlayer(), makePlayer()];
  phase      = 'start';
  $gaugeWrap.style.display = 'none';
  $fartCnt.style.display   = 'none';
  document.getElementById('color-progress').style.display = 'none';
  document.getElementById('fever-timer').style.display    = 'none';
  document.getElementById('fever-announce').style.display = 'none';
  document.querySelectorAll('.cp-slot').forEach(s => { s.className = 'cp-slot'; });
  fx.clearFeverPoops();
  $gaugeFill.style.animation = '';
  updateGaugeUI();
  updateHUD();
  $start.style.display = 'flex';
});

// 시작 버튼 초기 상태 (모델 로딩 중)
$btnStart.disabled    = true;
applyLang(getLang());

window.addEventListener('DOMContentLoaded', initPose);
