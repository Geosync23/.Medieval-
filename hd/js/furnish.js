'use strict';
/*
 * Fz — furniture and decoration library for the castle (HD renderer: 32 texels per unit across, 40 up).
 *
 *   Fz.name(x, y, z, o)
 *
 * ANCHOR (see Fz.list[i].anchor, and the comment above each prop):
 *   'corner'  (x, y) is the MIN corner of the footprint.  Fz.list gives w (along x) and d (along y) for
 *             face 'y'; with face 'x' / '-x' the footprint is d wide and w deep.  Fz.size(name, o) returns
 *             the world footprint [sizeX, sizeY] for a given option set.
 *   'centre'  (x, y) is the centre.
 *   'wall'    wall-mounted.  face 'y': the wall's visible surface is the plane y = given y, the prop is
 *             centred on the given x and sticks out toward +y.  face 'x': the wall is the plane x = given x,
 *             centred on the given y, sticking out toward +x.  o.h = mounting height above the floor z.
 * z is always the height of the floor the prop stands on (or of the floor under a wall-mounted prop).
 *
 * o.face: 'y' (default) or 'x' = the direction the prop's FRONT looks toward.  The front is the side people
 * use it from (a wardrobe's doors, the open side of a hearth) or, for seats and beds, the way the sitter
 * looks / the feet point.  '-y' and '-x' are also accepted for free-standing props (a chair seen from behind).
 * face 'x' is the exact mirror image of face 'y'.
 *
 * Registers:  B.blocks.push([x, y, w, d, z])          solid footprints (z = floor height)
 *             B.pois.push({ x, y, z, kind, fx, fy, sit?, ax?, ay? })
 *                 sit = ABSOLUTE height of the seat / mattress top when the person should be drawn seated or
 *                 lying; (ax, ay) = a free spot next to the prop from which a seat inside a block is reached.
 *             E.addLight / B.flames for lamps and fire.
 * Props may be nested: inside a prop, Fz calls are in the parent's local frame.
 *
 * Every prop also takes o.s = uniform scale (default 1).  Fz.list = [{ name, w, d, anchor, solid, note }].
 * POI kinds used: sit sleep eat work cook read pray train guard bathe play drink tend smith stable pris.
 * A sleep poi's (fx, fy) points from head to feet.
 */
