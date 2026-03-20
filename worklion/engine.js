/**
 * Lion Lettuce v5 — Core Game Engine
 * 핵심: 3단계 양배추 상태 변화 + 사자 하악 분리 애니메이션
 */

// ─── Asset Loader ───────────────────────────────────────────
const Assets = {
  lion: { upper: null, lower: null },
  croc: { upper: null, lower: null, body: null },
  lettuce: { normal: null, crush1: null, crush2: null },
  loaded: false,

  load(basePath = 'assets') {
    const files = {
      'lion.upper':   `${basePath}/head/upper_jaw.png`,
      'lion.lower':   `${basePath}/head/lower_jaw.png`,
      'croc.upper':   `${basePath}/croc/croc_upper.png`,
      'croc.lower':   `${basePath}/croc/croc_lower.png`,
      'croc.body':    `${basePath}/croc/croc_body.png`,
      'lettuce.normal': `${basePath}/lettuce/lettuce_normal.png`,
      'lettuce.crush1': `${basePath}/lettuce/lettuce_crush1.png`,
      'lettuce.crush2': `${basePath}/lettuce/lettuce_crush2.png`,
    };
    const promises = Object.entries(files).map(([key, src]) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const [group, name] = key.split('.');
          this[group][name] = img;
          console.log(`Loaded: ${key} (${img.naturalWidth}x${img.naturalHeight})`);
          resolve();
        };
        img.onerror = () => reject(new Error(`Failed to load: ${src}`));
        img.src = src;
      });
    });
    return Promise.all(promises).then(() => { this.loaded = true; });
  }
};


