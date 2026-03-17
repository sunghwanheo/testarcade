// ============================================================
//  audio.js  — 절차적 사운드 + OGG 방귀 + BGM (Web Audio API)
// ============================================================

class AudioEngine {
  constructor() {
    this.actx        = null;
    this.master      = null;
    this.volume      = 0.7;
    this.ready       = false;
    this.fartBuffers      = [];   // fart_1~2.ogg (일반 방귀)
    this.feverFartBuffer  = null; // fart_0.ogg  (가장 큰 소리, 피버 전용)
    this.voiceBuffer      = null; // start_voice.mp3
    this.feverVoiceBuffer = null; // fever_voice.mp3 (응가타임)
    this.cheerBuffers     = [];   // voice_cheer_04/07/09/12.wav
    this._bgmNode    = null; // BGM 루프 timeout handle
    this._bgmStep    = 0;
  }

  /** 반드시 사용자 제스처(클릭) 이후 호출 */
  init() {
    if (this.ready) return;
    this.actx   = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.actx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.actx.destination);
    this.ready  = true;
    this._loadFartSounds();
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  // ── OGG/MP3 파일 로드 ──
  async _loadFartSounds() {
    // fart_0 = 가장 큰 소리 → 피버 전용
    try {
      const res = await fetch('assets/fart_0.ogg');
      const buf = await this.actx.decodeAudioData(await res.arrayBuffer());
      this.feverFartBuffer = buf;
    } catch (e) { console.warn('fart_0.ogg 로드 실패', e); }

    // fart_1, fart_2 = 일반 방귀
    for (let i = 1; i < 3; i++) {
      try {
        const res = await fetch(`assets/fart_${i}.ogg`);
        const buf = await this.actx.decodeAudioData(await res.arrayBuffer());
        this.fartBuffers.push(buf);
      } catch (e) { console.warn(`fart_${i}.ogg 로드 실패`, e); }
    }

    // 음성 파일 미리 로드
    try {
      const res = await fetch('assets/start_voice.mp3');
      const buf = await this.actx.decodeAudioData(await res.arrayBuffer());
      this.voiceBuffer = buf;
    } catch (e) { console.warn('start_voice.mp3 로드 실패', e); }

    // 피버타임 음성 (응가타임)
    try {
      const res = await fetch('assets/fever_voice.mp3');
      const buf = await this.actx.decodeAudioData(await res.arrayBuffer());
      this.feverVoiceBuffer = buf;
    } catch (e) { console.warn('fever_voice.mp3 로드 실패', e); }

    // 칭찬 음성 4종 (04, 07, 09, 12)
    for (const n of ['04', '07', '09', '12']) {
      try {
        const res = await fetch(`assets/voice_cheer_${n}.wav`);
        const buf = await this.actx.decodeAudioData(await res.arrayBuffer());
        this.cheerBuffers.push({ id: n, buf });
      } catch (e) { console.warn(`voice_cheer_${n}.wav 로드 실패`, e); }
    }
  }

