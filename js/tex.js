'use strict';
/* Procedural pixel textures.  Wall textures work in "texels":
 * 16 per world unit horizontally, 20 per unit vertically, which map 1:1 to
 * screen pixels on iso walls, so everything stays crisp. */
const T = {};
(function () {
  const h2 = E.h2, FW = E.F_WIN << 24, FE = E.F_EMIS << 24, FWA = E.F_WATER << 24;
  const hx = s => parseInt(s.slice(1), 16);
  const pal = a => a.map(hx);
  function mul(c, f) {
    let r = (c >> 16 & 255) * f, g = (c >> 8 & 255) * f, b = (c & 255) * f;
    if (r > 255) r = 255; if (g > 255) g = 255; if (b > 255) b = 255;
    return (r << 16) | (g << 8) | (b | 0);
  }
  function mix(a, b, t) {
    const r = (a >> 16 & 255) * (1 - t) + (b >> 16 & 255) * t, g = (a >> 8 & 255) * (1 - t) + (b >> 8 & 255) * t, bl = (a & 255) * (1 - t) + (b & 255) * t;
    return (r << 16) | (g << 8) | (bl | 0);
  }
  function vn(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y); let fx = x - xi, fy = y - yi;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  const fbm = (x, y) => vn(x, y) * 0.6 + vn(x * 2.3 + 9, y * 2.3 + 4) * 0.4;
  T.hx = hx; T.mul = mul; T.mix = mix; T.vn = vn; T.fbm = fbm; T.pal = pal;
  T.flat = c => () => c;

  /* ================= GROUND ================= */
  const STONE = pal(['#a8a39b', '#99958f', '#b3ada2', '#8c8a88', '#9a97a0', '#aa9f8e', '#93908a']);
  const GROUT = hx('#5a5862'), MOSS = hx('#5f7a45'), MOSS2 = hx('#77934f');
  T.cobble = function (x, y) {
    const tx = Math.floor(x * 16), ty = Math.floor(y * 16);
    const row = Math.floor(ty / 4), off = ((row & 1) ? 3 : 0) + (h2(row, 91) * 3 | 0);
    const col = Math.floor((tx + off) / 5), lx = tx + off - col * 5, ly = ty - row * 4;
    const big = fbm(x * 0.33, y * 0.33);
    if (lx === 0 || ly === 0) {
      if (big > 0.6 && h2(tx, ty) < (big - 0.6) * 4) return h2(ty, tx) < 0.5 ? MOSS : MOSS2;
      return mul(GROUT, 0.9 + big * 0.25);
    }
    const r = h2(col, row);
    let c = STONE[(r * STONE.length) | 0], f = 0.86 + big * 0.26;
    if (ly === 1 && lx < 4) f *= 1.07; else if (ly === 3 || lx === 4) f *= 0.93;
    if (h2(tx + 5, ty) < 0.04) f *= 0.9;
    return mul(c, f);
  };
  T.radial = function (x, y, cx, cy, ph) {
    const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy) * 16;
    const ring = Math.floor(r / 5), lr = r - ring * 5, circ = 6.2832 * (ring * 5 + 2.5);
    const n = Math.max(6, Math.round(circ / 7));
    const an = (Math.atan2(dy, dx) + 3.14159) / 6.2832 * n + ring * 0.37, ci = Math.floor(an), la = (an - ci) * circ / n;
    const big = fbm(x * 0.33, y * 0.33);
    if (lr < 1.1 || la < 1.1) return mul(GROUT, 0.9 + big * 0.25);
    let c = STONE[(h2(ci + ring * 31, ring + (ph | 0)) * STONE.length) | 0], f = 0.9 + big * 0.24;
    if (ring % 4 === 0) { c = mix(c, 0xb9a58a, 0.5); }
    if (lr < 2.2) f *= 1.06;
    return mul(c, f);
  };
  const GRASS = pal(['#4f8a3a', '#5d9a42', '#467d36', '#6aa848', '#3e7233']);
  const FLOW = pal(['#f2e9d0', '#e8c94a', '#d96a8a', '#c94a4a', '#b89ae0']);
  T.grass = function (x, y) {
    const tx = Math.floor(x * 16), ty = Math.floor(y * 16);
    const n = fbm(x * 0.5, y * 0.5), r = h2(tx, ty);
    let c = GRASS[Math.min(4, Math.max(0, (n * 4.2 + (r - 0.5) * 1.6) | 0))];
    if (h2(tx >> 1, (ty >> 1) + 77) < 0.012) return FLOW[(r * 5) | 0];
    if (r < 0.06) c = mul(c, 1.18);
    return c;
  };
  const DIRT = pal(['#9b7f5c', '#8e7352', '#a88b66', '#84694b']);
  T.dirt = function (x, y) {
    const tx = Math.floor(x * 16), ty = Math.floor(y * 16), n = fbm(x * 0.8, y * 0.8), r = h2(tx, ty);
    let c = DIRT[Math.min(3, (n * 3 + r * 1.3) | 0)];
    if (r < 0.03) c = 0x6f6a66; else if (r > 0.975) c = mul(c, 1.15);
    return c;
  };
  T.flag = function (x, y, sz, cA, cB) {   // big flagstones / checker floor
    const tx = Math.floor(x * 16), ty = Math.floor(y * 16), S = sz || 16;
    const cx = Math.floor(tx / S), cy = Math.floor(ty / S), lx = tx - cx * S, ly = ty - cy * S;
    if (lx === 0 || ly === 0) return 0x4a4650;
    let c = ((cx + cy) & 1) ? (cA || 0x9d978c) : (cB || 0x857f78);
    let f = 0.92 + h2(cx, cy) * 0.14 + (h2(tx, ty) < 0.05 ? -0.06 : 0);
    if (lx === 1 || ly === 1) f *= 1.07;
    return mul(c, f);
  };
  T.planks = function (x, y, base) {
    const tx = Math.floor(x * 16), ty = Math.floor(y * 16), p = Math.floor(ty / 4), ly = ty - p * 4;
    const off = (h2(p, 3) * 20) | 0, seg = Math.floor((tx + off) / 24);
    if (ly === 0 || (tx + off) % 24 === 0) return mul(base, 0.6);
    return mul(base, 0.88 + h2(p, seg) * 0.22 + (h2(tx >> 2, ty) < 0.12 ? -0.07 : 0));
  };
  T.water = function (x, y) {
    const tx = Math.floor(x * 16), ty = Math.floor(y * 16);
    const n = fbm(x * 1.3, y * 1.3);
    return (n > 0.62 ? 0x4fb0a8 : n > 0.4 ? 0x3d9c9a : 0x2f8590) | FWA;
  };

  /* ================= WALL MATERIALS ================= */
  const SBLOCK = pal(['#9c968a', '#8d887e', '#a8a193', '#827d75', '#96908a', '#a39a87']);
  const MORTAR = hx('#5c5852');
  function stoneAt(X, Y, seed, tint) {
    const row = Math.floor(Y / 5), off = (h2(row, seed) * 9) | 0, col = Math.floor((X + off) / 9);
    const lx = X + off - col * 9, ly = Y - row * 5;
    if (lx === 0 || ly === 0) return mul(MORTAR, tint ? 0.95 : 1);
    let c = SBLOCK[(h2(col + seed * 7, row) * SBLOCK.length) | 0], f = 0.93 + h2(X, Y + seed) * 0.1;
    if (ly === 4) f *= 1.08; if (ly === 1) f *= 0.93;
    if (Y < 4 && h2(X, Y) < 0.5) c = mix(c, 0x5d6a45, 0.45);
    if (tint) c = mix(c, tint, 0.35);
    return mul(c, f);
  }
  T.stoneAt = stoneAt;
  const BEAM = hx('#4d3528'), BEAM2 = hx('#5c4131');
  function beamAt(X, Y, c) { return mul(c || BEAM, 0.9 + h2(X >> 1, Y >> 2) * 0.25); }
  function plasterAt(X, Y, seed, c) {
    const n = fbm(X * 0.11 + seed * 3.1, Y * 0.11);
    let f = n > 0.66 ? 0.9 : n > 0.36 ? 1 : 1.06;
    if (h2(X + seed, Y) < 0.025) f *= 0.9;
    return mul(c, f);
  }
  const FLOWERS = pal(['#d8414f', '#e8698a', '#f2b8c6', '#e9c64c', '#f4efe0', '#c93a66', '#a56be0']);
  const LEAF = pal(['#3f7a36', '#58994a', '#2f6230']);
  const GLASS = hx('#263042'), GLASS2 = hx('#3f5170'), GLASS3 = hx('#55708f');

  // Rectangular window with frame, panes, optional shutters + flower box.  Returns colour or -2 if (X,Y) not on it.
  function windowAt(X, Y, x0, y0, ww, wh, o) {
    const dx = X - x0, dy = Y - y0;
    if (o.box && dy >= -5 && dy <= 1 && dx >= -2 && dx <= ww + 1) {
      const r = h2(X + o.seed * 13, Y + o.seed);
      if (dy >= -1) { if (r < 0.42) return FLOWERS[(h2(X >> 1, o.seed + (Y >> 1)) * o.fl) % FLOWERS.length | 0]; if (r < 0.86) return LEAF[(r * 30 | 0) % 3]; }
      else if (dy >= -3) return dy === -2 ? 0x6b4a33 : 0x543826;
      else if (r < 0.3) return LEAF[(r * 40 | 0) % 3];
    }
    if (o.shut && dy >= 0 && dy < wh && ((dx >= -4 && dx <= -2) || (dx >= ww + 1 && dx <= ww + 3)))
      return mul(o.shut, (dy & 1) ? 1 : 0.82);
    if (dx < -1 || dx > ww || dy < -1 || dy > wh) return -2;
    if (o.arch) { // round top
      const hw = ww / 2, cy = wh - hw, ex = dx + 0.5 - hw, ey = dy + 0.5 - cy;
      if (ey > 0) { const d = ex * ex + ey * ey; if (d > (hw + 1) * (hw + 1)) return -2; if (d > (hw - 0.3) * (hw - 0.3)) return o.frame; }
    }
    if (dx === -1 || dx === ww || dy === -1 || dy === wh) return o.frame;
    if (dx === (ww >> 1) || (o.rows && dy % o.rows === o.rows - 1)) return mul(o.frame, 1.15);
    const lit = o.lit ? FW : 0, k = (dx + dy * 2 + o.seed) % 7;
    return (k === 0 ? GLASS3 : k < 3 ? GLASS2 : GLASS) | lit;
  }
  // Door / archway. kind: 'door' | 'open' | 'gothic' | 'shop'
  function doorAt(X, Y, xc, w, h, kind, o) {
    const dx = X + 0.5 - xc, hw = w / 2;
    if (Math.abs(dx) > hw + 2 || Y > h + 3) return -2;
    let inside, edge;
    if (kind === 'gothic') {
      const sp = h - w * 0.85;
      if (Y < sp) { inside = Math.abs(dx) <= hw; edge = Math.abs(dx) <= hw + 2; }
      else { const ey = Y - sp, R = w * 1.05, a = (dx + hw - R), b = (dx - hw + R);
        inside = a * a + ey * ey <= R * R && b * b + ey * ey <= R * R;
        const R2 = R + 2; const a2 = dx + hw + 2 - R2, b2 = dx - hw - 2 + R2; edge = a2 * a2 + ey * ey <= R2 * R2 && b2 * b2 + ey * ey <= R2 * R2; }
    } else if (kind === 'shop') { inside = Math.abs(dx) <= hw && Y <= h; edge = Math.abs(dx) <= hw + 1 && Y <= h + 2; }
    else {
      const sp = h - hw;
      if (Y < sp) { inside = Math.abs(dx) <= hw; edge = Math.abs(dx) <= hw + 2; }
      else { const ey = Y - sp; inside = dx * dx + ey * ey <= hw * hw; edge = dx * dx + ey * ey <= (hw + 2) * (hw + 2); }
    }
    if (!edge) return -2;
    if (!inside) return o.trim !== undefined ? mul(o.trim, 0.92 + h2(X >> 1, Y >> 1) * 0.16) : -2;
    if (kind === 'door') {
      const px = Math.floor(dx + hw);
      if (px % 3 === 0) return 0x2e1f17;
      if (Y === 5 || Y === h - hw - 2) return 0x2b2a30;
      if (px === Math.floor(w * 0.75) && Y === Math.floor(h * 0.45)) return 0xd9b04a;
      return mul(o.door || 0x5a3d2a, 0.9 + h2(px, Y >> 2) * 0.2);
    }
    if (kind === 'shop') {
      if (Y <= 7) return Y === 7 ? 0x7a5a3c : mul(0x60442f, 0.9 + h2(X, 3) * 0.2);   // counter
      if (Y === 8 || Y === 9) { const r = h2(X >> 1, o.seed + 5); if (r < 0.7) return [0xd9a441, 0xc0452f, 0x7fa64a, 0xe6d5a8, 0xb5763a][(r * 7) | 0]; }
      return (Y > h - 4 ? 0x2a2026 : 0x3a2c2c) | (o.lit ? FW : 0);
    }
    // open archway: dark interior with a hint of floor
    const dk = Y < 3 ? 0x3a3238 : Y < 8 ? 0x2a2430 : 0x1d1924;
    return dk | (o.lit ? FW : 0);
  }

  /* Facade.  P = { mat:'timber'|'stone'|'plaster', seed, plaster, beam, shutter, tint, bays:[...] , feats:[...] , lit }
   * feats: {k:'door'|'open'|'gothic'|'shop'|'win'|'awin'|'glass', x:0..1, w, h, y}        */
  T.facade = function (s, t, q) {
    const P = q.P, X = Math.floor(s * 16), Y = Math.floor(t * 20), Wt = Math.round(q.ul * 16), Ht = Math.round(q.vl * 20), seed = P.seed | 0;
    const beam = P.beam || BEAM;
    if (P.feats) for (let i = 0; i < P.feats.length; i++) {
      const f = P.feats[i], xc = Math.round(f.x * Wt);
      let c = -2;
      if (f.k === 'win' || f.k === 'awin') c = windowAt(X, Y, xc - (f.w >> 1), f.y, f.w, f.h, { seed: seed + i, box: f.box, fl: 3 + ((seed + i) % 5), shut: f.shut, frame: f.frame || beam, arch: f.k === 'awin', rows: f.rows || 0, lit: f.lit !== false && h2(seed + i, 77) < 0.75 });
      else if (f.k === 'glass') c = stainedAt(X, Y, xc, f.w, f.h, f.y, seed + i);
      else c = doorAt(X, Y, xc, f.w, f.h, f.k, { trim: f.trim, door: f.door, seed: seed + i, lit: f.lit });
      if (c !== -2) return c;
    }
    if (P.mat === 'stone') {
      if (P.band && (Y % P.band === P.band - 1)) return mul(0xb0a898, 0.95 + h2(X >> 2, Y) * 0.1);
      return stoneAt(X, Y, seed, P.tint);
    }
    // --- half-timber ---
    if (Y < 2 || Y >= Ht - 2) return beamAt(X, Y * 7, beam);
    const nbay = Math.max(1, Math.round(Wt / (P.bay || 20)));
    const bay = Math.min(nbay - 1, Math.floor(X * nbay / Wt)), bx0 = Math.floor(bay * Wt / nbay), bx1 = Math.floor((bay + 1) * Wt / nbay);
    const bx = X - bx0;
    if (bx < 2 || X >= Wt - 2) return beamAt(X * 5, Y, beam);
    const iw = bx1 - bx0 - 2, ih = Ht - 4, ix = bx - 2, iy = Y - 2;
    const r = h2(bay * 31 + seed * 17, seed + 3);
    const kind = P.plain ? 9 : r < (P.winP === undefined ? 0.55 : P.winP) ? 0 : r < 0.72 ? 1 : r < 0.86 ? 2 : r < 0.95 ? 3 : 4;
    if (kind === 0 && ih >= 20) {
      const ww = Math.min(8, iw - 8), wh = Math.min(12, ih - 14), x0 = bx0 + 2 + ((iw - ww) >> 1), y0 = 2 + Math.max(7, (ih - wh) >> 1);
      const c = windowAt(X, Y, x0, y0, ww, wh, { seed: seed * 5 + bay, box: h2(bay, seed + 9) < 0.7, fl: 2 + ((seed + bay) % 5), shut: iw >= 16 ? P.shutter : 0, frame: beam, rows: 6, lit: h2(seed + bay, 78) < 0.7 });
      if (c !== -2) return c;
      if (Y === y0 - 6) return beamAt(X, Y * 7, beam);
    } else if (kind === 1 || kind === 2 || kind === 3) {
      const L = Math.hypot(iw, ih), d1 = Math.abs(ix * ih - iy * iw) / L, d2 = Math.abs(ix * ih - (ih - iy) * iw) / L;
      if ((kind !== 3 && d1 < 1.1) || (kind !== 2 && d2 < 1.1)) return beamAt(X, Y, beam);
    } else if (kind === 4) {
      if (Math.abs(ix - (iw >> 1)) < 1 || iy === (ih >> 1)) return beamAt(X, Y, beam);
    }
    return plasterAt(X, Y, seed, P.plaster || 0xe6d3a6);
  };
  const SG = pal(['#c23b3b', '#3b6fc2', '#d9a83a', '#3f9a5a', '#8a4fc2', '#d96a2f', '#4fb3c9']);
  function stainedAt(X, Y, xc, w, h, y0, seed) {
    const dx = X + 0.5 - xc, hw = w / 2, dy = Y - y0;
    if (dy < -1 || Math.abs(dx) > hw + 1) return -2;
    const sp = h - w * 0.85; let inside, edge;
    if (dy < sp) { inside = Math.abs(dx) <= hw; edge = true; }
    else { const ey = dy - sp, R = w * 1.05, a = dx + hw - R, b = dx - hw + R; inside = a * a + ey * ey <= R * R && b * b + ey * ey <= R * R;
      const R2 = R + 1.5, a2 = dx + hw + 1.5 - R2, b2 = dx - hw - 1.5 + R2; edge = a2 * a2 + ey * ey <= R2 * R2 && b2 * b2 + ey * ey <= R2 * R2; }
    if (!edge) return -2;
    if (!inside || dy < 0) return 0xb8b0a0;
    const px = Math.floor(dx + hw);
    if (px === Math.floor(hw) || dy % 6 === 5 || (w > 10 && (px === Math.floor(hw / 2) || px === Math.floor(hw * 1.5)))) return 0x2a2630;
    const c = SG[(h2(Math.floor(px / (w > 10 ? hw / 2 : hw)) + seed, Math.floor(dy / 6) + seed * 3) * SG.length) | 0];
    return mul(c, 0.55 + ((px + dy) % 3 === 0 ? 0.15 : 0)) | FW;
  }

  /* Gable triangle (a,b normalised). P as facade + {gableWin} */
  T.gable = function (s, t, q, a, b) {
    const P = q.P, X = Math.floor(s * 16), Y = Math.floor(t * 20), Wt = Math.round(q.ul * 16), Ht = q.vl * 20, seed = P.seed | 0;
    const top = (1 - Math.abs(2 * a - 1)) * Ht;      // height of the slope line at this column
    if (Y > top) return -1;
    if (P.mat === 'stone') {
      const c = P.gfeat ? (P.gfeat.k === 'glass' ? stainedAt(X, Y, Wt / 2, P.gfeat.w, P.gfeat.h, P.gfeat.y, seed) : windowAt(X, Y, (Wt >> 1) - (P.gfeat.w >> 1), P.gfeat.y, P.gfeat.w, P.gfeat.h, { seed, frame: 0x4a4038, arch: true, lit: true })) : -2;
      return c !== -2 ? c : stoneAt(X, Y, seed + 4, P.tint);
    }
    const beam = P.beam || BEAM, xm = Wt >> 1;
    if (top - Y < 2.2 || Y < 2) return beamAt(X, Y, beam);
    if (Ht > 30) { const c = windowAt(X, Y, xm - 3, 9, 6, 9, { seed: seed + 50, box: h2(seed, 5) < 0.6, fl: 3, frame: beam, rows: 5, lit: h2(seed, 79) < 0.7 }); if (c !== -2) return c; }
    if (Math.abs(X - xm) < 1 && (Ht <= 30 || Y > 20)) return beamAt(X * 5, Y, beam);
    if (Y % 14 === 13) return beamAt(X, Y * 7, beam);
    const sx = X < xm ? X : Wt - 1 - X;                 // mirrored struts
    if (Math.abs(sx - Wt * 0.27) < 1 || (h2(seed, 6) < 0.5 && Math.abs((sx - Wt * 0.27) - (Y - 2) * 0.5) < 1 && sx > Wt * 0.27)) return beamAt(X * 5, Y, beam);
    return plasterAt(X, Y, seed + 2, P.plaster || 0xe6d3a6);
  };

  /* Roof tiles. s along ridge, t up the slope. P={pal,seed} */
  T.ROOF_RED = pal(['#b4553d', '#c2663f', '#a2452f', '#cf7a4e', '#963f33', '#bb5a45']);
  T.ROOF_BROWN = pal(['#8a5a44', '#7a4d3c', '#9a6a4e', '#6e4436', '#a37758', '#84503f']);
  T.ROOF_SLATE = pal(['#5f6a7c', '#566072', '#6b778a', '#4d566a', '#74808f', '#5a6478']);
  T.ROOF_THATCH = pal(['#b59a55', '#a58a4a', '#c4aa62', '#96803f', '#cdb672', '#a08848']);
  T.roof = function (s, t, q) {
    const P = q.P, X = Math.floor(s * 16), Y = Math.floor(t * 17), seed = P.seed | 0, p = P.pal || T.ROOF_RED;
    const top = Math.round(q.vl * 17);
    if (Y >= top - 2) return mul(p[3], Y >= top - 1 ? 1.12 : 0.8);        // ridge cap
    const row = Math.floor(Y / 3), ly = Y - row * 3, off = (row & 1) * 2, col = Math.floor((X + off) / 4), lx = X + off - col * 4;
    let c = p[(h2(col + seed * 3, row + seed) * p.length) | 0];
    const n = fbm(X * 0.07 + seed, Y * 0.07);
    let f = 0.9 + n * 0.22;
    if (ly === 0) f *= 0.72; else if (ly === 2) f *= 1.08;
    if (lx === 0 && ly !== 2) f *= 0.86;
    if (n > 0.7 && Y < top * 0.6 && h2(X, Y) < 0.45) c = mix(c, 0x5d7a48, 0.55);
    if (Y < 2) f *= 0.8;
    return mul(c, f);
  };
  T.thatch = function (s, t, q) {
    const P = q.P, X = Math.floor(s * 16), Y = Math.floor(t * 17), p = T.ROOF_THATCH;
    let c = p[(h2(X + (Y >> 1), (Y / 5 | 0) + P.seed) * p.length) | 0], f = 0.9 + fbm(X * 0.1, Y * 0.1) * 0.2;
    if (Y % 5 === 0) f *= 0.8; if (Y < 2) f *= 0.75;
    return mul(c, f);
  };
  /* generic wood (crates, stalls, beams).  P={c} */
  T.wood = function (s, t, q) {
    const X = Math.floor(s * 16), Y = Math.floor(t * 20), c = (q.P && q.P.c) || 0x7a5a3c;
    if (q.P && q.P.crate) { const Wt = Math.round(q.ul * 16), Ht = Math.round(q.vl * 20);
      if (X === 0 || Y === 0 || X >= Wt - 1 || Y >= Ht - 1) return mul(c, 0.7);
      if (Math.abs(X * Ht - Y * Wt) < Math.max(Wt, Ht)) return mul(c, 0.78); }
    if (X % 4 === 0) return mul(c, 0.72);
    return mul(c, 0.9 + h2(X >> 2, Y >> 2) * 0.2);
  };
  T.woodTop = function (s, t, q) {
    const X = Math.floor(s * 16), Y = Math.floor(t * 16), c = (q.P && q.P.c) || 0x8a6846;
    return mul(c, (Y % 4 === 0 ? 0.78 : 0.95) + h2(X >> 2, Y >> 2) * 0.14);
  };
  /* striped cloth; P={a,b,w,scallop} ; scalloped lower edge when t small */
  T.stripe = function (s, t, q) {
    const P = q.P, X = Math.floor(s * 16), Y = Math.floor(t * 18), w = P.w || 4;
    if (P.scallop && Y < 2 && ((X % 4) === 0 || (Y === 0 && (X % 4) !== 2))) return -1;
    const c = (Math.floor(X / w) & 1) ? P.a : P.b;
    return mul(c, Y < 3 ? 0.85 : 0.97 + h2(X, Y) * 0.06);
  };
  T.barrel = function (s, t, q) {
    const X = Math.floor(s * 16), Y = Math.floor(t * 20), Ht = Math.round(q.vl * 20);
    if (Y === 2 || Y === Ht - 3 || Y === (Ht >> 1)) return 0x4a4a52;
    return mul((q.P && q.P.c) || 0x8a623e, (X % 3 === 0 ? 0.75 : 0.95) + h2(X, Y >> 2) * 0.1);
  };
  T.disk = function (inner, tex) {      // circular mask on a unit quad
    return function (s, t, q, a, b) {
      const dx = a - 0.5, dy = b - 0.5, d = dx * dx + dy * dy;
      if (d > 0.25 || (inner && d < inner * inner * 0.25)) return -1;
      return tex(s, t, q, a, b);
    };
  };
  T.carpet = function (c1, c2, c3) {
    return function (s, t, q) {
      const X = Math.floor(s * 16), Y = Math.floor(t * 16), Wt = Math.round(q.ul * 16), Ht = Math.round(q.vl * 16);
      const ex = Math.min(X, Wt - 1 - X), ey = Math.min(Y, Ht - 1 - Y), e = Math.min(ex, ey);
      if (e < 1) return c3; if (e < 3) return c2; if (e === 3) return c3;
      if (((X + Y) % 16 === 0 || (X - Y + 1600) % 16 === 0)) return mul(c2, 0.9);
      return mul(c1, 0.94 + h2(X, Y) * 0.1);
    };
  };
  /* foliage blob textures */
  T.leaves = function (palette, flowers, fp) {
    return function (dx, dy, ix, iy, bl, d2) {
      const r = h2(ix, iy);
      if (d2 > 0.74 && h2(ix >> 1, iy >> 1) < (d2 - 0.74) * 3.4) return -1;
      if (flowers && h2((ix >> 1) + bl.seed, iy >> 1) < fp) return flowers[(h2(bl.seed, (ix >> 1) + (iy >> 1)) * flowers.length) | 0];
      const c = palette[(h2((ix + bl.seed) >> 1, (iy + (ix >> 1)) >> 1) * palette.length) | 0];
      return r < 0.08 ? mul(c, 1.2) : c;
    };
  };
  T.LEAF_G = pal(['#4d9440', '#5aa348', '#3f8438', '#67b04f']);
  T.LEAF_D = pal(['#356e3a', '#2f6238', '#3d7a40', '#44863f']);
  T.LEAF_Y = pal(['#8aa83e', '#7a9a38', '#9ab848', '#6c8c34']);
  T.BLOSSOM = pal(['#e8506a', '#f07a8c', '#d93a52', '#f6a8b4']);
  T.APPLE = pal(['#d93a3a', '#e85a4a']);
  T.FLOWERS = FLOWERS;
  T.emis = c => () => c | FE;
})();
