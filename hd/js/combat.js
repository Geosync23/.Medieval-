'use strict';
/*
 * Combat test bed: one forest clearing, waves of bandits, four control schemes.
 *   swipe  - hold to move, swipe to strike, hold the king to block, swipe from the king to dodge
 *   guard  - "plant and fight": the king swings on his own when he stands still; three knights fight beside him
 *   duel   - one opponent at a time, blows trade on their own, you lean in or give ground on a balance bar
 *   sling  - pull back from the king and let go to dash through a line of enemies
 */
(function () {
  const $ = id => document.getElementById(id), h2 = E.h2, HW = E.HW, HH = E.HH, TAU = 6.28318;
  const cv = $('view'), ctx = cv.getContext('2d'), off = document.createElement('canvas'), octx = off.getContext('2d');
  let img, frame, dpr = 1, zoom = 2, camX = 0, camY = 0, shake = 0, time = 0, hitStop = 0, slow = 1;
  const C = { x: 12, y: 12, R: 7.4 }, BOUNDS = [0, 0, 24, 24, 9.5], obst = [];
  const rnd = Math.random, clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const adiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return Math.abs(d); };

  /* ================= arena ================= */
  function buildArena() {
    const F = B.flora, Q = E.quad; obst.length = 0;
    Q([0, 0, 0], [24, 0, 0], [0, 24, 0], (x, y) => {
      const d = Math.hypot(x - C.x, y - C.y), n = T.fbm(x * 0.6, y * 0.6), tx = Math.floor(x * 32), ty = Math.floor(y * 32);
      if (d < 4.6 + n * 2.6) { if (d > 4.0 + n * 2.4 && h2(tx >> 1, ty >> 1) < 0.5) return F.floorTex(x, y); const c = T.dirt(x, y); return T.fbm(x * 1.4 + 3, y * 1.4) > 0.66 ? F.floorTex(x, y) : T.mul(c, 0.9); }
      return F.floorTex(x, y);
    }, { n: [0, 0, 1] });
    // trees ring the clearing; none are allowed where they would hide it from the camera
    const placed = [];
    for (let i = 0; i < 900 && placed.length < 70; i++) {
      const x = 0.6 + h2(i, 11) * 22.8, y = 0.6 + h2(i, 12) * 22.8, d = Math.hypot(x - C.x, y - C.y), r = h2(i, 13);
      if (d < 9.1) continue;
      const kind = r < 0.2 ? 0 : r < 0.55 ? 1 : r < 0.86 ? 2 : 3, hgt = kind === 0 ? 8 : kind === 1 ? 5.4 : 4.8;
      let hide = false; for (let k = 1.2; k < hgt; k += 0.6) if (Math.hypot(x - k - C.x, y - k - C.y) < 9.6) { hide = true; break; }
      if (hide || placed.some(p => Math.hypot(p[0] - x, p[1] - y) < (kind === 0 ? 2.6 : 2.0))) continue;
      placed.push([x, y]);
      if (kind === 0) F.giant(x, y, 0.85 + h2(i, 14) * 0.25); else if (kind === 1) F.pine(x, y, 0, 1.0 + h2(i, 14) * 0.45);
      else if (kind === 2) B.tree(x, y, { s: 1.3 + h2(i, 14) * 0.5, pal: [T.LEAF_D, T.LEAF_G, T.LEAF_D][i % 3], flowers: null, n: 10 }); else F.birch(x, y, 1.0 + h2(i, 14) * 0.3);
    }
    for (let i = 0; i < 260; i++) {
      const x = 0.5 + h2(i, 21) * 23, y = 0.5 + h2(i, 22) * 23, d = Math.hypot(x - C.x, y - C.y), r = h2(i, 23);
      if (d < 8.1 || placed.some(p => Math.hypot(p[0] - x, p[1] - y) < 0.7)) continue;
      if (r < 0.5) F.fern(x, y, 0.55 + h2(i, 24) * 0.5); else if (r < 0.66) B.bush(x, y, { s: 0.8 + h2(i, 24) * 0.5, pal: T.LEAF_D, fp: 0.1, noBlock: true });
      else if (r < 0.8) F.boulder(x, y, 0.16 + h2(i, 24) * 0.3); else if (r < 0.92) { F.mushroom(x, y, 1.2); F.mushroom(x + 0.16, y + 0.07, 0.8); } else if (r < 0.96) F.stump(x, y); else { F.glowshroom(x, y, 1.1); F.glowshroom(x + 0.15, y + 0.1, 0.8); }
    }
    // cover inside the clearing
    for (const b of [[9.0, 14.6, 0.55], [15.3, 9.6, 0.5], [14.9, 15.4, 0.42]]) { F.boulder(b[0], b[1], b[2]); obst.push({ x: b[0], y: b[1], r: b[2] * 0.95 }); }
    F.stump(8.6, 9.4); obst.push({ x: 8.6, y: 9.4, r: 0.36 });
    // the bandits' camp at the back of the clearing
    const cx = 6.6, cy = 6.9;
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; E.blob([cx + Math.cos(a) * 0.36, cy + Math.sin(a) * 0.36, 0.05], 0.1, F.boulderTex(900 + i), { f: E.F_NOAO }); }
    B.box(cx - 0.25, cy - 0.05, 0, 0.5, 0.1, 0.1, { side: F.bark(0x4a3626) }); B.box(cx - 0.05, cy - 0.25, 0.06, 0.1, 0.5, 0.1, { side: F.bark(0x3a2a1e) });
    B.flames.push({ x: cx, y: cy, z: 0.16, s: 2.2 }); E.addLight(cx, cy, 0.7, 7, [1.0, 0.6, 0.25], 1.6); obst.push({ x: cx, y: cy, r: 0.5, fire: true });
    B.box(cx - 1.7, cy + 0.5, 0, 1.3, 0.32, 0.26, { side: F.bark(0x5c4432), top: F.bark(0x6a5038) }); obst.push({ x: cx - 1.05, y: cy + 0.66, r: 0.5 });
    B.crate(cx + 0.9, cy - 1.5); B.barrel(cx + 1.6, cy - 1.3); B.sack(cx - 0.6, cy - 1.5); B.crate(cx + 1.0, cy - 1.45, 0.45, 0.4); obst.push({ x: cx + 1.3, y: cy - 1.3, r: 0.62 });
    F.log(15.6, 17.9, 2.2); for (let i = 0; i < 3; i++) obst.push({ x: 16.0 + i * 0.7, y: 18.1, r: 0.4 });
    for (let i = 0; i < 40; i++) B.flies.push([4 + h2(i, 41) * 16, 4 + h2(i, 42) * 16, 0.5 + h2(i, 43) * 1.6, i]);
  }
  const LIGHT = { L: [-0.45, 0.75, 0.8], sun: [0.98, 0.86, 0.54], amb: [0.42, 0.48, 0.56], fill: [0.14, 0.13, 0.11], night: false, lamp: 0.25, bg: [20, 17, 26] };
  function bake() {
    const b = BOUNDS, W = Math.ceil((b[2] + b[3]) * HW), H = Math.ceil((b[2] + b[3]) * HH + b[4] * E.ZS) + 8;
    E.init(W, H, Math.round(b[3] * HW), Math.round(b[4] * E.ZS) + 4);
    B.reset(); buildArena();
    const Lt = E.light; Lt.L = E.norm(LIGHT.L); Lt.sun = LIGHT.sun; Lt.amb = LIGHT.amb; Lt.fill = LIGHT.fill; Lt.night = LIGHT.night; Lt.lampScale = LIGHT.lamp; Lt.bg = LIGHT.bg;
    E.bake(b);
    off.width = W; off.height = H; img = octx.createImageData(W, H); frame = new Uint32Array(img.data.buffer);
  }

  /* ================= sound ================= */
  let ac = null, sound = true;
  function sfx(kind) {
    if (!sound || !ac) return;
    const t = ac.currentTime, g = ac.createGain(); g.connect(ac.destination);
    const tone = (type, f0, f1, dur, vol) => { const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g); o.start(t); o.stop(t + dur); };
    const noise = (dur, vol, hp) => { const n = ac.createBufferSource(), buf = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (rnd() * 2 - 1) * (1 - i / d.length); n.buffer = buf; const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; n.connect(f); f.connect(g); g.gain.setValueAtTime(vol, t); n.start(t); };
    if (kind === 'swing') noise(0.09, 0.12, 1800); else if (kind === 'hit') { tone('triangle', 150, 50, 0.12, 0.3); noise(0.05, 0.12, 600); }
    else if (kind === 'block') tone('square', 760, 520, 0.07, 0.1); else if (kind === 'parry') { tone('square', 1500, 1900, 0.16, 0.1); }
    else if (kind === 'hurt') tone('sawtooth', 200, 70, 0.18, 0.18); else if (kind === 'die') tone('sawtooth', 160, 40, 0.35, 0.16);
    else if (kind === 'bow') tone('triangle', 600, 200, 0.08, 0.12); else if (kind === 'dash') noise(0.18, 0.16, 900); else if (kind === 'wave') tone('triangle', 330, 660, 0.3, 0.14); else if (kind === 'drum') tone('sine', 120, 55, 0.13, 0.3); else if (kind === 'drum2') tone('sine', 170, 80, 0.1, 0.22);
  }

  /* ================= fighters ================= */
  const KINDS = {
    king: { hp: 100, speed: 2.7, poise: 60, r: 0.34 },
    knight: { hp: 95, speed: 2.5, poise: 80, r: 0.34, atk: { wind: 0.34, reach: 1.35, arc: 1.5, dmg: 13, pd: 18, rec: 0.5, cd: 1.25 } },
    bandit: { hp: 52, speed: 2.05, poise: 42, r: 0.34, atk: { wind: 0.5, reach: 1.15, arc: 1.5, dmg: 11, pd: 16, rec: 0.55, cd: 1.5 } },
    rabble: { hp: 26, speed: 2.3, poise: 20, r: 0.3, atk: { wind: 0.45, reach: 1.05, arc: 1.5, dmg: 6, pd: 10, rec: 0.5, cd: 1.3 } },
    archer: { hp: 34, speed: 2.1, poise: 30, r: 0.32, shot: { aim: 0.9, cd: 3.0, dmg: 10 } },
    brute: { hp: 150, speed: 1.5, poise: 130, r: 0.46, scale: 1.35, atk: { wind: 0.95, reach: 1.65, arc: 2.3, dmg: 26, pd: 46, rec: 0.9, cd: 2.5, heavy: true } },
  };
  const SKIN = [0xf0c8a0, 0xe6b88a, 0xd9a273, 0xb9805a], NAMES = ['Ser Aldric', 'Ser Godwin', 'Dame Rowena'];
  let F = [], K = null, shots = [], fx = [], decals = [], wave = 0, waveT = 0, over = false, mode = null, kills = 0;
  function look(kind, i) {
    const p = { role: 'villager', x: 0, y: 0, fx: 1, fy: 1, moving: false, phase: rnd() * 4, skin: SKIN[(rnd() * 4) | 0], hair: 0x3a2a20, top: 0x5a3a2e, bot: 0x3a3a4a, fem: false, hat: 0, hatc: 0x2e2e36, apron: false, child: false, sit: false, z: 0, bubble: 0, name: kind };
    if (kind === 'king') { p.role = 'king'; p.skin = SKIN[0]; p.hair = 0x5a3a24; }
    else if (kind === 'knight') { p.role = 'guard'; p.name = NAMES[i % 3]; }
    else if (kind === 'bandit' || kind === 'rabble') { p.top = [0x5a3a2e, 0x4a4a3a, 0x6a2e2e, 0x3e4a56][(rnd() * 4) | 0]; p.hat = 3; p.hatc = [0x2e2e36, 0x4a3a2e, 0x3a4a3a][(rnd() * 3) | 0] & ~1; p.hair = rnd() < 0.5 ? 0x3a2a21 : 0x2a2428; p.bot = 0x2e2e36; }
    else if (kind === 'archer') { p.top = 0x4a6a3a; p.hat = 2; p.hatc = 0x3a5a2e; p.hair = 0x8a5a2c; p.bot = 0x4a3a2e; }
    else if (kind === 'brute') { p.top = 0x6a4a36; p.hair = 0x2a2429; p.bot = 0x4a3a2e | 2; p.scale = 1.35; p.skin = SKIN[2]; }
    return p;
  }
  function mk(kind, x, y, team, i) {
    const s = KINDS[kind];
    return { kind, spec: s, team, x, y, mx: 0, my: 0, kx: 0, ky: 0, face: team ? Math.atan2(C.y - y, C.x - x) : -2.3, state: 'idle', st: 0, cd: 0.6 + rnd(), r: s.r, hp: s.hp, max: s.hp, poise: s.poise, flash: 0, fade: 0, alive: true, p: look(kind, i), orb: rnd(), dir: rnd() < 0.5 ? 1 : -1, n: 0, think: 0, tgt: null, ifr: 0, blockT: 0, swingT: 9 };
  }
  const WAVES = [[['bandit', 3]], [['bandit', 3], ['archer', 1]], [['bandit', 2], ['archer', 2], ['brute', 1]], [['bandit', 4], ['archer', 2], ['brute', 1]], [['bandit', 4], ['archer', 2], ['brute', 2]]];
  function spawnWave() {
    const def = WAVES[Math.min(wave, WAVES.length - 1)], extra = Math.max(0, wave - WAVES.length + 1);
    let list = []; for (const [k, n] of def) for (let i = 0; i < n; i++) list.push(k);
    for (let i = 0; i < extra + (mode.extra || 0); i++) list.push('bandit');
    if (mode.noArchers) list = list.map(k => k === 'archer' ? 'bandit' : k);
    if (mode.horde) { list = []; for (let i = 0; i < 12 + wave * 5; i++) list.push('rabble'); if (wave % 3 === 2) list.push('brute'); }
    const a0 = 2.2 + rnd() * 2.2;
    list.forEach((k, i) => { const a = mode.horde ? rnd() * TAU : a0 + (i - list.length / 2) * 0.32, e = mk(k, C.x + Math.cos(a) * (C.R + 1.2), C.y + Math.sin(a) * (C.R + 1.2), 1, i); F.push(e); });
    wave++; $('wave').textContent = 'Wave ' + wave + '   ·   felled ' + kills; say('Wave ' + wave, '', 1300); sfx('wave');
  }
  function reset() {
    F = []; shots = []; fx = []; decals = []; wave = 0; waveT = 1.2; over = false; kills = 0; slow = 1; hitStop = 0; $('pops').innerHTML = '';
    K = mk('king', C.x + 1.5, C.y + 2.5, 0); K.sta = 100; K.staD = 0; K.combo = 0; K.comboT = 9; K.dest = null; K.hold = null; K.buf = null; K.lock = null; K.focus = null; K.planted = 0; K.stance = 0;
    F.push(K); K.noWeapon = false; if (mode.init) mode.init();
    if (mode.knights) for (let i = 0; i < 3; i++) { const a = -2.3 + (i - 1) * 0.9, k = mk('knight', K.x + Math.cos(a) * 1.5, K.y + Math.sin(a) * 1.5, 0, i); k.slot = i; F.push(k); }
    $('bal').style.display = mode.id === 'duel' ? 'block' : 'none'; $('wave').textContent = ''; allies();
    $('msg').classList.remove('on');
  }
  function allies() {
    $('allies').innerHTML = F.filter(f => f.kind === 'knight').map(k => '<div class="ally' + (k.alive ? '' : ' dead') + '">' + k.p.name + '<i style="width:' + Math.max(0, k.hp / k.max * 100) + '%"></i></div>').join('');
  }
  let msgT = 0;
  function say(a, b, ms) { $('msg').innerHTML = a + (b ? '<small>' + b + '</small>' : ''); $('msg').classList.add('on'); msgT = ms ? ms / 1000 : 1e9; }

  /* ---------- effects ---------- */
  function pop(f, text, cls) { const el = document.createElement('div'); el.className = 'pop ' + (cls || ''); el.textContent = text; $('pops').appendChild(el); fx.push({ k: 'pop', el, x: f.x + (rnd() - 0.5) * 0.3, y: f.y, z: 1.5 * (f.p.scale || 1), t: 0, life: 0.8 }); }
  function sparks(x, y, z, col, n, sp) { for (let i = 0; i < n; i++) { const a = rnd() * TAU, s = (sp || 2.5) * (0.4 + rnd()); fx.push({ k: 'sp', x, y, z, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 1.5 + rnd() * 2.5, t: 0, life: 0.3 + rnd() * 0.25, col }); } }
  function dust(x, y, n) { for (let i = 0; i < n; i++) fx.push({ k: 'sp', x: x + (rnd() - 0.5) * 0.3, y: y + (rnd() - 0.5) * 0.3, z: 0.05, vx: (rnd() - 0.5) * 1.2, vy: (rnd() - 0.5) * 1.2, vz: 0.6 + rnd() * 0.8, t: 0, life: 0.35 + rnd() * 0.2, col: 0xb8a888, dustp: true }); }

  /* ---------- actions ---------- */
  function attack(f, dir, spec) {
    if (f.state !== 'idle' && f.state !== 'block') return false;
    f.face = dir; f.state = 'wind'; f.st = spec.wind; f.atk = spec; f.mx = f.my = 0; return true;
  }
  function roll(f, dir, dist, dur, ifr, dash) {
    f.state = 'roll'; f.st = f.rollDur = dur; f.rdx = Math.cos(dir) * dist / dur; f.rdy = Math.sin(dir) * dist / dur; f.ifr = ifr; f.dash = dash || null; f.face = dir; if (dash) dash.seen = new Set();
    dust(f.x, f.y, 5); sfx('dash');
  }
  function stagger(f, t) { if (!f.alive) return; f.state = 'stag'; f.st = t; f.mx = f.my = 0; f.poise = 0; }
  function die(f, by) {
    f.alive = false; f.state = 'dead'; f.st = 0; f.mx = f.my = 0; sfx('die'); dust(f.x, f.y, 8);
    if (f.team === 1) { kills++; $('wave').textContent = 'Wave ' + wave + '   ·   felled ' + kills; } else if (f.kind === 'knight') { pop(f, f.p.name + ' has fallen', 'hurt'); allies(); }
    if (f === K) { over = true; slow = 1; say('The king has fallen', 'Tap to try again'); }
  }
  // one blow landing on one target
  function hit(o, f, spec, mult) {
    if (!o.alive) return false;
    if (o.ifr > 0) { if (o === K) pop(o, 'dodged', 'info'); return false; }
    const from = Math.atan2(f.y - o.y, f.x - o.x);
    if (o.state === 'block' && adiff(o.face, from) < 1.2) {
      if (o.blockT < 0.24 && !spec.arrow) { stagger(f, 1.4); pop(o, 'PARRY', 'good'); sparks(o.x, o.y, 0.9, 0xfff2a8, 14, 3.5); sfx('parry'); o.sta = Math.min(100, o.sta + 12); hitStop = 0.09; return false; }
      o.sta -= spec.heavy ? 48 : spec.dmg * 1.5; o.staD = 0.7; sparks(o.x + Math.cos(from) * 0.3, o.y + Math.sin(from) * 0.3, 0.9, 0xd8dce4, 6); sfx('block');
      o.kx -= Math.cos(from) * (spec.heavy ? 3.5 : 1.5); o.ky -= Math.sin(from) * (spec.heavy ? 3.5 : 1.5);
      if (o.sta <= 0) { o.sta = 0; stagger(o, 1.1); pop(o, 'GUARD BROKEN', 'hurt'); } else pop(o, 'block', 'info');
      return false;
    }
    if (o.kind === 'knight' && !spec.heavy && adiff(o.face, from) < 1.2 && rnd() < 0.35) { sparks(o.x, o.y, 0.9, 0xd8dce4, 5); sfx('block'); return false; }
    let dmg = spec.dmg * (mult || 1), pd = spec.pd || 10, fin = false;
    if (o.state === 'stag') { dmg *= mode.finisher || 1.6; fin = true; }
    if (mode.id === 'duel') { if (o === K) { pd *= K.stance > 0 ? 1.4 : K.stance < 0 ? 0.5 : 1; dmg *= K.stance < 0 ? 0.6 : 1; } else if (f === K && K.stance > 0) pd *= 1.7; }
    if (o === K && mode.id === 'moment') dmg *= 1 - 0.5 * mode.meter();     // a fast king is a glancing target
    dmg = Math.round(dmg * (0.9 + rnd() * 0.2));
    o.hp -= dmg; o.flash = 1; o.poise -= pd; o.kx -= Math.cos(from) * (fin ? 5 : 2.4); o.ky -= Math.sin(from) * (fin ? 5 : 2.4);
    if (spec.push) { const m = o.kind === 'brute' ? 2.4 : 1; o.kx -= Math.cos(from) * spec.push / m; o.ky -= Math.sin(from) * spec.push / m; }
    pop(o, fin && (f === K || f.byK) ? 'FINISHER ' + dmg : '' + dmg, o.team === 0 ? 'hurt' : fin ? 'good' : '');
    sparks(o.x, o.y, 0.9, o.team === 0 ? 0xff6a5a : 0xffe9a0, fin ? 14 : 7); sfx(o === K ? 'hurt' : 'hit');
    if (f === K || f.byK || o === K) { shake = Math.max(shake, o === K ? 5 : fin ? 6 : 2.5); if (f === K || f.byK) hitStop = Math.max(hitStop, fin ? 0.13 : 0.05); }
    if (o.kind === 'knight') allies();
    if (o.hp <= 0) die(o, f);
    else if (o.poise <= 0 && o.state !== 'stag') { stagger(o, o.kind === 'brute' ? 1.2 : o === K ? 1.0 : 1.6); if (mode.id === 'duel') pop(o, 'OFF BALANCE', o === K ? 'hurt' : 'good'); }
    else if (o.state === 'wind' && !o.spec.scale && !(o.atk && o.atk.heavy) && o !== K) { o.state = 'idle'; o.cd = Math.max(o.cd, 0.5); }   // light hits interrupt light attacks
    return true;
  }
  function resolve(f) {
    const s = f.atk; let n = 0;
    for (const o of F) { if (o.team === f.team || !o.alive) continue; const dx = o.x - f.x, dy = o.y - f.y, d = Math.hypot(dx, dy); if (d < s.reach + o.r && adiff(Math.atan2(dy, dx), f.face) < s.arc / 2) { if (hit(o, f, s)) n++; else n += 0.001; } }
    fx.push({ k: 'sw', x: f.x, y: f.y, face: f.face, reach: s.reach, arc: s.arc, t: 0, life: 0.2, col: f.team ? 0xffb0a0 : 0xffffff });
    if (f === K) { sfx('swing'); if (mode.onSwing) mode.onSwing(s); }
    if (n === 0 && s.heavy && mode.id === 'duel' && f !== K) { f.poise -= f.spec.poise * 0.6; pop(f, 'whiff!', 'good'); if (f.poise <= 0) { stagger(f, 1.8); pop(f, 'OFF BALANCE', 'good'); return; } }
    f.state = 'rec'; f.st = s.rec; f.swingT = 0;
  }

  /* ---------- AI ---------- */
  const DUEL_HEAVY = { wind: 0.85, reach: 1.35, arc: 1.7, dmg: 20, pd: 40, rec: 0.75, heavy: true };
  function aiMelee(e, engaged) {
    const t = e.tgt; e.mx = e.my = 0; if (!t || !t.alive || e.state !== 'idle') return;
    const dx = t.x - e.x, dy = t.y - e.y, d = Math.hypot(dx, dy) || 1, ang = Math.atan2(dy, dx), A = e.spec.atk, sp = e.spec.speed;
    e.face = ang;
    if (engaged) {
      if (d > A.reach * 0.8 + t.r) { e.mx = dx / d * sp; e.my = dy / d * sp; }
      else if (e.cd <= 0) { let s = A; if (mode.id === 'duel' && e.team === 1 && ++e.n % 3 === 0 && !A.heavy) s = DUEL_HEAVY; attack(e, ang, s); e.cd = A.cd * (0.85 + rnd() * 0.3); }
    } else {
      const R = 3.0 + e.orb * 1.1, tx = -dy / d * e.dir, ty = dx / d * e.dir, rad = (d - R) * 1.3;
      e.mx = (tx * 0.7 + dx / d * rad) * sp * 0.6; e.my = (ty * 0.7 + dy / d * rad) * sp * 0.6;
      const m = Math.hypot(e.mx, e.my); if (m > sp * 0.7) { e.mx *= sp * 0.7 / m; e.my *= sp * 0.7 / m; }
    }
  }
  function los(a, b) { for (const o of obst) { const dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy, u = clamp(((o.x - a.x) * dx + (o.y - a.y) * dy) / L, 0, 1); if (Math.hypot(a.x + dx * u - o.x, a.y + dy * u - o.y) < o.r * 0.8) return false; } return true; }
  function aiArcher(e, dt) {
    const t = e.tgt; e.mx = e.my = 0; if (!t || !t.alive) return;
    const dx = t.x - e.x, dy = t.y - e.y, d = Math.hypot(dx, dy) || 1, sp = e.spec.speed;
    if (e.state === 'aim') { if (e.st > 0.25) e.face = Math.atan2(dy, dx); if (e.st <= 0) { shots.push({ x: e.x, y: e.y, z: 0.9, vx: Math.cos(e.face) * 11, vy: Math.sin(e.face) * 11, t: 0, by: e }); sfx('bow'); e.state = 'rec'; e.st = 0.4; e.atk = null; e.cd = e.spec.shot.cd * (0.85 + rnd() * 0.3); } return; }
    if (e.state !== 'idle') return;
    e.face = Math.atan2(dy, dx);
    if (d < 4.0) { e.mx = -dx / d * sp; e.my = -dy / d * sp; }
    else if (d > 7.6) { e.mx = dx / d * sp; e.my = dy / d * sp; }
    else if (e.cd <= 0 && los(e, t)) { e.state = 'aim'; e.st = e.spec.shot.aim; }
    else { e.mx = -dy / d * e.dir * sp * 0.4; e.my = dx / d * e.dir * sp * 0.4; }
  }
  function aiKnight(k) {
    k.mx = k.my = 0; if (k.state !== 'idle') return;
    let t = K.focus && K.focus.alive ? K.focus : null, bd = 5.5;
    if (!t) for (const o of F) if (o.team === 1 && o.alive) { const d = Math.hypot(o.x - K.x, o.y - K.y) + Math.hypot(o.x - k.x, o.y - k.y) * 0.4; if (d < bd) { bd = d; t = o; } }
    if (t) { k.tgt = t; aiMelee(k, true); return; }
    const a = K.face + (k.slot - 1) * 1.1, sx = K.x + Math.cos(a) * 1.5, sy = K.y + Math.sin(a) * 1.5, dx = sx - k.x, dy = sy - k.y, d = Math.hypot(dx, dy);
    if (d > 0.3) { const sp = Math.min(k.spec.speed, d * 3); k.mx = dx / d * sp; k.my = dy / d * sp; k.face = Math.atan2(dy, dx); } else k.face = K.face;
  }

  /* ---------- the king, per control scheme ---------- */
  const CUT = { wind: 0.1, reach: 1.3, arc: 1.9, dmg: 13, pd: 14, rec: 0.2, lunge: 0.35, sta: 11 }, LUNGE = { wind: 0.22, reach: 1.5, arc: 1.1, dmg: 28, pd: 34, rec: 0.42, lunge: 1.7, sta: 24 },
    FINISH = { wind: 0.16, reach: 1.5, arc: 2.7, dmg: 22, pd: 40, rec: 0.38, lunge: 0.5, sta: 14 }, AUTO = { wind: 0.16, reach: 1.3, arc: 1.9, dmg: 15, pd: 16, rec: 0.3, lunge: 0.2 }, DUEL = { wind: 0.2, reach: 1.3, arc: 1.6, dmg: 9, pd: 20, rec: 0.3, lunge: 0.15 };
  const JAB = { wind: 0.1, reach: 1.25, arc: 1.6, dmg: 7, pd: 8, rec: 0.25 }, BEAT = 0.6; let HM = { out: false }, HD = null, RH = null, FL = null, PR = [];
  const BASH = { wind: 0.1, reach: 1.5, arc: 2.0, dmg: 4, pd: 30, rec: 0.3, lunge: 0.3, push: 9.5 }, BASH2 = { wind: 0.22, reach: 1.6, arc: 1.6, dmg: 7, pd: 50, rec: 0.45, lunge: 1.7, push: 14.5 };
  const spend = c => { K.sta -= c; K.staD = 0.55; };
  function nearestEnemy(x, y, max, dir, cone) { let b = null, bd = max; for (const o of F) if (o.team === 1 && o.alive) { const d = Math.hypot(o.x - x, o.y - y); if (d < bd && (dir === undefined || adiff(Math.atan2(o.y - y, o.x - x), dir) < cone)) { bd = d; b = o; } } return b; }
  function kingSwing(dir, heavy) {
    if (K.state === 'wind' || K.state === 'rec') { K.buf = { dir, heavy, t: 0.3 }; return; }
    if (K.state !== 'idle' && K.state !== 'block') return;
    if (K.sta < 4) { pop(K, 'winded', 'info'); return; }
    const o = nearestEnemy(K.x, K.y, heavy ? 3.4 : 2.4, dir, 0.6); if (o) dir = Math.atan2(o.y - K.y, o.x - K.x);     // gentle aim assist
    let s = heavy ? LUNGE : CUT;
    if (!heavy) { K.combo = K.comboT < 0.75 ? K.combo + 1 : 1; if (K.combo >= 3) { s = FINISH; K.combo = 0; } } else K.combo = 0;
    spend(s.sta); K.dest = null; K.hold = null; attack(K, dir, s);
  }
  function startBlock() { if (K.state === 'idle') { K.state = 'block'; K.blockT = 0; K.dest = null; K.hold = null; const o = nearestEnemy(K.x, K.y, 6); if (o) K.face = Math.atan2(o.y - K.y, o.x - K.x); } }
  function endBlock() { if (K.state === 'block') K.state = 'idle'; }
  function dodge(dir, dist, cost) { if (K.state === 'stag' || K.state === 'roll' || K.sta < 6) return; spend(cost); K.dest = null; K.hold = null; K.buf = null; roll(K, dir, dist, 0.3, 0.26); }
  const MODES = {
    swipe: {
      id: 'swipe', name: 'Swipe', tokens: 2, title: 'Swipe to strike',
      help: ['<b>Hold the ground</b> to walk, tap to walk to a spot', '<b>Swipe</b> anywhere to cut that way; a <b>long swipe</b> is a lunge', 'Three quick cuts end in a wide finisher', '<b>Touch and hold the king</b> to block; raise it just in time to parry', '<b>Swipe starting on the king</b> to roll clear'],
      down(g) { if (g.onKing) startBlock(); },
      move(g) {
        if (g.onKing) { if (!g.used && g.dist > 30 && g.el < 0.26) { g.used = true; endBlock(); dodge(g.wdir, 2.1, 20); } else if (K.state === 'block' && g.dist > 24) K.face = Math.atan2(g.wy - K.y, g.wx - K.x); return; }
        if (g.el > 0.17) { g.holding = true; K.hold = [g.wx, g.wy]; K.dest = null; }
      },
      up(g) {
        if (g.onKing) { endBlock(); return; }
        if (g.el < 0.34 && g.dist > 30) { K.hold = null; kingSwing(g.wdir, g.dist > 130); }
        else if (!g.holding && g.dist < 14) K.dest = [g.wx, g.wy];
        if (g.holding) K.hold = null;
      },
    },
    guard: {
      id: 'guard', name: "King's Guard", tokens: 4, knights: true, extra: 2, title: 'Plant and fight, with your knights',
      help: ['<b>Hold the ground</b> to walk, tap to walk to a spot', '<b>Stand still</b> and the king swings on his own at anyone in reach; he cannot swing while walking', '<b>Flick</b> anywhere to sidestep', '<b>Tap an enemy</b> to order your knights onto him', 'Knights who fall stay down until you restart'],
      down() { }, move(g) { if (g.el > 0.14) { g.holding = true; K.hold = [g.wx, g.wy]; K.dest = null; } },
      up(g) {
        if (g.el < 0.3 && g.dist > 30) { K.hold = null; dodge(g.wdir, 1.5, 16); return; }
        if (!g.holding && g.dist < 14) { const e = enemyAt(g.lx, g.ly); if (e) { K.focus = e; pop(e, 'that one!', 'good'); } else K.dest = [g.wx, g.wy]; }
        if (g.holding) K.hold = null;
      },
      update(dt) {
        K.planted = (K.mx || K.my || K.state !== 'idle') ? 0 : K.planted + dt;
        if (K.planted > 0.12 && K.cd <= 0) { const o = (K.focus && K.focus.alive && Math.hypot(K.focus.x - K.x, K.focus.y - K.y) < 1.5) ? K.focus : nearestEnemy(K.x, K.y, AUTO.reach + 0.25); if (o) { attack(K, Math.atan2(o.y - K.y, o.x - K.x), AUTO); K.cd = 0.5; } }
      },
    },
    duel: {
      id: 'duel', name: 'Duel', tokens: 1, noArchers: true, finisher: 4, title: 'One at a time, on a balance bar',
      help: ['The king squares up to <b>one opponent</b>; the rest wait their turn. Tap another to switch', 'Blows trade on their own and wear down <b>balance</b> (blue bars)', '<b>Hold toward him</b> to press: you break his balance faster but risk your own', '<b>Hold away</b> to give ground and recover', 'When he flashes <b>!</b> a heavy blow is coming: <b>flick</b> to sidestep and he stumbles', 'An opponent off balance takes a finisher'],
      down() { }, move(g) { if (g.el > 0.14) { g.holding = true; K.hold = [g.wx, g.wy]; K.dest = null; } },
      up(g) {
        if (g.el < 0.3 && g.dist > 30) { K.hold = null; dodge(g.wdir, 1.6, 14); return; }
        if (!g.holding && g.dist < 14) { const e = enemyAt(g.lx, g.ly); if (e) K.lock = e; else K.dest = [g.wx, g.wy]; }
        if (g.holding) K.hold = null;
      },
      update(dt) {
        if (!K.lock || !K.lock.alive) K.lock = nearestEnemy(K.x, K.y, 30);
        const L = K.lock; K.stance = 0; if (!L) return;
        const dx = L.x - K.x, dy = L.y - K.y, d = Math.hypot(dx, dy) || 1;
        if (K.hold) { const dot = (K.hold[0] - K.x) * dx + (K.hold[1] - K.y) * dy; K.stance = dot > 0 ? 1 : -1; if (K.stance > 0 && d < DUEL.reach + L.r) K.holdStop = true; }
        K.poise = Math.min(KINDS.king.poise, K.poise + dt * (K.stance < 0 ? 30 : K.stance > 0 ? 4 : 12));
        if (K.state === 'idle') { K.face = Math.atan2(dy, dx); if (d < DUEL.reach + L.r && K.cd <= 0) { attack(K, K.face, DUEL); K.cd = 0.85; } }
      },
    },
    sling: {
      id: 'sling', name: 'Draw & loose', tokens: 2, title: 'Pull back and let fly',
      help: ['<b>Hold the ground</b> to walk, tap to walk to a spot', '<b>Touch the king and pull back</b> like a sling; time slows while you aim', '<b>Let go</b> and he dashes down the line, cutting everyone on it. A longer pull goes further and hits harder', 'He cannot be hit during the dash but is open for a moment after it', '<b>Tap the king</b> for a brief guard; timed well it parries'],
      down(g) { if (g.onKing && (K.state === 'idle' || K.state === 'block')) { K.aim = { pw: 0, dir: 0 }; K.dest = null; K.hold = null; } },
      move(g) {
        if (g.onKing) { if (K.aim) { K.aim.pw = clamp((g.dist - 18) / 150, 0, 1); K.aim.dir = g.wdir + Math.PI; } return; }
        if (g.el > 0.14) { g.holding = true; K.hold = [g.wx, g.wy]; K.dest = null; }
      },
      up(g) {
        if (g.onKing) {
          const a = K.aim; K.aim = null;
          if (a && a.pw > 0.08 && K.sta >= 6 && (K.state === 'idle' || K.state === 'block')) { spend(12 + 22 * a.pw); const dist = 1.5 + 3.3 * a.pw; K.state = 'idle'; roll(K, a.dir, dist, 0.15 + 0.1 * a.pw, 0.5, { dmg: 12 + 26 * a.pw, pd: 20 + 32 * a.pw, rec: 0.25 + 0.22 * a.pw }); }
          else if (a && K.state === 'idle') { spend(8); K.state = 'block'; K.blockT = 0; K.autoBlock = 0.45; const o = nearestEnemy(K.x, K.y, 6); if (o) K.face = Math.atan2(o.y - K.y, o.x - K.x); }
          return;
        }
        if (!g.holding && g.dist < 14) K.dest = [g.wx, g.wy];
        if (g.holding) K.hold = null;
      },
      update(dt) { if (K.autoBlock > 0) { K.autoBlock -= dt; if (K.autoBlock <= 0) endBlock(); } },
    },
    /* ---- kinetic ARPG: speed is the weapon ---- */
    moment: {
      id: 'moment', name: 'Momentum', tokens: 3, extra: 1, title: 'Speed is your weapon',
      help: ['<b>Hold</b> and the king runs toward your finger, building speed; he keeps his momentum and turns in arcs', 'He <b>cuts down anyone he runs past</b>. The faster he is going, the harder the blow (yellow bar)', 'Men he hits are flung back and <b>bowl over</b> the men behind them', 'Sharp turns and taking a hit bleed speed; let go to coast to a stop', '<b>Tap</b> for a quick jab when you are caught standing'],
      init() { K.vel = [0, 0]; K.hitAt = new Map(); K.lastHp = K.hp; },
      down(g) { K.hold = [g.wx, g.wy]; }, move(g) { K.hold = [g.wx, g.wy]; },
      up(g) { K.hold = null; if (g.el < 0.22 && g.dist < 14 && K.state === 'idle') { const o = nearestEnemy(K.x, K.y, 1.7); if (o) attack(K, Math.atan2(o.y - K.y, o.x - K.x), JAB); } },
      kmove(dt) {
        const v = K.vel, MAX = 6.6; let sp = Math.hypot(v[0], v[1]);
        if (K.state !== 'idle') { const k = Math.pow(0.02, dt); v[0] *= k; v[1] *= k; }
        else if (K.hold) { const dx = K.hold[0] - K.x, dy = K.hold[1] - K.y, d = Math.hypot(dx, dy) || 1; if (d > 0.3) { const ax = dx / d, ay = dy / d; if (sp > 0.5 && (v[0] * ax + v[1] * ay) / sp < 0.3) { const k = Math.pow(0.08, dt); v[0] *= k; v[1] *= k; } v[0] += ax * 10 * dt; v[1] += ay * 10 * dt; } }
        else { const k = Math.pow(0.12, dt); v[0] *= k; v[1] *= k; }
        sp = Math.hypot(v[0], v[1]); if (sp > MAX) { v[0] *= MAX / sp; v[1] *= MAX / sp; }
        const rx = K.x - C.x, ry = K.y - C.y, rd = Math.hypot(rx, ry); if (rd > C.R - 0.05) { const out = (v[0] * rx + v[1] * ry) / rd; if (out > 0) { v[0] -= out * rx / rd; v[1] -= out * ry / rd; } }
        K.mx = v[0]; K.my = v[1]; if (sp > 0.4 && K.state === 'idle') K.face = Math.atan2(v[1], v[0]);
      },
      update(dt) {
        const v = K.vel, sp = Math.hypot(v[0], v[1]);
        if (K.hp < K.lastHp) { v[0] *= 0.3; v[1] *= 0.3; } K.lastHp = K.hp;
        if (sp > 2.4 && K.state === 'idle') for (const o of F) if (o.team === 1 && o.alive) {
          const dx = o.x - K.x, dy = o.y - K.y, d = Math.hypot(dx, dy);
          if (d < 0.95 + o.r && dx * v[0] + dy * v[1] > 0 && (K.hitAt.get(o) || -9) < time - 0.55) {
            K.hitAt.set(o, time); const pw = sp / 6.6;
            if (hit(o, K, { dmg: 6 + 30 * pw * pw, pd: 12 + 50 * pw })) { o.kx += v[0] * 0.9; o.ky += v[1] * 0.9; o.thrown = 0.45; }
            fx.push({ k: 'sw', x: K.x, y: K.y, face: K.face, reach: 1.25, arc: 2.2, t: 0, life: 0.18, col: 0xffffff }); sfx('swing'); v[0] *= 0.86; v[1] *= 0.86; K.swingT = 0;
          }
        }
        for (const a of F) if (a.thrown > 0) { a.thrown -= dt; if (Math.hypot(a.kx, a.ky) > 2.5) for (const b of F) if (b !== a && b.team === 1 && b.alive && a.alive && !(b.thrown > 0) && Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r + 0.15) { hit(b, { x: a.x, y: a.y, team: 0, byK: true }, { dmg: 8, pd: 30 }); b.kx += a.kx * 0.6; b.ky += a.ky * 0.6; b.thrown = 0.3; a.thrown = 0; break; } }
        if (sp > 4.5 && rnd() < 0.6) dust(K.x, K.y, 1);
      },
      meter() { return Math.hypot(K.vel[0], K.vel[1]) / 6.6; },
    },
    /* ---- kinetic: a thrown hammer that bounces and comes back ---- */
    hammer: {
      id: 'hammer', name: 'Hammer throw', tokens: 2, title: 'Throw it, call it back',
      help: ['<b>Hold the ground</b> to walk, tap to walk to a spot', '<b>Swipe</b> to hurl the hammer; it bounces off rocks and the tree line and strikes everyone it touches', 'It lands and lies there. <b>Tap anywhere</b> to call it back: it hits everything between it and you', 'Catching it sends out a small shockwave', 'While it is out you are unarmed: <b>swipe</b> rolls instead'],
      init() { HM = { out: false }; },
      down() { }, move(g) { if (g.el > 0.17) { g.holding = true; K.hold = [g.wx, g.wy]; K.dest = null; } },
      up(g) {
        if (g.el < 0.34 && g.dist > 30) { K.hold = null; if (!HM.out && K.state === 'idle' && K.sta > 6) { spend(9); HM = { out: true, x: K.x, y: K.y, vx: Math.cos(g.wdir) * 13, vy: Math.sin(g.wdir) * 13, spin: 0, ret: false, land: false, seen: new Set() }; K.noWeapon = true; K.face = g.wdir; K.swingT = 0; sfx('swing'); } else if (HM.out) dodge(g.wdir, 1.9, 16); }
        else if (!g.holding && g.dist < 14) { if (HM.out && !HM.ret) { HM.ret = true; HM.land = false; HM.seen = new Set(); sfx('dash'); } else if (!HM.out) K.dest = [g.wx, g.wy]; }
        if (g.holding) K.hold = null;
      },
      update(dt) {
        const h = HM; if (!h.out) return; h.spin += dt * 20;
        if (h.ret) { const dx = K.x - h.x, dy = K.y - h.y, d = Math.hypot(dx, dy) || 1; if (d < 0.6) { h.out = false; K.noWeapon = false; K.swingT = 0; sfx('block'); sparks(K.x, K.y, 0.9, 0xffe9a0, 10, 3); fx.push({ k: 'sw', x: K.x, y: K.y, face: 0, reach: 1.3, arc: 6.2, t: 0, life: 0.22, col: 0xffe9a0 }); for (const o of F) if (o.team === 1 && o.alive && Math.hypot(o.x - K.x, o.y - K.y) < 1.35 + o.r) hit(o, K, { dmg: 8, pd: 26 }); return; } h.vx = dx / d * 15; h.vy = dy / d * 15; }
        else if (!h.land) { const k = Math.pow(0.4, dt); h.vx *= k; h.vy *= k; if (Math.hypot(h.vx, h.vy) < 3.4) { h.land = true; h.vx = h.vy = 0; dust(h.x, h.y, 6); } }
        h.x += h.vx * dt; h.y += h.vy * dt; if (h.land) return;
        if (!h.ret) {
          for (const o of obst) { const dx = h.x - o.x, dy = h.y - o.y, d = Math.hypot(dx, dy) || 1; if (d < o.r + 0.18) { const dot = (h.vx * dx + h.vy * dy) / d; if (dot < 0) { h.vx -= 2 * dot * dx / d; h.vy -= 2 * dot * dy / d; h.seen = new Set(); sparks(h.x, h.y, 0.6, 0xd8dce4, 5); sfx('block'); } } }
          const rx = h.x - C.x, ry = h.y - C.y, rd = Math.hypot(rx, ry); if (rd > C.R + 0.4) { const dot = (h.vx * rx + h.vy * ry) / rd; if (dot > 0) { h.vx -= 2 * dot * rx / rd; h.vy -= 2 * dot * ry / rd; h.seen = new Set(); sfx('block'); } }
        }
        for (const o of F) if (o.team === 1 && o.alive && !h.seen.has(o) && Math.hypot(o.x - h.x, o.y - h.y) < o.r + 0.38) { h.seen.add(o); hit(o, { x: h.x - h.vx * 0.1, y: h.y - h.vy * 0.1, team: 0, byK: true }, { dmg: h.ret ? 20 : 16, pd: 30 }); if (!h.ret) { h.vx *= 0.8; h.vy *= 0.8; } }
      },
      drawTop() {
        const h = HM; if (!h.out) return; const z = h.land ? 0.12 : 0.8, cx = Math.round(E.sx(h.x, h.y)), cy = Math.round(E.sy(h.x, h.y, z)), d = h.x + h.y + z + 0.6, a = h.land ? 0.5 : h.spin;
        for (let i = -2; i <= 2; i++) E.dark(Math.round(E.sx(h.x, h.y)) + i, Math.round(E.sy(h.x, h.y, 0)), h.x + h.y + 0.02, 0.6);
        const ex = cx + Math.cos(a) * 8, ey = cy - Math.sin(a) * 8; sline(cx - Math.cos(a) * 6, cy + Math.sin(a) * 6, ex, ey, d, 0x7a5636, 0x5a3e28, 2); rectS(Math.round(ex) - 3, Math.round(ey) - 3, 6, 6, d, 0x6a707c); rectS(Math.round(ex) - 2, Math.round(ey) - 2, 3, 3, d, 0xc8ced8);
        if (h.land) sector(h.x, h.y, 0, 0.45 + 0.1 * Math.sin(time * 6), 7, 0xffe27a, 0.6, 0.1); if (h.ret) gline(h.x, h.y, K.x, K.y, 0xffe27a, true);
      },
    },
    /* ---- survivors-like: weapons work on their own, you only move ---- */
    horde: {
      id: 'horde', name: 'Horde', tokens: 99, horde: true, title: 'Just keep moving',
      help: ['<b>Hold</b> to move; that is nearly all you do', 'Blades <b>circle the king</b> and cut anyone they touch; he also sweeps around himself every moment or so', 'A large rabble pours in from every side', 'Each few kills <b>levels him up</b> (yellow bar) with a random boon: more blades, wider orbit, faster sweep…', '<b>Flick</b> to dash out of a tight spot'],
      init() { HD = { blades: 2, rad: 1.25, spd: 3.6, sweep: 1.3, t: 1, xp: 0, need: 5, k0: 0, hitAt: new Map(), ang: 0 }; },
      down(g) { K.hold = [g.wx, g.wy]; }, move(g) { K.hold = [g.wx, g.wy]; }, up(g) { K.hold = null; if (g.el < 0.3 && g.dist > 40) dodge(g.wdir, 2.1, 18); },
      update(dt) {
        const h = HD; h.ang += dt * h.spd;
        for (let i = 0; i < h.blades; i++) { const a = h.ang + i * TAU / h.blades, bx = K.x + Math.cos(a) * h.rad, by = K.y + Math.sin(a) * h.rad; for (const o of F) if (o.team === 1 && o.alive && Math.hypot(o.x - bx, o.y - by) < o.r + 0.32 && (h.hitAt.get(o) || -9) < time - 0.4) { h.hitAt.set(o, time); hit(o, { x: K.x, y: K.y, team: 0 }, { dmg: 7, pd: 10 }); } }
        h.t -= dt; if (h.t <= 0 && nearestEnemy(K.x, K.y, 1.9)) { h.t = h.sweep; K.swingT = 0; sfx('swing'); fx.push({ k: 'sw', x: K.x, y: K.y, face: K.face, reach: 1.55, arc: 6.2, t: 0, life: 0.22, col: 0xffffff }); for (const o of F) if (o.team === 1 && o.alive && Math.hypot(o.x - K.x, o.y - K.y) < 1.55 + o.r) hit(o, K, { dmg: 11, pd: 16 }); }
        if (kills > h.k0) { h.xp += kills - h.k0; h.k0 = kills; while (h.xp >= h.need) { h.xp -= h.need; h.need = Math.round(h.need * 1.3) + 1; const u = [['Another blade', () => { h.blades = Math.min(7, h.blades + 1); }], ['Wider orbit', () => { h.rad += 0.28; }], ['Faster sweep', () => { h.sweep *= 0.78; }], ['Hearty', () => { K.max += 20; K.hp = Math.min(K.max, K.hp + 35); }], ['Faster blades', () => { h.spd *= 1.22; }]][(rnd() * 5) | 0]; u[1](); pop(K, 'LEVEL UP: ' + u[0], 'good'); sfx('wave'); } }
      },
      meter() { return HD.xp / HD.need; },
      drawTop() { const h = HD; for (let i = 0; i < h.blades; i++) { const a = h.ang + i * TAU / h.blades, x = K.x + Math.cos(a) * h.rad, y = K.y + Math.sin(a) * h.rad, cx = Math.round(E.sx(x, y)), cy = Math.round(E.sy(x, y, 0.7)), tx = Math.round(E.sx(x - Math.sin(a) * 0.45, y + Math.cos(a) * 0.45)), ty = Math.round(E.sy(x - Math.sin(a) * 0.45, y + Math.cos(a) * 0.45, 0.7)), d = x + y + 1.2; sline(cx * 2 - tx, cy * 2 - ty, tx, ty, d, 0xf4f6fa, 0xa8aebc, 3); rectS(cx - 2, cy - 2, 4, 4, d, 0xe8c84a); for (let k = 1; k < 5; k++) { const ta = a - k * 0.14, qx = K.x + Math.cos(ta) * h.rad, qy = K.y + Math.sin(ta) * h.rad; E.px(Math.round(E.sx(qx, qy)), Math.round(E.sy(qx, qy, 0.7)), d - 0.2, k < 3 ? 0xe8e4d8 : 0xa8a498); } E.dark(Math.round(E.sx(x, y)), Math.round(E.sy(x, y, 0)), x + y + 0.02, 0.6); } },
    },
    /* ---- rhythm: strike on the drum beat ---- */
    drum: {
      id: 'drum', name: 'War drum', tokens: 2, title: 'Strike on the beat',
      help: ['A war drum beats; a ring closes on the king with each beat', '<b>Tap on the beat</b> and he leaps to the nearest enemy (or the one you tap) and strikes', 'Every hit in time raises the <b>chain</b> (yellow bar) and the damage; off the beat it breaks', 'He cannot be hit mid-leap, so staying in time keeps him safe', '<b>Swipe</b> to sidestep (free on the beat), <b>hold</b> to walk'],
      init() { RH = { t: 0, combo: 0, idle: 0 }; },
      down() { }, move(g) { if (g.el > 0.2) { g.holding = true; K.hold = [g.wx, g.wy]; K.dest = null; } },
      up(g) {
        if (g.holding) { K.hold = null; return; }
        const ph = RH.t % BEAT, err = Math.min(ph, BEAT - ph), q = err < 0.09 ? 2 : err < 0.17 ? 1 : 0;
        if (g.dist > 30) { if (q) { K.sta = Math.max(K.sta, 20); dodge(g.wdir, 1.9, 0); } else dodge(g.wdir, 1.6, 22); return; }
        if (K.state !== 'idle' && K.state !== 'rec') return;
        let o = enemyAt(g.lx, g.ly); if (!o || Math.hypot(o.x - K.x, o.y - K.y) > 4.8) o = nearestEnemy(K.x, K.y, 4.8);
        if (!q) { RH.combo = 0; pop(K, 'off beat', 'hurt'); if (o && K.state === 'idle' && Math.hypot(o.x - K.x, o.y - K.y) < 1.6) attack(K, Math.atan2(o.y - K.y, o.x - K.x), JAB); return; }
        if (!o) return;
        RH.combo = Math.min(8, RH.combo + 1); RH.idle = 0; pop(K, (q === 2 ? 'PERFECT' : 'good') + ' x' + RH.combo, 'good');
        const d = Math.hypot(o.x - K.x, o.y - K.y); K.state = 'idle';
        roll(K, Math.atan2(o.y - K.y, o.x - K.x), Math.max(0.25, d - 0.7), 0.12, 0.32, { dmg: (q === 2 ? 14 : 10) * (1 + 0.2 * (RH.combo - 1)), pd: 24, rec: 0.1 });
      },
      update(dt) { const b0 = Math.floor(RH.t / BEAT); RH.t += dt; const b1 = Math.floor(RH.t / BEAT); if (b1 !== b0) { sfx(b1 % 4 === 0 ? 'drum' : 'drum2'); if (++RH.idle > 3) RH.combo = 0; } },
      draw() { const p = (RH.t % BEAT) / BEAT, hot = p < 0.15 || p > 0.85; sector(K.x, K.y, 0, 0.75, 7, hot ? 0xffe27a : 0xb8a888, hot ? 0.8 : 0.4, 0.1); sector(K.x, K.y, 0, 0.75 + (1 - p) * 1.5, 7, 0xffffff, 0.25 + 0.4 * p, 0.08); },
      meter() { return RH.combo / 8; },
    },
    /* ---- physics: an iron ball on a chain, simulated as a rope ---- */
    flail: {
      id: 'flail', name: 'Ball & chain', tokens: 3, extra: 1, title: 'Swing the iron ball',
      help: ['The king swings a <b>heavy iron ball on a chain</b>; it is real rope physics', '<b>Hold</b> to move. While he is on the move he keeps the ball <b>whirling round him</b>; walk the circle into the enemy', 'The ball hurts whatever it hits, <b>harder the faster it is moving</b> (yellow bar)', '<b>Tap</b> to yank the ball back toward you, through anyone in the way', '<b>Flick</b> to dash; the chain snaps the ball after you'],
      init() { FL = { p: [], hitAt: new Map(), sp: 0 }; for (let i = 0; i < 8; i++) FL.p.push({ x: K.x, y: K.y + i * 0.1, px: K.x, py: K.y + i * 0.1 }); K.noWeapon = true; },
      down(g) { K.hold = [g.wx, g.wy]; }, move(g) { K.hold = [g.wx, g.wy]; },
      up(g) { K.hold = null; if (g.el < 0.3 && g.dist > 40) dodge(g.wdir, 2.1, 16); else if (g.el < 0.22 && g.dist < 14) { const b = FL.p[7], dx = K.x - b.x, dy = K.y - b.y, d = Math.hypot(dx, dy) || 1; b.px = b.x - dx / d * 0.24; b.py = b.y - dy / d * 0.24; sfx('dash'); } },
      update(dt) {
        const P = FL.p, n = P.length, SEG = 0.21, damp = Math.pow(0.8, dt);
        { // while the king is on the move he keeps the ball swinging round him
          const q = P[n - 1], rx = q.x - K.x, ry = q.y - K.y, rd = Math.hypot(rx, ry) || 1, vx = q.x - q.px, vy = q.y - q.py, sp0 = Math.hypot(vx, vy) / dt;
          if (K.hold && K.state === 'idle' && rd > 0.8 && sp0 < 9.5) { const dir = (rx * vy - ry * vx) >= 0 ? 1 : -1, a = 9 * dt * dt; q.px -= -ry / rd * dir * a; q.py -= rx / rd * dir * a; }
        }
        for (let i = 1; i < n; i++) { const q = P[i], vx = (q.x - q.px) * damp, vy = (q.y - q.py) * damp; q.px = q.x; q.py = q.y; q.x += vx; q.y += vy; }
        for (let it = 0; it < 8; it++) { P[0].x = K.x; P[0].y = K.y; for (let i = 1; i < n; i++) { const a = P[i - 1], b = P[i], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-6; if (d <= SEG) continue; const df = (d - SEG) / d, wa = i === 1 ? 0 : i === n - 1 ? 0.85 : 0.5; a.x += dx * df * wa; a.y += dy * df * wa; b.x -= dx * df * (1 - wa); b.y -= dy * df * (1 - wa); } }
        const b = P[n - 1]; let vx = (b.x - b.px) / dt, vy = (b.y - b.py) / dt, sp = Math.hypot(vx, vy);
        for (const o of obst) { const dx = b.x - o.x, dy = b.y - o.y, d = Math.hypot(dx, dy) || 1; if (d < o.r + 0.22) { b.x = o.x + dx / d * (o.r + 0.22); b.y = o.y + dy / d * (o.r + 0.22); if (sp > 5) { sparks(b.x, b.y, 0.3, 0xd8dce4, 4); sfx('block'); } b.px = b.x; b.py = b.y; } }
        if (sp > 3) for (const o of F) if (o.team === 1 && o.alive && Math.hypot(o.x - b.x, o.y - b.y) < o.r + 0.34 && (FL.hitAt.get(o) || -9) < time - 0.35) {
          FL.hitAt.set(o, time); if (hit(o, { x: b.x - vx * 0.1, y: b.y - vy * 0.1, team: 0, byK: true }, { dmg: Math.min(44, 3 + sp * 2.4), pd: sp * 5 })) { const m = o.kind === 'brute' ? 2.4 : 1; o.kx += vx * 0.5 / m; o.ky += vy * 0.5 / m; }
          b.px = b.x - (b.x - b.px) * 0.6; b.py = b.y - (b.y - b.py) * 0.6;
        }
        FL.sp += (sp - FL.sp) * 0.3;
      },
      meter() { return FL.sp / 13; },
      sprites() { const b = FL.p[7]; return [{ k: b.x + b.y, draw() { const cx = Math.round(E.sx(b.x, b.y)), cy = Math.round(E.sy(b.x, b.y, 0.22)), d = b.x + b.y + 0.4, hot = FL.sp > 7; for (let dy = -2; dy <= 2; dy++) for (let dx = -7; dx <= 7; dx++) if (dx * dx / 49 + dy * dy / 5 < 1) E.dark(cx + dx, Math.round(E.sy(b.x, b.y, 0)) + dy, b.x + b.y + 0.02, 0.62); for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) { const r2 = dx * dx + dy * dy; if (r2 > 27) continue; E.px(cx + dx, cy + dy, d, r2 > 19 ? 0x2a2a32 : dx + dy < -3 ? 0x9aa0ac : dx + dy < 2 ? 0x5a5e6a : 0x3e404a); } for (const s of [[-7, 0], [7, 0], [0, -7], [0, 7], [-5, -5], [5, 5], [5, -5], [-5, 5]]) rectS(cx + s[0] - 1, cy + s[1] - 1, 2, 2, d, hot ? 0xffe9a0 : 0xc8ced8); } }]; },
      drawTop() { const P = FL.p; for (let i = 0; i < 7; i++) for (let k = 0; k < 2; k++) { const u = k / 2, x = P[i].x + (P[i + 1].x - P[i].x) * u, y = P[i].y + (P[i + 1].y - P[i].y) * u, z = 0.6 - 0.38 * ((i + u) / 7); rectS(Math.round(E.sx(x, y)), Math.round(E.sy(x, y, z)), 2, 2, x + y + z + 0.3, (i * 2 + k) & 1 ? 0xc8ced8 : 0x55555e); } },
    },
    /* ---- physics: shove bodies into rocks, trees, the fire and each other ---- */
    shove: {
      id: 'shove', name: 'Shield bash', tokens: 3, extra: 1, slide: 0.05, title: 'Knock them into things',
      help: ['The bash itself barely hurts. <b>What they hit does</b>: rocks, the tree line, the campfire, each other', '<b>Swipe</b> to shield-bash that way; a <b>long swipe</b> is a charging bash that throws them much further', 'Bodies carry momentum and <b>knock on</b> into the next man', 'Three loose <b>barrels</b> can be bashed across the clearing', '<b>Hold the ground</b> to walk, <b>hold the king</b> to brace behind the shield'],
      init() { PR = [[10.6, 11.2], [14.2, 13.0], [12.2, 15.4]].map(p => ({ x: p[0], y: p[1], vx: 0, vy: 0, r: 0.3, rot: 0, hitAt: new Map() })); },
      down(g) { if (g.onKing) startBlock(); },
      move(g) { if (g.onKing) return; if (g.el > 0.17) { g.holding = true; K.hold = [g.wx, g.wy]; K.dest = null; } },
      up(g) {
        if (g.onKing) { endBlock(); return; }
        if (g.el < 0.34 && g.dist > 30) { K.hold = null; if (K.state === 'idle' && K.sta > 6) { const big = g.dist > 130; spend(big ? 24 : 13); K.dest = null; attack(K, g.wdir, big ? BASH2 : BASH); } }
        else if (!g.holding && g.dist < 14) K.dest = [g.wx, g.wy];
        if (g.holding) K.hold = null;
      },
      onSwing(s) { if (!s.push) return; for (const b of PR) { const dx = b.x - K.x, dy = b.y - K.y; if (Math.hypot(dx, dy) < s.reach + 0.4 && adiff(Math.atan2(dy, dx), K.face) < s.arc / 2) { b.vx += Math.cos(K.face) * (s.push + 3); b.vy += Math.sin(K.face) * (s.push + 3); sfx('hit'); dust(b.x, b.y, 4); } } },
      update(dt) {
        const slam = (o, s, label, extra) => { o.slamT = 0.3; if (hit(o, { x: o.x + o.kx, y: o.y + o.ky, team: 0, byK: true }, { dmg: s * 2.6 + (extra || 0), pd: s * 8 }) && label) pop(o, label, 'good'); dust(o.x, o.y, 5); };
        for (const o of F) {
          if (o.team !== 1 || !o.alive) continue; o.slamT = (o.slamT || 0) - dt; const s = Math.hypot(o.kx, o.ky); if (s < 3.2 || o.slamT > 0) continue;
          let done = false;
          for (const ob of obst) { const dx = o.x - ob.x, dy = o.y - ob.y, d = Math.hypot(dx, dy) || 1; if (d < o.r + ob.r + 0.1 && o.kx * dx + o.ky * dy < 0) { slam(o, s, ob.fire ? 'BURNED' : 'SLAM', ob.fire ? 14 : 0); const dot = (o.kx * dx + o.ky * dy) / d; o.kx = (o.kx - 1.6 * dot * dx / d) * 0.45; o.ky = (o.ky - 1.6 * dot * dy / d) * 0.45; done = true; break; } }
          if (done) continue;
          const rx = o.x - C.x, ry = o.y - C.y, rd = Math.hypot(rx, ry); if (rd > C.R + 1.2 && o.kx * rx + o.ky * ry > 0) { slam(o, s, 'INTO THE TREES'); o.kx *= -0.3; o.ky *= -0.3; continue; }
          for (const b of F) if (b !== o && b.team === 1 && b.alive && Math.hypot(b.x - o.x, b.y - o.y) < o.r + b.r + 0.12 && o.kx * (b.x - o.x) + o.ky * (b.y - o.y) > 0) { const m = b.kind === 'brute' ? 2.4 : 1; slam(b, s * 0.7, 'KNOCK-ON'); slam(o, s * 0.4); b.kx += o.kx * 0.65 / m; b.ky += o.ky * 0.65 / m; b.slamT = 0.25; o.kx *= 0.35; o.ky *= 0.35; break; }
        }
        for (const b of PR) {
          const k = Math.pow(0.3, dt), sp = Math.hypot(b.vx, b.vy); b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= k; b.vy *= k; b.rot += sp * dt * 6;
          for (const ob of obst) { const dx = b.x - ob.x, dy = b.y - ob.y, d = Math.hypot(dx, dy) || 1; if (d < b.r + ob.r) { b.x = ob.x + dx / d * (b.r + ob.r); b.y = ob.y + dy / d * (b.r + ob.r); const dot = (b.vx * dx + b.vy * dy) / d; if (dot < 0) { b.vx -= 1.7 * dot * dx / d; b.vy -= 1.7 * dot * dy / d; if (sp > 3) sfx('block'); } } }
          const rx = b.x - C.x, ry = b.y - C.y, rd = Math.hypot(rx, ry); if (rd > C.R + 0.6) { b.x = C.x + rx / rd * (C.R + 0.6); b.y = C.y + ry / rd * (C.R + 0.6); const dot = (b.vx * rx + b.vy * ry) / rd; if (dot > 0) { b.vx -= 1.7 * dot * rx / rd; b.vy -= 1.7 * dot * ry / rd; } }
          for (const o of F) { if (!o.alive) continue; const dx = b.x - o.x, dy = b.y - o.y, d = Math.hypot(dx, dy) || 1; if (d > b.r + o.r) continue;
            if (o.team === 1 && sp > 2.5 && (b.hitAt.get(o) || -9) < time - 0.5) { b.hitAt.set(o, time); const m = o.kind === 'brute' ? 2.4 : 1; if (hit(o, { x: b.x - b.vx, y: b.y - b.vy, team: 0, byK: true }, { dmg: sp * 3.4, pd: 45 })) pop(o, 'BARREL', 'good'); o.kx += b.vx * 0.7 / m; o.ky += b.vy * 0.7 / m; b.vx *= 0.6; b.vy *= 0.6; }
            else { b.x = o.x + dx / d * (b.r + o.r); b.y = o.y + dy / d * (b.r + o.r); if (sp < 2.5) { b.vx += dx / d * 6 * dt; b.vy += dy / d * 6 * dt; } } }
        }
      },
      sprites() { return PR.map(b => ({ k: b.x + b.y, draw() { const cx = Math.round(E.sx(b.x, b.y)), by = Math.round(E.sy(b.x, b.y, 0)), d0 = b.x + b.y + 0.1, sh = Math.floor(b.rot) % 3; for (let dy = -2; dy <= 2; dy++) for (let dx = -8; dx <= 8; dx++) if (dx * dx / 64 + dy * dy / 5 < 1) E.dark(cx + dx, by + dy, d0 - 0.05, 0.65); for (let r = 0; r < 17; r++) { const w = r < 2 || r > 14 ? 5 : r < 4 || r > 12 ? 6 : 7; for (let x = -w; x < w; x++) { let c = (r === 3 || r === 8 || r === 13) ? (x < -2 ? 0x8a8e98 : 0x4a4a54) : ((x + 20 + sh) % 3 === 0 ? 0x5e4028 : x < -3 ? 0xa87c50 : x > 3 ? 0x6a4a2e : 0x8a623e); if (r > 14) c = r === 16 ? 0x74543a : 0x9a7650; E.px(cx + x, by - r, d0 + r / 40, c); } } } })); },
    },
  };
  /* ---- time-stop tactics: the swipe scheme, but the world only moves when the king does ---- */
  MODES.still = Object.assign({}, MODES.swipe, { id: 'still', name: 'Time holds', tokens: 3, extra: 1, title: 'Time moves only when you do',
    help: ['The world <b>freezes whenever the king is idle</b>, so you can read the fight and choose', 'Controls are the Swipe scheme: <b>hold</b> to walk, <b>swipe</b> to cut, long swipe to lunge, <b>hold the king</b> to block, swipe from him to roll', 'Time runs while he walks, swings, blocks or rolls; hold your finger still on the ground to let time pass', 'More bandits come at once, since you have time to think'],
    ts() { return (K.hold || K.dest || K.state !== 'idle' || K.buf) ? 1 : 0.04; } });
  function enemyAt(lx, ly) { let b = null, bd = 30; for (const o of F) if (o.team === 1 && o.alive) { const d = Math.hypot(o.p.scrX - lx, o.p.scrY - ly); if (d < bd) { bd = d; b = o; } } return b; }

  /* ================= simulation ================= */
  function kingMove() {
    K.mx = K.my = 0; K.holdStop = false;
    if (K.state === 'block' && mode.id !== 'duel') return;
    if (K.state !== 'idle') return;
    const t = K.hold || K.dest; if (!t) return;
    const dx = t[0] - K.x, dy = t[1] - K.y, d = Math.hypot(dx, dy);
    if (d < 0.18) { if (K.dest) K.dest = null; return; }
    const sp = KINDS.king.speed * (mode.id === 'duel' && K.stance < 0 ? 0.7 : 1);
    K.mx = dx / d * sp; K.my = dy / d * sp;
    if (mode.id !== 'duel') K.face = Math.atan2(dy, dx);
  }
  function sim(dt) {
    time += dt; if (msgT < 1e8) { msgT -= dt; if (msgT <= 0) $('msg').classList.remove('on'); }
    const live = F.filter(f => f.alive && f.team === 1);
    if (!over && live.length === 0) { waveT -= dt; if (waveT <= 0) { if (wave > 0) { K.hp = Math.min(K.max, K.hp + 25); for (const k of F) if (k.kind === 'knight' && k.alive) k.hp = Math.min(k.max, k.hp + 30); allies(); } spawnWave(); waveT = 2.2; } }
    // who is allowed to press the attack
    const melee = live.filter(e => e.kind !== 'archer');
    for (const e of live) { e.think -= dt; if (e.think <= 0 || !e.tgt || !e.tgt.alive) { e.think = 0.4; let b = null, bd = 1e9; for (const o of F) if (o.team === 0 && o.alive) { const d = Math.hypot(o.x - e.x, o.y - e.y) * (o === K ? 0.8 : 1); if (d < bd) { bd = d; b = o; } } e.tgt = b; } }
    melee.sort((a, b) => (a.tgt ? Math.hypot(a.x - a.tgt.x, a.y - a.tgt.y) : 99) - (b.tgt ? Math.hypot(b.x - b.tgt.x, b.y - b.tgt.y) : 99));
    melee.forEach((e, i) => { e.eng = mode.id === 'duel' ? e === K.lock : (i < mode.tokens || e.state !== 'idle'); });
    if (!over) {
      if (mode.kmove) mode.kmove(dt); else kingMove(); if (mode.update) mode.update(dt);
      if (mode.id === 'duel' && K.holdStop) K.mx = K.my = 0;
      if (K.buf) { K.buf.t -= dt; if (K.state === 'idle') { const b = K.buf; K.buf = null; kingSwing(b.dir, b.heavy); } else if (K.buf.t <= 0) K.buf = null; }
      K.comboT += dt; K.staD -= dt; if (K.staD <= 0 && K.state !== 'block') K.sta = Math.min(100, K.sta + 26 * dt);
      if (K.state === 'block') K.blockT += dt;
    }
    for (const f of F) {
      if (f.state === 'dead') { f.st += dt; f.fade = Math.min(1, f.st / 0.9); f.p.z = -f.st * 0.25; continue; }
      f.cd -= dt; f.flash = Math.max(0, f.flash - dt * 6); f.swingT += dt; if (f.ifr > 0) f.ifr -= dt;
      if (f !== K) { f.poise = Math.min(f.spec.poise, f.poise + dt * 6); if (over) { f.mx = f.my = 0; } else if (f.kind === 'knight') aiKnight(f); else if (f.kind === 'archer') aiArcher(f, dt); else aiMelee(f, f.eng); }
      if (f.state !== 'idle' && f.state !== 'block') {
        f.st -= dt;
        if (f.state === 'wind') { const l = f.atk.lunge || 0; if (l) { f.kx = 0; f.ky = 0; f.x += Math.cos(f.face) * l / f.atk.wind * dt; f.y += Math.sin(f.face) * l / f.atk.wind * dt; } if (f.st <= 0) resolve(f); }
        else if (f.state === 'roll') {
          f.x += f.rdx * dt; f.y += f.rdy * dt; f.p.z = Math.sin(Math.PI * (1 - f.st / f.rollDur)) * (f.dash ? 0.12 : 0.3);
          if (f.dash) for (const o of F) if (o.team !== f.team && o.alive && !f.dash.seen.has(o) && Math.hypot(o.x - f.x, o.y - f.y) < 0.85 + o.r) { f.dash.seen.add(o); hit(o, f, f.dash); }
          if (rnd() < 0.5) dust(f.x, f.y, 1);
          if (f.st <= 0) { f.p.z = 0; if (f.dash) { fx.push({ k: 'sw', x: f.x, y: f.y, face: f.face, reach: 1.1, arc: 2.6, t: 0, life: 0.2, col: 0xffffff }); f.state = 'rec'; f.st = f.dash.rec; f.atk = null; f.dash = null; f.swingT = 0; } else f.state = 'idle'; }
        }
        else if (f.state === 'aim') { }
        else if (f.st <= 0) { if (f.state === 'stag') f.poise = f.spec.poise; f.state = 'idle'; }
      }
      // integrate, collide
      const kb = Math.pow(mode.slide && f !== K ? mode.slide : 0.0008, dt); f.x += (f.mx + f.kx) * dt; f.y += (f.my + f.ky) * dt; f.kx *= kb; f.ky *= kb;
      for (const o of obst) { const dx = f.x - o.x, dy = f.y - o.y, d = Math.hypot(dx, dy), m = o.r + f.r; if (d < m && d > 1e-4) { f.x = o.x + dx / d * m; f.y = o.y + dy / d * m; } }
      const lim = f.team === 0 ? C.R : C.R + 1.6, cd = Math.hypot(f.x - C.x, f.y - C.y); if (cd > lim) { f.x = C.x + (f.x - C.x) / cd * lim; f.y = C.y + (f.y - C.y) / cd * lim; }
      const sp = Math.hypot(f.mx, f.my); f.p.moving = sp > 0.25 && f.state === 'idle'; if (f.p.moving) f.p.phase += dt * sp * 2.7;
    }
    for (let i = 0; i < F.length; i++) for (let j = i + 1; j < F.length; j++) {
      const a = F[i], b = F[j]; if (!a.alive || !b.alive || a.ifr > 0 || b.ifr > 0) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = a.r + b.r; if (d < m && d > 1e-4) { const p = (m - d) / 2; a.x -= dx / d * p; a.y -= dy / d * p; b.x += dx / d * p; b.y += dy / d * p; }
    }
    // arrows
    for (const s of shots) {
      if (s.dead) continue; s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.t > 1.4 || obst.some(o => Math.hypot(s.x - o.x, s.y - o.y) < o.r)) { s.dead = true; decals.push({ x: s.x, y: s.y, a: Math.atan2(s.vy, s.vx), t: 5 }); continue; }
      for (const o of F) if (o.alive && o.team !== s.by.team && Math.hypot(o.x - s.x, o.y - s.y) < o.r + 0.12) {
        if (o.state === 'block' && o.blockT < 0.24 && adiff(o.face, Math.atan2(-s.vy, -s.vx)) < 1.2) { s.vx = -s.vx; s.vy = -s.vy; s.by = o; s.t = 0; pop(o, 'DEFLECT', 'good'); sfx('parry'); sparks(o.x, o.y, 0.9, 0xfff2a8, 8); break; }
        hit(o, { x: s.x - s.vx, y: s.y - s.vy, team: s.by.team }, { dmg: 10, pd: 8, arrow: true }); s.dead = true; break;
      }
    }
    shots = shots.filter(s => !s.dead); F = F.filter(f => !(f.state === 'dead' && f.st > 1.0 && f !== K && f.kind !== 'knight'));
    for (const d of decals) d.t -= dt; decals = decals.filter(d => d.t > 0);
    for (const e of fx) { e.t += dt; if (e.k === 'sp') { e.x += e.vx * dt; e.y += e.vy * dt; e.z += e.vz * dt; e.vz -= (e.dustp ? 1.5 : 12) * dt; if (e.z < 0) { e.z = 0; e.vz *= -0.3; } } }
    fx = fx.filter(e => { if (e.t < e.life) return true; if (e.el) e.el.remove(); return false; });
  }

  /* ================= drawing ================= */
  const gx = (lx, ly) => { const a = (lx - E.OX) / HW, b = (ly - E.OY) / HH; return [(b + a) / 2, (b - a) / 2]; };
  function blend(ix, iy, d, c, a) {
    if (ix < 0 || iy < 0 || ix >= E.W || iy >= E.H) return; const i = iy * E.W + ix; if (E.dep[i] > d) return;
    const p = frame[i], r = (p & 255) * (1 - a) + (c >> 16 & 255) * a, g = (p >> 8 & 255) * (1 - a) + (c >> 8 & 255) * a, b = (p >> 16 & 255) * (1 - a) + (c & 255) * a;
    frame[i] = 0xff000000 | (b << 16) | (g << 8) | r;
  }
  function sector(x, y, face, reach, arc, col, a, ring) {      // flat wedge painted on the ground
    const sx = E.sx(x, y), sy = E.sy(x, y, 0), rx = Math.ceil(reach * HW * 1.45), ry = Math.ceil(reach * HH * 1.45);
    for (let iy = Math.floor(sy - ry); iy <= sy + ry; iy++) for (let ix = Math.floor(sx - rx); ix <= sx + rx; ix++) {
      const w = gx(ix + 0.5, iy + 0.5), dx = w[0] - x, dy = w[1] - y, d = Math.hypot(dx, dy);
      if (d > reach || (ring && d < reach - ring)) continue; if (arc < 6.2 && adiff(Math.atan2(dy, dx), face) > arc / 2) continue;
      blend(ix, iy, w[0] + w[1] + 0.03, col, ((ix + iy) & 1) ? a : a * 0.55);
    }
  }
  function gline(x0, y0, x1, y1, col, dash) { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 24); for (let i = 0; i <= n; i++) { if (dash && ((i / 5) | 0) % 2) continue; const u = i / n, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u, px = Math.round(E.sx(x, y)), py = Math.round(E.sy(x, y, 0)); E.px(px, py, x + y + 0.03, col); E.px(px + 1, py, x + y + 0.03, col); } }
  function sline(x0, y0, x1, y1, d, c, c2, th) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0 || 1; for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n); E.px(x, y, d, c); if (th > 1) E.px(x + 1, y, d, c2); if (th > 2) { E.px(x, y + 1, d, c2); E.px(x + 1, y + 1, d, c2); } } }
  function rectS(x, y, w, h, d, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) E.px(x + i, y + j, d, c); }
  function drawFighter(f) {
    const p = f.p; p.x = f.x; p.y = f.y; p.fx = Math.cos(f.face); p.fy = Math.sin(f.face); p.flash = f.flash; p.fade = f.fade;
    if (f.state === 'stag') p.flash = Math.max(p.flash, 0.25 + 0.2 * Math.sin(time * 20));
    Sim.drawPerson(p, time);
    if (!f.alive) return;
    const sc = p.scale || 1, flip = (p.fx - p.fy) < 0, sg = flip ? -1 : 1, sx = p.scrX, sy = p.scrY + 16, d = f.x + f.y + 0.9 + (p.z || 0);
    // weapon: a line swung about the hand
    if (f.kind !== 'knight' && f.kind !== 'archer') {
      let a = 1.15;
      if (f.state === 'wind') a = 1.15 + 1.2 * (1 - f.st / f.atk.wind); else if (f.swingT < 0.12) a = 2.35 - 3.0 * (f.swingT / 0.12); else if (f.state === 'rec') a = -0.65 + 1.8 * clamp((f.swingT - 0.12) / 0.25, 0, 1);
      else if (f.state === 'block') a = 1.9; else if (f.state === 'stag') a = -0.4; else if (f.state === 'roll' && f.dash) a = 0.1;
      const hx = sx + sg * Math.round(5 * sc), hy = sy - Math.round(13 * sc), L = (f.kind === 'brute' ? 17 : f.kind === 'king' ? 15 : 12) * (f.kind === 'brute' ? 1.1 : 1);
      const ex = hx + sg * Math.cos(a) * L, ey = hy - Math.sin(a) * L;
      if (f === K && K.noWeapon) { } else if (f.kind === 'king' && mode.id !== 'hammer') { sline(hx, hy, ex, ey, d, 0xe4e8f0, 0xa8aebc, 2); rectS(Math.round(hx + sg * Math.cos(a) * 2 - 1), Math.round(hy - Math.sin(a) * 2 - 1), 3, 3, d, 0xe8c84a); }
      else if (f.kind === 'brute' || f.kind === 'king') { sline(hx, hy, ex, ey, d, 0x7a5636, 0x5a3e28, 3); rectS(Math.round(ex) - 2, Math.round(ey) - 2, 5, 5, d, 0x4a3424); rectS(Math.round(ex) - 1, Math.round(ey) - 1, 2, 2, d, 0x9aa0ac); }
      else { sline(hx, hy, ex, ey, d, 0x8a6a46, 0x6a4c30, 2); rectS(Math.round(hx + sg * Math.cos(a) * (L - 3)) - 1, Math.round(hy - Math.sin(a) * (L - 3)) - 2, 4, 4, d, 0xa8aeb8); }
    } else if (f.kind === 'archer') {
      const bx = sx + sg * 7, by = sy - 15, drawn = f.state === 'aim';
      for (let i = -6; i <= 6; i++) E.px(bx + sg * Math.round(2 - i * i / 14), by + i, d, 0x7a5636);
      sline(bx + sg * -1, by - 6, bx - sg * (drawn ? 4 : 1), by, d, 0xd8d0c0, 0, 1); sline(bx - sg * (drawn ? 4 : 1), by, bx + sg * -1, by + 6, d, 0xd8d0c0, 0, 1);
      if (drawn) sline(bx - sg * 4, by, bx + sg * 6, by, d, 0xc9b890, 0, 1);
    }
    // shield when blocking
    if (f.state === 'block') { const bx = sx + sg * 4 - (flip ? 8 : 0), by = sy - 21; for (let j = 0; j < 12; j++) { const w = j < 8 ? 9 : 9 - (j - 7) * 2; for (let i = 0; i < w; i++) { const xx = bx + ((9 - w) >> 1) + i, e = i === 0 || i === w - 1 || j === 0 || j === 11; E.px(xx, by + j, d + 0.1, e ? 0xe8c84a : (i === (w >> 1) || j === 4) ? 0xf4efe0 : 0x3a4f9a); } } if (f.blockT < 0.24) for (let i = 0; i < 4; i++) E.px(bx + 4 + Math.round(Math.cos(i * 1.57 + time * 20) * 8), by + 6 + Math.round(Math.sin(i * 1.57 + time * 20) * 8), d + 0.2, 0xfff2a8); }
    const top = p.scrTop;
    if (f.team === 1 || f.kind === 'knight') { const w = Math.round(18 * sc), x0 = sx - (w >> 1); rectS(x0 - 1, top - 5, w + 2, 4, d + 1, 0x1b1520); rectS(x0, top - 4, Math.max(0, Math.round(w * f.hp / f.max)), 2, d + 1, f.team ? 0xe2584c : 0x6ab04a); }
    if (mode.id === 'duel' && (f === K || f === K.lock)) { const w = 18, x0 = sx - 9, y0 = f === K ? top - 5 : top - 9; rectS(x0 - 1, y0, w + 2, 4, d + 1, 0x1b1520); rectS(x0, y0 + 1, Math.max(0, Math.round(w * f.poise / f.spec.poise)), 2, d + 1, 0x8ac8f0); }
    if (f.state === 'wind' && f.atk.heavy && f.team === 1) { const b = Math.floor(time * 10) & 1; rectS(sx - 1, top - 20 - b, 3, 8, d + 1, 0xff4a3a); rectS(sx - 1, top - 10 - b, 3, 3, d + 1, 0xff4a3a); }
    if (f.state === 'stag') for (let i = 0; i < 3; i++) { const a = time * 6 + i * 2.09; rectS(sx + Math.round(Math.cos(a) * 8), top - 2 + Math.round(Math.sin(a) * 3), 2, 2, d + 1, 0xffe27a); }
    if (f === K.focus && mode.id === 'guard') for (let i = 0; i < 3; i++) for (let j = -(2 - i); j <= 2 - i; j++) E.px(sx + j, top - 12 + i - (Math.floor(time * 4) & 1), d + 1, 0xffe27a);
  }
  function draw() {
    E.begin(frame);
    // ground marks
    for (const d of decals) { const x1 = d.x - Math.cos(d.a) * 0.3, y1 = d.y - Math.sin(d.a) * 0.3, ax = Math.round(E.sx(d.x, d.y)), ay = Math.round(E.sy(d.x, d.y, 0)); sline(ax, ay, Math.round(E.sx(x1, y1)), Math.round(E.sy(x1, y1, 0.35)), d.x + d.y + 0.2, 0x8a6a46, 0, 1); }
    for (const f of F) {
      if (!f.alive) continue;
      if (f.team === 1 && f.state === 'wind') sector(f.x, f.y, f.face, f.atk.reach, f.atk.arc, f.atk.heavy ? 0xff3a2a : 0xff8a4a, 0.2 + 0.4 * (1 - f.st / f.atk.wind));
      if (f.state === 'aim') gline(f.x, f.y, f.x + Math.cos(f.face) * 8, f.y + Math.sin(f.face) * 8, f.st < 0.25 ? 0xff3a2a : 0xffb08a, true);
    }
    if (!over) {
      if (mode.id === 'guard') sector(K.x, K.y, 0, AUTO.reach, 7, K.planted > 0.12 ? 0xffe27a : 0x8a8478, K.planted > 0.12 ? 0.5 : 0.3, 0.09);
      if (mode.id === 'duel' && K.lock && K.lock.alive) sector(K.lock.x, K.lock.y, 0, 0.6, 7, K.stance > 0 ? 0xff8a4a : K.stance < 0 ? 0x8ac8f0 : 0xffe27a, 0.6, 0.1);
      if (K.aim && K.aim.pw > 0.02) { const a = K.aim, L = 1.5 + 3.3 * a.pw, ex = K.x + Math.cos(a.dir) * L, ey = K.y + Math.sin(a.dir) * L, px = -Math.sin(a.dir) * 0.8, py = Math.cos(a.dir) * 0.8, c = a.pw > 0.85 ? 0xffe27a : 0xffffff; gline(K.x + px, K.y + py, ex + px, ey + py, c, true); gline(K.x - px, K.y - py, ex - px, ey - py, c, true); sector(ex, ey, 0, 0.5, 7, c, 0.7, 0.1); for (const o of F) if (o.team === 1 && o.alive) { const u = clamp(((o.x - K.x) * Math.cos(a.dir) + (o.y - K.y) * Math.sin(a.dir)) / L, 0, 1); if (Math.hypot(K.x + Math.cos(a.dir) * L * u - o.x, K.y + Math.sin(a.dir) * L * u - o.y) < 0.85 + o.r) sector(o.x, o.y, 0, 0.55, 7, 0xff4a3a, 0.6, 0.12); } }
      const t = K.hold || K.dest; if (t && K.state === 'idle') sector(t[0], t[1], 0, 0.28, 7, 0xffe27a, 0.5, 0.08);
    }
    if (mode.draw && !over) mode.draw();
    const DL = F.map(f => ({ k: f.x + f.y, f })); if (mode.sprites && !over) for (const e of mode.sprites()) DL.push(e);
    DL.sort((a, b) => a.k - b.k); for (const e of DL) { if (e.f) drawFighter(e.f); else e.draw(); }
    if (mode.drawTop && !over) mode.drawTop();
    for (const s of shots) { const x0 = Math.round(E.sx(s.x, s.y)), y0 = Math.round(E.sy(s.x, s.y, 0.9)), x1 = Math.round(E.sx(s.x - s.vx * 0.045, s.y - s.vy * 0.045)), y1 = Math.round(E.sy(s.x - s.vx * 0.045, s.y - s.vy * 0.045, 0.9)); sline(x1, y1, x0, y0, s.x + s.y + 1, 0xd8c8a0, 0, 1); E.px(x0, y0, s.x + s.y + 1, 0xe4e8f0); E.dark(Math.round(E.sx(s.x, s.y)), Math.round(E.sy(s.x, s.y, 0)), s.x + s.y, 0.6); }
    for (const e of fx) {
      if (e.k === 'sw') { const pr = e.t / e.life, a0 = e.face - e.arc / 2, n = Math.ceil(e.arc * e.reach * 14); for (let i = 0; i <= n; i++) { const u = i / n; if (u > pr * 1.5 || u < pr * 1.5 - 0.7) continue; const a = a0 + e.arc * u; for (const rr of [0.95, 0.82, 0.7]) { const x = e.x + Math.cos(a) * e.reach * rr, y = e.y + Math.sin(a) * e.reach * rr; E.px(Math.round(E.sx(x, y)), Math.round(E.sy(x, y, 0.7)), x + y + 1.2, rr > 0.9 ? e.col : rr > 0.8 ? 0xe8e4d8 : 0xb8b4a8); } } }
      else if (e.k === 'sp') { const px = Math.round(E.sx(e.x, e.y)), py = Math.round(E.sy(e.x, e.y, e.z)), d = e.x + e.y + e.z + 0.5; E.px(px, py, d, e.col); if (e.t < e.life * 0.6) E.px(px + 1, py, d, e.col); if (e.dustp && e.t < e.life * 0.5) { E.px(px, py + 1, d, e.col); E.px(px + 1, py + 1, d, 0x9a8a70); } }
      else if (e.k === 'pop') { const lx = E.sx(e.x, e.y), ly = E.sy(e.x, e.y, e.z + e.t * 1.2); e.el.style.left = ((lx - camX) * zoom + cv.width / 2) / dpr + 'px'; e.el.style.top = ((ly - camY) * zoom + cv.height / 2) / dpr + 'px'; e.el.style.opacity = e.t > e.life * 0.6 ? 1 - (e.t - e.life * 0.6) / (e.life * 0.4) : 1; }
    }
    if (Sim.fx) for (const f of Sim.fx) f(time);
    // camera: centred on the clearing, leaning toward the king
    const tx = E.sx(C.x, C.y) * 0.65 + E.sx(K.x, K.y) * 0.35, ty = E.sy(C.x, C.y, 1) * 0.65 + E.sy(K.x, K.y, 1) * 0.35; camX += (tx - camX) * 0.08; camY += (ty - camY) * 0.08;
    const shx = shake > 0.2 ? (rnd() - 0.5) * shake : 0, shy = shake > 0.2 ? (rnd() - 0.5) * shake : 0; shake *= 0.86;
    const vw = cv.width / zoom, vh = cv.height / zoom, x0 = camX + shx - vw / 2, y0 = camY + shy - vh / 2;
    const dx0 = Math.max(0, Math.floor(x0)), dy0 = Math.max(0, Math.floor(y0)), dw = Math.min(E.W, Math.ceil(x0 + vw) + 1) - dx0, dh = Math.min(E.H, Math.ceil(y0 + vh) + 1) - dy0;
    octx.putImageData(img, 0, 0, dx0, dy0, dw, dh);
    ctx.fillStyle = '#14111a'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.imageSmoothingEnabled = zoom < 1;
    ctx.drawImage(off, dx0, dy0, dw, dh, Math.round((dx0 - x0) * zoom), Math.round((dy0 - y0) * zoom), dw * zoom, dh * zoom);
    if (K.aim || slow < 0.5) { ctx.fillStyle = 'rgba(40,60,120,0.16)'; ctx.fillRect(0, 0, cv.width, cv.height); }
    $('hp').firstChild.style.width = Math.max(0, K.hp / K.max * 100) + '%'; $('st').firstChild.style.width = clamp(mode.meter ? mode.meter() * 100 : K.sta, 0, 100) + '%'; if (mode.id === 'duel') $('bal').firstChild.style.width = clamp(K.poise / KINDS.king.poise * 100, 0, 100) + '%';
  }

  /* ================= input ================= */
  const ptr = new Map(); let G = null, pinch0 = 0, zoom0 = 1;
  function gest(e, g) {
    const lx = camX + (e.clientX * dpr - cv.width / 2) / zoom, ly = camY + (e.clientY * dpr - cv.height / 2) / zoom, w = gx(lx, ly);
    g.x = e.clientX; g.y = e.clientY; g.lx = lx; g.ly = ly; g.wx = w[0]; g.wy = w[1]; g.el = (performance.now() - g.t0) / 1000;
    const dx = g.x - g.x0, dy = g.y - g.y0; g.dist = Math.hypot(dx, dy); g.wdir = Math.atan2(dy / HH - dx / HW, dx / HW + dy / HH);
  }
  cv.addEventListener('pointerdown', e => {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (er) { } }
    try { cv.setPointerCapture(e.pointerId); } catch (er) { }
    ptr.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptr.size === 2) { const a = [...ptr.values()]; pinch0 = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]) || 1; zoom0 = zoom; if (G) { K.hold = null; K.aim = null; endBlock(); G = null; } return; }
    if (over) { reset(); return; }
    G = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: performance.now() }; gest(e, G);
    const kx = ((E.sx(K.x, K.y) - camX) * zoom + cv.width / 2) / dpr, ky = ((E.sy(K.x, K.y, 0.7) - camY) * zoom + cv.height / 2) / dpr;
    G.onKing = Math.hypot(e.clientX - kx, e.clientY - ky) < Math.max(34, 24 * zoom / dpr);
    mode.down(G);
  });
  cv.addEventListener('pointermove', e => {
    if (!ptr.has(e.pointerId)) return; ptr.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptr.size === 2) { const a = [...ptr.values()]; zoom = clamp(zoom0 * Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]) / pinch0, 0.8, 8); return; }
    if (G && e.pointerId === G.id && !over) { gest(e, G); mode.move(G); }
  });
  const up = e => { if (!ptr.has(e.pointerId)) return; ptr.delete(e.pointerId); if (G && e.pointerId === G.id) { gest(e, G); if (!over) mode.up(G); G = null; } };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', e => { e.preventDefault(); zoom = clamp(zoom * Math.exp(-e.deltaY * 0.0015), 0.8, 8); }, { passive: false });
  cv.addEventListener('contextmenu', e => e.preventDefault());

  /* ================= shell ================= */
  function setMode(id) {
    mode = MODES[id]; const el = $('modes'); el.innerHTML = '';
    for (const k in MODES) { const b = document.createElement('button'); b.textContent = MODES[k].name; if (k === id) b.className = 'on'; b.onclick = () => setMode(k); el.appendChild(b); }
    $('help').className = ''; $('help').innerHTML = '<b>' + mode.title + '</b> <i>(tap to hide)</i><ul>' + mode.help.map(h => '<li>' + h + '</li>').join('') + '</ul>';
    try { location.hash = id; } catch (e) { }
    $('hud').style.top = ($('top').offsetHeight + 2) + 'px';
    reset();
  }
  $('help').onclick = () => $('help').classList.toggle('min');
  $('restart').onclick = () => reset();
  $('snd').onclick = () => { sound = !sound; $('snd').textContent = sound ? 'Sound off' : 'Sound on'; };
  function resize() { dpr = Math.min(3, window.devicePixelRatio || 1); cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr); if (!resize.done) { zoom = clamp(Math.min(cv.width / 720, cv.height / 600), 0.8, 6); resize.done = true; } }
  addEventListener('resize', resize); resize();
  let last = 0;
  function tick(now) {
    requestAnimationFrame(tick);
    const raw = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    slow += ((K.aim ? 0.28 : mode.ts ? mode.ts() : 1) - slow) * 0.3;
    if (hitStop > 0) hitStop -= raw; else { const dt = raw * slow; sim(dt); }
    draw();
  }
  $('busy').classList.add('on');
  setTimeout(() => {
    bake(); camX = E.sx(C.x, C.y); camY = E.sy(C.x, C.y, 1);
    const h = (location.hash || '').slice(1); setMode(MODES[h] ? h : 'swipe');
    $('busy').classList.remove('on'); requestAnimationFrame(tick);
    window.__ct = { kscreen: () => [((E.sx(K.x, K.y) - camX) * zoom + cv.width / 2) / dpr, ((E.sy(K.x, K.y, 0.7) - camY) * zoom + cv.height / 2) / dpr], F: () => F, K: () => K, sim, draw, setMode, MODES, kingSwing, state: () => ({ wave, kills, over, n: F.length }) };
  }, 30);
})();
