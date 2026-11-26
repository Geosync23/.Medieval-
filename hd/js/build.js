'use strict';
/* Model builders: boxes, roofs, cylinders, houses, trees, props, castle parts. */
const B = {};
(function () {
  const Q = E.quad, h2 = E.h2, norm = E.norm, mul = T.mul;
  const FE = E.F_EMIS << 24;
  B.reset = function () { B.blocks = []; B.smokes = []; B.flags = []; B.pois = []; B.jets = []; B.flames = []; };
  B.reset();
  B.block = (x, y, w, d, z) => B.blocks.push([x, y, w, d, z || 0]);
  B.blockC = (cx, cy, r, z) => B.blocks.push([cx - r, cy - r, r * 2, r * 2, z || 0]);
  B.poi = (x, y, kind, fx, fy) => B.pois.push({ x, y, kind, fx: fx || 0, fy: fy || 0 });

  /* ---------- basic solids ---------- */
  B.box = function (x, y, z, w, d, h, o) {
    const side = o.side, ns = o.noShadow, f = o.f || 0;
    Q([x, y + d, z], [w, 0, 0], [0, 0, h], o.ty || side, { P: o.Py || o.P, n: [0, 1, 0], noShadow: ns, cut: o.cut, f });
    Q([x + w, y + d, z], [0, -d, 0], [0, 0, h], o.tx || side, { P: o.Px || o.P, n: [1, 0, 0], noShadow: ns, cut: o.cut, f });
    if (!o.noTop) Q([x, y, z + h], [w, 0, 0], [0, d, 0], o.top || side, { P: o.Ptop || o.P, n: [0, 0, 1], noShadow: ns, f });
    if (!ns) {
      Q([x, y, z], [w, 0, 0], [0, 0, h], side, { shadowOnly: true });
      Q([x, y, z], [0, d, 0], [0, 0, h], side, { shadowOnly: true });
      if (o.noTop) Q([x, y, z + h], [w, 0, 0], [0, d, 0], side, { shadowOnly: true });
    }
  };
  const BOARD = T.flat(0x5a4030), BOARD_P = null;
  B.gable = function (x, y, z, w, d, rise, axis, o) {
    const ov = o.ov === undefined ? 0.25 : o.ov, P = o.P, tex = o.tex || T.roof, gt = o.gtex || T.gable, GP = o.GP, bt = o.board || BOARD;
    if (axis === 'x') {
      const half = d / 2, k = rise / half, zr = rise + ov * k, z0 = z - ov * k;
      Q([x - ov, y + d + ov, z0], [w + 2 * ov, 0, 0], [0, -(half + ov), zr], tex, { P, n: norm([0, rise, half]) });
      Q([x - ov, y - ov, z0], [w + 2 * ov, 0, 0], [0, half + ov, zr], tex, { P, n: norm([0, -rise, half]) });
      Q([x + w, y + d, z], [0, -d, 0], [0, 0, rise], gt, { P: GP, n: [1, 0, 0], cut: true });
      Q([x, y + d, z], [0, -d, 0], [0, 0, rise], gt, { P: GP, shadowOnly: true, cut: true });
      // barge boards + eave fascia
      Q([x + w + ov, y + d + ov, z0 - 0.16], [0, -(half + ov), zr], [0, 0, 0.2], bt, { n: [1, 0, 0], noShadow: true });
      Q([x + w + ov, y - ov, z0 - 0.16], [0, half + ov, zr], [0, 0, 0.2], bt, { n: [1, 0, 0], noShadow: true });
      Q([x - ov, y + d + ov, z0 - 0.14], [w + 2 * ov, 0, 0], [0, 0, 0.14], bt, { n: [0, 1, 0], noShadow: true });
    } else {
      const half = w / 2, k = rise / half, zr = rise + ov * k, z0 = z - ov * k;
      Q([x + w + ov, y + d + ov, z0], [0, -(d + 2 * ov), 0], [-(half + ov), 0, zr], tex, { P, n: norm([rise, 0, half]) });
      Q([x - ov, y + d + ov, z0], [0, -(d + 2 * ov), 0], [half + ov, 0, zr], tex, { P, n: norm([-rise, 0, half]) });
      Q([x, y + d, z], [w, 0, 0], [0, 0, rise], gt, { P: GP, n: [0, 1, 0], cut: true });
      Q([x, y, z], [w, 0, 0], [0, 0, rise], gt, { P: GP, shadowOnly: true, cut: true });
      Q([x - ov, y + d + ov, z0 - 0.16], [half + ov, 0, zr], [0, 0, 0.2], bt, { n: [0, 1, 0], noShadow: true });
      Q([x + w + ov, y + d + ov, z0 - 0.16], [-(half + ov), 0, zr], [0, 0, 0.2], bt, { n: [0, 1, 0], noShadow: true });
      Q([x + w + ov, y + d + ov, z0 - 0.14], [0, -(d + 2 * ov), 0], [0, 0, 0.14], bt, { n: [1, 0, 0], noShadow: true });
    }
  };
  function triTex(tex, th) {      // remap triangle coords so tile rows stay horizontal
    return function (s, t, q, a, b) { return tex((a + b * 0.5) * q.ul, b * th, { P: q.P, ul: q.ul, vl: th }, a, b); };
  }
  B.pyramid = function (x, y, z, w, d, rise, o) {
    const ov = o.ov === undefined ? 0.2 : o.ov, P = o.P, ap = [x + w / 2, y + d / 2, z + rise];
    const x0 = x - ov, y0 = y - ov, x1 = x + w + ov, y1 = y + d + ov;
    const thy = Math.hypot(rise, d / 2 + ov), thx = Math.hypot(rise, w / 2 + ov);
    const tri = (A, Bp, n, th) => Q(A, [Bp[0] - A[0], Bp[1] - A[1], 0], [ap[0] - A[0], ap[1] - A[1], ap[2] - A[2]], triTex(o.tex || T.roof, th), { P, n: norm(n), tri: true });
    tri([x0, y1, z], [x1, y1, z], [0, rise, d / 2], thy);
    tri([x1, y1, z], [x1, y0, z], [rise, 0, w / 2], thx);
    tri([x0, y0, z], [x1, y0, z], [0, -rise, d / 2], thy);
    tri([x0, y1, z], [x0, y0, z], [-rise, 0, w / 2], thx);
  };
  B.cyl = function (cx, cy, z, r, h, n, tex, o) {
    o = o || {}; let s0 = 0; const seg = 2 * r * Math.sin(Math.PI / n), st = 6.28318 / n, a0 = 2.35619 + (o.rot || 0);
    for (let i = 0; i < n; i++) {
      const a = a0 - i * st, b = a - st, am = a - st / 2;
      const p0 = [cx + r * Math.cos(a), cy + r * Math.sin(a), z], p1 = [cx + r * Math.cos(b), cy + r * Math.sin(b), z];
      const nn = [Math.cos(am), Math.sin(am), 0], vis = nn[0] + nn[1] > -0.05;
      Q(p0, [p1[0] - p0[0], p1[1] - p0[1], 0], [0, 0, h], tex, { P: o.P, n: vis ? nn : undefined, s0, shadowOnly: !vis, noShadow: o.noShadow, f: o.f || 0 });
      s0 += seg;
    }
    if (o.top) Q([cx - r, cy - r, z + h], [2 * r, 0, 0], [0, 2 * r, 0], T.disk(o.inner || 0, o.top), { P: o.Ptop || o.P, n: [0, 0, 1], cut: true, noShadow: o.noShadow, f: o.f || 0 });
  };
  B.cone = function (cx, cy, z, r, h, n, tex, o) {
    o = o || {}; const st = 6.28318 / n, a0 = 2.35619, th = Math.hypot(h, r);
    for (let i = 0; i < n; i++) {
      const a = a0 - i * st, b = a - st, am = a - st / 2;
      const p0 = [cx + r * Math.cos(a), cy + r * Math.sin(a), z], p1 = [cx + r * Math.cos(b), cy + r * Math.sin(b), z];
      Q(p0, [p1[0] - p0[0], p1[1] - p0[1], 0], [cx - p0[0], cy - p0[1], h], triTex(tex, th), { P: o.P, n: norm([Math.cos(am) * h, Math.sin(am) * h, r]), tri: true });
    }
  };
  B.disk = function (cx, cy, z, r, tex, o) {
    o = o || {};
    Q([cx - r, cy - r, z], [2 * r, 0, 0], [0, 2 * r, 0], T.disk(o.inner || 0, tex), Object.assign({ n: [0, 0, 1], cut: true }, o));
  };

  /* tapered trunk / branch: a smooth frustum from (x0,y0,z0) radius r0 to (x1,y1,z1) radius r1 */
  B.taper = function (x0, y0, z0, r0, x1, y1, z1, r1, n, tex, o) {
    o = o || {}; const st = 6.28318 / n, a0 = 2.35619, h = Math.hypot(x1 - x0, y1 - y0, z1 - z0), seg = 2 * r0 * Math.sin(Math.PI / n);
    for (let i = 0; i < n; i++) {
      const a = a0 - i * st, b = a - st, am = a - st / 2, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
      const b0 = [x0 + r0 * ca, y0 + r0 * sa, z0], b1 = [x0 + r0 * cb, y0 + r0 * sb, z0], t0 = [x1 + r1 * ca, y1 + r1 * sa, z1], t1 = [x1 + r1 * cb, y1 + r1 * sb, z1];
      const nn = [Math.cos(am), Math.sin(am), 0], vis = nn[0] + nn[1] > -0.05, op = { P: o.P, n: vis ? nn : undefined, tri: true, shadowOnly: !vis };
      Q(b0, [b1[0] - b0[0], b1[1] - b0[1], 0], [t0[0] - b0[0], t0[1] - b0[1], t0[2] - b0[2]], (s, t, q, u, v) => tex((i + u) * seg, v * h, q, u, v), op);
      Q(t1, [t0[0] - t1[0], t0[1] - t1[1], 0], [b1[0] - t1[0], b1[1] - t1[1], b1[2] - t1[2]], (s, t, q, u, v) => tex((i + 1 - u) * seg, (1 - v) * h, q, u, v), Object.assign({}, op));
    }
  };
  /* ---------- foliage ---------- */
  let seedc = 1;
  B.tree = function (x, y, o) {
    o = o || {}; const sc = o.s || 1, sd = seedc++ * 13, pl = o.pal || T.LEAF_G, fl = o.flowers === undefined ? T.BLOSSOM : o.flowers, fp = o.fp || 0.06;
    const tex = T.leaves(pl, fl, fp), th = 0.95 * sc;
    const bark = (u, v) => { const X = Math.floor(u * 32), Y = Math.floor(v * 40); return T.mul(0x6b4a36, ((X + (Y >> 3)) % 4 === 0 ? 0.7 : 0.95) + h2(X, Y >> 2) * 0.16); };
    B.taper(x, y, 0, 0.3 * sc, x, y, 0.45 * sc, 0.17 * sc, 8, bark); B.taper(x, y, 0.45 * sc, 0.17 * sc, x, y, th + 0.7 * sc, 0.1 * sc, 8, bark);
    const R = (i) => h2(sd + i, i * 7 + 1);
    const bl = (dx, dy, dz, r, i) => E.blob([x + dx * sc, y + dy * sc, th + dz * sc], r * sc, tex, { seed: sd + i * 5 });
    bl(0, 0, 1.0, 0.9, 0);
    const n = o.n || 9;
    for (let i = 0; i < n; i++) { const a = i / n * 6.283 + R(i) * 0.8, rr = 0.6 + R(i + 9) * 0.45; bl(Math.cos(a) * rr, Math.sin(a) * rr, 0.4 + R(i + 20) * 1.0, 0.42 + R(i + 30) * 0.26, i + 1); }
    for (let i = 0; i < 10; i++) { const a = R(i + 40) * 6.283, rr = R(i + 50) * 1.0; bl(Math.cos(a) * rr, Math.sin(a) * rr, 0.9 + R(i + 60) * 1.0, 0.24 + R(i + 70) * 0.14, i + 30); }
    bl(0.1, -0.1, 1.8, 0.55, 20);
    B.blockC(x, y, 0.3);
  };
  B.bush = function (x, y, o) {
    o = o || {}; const sc = o.s || 1, sd = seedc++ * 17, tex = T.leaves(o.pal || T.LEAF_D, o.flowers === undefined ? T.FLOWERS : o.flowers, o.fp || 0.1), z = o.z || 0, n = o.n || 4;
    for (let i = 0; i < n; i++) { const a = i / n * 6.283 + h2(sd, i), rr = n > 1 ? 0.2 * sc : 0;
      E.blob([x + Math.cos(a) * rr, y + Math.sin(a) * rr, z + 0.2 * sc + h2(sd + i, 3) * 0.14 * sc], (0.24 + h2(sd + i, 5) * 0.12) * sc, tex, { seed: sd + i * 3 }); }
    if (!o.noBlock && z === 0) B.blockC(x, y, 0.3 * sc);
  };
  /* small flowers for window boxes / planters: a row of tiny blobs */
  const FCOL = [[0xd8414f, 0xe8698a], [0xe8698a, 0xf2b8c6], [0xe9c64c, 0xf4e27a], [0xf4efe0, 0xe8698a], [0xa56be0, 0xc9a0f0], [0xd8414f, 0xe9c64c]];
  B.flowers = function (x0, y0, x1, y1, z, n, seed, big) {
    const fc = FCOL[seed % FCOL.length], lt = T.leaves(T.LEAF_G, null, 0);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, px = x0 + (x1 - x0) * t, py = y0 + (y1 - y0) * t, r = (big || 1) * (0.055 + h2(seed + i, 3) * 0.03);
      E.blob([px, py, z + 0.03], r * 1.25, lt, { seed: seed + i });
      const c = h2(seed, i) < 0.5 ? fc[0] : fc[1];
      E.blob([px + 0.01, py + 0.01, z + 0.07 + h2(seed + i, 7) * 0.05], r, (dx, dy, ix, iy) => ((ix + iy + seed) % 5 === 0 ? 0xf6e7a0 : c), { seed: seed + i });
    }
  };
  B.planter = function (face, a, wall, z, len, seed) {     // window box on a wall. face 'y': a = centre x, wall = y of the wall
    const t = 0.11, P = { c: 0x6a4a34 };
    if (face === 'y') { B.box(a - len / 2, wall, z, len, t, 0.1, { side: T.wood, P, top: T.flat(0x3a2a20) }); B.flowers(a - len / 2 + 0.03, wall + 0.07, a + len / 2 - 0.03, wall + 0.07, z + 0.08, Math.round(len * 9), seed);
      for (let i = 0; i < 3; i++) if (h2(seed, i + 20) < 0.6) E.blob([a - len / 2 + h2(seed, i) * len, wall + 0.12, z - 0.03 - h2(seed, i + 9) * 0.1], 0.05, T.leaves(T.LEAF_D, null, 0), { seed }); }
    else { B.box(wall, a - len / 2, z, t, len, 0.1, { side: T.wood, P, top: T.flat(0x3a2a20) }); B.flowers(wall + 0.07, a - len / 2 + 0.03, wall + 0.07, a + len / 2 - 0.03, z + 0.08, Math.round(len * 9), seed);
      for (let i = 0; i < 3; i++) if (h2(seed, i + 20) < 0.6) E.blob([wall + 0.12, a - len / 2 + h2(seed, i) * len, z - 0.03 - h2(seed, i + 9) * 0.1], 0.05, T.leaves(T.LEAF_D, null, 0), { seed }); }
  };
  B.ivy = function (face, a, wall, h, seed, w) {
    const tex = T.leaves(T.LEAF_D, null, 0), tex2 = T.leaves(T.LEAF_G, null, 0); let p = a; w = w || 0.5;
    for (let i = 0; i < h * 16; i++) {
      const z = 0.05 + i / 16 + h2(seed, i) * 0.05, sp = w * (0.35 + 0.65 * Math.sin(Math.min(1, z / h) * 2.6)); p += (h2(seed + 3, i) - 0.5) * 0.12;
      const q = p + (h2(seed + 5, i) - 0.5) * sp * 2, r = 0.07 + h2(seed + 9, i) * 0.07;
      E.blob(face === 'y' ? [q, wall + 0.03, z] : [wall + 0.03, q, z], r, i % 3 ? tex : tex2, { seed: seed + i });
    }
  };
  B.lantern = function (face, a, wall, z) {              // wall lantern on a bracket
    const iron = T.flat(0x2e2e36), out = 0.28;
    if (face === 'y') { B.box(a - 0.03, wall, z + 0.3, 0.06, out, 0.05, { side: iron, noShadow: true }); B.box(a - 0.09, wall + out - 0.12, z, 0.18, 0.18, 0.24, { side: T.emis(0xffd87a), top: iron, noShadow: true }); B.box(a - 0.12, wall + out - 0.15, z + 0.24, 0.24, 0.24, 0.05, { side: iron, noShadow: true }); B.box(a - 0.11, wall + out - 0.14, z - 0.04, 0.22, 0.22, 0.04, { side: iron, noShadow: true }); E.addLight(a, wall + out + 0.25, z + 0.1, 3.6, null, 1); }
    else { B.box(wall, a - 0.03, z + 0.3, out, 0.06, 0.05, { side: iron, noShadow: true }); B.box(wall + out - 0.12, a - 0.09, z, 0.18, 0.18, 0.24, { side: T.emis(0xffd87a), top: iron, noShadow: true }); B.box(wall + out - 0.15, a - 0.12, z + 0.24, 0.24, 0.24, 0.05, { side: iron, noShadow: true }); B.box(wall + out - 0.14, a - 0.11, z - 0.04, 0.22, 0.22, 0.04, { side: iron, noShadow: true }); E.addLight(wall + out + 0.25, a, z + 0.1, 3.6, null, 1); }
  };
  B.sign = function (face, a, wall, z, c, icon) {        // hanging shop sign with a simple painted icon
    const iron = T.flat(0x2e2e36);
    const tex = (s, t, q) => { const X = Math.floor(s * 32), Y = Math.floor(t * 40), Wt = Math.round(q.ul * 32), Ht = Math.round(q.vl * 40), e = Math.min(X, Y, Wt - 1 - X, Ht - 1 - Y);
      if (e < 1) return 0x3a2a1e; if (e < 2) return 0xd9b04a; const dx = X - Wt / 2 + 0.5, dy = Y - Ht / 2 + 0.5;
      if (icon === 0 && dx * dx + dy * dy < 20) return dy > 1 ? 0xf0dc9a : 0xd9a441;                       // bread
      if (icon === 1 && Math.abs(dx) < 4 && dy > -5 && dy < 4) return dy > 2 ? 0xf4efe0 : 0xc98a3a;         // mug
      if (icon === 2 && (Math.abs(dx) < 1.5 || (Math.abs(dy - 2) < 1.5 && Math.abs(dx) < 4)) && Math.abs(dy) < 6) return 0xd8dce4;   // sword
      if (icon === 3 && Math.abs(dx) + Math.abs(dy) < 5) return 0x6ac0e0;                                   // gem
      return T.mul(c, 0.92 + h2(X >> 1, Y >> 1) * 0.12); };
    if (face === 'y') { B.box(a - 0.03, wall, z + 0.52, 0.06, 0.75, 0.05, { side: iron, noShadow: true }); Q([a, wall + 0.18, z], [0, 0.5, 0], [0, 0, 0.45], tex, { n: [1, 0, 0] }); Q([a - 0.04, wall + 0.18, z], [0, 0.5, 0], [0, 0, 0.45], tex, { shadowOnly: true }); }
    else { B.box(wall, a - 0.03, z + 0.52, 0.75, 0.06, 0.05, { side: iron, noShadow: true }); Q([wall + 0.18, a, z], [0.5, 0, 0], [0, 0, 0.45], tex, { n: [0, 1, 0] }); }
  };

  /* ---------- house ---------- */
  B.house = function (s) {
    const seed = s.seed || 1, h0 = s.h0 || 1.8, fh = s.fh || 1.65, floors = s.floors === undefined ? 2 : s.floors, jet = s.jetty === undefined ? 0.16 : s.jetty;
    const pl = s.plaster || 0xe6d3a6, beam = s.beam || 0x4d3528, sh = s.shutter, baseMat = s.base || 'stone';
    const X1 = s.x + s.w, Y1 = s.y + s.d;
    // ground floor + 3D trimmings for its features
    const mkG = (sd, feats, extra) => Object.assign({ mat: baseMat, seed: sd, plaster: pl, beam, feats, tint: s.tint, quoin: baseMat === 'stone', kinds: baseMat === 'stone' ? null : (feats || []).length ? [0] : null }, extra || {});
    B.box(s.x, s.y, 0, s.w, s.d, h0, { side: T.facade, Px: mkG(seed, s.fx || []), Py: mkG(seed + 100, s.fy || []), noTop: true });
    B.box(s.x - 0.05, s.y - 0.05, 0, s.w + 0.1, s.d + 0.1, 0.16, { side: T.facade, P: { mat: 'stone', seed: seed + 3, tint: 0x8a857c }, top: T.flat(0x9a958a) });   // plinth
    const trim = (f, face, i) => {
      const a = face === 'y' ? s.x + f.x * s.w : Y1 - f.x * s.d, wall = face === 'y' ? Y1 : X1, hw = f.w / 64;
      if (f.k === 'win' || f.k === 'awin') { if (f.box !== false) B.planter(face, a, wall, (f.y - 8) / 40, hw * 2 + 0.24, seed * 7 + i * 3 + (face === 'y' ? 50 : 0)); return; }
      // door / shop / arch: step, lantern, POI
      if (face === 'y') { B.box(a - hw - 0.18, wall, 0, hw * 2 + 0.36, 0.26, 0.09, { side: T.facade, P: { mat: 'stone', seed: 5, tint: 0xa8a294 } }); B.poi(a, wall + 0.75, f.k === 'shop' ? 'shop' : 'door', 0, -1); }
      else { B.box(wall, a - hw - 0.18, 0, 0.26, hw * 2 + 0.36, 0.09, { side: T.facade, P: { mat: 'stone', seed: 5, tint: 0xa8a294 } }); B.poi(wall + 0.75, a, f.k === 'shop' ? 'shop' : 'door', -1, 0); }
      if (f.lamp !== false) B.lantern(face, a + (face === 'y' ? 1 : -1) * (hw + 0.42), wall, 1.25);
    };
    (s.fx || []).forEach((f, i) => trim(f, 'x', i)); (s.fy || []).forEach((f, i) => trim(f, 'y', i + 10));
    // upper floors: timber bays, windows with shutters + flower boxes
    let z = h0, w = s.w, d = s.d;
    for (let i = 0; i < floors; i++) {
      w = s.w + jet * (i + 1); d = s.d + jet * (i + 1);
      const mk = (len, face) => {
        const nb = Math.max(2, Math.round(len * 32 / 46)), kinds = [], feats = [], sd = seed * 31 + i * 7 + (face === 'y' ? 500 : 0);
        for (let b = 0; b < nb; b++) {
          const r = h2(sd + b, 3 + i), edge = b === 0 || b === nb - 1;
          const isWin = s.allWin ? (b % 2 === (nb % 2 ? 0 : (i & 1))) || nb < 4 : (edge ? r < 0.45 : r < 0.72);
          if (isWin) { kinds.push(5); const fx = (b + 0.5) / nb + 2 / (len * 32); feats.push({ k: 'win', x: fx, y: 20, w: 14, h: 24, shut: (len * 32 / nb) >= 38 ? sh : 0, sill: T.mul(beam, 1.25), curtain: [0xa84a3a, 0x4a6a9a, 0xd9c070, 0x6a8a5a][(sd + b) % 4] });
            const a = face === 'y' ? s.x + fx * len : s.y + d - fx * len;
            if (h2(sd + b, 9) < 0.75) B.planter(face, a, face === 'y' ? s.y + d : s.x + w, z + 13 / 40, 0.62, sd + b * 5);
          } else kinds.push(s.brace ? s.brace[(sd + b) % s.brace.length] : [1, 2, 3, 4, 6, 2, 3][(r * 97 | 0) % 7]);
        }
        return { mat: 'timber', seed: sd, plaster: pl, beam, kinds, feats, railY: 13 };
      };
      B.box(s.x, s.y, z, w, d, fh, { side: T.facade, Px: mk(d, 'x'), Py: mk(w, 'y'), noTop: true });
      // joist ends under the jetty
      if (jet > 0) { for (let x = s.x + 0.15; x < s.x + w - 0.1; x += 0.42) B.box(x, s.y + d - jet - 0.02, z - 0.13, 0.1, jet + 0.04, 0.13, { side: T.flat(T.mul(beam, 0.9)), noShadow: true });
        for (let y = s.y + 0.15; y < s.y + d - 0.1; y += 0.42) B.box(s.x + w - jet - 0.02, y, z - 0.13, jet + 0.04, 0.1, 0.13, { side: T.flat(T.mul(beam, 0.9)), noShadow: true }); }
      z += fh;
    }
    const axis = s.axis || 'x', span = axis === 'x' ? d : w, rise = s.rise || span * 0.64;
    const RP = { pal: s.roof || T.ROOF_RED, seed };
    const GP = { mat: s.gmat || 'timber', seed: seed + 7, plaster: pl, beam, shutter: sh, gfeat: s.gfeat, tint: s.tint, deco: seed % 2 === 0 };
    B.gable(s.x, s.y, z, w, d, rise, axis, { P: RP, GP, ov: 0.3 });
    if (s.chimney !== false) {
      const cw = 0.5, cx = axis === 'x' ? s.x + w * (0.22 + h2(seed, 1) * 0.5) : s.x + w * 0.5 + 0.4, cy = axis === 'x' ? s.y + d * 0.5 + 0.4 : s.y + d * (0.22 + h2(seed, 2) * 0.5);
      B.box(cx, cy, z, cw, cw, rise + 0.35, { side: T.facade, P: { mat: 'stone', seed: seed + 5, tint: 0x9a6a58 } });
      B.box(cx - 0.06, cy - 0.06, z + rise + 0.35, cw + 0.12, cw + 0.12, 0.1, { side: T.flat(0x7a6a60) });
      B.cyl(cx + 0.14, cy + 0.14, z + rise + 0.45, 0.09, 0.22, 6, T.flat(0xa8604a), {}); B.cyl(cx + 0.36, cy + 0.36, z + rise + 0.45, 0.09, 0.16, 6, T.flat(0x9a5440), {});
      B.smokes.push([cx + 0.2, cy + 0.2, z + rise + 0.75]);
    }
    if (s.dormer) for (const dp of [].concat(s.dormer)) {
      const dw = 1.0, dz = z + rise * 0.16, dh = 0.8, DP = { mat: 'timber', seed: seed + 31, plaster: pl, beam, kinds: [0], feats: [{ k: 'win', x: 0.5, y: 8, w: 12, h: 18, lit: true, sill: T.mul(beam, 1.25) }] }, DG = { mat: 'timber', seed: seed + 32, plaster: pl, beam };
      if (axis === 'x') { const dx = s.x + w * dp - dw / 2, dy = s.y + d * 0.5; B.box(dx, dy, dz, dw, d * 0.36, dh, { side: T.facade, P: DP, noTop: true }); B.gable(dx, dy, dz + dh, dw, d * 0.36, 0.55, 'y', { P: RP, GP: DG, ov: 0.12 }); }
      else { const dy = s.y + d * dp - dw / 2, dx = s.x + w * 0.5; B.box(dx, dy, dz, w * 0.36, dw, dh, { side: T.facade, P: DP, noTop: true }); B.gable(dx, dy, dz + dh, w * 0.36, dw, 0.55, 'x', { P: RP, GP: DG, ov: 0.12 }); }
    }
    B.block(s.x - 0.1, s.y - 0.1, s.w + 0.45, s.d + 0.45);
    return z;
  };
  B.awning = function (x, y, z, len, out, face, a, b) {
    const P = { a, b, w: 7, scallop: false, shade: true }, PV = { a, b, w: 7, scallop: true }, drop = 0.55, iron = T.flat(0x3a3038);
    if (face === 'y') {
      Q([x, y + out, z - drop], [len, 0, 0], [0, -out, drop], T.stripe, { P, n: norm([0, drop, out]) });
      Q([x, y + out, z - drop - 0.2], [len, 0, 0], [0, 0, 0.2], T.stripe, { P: PV, n: [0, 1, 0], cut: true, noShadow: true });
      for (const px of [x + 0.04, x + len - 0.1]) B.box(px, y, z - drop - 0.02, 0.05, out, 0.04, { side: iron, noShadow: true });
    } else {
      Q([x + out, y + len, z - drop], [0, -len, 0], [-out, 0, drop], T.stripe, { P, n: norm([drop, 0, out]) });
      Q([x + out, y + len, z - drop - 0.2], [0, -len, 0], [0, 0, 0.2], T.stripe, { P: PV, n: [1, 0, 0], cut: true, noShadow: true });
      for (const py of [y + 0.04, y + len - 0.1]) B.box(x, py, z - drop - 0.02, out, 0.05, 0.04, { side: iron, noShadow: true });
    }
  };

  /* ---------- props ---------- */
  const PROD = [[0xc8452f, 0xe0603a], [0xd9a441, 0xecc462], [0x6fa044, 0x8cba58], [0xd0a878, 0xb88a58], [0xe07a2a, 0xf0983a], [0x8a4a9a, 0xb06ac0], [0xe8dcc0, 0xd0c0a0], [0xb8323a, 0x7fa64a]];
  const wicker = (s, t) => { const X = Math.floor(s * 32), Y = Math.floor(t * 40); return ((X >> 1) + Y) & 1 ? 0xb08a50 : 0x8a6838; };
  B.basket = function (x, y, z, kind, r) {
    r = r || 0.17; const p = PROD[kind % PROD.length];
    B.cyl(x, y, z, r, 0.13, 8, wicker, { top: T.flat(0x6a4c2c), noShadow: z > 0.3 });
    for (let i = 0; i < 7; i++) { const a = i * 0.9, rr = i ? r * 0.55 : 0; E.blob([x + Math.cos(a) * rr, y + Math.sin(a) * rr, z + 0.15 + (i ? 0 : 0.05)], r * 0.36, (dx, dy, ix, iy) => (dx + dy < -0.5 ? p[1] : p[0]), { f: E.F_NOAO }); }
  };
  B.barrel = function (x, y, z, c) { B.cyl(x, y, z || 0, 0.27, 0.64, 10, T.barrel, { P: { c: c || 0x8a623e }, top: (s, t, q, a, b) => { const d = Math.hypot(a - 0.5, b - 0.5); return d > 0.42 ? 0x5a4a44 : T.woodTop(s, t, { P: { c: 0x74543a } }); } }); if (!z) B.blockC(x, y, 0.3); };
  B.crate = function (x, y, z, sz) { sz = sz || 0.5; B.box(x, y, z || 0, sz, sz, sz * 0.9, { side: T.wood, P: { c: 0x9a7448, crate: true }, top: T.woodTop, Ptop: { c: 0xa88254 } }); if (!z) B.block(x, y, sz, sz); };
  B.sack = function (x, y, z, c) { c = c || 0xc9b48a; const tex = (dx, dy, ix, iy) => mul(c, ((ix + iy) & 3) === 0 ? 0.9 : 0.97 + h2(ix, iy) * 0.06); E.blob([x, y, (z || 0) + 0.2], 0.24, tex); E.blob([x + 0.03, y + 0.03, (z || 0) + 0.43], 0.11, tex); E.blob([x + 0.03, y + 0.03, (z || 0) + 0.36], 0.07, () => 0x6a5030); };
  B.pot = function (x, y, c, s) { s = s || 1; B.cyl(x, y, 0, 0.2 * s, 0.14 * s, 8, T.flat(mul(c || 0xa8604a, 0.85)), {}); B.cyl(x, y, 0.14 * s, 0.25 * s, 0.2 * s, 8, T.flat(c || 0xa8604a), { top: T.dirt }); B.bush(x, y, { z: 0.3 * s, s: 0.95 * s, n: 3, noBlock: true, pal: T.LEAF_G, fp: 0.22 }); B.blockC(x, y, 0.28 * s); };
  B.lamp = function (x, y, h) {
    h = h || 2.3; const iron = T.flat(0x30303a), iron2 = T.flat(0x3e3e4a);
    B.cyl(x, y, 0, 0.16, 0.12, 8, iron2, { top: iron2 }); B.cyl(x, y, 0.12, 0.1, 0.3, 6, iron, {}); B.cyl(x, y, 0.42, 0.055, h - 0.5, 6, iron, {}); B.cyl(x, y, h - 0.14, 0.1, 0.06, 6, iron2, {});
    B.box(x - 0.3, y - 0.025, h - 0.3, 0.6, 0.05, 0.04, { side: iron, noShadow: true });
    B.box(x - 0.12, y - 0.12, h, 0.24, 0.24, 0.3, { side: (s, t) => { const X = Math.floor(s * 32); return (X === 0 || X === 7) ? 0x30303a : (0xffdc82 | (E.F_EMIS << 24)); }, top: iron, noShadow: true });
    B.pyramid(x - 0.17, y - 0.17, h + 0.3, 0.34, 0.34, 0.18, { tex: T.flat(0x30303a), P: {}, ov: 0 });
    E.addLight(x + 0.1, y + 0.1, h + 0.1, 5.4, null, 1.25); B.blockC(x, y, 0.2);
  };
  B.stall = function (x, y, w, d, face, a, b, seed) {
    const post = (px, py, hh) => B.box(px, py, 0, 0.1, 0.1, hh, { side: T.wood, P: { c: 0x6a4a34 } });
    const cloth = { a, b, w: 9 }, clothV = { a, b, w: 9, scallop: true };
    if (face === 'y') {
      post(x, y, 2.0); post(x + w - 0.1, y, 2.0); post(x, y + d - 0.1, 1.5); post(x + w - 0.1, y + d - 0.1, 1.5);
      B.box(x + 0.05, y + d * 0.3, 0, w - 0.1, d * 0.7, 0.6, { side: T.wood, P: { c: 0x8a6444 }, top: T.woodTop });
      for (let i = 0; i < Math.floor((w - 0.2) / 0.42); i++) for (let j = 0; j < 2; j++) B.basket(x + 0.3 + i * 0.42, y + d * 0.3 + 0.24 + j * 0.4, 0.6, seed + i * 3 + j);
      Q([x - 0.2, y + d + 0.4, 1.42], [w + 0.4, 0, 0], [0, -(d + 0.55), 0.62], T.stripe, { P: cloth, n: norm([0, 0.62, d + 0.55]) });
      Q([x - 0.2, y + d + 0.4, 1.22], [w + 0.4, 0, 0], [0, 0, 0.2], T.stripe, { P: clothV, n: [0, 1, 0], cut: true, noShadow: true });
      B.poi(x + w / 2, y + d + 0.65, 'stall', 0, -1);
    } else {
      post(x, y, 2.0); post(x, y + d - 0.1, 2.0); post(x + w - 0.1, y, 1.5); post(x + w - 0.1, y + d - 0.1, 1.5);
      B.box(x + w * 0.3, y + 0.05, 0, w * 0.7, d - 0.1, 0.6, { side: T.wood, P: { c: 0x8a6444 }, top: T.woodTop });
      for (let i = 0; i < Math.floor((d - 0.2) / 0.42); i++) for (let j = 0; j < 2; j++) B.basket(x + w * 0.3 + 0.24 + j * 0.4, y + 0.3 + i * 0.42, 0.6, seed + i * 3 + j);
      Q([x + w + 0.4, y + d + 0.2, 1.42], [0, -(d + 0.4), 0], [-(w + 0.55), 0, 0.62], T.stripe, { P: cloth, n: norm([0.62, 0, w + 0.55]) });
      Q([x + w + 0.4, y + d + 0.2, 1.22], [0, -(d + 0.4), 0], [0, 0, 0.2], T.stripe, { P: clothV, n: [1, 0, 0], cut: true, noShadow: true });
      B.poi(x + w + 0.65, y + d / 2, 'stall', -1, 0);
    }
    B.block(x, y, w, d);
  };
  B.bench = function (x, y, axis) {
    const w = axis === 'x' ? 1.2 : 0.36, d = axis === 'x' ? 0.36 : 1.2, leg = T.flat(0x5a4030);
    B.box(x, y, 0.22, w, d, 0.07, { side: T.wood, P: { c: 0x7a5a3c }, top: T.woodTop });
    B.box(x + 0.06, y + 0.06, 0, 0.1, 0.1, 0.22, { side: leg }); B.box(x + w - 0.16, y + d - 0.16, 0, 0.1, 0.1, 0.22, { side: leg });
    B.box(x + (axis === 'x' ? w - 0.16 : 0.06), y + (axis === 'x' ? 0.06 : d - 0.16), 0, 0.1, 0.1, 0.22, { side: leg });
    B.block(x, y, w, d);
  };
  B.cart = function (x, y) {
    const c = { c: 0x86603c };
    B.box(x, y, 0.32, 1.4, 0.8, 0.1, { side: T.wood, P: { c: 0x7a5636 }, top: T.woodTop });
    B.box(x, y, 0.42, 1.4, 0.06, 0.3, { side: T.wood, P: c }); B.box(x, y + 0.74, 0.42, 1.4, 0.06, 0.3, { side: T.wood, P: c }); B.box(x, y, 0.42, 0.06, 0.8, 0.3, { side: T.wood, P: c });
    const wheel = (s, t, q, a, b) => { const dx = a - 0.5, dy = b - 0.5, d = Math.sqrt(dx * dx + dy * dy); if (d > 0.5) return -1; if (d > 0.4) return d > 0.46 ? 0x3a3038 : 0x5a4030; if (d < 0.1) return 0x3a2c22; const an = Math.atan2(dy, dx) / 0.7854; return Math.abs(an - Math.round(an)) < 0.1 / d * 0.35 ? 0x7a5a40 : -1; };
    Q([x + 0.3, y + 0.86, 0], [0.66, 0, 0], [0, 0, 0.66], wheel, { n: [0, 1, 0], cut: true }); Q([x + 0.3, y - 0.06, 0], [0.66, 0, 0], [0, 0, 0.66], wheel, { n: [0, 1, 0], cut: true });
    Q([x + 1.4, y + 0.28, 0.36], [0.9, 0, -0.34], [0, 0.07, 0], T.wood, {}); Q([x + 1.4, y + 0.48, 0.36], [0.9, 0, -0.34], [0, 0.07, 0], T.wood, {});
    for (let i = 0; i < 4; i++) B.sack(x + 0.32 + (i % 2) * 0.48, y + 0.24 + (i >> 1) * 0.32, 0.4, i === 1 ? 0xb89a6a : 0xc9b48a);
    B.basket(x + 1.15, y + 0.4, 0.42, 4);
    B.block(x - 0.1, y - 0.1, 1.7, 1.05);
  };
  B.bunting = function (x0, y0, z0, x1, y1, z1, cols, sag) {
    const len = Math.hypot(x1 - x0, y1 - y0), n = Math.round(len / 0.3), ux = (x1 - x0) / len, uy = (y1 - y0) / len;
    const tri = c => (s, t, q, a, b) => (Math.abs(a - 0.5) * 2 > b ? -1 : b > 0.9 ? 0x4a3a30 : mul(c, 0.9 + a * 0.2));
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, z = z0 + (z1 - z0) * t - (sag || 0.5) * 4 * t * (1 - t);
      Q([x0 + (x1 - x0) * t - ux * 0.11, y0 + (y1 - y0) * t - uy * 0.11, z - 0.26], [ux * 0.22, uy * 0.22, 0], [0, 0, 0.26], tri(cols[i % cols.length]), { cut: true, noShadow: true, f: E.F_NOAO }); }
  };

  /* ---------- fountain ---------- */
  B.fountain = function (cx, cy) {
    const stone = { mat: 'stone', seed: 21, tint: 0xb4ada2 }, pale = (s, t, q) => T.mul(T.stoneAt(Math.floor(s * 32), Math.floor(t * 40) + 3, 22, 0xc4bdb0), 1.05);
    const panel = (s, t, q) => { const X = Math.floor(s * 32), Y = Math.floor(t * 40), Ht = Math.round(q.vl * 40), m = X % 22; if (Y >= Ht - 3) return T.mul(0xc4bdb0, Y === Ht - 1 ? 1.1 : 0.85); if (Y < 3) return 0x8f8a82; if (m < 2) return 0xbdb6a8; if (m === 2 || Y === 3 || m === 21 || Y === Ht - 4) return 0x8a857c; return T.mul(0xa9a297, 0.94 + h2(X >> 1, Y >> 1) * 0.1); };
    B.cyl(cx, cy, 0, 2.6, 0.14, 24, pale, { top: T.facade, P: stone });
    B.cyl(cx, cy, 0.14, 2.3, 0.5, 24, panel, { top: pale, inner: 0.87 });
    B.disk(cx, cy, 0.5, 2.02, (s, t) => T.water(s + cx, t + cy), { noShadow: true });
    B.cyl(cx, cy, 0, 0.8, 0.8, 12, pale, { top: pale }); B.cyl(cx, cy, 0.8, 0.55, 0.14, 10, pale, { top: pale });
    B.cyl(cx, cy, 0.94, 0.3, 0.9, 8, panel, {}); B.cyl(cx, cy, 1.84, 0.42, 0.1, 10, pale, {}); B.cyl(cx, cy, 1.94, 0.7, 0.1, 12, pale, {});
    B.cyl(cx, cy, 2.04, 1.0, 0.2, 16, panel, { top: pale, inner: 0.84 });
    B.disk(cx, cy, 2.18, 0.85, (s, t) => T.water(s + cx + 5, t + cy), { noShadow: true });
    B.cyl(cx, cy, 2.1, 0.18, 0.75, 6, pale, {}); B.cyl(cx, cy, 2.85, 0.42, 0.12, 10, pale, { top: pale, inner: 0.7 }); B.cyl(cx, cy, 2.9, 0.1, 0.35, 6, pale, {});
    E.blob([cx, cy, 3.3], 0.13, () => 0xd9b04a);
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283 + 0.4, r = 1.3; B.bush(cx + Math.cos(a) * r, cy + Math.sin(a) * r, { z: 0.52, s: 1.15 + h2(i, 4) * 0.45, n: 4, noBlock: true, pal: T.LEAF_G, fp: 0.16, flowers: i % 3 === 2 ? T.FLOWERS : T.BLOSSOM }); }
    for (let i = 0; i < 12; i++) { const a = i * 2.4, r = 1.6 + h2(i, 8) * 0.3; B.disk(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.51, 0.09 + h2(i, 2) * 0.04, (s, t, q, u, v) => (i % 3 ? (u > 0.5 && Math.abs(v - 0.5) < 0.12 ? 0x3a8a8c : 0x5a9a4a) : 0xf0a0b4), { noShadow: true, f: E.F_NOAO }); }
    B.jets.push({ x: cx, y: cy, z: 3.25, h: 2.4, bowl: 2.18, br: 1.0, basin: 0.5, top: 2.95 });
    B.blockC(cx, cy, 2.75);
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; B.poi(cx + Math.cos(a) * 3.2, cy + Math.sin(a) * 3.2, 'fountain', -Math.cos(a), -Math.sin(a)); }
    E.addLight(cx, cy, 1.4, 4.5, [0.5, 0.75, 0.9], 0.5);
  };
})();