const Fz = {};
(function () {
  const Q = E.quad, h2 = E.h2, norm = E.norm, mul = T.mul, mix = T.mix, flat = T.flat, U = 32, V = 40;
  const FE = E.F_EMIS << 24, FWA = E.F_WATER << 24, NOAO = E.F_NOAO << 24;
  Fz.list = [];

  /* ================= local frame ================= */
  let fr = { a: 1, b: 0, c: 0, d: 1, x: 0, y: 0, z: 0, s: 1 }; const stack = [];
  function enter(x, y, z, face, D, sc) {
    let a = 1, b = 0, c = 0, d = 1, tx = x, ty = y; sc = sc || 1;
    if (face === 'x') { a = 0; b = 1; c = 1; d = 0; }
    else if (face === '-y') { d = -1; ty = y + D * sc; }
    else if (face === '-x') { a = 0; b = -1; c = 1; d = 0; tx = x + D * sc; }
    a *= sc; b *= sc; c *= sc; d *= sc;
    const p = fr; stack.push(p);
    fr = { a: p.a * a + p.b * c, b: p.a * b + p.b * d, c: p.c * a + p.d * c, d: p.c * b + p.d * d, x: p.a * tx + p.b * ty + p.x, y: p.c * tx + p.d * ty + p.y, z: p.z + z * p.s, s: p.s * sc };
  }
  const wx = (lx, ly) => fr.a * lx + fr.b * ly + fr.x, wy = (lx, ly) => fr.c * lx + fr.d * ly + fr.y;
  const pt = p => [wx(p[0], p[1]), wy(p[0], p[1]), p[2] * fr.s + fr.z];
  const vc = v => [fr.a * v[0] + fr.b * v[1], fr.c * v[0] + fr.d * v[1], v[2] * fr.s];
  const nv = v => [(fr.a * v[0] + fr.b * v[1]) / fr.s, (fr.c * v[0] + fr.d * v[1]) / fr.s, v[2]];          // normals: turn, do not scale
  /* run fn in a sub-frame at local (x, y, z), scaled by sc */
  function sub(x, y, z, sc, fn) { enter(x, y, z, 'y', 0, sc); try { fn(); } finally { fr = stack.pop(); } }
  const ANCH = { r: 'corner', R: 'corner', c: 'centre', C: 'centre', w: 'wall', W: 'wall' };
  const sizes = {};
  /* kind: r = rect, solid | R = rect, blocks itself (or not at all) | c = round, solid | C = round, not solid | w = on a wall | W = on a wall + solid */
  function def(name, kind, size, note, fn) {
    const sz = typeof size === 'function' ? size : () => size, s0 = sz({});
    sizes[name] = sz;
    Fz.list.push({ name, w: Math.round(s0[0] * 100) / 100, d: Math.round(s0[1] * 100) / 100, anchor: ANCH[kind], solid: 'rcW'.indexOf(kind) >= 0, note });
    Fz[name] = function (x, y, z, o) {
      o = o || {}; const s = sz(o), w = s[0], d = s[1]; let face = o.face || 'y';
      if (ANCH[kind] === 'wall' && face[0] === '-') face = face.slice(1);
      enter(x, y, z || 0, face, kind === 'r' || kind === 'R' ? d : 0, o.s);
      try {
        if (kind === 'r') block(0, 0, w, d); else if (kind === 'c') block(-w / 2, -d / 2, w, d); else if (kind === 'W') block(-w / 2, 0, w, d);
        return fn(o, w, d);
      } finally { fr = stack.pop(); }
    };
  }
  Fz.size = function (name, o) { const s = sizes[name](o || {}), f = (o && o.face) || 'y', k = (o && o.s) || 1; return f === 'x' || f === '-x' ? [s[1] * k, s[0] * k] : [s[0] * k, s[1] * k]; };

  /* ================= primitives (all in the local frame) ================= */
  function quad(o, u, v, tex, opt) { opt = opt || {}; if (opt.n) opt.n = nv(opt.n); return Q(pt(o), vc(u), vc(v), tex, opt); }
  function side(o, u, v, n, tex, O) {          // vertical face: drawn when it looks toward the camera, else shadow only
    const N = nv(n);
    if (N[0] + N[1] > 0) Q(pt(o), vc(u), vc(v), tex, { n: N, noShadow: O.noShadow, cut: O.cut, f: O.f || 0, P: O.P });
    else if (!O.noShadow) Q(pt(o), vc(u), vc(v), tex, { shadowOnly: true, cut: O.cut, P: O.P });
  }
  function box(x, y, z, w, d, h, O) {
    if (typeof O === 'function') O = { side: O };
    const s = O.side;
    side([x, y + d, z], [w, 0, 0], [0, 0, h], [0, 1, 0], O.ty || s, O);
    side([x + w, y + d, z], [0, -d, 0], [0, 0, h], [1, 0, 0], O.tx || s, O);
    side([x + w, y, z], [-w, 0, 0], [0, 0, h], [0, -1, 0], O.by || s, O);
    side([x, y, z], [0, d, 0], [0, 0, h], [-1, 0, 0], O.bx || O.tx || s, O);
    if (!O.noTop) quad([x, y, z + h], [w, 0, 0], [0, d, 0], O.top || s, { n: [0, 0, 1], noShadow: O.noShadow, f: O.f || 0, P: O.P });
  }
  const nb = (x, y, z, w, d, h, tex, top) => box(x, y, z, w, d, h, { side: tex, top, noShadow: true });   // small detail, no shadow
  function disk(cx, cy, z, r, tex, O) { O = O || {}; quad([cx - r, cy - r, z], [2 * r, 0, 0], [0, 2 * r, 0], T.disk(O.inner || 0, tex), { n: [0, 0, 1], cut: true, noShadow: O.noShadow !== false, f: O.f || 0 }); }
  /* vertical frustum (r1 = r0: cylinder, r1 = 0: cone) */
  function frust(cx, cy, z, r0, r1, h, n, tex, O) {
    O = O || {}; const st = 6.28318 / n, a0 = 2.35619 + (O.rot || 0), seg = 2 * Math.max(r0, r1) * Math.sin(Math.PI / n), sl = Math.hypot(h, r0 - r1);
    for (let i = 0; i < n; i++) {
      const a = a0 - i * st, b = a - st, am = a - st / 2, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), s0 = i * seg;
      const N = nv([Math.cos(am), Math.sin(am), 0]), vis = N[0] + N[1] > -0.05;
      if (!vis && O.noShadow) continue;
      const p0 = pt([cx + r0 * ca, cy + r0 * sa, z]), p1 = pt([cx + r0 * cb, cy + r0 * sb, z]);
      const nn = vis ? norm([N[0] * h, N[1] * h, r0 - r1]) : undefined;
      if (r0 === r1) { Q(p0, [p1[0] - p0[0], p1[1] - p0[1], 0], [0, 0, h * fr.s], tex, { n: nn, shadowOnly: !vis, noShadow: O.noShadow, s0, f: O.f || 0 }); continue; }
      const t0 = pt([cx + r1 * ca, cy + r1 * sa, z + h]), t1 = pt([cx + r1 * cb, cy + r1 * sb, z + h]);
      Q(p0, [p1[0] - p0[0], p1[1] - p0[1], 0], [t0[0] - p0[0], t0[1] - p0[1], h * fr.s], (s, t, q, u, v) => tex(s0 + u * seg, v * sl, q, u, v), { n: nn, tri: true, shadowOnly: !vis, noShadow: O.noShadow, f: O.f || 0 });
      if (r1 > 0) Q(t1, [t0[0] - t1[0], t0[1] - t1[1], 0], [p1[0] - t1[0], p1[1] - t1[1], -h * fr.s], (s, t, q, u, v) => tex(s0 + (1 - u) * seg, (1 - v) * sl, q, u, v), { n: nn, tri: true, shadowOnly: !vis, noShadow: O.noShadow, f: O.f || 0 });
    }
    if (O.top) disk(cx, cy, z + h, r1, O.top, { inner: O.inner, noShadow: true, f: O.f });
  }
  const cyl = (cx, cy, z, r, h, n, tex, O) => frust(cx, cy, z, r, r, h, n, tex, O);
  /* horizontal cylinder along local y (O.ax = 'x': along local x; then cx is the y of the axis and y0 the x it starts at) */
  function hcyl(cx, y0, cz, r, len, n, tex, O) {
    O = O || {}; const X = O.ax === 'x', st = 6.28318 / n, seg = 2 * r * Math.sin(Math.PI / n);
    const P = (a, l, h) => X ? [l, a, h] : [a, l, h];
    for (let i = 0; i < n; i++) {
      const a = i * st, b = a + st, am = a + st / 2, N = nv(P(Math.cos(am), 0, Math.sin(am))), vis = N[0] + N[1] + N[2] * 0.8 > 0.02;
      if (!vis && O.noShadow) continue;
      const p0 = P(cx + r * Math.cos(a), y0, cz + r * Math.sin(a)), p1 = P(cx + r * Math.cos(b), y0, cz + r * Math.sin(b));
      Q(pt(p0), vc(P(0, len, 0)), vc([p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]]), tex, { n: vis ? N : undefined, shadowOnly: !vis, noShadow: O.noShadow, t0: i * seg, f: O.f || 0 });
    }
    if (O.cap) for (const e of [1, 0]) {
      const N = nv(P(0, e ? 1 : -1, 0)); if (N[0] + N[1] <= 0) continue;
      Q(pt(P(cx - r, y0 + (e ? len : 0), cz - r)), vc(P(2 * r, 0, 0)), [0, 0, 2 * r * fr.s], T.disk(0, O.cap), { n: N, cut: true, noShadow: true, f: O.f || 0 });
    }
  }
  let sd = 1; const BARN = norm([0.5, 0.5, 0.7]), SPRN = norm([0.35, 0.35, 0.87]);
  function blob(x, y, z, r, tex, O) { return E.blob(pt([x, y, z]), r * fr.s, tex, Object.assign({ seed: (sd++ * 7) % 997 }, O || {})); }
  /* thin rod between two local points, always turned toward the camera. th in world units (1/32 = one pixel) */
  function bar(p0, p1, th, tex, O) {
    const A = pt(p0), Bp = pt(p1), u = [Bp[0] - A[0], Bp[1] - A[1], Bp[2] - A[2]];
    const sxd = Math.abs((u[0] - u[1]) * 32), syd = Math.abs((u[0] + u[1]) * 16 - u[2] * 40);
    th *= fr.s; const v = sxd > syd * 1.3 ? [0, 0, th * 0.8] : [th / 2, -th / 2, 0];
    Q([A[0] - v[0] / 2, A[1] - v[1] / 2, A[2] - v[2] / 2], u, v, tex, Object.assign({ noShadow: true, n: BARN, f: th < 0.07 ? E.F_NOLINE : 0 }, O || {}));
  }
  /* camera-facing pixel sprite, wp x hp pixels, bottom centre at the local point. fn(X, Y) with Y up from 0 */
  function spr(x, y, z, wp, hp, fn, O) {
    const P = pt([x, y, z]), a = wp / 64 * fr.s;
    Q([P[0] - a / 2, P[1] + a / 2, P[2]], [a, -a, 0], [0, 0, hp / 40 * fr.s], (s, t, q, u, v) => fn(Math.min(wp - 1, (u * wp) | 0), Math.min(hp - 1, (v * hp) | 0)), Object.assign({ noShadow: true, n: SPRN, f: E.F_NOLINE }, O || {}));
  }
  function light(x, y, z, r, col, p) { const P = pt([x, y, z]); E.addLight(P[0], P[1], P[2], r * (0.5 + 0.5 * fr.s), col, p); }
  function fire(x, y, z, s) { const P = pt([x, y, z]); B.flames.push({ x: P[0], y: P[1], z: P[2], s: s * fr.s }); }
  function block(x, y, w, d) { const x0 = wx(x, y), y0 = wy(x, y), x1 = wx(x + w, y + d), y1 = wy(x + w, y + d); B.blocks.push([Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0), fr.z]); }
  /* person spot. (fx, fy) local facing; sit = local seat height (omit to stand); ap = [x, y] local approach point */
  function poi(x, y, kind, fx, fy, sit, ap, lz) {
    const f = vc([fx, fy, 0]), p = { x: wx(x, y), y: wy(x, y), z: fr.z + (lz || 0) * fr.s, kind, fx: f[0] / fr.s, fy: f[1] / fr.s };
    if (sit !== undefined && sit !== null) p.sit = fr.z + sit * fr.s;
    if (ap) { p.ax = wx(ap[0], ap[1]); p.ay = wy(ap[0], ap[1]); }
    B.pois.push(p); return p;
  }

  /* ---------- pixel canvas for flat art: y = 0 is the bottom row ---------- */
  function PX(W, H, bg) {
    W = Math.max(1, Math.round(W)); H = Math.max(1, Math.round(H));
    const a = new Int32Array(W * H).fill(bg === undefined ? -1 : bg);
    const o = { W, H, a,
      p(x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H) a[y * W + x] = c; return o; },
      g(x, y) { return x >= 0 && y >= 0 && x < W && y < H ? a[y * W + x] : -1; },
      r(x0, y0, x1, y1, c) { x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x >= 0 && y >= 0 && x < W && y < H) a[y * W + x] = c; return o; },
      disc(cx, cy, r, c) { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) o.p(x, y, typeof c === 'function' ? c(x, y) : c); return o; },
      ring(cx, cy, r, c) { for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) { const d = Math.hypot(x - cx, y - cy); if (Math.abs(d - r) <= 0.6) o.p(x, y, c); } return o; },
      line(x0, y0, x1, y1, c) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) o.p(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c); return o; },
      art(x, y, rows, pal) { for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) { const c = (pal || PAL)[rows[j][i]]; if (c !== undefined) o.p(x + i, y + rows.length - 1 - j, c); } return o; },
      each(fn) { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = fn(x, y, a[y * W + x]); if (c !== undefined) a[y * W + x] = c; } return o; },
      tex(s, t, q, u, v) { return a[Math.min(H - 1, (v * H) | 0) * W + Math.min(W - 1, (u * W) | 0)]; },
      fn(X, Y) { return a[Y * W + X]; },
    };
    return o;
  }
  /* upright art panel in the local xz plane at depth y (two-sided), 1 pixel of the canvas = 1 texel */
  function vart(cv, x, y, z, O) { quad([x, y, z], [cv.W / U, 0, 0], [0, 0, cv.H / V], cv.tex, Object.assign({ cut: true, noShadow: true }, O || {})); }
  /* upright art panel in the local yz plane at x */
  function sart(cv, x, y, z, O) { quad([x, y, z], [0, cv.W / U, 0], [0, 0, cv.H / V], cv.tex, Object.assign({ cut: true, noShadow: true }, O || {})); }
  function icon(x, y, z, A, O) { spr(x, y, z, A.W, A.H, A.fn, O); }

  /* ================= colours and materials ================= */
  const WOOD = 0x7a5a3c, WOOD_D = 0x5a4030, WOOD_L = 0x9a7448, OAK = 0x8a6444, WALNUT = 0x5c3f2c, IRON = 0x34343e, IRON_L = 0x4c4c58, STEEL = 0xa2a8b4, GOLD = 0xd9a83a, GOLD_L = 0xf4dc6a, BRASS = 0xb8923a;
  const RED = 0xa82a2e, BLUE = 0x34508f, GREEN = 0x3f7a46, PURPLE = 0x6a3a8a, CREAM = 0xe8dcc0, LINEN = 0xf0e8d8, STONE = 0xa8a294, STONE_L = 0xc4bdb0, CLAY = 0xa8604a, STRAW = 0xd8b85a;
  const PAL = { g: GOLD, G: 0xa87a24, y: GOLD_L, s: STEEL, S: 0x6a707c, l: 0xd8dce4, w: LINEN, W: 0xc8c0b0, k: 0x2a2630, K: 0x4a4650, r: 0xc8372f, R: 0x8a1e22, b: 0x4a70c0, B: 0x2c4078, n: WOOD, N: WOOD_D, t: 0xc9a66c, T: 0xa8844c,
    e: 0x5aa348, E: 0x356e3a, o: 0xe07a2a, p: 0xe8698a, u: 0x8a4a9a, c: CREAM, i: IRON, I: IRON_L, f: 0xffc84a | FE, F: 0xfff2a8 | FE, a: 0x6ac0e0, m: 0x9a5a30, M: 0x6a3a22, x: 0x1a1620, h: 0xf0c8a0, z: 0x77726c };
  function art(rows, pal) { const cv = PX(rows[0].length, rows.length); cv.art(0, 0, rows, pal); return cv; }
  /* shaded flat colour: light top edge, dark foot and left edge, a little noise */
  function sh(c, n) { n = n === undefined ? 0.1 : n; return (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * V), Ht = Math.round(q.vl * V), Wt = Math.round(q.ul * U); let f = 1 - n / 2 + h2(X >> 1, Y >> 1) * n; if (Y >= Ht - 1) f *= 1.13; else if (Y === 0) f *= 0.8; if (X === 0) f *= 0.86; else if (X === Wt - 1) f *= 0.93; return mul(c, f); }; }
  const wd = c => (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * V), Ht = Math.round(q.vl * V), px = X % 6; let f = (px === 0 ? 0.7 : px === 1 ? 1.08 : 0.95) + h2(X / 6 | 0, Y >> 3) * 0.14 - (h2(X, Y >> 2) < 0.07 ? 0.1 : 0); if (Y >= Ht - 1) f *= 1.12; else if (Y === 0) f *= 0.78; return mul(c, f); };          // upright boards
  const wh = c => (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * V), py = Y % 6, Wt = Math.round(q.ul * U); let f = (py === 0 ? 0.68 : py === 5 ? 1.09 : 0.95) + h2(X >> 3, Y / 6 | 0) * 0.14; if (X === 0 || X === Wt - 1) f *= 0.85; return mul(c, f); };                                                                // level boards
  const wt = c => (s, t) => { const X = Math.floor(s * U), Y = Math.floor(t * U), py = Y % 7; return mul(c, (py === 0 ? 0.7 : py === 6 ? 1.07 : 0.96) + h2(X >> 3, Y / 7 | 0) * 0.12 - (h2(X, Y) < 0.04 ? 0.08 : 0)); };                                                                                                           // table / plank top
  const metal = c => (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * V), Wt = Math.round(q.ul * U), Ht = Math.round(q.vl * V), k = Wt > 2 ? X / (Wt - 1) : 0.3; let f = k < 0.2 ? 0.95 : k < 0.42 ? 1.25 : k < 0.75 ? 1 : 0.78; if (Y >= Ht - 1) f *= 1.12; else if (Y === 0) f *= 0.75; return mul(c, f + h2(X, Y) * 0.05); };
  const gold = (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * V), Ht = Math.round(q.vl * V), r = h2(X, Y); if (r < 0.025) return GOLD_L; let f = 0.92 + h2(X >> 1, Y >> 1) * 0.14; if (Y >= Ht - 1) f *= 1.16; else if (Y === 0) f *= 0.74; if (X === 0) f *= 0.84; return mul(GOLD, f); };
  const cloth = (c, w) => (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * V), Ht = Math.round(q.vl * V), m = X % (w || 6); let f = [0.84, 1.08, 1, 0.94, 0.9, 0.98, 1, 0.92][m % 8] + h2(X >> 1, Y >> 2) * 0.05; if (Y < 2) f *= 0.82; else if (Y >= Ht - 1) f *= 1.1; return mul(c, f); };
  const stn = c => (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * V), Ht = Math.round(q.vl * V), Wt = Math.round(q.ul * U), r = h2(X, Y); let f = 0.93 + h2(X >> 1, Y >> 1) * 0.12; if (r < 0.04) f *= 0.86; else if (r > 0.97) f *= 1.08; if (Y >= Ht - 1) f *= 1.12; else if (Y === 0) f *= 0.8; if (X === 0) f *= 0.88; else if (X === Wt - 1) f *= 0.94; return mul(c, f); };   // dressed stone
  const mason = (seed, tint) => (s, t) => T.stoneAt(Math.floor(s * U), Math.floor(t * V), seed, tint);                                                                                                           // coursed masonry
  const emis = c => () => c | FE;
  const bl = (c, n) => { n = n === undefined ? 0.1 : n; return (dx, dy, ix, iy) => mul(c, 1 - n / 2 + h2(ix >> 1, iy >> 1) * n); };          // blob skin
  const cushion = c => (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * U), Wt = Math.round(q.ul * U), Ht = Math.round(q.vl * U), e = Math.min(X, Y, Wt - 1 - X, Ht - 1 - Y); if (e < 1) return mul(c, 0.7); if (e < 2) return mul(c, 1.15); return mul(c, ((X + Y) % 5 === 0 ? 0.88 : 1) * (0.95 + h2(X, Y) * 0.08)); };
  const velvet = c => (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * V), Wt = Math.round(q.ul * U), Ht = Math.round(q.vl * V); if (X < 3 || X >= Wt - 3 || Y >= Ht - 4 || Y < 3) return (X + Y) % 4 === 0 ? GOLD_L : (X === 2 || X === Wt - 3 || Y === 2 || Y === Ht - 4) ? 0xa87a24 : GOLD; return mul(c, ((X + Y) % 8 === 0 || (X - Y + 400) % 8 === 0) ? 0.8 : 0.96 + h2(X, Y) * 0.08); };
  const waterTex = (c, seed) => (s, t) => { const n = T.fbm(s * 5 + seed, t * 5); return mul(c || 0x3a8a98, n > 0.62 ? 1.3 : n > 0.5 ? 1.1 : n > 0.36 ? 1 : 0.86) | NOAO; };
  const leafQ = (pal, fl, fp, seed) => (s, t, q) => { const X = Math.floor(s * U) + (seed | 0) * 7, Y = Math.floor(t * V), Ht = Math.round(q.vl * V), r = h2((X + (Y >> 1)) >> 1, Y >> 1); if (fl && h2(X / 3 | 0, (Y / 3 | 0) + 9) < fp) return (X % 3 === 1 && Y % 3 === 1) ? 0xf6e7a0 : fl[(h2(X / 3 | 0, Y / 3 | 0) * fl.length) | 0]; let c = pal[(r * pal.length) | 0]; if (Y >= Ht - 2) c = mul(c, 1.12); else if (Y < 3) c = mul(c, 0.72); return ((Y - (X >> 2)) & 1) && r > 0.5 ? mul(c, 0.86) : c; };
  const legs = (x, y, w, d, h, th, tex) => { for (const p of [[x, y], [x + w - th, y], [x, y + d - th], [x + w - th, y + d - th]]) box(p[0], p[1], 0, th, th, h, { side: tex, noShadow: true, noTop: true }); };

  /* ---------- small table-top things (sprites: one quad each) ---------- */
  const candleFn = hp => (X, Y) => Y < hp ? (X === 1 ? LINEN : X === 2 ? 0xcfc6b0 : -1) : Y === hp ? (X === 1 || X === 2 ? 0xffc84a | FE : -1) : Y === hp + 1 ? (X === 1 || X === 2 ? 0xfff2a8 | FE : -1) : (X === 1 ? 0xffe27a | FE : -1);
  const candle = (x, y, z, hp) => spr(x, y, z, 4, (hp || 5) + 3, candleFn(hp || 5), { f: E.F_NOAO | E.F_NOLINE });
  const A_GOBLET = art(['yg', 'gG', 'gG', '.G', 'gG']), A_MUG = art(['www', 'tTn', 'tTn', 'tTn']), A_JUG = art(['.cc.', '.cW.', 'ccWn', 'ccWn', 'ccW.', '.cW.']), A_BOTTLE = art(['.e', '.E', 'eE', 'eE', 'eE', 'eE']);
  const A_STICK = art(['.Ff.', '.ff.', '.wW.', '.wW.', '.wW.', '.yg.', '.gG.', '.gG.', 'ygGG']), A_INK = art(['..w', '.w.', '.w.', 'kKk', 'kKk']), A_FLASK = c => art(['.l.', '.l.', 'lCl', 'CCC', 'CCC'], Object.assign({}, PAL, { C: c | FE }));
  const A_CROWN = art(['y.y.y', 'ygygy', 'grgag', 'ggggG']), A_SKULL = art(['.www.', 'wwwwW', 'wkwkW', 'wwwWW', '.wkW.', '.wWW.']), A_KNIFE = art(['l', 'l', 'l', 'l', 'n', 'n']);
  const plate = (x, y, z, c) => disk(x, y, z + 0.012, 0.075, (s, t, q, a, b) => { const d = Math.hypot(a - 0.5, b - 0.5); return d > 0.36 ? mul(c || 0xd8d2c4, 0.82) : (c || 0xe8e2d4); }, { f: E.F_NOAO });
  const loaf = (x, y, z, r) => { r = r || 0.06; const tx = (dx, dy, ix, iy) => ((ix + iy) % 5 === 0 ? 0xa8742e : dy < -0.3 ? 0xe2b66a : 0xcf9a4e); blob(x - r * 0.6, y, z + r * 0.7, r, tx, { noShadow: true }); blob(x + r * 0.6, y, z + r * 0.7, r, tx, { noShadow: true }); };
  function food(x, y, z, k) {            // a centre-piece for a laid table
    k = ((k % 8) + 8) % 8;
    if (k === 0) { disk(x, y, z + 0.012, 0.14, flat(0xb8bcc6)); blob(x, y, z + 0.075, 0.09, bl(0x9a5a30), { noShadow: true }); blob(x + 0.08, y + 0.03, z + 0.05, 0.04, bl(0xb06a3a), { noShadow: true }); blob(x - 0.09, y - 0.01, z + 0.04, 0.03, bl(0x6fa044), { noShadow: true }); }
    else if (k === 1) loaf(x, y, z);
    else if (k === 2) { cyl(x, y, z, 0.09, 0.05, 8, sh(0x8a6a44), { noShadow: true }); for (let i = 0; i < 6; i++) { const a = i * 1.05; blob(x + Math.cos(a) * (i ? 0.045 : 0), y + Math.sin(a) * (i ? 0.045 : 0), z + 0.075 + (i ? 0 : 0.03), 0.034, flat([0xc8372f, 0xe0b040, 0x7fa64a, 0x8a4a9a, 0xe07a2a, 0xc8372f][i]), { noShadow: true, f: E.F_NOAO }); } }
    else if (k === 3) icon(x, y, z, A_STICK);
    else if (k === 4) { cyl(x, y, z, 0.085, 0.04, 8, flat(0xb8843e), { noShadow: true, top: (s, t, q, a, b) => { const d = Math.hypot(a - 0.5, b - 0.5); return d > 0.4 ? 0xb8843e : Math.abs(a - 0.5) < 0.04 || Math.abs(b - 0.5) < 0.04 ? 0x8a5a2a : 0xdcae62; } }); }
    else if (k === 5) { icon(x - 0.06, y, z, A_JUG); nb(x + 0.03, y - 0.04, z, 0.1, 0.08, 0.05, flat(0xe2c050), flat(0xf0d468)); }
    else if (k === 6) { disk(x, y, z + 0.012, 0.11, flat(0xb8bcc6)); for (let i = 0; i < 7; i++) blob(x + (h2(i, 3) - 0.5) * 0.1, y + (h2(i, 5) - 0.5) * 0.1, z + 0.035 + (i % 3) * 0.015, 0.026, flat(i % 3 ? 0x7a3a8a : 0x9a5ab0), { noShadow: true, f: E.F_NOAO }); }
    else { icon(x - 0.05, y, z, A_BOTTLE); icon(x + 0.04, y + 0.03, z, A_GOBLET); }
  }
  const placeSetting = (x, y, z, i) => { plate(x, y, z); if (i % 3 !== 2) blob(x, y, z + 0.03, 0.03, flat([0xb06a3a, 0xd9a85a, 0x7fa64a][i % 3]), { noShadow: true, f: E.F_NOAO }); icon(x + 0.1, y - 0.03, z, i & 1 ? A_GOBLET : A_MUG); };

  /* ================================================================================================
   *  SEATING & TABLES
   * ================================================================================================ */
  // [corner] chair 0.4 x 0.4; sitter looks toward the front.  o.c wood, o.cushion colour, o.kind poi kind
  def('chair', 'r', [0.4, 0.4], 'wooden chair (o.c, o.cushion, o.kind)', (o) => {
    const c = o.c || WOOD, dk = sh(mul(c, 0.72));
    legs(0.02, 0.04, 0.36, 0.34, 0.28, 0.06, dk);
    box(0, 0.03, 0.27, 0.4, 0.37, 0.05, { side: sh(c), top: o.cushion ? cushion(o.cushion) : wt(mul(c, 1.12)) });
    const post = mul(c, 0.8), back = (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * V), Wt = Math.round(q.ul * U), Ht = Math.round(q.vl * V); if (Wt < 6) return post; if (X < 2 || X >= Wt - 2) return mul(post, X === 1 ? 1.2 : 1); if (Y >= Ht - 4) return mul(c, Y === Ht - 1 ? 1.2 : 1); if (o.cushion && Y > 4) return mul(o.cushion, (X + Y) % 4 === 0 ? 0.85 : 1); if (Y >= 5 && Y <= 6) return c; return (X - 2) % 3 === 1 && Y > 6 ? mul(c, 0.92) : -1; };
    box(0, 0, 0.32, 0.4, 0.06, 0.46, { side: back, cut: true });
    poi(0.2, 0.22, o.kind || 'sit', 0, 1, 0.32, [0.2, 0.65]);
  });
  // [centre] three-legged stool, r 0.17.  o.look = [fx, fy] facing of the sitter
  def('stool', 'c', [0.36, 0.36], 'round stool (o.c, o.kind, o.look)', (o) => {
    const c = o.c || WOOD_L, dk = flat(mul(c, 0.62));
    for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.5; nb(Math.cos(a) * 0.11 - 0.025, Math.sin(a) * 0.11 - 0.025, 0, 0.05, 0.05, 0.24, dk); }
    cyl(0, 0, 0.23, 0.17, 0.06, 8, sh(mul(c, 0.9), 0.06), { top: wt(mul(c, 1.1)) });
    const l = o.look || [0, 1]; poi(0, 0, o.kind || 'sit', l[0], l[1], 0.29, [l[0] * -0.4, l[1] * -0.4]);
  });
  // [corner] bench, o.len long (along x) x 0.36.  o.back adds a back rest (a settle)
  def('bench', 'r', o => [o.len || 1.2, o.back ? 0.44 : 0.36], 'bench / settle (o.len, o.back, o.c, o.kind)', (o, w, d) => {
    const c = o.c || WOOD, y0 = o.back ? 0.08 : 0;
    for (const x of [0.08, w - 0.16]) box(x, y0 + 0.04, 0, 0.08, 0.28, 0.23, { side: sh(mul(c, 0.72)), noTop: true });
    nb(0.16, y0 + 0.15, 0.1, w - 0.32, 0.05, 0.05, flat(mul(c, 0.62)));
    box(0, y0, 0.23, w, 0.36, 0.06, { side: sh(c), top: wt(mul(c, 1.12)) });
    if (o.back) { box(0, 0, 0, w, 0.08, 0.85, { side: wd(mul(c, 0.92)), top: sh(mul(c, 1.1)) }); for (const x of [0, w - 0.07]) box(x, 0.08, 0.29, 0.07, 0.36, 0.22, { side: sh(mul(c, 0.85)) }); }
    const n = Math.max(1, Math.floor(w / 0.5)); for (let i = 0; i < n; i++) { const x = w * (i + 0.5) / n; poi(x, y0 + 0.18, o.kind || 'sit', 0, 1, 0.29, [x, o.behind ? -0.25 : d + 0.25]); }
  });
  // [corner] throne-like high seat 0.8 x 0.7.  o.c velvet colour, o.grand = royal throne (taller, finials)
  def('throne', 'r', o => o.grand ? [1.0, 0.8] : [0.8, 0.7], 'high seat / throne (o.c, o.grand)', (o, w, d) => {
    const c = o.c || RED, hb = o.grand ? 2.1 : 1.5, sw = w - 0.2;
    box(0, 0, 0, w, 0.18, hb, { side: gold, ty: velvet(c), top: gold });
    box(0.1, 0.18, 0, sw, d - 0.18, 0.4, { side: gold, top: cushion(c) });
    for (const x of [0, w - 0.12]) { box(x, 0.18, 0, 0.12, d - 0.2, 0.62, { side: gold, top: gold }); blob(x + 0.06, d - 0.06, 0.66, 0.065, bl(GOLD_L), { noShadow: true }); }
    for (const x of [0.02, w - 0.14]) { nb(x, 0.03, hb, 0.12, 0.12, 0.14, gold); blob(x + 0.06, 0.09, hb + 0.2, 0.07, bl(GOLD_L), { noShadow: true }); }
    if (o.grand) { nb(w / 2 - 0.2, 0.03, hb, 0.4, 0.12, 0.16, gold); icon(w / 2, 0.1, hb + 0.14, A_CROWN); const cv = PX(11, 11); cv.disc(5, 5, 5, GOLD).disc(5, 5, 3.6, c).r(5, 2, 5, 8, GOLD_L).r(3, 6, 7, 6, GOLD_L); vart(cv, w / 2 - 11 / 64, 0.185, hb - 0.55); }
    poi(w / 2, 0.45, o.kind || 'sit', 0, 1, 0.4, [w / 2, d + 0.3]);
  });
  // [corner] long feast table (along x), with benches on both long sides unless o.benches === false
  def('feastTable', 'r', o => [o.len || 3.2, o.benches === false ? 0.8 : 1.6], 'long feast table (o.len, o.food, o.cloth, o.benches, o.c)', (o, w, d) => {
    const c = o.c || 0x6a4630, y0 = o.benches === false ? 0 : 0.4, zt = 0.5, n = Math.max(2, Math.round(w / 1.6) + 1);
    for (let i = 0; i < n; i++) { const x = 0.2 + (w - 0.5) * i / (n - 1); box(x, y0 + 0.1, 0, 0.1, 0.6, 0.43, { side: sh(mul(c, 0.8)), noTop: true }); }
    nb(0.25, y0 + 0.36, 0.14, w - 0.5, 0.08, 0.07, flat(mul(c, 0.66)));
    box(0, y0, 0.43, w, 0.8, 0.07, { side: sh(c), top: wt(mul(c, 1.2)) });
    if (o.cloth) { const cc = o.cloth, tx = (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * U), Ht = Math.round(q.vl * U); return (Y < 2 || Y >= Ht - 2) ? GOLD : mul(cc, ((X >> 2) + (Y >> 2)) & 1 ? 0.94 : 1.03); };
      quad([-0.0, y0 + 0.22, zt + 0.006], [w, 0, 0], [0, 0.36, 0], tx, { n: [0, 0, 1], noShadow: true }); nb(w, y0 + 0.22, zt - 0.22, 0.012, 0.36, 0.225, cloth(cc, 4)); nb(-0.012, y0 + 0.22, zt - 0.22, 0.012, 0.36, 0.225, cloth(cc, 4)); }
    if (o.food !== false) {
      const m = Math.max(1, Math.floor(w / 0.55));
      for (let i = 0; i < m; i++) { const x = w * (i + 0.5) / m; placeSetting(x, y0 + 0.13, zt, i); placeSetting(x - 0.04, y0 + 0.67, zt, i + 1); }
      const k = Math.max(1, Math.floor(w / 0.62)), sdz = o.seed || 0; for (let i = 0; i < k; i++) food(w * (i + 0.5) / k, y0 + 0.4, zt + (o.cloth ? 0.008 : 0), i * 3 + sdz + (i === (k >> 1) ? -i * 3 - sdz : 0));
    }
    if (o.benches !== false) {
      Fz.bench(0.15, 0, 0, { len: w - 0.3, kind: 'eat', behind: true, c: mul(c, 1.15) }); Fz.bench(0.15, 1.24, 0, { len: w - 0.3, kind: 'eat', behind: true, face: '-y', c: mul(c, 1.15) });
    }
  });
  // [centre] round table, o.r (0.6).  o.stools = number of stools around it, o.cloth colour, o.food
  def('roundTable', 'c', o => { const r = (o.r || 0.6) + (o.stools ? 0.5 : 0); return [2 * r, 2 * r]; }, 'round table (o.r, o.stools, o.cloth, o.food, o.kind)', (o) => {
    const r = o.r || 0.6, c = o.c || OAK;
    cyl(0, 0, 0, r * 0.45, 0.05, 8, sh(mul(c, 0.7)), { top: flat(mul(c, 0.8)) }); cyl(0, 0, 0.05, 0.09, 0.39, 6, sh(mul(c, 0.8)), {});
    if (o.cloth) { cyl(0, 0, 0.3, r + 0.012, 0.2, 14, cloth(o.cloth, 5), { noShadow: true }); cyl(0, 0, 0.44, r, 0.06, 14, flat(o.cloth), { top: (s, t, q, a, b) => { const dd = Math.hypot(a - 0.5, b - 0.5); return dd > 0.44 ? GOLD : mul(o.cloth, 1.08); } }); }
    else cyl(0, 0, 0.44, r, 0.06, 14, sh(c, 0.06), { top: wt(mul(c, 1.18)) });
    if (o.food) { food(0, 0, 0.5, o.seed || 0); for (let i = 0; i < 4; i++) { const a = i * 1.571 + 0.6; placeSetting(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62, 0.5, i); } }
    const n = o.stools || 0; for (let i = 0; i < n; i++) { const a = i / n * 6.283 + 0.785, R = r + 0.26; Fz.stool(Math.cos(a) * R, Math.sin(a) * R, 0, { kind: o.kind || 'eat', look: [-Math.cos(a), -Math.sin(a)] }); }
  });
  const drawers = c => (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * V), Wt = Math.round(q.ul * U), Ht = Math.round(q.vl * V), m = Y % 6; if (X === 0 || X === Wt - 1 || Y >= Ht - 1) return mul(c, 0.7); if (m === 0) return mul(c, 0.6); if (m === 3 && Math.abs(X - Wt / 2 + 0.5) < 1.2) return GOLD; return mul(c, (m === 5 ? 1.12 : 0.98) + h2(X >> 2, Y / 6 | 0) * 0.08); };
  const paper = (x, y, z, w, d, sdv) => quad([x, y, z + 0.008], [w, 0, 0], [0, d, 0], (s, t) => { const X = Math.floor(s * U), Y = Math.floor(t * U); return (Y % 2 === 1 && X > 0 && h2(X, Y + sdv) < 0.75) ? 0x8a8070 : 0xeee4c8; }, { n: [0, 0, 1], noShadow: true, f: E.F_NOAO });
  const book = (x, y, z, c, w, d) => nb(x, y, z, w || 0.16, d || 0.12, 0.04, (s, t) => (Math.floor(t * V) === 0 ? mul(c, 0.7) : 0xe8dcc0), (s, t) => { const X = Math.floor(s * U); return X === 1 ? GOLD : c; });
  // [corner] writing desk 1.2 x 0.6 with a chair on the front (user) side unless o.chair === false
  def('desk', 'r', o => [1.2, o.chair === false ? 0.6 : 1.05], 'writing desk with papers, ink and candle (o.chair, o.c)', (o, w, d) => {
    const c = o.c || WALNUT;
    for (const x of [0, 0.86]) box(x, 0.04, 0, 0.34, 0.52, 0.45, { side: sh(c), ty: drawers(mul(c, 1.1)), noTop: true });
    box(-0.02, 0, 0.45, 1.24, 0.6, 0.05, { side: sh(mul(c, 1.1)), top: wt(mul(c, 1.3)) });
    paper(0.42, 0.26, 0.5, 0.2, 0.26, 1); paper(0.66, 0.3, 0.5, 0.17, 0.22, 5); paper(0.3, 0.12, 0.5, 0.14, 0.1, 9);
    book(0.9, 0.1, 0.5, 0x8a2a2a); book(0.92, 0.11, 0.54, 0x2f5a8a, 0.13, 0.1); icon(0.88, 0.42, 0.5, A_INK); icon(0.12, 0.14, 0.5, A_STICK); hcyl(0.34, 0.14, 0.515, 0.018, 0.16, 5, flat(0xe8dcc0), { ax: 'x', noShadow: true });
    light(0.12, 0.3, 0.85, 2.6, [1, 0.8, 0.5], 0.5);
    if (o.chair === false) poi(0.6, 0.85, 'work', 0, -1);
    else Fz.chair(0.4, 0.62, 0, { face: '-y', kind: 'work', c: mul(c, 1.25), cushion: o.cushion });
  });
  // [corner] game table 0.7 x 1.4 with two stools (players face each other along y).  o.game 'chess' | 'dice'
  def('gameTable', 'r', [0.7, 1.4], 'game table with two stools (o.game: chess | dice)', (o) => {
    const c = o.c || OAK, top = (s, t) => { const X = Math.floor(s * U) - 1, Y = Math.floor(t * U) - 1; if (o.game !== 'dice' && X >= 0 && Y >= 0 && X < 20 && Y < 20) return ((X >> 2) + (Y >> 2)) & 1 ? 0x3a2c24 : 0xe8dcc0; if (o.game !== 'dice' && X >= -1 && Y >= -1 && X < 21 && Y < 21) return 0x8a2a2a; return mul(c, 1.15 - ((Y + 3) % 7 === 0 ? 0.3 : 0)); };
    legs(0.06, 0.4, 0.58, 0.6, 0.44, 0.07, sh(mul(c, 0.75)));
    box(0, 0.35, 0.44, 0.7, 0.7, 0.06, { side: sh(c), top });
    if (o.game === 'dice') { for (const p of [[0.3, 0.62], [0.38, 0.7], [0.27, 0.74]]) nb(p[0], p[1], 0.5, 0.045, 0.045, 0.04, flat(0xe8e2d4), (s, t, q, a, b) => (Math.abs(a - 0.5) < 0.2 && Math.abs(b - 0.5) < 0.2 ? 0x2a2630 : 0xf4efe0)); icon(0.5, 0.56, 0.5, A_MUG); for (let i = 0; i < 5; i++) disk(0.16 + h2(i, 2) * 0.1, 0.5 + h2(i, 4) * 0.12, 0.512 + i * 0.002, 0.025, flat(i & 1 ? GOLD : GOLD_L), { f: E.F_NOAO }); }
    else { const pc = (x, y, cc) => spr(x, y, 0.5, 2, 4, (X, Y) => (Y === 3 && X === 1 ? -1 : cc), { f: E.F_NOAO }); for (let i = 0; i < 5; i++) { pc(0.1 + (h2(i, 1) * 5 | 0) / 8, 0.45 + (h2(i, 2) * 2 | 0) / 8, 0xf4efe0); pc(0.1 + (h2(i, 3) * 5 | 0) / 8, 0.82 + (h2(i, 4) * 2 | 0) / 8, 0x4a4650); } }
    Fz.stool(0.35, 0.15, 0, { kind: 'play', look: [0, 1] }); Fz.stool(0.35, 1.25, 0, { kind: 'play', look: [0, -1] });
  });
  // [centre] round card table with green baize, cards, coins and o.stools (3) stools
  def('cardTable', 'c', [1.7, 1.7], 'round card table with stools (o.stools)', (o) => {
    const r = 0.45, n = o.stools || 3;
    cyl(0, 0, 0, 0.2, 0.05, 8, sh(WOOD_D), {}); cyl(0, 0, 0.05, 0.07, 0.39, 6, sh(WOOD_D), {});
    cyl(0, 0, 0.44, r, 0.06, 12, sh(OAK, 0.06), { top: (s, t, q, a, b) => (Math.hypot(a - 0.5, b - 0.5) > 0.43 ? mul(OAK, 1.15) : mul(0x2f6a44, 0.95 + h2(s * U | 0, t * U | 0) * 0.1)) });
    for (let i = 0; i < n; i++) { const a = i / n * 6.283 + 0.785, cx = Math.cos(a), cy = Math.sin(a);
      for (let k = 0; k < 3; k++) quad([cx * 0.28 + k * 0.035 - 0.05, cy * 0.28 - 0.03 + k * 0.01, 0.508 + k * 0.002], [0.045, 0, 0], [0, 0.065, 0], (s, t, q, u, v) => (u < 0.2 || v < 0.15 || u > 0.8 || v > 0.85 ? 0xf4efe0 : (i + k) & 1 ? 0xc8372f : 0x2a2630), { n: [0, 0, 1], noShadow: true, f: E.F_NOAO });
      for (let k = 0; k < 3; k++) disk(cx * 0.12 + h2(i, k) * 0.07, cy * 0.12 + h2(k, i) * 0.07, 0.51 + k * 0.004, 0.022, flat(k & 1 ? GOLD : GOLD_L), { f: E.F_NOAO });
      Fz.stool(cx * 0.68, cy * 0.68, 0, { kind: 'play', look: [-cx, -cy] }); }
    icon(0.02, -0.02, 0.5, A_STICK);
  });
  // [corner] bar counter along x: staff side is the back, drinkers stand (or sit on stools) at the front
  def('barCounter', 'r', o => [o.len || 2.4, o.stools === false ? 0.55 : 1.0], 'bar counter with keg, mugs and stools (o.len, o.stools)', (o, w, d) => {
    const c = o.c || 0x6e4a32, panel = (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * V), Ht = Math.round(q.vl * V), m = X % 16; if (Y < 3) return mul(c, 0.6); if (Y >= Ht - 2) return mul(c, 1.2); if (m < 2) return mul(c, 0.72); if (m === 2 || m === 15 || Y === 5 || Y === Ht - 5) return mul(c, 0.84); return mul(c, 1 + h2(X >> 2, Y >> 3) * 0.1); };
    box(0, 0, 0, w, 0.5, 0.58, { side: wd(mul(c, 0.9)), ty: panel, noTop: true });
    box(-0.03, -0.02, 0.58, w + 0.06, 0.6, 0.05, { side: sh(mul(c, 0.8)), top: wt(mul(c, 1.3)) });
    // keg on a cradle at one end
    for (const y of [0.12, 0.4]) nb(0.08, y, 0.63, 0.36, 0.05, 0.06, flat(WOOD_D));
    hcyl(0.26, 0.06, 0.84, 0.17, 0.44, 8, (s, t) => { const X = Math.floor(s * U), Y = Math.floor(t * U); return (X === 2 || X === 3 || X === 10 || X === 11) ? (X & 1 ? 0x7a7a84 : 0x4a4a54) : mul(0x8a623e, Y % 4 === 0 ? 0.7 : 1); }, { cap: (s, t, q, a, b) => { const dd = Math.hypot(a - 0.5, b - 0.5); return dd > 0.42 ? 0x55555e : Math.abs(a - 0.5) < 0.09 && b < 0.3 && b > 0.14 ? BRASS : mul(0x9a7448, Math.floor(a * 11) % 3 === 0 ? 0.8 : 1); } });
    const m = Math.max(1, Math.floor((w - 0.7) / 0.5));
    for (let i = 0; i < m; i++) { const x = 0.75 + (w - 0.9) * (i + 0.5) / m; icon(x, 0.38, 0.63, i % 3 === 2 ? A_GOBLET : A_MUG); if (i % 3 === 1) icon(x + 0.14, 0.14, 0.63, A_BOTTLE); if (i % 4 === 2) icon(x - 0.12, 0.16, 0.63, A_JUG); }
    poi(w * 0.5, -0.3, 'work', 0, 1);
    const n = Math.max(1, Math.floor(w / 0.6));
    for (let i = 0; i < n; i++) { const x = w * (i + 0.5) / n; if (o.stools === false) poi(x, 0.85, 'drink', 0, -1); else Fz.stool(x, 0.8, 0, { kind: 'drink', look: [0, -1], c: mul(c, 1.3) }); }
  });

  /* ================================================================================================
   *  BEDS & CHAMBERS
   * ================================================================================================ */
  /* bed body in the local frame: head at y0 (back), feet toward +y */
  function bedBody(x, y, w, l, zf, frame, sheet, blanket, pillows) {
    box(x, y, 0, w, l, zf, { side: sh(frame), noTop: true });
    box(x + 0.03, y + 0.03, zf, w - 0.06, l - 0.06, 0.09, { side: sh(sheet, 0.05), top: sh(sheet, 0.04) });
    const bt = (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * U), Ht = Math.round(q.vl * U); if (Y < 4) return mul(sheet, Y === 3 ? 0.8 : 1.02); if (Y === 4 || Y === 5 || Y >= Ht - 2) return mul(blanket, 0.74); return mul(blanket, (((X >> 2) + (Y >> 2)) & 1 ? 0.93 : 1.04) + h2(X, Y) * 0.05); };
    box(x, y + l * 0.36, zf, w, l * 0.64 - 0.01, 0.115, { side: cloth(blanket, 5), top: bt });
    for (let i = 0; i < pillows; i++) { const pw = Math.min(0.34, (w - 0.14) / pillows - 0.04), px = x + w * (i + 0.5) / pillows - pw / 2; nb(px, y + 0.08, zf + 0.09, pw, 0.2, 0.06, sh(0xf4efe4, 0.04)); }
  }
  // [corner] royal four-poster 1.6 x 2.0, head at the back.  o.c curtain colour, o.canopy === false leaves the top open
  def('royalBed', 'r', [1.6, 2.0], 'royal four-poster with curtains (o.c, o.c2, o.canopy)', (o, w, d) => {
    const c = o.c || 0x8a1e2a, c2 = o.c2 || GOLD, hp = 1.5, post = sh(WALNUT);
    box(0, 0, 0, w, 0.1, 1.15, { side: sh(WALNUT), ty: velvet(c), top: sh(mul(WALNUT, 1.2)) });                 // head board
    bedBody(0.05, 0.1, w - 0.1, d - 0.16, 0.3, WALNUT, 0xf0e8d8, c, 2);
    box(0, d - 0.08, 0, w, 0.08, 0.5, { side: sh(mul(WALNUT, 1.1)), top: sh(mul(WALNUT, 1.3)) });              // foot board
    for (const p of [[0, 0], [w - 0.1, 0], [0, d - 0.1], [w - 0.1, d - 0.1]]) { box(p[0], p[1], 0, 0.1, 0.1, hp, { side: post, noTop: true }); }
    // tied-back curtains at the posts
    const drape = (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * V), Ht = Math.round(q.vl * V), Wt = Math.round(q.ul * U), k = Y / Ht, wdt = Wt * (0.45 + 0.55 * Math.abs(k - 0.42) * 1.7); if (X > wdt) return -1; if (Math.abs(Y - Ht * 0.42) < 1.2) return c2; return mul(c, [0.8, 1.06, 0.95, 0.86][X % 4]); };
    quad([0.1, d - 0.02, 0.2], [0.34, 0, 0], [0, 0, hp - 0.2], drape, { cut: true, noShadow: true }); quad([w - 0.1, d - 0.02, 0.2], [-0.34, 0, 0], [0, 0, hp - 0.2], drape, { cut: true, noShadow: true });
    quad([w - 0.02, d - 0.1, 0.2], [0, -0.34, 0], [0, 0, hp - 0.2], drape, { cut: true, noShadow: true }); quad([w - 0.02, 0.1, 0.2], [0, 0.34, 0], [0, 0, hp - 0.2], drape, { cut: true, noShadow: true });
    if (o.canopy !== false) {
      const val = (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * V); if (Y < 4) { const m = X % 8 - 3.5; if (m * m + (4 - Y) * (4 - Y) > 17) return -1; return c2; } return Y > 8 ? mul(c2, 0.9 + (X & 1) * 0.15) : mul(c, X % 4 === 0 ? 0.82 : 1); };
      const topT = (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * U), Wt = Math.round(q.ul * U), Ht = Math.round(q.vl * U), e = Math.min(X, Y, Wt - 1 - X, Ht - 1 - Y); if (e < 2) return c2; if (e < 3) return mul(c, 0.7); const dx = Math.abs(X - Wt / 2), dy = Math.abs(Y - Ht / 2); if (Math.abs(dx + dy - 12) < 1.2) return c2; if (dx + dy < 5) return c2; return mul(c, ((X + Y) % 10 === 0 || (X - Y + 400) % 10 === 0) ? 0.84 : 1); };
      box(-0.03, -0.03, hp - 0.2, w + 0.06, d + 0.06, 0.26, { side: val, top: topT, cut: true });
      for (const p of [[0.05, 0.05], [w - 0.05, 0.05], [0.05, d - 0.05], [w - 0.05, d - 0.05]]) blob(p[0], p[1], hp + 0.11, 0.06, bl(GOLD_L), { noShadow: true });
    } else { for (const p of [[0, 0], [w - 0.1, 0], [0, d - 0.1], [w - 0.1, d - 0.1]]) blob(p[0] + 0.05, p[1] + 0.05, hp + 0.04, 0.07, bl(GOLD_L), { noShadow: true });
      nb(0, d - 0.08, hp - 0.08, w, 0.06, 0.06, post); nb(w - 0.08, 0, hp - 0.08, 0.06, d, 0.06, post); nb(0, 0.02, hp - 0.08, w, 0.06, 0.06, post); nb(0.02, 0, hp - 0.08, 0.06, d, 0.06, post); }
    poi(w * 0.3, d * 0.52, 'sleep', 0, 1, 0.42, [-0.3, d * 0.6]); poi(w * 0.7, d * 0.52, 'sleep', 0, 1, 0.42, [w + 0.3, d * 0.6]);
  });
  // [corner] noble bed 1.2 x 1.7 with carved head board.  o.c blanket colour
  def('nobleBed', 'r', [1.2, 1.7], 'noble double bed (o.c, o.wood)', (o, w, d) => {
    const c = o.c || 0x2f5a8a, f = o.wood || OAK;
    const hb = (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * V), Wt = Math.round(q.ul * U), Ht = Math.round(q.vl * V), dx = X - Wt / 2 + 0.5; if (Y > Ht - 9 && dx * dx / (Wt * Wt * 0.25) + (Ht - 9 - Y) * (Ht - 9 - Y) / 81 > 1 && Y > Ht - 9) return Math.abs(dx) > Wt / 2 - 3 ? mul(f, 0.8) : -1; if (X < 3 || X >= Wt - 3) return mul(f, 0.8); const m = (X - 3) % 9; if (m === 0 || Y === 14 || Y === Ht - 12) return mul(f, 0.7); if (Y > 14 && Y < Ht - 12 && m > 2 && m < 7 && Y > 17 && Y < Ht - 15) return mul(f, 0.88); return mul(f, 1.05 + h2(X >> 1, Y >> 2) * 0.08); };
    box(0, 0, 0, w, 0.09, 1.0, { side: hb, cut: true, noTop: true });
    for (const x of [0, w - 0.09]) { nb(x, 0, 0, 0.09, 0.09, 1.02, sh(mul(f, 0.8))); blob(x + 0.045, 0.045, 1.07, 0.055, bl(mul(f, 1.2)), { noShadow: true }); }
    bedBody(0.03, 0.09, w - 0.06, d - 0.15, 0.26, f, 0xf0e8d8, c, 2);
    box(0, d - 0.07, 0, w, 0.07, 0.42, { side: wd(f), top: sh(mul(f, 1.25)) });
    poi(w * 0.5, d * 0.52, 'sleep', 0, 1, 0.38, [w + 0.3, d * 0.6]);
  });
  // [corner] servant's cot 0.65 x 1.45
  def('cot', 'r', [0.65, 1.45], 'plain servant cot (o.c blanket)', (o, w, d) => {
    const c = o.c || 0x8a8272;
    box(0, 0, 0, w, 0.06, 0.48, { side: wh(WOOD), top: sh(WOOD_L) });
    bedBody(0.02, 0.06, w - 0.04, d - 0.1, 0.18, WOOD, 0xe0d8c4, c, 1);
    box(0, d - 0.05, 0, w, 0.05, 0.28, { side: sh(WOOD), top: sh(WOOD_L) });
    poi(w * 0.5, d * 0.52, 'sleep', 0, 1, 0.3, [w + 0.3, d * 0.6]);
  });
  // [corner] barracks bunk 0.7 x 1.5, two beds (two sleep pois at different heights)
  def('bunk', 'r', [0.7, 1.5], 'barracks bunk bed, two levels (o.c)', (o, w, d) => {
    const c = o.c || 0x6a3a34, post = sh(WOOD_D);
    for (const p of [[0, 0], [w - 0.07, 0], [0, d - 0.07], [w - 0.07, d - 0.07]]) box(p[0], p[1], 0, 0.07, 0.07, 1.42, { side: post });
    for (const zf of [0.2, 0.9]) {
      box(0.03, 0.03, zf - 0.05, w - 0.06, d - 0.06, 0.07, { side: wh(WOOD), noTop: true });
      box(0.05, 0.05, zf + 0.02, w - 0.1, d - 0.1, 0.07, { side: sh(0xe0d8c4, 0.05), top: sh(0xe0d8c4, 0.04) });
      box(0.04, d * 0.38, zf + 0.02, w - 0.08, d * 0.62 - 0.05, 0.09, { side: cloth(zf > 0.5 ? mul(c, 0.85) : c, 5), top: sh(zf > 0.5 ? mul(c, 0.85) : c, 0.12) });
      nb(0.16, 0.1, zf + 0.09, 0.36, 0.18, 0.05, sh(0xf0eadc, 0.04));
      nb(0.03, 0, zf + 0.16, w - 0.06, 0.05, 0.14, wh(WOOD)); nb(0.03, d - 0.05, zf + 0.08, w - 0.06, 0.05, 0.1, wh(WOOD));
    }
    for (const y of [d * 0.6, d * 0.6 + 0.2]) bar([w + 0.01, y, 0], [w + 0.01, y, 0.98], 0.045, flat(WOOD_L));
    for (let i = 0; i < 4; i++) bar([w + 0.01, d * 0.6, 0.2 + i * 0.22], [w + 0.01, d * 0.6 + 0.2, 0.2 + i * 0.22], 0.04, flat(WOOD));
    poi(w * 0.5, d * 0.52, 'sleep', 0, 1, 0.31, [w + 0.3, d * 0.3]); poi(w * 0.5, d * 0.52, 'sleep', 0, 1, 1.01, [w + 0.3, d * 0.7]);
  });
  const strawT = (s, t) => { const X = Math.floor(s * U), Y = Math.floor(t * U), r = h2(X >> 1, Y); return r < 0.12 ? 0xa8842e : r > 0.88 ? 0xf0d880 : mul(STRAW, 0.9 + h2(X, Y >> 1) * 0.2); };
  const strawV = (s, t) => { const X = Math.floor(s * U), Y = Math.floor(t * V), r = h2(X, Y >> 1); return r < 0.14 ? 0xa8842e : r > 0.88 ? 0xf0d880 : mul(STRAW, 0.84 + h2(X >> 1, Y) * 0.2); };
  // [corner] straw pallet on the floor 0.65 x 1.35 (not solid).  o.kind poi kind ('sleep')
  def('pallet', 'R', [0.65, 1.35], 'straw pallet on the floor, not solid (o.kind)', (o, w, d) => {
    box(0, 0, 0, w, d, 0.07, { side: strawV, top: strawT, noShadow: true });
    for (let i = 0; i < 9; i++) bar([h2(i, 1) * w, h2(i, 2) * d, 0.03], [h2(i, 1) * w + (h2(i, 3) - 0.5) * 0.3, h2(i, 2) * d + (h2(i, 4) - 0.5) * 0.3, 0.02], 0.03, flat(i & 1 ? 0xe8cc70 : 0xb89438));
    quad([0.04, d * 0.45, 0.078], [w - 0.1, 0, 0], [0, d * 0.5, 0], (s, t, q, a, b) => (h2(Math.floor(s * U), Math.floor(t * U)) < (Math.max(Math.abs(a - 0.5), Math.abs(b - 0.5)) - 0.42) * 8 ? -1 : mul(0x6a6258, 0.9 + h2(Math.floor(s * 16), Math.floor(t * 16)) * 0.2)), { n: [0, 0, 1], noShadow: true });
    poi(w * 0.5, d * 0.5, o.kind || 'sleep', 0, 1, 0.08);
  });
  // [corner] cradle 0.45 x 0.75
  def('cradle', 'r', [0.45, 0.75], 'rocking cradle with hood', (o, w, d) => {
    const c = o.c || OAK, rock = (s, t, q, a, b) => (b > 0.25 + 3 * (a - 0.5) * (a - 0.5) || b < 3 * (a - 0.5) * (a - 0.5) - 0.2 ? -1 : mul(c, 0.7));
    for (const y of [0.08, d - 0.1]) quad([-0.05, y, 0], [w + 0.1, 0, 0], [0, 0, 0.14], rock, { cut: true, noShadow: true });
    box(0.02, 0.02, 0.1, w - 0.04, d - 0.04, 0.2, { side: wh(c), top: flat(0xf0e8d8) });
    box(0.02, 0.02, 0.3, w - 0.04, 0.26, 0.16, { side: wh(c), top: sh(mul(c, 1.2)) });
    nb(0.05, 0.3, 0.3, w - 0.1, d - 0.36, 0.03, sh(o.c2 || 0x9ab0d0, 0.06)); blob(w / 2, 0.36, 0.34, 0.05, bl(0xf0c8a0), { noShadow: true });
    poi(w + 0.3, d * 0.5, 'work', -1, 0);
  });
  const doorsT = c => (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * V), Wt = Math.round(q.ul * U), Ht = Math.round(q.vl * V), half = Wt / 2, lx = X < half ? X : Wt - 1 - X; if (Y < 3) return mul(c, 0.6); if (Y >= Ht - 3) return mul(c, Y === Ht - 1 ? 1.25 : 0.85); if (lx < 2) return mul(c, 0.75); if (Math.abs(X - half + 0.5) < 1) return mul(c, 0.5); const px = lx - 2, pw = half - 3, e = Math.min(px - 2, pw - 2 - px, Y - 7, Ht - 8 - Y); if (lx === Math.floor(half) - 3 && Math.abs(Y - Ht * 0.5) < 2) return GOLD; if ((lx === 2 || lx === 3) && (Math.abs(Y - 10) < 2 || Math.abs(Y - Ht + 10) < 2)) return IRON; if (e === 0) return mul(c, 0.68); if (e === 1) return mul(c, 1.16); if (e > 1) return mul(c, 0.94 + h2(X >> 1, Y >> 3) * 0.08); return mul(c, 1.04 + h2(X, Y >> 3) * 0.06); };
  // [corner] wardrobe 1.0 x 0.5, 1.65 high
  def('wardrobe', 'r', o => [o.w || 1.0, 0.5], 'tall wardrobe (o.w, o.c)', (o, w, d) => {
    const c = o.c || WALNUT;
    box(0, 0, 0, w, d - 0.03, 1.55, { side: wd(mul(c, 0.9)), ty: doorsT(mul(c, 1.1)), noTop: true });
    box(-0.04, -0.02, 1.55, w + 0.08, d + 0.03, 0.1, { side: sh(mul(c, 1.2)), top: sh(mul(c, 0.9)) });
    nb(-0.02, 0, 0, w + 0.04, d, 0.07, sh(mul(c, 0.7)));
    poi(w / 2, d + 0.3, 'work', 0, -1);
  });
  const chestT = c => (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * V), Wt = Math.round(q.ul * U), Ht = Math.round(q.vl * V), e = Math.min(X, Wt - 1 - X); if (e === 3 || e === 4 || Y === 0) return X & 1 || Y & 1 ? IRON_L : 0x8a8a94; if (Y >= Ht - 1) return mul(c, 1.2); return mul(c, (Y % 5 === 0 ? 0.7 : 1) + h2(X >> 2, Y / 5 | 0) * 0.1); };
  const coinT = (dx, dy, ix, iy) => { const row = iy >> 1, X = ix + (row & 1) * 2, lx = X % 3, r = h2(X / 3 | 0, row); if (r < 0.04 && lx === 0) return 0xfff6c0 | FE; if (lx === 2) return r < 0.5 ? 0x8a5e16 : 0xa87420; return lx === 0 && (iy & 1) === 0 ? (r > 0.5 ? GOLD_L : 0xe8bc48) : r > 0.85 ? 0xc8962e : GOLD; };
  // [corner] chest 0.7 x 0.45.  o.open, o.gold (default true when open)
  def('chest', 'r', [0.7, 0.45], 'chest, closed or open with gold (o.open, o.gold, o.c)', (o, w, d) => {
    const c = o.c || 0x7a5234, tx = chestT(c);
    box(0, 0, 0, w, d, 0.3, { side: tx, top: flat(0x2a2028) });
    if (!o.open) { box(-0.01, -0.01, 0.3, w + 0.02, d + 0.02, 0.09, { side: tx, top: (s, t, q) => { const X = Math.floor(s * U), Wt = Math.round(q.ul * U), e = Math.min(X, Wt - 1 - X); return e === 3 || e === 4 ? IRON_L : mul(c, 1.15 - (Math.floor(t * U) % 5 === 0 ? 0.25 : 0)); } }); box(0.04, 0.03, 0.39, w - 0.08, d - 0.06, 0.05, { side: sh(mul(c, 1.05)), top: wt(mul(c, 1.2)) }); nb(w / 2 - 0.04, d, 0.24, 0.08, 0.015, 0.1, flat(GOLD)); }
    else { box(0, -0.02, 0.3, w, 0.07, 0.4, { side: tx, ty: (s, t, q) => { const X = Math.floor(s * U), Wt = Math.round(q.ul * U), e = Math.min(X, Wt - 1 - X); return e === 3 || e === 4 ? IRON_L : e < 1 ? mul(c, 0.7) : mul(0x6a2a30, 0.9 + h2(X, Math.floor(t * V)) * 0.15); }, top: sh(mul(c, 1.2)) });
      if (o.gold !== false) { for (let i = 0; i < 6; i++) blob(0.12 + (i % 3) * 0.23, 0.14 + (i > 2 ? 0.16 : 0), 0.26 + h2(i, 3) * 0.05, 0.11, coinT, { noShadow: true, f: E.F_NOAO }); icon(w * 0.3, d * 0.6, 0.36, A_GOBLET); spr(w * 0.7, d * 0.5, 0.37, 3, 3, (X, Y) => (X + Y === 2 || X === Y ? 0xff5a6a | FE : -1)); light(w / 2, d / 2, 0.6, 1.8, [1, 0.85, 0.4], 0.5); }
      else quad([0.03, 0.05, 0.27], [w - 0.06, 0, 0], [0, d - 0.08, 0], cloth(0x8a6a9a, 5), { n: [0, 0, 1], noShadow: true }); }
    poi(w / 2, d + 0.3, 'work', 0, -1);
  });
  const mirrorT = (s, t, q, a, b) => { const X = Math.floor(s * U), Y = Math.floor(t * V), Wt = Math.round(q.ul * U), Ht = Math.round(q.vl * V), dx = (a - 0.5) * 2, dy = (b - 0.5) * 2, d = dx * dx + dy * dy; if (d > 1) return -1; if (d > 0.72) return (X + Y) % 3 === 0 ? GOLD_L : GOLD; const g = X - Y + 40; return g % 9 < 2 ? 0xe4f0f4 : g % 9 < 4 ? 0xa8c4d4 : 0x7a9ab4; };
  // [corner] dressing table 0.9 x 0.95 with mirror and stool
  def('dressingTable', 'r', [0.9, 0.95], 'dressing table with mirror and stool (o.c)', (o, w) => {
    const c = o.c || 0x8a5a44;
    legs(0.03, 0.03, w - 0.06, 0.4, 0.44, 0.06, sh(mul(c, 0.75)));
    box(0, 0, 0.36, w, 0.46, 0.1, { side: sh(c), ty: drawers(mul(c, 1.1)), top: wt(mul(c, 1.25)) });
    quad([w / 2 - 0.22, 0.05, 0.46], [0.44, 0, 0], [0, 0, 0.62], mirrorT, { cut: true });
    icon(0.14, 0.2, 0.46, A_FLASK(0xe890b0)); icon(0.26, 0.3, 0.46, A_BOTTLE); icon(w - 0.14, 0.2, 0.46, A_STICK); nb(w - 0.34, 0.26, 0.46, 0.12, 0.08, 0.035, flat(0x8a2a4a), flat(0xb04a6a));
    light(w - 0.14, 0.3, 0.8, 2.2, [1, 0.8, 0.5], 0.4);
    Fz.stool(w / 2, 0.75, 0, { look: [0, -1], c: mul(c, 1.2) });
  });
  // [corner] folding screen, o.len (1.4) x 0.3, three or four painted panels
  def('screen', 'r', o => [o.len || 1.4, 0.3], 'folding screen (o.len, o.c)', (o, w) => {
    const n = Math.max(2, Math.round(w / 0.45)), pw = w / n, c = o.c || 0x2f5a5a;
    for (let i = 0; i < n; i++) {
      const y0 = i & 1 ? 0.26 : 0.04, y1 = i & 1 ? 0.04 : 0.26;
      const tx = (s, t, q, a, b) => { const X = Math.floor(a * 15), Y = Math.floor(b * 52); if (X === 0 || X === 14 || Y === 0 || Y >= 50) return WALNUT; if (X === 1 || X === 13 || Y === 1 || Y === 49) return GOLD; const fx = X - 7, fy = Y - 30 - i * 4; if (Y < 12) return mul(c, 0.7 + (Y % 4 === 0 ? 0.2 : 0)); if (fx * fx + fy * fy < 9) return (fx + fy) & 1 ? 0xf0a0b4 : 0xe8698a; if (Math.abs(fx - (Y - 12) * 0.12 + 2) < 0.7 && Y < 30 + i * 4) return 0x3a2c24; if (h2(X + i * 9, Y >> 1) < 0.07) return GOLD; return mul(c, 0.95 + h2(X >> 1, Y >> 2) * 0.1); };
      quad([i * pw, y0, 0], [pw, y1 - y0, 0], [0, 0, 1.3], tx, {}); nb(i * pw - 0.015, y0 - 0.015, 0, 0.03, 0.03, 1.32, flat(WALNUT));
    }
    nb(w - 0.015, (n & 1 ? 0.26 : 0.04) - 0.015, 0, 0.03, 0.03, 1.32, flat(WALNUT));
  });
  const tubT = c => (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * V), Ht = Math.round(q.vl * V); for (const hy of [3, Ht - 6]) if (Y >= hy && Y < hy + 2) return Y === hy + 1 ? 0x7a7a84 : 0x44444e; const px = X % 5; return mul(c, (px === 0 ? 0.62 : px === 1 ? 1.1 : 0.94) + h2(X / 5 | 0, 2) * 0.1); };
  const steamFn = sdv => (X, Y) => { const k = Math.sin(Y * 0.5 + sdv) * 2 + 3; return Math.abs(X - k) < 1.2 && (X + Y + sdv) % 2 === 0 && h2(X + sdv, Y) < 0.8 ? (0xe8eef2 | FE) : -1; };
  // [centre] wooden bath tub r 0.52 with warm water and a hint of steam
  def('bathTub', 'c', [1.1, 1.1], 'round wooden bath tub with steam (o.steam)', (o) => {
    const r = 0.5;
    cyl(0, 0, 0, r, 0.44, 14, tubT(0x8a623e), { top: flat(0xa8845a), inner: 0.86 });
    disk(0, 0, 0.36, r * 0.87, (s, t) => { const n = T.fbm(s * 6, t * 6); return (n > 0.6 ? 0xe8f4f4 : n > 0.5 ? 0x9ad0d4 : 0x6ab4bc) | NOAO; });
    nb(-0.16, r - 0.05, 0.3, 0.3, 0.1, 0.16, cloth(0xf0e8d8, 4), sh(0xf0e8d8, 0.04));
    if (o.steam !== false) for (let i = 0; i < 5; i++) spr((h2(i, 1) - 0.5) * 0.6, (h2(i, 2) - 0.5) * 0.5, 0.5 + h2(i, 3) * 0.25, 7, 14, steamFn(i * 3), { f: E.F_NOAO });
    poi(0, 0, 'bathe', 0, 1, 0.14, [0, r + 0.3]);
  });
  // [corner] washstand 0.5 x 0.42 with basin, jug and towel
  def('washstand', 'r', [0.5, 0.42], 'washstand with basin and jug', (o, w, d) => {
    const c = o.c || WOOD;
    legs(0.02, 0.02, w - 0.04, d - 0.04, 0.46, 0.05, sh(mul(c, 0.75))); nb(0.04, 0.04, 0.14, w - 0.08, d - 0.08, 0.03, sh(mul(c, 0.85)));
    box(0, 0, 0.46, w, d, 0.05, { side: sh(c), top: wt(mul(c, 1.2)) });
    frust(0.2, 0.22, 0.51, 0.09, 0.14, 0.07, 8, sh(0xe4ded0, 0.04), { noShadow: true }); disk(0.2, 0.22, 0.575, 0.12, waterTex(0x7ab4c4, 2));
    icon(0.41, 0.14, 0.51, A_JUG); quad([w + 0.005, 0.08, 0.2], [0, 0.22, 0], [0, 0, 0.3], cloth(0xf0e8d8, 4), { n: [1, 0, 0], noShadow: true });
    poi(w / 2, d + 0.3, 'bathe', 0, -1);
  });

  /* ================================================================================================
   *  STORAGE & WORK
   * ================================================================================================ */
  const SPINE = [0x8a2a2a, 0x2f5a8a, 0x3f6a3a, 0x6a3a7a, 0x9a6a2a, 0x5a3a2a, 0x2a4a4a, 0xa84a2a, 0x3a3a5a, 0x7a6a4a, 0x9a8a5a, 0x6a2a3a];
  /* cabinet front: frame, shelves and whatever fill(cv, x0, y0, x1, y1, row) paints in each recess */
  function caseFront(w, h, c, shelfPx, fill, seed) {
    const cv = PX(w * U, h * V, mul(c, 0.34)), W = cv.W, H = cv.H;
    let row = 0;
    for (let y = 3; y < H - 4; y += shelfPx, row++) { const y1 = Math.min(H - 5, y + shelfPx - 3); fill(cv, 2, y, W - 3, y1, row, seed); cv.r(2, y1 + 1, W - 3, y1 + 1, mul(c, 1.25)); cv.r(2, y1 + 2, W - 3, y1 + 2, mul(c, 0.7)); }
    cv.r(0, 0, W - 1, 2, mul(c, 0.72)).r(0, H - 4, W - 1, H - 1, mul(c, 0.95)).r(0, H - 1, W - 1, H - 1, mul(c, 1.25)).r(0, 0, 1, H - 1, mul(c, 0.9)).r(W - 2, 0, W - 1, H - 1, mul(c, 0.78)).r(0, 0, 0, H - 1, mul(c, 1.15));
    return cv;
  }
  function fillBooks(cv, x0, y0, x1, y1, row, seed) {
    let x = x0;
    while (x <= x1) {
      const r = h2(x * 7 + seed, row * 13 + seed), bw = r < 0.5 ? 2 : r < 0.85 ? 3 : 4, hh = y1 - y0 + 1, bh = Math.max(4, hh - 1 - ((h2(x + seed, row) * 4) | 0)), c = SPINE[(h2(x + seed * 3, row * 5) * SPINE.length) | 0];
      if (r > 0.94) { x += 3; continue; }                                    // a gap
      if (x + bw - 1 > x1) break;
      for (let i = 0; i < bw; i++) for (let j = 0; j < bh; j++) cv.p(x + i, y0 + j, mul(c, i === 0 ? 1.2 : i === bw - 1 && bw > 2 ? 0.75 : 1));
      if (bw > 2) { cv.r(x, y0 + bh - 3, x + bw - 1, y0 + bh - 3, GOLD); if (r < 0.7) cv.r(x, y0 + 2, x + bw - 1, y0 + 2, GOLD); } else if (r < 0.3) cv.p(x, y0 + bh - 3, GOLD_L);
      x += bw;
    }
  }
  // [corner] bookcase o.w (1.0) x 0.36, o.h (1.7) high
  def('bookcase', 'r', o => [o.w || 1.0, 0.36], 'full bookcase (o.w, o.h, o.seed, o.c)', (o, w, d) => {
    const c = o.c || WALNUT, h = o.h || 1.7, cv = caseFront(w, h - 0.08, c, 14, fillBooks, o.seed || 1);
    box(0, 0, 0, w, d, h - 0.08, { side: wd(mul(c, 0.9)), ty: cv.tex, noTop: true });
    box(-0.03, -0.01, h - 0.08, w + 0.06, d + 0.03, 0.08, { side: sh(mul(c, 1.2)), top: sh(mul(c, 0.85)) });
    if ((o.seed || 1) % 3 === 1) { book(w * 0.2, 0.1, h, SPINE[2]); icon(w * 0.7, 0.18, h, A_SKULL); } else if ((o.seed || 1) % 3 === 2) icon(w * 0.3, 0.18, h, A_STICK);
    poi(w / 2, d + 0.3, 'read', 0, -1);
  });
  function fillScrolls(cv, x0, y0, x1, y1, row, seed) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) { const m = ((x - x0) + (y - y0)) % 8, m2 = ((x - x0) - (y - y0) + 80) % 8; if (m === 0 || m2 === 0) cv.p(x, y, 0x7a5a3c); }
    for (let x = x0 + 3; x <= x1 - 2; x += 4) for (let y = y0 + 1; y <= y1 - 1; y += 4) { if (h2(x + seed, y + row * 7) < 0.78) { const xx = x + ((y >> 2) & 1) * 2; cv.r(xx, y, xx + 1, y + 1, 0xe8dcc0); cv.p(xx + 1, y, 0xb8a888); if (h2(x, y + seed) < 0.3) cv.p(xx, y + 1, 0xc8372f); } }
  }
  // [corner] scroll rack 0.9 x 0.36: pigeon-holes full of scrolls
  def('scrollRack', 'r', o => [o.w || 0.9, 0.36], 'rack of scrolls (o.w, o.h)', (o, w, d) => {
    const c = o.c || OAK, h = o.h || 1.3, cv = caseFront(w, h, c, 100, fillScrolls, o.seed || 2);
    box(0, 0, 0, w, d, h, { side: wd(mul(c, 0.9)), ty: cv.tex, top: sh(mul(c, 1.15)) });
    hcyl(0.14, 0.1, h + 0.03, 0.03, 0.26, 5, flat(0xe8dcc0), { ax: 'x', noShadow: true, cap: flat(0xb8a888) }); hcyl(0.2, 0.3, h + 0.03, 0.03, 0.3, 5, flat(0xdcd0b0), { ax: 'x', noShadow: true });
    poi(w / 2, d + 0.3, 'read', 0, -1);
  });
  /* pixel weapons, drawn point-up from (x, y0) */
  function pxSpear(cv, x, y0, len) { cv.r(x, y0, x, y0 + len - 6, 0xa8845a); cv.r(x + 1, y0, x + 1, y0 + len - 6, 0x6a4a30); cv.r(x, y0 + len - 5, x, y0 + len - 1, 0xd8dce4); cv.p(x - 1, y0 + len - 5, STEEL).p(x + 1, y0 + len - 5, STEEL).p(x - 1, y0 + len - 4, STEEL).p(x + 1, y0 + len - 4, 0x8a909c); }
  function pxSword(cv, x, y0, len, down) { const s = down ? -1 : 1, yb = down ? y0 + len - 1 : y0; cv.r(x, Math.min(yb, yb + s * 4), x, Math.max(yb, yb + s * 4), 0x6a4a30); cv.p(x, yb, GOLD); cv.r(x - 2, yb + s * 5, x + 2, yb + s * 5, GOLD); for (let i = 6; i < len; i++) { cv.p(x, yb + s * i, 0xd8dce4); if (i < len - 1) cv.p(x + 1, yb + s * i, 0x8a909c); } }
  function pxAxe(cv, x, y0, len) { cv.r(x, y0, x, y0 + len - 1, 0x7a5a3c); cv.r(x + 1, y0 + len - 7, x + 3, y0 + len - 2, STEEL); cv.r(x + 4, y0 + len - 8, x + 4, y0 + len - 1, 0xd8dce4); cv.r(x - 2, y0 + len - 5, x - 1, y0 + len - 3, 0x8a909c); cv.p(x, y0 + len, 0xd8dce4); }
  function pxShield(cv, cx, cy, r, c1, c2, dev) {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const yy = (y + r) / (2 * r), half = yy > 0.5 ? r : r * Math.sqrt(Math.max(0, 1 - (1 - yy * 2) * (1 - yy * 2) * 0.9)) ; if (Math.abs(x) > half) continue;
      const edge = Math.abs(x) > half - 1.1 || y === r || (yy <= 0.5 && Math.abs(x) > r * Math.sqrt(Math.max(0, 1 - (1 - (yy - 1 / (2 * r)) * 2) * (1 - (yy - 1 / (2 * r)) * 2) * 0.9)) - 1.1);
      let c = dev === 1 ? (x < 0 ? c1 : c2) : dev === 2 ? (Math.abs(x) < r * 0.3 || Math.abs(y - r * 0.2) < r * 0.3 ? c2 : c1) : dev === 3 ? (Math.abs(Math.abs(x) + y - r * 0.2) < r * 0.3 ? c2 : c1) : dev === 4 ? ((x + y + 40) % 6 < 3 ? c1 : c2) : (x * x + (y - 1) * (y - 1) < r * r * 0.16 ? c2 : c1);
      cv.p(cx + x, cy + y, edge ? 0x8a909c : mul(c, x < -r * 0.3 ? 1.12 : 1));
    }
    cv.p(cx, cy + Math.round(r * 0.1), 0xe8ecf0);
  }
  const HERALD = [[RED, GOLD], [BLUE, 0xe8e2d4], [GREEN, GOLD], [0x2a2630, 0xc8372f], [PURPLE, 0xe8e2d4], [0xe8e2d4, RED], [GOLD, BLUE]];
  // [corner] weapon rack 1.2 x 0.36.  o.kind 'mixed' | 'spears' | 'swords', o.shields
  def('weaponRack', 'r', o => [o.w || 1.2, 0.36], 'rack of spears / swords / axes (o.kind, o.shields, o.seed)', (o, w, d) => {
    const c = WOOD_D, cv = PX(w * U, 62), n = Math.floor((cv.W - 6) / 6), kd = o.kind || 'mixed', seed = o.seed || 0;
    for (const x of [0, w - 0.07]) box(x, 0.04, 0, 0.07, 0.1, 1.15, { side: sh(c) });
    box(0, 0.12, 0, w, 0.22, 0.1, { side: sh(c), top: wt(mul(c, 1.2)) });
    for (const z of [0.5, 0.98]) nb(0.05, 0.1, z, w - 0.1, 0.05, 0.07, sh(mul(c, 1.2)));
    for (let i = 0; i < n; i++) { const x = 4 + i * 6, r = h2(i + seed, 7 + seed), k = kd === 'spears' ? 0 : kd === 'swords' ? 1 : (r * 3) | 0; if (r > 0.9) continue; if (k === 0) pxSpear(cv, x, 4, 52 + (r * 8 | 0)); else if (k === 1) pxSword(cv, x, 6, 34 + (r * 6 | 0)); else pxAxe(cv, x, 4, 44 + (r * 6 | 0)); }
    quad([0, 0.2, 0], [w, 0, 0], [0, 0.1, 62 / V], cv.tex, { cut: true, noShadow: true });
    if (o.shields !== false) { const sv = PX(cv.W, 22); const m = Math.max(1, Math.floor(w / 0.45)); for (let i = 0; i < m; i++) { const hc = HERALD[(i + seed) % HERALD.length]; pxShield(sv, Math.round(sv.W * (i + 0.5) / m), 10, 8, hc[0], hc[1], (i + seed) % 5); } vart(sv, 0, 0.345, 0.12); }
    poi(w / 2, d + 0.3, 'work', 0, -1);
  });
  const steelB = (dx, dy, ix, iy) => { const k = dx * 0.6 - dy * 0.5; return k < -0.45 ? 0xe4e8ee : k < 0.1 ? STEEL : k < 0.5 ? 0x7c8290 : 0x5a606c; };
  const helmB = (dx, dy, ix, iy) => { if (dy > -0.15 && dy < 0.12 && dx > -0.5 && dx < 0.75) return 0x22202a; if (dy >= 0.12 && dx > -0.3 && dx < 0.6 && ((ix + iy) & 1)) return 0x4a4e5a; return steelB(dx, dy, ix, iy); };
  /* cuirass + helm at (x, y), feet at z.  full = arms, legs and tassets */
  function plateArmour(x, y, z, full, plume) {
    if (full) { for (const dx of [-0.075, 0.075]) { nb(x + dx - 0.05, y - 0.05, z, 0.1, 0.1, 0.34, metal(0x8a909c)); nb(x + dx - 0.06, y - 0.04, z, 0.12, 0.14, 0.05, metal(0x6a707c)); blob(x + dx, y + 0.02, z + 0.2, 0.06, steelB, { noShadow: true }); } }
    frust(x, y, z + 0.32, 0.17, 0.12, 0.14, 8, metal(0x8a909c), { noShadow: !full });
    blob(x, y, z + 0.56, 0.155, steelB); frust(x, y, z + 0.44, 0.12, 0.15, 0.06, 8, flat(0x6a4a30), { noShadow: true });
    if (full) for (const dx of [-0.19, 0.19]) { nb(x + dx - 0.04, y - 0.04, z + 0.36, 0.08, 0.08, 0.26, metal(0x8a909c)); blob(x + dx, y, z + 0.34, 0.05, steelB, { noShadow: true }); }
    for (const dx of [-0.17, 0.17]) blob(x + dx, y, z + 0.64, 0.075, steelB, { noShadow: true });
    blob(x, y, z + 0.8, 0.1, helmB, { noShadow: true });
    if (plume) { blob(x, y - 0.03, z + 0.93, 0.05, bl(plume), { noShadow: true }); blob(x, y - 0.08, z + 0.9, 0.045, bl(mul(plume, 0.85)), { noShadow: true }); }
  }
  // [centre] armour stand: cuirass and helm on a wooden cross
  def('armourStand', 'c', [0.5, 0.5], 'cuirass and helm on a wooden stand (o.plume)', (o) => {
    nb(-0.2, -0.04, 0, 0.4, 0.08, 0.05, sh(WOOD_D)); nb(-0.04, -0.2, 0, 0.08, 0.4, 0.05, sh(WOOD_D)); box(-0.035, -0.035, 0, 0.07, 0.07, 0.5, { side: sh(WOOD) });
    plateArmour(0, 0, 0.12, false, o.plume);
    bar([-0.24, 0, 0.74], [0.24, 0, 0.74], 0.05, flat(WOOD), {});
  });
  // [centre] full suit of armour on a low plinth, holding a halberd (or o.weapon 'sword')
  def('armour', 'c', [0.6, 0.6], 'standing suit of armour (o.plume, o.weapon: halberd | sword)', (o) => {
    box(-0.28, -0.28, 0, 0.56, 0.56, 0.1, { side: stn(0x8a857c), top: stn(0x9a958a) });
    plateArmour(0, 0, 0.1, true, o.plume === undefined ? 0xc8372f : o.plume);
    if (o.weapon === 'sword') { const cv = PX(5, 26); pxSword(cv, 2, 0, 26, true); spr(0, 0.16, 0.1, 5, 26, cv.fn); }
    else { const cv = PX(9, 62); pxAxe(cv, 3, 0, 58); cv.r(3, 56, 3, 61, 0xd8dce4); spr(0.24, 0.06, 0.1, 9, 62, cv.fn); }
  });
  // [wall] row of o.n (3) heraldic shields, optionally over crossed spears.  o.h (1.3) = height of the shield centres
  def('shieldWall', 'w', o => [(o.n || 3) * 0.5, 0.06], 'shields hung on a wall (o.n, o.h, o.seed, o.spears)', (o, w) => {
    const n = o.n || 3, h = o.h || 1.3, cv = PX(w * U, 30), seed = o.seed || 0;
    if (o.spears !== false) { cv.line(1, 4, cv.W - 2, 25, 0x8a6a44).line(1, 25, cv.W - 2, 4, 0x8a6a44); cv.r(cv.W - 3, 24, cv.W - 1, 27, 0xd8dce4).r(0, 24, 2, 27, 0xd8dce4); }
    for (let i = 0; i < n; i++) { const hc = HERALD[(i + seed) % HERALD.length]; pxShield(cv, Math.round(cv.W * (i + 0.5) / n), 14, 10, hc[0], hc[1], (i + seed * 2) % 5); }
    vart(cv, -w / 2, 0.03, h - 15 / V);
  });
  function fillBottles(cv, x0, y0, x1, y1, row, seed) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) { if ((x - x0) % 6 === 5 || (y - y0) % 6 === 5) cv.p(x, y, 0x8a6444); }
    for (let x = x0; x + 4 <= x1; x += 6) for (let y = y0; y + 4 <= y1; y += 6) { if (h2(x + seed, y) < 0.82) { const g = h2(x, y + seed) < 0.3 ? 0x5a2a3a : 0x2f5a3a; cv.r(x + 1, y + 1, x + 3, y + 3, g); cv.p(x + 2, y + 2, h2(x, y) < 0.5 ? 0xc8372f : GOLD).p(x + 1, y + 3, mul(g, 1.6)); } }
  }
  // [corner] wine rack o.w (1.0) x 0.36, 1.35 high
  def('wineRack', 'r', o => [o.w || 1.0, 0.36], 'wine rack full of bottles (o.w, o.h)', (o, w, d) => {
    const c = o.c || WOOD, h = o.h || 1.35, cv = caseFront(w, h, c, 200, fillBottles, o.seed || 4);
    box(0, 0, 0, w, d, h, { side: wd(mul(c, 0.9)), ty: cv.tex, top: wt(mul(c, 1.15)) });
    icon(w * 0.25, 0.18, h, A_BOTTLE); icon(w * 0.4, 0.22, h, A_BOTTLE); icon(w * 0.7, 0.18, h, A_JUG);
    poi(w / 2, d + 0.3, 'work', 0, -1);
  });
  const caskT = c => (s, t) => { const X = Math.floor(s * U), Y = Math.floor(t * U), m = X % 12; return (m === 1 || m === 2) ? (m === 1 ? 0x44444e : 0x7a7a84) : mul(c, (Y % 5 === 0 ? 0.64 : Y % 5 === 1 ? 1.1 : 0.95) + h2(X >> 3, Y / 5 | 0) * 0.1); };
  const caskEnd = c => (s, t, q, a, b) => { const dd = Math.hypot(a - 0.5, b - 0.5), X = Math.floor(a * q.ul * U); if (dd > 0.45) return dd > 0.48 ? 0x44444e : 0x6a6a74; if (Math.abs(a - 0.5) < 0.05 && b > 0.16 && b < 0.3) return BRASS; if (Math.abs(a - 0.5) < 0.09 && b > 0.12 && b < 0.17) return 0x8a6a2a; if (dd < 0.05) return 0x3a2c22; return mul(c, (X % 5 === 0 ? 0.66 : 1.02) + h2(X / 5 | 0, 1) * 0.1); };
  // [corner] big wine cask on a cradle 1.0 x 1.2, tap toward the front
  def('cask', 'r', [1.0, 1.2], 'great cask on its cradle (o.c)', (o, w, d) => {
    const c = o.c || 0x8a5a3a, r = 0.44;
    for (const y of [0.16, d - 0.3]) { box(0.06, y, 0, w - 0.12, 0.12, 0.14, { side: sh(WOOD_D) }); nb(0.06, y, 0.14, 0.14, 0.12, 0.12, sh(WOOD_D)); nb(w - 0.2, y, 0.14, 0.14, 0.12, 0.12, sh(WOOD_D)); }
    hcyl(w / 2, 0.04, 0.12 + r, r, d - 0.1, 14, caskT(c), { cap: caskEnd(mul(c, 1.15)) });
    icon(w / 2 + 0.2, d + 0.12, 0, A_MUG);
    poi(w / 2, d + 0.3, 'drink', 0, -1);
  });
  function fillJars(cv, x0, y0, x1, y1, row, seed) {
    const J = [0xa8604a, 0xc9a66c, 0x6a8a9a, 0x8a9a5a, 0xd8d2c4, 0x7a5a8a, 0xb8843e];
    for (let x = x0 + 1; x + 4 <= x1; x += 5) {
      const r = h2(x * 3 + seed, row * 11 + seed), c = J[(h2(x + seed, row) * J.length) | 0], k = (r * 5) | 0;
      if (k === 0) { cv.r(x, y0, x + 3, y0 + 4, c).r(x, y0, x, y0 + 4, mul(c, 1.25)).r(x, y0 + 5, x + 3, y0 + 5, 0xe8dcc0); }                   // jar with cloth lid
      else if (k === 1) { cv.r(x + 1, y0, x + 2, y0 + 5, 0x3f6a4a).p(x + 1, y0 + 6, 0x3f6a4a).p(x + 1, y0 + 7, 0xc9a66c).p(x + 1, y0 + 3, 0x6a9a70); }       // bottle
      else if (k === 2) { cv.r(x, y0, x + 3, y0 + 1, c).p(x, y0 + 2, c).p(x + 3, y0 + 2, c).r(x, y0 + 1, x, y0 + 1, mul(c, 1.25)); }             // bowl
      else if (k === 3) { cv.r(x, y0, x + 3, y0 + 3, 0xc9b48a).r(x + 1, y0 + 4, x + 2, y0 + 4, 0xc9b48a).p(x + 1, y0 + 5, 0x6a5030).p(x, y0 + 2, 0xe0d0a8); }  // sack
      else if (r < 0.93) { cv.r(x, y0, x + 2, y0 + 3, c).r(x, y0 + 4, x + 2, y0 + 4, mul(c, 0.7)).p(x, y0 + 2, mul(c, 1.3)); }                      // crock
    }
  }
  // [corner] storage shelves o.w (1.0) x 0.32, 1.45 high, full of jars, bottles and sacks
  def('shelves', 'r', o => [o.w || 1.0, 0.32], 'shelves with jars and bottles (o.w, o.h, o.seed)', (o, w, d) => {
    const c = o.c || WOOD, h = o.h || 1.45, cv = caseFront(w, h, c, 13, fillJars, o.seed || 3);
    box(0, 0, 0, w, d, h, { side: wd(mul(c, 0.9)), ty: cv.tex, top: wt(mul(c, 1.15)) });
    icon(w * 0.3, 0.16, h, A_JUG); nb(w * 0.55, 0.08, h, 0.2, 0.16, 0.1, wicker, flat(0x6a4c2c));
    poi(w / 2, d + 0.3, 'work', 0, -1);
  });
  const wicker = (s, t) => { const X = Math.floor(s * U), Y = Math.floor(t * V); return ((X >> 1) + Y) & 1 ? 0xb08a50 : 0x8a6838; };
  const crateT = c => (s, t, q) => T.wood(s, t, { P: { c, crate: true }, ul: q.ul, vl: q.vl });
  const sackB = c => (dx, dy, ix, iy) => mul(c, ((ix + iy) & 3) === 0 ? 0.88 : 0.97 + h2(ix, iy) * 0.06);
  function sack(x, y, z, c, s) { s = s || 1; c = c || 0xc9b48a; blob(x, y, z + 0.19 * s, 0.23 * s, sackB(c)); blob(x + 0.02, y + 0.02, z + 0.42 * s, 0.1 * s, sackB(c), { noShadow: true }); blob(x + 0.02, y + 0.02, z + 0.35 * s, 0.065 * s, flat(0x6a5030), { noShadow: true }); }
  function crate(x, y, z, s, c) { box(x, y, z, s, s, s * 0.9, { side: crateT(c || 0x9a7448), top: wt(0xa88254) }); }
  function keg(x, y, z, r, h, c) { cyl(x, y, z, r, h, 10, tubT(c || 0x8a623e), { top: (s, t, q, a, b) => (Math.hypot(a - 0.5, b - 0.5) > 0.42 ? 0x5a4a44 : mul(0x74543a, Math.floor(s * U) % 5 === 0 ? 0.75 : 1)) }); }
  // [corner] stack of stores 1.3 x 0.95.  o.kind 'mixed' | 'sacks' | 'crates' | 'barrels'
  def('stack', 'r', [1.3, 0.95], 'stack of sacks, crates and barrels (o.kind, o.seed)', (o, w, d) => {
    const k = o.kind || 'mixed';
    if (k === 'sacks') { for (const p of [[0.25, 0.25], [0.7, 0.22], [1.08, 0.3], [0.3, 0.7], [0.75, 0.68]]) sack(p[0], p[1], 0, p[0] > 0.6 && p[1] < 0.5 ? 0xb89a6a : 0xc9b48a); sack(0.48, 0.42, 0.3, 0xd4c098); sack(0.92, 0.48, 0.28); }
    else if (k === 'crates') { crate(0.02, 0.04, 0, 0.55); crate(0.62, 0.02, 0, 0.6, 0x8a6a44); crate(0.1, 0.5, 0, 0.42, 0x8a6444); crate(0.66, 0.08, 0.54, 0.45); crate(0.7, 0.55, 0, 0.38); }
    else if (k === 'barrels') { keg(0.3, 0.3, 0, 0.27, 0.64); keg(0.9, 0.3, 0, 0.27, 0.64, 0x7a5636); keg(0.6, 0.68, 0, 0.25, 0.6, 0x966a40); keg(0.58, 0.3, 0.64, 0.2, 0.4); }
    else { crate(0.02, 0.02, 0, 0.55); crate(0.1, 0.08, 0.5, 0.4, 0x8a6a44); keg(0.9, 0.3, 0, 0.27, 0.64); sack(0.3, 0.72, 0); sack(0.75, 0.7, 0, 0xb89a6a); sack(1.1, 0.72, 0, 0xd4c098, 0.85); }
  });
  // [corner] upright loom 1.0 x 0.95 with a half-woven cloth and a weaver's stool
  def('loom', 'r', [1.0, 0.95], 'upright loom with stool (o.c cloth colour)', (o, w) => {
    const c = o.c || 0x8a2a3a, cv = PX(26, 44);
    for (let x = 0; x < 26; x++) for (let y = 0; y < 44; y++) { if (y < 17) cv.p(x, y, x < 1 || x > 24 ? mul(c, 0.7) : (y % 6 === 3 ? GOLD : ((x + y) % 4 === 0 ? mul(c, 0.8) : c))); else if (x % 2 === 0) cv.p(x, y, y === 17 ? 0xa89a7a : 0xe8dcc0); }
    for (const x of [0, w - 0.08]) { box(x, 0.1, 0, 0.08, 0.1, 1.35, { side: sh(WOOD_D) }); nb(x, 0, 0, 0.08, 0.36, 0.06, sh(WOOD_D)); }
    nb(0, 0.11, 1.27, w, 0.08, 0.08, sh(WOOD)); hcyl(0.15, 0.04, 0.18, 0.05, w - 0.08, 6, flat(mul(c, 0.9)), { ax: 'x', noShadow: true });
    vart(cv, 0.09, 0.16, 0.2); nb(0.06, 0.17, 0.62, w - 0.12, 0.03, 0.03, flat(WOOD_L));
    Fz.stool(w / 2, 0.72, 0, { kind: 'work', look: [0, -1] });
  });
  const wheelT = (c, n) => (s, t, q, a, b) => { const dx = a - 0.5, dy = b - 0.5, d = Math.sqrt(dx * dx + dy * dy); if (d > 0.5) return -1; if (d > 0.4) return d > 0.46 ? mul(c, 0.7) : c; if (d < 0.09) return mul(c, 0.6); const an = Math.atan2(dy, dx) / (6.2832 / n); return Math.abs(an - Math.round(an)) * d < 0.045 ? mul(c, 0.9) : -1; };
  // [corner] spinning wheel 0.9 x 0.4
  def('spinningWheel', 'r', [0.9, 0.4], 'spinning wheel', (o, w, d) => {
    const c = o.c || WOOD;
    quad([0.02, 0.2, 0.14], [0.62, 0, 0], [0, 0, 0.62 * 0.8], wheelT(c, 10), { cut: true });
    for (const y of [0.13, 0.25]) bar([0.33, y, 0], [0.33, y, 0.5], 0.05, flat(mul(c, 0.75)));
    box(0.3, 0.08, 0.2, 0.58, 0.24, 0.05, { side: sh(mul(c, 0.85)), top: wt(mul(c, 1.15)) });
    bar([0.84, 0.1, 0], [0.8, 0.14, 0.2], 0.045, flat(mul(c, 0.7))); bar([0.84, 0.3, 0], [0.8, 0.26, 0.2], 0.045, flat(mul(c, 0.7)));
    bar([0.8, 0.2, 0.25], [0.8, 0.2, 0.72], 0.04, flat(mul(c, 0.8))); blob(0.8, 0.2, 0.78, 0.085, bl(0xf0ead8, 0.14), { noShadow: true });
    bar([0.34, 0.2, 0.44], [0.74, 0.2, 0.42], 0.02, flat(0xf0ead8));
    poi(0.6, d + 0.3, 'work', 0, -1);
  });
  // [corner] laundry: wash tub and a clothes line o.len (2.2) long
  def('laundry', 'R', o => [o.len || 2.2, 1.0], 'wash tub and clothes line (o.len, o.seed)', (o, w, d) => {
    const seed = o.seed || 0, CL = [0xc8372f, 0xf0e8d8, 0x4a70c0, 0xe8dcc0, 0x6a8a5a, 0xd9a83a];
    for (const x of [0.06, w - 0.06]) { box(x - 0.04, 0.16, 0, 0.08, 0.08, 1.62, { side: sh(WOOD_D) }); block(x - 0.08, 0.12, 0.16, 0.16); }
    const n = 8; for (let i = 0; i < n; i++) { const a = i / n, b = (i + 1) / n, za = 1.56 - 0.5 * a * (1 - a), zb = 1.56 - 0.5 * b * (1 - b); bar([0.06 + (w - 0.12) * a, 0.2, za], [0.06 + (w - 0.12) * b, 0.2, zb], 0.02, flat(0xc9b48a)); }
    const m = Math.max(2, Math.floor((w - 0.3) / 0.52));
    for (let i = 0; i < m; i++) { const t = (i + 0.5) / m, x = 0.06 + (w - 0.12) * t, zt = 1.56 - 0.5 * t * (1 - t), k = (i + seed) % 3, c = CL[(i + seed) % CL.length], cw = k === 2 ? 17 : k === 0 ? 14 : 11, ch = k === 0 ? 21 : k === 1 ? 18 : 27, cv = PX(cw, ch);
      if (k === 0) { cv.r(3, 0, cw - 4, ch - 1, c).r(0, ch - 8, cw - 1, ch - 1, c).r(5, ch - 2, cw - 6, ch - 1, mul(c, 0.6)); }       // shirt
      else if (k === 1) { cv.r(0, 8, cw - 1, ch - 1, c).r(0, 0, 4, 8, c).r(cw - 5, 0, cw - 1, 8, c); }                                  // hose
      else cv.r(0, 0, cw - 1, ch - 1, c);                                                                                             // sheet
      cv.each((X, Y, v) => (v < 0 ? undefined : mul(v, [0.86, 1.04, 0.96][X % 3] * (Y < 2 ? 0.85 : 1))));
      vart(cv, x - cw / 64, 0.2, zt - ch / V - 0.005, { noShadow: false }); }
    cyl(0.5, 0.66, 0, 0.3, 0.3, 10, tubT(0x8a623e), { top: flat(0xa8845a), inner: 0.84 }); disk(0.5, 0.66, 0.25, 0.26, (s, t) => (T.fbm(s * 9, t * 9) > 0.5 ? 0xf4f8f8 : 0x8ab8c4) | NOAO);
    blob(0.42, 0.6, 0.29, 0.07, bl(0xf4f8f8, 0.04), { noShadow: true }); block(0.2, 0.36, 0.6, 0.6);
    cyl(1.05, 0.72, 0, 0.17, 0.14, 8, wicker, { top: flat(0x6a4c2c) }); blob(1.05, 0.72, 0.17, 0.12, bl(0xf0e8d8, 0.06), { noShadow: true }); block(0.88, 0.55, 0.34, 0.34);
    poi(0.5, 1.2, 'work', 0, -1); poi(w * 0.7, 0.55, 'work', 0, -1);
  });
  // [corner] map table 1.6 x 1.0
  def('mapTable', 'r', [1.6, 1.0], 'war-room map table with markers (o.seed)', (o, w, d) => {
    const c = o.c || WALNUT, seed = o.seed || 3;
    const map = (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * U), Wt = Math.round(q.ul * U), Ht = Math.round(q.vl * U), e = Math.min(X, Y, Wt - 1 - X, Ht - 1 - Y); if (e < 3) return mul(c, 1.25 - (Y % 7 === 0 ? 0.3 : 0)); if (e < 4) return 0xb8a070; const n = T.fbm(X * 0.09 + seed, Y * 0.09), r = T.vn(X * 0.2 + 9, Y * 0.2 + seed); if (n < 0.4) return ((X + Y) % 6 === 0) ? 0x9ab8c8 : 0xb4ccd4; if (n < 0.43) return 0x7a6a4a; if (Math.abs(T.vn(X * 0.07, Y * 0.07 + seed) - 0.5) < 0.02) return 0x6a94b4; if (n > 0.62 && (X + Y) % 3 === 0) return 0x8a7a5a; if (r > 0.72 && (X & 1)) return 0x7a9a5a; return mul(0xe4d4a8, 0.94 + h2(X >> 1, Y >> 1) * 0.1); };
    for (const p of [[0.08, 0.08], [w - 0.2, 0.08], [0.08, d - 0.2], [w - 0.2, d - 0.2]]) box(p[0], p[1], 0, 0.12, 0.12, 0.44, { side: sh(mul(c, 0.8)), noTop: true });
    nb(0.14, 0.14, 0.12, w - 0.28, 0.06, 0.06, flat(mul(c, 0.66))); nb(0.14, d - 0.2, 0.12, w - 0.28, 0.06, 0.06, flat(mul(c, 0.66)));
    box(0, 0, 0.44, w, d, 0.07, { side: sh(c), top: map });
    const pawn = cc => (X, Y) => (Y < 2 ? cc : Y < 4 ? (X === 1 ? cc : -1) : (X === 1 ? mul(cc, 1.3) : -1));
    for (let i = 0; i < 7; i++) spr(0.2 + h2(i, seed) * (w - 0.4), 0.2 + h2(seed, i) * (d - 0.4), 0.51, 3, 5, pawn(i % 3 === 0 ? 0x4a70c0 : 0xc8372f), { f: E.F_NOAO });
    icon(0.12, 0.12, 0.51, A_STICK); hcyl(0.84, w - 0.42, 0.535, 0.022, 0.26, 5, flat(0xe8dcc0), { ax: 'x', noShadow: true }); icon(w - 0.14, 0.2, 0.51, A_INK);
    light(0.12, 0.3, 0.9, 2.6, [1, 0.8, 0.5], 0.5);
    poi(w / 2, d + 0.3, 'work', 0, -1); poi(w + 0.3, d / 2, 'work', -1, 0); poi(w * 0.3, -0.3, 'work', 0, 1);
  });
  // [centre] globe on a stand
  def('globe', 'c', [0.6, 0.6], 'globe on a wooden stand', (o) => {
    cyl(0, 0, 0, 0.2, 0.05, 8, sh(WOOD_D), { top: sh(WOOD) }); cyl(0, 0, 0.05, 0.05, 0.3, 6, sh(WOOD), {}); cyl(0, 0, 0.33, 0.1, 0.04, 6, sh(WOOD_D), { top: sh(WOOD), noShadow: true });
    const seed = o.seed || 5; blob(0, 0, 0.62, 0.25, (dx, dy, ix, iy) => { const n = T.fbm(ix * 0.09 + seed, iy * 0.11 + seed); if (dy < -0.82 || dy > 0.86) return 0xe8f0f4; if (n > 0.5) return n > 0.6 ? 0xb89a5a : (ix + iy) % 3 === 0 ? 0x7aa84e : 0x5c8f44; return Math.abs(dy) < 0.05 || Math.abs(dy + 0.45) < 0.04 || Math.abs(dy - 0.45) < 0.04 ? 0x5a8ac0 : 0x3a6aa8; });
    quad([-0.3, 0, 0.36], [0.6, 0, 0], [0, 0, 0.52], (s, t, q, a, b) => { const d = Math.hypot(a - 0.5, b - 0.5); return d > 0.5 || d < 0.455 || a < 0.5 ? -1 : (Math.floor(b * 16) & 1 ? BRASS : GOLD_L); }, { cut: true, noShadow: true, bias: 0.3 });
    poi(0, 0.55, 'read', 0, -1);
  });
  // [corner] lectern 0.5 x 0.5 with an open book
  def('lectern', 'r', [0.5, 0.5], 'lectern with an open book (o.c)', (o, w, d) => {
    const c = o.c || WALNUT;
    box(0.08, 0.1, 0, w - 0.16, 0.34, 0.07, { side: sh(mul(c, 0.8)) }); box(w / 2 - 0.06, 0.2, 0.07, 0.12, 0.12, 0.72, { side: sh(c), noTop: true });
    const bk = (s, t, q, a, b) => { const X = Math.floor(a * 16), Y = Math.floor(b * 14); if (X === 0 || X === 15 || Y === 0 || Y === 13) return 0x8a2a2a; if (X === 7 || X === 8) return 0xb8a888; if (X === 9 && Y < 5) return 0xc8372f; return (Y % 2 === 0 && h2(X, Y) < 0.8 && X > 1 && X < 14) ? 0x8a8070 : 0xf0e8d0; };
    quad([0.02, 0.08, 1.02], [w - 0.04, 0, 0], [0, 0.4, -0.24], wd(mul(c, 1.15)), { n: [0, 0.5, 0.86] });
    quad([0.06, 0.12, 1.012], [w - 0.12, 0, 0], [0, 0.32, -0.192], bk, { n: [0, 0.5, 0.86], noShadow: true, bias: 0.03 });
    box(0.02, 0.06, 0.74, w - 0.04, 0.06, 0.29, { side: sh(mul(c, 0.9)), noTop: true }); nb(0.02, 0.46, 0.76, w - 0.04, 0.03, 0.05, sh(mul(c, 0.8)));
    poi(w / 2, d + 0.3, 'read', 0, -1);
  });
  // [corner] alchemist's bench 1.4 x 0.6 with glowing flasks
  def('alchemy', 'r', [1.4, 0.6], "alchemist's bench with glowing flasks (o.seed)", (o, w, d) => {
    const c = 0x5a4634, G = [0x5af08a, 0xb46af0, 0x4ac8f0, 0xf0c84a, 0xf06a8a], seed = o.seed || 0;
    legs(0.04, 0.04, w - 0.08, d - 0.08, 0.46, 0.09, sh(mul(c, 0.75))); nb(0.08, 0.1, 0.12, w - 0.16, d - 0.2, 0.04, wt(mul(c, 0.9)));
    box(0, 0, 0.46, w, d, 0.06, { side: sh(c), top: (s, t) => { const X = Math.floor(s * U), Y = Math.floor(t * U), n = T.fbm(X * 0.15, Y * 0.15); return n > 0.66 ? 0x4a6a4a : n < 0.3 ? 0x3a2c24 : mul(c, 1.2 - (Y % 7 === 0 ? 0.3 : 0)); } });
    // back rack of bottles
    const cv = PX(w * U - 4, 20); cv.r(0, 0, cv.W - 1, 1, WOOD_D).r(0, 10, cv.W - 1, 11, WOOD_D).r(0, 0, 1, 19, WOOD_D).r(cv.W - 2, 0, cv.W - 1, 19, WOOD_D);
    for (let x = 4; x < cv.W - 5; x += 4) for (const y of [2, 12]) { const r = h2(x + seed, y); if (r < 0.75) { const g = G[(r * 13 | 0) % 5]; cv.r(x, y, x + 1, y + 3, g | FE); cv.p(x, y + 4, 0xd8dce4).p(x, y + 5, 0x8a6a44); } }
    vart(cv, 0.06, 0.05, 0.52);
    // big glowing vessels
    for (let i = 0; i < 3; i++) { const x = 0.26 + i * 0.36, g = G[(i + seed) % 5]; blob(x, 0.32, 0.6, 0.075, (dx, dy) => (dx * dx + dy * dy < 0.5 && dy > -0.3 ? (dy < -0.1 ? mul(g, 1.2) : g) | FE : dy < -0.25 ? 0xd8e4e8 : mul(g, 0.6) | FE), { noShadow: true, f: E.F_NOAO }); spr(x, 0.32, 0.66, 2, 5, (X, Y) => (Y === 4 ? 0x8a6a44 : 0xc8dce4), { f: E.F_NOAO }); light(x, 0.4, 0.75, 1.7, [(g >> 16 & 255) / 255, (g >> 8 & 255) / 255, (g & 255) / 255], 0.7); }
    icon(0.1, 0.4, 0.52, A_SKULL); book(1.12, 0.3, 0.52, 0x3f6a3a, 0.2, 0.15); book(1.14, 0.31, 0.56, 0x6a3a7a, 0.16, 0.12); icon(0.46, 0.46, 0.52, A_FLASK(G[(seed + 3) % 5])); icon(0.8, 0.48, 0.52, A_FLASK(G[(seed + 1) % 5]));
    cyl(1.02, 0.46, 0.52, 0.055, 0.06, 6, sh(0x8a857c), { noShadow: true, top: flat(0x5a564e) }); bar([1.02, 0.46, 0.57], [1.08, 0.42, 0.68], 0.03, flat(0xb8b0a2));
    poi(w / 2, d + 0.3, 'work', 0, -1);
  });
  // [centre] telescope on a tripod, pointing up toward the back
  def('telescope', 'c', [0.7, 0.7], 'brass telescope on a tripod', (o) => {
    for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.9; bar([Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0], [0, 0, 0.82], 0.05, flat(WOOD_D)); }
    const tb = (s, t) => { const X = Math.floor(s * U), k = Math.floor(t * 64); return X % 9 === 0 ? 0x8a6a2a : k < 1 ? 0xe8d48a : k < 3 ? BRASS : 0x8a6a2a; };
    bar([0.1, 0.36, 0.62], [-0.02, -0.06, 0.92], 0.07, tb, { noShadow: false }); bar([-0.02, -0.06, 0.92], [-0.14, -0.44, 1.22], 0.1, tb, { noShadow: false });
    blob(0, 0, 0.84, 0.05, bl(BRASS), { noShadow: true });
    poi(0.14, 0.62, 'work', 0, -1);
  });
  // [corner] anvil on a stump 0.7 x 0.45
  def('anvil', 'r', [0.7, 0.45], 'anvil on a stump with hammer', (o, w, d) => {
    cyl(0.32, 0.22, 0, 0.2, 0.3, 8, (s, t) => mul(0x6b4a36, (Math.floor(s * U) % 4 === 0 ? 0.7 : 0.95)), { top: wt(0x9a7a52) });
    const ir = metal(0x4a4a56), irT = sh(0x6a6a78, 0.06);
    nb(0.18, 0.12, 0.3, 0.28, 0.2, 0.06, ir, irT); nb(0.23, 0.15, 0.36, 0.18, 0.14, 0.08, ir, irT); box(0.12, 0.11, 0.44, 0.4, 0.22, 0.09, { side: ir, top: irT });
    nb(0.52, 0.15, 0.47, 0.1, 0.14, 0.06, ir, irT); nb(0.62, 0.18, 0.49, 0.07, 0.08, 0.04, ir, irT);
    bar([0.2, 0.26, 0.55], [0.4, 0.2, 0.56], 0.035, flat(WOOD)); nb(0.16, 0.22, 0.53, 0.07, 0.1, 0.06, flat(0x3a3a44), flat(0x5a5a66));
    poi(0.32, d + 0.3, 'smith', 0, -1);
  });
  const coalT = (s, t) => { const X = Math.floor(s * U), Y = Math.floor(t * U), r = h2(X >> 1, Y >> 1); return r < 0.3 ? 0x2a2228 : r < 0.5 ? 0x8a2a1a | FE : r < 0.8 ? 0xf0702a | FE : 0xffc84a | FE; };
  // [corner] forge 1.5 x 1.1: stone hearth, hood, bellows, glowing coals (fire + light)
  def('forge', 'r', [1.5, 1.1], 'smith forge with hood, bellows and fire (o.h chimney height)', (o, w, d) => {
    const h = o.h || 2.5, st = mason(31, 0x8a7f78);
    box(0, 0, 0, w - 0.4, d, 0.55, { side: st, top: stn(0x7a746c) });
    quad([0.2, 0.3, 0.556], [w - 0.8, 0, 0], [0, 0.6, 0], coalT, { n: [0, 0, 1], noShadow: true });
    box(0, 0, 0.55, w - 0.4, 0.26, 0.75, { side: st, noTop: true });
    // hood
    quad([0, 0.8, 1.3], [w - 0.4, 0, 0], [0, -0.54, 0.5], stn(0x6e6862), { n: [0, 0.68, 0.73] }); quad([w - 0.4, 0.8, 1.3], [0, -0.54, 0], [0, 0, 0.5], (s, t, q, a, b) => (b > a ? -1 : mul(0x6e6862, 0.8)), { n: [1, 0, 0], cut: true });
    nb(0, 0.76, 1.24, w - 0.4, 0.05, 0.07, flat(IRON)); box(0, 0, 1.8, w - 0.4, 0.26, h - 1.8, { side: st, top: flat(0x3a3640) });
    // bellows + quench bucket
    box(w - 0.36, 0.4, 0.5, 0.34, 0.3, 0.05, { side: sh(WOOD), top: wt(WOOD_L) }); nb(w - 0.34, 0.42, 0.38, 0.3, 0.26, 0.12, cloth(0x5a4030, 3)); nb(w - 0.36, 0.4, 0.33, 0.34, 0.3, 0.05, sh(WOOD)); nb(w - 0.48, 0.52, 0.42, 0.12, 0.06, 0.05, flat(IRON));
    for (const y of [0.42, 0.64]) nb(w - 0.24, y, 0, 0.06, 0.06, 0.33, flat(WOOD_D));
    cyl(w - 0.2, 0.92, 0, 0.15, 0.26, 8, tubT(0x7a5636), { top: waterTex(0x3a6a7a, 3), inner: 0 });
    bar([0.9, 0.86, 0.6], [1.06, 1.0, 0.56], 0.03, flat(IRON_L));
    fire(0.2 + (w - 0.8) / 2, 0.56, 0.56, 1.5); light(0.55, 0.9, 0.95, 5, [1, 0.55, 0.22], 1.1);
    poi(0.55, d + 0.35, 'smith', 0, -1);
  });
  // [corner] grindstone 0.9 x 0.5 in a frame with a crank
  def('grindstone', 'r', [0.9, 0.5], 'grindstone in a wooden frame', (o, w, d) => {
    const c = WOOD_D;
    for (const y of [0.08, d - 0.14]) { bar([0.1, y + 0.03, 0], [0.4, y + 0.03, 0.5], 0.06, flat(c)); bar([0.7, y + 0.03, 0], [0.4, y + 0.03, 0.5], 0.06, flat(c)); nb(0.06, y, 0.2, 0.7, 0.06, 0.05, sh(c)); }
    hcyl(0.4, 0.18, 0.5, 0.27, 0.14, 12, (s, t) => mul(0x9a968c, 0.9 + h2(Math.floor(s * U), Math.floor(t * U)) * 0.15), { cap: (s, t, q, a, b) => { const dd = Math.hypot(a - 0.5, b - 0.5); return dd < 0.07 ? IRON : mul(0xaaa69a, (Math.floor(dd * 20) & 1 ? 0.92 : 1.02) + h2(Math.floor(a * 17), Math.floor(b * 17)) * 0.08); } });
    bar([0.4, d - 0.08, 0.5], [0.4, d + 0.02, 0.5], 0.035, flat(IRON)); bar([0.4, d + 0.02, 0.5], [0.52, d + 0.02, 0.4], 0.035, flat(IRON));
    box(0.22, 0.14, 0.06, 0.36, 0.22, 0.1, { side: sh(WOOD), top: waterTex(0x3a6a7a, 5) });
    poi(0.4, d + 0.35, 'work', 0, -1);
  });

  /* ================================================================================================
   *  KITCHEN
   * ================================================================================================ */
  const sootT = (s, t) => { const X = Math.floor(s * U), Y = Math.floor(t * V), row = Math.floor(Y / 5), bx = (X + (row & 1) * 5) % 10; if (bx === 0 || Y % 5 === 0) return 0x241c1e; return mul(0x4a3630, 0.8 + h2((X + (row & 1) * 5) / 10 | 0, row) * 0.4); };
  const logT = (s, t) => { const X = Math.floor(s * U), Y = Math.floor(t * U); return h2(X >> 1, Y) < 0.25 ? 0xf0702a | FE : mul(0x3a2a22, 0.8 + h2(X, Y) * 0.5); };
  const logEnd = (s, t, q, a, b) => (Math.hypot(a - 0.5, b - 0.5) < 0.3 ? 0xb8905a : 0x4a3626);
  const ironPot = (dx, dy) => (dy < -0.62 ? 0x1a1a20 : dx * 0.6 - dy * 0.5 < -0.4 ? 0x5a5a68 : dx > 0.45 ? 0x24242c : 0x383842);
  function logs(x, y, z, len) { hcyl(y - 0.07, x - len / 2, z + 0.06, 0.06, len, 6, logT, { ax: 'x', noShadow: true, cap: logEnd }); hcyl(y + 0.07, x - len / 2 + 0.05, z + 0.06, 0.055, len, 6, logT, { ax: 'x', noShadow: true, cap: logEnd }); hcyl(y, x - len / 2 - 0.03, z + 0.15, 0.05, len, 6, logT, { ax: 'x', noShadow: true, cap: logEnd }); }
  // [corner] great kitchen hearth o.w (2.4) x 1.0: fire (flame + light), cauldron on a crane, bread-oven door, mantel
  def('hearth', 'r', o => [o.w || 2.4, 1.0], 'great cooking hearth with fire, cauldron and oven (o.w, o.h, o.spit)', (o, w, d) => {
    const h = o.h || 2.7, st = mason(41, 0x9a8f84), pw = 0.42;
    box(0, 0, 0, w, d, 0.08, { side: stn(0x7a746c), top: stn(0x6e6862, 0.2) });
    box(pw, 0, 0.08, w - 2 * pw, 0.16, 1.3, { side: sootT, noTop: true });
    for (const x of [0, w - pw]) box(x, 0, 0.08, pw, d - 0.1, 1.3, { side: st, tx: x ? st : sootT, bx: x ? sootT : st, noTop: true });
    const lin = (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * V), Ht = Math.round(q.vl * V), m = X % 9; if (Y >= Ht - 1) return 0xc4bdb0; if (m === 0) return 0x6a655e; return mul(0xaaa294, (Y < 2 ? 0.8 : 1) * (0.94 + h2(X / 9 | 0, 3) * 0.12)); };
    box(0, 0, 1.38, w, d - 0.1, 0.32, { side: lin, noTop: true });
    box(-0.06, -0.0, 1.7, w + 0.12, d - 0.02, 0.08, { side: sh(WOOD_D), top: wt(WOOD) });
    box(0.3, 0, 1.78, w - 0.6, 0.62, h - 1.78, { side: st, top: flat(0x3a3640) });
    logs(w / 2, 0.5, 0.08, 0.7); fire(w / 2, 0.5, 0.26, 2.0); light(w / 2, d + 0.25, 0.8, 7, [1, 0.6, 0.26], 1.3);
    if (o.spit) { for (const x of [pw + 0.12, w - pw - 0.12]) bar([x, 0.62, 0.08], [x, 0.62, 0.72], 0.035, flat(IRON)); bar([pw + 0.06, 0.62, 0.7], [w - pw - 0.06, 0.62, 0.7], 0.03, flat(IRON_L)); for (let i = 0; i < 3; i++) blob(w / 2 - 0.16 + i * 0.16, 0.62, 0.7, i === 1 ? 0.1 : 0.075, bl(0x9a5a30, 0.2), { noShadow: true }); }
    else { bar([pw, 0.3, 1.16], [w / 2, 0.52, 1.16], 0.035, flat(IRON)); bar([w / 2, 0.52, 1.16], [w / 2, 0.52, 0.8], 0.025, flat(IRON_L)); blob(w / 2, 0.52, 0.64, 0.19, ironPot); }
    const ov = PX(13, 16); for (let y = 0; y < 16; y++) for (let x = 0; x < 13; x++) { const dx = x - 6, r = y < 9 ? 6.5 : Math.sqrt(Math.max(0, 42 - (y - 9) * (y - 9))); if (Math.abs(dx) > r) continue; const e = Math.abs(dx) > r - 1.2 || y === 0 || (y >= 9 && Math.abs(dx) > Math.sqrt(Math.max(0, 30 - (y - 9) * (y - 9))) - 0.2); ov.p(x, y, e ? 0x77726c : (x % 4 === 0 ? 0x2a2a32 : 0x3c3c46)); } ov.r(5, 6, 7, 7, 0x8a8a94);
    vart(ov, w - pw + 0.01, d - 0.095, 0.5, { n: [0, 1, 0] });
    const ut = PX(30, 14); ut.r(0, 12, 29, 13, IRON); for (let i = 0; i < 4; i++) { const x = 3 + i * 7; ut.r(x, 4, x, 12, IRON_L); if (i & 1) ut.disc(x, 3, 2.6, 0x6a5a3a); else ut.r(x - 1, 0, x + 1, 4, 0x8a8a94); } vart(ut, pw + 0.3, d - 0.095, 0.9, { n: [0, 1, 0] });
    for (let i = 0; i < 4; i++) { const x = 0.3 + (w - 0.6) * i / 3; if (i === 1) icon(x, d - 0.25, 1.78, A_JUG); else cyl(x, d - 0.25, 1.78, 0.06, 0.1, 6, sh([0xa8604a, 0, 0xb8923a, 0x8a9a5a][i], 0.05), { noShadow: true, top: flat(0x4a3a30) }); }
    poi(w / 2, d + 0.4, 'cook', 0, -1);
  });
  // [centre] cauldron hung from a tripod over a fire (flame + light)
  def('cauldron', 'c', [0.8, 0.8], 'cauldron on a tripod over a fire', (o) => {
    for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.9; bar([Math.cos(a) * 0.36, Math.sin(a) * 0.36, 0], [0, 0, 1.1], 0.04, flat(IRON)); }
    bar([0, 0, 1.1], [0, 0, 0.66], 0.025, flat(IRON_L));
    blob(0, 0, 0.46, 0.21, ironPot); cyl(0, 0, 0.56, 0.17, 0.05, 10, flat(0x2a2a32), { noShadow: true, top: (s, t) => (T.fbm(s * 14, t * 14) > 0.56 ? 0xb8c070 : 0x7a8a3a) | NOAO });
    logs(0, 0, 0, 0.36); fire(0, 0, 0.14, 1.1); light(0.15, 0.3, 0.4, 4.2, [1, 0.6, 0.26], 1.1);
    poi(0, 0.7, 'cook', 0, -1);
  });
  // [corner] butcher's block 0.7 x 0.55 with cleaver and a joint of meat
  def('butcherBlock', 'r', [0.7, 0.55], "butcher's block with cleaver and meat", (o, w, d) => {
    legs(0.04, 0.04, w - 0.08, d - 0.08, 0.34, 0.1, sh(WOOD_D));
    box(0, 0, 0.34, w, d, 0.18, { side: wd(0xb08a5a), top: (s, t) => { const X = Math.floor(s * U), Y = Math.floor(t * U); return mul(0xc8a06a, (((X >> 2) + (Y >> 2)) & 1 ? 0.92 : 1.03) - (h2(X, Y) < 0.07 ? 0.2 : 0)) | (T.fbm(X * 0.2, Y * 0.2) > 0.68 ? 0 : 0); } });
    blob(0.42, 0.3, 0.6, 0.11, (dx, dy, ix, iy) => (dx > 0.5 ? 0xf0e0d0 : (ix + iy) % 5 === 0 ? 0xe8b8a8 : 0xb84a44), { noShadow: true }); blob(0.54, 0.3, 0.57, 0.06, bl(0xe8dcd0, 0.04), { noShadow: true });
    const cl = art(['.lll', 'llll', 'llSS', '..n.', '..n.', '..n.']); icon(0.16, 0.26, 0.52, cl); icon(0.24, 0.44, 0.52, A_KNIFE);
    poi(w / 2, d + 0.3, 'cook', 0, -1);
  });
  function hung(x, y, z, k) { sub(x, y, z, 1.5, () => hung1(0, 0, 0, k)); }
  function hung1(x, y, z, k) {            // things that hang from a rail at height z
    bar([x, y, z], [x, y, z - 0.1], 0.02, flat(0xa89a7a));
    if (k === 0) { blob(x, y, z - 0.26, 0.1, (dx, dy, ix, iy) => (dy > 0.55 ? 0x8a3a30 : (ix + iy) % 4 === 0 ? 0xc87a5a : 0xa85a44), { noShadow: true }); blob(x, y, z - 0.14, 0.055, bl(0x9a4a3a), { noShadow: true }); }                       // ham
    else if (k === 1) { for (let i = 0; i < 4; i++) blob(x + (i & 1 ? 0.025 : -0.025), y, z - 0.12 - i * 0.055, 0.034, bl(0x8a3228, 0.15), { noShadow: true, f: E.F_NOAO }); }                                                                  // sausages
    else if (k === 2) { blob(x, y, z - 0.18, 0.07, T.leaves(T.LEAF_D, null, 0), { noShadow: true }); blob(x, y, z - 0.28, 0.055, T.leaves(T.LEAF_G, null, 0), { noShadow: true }); }                                                              // herbs
    else if (k === 3) { for (let i = 0; i < 4; i++) blob(x + (i & 1 ? 0.02 : -0.02), y, z - 0.12 - i * 0.05, 0.035, bl(i & 1 ? 0xf0e8d8 : 0xe0d4c0, 0.05), { noShadow: true, f: E.F_NOAO }); }                                                    // garlic
    else if (k === 4) { blob(x, y, z - 0.2, 0.06, bl(0x7a5a3a), { noShadow: true }); blob(x, y, z - 0.3, 0.045, bl(0x4a6a8a), { noShadow: true }); bar([x, y, z - 0.3], [x + 0.03, y, z - 0.42], 0.03, flat(0x6a4a30)); }                         // pheasant
    else { for (let i = 0; i < 3; i++) blob(x + (i & 1 ? 0.03 : -0.03), y, z - 0.13 - i * 0.065, 0.045, bl(0xc8843a, 0.12), { noShadow: true, f: E.F_NOAO }); }                                                                                // onions
  }
  // [corner] hanging rack o.len (1.8) x 0.3: hams, sausages, herbs on a rail between two posts (o.ceiling: no posts, not solid)
  def('hangRack', 'R', o => [o.len || 1.8, 0.3], 'rail of hams, sausages and herbs (o.len, o.ceiling, o.h, o.seed)', (o, w, d) => {
    const h = o.h || 1.5, seed = o.seed || 0;
    if (!o.ceiling) for (const x of [0, w - 0.08]) { box(x, 0.11, 0, 0.08, 0.08, h + 0.06, { side: sh(WOOD_D) }); nb(x - 0.04, 0.03, 0, 0.16, 0.24, 0.05, sh(WOOD_D)); block(x - 0.04, 0.03, 0.16, 0.24); }
    else for (const x of [0.1, w - 0.1]) bar([x, 0.15, h], [x, 0.15, h + 1.2], 0.02, flat(IRON_L));
    bar([0, 0.15, h], [w, 0.15, h], 0.04, flat(IRON_L));
    const n = Math.max(2, Math.floor((w - 0.3) / 0.3)); for (let i = 0; i < n; i++) hung(0.15 + (w - 0.3) * (i + 0.5) / n, 0.15, h, [0, 2, 1, 0, 3, 5, 4, 2][(i + seed) % 8]);
  });
  // [corner] baker's table 1.2 x 0.65 with loaves, dough and flour
  def('breadTable', 'r', [1.2, 0.65], "baker's table with loaves and dough", (o, w, d) => {
    legs(0.04, 0.04, w - 0.08, d - 0.08, 0.44, 0.08, sh(WOOD_D));
    box(0, 0, 0.44, w, d, 0.06, { side: sh(OAK), top: (s, t) => { const X = Math.floor(s * U), Y = Math.floor(t * U), n = T.fbm(X * 0.12, Y * 0.12 + 4); return n > 0.58 ? (n > 0.66 ? 0xf4efe4 : 0xd8ccb0) : mul(OAK, 1.2 - (Y % 7 === 0 ? 0.3 : 0)); } });
    loaf(0.22, 0.2, 0.5, 0.07); loaf(0.24, 0.42, 0.5, 0.06); blob(0.52, 0.2, 0.55, 0.075, bl(0xd9a85a), { noShadow: true }); blob(0.66, 0.4, 0.56, 0.09, bl(0xf0e4c8, 0.04), { noShadow: true });
    hcyl(0.5, 0.8, 0.525, 0.025, 0.3, 5, flat(0xb08a5a), { ax: 'x', noShadow: true }); cyl(1.02, 0.2, 0.5, 0.1, 0.07, 8, wicker, { noShadow: true }); for (let i = 0; i < 4; i++) blob(0.98 + (i & 1) * 0.08, 0.17 + (i >> 1) * 0.07, 0.59, 0.04, bl(0xcf9a4e), { noShadow: true, f: E.F_NOAO });
    sack(1.05, 0.48, 0.5, 0xe8dcc0, 0.5);
    poi(w / 2, d + 0.3, 'cook', 0, -1);
  });
  // [centre] open water barrel with a ladle
  def('waterBarrel', 'c', [0.6, 0.6], 'open water barrel with dipper', (o) => {
    cyl(0, 0, 0, 0.27, 0.62, 10, tubT(0x7a5a3e), { top: flat(0x9a7a52), inner: 0.84 }); disk(0, 0, 0.55, 0.235, waterTex(0x3a7a94, 7));
    bar([0.1, 0.05, 0.56], [0.3, 0.16, 0.74], 0.03, flat(WOOD_L)); cyl(0.1, 0.05, 0.56, 0.045, 0.04, 6, flat(0x8a6a44), { noShadow: true });
    poi(0, 0.6, 'drink', 0, -1);
  });
  function fillDishes(cv, x0, y0, x1, y1, row, seed) {
    if (row % 2 === 0) for (let x = x0 + 1; x + 6 <= x1; x += 7) { const rim = [0x4a70c0, 0xc8372f, 0x3f7a46, 0xb8923a][(h2(x + seed, row) * 4) | 0]; cv.disc(x + 3, y0 + 3, 3.2, 0xe8e2d4); cv.ring(x + 3, y0 + 3, 2.2, rim); cv.p(x + 3, y0 + 3, rim); }
    else for (let x = x0 + 1; x + 3 <= x1; x += 5) { const r = h2(x + seed, row * 3); if (r < 0.5) { cv.r(x, y0, x + 2, y0 + 3, 0xb8bcc6).p(x + 3, y0 + 2, 0x8a909c).p(x, y0 + 3, 0xe4e8ee); } else if (r < 0.85) { cv.r(x, y0, x + 2, y0 + 4, 0xa8604a).p(x + 1, y0 + 5, 0xa8604a).p(x, y0 + 3, 0xc88060); } }
  }
  // [corner] kitchen dresser o.w (1.1) x 0.36: cupboard below, plates and mugs on shelves above
  def('dishShelf', 'r', o => [o.w || 1.1, 0.36], 'dresser with plates and mugs (o.w, o.seed)', (o, w, d) => {
    const c = o.c || OAK, cv = caseFront(w, 0.9, c, 11, fillDishes, o.seed || 6);
    box(0, 0, 0, w, d, 0.56, { side: wd(mul(c, 0.9)), ty: doorsT(mul(c, 1.05)), noTop: true });
    box(-0.02, 0, 0.56, w + 0.04, d + 0.03, 0.05, { side: sh(mul(c, 0.8)), top: wt(mul(c, 1.2)) });
    box(0, 0, 0.61, w, 0.2, 0.9, { side: wd(mul(c, 0.9)), ty: cv.tex, top: sh(mul(c, 1.15)) });
    icon(w * 0.2, 0.28, 0.61, A_JUG); icon(w * 0.75, 0.28, 0.61, A_MUG); plate(w * 0.5, 0.28, 0.61, 0xd8d2c4);
    poi(w / 2, d + 0.3, 'work', 0, -1);
  });

  /* ================================================================================================
   *  HALL & DECOR
   * ================================================================================================ */
  /* heraldic device painted on a pixel canvas, about 9 px across, centred on (cx, cy) */
  const DEV = { lion: ['.yy...y..', 'yyyy.y...', 'yy.yyy...', '.yyyyyy.y', '..yyyyyy.', '.yyyyy...', 'yy.yyyy..', '...y..yy.', '..yy...y.'], eagle: ['y...y...y', 'yy.yyy.yy', 'yyyyyyyyy', '.yyyyyyy.', '..yyyyy..', '...yyy...', '..yyyyy..', '.y.yyy.y.', '...y.y...'],
    tower: ['y.y.y.y', 'yyyyyyy', '.yyyyy.', '.yyyyy.', '.yy.yy.', '.yyyyy.', '.yy.yy.', '.yy.yy.', 'yyyyyyy'], crown: ['y..y..y', 'y.yyy.y', 'yyyyyyy', 'yyyyyyy', '.yyyyy.'], fleur: ['...y...', '..yyy..', 'y.yyy.y', 'yyyyyyy', 'yy.y.yy', '..yyy..', '.yyyyy.', '...y...'],
    stag: ['y.y.y.y', '.yy.yy.', '..yyy..', '.yyyyy.', '.y.y.y.', '..yyy..', '...y...'] };
  function device(cv, cx, cy, dev, c) {
    const pal = { y: c };
    if (DEV[dev]) { const r = DEV[dev]; cv.art(Math.round(cx - r[0].length / 2), Math.round(cy - r.length / 2), r, pal); }
    else if (dev === 'cross') { cv.r(cx - 1, cy - 5, cx, cy + 5, c).r(cx - 4, cy + 1, cx + 3, cy + 2, c); }
    else if (dev === 'chevron') { for (let i = 0; i <= 5; i++) { cv.r(cx - 1 - i, cy + 3 - i, cx - 1 - i, cy + 5 - i, c); cv.r(cx + i, cy + 3 - i, cx + i, cy + 5 - i, c); } }
    else if (dev === 'sun') { cv.disc(cx - 0.5, cy, 2.6, c); for (let i = 0; i < 8; i++) { const a = i * 0.7854; cv.p(cx - 0.5 + Math.cos(a) * 4.4, cy + Math.sin(a) * 4.4, c); } }
    else if (dev === 'tree') { cv.disc(cx - 0.5, cy + 2, 3.4, c).r(cx - 1, cy - 5, cx, cy, c).r(cx - 3, cy - 5, cx + 2, cy - 5, c); }
    else if (dev === 'bars') { for (const dy of [-3, 0, 3]) cv.r(cx - 5, cy + dy, cx + 4, cy + dy + 1, c); }
  }
  // [wall] hanging banner.  o.h (2.5) = height of its top edge, o.len (1.6), o.w (0.6), o.c field, o.c2 trim, o.dev device, o.tail 'swallow' | 'point' | 'flat'
  def('banner', 'w', o => [o.w || 0.6, 0.08], 'heraldic wall banner (o.c, o.c2, o.dev: lion eagle tower crown fleur stag cross chevron sun tree bars, o.len, o.h, o.tail)', (o, w) => {
    const len = o.len || 1.6, h = o.h || 2.5, c = o.c || RED, c2 = o.c2 || GOLD, cv = PX(w * U, len * V), W = cv.W, H = cv.H, tail = o.tail || 'swallow';
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = Math.abs(x - W / 2 + 0.5), cut = tail === 'swallow' ? (y < 7 - dx * 14 / W * 1.0 + 0) && dx < W / 2 && (7 - y) > dx * 0.9 : tail === 'point' ? y < dx * 0.9 : false;
      if (cut) continue;
      const e = Math.min(x, W - 1 - x), by = tail === 'swallow' ? y - Math.max(0, 7 - dx * 0.9) : tail === 'point' ? y - dx * 0.9 : y;
      let col = e < 2 || y >= H - 3 || by < 2 ? c2 : mul(c, [0.9, 1.04, 1, 0.94][(x >> 1) % 4] * (0.96 + h2(x, y >> 2) * 0.06));
      if (y >= H - 1) col = mul(c2, 0.7);
      cv.p(x, y, col);
    }
    if (o.dev !== 'none') device(cv, W / 2, H * 0.58, o.dev || 'lion', c2);
    if (o.c3) cv.each((x, y, v) => (v === c || y > H * 0.36 || v === c2 ? undefined : v)), cv.each((x, y, v) => (y < H * 0.34 && y > H * 0.2 && v >= 0 && Math.min(x, W - 1 - x) >= 2 ? o.c3 : undefined));
    vart(cv, -w / 2, 0.045, h - len);
    nb(-w / 2 - 0.05, 0, h - 0.03, w + 0.1, 0.07, 0.045, flat(WOOD_D)); for (const x of [-w / 2 - 0.07, w / 2 + 0.03]) nb(x, 0.01, h - 0.04, 0.04, 0.06, 0.065, flat(GOLD));
  });
  const P_STAG = ['..........y.y', '..........yyy', '...........m.', '..........mm.', '.mmmmmmmmmm..', 'mmmmmmmmmm...', 'mmmmmmmmmm...', '.mmmmmmmm....', '.m.m...m.m...', '.m.m...m.m...', '.m.m...m.m...'];
  const P_RIDER = ['....rr........', '....hh........', '...bbbb.......', '..wbbbb.......', '.www.bbwwww...', 'wwwwwwwwwwww..', '.w.wwwwwwwwww.', '...wwwwwwwww.w', '...wwwwwwww..w', '...w.w..w.w...', '...w.w..w.w...', '...w.w..w.w...'];
  const P_HOUND = ['w.....w', 'wwwwwww', '.wwwww.', '.w...w.'], P_UNI = ['y.............', '.y............', '..ww..........', '.www..........', '.www.wwwwwww..', '..wwwwwwwwwww.', '...wwwwwwwww.w', '...wwwwwwww..w', '...w.w..w.w...', '...w.w..w.w...', '...w.w..w.w...'];
  function tapScene(cv, x0, y0, x1, y1, scene, seed) {
    const W = x1 - x0 + 1, H = y1 - y0 + 1, tree = (x, y, r, c) => { cv.r(x, y, x + 1, y + r + 1, 0x5a3a26); cv.disc(x + 0.5, y + r * 2, r, (px, py) => ((px + py) % 3 === 0 ? mul(c, 1.25) : c)); };
    const hill = (x, k, a) => Math.sin(x * k + seed) * a + Math.sin(x * k * 2.3 + seed * 2) * a * 0.4;
    if (scene === 'unicorn') {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const r = h2(x / 3 | 0, (y / 3 | 0) + seed); cv.p(x, y, r < 0.16 && x % 3 === 1 && y % 3 === 1 ? [0xf0d060, 0xe8698a, 0xf4efe0, 0x8ab4e8][(r * 25 | 0) % 4] : mul(0x24503e, 0.9 + h2(x >> 1, y >> 1) * 0.2)); }
      const cx = x0 + (W >> 1), cy = y0 + Math.round(H * 0.3); cv.ring(cx, cy + 3, Math.min(W, H) * 0.34, 0x9a7a4a); cv.art(cx - 7, cy, P_UNI); tree(x0 + 3, y0 + 2, 4, 0x3f8a48); tree(x1 - 6, y0 + 3, 4, 0x4a944a);
    } else if (scene === 'castle') {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const k = (y - y0) / H, gh = H * 0.34 + hill(x, 0.12, 3); cv.p(x, y, y - y0 < gh ? ((x + y) % 5 === 0 ? 0x5a8a4a : 0x6a9a50) : k > 0.8 ? 0x7aa0c4 : 0xa8c4d4); }
      cv.disc(x1 - 7, y1 - 6, 3, 0xf0d060); const bx = x0 + Math.round(W * 0.3), by = y0 + Math.round(H * 0.3), cw = Math.round(W * 0.4);
      cv.r(bx, by, bx + cw, by + 11, 0xb8b0a2); for (let x = bx; x <= bx + cw; x += 2) cv.p(x, by + 12, 0xb8b0a2);
      for (const tx of [bx - 3, bx + cw - 2]) { cv.r(tx, by, tx + 5, by + 17, 0xa8a094); for (let i = 0; i < 5; i++) cv.r(tx + i * 0.5 + 0.5, by + 18 + i, tx + 5 - i * 0.5 - 0.5, by + 18 + i, 0xb8372f); cv.p(tx + 2, by + 9, 0x3a3640).p(tx + 3, by + 9, 0x3a3640); }
      cv.r(bx + (cw >> 1) - 2, by, bx + (cw >> 1) + 2, by + 6, 0x4a3626); cv.line(x0, y0 + 4, bx + (cw >> 1), by, 0xc8b48a); tree(x0 + 4, y0 + 6, 3, 0x3f7a40); tree(x1 - 8, y0 + 5, 4, 0x3f7a40);
    } else if (scene === 'arms') {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) cv.p(x, y, mul(0x6a2030, ((x + y) % 8 === 0 || (x - y + 400) % 8 === 0) ? 1.35 : 0.95 + h2(x, y) * 0.1));
      const cx = x0 + (W >> 1), cy = y0 + (H >> 1); pxShield(cv, cx, cy, Math.min(12, (H >> 1) - 4), BLUE, GOLD, 2); cv.art(cx - 3, cy + Math.min(12, (H >> 1) - 4) + 1, DEV.crown, { y: GOLD_L });
      if (W > 50) { device(cv, cx - 20, cy, 'lion', GOLD); device(cv, cx + 20, cy, 'lion', GOLD); }
    } else {      // hunt
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const gh = H * 0.42 + hill(x, 0.1, 3); cv.p(x, y, y - y0 < gh ? ((x * 3 + y) % 7 === 0 ? 0x86a85a : (x + y * 2) % 11 === 0 ? 0xd8c060 : 0x6f9648) : ((y - y0 - gh) < 5 + hill(x, 0.2, 3) ? 0x4a7a4a : 0xc8d0b8)); }
      for (let i = 0; i < Math.max(3, W / 14); i++) tree(x0 + 3 + ((h2(i, seed) * (W - 10)) | 0), y0 + Math.round(H * 0.4) + ((h2(i, 9) * 4) | 0), 3 + ((h2(i, 3) * 3) | 0), i & 1 ? 0x2f6a3a : 0x3f7a40);
      const gy = y0 + Math.round(H * 0.12); cv.art(x0 + Math.round(W * 0.72) - 6, gy + 2, P_STAG, { y: 0xe8dcc0, m: 0x9a5a30 }); cv.art(x0 + Math.round(W * 0.26) - 7, gy, P_RIDER.map(r => r.split('').reverse().join('')), { r: 0xc8372f, h: 0xf0c8a0, b: 0x34508f, w: 0xf0e8d8 });
      if (W > 44) { cv.art(x0 + Math.round(W * 0.5) - 3, gy, P_HOUND.map(r => r.split('').reverse().join('')), { w: 0xe8dcc0 }); cv.art(x0 + Math.round(W * 0.5) + 6, gy + 3, P_HOUND.map(r => r.split('').reverse().join('')), { w: 0x8a6a4a }); }
    }
  }
  // [wall] tapestry o.w (2.4) wide, o.hh (1.4) tall, bottom edge o.h (0.9) above the floor.  o.scene 'hunt' | 'castle' | 'unicorn' | 'arms'
  def('tapestry', 'w', o => [o.w || 2.4, 0.08], 'wide woven wall hanging with a scene (o.scene: hunt castle unicorn arms, o.w, o.hh, o.h, o.c)', (o, w) => {
    const hh = o.hh || 1.4, h = o.h === undefined ? 0.9 : o.h, c = o.c || 0x7a2030, cv = PX(w * U, hh * V), W = cv.W, H = cv.H;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const e = Math.min(x, W - 1 - x, y - 3, H - 1 - y); if (y < 3) { if (x % 2 === 0) cv.p(x, y, GOLD); continue; } cv.p(x, y, e < 1 ? mul(c, 0.7) : e === 4 ? GOLD : ((x + y) % 6 === 0 && e > 0 && e < 4) ? GOLD_L : c); }
    tapScene(cv, 5, 8, W - 6, H - 6, o.scene || 'hunt', o.seed || 1);
    cv.each((x, y, v) => (v < 0 ? undefined : mul(v, (x % 16 === 0 ? 0.9 : 1) * (y > H - 3 ? 0.8 : 1))));
    vart(cv, -w / 2, 0.04, h);
    nb(-w / 2 - 0.06, 0, h + hh - 0.02, w + 0.12, 0.06, 0.04, flat(WOOD_D));
  });
  function paintInto(cv, x0, y0, x1, y1, kind, seed) {
    const W = x1 - x0 + 1, H = y1 - y0 + 1, cx = x0 + (W >> 1);
    if (kind === 'landscape') { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const k = (y - y0) / H, g = 0.36 + Math.sin(x * 0.3 + seed) * 0.06; cv.p(x, y, k < g - 0.12 ? ((x + y) % 4 === 0 ? 0x4a7a8a : 0x5a8a9a) : k < g ? ((x + y) % 3 === 0 ? 0x4a7a3a : 0x5a8a44) : k < g + 0.1 + Math.sin(x * 0.5) * 0.04 ? 0x6a7a8a : k > 0.8 ? 0x8ab0d0 : 0xc8d8dc); } cv.disc(x0 + W * 0.75, y0 + H * 0.78, 2, 0xf4e8a0); cv.r(x0 + 3, y0 + H * 0.3, x0 + 3, y0 + H * 0.5, 0x4a3626).disc(x0 + 3, y0 + H * 0.58, 2.6, 0x2f6a3a); }
    else if (kind === 'ship') { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const k = (y - y0) / H; cv.p(x, y, k < 0.36 ? ((x + y * 2) % 5 === 0 ? 0x8ab4c4 : 0x3a6a8a) : k > 0.8 ? 0xe8c890 : 0xc8d4d8); } const by = y0 + Math.round(H * 0.3); cv.r(cx - 6, by, cx + 5, by + 2, 0x5a3a26).r(cx - 5, by - 1, cx + 4, by - 1, 0x5a3a26).r(cx - 1, by + 3, cx - 1, by + 14, 0x3a2a1e).r(cx - 5, by + 5, cx + 3, by + 11, 0xf0e8d8).r(cx - 4, by + 12, cx + 2, by + 13, 0xf0e8d8).p(cx, by + 15, 0xc8372f).p(cx + 1, by + 15, 0xc8372f); }
    else if (kind === 'still') { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) cv.p(x, y, (y - y0) < H * 0.3 ? 0x6a4a30 : mul(0x2a2a30, 1 + h2(x, y) * 0.2)); const by = y0 + Math.round(H * 0.28); cv.r(cx - 5, by, cx + 4, by + 2, 0xb8923a); cv.disc(cx - 3, by + 4, 2, 0xc8372f).disc(cx + 1, by + 5, 2.2, 0xe0b040).disc(cx + 3, by + 3, 1.6, 0x7a3a8a).disc(cx - 1, by + 7, 1.6, 0x6fa044); }
    else {     // portrait
      const robe = [0x8a1e2a, 0x2c4078, 0x2f5a3a, 0x5a2a6a][seed % 4], hair = [0x4a3020, 0xc8a050, 0x8a8a8a, 0x2a2228][(seed >> 1) % 4];
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) cv.p(x, y, mul(0x3a3028, 0.9 + ((x - x0) / W) * 0.5 + h2(x, y) * 0.1));
      const sy = y0 + Math.round(H * 0.42); for (let y = y0; y <= sy; y++) { const hw = Math.min(W / 2 - 1, 3 + (sy - y) * 0.9); cv.r(cx - hw, y, cx + hw - 1, y, y > sy - 2 ? 0xe8e2d4 : mul(robe, (y & 1) ? 0.9 : 1.05)); }
      const hy = sy + 5; cv.disc(cx - 0.5, hy, 3.6, 0xe8b890).r(cx - 4, hy + 2, cx + 3, hy + 4, hair).r(cx - 4, hy - 1, cx - 4, hy + 2, hair).r(cx + 3, hy - 1, cx + 3, hy + 2, hair).p(cx - 2, hy, 0x3a2a22).p(cx + 1, hy, 0x3a2a22).r(cx - 1, hy - 2, cx, hy - 2, 0xa85a4a);
      if (seed % 3 === 0) cv.art(cx - 3, hy + 4, DEV.crown, { y: GOLD_L }); else if (seed % 3 === 1) cv.r(cx - 2, hy - 4, cx + 1, hy - 2, hair);
      cv.r(cx - 1, sy - 3, cx, sy - 2, GOLD);
    }
  }
  // [wall] painting in a gilt frame o.w (0.8) x o.hh (1.0), bottom o.h (1.2) above the floor.  o.kind 'portrait' | 'landscape' | 'ship' | 'still'
  def('painting', 'w', o => [o.w || 0.8, 0.06], 'painting in a gilt frame (o.kind: portrait landscape ship still, o.w, o.hh, o.h, o.seed)', (o, w) => {
    const hh = o.hh || 1.0, h = o.h === undefined ? 1.2 : o.h, cv = PX(w * U, hh * V), W = cv.W, H = cv.H;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const e = Math.min(x, W - 1 - x, y, H - 1 - y); cv.p(x, y, e === 0 ? 0x8a6a22 : e === 1 ? ((x + y) % 3 === 0 ? 0xfff0a0 : GOLD_L) : e === 2 ? GOLD : e === 3 ? 0x7a5a1a : 0); }
    paintInto(cv, 4, 4, W - 5, H - 5, o.kind || 'portrait', o.seed || 0);
    box(-w / 2, 0, h, w, 0.045, hh, { side: flat(0x8a6a22), ty: cv.tex, top: flat(GOLD_L), noShadow: true });
  });
  // [wall] mounted stag head on a wooden plaque, centre o.h (1.7) above the floor
  def('stagHead', 'w', [0.9, 0.4], 'mounted stag head (o.h)', (o) => {
    const h = o.h || 1.7, pq = PX(13, 16), an = PX(34, 18), A = 0xd8c8a0;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 13; x++) { const dx = Math.abs(x - 6), lim = y > 8 ? 6.5 : 6.5 * Math.sqrt(Math.max(0, 1 - (8 - y) * (8 - y) / 80)); if (dx <= lim) pq.p(x, y, dx > lim - 1.2 || y === 15 ? WOOD_D : mul(WOOD, x % 3 === 0 ? 0.85 : 1)); }
    vart(pq, -13 / 64, 0.02, h - 0.22, { n: [0, 1, 0] });
    for (const sg of [-1, 1]) { const m = x => 16.5 + sg * x; an.line(m(2), 0, m(7), 7, A).line(m(7), 7, m(13), 12, A).line(m(13), 12, m(15), 17, A).line(m(5), 4, m(4), 10, A).line(m(8), 8, m(8), 15, A).line(m(11), 10, m(15), 9, A).line(m(3), 1, m(8), 7, A); }
    vart(an, -34 / 64, 0.16, h + 0.1);
    const fur = (dx, dy, ix, iy) => (dy > 0.4 ? 0x7a5232 : (ix + iy) % 5 === 0 ? 0xc89868 : 0xa8744a);
    blob(0, 0.1, h - 0.02, 0.1, fur, { noShadow: true }); blob(0, 0.2, h + 0.02, 0.1, fur, { noShadow: true }); blob(0, 0.3, h - 0.05, 0.065, (dx, dy) => (dy > 0.2 && Math.abs(dx) < 0.5 ? 0x2a2228 : 0xb8845a), { noShadow: true });
    for (const sg of [-1, 1]) { blob(sg * 0.11, 0.17, h + 0.1, 0.04, bl(0x8a5a3a), { noShadow: true }); spr(sg * 0.05, 0.3, h + 0.02, 1, 1, () => 0x1a1620, { bias: 0.2 }); }
  });
  // [wall] crossed swords, with a shield over them unless o.shield === false.  centre o.h (1.6) above the floor
  def('crossedSwords', 'w', [0.9, 0.06], 'crossed swords and shield on the wall (o.h, o.shield, o.seed)', (o) => {
    const h = o.h || 1.6, cv = PX(28, 34), hc = HERALD[(o.seed || 0) % HERALD.length];
    for (const sg of [-1, 1]) { const m = x => 13.5 + sg * (x - 13.5); for (let i = 0; i < 30; i++) { const x = 2 + i * 0.8, y = 2 + i; if (i < 5) cv.p(m(x), y, 0x6a4a30); else { cv.p(m(x), y, 0xd8dce4); cv.p(m(x + 1), y, 0x8a909c); } } cv.line(m(3), 8, m(9), 5, GOLD).line(m(3), 9, m(9), 6, GOLD).p(m(2), 1, GOLD_L).p(m(1), 1, GOLD_L); }
    if (o.shield !== false) pxShield(cv, 14, 16, 8, hc[0], hc[1], (o.seed || 0) % 5);
    vart(cv, -28 / 64, 0.03, h - 17 / V, { n: [0, 1, 0] });
  });
  const rugT = (c1, c2, c3, pat, fx) => (s, t, q) => {
    const X = Math.floor(s * U), Y = Math.floor(t * U), Wt = Math.round(q.ul * U), Ht = Math.round(q.vl * U), ex = Math.min(X, Wt - 1 - X), ey = Math.min(Y, Ht - 1 - Y), ef = fx ? ex : ey;
    if (ef < 3) return ((fx ? Y : X) % 2 === 0) ? mul(CREAM, ef === 0 ? 0.8 : 1) : -1;
    const e = Math.min(fx ? ex - 3 : ex, fx ? ey : ey - 3), n = 0.95 + h2(X >> 1, Y >> 1) * 0.08;
    if (e < 2) return mul(c3, n); if (e < 7) { const k = fx ? (ex - 3 < ey ? Y : X) : (ex < ey - 3 ? Y : X); return (e === 4 && k % 4 < 2) || ((e === 3 || e === 5) && k % 4 === 0) ? mul(c3, n) : mul(c2, n); } if (e < 9) return mul(c3, n);
    const dx = Math.abs(X - Wt / 2 + 0.5), dy = Math.abs(Y - Ht / 2 + 0.5);
    if (pat === 'stripe') return mul((Math.floor((fx ? X : Y) / 6) & 1) ? c1 : mix(c1, c2, 0.5), n);
    if (pat === 'plain') return mul(c1, n);
    if (pat === 'persian') { const m = dx / (Wt * 0.26) + dy / (Ht * 0.26); if (m < 1) { const k = Math.floor(m * 5); return mul(k === 0 ? c2 : k === 2 ? c3 : k === 4 ? c2 : mix(c1, 0xf0e0c0, 0.25), n); } if (Math.abs(m - 1.08) < 0.05) return mul(c2, n); const qx = (X + 3) % 12, qy = (Y + 3) % 12; if (qx < 3 && qy < 3 && (qx === 1 || qy === 1)) return mul(c2, n); return mul(c1, n); }
    return ((X + Y) % 16 < 2 || (X - Y + 1600) % 16 < 2) ? mul(c3, n) : ((X + Y + 8) % 16 === 0 && (X - Y + 1608) % 16 === 0) ? c2 : mul(c1, n);     // diamond
  };
  // [corner] rug o.w (2.4) x o.d (1.6), flat, NOT solid.  o.pat 'persian' | 'diamond' | 'stripe' | 'plain'; o.c field, o.c2 pattern, o.c3 dark trim
  def('rug', 'R', o => [o.w || 2.4, o.d || 1.6], 'patterned rug, flat, not solid (o.w, o.d, o.pat: persian diamond stripe plain, o.c, o.c2, o.c3)', (o, w, d) => {
    quad([0, 0, 0.012], [w, 0, 0], [0, d, 0], rugT(o.c || 0x8a2030, o.c2 || 0xd9b060, o.c3 || 0x3a2030, o.pat || 'persian', w >= d), { n: [0, 0, 1], noShadow: true });
  });
  // [corner] runner carpet o.w (1.2) wide, o.len (6) long toward the front (use face 'x' to run it along x).  NOT solid
  def('runner', 'R', o => [o.w || 1.2, o.len || 6], 'long runner carpet, flat, not solid (o.w, o.len, o.c, o.c2, o.c3)', (o, w, d) => {
    quad([0, 0, 0.012], [w, 0, 0], [0, d, 0], rugT(o.c || RED, o.c2 || GOLD, o.c3 || 0x7a1c22, o.pat || 'diamond', false), { n: [0, 0, 1], noShadow: true });
  });
  // [wall] hearth-less wall fireplace o.w (1.8) wide, sticks out 0.5.  mantel, fire + light, chimney breast up to o.h (2.7), crest unless o.crest === false
  def('fireplace', 'W', o => [o.w || 1.8, 0.5], 'wall fireplace with fire, mantel and crest (o.w, o.h, o.crest, o.seed)', (o, w, d) => {
    const h = o.h || 2.7, c = o.c || 0xb4ab9c, jw = 0.3, x0 = -w / 2, carve = (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * V), Ht = Math.round(q.vl * V), Wt = Math.round(q.ul * U); if (Y >= Ht - 2) return mul(c, 1.14); if (Y < 2) return mul(c, 0.74); if (X === 0 || X === Wt - 1) return mul(c, 0.8); const m = X % 8; return mul(c, (m === 0 ? 0.78 : m === 1 ? 1.1 : 1) * (0.95 + h2(X >> 1, Y >> 1) * 0.08)); };
    box(x0 - 0.1, 0, 0, w + 0.2, 0.78, 0.05, { side: stn(0x7a746c), top: stn(0x857f78, 0.16), noShadow: true });
    quad([x0 + jw, 0.01, 0.05], [w - 2 * jw, 0, 0], [0, 0, 1.0], sootT, { n: [0, 1, 0], noShadow: true });
    for (const x of [x0, -x0 - jw]) box(x, 0, 0.05, jw, d, 1.0, { side: carve, tx: x < 0 ? sootT : carve, bx: x < 0 ? carve : sootT, noTop: true });
    box(x0, 0, 1.05, w, d, 0.24, { side: (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * V), Ht = Math.round(q.vl * V), m = X % 10; if (Y < 2) return mul(c, 0.72); if (Y >= Ht - 1) return mul(c, 1.15); return mul(c, (m < 5 ? ((m + Y) % 5 === 2 ? 0.82 : 1) : 1.04) * (0.95 + h2(X >> 1, Y >> 1) * 0.08)); }, noTop: true });
    box(x0 - 0.08, 0, 1.29, w + 0.16, d + 0.08, 0.07, { side: stn(mul(c, 1.08)), top: stn(mul(c, 1.12)) });
    box(x0 + 0.2, 0, 1.36, w - 0.4, 0.3, h - 1.36, { side: mason(o.seed || 17, 0xa39c90), top: flat(0x3a3640) });
    logs(0, 0.24, 0.05, Math.min(0.7, w - 2 * jw - 0.2)); fire(0, 0.24, 0.22, 1.5); light(0, d + 0.4, 0.6, 6.5, [1, 0.62, 0.28], 1.2);
    for (const sg of [-1, 1]) { bar([sg * (w / 2 - jw - 0.08), 0.42, 0.05], [sg * (w / 2 - jw - 0.08), 0.42, 0.36], 0.03, flat(IRON)); blob(sg * (w / 2 - jw - 0.08), 0.42, 0.39, 0.035, bl(BRASS), { noShadow: true }); icon(sg * (w / 2 - 0.2), d * 0.6, 1.36, A_STICK); }
    if (o.crest !== false) { const cv = PX(22, 26), hc = HERALD[(o.seed || 0) % HERALD.length]; pxShield(cv, 11, 12, 10, hc[0], hc[1], (o.seed || 0) % 5); cv.art(8, 22, DEV.crown, { y: GOLD_L }); vart(cv, -22 / 64, 0.305, 1.56, { n: [0, 1, 0] }); }
    else { cyl(0, 0.38, 1.36, 0.07, 0.14, 6, sh(0x6a8a9a, 0.05), { noShadow: true }); }
  });
  // [centre] chandelier hanging at o.h (2.8) above the floor on a chain o.drop (1.6) long.  o.r (0.6), o.n candles (8), o.tiers (1).  lit, not solid
  def('chandelier', 'C', o => [2 * (o.r || 0.6), 2 * (o.r || 0.6)], 'hanging chandelier, lit, not solid (o.h, o.drop, o.r, o.n, o.tiers, o.gold)', (o) => {
    const h = o.h || 2.8, r = o.r || 0.6, n = o.n || 8, drop = o.drop === undefined ? 1.6 : o.drop, c = o.gold ? BRASS : 0x3c3a44, ring = (rr, z, k) => {
      cyl(0, 0, z, rr, 0.08, 12, (s, t) => mul(c, (Math.floor(s * U) % 6 === 0 ? 1.4 : 1) * (Math.floor(t * V) === 0 ? 0.7 : 1.1)), { top: flat(mul(c, 1.35)), inner: 0.84, noShadow: true });
      for (let i = 0; i < 4; i++) { const a = i * 1.571 + 0.785; bar([Math.cos(a) * rr * 0.92, Math.sin(a) * rr * 0.92, z + 0.06], [0, 0, z + 0.62], 0.02, flat(mul(c, 0.9))); }
      for (let i = 0; i < k; i++) { const a = i / k * 6.283 + 0.3; candle(Math.cos(a) * rr * 0.93, Math.sin(a) * rr * 0.93, z + 0.08, 4); } };
    ring(r, h, n); if (o.tiers > 1) ring(r * 0.55, h + 0.36, Math.max(4, n >> 1));
    bar([0, 0, h + 0.6], [0, 0, h + 0.6 + drop], 0.025, (s) => (Math.floor(s * 20) & 1 ? mul(c, 0.8) : mul(c, 1.4)));
    blob(0, 0, h + 0.62, 0.05, bl(mul(c, 1.3)), { noShadow: true }); blob(0, 0, h - 0.04, 0.06, bl(mul(c, 1.2)), { noShadow: true });
    E.blob(pt([0, 0, h + 0.05]), r * fr.s, () => -1, { noShadow: false });
    light(0, 0, h - 0.3, 8.5, [1.0, 0.74, 0.4], 0.75);
  });
  // [centre] standing candelabra, o.n (5) candles, lit
  def('candelabra', 'c', [0.4, 0.4], 'standing candelabra, lit (o.n, o.h, o.iron)', (o) => {
    const h = o.h || 1.15, n = o.n || 5, c = o.iron ? IRON_L : BRASS, m = flat(c), dk = flat(mul(c, 0.7));
    cyl(0, 0, 0, 0.14, 0.04, 8, dk, { top: m }); cyl(0, 0, 0.04, 0.07, 0.05, 6, m, { noShadow: true }); bar([0, 0, 0.08], [0, 0, h], 0.035, (s, t) => (Math.floor(s * 12) % 4 === 0 ? mul(c, 1.3) : c), { noShadow: false });
    for (let i = 0; i < n; i++) { const k = i - (n - 1) / 2, x = k * 0.13, z = h + 0.08 - Math.abs(k) * 0.05; if (k) { bar([0, 0, h - 0.12], [x, 0, z - 0.06], 0.025, dk); bar([x, 0, z - 0.06], [x, 0, z], 0.025, dk); } nb(x - 0.03, -0.03, z, 0.06, 0.06, 0.02, m); candle(x, 0, z + 0.02, 5); }
    light(0, 0.1, h + 0.25, 4.6, [1, 0.76, 0.42], 0.85);
  });
  // [wall] burning wall torch at o.h (1.5) above the floor (flame + light)
  def('torch', 'w', [0.2, 0.3], 'wall torch, burning (o.h)', (o) => {
    const h = o.h || 1.5, pl = PX(5, 9, IRON); pl.r(1, 1, 3, 7, IRON_L).p(2, 2, 0x8a8a94).p(2, 6, 0x8a8a94);
    vart(pl, -5 / 64, 0.012, h - 0.1, { n: [0, 1, 0] }); nb(-0.03, 0, h, 0.06, 0.2, 0.05, flat(IRON));
    bar([0, 0.2, h - 0.06], [0, 0.26, h + 0.24], 0.055, (s, t) => (s > 0.22 ? 0x3a2a22 : WOOD), {}); nb(-0.05, 0.15, h + 0.02, 0.1, 0.1, 0.04, flat(IRON_L));
    fire(0, 0.26, h + 0.25, 1); light(0.12, 0.42, h + 0.4, 4.6, [1.0, 0.62, 0.26], 1.2);
  });
  // [wall] candle sconce at o.h (1.5): brass plate, two candles, lit
  def('sconce', 'w', [0.3, 0.22], 'wall sconce with two candles, lit (o.h)', (o) => {
    const h = o.h || 1.5, pl = PX(7, 11); pl.disc(3, 5, 3.4, GOLD).disc(3, 5, 2.2, GOLD_L).p(3, 5, 0xfff6c0).r(3, 9, 3, 10, GOLD);
    vart(pl, -7 / 64, 0.012, h - 0.05, { n: [0, 1, 0] }); nb(-0.02, 0, h - 0.02, 0.04, 0.16, 0.03, flat(BRASS)); nb(-0.11, 0.13, h - 0.01, 0.22, 0.05, 0.03, flat(BRASS), flat(GOLD_L));
    candle(-0.09, 0.155, h + 0.02, 5); candle(0.09, 0.155, h + 0.02, 5);
    light(0, 0.4, h + 0.2, 3.6, [1, 0.76, 0.42], 0.75);
  });
  // [centre] iron brazier on three legs (flame + light)
  def('brazier', 'c', [0.64, 0.64], 'burning brazier (o.h)', (o) => {
    const h = o.h || 0.55;
    for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.5; bar([Math.cos(a) * 0.26, Math.sin(a) * 0.26, 0], [Math.cos(a) * 0.1, Math.sin(a) * 0.1, h], 0.045, flat(IRON)); }
    frust(0, 0, h, 0.12, 0.3, 0.2, 8, (s, t) => (Math.floor(s * U) % 5 === 0 ? 0x24242c : Math.floor(t * V) % 4 === 0 ? 0xf0702a | FE : IRON_L), {}); cyl(0, 0, h + 0.2, 0.3, 0.04, 8, flat(0x4a4a56), { top: coalT, noShadow: true });
    fire(0, 0, h + 0.26, 1.6); light(0, 0, h + 0.7, 5.5, [1.0, 0.6, 0.25], 1.4);
  });
  // [centre] stone column o.h (4) tall, o.r (0.3).  o.square for a square pier
  def('column', 'c', o => { const r = (o.r || 0.3) + 0.14; return [2 * r, 2 * r]; }, 'stone column / pier (o.h, o.r, o.square, o.c)', (o, w) => {
    const h = o.h || 4, r = o.r || 0.3, c = o.c || 0xb8b0a2, R = w / 2, flute = (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * V), Ht = Math.round(q.vl * V); return mul(c, (X % 4 === 0 ? 0.8 : X % 4 === 1 ? 1.08 : 1) * (Y % 40 === 0 ? 0.8 : 1) * (0.95 + h2(X >> 1, Y >> 2) * 0.08) * (Y > Ht - 6 ? 0.86 : 1)); };
    box(-R, -R, 0, w, w, 0.2, { side: stn(mul(c, 0.92)), top: stn(c) }); box(-R + 0.05, -R + 0.05, 0.2, w - 0.1, w - 0.1, 0.1, { side: stn(c), top: stn(c) });
    if (o.square) box(-r, -r, 0.3, 2 * r, 2 * r, h - 0.6, { side: mason(12, c), noTop: true }); else cyl(0, 0, 0.3, r, h - 0.6, 10, flute, {});
    box(-R + 0.05, -R + 0.05, h - 0.3, w - 0.1, w - 0.1, 0.1, { side: stn(c), noTop: true }); box(-R, -R, h - 0.2, w, w, 0.2, { side: stn(mul(c, 1.05)), top: flat(0x3a3640) });
  });
  const wingPX = (c) => { const cv = PX(11, 24); for (let y = 0; y < 24; y++) for (let x = 0; x < 11; x++) { const lim = y > 14 ? 10 - (y - 14) * 0.9 : 3 + y * 0.5; if (x <= lim && x >= (y < 6 ? 2 - y * 0.3 : 0)) cv.p(x, y, mul(c, ((x + y * 2) % 5 === 0 || x > lim - 1) ? 0.78 : y % 4 === 0 ? 0.9 : 1.04)); } return cv; };
  /* a carved figure standing on z; about 0.95 tall */
  function figure(kind, z, c, o) {
    const s = stn(c), b = bl(c, 0.08), b2 = bl(mul(c, 0.86), 0.08), ns = { noShadow: true }, hd = { noShadow: true, f: E.F_NOAO }, gilt = o.gilt ? bl(GOLD_L) : b;
    if (kind === 'urn') { frust(0, 0, z, 0.12, 0.07, 0.08, 8, s, {}); frust(0, 0, z + 0.08, 0.07, 0.2, 0.2, 8, s, {}); frust(0, 0, z + 0.28, 0.2, 0.13, 0.12, 8, s, {}); frust(0, 0, z + 0.4, 0.13, 0.17, 0.05, 8, s, { top: flat(mul(c, 0.5)), noShadow: true });
      if (o.plant !== false) for (let i = 0; i < 4; i++) blob(Math.cos(i * 1.7) * 0.07, Math.sin(i * 1.7) * 0.07, z + 0.5 + (i & 1) * 0.06, 0.1, T.leaves(T.LEAF_G, T.FLOWERS, 0.18), ns); return; }
    if (kind === 'knight') {
      for (const dx of [-0.07, 0.07]) nb(dx - 0.05, -0.05, z, 0.1, 0.11, 0.36, s);
      frust(0, 0, z + 0.34, 0.16, 0.13, 0.1, 8, s, ns); frust(0, 0, z + 0.44, 0.13, 0.17, 0.22, 8, s, { top: s }); for (const dx of [-0.18, 0.18]) { blob(dx, 0, z + 0.64, 0.07, b, ns); nb(dx - 0.04, -0.03, z + 0.4, 0.08, 0.08, 0.22, s); }
      blob(0, 0, z + 0.8, 0.1, (dx, dy, ix, iy) => (dy > -0.06 && dy < 0.1 && dx > -0.3 && dx < 0.6 ? mul(c, 0.62) : b(dx, dy, ix, iy)), hd); nb(-0.02, -0.08, z + 0.86, 0.04, 0.14, 0.07, s);
      const sv = PX(11, 15); pxShield(sv, 5, 7, 5, mul(c, 0.95), mul(c, 0.7), 2); sv.each((x, y, v) => (v === 0x8a909c ? mul(c, 0.6) : v === 0xe8ecf0 ? mul(c, 1.2) : undefined)); vart(sv, -0.3, 0.12, z + 0.3, { noShadow: false });
      bar([0.06, 0.14, z + 0.02], [0.06, 0.14, z + 0.56], 0.04, flat(mul(c, 1.1))); bar([-0.02, 0.14, z + 0.5], [0.14, 0.14, z + 0.5], 0.035, flat(mul(c, 0.8)));
      return; }
    // robed figures
    frust(0, 0, z, 0.21, 0.13, 0.46, 8, (sx, t, q) => { const X = Math.floor(sx * U); return mul(c, (X % 5 === 0 ? 0.78 : X % 5 === 1 ? 1.08 : 0.97) * (0.95 + h2(X, Math.floor(t * V) >> 2) * 0.08)); }, {});
    frust(0, 0, z + 0.46, 0.13, 0.165, 0.2, 8, s, { top: s }); for (const dx of [-0.16, 0.16]) blob(dx, 0, z + 0.63, 0.065, b, ns);
    blob(0, 0, z + 0.81, 0.1, b, hd);
    if (kind === 'king') { cyl(0, 0, z + 0.87, 0.08, 0.05, 8, o.gilt ? gold : s, { noShadow: true, top: o.gilt ? flat(0xa87a24) : s }); for (let i = 0; i < 4; i++) blob(Math.cos(i * 1.57 + 0.78) * 0.07, Math.sin(i * 1.57 + 0.78) * 0.07, z + 0.93, 0.022, gilt, ns); blob(0, 0.07, z + 0.73, 0.06, b2, ns);
      bar([0.2, 0.08, z + 0.2], [0.2, 0.08, z + 0.95], 0.035, flat(mul(c, 0.9))); blob(0.2, 0.08, z + 0.98, 0.04, gilt, ns); blob(-0.17, 0.1, z + 0.5, 0.055, gilt, ns); nb(-0.2, -0.16, z + 0.05, 0.4, 0.06, 0.62, s); }
    else if (kind === 'angel') { const wg = wingPX(c); quad([-0.1, -0.06, z + 0.36], [-11 / U, -0.06, 0], [0, 0, 24 / V], wg.tex, { cut: true }); quad([0.1, -0.06, z + 0.36], [11 / U, -0.06, 0], [0, 0, 24 / V], wg.tex, { cut: true });
      blob(0, 0.13, z + 0.56, 0.05, b, ns); for (const dx of [-0.09, 0.09]) bar([dx * 1.7, 0.02, z + 0.62], [0, 0.13, z + 0.56], 0.05, flat(mul(c, 0.95)));
      if (o.gilt) spr(0, 0, z + 0.9, 9, 3, (X, Y) => (Y === 1 && X > 0 && X < 8 ? -1 : GOLD_L | FE)); }
    else { blob(0, -0.05, z + 0.84, 0.06, b2, ns); frust(-0.14, 0.12, z + 0.44, 0.03, 0.07, 0.12, 6, s, ns); bar([-0.14, 0, z + 0.62], [-0.14, 0.12, z + 0.5], 0.05, flat(mul(c, 0.95))); bar([0.14, 0, z + 0.62], [0.1, 0.1, z + 0.44], 0.05, flat(mul(c, 0.95))); }      // maiden with a jar
  }
  // [centre] statue on a plinth.  o.kind 'knight' | 'king' | 'angel' | 'maiden' | 'urn', o.c stone colour, o.gilt gold details, o.moss (garden), o.ph plinth height
  def('statue', 'c', [0.7, 0.7], 'statue on a plinth (o.kind: knight king angel maiden urn, o.c, o.gilt, o.moss, o.ph)', (o) => {
    const c = o.c || 0xbcb4a6, ph = o.ph === undefined ? 0.5 : o.ph, ms = o.moss ? (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * V); return T.fbm(X * 0.2 + 3, Y * 0.2) > 0.6 - Math.max(0, 0.2 - Y * 0.02) ? (h2(X, Y) < 0.5 ? 0x5c7743 : 0x78944e) : stn(mul(c, 0.9))(s, t, q); } : stn(mul(c, 0.9));
    box(-0.35, -0.35, 0, 0.7, 0.7, 0.1, { side: ms, top: stn(c) }); box(-0.29, -0.29, 0.1, 0.58, 0.58, ph - 0.16, { side: (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * V), Wt = Math.round(q.ul * U), Ht = Math.round(q.vl * V), e = Math.min(X - 3, Wt - 4 - X, Y - 2, Ht - 3 - Y); return e === 0 ? mul(c, 0.72) : e === 1 ? mul(c, 1.08) : ms(s, t, q); }, noTop: true });
    box(-0.33, -0.33, ph - 0.06, 0.66, 0.66, 0.06, { side: stn(mul(c, 1.05)), top: stn(mul(c, 1.02)) });
    sub(0, 0, ph, o.fs || 1.3, () => figure(o.kind || 'knight', 0, c, o));
    if (o.moss) for (let i = 0; i < 3; i++) blob(-0.3 + h2(i, 4) * 0.6, 0.32, 0.04 + h2(i, 5) * 0.1, 0.06, T.leaves(T.LEAF_D, null, 0), { noShadow: true });
  });
  // [centre] potted plant.  o.kind 'bush' | 'fern' | 'tree' | 'flowers', o.pot colour, o.s scale
  def('plant', 'c', [0.5, 0.5], 'potted plant (o.kind: bush fern tree flowers, o.pot, o.s)', (o) => {
    const s = 1, pc = o.pot || CLAY, k = o.kind || 'bush', L = T.leaves(T.LEAF_G, k === 'flowers' ? T.FLOWERS : null, 0.3), D = T.leaves(T.LEAF_D, null, 0);
    frust(0, 0, 0, 0.14 * s, 0.2 * s, 0.24 * s, 8, sh(mul(pc, 0.9), 0.06), {}); cyl(0, 0, 0.24 * s, 0.215 * s, 0.045 * s, 8, sh(pc, 0.05), { top: T.dirt, noShadow: true });
    const z = 0.28 * s;
    if (k === 'tree') { bar([0, 0, z], [0, 0, z + 0.55 * s], 0.05, flat(0x6b4a36), { noShadow: false }); blob(0, 0, z + 0.78 * s, 0.27 * s, L); blob(0.08 * s, 0.05 * s, z + 0.95 * s, 0.17 * s, D, { noShadow: true }); blob(-0.1 * s, 0, z + 0.68 * s, 0.16 * s, D, { noShadow: true }); }
    else if (k === 'fern') { for (let i = 0; i < 9; i++) { const a = i * 0.7, r = 0.3 * s; bar([0, 0, z], [Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6, z + 0.36 * s], 0.05, flat(i & 1 ? 0x4d9440 : 0x3f8438)); bar([Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6, z + 0.36 * s], [Math.cos(a) * r, Math.sin(a) * r, z + 0.22 * s], 0.04, flat(i & 1 ? 0x5aa348 : 0x478c3c)); } blob(0, 0, z + 0.1 * s, 0.13 * s, D, { noShadow: true }); }
    else { for (let i = 0; i < 4; i++) { const a = i * 1.571 + 0.4; blob(Math.cos(a) * 0.1 * s, Math.sin(a) * 0.1 * s, z + (0.12 + (i & 1) * 0.1) * s, 0.17 * s, i & 1 ? D : L, { noShadow: i > 0 }); } blob(0, 0, z + 0.32 * s, 0.16 * s, L, { noShadow: true }); }
  });
  // [centre] vase of flowers, on a pedestal when o.stand is set.  o.c glaze colour
  def('vase', 'c', o => (o.stand ? [0.4, 0.4] : [0.3, 0.3]), 'vase with flowers (o.stand, o.c, o.seed)', (o) => {
    const c = o.c || 0x3a5aa0, z = o.stand ? 0.6 : 0, gl = (s, t) => { const X = Math.floor(s * U), Y = Math.floor(t * V); return Y % 5 === 2 ? 0xf0ece0 : (X + Y) % 4 === 0 ? mul(c, 1.3) : c; }, seed = o.seed || 0;
    if (o.stand) { cyl(0, 0, 0, 0.17, 0.07, 8, stn(0xb0a89a), { top: stn(0xb8b0a2) }); cyl(0, 0, 0.07, 0.11, 0.46, 8, stn(0xb8b0a2), {}); cyl(0, 0, 0.53, 0.17, 0.07, 8, stn(0xc0b8aa), { top: stn(0xc4bdb0) }); }
    frust(0, 0, z, 0.05, 0.11, 0.12, 8, gl, {}); frust(0, 0, z + 0.12, 0.11, 0.05, 0.1, 8, gl, { noShadow: true }); cyl(0, 0, z + 0.22, 0.055, 0.04, 6, flat(0xf0ece0), { noShadow: true, top: flat(0x3a5a34) });
    for (let i = 0; i < 3; i++) blob(Math.cos(i * 2.1) * 0.05, Math.sin(i * 2.1) * 0.05, z + 0.32, 0.07, T.leaves(T.LEAF_G, null, 0), { noShadow: true });
    for (let i = 0; i < 6; i++) { const a = i * 1.05 + seed, fc = [0xd8414f, 0xe9c64c, 0xf4efe0, 0xe8698a, 0xa56be0, 0xf0983a][(i + seed) % 6]; blob(Math.cos(a) * (i ? 0.08 : 0), Math.sin(a) * (i ? 0.08 : 0), z + 0.4 + (i ? h2(i, seed) * 0.06 : 0.1), 0.045, (dx, dy, ix, iy) => ((ix + iy) % 4 === 0 ? 0xf6e7a0 : fc), { noShadow: true, f: E.F_NOAO }); }
  });
  // [wall] curtain o.w (1.4) wide, o.hh (2.2) tall, hanging from o.h + o.hh.  o.open (default true) = drawn back to both sides
  def('curtain', 'w', o => [o.w || 1.4, 0.1], 'wall / window curtain (o.w, o.hh, o.h, o.c, o.c2, o.open)', (o, w) => {
    const hh = o.hh || 2.2, h = o.h === undefined ? 0.1 : o.h, c = o.c || 0x7a2030, c2 = o.c2 || GOLD, cv = PX(w * U, hh * V), W = cv.W, H = cv.H, tie = Math.round(H * 0.38), open = o.open !== false;
    for (let y = 0; y < H; y++) { const k = y >= tie ? (y - tie) / (H - tie) : (tie - y) / tie, hw = open ? (y >= tie ? W * (0.13 + 0.37 * k * k) : W * (0.13 + 0.07 * k)) : W / 2;
      for (let x = 0; x < W; x++) { const ex = x < W / 2 ? x : W - 1 - x; if (ex >= hw) continue; const fold = open ? (ex / hw * 5 | 0) : (x / 4 | 0), f = [0.82, 1.06, 0.94, 1.02, 0.86][((fold % 5) + 5) % 5]; cv.p(x, y, y < 3 ? mul(c2, 0.9) : y >= H - 4 ? (y % 2 ? c2 : mul(c2, 0.8)) : open && Math.abs(y - tie) < 2 ? c2 : mul(c, f * (0.96 + h2(x, y >> 2) * 0.06))); } }
    vart(cv, -w / 2, 0.06, h, { noShadow: false });
    bar([-w / 2 - 0.08, 0.06, h + hh + 0.02], [w / 2 + 0.08, 0.06, h + hh + 0.02], 0.045, flat(BRASS)); for (const x of [-w / 2 - 0.1, w / 2 + 0.1]) blob(x, 0.06, h + hh + 0.02, 0.04, bl(GOLD_L), { noShadow: true });
  });

  /* ================================================================================================
   *  PRISON & UNDERCROFT
   * ================================================================================================ */
  // [corner] iron-bar cell front o.len (3) long (along x) x 0.14, o.h (2.1) high, with a door o.door (centre along the length; false = none) o.dw (0.9) wide; o.open swings it open.  solid except the open doorway
  def('cellFront', 'R', o => [o.len || 3, 0.14], 'wall of iron bars with a door (o.len, o.h, o.door, o.dw, o.open)', (o, w, d) => {
    const h = o.h || 2.1, dw = o.dw || 0.9, dc = o.door === false ? -9 : (o.door === undefined ? w / 2 : o.door), d0 = dc - dw / 2, d1 = dc + dw / 2, hasDoor = dc > -1, ir = 0x3a3a46;
    const bars = (x0, x1, door) => (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * V), Wt = Math.round(q.ul * U), Ht = Math.round(q.vl * V), m = X % 5; if (X < 2 || X >= Wt - 2) return mul(ir, X === 0 || X === Wt - 2 ? 1.5 : 0.9); if (Y < 3 || Y >= Ht - 3 || (Y >= 38 && Y < 41)) return mul(ir, Y % 3 === 2 || Y === 40 ? 1.5 : 1); if (door && X >= Wt - 8 && X < Wt - 3 && Y >= 30 && Y < 38) return (X === Wt - 6 && Y === 33) ? 0x1a1620 : 0x5a5a68; return m === 1 ? mul(ir, 1.6) : m === 2 ? ir : -1; };
    const run = (x0, x1) => { if (x1 - x0 < 0.05) return; quad([x0, d / 2, 0], [x1 - x0, 0, 0], [0, 0, h], bars(x0, x1, false), { cut: true }); block(x0, 0, x1 - x0, d); };
    if (hasDoor) { run(0, d0); run(d1, w); for (const x of [d0 - 0.04, d1 - 0.04]) box(x, d / 2 - 0.04, 0, 0.08, 0.08, h, { side: metal(ir) }); nb(d0, d / 2 - 0.04, h - 0.1, dw, 0.08, 0.1, metal(ir));
      if (o.open) { quad([d0 + 0.02, d / 2, 0], [0, dw - 0.04, 0], [0, 0, h - 0.1], bars(0, dw, true), { cut: true }); block(d0 - 0.04, 0, 0.1, dw + 0.05); }
      else { quad([d0 + 0.02, d / 2 + 0.02, 0], [dw - 0.04, 0, 0], [0, 0, h - 0.1], bars(0, dw, true), { cut: true }); block(d0, 0, dw, d); } }
    else run(0, w);
    for (const x of [0, w - 0.08]) box(x, d / 2 - 0.04, 0, 0.08, 0.08, h, { side: metal(ir) });
    if (hasDoor) { poi(dc, d + 0.5, 'guard', 0, -1); }
  });
  // [wall] shackles hanging from a ring at o.h (1.3); a prisoner spot in front
  def('shackles', 'w', [0.7, 0.1], 'wall shackles and chains (o.h)', (o) => {
    const h = o.h || 1.3, cv = PX(22, 30), I = 0xb8b8c4, D = 0x4a4a56;
    cv.r(9, 25, 12, 29, D).r(10, 26, 11, 28, I).ring(10.5, 23.5, 2, I);
    for (const sg of [-1, 1]) { const m = x => 10.5 + sg * x; for (let i = 0; i < 16; i++) { cv.p(m(1.5 + i * 0.45), 22 - i, i & 1 ? I : D); cv.p(m(2.5 + i * 0.45), 22 - i, i & 1 ? D : I); } cv.ring(m(8.5), 3.5, 2.6, I); cv.p(m(8.5), 6, 0x8a8a94); }
    vart(cv, -22 / 64, 0.02, h - 30 / V, { n: [0, 1, 0] });
    poi(0, 0.3, 'pris', 0, 1);
  });
  // [corner] stocks 1.1 x 0.4; the prisoner stands behind, facing the front
  def('stocks', 'r', [1.1, 0.4], 'village stocks', (o, w, d) => {
    const c = 0x6a4a34, bd = (s, t, q, a, b) => { const X = Math.floor(s * U), Y = Math.floor(t * V), Ht = Math.round(q.vl * V); for (const k of [[0.5, 4.2], [0.22, 2.6], [0.78, 2.6]]) { const dx = X - k[0] * q.ul * U, dy = Y - Ht / 2; if (dx * dx + dy * dy < k[1] * k[1]) return 0x1a1418; } if (Y === (Ht >> 1)) return mul(c, 0.55); return mul(c, (Y % 6 === 0 ? 0.75 : 1.02) + h2(X >> 2, Y / 6 | 0) * 0.1); };
    for (const x of [0, w - 0.12]) { box(x, 0.14, 0, 0.12, 0.12, 1.0, { side: sh(mul(c, 0.8)) }); nb(x - 0.04, 0.02, 0, 0.2, 0.36, 0.06, sh(mul(c, 0.7))); }
    box(0.12, 0.16, 0.5, w - 0.24, 0.08, 0.4, { side: sh(c), ty: bd, by: bd, top: sh(mul(c, 1.2)) });
    nb(w - 0.14, 0.24, 0.66, 0.05, 0.03, 0.08, flat(IRON_L));
    poi(w / 2, 0.0, 'pris', 0, 1, undefined, [w / 2, -0.4]);
  });
  // [wall] board of keys at o.h (1.4)
  def('keyRack', 'w', [0.6, 0.06], 'rack of keys on the wall (o.h)', (o) => {
    const h = o.h || 1.4, cv = PX(19, 15);
    cv.r(0, 9, 18, 13, WOOD).r(0, 13, 18, 13, WOOD_L).r(0, 9, 18, 9, WOOD_D);
    for (let i = 0; i < 4; i++) { const x = 2 + i * 5, k = i % 2 ? GOLD : 0xa0a6b2; cv.p(x, 11, 0x2a2630); cv.ring(x, 7.5, 1.6, k); cv.r(x, 1 + (i & 1), x, 5, k); cv.p(x + 1, 1 + (i & 1), k).p(x + 1, 3, k); }
    vart(cv, -19 / 64, 0.02, h - 0.2, { n: [0, 1, 0] });
  });
  // [corner] heavy interrogation chair 0.6 x 0.6 with straps (prisoner sits)
  def('interroChair', 'r', [0.6, 0.6], 'heavy iron-bound interrogation chair', (o, w, d) => {
    const c = 0x4a3628, band = (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * V), Ht = Math.round(q.vl * V); if (Y % 12 === 6 || Y % 12 === 7) return (X % 4 === 1) ? 0x8a8a94 : IRON_L; if (Y >= Ht - 1) return mul(c, 1.25); return mul(c, (X % 6 === 0 ? 0.7 : 1) + h2(X / 6 | 0, Y >> 3) * 0.1); };
    box(0.02, 0, 0, w - 0.04, 0.1, 1.2, { side: band, top: sh(mul(c, 1.2)) });
    box(0, 0.1, 0, w, d - 0.1, 0.34, { side: band, top: wt(mul(c, 1.25)) });
    for (const x of [0, w - 0.09]) { box(x, 0.1, 0.34, 0.09, d - 0.12, 0.22, { side: sh(c), top: sh(mul(c, 1.3)) }); nb(x - 0.005, d * 0.62, 0.5, 0.1, 0.07, 0.065, flat(0x6a4a30), flat(0x8a6a44)); }
    nb(0.08, 0.1, 0.85, w - 0.16, 0.012, 0.07, flat(0x6a4a30)); nb(0.1, d - 0.01, 0.06, w - 0.2, 0.012, 0.07, flat(0x6a4a30));
    poi(w / 2, 0.36, 'pris', 0, 1, 0.34, [w / 2, d + 0.3]);
  });
  const boneB = (dx, dy, ix, iy) => (dx * 0.6 - dy * 0.5 < -0.3 ? 0xf4efe0 : dx > 0.5 || dy > 0.5 ? 0xb8ae98 : 0xdcd4c0);
  const skullB = (dx, dy, ix, iy) => { if (dy > -0.25 && dy < 0.2 && ((dx > -0.55 && dx < -0.1) || (dx > 0.2 && dx < 0.65))) return 0x1a1620; if (dy > 0.3 && dy < 0.5 && Math.abs(dx - 0.05) < 0.14) return 0x2a2228; if (dy > 0.6 && ((ix & 1) === 0)) return 0x6a6458; return boneB(dx, dy, ix, iy); };
  // [centre] skeleton slumped against the back (put it in a corner or against a wall).  not solid
  def('skeleton', 'C', [0.7, 0.8], 'skeleton slumped against the wall, not solid (o.chain)', (o) => {
    const B0 = flat(0xdcd4c0), B1 = flat(0xb8ae98), rb = PX(11, 12);
    for (let i = 0; i < 5; i++) { rb.r(1 + (i > 3 ? 1 : 0), 1 + i * 2, 9 - (i > 3 ? 1 : 0), 1 + i * 2, i & 1 ? 0xdcd4c0 : 0xc8c0aa); } rb.r(5, 0, 5, 11, 0xf0e8d8).r(2, 11, 8, 11, 0xdcd4c0);
    quad([-11 / 64, -0.22, 0.14], [11 / U, 0, 0], [0, -0.07, 12 / V], rb.tex, { cut: true, noShadow: true });
    blob(0.02, -0.26, 0.56, 0.085, skullB, { noShadow: true });
    blob(0, -0.2, 0.1, 0.07, boneB, { noShadow: true });
    bar([-0.08, -0.16, 0.08], [-0.16, 0.14, 0.2], 0.04, B0); bar([-0.16, 0.14, 0.2], [-0.2, 0.36, 0.03], 0.035, B1); bar([0.08, -0.16, 0.08], [0.2, 0.26, 0.04], 0.04, B0); bar([0.2, 0.26, 0.04], [0.3, 0.3, 0.03], 0.03, B1);
    bar([-0.16, -0.24, 0.5], [-0.26, -0.1, 0.24], 0.03, B0); bar([-0.26, -0.1, 0.24], [-0.3, 0.06, 0.03], 0.03, B1); bar([0.16, -0.24, 0.5], [0.28, -0.14, 0.24], 0.03, B0); bar([0.28, -0.14, 0.24], [0.22, 0.02, 0.1], 0.03, B1);
    if (o.chain !== false) { bar([0.28, -0.14, 0.24], [0.3, -0.34, 0.8], 0.02, s => (Math.floor(s * 24) & 1 ? 0x5a5a68 : 0x2e2e38)); }
    for (let i = 0; i < 4; i++) disk(-0.25 + h2(i, 7) * 0.5, 0.1 + h2(i, 9) * 0.25, 0.012, 0.02, flat(0xc8c0aa), { f: E.F_NOAO });
  });
  // [centre] treasure pile o.r (0.6): gold, gems, goblets and a half-buried chest
  def('treasure', 'c', o => [2 * (o.r || 0.6), 2 * (o.r || 0.6)], 'heap of gold and treasure (o.r, o.seed)', (o) => {
    const r = o.r || 0.6, seed = o.seed || 0, n = Math.round(r * 16), GEM = [0xff5a6a, 0x5ac8ff, 0x6af08a, 0xd08aff];
    disk(0, 0, 0.012, r * 1.08, (s, t, q, a, b) => { const X = Math.floor(s * U), Y = Math.floor(t * U); return h2(X >> 1, Y >> 1) < 0.5 - Math.hypot(a - 0.5, b - 0.5) * 0.7 ? ((X + Y) & 1 ? GOLD : GOLD_L) : -1; }, { f: E.F_NOAO });
    blob(0, 0, r * 0.25, r * 0.55, coinT);
    for (let i = 0; i < n; i++) { const a = i * 2.4 + seed, rr = r * (0.25 + h2(i, seed + 1) * 0.55); blob(Math.cos(a) * rr, Math.sin(a) * rr, r * 0.12 + (1 - rr / r) * r * 0.4, r * (0.2 + h2(i, 3) * 0.14), coinT, { noShadow: true, f: E.F_NOAO }); }
    for (let i = 0; i < 6; i++) { const a = i * 1.1 + seed, rr = r * (0.2 + h2(i, 5) * 0.5), g = GEM[i % 4]; spr(Math.cos(a) * rr, Math.sin(a) * rr, r * 0.3 + (1 - rr / r) * r * 0.45, 3, 3, (X, Y) => (X === 1 || Y === 1 ? (X === 1 && Y === 1 ? 0xffffff : g) | FE : -1), { bias: 0.3 }); }
    icon(r * 0.1, r * 0.1, r * 0.78, A_CROWN, { bias: 0.3 }); icon(-r * 0.4, r * 0.3, r * 0.4, A_GOBLET, { bias: 0.3 }); icon(r * 0.45, r * 0.25, r * 0.36, A_GOBLET, { bias: 0.3 });
    if (r >= 0.5) sub(-r * 0.75, -r * 0.6, 0, 1, () => { box(0, 0, 0, 0.6, 0.4, 0.3, { side: chestT(0x7a5234), top: flat(0x2a2028) }); box(0, -0.02, 0.3, 0.6, 0.07, 0.36, { side: chestT(0x7a5234), top: sh(0x9a6a44) }); for (let i = 0; i < 3; i++) blob(0.14 + i * 0.16, 0.2, 0.28, 0.1, coinT, { noShadow: true, f: E.F_NOAO }); });
    light(0, 0, r * 1.2, 2 + r, [1, 0.85, 0.4], 0.35);
  });
  // [corner] stone sarcophagus 0.9 x 1.8 with a knight effigy, head at the back
  def('sarcophagus', 'r', [0.9, 1.8], 'stone tomb with effigy (o.c, o.effigy)', (o, w, d) => {
    const c = o.c || 0xb0a89a, arc = (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * V), Ht = Math.round(q.vl * V), m = X % 10, ax = m - 4.5, top = Ht - 5; if (Y < 2 || Y >= Ht - 2) return mul(c, Y >= Ht - 1 ? 1.14 : 0.78); const inA = Y < top - 4 ? Math.abs(ax) < 3.2 : ax * ax + (Y - top + 4) * (Y - top + 4) < 10.5; return inA ? mul(c, 0.72 + (Math.abs(ax) < 0.8 && Y > 4 && Y < top - 5 ? 0.2 : 0)) : mul(c, 0.96 + h2(X >> 1, Y >> 1) * 0.1); };
    box(0, 0, 0, w, d, 0.1, { side: stn(mul(c, 0.85)), top: stn(mul(c, 0.9)) });
    box(0.06, 0.06, 0.1, w - 0.12, d - 0.12, 0.48, { side: arc, noTop: true });
    box(0.02, 0.02, 0.58, w - 0.04, d - 0.04, 0.08, { side: stn(mul(c, 1.06)), top: stn(mul(c, 1.02), 0.14) });
    if (o.effigy !== false) { const b = bl(mul(c, 1.06), 0.08), x = w / 2, ns = { noShadow: true };
      nb(x - 0.17, 0.16, 0.66, 0.34, 0.24, 0.06, stn(mul(c, 1.1))); blob(x, 0.3, 0.76, 0.1, (dx, dy, ix, iy) => (dy > -0.2 && dy < 0.1 && Math.abs(dx) < 0.5 ? mul(c, 0.6) : b(dx, dy, ix, iy)), ns);
      blob(x, 0.56, 0.7, 0.17, b, ns); blob(x, 0.8, 0.69, 0.155, b, ns); blob(x, 1.02, 0.68, 0.14, b, ns); for (const dx of [-0.07, 0.07]) { blob(x + dx, 1.24, 0.67, 0.09, b, ns); blob(x + dx, 1.42, 0.67, 0.08, b, ns); blob(x + dx, 1.58, 0.7, 0.075, b, ns); }
      blob(x, 0.66, 0.82, 0.06, bl(mul(c, 1.12)), ns); bar([x, 0.72, 0.84], [x, 1.5, 0.8], 0.045, flat(mul(c, 1.15))); bar([x - 0.1, 0.84, 0.84], [x + 0.1, 0.84, 0.84], 0.04, flat(mul(c, 0.85)));
      blob(x, 1.68, 0.7, 0.09, bl(mul(c, 0.9)), ns); }
  });
  // [centre] well / cistern: stone ring o.r (0.55).  o.roof adds posts, a little roof, windlass and bucket (courtyard well)
  def('well', 'c', o => { const r = (o.r || 0.55) + 0.06; return [2 * r, 2 * r]; }, 'stone well or cistern, o.roof for a roofed well (o.r, o.roof, o.h, o.c)', (o) => {
    const r = o.r || 0.55, hw = o.h || 0.52, c = o.c || 0x9a948a;
    cyl(0, 0, 0, r + 0.05, 0.08, 14, stn(mul(c, 0.85)), { top: stn(mul(c, 0.9)) });
    cyl(0, 0, 0.08, r, hw - 0.08, 14, mason(o.seed || 9, c), { top: stn(mul(c, 1.15), 0.14), inner: 0.72 });
    disk(0, 0, hw * 0.45, r * 0.74, (s, t) => { const n = T.fbm(s * 5, t * 5); return (n > 0.62 ? 0x4a7a8a : n > 0.45 ? 0x2a4a5a : 0x1e3644) | NOAO; });
    disk(0, 0, hw - 0.005, r * 0.73, (s, t, q, a, b) => (Math.hypot(a - 0.5, b - 0.5) > 0.44 ? 0x2a2a30 : -1), { f: E.F_NOAO });
    if (o.roof) {
      const ph = 1.75, post = sh(WOOD_D), tile = (s, t, q) => T.roof(s, t, { P: { pal: T.ROOF_RED, seed: 3 }, vl: q.vl });
      for (const sg of [-1, 1]) box(sg * (r - 0.02) - 0.05, -0.05, 0.08, 0.1, 0.1, ph - 0.08, { side: post });
      hcyl(0, -r + 0.06, 1.22, 0.07, 2 * r - 0.12, 6, flat(WOOD), { ax: 'x', cap: flat(WOOD_L) }); bar([r + 0.02, 0, 1.22], [r + 0.02, 0.14, 1.1], 0.035, flat(IRON_L));
      bar([0.05, 0, 1.2], [0.05, 0, hw + 0.1], 0.02, flat(0xc9b48a)); cyl(0.05, 0, hw - 0.08, 0.1, 0.17, 6, tubT(0x7a5636), { noShadow: true, top: flat(0x2a3a44) });
      const ov = 0.28, rw = r + ov, rise = 0.5, rd = 0.5;
      quad([-rw, rd, ph], [2 * rw, 0, 0], [0, -rd, rise], tile, { n: [0, rise, rd] }); quad([-rw, -rd, ph], [2 * rw, 0, 0], [0, rd, rise], tile, { n: [0, -rise, rd] });
      const gb = (s, t, q, a, b) => (b > 1 - Math.abs(2 * a - 1) ? -1 : mul(WOOD, Math.floor(s * U) % 5 === 0 ? 0.7 : 1));
      quad([rw - 0.08, -rd, ph], [0, 2 * rd, 0], [0, 0, rise], gb, { cut: true, n: [1, 0, 0] }); quad([-rw + 0.08, -rd, ph], [0, 2 * rd, 0], [0, 0, rise], gb, { cut: true, shadowOnly: true });
    } else if (o.bucket !== false) { cyl(r * 0.78, r * 0.5, hw, 0.09, 0.15, 6, tubT(0x7a5636), { top: flat(0x2a3a44) }); }
    poi(0, r + 0.4, 'drink', 0, -1);
  });
  // [wall] rat hole at the foot of a wall, with crumbs (cosmetic)
  def('ratHole', 'w', [0.3, 0.2], 'rat hole at the foot of a wall (cosmetic; o.rat)', (o) => {
    const cv = PX(13, 9); cv.disc(6, 0, 6.4, 0x5a554e).disc(6, 0, 5.2, 0x0e0a10); if (o.rat !== false) cv.p(5, 3, 0xff5a4a | FE).p(7, 3, 0xff5a4a | FE);
    vart(cv, -13 / 64, 0.012, 0, { n: [0, 1, 0], f: E.F_NOAO });
    for (let i = 0; i < 5; i++) disk(-0.12 + h2(i, 2) * 0.3, 0.05 + h2(i, 4) * 0.14, 0.012, 0.016, flat(i & 1 ? 0x77726c : 0xb8a070), { f: E.F_NOAO });
  });

  /* ================================================================================================
   *  TRAINING & STABLES
   * ================================================================================================ */
  const burlap = c => (dx, dy, ix, iy) => mul(c, ((ix + iy) % 4 === 0 || (ix - iy + 400) % 4 === 0 ? 0.84 : 1) * (0.94 + h2(ix, iy) * 0.1));
  // [centre] straw training dummy on a post, with a battered shield and wooden sword
  def('dummy', 'c', [0.5, 0.5], 'straw training dummy', (o) => {
    nb(-0.22, -0.04, 0, 0.44, 0.08, 0.05, sh(WOOD_D)); nb(-0.04, -0.22, 0, 0.08, 0.44, 0.05, sh(WOOD_D)); box(-0.04, -0.04, 0, 0.08, 0.08, 0.5, { side: sh(WOOD) });
    blob(0, 0, 0.66, 0.2, burlap(0xc9a85a)); blob(0, 0, 0.5, 0.15, burlap(0xb8943e), { noShadow: true });
    bar([-0.38, 0, 0.78], [0.38, 0, 0.78], 0.06, flat(WOOD));
    blob(0, 0, 0.98, 0.115, (dx, dy, ix, iy) => (dy > -0.2 && dy < 0 && (Math.abs(dx + 0.3) < 0.12 || Math.abs(dx - 0.3) < 0.12) ? 0x2a2228 : dy > 0.25 && dy < 0.38 && Math.abs(dx) < 0.4 ? 0x8a2a2a : burlap(0xd8b86a)(dx, dy, ix, iy)), { noShadow: true });
    for (let i = 0; i < 6; i++) bar([Math.cos(i) * 0.1, Math.sin(i) * 0.1, 0.44], [Math.cos(i) * 0.2, Math.sin(i) * 0.2, 0.34], 0.03, flat(i & 1 ? 0xe8cc70 : 0xb89438));
    const sv = PX(13, 15); pxShield(sv, 6, 7, 6, 0x8a4a3a, 0xc9b48a, 3); vart(sv, -0.52, 0.06, 0.52, { noShadow: false });
    bar([0.36, 0.04, 0.74], [0.42, 0.06, 1.22], 0.05, flat(0xb08a5a)); bar([0.3, 0.05, 0.84], [0.46, 0.05, 0.84], 0.04, flat(WOOD_D));
    poi(0, 0.6, 'train', 0, -1);
  });
  // [corner] archery butt 0.9 x 0.5: straw target on a stand; the archer's spot is o.range (4) in front
  def('archeryButt', 'r', [0.9, 0.5], 'archery target; archer stands o.range in front', (o, w, d) => {
    const tg = (s, t, q, a, b) => { const dd = Math.hypot(a - 0.5, b - 0.5) * 2; return dd < 0.16 ? 0xe8c040 : dd < 0.4 ? 0xc8372f : dd < 0.62 ? 0x4a70c0 : dd < 0.82 ? 0x2a2630 : dd < 0.94 ? 0xf0e8d8 : 0xb89438; };
    for (const x of [0.12, w - 0.12]) { bar([x, 0.3, 0], [x, 0.14, 1.0], 0.06, flat(WOOD_D), { noShadow: false }); bar([x, 0.0, 0], [x, 0.14, 1.0], 0.05, flat(mul(WOOD_D, 0.8))); }
    hcyl(w / 2, 0.14, 0.62, 0.4, 0.18, 14, strawV, { cap: tg });
    for (const p of [[0.06, 0.08], [-0.14, -0.1], [0.2, -0.16]]) { bar([w / 2 + p[0], 0.32, 0.62 + p[1]], [w / 2 + p[0] + 0.02, 0.58, 0.66 + p[1]], 0.025, flat(0xc9a66c)); spr(w / 2 + p[0] + 0.02, 0.58, 0.63 + p[1], 3, 3, (X, Y) => (X === 1 ? 0xc8372f : Y === 1 ? 0xf0e8d8 : -1)); }
    poi(w / 2, d + (o.range || 4), 'train', 0, -1);
  });
  // [corner] sparring ring o.w (3.2) x o.d (3.2): posts and ropes around a sanded floor; the entrance gap is in the middle of the front
  def('sparRing', 'R', o => [o.w || 3.2, o.d || 3.2], 'roped sparring ring with two fighters\' spots (o.w, o.d)', (o, w, d) => {
    quad([0.1, 0.1, 0.012], [w - 0.2, 0, 0], [0, d - 0.2, 0], (s, t, q, a, b) => { const X = Math.floor(s * U), Y = Math.floor(t * U), e = Math.min(a, b, 1 - a, 1 - b) * Math.min(q.ul, q.vl) * U; if (e < 4 && h2(X, Y) < 0.6 - e * 0.1) return -1; const n = T.fbm(X * 0.08, Y * 0.08); return mul(0xd0b88a, 0.88 + n * 0.2 + (h2(X, Y) < 0.06 ? -0.12 : 0)); }, { n: [0, 0, 1], noShadow: true });
    const rope = (p0, p1) => { for (const z of [0.42, 0.74]) { const n = 4; for (let i = 0; i < n; i++) { const a = i / n, b = (i + 1) / n, sg = t => -0.06 * 4 * t * (1 - t); bar([p0[0] + (p1[0] - p0[0]) * a, p0[1] + (p1[1] - p0[1]) * a, z + sg(a)], [p0[0] + (p1[0] - p0[0]) * b, p0[1] + (p1[1] - p0[1]) * b, z + sg(b)], 0.03, s => (Math.floor(s * 20) % 3 === 0 ? 0xa8946a : 0xd8c8a0)); } } };
    const g0 = w / 2 - 0.5, g1 = w / 2 + 0.5, P = [[0.06, 0.06], [w - 0.06, 0.06], [w - 0.06, d - 0.06], [g1, d - 0.06], [g0, d - 0.06], [0.06, d - 0.06]];
    for (let i = 0; i < 6; i++) { const p = P[i]; box(p[0] - 0.06, p[1] - 0.06, 0, 0.12, 0.12, 0.86, { side: sh(i === 3 || i === 4 ? WOOD : 0x8a2a2a), top: flat(0xd9a83a) }); if (i !== 3) rope(p, P[(i + 1) % 6]); }
    block(0, 0, w, 0.12); block(0, 0, 0.12, d); block(w - 0.12, 0, 0.12, d); block(0, d - 0.12, g0, 0.12); block(g1, d - 0.12, w - g1, 0.12);
    poi(w / 2 - 0.45, d / 2 - 0.1, 'train', 1, 0.2); poi(w / 2 + 0.45, d / 2 + 0.1, 'train', -1, -0.2); poi(-0.4, d / 2, 'guard', 1, 0);
  });
  // [corner] weights 0.9 x 0.45: lifting stones and a bar
  def('weights', 'r', [0.9, 0.45], 'lifting stones and a weighted bar', (o, w, d) => {
    const st = (dx, dy, ix, iy) => mul(0x8a867c, (dx * 0.6 - dy * 0.5 < -0.3 ? 1.2 : dx > 0.4 ? 0.75 : 1) * (0.92 + h2(ix >> 1, iy >> 1) * 0.14));
    box(0, 0.04, 0, w, 0.36, 0.06, { side: sh(WOOD_D), top: wt(WOOD) });
    for (const x of [0.14, 0.4]) { blob(x, 0.16, 0.17, 0.12, st); spr(x, 0.16, 0.27, 5, 4, (X, Y) => (Y === 3 && X > 0 && X < 4) || ((X === 0 || X === 4) && Y < 3) ? IRON_L : -1); }
    hcyl(0.36, 0.5, 0.16, 0.03, 0.4, 5, flat(WOOD_L), { ax: 'x', noShadow: true }); for (const x of [0.5, 0.82]) hcyl(0.36, x, 0.16, 0.1, 0.07, 8, st.bind ? ((s, t) => mul(0x8a867c, 0.9 + h2(Math.floor(s * U), Math.floor(t * U)) * 0.2)) : 0, { ax: 'x', cap: flat(0x9a968c) });
    poi(w / 2, d + 0.3, 'train', 0, -1);
  });
  // [corner] hay bale 0.8 x 0.5 (o.n = 2 or 3 stacks more)
  def('hayBale', 'r', o => [0.8, (o.n || 1) > 1 ? 1.0 : 0.5], 'hay bale(s) (o.n 1..3)', (o, w, d) => {
    const bale = (x, y, z, rot) => { const bw = rot ? 0.46 : 0.78, bd = rot ? 0.78 : 0.46, tw = (s, t, q) => { const X = Math.floor(s * U), Wt = Math.round(q.ul * U); return (Wt > 20 && (X === 6 || X === Wt - 7)) ? 0x8a6a3a : strawV(s, t); }; box(x, y, z, bw, bd, 0.4, { side: tw, top: (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * U), k = rot ? Y : X, m = Math.round((rot ? q.vl : q.ul) * U); return k === 6 || k === m - 7 ? 0x8a6a3a : strawT(s, t); } }); };
    const n = o.n || 1; bale(0.01, 0.02, 0); if (n > 1) bale(0.01, 0.52, 0); if (n > 2) bale(0.16, 0.12, 0.4, true);
    for (let i = 0; i < 8; i++) bar([h2(i, 1) * w, d + h2(i, 2) * 0.12 - 0.04, 0.02], [h2(i, 1) * w + (h2(i, 3) - 0.5) * 0.24, d + h2(i, 2) * 0.12 + 0.06, 0.02], 0.03, flat(i & 1 ? 0xe8cc70 : 0xb89438));
  });
  // [corner] horse-stall partition o.len (2.2) long (along x) x 0.14, with a tall end post at the +x end
  def('stallPartition', 'r', o => [o.len || 2.2, 0.14], 'stable stall partition (o.len, o.h)', (o, w, d) => {
    const h = o.h || 1.0, c = 0x7a5636;
    box(0, 0.03, 0, w - 0.14, 0.08, h, { side: wd(c), top: sh(mul(c, 1.25)) }); nb(0, 0.01, h - 0.1, w - 0.14, 0.12, 0.08, sh(mul(c, 0.8)), sh(mul(c, 1.1))); nb(0, 0.01, 0.08, w - 0.14, 0.12, 0.07, sh(mul(c, 0.7)));
    box(w - 0.14, 0, 0, 0.14, 0.14, h + 0.45, { side: sh(mul(c, 0.8)) }); blob(w - 0.07, 0.07, h + 0.5, 0.085, bl(mul(c, 1.1)), { noShadow: true });
    spr(w - 0.07, 0.145, h * 0.75, 3, 4, (X, Y) => (X === 1 && Y > 0 && Y < 3 ? -1 : IRON_L));
  });
  const COAT = { bay: [0x8a5a36, 0x2a2024], chestnut: [0xa8683a, 0x7a4426], black: [0x38343a, 0x1e1c22], grey: [0xa8a8a6, 0xd8d8d4], white: [0xe4e0d8, 0xf4f0e8], dun: [0xc8a468, 0x3a2c24] };
  // [centre] standing horse, nose toward the front.  o.coat 'bay' | 'chestnut' | 'black' | 'grey' | 'white' | 'dun', o.saddle colour.  footprint 0.5 x 1.4
  def('horse', 'C', [0.5, 1.4], 'standing horse (o.coat: bay chestnut black grey white dun, o.saddle, o.blaze)', (o) => {
    const ct = COAT[o.coat || 'bay'] || COAT.bay, c = ct[0], mn = ct[1], b = (dx, dy, ix, iy) => mul(c, 0.95 + h2(ix >> 1, iy >> 1) * 0.08), ns = { noShadow: true };
    block(-0.22, -0.62, 0.44, 1.3);
    for (const p of [[-0.11, -0.4], [0.11, -0.4], [-0.11, 0.3], [0.11, 0.3]]) { nb(p[0] - 0.04, p[1] - 0.04, 0, 0.08, 0.08, 0.28, flat(mul(c, 0.6)), flat(c)); nb(p[0] - 0.045, p[1] - 0.045, 0, 0.09, 0.09, 0.05, flat(0x2a2228)); nb(p[0] - 0.055, p[1] - 0.055, 0.26, 0.11, 0.11, 0.3, sh(mul(c, 0.82), 0.06)); }
    blob(0, -0.38, 0.68, 0.225, b); blob(0, -0.12, 0.66, 0.22, b); blob(0, 0.14, 0.66, 0.215, b, ns); blob(0, 0.32, 0.7, 0.21, b);
    blob(0, 0.42, 0.84, 0.16, b, ns); blob(0, 0.48, 0.95, 0.14, b, ns); blob(0, 0.53, 1.05, 0.125, b, ns);
    blob(0, 0.62, 1.1, 0.115, (dx, dy, ix, iy) => (o.blaze && Math.abs(dx - 0.1) < 0.2 && dy < 0.4 ? 0xf0e8d8 : b(dx, dy, ix, iy)), ns);
    blob(0, 0.72, 1.04, 0.095, (dx, dy, ix, iy) => (o.blaze && Math.abs(dx - 0.1) < 0.2 ? 0xf0e8d8 : b(dx, dy, ix, iy)), ns);
    blob(0, 0.8, 0.97, 0.075, (dx, dy, ix, iy) => (dy > 0.1 ? mul(c, 0.5) : b(dx, dy, ix, iy)), ns);
    for (const sx of [-0.06, 0.06]) { spr(sx, 0.57, 1.2, 3, 5, (X, Y) => (Y > 2 && X !== 1 ? -1 : mul(c, X === 1 ? 0.7 : 0.9))); spr(sx * 1.5, 0.7, 1.1, 2, 2, (X, Y) => (X + Y === 1 ? 0x1a1620 : 0x3a2c2a), { bias: 0.3 }); }
    for (let i = 0; i < 5; i++) blob(0, 0.33 + i * 0.05, 0.96 + i * 0.055, 0.06, bl(mn), ns); blob(0, 0.6, 1.2, 0.045, bl(mn), ns);
    blob(0, -0.58, 0.72, 0.065, bl(mn), ns); blob(0, -0.63, 0.58, 0.07, bl(mn), ns); blob(0, -0.64, 0.43, 0.06, bl(mn), ns); blob(0, -0.63, 0.3, 0.045, bl(mn), ns);
    if (o.saddle) { blob(0, -0.02, 0.79, 0.175, bl(o.saddle), ns); blob(0, -0.02, 0.89, 0.105, bl(0x6a4226), ns); nb(-0.225, -0.14, 0.54, 0.02, 0.24, 0.24, cloth(o.saddle, 4)); nb(0.205, -0.14, 0.54, 0.02, 0.24, 0.24, cloth(o.saddle, 4)); }
    poi(0.5, 0.2, 'stable', -1, 0);
  });
  // [corner] saddle rack 0.8 x 0.45: a saddle and bridle on a trestle
  def('saddleRack', 'r', [0.8, 0.45], 'saddle on a trestle (o.c blanket)', (o, w, d) => {
    for (const x of [0.1, w - 0.1]) { bar([x, 0.04, 0], [x, 0.22, 0.62], 0.055, flat(WOOD_D), { noShadow: false }); bar([x, 0.41, 0], [x, 0.22, 0.62], 0.055, flat(mul(WOOD_D, 0.85))); }
    hcyl(0.22, 0.04, 0.62, 0.06, w - 0.08, 6, flat(WOOD), { ax: 'x', cap: flat(WOOD_L) });
    box(0.22, 0.05, 0.4, 0.36, 0.35, 0.3, { side: cloth(o.c || 0x8a2a2a, 4), top: cushion(o.c || 0x8a2a2a), noShadow: true });
    blob(0.4, 0.225, 0.72, 0.15, bl(0x6a4226), {}); blob(0.3, 0.225, 0.8, 0.07, bl(0x7a5230), { noShadow: true }); blob(0.52, 0.225, 0.79, 0.06, bl(0x7a5230), { noShadow: true });
    bar([0.4, 0.4, 0.62], [0.4, 0.42, 0.3], 0.02, flat(0x3a2c24)); cyl(0.4, 0.42, 0.24, 0.045, 0.05, 6, flat(IRON_L), { noShadow: true });
    bar([0.68, 0.24, 0.66], [0.7, 0.3, 0.34], 0.025, flat(0x4a3626)); bar([0.74, 0.24, 0.66], [0.72, 0.3, 0.34], 0.025, flat(0x4a3626));
    poi(w / 2, d + 0.3, 'stable', 0, -1);
  });
  // [corner] water trough 1.3 x 0.5
  def('trough', 'r', o => [o.len || 1.3, 0.5], 'wooden water trough (o.len, o.feed)', (o, w, d) => {
    const c = 0x7a5636;
    for (const x of [0.1, w - 0.2]) box(x, 0.04, 0, 0.1, d - 0.08, 0.14, { side: sh(mul(c, 0.7)), noTop: true });
    box(0, 0, 0.14, w, d, 0.26, { side: wh(c), top: (s, t, q, a, b) => { const e = Math.min(a * q.ul, (1 - a) * q.ul, b * q.vl, (1 - b) * q.vl); return e < 0.06 ? mul(c, 1.2) : e < 0.08 ? mul(c, 0.5) : o.feed ? strawT(s, t) : waterTex(0x3a7a94, 4)(s, t); } });
    poi(w / 2, d + 0.3, 'stable', 0, -1);
  });
  // [corner] complete horse stall o.w (1.7) x o.d (2.4): partitions on both sides, manger at the back, straw, a horse unless o.horse === false
  def('horseStall', 'R', o => [o.w || 1.7, o.d || 2.4], 'complete stall: partitions, manger, straw and horse (o.w, o.d, o.horse, o.coat)', (o, w, d) => {
    quad([0.1, 0.05, 0.012], [w - 0.2, 0, 0], [0, d - 0.1, 0], (s, t, q, a, b) => { const X = Math.floor(s * U), Y = Math.floor(t * U); return h2(X >> 1, Y) < 0.3 + Math.min(a, 1 - a, b, 1 - b) * 3 ? strawT(s, t) : -1; }, { n: [0, 0, 1], noShadow: true });
    Fz.stallPartition(0, 0, 0, { face: 'x', len: d }); Fz.stallPartition(w - 0.14, 0, 0, { face: 'x', len: d });
    box(0.14, 0, 0.4, w - 0.28, 0.36, 0.26, { side: wh(0x7a5636), top: strawT }); block(0.14, 0, w - 0.28, 0.36); for (const x of [0.2, w - 0.3]) nb(x, 0.1, 0, 0.1, 0.16, 0.4, flat(WOOD_D));
    cyl(w - 0.36, 0.56, 0, 0.12, 0.2, 8, tubT(0x7a5636), { top: waterTex(0x3a7a94, 2) });
    if (o.horse !== false) Fz.horse(w / 2 - 0.08, d * 0.5, 0, { face: '-y', coat: o.coat });
    poi(w / 2, d + 0.3, 'stable', 0, -1);
  });

  /* ================================================================================================
   *  CHAPEL, MUSIC & GAMES
   * ================================================================================================ */
  // [corner] altar 1.5 x 0.7 with cloth, cross and candles (lit)
  def('altar', 'r', [1.5, 0.7], 'altar with cloth, cross and candles (o.c cloth colour)', (o, w, d) => {
    const c = o.c || 0xf0e8d8, c2 = o.c2 || GOLD, front = (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * V), Wt = Math.round(q.ul * U), Ht = Math.round(q.vl * V), dx = Math.abs(X - Wt / 2 + 0.5), dy = Y - Ht * 0.55; if (Y < 3) { return X % 3 === 0 ? -1 : c2; } if (Y < 5 || Y >= Ht - 2) return c2; if ((dx < 1.5 && Math.abs(dy) < 8) || (dx < 5 && Math.abs(dy - 2) < 1.5)) return c2; if (Math.abs(dx - Wt * 0.36) < 1) return mul(o.c3 || RED, 1); return mul(c, [0.9, 1.02, 0.97][X % 3]); };
    box(0.06, 0.06, 0, w - 0.12, d - 0.12, 0.6, { side: stn(0xa8a092), noTop: true });
    box(0, 0, 0.6, w, d, 0.06, { side: sh(c, 0.04), top: (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * U), Wt = Math.round(q.ul * U), Ht = Math.round(q.vl * U), e = Math.min(X, Y, Wt - 1 - X, Ht - 1 - Y); return e === 1 || e === 2 ? c2 : mul(c, 0.97 + h2(X >> 1, Y >> 1) * 0.05); } });
    quad([0, d + 0.012, 0.14], [w, 0, 0], [0, 0, 0.52], front, { cut: true, noShadow: true, n: [0, 1, 0] }); quad([w + 0.012, 0, 0.3], [0, d, 0], [0, 0, 0.36], cloth(c, 3), { noShadow: true, n: [1, 0, 0] }); quad([-0.012, 0, 0.3], [0, d, 0], [0, 0, 0.36], cloth(c, 3), { noShadow: true, n: [-1, 0, 0] });
    nb(w / 2 - 0.09, 0.14, 0.66, 0.18, 0.12, 0.05, gold); nb(w / 2 - 0.025, 0.175, 0.71, 0.05, 0.05, 0.42, gold); nb(w / 2 - 0.13, 0.175, 0.98, 0.26, 0.05, 0.05, gold);
    for (const x of [0.2, w - 0.2]) { cyl(x, 0.24, 0.66, 0.05, 0.03, 6, gold, { noShadow: true }); bar([x, 0.24, 0.69], [x, 0.24, 0.86], 0.03, gold); candle(x, 0.24, 0.86, 7); }
    icon(w * 0.3, 0.46, 0.66, A_GOBLET); book(w * 0.6, 0.4, 0.66, 0x6a2030, 0.2, 0.15);
    light(w / 2, d * 0.8, 1.2, 4, [1, 0.8, 0.5], 0.7);
    poi(w / 2, d + 0.5, 'pray', 0, -1); poi(w / 2, -0.3, 'work', 0, 1);
  });
  // [corner] pew o.len (1.8) x 0.6; worshippers face the front
  def('pew', 'r', o => [o.len || 1.8, 0.6], 'chapel pew (o.len, o.c)', (o, w, d) => {
    const c = o.c || 0x6a4a34, end = (s, t, q, a, b) => { const X = Math.floor(s * U), Y = Math.floor(t * V), Ht = Math.round(q.vl * V), Wt = Math.round(q.ul * U); if (Y > Ht - 7 && (X < (Y - Ht + 7) * 0.9 )) return -1; if (Y > Ht - 12 && Y < Ht - 6 && Math.abs(X - 5) < 2 && Math.abs(Y - Ht + 9) < 2) return mul(c, 0.6); return mul(c, (X === 0 || X === Wt - 1 ? 0.75 : 1) * (0.94 + h2(X >> 1, Y >> 2) * 0.12)); };
    box(0.05, 0, 0, w - 0.1, 0.07, 0.8, { side: wd(mul(c, 1.05)), top: sh(mul(c, 1.3)) });
    box(0.05, 0.07, 0.24, w - 0.1, 0.34, 0.06, { side: sh(c), top: wt(mul(c, 1.25)) }); nb(0.08, 0.34, 0, w - 0.16, 0.05, 0.24, sh(mul(c, 0.7)));
    for (const x of [0, w - 0.06]) box(x, 0, 0, 0.06, 0.46, 0.9, { side: sh(mul(c, 0.9)), tx: end, bx: end, cut: true, noTop: true });
    nb(0.06, d - 0.1, 0, w - 0.12, 0.1, 0.07, sh(mul(c, 0.8)), cushion(0x7a2030));
    const n = Math.max(1, Math.floor(w / 0.55)); for (let i = 0; i < n; i++) { const x = w * (i + 0.5) / n; poi(x, 0.24, 'pray', 0, 1, 0.3, [x, d + 0.3]); }
  });
  // [centre] stone font
  def('font', 'c', [0.8, 0.8], 'stone baptismal font', (o) => {
    const c = o.c || 0xb8b0a2, s = stn(c);
    cyl(0, 0, 0, 0.32, 0.08, 8, stn(mul(c, 0.88)), { top: s }); cyl(0, 0, 0.08, 0.14, 0.36, 8, s, {}); frust(0, 0, 0.44, 0.16, 0.36, 0.22, 8, (sx, t, q) => { const X = Math.floor(sx * U), Y = Math.floor(t * V); return Y > 5 && X % 6 < 3 && Y < 8 ? mul(c, 0.75) : s(sx, t, q); }, {});
    cyl(0, 0, 0.66, 0.36, 0.06, 8, s, { top: stn(mul(c, 1.1)), inner: 0.8 }); disk(0, 0, 0.7, 0.29, waterTex(0x5a9ab4, 1));
    poi(0, 0.7, 'pray', 0, -1);
  });
  // [corner] organ 1.6 x 1.2 with its bench (player sits at the front, facing the pipes)
  def('organ', 'r', [1.6, 1.2], 'pipe organ with bench (o.c)', (o, w, d) => {
    const c = o.c || WALNUT, cv = PX(w * U - 8, 52, mul(c, 0.3)), W = cv.W, n = Math.floor((W - 2) / 4);
    for (let i = 0; i < n; i++) { const k = Math.abs(i - (n - 1) / 2) / ((n - 1) / 2), ph = Math.round(48 - (1 - k) * 22 * (i % 2 ? 0.9 : 1)), x = 2 + i * 4; if (i === Math.floor(n / 4) || i === Math.floor(3 * n / 4)) { cv.r(x, 0, x + 2, 50, 0xe8d48a).r(x, 0, x, 50, 0xfff0b0); cv.r(x, 6, x + 2, 7, 0x3a2c1a); continue; } cv.r(x, 0, x + 2, ph, 0xb4b8c4).r(x, 0, x, ph, 0xe4e8ee).r(x + 2, 0, x + 2, ph, 0x7c8290); cv.r(x, 5, x + 2, 6, 0x2a2a34); cv.p(x + 1, ph + 1, 0xb4b8c4); }
    box(0, 0, 0, w, 0.5, 0.8, { side: wd(c), ty: doorsT(mul(c, 1.1)), noTop: true });
    box(0, 0, 0.8, w, 0.4, 1.5, { side: wd(mul(c, 0.9)), noTop: true }); vart(cv, 4 / U, 0.405, 0.9, { n: [0, 1, 0] });
    box(-0.05, -0.02, 2.3, w + 0.1, 0.46, 0.1, { side: sh(mul(c, 1.25)), top: sh(mul(c, 0.9)) }); for (const x of [0, w - 0.1]) nb(x, 0.4, 0.8, 0.1, 0.03, 1.5, sh(mul(c, 1.2)));
    box(0.2, 0.5, 0.62, w - 0.4, 0.2, 0.06, { side: sh(c), top: (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * U); return Y < 2 ? mul(c, 1.2) : (X % 3 === 0 ? 0x8a8478 : (X % 6 === 4 && Y < 5) ? 0x1a1620 : 0xf0ece0); } });
    Fz.bench(0.4, 0.84, 0, { len: w - 0.8, face: '-y', kind: 'play', behind: true, c: mul(c, 1.2) });
    icon(0.12, 0.44, 0.8, A_STICK); icon(w - 0.12, 0.44, 0.8, A_STICK); light(w / 2, 0.8, 1.2, 3, [1, 0.8, 0.5], 0.5);
  });
  // [centre] harp, with the player's stool beside it
  def('harp', 'c', [0.9, 0.6], 'standing harp with stool', (o) => {
    const cv = PX(20, 46), G = o.c || GOLD, D = mul(G, 0.7);
    for (let y = 0; y < 44; y++) { cv.r(1, y, 2, y, y % 6 === 0 ? GOLD_L : G); }                                            // pillar
    for (let i = 0; i <= 16; i++) { const x = 2 + i, y = 42 - Math.round(Math.sin(i / 16 * 3.14) * 4 - i * 0.3); cv.r(x, y, x, y + 2, i % 4 === 0 ? GOLD_L : G); }      // neck
    for (let i = 0; i <= 17; i++) { const x = 2 + i, y = Math.round(i * 2.1); cv.r(x, y, x + 1, y + 3, D); }                                                           // sound board
    for (let i = 3; i < 17; i += 2) { const y1 = 42 - Math.round(Math.sin((i - 2) / 16 * 3.14) * 4 - (i - 2) * 0.3) - 1, y0 = Math.round((i - 2) * 2.1) + 4; if (y1 > y0) cv.r(i, y0, i, y1, i % 3 === 0 ? 0xc8372f : 0xe8e2d4); }
    cv.r(0, 0, 6, 2, D); nb(-0.26, -0.08, 0, 0.3, 0.16, 0.06, sh(D));
    vart(cv, -0.24, 0, 0.06, { noShadow: false });
    Fz.stool(0.22, 0.12, 0, { kind: 'play', look: [-1, 0], c: WALNUT });
  });
  const P_LUTE = ['......nn', '.....nNn', '....nN..', '...nN...', '..tTN...', '.tttT...', 'ttkttT..', 'ttkktT..', 'tttttT..', '.tttT...', '..TT....'];
  // [centre] lute on a little stand
  def('lute', 'c', [0.36, 0.36], 'lute on a stand', (o) => {
    nb(-0.14, -0.1, 0, 0.28, 0.2, 0.05, sh(WOOD_D)); bar([-0.02, -0.06, 0.05], [-0.02, -0.06, 0.5], 0.04, flat(WOOD_D)); nb(-0.1, -0.08, 0.2, 0.18, 0.05, 0.03, flat(WOOD));
    const a = art(P_LUTE.map(r => r + r.replace(/./g, '.')).slice(0)), b2 = PX(16, 22); for (let y = 0; y < 11; y++) for (let x = 0; x < 8; x++) { const v = a.a[y * 16 + x]; if (v >= 0) for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) b2.p(x * 2 + i, y * 2 + j, v); } b2.line(5, 6, 14, 20, 0xe8e2d4);
    spr(0, 0, 0.06, 16, 22, b2.fn);
  });
  // [centre] big drum on a stand with sticks
  def('drum', 'c', [0.6, 0.6], 'drum on a stand', (o) => {
    const c = o.c || 0x8a2a2a;
    for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.5; bar([Math.cos(a) * 0.24, Math.sin(a) * 0.24, 0], [Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0.3], 0.045, flat(WOOD_D)); }
    cyl(0, 0, 0.26, 0.25, 0.3, 12, (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * V), Ht = Math.round(q.vl * V); if (Y < 2 || Y >= Ht - 2) return Y === 0 || Y === Ht - 1 ? 0x8a6a2a : GOLD; const m = (X + (Y & 8 ? 0 : 4)) % 8, zz = Math.abs(m - 4) - (Y % 8) * 0.5; return Math.abs(zz) < 0.6 ? 0xe8dcc0 : mul(c, 0.94 + h2(X >> 1, Y >> 1) * 0.1); }, { top: (s, t, q, a, b) => mul(0xe8dcc0, 1 - Math.hypot(a - 0.5, b - 0.5) * 0.3) });
    bar([-0.12, 0.02, 0.575], [0.1, -0.06, 0.575], 0.03, flat(WOOD_L)); bar([-0.06, 0.1, 0.58], [0.14, 0.06, 0.58], 0.03, flat(WOOD_L)); spr(0.1, -0.06, 0.56, 3, 3, () => 0xf0e8d8);
    poi(0, 0.6, 'play', 0, -1);
  });
  // [wall] dart board at o.h (1.4); the thrower's spot is o.range (2.2) in front
  def('dartBoard', 'w', [0.6, 0.1], 'dart board on the wall; player stands o.range in front', (o) => {
    const h = o.h || 1.4, cv = PX(19, 23);
    cv.disc(9, 11, 9.4, WOOD_D); for (let y = 0; y < 23; y++) for (let x = 0; x < 19; x++) { const dd = Math.hypot(x - 9, y - 11), an = Math.floor((Math.atan2(y - 11, x - 9) + 3.2) * 10 / 6.4); if (dd < 8.2) cv.p(x, y, dd < 1.2 ? 0xc8372f : dd < 2.4 ? 0x3f7a46 : (Math.abs(dd - 5) < 0.7 || dd > 7.4) ? (an & 1 ? 0xc8372f : 0x3f7a46) : (an & 1 ? 0x2a2630 : 0xe8dcc0)); }
    vart(cv, -19 / 64, 0.03, h - 11 / V, { n: [0, 1, 0] });
    for (const p of [[0.03, 0.02], [-0.1, 0.08], [0.12, -0.07]]) { bar([p[0], 0.03, h + p[1]], [p[0] + 0.01, 0.13, h + p[1] + 0.02], 0.02, flat(0xc9a66c)); spr(p[0] + 0.01, 0.14, h + p[1], 3, 3, (X, Y) => (X === 1 || Y === 1 ? 0xe8c040 : -1)); }
    poi(0, o.range || 2.2, 'play', 0, -1);
  });
  // [centre] quoits: a peg board on the floor with rope rings; the thrower's spot is o.range (2.2) in front.  not solid
  def('quoits', 'C', [0.7, 0.7], 'quoits peg and rings on the floor, not solid (o.range)', (o) => {
    box(-0.3, -0.3, 0, 0.6, 0.6, 0.04, { side: sh(WOOD_D), top: wt(0x8a6a44), noShadow: true }); bar([0, 0, 0.04], [0, 0, 0.3], 0.04, flat(WOOD_L)); blob(0, 0, 0.32, 0.03, bl(0xc8372f), { noShadow: true });
    const ring = (x, y, z, cc) => disk(x, y, z, 0.09, (s, t, q, a, b) => (Math.floor(Math.atan2(b - 0.5, a - 0.5) * 3) & 1 ? cc : mul(cc, 0.8)), { inner: 0.62, f: E.F_NOAO });
    ring(0, 0, 0.055, 0xd8c8a0); ring(0.01, 0.01, 0.07, 0xc8372f); ring(0.2, 0.16, 0.052, 0xd8c8a0); ring(-0.38, 0.3, 0.014, 0x4a70c0); ring(0.3, 0.42, 0.014, 0xd8c8a0);
    poi(0, o.range || 2.2, 'play', 0, -1);
  });
  // [corner] skittles lane 0.9 wide, o.len (3.2) long: nine pins at the back, bowler at the front end.  only the pins block
  def('skittles', 'R', o => [0.9, o.len || 3.2], 'skittle alley: nine pins, ball and lane (o.len)', (o, w, d) => {
    quad([0.08, 0, 0.012], [w - 0.16, 0, 0], [0, d, 0], (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * U), Wt = Math.round(q.ul * U); return X === 0 || X === Wt - 1 ? 0x5a4030 : mul(0xb0905e, (X % 6 === 0 ? 0.78 : 1) + h2(X / 6 | 0, Y >> 4) * 0.08); }, { n: [0, 0, 1], noShadow: true });
    for (const x of [0, w - 0.08]) nb(x, 0, 0, 0.08, d * 0.45, 0.1, sh(WOOD_D)); nb(0, -0.06, 0, w, 0.08, 0.22, sh(WOOD_D));
    const pin = (X, Y) => { const hw = Y < 2 ? 1 : Y < 6 ? 1.6 : Y < 8 ? 0.7 : Y < 10 ? 1.1 : 0.4; if (Math.abs(X - 1.5) > hw) return -1; return Y === 7 ? 0xc8372f : X < 1 ? 0xfff8e8 : X > 2 ? 0xc8c0aa : 0xf0e8d8; };
    for (let r = 0; r < 3; r++) for (let i = 0; i < 3; i++) spr(w / 2 + (i - 1) * 0.16 + (r - 1) * 0.0, 0.22 + r * 0.17 + (i === 1 ? 0.08 : 0), 0.012, 4, 11, pin, { noShadow: false });
    blob(w / 2 + 0.1, d - 0.5, 0.075, 0.075, bl(0x5a3a26, 0.14)); blob(w - 0.16, d - 0.2, 0.075, 0.075, bl(0x6a4a30, 0.14));
    block(0, 0, w, 0.75);
    poi(w / 2, d + 0.2, 'play', 0, -1);
  });

  /* ================================================================================================
   *  GARDEN & COURTYARD
   * ================================================================================================ */
  const ROSES = T.pal(['#d8414f', '#c93a66', '#e8698a', '#f2b8c6', '#b8243a']);
  // [corner] clipped hedge o.len (2) long (along x) x o.w (0.5), o.h (0.8) high.  o.flowers adds blossom
  def('hedge', 'r', o => [o.len || 2, o.w || 0.5], 'clipped hedge segment (o.len, o.w, o.h, o.flowers, o.pal)', (o, w, d) => {
    const h = o.h || 0.8, pal = o.pal || T.LEAF_D, fl = o.flowers ? (o.flowers === true ? T.BLOSSOM : o.flowers) : null, seed = o.seed || 0;
    box(0, 0, 0, w, d, h, { side: leafQ(pal, fl, 0.07, seed), top: (s, t) => { const X = Math.floor(s * U) + seed * 5, Y = Math.floor(t * U), r = h2((X + (Y >> 1)) >> 1, Y >> 1); if (fl && h2(X / 3 | 0, (Y / 3 | 0) + 5) < 0.06) return fl[(r * fl.length) | 0]; return mul(T.LEAF_G[(r * 5) | 0], (X + Y) % 7 === 0 ? 0.82 : 0.96); } });
    for (let i = 0; i < w * 3; i++) blob(h2(i, seed + 3) * w, h2(i, seed + 5) > 0.5 ? d - 0.02 : 0.02, 0.04, 0.05, T.leaves(pal, null, 0), { noShadow: true });
  });
  // [centre] topiary.  o.kind 'cone' | 'ball' | 'spiral' | 'tiers'; o.pot === false plants it in the ground
  def('topiary', 'c', [0.6, 0.6], 'topiary (o.kind: cone ball spiral tiers, o.pot)', (o) => {
    const k = o.kind || 'cone', L = T.leaves(T.LEAF_D, null, 0), L2 = T.leaves(T.LEAF_G, null, 0), pot = o.pot !== false;
    let z = 0;
    if (pot) { frust(0, 0, 0, 0.17, 0.23, 0.26, 8, sh(mul(o.potc || CLAY, 0.9), 0.06), {}); cyl(0, 0, 0.26, 0.245, 0.05, 8, sh(o.potc || CLAY, 0.05), { top: T.dirt, noShadow: true }); z = 0.3; }
    if (k === 'cone') { frust(0, 0, z + 0.06, 0.27, 0, 1.15, 8, leafQ(T.LEAF_D, null, 0, 3), {}); bar([0, 0, z], [0, 0, z + 0.1], 0.06, flat(0x6b4a36)); }
    else if (k === 'ball') { bar([0, 0, z], [0, 0, z + 0.5], 0.06, flat(0x6b4a36), { noShadow: false }); blob(0, 0, z + 0.72, 0.3, L); blob(0.03, 0.03, z + 0.78, 0.26, L2, { noShadow: true }); }
    else if (k === 'tiers') { bar([0, 0, z], [0, 0, z + 1.2], 0.06, flat(0x6b4a36), { noShadow: false }); blob(0, 0, z + 0.36, 0.27, L); blob(0, 0, z + 0.78, 0.21, L2); blob(0, 0, z + 1.12, 0.15, L); }
    else { bar([0, 0, z], [0, 0, z + 1.2], 0.05, flat(0x6b4a36)); for (let i = 0; i < 11; i++) { const a = i * 1.15, r = 0.17 * (1 - i / 14), zz = z + 0.16 + i * 0.105; blob(Math.cos(a) * r, Math.sin(a) * r, zz, 0.2 - i * 0.011, i & 1 ? L : L2, { noShadow: i > 0 }); } }
  });
  const FPAL = { mixed: [0xd8414f, 0xe8698a, 0xe9c64c, 0xf4efe0, 0xa56be0, 0xf0983a], roses: [0xd8414f, 0xc93a66, 0xe8698a, 0xb8243a, 0xf2b8c6], tulips: [0xe03a3a, 0xf0c838, 0xf08a2a, 0xf4efe0, 0xe8698a], lavender: [0x8a6ad0, 0xa58ae0, 0x7a5ac0], white: [0xf4efe0, 0xe8e0c8, 0xf6e7a0], herbs: null };
  const kerbT = (kind) => kind === 'brick' ? (s, t) => { const X = Math.floor(s * U), Y = Math.floor(t * V); return X % 7 === 0 || Y === 0 ? 0x6e5a4c : mul(0xa8644a, 0.88 + h2(X / 7 | 0, 3) * 0.24); } : kind === 'wood' ? wh(WOOD) : (s, t) => { const X = Math.floor(s * U), Y = Math.floor(t * V); return X % 9 === 0 ? 0x6a665e : mul(0xb0a898, (Y >= 3 ? 1.1 : 0.9) + h2(X / 9 | 0, 5) * 0.14); };
  const soilT = (s, t) => { const X = Math.floor(s * U), Y = Math.floor(t * U); return mul(0x5a4434, 0.85 + T.fbm(X * 0.2, Y * 0.2) * 0.35 + (h2(X, Y) < 0.06 ? 0.2 : 0)); };
  // [corner] flowerbed o.w (2) x o.d (1) in a low kerb.  o.kind 'mixed' | 'roses' | 'tulips' | 'lavender' | 'white' | 'herbs', o.edge 'stone' | 'brick' | 'wood'
  def('flowerbed', 'r', o => [o.w || 2, o.d || 1], 'flowerbed, any size (o.w, o.d, o.kind: mixed roses tulips lavender white herbs, o.edge, o.seed)', (o, w, d) => {
    const seed = o.seed || 0, k = o.kind || 'mixed', fp = FPAL[k], tall = k === 'tulips' || k === 'lavender' ? 0.1 : 0;
    box(0, 0, 0, w, d, 0.1, { side: kerbT(o.edge || 'stone'), top: (s, t, q, a, b) => (Math.min(a * q.ul, (1 - a) * q.ul, b * q.vl, (1 - b) * q.vl) < 0.07 ? mul(o.edge === 'brick' ? 0xb8745a : o.edge === 'wood' ? WOOD_L : 0xc0b8a8, 0.95 + h2(Math.floor(s * U) >> 2, Math.floor(t * U) >> 2) * 0.1) : soilT(s, t)) });
    const nx = Math.max(1, Math.round((w - 0.2) / 0.27)), ny = Math.max(1, Math.round((d - 0.2) / 0.27));
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const r1 = h2(i + seed * 7, j + seed), r2 = h2(j + seed * 3, i + 11), x = 0.1 + (w - 0.2) * (i + 0.3 + r1 * 0.4) / nx, y = 0.1 + (d - 0.2) * (j + 0.3 + r2 * 0.4) / ny;
      blob(x, y, 0.16 + tall * 0.5, 0.1, T.leaves(k === 'herbs' ? (r1 < 0.5 ? T.LEAF_Y : T.LEAF_G) : (r1 < 0.5 ? T.LEAF_G : T.LEAF_D), null, 0), { noShadow: (i + j) % 3 > 0 });
      if (!fp) { if (r2 < 0.4) blob(x, y, 0.27, 0.07, T.leaves(r1 < 0.5 ? T.LEAF_G : T.LEAF_Y, null, 0), { noShadow: true }); continue; }
      const m = k === 'lavender' ? 3 : 2;
      for (let n = 0; n < m; n++) { const c = fp[(h2(i * 3 + n + seed, j * 5 + seed) * fp.length) | 0], fx = x + (h2(i + n, j + 7) - 0.5) * 0.14, fy = y + (h2(j + n, i + 9) - 0.5) * 0.14; blob(fx, fy, 0.25 + tall + h2(i + n, j) * 0.07, k === 'lavender' ? 0.04 : 0.055, (dx, dy, ix, iy) => ((ix + iy + n) % 4 === 0 ? (k === 'mixed' || k === 'white' ? 0xf6e7a0 : mul(c, 1.3)) : dy > 0.4 ? mul(c, 0.8) : c), { noShadow: true, f: E.F_NOAO }); }
    }
  });
  const latticeT = c => (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * V), Wt = Math.round(q.ul * U), Ht = Math.round(q.vl * V); if (X < 2 || X >= Wt - 2 || Y < 2 || Y >= Ht - 2) return mul(c, X === 0 || Y === Ht - 1 ? 1.2 : 0.9); return (X + Y) % 7 === 0 ? c : (X - Y + 700) % 7 === 0 ? mul(c, 0.8) : -1; };
  const roseL = () => T.leaves(T.LEAF_D, ROSES, 0.2);
  // [corner] rose arch o.w (1.7) wide x 0.5: walk through it along y.  only the two sides block
  def('roseArch', 'R', o => [o.w || 1.7, 0.5], 'rose arch over a path (o.w, o.h, o.c)', (o, w, d) => {
    const h = o.h || 1.75, c = o.c || 0xd8d0bc, lt = latticeT(c), fl = o.flowers || ROSES, L = () => T.leaves(T.LEAF_D, fl, 0.22);
    for (const x of [0, w - 0.1]) { box(x, 0, 0, 0.1, d, h, { side: lt, cut: true, noTop: true }); block(x - 0.05, 0, 0.2, d); for (let i = 0; i < 5; i++) blob(x + 0.05 + (h2(i, x * 9 | 0) - 0.5) * 0.14, 0.1 + h2(i, 3) * (d - 0.2), 0.2 + i * 0.32, 0.15 + h2(i, 5) * 0.05, L(), { noShadow: i % 2 > 0 }); }
    quad([0, 0, h], [w, 0, 0], [0, d, 0], (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * U); return (X + Y) % 7 === 0 || (X - Y + 700) % 7 === 0 ? c : -1; }, { n: [0, 0, 1], cut: true });
    for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI, x = w / 2 - Math.cos(a) * (w / 2 - 0.05), z = h - 0.1 + Math.sin(a) * 0.28; blob(x, d / 2 + (i & 1 ? 0.1 : -0.1), z, 0.19 + (i & 1) * 0.04, L(), { noShadow: i % 2 > 0 }); }
  });
  // [wall] trellis with climbing roses, o.w (1.2) wide, o.hh (1.8) tall
  def('trellis', 'w', o => [o.w || 1.2, 0.2], 'wall trellis with climbing roses (o.w, o.hh, o.flowers)', (o, w) => {
    const hh = o.hh || 1.8, fl = o.flowers || ROSES, seed = o.seed || 0;
    quad([-w / 2, 0.04, 0], [w, 0, 0], [0, 0, hh], latticeT(o.c || 0x8a6a44), { cut: true, n: [0, 1, 0], noShadow: true });
    let p = 0; for (let i = 0; i < hh * 9; i++) { const z = 0.1 + i / 9; p += (h2(seed + 3, i) - 0.5) * 0.3; p = Math.max(-w / 2 + 0.1, Math.min(w / 2 - 0.1, p)); blob(p + (h2(seed, i) - 0.5) * w * 0.5, 0.09, z, 0.09 + h2(seed + 9, i) * 0.06, i % 3 ? T.leaves(T.LEAF_D, fl, 0.22) : T.leaves(T.LEAF_G, null, 0), { noShadow: true }); }
  });
  // [centre] mossy garden statue (a statue with o.moss; default kind 'maiden')
  def('gardenStatue', 'C', [0.7, 0.7], 'weathered garden statue, solid (o.kind: maiden urn angel knight king)', (o) => { Fz.statue(0, 0, 0, Object.assign({ kind: 'maiden', moss: true, c: 0xaab0a0 }, o, { face: 'y', s: 1 })); });
  // [centre] small tiered fountain, o.r (0.9)
  def('fountain', 'c', o => [2 * (o.r || 0.9), 2 * (o.r || 0.9)], 'small tiered fountain (o.r)', (o) => {
    const r = o.r || 0.9, c = 0xc0b9ac, s = stn(c), pn = (sx, t, q) => { const X = Math.floor(sx * U), Y = Math.floor(t * V), Ht = Math.round(q.vl * V), m = X % 14; if (Y >= Ht - 2) return mul(c, 1.12); if (Y < 2) return mul(c, 0.72); if (m < 2) return mul(c, 0.95); if (m === 2 || m === 13 || Y === 3 || Y === Ht - 4) return mul(c, 0.72); return mul(c, 0.86 + h2(X >> 1, Y >> 1) * 0.1); };
    cyl(0, 0, 0, r, 0.34, 16, pn, { top: stn(mul(c, 1.08)), inner: 0.84 }); disk(0, 0, 0.27, r * 0.85, (sx, t) => T.water(sx + fr.x, t + fr.y));
    cyl(0, 0, 0, 0.2, 0.42, 8, s, { top: s }); cyl(0, 0, 0.42, 0.1, 0.34, 8, s, {}); frust(0, 0, 0.76, 0.1, 0.46, 0.12, 12, s, {}); cyl(0, 0, 0.88, 0.46, 0.05, 12, pn, { top: stn(mul(c, 1.08)), inner: 0.8, noShadow: true }); disk(0, 0, 0.91, 0.37, (sx, t) => T.water(sx + fr.x + 5, t + fr.y));
    cyl(0, 0, 0.9, 0.07, 0.3, 6, s, {}); frust(0, 0, 1.2, 0.07, 0.22, 0.07, 10, s, { top: (sx, t) => T.water(sx + 9, t), noShadow: true }); cyl(0, 0, 1.27, 0.04, 0.12, 6, s, { noShadow: true }); blob(0, 0, 1.43, 0.06, bl(o.gilt === false ? c : GOLD_L), { noShadow: true });
    if (fr.s === 1 && B.jets) B.jets.push({ x: fr.x, y: fr.y, z: fr.z + 1.5, h: 0.3, bowl: fr.z + 0.92, br: 0.4, basin: fr.z + 0.27, top: fr.z + 1.3 });
    light(0, 0, 0.9, 3, [0.5, 0.75, 0.9], 0.4);
    for (let i = 0; i < 4; i++) { const a = i * 1.571 + 0.785; poi(Math.cos(a) * (r + 0.4), Math.sin(a) * (r + 0.4), 'sit', -Math.cos(a), -Math.sin(a)); }
  });
  // [centre] sundial on a stone pedestal
  def('sundial', 'c', [0.6, 0.6], 'sundial on a pedestal', (o) => {
    const c = 0xb8b0a2, s = stn(c);
    cyl(0, 0, 0, 0.24, 0.07, 8, stn(mul(c, 0.88)), { top: s }); frust(0, 0, 0.07, 0.16, 0.09, 0.2, 8, s, {}); frust(0, 0, 0.27, 0.09, 0.13, 0.25, 8, s, {});
    cyl(0, 0, 0.52, 0.25, 0.05, 10, s, { top: (sx, t, q, a, b) => { const dd = Math.hypot(a - 0.5, b - 0.5), an = (Math.atan2(b - 0.5, a - 0.5) + 6.3) / 0.5236; return dd > 0.44 ? mul(c, 1.1) : dd > 0.4 ? BRASS : dd > 0.28 && Math.abs(an - Math.round(an)) < 0.12 ? 0x4a4038 : dd < 0.05 ? BRASS : mul(0xd8d0bc, 0.96 + h2(Math.floor(a * 16), Math.floor(b * 16)) * 0.06); } });
    quad([0, -0.14, 0.572], [0, 0.26, 0], [0, 0, 0.16], (sx, t, q, a, b) => (b > 1 - a ? -1 : b > 0.9 - a ? GOLD_L : BRASS), { cut: true });
    poi(0, 0.6, 'read', 0, -1);
  });
  // [corner] stone garden bench 1.4 x 0.46
  def('stoneBench', 'r', o => [o.len || 1.4, 0.46], 'stone garden bench (o.len, o.c)', (o, w, d) => {
    const c = o.c || 0xb4ac9e, sc = (s, t, q, a, b) => { const X = Math.floor(s * U), Y = Math.floor(t * V), Wt = Math.round(q.ul * U), dx = X - Wt / 2 + 0.5, dy = Y - 5; return dx * dx + dy * dy < 7 && dx * dx + dy * dy > 2 ? mul(c, 0.7) : stn(c)(s, t, q); };
    for (const x of [0.12, w - 0.3]) box(x, 0.05, 0, 0.18, d - 0.1, 0.24, { side: stn(mul(c, 0.9)), tx: sc, bx: sc, noTop: true });
    box(0, 0, 0.24, w, d, 0.08, { side: stn(c), top: stn(mul(c, 1.06), 0.14) });
    const n = Math.max(1, Math.floor(w / 0.6)); for (let i = 0; i < n; i++) { const x = w * (i + 0.5) / n; poi(x, d / 2, 'sit', 0, 1, 0.32, [x, d + 0.25]); }
  });
  // [centre] bird bath
  def('birdBath', 'c', [0.7, 0.7], 'stone bird bath with a bird', (o) => {
    const c = 0xb8b0a2, s = stn(c);
    cyl(0, 0, 0, 0.2, 0.06, 8, stn(mul(c, 0.88)), { top: s }); frust(0, 0, 0.06, 0.12, 0.07, 0.4, 8, s, {}); frust(0, 0, 0.46, 0.08, 0.33, 0.1, 10, s, {});
    cyl(0, 0, 0.56, 0.33, 0.035, 10, s, { top: stn(mul(c, 1.1)), inner: 0.8, noShadow: true }); disk(0, 0, 0.58, 0.27, waterTex(0x5a9ab4, 3));
    if (o.bird !== false) { const bd = art(['.bb.', 'bbbo', 'Bbb.', '.k..'], Object.assign({}, PAL, { b: o.bc || 0x5a8ac8, B: 0x3a5a98 })); icon(-0.2, 0.2, 0.595, bd); }
  });
  // [corner] garden pond o.w (3) x o.d (2), flat: stone rim, water, lilies and reeds.  the water blocks
  def('pond', 'R', o => [o.w || 3, o.d || 2], 'flat pond with stone edge, lilies and reeds (o.w, o.d, o.seed)', (o, w, d) => {
    const seed = o.seed || 0, x0 = Math.min(wx(0, 0), wx(w, d)), y0 = Math.min(wy(0, 0), wy(w, d)), W = Math.abs(wx(w, d) - wx(0, 0)), D = Math.abs(wy(w, d) - wy(0, 0)), z = fr.z + 0.013 * fr.s;
    const ed = (a, b) => { const dx = (a - 0.5) * 2, dy = (b - 0.5) * 2, an = Math.atan2(dy, dx); return Math.hypot(dx, dy) / (0.9 + Math.sin(an * 3 + seed) * 0.06 + Math.sin(an * 5 + seed * 2) * 0.04); };
    Q([x0, y0, z], [W, 0, 0], [0, D, 0], (s, t, q, a, b) => { const e = ed(a, b), X = Math.floor((s + x0) * U), Y = Math.floor((t + y0) * U); if (e > 1) return -1; if (e > 0.84) { const an = Math.floor((Math.atan2(b - 0.5, a - 0.5) + 4) * (W + D) * 2.2), jn = Math.abs((Math.atan2(b - 0.5, a - 0.5) + 4) * (W + D) * 2.2 - an) < 0.12; return jn || e > 0.985 || e < 0.855 ? 0x6a665e : mul([0xb8b0a0, 0xa8a092, 0xc4bcaa, 0x9c968a][(h2(an, seed) * 4) | 0], 0.94 + h2(X >> 1, Y >> 1) * 0.1); } return T.water(s + x0, t + y0); }, { n: [0, 0, 1], noShadow: true });
    const P = (a, b) => [a * w, b * d];
    for (let i = 0; i < Math.round(w * d * 1.6); i++) { const a = 0.5 + (h2(i, seed + 1) - 0.5) * 0.62, b = 0.5 + (h2(seed + 2, i) - 0.5) * 0.62, p = P(a, b), r = 0.07 + h2(i, 4) * 0.05; if (ed(a, b) > 0.74) continue; disk(p[0], p[1], 0.02, r, (s, t, q, u, v) => (u > 0.5 && Math.abs(v - 0.5) < (u - 0.5) * 0.5 ? -1 : (Math.floor(u * 6) + Math.floor(v * 6)) & 1 ? 0x5a9a4a : 0x4a8a40), { f: E.F_NOAO }); if (i % 3 === 0) blob(p[0], p[1], 0.05, 0.04, (dx, dy) => (dx * dx + dy * dy < 0.15 ? 0xf6e7a0 : i % 2 ? 0xf4b8c8 : 0xf8f4ec), { noShadow: true, f: E.F_NOAO }); }
    for (let i = 0; i < Math.round(w * 2.5); i++) { const a = 0.2 + h2(i, seed + 7) * 0.5, b = 0.16 + h2(i, 9) * 0.1, p = P(a, b), hgt = 0.4 + h2(i, 5) * 0.4; if (ed(a, b) > 0.95) continue; bar([p[0], p[1], 0.01], [p[0] + (h2(i, 3) - 0.5) * 0.1, p[1], hgt], 0.03, flat(i & 1 ? 0x5a9a48 : 0x478c3c)); if (i % 2) bar([p[0] + 0.02, p[1], hgt - 0.14], [p[0] + 0.02, p[1], hgt], 0.05, flat(0x6a4a30)); }
    for (let i = 0; i < 3; i++) { const a = 0.6 + i * 2.1 + seed, p = P(0.5 + Math.cos(a) * 0.44, 0.5 + Math.sin(a) * 0.44); blob(p[0], p[1], 0.04, 0.1 + h2(i, 2) * 0.06, bl(0x8f8a82, 0.16), { f: E.F_NOAO }); }
    block(w * 0.12, d * 0.12, w * 0.76, d * 0.76);
    poi(w / 2, d + 0.3, 'tend', 0, -1);
  });
  const PATHS = {
    gravel: (x, y) => { const X = Math.floor(x * U), Y = Math.floor(y * U), r = h2(X, Y), n = T.fbm(x * 0.6, y * 0.6); return r < 0.1 ? 0x8a8478 : r > 0.9 ? 0xe0d4b8 : mul(0xc4b494, 0.86 + n * 0.22 + h2(X >> 1, Y >> 1) * 0.08); },
    flag: (x, y) => { const tx = Math.floor(x * U), ty = Math.floor(y * U), row = Math.floor(ty / 16), o = (h2(row, 5) * 22) | 0, col = Math.floor((tx + o) / 24), lx = tx + o - col * 24, ly = ty - row * 16; if (lx === 0 || ly === 0) return h2(tx, ty) < 0.3 ? 0x5c7743 : 0x5a564e; let f = 0.94 + h2(tx, ty) * 0.08; if (lx === 1 || ly === 15) f *= 1.07; else if (lx === 23 || ly === 1) f *= 0.9; return mul([0xb8b0a0, 0xa8a092, 0xc0b8a6, 0x9c968a][(h2(col, row) * 4) | 0], f); },
    brick: (x, y) => { const X = Math.floor(x * U), Y = Math.floor(y * U), bx = Math.floor(X / 8), by = Math.floor(Y / 8), hz = (bx + by) & 1, l = hz ? Y % 8 : X % 8, m = hz ? X % 8 : Y % 8, k = l % 4; if (k === 0 || m === 0) return 0x6e5a4c; return mul([0xa8644a, 0x96553f, 0xb47354, 0x8a4c3a][(h2(bx * 3 + (l >> 2), by * 5 + hz) * 4) | 0], 0.92 + h2(X, Y) * 0.12); },
    dirt: (x, y) => T.dirt(x, y),
    step: (x, y) => { const gx = Math.floor(x / 0.5), gy = Math.floor(y / 0.5), cx = (gx + 0.5 + (h2(gx, gy) - 0.5) * 0.2) * 0.5, cy = (gy + 0.5 + (h2(gy, gx) - 0.5) * 0.2) * 0.5, dd = Math.hypot((x - cx) * (1 + h2(gx, gy + 3) * 0.3), y - cy) / 0.19; if (dd > 1) return -1; const X = Math.floor(x * U), Y = Math.floor(y * U); return dd > 0.86 ? 0x6a665e : mul([0xb8b0a0, 0xa8a092, 0xc0b8a6][(h2(gx, gy + 9) * 3) | 0], 0.93 + h2(X >> 1, Y >> 1) * 0.12); },
  };
  // [corner] path / paving tile o.w x o.d (1 x 1), flat, NOT solid.  o.kind 'gravel' | 'flag' | 'brick' | 'dirt' | 'step'.  the pattern is world-anchored so adjoining tiles join seamlessly; o.soft = ragged edge
  def('path', 'R', o => [o.w || 1, o.d || 1], 'flat path / paving, not solid (o.w, o.d, o.kind: gravel flag brick dirt step, o.soft)', (o, w, d) => {
    const x0 = Math.min(wx(0, 0), wx(w, d)), y0 = Math.min(wy(0, 0), wy(w, d)), W = Math.abs(wx(w, d) - wx(0, 0)), D = Math.abs(wy(w, d) - wy(0, 0)), f = PATHS[o.kind || 'gravel'] || PATHS.gravel, soft = o.soft;
    Q([x0, y0, fr.z + 0.011], [W, 0, 0], [0, D, 0], (s, t, q, a, b) => { if (soft) { const e = Math.min(a * W, (1 - a) * W, b * D, (1 - b) * D) * U; if (e < 4 && h2(Math.floor((s + x0) * U), Math.floor((t + y0) * U)) < 0.75 - e * 0.18) return -1; } return f(s + x0, t + y0); }, { n: [0, 0, 1], noShadow: true });
  });
  const FRUIT = { apple: [0xd93a3a, 0xe85a4a], pear: [0xd8d04a, 0xc8c040], plum: [0x7a3a8a, 0x9a5ab0], cherry: [0xc8203a, 0xa81830], orange: [0xf0983a, 0xe07a2a], lemon: [0xf0dc4a, 0xe8cc3a] };
  const barkT = (s, t) => { const X = Math.floor(s * U), Y = Math.floor(t * V); return mul(0x6b4a36, ((X + (Y >> 3)) % 4 === 0 ? 0.7 : 0.95) + h2(X, Y >> 2) * 0.16); };
  // [centre] orchard fruit tree (only the trunk blocks).  o.kind 'apple' | 'pear' | 'plum' | 'cherry' | 'orange' | 'lemon', o.blossom
  def('orchardTree', 'C', [0.6, 0.6], 'orchard fruit tree (o.kind: apple pear plum cherry orange lemon, o.blossom, o.seed, o.s)', (o) => {
    const fp = o.blossom ? T.BLOSSOM : (FRUIT[o.kind || 'apple'] || FRUIT.apple), seed = o.seed || 1, L = () => T.leaves(o.kind === 'pear' ? T.LEAF_Y : T.LEAF_G, fp, o.blossom ? 0.22 : 0.085), R = i => h2(seed * 13 + i, i * 7 + 1);
    block(-0.2, -0.2, 0.4, 0.4);
    frust(0, 0, 0, 0.16, 0.1, 0.5, 8, barkT, {}); frust(0, 0, 0.5, 0.1, 0.07, 0.6, 8, barkT, {});
    bar([0, 0, 0.75], [0.3, 0.1, 1.15], 0.07, barkT); bar([0, 0, 0.8], [-0.28, -0.05, 1.2], 0.07, barkT);
    blob(0, 0, 1.45, 0.6, L());
    for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283 + R(i) * 0.8, rr = 0.42 + R(i + 9) * 0.25; blob(Math.cos(a) * rr, Math.sin(a) * rr, 1.15 + R(i + 20) * 0.6, 0.3 + R(i + 30) * 0.14, L()); }
    for (let i = 0; i < 5; i++) { const a = R(i + 40) * 6.283, rr = R(i + 50) * 0.6; blob(Math.cos(a) * rr, Math.sin(a) * rr, 1.5 + R(i + 60) * 0.55, 0.2 + R(i + 70) * 0.1, L(), { noShadow: true }); }
    if (!o.blossom) for (let i = 0; i < 4; i++) { const a = R(i + 80) * 6.283, rr = 0.3 + R(i + 90) * 0.5; blob(Math.cos(a) * rr, Math.sin(a) * rr, 0.03, 0.035, flat(fp[i % fp.length]), { noShadow: true, f: E.F_NOAO }); }
    poi(0.55, 0.55, 'tend', -0.7, -0.7);
  });
  // [corner] vegetable patch o.w (2.2) x o.d (1.5): rows of cabbages, carrots, leeks, pumpkins, beans
  def('vegPatch', 'r', o => [o.w || 2.2, o.d || 1.5], 'vegetable patch with rows of crops (o.w, o.d, o.seed)', (o, w, d) => {
    const seed = o.seed || 0, CB = T.pal(['#8fbf6a', '#7aae5a', '#a6cf7e', '#6a9a4e']);
    box(0, 0, 0, w, d, 0.07, { side: wh(0x7a5a3c), top: (s, t, q, a, b) => { const X = Math.floor(s * U), Y = Math.floor(t * U), e = Math.min(a * q.ul, (1 - a) * q.ul, b * q.vl, (1 - b) * q.vl); if (e < 0.05) return mul(WOOD_L, 0.95); const m = (Y + 4) % 10; return mul(0x5a4434, (m < 2 ? 0.74 : m < 5 ? 1.12 : 0.94) + T.fbm(X * 0.2, Y * 0.2) * 0.2); } });
    const rows = Math.max(1, Math.floor((d - 0.16) / 0.31)), nx = Math.max(1, Math.floor((w - 0.2) / 0.3));
    for (let j = 0; j < rows; j++) { const y = 0.2 + j * 0.31, k = (j + seed) % 5;
      for (let i = 0; i < nx; i++) { const x = 0.18 + (w - 0.36) * (i + 0.5) / nx + (h2(i, j + seed) - 0.5) * 0.06;
        if (k === 0) { blob(x, y, 0.13, 0.1, T.leaves(CB, null, 0), { noShadow: i % 2 > 0 }); blob(x, y, 0.17, 0.06, bl(0xc8e0a0, 0.05), { noShadow: true, f: E.F_NOAO }); }
        else if (k === 1) { for (let n = 0; n < 3; n++) bar([x, y, 0.07], [x + (n - 1) * 0.05, y + (n - 1) * 0.02, 0.22 + (n & 1) * 0.05], 0.035, flat(n & 1 ? 0x5aa348 : 0x478c3c)); spr(x, y, 0.07, 2, 2, () => 0xe07a2a); }
        else if (k === 2) { blob(x, y, 0.15, 0.1, (dx, dy, ix, iy) => (Math.abs(((dx + 1) * 3) % 1 - 0.5) > 0.38 ? 0xb85a1a : dy < -0.3 ? 0xf0983a : 0xe07a2a), { noShadow: i % 2 > 0 }); if (i % 2) blob(x + 0.1, y + 0.03, 0.11, 0.07, T.leaves(T.LEAF_G, null, 0), { noShadow: true }); }
        else if (k === 3) { bar([x, y, 0.07], [x, y, 0.3], 0.04, s => (s < 0.08 ? 0xe8e8d8 : 0x5aa348)); bar([x, y, 0.2], [x + 0.05, y, 0.34], 0.03, flat(0x478c3c)); bar([x, y, 0.2], [x - 0.05, y, 0.33], 0.03, flat(0x3f8438)); }
        else { if (i % 2 === 0) { bar([x, y, 0.07], [x, y, 0.8], 0.03, flat(WOOD_L)); for (let n = 0; n < 4; n++) blob(x + (n & 1 ? 0.04 : -0.04), y, 0.2 + n * 0.15, 0.07, T.leaves(T.LEAF_G, [0xd8414f, 0xf4efe0], 0.12), { noShadow: true }); } }
      } }
    poi(w / 2, d + 0.3, 'tend', 0, -1); poi(-0.3, d / 2, 'tend', 1, 0);
  });
  // [centre] straw bee skep on a little stand
  def('beehive', 'c', [0.6, 0.6], 'straw beehive on a stand', (o) => {
    const coil = (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * V); return mul(STRAW, (Y % 3 === 0 ? 0.68 : Y % 3 === 1 ? 1.08 : 0.92) + h2(X >> 1, Y) * 0.1); };
    legs(-0.24, -0.24, 0.48, 0.48, 0.3, 0.06, sh(WOOD_D)); box(-0.28, -0.28, 0.3, 0.56, 0.56, 0.05, { side: sh(WOOD), top: wt(WOOD_L) });
    cyl(0, 0, 0.35, 0.22, 0.12, 10, coil, {}); frust(0, 0, 0.47, 0.22, 0.16, 0.12, 10, coil, {}); frust(0, 0, 0.59, 0.16, 0.06, 0.1, 10, coil, { top: flat(0xb89438) }); blob(0, 0, 0.7, 0.045, bl(0xc8a84a), { noShadow: true });
    spr(0.02, 0.22, 0.37, 4, 3, (X, Y) => (Y === 2 && (X === 0 || X === 3) ? -1 : 0x241c18), { bias: 0.1 });
    for (let i = 0; i < 5; i++) spr((h2(i, 3) - 0.5) * 0.7, 0.2 + h2(i, 5) * 0.3, 0.4 + h2(i, 7) * 0.5, 2, 1, (X) => (X ? 0x2a2228 : 0xf0c838));
    poi(0, 0.7, 'tend', 0, -1);
  });
  // [centre] dovecote on a post
  def('dovecote', 'c', [0.7, 0.7], 'dovecote on a post with doves (o.c, o.roof)', (o) => {
    const c = o.c || 0xe8e0cc, hl = (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * V), Wt = Math.round(q.ul * U), Ht = Math.round(q.vl * V), m = (X - 1) % 8, ry = (Y - 2) % 9; if (X === 0 || X === Wt - 1) return mul(c, 0.7); if (ry === 0 && Y < Ht - 3) return 0x8a6a44; if (m >= 2 && m <= 5 && ry >= 1 && ry <= 5 && !((m === 2 || m === 5) && ry === 5)) return 0x2a2228; return mul(c, (Y >= Ht - 2 ? 0.82 : 1) * (0.95 + h2(X >> 1, Y >> 2) * 0.08)); };
    box(-0.06, -0.06, 0, 0.12, 0.12, 1.3, { side: sh(WOOD_D) }); for (let i = 0; i < 4; i++) { const a = i * 1.571 + 0.785; bar([0, 0, 0.9], [Math.cos(a) * 0.3, Math.sin(a) * 0.3, 1.28], 0.045, flat(WOOD)); bar([Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0], [0, 0, 0.3], 0.045, flat(WOOD)); }
    box(-0.34, -0.34, 1.28, 0.68, 0.68, 0.05, { side: sh(WOOD), top: wt(WOOD_L) }); box(-0.27, -0.27, 1.33, 0.54, 0.54, 0.5, { side: hl, noTop: true });
    frust(0, 0, 1.83, 0.5, 0, 0.42, 4, (s, t, q) => T.roof(s, t, { P: { pal: o.roof || T.ROOF_SLATE, seed: 2 }, vl: 0.7 }), {}); blob(0, 0, 2.27, 0.04, bl(GOLD_L), { noShadow: true });
    const dv = art(['.ww.', 'wwwo', 'Www.', '.k..'], Object.assign({}, PAL, { W: 0xc8c8c8 })); icon(0.3, 0.2, 1.33, dv); icon(-0.1, 0.32, 1.33, dv); icon(0.12, 0.1, 2.0, dv);
  });
  // [centre] roofed courtyard well (a well with o.roof)
  def('wellRoofed', 'C', o => { const r = (o.r || 0.6) + 0.06; return [2 * r, 2 * r]; }, 'courtyard well with roof, windlass and bucket, solid (o.r)', (o) => { Fz.well(0, 0, 0, Object.assign({ r: 0.6 }, o, { roof: true, face: 'y', s: 1 })); });

  /* Fz.list[i].solid: true = the whole footprint blocks, 'part' = only parts of it block (posts, pins, the water...), false = walk over / under it */
  for (const it of Fz.list) { if (['gardenStatue', 'wellRoofed', 'horse'].indexOf(it.name) >= 0) it.solid = true; else if (['laundry', 'hangRack', 'cellFront', 'sparRing', 'horseStall', 'skittles', 'roseArch', 'pond', 'orchardTree'].indexOf(it.name) >= 0) it.solid = 'part'; }
})();
