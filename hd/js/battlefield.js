'use strict';
/* Open battlefield for the massed-battle test.  A band-shaped world like the coast / deepwood
 * scenes: d = x - y runs along the field (screen horizontal), s = x + y across it.
 * England deploys on the left (low d), France on the right (high d).  The walkable field is
 * flat (z = 0).  Tall scenery only sits behind the far edge and at the two ends, so nothing
 * ever hides the fighting from the camera. */
const Battlefield = {};
(function () {
  const h2 = E.h2, Q = E.quad, mul = T.mul, mix = T.mix, U = 32, V = 40;
  const FWA = E.F_WATER << 24;
  const D0 = -46, D1 = 46, S0 = 44, S1 = 78, ZV = 6.4;
  const W2 = (d, s) => [(s + d) / 2, (s - d) / 2];
  const FIELD = { d0: -42, d1: 42, s0: 48, s1: 73 };
  const ZONES = { en: { d0: -40, d1: -14, s0: 50, s1: 71 }, fr: { d0: 14, d1: 40, s0: 50, s1: 71 } };

  const roadD = s => 1.5 + 2.2 * Math.sin(s * 0.16 + 1) + (s - 60) * 0.12;                 // road crossing the field, d at s
  const trackS = d => 61 + 1.6 * Math.sin(d * 0.11) + 0.8 * Math.sin(d * 0.3 + 2);          // cart track between the camps, s at d
  const POND = W2(-8.5, 68.6), PR = 1.75;
  const FIRES = [W2(-41, 49.4), W2(41, 49.4)];
  // crop plots: axis-aligned in world space, so they read as isometric diamonds.  [cx, cy, hx, hy, kind]
  const PLOTS = [W2(-9, 53.4).concat([3.3, 2.3, 1]), W2(10.5, 68.2).concat([2.5, 3.4, 0]), W2(-27, 72.6).concat([3.4, 2.2, 0]), W2(29, 52).concat([2.4, 3.0, 2]), W2(19.5, 45.4).concat([3.0, 1.7, 1])];
  const CAMPS = [];     // bare trampled earth: [x, y, r]
  for (const sg of [-1, 1]) { CAMPS.push(W2(sg * 44, 56).concat(2.6), W2(sg * 44, 64).concat(2.8), W2(sg * 44.2, 70).concat(2.2), W2(sg * 41, 49.4).concat(1.9), W2(sg * 34, 46.2).concat(2.6), W2(sg * 30, 46).concat(2.0), W2(sg * 38, 46.4).concat(2.2)); }

  /* ---------- ground ---------- */
  const GRASS = T.pal(['#487f38', '#538d3c', '#5f9a42', '#6ca648', '#7ab250']);
  const DRY = T.pal(['#a8a458', '#b6b060', '#98984e']);
  const WHEAT = T.pal(['#d9b44e', '#e4c25a', '#c9a344', '#edd06c']);
  const STUB = T.pal(['#c9b77a', '#d4c388', '#bba868', '#b09a5c']);
  const CLOVER = T.pal(['#4f8f44', '#5a9c48', '#468640']);
  const ROCK = T.pal(['#8a8478', '#7c776e', '#989284', '#6e6a64', '#a39c8c', '#847c70']);
  function meadow(x, y) {
    const tx = Math.floor(x * U), ty = Math.floor(y * U), n = T.fbm(x * 0.35, y * 0.35), r = h2(tx, ty >> 1);
    let i = Math.min(4, Math.max(0, (n * 4.8 + (h2(tx >> 1, ty >> 2) - 0.5) * 1.6) | 0));
    const dry = T.fbm(x * 0.8 + 9, y * 0.8); if (dry > 0.62 && h2(tx >> 1, ty >> 1) < (dry - 0.6) * 2.4) return DRY[(r * 3) | 0];
    const fl = T.fbm(x * 0.5 + 40, y * 0.5 + 13);
    if (fl > 0.58 && h2(tx >> 1, (ty >> 1) + 5) < (fl - 0.58) * 0.4) { const k = T.vn(x * 0.22 + 3, y * 0.22); return (tx & 1) === (ty & 1) ? (k < 0.4 ? 0xc9a0dc : k < 0.7 ? 0xe4e2c8 : 0xeccb4c) : (k < 0.4 ? 0xa884c8 : 0xe6d870); }
    if (h2(tx >> 1, (ty >> 1) + 77) < 0.003) return (tx & 1) === (ty & 1) ? 0xe4e2c8 : 0xeccb4c;
    if (r < 0.08) i = Math.min(4, i + 1); else if (r > 0.94) i = Math.max(0, i - 1);
    return GRASS[i];
  }
  function plotTex(k, x, y, tx, ty) {
    if (k === 0) {            // standing wheat, cut short: golden rows
      const row = ((tx % 5) + 5) % 5, c = WHEAT[(h2(tx >> 1, ty >> 2) * 4) | 0];
      if (h2(tx, (ty >> 1) + 31) < 0.004) return 0xe07a4a;
      return row === 0 ? mul(c, 0.74) : row === 1 ? mul(c, 0.9) : (h2(tx, ty) < 0.12 ? mul(c, 1.1) : c);
    }
    if (k === 1) {            // stubble
      const row = ((ty % 6) + 6) % 6, c = STUB[(h2(tx >> 2, ty >> 1) * 4) | 0];
      return row === 0 ? (tx & 1 ? 0x8f7c4a : mul(c, 0.8)) : (h2(tx, ty) < 0.06 ? 0x9a8a54 : c);
    }
    const c = CLOVER[(h2(tx >> 1, ty >> 1) * 3) | 0];   // clover / flowers
    if (h2(tx >> 1, (ty >> 1) + 9) < 0.09) return (tx & 1) === (ty & 1) ? (h2(tx >> 3, ty >> 3) < 0.5 ? 0xc98ad8 : 0xf0c4e0) : 0xa56be0;
    return c;
  }
  function ground(x, y) {
    const s = x + y, d = x - y;
    if (s < 25.5) return -1;
    const tx = Math.floor(x * U), ty = Math.floor(y * U), n = T.fbm(x * 0.6, y * 0.6), hh = h2(tx >> 1, ty >> 1);
    // pond
    const pd = Math.hypot(x - POND[0], y - POND[1]) - PR + (n - 0.5) * 0.5;
    if (pd < 0) { const w = T.fbm(x * 1.6, y * 1.6); return (pd > -0.18 ? (hh < 0.3 ? 0x8fb8b0 : 0x4a9a98) : pd > -0.55 ? (w > 0.55 ? 0x3d9a98 : 0x338a90) : (w > 0.55 ? 0x2f7f86 : 0x286e7a)) | FWA; }
    if (pd < 0.36) return hh < 0.25 ? 0x9a9488 : hh < 0.4 ? 0x5a8a3a : mul(0x6e5e46, 0.85 + h2(tx, ty) * 0.25);
    // road across the field
    const dr = Math.abs(d - roadD(s)), rw = 1.25 + n * 0.55;
    if (dr < rw) {
      if (dr > rw - 0.36 && hh < 0.5) return meadow(x, y);
      const c = T.dirt(x, y); if (Math.abs(dr - 0.55) < 0.1) return mul(c, 0.82);
      if (dr < 0.2 && hh < 0.22) return GRASS[1];
      return c;
    }
    // cart track along the field
    const dt = Math.abs(s - trackS(d)), tw = 0.8 + n * 0.45;
    if (dt < tw) {
      if (Math.abs(dt - 0.42) < 0.11) return mul(T.dirt(x, y), 0.86);
      if (dt < 0.3 ? hh < 0.6 : dt > tw - 0.3 ? hh < 0.6 : hh < 0.25) return meadow(x, y);
      return T.dirt(x, y);
    }
    // camps and fires: bare earth
    for (let i = 0; i < CAMPS.length; i++) { const c = CAMPS[i], dc = Math.hypot(x - c[0], y - c[1]) - c[2] - (n - 0.5) * 1.2; if (dc < 0) { if (hh < 0.9 + dc * 1.6) return mul(T.dirt(x, y), 0.94); break; } }
    for (let i = 0; i < 2; i++) { const dc = Math.hypot(x - FIRES[i][0], y - FIRES[i][1]); if (dc < 0.75) return mul(T.dirt(x, y), dc < 0.45 ? 0.55 : 0.75); }
    // crop plots
    for (let i = 0; i < PLOTS.length; i++) {
      const p = PLOTS[i], ex = p[2] - Math.abs(x - p[0]) + (T.vn(y * 1.3, i) - 0.5) * 0.3, ey = p[3] - Math.abs(y - p[1]) + (T.vn(x * 1.3, i + 9) - 0.5) * 0.3, e = Math.min(ex, ey);
      if (e > 0) { if (e < 0.14) return hh < 0.5 ? 0x6a5a3c : GRASS[0]; return plotTex(p[4], x, y, tx, ty); }
    }
    // ground worn by the two armies where they will meet
    const wear = Math.exp(-((d / 10) ** 2)) * (0.25 + T.fbm(x * 0.5 + 70, y * 0.5 + 3)) * (s > 47 && s < 74 ? 1 : 0.4);
    if (wear > 0.6 && hh < (wear - 0.6) * 2.6) return mul(T.dirt(x, y), 0.92);
    return meadow(x, y);
  }

  /* ---------- textures ---------- */
  const dryStone = (s, t, q) => {
    const X = Math.floor(s * U) + ((q.P && q.P.seed) | 0) * 13, Y = Math.floor(t * V), row = Math.floor(Y / 5), ly = Y - row * 5, off = (h2(row, 7) * 9) | 0, wd = 6 + ((h2(row, 3) * 4) | 0);
    const col = Math.floor((X + off) / wd), lx = X + off - col * wd; let f = 0.94 + h2(X, Y) * 0.1;
    if (ly === 0 || lx === 0) f *= 0.56; else if (ly === 4) f *= 1.12; else if (lx === wd - 1) f *= 0.84;
    let c = ROCK[(h2(col, row + 40) * ROCK.length) | 0];
    if (h2(col + 5, row) < 0.12 && ly > 1) c = mix(c, 0x5f8a3e, 0.7);
    return mul(c, f);
  };
  const capStone = (s, t) => { const X = Math.floor(s * U), Y = Math.floor(t * U), col = Math.floor((X + (Y >> 2)) / 8), lx = (X + (Y >> 2)) - col * 8; const c = ROCK[(h2(col, 91) * ROCK.length) | 0]; return mul(c, lx === 0 ? 0.62 : 1.02 + h2(X, Y) * 0.1); };
  const STRAW = T.pal(['#d9b85a', '#c9a548', '#e6c868', '#b8943e', '#eed47a']);
  const strawTex = sd => (dx, dy, ix, iy) => { const r = h2((ix + sd) >> 1, (iy * 3 + ix) >> 3); let c = STRAW[(r * 5) | 0]; if (((iy + (ix >> 1) + sd) % 6) === 0) c = mul(c, 0.72); if (dy > 0.55) c = mul(c, 0.8); return c; };
  const canvasTex = (a, b) => (s, t) => { const X = Math.floor(s * U), Y = Math.floor(t * 34), st = Math.floor(X / 10) & 1; return mul(st ? a : b, (X % 10 === 0 ? 0.84 : 0.97) + h2(X >> 2, Y >> 2) * 0.06 - (Y < 3 ? 0.14 : 0)); };
  const tentFront = (a, b) => (s, t, q, u, v) => { const Ht = q.vl * V, Y = t * V, top = (1 - Math.abs(2 * u - 1)) * Ht; if (Y > top) return -1; if (Math.abs(2 * u - 1) < 0.5 * (1 - v * 1.25)) return Y < 3 ? 0x3a3038 : 0x221c24; if (top - Y < 3) return mul(a, 0.8); return mul(b, 0.92 + h2(Math.floor(s * U) >> 2, 2) * 0.08); };
  const TEAM = [{ a: 0xc23a32, b: 0xeadfc4, c: 0xe8c84a }, { a: 0x3458b4, b: 0xeadfc4, c: 0xe8c84a }];

  /* ---------- props ---------- */
  let obst = [], flags = [], sd = 1;
  function haystack(x, y, sc, solid) {
    sc = sc || 1; const k = sd++ * 7;
    E.blob([x, y, 0.3 * sc], 0.52 * sc, strawTex(k)); E.blob([x + 0.02, y + 0.02, 0.6 * sc], 0.36 * sc, strawTex(k + 3)); E.blob([x, y, 0.82 * sc], 0.17 * sc, strawTex(k + 5));
    for (let i = 0; i < 6; i++) { const a = i * 1.05 + k; E.blob([x + Math.cos(a) * 0.5 * sc, y + Math.sin(a) * 0.5 * sc, 0.07], 0.13 * sc, strawTex(k + i), { f: E.F_NOAO }); }
    if (solid) obst.push({ x, y, r: 0.62 * sc });
  }
  function wall(x, y, len, axis, seed) {            // dry-stone wall segment, 0.5 high
    const w = axis === 'x' ? len : 0.36, dd = axis === 'x' ? 0.36 : len, bt = B.flora.boulderTex;
    B.box(x, y, 0, w, dd, 0.46, { side: dryStone, P: { seed }, top: capStone });
    for (let i = 0; i < len / 0.42; i++) { const u = 0.1 + i * 0.42 + h2(i, seed) * 0.1; if (u > len - 0.1) break; E.blob(axis === 'x' ? [x + u, y + 0.18, 0.47] : [x + 0.18, y + u, 0.47], 0.13 + h2(i, seed + 1) * 0.04, bt(seed * 9 + i), { f: E.F_NOAO }); }
    // tumbled ends
    const ends = axis === 'x' ? [[x - 0.2, y + 0.2], [x + len + 0.22, y + 0.16]] : [[x + 0.2, y - 0.2], [x + 0.16, y + len + 0.22]];
    for (let i = 0; i < 2; i++) { E.blob([ends[i][0], ends[i][1], 0.12], 0.24, bt(seed + i)); E.blob([ends[i][0] + (i ? 0.3 : -0.25), ends[i][1] + 0.22, 0.05], 0.13, bt(seed + i + 4), { f: E.F_NOAO }); }
    B.bush(axis === 'x' ? x + len * 0.3 : x - 0.2, axis === 'x' ? y - 0.2 : y + len * 0.6, { s: 0.55, n: 3, pal: T.LEAF_G, flowers: null, noBlock: true });
    const n = Math.max(2, Math.round((len + 0.4) / 0.85));
    for (let i = 0; i < n; i++) { const u = -0.2 + (len + 0.4) * (i + 0.5) / n; obst.push(axis === 'x' ? { x: x + u, y: y + 0.18, r: 0.5 } : { x: x + 0.18, y: y + u, r: 0.5 }); }
  }
  function campfire(x, y) {
    const F = B.flora;
    for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283; E.blob([x + Math.cos(a) * 0.36, y + Math.sin(a) * 0.36, 0.05], 0.1, F.boulderTex(900 + i), { f: E.F_NOAO }); }
    B.box(x - 0.25, y - 0.05, 0, 0.5, 0.1, 0.1, { side: F.bark(0x4a3626) }); B.box(x - 0.05, y - 0.25, 0.06, 0.1, 0.5, 0.1, { side: F.bark(0x3a2a1e) });
    B.flames.push({ x, y, z: 0.16, s: 2.2 }); E.addLight(x, y, 0.7, 7, [1.0, 0.6, 0.25], 1.6); B.smokes.push([x, y, 0.9]);
    obst.push({ x, y, r: 0.5, fire: true });
  }
  function ridgeTent(x, y, w, dd, rise, axis, team) {
    const c = TEAM[team];
    B.gable(x, y, 0, w, dd, rise, axis, { tex: canvasTex(c.a, c.b), gtex: tentFront(c.a, c.b), P: {}, GP: {}, ov: 0.06 });
  }
  function pavilion(x, y, r, team, flag) {             // round striped tent with a conical roof
    const c = TEAM[team], n = 12, seg = 2 * r * Math.sin(Math.PI / n), mid = 3 * seg, wallH = 0.95, roofH = 1.15 * r + 0.3;
    const side = (s, t) => { const X = Math.floor(s * U), Y = Math.floor(t * V), k = Math.floor(s / seg + 1e-6) & 1; if (Math.abs(s - mid) < 0.26 && t < 0.8) return Math.abs(s - mid) > 0.21 || t > 0.74 ? c.c : 0x241c24; if (Y >= wallH * V - 3) return mul(c.c, Y & 1 ? 1 : 0.8); return mul(k ? c.a : c.b, (X % Math.round(seg * U) === 0 ? 0.8 : 0.96) + h2(X >> 2, Y >> 2) * 0.06 - (Y < 3 ? 0.15 : 0)); };
    const roof = (s, t, q) => { const k = s / q.ul < 0.5, Y = Math.floor(t * V); if (Y < 5) { const m = Math.floor(s * U) % 8 - 3.5; if (Y < 3 && m * m + (4 - Y) * (4 - Y) > 17) return -1; return mul(c.c, 0.9); } return mul(k ? c.a : c.b, 0.94 + h2(Math.floor(s * U) >> 2, Y >> 2) * 0.08); };
    B.cyl(x, y, 0, r, wallH, n, side, {}); B.cone(x, y, wallH - 0.08, r * 1.13, roofH, n, roof, { P: {} });
    B.cyl(x, y, wallH + roofH - 0.12, 0.04, 0.5, 5, T.flat(0x5a4030), { noShadow: true }); E.blob([x, y, wallH + roofH + 0.4], 0.07, () => c.c, { f: E.F_NOAO });
    if (flag) flags.push({ x, y, z: wallH + roofH + 0.4, team, pole: 0.9 });
  }
  function rack(x, y) {                                 // spears stacked against a rail
    B.box(x, y, 0, 0.07, 0.07, 0.62, { side: T.flat(0x5a4030) }); B.box(x + 1.0, y, 0, 0.07, 0.07, 0.62, { side: T.flat(0x5a4030) }); B.box(x, y + 0.01, 0.56, 1.07, 0.05, 0.06, { side: T.flat(0x6a4c36) });
    for (let i = 0; i < 5; i++) { Q([x + 0.14 + i * 0.19, y + 0.3, 0], [0.035, 0, 0], [0, -0.26, 1.25], T.flat(i & 1 ? 0x7a5a40 : 0x6a4a34), { noShadow: true }); E.blob([x + 0.157 + i * 0.19, y + 0.03, 1.29], 0.045, () => 0xc8ced8, { f: E.F_NOAO }); }
  }
  function fence(dA, dB, s) {                           // rail fence along the near edge (runs along d, faces the camera)
    const rail = (c) => (u, v) => mul(c, 0.86 + h2(Math.floor(u * U) >> 2, Math.floor(v * V)) * 0.22);
    for (let d = dA; d < dB - 0.3; d += 1.4) {
      const L = Math.min(1.4, dB - d), [x, y] = W2(d, s), sag = (h2(d * 10 | 0, 3) - 0.5) * 0.08;
      Q([x, y, 0.2 + sag], [L / 2, -L / 2, 0], [0, 0, 0.07], rail(0x7a5a40), { noShadow: false }); Q([x, y, 0.4 - sag], [L / 2, -L / 2, 0], [0, 0, 0.07], rail(0x86664a), {});
      B.box(x - 0.05, y - 0.05, 0, 0.1, 0.1, 0.56 + h2(d * 10 | 0, 5) * 0.08, { side: T.flat(0x5c4432), top: T.flat(0x7a6048) });
    }
    const [x, y] = W2(dB, s); B.box(x - 0.05, y - 0.05, 0, 0.1, 0.1, 0.58, { side: T.flat(0x5c4432), top: T.flat(0x7a6048) });
  }
  function windmill(x, y) {
    const n = 12, r0 = 1.05, r1 = 0.68, hT = 3.5, seg = 2 * r0 * Math.sin(Math.PI / n), mid = 3 * seg;
    const tower = (s, t) => {
      const X = Math.floor(s * U), Y = Math.floor(t * V), ds = Math.abs(s - mid);
      if (ds < 0.2 && t < 0.95) return ds > 0.16 || t > 0.9 ? 0x5a4030 : mul(0x7a5636, Math.floor(s * U) % 4 === 0 ? 0.75 : 1);
      for (const w of [[mid + 0.02, 1.9], [mid - seg * 1.6, 1.4], [mid + seg * 1.7, 2.6]]) { const wx = Math.abs(s - w[0]), wy = t - w[1]; if (wx < 0.1 && wy > 0 && wy < 0.34) return wx > 0.07 || wy < 0.04 || wy > 0.3 ? 0x6a5a48 : (0x2a3040 | (E.F_WIN << 24)); }
      if (t > hT - 0.12) return 0x5a4030;
      if (t < 0.5) return T.stoneAt(X, Y, 5, 0xa8a294);
      return mul(0xe9e2d0, 0.9 + h2(X >> 2, Y >> 2) * 0.1 - (h2(X >> 3, Y >> 4) < 0.08 ? 0.1 : 0) - (Y % 17 === 0 ? 0.04 : 0));
    };
    B.taper(x, y, 0, r0, x, y, hT, r1, n, tower);
    B.cone(x, y, hT - 0.05, r1 + 0.22, 0.95, n, T.roof, { P: { pal: T.ROOF_BROWN, seed: 4 } });
    E.blob([x, y, hT + 0.92], 0.08, () => 0x5a4030, { f: E.F_NOAO });
    // sails: one cut-out quad squarely facing the camera, in front of the cap
    const R = 2.25, hx = x + 0.62, hy = y + 0.62, hz = hT + 0.1, k = Math.SQRT1_2, ca = Math.cos(0.42), sa = Math.sin(0.42);
    const sail = (s, t, q, a, b) => {
      let px = (a - 0.5) * 2, py = (b - 0.5) * 2; const rx = px * ca + py * sa, ry = -px * sa + py * ca, rr = Math.hypot(px, py);
      if (rr < 0.07) return 0x3a2c22;
      for (let i = 0; i < 4; i++) {
        const ax = i === 0 ? rx : i === 1 ? ry : i === 2 ? -rx : -ry, ay = i === 0 ? ry : i === 1 ? -rx : i === 2 ? -ry : rx;
        if (ax < 0.05 || ax > 1) continue;
        if (Math.abs(ay) < 0.022) return 0x4a3626;
        if (ax > 0.22 && ax < 0.985 && ay > 0 && ay < 0.2) { const gx = Math.floor(ax * 26), gy = Math.floor(ay * 26); if ((Math.floor(ax * 104) & 3) === 0 || (Math.floor(ay * 104) % 7) === 0 || ay > 0.185 || ax > 0.965 || ax < 0.24) return 0x6a4c36; return (gx * 3 + gy) % 11 < 9 ? mul(0xe6dcc0, 0.9 + h2(gx, gy) * 0.14) : -1; }
      }
      return -1;
    };
    Q([hx - R * k, hy + R * k, hz - R], [2 * R * k, -2 * R * k, 0], [0, 0, 2 * R], sail, { cut: true, n: [k, k, 0], f: E.F_NOAO });
    Q([x, y, hz - 0.06], [0.66, 0.66, 0], [0, 0, 0.12], T.flat(0x4a3626), { noShadow: true });
  }
  function chapel(x, y) {       // small stone chapel: nave with a slate roof and a bell tower behind it
    const tint = 0xb4ad9e;
    B.house({ x, y, w: 2.5, d: 3.4, floors: 0, h0: 2.2, base: 'stone', roof: T.ROOF_SLATE, rise: 1.5, axis: 'y', seed: 73, chimney: false, tint, gmat: 'stone', gfeat: { k: 'glass', w: 14, h: 22, y: 8 },
      fy: [{ k: 'door', x: 0.5, w: 18, h: 46, trim: 0xa8a294, lamp: false }], fx: [{ k: 'awin', x: 0.3, y: 30, w: 12, h: 30, frame: 0x4a4038, sill: 0xa8a294, box: false }, { k: 'awin', x: 0.7, y: 30, w: 12, h: 30, frame: 0x4a4038, sill: 0xa8a294, box: false }] });
    const tx = x + 0.6, ty = y - 1.25, st = { mat: 'stone', seed: 75, tint, feats: [{ k: 'awin', x: 0.5, y: 150, w: 10, h: 22, frame: 0x4a4038, lit: false }] };
    B.box(tx, ty, 0, 1.3, 1.3, 4.6, { side: T.facade, P: st, noTop: true });
    B.box(tx - 0.06, ty - 0.06, 4.6, 1.42, 1.42, 0.12, { side: T.flat(0x9a948a) });
    B.pyramid(tx, ty, 4.72, 1.3, 1.3, 1.3, { P: { pal: T.ROOF_SLATE, seed: 9 }, ov: 0.1 });
    B.box(tx + 0.62, ty + 0.62, 6.0, 0.06, 0.06, 0.5, { side: T.flat(0xd9b04a), noShadow: true }); B.box(tx + 0.5, ty + 0.74, 6.28, 0.3, 0.06, 0.06, { side: T.flat(0xd9b04a), noShadow: true });
    // graveyard
    for (let i = 0; i < 5; i++) { const gx = x + 3.0 + (i % 3) * 0.7, gy = y + 1.1 + (i / 3 | 0) * 1.1 + (i & 1) * 0.2; B.box(gx, gy, 0, 0.3, 0.1, 0.34 + h2(i, 3) * 0.14, { side: T.flat(0x9a958c), top: T.flat(0xb0aaa0) }); }
  }

  /* ---------- the scene ---------- */
  function build() {
    obst = Battlefield.obst = []; flags = Battlefield.flags = []; sd = 1;
    const F = B.flora, at = W2;
    Q([-11, -11, 0], [75, 0, 0], [0, 75, 0], (u, v) => ground(u - 11, v - 11), { n: [0, 0, 1], noShadow: true });

    /* --- inside the field: low cover only, centre kept open --- */
    { const [x, y] = at(-6.5, 56); wall(x, y, 2.5, 'y', 3); }
    { const [x, y] = at(5, 64.6); wall(x, y, 2.5, 'x', 5); }
    for (const p of [[3.5, 51.6, 1], [-11.3, 63.6, 1.05], [11.5, 56.2, 0.95]]) { const [x, y] = at(p[0], p[1]); haystack(x, y, p[2], true); }
    for (const p of [[-3.6, 70.6, 0.5], [11.2, 71.4, 0.46]]) { const [x, y] = at(p[0], p[1]); F.boulder(x, y, p[2]); obst.push({ x: x + 0.12, y: y + 0.06, r: p[2] + 0.12 }); }
    { const [x, y] = at(9.4, 62.9); B.cart(x - 0.7, y - 0.4); obst.push({ x: x + 0.15, y, r: 0.9 }); }
    obst.push({ x: POND[0], y: POND[1], r: PR + 0.2 });
    // pond dressing: reeds, lilies, stones
    for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283 + 0.2, rr = PR + 0.12 + h2(i, 9) * 0.2; if (a > 0.3 && a < 1.5) continue; F.fern(POND[0] + Math.cos(a) * rr, POND[1] + Math.sin(a) * rr, 0.42 + h2(i, 8) * 0.25); }
    for (let i = 0; i < 7; i++) { const a = i * 2.4, r = 0.3 + h2(i, 8) * 0.9; B.disk(POND[0] + Math.cos(a) * r, POND[1] + Math.sin(a) * r, 0.012, 0.08 + h2(i, 2) * 0.05, (s, t, q, u, v) => (i % 3 ? (u > 0.5 && Math.abs(v - 0.5) < 0.12 ? 0x2f7f86 : 0x5a9a4a) : 0xf0a0b4), { noShadow: true, f: E.F_NOAO }); }
    for (let i = 0; i < 5; i++) { const a = 0.4 + i * 0.25; E.blob([POND[0] + Math.cos(a) * (PR + 0.25), POND[1] + Math.sin(a) * (PR + 0.25), 0.03], 0.1 + h2(i, 4) * 0.08, F.boulderTex(40 + i), { f: E.F_NOAO }); }
    // campfires at the inner corner of each camp
    campfire(FIRES[0][0], FIRES[0][1]); campfire(FIRES[1][0], FIRES[1][1]);
    // tiny ground clutter (never blocks, never hides anyone)
    for (let i = 0; i < 150; i++) {
      const d = FIELD.d0 + h2(i, 901) * (FIELD.d1 - FIELD.d0), s = FIELD.s0 + h2(i, 902) * (FIELD.s1 - FIELD.s0), [x, y] = at(d, s), r = h2(i, 903);
      if (Math.abs(d - roadD(s)) < 1.7 || Math.abs(s - trackS(d)) < 1.2 || !inside(x, y, 0.5)) continue;
      if (r < 0.3) E.blob([x, y, 0.03], 0.07 + h2(i, 904) * 0.06, F.boulderTex(i), { f: E.F_NOAO });
      else if (r < 0.75) for (let j = 0; j < 3; j++) { const fx = x + (h2(i, 905 + j) - 0.5) * 0.5, fy = y + (h2(i, 915 + j) - 0.5) * 0.5; B.flowers(fx, fy, fx + 0.01, fy + 0.01, 0.01, 1, i + j, 0.8); }
      else B.bush(x, y, { s: 0.34 + h2(i, 904) * 0.14, n: 2, pal: T.LEAF_G, flowers: null, noBlock: true });
    }

    /* --- far edge: farm, mill, chapel, hedges, then the tree line --- */
    { const [x, y] = at(-9, 45.0); windmill(x, y); haystack(x + 2.1, y - 0.3, 1.1); haystack(x + 2.9, y + 0.5, 0.85); B.cart(x - 2.9, y + 1.2); B.sack(x + 0.3, y + 1.5); B.sack(x + 0.75, y + 1.35, 0, 0xb89a6a); B.barrel(x - 0.9, y + 1.5); }
    { const [x, y] = at(14, 44.2); B.house({ x: x - 1.6, y: y - 1.5, w: 3.3, d: 2.9, floors: 1, axis: 'x', seed: 91, plaster: 0xe2d2a8, shutter: 0x4f7a52, roof: T.ROOF_RED, rise: 1.7,
        fy: [{ k: 'door', x: 0.33, w: 18, h: 44, trim: 0xa8a294 }, { k: 'win', x: 0.76, y: 24, w: 14, h: 22, sill: 0xb8ae9c, frame: 0x4d3528, curtain: 0xa84a3a }], fx: [{ k: 'win', x: 0.5, y: 24, w: 14, h: 22, sill: 0xb8ae9c, frame: 0x4d3528, curtain: 0xd9c070 }] });
      B.barrel(x + 2.1, y + 1.7); B.crate(x + 2.2, y + 0.9); haystack(x - 2.7, y + 1.9, 1.0); haystack(x + 3.4, y - 0.4, 0.9); B.bench(x - 0.3, y + 1.9, 'x'); F.stump(x + 3.2, y + 1.5); }
    { const [x, y] = at(25.2, 44.0); chapel(x - 1.25, y - 1.5); }
    // pavilions and racks of the two camps behind their lines
    for (const tm of [0, 1]) {
      const sg = tm ? 1 : -1;
      { const [x, y] = at(sg * 34, 45.6); pavilion(x, y, 1.15, tm, true); }
      { const [x, y] = at(sg * 30.2, 45.9); pavilion(x, y, 0.85, tm, false); }
      { const [x, y] = at(sg * 38, 46.0); pavilion(x, y, 0.9, tm, true); }
      { const [x, y] = at(sg * 36.1, 47.3); rack(x - 0.5, y); } { const [x, y] = at(sg * 31.9, 47.3); B.barrel(x, y); B.crate(x + 0.4, y - 0.55, 0, 0.44); B.sack(x - 0.5, y + 0.1); }
      // end of the field: ridge tents, supplies, a cart
      { const [x, y] = at(sg * 44.3, 54.5); ridgeTent(x - 0.9, y - 1.1, 1.8, 2.2, 1.3, 'y', tm); }
      { const [x, y] = at(sg * 44.4, 62.5); ridgeTent(x - 1.1, y - 0.9, 2.2, 1.8, 1.25, 'x', tm); }
      { const [x, y] = at(sg * 44.4, 69.6); ridgeTent(x - 0.85, y - 1.0, 1.7, 2.0, 1.2, 'y', tm); }
      { const [x, y] = at(sg * 43.6, 58.6); B.crate(x, y); B.barrel(x + 0.75, y - 0.2); B.sack(x - 0.3, y + 0.7); flags.push({ x: x + 0.3, y: y + 1.1, z: 0, team: tm, pole: 2.3, kind: 1 }); }
      { const [x, y] = at(sg * 43.8, 66.2); rack(x - 0.5, y); B.barrel(x + 0.9, y + 0.5); }
      { const [x, y] = at(sg * 44.2, 73.6); B.cart(x - 0.7, y - 0.4); }
      { const [x, y] = at(sg * 44.6, 50.4); B.crate(x, y, 0, 0.46); B.crate(x + 0.5, y + 0.1); B.crate(x + 0.2, y + 0.05, 0.42, 0.4); B.sack(x + 1.0, y + 0.6); }
      for (const p of [[45.3, 48.2, 1.5], [45.5, 59.3, 1.25], [45.6, 66.6, 1.4], [45.2, 76.6, 1.3]]) { const [x, y] = at(sg * p[0], p[1]); if (p[2] > 1.35) B.tree(x, y, { s: p[2], pal: T.LEAF_G, flowers: null, n: 10 }); else F.birch(x, y, p[2] * 0.85); }
    }
    // hedge and shrubs between the field and the far scenery
    for (let d = D0; d < D1; d += 0.62) {
      const s = 47.25 + Math.sin(d * 0.9) * 0.16, ad = Math.abs(d);
      if (Math.abs(d - roadD(47)) < 2.1 || (ad > 27.5 && ad < 42.5) || (d > -12 && d < -5.5) || (d > 10.5 && d < 18) || (d > 22 && d < 29) || h2(d * 10 | 0, 71) < 0.12) continue;
      const [x, y] = at(d, s); B.bush(x, y, { s: 0.85 + h2(d * 10 | 0, 72) * 0.5, n: 4, pal: (d * 10 | 0) % 5 ? T.LEAF_D : T.LEAF_G, flowers: (d * 10 | 0) % 4 ? null : T.FLOWERS, fp: 0.12, noBlock: true });
    }
    // tree line: [d0, d1, s limit] keeps the buildings and pavilions in front of it
    const KO = [[-13.5, -4.5, 42.6], [8.5, 19.5, 41.2], [21, 30, 41.0], [-41, -27, 43.6], [27, 41, 43.6]];
    const placed = [];
    for (let i = 0; i < 2600; i++) {
      const d = D0 - 1.5 + h2(i, 811) * (D1 - D0 + 3), s = 33 + h2(i, 812) * 13.4, r = h2(i, 813);
      if (Math.abs(d - roadD(s)) < 1.5 && s > 39) continue;
      if (KO.some(k => d > k[0] && d < k[1] && s > k[2])) continue;
      const [x, y] = at(d, s), big = r < 0.5;
      if (placed.some(p => Math.hypot(p[0] - x, p[1] - y) < (big ? 1.25 : 1.0))) continue;
      placed.push([x, y]);
      if (r < 0.5) B.tree(x, y, { s: 1.25 + h2(i, 814) * 0.55, pal: [T.LEAF_D, T.LEAF_G, T.LEAF_D, T.LEAF_Y, T.LEAF_G][i % 5], flowers: null, n: 10 });
      else if (r < 0.82) F.pine(x, y, 0, 0.95 + h2(i, 814) * 0.45); else F.birch(x, y, 0.95 + h2(i, 814) * 0.3);
    }

    /* --- near edge: only low things --- */
    const rd = roadD(74.3);
    fence(D0, rd - 2.0, 74.3); fence(rd + 2.0, 21.5, 74.3); fence(24.5, D1, 74.3);
    { const [x, y] = at(23, 74.5); B.box(x - 0.6, y + 0.1, 0, 0.9, 0.07, 0.07, { side: T.flat(0x7a5a40) }); F.boulder(x + 0.5, y - 0.1, 0.2); }     // broken gap
    for (let i = 0; i < 170; i++) {
      const d = D0 + h2(i, 601) * (D1 - D0), s = 74.9 + h2(i, 602) * 3.4, [x, y] = at(d, s), r = h2(i, 603);
      if (Math.abs(d - roadD(s)) < 1.8) continue;
      if (r < 0.34) B.bush(x, y, { s: 0.6 + h2(i, 604) * 0.5, n: 3, pal: T.LEAF_D, flowers: i % 3 ? null : T.FLOWERS, fp: 0.14, noBlock: true });
      else if (r < 0.5) F.fern(x, y, 0.5 + h2(i, 604) * 0.4);
      else if (r < 0.68) F.boulder(x, y, 0.12 + h2(i, 604) * 0.22);
      else if (r < 0.9) for (let j = 0; j < 5; j++) { const fx = x + (h2(i, 905 + j) - 0.5) * 0.7, fy = y + (h2(i, 915 + j) - 0.5) * 0.7; B.flowers(fx, fy, fx + 0.01, fy + 0.01, 0.01, 1, i + j, 0.9); }
      else if (r < 0.95) F.stump(x, y); else { F.mushroom(x, y, 1.2); F.mushroom(x + 0.16, y + 0.07, 0.8); }
    }
    { const [x, y] = at(-17, 76.2); F.log(x, y, 2.2); } { const [x, y] = at(31, 76.6); F.log(x, y, 1.9); }
    // signpost where the road leaves the field
    { const [x, y] = at(rd + 2.4, 73.7); B.box(x - 0.05, y - 0.05, 0, 0.1, 0.1, 1.2, { side: T.wood, P: { c: 0x6a4a34 } }); B.box(x - 0.5, y - 0.03, 0.9, 0.66, 0.06, 0.2, { side: T.flat(0x9a7a50), noShadow: true }); }
    for (let i = 0; i < 26; i++) { const d = D0 + 3 + h2(i, 701) * 86, [x, y] = at(d, 47 + h2(i, 702) * 28); if (B.flies) B.flies.push([x, y, 0.5 + h2(i, 703) * 1.2, i * 3]); }
  }

  function inside(x, y, pad) {
    const d = x - y, s = x + y; pad = pad || 0;
    if (d < FIELD.d0 || d > FIELD.d1 || s < FIELD.s0 || s > FIELD.s1) return false;
    const o = Battlefield.obst;
    for (let i = 0; i < o.length; i++) { const dx = x - o[i].x, dy = y - o[i].y, r = o[i].r + pad; if (dx * dx + dy * dy < r * r) return false; }
    return true;
  }

  const pts = []; for (const d of [D0 - 2, D1 + 2]) for (const s of [30, S1 + 1]) for (const z of [0, 7.4]) pts.push([(s + d) / 2, (s - d) / 2, z]);
  Battlefield.view = { d0: D0, d1: D1, s0: S0, s1: S1, z: ZV };
  Battlefield.bounds = Object.assign([-11, -11, 64, 64, 7.4], { pts, sms: 26 });
  Battlefield.W2 = W2;
  Battlefield.field = FIELD;
  Battlefield.zones = ZONES;
  Battlefield.inside = inside;
  Battlefield.obst = [];
  Battlefield.flags = [];        // camp standards: [{x, y, z, team, pole, kind}] — draw with Troops.banner(x, y, team, time, kind, z, pole)
  Battlefield.king = W2(-33, 60.5);
  Battlefield.light = { L: [-0.45, 0.75, 0.8], sun: [0.98, 0.86, 0.54], amb: [0.45, 0.5, 0.58], fill: [0.14, 0.13, 0.11], night: false, lamp: 0.25, bg: [20, 17, 26] };
  Battlefield.build = build;
})();
