'use strict';
/* Forest trail scene (high-detail renderer): cliff + two-tier waterfall, stream, bridge,
 * traveller's camp, ruined shrine, pines / oaks / birches, fireflies and butterflies. */
(function () {
  const h2 = E.h2, Q = E.quad, mul = T.mul, mix = T.mix, U = 32, V = 40;
  const NOAO = E.F_NOAO << 24, FWA = E.F_WATER << 24, FE = E.F_EMIS << 24;
  const _reset = B.reset; B.reset = function () { _reset(); B.falls = []; B.flies = []; B.gulls = []; B.deer = []; };

  /* ---------- textures ---------- */
  const FLOOR = T.pal(['#2f5a30', '#386a34', '#44783a', '#4f8a3e', '#5c9a44']);
  const LITTER = T.pal(['#7a5a34', '#8a6a3c', '#5a4428', '#9a7a44']);
  const BLOOM = T.pal(['#f4ecd6', '#eccb4c', '#b99be4', '#e88aa8', '#7ab8e8']);
  function floorTex(x, y) {
    const tx = Math.floor(x * U), ty = Math.floor(y * U), n = T.fbm(x * 0.4, y * 0.4), r = h2(tx, ty >> 1);
    let i = Math.min(4, Math.max(0, (n * 4.8 + (h2(tx >> 1, ty >> 2) - 0.5) * 1.6) | 0));
    const lit = T.fbm(x * 0.9 + 20, y * 0.9);
    if (lit > 0.58 && h2(tx >> 1, ty >> 1) < (lit - 0.58) * 2.4) return LITTER[(r * 4) | 0];
    if (h2(tx >> 1, (ty >> 1) + 77) < 0.006) return (tx & 1) === (ty & 1) ? BLOOM[(h2(tx >> 3, ty >> 3) * 5) | 0] : 0xf4e27a;
    if (r < 0.08) i = Math.min(4, i + 1); else if (r > 0.94) i = Math.max(0, i - 1);
    return FLOOR[i];
  }
  const ROCK = T.pal(['#8a8478', '#7c776e', '#989284', '#6e6a64', '#a39c8c', '#847c70']);
  function rockTex(s, t, q) {
    const X = Math.floor(s * U) + ((q.P && q.P.seed) | 0) * 37, Y = Math.floor(t * V), Ht = Math.round(q.vl * V);
    const yy = Y + T.vn(X * 0.035, 3) * 12, band = Math.floor(yy / 10), ly = yy - band * 10;
    const cell = Math.floor((X + band * 9) / 6), joint = (X + band * 9) % 6 === 0 && h2(cell, band) < 0.3;
    let c = ROCK[(h2(band, Math.floor((X + band * 9) / 30)) * ROCK.length) | 0], f = 0.9 + h2(X, Y) * 0.12;
    if (ly < 1.2 || joint) f *= 0.6; else if (ly > 8.6) f *= 1.12; else if (ly < 2.4) f *= 0.84;
    const m = T.fbm(X * 0.04, Y * 0.04), drip = Ht - Y - T.vn(X * 0.2, 9) * 16;
    if (drip < 5 || (m > 0.62 && h2(X >> 1, Y >> 1) < (m - 0.6) * 4)) c = mix(c, h2(X, Y) < 0.5 ? 0x4f7a3a : 0x6a9444, 0.75);
    f *= 0.8 + 0.2 * Math.min(1, Y / 18);
    return mul(c, f);
  }
  const bark = c => (s, t) => { const X = Math.floor(s * U), Y = Math.floor(t * V); return mul(c, ((X + (Y >> 3)) % 4 === 0 ? 0.68 : 0.95) + h2(X, Y >> 2) * 0.16); };
  const birchBark = (s, t) => { const X = Math.floor(s * U), Y = Math.floor(t * V); if (h2(X >> 1, Y >> 1) < 0.1 && (Y % 7) < 2) return 0x3a3438; return mul(0xe4dfd2, (X % 6 === 0 ? 0.8 : 1) - (h2(X, Y) < 0.1 ? 0.08 : 0)); };
  const rings = (s, t, q, a, b) => { const d = Math.hypot(a - 0.5, b - 0.5); return d > 0.5 ? -1 : d > 0.42 ? 0x5a4030 : mul(0xc9a878, (Math.floor(d * 22) & 1) ? 0.84 : 1); };
  const PINE = T.pal(['#24523a', '#2c5e40', '#1f4634', '#336a46', '#2a5a4a']);
  const FERN = T.pal(['#4a9a3c', '#5cae46', '#3c8a36', '#6cbc50']);
  const boulderTex = sd => (dx, dy, ix, iy) => { if (dy < -0.3 + (h2((ix + sd) >> 2, iy >> 2) - 0.5) * 0.5) return h2(ix, iy) < 0.5 ? 0x55803c : 0x6c9a48; return ROCK[(h2((ix + sd) >> 2, (iy + (ix >> 1)) >> 2) * ROCK.length) | 0]; };

  /* ---------- flora ---------- */
  let sdc = 500;
  function pine(x, y, z, s) {
    const sd = sdc++ * 11, tex = T.leaves(PINE, null, 0), tiers = 6;
    B.taper(x, y, z, 0.24 * s, x, y, z + 0.4 * s, 0.14 * s, 7, bark(0x4f3a2c)); B.taper(x, y, z + 0.4 * s, 0.14 * s, x, y, z + 1.5 * s, 0.08 * s, 7, bark(0x4f3a2c));
    for (let i = 0; i < tiers; i++) {
      const zz = z + (0.95 + i * 0.64) * s, R = (1.08 - i * 0.165) * s, n = i < 4 ? 6 : 4;
      for (let j = 0; j < n; j++) { const a = j / n * 6.283 + i * 0.5; E.blob([x + Math.cos(a) * R * 0.56, y + Math.sin(a) * R * 0.56, zz - 0.1 * s], R * 0.48, tex, { seed: sd + i * 7 + j }); }
      E.blob([x, y, zz + 0.16 * s], R * 0.55, tex, { seed: sd + i });
    }
    E.blob([x, y, z + (0.95 + tiers * 0.64) * s], 0.17 * s, tex, { seed: sd });
    if (!z) B.blockC(x, y, 0.3);
  }
  function birch(x, y, s) {
    const sd = sdc++ * 13, tex = T.leaves(T.LEAF_Y, null, 0), tex2 = T.leaves(T.LEAF_G, null, 0), hgt = 3.3 * s;
    B.taper(x, y, 0, 0.13 * s, x, y, hgt, 0.05 * s, 7, birchBark);
    for (let i = 0; i < 11; i++) { const a = h2(sd, i) * 6.283, rr = h2(sd + 1, i) * 0.75 * s; E.blob([x + Math.cos(a) * rr, y + Math.sin(a) * rr, hgt * (0.68 + h2(sd + 2, i) * 0.42)], (0.3 + h2(sd + 3, i) * 0.24) * s, i % 3 ? tex : tex2, { seed: sd + i }); }
    B.blockC(x, y, 0.25);
  }
  function boulder(x, y, r) { const sd = sdc++; E.blob([x, y, r * 0.42], r, boulderTex(sd)); E.blob([x + r * 0.7, y + r * 0.35, r * 0.2], r * 0.55, boulderTex(sd + 3)); if (r > 0.35) B.blockC(x, y, r * 0.9); }
  function fern(x, y, s) { B.bush(x, y, { s: s || 0.7, n: 3, pal: FERN, flowers: null, noBlock: true }); }
  function mushroom(x, y, s) { s = s || 1; B.box(x - 0.025, y - 0.025, 0, 0.05, 0.05, 0.1 * s, { side: T.flat(0xe8e0d0), noShadow: true }); E.blob([x, y, 0.13 * s], 0.075 * s, (dx, dy, ix, iy) => ((ix * 3 + iy * 5) % 7 === 0 ? 0xf4efe0 : dy < -0.2 ? 0xe0503a : 0xc23a30), { f: E.F_NOAO }); }
  function log(x, y, len) {
    B.box(x, y, 0, len, 0.42, 0.4, { side: bark(0x5c4432), top: bark(0x6a5038), tx: (s, t, q, a, b) => { const c = rings(s, t, q, a, b); return c < 0 ? 0x5c4432 : c; } });
    for (let i = 0; i < 5; i++) E.blob([x + 0.2 + h2(i, sdc) * (len - 0.4), y + 0.2, 0.4], 0.1 + h2(i, 3) * 0.06, T.leaves(FERN, null, 0), { seed: i });
    mushroom(x + len * 0.3, y + 0.5); mushroom(x + len * 0.38, y + 0.56, 0.8); mushroom(x + len * 0.7, y + 0.5, 1.2); sdc++;
    B.block(x, y, len, 0.42);
  }
  function stump(x, y) { B.cyl(x, y, 0, 0.3, 0.32, 8, bark(0x5c4432), { top: rings }); mushroom(x + 0.36, y + 0.1); B.blockC(x, y, 0.32); }

  /* ---------- scene ---------- */
  const sxf = y => 14 + Math.sin(y * 0.45) * 1.25 + Math.sin(y * 0.17 + 1) * 0.8;       // stream centre x at y
  const tyf = x => 15.6 + Math.sin(x * 0.4) * 1.3 + Math.sin(x * 0.15 + 2) * 1.0;      // trail centre y at x
  const CAMP = [20.3, 10.6], SHR = [8.2, 21.2], POND = [14.2, 7.0];
  const waterD = (x, y) => Math.min(Math.abs(x - sxf(y)) - 0.8, Math.hypot(x - POND[0], y - POND[1]) - 2.4);
  const BY = tyf(14.4), BX = sxf(BY);

  Scenes.forest = {
    name: 'Forest Trail', bounds: [0, 0, 28, 28, 12.5], focus: [14.5, 15.5], focusZ: 1.5, king: [10.5, tyf(10.5)], npcs: 9,
    roles: ['villager', 'villager', 'guard', 'monk', 'villager'], walk: [0.6, 5.4, 27.4, 27.4],
    blurb: 'Adventure-phase test: forest trail with a waterfall, stream crossing, travellers\' camp and a ruined shrine. Canopy shadows are real. Try Night for the campfire and fireflies.',
    times: { night: { amb: [0.2, 0.25, 0.42], sun: [0.2, 0.28, 0.5] } },
    build() {
      Q([0, 0, 0], [28, 0, 0], [0, 28, 0], (x, y) => {
        const tx = Math.floor(x * U), ty = Math.floor(y * U), n = T.fbm(x * 0.6, y * 0.6);
        if (y > 4.9) {
          const d = waterD(x, y) + (n - 0.5) * 0.25;
          if (d < 0) { if (d > -0.22) return (h2(tx >> 1, ty >> 1) < 0.25 ? 0x8fb0a8 : 0x4a9a98) | FWA; const w = T.fbm(x * 1.6, y * 1.6); return (d < -0.5 ? (w > 0.55 ? 0x2f7f86 : 0x286e7a) : (w > 0.55 ? 0x3d9a98 : 0x338a90)) | FWA; }
          if (d < 0.3) return h2(tx >> 1, ty >> 1) < 0.3 ? 0x9a9488 : mul(0x6e5e46, 0.85 + h2(tx, ty) * 0.25);
        }
        const v = Math.abs(y - tyf(x)), w = 0.95 + n * 0.35;
        if (v < w) { const c = T.dirt(x, y), ru = Math.abs(v - 0.38); if (ru < 0.07) return mul(c, 0.82); if (v > w - 0.22 && h2(tx >> 1, ty >> 1) < 0.5) return floorTex(x, y); return c; }
        const dc = Math.hypot(x - CAMP[0], y - CAMP[1]); if (dc < 2.3 + n * 0.8) return dc < 0.9 ? mul(T.dirt(x, y), 0.7) : (h2(tx >> 1, ty >> 1) < (dc - 1.4) * 0.8 ? floorTex(x, y) : T.dirt(x, y));
        const dsh = Math.hypot(x - SHR[0], y - SHR[1]); if (dsh < 2.3) { if (T.fbm(x * 1.3, y * 1.3) > 0.56) return floorTex(x, y); return T.radial(x, y, SHR[0], SHR[1]); }
        return floorTex(x, y);
      }, { n: [0, 0, 1] });

      /* cliff: stacked rock ledges, pines on top, two-tier waterfall */
      const ledge = (x, y, w, d, hh, sd) => B.box(x, y, 0, w, d, hh, { side: rockTex, P: { seed: sd }, top: (s, t) => floorTex(s + x, t + y) });
      ledge(7, 0, 14, 5, 3.2, 1); ledge(4.6, 0, 3.4, 4.3, 1.9, 2); ledge(20.4, 0, 3.6, 4.6, 2.3, 3); ledge(8.6, 0, 11, 2.4, 5.0, 4); ledge(11.2, 0, 4.2, 1.3, 6.3, 5); ledge(23.6, 0, 2.6, 3.4, 1.2, 6); ledge(2.6, 0, 2.4, 3.0, 1.0, 7);
      B.block(2.6, 0, 23.6, 5.1);
      const fallTex = (s, t) => { const X = Math.floor(s * U), Y = Math.floor(t * V), r = h2(X, Y >> 3); return (r < 0.3 ? 0xd8f4f8 : r < 0.65 ? 0xa8e0ea : 0x7fc8d8) | NOAO; };
      Q([13.6, 5.02, 0], [1.2, 0, 0], [0, 0, 3.2], fallTex, { n: [0, 1, 0], noShadow: true }); B.falls.push({ x0: 13.6, x1: 14.8, y: 5.04, z0: 0, z1: 3.2 });
      Q([13.7, 2.42, 3.2], [1.0, 0, 0], [0, 0, 1.8], fallTex, { n: [0, 1, 0], noShadow: true }); B.falls.push({ x0: 13.7, x1: 14.7, y: 2.44, z0: 3.2, z1: 5.0 });
      Q([13.6, 2.4, 3.215], [1.2, 0, 0], [0, 2.6, 0], (s, t) => T.water(s + 3, t), { n: [0, 0, 1], noShadow: true });
      Q([13.7, 0, 5.015], [1.0, 0, 0], [0, 2.4, 0], (s, t) => T.water(s + 9, t), { n: [0, 0, 1], noShadow: true });
      for (const p of [[9, 3.6, 3.2, 1.0], [11.6, 3.9, 3.2, 0.8], [17.6, 3.5, 3.2, 1.1], [19.8, 3.9, 3.2, 0.85], [9.8, 1.2, 5.0, 1.0], [17.4, 1.3, 5.0, 1.15], [12.4, 0.6, 6.3, 0.9], [5.8, 2.4, 1.9, 1.0], [22, 2.6, 2.3, 1.0], [24.8, 1.6, 1.2, 0.9], [3.6, 1.4, 1.0, 0.85]]) pine(p[0], p[1], p[2], p[3]);
      for (let i = 0; i < 14; i++) { const x = 7.5 + h2(i, 61) * 13, on = h2(i, 62) < 0.5; if (Math.abs(x - 14.2) < 1.2) continue; B.bush(x, on ? 4.4 : 2.0, { z: on ? 3.2 : 5.0, s: 0.8 + h2(i, 63) * 0.5, pal: FERN, flowers: i % 3 ? null : T.FLOWERS, noBlock: true }); }
      for (const p of [[12.4, 5.8, 0.5], [16.2, 5.7, 0.6], [11.6, 7.6, 0.4], [16.9, 8.2, 0.45], [13.2, 9.6, 0.3], [15.6, 9.9, 0.34]]) boulder(p[0], p[1], p[2]);
      // stream: stepping stones, reeds, nav blocks, bridge
      for (let y = 5.2; y < 28; y += 0.5) { if (Math.abs(y - BY) < 0.9) continue; B.block(sxf(y) - 0.75, y, 1.5, 0.5); }
      B.blockC(POND[0], POND[1], 2.3);
      for (let i = 0; i < 16; i++) { const y = 10.5 + i * 1.1 + h2(i, 5) * 0.5; if (Math.abs(y - BY) < 1.3) continue; const sd = i; E.blob([sxf(y) + (h2(i, 6) - 0.5) * 1.0, y, 0.02], 0.13 + h2(i, 7) * 0.12, boulderTex(sd), { f: E.F_NOAO }); }
      for (let i = 0; i < 26; i++) { const y = 9 + h2(i, 11) * 18.5, side = i & 1 ? 1 : -1; if (Math.abs(y - BY) < 1.4) continue; fern(sxf(y) + side * (1.25 + h2(i, 12) * 0.4), y, 0.5 + h2(i, 13) * 0.4); }
      B.box(BX - 1.6, BY - 0.8, 0, 3.2, 1.6, 0.16, { side: T.wood, P: { c: 0x6a4a34 }, top: (s, t) => T.planks(s, t, 0x8a6846) });
      for (const yy of [BY - 0.8, BY + 0.7]) { for (let x = BX - 1.55; x < BX + 1.6; x += 0.76) B.box(x, yy, 0.16, 0.1, 0.1, 0.58, { side: T.flat(0x5a4030) }); B.box(BX - 1.55, yy + 0.02, 0.66, 3.14, 0.06, 0.08, { side: T.flat(0x7a5a40) }); B.box(BX - 1.55, yy + 0.02, 0.4, 3.14, 0.06, 0.06, { side: T.flat(0x6a4c36) }); B.block(BX - 1.6, yy - 0.1, 3.2, 0.25); }
      // signpost
      const SP = [BX + 2.6, BY - 1.5];
      B.box(SP[0] - 0.05, SP[1] - 0.05, 0, 0.1, 0.1, 1.6, { side: T.wood, P: { c: 0x6a4a34 } }); B.box(SP[0] - 0.55, SP[1] - 0.03, 1.2, 0.7, 0.06, 0.22, { side: T.flat(0x9a7a50), noShadow: true }); B.box(SP[0] - 0.1, SP[1] - 0.03, 0.9, 0.7, 0.06, 0.22, { side: T.flat(0x8a6a44), noShadow: true }); B.blockC(SP[0], SP[1], 0.2);

      /* traveller's camp */
      const [cx, cy] = CAMP;
      for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283; E.blob([cx + Math.cos(a) * 0.36, cy + Math.sin(a) * 0.36, 0.05], 0.1, boulderTex(900 + i), { f: E.F_NOAO }); }
      B.box(cx - 0.25, cy - 0.05, 0, 0.5, 0.1, 0.1, { side: bark(0x4a3626) }); B.box(cx - 0.05, cy - 0.25, 0.06, 0.1, 0.5, 0.1, { side: bark(0x3a2a1e) });
      B.flames.push({ x: cx, y: cy, z: 0.16, s: 2.4 }); E.addLight(cx, cy, 0.7, 7, [1.0, 0.6, 0.25], 1.6); B.blockC(cx, cy, 0.45); B.smokes.push([cx, cy, 0.9]);
      const canvas = c => (s, t) => { const X = Math.floor(s * U), Y = Math.floor(t * 34); return mul(c, (X % 16 === 0 ? 0.82 : 0.96) + h2(X >> 2, Y >> 2) * 0.08 - (Y < 3 ? 0.15 : 0)); };
      const front = c => (s, t, q, a, b) => { const Ht = q.vl * V, Y = t * V, top = (1 - Math.abs(2 * a - 1)) * Ht; if (Y > top) return -1; if (Math.abs(2 * a - 1) < 0.5 * (1 - b * 1.25)) return Y < 3 ? 0x3a3038 : 0x221c24; return mul(c, top - Y < 3 ? 0.75 : 0.92 + h2(Math.floor(s * U) >> 2, 2) * 0.08); };
      B.gable(cx + 1.6, cy - 2.6, 0, 1.9, 2.3, 1.35, 'y', { tex: canvas(0xcdbd94), gtex: front(0xcdbd94), P: {}, GP: {}, ov: 0.06 }); B.block(cx + 1.6, cy - 2.6, 1.9, 2.3);
      B.gable(cx - 2.9, cy - 2.2, 0, 2.1, 1.8, 1.2, 'x', { tex: canvas(0x7a8aa0), gtex: front(0x7a8aa0), P: {}, GP: {}, ov: 0.06 }); B.block(cx - 2.9, cy - 2.2, 2.1, 1.8);
      B.box(cx - 0.7, cy + 1.0, 0, 1.4, 0.32, 0.26, { side: bark(0x5c4432), top: bark(0x6a5038) }); B.block(cx - 0.7, cy + 1.0, 1.4, 0.32);
      B.box(cx + 1.0, cy - 0.5, 0, 0.32, 1.2, 0.26, { side: bark(0x5c4432), top: bark(0x6a5038) }); B.block(cx + 1.0, cy - 0.5, 0.32, 1.2);
      B.crate(cx - 2.0, cy + 0.2); B.barrel(cx - 1.4, cy - 0.1); B.sack(cx - 1.9, cy + 1.0); B.sack(cx + 2.2, cy + 0.2, 0, 0xb89a6a); B.basket(cx + 1.6, cy + 0.9, 0, 0, 0.2); B.crate(cx + 2.6, cy + 0.6, 0, 0.42);
      B.poi(cx - 0.9, cy + 0.2, 'bench', 1, -0.2); B.poi(cx + 0.2, cy - 0.9, 'bench', -0.2, 1); B.poi(cx + 0.1, cy + 1.6, 'bench', 0, -1); B.poi(cx + 1.7, cy + 0.1, 'bench', -1, 0);

      /* ruined shrine */
      const [sx, sy] = SHR, pale = (s, t) => { const X = Math.floor(s * U), Y = Math.floor(t * V); return mul(0xb4ad9e, (X % 4 === 0 ? 0.8 : 1) * (0.92 + h2(X, Y >> 3) * 0.12)); };
      const hts = [2.7, 1.1, 2.3, 0.5, 1.7, 2.9];
      for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + 0.5, px = sx + Math.cos(a) * 1.75, py = sy + Math.sin(a) * 1.75, hh = hts[i];
        B.cyl(px, py, 0, 0.32, 0.18, 8, pale, { top: pale }); B.cyl(px, py, 0.18, 0.24, hh, 8, pale, { top: T.flat(0x8f8a80) });
        if (hh > 2) { B.cyl(px, py, 0.18 + hh, 0.33, 0.16, 8, pale, { top: pale }); }
        if (i % 2 === 0) B.ivy('y', px, py + 0.24, Math.min(hh, 1.8), 40 + i, 0.2);
        B.blockC(px, py, 0.34); }
      B.box(sx + 0.9, sy + 1.3, 0, 0.9, 0.3, 0.3, { side: pale, top: pale });   // fallen drum
      B.box(sx - 0.5, sy - 0.5, 0, 1.0, 1.0, 0.75, { side: T.facade, P: { mat: 'stone', seed: 77, tint: 0xb4ad9e, band: 30 }, top: (s, t) => { const X = Math.floor(s * U) - 16, Y = Math.floor(t * U) - 16, d = Math.hypot(X, Y); return (Math.abs(d - 10) < 1.2 || (Math.abs(X) < 1.2 && Math.abs(Y) < 8) || (Math.abs(Y - X) < 1.5 && d < 7) || (Math.abs(Y + X) < 1.5 && d < 7 && Y < 0)) ? (0x8af0ff | FE) : 0x9a948a; } });
      B.blockC(sx, sy, 0.7); E.addLight(sx, sy, 1.3, 5, [0.35, 0.8, 1.0], 1.3);
      for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.8; B.poi(sx + Math.cos(a) * 1.1, sy + Math.sin(a) * 1.1, 'chat', -Math.cos(a), -Math.sin(a)); }

      /* trees: scattered, but kept from hiding the trail, camp, bridge and shrine */
      const open = (x, y) => Math.abs(y - tyf(x)) < 1.6 || waterD(x, y) < 0.9 || Math.hypot(x - cx, y - cy) < 3.4 || Math.hypot(x - sx, y - sy) < 2.8;
      const hides = (x, y, hgt) => { for (let k = 1.4; k < hgt; k += 0.7) { const px = x - k, py = y - k; if (Math.abs(py - tyf(px)) < 1.1 || Math.hypot(px - cx, py - cy) < 1.6 || Math.hypot(px - sx, py - sy) < 1.5 || (Math.abs(px - BX) < 1.8 && Math.abs(py - BY) < 1.2) || Math.hypot(px - POND[0], py - POND[1]) < 2.0) return true; } return false; };
      let placed = [];
      for (let i = 0; i < 420 && placed.length < 78; i++) {
        const x = 0.8 + h2(i, 201) * 26.6, y = 5.6 + h2(i, 202) * 21.8, r = h2(i, 203);
        if (open(x, y)) continue;
        const kind = r < 0.42 ? 0 : r < 0.8 ? 1 : 2, hgt = kind === 0 ? 5.2 : kind === 1 ? 4.4 : 4.6;
        if (hides(x, y, hgt) && x + y < 44) continue;
        if (placed.some(p => Math.hypot(p[0] - x, p[1] - y) < 2.1)) continue;
        placed.push([x, y]);
        if (kind === 0) pine(x, y, 0, 0.95 + h2(i, 204) * 0.45);
        else if (kind === 1) B.tree(x, y, { s: 1.25 + h2(i, 204) * 0.5, pal: [T.LEAF_D, T.LEAF_G, T.LEAF_D, T.LEAF_Y][i & 3], flowers: null, n: 10 });
        else birch(x, y, 0.95 + h2(i, 204) * 0.3);
      }
      // undergrowth
      for (let i = 0; i < 150; i++) {
        const x = 0.6 + h2(i, 301) * 27, y = 5.4 + h2(i, 302) * 22.2, r = h2(i, 303);
        if (Math.abs(y - tyf(x)) < 1.2 || waterD(x, y) < 0.4 || Math.hypot(x - cx, y - cy) < 2.6 || Math.hypot(x - sx, y - sy) < 2.3) continue;
        if (r < 0.5) fern(x, y, 0.55 + h2(i, 304) * 0.5); else if (r < 0.68) B.bush(x, y, { s: 0.8 + h2(i, 304) * 0.5, fp: 0.14, noBlock: true }); else if (r < 0.8) boulder(x, y, 0.16 + h2(i, 304) * 0.3);
        else if (r < 0.93) { mushroom(x, y, 1.2); mushroom(x + 0.16, y + 0.07, 0.8); if (r < 0.87) mushroom(x - 0.05, y + 0.18, 1); } else if (r < 0.97) stump(x, y); else B.flowers(x - 0.3, y, x + 0.3, y + 0.2, 0.02, 6, i, 1.2);
      }
      log(5.2, tyf(5.4) + 2.0, 2.4); log(22.2, tyf(22.6) + 2.1, 2.0); log(17.2, 21.6, 2.2);
      // wayfarers stop along the trail
      for (const x of [2, 6.5, 10.5, 18.5, 23, 26.5]) B.poi(x, tyf(x) + (x % 2 ? 0.3 : -0.3), 'chat');
      B.poi(BX + 2.4, BY - 0.8, 'door', 0, -1);
      for (let i = 0; i < 46; i++) B.flies.push([1 + h2(i, 401) * 26, 6 + h2(i, 402) * 21, 0.5 + h2(i, 403) * 1.6, i]);
    },
  };

  /* =====================================================================
   *  Clifftop path: a long, solitary coastal trail.  The world is a diagonal band
   *  so it reads as a wide panorama; d = x - y runs along it, s = x + y across it.
   * ===================================================================== */
  const D0 = -50, D1 = 50, S0 = 50, S1 = 82, SEA = -2.4, DB = -18;
  const Cc = d => 66 + 1.6 * Math.sin(d * 0.21 + 2) + Math.sin(d * 0.5) + 0.5 * Math.sin(d * 1.1) + 2.6 * Math.exp(-(((d - 43) / 4.5) ** 2));
  const Ctr = d => Cc(d) - 4.4 - 1.5 * Math.sin(d * 0.11 + 0.5) - 0.8 * Math.sin(d * 0.31);
  const Hs = d => Math.min(56 + 1.8 * Math.sin(d * 0.15 + 1) + 1.2 * Math.sin(d * 0.41), Ctr(d) - 2.4);
  const W2 = (d, s) => [(s + d) / 2, (s - d) / 2];
  const MOOR = T.pal(['#5a7a3a', '#688a40', '#76964a', '#8aa052', '#9aa85a']), DRY = T.pal(['#a89a58', '#b8a860', '#9a8a4c']), HEATH = T.pal(['#9a6ab8', '#b88ad0', '#7a4a9a', '#c9a0dc']), GORSE = T.pal(['#e8c83a', '#f4dc5a', '#d9b02a']);
  function moor(x, y) {
    const tx = Math.floor(x * U), ty = Math.floor(y * U), n = T.fbm(x * 0.35, y * 0.35), r = h2(tx, ty >> 1);
    let i = Math.min(4, Math.max(0, (n * 4.8 + (h2(tx >> 1, ty >> 2) - 0.5) * 1.6) | 0));
    const dry = T.fbm(x * 0.8 + 9, y * 0.8); if (dry > 0.6 && h2(tx >> 1, ty >> 1) < (dry - 0.58) * 2.6) return DRY[(r * 3) | 0];
    const he = T.fbm(x * 0.6 + 40, y * 0.6); if (he > 0.58 && h2(tx >> 1, (ty >> 1) + 5) < (he - 0.58) * 1.8) return HEATH[(r * 4) | 0];
    if (h2(tx >> 1, (ty >> 1) + 77) < 0.004) return (tx & 1) === (ty & 1) ? 0xf4ecd6 : 0xeccb4c;
    if (r < 0.08) i = Math.min(4, i + 1); else if (r > 0.94) i = Math.max(0, i - 1);
    return MOOR[i];
  }
  function coastGround(x, y) {
    const s = x + y, d = x - y, tx = Math.floor(x * U), ty = Math.floor(y * U), n = T.fbm(x * 0.6, y * 0.6);
    if (Math.abs(d - DB) < 0.62 && s > Hs(DB) - 0.5) { if (Math.abs(d - DB) < 0.4 + (n - 0.5) * 0.2) return (T.fbm(x * 2, y * 2) > 0.5 ? 0x4aa0a0 : 0x3a8a92) | FWA; return h2(tx >> 1, ty >> 1) < 0.35 ? 0x9a9488 : mul(0x6e5e46, 0.85 + h2(tx, ty) * 0.25); }
    const dt = Math.abs(s - Ctr(d)), w = 1.0 + n * 0.4;
    if (d < 41.5 && dt < w) { const c = T.dirt(x, y); if (Math.abs(dt - 0.42) < 0.08) return mul(c, 0.84); if (dt > w - 0.26 && h2(tx >> 1, ty >> 1) < 0.5) return moor(x, y); return c; }
    const dc = Cc(d) - s; if (dc < 0.75 + n * 0.7) return h2(tx >> 1, ty >> 1) < (dc - 0.2) * 0.9 ? moor(x, y) : mul(ROCK[(h2(tx >> 2, ty >> 2) * ROCK.length) | 0], 0.9 + h2(tx, ty) * 0.16);
    return moor(x, y);
  }
  function seaTex(x, y) {
    const s = x + y, d = x - y, tx = Math.floor(x * U), ty = Math.floor(y * U), dc = s - Cc(d), fl = h2(tx >> 1, ty >> 1) < 0.1 ? FWA : 0;
    if (dc < -1.5) return -1;
    if (dc < 0.9 + T.vn(d * 0.8, 2) * 0.7) return (h2(tx >> 1, ty >> 1) < 0.55 ? 0xe4f2f2 : 0x8fc8cc) | fl;
    const wv = Math.sin(dc * 2.2 + T.vn(d * 0.25, 1) * 6 + T.vn(x * 0.9, y * 0.9) * 1.5); if (wv > 0.94) return 0x74b8c0 | fl;
    const n = T.fbm(x * 0.5, y * 0.5), b = dc < 2.5 ? 0x3a8e98 : dc < 5.5 ? 0x307c8c : 0x2a6c82;
    return mul(b, 0.9 + n * 0.22 + (wv < -0.9 ? -0.06 : 0)) | fl;
  }
  let hillY = [], hillY2 = [], hillH = [];
  const landZ = (x, y) => { const i = Math.floor(x); if (hillH[i] === undefined) return 0; return y < hillY2[i] ? hillH[i] + 1.3 : y < hillY[i] ? hillH[i] : 0; };
  function windTree(x, y, z, s) {
    const sd = sdc++ * 7, tex = T.leaves(PINE, null, 0), bk = bark(0x4f3a2c);
    B.taper(x, y, z, 0.26 * s, x + 0.05 * s, y - 0.05 * s, z + 0.4 * s, 0.16 * s, 7, bk); B.taper(x + 0.05 * s, y - 0.05 * s, z + 0.4 * s, 0.16 * s, x + 0.16 * s, y - 0.16 * s, z + 1.2 * s, 0.12 * s, 7, bk); B.taper(x + 0.16 * s, y - 0.16 * s, z + 1.2 * s, 0.12 * s, x + 0.36 * s, y - 0.36 * s, z + 2.1 * s, 0.06 * s, 7, bk);
    for (let i = 0; i < 14; i++) { const k = 0.15 + i * 0.075 + h2(sd, i) * 0.15; E.blob([x + k * s + (h2(sd + 1, i) - 0.5) * 0.7 * s, y - k * s + (h2(sd + 2, i) - 0.5) * 0.7 * s, z + (1.9 + h2(sd + 3, i) * 0.8) * s], (0.5 - i * 0.014) * s, tex, { seed: sd + i }); }
    if (!z) B.blockC(x, y, 0.3);
  }
  function cairn(x, y) { E.blob([x, y, 0.1], 0.2, boulderTex(sdc), { f: E.F_NOAO }); E.blob([x + 0.02, y, 0.32], 0.15, boulderTex(sdc + 1), { f: E.F_NOAO }); E.blob([x, y + 0.02, 0.5], 0.11, boulderTex(sdc + 2), { f: E.F_NOAO }); E.blob([x, y, 0.64], 0.07, () => 0xa39c8c, { f: E.F_NOAO }); sdc += 3; B.blockC(x, y, 0.22); }

  const cPts = []; for (const d of [D0, D1]) for (const s of [S0, S1]) for (const z of [SEA, 8]) cPts.push([(s + d) / 2, (s - d) / 2, z]);
  Scenes.coast = {
    name: 'Clifftop Path', view: { d0: D0, d1: D1, s0: S0, s1: S1, z: 8.5 }, bounds: Object.assign([0, 0, 64, 64, 8], { pts: cPts, sms: 26 }),
    focus: W2(-44, Ctr(-44)), focusZ: 1, king: W2(-45, Ctr(-45)), npcs: 0, walk: [0, 0, 64, 64], follow: true,
    blockFn: (x, y) => { const s = x + y, d = x - y; return s > Cc(d) - 0.6 || landZ(x, y) > 0 || s < S0 + 0.6 || d < D0 + 0.8 || d > D1 - 0.8 || (Math.abs(d - DB) < 0.55 && Math.abs(s - Ctr(DB)) > 1.1 && s > Hs(DB) - 0.5); },
    blurb: 'A long, solitary clifftop walk: just the king, the wind and the sea. Tap far along the path and the camera follows. The lighthouse is at the far end.',
    build() {
      hillY = []; hillY2 = []; hillH = [];
      Q([0, 0, SEA], [66, 0, 0], [0, 66, 0], seaTex, { n: [0, 0, 1], noShadow: true });
      // land: half-unit columns ending at a jagged cliff edge
      const colY = [];
      for (let i = 0; i < 128; i++) {
        const x = i * 0.5, xc = x + 0.25; let yc = 66 - xc; for (let k = 0; k < 5; k++) yc = Cc(xc - yc) - xc;
        yc = Math.round(yc * 4) / 4; colY[i] = yc; const yT = S0 - 6 - xc; if (yc <= yT) continue;
        B.box(x, yT, SEA, 0.5, yc - yT, -SEA, { side: rockTex, ty: (s, t, q) => rockTex(s + x, t, q), tx: (s, t, q) => rockTex(s + yc, t, q), P: { seed: 0 }, top: (s, t) => coastGround(x + s, yT + t) });
      }
      // inland hills: two terraces of rock
      for (let i = 0; i < 64; i++) {
        const xc = i + 0.5; let yh = 56 - xc; for (let k = 0; k < 5; k++) yh = Hs(xc - yh) - xc;
        yh = Math.round(yh + T.vn(i * 0.5, 4) * 1.2 - 0.6); const yT = S0 - 6 - xc, hh = 0.8 + Math.round(T.vn(i * 0.16, 8) * 4) * 0.45;
        if (yh <= yT) continue; hillY[i] = yh; hillY2[i] = yh - 1.5 - Math.round(T.vn(i * 0.3, 12) * 2); hillH[i] = hh;
        B.box(i, yT, 0, 1, yh - yT, hh, { side: rockTex, ty: (s, t, q) => rockTex(s + i, t, q), tx: (s, t, q) => rockTex(s + yh, t, q), P: { seed: 0 }, top: (s, t) => moor(i + s, yT + t) });
        if (hillY2[i] > yT) B.box(i, yT, hh, 1, hillY2[i] - yT, 1.3, { side: rockTex, ty: (s, t, q) => rockTex(s + i + 50, t, q), tx: (s, t, q) => rockTex(s + yh + 50, t, q), P: { seed: 0 }, top: (s, t) => moor(i + s + 30, yT + t) });
      }
      const at = (d, off) => W2(d, Ctr(d) + off);
      // brook, slab bridge and a thin fall off the cliff
      { const [bx, by] = W2(DB, Ctr(DB)); B.box(bx - 0.85, by - 0.85, 0, 1.7, 1.7, 0.13, { side: T.flat(0x8a857a), top: (s, t) => T.mul(T.stoneAt(Math.floor(s * 32), Math.floor(t * 32), 3, 0xa8a294), 1.05) });
        const [fx] = W2(DB, Cc(DB)), ci = Math.floor(fx / 0.5), fy = colY[ci] + 0.03, fallTex = (s, t) => { const r = h2(Math.floor(s * U), Math.floor(t * V) >> 3); return (r < 0.3 ? 0xd8f4f8 : r < 0.65 ? 0xa8e0ea : 0x7fc8d8) | NOAO; };
        Q([ci * 0.5, fy, SEA], [0.5, 0, 0], [0, 0, -SEA], fallTex, { n: [0, 1, 0], noShadow: true }); B.falls.push({ x0: ci * 0.5, x1: ci * 0.5 + 0.5, y: fy + 0.02, z0: SEA, z1: 0 }); }
      // start: signpost and an old gate
      { const [x, y] = at(-46.5, 1.5); B.box(x - 0.05, y - 0.05, 0, 0.1, 0.1, 1.6, { side: T.wood, P: { c: 0x6a4a34 } }); B.box(x - 0.1, y - 0.03, 1.2, 0.75, 0.06, 0.22, { side: T.flat(0x9a7a50), noShadow: true }); B.blockC(x, y, 0.2);
        for (const o of [-1.2, 1.2]) { const [gx, gy] = at(-47.5, o); B.box(gx - 0.09, gy - 0.09, 0, 0.18, 0.18, 1.1, { side: bark(0x5c4432), top: T.flat(0x7a6048) }); B.blockC(gx, gy, 0.2); } }
      for (const d of [-40, -31, -22.5, -12, -3, 7, 17, 26, 35]) { const [x, y] = at(d, (d & 1) ? 1.5 : -1.5); cairn(x, y); }
      { const [x, y] = at(-36, 2.0); windTree(x, y, 0, 1.25); } { const [x, y] = at(22, 2.2); windTree(x, y, 0, 1.1); } { const [x, y] = at(-4, -2.6); windTree(x, y, landZ(x, y), 1.0); }
      // standing stones
      { const [cx, cy] = at(-28, -3.4); for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283, x = cx + Math.cos(a) * 1.5, y = cy + Math.sin(a) * 1.5, z = landZ(x, y), hh = i === 3 ? 0.35 : 1.2 + h2(i, 3) * 0.7; B.box(x - 0.2, y - 0.14, z, i === 3 ? 1.1 : 0.4, 0.3, hh, { side: rockTex, P: { seed: i + 3 }, top: T.flat(0x7c776e) }); if (!z) B.block(x - 0.2, y - 0.14, 0.4, 0.3); } }
      // viewpoint bench
      { const [x, y] = at(-8, 1.9); B.bench(x, y, 'x'); }
      // ruined watchtower
      { const [x, y] = at(2, -3.3), st = { mat: 'stone', seed: 61, tint: 0x9a948a }; B.cyl(x, y, 0, 1.3, 2.4, 14, T.facade, { P: st, top: T.flat(0x4a4640), inner: 0.8 });
        for (let i = 0; i < 9; i++) { const a = 1.2 + i * 0.5, hh = 0.4 + h2(i, 9) * 1.5; B.box(x + Math.cos(a) * 1.12 - 0.22, y + Math.sin(a) * 1.12 - 0.22, 2.4, 0.44, 0.44, hh, { side: T.facade, P: st }); }
        B.ivy('y', x - 0.2, y + 1.28, 2.2, 71, 0.5); B.ivy('x', y + 0.1, x + 1.28, 1.6, 73, 0.4); B.blockC(x, y, 1.4); boulder(x + 1.9, y + 0.6, 0.3); boulder(x + 0.4, y + 1.9, 0.22); }
      // abandoned shepherd's hut
      { const [x, y] = at(12, -3.9); B.house({ x: x - 1.4, y: y - 1.2, w: 2.8, d: 2.4, floors: 0, h0: 1.6, base: 'stone', roof: T.ROOF_BROWN, rise: 1.25, axis: 'x', seed: 55, chimney: false, tint: 0x8f897e,
          fy: [{ k: 'door', x: 0.36, w: 16, h: 40, trim: 0xa8a294, lamp: false }, { k: 'win', x: 0.78, y: 22, w: 12, h: 18, sill: 0xa8a294, frame: 0x4d3528, box: false, lit: false }] }); }
      // lighthouse on the far headland, keeper's cottage
      { const [x, y] = W2(44.5, Ctr(44.5) + 0.6);
        const lh = (s, t, q) => { const X = Math.floor(s * U), Y = Math.floor(t * V), Ht = Math.round(q.vl * V), m = X % 46; if (m >= 20 && m < 25 && Y % 64 > 34 && Y % 64 < 48) return (m === 20 || Y % 64 === 47) ? 0x8a8478 : (0x263042 | (E.F_WIN << 24)); const red = Y > Ht * 0.36 && Y < Ht * 0.58; return mul(red ? 0xb8323a : 0xe8e4da, 0.93 + h2(X >> 2, Y >> 2) * 0.08 - (Y % 16 === 0 ? 0.06 : 0)); };
        B.cyl(x, y, 0, 1.2, 0.5, 16, T.facade, { P: { mat: 'stone', seed: 33, tint: 0x9a948a }, top: T.flat(0x8a857a) }); B.cyl(x, y, 0.5, 1.0, 4.9, 16, lh, {});
        B.cyl(x, y, 5.4, 1.3, 0.14, 16, T.flat(0x3a3a44), { top: T.flat(0x55555e) });
        B.cyl(x, y, 5.54, 0.7, 0.8, 10, (s, t) => (Math.floor(s * U) % 9 === 0 ? 0x30303a : (0xffe9a0 | FE)), {}); B.cone(x, y, 6.34, 0.92, 0.85, 10, T.roof, { P: { pal: T.ROOF_RED, seed: 2 } });
        E.blob([x, y, 7.3], 0.1, () => 0xd9b04a); E.addLight(x + 0.6, y + 0.6, 5.6, 11, [1.0, 0.86, 0.5], 1.5); E.addLight(x + 1.2, y + 1.2, 1.2, 4, null, 0.9); B.blockC(x, y, 1.3);
        B.house({ x: x - 4.6, y: y - 0.2, w: 3.0, d: 2.6, floors: 0, h0: 1.7, base: 'stone', roof: T.ROOF_SLATE, rise: 1.3, axis: 'x', seed: 57, tint: 0xc8c2b4,
          fy: [{ k: 'door', x: 0.34, w: 16, h: 40, trim: 0xa8a294 }, { k: 'win', x: 0.76, y: 22, w: 12, h: 18, sill: 0xa8a294, frame: 0x4d3528 }], fx: [{ k: 'win', x: 0.5, y: 22, w: 12, h: 18, sill: 0xa8a294, frame: 0x4d3528 }] }); }
      // sea stacks and rocks in the surf
      for (const p of [[-9, 3.4, 3.0], [19, 2.8, 2.2], [27, 4.4, 3.6], [-33, 3.0, 1.6], [36, 3.2, 1.2]]) { const [x, y] = W2(p[0], Cc(p[0]) + p[1]); B.box(x - 0.6, y - 0.5, SEA, 1.2, 1.0, p[2], { side: rockTex, P: { seed: p[0] | 0 }, top: (s, t) => moor(s + x, t + y) }); B.box(x + 0.5, y - 0.1, SEA, 0.7, 0.7, p[2] * 0.5, { side: rockTex, P: { seed: 9 }, top: T.flat(0x7c776e) }); if (p[2] > 2) B.bush(x, y, { z: SEA + p[2], s: 0.8, pal: FERN, flowers: null, noBlock: true }); }
      for (let i = 0; i < 44; i++) { const d = D0 + 2 + h2(i, 501) * 96, [x, y] = W2(d, Cc(d) + 0.5 + h2(i, 502) * 2.2); E.blob([x, y, SEA + 0.05], 0.14 + h2(i, 503) * 0.22, (dx, dy, ix, iy) => ROCK[(h2((ix + i) >> 2, (iy + (ix >> 1)) >> 2) * ROCK.length) | 0], { f: E.F_NOAO }); }
      // heather, gorse, ferns, boulders
      const heath = T.leaves(T.LEAF_D, HEATH, 0.34);
      for (let i = 0; i < 330; i++) {
        const d = D0 + 1 + h2(i, 601) * 98, s = S0 + 1 + h2(i, 602) * (Cc(d) - S0 - 2), [x, y] = W2(d, s), r = h2(i, 603), z = landZ(x, y);
        if (Math.abs(s - Ctr(d)) < 1.5 || Math.abs(d - DB) < 0.9 || d > 39) continue;
        if (r < 0.46) B.bush(x, y, { z, s: 0.6 + h2(i, 604) * 0.5, n: 3, pal: T.LEAF_D, flowers: HEATH, fp: 0.34, noBlock: true });
        else if (r < 0.62) B.bush(x, y, { z, s: 0.7 + h2(i, 604) * 0.5, n: 3, pal: FERN, flowers: GORSE, fp: 0.3, noBlock: true });
        else if (r < 0.74) B.bush(x, y, { z, s: 0.55 + h2(i, 604) * 0.4, n: 3, pal: FERN, flowers: null, noBlock: true });
        else if (r < 0.9 && !z) boulder(x, y, 0.14 + h2(i, 604) * 0.3);
        else if (r > 0.965 && z) windTree(x, y, z, 0.8 + h2(i, 604) * 0.3);
      }
      for (let i = 0; i < 9; i++) B.gulls.push([D0 + 8 + i * 10.5, 3.5 + h2(i, 701) * 4, 2.2 + h2(i, 702) * 2.6, i * 1.7, 1.6 + h2(i, 703) * 1.6]);
    },
  };

  /* =====================================================================
   *  Deepwood: a long trail through old, dense forest (same band-shaped world).
   *  Trees behind the trail are packed tight; on the near side only tall-trunked
   *  giants are allowed, so the path is seen through a colonnade of trunks.
   * ===================================================================== */
  const GD0 = -50, GD1 = 50, GS0 = 47, GS1 = 70, GBR = -24;
  const Gt = d => 61 + 2.2 * Math.sin(d * 0.13) + 1.2 * Math.sin(d * 0.31 + 1) + 0.6 * Math.sin(d * 0.7);
  const gW = (d, off) => W2(d, Gt(d) + off);
  const GPOND = gW(-2, -5.0), GPOOL = (() => { const p = gW(34, -4.4); return [p[0], p[1] + 1.0]; })();
  const DEEP = T.pal(['#22462c', '#2a5530', '#336436', '#3d743a', '#48843f']);
  function deepFloor(x, y) {
    const tx = Math.floor(x * U), ty = Math.floor(y * U), n = T.fbm(x * 0.4, y * 0.4), r = h2(tx, ty >> 1);
    let i = Math.min(4, Math.max(0, (n * 4.6 + (h2(tx >> 1, ty >> 2) - 0.5) * 1.7) | 0));
    const lit = T.fbm(x * 0.9 + 20, y * 0.9);
    if (lit > 0.5 && h2(tx >> 1, ty >> 1) < (lit - 0.5) * 2.2) return LITTER[(r * 4) | 0];
    const ms = T.fbm(x * 1.7 + 60, y * 1.7); if (ms > 0.66) return h2(tx >> 1, ty >> 1) < 0.5 ? 0x5a8a3a : 0x6e9c44;
    if (h2(tx >> 1, (ty >> 1) + 77) < 0.003) return (tx & 1) === (ty & 1) ? BLOOM[(h2(tx >> 3, ty >> 3) * 5) | 0] : 0xf4e27a;
    if (r < 0.07) i = Math.min(4, i + 1); else if (r > 0.93) i = Math.max(0, i - 1);
    return DEEP[i];
  }
  function deepGround(x, y) {
    const s = x + y, d = x - y, tx = Math.floor(x * U), ty = Math.floor(y * U), n = T.fbm(x * 0.6, y * 0.6);
    if (s < GS0 - 7.5) return -1;
    const bd = Math.abs(d - GBR - Math.sin(s * 0.5) * 0.35);
    if (bd < 0.66) { if (bd < 0.44 + (n - 0.5) * 0.2) return (T.fbm(x * 2, y * 2) > 0.5 ? 0x3f9494 : 0x2f7c86) | FWA; return h2(tx >> 1, ty >> 1) < 0.35 ? 0x8a8478 : mul(0x5e5040, 0.85 + h2(tx, ty) * 0.25); }
    const pd = Math.min(Math.hypot(x - GPOND[0], y - GPOND[1]) - 1.75, Math.hypot(x - GPOOL[0], y - GPOOL[1]) - 1.25) + (n - 0.5) * 0.3;
    if (pd < 0) { const w = T.fbm(x * 1.6, y * 1.6); return (pd > -0.2 ? 0x4a9a98 : w > 0.55 ? 0x2f7f86 : 0x286e7a) | FWA; }
    if (pd < 0.3) return h2(tx >> 1, ty >> 1) < 0.3 ? 0x8a8478 : mul(0x5e5040, 0.85 + h2(tx, ty) * 0.25);
    const dt = Math.abs(s - Gt(d)), w = 0.85 + n * 0.4;
    if (dt < w) {
      if (T.fbm(x * 1.3 + 7, y * 1.3) > 0.64 || (dt > w - 0.28 && h2(tx >> 1, ty >> 1) < 0.55)) return deepFloor(x, y);
      const rt = (x * 1.3 + y * 0.45 + T.vn(x * 0.8, y * 0.8) * 1.6) % 3.3; if (Math.abs(rt - 1.6) < 0.045) return (tx + ty) & 1 ? 0x4a3626 : 0x5c4432;
      const c = mul(T.dirt(x, y), 0.8); return Math.abs(dt - 0.36) < 0.07 ? mul(c, 0.85) : c;
    }
    return deepFloor(x, y);
  }
  function giant(x, y, s) {
    const sd = sdc++ * 17, bk = bark(0x4a372b), tex = T.leaves(T.LEAF_D, null, 0), tex2 = T.leaves(PINE, null, 0), moss = T.leaves(FERN, null, 0);
    B.taper(x, y, 0, 0.98 * s, x, y, 0.8 * s, 0.58 * s, 12, bk); B.taper(x, y, 0.8 * s, 0.58 * s, x, y, 5.0 * s, 0.33 * s, 12, bk);
    for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283 + h2(sd, i), rr = 0.86 * s; B.taper(x + Math.cos(a) * rr, y + Math.sin(a) * rr, 0, 0.2 * s, x + Math.cos(a) * 0.4 * s, y + Math.sin(a) * 0.4 * s, (0.7 + h2(sd + 1, i) * 0.5) * s, 0.1 * s, 5, bk); }   // buttress roots
    for (let i = 0; i < 4; i++) { const a = i * 1.57 + h2(sd + 13, i) * 1.2, rr = (1.2 + h2(sd + 14, i) * 0.5) * s; B.taper(x, y, (3.4 + i * 0.3) * s, 0.2 * s, x + Math.cos(a) * rr, y + Math.sin(a) * rr, (4.9 + i * 0.15) * s, 0.07 * s, 6, bk); }   // limbs
    for (let i = 0; i < 7; i++) { const a = 0.8 + h2(sd + 2, i) * 2.2; E.blob([x + Math.cos(a) * 0.55 * s, y + Math.sin(a) * 0.55 * s, 0.2 + h2(sd + 3, i) * 1.5], 0.12 + h2(sd + 4, i) * 0.1, moss, { seed: sd + i }); }
    const top = 5.9 * s;
    E.blob([x, y, top], 1.55 * s, tex, { seed: sd });
    for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283 + h2(sd + 5, i) * 0.7, rr = (1.3 + h2(sd + 6, i) * 0.9) * s; E.blob([x + Math.cos(a) * rr, y + Math.sin(a) * rr, top - (0.9 - h2(sd + 7, i) * 1.3) * s], (0.85 + h2(sd + 8, i) * 0.4) * s, i % 3 ? tex : tex2, { seed: sd + i * 3 }); }
    for (let i = 0; i < 9; i++) { const a = h2(sd + 9, i) * 6.283, rr = h2(sd + 10, i) * 1.6 * s; E.blob([x + Math.cos(a) * rr, y + Math.sin(a) * rr, top + (0.7 + h2(sd + 11, i) * 0.9) * s], (0.45 + h2(sd + 12, i) * 0.3) * s, tex, { seed: sd + i * 5 }); }
    B.blockC(x, y, 0.62 * s);
  }
  function glowshroom(x, y, s) { s = s || 1; B.box(x - 0.025, y - 0.025, 0, 0.05, 0.05, 0.12 * s, { side: T.flat(0xc8e8e0), noShadow: true }); E.blob([x, y, 0.15 * s], 0.08 * s, (dx, dy) => (dy < -0.2 ? 0xb8fff0 : 0x5ad8c8) | FE); }
  const fallTexG = (s, t) => { const r = h2(Math.floor(s * U), Math.floor(t * V) >> 3); return (r < 0.3 ? 0xd8f4f8 : r < 0.65 ? 0xa8e0ea : 0x7fc8d8) | NOAO; };
  const gPts = []; for (const d of [GD0, GD1]) for (const s of [GS0, GS1]) for (const z of [0, 9.5]) gPts.push([(s + d) / 2, (s - d) / 2, z]);

  Scenes.deep = {
    name: 'Deepwood Trail', view: { d0: GD0, d1: GD1, s0: GS0, s1: GS1, z: 9.5 }, bounds: Object.assign([0, 0, 62, 62, 9.5], { pts: gPts, sms: 26 }),
    focus: gW(-45, 0), focusZ: 1.5, king: gW(-46, 0), npcs: 0, walk: [0, 0, 62, 62], follow: true,
    times: { day: { amb: [0.37, 0.45, 0.5], sun: [1.02, 0.9, 0.55] }, dusk: { amb: [0.34, 0.33, 0.5] }, night: { amb: [0.17, 0.22, 0.38], sun: [0.2, 0.28, 0.5] } },
    blockFn: (x, y) => { const s = x + y, d = x - y; return s < GS0 + 0.6 || s > GS1 - 0.4 || d < GD0 + 0.8 || d > GD1 - 0.8 || (Math.abs(d - GBR) < 0.75 && Math.abs(s - Gt(GBR)) > 1.0) || Math.hypot(x - GPOND[0], y - GPOND[1]) < 1.9 || Math.hypot(x - GPOOL[0], y - GPOOL[1]) < 1.4; },
    blurb: 'A long walk through old, deep forest. The path is seen between giant trunks; the canopy shade is real. Tap far along the trail and the camera follows. Try Night for the glowing mushrooms.',
    build() {
      Q([0, 0, 0], [62, 0, 0], [0, 62, 0], deepGround, { n: [0, 0, 1] });
      const ledge = (x, y, w, dd, hh, sd, o) => B.box(x, y, 0, w, dd, hh, Object.assign({ side: rockTex, P: { seed: sd }, top: (s, t) => deepFloor(s + x, t + y) }, o || {}));
      // features to keep visible: [d, offset from trail, half-width in d]
      const KO = [[-34, -2.8, 3.2], [GBR, -14, 1.3], [-12, -4.4, 3.6], [-2, -5.0, 4.4], [10, -3.4, 3.2], [22, -3.8, 3.8], [34, -4.4, 4.2], [45, -3.8, 5.5]];
      const clear = (d, s) => KO.some(k => Math.abs(d - k[0]) < k[2] && s > Gt(k[0]) + k[1] - 2.0);

      /* start: way-stone */
      { const [x, y] = gW(-47.5, 1.4); B.box(x - 0.2, y - 0.15, 0, 0.4, 0.3, 1.0, { side: rockTex, P: { seed: 2 }, top: T.flat(0x6a8a44) }); B.blockC(x, y, 0.3); }
      /* fallen giant beside the path */
      { const [x, y] = gW(-34, -2.8); B.box(x - 1.8, y - 0.35, 0, 3.6, 0.7, 0.66, { side: bark(0x4a372b), top: (s, t) => (T.fbm(s * 3, t * 3) > 0.5 ? (h2(Math.floor(s * U), Math.floor(t * U)) < 0.5 ? 0x5a8a3a : 0x6e9c44) : bark(0x56402f)(s, t)), tx: (s, t, q, a, b) => { const c = rings(s, t, q, a, b); return c < 0 ? 0x4a372b : c; } });
        B.block(x - 1.8, y - 0.35, 3.6, 0.7); for (let i = 0; i < 6; i++) mushroom(x - 1.5 + i * 0.55, y + 0.45 + h2(i, 3) * 0.2, 0.8 + h2(i, 4) * 0.6); fern(x - 2.2, y + 0.2, 0.9); fern(x + 2.1, y - 0.1, 0.8); stump(x + 2.9, y - 0.8); }
      /* brook + plank bridge */
      { const [x, y] = gW(GBR, 0); B.box(x - 0.95, y - 0.95, 0, 1.9, 1.9, 0.14, { side: T.wood, P: { c: 0x5a4030 }, top: (s, t) => T.planks(s, t, 0x7a5c40) });
        for (let i = 0; i < 12; i++) { const ss = GS0 + 2 + i * 1.8, [bx, by] = W2(GBR + Math.sin(ss * 0.5) * 0.35 + (h2(i, 5) - 0.5) * 0.7, ss); if (Math.abs(ss - Gt(GBR)) > 1.6) E.blob([bx, by, 0.02], 0.12 + h2(i, 6) * 0.12, boulderTex(i), { f: E.F_NOAO }); }
        for (let i = 0; i < 14; i++) { const ss = GS0 + 1 + h2(i, 7) * 21, [bx, by] = W2(GBR + (i & 1 ? 1.05 : -1.05), ss); if (Math.abs(ss - Gt(GBR)) > 1.5) fern(bx, by, 0.5 + h2(i, 8) * 0.4); } }
      /* mossy outcrop with a cave mouth */
      { const [x, y] = gW(-12, -4.4); const cave = (s, t, q) => { const ex = (s - q.ul * 0.5) / 0.8, ey = (t - 0.1) / 1.25; if (ex * ex + ey * ey < 1) return t < 0.12 ? 0x2a2428 : ex * ex + ey * ey > 0.8 ? 0x241e24 : 0x141016; return rockTex(s, t, q); };
        ledge(x - 2.2, y - 2.4, 4.4, 2.4, 2.4, 11, { ty: cave }); ledge(x - 1.5, y - 3.3, 3.0, 1.7, 3.7, 12); ledge(x + 2.0, y - 2.0, 1.4, 1.6, 1.2, 13); B.block(x - 2.2, y - 3.3, 5.6, 3.3);
        pine(x - 1.2, y - 1.6, 2.4, 0.75); pine(x + 0.3, y - 2.6, 3.7, 0.8); B.bush(x + 1.2, y - 0.9, { z: 2.4, s: 0.9, pal: FERN, flowers: null, noBlock: true }); B.bush(x + 2.6, y - 1.2, { z: 1.2, s: 0.8, pal: FERN, flowers: null, noBlock: true });
        boulder(x - 2.7, y + 0.5, 0.4); boulder(x + 2.4, y + 0.4, 0.3); fern(x - 1.4, y + 0.5, 0.8); fern(x + 1.3, y + 0.6, 0.7); }
      /* pond clearing with deer */
      { const [x, y] = GPOND; for (let i = 0; i < 11; i++) { const a = i * 2.4, r = 0.4 + h2(i, 8) * 1.1; B.disk(x + Math.cos(a) * r, y + Math.sin(a) * r, 0.012, 0.09 + h2(i, 2) * 0.05, (s, t, q, u, v) => (i % 4 ? (u > 0.5 && Math.abs(v - 0.5) < 0.12 ? 0x2f7f86 : 0x5a9a4a) : 0xf0a0b4), { noShadow: true, f: E.F_NOAO }); }
        for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283; if (a > 0.2 && a < 1.5) continue; fern(x + Math.cos(a) * 2.1, y + Math.sin(a) * 2.1, 0.55 + h2(i, 9) * 0.4); }
        boulder(x - 1.9, y + 0.9, 0.34); boulder(x + 0.6, y - 2.0, 0.28); B.deer.push([x + 1.95, y + 0.75, 1, 1]); B.deer.push([x + 0.5, y + 2.25, 0, 4]); }
      /* fairy ring + rune stone */
      { const [x, y] = gW(10, -3.4); for (let i = 0; i < 11; i++) { const a = i / 11 * 6.283; glowshroom(x + Math.cos(a) * 1.05, y + Math.sin(a) * 1.05, 0.9 + h2(i, 3) * 0.7); }
        B.box(x - 0.22, y - 0.16, 0, 0.44, 0.32, 1.25, { side: rockTex, P: { seed: 21 }, ty: (s, t, q) => { const X = Math.floor(s * U) - 7, Y = Math.floor(t * V) - 30; return (Math.abs(X) < 1 && Math.abs(Y) < 8) || (Math.abs(Y - X) < 1 && Math.abs(X) < 4 && Y > -1) || (Math.abs(Y + 4 + X) < 1 && Math.abs(X) < 4) ? (0x8af0ff | FE) : rockTex(s, t, q); }, top: T.flat(0x5a8a3a) });
        B.blockC(x, y, 0.3); E.addLight(x + 0.3, y + 0.3, 0.6, 4.6, [0.3, 0.85, 0.9], 1.2); for (let i = 0; i < 5; i++) fern(x + Math.cos(i * 1.3 + 2.5) * 1.9, y + Math.sin(i * 1.3 + 2.5) * 1.9, 0.7); }
      /* old woodcutter's clearing */
      { const [x, y] = gW(22, -3.8); stump(x - 1.4, y + 0.4); stump(x + 0.2, y - 1.2); stump(x + 1.9, y + 0.6);
        for (let r = 0; r < 3; r++) for (let i = 0; i < 3 - r; i++) B.box(x - 1.2, y - 0.9 + i * 0.36 + r * 0.18, r * 0.32, 1.7, 0.34, 0.32, { side: bark(0x5c4432), top: bark(0x66503a), tx: (s, t, q, a, b) => { const c = rings(s, t, q, a, b); return c < 0 ? 0x5c4432 : c; } });
        B.block(x - 1.2, y - 0.9, 1.7, 1.1); B.cart(x + 0.6, y + 1.2);
        B.box(x - 1.46, y + 0.36, 0.32, 0.05, 0.05, 0.5, { side: T.flat(0x6a4a34), noShadow: true }); B.box(x - 1.56, y + 0.36, 0.72, 0.24, 0.05, 0.14, { side: T.flat(0xa8aeb8), noShadow: true });
        for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; E.blob([x - 0.2 + Math.cos(a) * 0.34, y + 2.0 + Math.sin(a) * 0.34, 0.05], 0.09, boulderTex(700 + i), { f: E.F_NOAO }); } }
      /* rock face with a waterfall and pool */
      { const [x, y] = gW(34, -4.4); ledge(x - 2.5, y - 2.9, 5.0, 2.7, 3.0, 31); ledge(x - 1.8, y - 3.8, 3.5, 1.7, 4.5, 32); ledge(x + 2.5, y - 2.4, 1.5, 1.8, 1.4, 33); ledge(x - 3.6, y - 2.2, 1.2, 1.6, 1.0, 34); B.block(x - 3.6, y - 3.8, 7.6, 3.7);
        Q([x - 0.45, y - 0.18, 0], [0.9, 0, 0], [0, 0, 3.0], fallTexG, { n: [0, 1, 0], noShadow: true }); B.falls.push({ x0: x - 0.45, x1: x + 0.45, y: y - 0.16, z0: 0, z1: 3.0 });
        Q([x - 0.45, y - 2.1, 3.015], [0.9, 0, 0], [0, 1.9, 0], (s, t) => T.water(s + 3, t), { n: [0, 0, 1], noShadow: true });
        pine(x - 1.6, y - 1.4, 3.0, 0.8); pine(x + 1.5, y - 1.2, 3.0, 0.7); pine(x + 0.6, y - 3.1, 4.5, 0.8); B.bush(x + 3.1, y - 1.5, { z: 1.4, s: 0.9, pal: FERN, flowers: null, noBlock: true });
        boulder(x - 1.7, y + 0.6, 0.42); boulder(x + 1.6, y + 1.3, 0.34); boulder(x + 1.1, y + 2.4, 0.22); for (let i = 0; i < 7; i++) fern(x - 2 + i * 0.7, y + 2.3 + h2(i, 5) * 0.4, 0.6); }
      /* hermit's cottage at the end of the trail */
      { const [x, y] = gW(45.2, -3.9); B.house({ x: x - 1.6, y: y - 1.5, w: 3.3, d: 2.9, floors: 1, axis: 'x', seed: 91, plaster: 0xd8c8a0, shutter: 0x4f7a52, roof: T.ROOF_BROWN, rise: 1.7,
          fy: [{ k: 'door', x: 0.33, w: 18, h: 44, trim: 0xa8a294 }, { k: 'win', x: 0.76, y: 24, w: 14, h: 22, sill: 0xb8ae9c, frame: 0x4d3528, curtain: 0xa84a3a }], fx: [{ k: 'win', x: 0.5, y: 24, w: 14, h: 22, sill: 0xb8ae9c, frame: 0x4d3528, curtain: 0xd9c070 }] });
        B.ivy('y', x - 1.3, y + 1.4, 2.6, 81, 0.4); B.ivy('x', y - 1.1, x + 1.7, 2.2, 83, 0.4); B.barrel(x + 2.2, y + 1.9); B.crate(x + 2.1, y + 0.9); B.pot(x - 2.0, y + 1.9, 0xa8604a); stump(x + 3.2, y + 2.6); B.bench(x - 0.2, y + 2.0, 'x');
        for (let i = 0; i < 5; i++) glowshroom(x - 2.6 + h2(i, 2) * 0.8, y + 2.6 + h2(i, 3) * 0.6, 1); }

      /* the forest itself */
      const placed = [];
      const far = (i, d, s) => { const [x, y] = W2(d, s), r = h2(i, 813); if (placed.some(p => Math.hypot(p[0] - x, p[1] - y) < p[2] + (r < 0.24 ? 1.5 : 0.95))) return;
        if (r < 0.24) { placed.push([x, y, 1.5]); giant(x, y, 0.85 + h2(i, 814) * 0.3); } else if (r < 0.55) { placed.push([x, y, 0.95]); pine(x, y, 0, 1.0 + h2(i, 814) * 0.5); }
        else if (r < 0.86) { placed.push([x, y, 0.95]); B.tree(x, y, { s: 1.3 + h2(i, 814) * 0.55, pal: [T.LEAF_D, T.LEAF_D, T.LEAF_G, PINE][i & 3], flowers: null, n: 10 }); } else { placed.push([x, y, 0.8]); birch(x, y, 1.0 + h2(i, 814) * 0.3); } };
      for (let i = 0; i < 2600; i++) { const d = GD0 + 0.5 + h2(i, 811) * 99, s = GS0 - 7 + h2(i, 812) * (Gt(d) - 1.9 - GS0 + 7); if (clear(d, s) || Math.abs(d - GBR) < 1.2) continue; far(i, d, s); }
      // near side: only tall-trunked giants, spaced out, so the path shows between them
      let lastD = -99;
      for (let d = GD0 + 3; d < GD1 - 2; d += 1.1) { const s = Gt(d) + 2.0 + h2(d * 10 | 0, 821) * 2.2; if (d - lastD < 7.5 + h2(d * 10 | 0, 822) * 4 || Math.abs(d - GBR) < 1.6 || KO.some(k => Math.abs(d - k[0]) < 2.6 && k[0] !== GBR)) continue; const [x, y] = W2(d, s); giant(x, y, 0.95 + h2(d * 10 | 0, 823) * 0.25); lastD = d; }
      // undergrowth everywhere
      for (let i = 0; i < 620; i++) {
        const d = GD0 + 0.6 + h2(i, 831) * 98.8, s = GS0 + 0.6 + h2(i, 832) * (GS1 - GS0 - 1), [x, y] = W2(d, s), r = h2(i, 833), dt = Math.abs(s - Gt(d));
        if (dt < 1.25 || Math.abs(d - GBR) < 0.9 || Math.hypot(x - GPOND[0], y - GPOND[1]) < 2.3 || Math.hypot(x - GPOOL[0], y - GPOOL[1]) < 1.6 || placed.some(p => Math.hypot(p[0] - x, p[1] - y) < 0.7)) continue;
        if (r < 0.52) fern(x, y, 0.55 + h2(i, 834) * 0.55); else if (r < 0.66) B.bush(x, y, { s: 0.8 + h2(i, 834) * 0.5, pal: T.LEAF_D, fp: 0.08, noBlock: true });
        else if (r < 0.78) boulder(x, y, 0.15 + h2(i, 834) * 0.28); else if (r < 0.9) { mushroom(x, y, 1.2); mushroom(x + 0.16, y + 0.07, 0.8); if (r < 0.84) mushroom(x - 0.05, y + 0.18, 1); }
        else if (r < 0.94) { glowshroom(x, y, 1.1); glowshroom(x + 0.15, y + 0.1, 0.8); glowshroom(x - 0.1, y + 0.16, 0.9); if (h2(i, 835) < 0.3) E.addLight(x, y, 0.4, 2.6, [0.3, 0.85, 0.8], 0.8); }
        else if (r < 0.97 && s > Gt(d)) stump(x, y);
      }
      for (let i = 0; i < 70; i++) { const d = GD0 + 2 + h2(i, 841) * 96, [x, y] = W2(d, Gt(d) + (h2(i, 842) - 0.5) * 9); B.flies.push([x, y, 0.5 + h2(i, 843) * 1.8, i]); }
    },
  };

  /* ---------- extra effects: fire, waterfall, fireflies / butterflies ---------- */
  Sim.fx = [function (t) {
    for (let k = 0; k < B.flames.length; k++) {
      const f = B.flames[k], sx = Math.round(E.sx(f.x, f.y)), sy = Math.round(E.sy(f.x, f.y, f.z)), d = f.x + f.y + f.z + 0.4, ph = Math.floor(t * 10 + k * 3);
      const hgt = Math.round((7 + h2(ph, k) * 5) * f.s), w = Math.round(2.6 * f.s);
      for (let y = 0; y < hgt; y++) { const ww = Math.max(0, Math.round(w * (1 - y / hgt) + (h2(ph, (y >> 1) + k) - 0.5) * 2)), lean = Math.round((h2(ph + 1, k) - 0.5) * 3 * y / hgt);
        for (let x = -ww; x <= ww; x++) E.px(sx + x + lean, sy - y, d, y < hgt * 0.3 ? (Math.abs(x) < ww * 0.5 ? 0xfff2a8 : 0xffc84a) : y < hgt * 0.65 ? (Math.abs(x) < ww * 0.5 ? 0xffc84a : 0xff9a2e) : 0xe0521e); }
      for (let i = 0; i < 5; i++) { const u = (t * 0.7 + i * 0.2 + k * 0.3) % 1, ex = sx + Math.round(Math.sin(u * 9 + i * 2) * 5), ey = sy - hgt - Math.round(u * 26); E.px(ex, ey, d + 1, u < 0.6 ? 0xffc84a : 0xe0521e); if (u < 0.3) E.px(ex + 1, ey, d + 1, 0xffe27a); }
    }
    const night = E.light.night && E.light.lampScale > 0.8, w1 = night ? 0x9ab8e0 : 0xffffff, w2 = night ? 0x6a8ac0 : 0xcfeef6;
    for (let k = 0; k < B.falls.length; k++) {
      const f = B.falls[k], n = Math.round((f.x1 - f.x0) * 70);
      for (let i = 0; i < n; i++) {
        const x = f.x0 + h2(i, k + 1) * (f.x1 - f.x0), u = (t * (0.7 + h2(i, 2) * 0.5) + h2(i, 3)) % 1, z = f.z1 - (f.z1 - f.z0) * u * (0.35 + 0.65 * u);
        const sx = Math.round(E.sx(x, f.y)), sy = Math.round(E.sy(x, f.y, z)), d = x + f.y + z + 0.2, len = 3 + (i % 5);
        for (let j = 0; j < len; j++) E.px(sx, sy + j, d, j < 2 ? w1 : w2);
      }
      const fl = Math.floor(t * 9);
      for (let i = 0; i < 60; i++) { const x = f.x0 - 0.25 + h2(i, fl + k) * (f.x1 - f.x0 + 0.5), y = f.y + h2(i + 9, fl) * 0.45, z = f.z0 + h2(i + 5, fl) * 0.22; const sx = Math.round(E.sx(x, y)), sy = Math.round(E.sy(x, y, z)); E.px(sx, sy, x + y + z + 0.4, w1); if (i & 1) E.px(sx + 1, sy, x + y + z + 0.4, w2); }
    }
    for (const f of B.flies) {
      const s = f[3], x = f[0] + Math.sin(t * 0.5 + s) * 0.9 + Math.sin(t * 1.3 + s * 2) * 0.3, y = f[1] + Math.cos(t * 0.4 + s * 1.7) * 0.9, z = f[2] + Math.sin(t * 0.9 + s) * 0.3;
      const sx = Math.round(E.sx(x, y)), sy = Math.round(E.sy(x, y, z)), d = x + y + z + 0.2;
      if (night) { const b = Math.sin(t * 2.2 + s * 1.9); if (b < -0.2) continue; E.px(sx, sy, d, 0xf0ffa0); E.px(sx + 1, sy, d, 0xf0ffa0); E.px(sx, sy + 1, d, 0xd8f070); E.px(sx + 1, sy + 1, d, 0xd8f070); if (b > 0.4) { E.px(sx - 1, sy, d, 0x8aa84a); E.px(sx + 2, sy + 1, d, 0x8aa84a); E.px(sx, sy - 1, d, 0x8aa84a); E.px(sx + 1, sy + 2, d, 0x8aa84a); } }
      else if (s % 3 === 0) { const c = [0xf8f4e8, 0xf4d85a, 0x8ac8f4, 0xf09ab8][s % 4], up = Math.floor(t * 9 + s) & 1; E.px(sx, sy, d, 0x3a3038); E.px(sx - 1, sy - (up ? 1 : 0), d, c); E.px(sx + 1, sy - (up ? 1 : 0), d, c); if (up) { E.px(sx - 2, sy - 2, d, c); E.px(sx + 2, sy - 2, d, c); } else { E.px(sx - 2, sy, d, c); E.px(sx + 2, sy, d, c); } }
    }
    for (const g of B.deer) {       // deer at the pond
      const x = g[0], y = g[1], flip = g[2], sd = g[3], sx = Math.round(E.sx(x, y)), sy = Math.round(E.sy(x, y, 0)), d0 = x + y + 0.1, L = E.lightAt(x, y, 0);
      const P = (dx, dy, c) => E.px(sx + (flip ? -dx : dx), sy - dy, d0 + dy / 40, (Math.min(255, (c >> 16 & 255) * L[0]) << 16) | (Math.min(255, (c >> 8 & 255) * L[1]) << 8) | (Math.min(255, (c & 255) * L[2]) | 0));
      const R = (x0, y0, x1, y1, c) => { for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) P(xx, yy, c); };
      const TAN = 0xb5824f, DK = 0x7a5232, CR = 0xe8dcc0, HO = 0x2e2420, graze = Math.sin(t * 0.45 + sd) > 0.15, ear = Math.sin(t * 3 + sd) > 0.85 ? 1 : 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -11; dx <= 11; dx++) if (dx * dx / 121 + dy * dy / 5 < 1) E.dark(sx + dx, sy + dy, d0, 0.68);
      R(-8, 0, -7, 9, DK); R(-5, 0, -4, 9, TAN); R(5, 0, 6, 9, DK); R(8, 0, 9, 9, TAN); R(-8, 0, -7, 0, HO); R(-5, 0, -4, 0, HO); R(5, 0, 6, 0, HO); R(8, 0, 9, 0, HO);
      R(-9, 9, 10, 16, TAN); R(-8, 17, 9, 17, DK); R(-9, 15, 10, 16, DK); R(-6, 9, 7, 9, CR); R(-10, 11, -9, 15, CR); P(-11, 14, CR); P(-11, 15, DK);
      if (sd & 4) for (let i = 0; i < 6; i++) P(-6 + i * 3, 13 + (i & 1), CR);
      if (graze) { for (let i = 0; i < 7; i++) R(9 + i, 12 - i, 12 + i, 15 - i, i > 5 ? DK : TAN); R(15, 3, 20, 6, TAN); R(20, 3, 21, 4, HO); P(17, 5, HO); P(15, 7 + ear, DK); P(14, 8 + ear, DK); }
      else { for (let i = 0; i < 8; i++) R(8 + (i >> 1), 15 + i, 12 + (i >> 1), 16 + i, TAN); R(11, 23, 17, 27, TAN); R(18, 23, 19, 25, TAN); R(19, 23, 20, 24, HO); P(15, 26, HO); R(12, 23, 15, 23, CR); P(11, 28 + ear, DK); P(10, 29 + ear, DK); P(13, 28, DK);
        if (!(sd & 4)) { for (let i = 0; i < 5; i++) { P(12, 28 + i, 0xd8c8a0); P(15, 28 + i, 0xd8c8a0); } P(11, 31, 0xd8c8a0); P(10, 32, 0xd8c8a0); P(16, 31, 0xd8c8a0); P(17, 32, 0xd8c8a0); P(13, 32, 0xd8c8a0); P(16, 33, 0xd8c8a0); } }
    }
    for (const g of B.gulls) {      // gulls wheeling over the water
      const a = t * 0.3 + g[3], d = g[0] + Math.cos(a) * g[4] * 2.2, ss = Cc(d) + g[1] + Math.sin(a) * g[4], x = (ss + d) / 2, y = (ss - d) / 2, z = g[2] + Math.sin(t * 0.5 + g[3]) * 0.4;
      const sx = Math.round(E.sx(x, y)), sy = Math.round(E.sy(x, y, z)), dd = x + y + z + 3, fl = Math.sin(t * 5 + g[3] * 3), c = night ? 0x8a94b0 : 0xf4f4f0, c2 = night ? 0x5a6480 : 0x9aa0a8;
      E.px(sx, sy, dd, c); E.px(sx + 1, sy, dd, c2);
      for (let k = 1; k <= 5; k++) { const oy = Math.round(-fl * k * 0.55 + (k > 3 ? (k - 3) * 0.6 : 0)); E.px(sx - k, sy + oy, dd, k > 3 ? c2 : c); E.px(sx + 1 + k, sy + oy, dd, k > 3 ? c2 : c); }
    }
  }];
})();