  // ── 브라운 노이즈 버퍼 생성 ──
  _brownNoise(duration) {
    const sr  = this.actx.sampleRate;
    const len = Math.ceil(sr * duration);
    const buf = this.actx.createBuffer(1, len, sr);
    const d   = buf.getChannelData(0);
    let last  = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      d[i]    = (last + 0.02 * w) / 1.02;
      last    = d[i];
      d[i]   *= 3.5;
    }
    const src = this.actx.createBufferSource();
    src.buffer = buf;
    return src;
  }

  // ── 방귀 소리 재생 공통 ──
  _playBuffer(buf, gainVal = 1.0) {
    const src = this.actx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = 0.88 + Math.random() * 0.26;
    const g = this.actx.createGain();
    g.gain.value = gainVal;
    src.connect(g); g.connect(this.master);
    src.start();
  }

  // ── 일반 방귀 (fart_1, fart_2) ──
  playFart(gaugePct = 0) {
    if (!this.ready) return;
    if (this.fartBuffers.length > 0) {
      this._playBuffer(this.fartBuffers[Math.floor(Math.random() * this.fartBuffers.length)]);
    } else {
      this._playFartProcedural(gaugePct);
    }
    this._tick(gaugePct);
  }

  // ── 피버 방귀 (fart_0, 가장 큰 소리) ──
  playFeverFart(gaugePct = 0) {
    if (!this.ready) return;
    if (this.feverFartBuffer) {
      this._playBuffer(this.feverFartBuffer, 1.2);
    } else {
      this._playFartProcedural(gaugePct);
    }
    this._tick(gaugePct);
  }

  _playFartProcedural(gaugePct) {
    const now = this.actx.currentTime;
    const dur = 0.48 + Math.random() * 0.36;

    const noise = this._brownNoise(dur + 0.08);
    const bpf   = this.actx.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.value = 62 + Math.random() * 55;
    bpf.Q.value = 0.6;

    const env = this.actx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(1.1, now + 0.016);
    env.gain.setValueAtTime(1.1, now + dur * 0.12);
    env.gain.exponentialRampToValueAtTime(0.001, now + dur);

    const lfo  = this.actx.createOscillator();
    const lfoG = this.actx.createGain();
    lfo.frequency.value = 3 + Math.random() * 7;
    lfoG.gain.value = 38;
    lfo.connect(lfoG);
    lfoG.connect(bpf.frequency);

    noise.connect(bpf);
    bpf.connect(env);
    env.connect(this.master);

    const bass  = this.actx.createOscillator();
    bass.type   = 'sawtooth';
    bass.frequency.setValueAtTime(70 + Math.random() * 20, now);
    bass.frequency.exponentialRampToValueAtTime(22, now + dur * 0.55);
    const bassG = this.actx.createGain();
    bassG.gain.setValueAtTime(0.62, now);
    bassG.gain.exponentialRampToValueAtTime(0.001, now + dur * 0.55);
    bass.connect(bassG);
    bassG.connect(this.master);
    bass.start(now); bass.stop(now + dur * 0.6);

    lfo.start(now); noise.start(now);
    lfo.stop(now + dur); noise.stop(now + dur);
  }

  _tick(pct) {
    const now  = this.actx.currentTime;
    const osc  = this.actx.createOscillator();
    const gain = this.actx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 320 + pct * 280;
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now); osc.stop(now + 0.09);
  }

  // ── 피버 똥 터지는 소리 ──
  playPoopBurst() {
    if (!this.ready) return;
    const now = this.actx.currentTime;

    // 짧은 노이즈 펑!
    const noise = this._brownNoise(0.28);
    const bpf   = this.actx.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.value = 180 + Math.random() * 120;
    bpf.Q.value = 0.8;
    const env = this.actx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.9, now + 0.008);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    noise.connect(bpf); bpf.connect(env); env.connect(this.master);
    noise.start(now); noise.stop(now + 0.28);

    // 피치 다운 스윕
    const osc = this.actx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160 + Math.random() * 60, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.22);
    const g = this.actx.createGain();
    g.gain.setValueAtTime(0.45, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(g); g.connect(this.master);
    osc.start(now); osc.stop(now + 0.24);
  }

  // ── 똥 발사 사운드 ──
  playBigPoop() {
    if (!this.ready) return;
    const now = this.actx.currentTime;

    const noise = this._brownNoise(0.9);
    const lpf   = this.actx.createBiquadFilter();
    lpf.type = 'lowpass'; lpf.frequency.value = 350;
    const env = this.actx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(1.1, now + 0.04);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    noise.connect(lpf); lpf.connect(env); env.connect(this.master);
    noise.start(now); noise.stop(now + 0.9);

    const bass = this.actx.createOscillator();
    bass.type = 'sine';
    bass.frequency.setValueAtTime(90, now);
    bass.frequency.exponentialRampToValueAtTime(28, now + 0.55);
    const bg = this.actx.createGain();
    bg.gain.setValueAtTime(0.7, now);
    bg.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    bass.connect(bg); bg.connect(this.master);
    bass.start(now); bass.stop(now + 0.55);

    setTimeout(() => this._splat(), 1200);
  }

  _splat() {
    if (!this.ready) return;
    const now   = this.actx.currentTime;
    const noise = this._brownNoise(0.3);
    const lpf   = this.actx.createBiquadFilter();
    lpf.type = 'lowpass'; lpf.frequency.value = 800;
    const g = this.actx.createGain();
    g.gain.setValueAtTime(1.0, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    noise.connect(lpf); lpf.connect(g); g.connect(this.master);
    noise.start(now); noise.stop(now + 0.3);
  }

  // ── 게임 클리어 박수 + 환호 ──
  playApplause() {
    if (!this.ready) return;
    const now = this.actx.currentTime;

    // 박수 — 고주파 노이즈 8연타
    for (let i = 0; i < 10; i++) {
      const t     = now + i * 0.11;
      const noise = this._brownNoise(0.09);
      const hpf   = this.actx.createBiquadFilter();
      hpf.type = 'highpass'; hpf.frequency.value = 1400;
      const g = this.actx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.55, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      noise.connect(hpf); hpf.connect(g); g.connect(this.master);
      noise.start(t); noise.stop(t + 0.09);
    }

    // 환호 — 오르는 노이즈 스윕
    const cheer = this._brownNoise(2.0);
    const bpf   = this.actx.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.setValueAtTime(300, now + 0.2);
    bpf.frequency.linearRampToValueAtTime(1200, now + 1.5);
    bpf.Q.value = 0.4;
    const cg = this.actx.createGain();
    cg.gain.setValueAtTime(0, now + 0.2);
    cg.gain.linearRampToValueAtTime(0.35, now + 0.5);
    cg.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
    cheer.connect(bpf); bpf.connect(cg); cg.connect(this.master);
    cheer.start(now + 0.2); cheer.stop(now + 2.1);

    // 팡파레 — 상행 7음
    const fanfare = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
    fanfare.forEach((f, i) => {
      const t   = now + 0.4 + i * 0.12;
      const osc = this.actx.createOscillator();
      const g   = this.actx.createGain();
      osc.type = 'triangle'; osc.frequency.value = f;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.45, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(g); g.connect(this.master);
      osc.start(t); osc.stop(t + 0.5);
    });
  }

  // ── 음성 파일 재생 ──
  playVoice(_name) {
    if (!this.ready) return;
    if (this.voiceBuffer) {
      this._playBuffer(this.voiceBuffer, 1.0);
    }
  }

  // ── 칭찬 음성 랜덤 (4종 중 1개) ──
  playCheer() {
    if (!this.ready || this.cheerBuffers.length === 0) return;
    const pick = this.cheerBuffers[Math.floor(Math.random() * this.cheerBuffers.length)];
    this._playBuffer(pick.buf, 1.0);
  }

  // ── 피버 종료 칭찬 (04 제외, 3종 중 1개) ──
  playFeverEndCheer() {
    if (!this.ready || this.cheerBuffers.length === 0) return;
    const pool = this.cheerBuffers.filter(c => c.id !== '04');
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    this._playBuffer(pick.buf, 1.0);
  }

  // ── 피버타임 음성 (응가타임) ──
  playFeverVoice() {
    if (!this.ready) return;
    if (this.feverVoiceBuffer) {
      this._playBuffer(this.feverVoiceBuffer, 1.0);
    }
  }

  // ── 레벨업 징글 ──
  playLevelUp() {
    if (!this.ready) return;
    const now   = this.actx.currentTime;
    const freqs = [261.63, 329.63, 392.00, 523.25, 659.25];
    freqs.forEach((f, i) => {
      const t   = now + i * 0.11;
      const osc = this.actx.createOscillator();
      const g   = this.actx.createGain();
      osc.type = 'triangle'; osc.frequency.value = f;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.38, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(g); g.connect(this.master);
      osc.start(t); osc.stop(t + 0.25);
    });
  }

  // ============================================================
  //  귀여운 BGM — 16스텝 멜로디 루프 (~120 BPM)
  // ============================================================
  startBGM() {
    if (!this.ready || this._bgmNode) return;
    this._bgmStep = 0;
    this._scheduleBGM();
  }

  stopBGM() {
    if (this._bgmNode) {
      clearTimeout(this._bgmNode);
      this._bgmNode = null;
    }
  }

  _scheduleBGM() {
    // C5 D5 E5 G5 A5 C6 스케일 기반의 귀여운 8비트 멜로디
    const melody = [
      523.25, 659.25, 783.99, 659.25,
      523.25, 440.00, 523.25, 659.25,
      783.99, 880.00, 783.99, 659.25,
      523.25, 392.00, 440.00, 523.25,
    ];
    const bass = [
      130.81, 130.81, 164.81, 164.81,
      130.81, 110.00, 130.81, 164.81,
      196.00, 220.00, 196.00, 164.81,
      130.81,  98.00, 110.00, 130.81,
    ];
    const BPM    = 128;
    const stepMs = (60 / BPM) * 500; // 8분음표

    const step = this._bgmStep % melody.length;
    this._bgmStep++;

    if (this.ready) {
      const now = this.actx.currentTime;

      // 멜로디 음표
      const mFreq = melody[step];
      if (mFreq > 0) {
        const osc = this.actx.createOscillator();
        const g   = this.actx.createGain();
        osc.type = 'square';
        osc.frequency.value = mFreq;
        // 가볍게: gain 낮게
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.04, now + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, now + stepMs / 1000 * 0.85);
        osc.connect(g); g.connect(this.master);
        osc.start(now); osc.stop(now + stepMs / 1000);
      }

      // 베이스 음표 (4박자마다)
      if (step % 4 === 0) {
        const bFreq = bass[step];
        const bosc  = this.actx.createOscillator();
        const bg    = this.actx.createGain();
        bosc.type = 'triangle';
        bosc.frequency.value = bFreq;
        bg.gain.setValueAtTime(0, now);
        bg.gain.linearRampToValueAtTime(0.06, now + 0.02);
        bg.gain.exponentialRampToValueAtTime(0.001, now + stepMs * 4 / 1000 * 0.7);
        bosc.connect(bg); bg.connect(this.master);
        bosc.start(now); bosc.stop(now + stepMs * 4 / 1000);
      }
    }

    this._bgmNode = setTimeout(() => this._scheduleBGM(), stepMs);
  }
}

const audio = new AudioEngine();
