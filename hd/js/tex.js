'use strict';
/* High-detail procedural textures: 32 texels per world unit horizontally, 40 vertically. */
const T = {};
(function () {
  const h2 = E.h2, FW = E.F_WIN << 24, FE = E.F_EMIS << 24, FWA = E.F_WATER << 24;
  const U = 32, V = 40, RV = 34;
  const hx = s => parseInt(s.slice(1), 16), pal = a => a.map(hx);
  function mul(c, f) { let r = (c >> 16 & 255) * f, g = (c >> 8 & 255) * f, b = (c & 255) * f; if (r > 255) r = 255; if (g > 255) g = 255; if (b > 255) b = 255; return (r << 16) | (g << 8) | (b | 0); }
  function mix(a, b, t) { const r = (a >> 16 & 255) * (1 - t) + (b >> 16 & 255) * t, g = (a >> 8 & 255) * (1 - t) + (b >> 8 & 255) * t, bl = (a & 255) * (1 - t) + (b & 255) * t; return (r << 16) | (g << 8) | (bl | 0); }
  function vn(x, y) { const xi = Math.floor(x), yi = Math.floor(y); let fx = x - xi, fy = y - yi; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); const a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1); return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; }
  const fbm = (x, y) => vn(x, y) * 0.55 + vn(x * 2.3 + 9, y * 2.3 + 4) * 0.3 + vn(x * 5.1 + 3, y * 5.1 + 7) * 0.15;
  T.hx = hx; T.mul = mul; T.mix = mix; T.vn = vn; T.fbm = fbm; T.pal = pal; T.flat = c => () => c; T.emis = c => () => c | FE;

  /* ================= GROUND ================= */
  const STONE = pal(['#aaa59c', '#9b9790', '#b6b0a4', '#8e8c89', '#9c99a3', '#ad a190'.replace(' ', ''), '#95928b', '#a79d94', '#8f939a']);
  const GROUT = hx('#56545f'), MOSS = hx('#5c7743'), MOSS2 = hx('#78944e');
  function stoneShade(c, lx, ly, w, h, r, big, tx, ty) {
    let f = 0.84 + big * 0.3;
    if (lx === 1 || ly === h - 1) f *= 1.09; else if (lx === w - 1 || ly === 1) f *= 0.88;
    if (lx === 2 && ly === h - 2) f *= 1.06;
    const sp = h2(tx, ty); if (sp < 0.05) f *= 0.9; else if (sp > 0.96) f *= 1.07;
    if (r > 0.86 && Math.abs((lx - ly) - ((r * 40 | 0) % 3)) < 1) f *= 0.82;       // crack
    return mul(c, f);
  }
  T.cobble = function (x, y) {
    const tx = Math.floor(x * U), ty = Math.floor(y * U);
    const row = Math.floor(ty / 6), off = ((row & 1) ? 4 : 0) + (h2(row, 91) * 4 | 0);
    const col = Math.floor((tx + off) / 8), lx = tx + off - col * 8, ly = ty - row * 6;
    const big = fbm(x * 0.3, y * 0.3), r = h2(col, row);
    const narrow = h2(col, row + 500) < 0.3;
    const corner = (lx === 1 || lx === (narrow ? 6 : 7)) && (ly === 1 || ly === 5);
    if (lx === 0 || ly === 0 || (narrow && lx === 7) || corner) {
      const m = fbm(x * 0.9 + 7, y * 0.9);
      if (m > 0.6 && h2(tx, ty) < (m - 0.6) * 5) return h2(ty, tx) < 0.5 ? MOSS : MOSS2;
      return mul(GROUT, (corner ? 1.15 : 0.9) + big * 0.25);
    }
    let c = STONE[(r * STONE.length) | 0];
    const warm = fbm(x * 0.17 + 40, y * 0.17); if (warm > 0.6) c = mix(c, 0xb39f84, (warm - 0.6) * 1.6);
    return stoneShade(c, lx, ly, narrow ? 7 : 8, 6, r, big, tx, ty);
  };
  T.radial = function (x, y, cx, cy) {
    const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy) * U;
    const ring = Math.floor(r / 7), lr = r - ring * 7, circ = 6.2832 * (ring * 7 + 3.5), n = Math.max(6, Math.round(circ / 10));
    const an = (Math.atan2(dy, dx) + 3.14159) / 6.2832 * n + ring * 0.37, ci = Math.floor(an), la = (an - ci) * circ / n, lw = circ / n;
    const big = fbm(x * 0.3, y * 0.3), tx = Math.floor(x * U), ty = Math.floor(y * U);
    if (lr < 1.1 || la < 1.1) return mul(GROUT, 0.9 + big * 0.25);
    let c = STONE[(h2(ci + ring * 31, ring) * STONE.length) | 0], f = 0.88 + big * 0.26;
    if (ring % 5 === 0) c = mix(c, 0xc2aa88, 0.55); else if (ring % 5 === 1) c = mix(c, 0x7f8794, 0.25);
    if (lr > 5.6 || la < 2.2) f *= 1.08; else if (lr < 2.2 || la > lw - 1.2) f *= 0.9;
    const sp = h2(tx, ty); if (sp < 0.05) f *= 0.9;
    return mul(c, f);
  };
  const GRASS = pal(['#3f7a36', '#4a8a3a', '#57983f', '#63a546', '#72b24e']);
  const FLOW = pal(['#f4ecd6', '#eccb4c', '#de6f90', '#cf4d4d', '#b99be4']);
  T.grass = function (x, y) {
    const tx = Math.floor(x * U), ty = Math.floor(y * U), n = fbm(x * 0.45, y * 0.45), r = h2(tx, ty >> 1);
    let i = Math.min(4, Math.max(0, (n * 4.6 + (h2(tx >> 1, ty >> 2) - 0.5) * 1.5) | 0));
    const fc = h2(tx >> 1, (ty >> 1) + 77);
    if (fc < 0.008) return (tx & 1) === (ty & 1) ? FLOW[(h2(tx >> 1, ty >> 1) * 5) | 0] : 0xf4e27a;
    if (r < 0.07) i = Math.min(4, i + 1); else if (r > 0.94) i = Math.max(0, i - 1);
    return GRASS[i];
  };
  const DIRT = pal(['#84694b', '#8e7352', '#9b7f5c', '#a88b66', '#b39872']);
  T.dirt = function (x, y) {
    const tx = Math.floor(x * U), ty = Math.floor(y * U), n = fbm(x * 0.8, y * 0.8), r = h2(tx, ty);
    let c = DIRT[Math.min(4, (n * 4 + r * 1.2) | 0)];
    const p = h2(tx >> 1, ty >> 1); if (p < 0.02) c = (tx & 1) ? 0x77726c : 0x8f8a84;
    return c;
  };
  T.planks = function (x, y, base) {
    const tx = Math.floor(x * U), ty = Math.floor(y * U), p = Math.floor(ty / 7), ly = ty - p * 7, off = (h2(p, 3) * 40) | 0, seg = Math.floor((tx + off) / 48);
    if (ly === 0 || (tx + off) % 48 === 0) return mul(base, 0.55);
    return mul(base, (ly === 6 ? 1.06 : 0.9) + h2(p, seg) * 0.18 + (h2(tx >> 3, ty) < 0.15 ? -0.07 : 0));
  };
  T.water = function (x, y) {
    const n = fbm(x * 1.4, y * 1.4), m = vn(x * 6, y * 6);
    return (n > 0.6 ? 0x56b8ae : n > 0.48 ? 0x45a6a2 : n > 0.36 ? 0x3a9698 : 0x2f8590) + (m > 0.8 ? 0x0a0a08 : 0) | FWA;
  };

  /* ================= WALL MATERIALS ================= */
  const SBLOCK = pal(['#9e988c', '#8f8a80', '#aba495', '#847f77', '#98928c', '#a69d8a', '#8b8d92', '#b0a58f']);
  const MORTAR = hx('#58544e');
  function stoneAt(X, Y, seed, tint) {
    const rh = 8, row = Math.floor(Y / rh), ly = Y - row * rh;
    const off = (h2(row, seed) * 6) | 0, cx = X + off, c = Math.floor(cx / 6), lx = cx - c * 6;
    const bnd = k => (((k % 3) + 3) % 3 === 0) || h2(k + seed * 13, row) < 0.45;
    let c0 = c; while (!bnd(c0)) c0--;
    let c1 = c + 1; while (!bnd(c1)) c1++;
    const bx = lx + (c - c0) * 6, bw = (c1 - c0) * 6;
    if (bx === 0 || ly === 0) return mul(MORTAR, 0.9 + h2(X, Y) * 0.2);
    const r = h2(c0 + seed * 7, row);
    let col = SBLOCK[(r * SBLOCK.length) | 0], f = 0.92 + h2(X + seed, Y) * 0.1;
    if (ly === rh - 1 || bx === 1) f *= 1.09; else if (ly === 1 || bx === bw - 1) f *= 0.87;
    if (r > 0.8 && h2(X >> 1, Y >> 1) < 0.25) f *= 0.9;                         // rough block
    if (h2(c0, row + 99) < 0.12 && Math.abs(bx - bw / 2 - (ly - 4) * 0.7) < 1) f *= 0.75;   // crack
    if (Y < 7 && h2(X >> 1, Y) < 0.55 - Y * 0.06) col = mix(col, 0x5d6a45, 0.5);
    if (tint) col = mix(col, tint, 0.35);
    return mul(col, f);
  }
  T.stoneAt = stoneAt;
  const BEAM = hx('#4d3528');
  // beam with grain; `a` = position across the beam (0..w-1), `l` = along
  function beamAt(a, l, w, c) {
    let f = a === 0 ? 0.74 : a === w - 1 ? 0.82 : a === 1 ? 1.14 : 1;
    f *= 0.92 + h2(a, l >> 3) * 0.16; if (h2(a + 5, l >> 2) < 0.08) f *= 0.84;
    return mul(c || BEAM, f);
  }
  const BRICK = pal(['#a8644a', '#96553f', '#b47354', '#8a4c3a']);
  function plasterAt(X, Y, seed, c) {
    const n = fbm(X * 0.06 + seed * 3.1, Y * 0.06), n2 = fbm(X * 0.02 + seed, Y * 0.035 + 5);
    if (n2 > 0.74 && n > 0.5) { // exposed brick where plaster has fallen
      const row = Math.floor(Y / 4), bx = (X + (row & 1) * 4) % 8; if (bx === 0 || Y % 4 === 0) return 0x6e5a4c; return BRICK[(h2((X + (row & 1) * 4) >> 3, row) * 4) | 0];
    }
    let f = n > 0.68 ? 0.88 : n > 0.55 ? 0.94 : n > 0.36 ? 1 : 1.05;
    const cr = Math.abs(vn(X * 0.045 + seed, Y * 0.045 + 3) - 0.5); if (cr < 0.012 && n2 > 0.5) f *= 0.74;            // hairline cracks
    if (h2(X + seed, Y) < 0.03) f *= 0.92;
    f *= 0.93 + 0.07 * Math.min(1, Y / 26);       // grime near the bottom
    return mul(mix(c, 0xc9a67c, n2 * 0.25), f);
  }
  const GL = pal(['#1f2838', '#2b384f', '#3d5270', '#5b7a9c', '#8fb0c8']);
  const LEADC = hx('#1a1e28');
  /* window: frame, sill, leaded panes, optional shutters / arch / curtains */
  function windowAt(X, Y, x0, y0, ww, wh, o) {
    const dx = X - x0, dy = Y - y0;
    if (dy < -5 || dy > wh + 3 || dx < -11 || dx > ww + 10) return -2;
    if (o.shut && dy >= -1 && dy <= wh && ((dx >= -10 && dx <= -4) || (dx >= ww + 3 && dx <= ww + 9))) {
      const sx = dx < 0 ? dx + 10 : dx - ww - 3;
      if (sx === 0 || sx === 6 || dy === -1 || dy === wh) return mul(o.shut, 0.62);
      if (dy === (wh >> 1)) return mul(o.shut, 0.7);
      return mul(o.shut, (dy % 3 === 0 ? 0.78 : dy % 3 === 1 ? 1.08 : 0.95));
    }
    if (dy >= -5 && dy <= -3 && dx >= -4 && dx <= ww + 3) return mul(o.sill || 0xb8ae9c, dy === -3 ? 1.1 : dy === -5 ? 0.7 : 0.92);
    if (dx < -2 || dx > ww + 1 || dy < -2 || dy > wh + 1) return -2;
    let onFrame = dx < 0 || dx >= ww || dy < 0 || dy >= wh;
    if (o.arch) {
      const hw = ww / 2, cy = wh - hw, ex = dx + 0.5 - hw, ey = dy + 0.5 - cy;
      if (ey > 0) { const d = ex * ex + ey * ey; if (d > (hw + 2) * (hw + 2)) return -2; onFrame = d > hw * hw; }
    }
    if (onFrame) { const inner = dx === -1 || dx === ww || dy === -1 || dy === wh; return mul(o.frame, inner ? 1.25 : (dy < 0 || dx > ww) ? 0.8 : 1); }
    const mx = ww >> 1;
    if (dx === mx - 1 || dx === mx) return mul(o.frame, dx === mx ? 0.85 : 1.2);
    const tr = Math.round(wh * 0.62); if (dy === tr || dy === tr - 1) return mul(o.frame, dy === tr ? 1.2 : 0.85);
    const lit = o.lit ? FW : 0;
    if (o.curtain && (dx < 3 || dx >= ww - 3) && dy > 3) return mul(o.curtain, 0.75 + ((dx + (dy >> 2)) & 1) * 0.15) | lit;
    if ((dx + dy) % 5 === 0 || (dx - dy + 100) % 5 === 0) return LEADC | lit;
    const g = (ww - dx) + dy + ((o.seed * 7) % 9), k = g > ww + wh - 6 ? 4 : g > ww + wh - 14 ? 3 : g % 13 < 3 ? 2 : g % 13 < 7 ? 1 : 0;
    return GL[k] | lit;
  }
  /* door / arch.  kind: door | open | gothic | shop */
  function doorAt(X, Y, xc, w, h, kind, o) {
    const dx = X + 0.5 - xc, hw = w / 2, tw = 4;
    if (Math.abs(dx) > hw + tw || Y > h + tw + 1) return -2;
    let inside, edge, ang = 0;
    if (kind === 'gothic') {
      const sp = h - w * 0.85;
      if (Y < sp) { inside = Math.abs(dx) <= hw; edge = Math.abs(dx) <= hw + tw; ang = Y; }
      else { const ey = Y - sp, R = w * 1.05, a = dx + hw - R, b = dx - hw + R; inside = a * a + ey * ey <= R * R && b * b + ey * ey <= R * R;
        const R2 = R + tw, a2 = dx + hw + tw - R2, b2 = dx - hw - tw + R2; edge = a2 * a2 + ey * ey <= R2 * R2 && b2 * b2 + ey * ey <= R2 * R2; ang = sp + Math.atan2(ey, Math.abs(dx) + 1) * 30; }
    } else if (kind === 'shop') { inside = Math.abs(dx) <= hw && Y <= h; edge = Math.abs(dx) <= hw + 3 && Y <= h + 4; ang = Math.abs(dx) > hw ? Y : X; }
    else {
      const sp = h - hw;
      if (Y < sp) { inside = Math.abs(dx) <= hw; edge = Math.abs(dx) <= hw + tw; ang = Y; }
      else { const ey = Y - sp; inside = dx * dx + ey * ey <= hw * hw; edge = dx * dx + ey * ey <= (hw + tw) * (hw + tw); ang = sp + Math.atan2(ey, Math.abs(dx)) * hw * 1.3; }
    }
    if (!edge) return -2;
    if (!inside) {
      if (o.trim === undefined) return -2;
      const seg = Math.floor(ang / 7), key = kind !== 'shop' && Math.abs(dx) < 3 && Y > h - 2;
      if (Math.floor(ang) % 7 === 0 && kind !== 'shop') return mul(o.trim, 0.66);
      return mul(o.trim, key ? 1.18 : ((seg & 1) ? 0.9 : 1.04) + h2(X >> 1, Y >> 1) * 0.08);
    }
    if (kind === 'door') {
      const px = Math.floor(dx + hw), dc = o.door || 0x5a3d2a;
      if (px % 5 === 0) return mul(dc, 0.55);
      if ((Y >= 9 && Y <= 11) || (Y >= h - hw - 5 && Y <= h - hw - 3)) return (px % 5 === 2 && Y % 2 === 0) ? 0x8a8a92 : (Y === 11 || Y === h - hw - 3) ? 0x4a4a54 : 0x2e2e36;
      if (Math.abs(px - Math.floor(w * 0.76)) <= 1 && Math.abs(Y - Math.floor(h * 0.45)) <= 1) return (px === Math.floor(w * 0.76) && Y === Math.floor(h * 0.45)) ? 0x6a5020 : 0xe0b84e;
      if (o.pane && Y > h * 0.62 && Y < h * 0.8 && Math.abs(dx) < hw * 0.5) return ((px + Y) % 4 === 0 ? LEADC : GL[2]) | FW;
      return mul(dc, (px % 5 === 1 ? 1.12 : 0.92) + h2(px, Y >> 3) * 0.14);
    }
    if (kind === 'shop') {
      const lit = o.lit ? FW : 0;
      if (Y <= 13) { if (Y === 13 || Y === 12) return Y === 13 ? 0x9a7650 : 0x6a4c34; const px = Math.floor(dx + hw); if (px % 12 === 0 || Y === 0 || Y === 11) return 0x4a3424; return mul(0x6a4a33, 0.92 + h2(px >> 2, Y >> 2) * 0.16); }
      if (Y <= 19) { const cx = Math.floor(X / 5), r = h2(cx, o.seed + 5), lx = X - cx * 5, ly = Y - 14; if (r < 0.8 && lx > 0 && (ly < 4 || (lx > 1 && lx < 4))) { const c = [0xd9a441, 0xc0452f, 0x7fa64a, 0xe6d5a8, 0xb5763a, 0xe07a2a][(r * 7.4) | 0]; return mul(c, ly > 2 ? 1.15 : lx === 4 ? 0.8 : 1); } }
      const sh = Y - 20;
      if (sh >= 0 && (sh % 11 === 9)) return 0x5a4030 | lit;
      if (sh >= 0 && sh % 11 > 4 && sh % 11 < 9) { const cx = Math.floor(X / 4), r = h2(cx, o.seed + (sh / 11 | 0) * 9); if (r < 0.6 && X % 4 !== 0) return [0x8a5a3a, 0xa8a8b0, 0xb89a5a, 0x6a8a5a, 0x9a4a3a][(r * 8) | 0] | lit; }
      return (Y > h - 5 ? 0x241c22 : 0x33272a) | lit;
    }
    const dk = Y < 4 ? 0x40363a : Y < 12 ? 0x2c2530 : Y < h * 0.6 ? 0x211c28 : 0x191520;
    if (o.grate && (Math.floor(dx + hw) % 6 === 0 || Y % 8 === 7) && Y > h * 0.55) return 0x3a3a44;
    return dk | (o.lit ? FW : 0);
  }
  const SG = pal(['#d24a4a', '#4a80d6', '#e2b84a', '#4fae6a', '#9a60d2', '#e27a3a', '#5fc3d9', '#f0e6c8']);
  function stainedAt(X, Y, xc, w, h, y0, seed) {
    const dx = X + 0.5 - xc, hw = w / 2, dy = Y - y0;
    if (dy < -3 || Math.abs(dx) > hw + 3) return -2;
    const sp = h - w * 0.85; let inside, edge;
    if (dy < sp) { inside = Math.abs(dx) <= hw; edge = true; }
    else { const ey = dy - sp, R = w * 1.05, a = dx + hw - R, b = dx - hw + R; inside = a * a + ey * ey <= R * R && b * b + ey * ey <= R * R;
      const R2 = R + 3, a2 = dx + hw + 3 - R2, b2 = dx - hw - 3 + R2; edge = a2 * a2 + ey * ey <= R2 * R2 && b2 * b2 + ey * ey <= R2 * R2; }
    if (!edge) return -2;
    if (!inside || dy < 0) return mul(0xbdb5a4, (dy < 0 || dx > 0) ? 0.82 : 1.05);
    const px = Math.floor(dx + hw), cols = w > 20 ? 3 : 2, cw = w / cols, ci = Math.floor(px / cw), lx = px - Math.floor(ci * cw);
    if (lx === 0 && ci > 0) return 0x2a2630;
    if (dy >= sp) { const rr = Math.hypot(dx, dy - sp - w * 0.2); if (Math.abs(rr - w * 0.22) < 1) return 0x2a2630; if (rr < w * 0.22) return mul(SG[(seed * 3) % SG.length], 0.8 + ((px + dy) % 3 === 0 ? 0.2 : 0)) | FW; }
    const pr = Math.floor(dy / 8), ly = dy - pr * 8, dm = Math.abs(lx - cw / 2) + Math.abs(ly - 4);
    if (ly === 7 || Math.abs(dm - 4) < 0.6) return 0x2a2630;
    const c = SG[(h2(ci + seed * 5 + (dm < 4 ? 50 : 0), pr + seed * 3) * SG.length) | 0];
    return mul(c, 0.7 + ((px + dy) % 3 === 0 ? 0.22 : 0)) | FW;
  }
  T.windowAt = windowAt;

  /* Facade.  P = { mat, seed, plaster, beam, tint, kinds:[per-bay brace kind], bay, feats:[...], band }
   * feats (texel units): {k:'win'|'awin'|'door'|'open'|'gothic'|'shop'|'glass', x:0..1, y, w, h, ...} */
  T.facade = function (s, t, q) {
    const P = q.P, X = Math.floor(s * U), Y = Math.floor(t * V), Wt = Math.round(q.ul * U), Ht = Math.round(q.vl * V), seed = P.seed | 0, beam = P.beam || BEAM;
    if (P.feats) for (let i = 0; i < P.feats.length; i++) {
      const f = P.feats[i], xc = Math.round(f.x * Wt);
      if (X < xc - 30 || X > xc + 30) continue;
      let c;
      if (f.k === 'win' || f.k === 'awin') c = windowAt(X, Y, xc - (f.w >> 1), f.y, f.w, f.h, { seed: seed + i, shut: f.shut, frame: f.frame || beam, sill: f.sill, arch: f.k === 'awin', curtain: f.curtain, lit: f.lit !== false && h2(seed + i, 77) < 0.78 });
      else if (f.k === 'glass') c = stainedAt(X, Y, xc, f.w, f.h, f.y, seed + i);
      else c = doorAt(X, Y, xc, f.w, f.h, f.k, { trim: f.trim, door: f.door, seed: seed + i, lit: f.lit, pane: f.pane, grate: f.grate });
      if (c !== -2) return c;
    }
    if (P.mat === 'stone') {
      let f = 1 - 0.2 * Math.max(0, 1 - Y / 16); if (Y > Ht - 4) f *= 0.88;
      if (P.band) { const b = Y % P.band; if (b >= P.band - 4) return mul(0xb9b1a0, (b === P.band - 1 ? 1.1 : b === P.band - 4 ? 0.7 : 0.95) + h2(X >> 2, Y) * 0.06); if (b === P.band - 5 || b === P.band - 6) f *= 0.82; }
      if (P.quoin && (X < 9 || X >= Wt - 9)) { const qr = Math.floor(Y / 10), big = (qr & 1) === (X < 9 ? 0 : 1), lim = big ? 9 : 6, ex = X < 9 ? X : Wt - 1 - X; if (ex < lim) return (Y % 10 === 0 || ex === lim - 1) ? mul(MORTAR, 1) : mul(0xb6ad9a, f * (0.94 + h2(qr, X < 9 ? 1 : 2) * 0.12) * (Y % 10 === 9 ? 1.08 : 1)); }
      return mul(stoneAt(X, Y, seed, P.tint), f);
    }
    // ---- half-timber ----
    const BW = 4;
    if (Y < BW) return beamAt(Y, X, BW, beam);
    if (Y >= Ht - BW) return beamAt(Y - (Ht - BW), X, BW, beam);
    const nbay = P.kinds ? P.kinds.length : Math.max(1, Math.round(Wt / (P.bay || 40)));
    const bay = Math.min(nbay - 1, Math.floor(X * nbay / Wt)), bx0 = Math.floor(bay * Wt / nbay), bx1 = Math.floor((bay + 1) * Wt / nbay), bx = X - bx0;
    if (bx < BW) { if ((Y === BW + 1 || Y === Ht - BW - 2) && bx > 0 && bx < 3) return 0x8a6a50; return beamAt(bx, Y, BW, beam); }
    if (X >= Wt - BW) return beamAt(X - (Wt - BW), Y, BW, beam);
    const iw = bx1 - bx0 - BW, ih = Ht - 2 * BW, ix = bx - BW, iy = Y - BW;
    const kind = P.kinds ? P.kinds[bay] : 0;
    if (kind >= 1 && kind <= 3) {
      const L = Math.hypot(iw, ih), d1 = (ix * ih - iy * iw) / L, d2 = (ix * ih - (ih - iy) * iw) / L;
      if (kind !== 3 && Math.abs(d1) < 2) return beamAt(Math.floor(d1 + 2), X + Y, BW, beam);
      if (kind !== 2 && Math.abs(d2) < 2) return beamAt(Math.floor(d2 + 2), X - Y + 400, BW, beam);
    } else if (kind === 4) {
      const m = ix - (iw >> 1) + 1; if (m >= -1 && m < 2) return beamAt(m + 1, Y, 3, beam);
      const r = iy - (ih >> 1); if (r >= -1 && r < 2) return beamAt(r + 1, X, 3, beam);
    } else if (kind === 5) {       // window bay: rail under + over the window
      const r1 = Y - (P.railY || 14); if (r1 >= 0 && r1 < 3) return beamAt(r1, X, 3, beam);
    } else if (kind === 6) {       // herringbone studs
      const m = (ix + 4) % 11; if (m < 2 && ix > 5 && ix < iw - 5) return beamAt(m, Y, 2, beam); const r = iy - Math.round(ih * 0.6); if (r >= 0 && r < 2) return beamAt(r, X, 2, beam);
    }
    let c = plasterAt(X, Y, seed + bay, P.plaster || 0xe6d3a6);
    if (Y >= Ht - BW - 3) c = mul(c, 0.8); else if (iy < 1) c = mul(c, 1.05);
    if (ix < 1) c = mul(c, 0.86);
    return c;
  };
  T.gable = function (s, t, q, a, b) {
    const P = q.P, X = Math.floor(s * U), Y = Math.floor(t * V), Wt = Math.round(q.ul * U), Ht = q.vl * V, seed = P.seed | 0;
    const top = (1 - Math.abs(2 * a - 1)) * Ht; if (Y > top) return -1;
    if (P.mat === 'stone') {
      const g = P.gfeat; let c = -2;
      if (g) c = g.k === 'glass' ? stainedAt(X, Y, Wt / 2, g.w, g.h, g.y, seed) : windowAt(X, Y, (Wt >> 1) - (g.w >> 1), g.y, g.w, g.h, { seed, frame: 0x4a4038, arch: true, lit: true });
      if (c !== -2) return c;
      if (top - Y < 4) return mul(0xb9b1a0, top - Y < 1.5 ? 1.1 : 0.85);
      return stoneAt(X, Y, seed + 4, P.tint);
    }
    const beam = P.beam || BEAM, xm = Wt >> 1, sl = top - Y;
    if (sl < 4.4) return beamAt(Math.min(3, sl | 0), X, 4, beam);
    if (Y < 4) return beamAt(Y, X, 4, beam);
    if (Ht > 56) { const c = windowAt(X, Y, xm - 6, 16, 12, 18, { seed: seed + 50, frame: beam, sill: 0x6a4a36, shut: P.shutter, lit: h2(seed, 79) < 0.75, curtain: 0xa84a3a }); if (c !== -2) return c; }
    const cb = Y % 30; if (cb >= 26 && Y > 8) return beamAt(cb - 26, X, 4, beam);
    if (Math.abs(X - xm + 0.5) < 2 && (Ht <= 56 || Y > 38)) return beamAt(X - xm + 2, Y, 4, beam);
    const sx = X < xm ? X : Wt - 1 - X, st = sx - Wt * 0.26;
    if (st >= 0 && st < 3) return beamAt(st | 0, Y, 3, beam);
    const dg = st - (Y - 4) * 0.55; if (st > 3 && dg >= 0 && dg < 3.2 && Y < 26) return beamAt(dg | 0, X + Y, 3, beam);
    if (P.deco && Y > 30 && Y < 56) { const m = ((sx + Y) % 10); if (m < 2 && sx > Wt * 0.26 + 3) return beamAt(m, Y, 2, beam); }
    let c = plasterAt(X, Y, seed + 2, P.plaster || 0xe6d3a6); if (sl < 8) c = mul(c, 0.8);
    return c;
  };

  /* Roof tiles. s along ridge, t up the slope. P={pal,seed} */
  T.ROOF_RED = pal(['#b4553d', '#c2663f', '#a2452f', '#cf7a4e', '#963f33', '#bb5a45', '#c96e4a', '#ad4c38']);
  T.ROOF_BROWN = pal(['#8a5a44', '#7a4d3c', '#9a6a4e', '#6e4436', '#a37758', '#84503f', '#91604a']);
  T.ROOF_SLATE = pal(['#5f6a7c', '#566072', '#6b778a', '#4d566a', '#74808f', '#5a6478', '#667086']);
  T.roof = function (s, t, q) {
    const P = q.P, X = Math.floor(s * U), Y = Math.floor(t * RV), seed = P.seed | 0, p = P.pal || T.ROOF_RED, top = Math.round(q.vl * RV);
    if (Y >= top - 4) { const sg = (X + seed * 3) % 11; return mul(p[3], sg === 0 ? 0.6 : Y >= top - 2 ? 1.18 : 0.9); }
    const row = Math.floor(Y / 6), ly = Y - row * 6, off = (row & 1) * 4, col = Math.floor((X + off) / 8), lx = X + off - col * 8;
    const r = h2(col + seed * 3, row + seed);
    let c = p[(r * p.length) | 0];
    const n = fbm(X * 0.035 + seed, Y * 0.035), streak = vn(X * 0.11 + seed, Y * 0.015);
    let f = 0.86 + n * 0.22 + (streak - 0.5) * 0.16;
    if (ly === 5) f *= 0.64; else if (ly === 4) f *= 0.84; else if (ly === 0) f *= ((lx === 0 || lx === 7) ? 0.6 : 1.12); else if (ly === 1 && (lx === 1 || lx === 6)) f *= 1.1;
    if (lx === 0 && ly > 0) f *= 0.72; else if (lx === 1 && ly > 1 && ly < 4) f *= 1.07;
    if (r > 0.975) f *= 0.6;                                                    // slipped / missing tile
    if (n > 0.62 && Y < top * 0.7 && h2(X >> 1, Y >> 1) < (n - 0.62) * 4) c = mix(c, h2(X, Y) < 0.5 ? 0x5d7a48 : 0x76904c, 0.65);
    if (Y < 3) f *= 0.78;
    return mul(c, f);
  };
  T.wood = function (s, t, q) {
    const X = Math.floor(s * U), Y = Math.floor(t * V), c = (q.P && q.P.c) || 0x7a5a3c;
    if (q.P && q.P.crate) { const Wt = Math.round(q.ul * U), Ht = Math.round(q.vl * V), e = Math.min(X, Y, Wt - 1 - X, Ht - 1 - Y);
      if (e < 3) return mul(c, e === 0 ? 0.6 : e === 2 ? 0.8 : 1.08);
      if (Math.abs(X * Ht - Y * Wt) < Math.max(Wt, Ht) * 1.6) return mul(c, 0.95 + h2(X >> 2, 1) * 0.1);
      return mul(c, ((X % 6 === 0) ? 0.62 : 0.8) + h2(X / 6 | 0, 3) * 0.1); }
    const px = X % 7;
    return mul(c, (px === 0 ? 0.62 : px === 1 ? 1.1 : 0.92) + h2(X / 7 | 0, Y >> 3) * 0.16 - (h2(X, Y >> 2) < 0.07 ? 0.1 : 0));
  };
  T.woodTop = function (s, t, q) {
    const X = Math.floor(s * U), Y = Math.floor(t * U), c = (q.P && q.P.c) || 0x8a6846, py = Y % 7;
    return mul(c, (py === 0 ? 0.68 : py === 6 ? 1.08 : 0.95) + h2(X >> 3, Y / 7 | 0) * 0.14);
  };
  T.stripe = function (s, t, q) {
    const P = q.P, X = Math.floor(s * U), Y = Math.floor(t * 36), w = P.w || 8;
    if (P.scallop && Y < 4) { const m = X % 8 - 3.5; if (m * m + (4 - Y) * (4 - Y) > 17) return -1; }
    const st = Math.floor(X / w), c = (st & 1) ? P.a : P.b, e = X - st * w;
    let f = (e === 0 ? 0.86 : 1) * (0.94 + vn(X * 0.08, Y * 0.3) * 0.1);
    if (Y < 2 && P.scallop) f *= 0.8; if (P.shade && Y < 5) f *= 0.82;
    return mul(c, f);
  };
  T.barrel = function (s, t, q) {
    const X = Math.floor(s * U), Y = Math.floor(t * V), Ht = Math.round(q.vl * V), c = (q.P && q.P.c) || 0x8a623e;
    for (const hy of [3, (Ht >> 1) - 1, Ht - 6]) if (Y >= hy && Y < hy + 3) return Y === hy + 2 ? 0x7a7a84 : Y === hy ? 0x33333a : 0x55555e;
    const px = X % 5;
    return mul(c, (px === 0 ? 0.62 : px === 1 ? 1.1 : 0.94) * (0.8 + 0.4 * Math.sin(Math.PI * Y / Ht)) + h2(X / 5 | 0, 2) * 0.1);
  };
  T.disk = function (inner, tex) { return function (s, t, q, a, b) { const dx = a - 0.5, dy = b - 0.5, d = dx * dx + dy * dy; if (d > 0.25 || (inner && d < inner * inner * 0.25)) return -1; return tex(s, t, q, a, b); }; };
  /* foliage */
  T.leaves = function (palette, flowers, fp) {
    return function (dx, dy, ix, iy, bl, d2) {
      if (d2 > 0.7 && h2((ix + bl.seed) >> 1, (iy + (ix >> 2)) >> 1) < (d2 - 0.7) * 3.6) return -1;
      const cx = (ix + (iy >> 1) + bl.seed) >> 2, cy = (iy - (ix >> 2) + 4000) >> 1;
      if (flowers) { const fx = (ix + bl.seed) / 3 | 0, fy = iy / 3 | 0; if (h2(fx, fy + bl.seed) < fp) { const m = (ix + bl.seed) % 3 + iy % 3 * 3; return m === 4 ? 0xf6e7a0 : flowers[(h2(fx + 9, fy) * flowers.length) | 0]; } }
      const r = h2(cx, cy), c = palette[(r * palette.length) | 0];
      return ((iy - (ix >> 2)) & 1) && r > 0.5 ? mul(c, 0.86) : c;
    };
  };
  T.LEAF_G = pal(['#4d9440', '#5aa348', '#3f8438', '#67b04f', '#478c3c']);
  T.LEAF_D = pal(['#356e3a', '#2f6238', '#3d7a40', '#44863f', '#2a5a36']);
  T.LEAF_Y = pal(['#8aa83e', '#7a9a38', '#9ab848', '#6c8c34', '#a6c252']);
  T.BLOSSOM = pal(['#e8506a', '#f07a8c', '#d93a52', '#f6a8b4']);
  T.APPLE = pal(['#d93a3a', '#e85a4a']);
  T.FLOWERS = pal(['#d8414f', '#e8698a', '#f2b8c6', '#e9c64c', '#f4efe0', '#c93a66', '#a56be0']);
})();
