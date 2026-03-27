// ============================================================
//  effects.js  — blur 없는 radialGradient 파티클 + 화면 가득 이펙트
// ============================================================

// ── ScreenFlash : 방귀 순간 화면 전체 색 플래시 (즉각 피드백) ──
class ScreenFlash {
  constructor(hue) {
    this.life  = 1.0;
    this.decay = 0.10;   // 빠르게 사라짐 (~10프레임)
    this.hue   = hue !== undefined ? hue : 90;
  }
  update() { this.life -= this.decay; }
  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.life * 0.30;
    ctx.fillStyle   = `hsl(${this.hue},75%,68%)`;
    ctx.fillRect(0, 0, 9999, 9999);
    ctx.restore();
  }
  dead() { return this.life <= 0; }
}

// ── GasWave : 폭발적으로 퍼지는 링 (화면 가득 채움) ───────────
class GasWave {
  constructor(x, y, hue, delay = 0) {
    this.x    = x; this.y = y;
    this.r    = 10;
    this.life = 1.0;
    this.hue  = hue !== undefined ? hue : 90;
    this.expandRate = 55;   // 빠른 확장
    this.delay = delay;
    this.started = false;
  }
  update() {
    if (this.delay > 0) { this.delay--; return; }
    this.started = true;
    this.r += this.expandRate;
    this.expandRate *= 0.88;
    this.life -= 0.030;
  }
  draw(ctx) {
    if (!this.started || this.life <= 0) return;
    const inner = Math.max(0, this.r - 60);
    const g = ctx.createRadialGradient(this.x, this.y, inner, this.x, this.y, this.r);
    g.addColorStop(0,   `hsla(${this.hue},80%,70%,0)`);
    g.addColorStop(0.5, `hsla(${this.hue},80%,70%,${this.life * 0.55})`);
    g.addColorStop(1,   `hsla(${this.hue},80%,70%,0)`);
    ctx.save();
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  dead() { return this.life <= 0; }
}

// ── GasPuff : 큰 가스 구름 (radialGradient, blur 없음) ─────────
class GasPuff {
  constructor(x, y, colorHue) {
    this.x  = x + (Math.random() - 0.5) * 120;
    this.y  = y + (Math.random() - 0.5) * 60;
    this.vx = (Math.random() - 0.5) * 3.5;
    this.vy = -1.8 - Math.random() * 2.8;
    this.r  = 70 + Math.random() * 90;   // 크게!
    this.life  = 1.0;
    this.decay = 0.014 + Math.random() * 0.010;
    this.hue   = colorHue !== undefined ? colorHue : 90 + Math.random() * 40;
    this.sat   = 55 + Math.random() * 30;
    this.lig   = 60 + Math.random() * 18;
  }
  update() {
    this.x  += this.vx;
    this.y  += this.vy;
    this.vy += 0.04;
    this.vx *= 0.97;
    this.r  += 1.8;
    this.life -= this.decay;
  }
  draw(ctx) {
    if (this.life <= 0) return;
    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
    const a1 = this.life * 0.60;
    const a2 = this.life * 0.25;
    g.addColorStop(0,   `hsla(${this.hue},${this.sat}%,${this.lig}%,${a1})`);
    g.addColorStop(0.55,`hsla(${this.hue},${this.sat}%,${this.lig}%,${a2})`);
    g.addColorStop(1,   `hsla(${this.hue},${this.sat}%,${this.lig}%,0)`);
    ctx.save();
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  dead() { return this.life <= 0; }
}

// ── GasDot : 작은 방사형 파티클 (blur 없음) ──────────────────
class GasDot {
  constructor(x, y, colorHue) {
    this.x  = x + (Math.random() - 0.5) * 80;
    this.y  = y + (Math.random() - 0.5) * 40;
    const angle = Math.random() * Math.PI * 2;
    const spd   = 3 + Math.random() * 9;
    this.vx = Math.cos(angle) * spd;
    this.vy = Math.sin(angle) * spd - 3;
    this.r  = 8 + Math.random() * 14;
    this.life  = 1.0;
    this.decay = 0.022 + Math.random() * 0.018;
    this.hue   = colorHue !== undefined ? colorHue : 90 + Math.random() * 60;
  }
  update() {
    this.x += this.vx; this.y += this.vy;
    this.vy += 0.05; this.vx *= 0.96;
    this.r  += 0.5; this.life -= this.decay;
  }
  draw(ctx) {
    if (this.life <= 0) return;
    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
    g.addColorStop(0, `hsla(${this.hue},75%,70%,${this.life * 0.7})`);
    g.addColorStop(1, `hsla(${this.hue},75%,70%,0)`);
    ctx.save();
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  dead() { return this.life <= 0; }
}

// ── ExplodingPoop : 화면 중앙에서 사방으로 터지는 똥 ──────────
class ExplodingPoop {
  constructor(cx, cy, poopImg, colorHue, rainbow) {
    this.x = cx; this.y = cy;
    const angle = Math.random() * Math.PI * 2;
    const speed = 22 + Math.random() * 28;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 6;
    this.size = 50 + Math.random() * 60;
    this.life  = 1.0;
    this.decay = 0.007 + Math.random() * 0.004;
    this.rot    = Math.random() * Math.PI * 2;
    this.rotSpd = (Math.random() - 0.5) * 0.45;
    this.img    = poopImg;
    this.hueRotate = (colorHue !== undefined) ? (colorHue - 25 + 360) % 360 : null;
    this.rainbow   = rainbow || false;
  }
  update() {
    this.x += this.vx; this.y += this.vy;
    this.vy += 0.85; this.vx *= 0.94;
    this.rot += this.rotSpd;
    this.life -= this.decay;
  }
  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life);
    if (this.rainbow)            ctx.filter = `hue-rotate(${(Date.now()/5)%360}deg) saturate(1.8)`;
    else if (this.hueRotate !== null) ctx.filter = `hue-rotate(${this.hueRotate}deg) saturate(1.6)`;
    ctx.translate(this.x, this.y); ctx.rotate(this.rot);
    const s = this.size;
    if (this.img && this.img.complete) {
      ctx.drawImage(this.img, -s/2, -s/2, s, s);
    } else {
      ctx.filter = 'none';
      ctx.font = `${s}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('💩', 0, 0);
    }
    ctx.restore();
  }
  dead() { return this.life <= 0; }
}

// ── SVG 똥 오브젝트 (포물선 비행, 레벨 색상 tint) ────────────
class PoopObject {
  constructor(sx, sy, canvasW, poopImg, colorHue, rainbow) {
    this.sx = sx; this.sy = sy;
    this.t  = 0;
    this.active = true;
    this.trail  = [];
    this.img    = poopImg;
    this.size   = 64;

    this.hueRotate = (colorHue !== undefined) ? (colorHue - 25 + 360) % 360 : null;
    this.rainbow   = rainbow || false;

    const dir  = Math.random() < 0.5 ? 1 : -1;
    const dist = canvasW * (0.3 + Math.random() * 0.35);
    this.ex = Math.max(80, Math.min(canvasW - 80, sx + dir * dist));
    this.ey = sy + 60 + Math.random() * 80;
    this.cy = sy - (160 + Math.random() * 130);

    this.speed = 0.013 + Math.random() * 0.007;
    this.rot   = 0;
    this.rotSpd= (Math.random() - 0.5) * 0.2;
  }

  _pos(t) {
    const mt = 1 - t;
    return {
      x: mt * mt * this.sx + 2 * mt * t * (this.sx + (this.ex - this.sx) * 0.5) + t * t * this.ex,
      y: mt * mt * this.sy + 2 * mt * t * this.cy + t * t * this.ey
    };
  }

  _applyColorFilter(ctx) {
    if (this.rainbow) {
      ctx.filter = `hue-rotate(${(Date.now() / 5) % 360}deg) saturate(1.8)`;
    } else if (this.hueRotate !== null) {
      ctx.filter = `hue-rotate(${this.hueRotate}deg) saturate(1.6)`;
    }
  }

  update() {
    if (!this.active) return;
    this.t += this.speed;
    if (this.t >= 1) { this.t = 1; this.active = false; }
    this.rot += this.rotSpd;
    const pos = this._pos(this.t);
    this.trail.push({ ...pos, r: this.rot });
    if (this.trail.length > 12) this.trail.shift();
  }

  draw(ctx) {
    this.trail.forEach((p, i) => {
      const a = (i / this.trail.length) * 0.25;
      const s = this.size * (0.45 + i / this.trail.length * 0.3);
      ctx.save();
      this._applyColorFilter(ctx);
      ctx.globalAlpha = a;
      ctx.translate(p.x, p.y); ctx.rotate(p.r);
      if (this.img && this.img.complete) ctx.drawImage(this.img, -s/2, -s/2, s, s);
      else { ctx.font=`${s}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('💩',0,0); }
      ctx.restore();
    });

