// ============================================================
//  main.js  — 게임 루프, 포즈 감지, 렌더링 (이미지 에셋 포함)
// ============================================================

// ── 랜드마크 인덱스 ──────────────────────────────────────
const LM = {
  NOSE: 0,
  L_EYE: 1, R_EYE: 2,
  L_SHOULDER: 11, R_SHOULDER: 12,
  L_HIP: 23, R_HIP: 24,
  L_KNEE: 25, R_KNEE: 26,
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

// ── 게임 상태 ─────────────────────────────────────────────
let cfg = { fartTarget: 3, volume: 0.7, effectLevel: 'strong', feverDuration: 5 };
let phase      = 'start';
let gauge      = 0;
let level      = 1;
let roundFarts = 0;
let totalFarts = 0;    // 전체 누적 방귀 횟수

// 피버타임
let feverMode    = false;
let feverEndTime = 0;

// 동작 감지 (스쿼트 OR 상체 숙이기)
let standingHipY      = null;
let standingShoulderY = null;
let calibFrames       = [];
let calibShoulderFrames = [];
const CALIB_FRAMES  = 60;
const SQUAT_THRESH  = 0.07;   // 폴백 (동적 임계값 우선)
let isSquatting  = false;
let canTrigger   = true;

// ── 렌더링 ───────────────────────────────────────────────
let canvas, ctx, video;
let CW = 1280, CH = 720;
let latestResults = null;

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
document.getElementById('btn-start').addEventListener('click', () => {
  if (typeof trackPlay === 'function') trackPlay();
  audio.init();
  audio.setVolume(cfg.volume);
  $start.style.display = 'none';
  startCalibration();
});

// ============================================================
//  캘리브레이션
// ============================================================
function startCalibration() {
  phase = 'calibrating';
  standingHipY      = null;
  standingShoulderY = null;
  calibFrames         = [];
  calibShoulderFrames = [];
  $calib.style.display = 'flex';
  $calibBar.style.width = '0%';
}

function processCalibration(landmarks) {
  if (phase !== 'calibrating') return;
  const lh = landmarks[LM.L_HIP], rh = landmarks[LM.R_HIP];
  const ls = landmarks[LM.L_SHOULDER], rs = landmarks[LM.R_SHOULDER];
  if (!lh || !rh || (lh.visibility < 0.25 && rh.visibility < 0.25)) return;

  calibFrames.push((lh.y + rh.y) / 2);
  if (ls && rs) calibShoulderFrames.push((ls.y + rs.y) / 2);
  $calibBar.style.width = ((calibFrames.length / CALIB_FRAMES) * 100) + '%';

  if (calibFrames.length >= CALIB_FRAMES) {
    standingHipY = calibFrames.reduce((s, v) => s + v, 0) / calibFrames.length;
    if (calibShoulderFrames.length > 0) {
      standingShoulderY = calibShoulderFrames.reduce((s, v) => s + v, 0) / calibShoulderFrames.length;
    }
    $calib.style.display = 'none';
    showIntro(() => startPlaying());
  }
}

// ============================================================
//  플레이 시작
// ============================================================
function startPlaying() {
  phase      = 'playing';
  gauge      = 0;
  roundFarts = 0;
  isSquatting= false;
  canTrigger = true;
  $gaugeWrap.style.display = 'block';
  $fartCnt.style.display   = 'block';
  document.getElementById('color-progress').style.display = 'flex';
  updateColorProgress();
  updateGaugeUI();
  updateHUD();
  audio.playVoice();
  setTimeout(() => audio.startBGM(), 2000); // 음성 재생 후 BGM 시작
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
  const names = ['빨강', '주황', '노랑', '초록', '파랑', '보라', '무지개'];
  const icons = ['🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '🌈'];
  const colors = ['#ff5555','#ff9944','#ffe033','#55dd55','#4499ff','#bb66ff','#ff88ee'];
  const idx = Math.min(level - 1, 6);

  const el   = document.getElementById('screen-level-announce');
  const col  = document.getElementById('level-ann-color');
  col.textContent  = `${icons[idx]} ${names[idx]}!`;
  col.style.textShadow = `0 0 40px ${colors[idx]}, 0 0 80px ${colors[idx]}, 0 4px 20px rgba(0,0,0,0.6)`;

  // 애니메이션 재트리거
  col.style.animation = 'none';
  void col.offsetWidth;
  col.style.animation = '';

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
    if (i < level - 1)      slot.classList.add('done');
    else if (i === level - 1) slot.classList.add('current');
  });
}

