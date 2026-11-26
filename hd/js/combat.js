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
  const BATTLE = !!window.BATTLE;      // battle.html: armies on the battlefield instead of bandit waves
  function bake() {
    if (BATTLE) {
      const v = Battlefield.view; E.init(Math.ceil((v.d1 - v.d0) * HW), Math.ceil((v.s1 - v.s0) * HH + v.z * E.ZS) + 8, Math.round(-v.d0 * HW), Math.round(-v.s0 * HH + v.z * E.ZS) + 4);
      B.reset(); Battlefield.build(); obst.length = 0; for (const o of Battlefield.obst) obst.push(o);
      const Lt = E.light, Lg = Object.assign({}, LIGHT, { amb: [0.5, 0.52, 0.66], sun: [0.84, 0.7, 0.46], lamp: 0.15 }, Battlefield.light || {}); Lt.L = E.norm(Lg.L); Lt.sun = Lg.sun; Lt.amb = Lg.amb; Lt.fill = Lg.fill; Lt.night = false; Lt.lampScale = Lg.lamp; Lt.bg = LIGHT.bg;
      E.bake(Battlefield.bounds); Troops.init();
      const f = Battlefield.field, c = Battlefield.W2((f.d0 + f.d1) / 2, (f.s0 + f.s1) / 2); C.x = c[0]; C.y = c[1]; C.R = 1e4;
      off.width = E.W; off.height = E.H; img = octx.createImageData(E.W, E.H); frame = new Uint32Array(img.data.buffer); return;
    }
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
    else if (kind === 'bow') tone('triangle', 600, 200, 0.08, 0.12); else if (kind === 'dash') noise(0.18, 0.16, 900); else if (kind === 'wave') tone('triangle', 330, 660, 0.3, 0.14); else if (kind === 'boom') { tone('sine', 95, 30, 0.45, 0.45); noise(0.35, 0.3, 90); } else if (kind === 'drum') tone('sine', 120, 55, 0.13, 0.3); else if (kind === 'drum2') tone('sine', 170, 80, 0.1, 0.22);
  }

  /* ================= fighters ================= */
  const KINDS = {
    king: { hp: 100, speed: 2.7, poise: 60, r: 0.34 },
    knight: { hp: 95, speed: 2.5, poise: 80, r: 0.34, atk: { wind: 0.34, reach: 1.35, arc: 1.5, dmg: 13, pd: 18, rec: 0.5, cd: 1.25 } },
    bandit: { hp: 52, speed: 2.05, poise: 42, r: 0.34, atk: { wind: 0.5, reach: 1.15, arc: 1.5, dmg: 11, pd: 16, rec: 0.55, cd: 1.5 } },
    rabble: { hp: 26, speed: 2.3, poise: 20, r: 0.3, atk: { wind: 0.45, reach: 1.05, arc: 1.5, dmg: 6, pd: 10, rec: 0.5, cd: 1.3 } },
    sword: { hp: 60, speed: 2.0, poise: 45, r: 0.3, atk: { wind: 0.45, reach: 1.15, arc: 1.4, dmg: 12, pd: 16, rec: 0.5, cd: 1.4 } },
    spear: { hp: 55, speed: 1.85, poise: 50, r: 0.3, atk: { wind: 0.55, reach: 1.7, arc: 0.9, dmg: 13, pd: 20, rec: 0.6, cd: 1.7 } },
    bow: { hp: 36, speed: 2.0, poise: 28, r: 0.3, atk: { wind: 0.45, reach: 1.0, arc: 1.4, dmg: 6, pd: 8, rec: 0.5, cd: 1.5 } },
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
  let uid = 1;
  function mk(kind, x, y, team, i) {
    const s = KINDS[kind];
    return { id: uid++, kind, spec: s, team, x, y, mx: 0, my: 0, kx: 0, ky: 0, face: team ? Math.atan2(C.y - y, C.x - x) : -2.3, state: 'idle', st: 0, cd: 0.6 + rnd(), r: s.r, hp: s.hp, max: s.hp, poise: s.poise, flash: 0, fade: 0, alive: true, p: look(kind, i), orb: rnd(), dir: rnd() < 0.5 ? 1 : -1, n: 0, think: 0, tgt: null, ifr: 0, blockT: 0, swingT: 9 };
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
    if (BATTLE) { K.x = Battlefield.king[0]; K.y = Battlefield.king[1]; K.face = -0.785; K.hp = K.max = 260; }
    F.push(K); K.noWeapon = false; if (mode.init) mode.init();
    if (BATTLE) { spawnArmies(); $('bal').style.display = 'none'; $('msg').classList.remove('on'); say('Deploy', 'Pick a weapon, then press FIGHT', 2600); return; }
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
    f.alive = false; f.state = 'dead'; f.st = 0; f.mx = f.my = 0; const loud = !BATTLE || f === K || by === K || (by && by.byK); if (loud) sfx('die'); dust(f.x, f.y, BATTLE ? 3 : 8);
    if (BATTLE) { if (f.team === 1 && loud) kills++; if (f === K) { over = true; slow = 1; say('The king has fallen', 'Tap to fight again'); } return; }
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
    if (spec.launch && o.alive) { if (o.kind === 'brute') stagger(o, 0.6); else { o.air = o.airT = 1.0; stagger(o, 1.2); pop(o, 'launched', 'info'); } }
    if (spec.push) { const m = o.kind === 'brute' ? 2.4 : 1; o.kx -= Math.cos(from) * spec.push / m; o.ky -= Math.sin(from) * spec.push / m; }
    const loud = !BATTLE || f === K || f.byK || o === K;
    if (loud) { pop(o, fin && (f === K || f.byK) ? 'FINISHER ' + dmg : '' + dmg, o.team === 0 ? 'hurt' : fin ? 'good' : ''); sparks(o.x, o.y, 0.9, o.team === 0 ? 0xff6a5a : 0xffe9a0, fin ? 14 : 7); sfx(o === K ? 'hurt' : 'hit'); }
    else if (rnd() < 0.3) sparks(o.x, o.y, 0.9, 0xffe9a0, 2);
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
    if (!BATTLE || f === K) fx.push({ k: 'sw', x: f.x, y: f.y, face: f.face, reach: s.reach, arc: s.arc, t: 0, life: 0.2, col: f.team ? 0xffb0a0 : 0xffffff });
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
  const JAB = { wind: 0.1, reach: 1.25, arc: 1.6, dmg: 7, pd: 8, rec: 0.25 }, BEAT = 0.6; let HM = { out: false }, HD = null, RH = null, FL = null, PR = [], HK = { out: false }, BW = { aim: null }, WH = null, PT = null, LD = { on: false };
  const MACE = { hammer: 1, lode: 1, pots: 1, leap: 1, bat: 1 }, UPPER = { wind: 0.12, reach: 1.5, arc: 1.8, dmg: 6, pd: 20, rec: 0.25, lunge: 0.3, launch: true };
  let LP = { aim: null }, BL = { a: null, fly: null }, BD = null, ST = { on: false, fly: [] };
  const PUNCH = { wind: 0.1, reach: 1.15, arc: 1.6, dmg: 8, pd: 14, rec: 0.22, lunge: 0.2 }, mass = o => o.kind === 'brute' ? 2.4 : 1;
  const holdMove = g => { if (g.el > 0.17) { g.holding = true; K.hold = [g.wx, g.wy]; K.dest = null; } };
  const tapMove = (g, spec) => { if (!g.holding && g.dist < 14) { const o = nearestEnemy(K.x, K.y, 1.6); if (o && K.state === 'idle') attack(K, Math.atan2(o.y - K.y, o.x - K.x), spec); else K.dest = [g.wx, g.wy]; } if (g.holding) K.hold = null; };
  function chainLine(x0, y0, x1, y1, z) { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 8); for (let i = 0; i <= n; i++) { const u = i / n, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u; rectS(Math.round(E.sx(x, y)), Math.round(E.sy(x, y, z)), 2, 2, x + y + z + 0.3, i & 1 ? 0xc8ced8 : 0x55555e); } }
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
      id: 'moment', name: 'Momentum', tokens: 3, extra: 1, w: true, title: 'Momentum: speed is your weapon',
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
      id: 'hammer', name: 'Hammer throw', tokens: 2, w: true, title: 'Hammer throw: throw it, call it back',
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
      id: 'horde', name: 'Horde', tokens: 99, horde: true, w: true, title: 'Horde: just keep moving',
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
      id: 'drum', name: 'War drum', tokens: 2, w: true, title: 'War drum: strike on the beat',
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
      id: 'flail', name: 'Ball & chain', tokens: 3, extra: 1, w: true, title: 'Ball & chain: swing the iron ball',
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
      id: 'shove', name: 'Shield bash', tokens: 3, extra: 1, slide: 0.05, slam: true, title: 'Knock them into things',
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
    /* ================= five more weapons ================= */
    hook: {
      id: 'hook', name: 'Chain hook', tokens: 2, w: true, slide: 0.05, slam: true, title: 'Chain hook: haul them in, or haul yourself across',
      help: ['<b>Swipe</b> to fire the hook', 'Hook a <b>man</b> and he is dragged to your feet, through anyone in the way, and takes a heavy blow on arrival', 'Hook a <b>rock or the tree line</b> (or a brute, who is too heavy to pull) and the chain hauls <b>you</b> there instead, cutting everyone on the path', '<b>Hold</b> to walk; <b>tap</b> to punch someone next to you'],
      init() { HK = { out: false }; K.noWeapon = true; },
      down() { }, move: holdMove,
      up(g) {
        if (g.el < 0.34 && g.dist > 30) { K.hold = null; if (!HK.out && K.state === 'idle' && K.sta > 6) { spend(10); HK = { out: true, ph: 'fly', x: K.x, y: K.y, vx: Math.cos(g.wdir) * 17, vy: Math.sin(g.wdir) * 17, t: 0 }; K.face = g.wdir; K.swingT = 0; sfx('swing'); } return; }
        tapMove(g, PUNCH);
      },
      update(dt) {
        const h = HK; if (!h.out) return; h.t += dt;
        if (h.ph === 'fly') {
          h.x += h.vx * dt; h.y += h.vy * dt;
          for (const o of F) if (o.team === 1 && o.alive && Math.hypot(o.x - h.x, o.y - h.y) < o.r + 0.28) { hit(o, { x: K.x, y: K.y, team: 0, byK: true }, { dmg: 5, pd: 15 }); if (!o.alive) { h.out = false; return; } h.tgt = o; sfx('block'); if (o.kind === 'brute') { h.ph = 'king'; h.ax = o.x; h.ay = o.y; } else { h.ph = 'enemy'; stagger(o, 1.0); } break; }
          if (h.ph === 'fly') { let stuck = Math.hypot(h.x - C.x, h.y - C.y) > C.R + 0.7; for (const ob of obst) if (Math.hypot(h.x - ob.x, h.y - ob.y) < ob.r + 0.12) stuck = true; if (stuck) { h.ph = 'king'; h.ax = h.x; h.ay = h.y; sparks(h.x, h.y, 0.6, 0xd8dce4, 6); sfx('block'); } else if (h.t > 0.4) h.out = false; }
          if (h.ph === 'king') { const dx = h.ax - K.x, dy = h.ay - K.y, d = Math.hypot(dx, dy); K.dest = null; K.hold = null; if (K.state === 'idle' || K.state === 'rec') { K.state = 'idle'; roll(K, Math.atan2(dy, dx), Math.max(0.3, d - 0.85), Math.max(0.12, d / 15), d / 15 + 0.12, { dmg: 14, pd: 30, rec: 0.15 }); h.ph = 'ride'; } else h.out = false; }
        } else if (h.ph === 'enemy') {
          const o = h.tgt; if (!o.alive) { h.out = false; return; } const dx = K.x - o.x, dy = K.y - o.y, d = Math.hypot(dx, dy) || 1; h.x = o.x; h.y = o.y;
          if (d < 1.05 || h.t > 1.6) { h.out = false; o.kx = o.ky = 0; if (d < 1.5) { K.face = Math.atan2(-dy, -dx); K.swingT = 0; hit(o, K, { dmg: 16, pd: 40, push: 6 }); } }
          else { o.kx = dx / d * 11; o.ky = dy / d * 11; if (o.state !== 'stag') stagger(o, 0.6); }
        } else if (K.state !== 'roll') h.out = false;
      },
      drawTop() { const h = HK; if (!h.out) return; const tx = h.ph === 'ride' ? h.ax : h.x, ty = h.ph === 'ride' ? h.ay : h.y; chainLine(K.x, K.y, tx, ty, 0.7); const cx = Math.round(E.sx(tx, ty)), cy = Math.round(E.sy(tx, ty, 0.7)); rectS(cx - 2, cy - 2, 5, 5, tx + ty + 1.2, 0x8a8e98); rectS(cx - 1, cy - 1, 2, 2, tx + ty + 1.2, 0xe4e8f0); },
    },
    bow: {
      id: 'bow', name: 'Longbow', tokens: 2, w: true, title: 'Longbow: five arrows, go and get them back',
      help: ['<b>Touch the king and pull back</b> to draw; time slows. Let go to loose', 'A fuller draw flies faster and <b>pierces</b> up to four men; the last one it sticks in at full draw is <b>pinned</b>', 'Arrows <b>glance off rocks</b> and carry on', 'You have <b>five arrows</b> (yellow bar). They stay where they land: <b>walk over them</b> to take them back', '<b>Hold</b> to walk; <b>tap</b> to club someone next to you with the bow'],
      init() { BW = { n: 5, fly: [], ground: [], aim: null }; K.noWeapon = true; },
      ts() { return BW.aim ? 0.4 : 1; },
      down(g) { if (g.onKing && K.state === 'idle') { BW.aim = { pw: 0, dir: K.face }; K.dest = null; K.hold = null; } },
      move(g) { if (g.onKing) { if (BW.aim) { BW.aim.pw = clamp((g.dist - 18) / 150, 0, 1); BW.aim.dir = g.wdir + Math.PI; K.face = BW.aim.dir; } return; } holdMove(g); },
      up(g) {
        if (g.onKing) { const a = BW.aim; BW.aim = null; if (a && a.pw > 0.1) { if (BW.n > 0) { BW.n--; const v = 9 + 14 * a.pw; BW.fly.push({ x: K.x, y: K.y, vx: Math.cos(a.dir) * v, vy: Math.sin(a.dir) * v, pw: a.pw, pierce: 1 + Math.floor(a.pw * 3.01), t: 0, seen: new Set(), bounced: false }); sfx('bow'); } else pop(K, 'no arrows!', 'hurt'); } return; }
        tapMove(g, PUNCH);
      },
      update(dt) {
        if (K.state !== 'idle') BW.aim = null;
        for (const a of BW.fly) {
          a.t += dt; a.x += a.vx * dt; a.y += a.vy * dt; const sp = Math.hypot(a.vx, a.vy); let stop = a.t > 1.1;
          for (const o of F) if (o.team === 1 && o.alive && !a.seen.has(o) && Math.hypot(o.x - a.x, o.y - a.y) < o.r + 0.2) { a.seen.add(o); const dealt = hit(o, { x: a.x - a.vx, y: a.y - a.vy, team: 0, byK: true }, { dmg: 9 + 19 * a.pw, pd: 10 + 25 * a.pw }); o.kx += a.vx * 0.2 / mass(o); o.ky += a.vy * 0.2 / mass(o); if (--a.pierce <= 0) { stop = true; if (a.pw > 0.7 && o.alive) { stagger(o, 1.6); pop(o, 'PINNED', 'good'); } } else if (dealt) pop(o, 'pierced', 'info'); break; }
          for (const ob of obst) { const dx = a.x - ob.x, dy = a.y - ob.y, d = Math.hypot(dx, dy) || 1; if (d < ob.r + 0.1) { const dn = (a.vx * dx + a.vy * dy) / d; if (!a.bounced && dn / sp > -0.6) { a.vx -= 2 * dn * dx / d; a.vy -= 2 * dn * dy / d; a.bounced = true; a.seen = new Set(); a.x = ob.x + dx / d * (ob.r + 0.12); a.y = ob.y + dy / d * (ob.r + 0.12); sfx('block'); sparks(a.x, a.y, 0.8, 0xd8dce4, 4); } else stop = true; } }
          if (Math.hypot(a.x - C.x, a.y - C.y) > C.R) stop = true;
          if (stop) { a.dead = true; const rd = Math.hypot(a.x - C.x, a.y - C.y), k = rd > C.R - 0.3 ? (C.R - 0.3) / rd : 1; BW.ground.push({ x: C.x + (a.x - C.x) * k, y: C.y + (a.y - C.y) * k, a: Math.atan2(a.vy, a.vx) }); }
        }
        BW.fly = BW.fly.filter(a => !a.dead);
        for (const q of BW.ground) if (Math.hypot(q.x - K.x, q.y - K.y) < 0.65) { q.got = true; BW.n++; sfx('block'); pop(K, '+1 arrow', 'info'); }
        BW.ground = BW.ground.filter(q => !q.got);
      },
      meter() { return BW.n / 5; },
      draw() {
        for (const q of BW.ground) { const x1 = q.x - Math.cos(q.a) * 0.32, y1 = q.y - Math.sin(q.a) * 0.32; sline(Math.round(E.sx(q.x, q.y)), Math.round(E.sy(q.x, q.y, 0)), Math.round(E.sx(x1, y1)), Math.round(E.sy(x1, y1, 0.4)), q.x + q.y + 0.3, 0xd8c8a0, 0, 1); sector(q.x, q.y, 0, 0.3 + 0.05 * Math.sin(time * 5), 7, 0xffe27a, 0.45, 0.07); }
        const a = BW.aim; if (a && a.pw > 0.02) { const L = 3 + 7 * a.pw; gline(K.x, K.y, K.x + Math.cos(a.dir) * L, K.y + Math.sin(a.dir) * L, a.pw > 0.7 ? 0xffe27a : 0xffffff, true); }
      },
      drawTop() { for (const a of BW.fly) { const sp = Math.hypot(a.vx, a.vy), x1 = a.x - a.vx / sp * 0.5, y1 = a.y - a.vy / sp * 0.5; sline(Math.round(E.sx(x1, y1)), Math.round(E.sy(x1, y1, 0.9)), Math.round(E.sx(a.x, a.y)), Math.round(E.sy(a.x, a.y, 0.9)), a.x + a.y + 1.2, 0xe8dcc0, 0xa89a78, 2); } },
    },
    whirl: {
      id: 'whirl', name: 'Greatsword', tokens: 3, extra: 1, w: true, slide: 0.05, slam: true, title: 'Greatsword: spin up like a top',
      help: ['<b>Flick</b> to wind up a spin; every flick adds more (yellow bar) and shoves him that way', 'While he spins the blade <b>cuts everyone around him</b>, faster and harder the more spin he has', 'A spinning king <b>slides</b> and <b>bounces off rocks and the tree line</b> with a shockwave; <b>hold</b> to steer the slide', 'Spin bleeds away. Come down from a big spin and he is <b>dizzy</b> for a moment', 'Not spinning: <b>hold</b> to walk, <b>tap</b> for a plain cut'],
      init() { WH = { spin: 0, ang: 0, v: [0, 0], peak: 0, hitAt: new Map(), fxT: 0 }; },
      down(g) { K.hold = [g.wx, g.wy]; }, move(g) { K.hold = [g.wx, g.wy]; },
      up(g) {
        K.hold = null;
        if (g.el < 0.3 && g.dist > 30 && K.state === 'idle' && K.sta > 8) { spend(13); WH.spin = clamp(WH.spin + (WH.spin < 0 ? -5 : 5), -16, 16); WH.v[0] += Math.cos(g.wdir) * 3.5; WH.v[1] += Math.sin(g.wdir) * 3.5; sfx('swing'); }
        else if (g.el < 0.22 && g.dist < 14 && Math.abs(WH.spin) < 3 && K.state === 'idle') { const o = nearestEnemy(K.x, K.y, 1.7); if (o) attack(K, Math.atan2(o.y - K.y, o.x - K.x), CUT); }
      },
      shock() { const sp = Math.abs(WH.spin); sparks(K.x, K.y, 0.6, 0xffe9a0, 10, 3.5); sfx('block'); shake = Math.max(shake, 4); fx.push({ k: 'sw', x: K.x, y: K.y, face: 0, reach: 1.7, arc: 6.2, t: 0, life: 0.2, col: 0xffe9a0 }); for (const o of F) if (o.team === 1 && o.alive && Math.hypot(o.x - K.x, o.y - K.y) < 1.7 + o.r) hit(o, { x: K.x, y: K.y, team: 0, byK: true }, { dmg: 4 + sp * 1.2, pd: 30, push: 5 }); },
      kmove(dt) {
        const sp = Math.abs(WH.spin), v = WH.v;
        if (sp < 3 || K.state !== 'idle') { const k = Math.pow(0.01, dt); v[0] *= k; v[1] *= k; kingMove(); K.mx += v[0]; K.my += v[1]; return; }
        if (K.hold) { const dx = K.hold[0] - K.x, dy = K.hold[1] - K.y, d = Math.hypot(dx, dy) || 1; if (d > 0.3) { v[0] += dx / d * 7 * dt; v[1] += dy / d * 7 * dt; } }
        const k = Math.pow(0.55, dt); v[0] *= k; v[1] *= k; const m = Math.hypot(v[0], v[1]); if (m > 5.5) { v[0] *= 5.5 / m; v[1] *= 5.5 / m; }
        for (const ob of obst) { const dx = K.x - ob.x, dy = K.y - ob.y, d = Math.hypot(dx, dy) || 1; if (d < ob.r + K.r + 0.06) { const dn = (v[0] * dx + v[1] * dy) / d; if (dn < -0.8) { v[0] -= 1.9 * dn * dx / d; v[1] -= 1.9 * dn * dy / d; this.shock(); } } }
        const rx = K.x - C.x, ry = K.y - C.y, rd = Math.hypot(rx, ry); if (rd > C.R - 0.05) { const dn = (v[0] * rx + v[1] * ry) / rd; if (dn > 0.8) { v[0] -= 1.9 * dn * rx / rd; v[1] -= 1.9 * dn * ry / rd; this.shock(); } else if (dn > 0) { v[0] -= dn * rx / rd; v[1] -= dn * ry / rd; } }
        K.mx = v[0]; K.my = v[1];
      },
      update(dt) {
        const w = WH, sp = Math.abs(w.spin); w.spin *= Math.pow(0.62, dt); w.ang += w.spin * dt; w.peak = Math.max(w.peak, sp);
        if (sp >= 3 && K.state === 'idle') {
          K.noWeapon = true; K.face = w.ang; const cdn = Math.max(0.24, 2.2 / sp);
          for (const o of F) if (o.team === 1 && o.alive && Math.hypot(o.x - K.x, o.y - K.y) < 1.55 + o.r && (w.hitAt.get(o) || -9) < time - cdn) { w.hitAt.set(o, time); hit(o, { x: K.x, y: K.y, team: 0 }, { dmg: 2 + sp * 0.7, pd: sp * 2.2, push: 2 + sp * 0.25 }); }
          w.fxT -= dt; if (w.fxT <= 0) { w.fxT = 0.1; fx.push({ k: 'sw', x: K.x, y: K.y, face: w.ang - (w.spin > 0 ? 0.9 : -0.9), reach: 1.55, arc: 2.2, t: 0.05, life: 0.14, col: 0xffffff }); }
        } else { K.noWeapon = false; if (w.peak > 10 && sp < 3 && K.state === 'idle') { stagger(K, 0.9); pop(K, 'dizzy', 'hurt'); } if (sp < 3) w.peak = 0; }
      },
      meter() { return Math.abs(WH.spin) / 16; },
      drawTop() { if (Math.abs(WH.spin) < 3 || K.state !== 'idle') return; const tx = K.x + Math.cos(WH.ang) * 1.5, ty = K.y + Math.sin(WH.ang) * 1.5, d = Math.max(K.x + K.y, tx + ty) + 1.3; sline(Math.round(E.sx(K.x, K.y)), Math.round(E.sy(K.x, K.y, 0.8)), Math.round(E.sx(tx, ty)), Math.round(E.sy(tx, ty, 0.8)), d, 0xf4f6fa, 0xa8aebc, 3); },
    },
    pots: {
      id: 'pots', name: 'Fire pots', tokens: 3, extra: 1, w: true, slide: 0.05, slam: true, title: 'Fire pots: lob, wait, boom',
      help: ['<b>Swipe</b> to lob a pot; a longer swipe throws further', 'It lands, the fuse burns for a moment (red ring), then it <b>blows men outward</b>: into rocks, trees and each other', 'A blast <b>sets off other pots</b> nearby, and one landing by the campfire goes off at once', 'Stand too close and it throws <b>you</b> as well', 'Three pots out at a time. <b>Hold</b> to walk, <b>tap</b> to club someone next to you'],
      init() { PT = { list: [], scorch: [] }; },
      down() { }, move: holdMove,
      up(g) {
        if (g.el < 0.36 && g.dist > 30) { K.hold = null; if (K.state === 'idle' && K.sta > 10 && PT.list.length < 3) { spend(16); const L = clamp(Math.hypot(g.wx - g.wx0, g.wy - g.wy0) * 1.5, 1.6, 6.5), T = 0.55; PT.list.push({ x: K.x, y: K.y, z: 0.9, vx: Math.cos(g.wdir) * L / T, vy: Math.sin(g.wdir) * L / T, vz: 3.3, land: false, fuse: 0.9 }); K.face = g.wdir; K.swingT = 0; sfx('swing'); } return; }
        tapMove(g, PUNCH);
      },
      boom(p) {
        p.dead = true; sfx('boom'); shake = Math.max(shake, 9); sparks(p.x, p.y, 0.4, 0xff9a2e, 26, 5); sparks(p.x, p.y, 0.5, 0xffe27a, 14, 3); dust(p.x, p.y, 12); PT.scorch.push({ x: p.x, y: p.y, t: 8 });
        fx.push({ k: 'sw', x: p.x, y: p.y, face: 0, reach: 2.2, arc: 6.2, t: 0, life: 0.25, col: 0xffb04a });
        for (const o of F) { if (!o.alive) continue; const dx = o.x - p.x, dy = o.y - p.y, d = Math.hypot(dx, dy) || 0.01;
          if (o.team === 1 && d < 2.4) { hit(o, { x: p.x, y: p.y, team: 0, byK: true }, { dmg: 26 * (1 - d / 2.8), pd: 40 }); const im = 11 * (1 - d / 2.6) / mass(o); o.kx += dx / d * im; o.ky += dy / d * im; }
          else if (o === K && d < 1.7) { K.hp -= 6; K.flash = 1; K.kx += dx / d * 9; K.ky += dy / d * 9; pop(K, 'singed 6', 'hurt'); if (K.hp <= 0) die(K); } }
        for (const q of PT.list) if (q !== p && !q.dead && Math.hypot(q.x - p.x, q.y - p.y) < 2.2) q.fuse = Math.min(q.fuse, q.land ? 0.12 : 0.6);
      },
      update(dt) {
        for (const p of PT.list) {
          if (!p.land) { p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= 18 * dt; if (p.z <= 0) { p.z = 0; p.land = true; p.vx = p.vy = 0; dust(p.x, p.y, 4); const rd = Math.hypot(p.x - C.x, p.y - C.y); if (rd > C.R + 1) { p.x = C.x + (p.x - C.x) / rd * (C.R + 1); p.y = C.y + (p.y - C.y) / rd * (C.R + 1); } } }
          else { p.fuse -= dt; for (const ob of obst) if (ob.fire && Math.hypot(ob.x - p.x, ob.y - p.y) < 1.1) p.fuse = Math.min(p.fuse, 0.05); if (p.fuse <= 0 && !p.dead) this.boom(p); }
        }
        PT.list = PT.list.filter(p => !p.dead); for (const q of PT.scorch) q.t -= dt; PT.scorch = PT.scorch.filter(q => q.t > 0);
      },
      draw() { for (const q of PT.scorch) sector(q.x, q.y, 0, 1.15, 7, 0x1a1410, 0.4 * Math.min(1, q.t / 2)); for (const p of PT.list) if (p.land) sector(p.x, p.y, 0, 2.3, 7, 0xff3a2a, (Math.floor(time * 12) & 1) ? 0.55 : 0.25, 0.08); },
      sprites() { return PT.list.map(p => ({ k: p.x + p.y, draw() { const cx = Math.round(E.sx(p.x, p.y)), cy = Math.round(E.sy(p.x, p.y, p.z + 0.12)), d = p.x + p.y + p.z + 0.4; for (let dx = -3; dx <= 3; dx++) E.dark(cx + dx, Math.round(E.sy(p.x, p.y, 0)), p.x + p.y + 0.02, 0.6); for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { if (dx * dx + dy * dy > 11) continue; E.px(cx + dx, cy + dy, d, dx + dy < -2 ? 0xc98a5a : dx + dy > 2 ? 0x6a3e28 : 0x9a5a3a); } rectS(cx - 1, cy - 5, 2, 2, d, 0x3a3038); if (Math.floor(time * 14) & 1) rectS(cx - 1, cy - 7, 2, 2, d, 0xffe27a); else E.px(cx, cy - 6, d, 0xff9a2e); } })); },
    },
    lode: {
      id: 'lode', name: 'Lodestone', tokens: 3, extra: 1, w: true, slide: 0.05, slam: true, title: 'Lodestone: draw them in, hurl them out',
      help: ['<b>Touch and hold the king</b>: the lodestone <b>drags every armoured man toward him</b> and bends arrows aside', 'The longer you hold, the bigger the charge (gold ring). It drains stamina', '<b>Let go</b> and it <b>hurls everyone inside the ring outward</b>, into rocks, trees, the fire and each other', 'Pull too long and they arrive swinging', '<b>Hold the ground</b> to walk, <b>tap</b> for a plain blow'],
      init() { LD = { on: false, ch: 0 }; },
      down(g) { if (g.onKing && K.state === 'idle' && K.sta > 8) { LD.on = true; LD.ch = 0; K.dest = null; K.hold = null; } },
      move(g) { if (!g.onKing) holdMove(g); },
      blast() { const l = LD; l.on = false; const R = 2.6 + l.ch; sfx('dash'); shake = Math.max(shake, 4 + 3 * l.ch); fx.push({ k: 'sw', x: K.x, y: K.y, face: 0, reach: R, arc: 6.2, t: 0, life: 0.25, col: 0x8ac8f0 }); for (const o of F) if (o.team === 1 && o.alive && Math.hypot(o.x - K.x, o.y - K.y) < R + o.r) hit(o, { x: K.x, y: K.y, team: 0, byK: true }, { dmg: 4 + 6 * l.ch, pd: 25, push: 9 + 8 * l.ch }); },
      up(g) { if (g.onKing) { if (LD.on) this.blast(); return; } tapMove(g, CUT); },
      kmove() { if (LD.on) K.mx = K.my = 0; else kingMove(); },
      update(dt) {
        const l = LD; if (!l.on) return; if (K.state !== 'idle') { l.on = false; return; }
        l.ch = Math.min(1.5, l.ch + dt); K.sta -= 14 * dt; K.staD = 0.5;
        for (const o of F) if (o.team === 1 && o.alive) { const dx = K.x - o.x, dy = K.y - o.y, d = Math.hypot(dx, dy) || 1; if (d < 6.5 && d > 0.9) { o.kx += dx / d * 15 * dt / mass(o); o.ky += dy / d * 15 * dt / mass(o); } }
        for (const s of shots) { const dx = s.x - K.x, dy = s.y - K.y, d = Math.hypot(dx, dy) || 1; if (d < 2.8) { s.vx += dx / d * 45 * dt; s.vy += dy / d * 45 * dt; } }
        if (K.sta <= 0) { K.sta = 0; this.blast(); }
      },
      draw() { if (!LD.on) return; for (const ph of [0, 0.5]) { const p = (time * 1.6 + ph) % 1; sector(K.x, K.y, 0, 0.8 + (1 - p) * 4.5, 7, 0x8ac8f0, 0.15 + 0.3 * p, 0.1); } sector(K.x, K.y, 0, 2.6 + LD.ch, 7, 0xffe27a, 0.4, 0.07); },
    },
    /* ================= five newer weapons (marked NEW in the bar) ================= */
    leap: {
      id: 'leap', name: 'Leap maul', tokens: 3, extra: 1, w: true, isNew: true, slide: 0.05, slam: true, title: 'Leap maul: jump in, land hard',
      help: ['<b>Touch the king and drag</b> to where he should land; time slows and a ring shows the blast', '<b>Let go</b> and he leaps. Nothing can touch him in the air', 'He lands with a <b>shockwave that throws men outward</b> into rocks, trees and each other; anyone directly under him is crushed', 'He is open for a moment after landing', '<b>Hold the ground</b> to walk, <b>tap</b> for a plain blow'],
      init() { LP = { aim: null, air: false }; },
      ts() { return LP.aim ? 0.4 : 1; },
      down(g) { if (g.onKing && K.state === 'idle' && K.sta > 10) { LP.aim = { x: K.x, y: K.y, ok: false }; K.dest = null; K.hold = null; } },
      move(g) {
        if (!g.onKing) { holdMove(g); return; } if (!LP.aim) return;
        const dx = g.wx - K.x, dy = g.wy - K.y, d = Math.hypot(dx, dy) || 1, L = Math.min(d, 6.5); let tx = K.x + dx / d * L, ty = K.y + dy / d * L; const rd = Math.hypot(tx - C.x, ty - C.y); if (rd > C.R - 0.2) { tx = C.x + (tx - C.x) / rd * (C.R - 0.2); ty = C.y + (ty - C.y) / rd * (C.R - 0.2); }
        LP.aim = { x: tx, y: ty, ok: L > 0.9 };
      },
      up(g) {
        if (!g.onKing) { tapMove(g, CUT); return; }
        const a = LP.aim; LP.aim = null; if (!a || !a.ok || K.state !== 'idle') return;
        spend(18); const dx = a.x - K.x, dy = a.y - K.y, d = Math.hypot(dx, dy); K.hop = 1.2 + d * 0.28; roll(K, Math.atan2(dy, dx), d, 0.38 + d * 0.045, 2, null); LP.air = true;
      },
      update() {
        if (K.state !== 'idle' && K.state !== 'roll') LP.aim = null;
        if (!LP.air || K.state === 'roll') return;
        LP.air = false; K.hop = 0; K.p.z = 0; K.ifr = 0; sfx('boom'); shake = Math.max(shake, 7); dust(K.x, K.y, 16); sparks(K.x, K.y, 0.2, 0xd8c8a0, 14, 4);
        fx.push({ k: 'sw', x: K.x, y: K.y, face: 0, reach: 2.2, arc: 6.2, t: 0, life: 0.25, col: 0xffe9a0 });
        for (const o of F) if (o.team === 1 && o.alive) { const d = Math.hypot(o.x - K.x, o.y - K.y); if (d < 2.2 + o.r) hit(o, { x: K.x, y: K.y, team: 0, byK: true }, { dmg: d < 0.85 ? 30 : 16 * (1 - d / 3.2), pd: 45, push: 10 * (1 - d / 3.2) }); }
        K.state = 'rec'; K.st = 0.32; K.atk = null; K.swingT = 0;
      },
      draw() { const a = LP.aim; if (!a) return; gline(K.x, K.y, a.x, a.y, a.ok ? 0xffe27a : 0x8a8478, true); sector(a.x, a.y, 0, 2.2, 7, a.ok ? 0xffe27a : 0x8a8478, 0.5, 0.09); sector(a.x, a.y, 0, 0.85, 7, 0xff8a4a, 0.4); },
    },
    bat: {
      id: 'bat', name: 'Launcher', tokens: 3, extra: 1, w: true, isNew: true, slide: 0.05, slam: true, title: 'Launcher: knock them up, bat them away',
      help: ['<b>Swipe at a man</b>: an uppercut that sends him <b>into the air</b>', 'While he is up there, <b>swipe again in any direction</b> to bat him that way like a ball', 'A batted man is a missile: he hurts whatever he hits (rocks, trees, the fire, other men) and they are knocked on in turn', 'Brutes are too heavy to launch; knock a lighter man into them instead', '<b>Hold</b> to walk; <b>tap</b> for a plain blow'],
      init() { }, down() { }, move: holdMove,
      up(g) {
        if (!(g.el < 0.34 && g.dist > 30)) { tapMove(g, CUT); return; }
        K.hold = null; if (K.state !== 'idle' || K.sta < 6) return;
        let air = null, bd = 2.4; for (const o of F) if (o.team === 1 && o.alive && o.air > 0) { const d = Math.hypot(o.x - K.x, o.y - K.y); if (d < bd) { bd = d; air = o; } }
        if (air) { spend(14); K.face = g.wdir; K.swingT = 0; sfx('hit'); fx.push({ k: 'sw', x: K.x, y: K.y, face: g.wdir, reach: 1.6, arc: 2.4, t: 0, life: 0.2, col: 0xffe9a0 }); air.air = air.airT = 0.3; air.batted = true; air.kx = Math.cos(g.wdir) * 15; air.ky = Math.sin(g.wdir) * 15; air.slamT = 0; hit(air, K, { dmg: 10, pd: 30 }); if (air.alive) pop(air, 'HOME RUN', 'good'); }
        else { spend(12); let dir = g.wdir; const o = nearestEnemy(K.x, K.y, 2.4, dir, 0.6); if (o) dir = Math.atan2(o.y - K.y, o.x - K.x); attack(K, dir, UPPER); }
      },
      update(dt) { for (const o of F) if (o.air > 0) { o.air -= dt; if (!o.alive) { o.air = 0; continue; } o.p.z = Math.max(0, 2.2 * Math.sin(Math.PI * (1 - o.air / o.airT)) * (o.batted ? 0.4 : 1)); if (o.state !== 'stag') stagger(o, 0.3); if (o.air <= 0) { o.p.z = 0; o.batted = false; dust(o.x, o.y, 5); } } },
    },
  };
  /* ---- time-stop tactics: the swipe scheme, but the world only moves when the king does ---- */
  MODES.still = Object.assign({}, MODES.swipe, { id: 'still', name: 'Time holds', tokens: 3, extra: 1, title: 'Time moves only when you do',
    help: ['The world <b>freezes whenever the king is idle</b>, so you can read the fight and choose', 'Controls are the Swipe scheme: <b>hold</b> to walk, <b>swipe</b> to cut, long swipe to lunge, <b>hold the king</b> to block, swipe from him to roll', 'Time runs while he walks, swings, blocks or rolls; hold your finger still on the ground to let time pass', 'More bandits come at once, since you have time to think'],
    ts() { return (K.hold || K.dest || K.state !== 'idle' || K.buf) ? 1 : 0.04; } });
  // bodies sliding fast take damage from whatever they run into: rocks, the fire, the tree line, each other
  function slamBodies(dt) {
    const slam = (o, s, label, extra) => { o.slamT = 0.3; if (hit(o, { x: o.x + o.kx, y: o.y + o.ky, team: 0, byK: true }, { dmg: s * 2.6 + (extra || 0), pd: s * 8 }) && label) pop(o, label, 'good'); dust(o.x, o.y, 5); };
    for (const o of F) {
      if (o.team !== 1 || !o.alive) continue; o.slamT = (o.slamT || 0) - dt; const s = Math.hypot(o.kx, o.ky); if (s < 3.2 || o.slamT > 0) continue;
      let done = false;
      for (const ob of obst) { const dx = o.x - ob.x, dy = o.y - ob.y, d = Math.hypot(dx, dy) || 1; if (d < o.r + ob.r + 0.1 && o.kx * dx + o.ky * dy < 0) { slam(o, s, ob.fire ? 'BURNED' : 'SLAM', ob.fire ? 14 : 0); const dot = (o.kx * dx + o.ky * dy) / d; o.kx = (o.kx - 1.6 * dot * dx / d) * 0.45; o.ky = (o.ky - 1.6 * dot * dy / d) * 0.45; done = true; break; } }
      if (done) continue;
      const rx = o.x - C.x, ry = o.y - C.y, rd = Math.hypot(rx, ry); if (rd > C.R + 1.2 && o.kx * rx + o.ky * ry > 0) { slam(o, s, 'INTO THE TREES'); o.kx *= -0.3; o.ky *= -0.3; continue; }
      for (const b of F) if (b !== o && b.team === 1 && b.alive && Math.hypot(b.x - o.x, b.y - o.y) < o.r + b.r + 0.12 && o.kx * (b.x - o.x) + o.ky * (b.y - o.y) > 0) { const m = b.kind === 'brute' ? 2.4 : 1; slam(b, s * 0.7, 'KNOCK-ON'); slam(o, s * 0.4); b.kx += o.kx * 0.65 / m; b.ky += o.ky * 0.65 / m; b.slamT = 0.25; o.kx *= 0.35; o.ky *= 0.35; break; }
    }
  }
  function enemyAt(lx, ly) { let b = null, bd = 30; for (const o of F) if (o.team === 1 && o.alive) { const d = Math.hypot(o.p.scrX - lx, o.p.scrY - ly); if (d < bd) { bd = d; b = o; } } return b; }

  /* ================= battle: armies, regiments, volleys ================= */
  let REG = [], vol = [], phase = 'deploy', armyN = 200, counts = [0, 0], cntT = 0, GRID = new Map(), kSwarm = 0;
  const GC = 1.5, gkey = (x, y) => ((x / GC) | 0) * 4096 + ((y / GC) | 0);
  function addReg(team, kind, n, dC, sC, files) {
    const fw = team ? [-0.7071, 0.7071] : [0.7071, -0.7071], c = Battlefield.W2(dC, sC);
    const R = { team, kind, units: [], ax: c[0], ay: c[1], fw, sd: [-fw[1], fw[0]], tgt: null, t: rnd() * 0.5, n, cx: c[0], cy: c[1], inRange: false };
    for (let i = 0; i < n; i++) { const ox = -((i / files) | 0) * 0.78, oy = (i % files - (files - 1) / 2) * 0.78, u = mk(kind, c[0] + fw[0] * ox + R.sd[0] * oy, c[1] + fw[1] * ox + R.sd[1] * oy, team, i); u.reg = R; u.ox = ox; u.oy = oy; u.face = Math.atan2(fw[1], fw[0]); u.free = false; u.noT = 0; u.melee = false; u.think = rnd() * 0.4; u.cd = 0.5 + rnd() * 2; R.units.push(u); F.push(u); }
    REG.push(R);
  }
  function spawnArmies() {
    REG = []; vol = []; phase = 'deploy'; uid = 2; const f = Battlefield.field, mid = (f.s0 + f.s1) / 2, N = armyN;
    for (const team of [0, 1]) {
      const sg = team ? 1 : -1, Nt = team ? Math.round(N * 1.1) : N, nb = Math.round(Nt * 0.3 / 2), nm = Math.round((Nt - nb * 2) / 4), order = team && rnd() < 0.5 ? ['spear', 'sword', 'sword', 'spear'] : ['sword', 'spear', 'spear', 'sword'], deep = team && rnd() < 0.4;
      order.forEach((k, i) => addReg(team, k, nm, sg * (13 + (deep && (i === 1 || i === 2) ? 5 : 0)), mid + (i - 1.5) * 5.9, 5));
      const bowsFwd = team && rnd() < 0.3; for (const w of [-1, 1]) addReg(team, 'bow', nb, sg * (bowsFwd ? 10 : 13 + Math.ceil(nm / 5) * 1.15 + 2.5), mid + w * (bowsFwd ? 10.5 : 5.5), 6);
    }
    updateCounts();
  }
  function updateCounts() { counts = [0, 0]; for (const f of F) if (f.alive && f !== K) counts[f.team]++; $('wave').textContent = 'England ' + counts[0] + '   ·   France ' + counts[1] + '   ·   felled by the king ' + kills; const b = $('army'); if (b) b.firstChild.style.width = (counts[0] / Math.max(1, counts[0] + counts[1]) * 100) + '%'; }
  function clampField(f) { const b = Battlefield.field, d = clamp(f.x - f.y, b.d0, b.d1), s = clamp(f.x + f.y, b.s0, b.s1); f.x = (s + d) / 2; f.y = (s - d) / 2; }
  function nearestFoe(f, R) {
    let best = null, bd = R * R; const cx = (f.x / GC) | 0, cy = (f.y / GC) | 0, n = Math.ceil(R / GC);
    for (let gx = cx - n; gx <= cx + n; gx++) for (let gy = cy - n; gy <= cy + n; gy++) { const l = GRID.get(gx * 4096 + gy); if (!l) continue; for (const o of l) { if (o.team === f.team) continue; if (o === K && kSwarm >= 7 && f.tgt !== K) continue; const dx = o.x - f.x, dy = o.y - f.y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = o; } } }
    return best;
  }
  function friendNear(o, R) { const cx = (o.x / GC) | 0, cy = (o.y / GC) | 0; for (let gx = cx - 1; gx <= cx + 1; gx++) for (let gy = cy - 1; gy <= cy + 1; gy++) { const l = GRID.get(gx * 4096 + gy); if (l) for (const q of l) if (q.team !== o.team && Math.hypot(q.x - o.x, q.y - o.y) < R) return true; } return false; }
  function battleThink(dt) {
    GRID.clear(); kSwarm = 0;
    for (const f of F) { if (!f.alive) continue; const k = gkey(f.x, f.y); let l = GRID.get(k); if (!l) GRID.set(k, l = []); l.push(f); if (f.tgt === K && f.team === 1) kSwarm++; }
    for (const R of REG) { let n = 0, sx = 0, sy = 0, fr = 0; for (const u of R.units) if (u.alive) { n++; sx += u.x; sy += u.y; if (u.free) fr++; } R.n = n; if (n) { R.cx = sx / n; R.cy = sy / n; } R.freeFrac = n ? fr / n : 1; }
    cntT -= dt; if (cntT <= 0) { cntT = 0.3; updateCounts(); if (phase === 'fight' && !over) { if (!counts[1]) { over = true; say('England has the field', 'Tap to fight again'); sfx('wave'); } else if (!counts[0]) { over = true; say('France has the field', 'Tap to fight again'); } } }
    if (phase !== 'fight') return;
    for (const R of REG) {
      if (!R.n) continue; R.t -= dt;
      if (R.t <= 0 || !R.tgt || !R.tgt.n) { R.t = 0.6; let b = null, bd = 1e9; for (const Q of REG) if (Q.team !== R.team && Q.n) { const d = Math.hypot(Q.cx - R.cx, Q.cy - R.cy) + (Q.kind === 'bow' && R.kind !== 'bow' ? 4 : 0); if (d < bd) { bd = d; b = Q; } } R.tgt = b; }
      if (!R.tgt) continue;
      const dx = R.tgt.cx - R.ax, dy = R.tgt.cy - R.ay, d = Math.hypot(dx, dy) || 1, stopD = R.kind === 'bow' ? 13 : 1.2; R.inRange = d < 15.5;
      if (R.freeFrac > 0.5) { R.ax += (R.cx - R.ax) * dt; R.ay += (R.cy - R.ay) * dt; }
      else if (d > stopD) { R.ax += dx / d * 1.45 * dt; R.ay += dy / d * 1.45 * dt; const a = Math.atan2(dy, dx), ca = Math.atan2(R.fw[1], R.fw[0]); let df = a - ca; while (df > Math.PI) df -= TAU; while (df < -Math.PI) df += TAU; const na = ca + clamp(df, -0.5 * dt, 0.5 * dt); R.fw = [Math.cos(na), Math.sin(na)]; R.sd = [-R.fw[1], R.fw[0]]; }
    }
  }
  function aiTroop(f, dt) {
    f.mx = f.my = 0; const R = f.reg, A = f.spec.atk;
    if (f.air > 0 && mode.id !== 'bat') { f.air = 0; f.p.z = 0; }
    if (f.state === 'aim') { if (f.st <= 0) { const T = f.aimAt, dx = T[0] - f.x, dy = T[1] - f.y, d = Math.hypot(dx, dy); vol.push({ sx: f.x, sy: f.y, tx: T[0], ty: T[1], t: 0, T: Math.max(0.5, d / 11), h: d * 0.2, team: f.team }); f.state = 'rec'; f.st = 0.4; f.atk = null; f.swingT = 9; f.cd = (f.team ? 4.6 : 3.4) * (0.8 + rnd() * 0.4); } return; }
    if (f.state !== 'idle' || phase !== 'fight') return;
    f.think -= dt;
    if (f.think <= 0 || (f.tgt && !f.tgt.alive)) { f.think = 0.3 + rnd() * 0.25; const t = nearestFoe(f, f.free ? 8 : f.kind === 'bow' ? 2.6 : 4.5); f.tgt = t; if (t) f.free = true; else if (f.kind === 'bow' && !f.melee) f.free = false; }
    const t = f.tgt;
    if (t && t.alive) {
      const dx = t.x - f.x, dy = t.y - f.y, d = Math.hypot(dx, dy) || 1, sp = f.spec.speed; f.face = Math.atan2(dy, dx);
      if (d > A.reach * 0.85 + t.r) { f.mx = dx / d * sp; f.my = dy / d * sp; } else if (f.cd <= 0) { attack(f, f.face, A); f.cd = A.cd * (0.8 + rnd() * 0.4); }
      return;
    }
    if (f.kind === 'bow' && !f.free && R.tgt && R.inRange) {
      f.face = Math.atan2(R.tgt.cy - f.y, R.tgt.cx - f.x);
      if (f.cd <= 0) { const us = R.tgt.units; let o = null; for (let k = 0; k < 6 && !o; k++) { const c = us[(rnd() * us.length) | 0]; if (c.alive && Math.hypot(c.x - f.x, c.y - f.y) < 17 && (!c.free || !friendNear(c, 1.8))) o = c; } if (!o && ++f.noT > 6) { f.melee = f.free = true; } if (o) { f.noT = 0; f.state = 'aim'; f.st = 0.7; f.aimAt = [o.x + o.mx * 1.2 + (rnd() - 0.5) * 1.6, o.y + o.my * 1.2 + (rnd() - 0.5) * 1.6]; f.face = Math.atan2(o.y - f.y, o.x - f.x); } else f.cd = 0.6; }
      const gxp = R.ax + R.fw[0] * f.ox + R.sd[0] * f.oy, gyp = R.ay + R.fw[1] * f.ox + R.sd[1] * f.oy, dx = gxp - f.x, dy = gyp - f.y, d = Math.hypot(dx, dy); if (d > 0.4) { const sp = Math.min(f.spec.speed, d * 3); f.mx = dx / d * sp; f.my = dy / d * sp; }
      return;
    }
    // no one to fight: keep formation, or (once loose) head for the nearest enemy block
    let gxp, gyp; if (f.free && R.tgt) { gxp = R.tgt.cx; gyp = R.tgt.cy; } else { gxp = R.ax + R.fw[0] * f.ox + R.sd[0] * f.oy; gyp = R.ay + R.fw[1] * f.ox + R.sd[1] * f.oy; }
    const dx = gxp - f.x, dy = gyp - f.y, d = Math.hypot(dx, dy);
    if (d > 0.15) { const sp = Math.min(f.spec.speed, d * 3 + 0.4); f.mx = dx / d * sp; f.my = dy / d * sp; if (d > 0.5) f.face = Math.atan2(dy, dx); else f.face = Math.atan2(R.fw[1], R.fw[0]); }
  }
  function gridSeparate() {
    for (const [k, l] of GRID) { const cx = (k / 4096) | 0, cy = k % 4096;
      for (const a of l) { if (!a.alive || a.ifr > 0) continue;
        for (let gx = cx - 1; gx <= cx + 1; gx++) for (let gy = cy - 1; gy <= cy + 1; gy++) { const m = gx === cx && gy === cy ? l : GRID.get(gx * 4096 + gy); if (!m) continue;
          for (const b of m) { if (b.id <= a.id || !b.alive || b.ifr > 0) continue; const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r; if (dx > rr || dx < -rr || dy > rr || dy < -rr) continue; const d = Math.hypot(dx, dy); if (d < rr && d > 1e-4) { const p = (rr - d) / 2, wa = a === K ? 0.25 : b === K ? 1.75 : 1; a.x -= dx / d * p * wa; a.y -= dy / d * p * wa; b.x += dx / d * p * (2 - wa); b.y += dy / d * p * (2 - wa); } } } } }
  }
  function volleys(dt) {
    for (const a of vol) {
      a.t += dt; if (a.t < a.T) continue; a.dead = true;
      if (mode.id === 'lode' && LD.on && a.team === 1 && Math.hypot(a.tx - K.x, a.ty - K.y) < 3) continue;
      if (obst.some(o => Math.hypot(a.tx - o.x, a.ty - o.y) < o.r)) continue;
      let best = null, bd = 0.6; const l = [], cx = (a.tx / GC) | 0, cy = (a.ty / GC) | 0; for (let gx = cx - 1; gx <= cx + 1; gx++) for (let gy = cy - 1; gy <= cy + 1; gy++) { const m = GRID.get(gx * 4096 + gy); if (m) for (const o of m) if (o.alive && o.team !== a.team) { const d = Math.hypot(o.x - a.tx, o.y - a.ty); if (d < bd) { bd = d; best = o; } } }
      if (best) hit(best, { x: a.sx, y: a.sy, team: a.team }, { dmg: 15, pd: 10, arrow: true }); else if (decals.length < 160) decals.push({ x: a.tx, y: a.ty, a: Math.atan2(a.ty - a.sy, a.tx - a.sx), t: 7 });
    }
    vol = vol.filter(a => !a.dead);
  }
  function drawVolleys() {
    for (const a of vol) { const u = a.t / a.T, u0 = Math.max(0, u - 0.035), P = q => { const x = a.sx + (a.tx - a.sx) * q, y = a.sy + (a.ty - a.sy) * q, z = 1 + 4 * a.h * q * (1 - q) - q; return [Math.round(E.sx(x, y)), Math.round(E.sy(x, y, z)), x + y + z + 1]; }, p1 = P(u), p0 = P(u0); sline(p0[0], p0[1], p1[0], p1[1], p1[2], 0xe8dcc0, 0, 1); E.px(p1[0], p1[1], p1[2], 0xf4f6fa); }
  }
  function battleUI() {
    const top = $('top'), g = document.createElement('div'); g.className = 'grp'; top.insertBefore(g, top.children[1]);
    const mkb = (txt, fn, cls) => { const b = document.createElement('button'); b.textContent = txt; if (cls) b.className = cls; b.onclick = fn; g.appendChild(b); return b; };
    const fb = mkb('Fight!', () => { if (phase === 'deploy' && !over) { phase = 'fight'; say('To battle!', '', 1200); sfx('wave'); } }, 'on');
    for (const n of [100, 200, 300]) { const b = mkb(n + ' a side', () => { armyN = n; for (const c of g.children) if (c.dataset.n) c.className = +c.dataset.n === n ? 'on' : ''; reset(); }); b.dataset.n = n; if (n === armyN) b.className = 'on'; }
    $('restart').textContent = 'New battle';
    const bar = document.createElement('div'); bar.className = 'meter'; bar.id = 'army'; bar.innerHTML = '<b style="background:linear-gradient(#d8414f,#a8322e)"></b>'; bar.style.background = '#3a5a9a'; bar.style.height = '8px'; $('hud').insertBefore(bar, $('wave'));
  }

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
    const live = BATTLE ? [] : F.filter(f => f.alive && f.team === 1);
    if (BATTLE) battleThink(dt);
    else if (!over && live.length === 0) { waveT -= dt; if (waveT <= 0) { if (wave > 0) { K.hp = Math.min(K.max, K.hp + 25); for (const k of F) if (k.kind === 'knight' && k.alive) k.hp = Math.min(k.max, k.hp + 30); allies(); } spawnWave(); waveT = 2.2; } }
    // who is allowed to press the attack
    const melee = live.filter(e => e.kind !== 'archer');
    for (const e of live) { e.think -= dt; if (e.think <= 0 || !e.tgt || !e.tgt.alive) { e.think = 0.4; let b = null, bd = 1e9; for (const o of F) if (o.team === 0 && o.alive) { const d = Math.hypot(o.x - e.x, o.y - e.y) * (o === K ? 0.8 : 1); if (d < bd) { bd = d; b = o; } } e.tgt = b; } }
    melee.sort((a, b) => (a.tgt ? Math.hypot(a.x - a.tgt.x, a.y - a.tgt.y) : 99) - (b.tgt ? Math.hypot(b.x - b.tgt.x, b.y - b.tgt.y) : 99));
    melee.forEach((e, i) => { e.eng = mode.id === 'duel' ? e === K.lock : (i < mode.tokens || e.state !== 'idle'); });
    if (!over) {
      if (mode.kmove) mode.kmove(dt); else kingMove(); if (mode.update) mode.update(dt); if (mode.slam) slamBodies(dt);
      if (mode.id === 'duel' && K.holdStop) K.mx = K.my = 0;
      if (K.buf) { K.buf.t -= dt; if (K.state === 'idle') { const b = K.buf; K.buf = null; kingSwing(b.dir, b.heavy); } else if (K.buf.t <= 0) K.buf = null; }
      K.comboT += dt; K.staD -= dt; if (K.staD <= 0 && K.state !== 'block') K.sta = Math.min(100, K.sta + 26 * dt);
      if (K.state === 'block') K.blockT += dt;
    }
    for (const f of F) {
      if (f.state === 'dead') { f.st += dt; f.flash = Math.max(0, f.flash - dt * 6); if (BATTLE && f !== K) { f.fade = clamp((f.st - 7) / 2, 0, 1); f.p.z = 0; } else { f.fade = Math.min(1, f.st / 0.9); f.p.z = -f.st * 0.25; } continue; }
      f.cd -= dt; f.flash = Math.max(0, f.flash - dt * 6); f.swingT += dt; if (f.ifr > 0) f.ifr -= dt;
      if (f !== K) { f.poise = Math.min(f.spec.poise, f.poise + dt * 6); if (over) { f.mx = f.my = 0; } else if (BATTLE) aiTroop(f, dt); else if (f.kind === 'knight') aiKnight(f); else if (f.kind === 'archer') aiArcher(f, dt); else aiMelee(f, f.eng); }
      if (f.state !== 'idle' && f.state !== 'block') {
        f.st -= dt;
        if (f.state === 'wind') { const l = f.atk.lunge || 0; if (l) { f.kx = 0; f.ky = 0; f.x += Math.cos(f.face) * l / f.atk.wind * dt; f.y += Math.sin(f.face) * l / f.atk.wind * dt; } if (f.st <= 0) resolve(f); }
        else if (f.state === 'roll') {
          f.x += f.rdx * dt; f.y += f.rdy * dt; f.p.z = Math.sin(Math.PI * (1 - f.st / f.rollDur)) * (f.hop || (f.dash ? 0.12 : 0.3));
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
      if (BATTLE) clampField(f);
      const lim = f.team === 0 ? C.R : C.R + 1.6, cd = Math.hypot(f.x - C.x, f.y - C.y); if (cd > lim) { f.x = C.x + (f.x - C.x) / cd * lim; f.y = C.y + (f.y - C.y) / cd * lim; }
      const sp = Math.hypot(f.mx, f.my); f.p.moving = sp > 0.25 && f.state === 'idle'; if (f.p.moving) f.p.phase += dt * sp * 2.7;
    }
    if (BATTLE) gridSeparate(); else for (let i = 0; i < F.length; i++) for (let j = i + 1; j < F.length; j++) {
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
    shots = shots.filter(s => !s.dead); F = F.filter(f => !(f.state === 'dead' && f.st > (BATTLE ? 9 : 1.0) && f !== K && f.kind !== 'knight'));
    if (BATTLE) volleys(dt);
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
    if (BATTLE && f !== K) {
      f.anim = !f.alive ? 'dead' : f.state === 'wind' ? 'wind' : (f.state === 'rec' && f.swingT < 0.2) ? 'swing' : f.state === 'aim' ? 'aim' : f.state === 'stag' ? 'stag' : f.p.moving ? 'walk' : 'idle';
      f.t = !f.alive ? Math.min(1, f.st / 0.5) : f.state === 'wind' ? 1 - f.st / f.atk.wind : f.state === 'rec' ? Math.min(1, f.swingT / 0.2) : f.state === 'aim' ? 1 - f.st / 0.7 : 0;
      f.phase = f.p.phase; f.z = f.p.z || 0; Troops.draw(f, time); f.p.scrX = f.scrX; f.p.scrY = f.scrY; f.p.scrTop = f.scrTop;
      if (f.alive && f.state === 'stag' && f.team === 1) for (let i = 0; i < 2; i++) { const a = time * 6 + i * 3.14; rectS(f.scrX + Math.round(Math.cos(a) * 7), f.scrTop - 2 + Math.round(Math.sin(a) * 3), 2, 2, f.x + f.y + 2, 0xffe27a); }
      return;
    }
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
      if (f === K && K.noWeapon) { } else if (f === K && mode.id === 'moment') { const fxs = Math.cos(f.face) - Math.sin(f.face), fys = (Math.cos(f.face) + Math.sin(f.face)) * 0.5, n = Math.hypot(fxs, fys) || 1, tx = hx + fxs / n * 24, ty = hy + 3 + fys / n * 24; sline(hx - fxs / n * 9, hy + 3 - fys / n * 9, tx, ty, d, 0x9a7a50, 0x6a4c30, 2); rectS(Math.round(tx) - 1, Math.round(ty) - 1, 3, 3, d, 0xe4e8f0); rectS(Math.round(hx + fxs / n * 15), Math.round(hy + 1 + fys / n * 15), 3, 4, d, 0xb8323a); }
      else if (f.kind === 'king' && !MACE[mode.id]) { sline(hx, hy, ex, ey, d, 0xe4e8f0, 0xa8aebc, 2); rectS(Math.round(hx + sg * Math.cos(a) * 2 - 1), Math.round(hy - Math.sin(a) * 2 - 1), 3, 3, d, 0xe8c84a); }
      else if (f.kind === 'brute' || f.kind === 'king') { sline(hx, hy, ex, ey, d, 0x7a5636, 0x5a3e28, 3); rectS(Math.round(ex) - 2, Math.round(ey) - 2, 5, 5, d, 0x4a3424); rectS(Math.round(ex) - 1, Math.round(ey) - 1, 2, 2, d, 0x9aa0ac); }
      else { sline(hx, hy, ex, ey, d, 0x8a6a46, 0x6a4c30, 2); rectS(Math.round(hx + sg * Math.cos(a) * (L - 3)) - 1, Math.round(hy - Math.sin(a) * (L - 3)) - 2, 4, 4, d, 0xa8aeb8); }
    }
    if (f.kind === 'archer' || (f === K && mode.id === 'bow')) {
      const bx = sx + sg * 7, by = sy - 15, drawn = f.state === 'aim' || (f === K && BW.aim);
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
    if (BATTLE) { const vh = cv.height / zoom, r0 = clamp(Math.floor(camY - vh / 2 - 90), 0, E.H), r1 = clamp(Math.ceil(camY + vh / 2 + 90), 0, E.H); E.frame = frame; frame.set(E.base.subarray(r0 * E.W, r1 * E.W), r0 * E.W); }
    else E.begin(frame);
    // ground marks
    for (const d of decals) { const x1 = d.x - Math.cos(d.a) * 0.3, y1 = d.y - Math.sin(d.a) * 0.3, ax = Math.round(E.sx(d.x, d.y)), ay = Math.round(E.sy(d.x, d.y, 0)); sline(ax, ay, Math.round(E.sx(x1, y1)), Math.round(E.sy(x1, y1, 0.35)), d.x + d.y + 0.2, 0x8a6a46, 0, 1); }
    for (const f of F) {
      if (!f.alive) continue;
      if (BATTLE && (f.tgt !== K || Math.hypot(f.x - K.x, f.y - K.y) > 3)) continue;
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
    const DL = F.map(f => ({ k: BATTLE && !f.alive && f !== K ? -1e6 + f.x + f.y : f.x + f.y, f })); if (mode.sprites && !over) for (const e of mode.sprites()) DL.push(e);
    if (BATTLE) { for (const R of REG) if (R.n > 0) DL.push({ k: R.cx + R.cy - 0.4, draw() { Troops.banner(R.cx, R.cy - 0.4, R.team, time, R.kind === 'sword' ? 0 : R.kind === 'spear' ? 1 : 2); } });
      for (const q of Battlefield.flags || []) DL.push({ k: q.x + q.y, draw() { Troops.banner(q.x, q.y, q.team, time, q.kind || 0, q.z, q.pole); } });
      const vw = cv.width / zoom, vh = cv.height / zoom; Troops.setClip(camX - vw / 2 - 40, camY - vh / 2 - 60, camX + vw / 2 + 40, camY + vh / 2 + 60); drawVolleys(); }
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
    const cw = BATTLE ? 0 : 0.65, tx = E.sx(C.x, C.y) * cw + E.sx(K.x, K.y) * (1 - cw), ty = E.sy(C.x, C.y, 1) * cw + E.sy(K.x, K.y, 1) * (1 - cw); camX += (tx - camX) * 0.08; camY += (ty - camY) * 0.08;
    if (BATTLE) { const hw = cv.width / zoom / 2, hh = cv.height / zoom / 2; camX = clamp(camX, Math.min(hw, E.W / 2), Math.max(E.W - hw, E.W / 2)); camY = clamp(camY, Math.min(hh, E.H / 2), Math.max(E.H - hh, E.H / 2)); }
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
    G.wx0 = G.wx; G.wy0 = G.wy; mode.down(G);
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
    for (const w of BATTLE ? [true] : [true, false]) { const row = document.createElement('div'); row.className = 'grp'; const l = document.createElement('span'); l.className = 'lbl'; l.textContent = w ? 'WEAPONS' : 'OTHER TESTS'; row.appendChild(l);
      for (const k in MODES) { if (!!MODES[k].w !== w) continue; const b = document.createElement('button'); b.textContent = MODES[k].name; b.className = (k === id ? 'on ' : '') + (MODES[k].isNew ? 'new' : ''); b.onclick = () => setMode(k); row.appendChild(b); } el.appendChild(row); }
    $('help').className = ''; $('help').innerHTML = '<b>' + mode.title + '</b> <i>(tap to hide)</i><ul>' + mode.help.map(h => '<li>' + h + '</li>').join('') + '</ul>';
    try { location.hash = id; } catch (e) { }
    $('hud').style.top = ($('top').offsetHeight + 2) + 'px';
    if (BATTLE && K && !over) { K.noWeapon = false; K.hold = K.dest = K.aim = null; K.hop = 0; if (K.state !== 'stag') K.state = 'idle'; if (mode.init) mode.init(); return; }
    reset();
  }
  $('help').onclick = () => $('help').classList.toggle('min');
  $('restart').onclick = () => reset();
  $('snd').onclick = () => { sound = !sound; $('snd').textContent = sound ? 'Sound off' : 'Sound on'; };
  function resize() { dpr = Math.min(3, window.devicePixelRatio || 1); cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr); if (!resize.done) { zoom = clamp(Math.min(cv.width / (BATTLE ? 900 : 720), cv.height / 600), 0.8, 6); resize.done = true; } }
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
    bake(); camX = E.sx(C.x, C.y); camY = E.sy(C.x, C.y, 1); if (BATTLE) battleUI();
    const h = (location.hash || '').slice(1); setMode(MODES[h] ? h : 'moment');
    $('busy').classList.remove('on'); requestAnimationFrame(tick);
    window.__ct = { reset: () => reset(), REG: () => REG, fight: () => { phase = 'fight'; }, phase: () => phase, counts: () => counts, BD: () => BD, ST: () => ST, kscreen: () => [((E.sx(K.x, K.y) - camX) * zoom + cv.width / 2) / dpr, ((E.sy(K.x, K.y, 0.7) - camY) * zoom + cv.height / 2) / dpr], F: () => F, K: () => K, sim, draw, setMode, MODES, kingSwing, state: () => ({ wave, kills, over, n: F.length }) };
  }, 30);
})();