    const pos = this._pos(this.t);
    ctx.save();
    this._applyColorFilter(ctx);
    ctx.translate(pos.x, pos.y); ctx.rotate(this.rot);
    const s = this.size;
    if (this.img && this.img.complete) ctx.drawImage(this.img, -s/2, -s/2, s, s);
    else { ctx.font=`${s}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('💩',0,0); }
    ctx.restore();

    if (this.t > 0.9) {
      const alpha = (1 - this.t) * 5;
      const r     = (this.t - 0.9) * 10 * 120;
      ctx.save();
      ctx.globalAlpha = alpha * 0.4;
      ctx.strokeStyle = '#ffd93d'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(this.ex, this.ey, r, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }

  done() { return !this.active; }
}

// ── 컨페티 ───────────────────────────────────────────────
class Confetti {
  constructor(x, y, colorHue) {
    this.x = x; this.y = y;
    const a = Math.random() * Math.PI * 2;
    const s = 6 + Math.random() * 9;
    this.vx = Math.cos(a) * s; this.vy = Math.sin(a) * s - 7;
    this.w  = 7 + Math.random() * 9;
    this.h  = 4 + Math.random() * 5;
    this.rot= Math.random() * Math.PI * 2;
    this.rs = (Math.random() - 0.5) * 0.22;
    this.life = 1.0; this.decay = 0.013 + Math.random() * 0.01;
    const h = colorHue !== undefined ? colorHue + (Math.random()-0.5)*60 : Math.random()*360;
    this.color = `hsl(${h},90%,62%)`;
  }
  update() {
    this.x += this.vx; this.y += this.vy;
    this.vy += 0.3; this.vx *= 0.995;
    this.rot += this.rs; this.life -= this.decay;
  }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle   = this.color;
    ctx.translate(this.x, this.y); ctx.rotate(this.rot);
    ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
    ctx.restore();
  }
  dead() { return this.life <= 0; }
}

// ── 피버타임 반짝 파티클 ──────────────────────────────────
class FeverSparkle {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.vx = (Math.random()-0.5)*7; this.vy = -2.5 - Math.random()*5;
    this.r  = 4 + Math.random()*8;
    this.life = 1.0; this.decay = 0.028 + Math.random()*0.024;
    this.hue = Math.random()*360;
    this.rot = Math.random()*Math.PI*2; this.rotSpd = (Math.random()-0.5)*0.28;
  }
  update() {
    this.x += this.vx; this.y += this.vy;
    this.vy += 0.13; this.vx *= 0.97;
    this.rot += this.rotSpd; this.hue += 4; this.life -= this.decay;
  }
  draw(ctx) {
    if (this.life <= 0) return;
    const r = this.r;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life * 0.92);
    ctx.fillStyle = `hsl(${this.hue},100%,68%)`;
    ctx.translate(this.x, this.y); ctx.rotate(this.rot);
    ctx.beginPath();
    ctx.moveTo(0,-r); ctx.lineTo(r*0.28,-r*0.28); ctx.lineTo(r,0);
    ctx.lineTo(r*0.28,r*0.28); ctx.lineTo(0,r); ctx.lineTo(-r*0.28,r*0.28);
    ctx.lineTo(-r,0); ctx.lineTo(-r*0.28,-r*0.28);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  dead() { return this.life <= 0; }
}

// ── 클리어 화면 알록달록 떨어지는 똥 ────────────────────────
class FallingPoop {
  constructor(canvasW, canvasH, poopImg) {
    this.canvasW = canvasW; this.canvasH = canvasH;
    this.x    = 60 + Math.random()*(canvasW-120);
    this.y    = -60 - Math.random()*600;
    this.vx   = (Math.random()-0.5)*7; this.vy = 1 + Math.random()*5;
    this.size = 50 + Math.random()*80;
    this.rot  = Math.random()*Math.PI*2; this.rotSpd = (Math.random()-0.5)*0.18;
    this.hueRotate = 0;
    this.img = poopImg; this.bounces = 0; this.settled = false;
  }
  update() {
    if (this.settled) return;
    this.x += this.vx; this.y += this.vy;
    this.vy += 0.55; this.vx *= 0.99; this.rot += this.rotSpd;
    const half = this.size*0.5;
    if (this.x-half < 0)            { this.x=half;              this.vx=Math.abs(this.vx)*0.65; }
    if (this.x+half > this.canvasW) { this.x=this.canvasW-half; this.vx=-Math.abs(this.vx)*0.65; }
    if (this.y+half >= this.canvasH) {
      this.y=this.canvasH-half; this.vy*=-0.42; this.vx*=0.82; this.rotSpd*=0.7;
      this.bounces++;
      if (Math.abs(this.vy)<1.5 || this.bounces>=5) { this.settled=true; this.vy=0; this.vx=0; }
    }
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y); ctx.rotate(this.rot);
    const s = this.size;
    if (this.img && this.img.complete) ctx.drawImage(this.img, -s/2, -s/2, s, s);
    else { ctx.font=`${s}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('💩',0,0); }
    ctx.restore();
  }
}