// ============================================================
//  스쿼트 감지
// ============================================================
function detectSquat(landmarks) {
  if ((phase !== 'playing' && phase !== 'fever') || !standingHipY) return;
  const lh = landmarks[LM.L_HIP],  rh = landmarks[LM.R_HIP];
  const ls = landmarks[LM.L_SHOULDER], rs = landmarks[LM.R_SHOULDER];
  if (!lh || !rh || (lh.visibility < 0.25 && rh.visibility < 0.25)) return;

  const hipY      = (lh.y + rh.y) / 2;
  const shoulderY = (ls && rs) ? (ls.y + rs.y) / 2 : null;

  // 몸 크기에 비례한 동적 임계값 — 멀리 서 있어도 인식
  let thresh = SQUAT_THRESH;
  if (shoulderY !== null && (ls.visibility > 0.2 || rs.visibility > 0.2)) {
    const bodyH = Math.abs(hipY - shoulderY);
    if (bodyH > 0.05) thresh = bodyH * 0.22;
  }

  // ① 얕은 스쿼트: 엉덩이가 아래로
  const isSquatPose = hipY > standingHipY + thresh;

  // ② 상체 숙이기: 어깨가 서있을 때보다 아래로 (앞으로 구부릴 때)
  const isLeanPose = shoulderY !== null && standingShoulderY !== null &&
                     shoulderY > standingShoulderY + thresh * 0.9;

  const triggered = isSquatPose || isLeanPose;

  if (triggered && !isSquatting && canTrigger) {
    isSquatting = true;
    canTrigger  = false;
    onFart(landmarks);
  } else if (!triggered && isSquatting) {
    isSquatting = false;
    setTimeout(() => { canTrigger = true; }, 250);
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
  fx.spawnFart(hx, hy, currentHue(), cfg.effectLevel);

  // ── 일반 플레이 ──
  gauge++;
  audio.playFart(gauge / cfg.fartTarget);

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

// 게이지 파티클: 방귀 위치에서 화면 상단 게이지 쪽으로 날아감
function spawnGaugeParticles(hx, hy) {
  const count = 12;
  for (let i = 0; i < count; i++) {
    const hue = 60 + Math.random() * 80;
    gaugeParticles.push({
      x:    hx + (Math.random() - 0.5) * 60,
      y:    hy + (Math.random() - 0.5) * 40,
      tx:   CW * 0.3 + Math.random() * CW * 0.4,  // 게이지 상단으로
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
    // lerp toward target
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
  // ── 피버타임 시작 ──
  feverMode    = true;
  feverEndTime = Date.now() + cfg.feverDuration * 1000;
  phase        = 'fever';
  gauge        = 0;
  roundFarts   = 0;
  isSquatting  = false;
  canTrigger   = true;

  audio.playBigPoop();
  audio.playFeverVoice();
  fx.launchPoop(hx, hy, CW, cfg.effectLevel, currentHue(), theme().rainbow);

  // 피버 타이틀 잠깐 표시
  const ann = document.getElementById('fever-announce');
  ann.style.display = 'flex';
  setTimeout(() => { ann.style.display = 'none'; }, 700);

  document.getElementById('fever-timer').style.display = 'block';

  updateGaugeUI();
  updateHUD();
}

function endFever() {
  feverMode = false;
  // 똥은 사라지지 않음 — 화면에 계속 쌓임
  document.getElementById('fever-timer').style.display = 'none';
  document.getElementById('fever-announce').style.display = 'none';
  $gaugeFill.style.animation = '';

  if (level >= 7) {
    // 7단계 완료 → 게임 클리어!
    setTimeout(endGame, 500);
  } else {
    nextRound();
  }
}

function endGame() {
  phase = 'end';
  audio.stopBGM();
  audio.playApplause();
  fx.spawnEndGamePoops(CW, CH);
  document.getElementById('end-fart-num').textContent = totalFarts;
  // 슬롯 전체 완료 표시
  document.querySelectorAll('.cp-slot').forEach(s => {
    s.className = 'cp-slot done';
  });
  // 똥 이펙트 3초 감상 후 종료 UI 표시
  setTimeout(() => { $screenEnd.style.display = 'flex'; }, 3000);
}

function nextRound() {
  level++;
  gauge = 0; roundFarts = 0;
  isSquatting = false; canTrigger = true;
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
  if (feverMode) {
    $gaugeFill.style.width = '100%';
    if (theme().rainbow) {
      // 무지개 레벨만 무지개 게이지
      $gaugeFill.style.background =
        'linear-gradient(90deg,#ff0000,#ff7700,#ffff00,#00ff00,#0088ff,#8800ff,#ff0088)';
      $gaugeFill.style.animation = 'rainbow-shift 0.6s linear infinite';
    } else {
      // 일반 레벨: 해당 레벨 색으로 밝게 빛남
      const [c1, c2] = theme().gaugeGrad;
      $gaugeFill.style.background = `linear-gradient(90deg,${c1},${c2})`;
      $gaugeFill.style.animation  = 'fever-glow 0.65s ease-in-out infinite alternate';
    }
    return;
  }
  $gaugeFill.style.animation = '';
  const pct = (gauge / cfg.fartTarget) * 100;
  $gaugeFill.style.width = pct + '%';
  if (theme().rainbow) {
    $gaugeFill.style.background =
      'linear-gradient(90deg,#ff0080,#8000ff,#0080ff,#00ff80,#ffff00,#ff8000,#ff0080)';
  } else {
    const [c1, c2] = theme().gaugeGrad;
    $gaugeFill.style.background = `linear-gradient(90deg,${c1},${c2})`;
  }
}

const LEVEL_ICONS = ['🔴','🟠','🟡','🟢','🔵','🟣','🌈'];
function updateHUD() {
  const idx  = Math.min(level - 1, LEVEL_ICONS.length - 1);
  $levelIcon.textContent = LEVEL_ICONS[idx];
  $levelNum.textContent  = `Lv.${level}`;
  $levelLbl.textContent  = theme().label;
  $fartNum.textContent   = totalFarts;
}

// ============================================================
//  포즈 결과 콜백
// ============================================================
function onPoseResults(results) {
  latestResults = results;
  if (!results.poseLandmarks) return;
  const lm = results.poseLandmarks;
  if (phase === 'calibrating') processCalibration(lm);
  else if (phase === 'playing' || phase === 'fever') detectSquat(lm);
}

// ============================================================
//  렌더 루프
// ============================================================
function render() {
  requestAnimationFrame(render);

  const sh = fx.getShakeOffset();
  ctx.save();
  ctx.translate(sh.x, sh.y);

  // ── 카메라 피드 (좌우 반전) ──
  if (latestResults && latestResults.image) {
    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-CW, 0);
    ctx.drawImage(latestResults.image, 0, 0, CW, CH);
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
    document.getElementById('fever-timer').textContent = `🔥 ${rem}초`;
    if (Date.now() >= feverEndTime) endFever();
  }

  // ── 캐릭터 오버레이 ──
  if (latestResults && latestResults.poseLandmarks && phase !== 'start') {
    drawCharacter(latestResults.poseLandmarks);
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
//  음성 파일 재생
// ============================================================

// ── 카운트다운 3, 2, 1, 시작! ──
function startCountdown(onDone) {
  const overlay = document.getElementById('screen-countdown');
  const numEl   = document.getElementById('countdown-number');
  const steps   = ['3', '2', '1', '시작!'];
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

  // 스파클 스폰 (성능: 빈도 감소)
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
  const pool = ['뿌우우웅!!', '뽕!!', '빵!', '뿌직!!', '뿌웅!!', '뿌우우우웅!!'];
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
  fartTexts = fartTexts.filter(t => {
    t.life -= 0.026;
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
function drawCharacter(lm) {
  const nose      = mp(lm[LM.NOSE]);
  const lEye      = mp(lm[LM.L_EYE]);
  const rEye      = mp(lm[LM.R_EYE]);
  const lShoulder = mp(lm[LM.L_SHOULDER]);
  const rShoulder = mp(lm[LM.R_SHOULDER]);

  if (!nose || !lShoulder || !rShoulder) return;

  const sw    = Math.abs(rShoulder.x - lShoulder.x);   // 어깨 폭
  const midSX = (lShoulder.x + rShoulder.x) / 2;
  const headH = sw * 1.25;   // 머리 높이 기준

  // ── 눈 Y 좌표 (모자 위치 기준) ──
  const eyeY = (lEye && rEye)
    ? (lEye.y + rEye.y) / 2
    : nose.y - headH * 0.28;

  // ── 몸통 코스튬 (어깨 위에 붙임) ──
  const shoulderY = (lShoulder.y + rShoulder.y) / 2 - headH * 0.30;
  const bodyW = sw * 2.6;
  const bodyH = headH * 2.2;

  if (assets.costume) {
    ctx.save();
    ctx.globalAlpha = 0.90;
    ctx.drawImage(assets.costume, midSX - bodyW / 2, shoulderY, bodyW, bodyH);
    ctx.restore();
  }

  // ── 모자 (SVG) — 눈썹 위에 딱 맞게 ──
  if (assets.hat) {
    const hw = headH * 1.15;
    const hh = headH * 0.95;
    // SVG 챙(brim) 하단이 전체 높이의 ~88% → 눈 바로 위(eyebrowY)에 맞춤
    const eyebrowY = eyeY - headH * 0.18;
    ctx.drawImage(assets.hat, midSX - hw / 2, eyebrowY - hh * 0.88, hw, hh);
  } else {
    ctx.font = `${headH}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('🎩', midSX, eyeY - headH * 0.12);
  }

  // ── 귀여운 볼 터치 ──
  const cheekY = nose.y + headH * 0.04;
  const cheekW = sw * 0.14;
  const cheekH = sw * 0.08;
  ctx.save();
  ctx.globalAlpha = isSquatting ? 0.72 : 0.35;
  ctx.fillStyle = '#ff9eb5';
  ctx.beginPath();
  ctx.ellipse(nose.x - sw * 0.30, cheekY, cheekW, cheekH, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(nose.x + sw * 0.30, cheekY, cheekW, cheekH, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── 스쿼트 중 땀 💦 ──
  if (isSquatting) {
    ctx.globalAlpha = 0.90;
    ctx.font = `${sw * 0.70}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💦', midSX + sw * 0.85, nose.y - headH * 0.22);
  }
  ctx.restore();
}

// 미러 좌표 변환
function mp(lm) {
  if (!lm) return null;
  return { x: (1 - lm.x) * CW, y: lm.y * CH };
}

// 안내 텍스트
function drawHint() {
  ctx.save();
  ctx.globalAlpha  = 0.82 + 0.18 * Math.sin(Date.now() / 420);
  ctx.fillStyle    = '#fff';
  ctx.font         = 'bold 38px Arial Rounded MT Bold, Arial';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor  = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur   = 14;
  ctx.fillText('🦵 무릎을 굽혔다 펴 보세요! 🦵', CW / 2, CH / 2);
  ctx.restore();
}

// ============================================================
//  MediaPipe 초기화
// ============================================================
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

  // 에셋 로드
  await loadAssets();

  // MediaPipe Pose (CDN 전역 객체)
  const pose = new window.Pose({
    locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}`
  });
  pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });
  pose.onResults(onPoseResults);

  const cam = new window.Camera(video, {
    onFrame: async () => { await pose.send({ image: video }); },
    width: 1280,
    height: 720
  });

  cam.start().then(() => requestAnimationFrame(render));
}

// ── 스페이스바 → 방귀 테스트 ──
window.addEventListener('keydown', e => {
  if (e.code !== 'Space') return;
  e.preventDefault();
  if (phase !== 'playing' && phase !== 'fever') return;
  // 가짜 랜드마크로 onFart 호출
  if (latestResults && latestResults.poseLandmarks) {
    onFart(latestResults.poseLandmarks);
  } else {
    // 랜드마크 없으면 화면 중앙 기준
    const fakeLm = [];
    fakeLm[LM.L_HIP] = { x: 0.45, y: 0.65, visibility: 1 };
    fakeLm[LM.R_HIP] = { x: 0.55, y: 0.65, visibility: 1 };
    onFart(fakeLm);
  }
});

// ── 다시 하기 버튼 ──────────────────────────────────────
document.getElementById('btn-restart').addEventListener('click', () => {
  if (typeof trackPlay === 'function') trackPlay();
  $screenEnd.style.display = 'none';
  fx.fallingPoops = [];
  // 상태 초기화
  level      = 1;
  totalFarts = 0;
  gauge      = 0;
  roundFarts = 0;
  feverMode  = false;
  isSquatting = false;
  canTrigger  = true;
  standingHipY      = null;
  standingShoulderY = null;
  calibFrames         = [];
  calibShoulderFrames = [];
  phase = 'start';
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

window.addEventListener('DOMContentLoaded', initPose);
