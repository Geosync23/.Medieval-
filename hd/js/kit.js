'use strict';
/*
 * Castle building kit: floors (which also define where people can walk and at what height), cut-away
 * interior walls with real light through the windows, low partitions, stairs, portals between areas,
 * and exterior parts (curtain walls you can walk on, towers, merlons).
 *
 * Only faces toward +x, +y and +z are ever seen.  "wallX" is a wall whose visible face is the plane
 * x = const (it looks toward +x); "wallY" likewise for y.
 */
const Kit = {};
(function () {
  const Q = E.quad, h2 = E.h2, mul = T.mul, U = 32, V = 40;
  let A = null;
  Kit.begin = function (a) { A = a; a.floors = []; a.ramps = []; a.portals = []; a.roster = []; };
  Kit.area = () => A;

  /* ---------- floor textures (x, y in world units) ---------- */
  Kit.tiles = (S, cA, cB) => (x, y) => { const tx = Math.floor(x * U), ty = Math.floor(y * U), cx = Math.floor(tx / S), cy = Math.floor(ty / S), lx = tx - cx * S, ly = ty - cy * S; if (lx === 0 || ly === 0) return 0x4a4650; let f = 0.93 + h2(cx, cy) * 0.12 - (h2(tx, ty) < 0.05 ? 0.06 : 0); if (lx === 1 || ly === S - 1) f *= 1.07; else if (lx === S - 1 || ly === 1) f *= 0.92; return mul(((cx + cy) & 1) ? cA : cB, f); };
  Kit.diag = (S, cA, cB) => { const t = Kit.tiles(S, cA, cB); return (x, y) => t(x + y, y - x + 200); };
  Kit.flags = (tint) => (x, y) => { const tx = Math.floor(x * U), ty = Math.floor(y * U), row = Math.floor(ty / 14), off = (h2(row, 5) * 20) | 0, col = Math.floor((tx + off) / 22), lx = tx + off - col * 22, ly = ty - row * 14; if (lx === 0 || ly === 0) return 0x4e4a52; let c = T.mix([0x9d978c, 0x8f8a82, 0xa8a193, 0x857f78][(h2(col, row) * 4) | 0], tint || 0x9d978c, tint ? 0.4 : 0), f = 0.94 + h2(tx, ty) * 0.08; if (lx === 1 || ly === 13) f *= 1.07; else if (lx === 21 || ly === 1) f *= 0.9; if (h2(col, row + 9) < 0.15 && Math.abs(lx - ly - 3) < 1) f *= 0.8; return mul(c, f); };
  Kit.planks = (c) => (x, y) => T.planks(x, y, c || 0x8a6846);
  Kit.earth = (x, y) => T.dirt(x, y);
  Kit.carpet = (c1, c2, c3) => (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * U), Wt = Math.round(q.ul * U), Ht = Math.round(q.vl * U), e = Math.min(X, Y, Wt - 1 - X, Ht - 1 - Y); if (e < 2) return c3; if (e < 6) return c2; if (e < 8) return c3; if ((X + Y) % 32 < 2 || (X - Y + 3200) % 32 < 2) return mul(c1, 0.8); return mul(c1, 0.95 + h2(X >> 1, Y >> 1) * 0.08); };

  /* ---------- floors: geometry + walkable surface ---------- */
  Kit.floor = function (x0, y0, x1, y1, tex, z, o) {
    z = z || 0; o = o || {};
    Q([x0, y0, z], [x1 - x0, 0, 0], [0, y1 - y0, 0], (s, t) => tex(s + x0, t + y0), { n: [0, 0, 1], noShadow: o.noShadow });
    if (!o.noWalk) A.floors.push([x0, y0, x1, y1, z]);
  };
  Kit.walk = (x0, y0, x1, y1, z) => A.floors.push([x0, y0, x1, y1, z || 0]);          // walkable, no new geometry
  Kit.rug = function (x0, y0, x1, y1, z, c1, c2, c3) { Q([x0, y0, (z || 0) + 0.014], [x1 - x0, 0, 0], [0, y1 - y0, 0], Kit.carpet(c1 || 0xa82a2e, c2 || 0xd9a83a, c3 || 0x7a1c22), { n: [0, 0, 1], noShadow: true }); };

  /* ---------- walls ---------- */
  const STONE = (seed, o) => Object.assign({ mat: 'stone', seed: seed || 1, tint: 0xa39c90, band: 52 }, o || {});
  Kit.STONE = STONE;
  const noGlass = (s, t, q, a, b) => { const c = T.facade(s, t, q, a, b); return (c >> 24) & E.F_WIN ? -1 : c; };
  const CAP = T.flat(0x3a3640);
  // full-height back wall; o.light = let the sun through its glass (window-shaped light on the floor)
  Kit.wallX = function (x, y0, y1, z, h, P, o) {
    o = o || {}; const t = o.t || 0.5; P = P || STONE(7);
    B.box(x - t, y0, z, t, y1 - y0, h, { side: T.facade, Px: P, P: STONE(P.seed + 1), noShadow: !!o.light, top: o.top || CAP });
    if (o.light) Q([x, y1, z], [0, -(y1 - y0), 0], [0, 0, h], noGlass, { P, shadowOnly: true, cut: true });
    B.block(x - t, y0, t, y1 - y0, z);
  };
  Kit.wallY = function (y, x0, x1, z, h, P, o) {
    o = o || {}; const t = o.t || 0.5; P = P || STONE(9);
    B.box(x0, y - t, z, x1 - x0, t, h, { side: T.facade, Py: P, P: STONE(P.seed + 1), noShadow: !!o.light, top: o.top || CAP });
    if (o.light) Q([x0, y, z], [x1 - x0, 0, 0], [0, 0, h], noGlass, { P, shadowOnly: true, cut: true });
    B.block(x0, y - t, x1 - x0, t, z);
  };
  // roof and near-side walls exist only for the sun: an interior is lit through its windows and by its lamps
  Kit.enclose = function (x0, y0, x1, y1, z, h) {
    Q([x0 - 0.6, y0 - 0.6, z + h], [x1 - x0 + 1.2, 0, 0], [0, y1 - y0 + 1.2, 0], T.flat(0), { shadowOnly: true });
    Q([x0 - 0.6, y1, z], [x1 - x0 + 1.2, 0, 0], [0, 0, h], T.flat(0), { shadowOnly: true });
    Q([x1, y0 - 0.6, z], [0, y1 - y0 + 1.2, 0], [0, 0, h], T.flat(0), { shadowOnly: true });
  };
  // low cut-away wall. axis 'x' = runs along x at y = c;  axis 'y' = runs along y at x = c.  gaps: [[from, to], ...] openings
  Kit.part = function (axis, c, a0, a1, z, o) {
    o = o || {}; const h = o.h || 1.1, t = o.t || 0.26, P = o.P || STONE(o.seed || 23, { band: 0, tint: o.tint || 0x9a938a }), gaps = (o.gaps || []).slice().sort((p, q) => p[0] - q[0]);
    const seg = (s0, s1) => { if (s1 - s0 < 0.05) return; if (axis === 'x') { B.box(s0, c - t / 2, z, s1 - s0, t, h, { side: T.facade, P, top: CAP }); B.block(s0, c - t / 2, s1 - s0, t, z); } else { B.box(c - t / 2, s0, z, t, s1 - s0, h, { side: T.facade, P, top: CAP }); B.block(c - t / 2, s0, t, s1 - s0, z); } };
    let p = a0; for (const g of gaps) { seg(p, g[0]); p = g[1];
      for (const e of [g[0] - 0.12, g[1]]) { if (axis === 'x') B.box(e, c - t / 2 - 0.03, z, 0.12, t + 0.06, h + 0.25, { side: T.facade, P: STONE(31, { band: 0, tint: 0xb8b0a0 }), top: CAP }); else B.box(c - t / 2 - 0.03, e, z, t + 0.06, 0.12, h + 0.25, { side: T.facade, P: STONE(31, { band: 0, tint: 0xb8b0a0 }), top: CAP }); } }
    seg(p, a1);
  };
  // the cut edge of the two near walls
  Kit.stub = function (x0, y0, x1, y1, z, o) {
    o = o || {}; const P = STONE(41, { band: 0, tint: 0x8a857c }), h = o.h || 0.32, gx = o.gapsX || [], gy = o.gapsY || [];
    const run = (a0, a1, gaps, fn) => { let p = a0; for (const g of gaps.slice().sort((p1, q) => p1[0] - q[0])) { if (g[0] > p) fn(p, g[0]); p = g[1]; } if (a1 > p) fn(p, a1); };
    run(x0, x1 + 0.4, gy, (a, b) => { B.box(a, y1, z, b - a, 0.4, h, { side: T.facade, P, top: CAP, noShadow: true }); B.block(a, y1, b - a, 0.4, z); });
    run(y0, y1, gx, (a, b) => { B.box(x1, a, z, 0.4, b - a, h, { side: T.facade, P, top: CAP, noShadow: true }); B.block(x1, a, 0.4, b - a, z); });
  };

  /* ---------- stairs ---------- */
  // dir: '+x' | '-x' | '+y' | '-y' = the direction in which the flight RISES.  (x, y, w, d) is its footprint.
  Kit.stairs = function (x, y, w, d, dir, z0, z1, o) {
    o = o || {}; const ax = dir[1], up = dir[0] === '+', len = ax === 'x' ? w : d, n = Math.max(2, Math.round((z1 - z0) / 0.19)), P = o.P || STONE(53, { band: 0, tint: o.tint || 0xb0a898 }), base = o.base === undefined ? z0 : o.base;
    const top = (s, t) => mul(0xbdb5a4, 0.95 + h2(Math.floor(s * U) >> 2, Math.floor(t * U) >> 2) * 0.1);
    for (let i = 0; i < n; i++) { const a = len * i / n, b = len / n, hh = z0 + (i + 1) * (z1 - z0) / n - base, p = up ? a : len - a - b; if (ax === 'x') B.box(x + p, y, base, b, d, hh, { side: T.facade, P, top }); else B.box(x, y + p, base, w, b, hh, { side: T.facade, P, top }); }
    A.ramps.push({ x0: x, y0: y, x1: x + w, y1: y + d, z0, z1, ax, up });
  };
  // a dark opening in the floor with steps going down (the way to a lower area)
  Kit.stairwell = function (x, y, w, d, z, dir) {
    const ax = dir[1];
    Q([x, y, z + 0.012], [w, 0, 0], [0, d, 0], (s, t) => { const u = ax === 'x' ? s / w : t / d, k = dir[0] === '+' ? u : 1 - u, st = Math.floor(k * 7); return mul(0x8a8478, Math.max(0.12, 0.85 - st * 0.12) * ((k * 7) % 1 < 0.14 ? 0.7 : 1)); }, { n: [0, 0, 1], noShadow: true });
    for (const e of [[x - 0.1, y - 0.1, w + 0.2, 0.1], [x - 0.1, y + d, w + 0.2, 0.1], [x - 0.1, y, 0.1, d], [x + w, y, 0.1, d]]) B.box(e[0], e[1], z, e[2], e[3], 0.1, { side: T.flat(0x6a655e), noShadow: true });
  };

  /* ---------- portals and people ---------- */
  // o: { to: areaId, at: portalName in that area, name: this portal's name, label, r, ex, ey (where to stand after arriving) }
  Kit.portal = function (x, y, z, o) { A.portals.push(Object.assign({ x, y, z: z || 0, r: 0.55 }, o)); };
  // o: { role, name, kinds: ['work','sit',...], at: [x,y,z] } — a member of staff who lives in this area
  Kit.person = function (o) { A.roster.push(o); };

  /* ---------- exterior parts ---------- */
  const CS = (seed, o) => Object.assign({ mat: 'stone', seed, tint: 0xa8a49c, band: 60, quoin: false }, o || {});
  Kit.CS = CS;
  const paving = Kit.flags();
  Kit.paving = paving;
  function merlons(axis, c, a0, a1, z, t, skip) { for (let a = a0 + 0.08; a < a1 - 0.3; a += 0.66) { if (skip && skip.some(g => a + 0.36 > g[0] && a < g[1])) continue; if (axis === 'x') B.box(a, c, z, 0.36, t, 0.42, { side: T.facade, P: CS(4, { band: 0 }), top: T.flat(0xb4ad9e) }); else B.box(c, a, z, t, 0.36, 0.42, { side: T.facade, P: CS(5, { band: 0 }), top: T.flat(0xb4ad9e) }); } }
  Kit.merlons = merlons;
  // curtain wall with a wall-walk on top.  axis 'x' runs along x (visible face looks +y), axis 'y' runs along y.
  // o.feats: features on the visible face; o.gate: [from, to] leaves the walk intact but opens the wall base for pathing
  Kit.curtain = function (axis, c, a0, a1, h, th, o) {
    o = o || {}; th = th || 1.6; const P = CS(o.seed || 31, { feats: o.feats }), z = o.z || 0;
    if (axis === 'x') { B.box(a0, c, z, a1 - a0, th, h, { side: T.facade, Py: P, Px: CS(32), top: (s, t) => paving(s + a0, t + c) }); merlons('x', c + th - 0.22, a0, a1, z + h, 0.22, o.openHi); merlons('x', c, a0, a1, z + h, 0.22, o.openLo); A.floors.push([a0, c + 0.22, a1, c + th - 0.22, z + h]); for (const g of o.openHi || []) A.floors.push([g[0], c + th - 0.4, g[1], c + th + 0.2, z + h]); for (const g of o.openLo || []) A.floors.push([g[0], c - 0.2, g[1], c + 0.4, z + h]); if (!o.gate) B.block(a0, c, a1 - a0, th, z); else { B.block(a0, c, o.gate[0] - a0, th, z); B.block(o.gate[1], c, a1 - o.gate[1], th, z); } }
    else { B.box(c, a0, z, th, a1 - a0, h, { side: T.facade, Px: P, Py: CS(34), top: (s, t) => paving(s + c, t + a0) }); merlons('y', c + th - 0.22, a0, a1, z + h, 0.22, o.openHi); merlons('y', c, a0, a1, z + h, 0.22, o.openLo); A.floors.push([c + 0.22, a0, c + th - 0.22, a1, z + h]); for (const g of o.openHi || []) A.floors.push([c + th - 0.4, g[0], c + th + 0.2, g[1], z + h]); for (const g of o.openLo || []) A.floors.push([c - 0.2, g[0], c + 0.4, g[1], z + h]); if (!o.gate) B.block(c, a0, th, a1 - a0, z); else { B.block(c, a0, th, o.gate[0] - a0, z); B.block(c, o.gate[1], th, a1 - o.gate[1], z); } }
  };
  const slit = (X, Y) => (Y >= 0 && Y < 18 && Math.abs(X) < 2) ? 0x1d1924 : (Y >= -2 && Y < 20 && Math.abs(X) < 4) ? 0xb0a898 : -2;
  Kit.towerTex = function (seed, levels, lit) {
    return function (s, t, q) {
      const X = Math.floor(s * U), Y = Math.floor(t * V), Ht = Math.round(q.vl * V), cell = Math.floor(X / 52), lx = X - cell * 52 - 26;
      for (const ly of levels) { if (h2(cell + seed, ly) >= 0.6) continue; if (lit && Y >= ly && Y < ly + 16 && Math.abs(lx + 0.5) < 4.4) return (Y - ly > 11 && Math.abs(lx + 0.5) > 2.4) ? T.stoneAt(X, Y, seed, 0xa8a49c) : (((lx + Y) % 5 === 0 ? 0x1a1e28 : 0x2a2638) | (E.F_WIN << 24)); const c = slit(lx, Y - ly); if (c !== -2) return c; }
      if (Y >= Ht - 4) return mul(0xb9b1a0, Y === Ht - 1 ? 1.1 : 0.9);
      return mul(T.stoneAt(X, Y, seed, 0xa8a49c), 1 - 0.2 * Math.max(0, 1 - Y / 16));
    };
  };
  // round tower with a platform you can stand on (o.roof = conical cap instead; then no platform)
  Kit.tower = function (cx, cy, r, h, o) {
    o = o || {}; const n = o.n || 16, seed = o.seed || 7, z = o.z || 0;
    B.cyl(cx, cy, z, r, h, n, Kit.towerTex(seed, o.levels || [56, 136, 216], o.lit !== false), {});
    B.cyl(cx, cy, z + h, r + 0.2, 0.5, n, Kit.towerTex(seed + 1, []), { top: (s, t) => paving(s + cx, t + cy) });
    if (o.roof) { B.cyl(cx, cy, z + h + 0.5, r - 0.05, 0.6, n, Kit.towerTex(seed + 2, [4], true), {}); B.cone(cx, cy, z + h + 1.1, r + 0.35, o.roofH || r * 2.3, n, T.roof, { P: { pal: o.roof, seed } }); B.flags.push({ x: cx, y: cy, z: z + h + 1.1 + (o.roofH || r * 2.3), c: o.flag || 0xc23b3b }); }
    else { const m = Math.round(n * 0.75); for (let i = 0; i < m; i++) { const a = i / m * 6.283 + 0.2, rr = r + 0.04; B.box(cx + Math.cos(a) * rr - 0.17, cy + Math.sin(a) * rr - 0.17, z + h + 0.5, 0.34, 0.34, 0.42, { side: T.facade, P: CS(6, { band: 0 }), top: T.flat(0xb4ad9e) }); } const q = r * 0.66; A.floors.push([cx - q, cy - q, cx + q, cy + q, z + h + 0.5]); if (o.flag) B.flags.push({ x: cx, y: cy, z: z + h + 0.5, c: o.flag, pole: 1.7 }); }
    B.blockC(cx, cy, r + 0.05, z);
  };
  // square stone block of building with a walkable flat roof and a parapet (keeps, gatehouses, turrets)
  Kit.block = function (x, y, w, d, h, o) {
    o = o || {}; const z = o.z || 0, seed = o.seed || 60;
    B.box(x, y, z, w, d, h, { side: T.facade, Px: CS(seed, { feats: o.fx, quoin: true, band: o.band || 64 }), Py: CS(seed + 1, { feats: o.fy, quoin: true, band: o.band || 64 }), top: (s, t) => paving(s + x, t + y) });
    if (!o.noParapet) { merlons('x', y + d - 0.22, x, x + w, z + h, 0.22); merlons('x', y, x, x + w, z + h, 0.22); merlons('y', x + w - 0.22, y, y + d, z + h, 0.22); merlons('y', x, y, y + d, z + h, 0.22); }
    if (o.walk !== false) A.floors.push([x + 0.24, y + 0.24, x + w - 0.24, y + d - 0.24, z + h]);
    B.block(x, y, w, d, z);
  };
})();