// ── PhysicsPoop : 피버타임 전용 — 발사시 크고, 착지하면 작아짐, 새 방귀에 통통 튀김 ──
class PhysicsPoop {
  constructor(cx, cy, img, canvasH, canvasW, allPoops, colorHue, rainbow) {
    this.x = cx; this.y = cy;
    this.vx = (Math.random() - 0.5) * 32;
    this.vy = -(18 + Math.random() * 18);
    this.r       = 16 + Math.random() * 12;   // 충돌 반경 (작아짐)
    this.drawR   = this.r * 2.6;              // 표시 크기 — 발사 시 크게!
    this._airR   = this.r * 2.2;              // 공중 표시 크기
    this._landR  = this.r * 1.5;              // 착지 후 표시 크기 (공중보다 작지만 눈에 보임)
    this.rot     = Math.random() * Math.PI * 2;
    this.rotSpd  = (Math.random() - 0.5) * 0.28;
    this.img     = img;
    this.settled = false;
    this._ch     = canvasH;
    this._cw     = canvasW;
    this._all    = allPoops;
    this._bounces = 0;
    this.rainbow   = rainbow || false;
    this.hueRotate = (!rainbow && colorHue !== undefined && colorHue >= 0)
                     ? (colorHue - 25 + 360) % 360 : null;
  }