// ─── Sound Manager (Web Audio) ──────────────────────────────
class SoundManager {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.bgmNodes = null;
  }

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.ready = true;
    } catch(e) { console.warn('Web Audio not available'); }
  }

  async resume() {
    if (this.ctx && this.ctx.state === 'suspended') await this.ctx.resume();
  }

  /** 아삭! 첫 물기 사운드 — 양배추를 처음 잡을 때 */
  playBite() {
    if (!this.ready) return;
    const ctx = this.ctx, now = ctx.currentTime;

    // Layer 1: 턱 "딱" 닫히는 어택 (짧고 강한 클릭)
    const click = ctx.createOscillator(), cg = ctx.createGain();
    click.type = 'square';
    click.frequency.setValueAtTime(400, now);
    click.frequency.exponentialRampToValueAtTime(80, now + 0.04);
    cg.gain.setValueAtTime(0.5, now);
    cg.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
    click.connect(cg); cg.connect(ctx.destination);
    click.start(now); click.stop(now + 0.06);

    // Layer 2: 아삭 크런치 노이즈 (야채 부러지는 소리)
    const bufSize = Math.floor(ctx.sampleRate * 0.12);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      const env = Math.pow(1 - i / bufSize, 0.5);
      // 불규칙 그레인 (씹는 질감)
      data[i] = (Math.random() * 2 - 1) * 0.6 * env;
      if (i % 50 < 20) data[i] *= 2.5;
      if (Math.random() < 0.05) data[i] *= 3; // 랜덤 스파이크 (바삭 느낌)
    }
    const noise = ctx.createBufferSource(), ng = ctx.createGain();
    const hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 1800;
    lp.type = 'lowpass'; lp.frequency.value = 6000;
    noise.buffer = buf;
    ng.gain.setValueAtTime(0.45, now);
    ng.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    noise.connect(hp); hp.connect(lp); lp.connect(ng); ng.connect(ctx.destination);
    noise.start(now); noise.stop(now + 0.12);

    // Layer 3: 서브 임팩트 (묵직한 무는 느낌)
    const sub = ctx.createOscillator(), sg = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(120, now);
    sub.frequency.exponentialRampToValueAtTime(40, now + 0.1);
    sg.gain.setValueAtTime(0.35, now);
    sg.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    sub.connect(sg); sg.connect(ctx.destination);
    sub.start(now); sub.stop(now + 0.12);
  }

  /** 으적! 중간 씹기 사운드 — 2번째 물기 */
  playMidCrunch() {
    if (!this.ready) return;
    const ctx = this.ctx, now = ctx.currentTime;
    // 턱 "으적" (bite보다 무거운 싱글 클릭)
    const click = ctx.createOscillator(), cg = ctx.createGain();
    click.type = 'square';
    click.frequency.setValueAtTime(350, now);
    click.frequency.exponentialRampToValueAtTime(60, now + 0.06);
    cg.gain.setValueAtTime(0.5, now);
    cg.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    click.connect(cg); cg.connect(ctx.destination);
    click.start(now); click.stop(now + 0.08);
    // 으드득 노이즈 (중간 길이)
    const bufSize = Math.floor(ctx.sampleRate * 0.16);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      const env = Math.pow(1 - i / bufSize, 0.45);
      data[i] = (Math.random() * 2 - 1) * 0.65 * env;
      if (i % 45 < 18) data[i] *= 2.5;
      if (Math.random() < 0.07) data[i] *= 3;
    }
    const noise = ctx.createBufferSource(), ng = ctx.createGain();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = 0.7;
    noise.buffer = buf;
    ng.gain.setValueAtTime(0.45, now);
    ng.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
    noise.connect(bp); bp.connect(ng); ng.connect(ctx.destination);
    noise.start(now); noise.stop(now + 0.16);
    // 서브 임팩트
    const sub = ctx.createOscillator(), sg = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(100, now);
    sub.frequency.exponentialRampToValueAtTime(30, now + 0.14);
    sg.gain.setValueAtTime(0.4, now);
    sg.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    sub.connect(sg); sg.connect(ctx.destination);
    sub.start(now); sub.stop(now + 0.15);
  }

  /** 와구작! 씹기 사운드 — 3번째 최종 물기 (최대 타격감) */
  playCrunchBite() {
    if (!this.ready) return;
    const ctx = this.ctx, now = ctx.currentTime;

    // Layer 1: "와구" 턱 충돌 (square 더블탭 느낌)
    for (let t = 0; t < 2; t++) {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(500 - t * 150, now + t * 0.04);
      osc.frequency.exponentialRampToValueAtTime(50, now + t * 0.04 + 0.08);
      g.gain.setValueAtTime(0.45, now + t * 0.04);
      g.gain.exponentialRampToValueAtTime(0.01, now + t * 0.04 + 0.1);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(now + t * 0.04); osc.stop(now + t * 0.04 + 0.1);
    }

    // Layer 2: 으드득 크런치 노이즈 (길고 거친 씹기 질감)
    const bufSize = Math.floor(ctx.sampleRate * 0.22);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      const env = Math.pow(1 - i / bufSize, 0.4);
      data[i] = (Math.random() * 2 - 1) * 0.7 * env;
      // 이중 그레인: 거친 씹기 + 바삭 스파이크
      if (i % 40 < 15) data[i] *= 2.5;
      if (i % 120 < 10) data[i] *= 3;
    }
    const noise = ctx.createBufferSource(), ng = ctx.createGain();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 2800; bp.Q.value = 0.6;
    noise.buffer = buf;
    ng.gain.setValueAtTime(0.5, now);
    ng.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
    noise.connect(bp); bp.connect(ng); ng.connect(ctx.destination);
    noise.start(now); noise.stop(now + 0.22);

    // Layer 3: 바삭 고주파 (야채 조직 파괴 소리)
    const hiss = ctx.createOscillator(), hg = ctx.createGain();
    hiss.type = 'sawtooth';
    hiss.frequency.setValueAtTime(1200, now + 0.01);
    hiss.frequency.exponentialRampToValueAtTime(300, now + 0.1);
    hg.gain.setValueAtTime(0.15, now + 0.01);
    hg.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    hiss.connect(hg); hg.connect(ctx.destination);
    hiss.start(now + 0.01); hiss.stop(now + 0.12);

    // Layer 4: 우적 서브 (깊은 무는 임팩트)
    const sub = ctx.createOscillator(), sg = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(90, now);
    sub.frequency.exponentialRampToValueAtTime(25, now + 0.18);
    sg.gain.setValueAtTime(0.5, now);
    sg.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    sub.connect(sg); sg.connect(ctx.destination);
    sub.start(now); sub.stop(now + 0.2);
  }

  playEatComplete() {
    if (!this.ready) return;
    const ctx = this.ctx, now = ctx.currentTime;
    // 소멸 시 짧은 임팩트 + 성공 징글
    const impact = ctx.createOscillator(), ig = ctx.createGain();
    impact.type = 'square';
    impact.frequency.setValueAtTime(400, now);
    impact.frequency.exponentialRampToValueAtTime(40, now + 0.08);
    ig.gain.setValueAtTime(0.5, now);
    ig.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    impact.connect(ig); ig.connect(ctx.destination);
    impact.start(now); impact.stop(now + 0.1);

    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.25, now + 0.06 + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06 + i * 0.08 + 0.35);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now + 0.06 + i * 0.08); osc.stop(now + 0.06 + i * 0.08 + 0.35);
    });
  }

  /** 칭찬 음성 로드 (WAV 파일) */
  loadCheerVoices(basePath = 'assets') {
    this.cheerBuffers = [];
    this.cheerIndex = 0;
    const files = [
      `${basePath}/voice/cheer/voice_cheer_04.wav`,
      `${basePath}/voice/cheer/voice_cheer_07.wav`,
      `${basePath}/voice/cheer/voice_cheer_09.wav`,
      `${basePath}/voice/cheer/voice_cheer_12.wav`,
    ];
    files.forEach(url => {
      fetch(url)
        .then(r => r.arrayBuffer())
        .then(buf => this.ctx.decodeAudioData(buf))
        .then(decoded => { this.cheerBuffers.push(decoded); console.log('Loaded cheer:', url); })
        .catch(e => console.warn('Failed to load cheer:', url, e));
    });
  }

  /** 준비-시작 음성 로드 */
  loadReadyVoice(basePath = 'assets') {
    this.readyBuffer = null;
    fetch(`${basePath}/voice/ready-set-go/voice_ready_start.wav`)
      .then(r => r.arrayBuffer())
      .then(buf => this.ctx.decodeAudioData(buf))
      .then(decoded => { this.readyBuffer = decoded; console.log('Loaded ready voice'); })
      .catch(e => console.warn('Failed to load ready voice:', e));
  }

  /** 준비-시작 음성 재생 */
  playReady() {
    if (!this.ready || !this.readyBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.readyBuffer;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.9;
    src.connect(gain);
    gain.connect(this.ctx.destination);
    src.start();
  }

  /** 칭찬 음성 피드백 (녹음된 WAV 순서대로 재생) */
  playPraise(text) {
    if (!this.ready || !this.cheerBuffers || this.cheerBuffers.length === 0) return;
    const buf = this.cheerBuffers[this.cheerIndex % this.cheerBuffers.length];
    this.cheerIndex++;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.9;
    src.connect(gain);
    gain.connect(this.ctx.destination);
    src.start();
  }

  /** 음식 보이스 로드 */
  loadFoodVoices(basePath = 'assets') {
    this.foodVoiceBuffers = {};
    FOODS.forEach(food => {
      const url = `${basePath}/voice/food/${food.voice}.wav`;
      fetch(url)
        .then(r => r.arrayBuffer())
        .then(buf => this.ctx.decodeAudioData(buf))
        .then(decoded => { this.foodVoiceBuffers[food.voice] = decoded; })
        .catch(e => console.warn('Failed to load food voice:', url, e));
    });
  }

  /** 음식 보이스 재생 */
  playFoodVoice(voiceKey) {
    if (!this.ready || !this.foodVoiceBuffers || !this.foodVoiceBuffers[voiceKey]) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.foodVoiceBuffers[voiceKey];
    const gain = this.ctx.createGain();
    gain.gain.value = 0.9;
    src.connect(gain);
    gain.connect(this.ctx.destination);
    src.start();
  }

  /** 룰렛 틱 사운드 — 아이템 하나 넘어갈 때마다 */
  playSlotTick(pitch) {
    if (!this.ready) return;
    const ctx = this.ctx, now = ctx.currentTime;
    const freq = 600 + (pitch || 0) * 200;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + 0.04);
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.05);
  }

  /** 룰렛 Pick 확정 사운드 */
  playSlotPick() {
    if (!this.ready) return;
    const ctx = this.ctx, now = ctx.currentTime;
    [880, 1108, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const t = now + i * 0.06;
      g.gain.setValueAtTime(0.3, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.3);
    });
  }

  playCrush() {
    if (!this.ready) return;
    const ctx = this.ctx, now = ctx.currentTime;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.12);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.12);
  }

  playFanfare() {
    if (!this.ready) return;
    const ctx = this.ctx, now = ctx.currentTime;
    // 축하 팡파레
    const melody = [523, 659, 784, 1047, 784, 1047, 1318];
    melody.forEach((freq, i) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = i < 4 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      const t = now + i * 0.12;
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.4);
    });
  }

  startBGM() {
    if (!this.ready || this.bgmNodes) return;
    const ctx = this.ctx;
    this.bgmNodes = [];
    // 빠른 템포 신나는 BGM (BPM ~160)
    const beatDur = 0.375; // 한 비트 = 0.375초 (160 BPM)
    const barDur = beatDur * 4; // 한 마디 = 1.5초

    // 코드 진행: C → G → Am → F (밝고 신나는)
    const chords = [
      [261.6, 329.6, 392],   // C
      [196, 246.9, 293.7],   // G
      [220, 261.6, 329.6],   // Am
      [174.6, 220, 261.6],   // F
    ];

    // 멜로디 패턴 (마디당 8음, 16분음표)
    const melodies = [
      [523, 659, 784, 659, 523, 784, 659, 523],
      [392, 494, 587, 494, 392, 587, 494, 392],
      [440, 523, 659, 523, 440, 659, 523, 440],
      [349, 440, 523, 440, 349, 523, 440, 349],
    ];

    const scheduleLoop = () => {
      if (!this.bgmNodes) return;
      const now = ctx.currentTime;
      const loopLen = chords.length * barDur;

      chords.forEach((chord, ci) => {
        const barStart = now + ci * barDur;

        // 코드 패드 (스타카토 리듬)
        for (let beat = 0; beat < 4; beat++) {
          const t = barStart + beat * beatDur;
          chord.forEach(freq => {
            const osc = ctx.createOscillator(), gain = ctx.createGain();
            osc.type = beat % 2 === 0 ? 'triangle' : 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(beat === 0 ? 0.06 : 0.035, t);
            gain.gain.exponentialRampToValueAtTime(0.005, t + beatDur * 0.8);
            osc.connect(gain); gain.connect(ctx.destination);
            osc.start(t); osc.stop(t + beatDur * 0.85);
          });
        }

        // 베이스라인 (옥타브 아래, 강한 비트)
        const bassFreq = chord[0] / 2;
        for (let beat = 0; beat < 4; beat++) {
          const t = barStart + beat * beatDur;
          const osc = ctx.createOscillator(), gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.value = beat % 2 === 0 ? bassFreq : bassFreq * 1.5;
          gain.gain.setValueAtTime(beat === 0 ? 0.07 : 0.04, t);
          gain.gain.exponentialRampToValueAtTime(0.005, t + beatDur * 0.5);
          osc.connect(gain); gain.connect(ctx.destination);
          osc.start(t); osc.stop(t + beatDur * 0.5);
        }

        // 멜로디 (16분음표 패턴)
        const mel = melodies[ci];
        const noteLen = beatDur / 2;
        mel.forEach((freq, ni) => {
          const t = barStart + ni * noteLen;
          const osc = ctx.createOscillator(), gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.08, t);
          gain.gain.exponentialRampToValueAtTime(0.005, t + noteLen * 0.9);
          osc.connect(gain); gain.connect(ctx.destination);
          osc.start(t); osc.stop(t + noteLen * 0.92);
        });

        // 하이햇 (매 비트, 노이즈 기반)
        for (let beat = 0; beat < 8; beat++) {
          const t = barStart + beat * (beatDur / 2);
          const bufSize = Math.floor(ctx.sampleRate * 0.02);
          const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
          const d = buf.getChannelData(0);
          for (let j = 0; j < bufSize; j++) d[j] = (Math.random() * 2 - 1) * (1 - j / bufSize);
          const src = ctx.createBufferSource(), g = ctx.createGain();
          const hp = ctx.createBiquadFilter();
          hp.type = 'highpass'; hp.frequency.value = 8000;
          src.buffer = buf;
          g.gain.setValueAtTime(beat % 2 === 0 ? 0.06 : 0.03, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
          src.connect(hp); hp.connect(g); g.connect(ctx.destination);
          src.start(t); src.stop(t + 0.03);
        }
      });

      this._bgmTimer = setTimeout(scheduleLoop, loopLen * 1000 - 50);
    };
    scheduleLoop();
  }

  stopBGM() {
    if (this._bgmTimer) clearTimeout(this._bgmTimer);
    this.bgmNodes = null;
  }
}


// ─── Cabbage State Machine ──────────────────────────────────
const CABBAGE_STATES = { NORMAL: 0, CRUSH1: 1, CRUSH2: 2 };
const CABBAGE_MAX_HEALTH = 3;

