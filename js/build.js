'use strict';
/* Model builders: boxes, roofs, cylinders, houses, trees, props, castle parts. */
const B = {};
(function () {
  const Q = E.quad, h2 = E.h2, norm = E.norm, mul = T.mul;
  const FE = E.F_EMIS << 24;
  B.reset = function () { B.blocks = []; B.smokes = []; B.flags = []; B.pois = []; B.jets = []; B.flames = []; };
  B.reset();
  B.block = (x, y, w, d) => B.blocks.push([x, y, w, d]);
  B.blockC = (cx, cy, r) => B.blocks.push([cx - r, cy - r, r * 2, r * 2]);
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
    o = o || {}; const sc = o.s || 1, sd = seedc++ * 13, pl = o.pal || T.LEAF_G, fl = o.flowers === undefined ? T.BLOSSOM : o.flowers, fp = o.fp || 0.07;
    const tex = T.leaves(pl, fl, fp), th = 1.25 * sc;
    B.taper(x, y, 0, 0.21 * sc, x, y, th + 0.6 * sc, 0.09 * sc, 7, T.wood, { P: { c: 0x6b4a36 } });
    const R = (i) => h2(sd + i, i * 7 + 1);
    const bl = (dx, dy, dz, r, i) => E.blob([x + dx * sc, y + dy * sc, th + dz * sc], r * sc, tex, { seed: sd + i * 5 });
    bl(0, 0, 1.0, 0.95, 0);
    const n = o.n || 7;
    for (let i = 0; i < n; i++) {
      const a = i / n * 6.283 + R(i) * 0.8, rr = 0.55 + R(i + 9) * 0.45;
      bl(Math.cos(a) * rr, Math.sin(a) * rr, 0.45 + R(i + 20) * 0.95, 0.5 + R(i + 30) * 0.3, i + 1);
    }
    bl(0.1, -0.1, 1.75, 0.6, 20);
    B.blockC(x, y, 0.3);
  };
  B.bush = function (x, y, o) {
    o = o || {}; const sc = o.s || 1, sd = seedc++ * 17, tex = T.leaves(o.pal || T.LEAF_D, o.flowers === undefined ? T.FLOWERS : o.flowers, o.fp || 0.12), z = o.z || 0;
    const n = o.n || 3;
    for (let i = 0; i < n; i++) {
      const a = i / n * 6.283 + h2(sd, i), rr = n > 1 ? 0.22 * sc : 0;
      E.blob([x + Math.cos(a) * rr, y + Math.sin(a) * rr, z + 0.22 * sc + h2(sd + i, 3) * 0.12 * sc], (0.3 + h2(sd + i, 5) * 0.12) * sc, tex, { seed: sd + i * 3 });
    }
    if (!o.noBlock && z === 0) B.blockC(x, y, 0.3 * sc);
  };
  B.cypress = function (x, y, sc) {
    sc = sc || 1; const sd = seedc++ * 19, tex = T.leaves(T.LEAF_D, null, 0);
    B.cyl(x, y, 0, 0.1, 0.4, 5, T.wood, { P: { c: 0x5a3f2e } });
    for (let i = 0; i < 6; i++) E.blob([x, y, 0.5 + i * 0.42 * sc], (0.48 - i * 0.065) * sc, tex, { seed: sd + i });
    B.blockC(x, y, 0.3);
  };

  /* ---------- house ---------- */
  B.house = function (s) {
    const seed = s.seed || 1, h0 = s.h0 || 1.75, fh = s.fh || 1.6, floors = s.floors === undefined ? 2 : s.floors, jet = s.jetty === undefined ? 0.16 : s.jetty;
    const pl = s.plaster || 0xe6d3a6, beam = s.beam, sh = s.shutter;
    const baseMat = s.base || 'stone';
    const mk = (mat, sd, feats, extra) => Object.assign({ mat, seed: sd, plaster: pl, beam, shutter: sh, feats, tint: s.tint, bay: s.bay }, extra || {});
    let z = 0, w = s.w, d = s.d;
    B.box(s.x, s.y, 0, w, d, h0, { side: T.facade, Px: mk(baseMat, seed, s.fx || []), Py: mk(baseMat, seed + 100, s.fy || []), noTop: true });
    z = h0;
    for (let i = 0; i < floors; i++) {
      w = s.w + jet * (i + 1); d = s.d + jet * (i + 1);
      const m = s.upper || 'timber';
      B.box(s.x, s.y, z, w, d, fh, { side: T.facade, Px: mk(m, seed + 11 * (i + 1), s.ux && s.ux[i]), Py: mk(m, seed + 111 * (i + 1), s.uy && s.uy[i]), noTop: true });
      z += fh;
    }
    const axis = s.axis || 'x', span = axis === 'x' ? d : w, rise = s.rise || span * 0.62;
    const RP = { pal: s.roof || T.ROOF_RED, seed };
    const GP = mk(s.gmat || s.upper || 'timber', seed + 7, null, { gfeat: s.gfeat });
    if (s.hip) B.pyramid(s.x, s.y, z, w, d, rise, { P: RP, tex: s.rtex });
    else B.gable(s.x, s.y, z, w, d, rise, axis, { P: RP, GP, tex: s.rtex });
    if (s.chimney !== false) {
      const cw = 0.45, cx = axis === 'x' ? s.x + w * (0.25 + h2(seed, 1) * 0.5) : s.x + w * 0.5 + 0.35, cy = axis === 'x' ? s.y + d * 0.5 + 0.35 : s.y + d * (0.25 + h2(seed, 2) * 0.5);
      B.box(cx, cy, z, cw, cw, rise + 0.45, { side: T.facade, P: { mat: 'stone', seed: seed + 5, tint: 0x8a6a5a } });
      B.box(cx - 0.05, cy - 0.05, z + rise + 0.45, cw + 0.1, cw + 0.1, 0.1, { side: T.flat(0x6a5a52) });
      B.smokes.push([cx + cw / 2, cy + cw / 2, z + rise + 0.6]);
    }
    // dormer on the visible slope
    if (s.dormer) {
      const dw = 1.1, dz = z + rise * 0.18, dh = 0.75;
      if (axis === 'x') { const dx = s.x + w * s.dormer - dw / 2, dy = s.y + d * 0.5;
        B.box(dx, dy, dz, dw, d * 0.36, dh, { side: T.facade, P: mk('timber', seed + 31, [{ k: 'win', x: 0.5, y: 3, w: 6, h: 8, lit: true }], { plain: true }), noTop: true });
        B.gable(dx, dy, dz + dh, dw, d * 0.36, 0.55, 'y', { P: RP, GP: mk('timber', seed + 32, null, { plain: true }), ov: 0.12 });
      } else { const dy = s.y + d * s.dormer - dw / 2, dx = s.x + w * 0.5;
        B.box(dx, dy, dz, w * 0.36, dw, dh, { side: T.facade, P: mk('timber', seed + 31, [{ k: 'win', x: 0.5, y: 3, w: 6, h: 8, lit: true }], { plain: true }), noTop: true });
        B.gable(dx, dy, dz + dh, w * 0.36, dw, 0.55, 'x', { P: RP, GP: mk('timber', seed + 32, null, { plain: true }), ov: 0.12 });
      }
    }
    // lanterns + door POIs
    const lamp = (lx, ly) => { B.box(lx - 0.07, ly - 0.07, 1.25, 0.14, 0.14, 0.2, { side: T.emis(0xffd070), noShadow: true }); E.addLight(lx, ly, 1.3, 3.2, null, 0.9); };
    for (const f of (s.fx || [])) if (f.k !== 'win' && f.k !== 'awin' && f.k !== 'glass') {
      const py = s.y + s.d - f.x * s.d; lamp(s.x + s.w + 0.1, py + (f.w / 32 + 0.3)); B.poi(s.x + s.w + 0.7, py, f.k === 'shop' ? 'shop' : 'door', -1, 0);
    }
    for (const f of (s.fy || [])) if (f.k !== 'win' && f.k !== 'awin' && f.k !== 'glass') {
      const px = s.x + f.x * s.w; lamp(px + (f.w / 32 + 0.3), s.y + s.d + 0.1); B.poi(px, s.y + s.d + 0.7, f.k === 'shop' ? 'shop' : 'door', 0, -1);
    }
    B.block(s.x - 0.1, s.y - 0.1, s.w + 0.4, s.d + 0.4);
    return z;
  };
  /* awning over a wall: face 'x' or 'y' */
  B.awning = function (x, y, z, len, out, face, a, b) {
    const P = { a, b, w: 3, scallop: true }, drop = 0.5;
    if (face === 'y') {
      Q([x, y + out, z - drop], [len, 0, 0], [0, -out, drop], T.stripe, { P, n: norm([0, drop, out]), cut: true });
      Q([x, y + out, z - drop - 0.18], [len, 0, 0], [0, 0, 0.18], T.stripe, { P, n: [0, 1, 0], cut: true, noShadow: true });
    } else {
      Q([x + out, y + len, z - drop], [0, -len, 0], [-out, 0, drop], T.stripe, { P, n: norm([drop, 0, out]), cut: true });
      Q([x + out, y + len, z - drop - 0.18], [0, -len, 0], [0, 0, 0.18], T.stripe, { P, n: [1, 0, 0], cut: true, noShadow: true });
    }
  };

  /* ---------- props ---------- */
  const GOODS = [[0xc8452f, 0xd9643a], [0xd9a441, 0xe8c060], [0x6fa044, 0x8cba58], [0xc9a070, 0xb08a58], [0x8a9ab0, 0xa8b6c8], [0x8a4a9a, 0xb06ac0], [0xe07a2a, 0xf0983a]];
  B.goodsTex = function (seed) {
    return function (s, t, q) {
      const X = Math.floor(s * 16), Y = Math.floor(t * 16), cx = Math.floor(X / 7), cy = Math.floor(Y / 7), lx = X - cx * 7, ly = Y - cy * 7;
      const g = GOODS[(h2(cx + seed, cy) * GOODS.length) | 0];
      if (lx === 0 || ly === 0) return 0x6a4c34;
      if (lx === 1 || ly === 1 || lx === 6 || ly === 6) return 0x9a7650;
      return h2(X + seed, Y) < 0.5 ? g[0] : g[1];
    };
  };
  B.barrel = function (x, y, z, c) { B.cyl(x, y, z || 0, 0.27, 0.62, 8, T.barrel, { P: { c: c || 0x8a623e }, top: T.woodTop, Ptop: { c: 0x74543a } }); if (!z) B.blockC(x, y, 0.3); };
  B.crate = function (x, y, z, sz) { sz = sz || 0.5; B.box(x, y, z || 0, sz, sz, sz * 0.9, { side: T.wood, P: { c: 0x9a7448, crate: true }, top: T.woodTop, Ptop: { c: 0xa88254 } }); if (!z) B.block(x, y, sz, sz); };
  B.sack = function (x, y, z, c) { const tex = (dx, dy, ix, iy) => mul(c || 0xc9b48a, 0.94 + h2(ix, iy) * 0.1); E.blob([x, y, (z || 0) + 0.2], 0.24, tex); E.blob([x + 0.04, y + 0.04, (z || 0) + 0.42], 0.13, tex); };
  B.pile = function (x, y, c1, c2, n) { for (let i = 0; i < (n || 5); i++) { const a = i * 2.4, r = i ? 0.2 : 0; E.blob([x + Math.cos(a) * r, y + Math.sin(a) * r, 0.13 + (i === 0 ? 0.14 : 0)], 0.15, (dx, dy, ix, iy) => (h2(ix >> 1, iy >> 1) < 0.5 ? c1 : c2)); } };
  B.lamp = function (x, y, h) {
    h = h || 2.1;
    B.box(x - 0.09, y - 0.09, 0, 0.18, 0.18, 0.2, { side: T.flat(0x4a4a50) });
    B.box(x - 0.05, y - 0.05, 0.2, 0.1, 0.1, h - 0.2, { side: T.flat(0x35353c) });
    B.box(x - 0.13, y - 0.13, h, 0.26, 0.26, 0.28, { side: T.emis(0xffd67a), top: T.flat(0x2e2e34), noShadow: true });
    B.box(x - 0.17, y - 0.17, h + 0.28, 0.34, 0.34, 0.07, { side: T.flat(0x2e2e34), noShadow: true });
    E.addLight(x + 0.1, y + 0.1, h + 0.1, 5.2, null, 1.25);
    B.blockC(x, y, 0.2);
  };
  B.stall = function (x, y, w, d, face, a, b, seed) {
    const post = (px, py) => B.box(px, py, 0, 0.1, 0.1, 1.55, { side: T.wood, P: { c: 0x6a4a34 } });
    post(x, y); post(x + w - 0.1, y); post(x, y + d - 0.1); post(x + w - 0.1, y + d - 0.1);
    if (face === 'y') {
      B.box(x + 0.05, y + d * 0.35, 0, w - 0.1, d * 0.65, 0.62, { side: T.wood, P: { c: 0x8a6444 }, top: B.goodsTex(seed) });
      Q([x - 0.15, y + d + 0.35, 1.3], [w + 0.3, 0, 0], [0, -(d + 0.5), 0.65], T.stripe, { P: { a, b, w: 4 }, n: norm([0, 0.65, d + 0.5]) });
      Q([x - 0.15, y + d + 0.35, 1.12], [w + 0.3, 0, 0], [0, 0, 0.18], T.stripe, { P: { a, b, w: 4, scallop: true }, n: [0, 1, 0], cut: true, noShadow: true });
      B.poi(x + w / 2, y + d + 0.6, 'stall', 0, -1);
    } else {
      B.box(x + w * 0.35, y + 0.05, 0, w * 0.65, d - 0.1, 0.62, { side: T.wood, P: { c: 0x8a6444 }, top: B.goodsTex(seed) });
      Q([x + w + 0.35, y + d + 0.15, 1.3], [0, -(d + 0.3), 0], [-(w + 0.5), 0, 0.65], T.stripe, { P: { a, b, w: 4 }, n: norm([0.65, 0, w + 0.5]) });
      Q([x + w + 0.35, y + d + 0.15, 1.12], [0, -(d + 0.3), 0], [0, 0, 0.18], T.stripe, { P: { a, b, w: 4, scallop: true }, n: [1, 0, 0], cut: true, noShadow: true });
      B.poi(x + w + 0.6, y + d / 2, 'stall', -1, 0);
    }
    B.block(x, y, w, d);
  };
  B.bench = function (x, y, axis) {
    const w = axis === 'x' ? 1.2 : 0.35, d = axis === 'x' ? 0.35 : 1.2;
    B.box(x, y, 0.22, w, d, 0.07, { side: T.wood, P: { c: 0x7a5a3c }, top: T.woodTop });
    B.box(x + 0.05, y + 0.05, 0, 0.1, 0.1, 0.22, { side: T.flat(0x5a4030) }); B.box(x + w - 0.15, y + d - 0.15, 0, 0.1, 0.1, 0.22, { side: T.flat(0x5a4030) });
    B.block(x, y, w, d);
  };
  B.well = function (x, y) {
    B.cyl(x, y, 0, 0.62, 0.55, 10, T.facade, { P: { mat: 'stone', seed: 9 }, top: T.facade, inner: 0.72 });
    B.disk(x, y, 0.3, 0.46, T.flat(0x1f3a4a));
    B.box(x - 0.66, y - 0.05, 0, 0.1, 0.1, 1.5, { side: T.wood }); B.box(x + 0.56, y - 0.05, 0, 0.1, 0.1, 1.5, { side: T.wood });
    B.gable(x - 0.75, y - 0.45, 1.5, 1.5, 0.9, 0.5, 'x', { P: { pal: T.ROOF_BROWN, seed: 3 }, GP: { mat: 'timber', seed: 1, plain: true, plaster: 0x7a5a3c }, ov: 0.1 });
    B.blockC(x, y, 0.75);
  };
  B.cart = function (x, y) {
    B.box(x, y, 0.3, 1.3, 0.75, 0.1, { side: T.wood, P: { c: 0x7a5636 }, top: T.woodTop });
    B.box(x, y, 0.4, 1.3, 0.06, 0.3, { side: T.wood, P: { c: 0x86603c } }); B.box(x, y + 0.69, 0.4, 1.3, 0.06, 0.3, { side: T.wood, P: { c: 0x86603c } });
    B.box(x, y, 0.4, 0.06, 0.75, 0.3, { side: T.wood, P: { c: 0x86603c } });
    const wheel = (s, t, q, a, b) => { const dx = a - 0.5, dy = b - 0.5, d = dx * dx + dy * dy; if (d > 0.25) return -1; return d > 0.15 ? 0x4a3628 : d < 0.012 ? 0x2e2620 : (Math.abs(dx) < 0.06 || Math.abs(dy) < 0.06) ? 0x6a4c36 : -1; };
    Q([x + 0.3, y + 0.8, 0], [0.6, 0, 0], [0, 0, 0.6], wheel, { n: [0, 1, 0], cut: true });
    Q([x + 0.3, y - 0.05, 0], [0.6, 0, 0], [0, 0, 0.6], wheel, { n: [0, 1, 0], cut: true });
    Q([x + 1.3, y + 0.3, 0.33], [0.8, 0, -0.3], [0, 0.06, 0], T.wood, {}); Q([x + 1.3, y + 0.45, 0.33], [0.8, 0, -0.3], [0, 0.06, 0], T.wood, {});
    for (let i = 0; i < 4; i++) B.sack(x + 0.3 + (i % 2) * 0.45, y + 0.22 + (i >> 1) * 0.3, 0.38, i === 1 ? 0xb89a6a : 0xc9b48a);
    B.block(x - 0.1, y - 0.1, 1.6, 1.0);
  };
  B.fence = function (x0, y0, x1, y1) {
    const len = Math.hypot(x1 - x0, y1 - y0), n = Math.round(len / 0.8), ax = x1 !== x0;
    for (let i = 0; i <= n; i++) { const t = i / n; B.box(x0 + (x1 - x0) * t - 0.05, y0 + (y1 - y0) * t - 0.05, 0, 0.1, 0.1, 0.6, { side: T.flat(0x6a4c36) }); }
    for (const z of [0.2, 0.42]) ax ? B.box(Math.min(x0, x1), y0 - 0.02, z, len, 0.04, 0.07, { side: T.flat(0x7a5a40) }) : B.box(x0 - 0.02, Math.min(y0, y1), z, 0.04, len, 0.07, { side: T.flat(0x7a5a40) });
    ax ? B.block(Math.min(x0, x1), y0 - 0.1, len, 0.2) : B.block(x0 - 0.1, Math.min(y0, y1), 0.2, len);
  };
  B.sign = function (x, y, face, c) {       // hanging shop sign
    if (face === 'x') { B.box(x, y - 0.03, 2.25, 0.7, 0.06, 0.06, { side: T.flat(0x2e2e34), noShadow: true }); B.box(x + 0.15, y - 0.03, 1.75, 0.5, 0.06, 0.45, { side: T.flat(c), noShadow: true }); }
    else { B.box(x - 0.03, y, 2.25, 0.06, 0.7, 0.06, { side: T.flat(0x2e2e34), noShadow: true }); B.box(x - 0.03, y + 0.15, 1.75, 0.06, 0.5, 0.45, { side: T.flat(c), noShadow: true }); }
  };
  B.flowerbed = function (x, y, w, d) {
    B.box(x, y, 0, w, d, 0.22, { side: T.facade, P: { mat: 'stone', seed: 3 }, top: T.dirt });
    const n = Math.round(w * d * 5);
    for (let i = 0; i < n; i++) B.bush(x + 0.2 + h2(i, 5 + x) * (w - 0.4), y + 0.2 + h2(i, 9 + y) * (d - 0.4), { s: 0.7, n: 1, z: 0.2, fp: 0.3 });
    B.block(x, y, w, d);
  };

  /* ---------- fountain ---------- */
  B.fountain = function (cx, cy) {
    const stone = { mat: 'stone', seed: 21, tint: 0xb0aaa0 };
    B.cyl(cx, cy, 0, 2.45, 0.16, 20, T.facade, { P: stone, top: T.facade });
    B.cyl(cx, cy, 0.16, 2.2, 0.42, 20, T.facade, { P: stone, top: T.facade, inner: 0.86 });
    B.disk(cx, cy, 0.44, 1.92, (s, t, q) => T.water(s + cx, t + cy), { noShadow: true });
    B.cyl(cx, cy, 0, 0.75, 0.75, 10, T.facade, { P: stone, top: T.facade });
    B.cyl(cx, cy, 0.75, 0.42, 0.35, 8, T.facade, { P: stone, top: T.facade });
    B.cyl(cx, cy, 1.1, 0.26, 0.75, 8, T.facade, { P: stone });
    B.cyl(cx, cy, 1.85, 0.5, 0.1, 10, T.facade, { P: stone });
    B.cyl(cx, cy, 1.95, 0.85, 0.16, 12, T.facade, { P: stone, top: T.facade, inner: 0.82 });
    B.disk(cx, cy, 2.07, 0.7, (s, t, q) => T.water(s + cx + 5, t + cy), { noShadow: true });
    B.cyl(cx, cy, 2.0, 0.16, 0.7, 6, T.facade, { P: stone });
    B.cyl(cx, cy, 2.7, 0.3, 0.1, 8, T.facade, { P: stone, top: T.facade });
    // planters in the basin
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * 6.283 + 0.4, r = 1.25;
      B.bush(cx + Math.cos(a) * r, cy + Math.sin(a) * r, { z: 0.5, s: 1.05 + h2(i, 4) * 0.4, n: 3, noBlock: true, pal: T.LEAF_G, fp: 0.2, flowers: T.BLOSSOM });
    }
    for (let i = 0; i < 9; i++) { const a = i * 2.4, r = 1.55 + h2(i, 8) * 0.25; B.disk(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.455, 0.1, T.flat(i % 3 ? 0x5a9a4a : 0xe88aa0), { noShadow: true }); }
    B.jets.push({ x: cx, y: cy, z: 2.8, h: 2.6, bowl: 2.07, br: 0.8, basin: 0.44 });
    B.blockC(cx, cy, 2.6);
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; B.poi(cx + Math.cos(a) * 3.1, cy + Math.sin(a) * 3.1, 'fountain', -Math.cos(a), -Math.sin(a)); }
    E.addLight(cx, cy, 1.4, 4.5, [0.5, 0.75, 0.9], 0.5);
  };

  /* ---------- castle parts ---------- */
  const CS = (seed, extra) => Object.assign({ mat: 'stone', seed, tint: 0xa8a49c }, extra || {});
  B.CS = CS;
  B.merlonsX = function (x0, x1, y, z, t) { for (let x = x0; x < x1 - 0.2; x += 0.62) B.box(x, y, z, 0.34, t || 0.25, 0.36, { side: T.facade, P: CS(4) }); };
  B.merlonsY = function (y0, y1, x, z, t) { for (let y = y0; y < y1 - 0.2; y += 0.62) B.box(x, y, z, t || 0.25, 0.34, 0.36, { side: T.facade, P: CS(5) }); };
  B.wallX = function (x0, x1, y, h, th, feats) {      // wall running along x
    th = th || 1;
    B.box(x0, y, 0, x1 - x0, th, h, { side: T.facade, Py: CS(31, { feats, band: 0 }), Px: CS(32), top: (s, t) => T.flag(s, t, 8, 0x9a958c, 0x8f8a82) });
    B.merlonsX(x0, x1, y + th - 0.25, h); B.merlonsX(x0, x1, y, h);
    B.block(x0, y, x1 - x0, th);
  };
  B.wallY = function (y0, y1, x, h, th, feats) {
    th = th || 1;
    B.box(x, y0, 0, th, y1 - y0, h, { side: T.facade, Px: CS(33, { feats }), Py: CS(34), top: (s, t) => T.flag(s, t, 8, 0x9a958c, 0x8f8a82) });
    B.merlonsY(y0, y1, x + th - 0.25, h); B.merlonsY(y0, y1, x, h);
    B.block(x, y0, th, y1 - y0);
  };
  const slit = (X, Y) => (Y >= 0 && Y < 9 && Math.abs(X) < 1) ? 0x1d1924 : (Y >= -1 && Y < 10 && Math.abs(X) < 2) ? 0xb0a898 : -2;
  B.towerTex = function (seed, levels, lit) {
    return function (s, t, q) {
      const X = Math.floor(s * 16), Y = Math.floor(t * 20), Ht = Math.round(q.vl * 20);
      const cell = Math.floor(X / 26), lx = X - cell * 26 - 13;
      for (const ly of levels) { if (lit && Y >= ly && Y < ly + 8 && Math.abs(lx + 0.5) < 2.2 && h2(cell + seed, ly) < 0.6) { return (Y - ly > 5 && Math.abs(lx + 0.5) > 1.2) ? T.stoneAt(X, Y, seed, 0xa8a49c) : (0x2a2638 | (E.F_WIN << 24)); } const c = slit(lx, Y - ly); if (c !== -2 && h2(cell + seed, ly) < 0.6) return c; }
      if (Y >= Ht - 2) return 0xb4ad9e;
      return T.stoneAt(X, Y, seed, 0xa8a49c);
    };
  };
  B.roundTower = function (cx, cy, r, h, o) {
    o = o || {}; const n = o.n || 14, seed = o.seed || 7;
    B.cyl(cx, cy, 0, r, h, n, B.towerTex(seed, o.levels || [28, 68, 108, 148], o.lit), {});
    B.cyl(cx, cy, h, r + 0.18, 0.55, n, B.towerTex(seed + 1, []), { top: (s, t) => T.flag(s, t, 8, 0x9a958c, 0x8f8a82) });
    if (o.roof) {
      B.cyl(cx, cy, h + 0.55, r - 0.05, 0.5, n, B.towerTex(seed + 2, [1], true), {});
      B.cone(cx, cy, h + 1.05, r + 0.3, o.roofH || r * 2.4, n, T.roof, { P: { pal: o.roof, seed } });
      B.flags.push({ x: cx, y: cy, z: h + 1.05 + (o.roofH || r * 2.4), c: o.flag || 0xc23b3b });
    } else {
      const m = Math.round(n * 0.8);
      for (let i = 0; i < m; i++) { const a = i / m * 6.283, rr = r + 0.05; B.box(cx + Math.cos(a) * rr - 0.15, cy + Math.sin(a) * rr - 0.15, h + 0.55, 0.3, 0.3, 0.36, { side: T.facade, P: CS(6) }); }
      if (o.flag) B.flags.push({ x: cx, y: cy, z: h + 0.55, c: o.flag, pole: 1.6 });
    }
    B.blockC(cx, cy, r + 0.1);
  };
  B.banner = function (x, y, z, face, c1, c2, len) {   // hanging wall banner
    len = len || 1.6;
    const tex = (s, t, q) => { const X = Math.floor(s * 16), Y = Math.floor(t * 20), Wt = Math.round(q.ul * 16), Ht = Math.round(q.vl * 20);
      if (Y < 4 && Math.abs(X - Wt / 2 + 0.5) > Y * Wt / 8 + 0.5) return -1;
      if (X === 0 || X === Wt - 1 || Y >= Ht - 2) return c2;
      const dx = Math.abs(X - Wt / 2 + 0.5), dy = Math.abs(Y - Ht * 0.6);
      if (dx + dy * 0.8 < 3) return c2;
      return mul(c1, 0.92 + h2(X, Y) * 0.1); };
    if (face === 'x') Q([x + 0.05, y + 0.3, z - len], [0, -0.6, 0], [0, 0, len], tex, { n: [1, 0, 0], cut: true, noShadow: true, bias: 0.05 });
    else Q([x - 0.3, y + 0.05, z - len], [0.6, 0, 0], [0, 0, len], tex, { n: [0, 1, 0], cut: true, noShadow: true, bias: 0.05 });
  };
  B.torch = function (x, y, z, face) {
    if (face === 'x') B.box(x, y - 0.04, z, 0.22, 0.08, 0.08, { side: T.flat(0x3a3038), noShadow: true });
    else B.box(x - 0.04, y, z, 0.08, 0.22, 0.08, { side: T.flat(0x3a3038), noShadow: true });
    const fx = face === 'x' ? x + 0.2 : x, fy = face === 'x' ? y : y + 0.2;
    B.flames.push({ x: fx, y: fy, z: z + 0.1, s: 1 });
    E.addLight(fx + 0.15, fy + 0.15, z + 0.3, 4.6, [1.0, 0.62, 0.26], 1.2);
  };
  B.brazier = function (x, y) {
    B.cyl(x, y, 0, 0.12, 0.7, 6, T.flat(0x35353c), {});
    B.cyl(x, y, 0.7, 0.3, 0.18, 8, T.flat(0x4a4a52), { top: T.emis(0xff9a3a) });
    B.flames.push({ x, y, z: 0.9, s: 1.6 });
    E.addLight(x, y, 1.3, 5.5, [1.0, 0.6, 0.25], 1.4);
    B.blockC(x, y, 0.35);
  };
  B.column = function (x, y, h, r) {
    r = r || 0.34; const P = { mat: 'stone', seed: 12, tint: 0xc0b8a8 };
    B.box(x - r - 0.14, y - r - 0.14, 0, 2 * r + 0.28, 2 * r + 0.28, 0.3, { side: T.facade, P });
    B.cyl(x, y, 0.3, r, h - 0.6, 10, (s, t) => { const X = Math.floor(s * 16); return mul(0xb8b0a2, (X % 3 === 0 ? 0.86 : 1) ); }, {});
    B.box(x - r - 0.14, y - r - 0.14, h - 0.3, 2 * r + 0.28, 2 * r + 0.28, 0.3, { side: T.facade, P });
    B.blockC(x, y, r + 0.2);
  };
})();