  // 새 방귀가 터질 때 쌓인 똥들을 통통 튀기게
  bump() {
    this.settled   = false;
    this._bounces  = 0;
    this.vx       += (Math.random() - 0.5) * 10;
    this.vy       -= 5 + Math.random() * 7;
    this.rotSpd    = (Math.random() - 0.5) * 0.45;
    this.drawR     = this._landR * 1.7;  // 잠깐 커졌다가 다시 작아짐
  }

  update() {
    if (this.settled) {
      // 착지 후 표시 크기를 천천히 줄임
      this.drawR += (this._landR - this.drawR) * 0.09;
      return;
    }

    this.x  += this.vx;
    this.y  += this.vy;
    this.vy += 0.85;
    this.vx *= 0.995;
    this.rot += this.rotSpd;

    // 공중에서는 _airR 쪽으로 수렴
    this.drawR += (this._airR - this.drawR) * 0.05;

    // 바닥 충돌
    if (this.y + this.r >= this._ch) {
      this.y = this._ch - this.r;
      this.vy = -Math.abs(this.vy) * 0.40;
      this.vx *= 0.75;
      this.rotSpd *= 0.6;
      this._bounces++;
    }

    // 벽 충돌
    if (this.x - this.r < 0)        { this.x = this.r;            this.vx =  Math.abs(this.vx) * 0.5; }
    if (this.x + this.r > this._cw) { this.x = this._cw - this.r; this.vx = -Math.abs(this.vx) * 0.5; }

    // 원-원 충돌 (쌓인 똥 위)
    for (const s of this._all) {
      if (s === this || !s.settled) continue;
      const dx = this.x - s.x, dy = this.y - s.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const minD = this.r + s.r * 0.88;
      if (dist < minD && dist > 0.1) {
        const nx = dx/dist, ny = dy/dist;
        this.x = s.x + nx * minD;
        this.y = s.y + ny * minD;
        const dot = this.vx*nx + this.vy*ny;
        if (dot < 0) {
          this.vx = (this.vx - dot*nx) * 0.55;
          this.vy = (this.vy - dot*ny) * 0.55;
          this._bounces++;
        }
      }
    }

    const speed = Math.abs(this.vx) + Math.abs(this.vy);
    if (this._bounces >= 2 && speed < 1.2) {
      this.settled = true; this.vx = this.vy = this.rotSpd = 0;
    }
    if (this._bounces >= 8) {
      this.settled = true; this.vx = this.vy = this.rotSpd = 0;
    }
  }