class Cabbage {
  constructor(x, y, vx, vy, size, canvasW, canvasH) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.size = size;
    this.canvasW = canvasW; this.canvasH = canvasH;
    this.gravity = 0;        // 중력 없음 — 당구대 스타일
    this.bounciness = 1.0;   // 완전 탄성 반사
    this.health = CABBAGE_MAX_HEALTH;
    this.crushState = CABBAGE_STATES.NORMAL;
    this.phase = 'bouncing'; // bouncing, attracted, stuck, exploding
    this.crushScaleX = 1; this.crushScaleY = 1;
    this.shakeTimer = 0; this.squishScale = 1;
    this.flashTimer = 0;
    this.rotation = 0;
    this.rotSpeed = (Math.random() - 0.5) * 6;
    this.spawnTime = performance.now();
    this.dead = false;
    this.opacity = 1; this.scale = 1;
    this.vegEmoji = null;
    this.stuckSizeMultiplier = 1.4; // 입안 크기 배율 (물릴때마다 줄어듦)
    // attract
    this.attractX = 0; this.attractY = 0;
    this.attractTimer = 0;
    // explode
    this.explodeTimer = 0;
  }

  attractTo(x, y) {
    this.attractX = x; this.attractY = y;
    this.phase = 'attracted';
    this.attractTimer = 0.25;
  }

  bite() {
    if (this.dead || this.health <= 0) return false;
    this.health--;
    this.shakeTimer = 0.35; this.squishScale = 0.5; this.flashTimer = 0.2;
    if (this.health === 2) {
      // 1번째 물기: 크게 물었다! (입안에서 큰 상태)
      this.crushState = CABBAGE_STATES.CRUSH1;
      this.crushScaleX = 1.3; this.crushScaleY = 0.85;
      this.stuckSizeMultiplier = 1.4; // 입안에서 크게
    } else if (this.health === 1) {
      // 2번째 물기: 으적으적 (중간 크기)
      this.crushState = CABBAGE_STATES.CRUSH2;
      this.crushScaleX = 1.1; this.crushScaleY = 0.75;
      this.stuckSizeMultiplier = 0.85; // 좀 작아짐
    } else if (this.health <= 0) {
      // 3번째 물기: 와구! 완전히 먹음
      this.phase = 'exploding';
      this.explodeTimer = 0.08;
      return true;
    }
    return false;
  }

  getImage() {
    switch (this.crushState) {
      case CABBAGE_STATES.CRUSH2: return Assets.lettuce.crush2;
      case CABBAGE_STATES.CRUSH1: return Assets.lettuce.crush1;
      default: return Assets.lettuce.normal;
    }
  }

  update(dt) {
    if (this.shakeTimer > 0) this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    if (this.flashTimer > 0) this.flashTimer = Math.max(0, this.flashTimer - dt);
    this.squishScale += (1 - this.squishScale) * Math.min(1, dt * 6);

    switch (this.phase) {
      case 'bouncing': {
        // 당구대 스타일: 중력 없이 4면 벽 반사
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.rotation += this.rotSpeed * dt;
        const r = this.size / 2;
        if (this.x - r < 0) { this.x = r; this.vx = Math.abs(this.vx); this.rotSpeed *= -0.8; }
        if (this.x + r > this.canvasW) { this.x = this.canvasW - r; this.vx = -Math.abs(this.vx); this.rotSpeed *= -0.8; }
        if (this.y - r < 0) { this.y = r; this.vy = Math.abs(this.vy); this.rotSpeed *= -0.8; }
        if (this.y + r > this.canvasH) { this.y = this.canvasH - r; this.vy = -Math.abs(this.vy); this.rotSpeed *= -0.8; }
        // 최소 속도 유지 — 느려지면 다시 가속
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const minSpeed = 120;
        if (speed < minSpeed) {
          const scale = minSpeed / Math.max(speed, 1);
          this.vx *= scale;
          this.vy *= scale;
        }
        break;
      }
      case 'attracted': {
        this.attractTimer -= dt;
        const t = Math.min(1, dt * 18);
        this.x += (this.attractX - this.x) * t;
        this.y += (this.attractY - this.y) * t;
        this.rotation *= 0.85;
        if (this.attractTimer <= 0) {
          this.phase = 'stuck';
        }
        break;
      }
      case 'stuck': {
        // Position is set externally by GameEngine
        this.rotation *= 0.95;
        break;
      }
      case 'exploding': {
        this.explodeTimer -= dt;
        this.scale = 1.5 + (0.08 - this.explodeTimer) * 10;
        this.opacity -= dt * 15;
        if (this.explodeTimer <= 0 || this.opacity <= 0) { this.dead = true; this.opacity = 0; }
        break;
      }
    }
  }

  draw(ctx) {
    if (this.dead || this.opacity <= 0) return;
    const img = this.getImage();
    if (!img) return;
    ctx.save();
    ctx.globalAlpha = this.opacity;
    let shakeX = 0, shakeY = 0;
    if (this.shakeTimer > 0) {
      const i = this.shakeTimer / 0.35;
      shakeX = Math.sin(this.shakeTimer*60)*8*i; shakeY = Math.cos(this.shakeTimer*45)*4*i;
    }
    ctx.translate(this.x + shakeX, this.y + shakeY);
    ctx.rotate(this.rotation);
    ctx.scale(this.scale*this.crushScaleX*this.squishScale, this.scale*this.crushScaleY*(2-this.squishScale));
    const hs = this.size / 2;
    if (this.vegEmoji) {
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;
      const eImg = getEmojiImage(this.vegEmoji, Math.round(this.size * 0.85));
      const es = eImg.width;
      ctx.drawImage(eImg, -es / 2, -es / 2, es, es);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    } else {
      ctx.drawImage(img, -hs, -hs, this.size, this.size);
    }
    if (this.flashTimer > 0) {
      ctx.globalAlpha = this.flashTimer/0.2*0.6; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(0, 0, hs*0.85, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  getHitRadius() { return this.size * 0.4 * this.scale; }
  isEdible() { return !this.dead && this.health > 0 && this.phase === 'bouncing'; }
  isStuck() { return !this.dead && this.phase === 'stuck'; }
}


// ─── Lion (Crocodile AR Renderer) ───────────────────────────
// 포즈 랜드마크 기반으로 악어를 사용자 몸 위에 렌더링
class Lion {
  constructor() {
    // 기본 위치 (포즈 없을 때 fallback)
    this.x = 480; this.y = 300; this.baseScale = 0.5;
    this.targetScale = 0.5;
    this.jawOpen = 0; this.jawTarget = 0;
    this.jawMaxOffset = 60;
    this.bellyScale = 0; this.maneGlow = 0;

    // 호환용 상수 (getCollisionBounds 등에서 사용)
    this.UPPER_W = 340;
    this.UPPER_H = 340 * (306 / 349);
    this.LOWER_W = 240;
    this.LOWER_H = 240 * (151 / 253);

    // 포즈 랜드마크 (index.html에서 매 프레임 업데이트)
    this.pose = null; // { lw, rw, ls, rs, le, re, lh, rh, nose, CW, CH }
    this._smoothPose = null; // 스무딩된 포즈
    // 입이 벌어져 있을 때의 충돌 범위 (물기 판정용)
    this._peakBounds = null;
  }

  setPose(data) {
    this.pose = data;
    // 포즈 스무딩 (떨림 방지)
    if (!data) { this._smoothPose = null; return; }
    const alpha = 0.12; // 0=완전스무딩, 1=원본 그대로 (낮을수록 부드러움)
    if (!this._smoothPose) {
      this._smoothPose = JSON.parse(JSON.stringify(data));
      return;
    }
    const sp = this._smoothPose;
    const keys = ['lw','rw','ls','rs','le','re'];
    for (const k of keys) {
      if (data[k] && sp[k]) {
        sp[k].x += (data[k].x - sp[k].x) * alpha;
        sp[k].y += (data[k].y - sp[k].y) * alpha;
      }
    }
    sp.CW = data.CW; sp.CH = data.CH;
    // lh, rh, lf, rf, nose는 있으면 복사
    if (data.lh) sp.lh = data.lh;
    if (data.rh) sp.rh = data.rh;
    if (data.lf) sp.lf = data.lf;
    if (data.rf) sp.rf = data.rf;
    if (data.nose) sp.nose = data.nose;
  }
  setJawFromPose(openAmount) { this.jawTarget = Math.max(0, Math.min(1, openAmount)); }

  snapJaw() {
    this.maneGlow = 1;
    this.bellyScale = Math.min(1, this.bellyScale + 0.12);
  }

  update(dt) {
    this.baseScale += (this.targetScale - this.baseScale) * Math.min(1, 6 * dt);
    const closing = this.jawTarget < this.jawOpen;
    const speed = closing ? 50 : 35; // 빠른 동작 대응: 열림/닫힘 속도 UP
    this.jawOpen += (this.jawTarget - this.jawOpen) * Math.min(1, speed * dt);
    this.jawOpen = Math.max(0, Math.min(1, this.jawOpen));
    if (this.maneGlow > 0) this.maneGlow = Math.max(0, this.maneGlow - dt * 2);
    if (this.bellyScale > 0) this.bellyScale = Math.max(0, this.bellyScale - dt * 0.15);
    // 입이 조금이라도 열려있으면 충돌 범위 스냅샷 저장 (빠른 동작도 잡히도록)
    if (this.jawOpen > 0.02) {
      this._peakBounds = this.getCollisionBounds();
    }
  }

  // ── 포즈 → 화면 좌표 변환 ──
  _px(lm, CW, CH) { return (1 - lm.x) * CW; }
  _py(lm, CW, CH) { return lm.y * CH; }

  /** 렌더링용 스무딩 포즈 (없으면 원본) */
  _getRenderPose() { return this._smoothPose || this.pose; }

  /** 상악 팔 / 하악 팔 판별: Y가 더 높은 손목이 상악 */
  _getJawArms() {
    const p = this._getRenderPose();
    if (!p) return null;
    const lwY = this._py(p.lw, p.CW, p.CH);
    const rwY = this._py(p.rw, p.CW, p.CH);
    // Y 작은 쪽(화면 위쪽)이 상악
    if (lwY < rwY) {
      return {
        upper: { shoulder: p.ls, elbow: p.le, wrist: p.lw },
        lower: { shoulder: p.rs, elbow: p.re, wrist: p.rw },
      };
    } else {
      return {
        upper: { shoulder: p.rs, elbow: p.re, wrist: p.rw },
        lower: { shoulder: p.ls, elbow: p.le, wrist: p.lw },
      };
    }
  }

  /** 입이 향하는 방향 판별: 양 손목 평균 X vs 양 어깨 평균 X */
  _getFacingRight() {
    const p = this._getRenderPose();
    if (!p) return true;
    const { CW, CH } = p;
    const wristMidX = (this._px(p.lw, CW, CH) + this._px(p.rw, CW, CH)) / 2;
    const shoulderMidX = (this._px(p.ls, CW, CH) + this._px(p.rs, CW, CH)) / 2;
    return wristMidX < shoulderMidX; // 카메라 미러링 반영
  }

  /** 팔 끝점: 항상 손목에서 팔꿈치→손목 방향으로 50% 연장 (손가락끝 커버) */
  _getArmEnd(arm, CW, CH) {
    const wx = this._px(arm.wrist, CW, CH), wy = this._py(arm.wrist, CW, CH);
    const ex = this._px(arm.elbow, CW, CH), ey = this._py(arm.elbow, CW, CH);
    const dx = wx - ex, dy = wy - ey;
    return { x: wx + dx * 0.5, y: wy + dy * 0.5 };
  }

  /** jawW 계산 공통 헬퍼 — _drawJaw / getMouthTip 등에서 동일 값 사용 */
  _calcJawW() {
    return Math.max(520, Math.min(1100, this.baseScale * this.UPPER_W * 3.5));
  }

  /** 어깨 중심에서 좌/우 방향으로 나오는 악어 턱 */
  _drawJaw(ctx, isUpper, CW, CH) {
    const img = isUpper ? Assets.croc.upper : Assets.croc.lower;
    if (!img) return;
    const p = this._getRenderPose();
    if (!p) return;

    // 어깨 중심점
    const cx = (this._px(p.ls, CW, CH) + this._px(p.rs, CW, CH)) / 2;
    const cy = (this._py(p.ls, CW, CH) + this._py(p.rs, CW, CH)) / 2;

    const facingRight = this._getFacingRight();

    const jawW = this._calcJawW();
    const aspect = img.naturalWidth / img.naturalHeight;
    const jawH = jawW / aspect;

    // 입 열림 각도 (최대 26도): 상악은 위로, 하악은 아래로
    const maxAngle = Math.PI / 7;
    const openAngle = this.jawOpen * maxAngle;
    const angle = isUpper ? -openAngle : openAngle;

    // 닫혔을 때 상악 하단·하악 상단이 어깨 중심선에서 맞닿음
    const offsetY = isUpper ? -jawH : 0;

    ctx.save();
    ctx.translate(cx, cy);
    if (facingRight) ctx.scale(-1, 1); // 손목이 왼쪽 → scale로 악어를 왼쪽으로 뻗음
    ctx.rotate(angle);
    // 얼굴(눈) = x=0 (어깨 중심), 입/주둥이 끝 = x=jawW (바깥 방향)
    ctx.drawImage(img, 0, offsetY, jawW, jawH);
    ctx.restore();
  }

  /** 악어 몸통 — 사용자 어깨 위에 이미지 렌더링 (입 방향으로 눈이 향함) */
  _drawBody(ctx, CW, CH) {
    const img = Assets.croc.body;
    if (!img) return;
    const p = this._getRenderPose();
    if (!p) return;
    const lsx = this._px(p.ls, CW, CH), lsy = this._py(p.ls, CW, CH);
    const rsx = this._px(p.rs, CW, CH), rsy = this._py(p.rs, CW, CH);
    const facingRight = this._getFacingRight();

    // 팔(턱) 이미지 시작점에 몸통 배치
    const arms = this._getJawArms();
    let cx, cy, refArmLen;
    if (arms) {
      // 양쪽 턱의 시작점(하악 어깨 = 상악의 반대쪽 어깨)
      cx = this._px(arms.lower.shoulder, CW, CH);
      cy = this._py(arms.lower.shoulder, CW, CH);
      const ux = this._px(arms.upper.wrist, CW, CH) - this._px(arms.upper.shoulder, CW, CH);
      const uy = this._py(arms.upper.wrist, CW, CH) - this._py(arms.upper.shoulder, CW, CH);
      refArmLen = Math.sqrt(ux * ux + uy * uy);
    } else {
      cx = (lsx + rsx) / 2;
      cy = (lsy + rsy) / 2;
      refArmLen = Math.abs(lsx - rsx) * 1.4;
    }
    const aspect = img.naturalWidth / img.naturalHeight;
    const drawW = refArmLen * 0.75;
    const drawH = drawW / aspect;

    ctx.save();
    ctx.translate(cx, cy);
    // 왼쪽을 향할 때 좌우 flip (눈이 입 방향을 보도록)
    if (!facingRight) {
      ctx.scale(-1, 1);
    }
    // 얼굴 가리지 않게 약간 아래로
    ctx.drawImage(img, -drawW / 2, -drawH * 0.3, drawW, drawH);
    ctx.restore();
  }

  drawLowerJaw(ctx) {
    const rp = this._getRenderPose();
    if (!rp) { this._drawFallbackJaw(ctx, false); return; }
    this._drawJaw(ctx, false, rp.CW, rp.CH);
  }

  drawUpperJaw(ctx) {
    const rp = this._getRenderPose();
    if (!rp) { this._drawFallbackJaw(ctx, true); return; }
    this._drawJaw(ctx, true, rp.CW, rp.CH);
  }

  /** 몸통 (z-index 최상단 — 상악/하악 위에 그림) */
  drawBody(ctx) {
    const rp = this._getRenderPose();
    if (!rp) return;
    const { CW, CH } = rp;
    this._drawBody(ctx, CW, CH);
  }

  /** 포즈 없을 때 fallback 렌더링 (간단한 악어 머리) */
  _drawFallbackJaw(ctx, isUpper) {
    const sc = this.baseScale;
    const jawDown = this.jawOpen * this.jawMaxOffset;
    const w = 200 * sc, h = 50 * sc;
    ctx.save();
    ctx.translate(this.x, this.y);
    if (isUpper) {
      ctx.fillStyle = '#2D6B30';
      ctx.beginPath();
      ctx.moveTo(-w/2, 0); ctx.lineTo(w/2, -h*0.3);
      ctx.lineTo(w/2, h*0.2); ctx.lineTo(-w/2, h*0.3);
      ctx.closePath(); ctx.fill();
      // 눈
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-w*0.35, -h*0.3, h*0.2, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.ellipse(-w*0.35, -h*0.3, h*0.07, h*0.15, 0, 0, Math.PI*2); ctx.fill();
    } else {
      ctx.save();
      ctx.translate(0, jawDown * sc);
      ctx.fillStyle = '#5DB761';
      ctx.beginPath();
      ctx.moveTo(-w*0.4, -h*0.1); ctx.lineTo(w/2, -h*0.1);
      ctx.lineTo(w/2, h*0.3); ctx.lineTo(-w*0.4, h*0.2);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  draw(ctx) { this.drawLowerJaw(ctx); this.drawUpperJaw(ctx); }

  /** 충돌 범위 = 어깨 중심 ~ 주둥이 끝 사이 영역 */
  getCollisionBounds() {
    const p = this._getRenderPose();
    if (!p) {
      const sc = this.baseScale;
      const jawDown = this.jawOpen * this.jawMaxOffset * sc;
      const w = 200 * sc;
      return {
        left: this.x - w / 2, top: this.y - 50 * sc,
        right: this.x + w / 2, bottom: this.y + jawDown + 50 * sc,
        width: w, height: 100 * sc + jawDown,
        centerX: this.x, centerY: this.y + jawDown / 2,
      };
    }
    const { CW, CH } = p;
    const cx = (this._px(p.ls, CW, CH) + this._px(p.rs, CW, CH)) / 2;
    const facingRight = this._getFacingRight();
    // 좌우 방향만 맞으면 먹힘: 악어가 향하는 쪽 화면 절반 전체
    // facingRight=true → 악어 왼쪽, facingRight=false → 악어 오른쪽
    const left  = facingRight ? 0  : cx;
    const right = facingRight ? cx : CW;
    return { left, top: 0, right, bottom: CH,
      width: right - left, height: CH,
      centerX: (left + right) / 2, centerY: CH / 2 };
  }

  /** 물기 판정용 충돌 범위 (입이 벌어져 있을 때 스냅샷) */
  getBiteBounds() {
    return this._peakBounds || this.getCollisionBounds();
  }

  /** 입 끝 위치 (주둥이 끝) — 자석 끌어오기 타겟 */
  getMouthTip() {
    const p = this._getRenderPose();
    if (!p) return { x: this.x, y: this.y };
    const { CW, CH } = p;
    const cx = (this._px(p.ls, CW, CH) + this._px(p.rs, CW, CH)) / 2;
    const cy = (this._py(p.ls, CW, CH) + this._py(p.rs, CW, CH)) / 2;
    const facingRight = this._getFacingRight();
    const jawW = this._calcJawW();
    // facingRight=true → 악어 왼쪽, facingRight=false → 악어 오른쪽
    return { x: facingRight ? cx - jawW * 0.9 : cx + jawW * 0.9, y: cy };
  }

  drawCollisionDebug(ctx) {
    const b = this.getCollisionBounds();
    ctx.save();
    ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
    ctx.fillRect(b.left, b.top, b.width, b.height);
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.left, b.top, b.width, b.height);
    ctx.restore();
  }
}


// ─── Particle System ────────────────────────────────────────
class ParticleSystem {
  constructor() { this.particles = []; }

  emitEat(x, y, intensity = 1, foodEmoji) {
    const count = Math.floor(18 * intensity);
    const emojis = [foodEmoji || '⭐', '⭐', '✨', '🎉', '💥', '🔥'];
    const colors = ['#CFEFCF', '#E8D7FF', '#FFD6E8', '#FFE8A8', '#FFD700', '#FF6B6B', '#FF8C00'];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
      const speed = (120 + Math.random() * 220) * Math.max(1, intensity * 0.7);
      this.particles.push({ x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed-100*intensity,
        life: 1.2+Math.random()*1.0*intensity, age: 0, size: (8+Math.random()*12)*Math.min(2.5, intensity*0.7),
        color: colors[Math.floor(Math.random()*colors.length)],
        emoji: Math.random()<0.6 ? emojis[Math.floor(Math.random()*emojis.length)] : null });
    }
  }

  emitCrush(x, y) {
    for (let i = 0; i < 8; i++) {
      this.particles.push({ x, y, vx: (Math.random()-0.5)*120, vy: -50-Math.random()*80,
        life: 0.6+Math.random()*0.3, age: 0, size: 4+Math.random()*6,
        color: ['#B8E6B8','#CFEFCF','#A6D9A6','#FFE8A8'][Math.floor(Math.random()*4)],
        emoji: Math.random()<0.3 ? '💥' : null });
    }
  }

  emitBiteSparkle(x, y) {
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI*2/6)*i;
      this.particles.push({ x, y, vx: Math.cos(a)*60, vy: Math.sin(a)*60,
        life: 0.4, age: 0, size: 3+Math.random()*4, color: '#fff', emoji: null });
    }
  }

  update(dt) {
    for (let i = this.particles.length-1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt; p.vy += 500*dt; p.x += p.vx*dt; p.y += p.vy*dt;
      if (p.age >= p.life) this.particles.splice(i, 1);
    }
  }

  draw(ctx) {
    for (const p of this.particles) {
      const alpha = Math.max(0, 1-p.age/p.life);
      ctx.globalAlpha = alpha;
      if (p.emoji) {
        ctx.font = `${p.size*2}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(p.emoji, p.x, p.y);
      } else {
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}


// ─── Confetti / Ending System ───────────────────────────────
class EndingSystem {
  constructor(cw, ch) {
    this.CW = cw; this.CH = ch;
    this.active = false;
    this.confetti = [];      // 초기 폭발 콘페티
    this.fallingPieces = []; // box2d 스타일 떨어지는 조각들
    this.floorMap = [];      // 바닥 높이맵 (쌓이는 효과)
    this.timer = 0;
    this.spawnTimer = 0;
    this.COLS = 48;          // 높이맵 컬럼 수
    this.score = 0;
    this.totalBites = 0;
    this.textAlpha = 0;
  }

  start(score, totalBites, levelCleared = false, level = 1, selectedVegetable = null, stageResults = []) {
    this.active = true;
    this.score = score;
    this.totalBites = totalBites;
    this.levelCleared = levelCleared;
    this.level = level;
    this.vegEmoji = selectedVegetable ? selectedVegetable.emoji : '🥬';
    this.stageResults = stageResults; // [{emoji, count}, ...]
    this.timer = 0;
    this.spawnTimer = 0;
    this.textAlpha = 0;
    this.displayScore = 0; // 카운트업 애니메이션용
    this.titleScale = 0;   // 줌인 등장용
    this.starCount = Math.min(3, Math.floor(score / 3) + (score > 0 ? 1 : 0)); // 별 등급
    this.confetti = [];
    this.fallingPieces = [];
    this.floorMap = new Array(this.COLS).fill(0);

    // 초기 폭발 콘페티 (여러 발)
    for (let burst = 0; burst < 3; burst++) {
      const bx = this.CW * (0.25 + burst * 0.25);
      const by = this.CH * 0.35;
      for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 200 + Math.random() * 400;
        this.confetti.push({
          x: bx, y: by,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 300,
          size: 4 + Math.random() * 8,
          color: this._randomColor(),
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 15,
          life: 2 + Math.random() * 2,
          age: 0 + burst * 0.3,
          type: Math.random() < 0.3 ? 'circle' : 'rect',
        });
      }
    }
  }

  stop() {
    this.active = false;
    this.confetti = [];
    this.fallingPieces = [];
  }

  _randomColor() {
    const colors = ['#FF6B6B','#FFD93D','#6BCB77','#4D96FF','#FF6B9D',
                    '#C084FC','#FB923C','#34D399','#F472B6','#FBBF24',
                    '#A78BFA','#38BDF8','#FFE8A8','#CFEFCF','#FFD6E8'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  _randomEmoji() {
    const veg = this.vegEmoji || '🥬';
    const emojis = [veg, veg, veg, '⭐','🎉','🎊','💚','✨','🦁','🌟','🏆','💫'];
    return emojis[Math.floor(Math.random() * emojis.length)];
  }

  update(dt) {
    if (!this.active) return;
    this.timer += dt;

    // 텍스트 페이드인 + 제목 줌인 + 점수 카운트업
    if (this.textAlpha < 1) this.textAlpha = Math.min(1, this.textAlpha + dt * 2);
    if (this.titleScale < 1) this.titleScale = Math.min(1, this.titleScale + dt * 3);
    if (this.timer > 0.5 && this.displayScore < this.score) {
      this.displayScore = Math.min(this.score, this.displayScore + dt * Math.max(3, this.score * 1.5));
    }

    // 폭발 콘페티 업데이트
    for (let i = this.confetti.length - 1; i >= 0; i--) {
      const c = this.confetti[i];
      c.age += dt;
      if (c.age < 0) continue; // 딜레이
      c.vy += 400 * dt; // gravity
      c.vx *= 0.99;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.rotation += c.rotSpeed * dt;
      if (c.age >= c.life) this.confetti.splice(i, 1);
    }

    // (떨어지는 이모티콘 쌓기 제거됨)
  }

  draw(ctx) {
    if (!this.active) return;

    // 폭발 콘페티
    for (const c of this.confetti) {
      if (c.age < 0) continue;
      const alpha = Math.max(0, 1 - c.age / c.life);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rotation);
      ctx.fillStyle = c.color;
      if (c.type === 'circle') {
        ctx.beginPath(); ctx.arc(0, 0, c.size, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillRect(-c.size, -c.size * 0.4, c.size * 2, c.size * 0.8);
      }
      ctx.restore();
    }

    // (떨어지는 이모티콘 그리기 제거됨)

    // 텍스트 오버레이 (드라마틱 연출)
    if (this.textAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = this.textAlpha;

      // 반투명 배경 (더 넓고 진하게)
      const bgGrad = ctx.createLinearGradient(0, this.CH * 0.08, 0, this.CH * 0.72);
      bgGrad.addColorStop(0, 'rgba(0,0,0,0)');
      bgGrad.addColorStop(0.12, 'rgba(0,0,0,0.5)');
      bgGrad.addColorStop(0.88, 'rgba(0,0,0,0.5)');
      bgGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, this.CH * 0.08, this.CW, this.CH * 0.64);

      const cx = this.CW / 2;

      // 단계별 이모지 + 점수 텍스트
      if (this.timer > 0.5) {
        const results = this.stageResults || [];
        const emojiSize = 48;
        const emojiGap = 56;
        const stageGap = this.CH * 0.08; // 단계 간 세로 간격
        const startY = this.CH * 0.22;
        let curDelay = 0.5;

        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

        for (let s = 0; s < results.length; s++) {
          const res = results[s];
          const rowY = startY + s * stageGap;

          // 단계 라벨
          if (this.timer > curDelay) {
            const labelAlpha = Math.min(1, (this.timer - curDelay) * 4);
            ctx.save();
            ctx.globalAlpha = this.textAlpha * labelAlpha;
            ctx.fillStyle = '#FFD700';
            ctx.font = "bold 28px 'Jua', 'Apple SD Gothic Neo', sans-serif";
            ctx.fillText(`${s + 1}단계`, cx - (Math.max(res.count, 1)) * emojiGap / 2 - 50, rowY);
            ctx.restore();
          }

          // 이모지들
          const totalEmojis = res.count;
          const emojiStartX = cx - (totalEmojis - 1) * emojiGap / 2;
          ctx.font = `${emojiSize}px sans-serif`;
          for (let i = 0; i < totalEmojis; i++) {
            const delay = curDelay + 0.1 + i * 0.12;
            if (this.timer > delay) {
              const pop = Math.min(1, (this.timer - delay) * 6);
              const popScale = pop < 1 ? pop * 1.3 : 1 + Math.sin(this.timer * 3 + i + s) * 0.05;
              ctx.save();
              ctx.translate(emojiStartX + i * emojiGap, rowY);
              ctx.scale(popScale, popScale);
              ctx.globalAlpha = this.textAlpha;
              ctx.fillText(res.emoji, 0, 0);
              ctx.restore();
            }
          }
          // 0개면 텍스트로 표시
          if (totalEmojis === 0 && this.timer > curDelay + 0.1) {
            ctx.save();
            ctx.globalAlpha = this.textAlpha * 0.5;
            ctx.fillStyle = '#aaa';
            ctx.font = "600 28px 'Jua', 'Apple SD Gothic Neo', sans-serif";
            ctx.fillText('0개', cx, rowY);
            ctx.restore();
          }

          curDelay += 0.1 + totalEmojis * 0.12 + 0.15;
        }

        // 총 점수 텍스트
        if (this.timer > curDelay) {
          const ds = Math.floor(this.displayScore);
          const textAlpha = Math.min(1, (this.timer - curDelay) * 3);
          ctx.globalAlpha = this.textAlpha * textAlpha;
          ctx.fillStyle = '#fff';
          ctx.font = "bold 80px 'Jua', 'Apple SD Gothic Neo', sans-serif";
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 10;
          ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 5;
          const totalY = startY + results.length * stageGap + 20;
          const scoreText = `총 ${ds}개 먹었어요!`;
          ctx.strokeText(scoreText, cx, totalY);
          ctx.fillText(scoreText, cx, totalY);
          ctx.shadowBlur = 0;

          ctx.font = "600 32px 'Jua', 'Apple SD Gothic Neo', sans-serif";
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.fillText(`${this.totalBites}번 물었어요`, cx, totalY + 55);
        }
      }

      // "한번 더?/그만할래" 버튼은 DOM에서 표시 (캔버스에는 그리지 않음)

      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}


// ─── Collision Detection (Lion 이미지 기반) ─────────────────
function checkLionCollision(lion, cabbage) {
  const b = lion.getCollisionBounds();
  const r = cabbage.getHitRadius();
  const cx = cabbage.x, cy = cabbage.y;
  // 원(cabbage) vs 사각형(lion bounds) 충돌
  const closestX = Math.max(b.left, Math.min(cx, b.right));
  const closestY = Math.max(b.top, Math.min(cy, b.bottom));
  const dx = cx - closestX, dy = cy - closestY;
  return (dx * dx + dy * dy) <= (r * r);
}


// ─── Floating Text ──────────────────────────────────────────
class FloatingText {
  constructor() { this.texts = []; }
  add(text, x, y, color = '#fff', size = 28) {
    this.texts.push({ text, x, y, color, size, age: 0, life: 1.2 });
  }
  update(dt) {
    for (let i = this.texts.length-1; i >= 0; i--) {
      const t = this.texts[i]; t.age += dt; t.y -= 40*dt;
      if (t.age >= t.life) this.texts.splice(i, 1);
    }
  }
  draw(ctx) {
    for (const t of this.texts) {
      const alpha = Math.max(0, 1-t.age/t.life);
      const scale = 1 + Math.sin(t.age*8)*0.06;
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.translate(t.x, t.y); ctx.scale(scale, scale);
      ctx.fillStyle = t.color;
      ctx.font = `bold ${t.size}px 'Apple SD Gothic Neo', sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 3;
      ctx.strokeText(t.text, 0, 0); ctx.fillText(t.text, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}


// ─── Screen Shake ───────────────────────────────────────────
class ScreenShake {
  constructor() { this.offsetX = 0; this.offsetY = 0; this.intensity = 0; this.timer = 0; this.duration = 0.2; }
  trigger(intensity = 8, duration = 0.2) {
    this.intensity = Math.max(this.intensity, intensity);
    this.duration = Math.max(duration, this.timer);
    this.timer = this.duration;
  }
  update(dt) {
    if (this.timer > 0) {
      this.timer -= dt; const t = Math.max(0, this.timer / this.duration);
      this.offsetX = (Math.random()-0.5)*2*this.intensity*t;
      this.offsetY = (Math.random()-0.5)*2*this.intensity*t;
    } else { this.offsetX = 0; this.offsetY = 0; this.intensity = 0; }
  }
}


// ─── Food Selection ─────────────────────────────────────────
const FOOD_GROUPS = [
  { label: '과일', items: [
    { emoji: '🍎', name: '사과', voice: 'apple' },
    { emoji: '🍌', name: '바나나', voice: 'banana' },
    { emoji: '🍇', name: '포도', voice: 'grape' },
    { emoji: '🍓', name: '딸기', voice: 'strawberry' },
    { emoji: '🍊', name: '귤', voice: 'tangerine' },
    { emoji: '🍉', name: '수박', voice: 'watermelon' },
  ]},
  { label: '간식', items: [
    { emoji: '🍕', name: '피자', voice: 'pizza' },
    { emoji: '🍔', name: '햄버거', voice: 'hamburger' },
    { emoji: '🍟', name: '감자튀김', voice: 'fries' },
    { emoji: '🌭', name: '핫도그', voice: 'hotdog' },
    { emoji: '🍬', name: '사탕', voice: 'candy' },
    { emoji: '🧃', name: '주스', voice: 'juice' },
  ]},
  { label: '디저트', items: [
    { emoji: '🍩', name: '도넛', voice: 'donut' },
    { emoji: '🍰', name: '케이크', voice: 'cake' },
    { emoji: '🧁', name: '컵케이크', voice: 'cupcake' },
    { emoji: '🍦', name: '아이스크림', voice: 'icecream' },
    { emoji: '🍪', name: '쿠키', voice: 'cookie' },
    { emoji: '🍫', name: '초콜릿', voice: 'chocolate' },
  ]},
];
const FOODS = FOOD_GROUPS.flatMap(g => g.items);

const _emojiCache = {};
function getEmojiImage(emoji, size) {
  const key = emoji + '|' + size;
  if (_emojiCache[key]) return _emojiCache[key];
  const s = Math.ceil(size * 1.2);
  const off = document.createElement('canvas');
  off.width = s; off.height = s;
  const c = off.getContext('2d');
  c.font = `${size}px sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(emoji, s / 2, s / 2);
  _emojiCache[key] = off;
  return off;
}



// ─── Game Engine ────────────────────────────────────────────
class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.CW = canvas.width; this.CH = canvas.height;
    this.lion = new Lion();   // 플레이어 1 (왼쪽)
    this.lion2 = new Lion();  // 플레이어 2 (오른쪽)
    this.coopMode = false;    // 1인 모드
    this.particles = new ParticleSystem();
    this.floatingText = new FloatingText();
    this.screenShake = new ScreenShake();
    this.sound = new SoundManager();
    this.ending = new EndingSystem(canvas.width, canvas.height);
    this.cabbages = [];
    this.score = 0; this.totalBites = 0; this.totalEaten = 0;
    this.playTime = 0; // 플레이 경과 시간 (초)
    this.running = false; this.paused = false;
    this.gameEnded = false;
    this.flashAlpha = 0; this.flashColor = '#fff';
    this.config = { cabbageSize: 140, fxIntensity: 1, maxCabbages: 5, spawnWaitSec: 10, totalStages: 3, stageDuration: 20 };
    this.selectedVegetable = null;
    this._waitingForSelection = false;
    this.stage = 1; // 현재 단계 (1~3)
    this.level = 1; // 호환용
    this.levelCleared = false;
    this._lastTime = 0;
    this.stageTime = 0; // 현재 단계 경과 시간 (초)
    this.cycleEaten = 0; // 현재 단계 내 먹은 수
    this.stageResults = []; // 단계별 결과 [{emoji, count}, ...]
    this.logger = new EventLogger();
  }

  async init() {
    await Assets.load();
    this.sound.init();
    this.sound.loadCheerVoices();
    this.sound.loadReadyVoice();
    this.sound.loadFoodVoices();
    this.lion.x = this.CW / 2;
    this.lion.y = this.CH * 0.65;
    this.lion2.x = this.CW / 2;
    this.lion2.y = this.CH * 0.65;
  }

  start() {
    this.running = true; this.paused = false; this.gameEnded = false;
    this.levelCleared = false;
    this.score = 0; this.totalBites = 0; this.totalEaten = 0;
    this.playTime = 0; this.cycleEaten = 0; this.stageTime = 0;
    this.cabbages = [];
    this.particles.particles = []; this.floatingText.texts = [];
    this.lion.bellyScale = 0; this.lion.jawOpen = 0;
    this.lion2.bellyScale = 0; this.lion2.jawOpen = 0;
    this._lastBiteTime = 0; this._lastBiteTime2 = 0;
    this._lastTime = performance.now();
    this.ending.stop();
    this.selectedVegetable = null;
    this._waitingForSelection = true;
    this.stage = 1; this.level = 1;
    this.stageResults = [];
    this.logger.log('session_start', { timestamp: Date.now() });
  }

  /** 음식 선택 화면 표시 (index.html에서 호출) */
  showFoodSelect() {
    this.selectedVegetable = null;
    this._waitingForSelection = true;
    if (this.onShowFoodSelect) this.onShowFoodSelect();
  }

  selectFood(food) {
    this.selectedVegetable = food;
    this._waitingForSelection = false;
    this.sound.playSlotPick();
    if (food.voice) this.sound.playFoodVoice(food.voice);
    this.logger.log('food_selected', { food: food.name, emoji: food.emoji, cycle: this.level });
  }

  /** 카운트다운 후 실제 게임 시작 (index.html에서 호출) */
  startGame() {
    this.running = true;
    this._lastTime = performance.now();
    this.sound.resume(); this.sound.startBGM();
    this.spawnCabbage();
  }

  stop() {
    this.running = false;
    this.sound.stopBGM();
  }

  startNextStage() {
    this.stage++; this.level = this.stage;
    this.paused = false; this.gameEnded = false;
    this.levelCleared = false;
    this.cycleEaten = 0; this.stageTime = 0;
    this.cabbages = [];
    this.particles.particles = []; this.floatingText.texts = [];
    this.lion.jawOpen = 0;
    this._lastTime = performance.now();
    this.ending.stop();
    this.selectedVegetable = null;
    this._waitingForSelection = true;
    this.logger.log('next_stage', { stage: this.stage, totalScore: this.score, playTime: Math.round(this.playTime) });
    if (this.onShowFoodSelect) this.onShowFoodSelect();
  }

  // 호환용
  startNextCycle() { this.startNextStage(); }

  spawnCabbage() {
    // 당구대 스타일: 4면 중 랜덤 벽에서 랜덤 각도로 진입
    const side = Math.floor(Math.random() * 4); // 0=left,1=right,2=top,3=bottom
    let startX, startY, vx, vy;
    const spd = 180 + Math.random() * 200;
    const angle = (Math.random() - 0.5) * Math.PI * 0.6; // ±54° 랜덤 각도
    if (side === 0) {        // left
      startX = -60; startY = this.CH * (0.15 + Math.random() * 0.7);
      vx = Math.cos(angle) * spd; vy = Math.sin(angle) * spd;
    } else if (side === 1) { // right
      startX = this.CW + 60; startY = this.CH * (0.15 + Math.random() * 0.7);
      vx = -Math.cos(angle) * spd; vy = Math.sin(angle) * spd;
    } else if (side === 2) { // top
      startX = this.CW * (0.15 + Math.random() * 0.7); startY = -60;
      vx = Math.sin(angle) * spd; vy = Math.cos(angle) * spd;
    } else {                 // bottom
      startX = this.CW * (0.15 + Math.random() * 0.7); startY = this.CH + 60;
      vx = Math.sin(angle) * spd; vy = -Math.cos(angle) * spd;
    }
    // 사이클 내 먹은 수에 따라 크기 점진적 증가 (1→5: 100%→140%)
    const sizeBoost = 1 + this.cycleEaten * 0.1;
    const size = Math.round(this.config.cabbageSize * sizeBoost);
    const c = new Cabbage(startX, startY, vx, vy, size, this.CW, this.CH);
    if (this.selectedVegetable) c.vegEmoji = this.selectedVegetable.emoji;
    this.cabbages.push(c);
  }

  flash(color = '#fff', alpha = 0.3) { this.flashColor = color; this.flashAlpha = alpha; }

  /** 사이클 내 몇 번째 먹었는지에 따라 다른 메시지 */
  _getEatMessage(cycleN, emoji) {
    if (cycleN >= 5) return '초거대 ' + emoji + '!! 와구!!';
    if (cycleN === 4) return emoji + emoji + emoji + ' 세 개!';
    if (cycleN === 3) return emoji + emoji + ' 두 개!';
    if (cycleN === 2) return '더 큰 ' + emoji + '!';
    return '+1 ' + emoji;
  }

  tryBite(playerLion) {
    const lion = playerLion || this.lion;
    if (!this.running || this.paused || this._waitingForSelection) return;
    // 연속 물기 방지: 최소 120ms 간격 (아이들 빠른 동작 대응)
    const now = performance.now();
    const key = lion === this.lion2 ? '_lastBiteTime2' : '_lastBiteTime';
    if (now - (this[key] || 0) < 120) return;
    this[key] = now;
    this.totalBites++;
    this.sound.resume();
    lion.snapJaw();

    // 입 끝 위치 (자석 끌어오기 타겟)
    const tip = lion.getMouthTip();
    const mouthX = tip.x;
    const mouthY = tip.y;

    const praisePool = ['잘했어!', '대단해!', '최고야!', '멋져!', '와 잘한다!', '굿!'];
    const vegIcon = this.selectedVegetable ? this.selectedVegetable.emoji : '🥬';

    // 1) 이미 끼여있는 양배추가 있으면 그것을 물기
    let stuck = this.cabbages.find(c => c.isStuck());
    if (stuck) {
      const healthBefore = stuck.health;
      const fullyEaten = stuck.bite();
      if (this.selectedVegetable && this.selectedVegetable.voice) this.sound.playFoodVoice(this.selectedVegetable.voice);

      if (fullyEaten) {
        // ── 3번째 물기: 와구!! 완전히 먹음 ──
        this.score++; this.totalEaten++; this.cycleEaten++;
        this.logger.log('eat', { type: 'stuck_bite', food: vegIcon, cycleEaten: this.cycleEaten, totalEaten: this.totalEaten, playTime: Math.round(this.playTime) });
        this.sound.playCrunchBite(); // 최강 와구작 사운드
        this.particles.emitEat(stuck.x, stuck.y, 5, vegIcon);
        const eatMsg = this._getEatMessage(this.cycleEaten, vegIcon);
        this.floatingText.add(eatMsg, stuck.x, stuck.y - 30, '#FFD700', 52);
        this.sound.playEatComplete();
        this.screenShake.trigger(35, 0.6);
        this.flash('#FFD700', 0.7);
        setTimeout(() => { this.screenShake.trigger(18, 0.3); this.flash('#fff', 0.25); }, 120);
        const praise = praisePool[this.totalEaten % praisePool.length];
        this.floatingText.add(praise, this.CW/2, this.CH*0.15, '#fff', 40);
        this.sound.playPraise(praise);
      } else if (healthBefore === 2) {
        // ── 2번째 물기: 으적! 중간 단계 ──
        this.sound.playMidCrunch();
        this.particles.emitCrush(stuck.x, stuck.y);
        this.particles.emitBiteSparkle(stuck.x, stuck.y);
        this.screenShake.trigger(20, 0.35);
        this.flash('#FFA500', 0.35);
        this.floatingText.add('으적! 💥', stuck.x, stuck.y-20, '#FF8C00', 38);
      } else {
        // ── 1번째 물기(방금 잡힌 직후): 아삭 ──
        this.sound.playBite();
        this.particles.emitBiteSparkle(stuck.x, stuck.y);
        this.screenShake.trigger(10, 0.2);
        this.flash('#fff', 0.2);
        this.floatingText.add('아삭! ' + vegIcon, stuck.x, stuck.y-20, '#8fc98f', 34);
      }
      return;
    }

    // 2) 입 벌렸을 때 스냅샷 범위(peakBounds) 안에 있는 음식만 대상
    const colBounds = lion.getBiteBounds();
    let best = null, bestDist = Infinity;
    for (const c of this.cabbages) {
      if (!c.isEdible()) continue;
      // 양배추 가장자리가 충돌 범위에 닿으면 OK (반지름 고려)
      const hr = c.getHitRadius();
      if (c.x + hr < colBounds.left || c.x - hr > colBounds.right ||
          c.y + hr < colBounds.top || c.y - hr > colBounds.bottom) continue;
      const dx = c.x - mouthX, dy = c.y - mouthY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < bestDist) { bestDist = dist; best = c; }
    }

    if (!best) {
      // 빈 물기 — 입 범위에 아무것도 없음
      this.screenShake.trigger(4, 0.15);
      this.logger.log('bite', { result: 'miss', playTime: Math.round(this.playTime) });
      return;
    }

    // 양배추를 입으로 끌어당기고 첫 물기
    best._stuckLion = lion; // 어느 플레이어 입에 물렸는지 기록
    best.attractTo(mouthX, mouthY);
    const fullyEaten = best.bite();
    this.sound.playBite();
    if (this.selectedVegetable && this.selectedVegetable.voice) this.sound.playFoodVoice(this.selectedVegetable.voice);
    this.particles.emitBiteSparkle(mouthX, mouthY);
    this.particles.emitCrush(best.x, best.y);
    this.sound.playCrush();
    this.screenShake.trigger(6, 0.15);
    this.flash('#fff', 0.12);
    this.floatingText.add('아삭! ' + vegIcon, best.x, best.y-20, '#8fc98f', 30);

    if (fullyEaten) {
      this.score++; this.totalEaten++; this.cycleEaten++;
      this.particles.emitEat(best.x, best.y, 5, vegIcon);
      this.floatingText.add('+1 ' + vegIcon, best.x, best.y-30, '#FFD700', 52);
      this.sound.playEatComplete();
      this.screenShake.trigger(35, 0.6);
      this.flash('#FFD700', 0.7);
      setTimeout(() => { this.screenShake.trigger(18, 0.3); this.flash('#fff', 0.25); }, 120);
      const praise = praisePool[this.totalEaten % praisePool.length];
      this.floatingText.add(praise, this.CW/2, this.CH*0.15, '#fff', 40);
      this.sound.playPraise(praise);
    }
  }

  tick(timestamp) {
    const dt = Math.min((timestamp - this._lastTime) / 1000, 0.05);
    this._lastTime = timestamp;

    // 엔딩 업데이트 (게임 끝나도 계속)
    if (this.ending.active) this.ending.update(dt);

    // 게임 끝나도 사자/파티클/쉐이크 계속 업데이트 (화면 freeze 방지)
    this.lion.update(dt);
    if (this.coopMode) this.lion2.update(dt);
    this.particles.update(dt);
    this.floatingText.update(dt);
    this.screenShake.update(dt);
    if (this.flashAlpha > 0) this.flashAlpha = Math.max(0, this.flashAlpha - dt * 3);

    if (!this.running || this.paused) return;

    if (this._waitingForSelection) return;

    this.playTime += dt;
    this.stageTime += dt;

    // 20초 타이머 → 단계 종료
    if (this.stageTime >= this.config.stageDuration) {
      this.levelCleared = true;
      this.cabbages = [];
      this.stop();
      this.logger.log('stage_complete', { stage: this.stage, score: this.score, cycleEaten: this.cycleEaten, playTime: Math.round(this.playTime) });
      // 현재 단계 결과 저장
      this.stageResults.push({ emoji: this.selectedVegetable ? this.selectedVegetable.emoji : '🥬', count: this.cycleEaten });

      if (this.stage >= this.config.totalStages) {
        // 3단계 모두 끝 → 게임 완료
        this.gameEnded = true;
        this.ending.start(this.score, this.totalBites, true, this.stage, this.selectedVegetable, this.stageResults);
        this.sound.playFanfare();
        this.flash('#FFD700', 0.6);
        this.screenShake.trigger(15, 0.4);
        setTimeout(() => this.sound.playPraise('대단해! 3단계 모두 클리어!'), 800);
        if (this.onGameEnd) this.onGameEnd(this.score, true);
      } else {
        // 다음 단계로 → 음식 선택
        this.sound.playFanfare();
        this.flash('#FFD700', 0.4);
        setTimeout(() => this.sound.playPraise(this.stage + '단계 클리어!'), 500);
        if (this.onStageEnd) this.onStageEnd(this.stage);
      }
      return;
    }

    // 스폰 로직: 0개면 즉시 스폰. 10초 이상 먹히지 않은 양배추가 있으면 +1 (최대 5개)
    const alive = this.cabbages.filter(c => !c.dead);
    const now = performance.now();
    if (alive.length === 0) {
      this.spawnCabbage();
    } else if (alive.length < this.config.maxCabbages) {
      const oldest = alive.reduce((a, b) => a.spawnTime < b.spawnTime ? a : b);
      const newest = alive.reduce((a, b) => a.spawnTime > b.spawnTime ? a : b);
      if (now - oldest.spawnTime > this.config.spawnWaitSec * 1000 &&
          now - newest.spawnTime > this.config.spawnWaitSec * 1000) {
        this.spawnCabbage();
      }
    }

    // stuck 양배추는 해당 악어 입 끝에 고정
    for (const c of this.cabbages) {
      if (c.phase === 'stuck') {
        const stuckLion = c._stuckLion || this.lion;
        const mouthTip = stuckLion.getMouthTip();
        c.x = mouthTip.x;
        c.y = mouthTip.y;
        // 입안 크기 스무스 보간
        const targetScale = c.stuckSizeMultiplier || 1;
        c.scale += (targetScale - c.scale) * Math.min(1, 8 * dt);
      }
      c.update(dt);
    }
    this.cabbages = this.cabbages.filter(c => !c.dead);
  }

  /** 3단계 씹기 진행도 UI (입 안에 물고 있을 때) */
  drawChewingUI(ctx) {
    const stuck = this.cabbages.find(c => c.isStuck());
    if (!stuck) return;
    const bites = CABBAGE_MAX_HEALTH - stuck.health; // 0, 1, 2 (먹은 횟수)
    const total = CABBAGE_MAX_HEALTH; // 3
    const cx = stuck.x;
    const cy = stuck.y - stuck.size * stuck.scale * 0.7 - 12;
    const dotR = 10;
    const gap = 28;
    const startX = cx - (total - 1) * gap / 2;

    for (let i = 0; i < total; i++) {
      const x = startX + i * gap;
      const filled = i < bites;
      // 원 배경
      ctx.beginPath();
      ctx.arc(x, cy, dotR, 0, Math.PI * 2);
      ctx.fillStyle = filled ? '#FF6B00' : 'rgba(255,255,255,0.3)';
      ctx.fill();
      ctx.strokeStyle = filled ? '#FFD700' : 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      // 이모지 (채워진 것만)
      if (filled) {
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.fillText('✓', x, cy + 1);
      }
    }
    // 라벨
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 4;
    ctx.fillText(`${bites}/${total}`, cx, cy - dotR - 10);
    ctx.shadowBlur = 0;
  }

  renderCameraBackground(video) {
    if (!video || video.readyState < 2) return;
    const ctx = this.ctx;
    ctx.save(); ctx.translate(this.CW, 0); ctx.scale(-1, 1);
    const vw = video.videoWidth||640, vh = video.videoHeight||480;
    const va = vw/vh, ca = this.CW/this.CH;
    let sx=0,sy=0,sw=vw,sh=vh;
    if (va>ca) { const nw=vh*ca; sx=(vw-nw)/2; sw=nw; }
    else { const nh=vw/ca; sy=(vh-nh)/2; sh=nh; }
    ctx.drawImage(video, sx,sy,sw,sh, 0,0, this.CW,this.CH);
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(0,0, this.CW,this.CH);
  }
}


// ─── Event Logger (PMF 측정용) ──────────────────────────────
class EventLogger {
  constructor() {
    this.events = [];
    this.sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  log(type, data = {}) {
    this.events.push({ t: Date.now(), session: this.sessionId, type, ...data });
  }
  toCSV() {
    if (this.events.length === 0) return '';
    const keys = [...new Set(this.events.flatMap(e => Object.keys(e)))];
    const header = keys.join(',');
    const rows = this.events.map(e => keys.map(k => {
      const v = e[k]; return v === undefined ? '' : typeof v === 'string' && v.includes(',') ? '"' + v + '"' : v;
    }).join(','));
    return header + '\n' + rows.join('\n');
  }
  download() {
    const csv = this.toCSV();
    if (!csv) return;
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'waguwagu_log_' + this.sessionId + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
}


// ─── Export ─────────────────────────────────────────────────
window.GameEngine = GameEngine;
window.Assets = Assets;
window.Lion = Lion;
window.Cabbage = Cabbage;
window.ParticleSystem = ParticleSystem;
window.FloatingText = FloatingText;
window.SoundManager = SoundManager;
window.ScreenShake = ScreenShake;
window.EndingSystem = EndingSystem;
window.CABBAGE_STATES = CABBAGE_STATES;
window.checkLionCollision = checkLionCollision;
window.FOODS = FOODS;
window.FOOD_GROUPS = FOOD_GROUPS;
window.getEmojiImage = getEmojiImage;
window.EventLogger = EventLogger;