  draw(ctx) {
    ctx.save();
    if (this.rainbow)                 ctx.filter = `hue-rotate(${(Date.now()/5)%360}deg) saturate(1.8)`;
    else if (this.hueRotate !== null) ctx.filter = `hue-rotate(${this.hueRotate}deg) saturate(1.5)`;
    ctx.translate(this.x, this.y); ctx.rotate(this.rot);
    const s = this.drawR * 2;
    if (this.img && this.img.complete) ctx.drawImage(this.img, -s/2, -s/2, s, s);
    else {
      ctx.filter = 'none';
      ctx.font = `${s}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('💩', 0, 0);
    }
    ctx.restore();
  }
}

// ── EffectsEngine ─────────────────────────────────────────
class EffectsEngine {
  constructor() {
    this.gas      = [];   // GasPuff
    this.dots     = [];   // GasDot
    this.waves    = [];   // GasWave
    this.flashes  = [];   // ScreenFlash
    this.poops    = [];
    this.confetti = [];
    this.shake         = { t: 0, intensity: 0 };
    this.feverSparkles = [];
    this.fallingPoops  = [];
    this.explodingPoops = [];
    this.physicPoops  = [];   // 피버타임 쌓이는 똥
    this.poopImgs = [];
    this._loadPoopImgs();
  }

  _loadPoopImgs() {
    const names = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'rainbow'];
    this.poopImgs = names.map(name => {
      const img = new Image();
      img.src = `assets/poop_${name}.png`;
      return img;
    });
  }

  // colorHue → 레벨별 똥 이미지 반환 (rainbow=true → poopImgs[6])
  _getPoopImg(colorHue, rainbow) {
    if (rainbow) return this.poopImgs[6];
    if (colorHue === undefined || colorHue === null) return this.poopImgs[0];
    const h = ((colorHue % 360) + 360) % 360;
    if (h < 14 || h >= 315)  return this.poopImgs[0]; // 빨강
    if (h < 45)               return this.poopImgs[1]; // 주황
    if (h < 90)               return this.poopImgs[2]; // 노랑
    if (h < 160)              return this.poopImgs[3]; // 초록
    if (h < 240)              return this.poopImgs[4]; // 파랑
    return this.poopImgs[5];                           // 보라
  }

  /** 방귀 이펙트 — 즉각 플래시 + 웨이브 + 폭발 똥 + 가스 구름 */
  spawnFart(x, y, hue, effectLevel, rainbow = false) {
    const puffCnt = { low: 4, medium: 7, strong: 10 }[effectLevel] || 7;
    const waveCnt = { low: 1, medium: 2, strong: 3  }[effectLevel] || 2;
    const getH = () => rainbow ? Math.random() * 360 : hue;

    // 즉각 화면 플래시
    this.flashes.push(new ScreenFlash(getH()));

    // 퍼지는 웨이브 (무지개일 때 각각 다른 색)
    for (let i = 0; i < waveCnt; i++) {
      this.waves.push(new GasWave(x, y, getH(), i * 3));
    }

    // 가스 구름 + burst (무지개일 때 각 파티클 랜덤 색)
    for (let i = 0; i < 2; i++) {
      const b = new GasPuff(x, y, getH());
      b.r *= 2.0; b.vy *= 1.8; b.decay *= 0.6;
      this.gas.push(b);
    }
    for (let i = 0; i < puffCnt; i++) this.gas.push(new GasPuff(x, y, getH()));

    this.shake.t = 0.7;
    this.shake.intensity = 14;
  }

  /** 게이지 100% — 대형 가스 폭발 + 똥 발사 */
  launchPoop(x, y, canvasW, effectLevel, colorHue, rainbow) {
    const cnt = { low: 2, medium: 3, strong: 4 }[effectLevel] || 3;

    this.flashes.push(new ScreenFlash(colorHue));
    for (let i = 0; i < 3; i++) this.waves.push(new GasWave(x, y, colorHue, i * 3));
    for (let i = 0; i < 16; i++) this.gas.push(new GasPuff(x, y, colorHue));
    for (let i = 0; i < 20; i++) this.dots.push(new GasDot(x, y, colorHue));

    if (getSite() !== 'handong') {
      const launchPoopImg = this._getPoopImg(colorHue, rainbow);
      for (let i = 0; i < cnt; i++) {
        setTimeout(() => {
          this.poops.push(new PoopObject(x, y, canvasW, launchPoopImg, colorHue, rainbow));
        }, i * 170);
      }
    }

    this.shake.t = 1.0;
    this.shake.intensity = 18;
  }

  /** 피버타임 — 사람 위치에서 펑! 똥이 사방으로 터져 하단에 쌓임 */
  spawnPoopFountain(x, y, canvasW, effectLevel, colorHue, rainbow, canvasH) {
    const cx = x, cy = y;
    const poopCnt = { low: 5, medium: 8, strong: 11 }[effectLevel] || 8;

    this.flashes.push(new ScreenFlash(colorHue));
    this.waves.push(new GasWave(cx, cy, colorHue, 0));

    // 기존에 쌓인 똥들 통통 튀기기
    for (const p of this.physicPoops) {
      if (p.settled) p.bump();
    }

    if (getSite() !== 'handong') {
      // 새 똥 스폰 — 무지개 레벨은 무지개 똥만
      const ch = canvasH || 720, cw = canvasW;
      for (let i = 0; i < poopCnt; i++) {
        const img = rainbow ? this.poopImgs[6] : this._getPoopImg(colorHue, false);
        this.physicPoops.push(new PhysicsPoop(cx, cy, img, ch, cw, this.physicPoops, rainbow ? colorHue : -1, rainbow));
      }

      // 총 개수 제한 (오래된 것부터 제거)
      if (this.physicPoops.length > 28) {
        this.physicPoops.splice(0, this.physicPoops.length - 28);
      }

      for (let i = 0; i < 12; i++) this.confetti.push(new Confetti(cx, cy, colorHue));
    }

    this.shake.t = 1.0;
    this.shake.intensity = 22;
  }

  /** 피버타임 끝날때 쌓인 똥 제거 */
  clearFeverPoops() {
    this.physicPoops = [];
  }

  /** 피버타임 반짝 스파클 */
  spawnFeverSparkle(x, y) {
    this.feverSparkles.push(new FeverSparkle(x, y));
  }

  /** 게임 클리어 */
  spawnEndGamePoops(canvasW, canvasH) {
    this.fallingPoops = [];
    for (let i = 0; i < 400; i++) {
      setTimeout(() => {
        const img = this.poopImgs[Math.floor(Math.random() * 7)];
        this.fallingPoops.push(new FallingPoop(canvasW, canvasH, img));
      }, i * 12);
    }
  }

  /** 레벨업 컨페티 */
  spawnCelebration(cx, cy) {
    for (let i = 0; i < 70; i++) this.confetti.push(new Confetti(cx, cy));
    this.shake.t = 1.0;
    this.shake.intensity = 10;
  }

  getShakeOffset() {
    if (this.shake.t <= 0) return { x: 0, y: 0 };
    const mag = this.shake.intensity * this.shake.t;
    return {
      x: (Math.random()-0.5)*mag*2,
      y: (Math.random()-0.5)*mag*2
    };
  }

  update() {
    this.flashes  = this.flashes.filter(p  => { p.update(); return !p.dead(); });
    this.waves    = this.waves.filter(p    => { p.update(); return !p.dead(); });
    this.gas      = this.gas.filter(p      => { p.update(); return !p.dead(); });
    this.dots     = this.dots.filter(p     => { p.update(); return !p.dead(); });
    this.poops    = this.poops.filter(p    => { p.update(); return !p.done(); });
    this.confetti = this.confetti.filter(p => { p.update(); return !p.dead(); });
    if (this.shake.t > 0) this.shake.t = Math.max(0, this.shake.t - 0.038);
    this.feverSparkles   = this.feverSparkles.filter(p   => { p.update(); return !p.dead(); });
    this.explodingPoops  = this.explodingPoops.filter(p  => { p.update(); return !p.dead(); });
    this.fallingPoops.forEach(p => p.update());
    this.physicPoops.forEach(p => p.update());

    // 파티클 상한선
    if (this.gas.length           > 60) this.gas.splice(0, this.gas.length - 60);
    if (this.dots.length          > 70) this.dots.splice(0, this.dots.length - 70);
    if (this.waves.length         > 12) this.waves.splice(0, this.waves.length - 12);
    if (this.confetti.length      > 80) this.confetti.splice(0, this.confetti.length - 80);
    if (this.explodingPoops.length> 60) this.explodingPoops.splice(0, this.explodingPoops.length - 60);
    if (this.feverSparkles.length > 40) this.feverSparkles.splice(0, this.feverSparkles.length - 40);
  }

  // 캐릭터 뒤에 그릴 배경 이펙트 (플래시, 웨이브, 가스)
  draw(ctx) {
    this.flashes.forEach(p        => p.draw(ctx));
    this.waves.forEach(p          => p.draw(ctx));
    this.dots.forEach(p           => p.draw(ctx));
    this.gas.forEach(p            => p.draw(ctx));
    this.confetti.forEach(p       => p.draw(ctx));
    this.feverSparkles.forEach(p  => p.draw(ctx));
  }

  // 캐릭터 앞에 그릴 똥 이미지 (코스튬/모자 위)
  drawPoops(ctx) {
    this.fallingPoops.forEach(p   => p.draw(ctx));
    this.poops.forEach(p          => p.draw(ctx));
    this.explodingPoops.forEach(p => p.draw(ctx));
    this.physicPoops.forEach(p    => p.draw(ctx));  // 피버 물리 똥 (최상위)
  }

  hasBigEvent() { return this.poops.length > 0; }
}

const fx = new EffectsEngine();
