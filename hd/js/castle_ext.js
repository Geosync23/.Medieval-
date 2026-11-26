'use strict';
/* Castle layout 2: an L-shaped keep and three outdoor areas (great court, lower bailey, garden terrace). */
(function () {
  const h2 = E.h2, CS = Kit.CS, F = () => (typeof Fz !== 'undefined' ? Fz : null);
  const slit = (x, y) => ({ k: 'awin', x, y, w: 12, h: 26, frame: 0x4a4038, sill: 0xc4bcaa, box: false });
  const arch = (x, w, h, lit) => ({ k: 'gothic', x, w: w || 26, h: h || 58, trim: 0xc4bcaa, lit: lit !== false });
  const door = (x, o) => Object.assign({ k: 'door', x, w: 18, h: 44, trim: 0xb0a898 }, o || {});
  const win = (x, o) => Object.assign({ k: 'win', x, y: 24, w: 14, h: 24, sill: 0xb8ae9c, frame: 0x4d3528, curtain: 0xa84a3a }, o || {});
  const RED = 0xb8323a, BLUE = 0x34508f, GOLD = 0xd9a83a;
  const use = (name, ...args) => { const f = F(); if (f && f[name]) { f[name](...args); return true; } return false; };   // furniture is optional while it is being built
  // stair + landing against the inside of a wall
  function wallStairX(x0, len, y, h, dir) { Kit.stairs(x0, y, len, 1.0, dir, 0, h); const lx = dir === '-x' ? x0 - 1 : x0 + len; Kit.walk(lx, y - 0.4, lx + 1, y + 1, h); B.box(lx, y, 0, 1, 1, h, { side: T.facade, P: CS(8, { band: 0 }), top: Kit.paving }); B.block(lx, y, 1, 1, 0); return [lx, lx + 1]; }
  function wallStairY(y0, len, x, h, dir) { Kit.stairs(x, y0, 1.0, len, dir, 0, h); const ly = dir === '-y' ? y0 - 1 : y0 + len; Kit.walk(x - 0.4, ly, x + 1, ly + 1, h); B.box(x, ly, 0, 1, 1, h, { side: T.facade, P: CS(9, { band: 0 }), top: Kit.paving }); B.block(x, ly, 1, 1, 0); return [ly, ly + 1]; }

  const SLATE = () => T.ROOF_SLATE, norm = E.norm;
  const hedge = (x, y, w, d, o) => { if (!(w >= d ? use('hedge', x, y, 0, Object.assign({ len: w, w: d, h: 0.7 }, o || {})) : use('hedge', x, y, 0, Object.assign({ len: d, w: w, h: 0.7, face: 'x' }, o || {})))) { B.box(x, y, 0, w, d, 0.6, { side: T.flat(0x356e3a), top: T.flat(0x4d9440) }); B.block(x, y, w, d, 0); } };
  const stoneP = (seed, o) => CS(seed, Object.assign({ quoin: true, band: 104 }, o || {}));
  const tall = (x, y) => ({ k: 'glass', x, y: y || 44, w: 18, h: 96 });
  // lean-to roof against a wall running along x: from the wall (y = yw, height zh) down to y = yw + depth
  function leanTo(x0, x1, yw, depth, zh, drop, pal, seed) { E.quad([x0, yw + depth, zh - drop], [x1 - x0, 0, 0], [0, -depth, drop], T.roof, { P: { pal, seed }, n: norm([0, drop, depth]) }); E.quad([x0, yw + depth, zh - drop - 0.14], [x1 - x0, 0, 0], [0, 0, 0.14], T.flat(0x5a4030), { n: [0, 1, 0], noShadow: true }); }

  /* =====================================================================
   *  LAYOUT 2 — an L-shaped castle spread over three outdoor areas.
   *
   *  GREAT COURT: the keep is two ranges meeting at a great round tower.  The north range (royal
   *  lodgings) has a steep slate roof with dormers; the lower west range (great hall) has tall windows
   *  and a flat, battlemented roof you can walk on.  The court lies in the crook of the L.
   * ===================================================================== */
  Castle.add('inner', {
    name: 'Great Court', blurb: 'The keep wraps two sides of the court: royal range to the north, great hall range to the west, the great tower between them.', bounds: [0, 0, 39, 35, 15.8], spawn: [22, 24, 0], shadow: { sms: 22 },
    build(a) {
      const CX = 22.5, CY = 21;
      Kit.floor(0, 0, 39, 35, (x, y) => {
        const n = T.fbm(x * 0.5, y * 0.5), d = Math.hypot(x - CX, y - CY), tx = Math.floor(x * 32), ty = Math.floor(y * 32);
        if (d < 3.6) return T.radial(x, y, CX, CY);
        if (x > 12 && x < 33 && y > 13 && y < 29.4) { const m = Math.max(Math.abs(x - CX), Math.abs(y - CY)); if (Math.abs(x - CX) < 1.0 || Math.abs(y - CY) < 1.0 || Math.abs(m - 7.6) < 0.6) return h2(tx >> 1, ty >> 1) < 0.5 ? 0xcfc4a8 : 0xbdb294; if (m < 7.6) return T.grass(x, y); }
        return n > 0.72 ? T.cobble(x, y) : Kit.paving(x, y);
      }, 0);
      const H = 4.2, HF = 2.6;
      // ---- north range: royal lodgings, pitched roof ----
      const NX = 6, NY = 2, NW = 23, ND = 7, NH = 6.6;
      const rowsN = [].concat(...[0.1, 0.24, 0.62, 0.76, 0.9].map(x => [slit(x, 150), { k: 'awin', x, y: 40, w: 14, h: 34, frame: 0x4a4038, sill: 0xc4bcaa }]));
      B.box(NX, NY, 0, NW, ND, NH, { side: T.facade, noTop: true, Py: stoneP(70, { feats: rowsN.concat([arch(0.43, 34, 76)]) }), Px: stoneP(71, { feats: [tall(0.5, 60), slit(0.2, 40), slit(0.8, 40)] }) });
      B.gable(NX, NY, NH, NW, ND, 3.6, 'x', { P: { pal: T.ROOF_SLATE, seed: 4 }, GP: stoneP(72, { gfeat: { k: 'glass', w: 22, h: 48, y: 10 } }), ov: 0.3 });
      for (const dp of [0.12, 0.3, 0.58, 0.76, 0.92]) { const dx = NX + NW * dp - 0.6, dy = NY + ND * 0.5, dz = NH + 3.6 * 0.16; B.box(dx, dy, dz, 1.2, ND * 0.36, 0.9, { side: T.facade, P: stoneP(73, { band: 0, quoin: false, feats: [{ k: 'awin', x: 0.5, y: 6, w: 12, h: 22, frame: 0x4a4038, sill: 0xc4bcaa }] }), noTop: true }); B.gable(dx, dy, dz + 0.9, 1.2, ND * 0.36, 0.6, 'y', { P: { pal: T.ROOF_SLATE, seed: 5 }, GP: stoneP(74, { band: 0, quoin: false }), ov: 0.12 }); }
      for (const cx of [NX + 6, NX + 17]) { B.box(cx, NY + 2.6, NH, 0.7, 0.7, 4.6, { side: T.facade, P: CS(76, { band: 0, tint: 0x9a6a58 }) }); B.smokes.push([cx + 0.35, NY + 2.95, NH + 4.9]); }
      B.block(NX, NY, NW, ND, 0);
      // porch before the great door
      const PX = NX + NW * 0.43;
      B.box(PX - 1.7, NY + ND, 0, 3.4, 2.0, 3.6, { side: T.facade, noTop: true, Py: stoneP(77, { band: 0, feats: [arch(0.5, 40, 88)] }), Px: stoneP(78, { band: 0, feats: [slit(0.5, 60)] }) }); B.gable(PX - 1.7, NY + ND, 3.6, 3.4, 2.0, 1.5, 'y', { P: { pal: T.ROOF_SLATE, seed: 6 }, GP: stoneP(79, { band: 0 }), ov: 0.2 });
      B.block(PX - 1.7, NY + ND, 1.0, 2.0, 0); B.block(PX + 0.7, NY + ND, 1.0, 2.0, 0);
      B.box(PX - 1.9, NY + ND + 2.0, 0, 3.8, 0.9, 0.16, { side: T.facade, P: CS(3, { band: 0 }), top: Kit.paving }); Kit.walk(PX - 1.9, NY + ND + 1.2, PX + 1.9, NY + ND + 2.9, 0.16);
      Kit.portal(PX, NY + ND + 1.7, 0.16, { to: 'hall', at: 'door', name: 'keep', label: 'The Keep', ex: PX, ey: NY + ND + 3.6 });
      use('statue', PX - 2.7, NY + ND + 2.6, 0, { kind: 'king' }); use('statue', PX + 2.7, NY + ND + 2.6, 0, { kind: 'knight' });
      use('banner', NX + 3.2, NY + ND + 0.02, 0, { h: 5.6, face: 'y', c: RED, len: 2.6 }); use('banner', NX + 19.6, NY + ND + 0.02, 0, { h: 5.6, face: 'y', c: RED, len: 2.6 });
      // ---- west range: great hall, flat battlemented roof you can walk on ----
      const WX = 2, WY = 9, WW = 7, WD = 20, WH = 5.4;
      Kit.block(WX, WY, WW, WD, WH, { seed: 80, band: 108, fx: [tall(0.14), tall(0.3), tall(0.46), tall(0.62), tall(0.78), slit(0.92, 60)], fy: [tall(0.5), slit(0.2, 150), slit(0.8, 150)] });
      for (let i = 0; i < 5; i++) { const y = WY + WD - (0.22 + i * 0.16) * WD - 0.3; B.box(WX + WW, y, 0, 0.5, 0.6, 3.6, { side: T.facade, P: CS(82, { band: 0 }), top: T.flat(0xb4ad9e) }); }      // buttresses between the hall windows
      Kit.portal(WX + 3.5, WY + 10.5, WH, { to: 'royal', at: 'roofstair', name: 'roof', label: 'Down to the royal apartments', ex: WX + 3.5, ey: WY + 9 });
      for (const g of [[WX + 5.6, WY + 4], [WX + 5.6, WY + 13], [WX + 2, WY + WD - 0.9]]) Kit.person({ role: 'guard', name: 'Sentry', at: [g[0], g[1], WH], fixed: [1, 0.4] });
      use('brazier', WX + 1.2, WY + 8, WH, {}); B.flags.push({ x: WX + 3.5, y: WY + 1.2, z: WH, c: BLUE, pole: 1.8 });
      // ---- the great tower at the corner, and stair turrets at the ends of the ranges ----
      Kit.tower(5.6, 5.6, 4.3, 11.2, { seed: 12, n: 20, levels: [70, 170, 270, 370], flag: null });
      Kit.tower(5.6, 5.6, 1.7, 2.4, { z: 11.7, seed: 14, n: 12, roof: T.ROOF_SLATE, roofH: 3.4, flag: RED, levels: [30] });
      Kit.tower(NX + NW, NY + ND, 1.5, 9.4, { seed: 20, n: 12, roof: T.ROOF_SLATE, flag: BLUE, levels: [120, 240, 330] });
      Kit.tower(WX + WW, WY + WD, 1.5, 7.6, { seed: 21, n: 12, roof: T.ROOF_SLATE, flag: BLUE, levels: [120, 230] });
      // ---- kitchen wing at the foot of the hall range ----
      B.house({ x: 2.4, y: 29.3, w: 5.6, d: 3.4, floors: 0, h0: 2.3, base: 'stone', tint: 0x9a948a, axis: 'y', roof: T.ROOF_BROWN, rise: 2.0, seed: 86, jetty: 0, chimney: true, fx: [win(0.3, { box: false }), door(0.72, { lamp: false })] });
      B.barrel(8.6, 30.2); B.barrel(9.1, 30.8); use('stack', 8.5, 32.0, 0, { kind: 'sacks' });
      // ---- curtain walls beyond the ranges, the astronomer's tower, lower near walls with a bastion ----
      Kit.curtain('x', 2.4, NX + NW, 37, H, 1.5, { seed: 51, feats: [slit(0.5, 70)] });
      Kit.tower(34.6, 4.4, 2.3, 9.4, { seed: 12, roof: T.ROOF_SLATE, roofH: 5, flag: GOLD, levels: [56, 136, 216, 296] });
      Kit.portal(33.6, 7.6, 0, { to: 'study', at: 'down', name: 'studytower', label: "Astronomer's tower", ex: 32.8, ey: 8.8 });
      Kit.curtain('x', 32.4, 9, 37.5, HF, 1.5, { feats: [slit(0.2, 40), slit(0.75, 40)], seed: 55, openLo: [[28, 29]] });
      Kit.curtain('y', 36, 3.9, 32.4, HF, 1.5, { feats: [slit(0.3, 40), slit(0.6, 40)], seed: 57 });
      Kit.stairs(24, 31.4, 4, 1.0, '+x', 0, HF); Kit.walk(28, 31.4, 29, 32.8, HF); B.box(28, 31.4, 0, 1, 1, HF, { side: T.facade, P: CS(8, { band: 0 }), top: Kit.paving }); B.block(28, 31.4, 1, 1, 0);
      Kit.tower(20, 33.4, 2.3, 3.2, { seed: 9, flag: RED, n: 14 }); Kit.tower(36.8, 33.2, 2.0, 3.6, { seed: 10, flag: BLUE });
      // ---- bath house and games hall ----
      B.house({ x: 29.4, y: 10.6, w: 6.2, d: 5.0, floors: 1, axis: 'x', seed: 97, plaster: 0xe9c9a0, shutter: 0x8a4038, roof: T.ROOF_BROWN, fy: [win(0.16), door(0.5), win(0.84)], fx: [win(0.5)] });
      Kit.portal(32.5, 16.3, 0, { to: 'rec', at: 'door', name: 'rec', label: 'Bath house & games hall', ex: 32.5, ey: 17.4 });
      // ---- gates ----
      Kit.portal(35.2, 24.5, 0, { to: 'ward', at: 'innergate', name: 'gate', label: 'Down to the lower bailey', ex: 33.8, ey: 24.5 });
      use('brazier', 35.2, 23.2, 0, {}); use('brazier', 35.2, 25.8, 0, {});
      Kit.portal(13.5, 31.6, 0, { to: 'garden', at: 'gate', name: 'garden', label: 'Garden terrace', ex: 13.5, ey: 30.2 });
      use('roseArch', 12.65, 30.4, 0, {});
      // ---- the court: fountain, lawns, clipped trees ----
      B.fountain(CX, CY);
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) { const cx = CX + sx * 4.3, cy = CY + sy * 4.3;
        if (!use('flowerbed', cx - 1.4, cy - 1.4, 0, { w: 2.8, d: 2.8, seed: sx * 3 + sy + 5, kind: ['roses', 'tulips', 'lavender', 'white'][(sx + 1) + (sy + 1) / 2] })) B.bush(cx, cy, {});
        use('topiary', cx + sx * 2.3, cy + sy * 2.3, 0, { kind: 'cone', pot: false }); }
      for (const p of [[CX - 7.6, CY - 8.9], [CX + 4.6, CY - 8.9], [CX - 9, CY + 4]]) use('stoneBench', p[0], p[1], 0, { face: p[1] < CY - 8 ? 'y' : 'x' });
      for (const p of [[12.2, 12.4], [18.6, 12.2], [27.5, 12.6], [11.6, 20], [11.6, 27]]) use('plant', p[0], p[1], 0, { kind: 'tree', s: 1.5 });
      for (const p of [[14, 12.6], [20.6, 12.6], [26, 18], [30, 26], [16, 29.6], [10.8, 23.6]]) B.lamp(p[0], p[1]);
      B.tree(31.5, 28.6, { s: 1.3, pal: T.LEAF_D, flowers: null, n: 10 }); use('well', 28.6, 19.6, 0, { roof: true }); use('sundial', CX + 9.2, CY + 5.6, 0, {});
      for (let i = 0; i < 2; i++) Kit.person({ role: 'villager', name: 'Gardener', apron: true, hat: 1, kinds: ['tend'], at: [CX + i * 3 - 2, CY + 6, 0] });
      Kit.person({ role: 'noble', name: 'Lady of the court', fem: true, kinds: ['sit', 'tend'], at: [CX + 3, CY - 6, 0] }); Kit.person({ role: 'noble', name: 'Courtier', fem: false, kinds: ['sit'], at: [CX - 6, CY + 3, 0] });
      for (const g of [[PX - 1.2, NY + ND + 3.2], [PX + 1.2, NY + ND + 3.2], [34.4, 23.2], [34.4, 25.8]]) Kit.person({ role: 'guard', name: 'Keep guard', at: [g[0], g[1], 0], fixed: [0.3, 1] });
    },
  });

  /* =====================================================================
   *  LOWER BAILEY: a long yard below the keep.  A broad stair climbs a terrace to the upper gate;
   *  the gatehouse stands at the far end.
   * ===================================================================== */
  Castle.add('ward', {
    name: 'Lower Bailey', blurb: 'The working yard: barracks, smithy, stables and drill ground. The broad stair leads up to the great court.', bounds: [0, 0, 51, 27, 10.2], spawn: [22, 17, 0], shadow: { sms: 22 },
    build(a) {
      Kit.floor(0, 0, 51, 27, (x, y) => {
        const n = T.fbm(x * 0.45, y * 0.45), dT = Math.max(Math.abs(x - 19.5) - 5.2, Math.abs(y - 15.8) - 4.2);
        if (dT < 0.3 + n) return T.dirt(x, y);
        if (y < 10.4 + n * 1.4 || Math.abs(y - 12.9) < 1.6 + n * 0.8 || x < 13 + n || x > 41 - n) return T.cobble(x, y);
        return n > 0.52 ? T.grass(x, y) : T.dirt(x, y);
      }, 0);
      const H = 4.2, HF = 2.6, TZ = 1.4;
      Kit.curtain('x', 2, 2, 49, H, 1.6, { feats: [slit(0.2, 70), slit(0.42, 70), slit(0.66, 70), slit(0.88, 70)], openHi: [[10.5, 11.5]] });
      Kit.curtain('y', 2, 3.6, 25, H, 1.6, { feats: [arch(0.56, 40, 84)], seed: 37 });
      wallStairX(11.5, 5, 3.6, H, '-x');
      Kit.curtain('x', 23.4, 2, 49, HF, 1.6, { feats: [slit(0.15, 40), slit(0.5, 40), slit(0.85, 40)], seed: 41, openLo: [[33, 34]] });
      Kit.stairs(29, 22.4, 4, 1.0, '+x', 0, HF); Kit.walk(33, 22.4, 34, 23.8, HF); B.box(33, 22.4, 0, 1, 1, HF, { side: T.facade, P: CS(8, { band: 0 }), top: Kit.paving }); B.block(33, 22.4, 1, 1, 0);
      Kit.curtain('y', 47.4, 3.6, 23.4, 2.8, 1.6, { feats: [slit(0.14, 44), slit(0.86, 44)], seed: 43 });
      // towers: tall watchtower at the back corner, a drum tower half-way along the back wall
      Kit.tower(2.9, 2.9, 2.4, 6.6, { flag: RED, seed: 3 }); Kit.tower(26, 2.6, 2.1, 5.4, { seed: 4, roof: T.ROOF_SLATE, flag: BLUE }); Kit.tower(48.2, 2.9, 2.0, 5.0, { seed: 5, roof: T.ROOF_SLATE, flag: BLUE });
      Kit.tower(2.9, 24.2, 2.0, 4.4, { seed: 6, roof: T.ROOF_SLATE, flag: BLUE }); Kit.tower(48.2, 24.2, 2.0, 3.6, { seed: 8, flag: RED });
      Kit.portal(5.9, 2.8, H, { to: 'ward', at: 'watchtop', name: 'watchfoot', label: 'Watchtower ↑', ex: 6.8, ey: 2.8 });
      Kit.portal(2.9, 2.9, 7.1, { to: 'ward', at: 'watchfoot', name: 'watchtop', label: 'Down ↓', ex: 3.6, ey: 3.6 });
      // ---- terrace and grand stair up to the upper gate ----
      B.box(3.6, 8.6, 0, 5.2, 9.4, TZ, { side: T.facade, P: CS(66, { band: 0, tint: 0xb0aaa0 }), top: Kit.paving }); Kit.walk(3.6, 8.6, 8.8, 18, TZ); B.block(3.6, 8.6, 5.2, 9.4, 0);
      Kit.stairs(8.8, 11.2, 2.6, 4.2, '-x', 0, TZ, { tint: 0xc0b8a8 });
      for (const y of [8.6, 17.74]) B.box(3.6, y, TZ, 5.2, 0.26, 0.5, { side: T.facade, P: CS(67, { band: 0 }), top: T.flat(0xb4ad9e) }); B.block(3.6, 8.6, 5.2, 0.26, TZ); B.block(3.6, 17.74, 5.2, 0.26, TZ);
      for (const y of [8.86, 10.9]) B.box(8.54, y, TZ, 0.26, y < 10 ? 2.3 : 0.01, 0.5, { side: T.facade, P: CS(67, { band: 0 }), top: T.flat(0xb4ad9e) }); B.box(8.54, 15.4, TZ, 0.26, 2.34, 0.5, { side: T.facade, P: CS(67, { band: 0 }), top: T.flat(0xb4ad9e) }); B.block(8.54, 8.86, 0.26, 2.3, TZ); B.block(8.54, 15.4, 0.26, 2.34, TZ);
      use('brazier', 8.0, 10.2, TZ, {}); use('brazier', 8.0, 16.3, TZ, {}); use('statue', 9.6, 10.2, 0, { kind: 'knight' }); use('statue', 9.6, 16.4, 0, { kind: 'knight' });
      use('banner', 3.62, 10.2, 0, { h: 4.0, face: 'x', c: RED, len: 2.0 }); use('banner', 3.62, 16.4, 0, { h: 4.0, face: 'x', c: RED, len: 2.0 });
      Kit.portal(4.5, 13.3, TZ, { to: 'inner', at: 'gate', name: 'innergate', label: 'Up to the great court', ex: 6.2, ey: 13.3 });
      // ---- gatehouse at the far end (its face looks out along the yard) ----
      Kit.block(46.6, 9.2, 3.2, 2.6, 4.6, { seed: 60, fx: [slit(0.5, 100)] }); Kit.block(46.6, 14.4, 3.2, 2.6, 4.6, { seed: 62, fx: [slit(0.5, 100)] });
      B.box(47.4, 11.8, 0, 1.6, 2.6, 4.6, { side: T.facade, Px: CS(64, { feats: [arch(0.5, 50, 96, false)] }), top: Kit.paving }); Kit.walk(47.5, 11.8, 48.8, 14.4, 4.6); B.block(47.4, 11.8, 1.6, 2.6, 0);
      use('banner', 49.82, 10.5, 0, { h: 4.2, face: 'x', c: BLUE, len: 2.0 }); use('banner', 49.82, 15.7, 0, { h: 4.2, face: 'x', c: BLUE, len: 2.0 });
      Kit.portal(46.4, 13.1, 0, { name: 'gate', label: 'Village gate (to come)', r: 0.6 });
      // ---- barracks, smithy, stables along the back wall ----
      B.house({ x: 13.6, y: 3.9, w: 10.4, d: 4.6, floors: 1, base: 'stone', tint: 0xa8a49c, axis: 'x', roof: T.ROOF_SLATE, seed: 81, jetty: 0, rise: 2.5, chimney: true, fy: [win(0.12), door(0.36, { lamp: true }), win(0.6), win(0.84)], fx: [win(0.5)] });
      Kit.portal(17.34, 9.2, 0, { to: 'barracks', at: 'door', name: 'barracks', label: 'Barracks', ex: 17.34, ey: 10.2 });
      B.house({ x: 29, y: 3.9, w: 5.2, d: 4.0, floors: 0, h0: 2.0, base: 'stone', axis: 'x', roof: T.ROOF_BROWN, rise: 1.8, seed: 88, tint: 0x8a7a6a, fy: [{ k: 'open', x: 0.4, w: 36, h: 50, trim: 0x6a5a4a, lit: true, lamp: false }, win(0.82, { box: false })] });
      use('anvil', 30.4, 9.0, 0, {}); use('forge', 32.4, 8.4, 0, { face: 'y' }); use('grindstone', 28.6, 9.2, 0, {}); B.barrel(34.4, 8.5);
      // open-fronted stable range: stalls under a lean-to roof
      for (let i = 0; i < 5; i++) use('horseStall', 36.2 + i * 1.8, 3.8, 0, { face: 'y', coat: ['bay', 'grey', 'chestnut', 'black', 'dun'][i] });
      leanTo(35.9, 45.5, 3.6, 3.3, 3.5, 1.1, T.ROOF_BROWN, 7); for (let i = 0; i <= 5; i++) B.box(36.1 + i * 1.8, 6.6, 0, 0.14, 0.14, 2.4, { side: T.wood, P: { c: 0x6a4a34 } });
      use('hayBale', 44.4, 7.4, 0, { n: 3 }); use('trough', 37, 8.0, 0, {}); use('saddleRack', 40.4, 7.6, 0, {});
      B.pois.push({ x: 39, y: 8.2, z: 0, kind: 'stable', fx: 0, fy: -1 }, { x: 42.4, y: 8.2, z: 0, kind: 'stable', fx: 0, fy: -1 });
      // ---- drill ground ----
      use('sparRing', 17.8, 14.4, 0, { w: 3.6, d: 3.2 });
      for (const p of [[14.6, 18.6], [14.6, 16.2], [24.4, 18.4]]) use('dummy', p[0], p[1], 0, {});
      for (const p of [[15.4, 12.2], [18.4, 12.0], [21.4, 12.2]]) use('archeryButt', p[0], p[1], 0, { face: 'y', range: 5 });
      use('weaponRack', 24.6, 14.2, 0, { face: 'x' }); use('weaponRack', 24.6, 16.4, 0, { face: 'x' }); use('weights', 23.2, 19.6, 0, {}); use('armour', 12.6, 9.6, 0, {});
      // ---- yard dressing ----
      use('well', 30.5, 16.5, 0, { roof: true }); B.cart(36, 14.6); B.tree(40.5, 19.6, { s: 1.4, pal: T.LEAF_D, flowers: null, n: 10 }); B.tree(11.6, 21, { s: 1.2 });
      use('stack', 26.4, 8.6, 0, { kind: 'barrels' }); use('stack', 43.6, 11, 0, { kind: 'crates' }); B.sack(12.6, 10.6);
      for (const p of [[12, 9.4], [27.6, 11.4], [35.4, 11.2], [44.6, 11.6], [44.6, 16.6], [28, 20.6], [10.4, 19.6]]) B.lamp(p[0], p[1]);
      for (let i = 0; i < 12; i++) B.bush(27 + h2(i, 1) * 17, 17.5 + h2(i, 2) * 4.5, { s: 0.8 + h2(i, 3) * 0.4, noBlock: true });
      for (const g of [[45.8, 11.6, 0], [45.8, 14.6, 0], [14, 2.8, H], [36, 2.8, H], [2.8, 20, H], [20, 24.2, HF], [40, 24.2, HF], [2.9, 3.6, 7.1], [7.6, 9.6, TZ], [7.6, 17, TZ]]) Kit.person({ role: 'guard', name: 'Guard', at: g, fixed: [0.6, 0.8] });
      Kit.person({ role: 'villager', name: 'Stable hand', kinds: ['stable'], at: [40, 9, 0] }); Kit.person({ role: 'villager', name: 'Groom', kinds: ['stable'], at: [43, 9, 0] }); Kit.person({ role: 'villager', name: 'Blacksmith', apron: true, kinds: ['smith'], at: [31.5, 9.8, 0] });
      for (let i = 0; i < 5; i++) Kit.person({ role: 'guard', name: 'Man-at-arms', kinds: ['train'], at: [16 + i * 1.5, 17, 0] });
    },
  });

  /* =====================================================================
   *  GARDEN TERRACE: chapel and cloister, hedge maze, lily pond with a pavilion, orchard,
   *  kitchen garden, and the staff wing.
   * ===================================================================== */
  Castle.add('garden', {
    name: 'Garden Terrace', blurb: 'Pleasure gardens below the hall range: the chapel and its cloister, a hedge maze, the lily pond and the orchard.', bounds: [0, 0, 46, 31, 9.2], spawn: [23, 26, 0], shadow: { sms: 22 },
    build(a) {
      const gravel = (x, y) => h2(Math.floor(x * 32) >> 1, Math.floor(y * 32) >> 1) < 0.5 ? 0xcfc4a8 : 0xbdb294;
      const MX = 18.5, MY = 18.5;                    // maze centre
      Kit.floor(0, 0, 46, 31, (x, y) => {
        if (y < 7.2 && x > 13.2 && x < 33) return Kit.paving(x, y);                                          // cloister walk
        if (Math.abs(y - 10.2) < 0.9 || Math.abs(x - 26.4) < 0.9 || Math.abs(y - 27.2) < 0.8 || (x < 10.4 && x > 8.2)) return gravel(x, y);
        if (Math.max(Math.abs(x - MX), Math.abs(y - MY)) < 6.4) return gravel(x, y);
        return T.grass(x, y);
      }, 0);
      const H = 3.6;
      Kit.curtain('x', 1.5, 1.5, 44.5, H, 1.5, { seed: 51, feats: [slit(0.6, 60), slit(0.85, 60)] }); Kit.curtain('y', 1.5, 3, 29.5, H, 1.5, { seed: 53 });
      Kit.tower(2.2, 2.2, 2.0, 5.0, { seed: 9, roof: T.ROOF_SLATE, flag: BLUE }); Kit.tower(44.2, 2.4, 1.9, 4.6, { seed: 10, flag: RED });
      // low garden wall on the near sides, with urns
      const low = (x, y, w, d) => { B.box(x, y, 0, w, d, 1.1, { side: T.facade, P: CS(58, { band: 0, tint: 0xb0aaa0 }), top: T.flat(0xbdb5a4) }); B.block(x, y, w, d, 0); };
      low(3, 29.2, 17.6, 0.5); low(24.6, 29.2, 20.4, 0.5); low(44.5, 3.9, 0.5, 25.8);
      for (const x of [6, 12, 18, 28, 34, 40]) use('statue', x, 29.45, 1.1, { kind: 'urn', ph: 0.1, s: 0.8 }); for (const y of [8, 14, 20, 26]) use('statue', 44.75, y, 1.1, { kind: 'urn', ph: 0.1, s: 0.8 });
      Kit.portal(22.6, 29.0, 0, { to: 'inner', at: 'garden', name: 'gate', label: 'Great court', ex: 22.6, ey: 27.6 }); use('roseArch', 21.75, 28.4, 0, {});
      // ---- chapel with a bell-cote ----
      B.house({ x: 3.4, y: 3.2, w: 9.4, d: 6.2, floors: 0, h0: 3.8, base: 'stone', gmat: 'stone', tint: 0xb0aaa0, axis: 'x', roof: T.ROOF_SLATE, jetty: 0, seed: 91, rise: 3.3, chimney: false, gfeat: { k: 'glass', w: 26, h: 56, y: 10 },
        fy: [{ k: 'glass', x: 0.14, y: 40, w: 16, h: 84 }, { k: 'glass', x: 0.34, y: 40, w: 16, h: 84 }, arch(0.6, 24, 60), { k: 'glass', x: 0.86, y: 40, w: 16, h: 84 }], fx: [{ k: 'glass', x: 0.3, y: 40, w: 16, h: 84 }, { k: 'glass', x: 0.7, y: 40, w: 16, h: 84 }] });
      B.box(4.0, 4.9, 3.8, 1.3, 1.3, 4.4, { side: T.facade, P: CS(93, { quoin: true, band: 0, feats: [slit(0.5, 100)] }), noTop: true }); B.pyramid(4.0, 4.9, 8.2, 1.3, 1.3, 2.2, { P: { pal: T.ROOF_SLATE, seed: 3 }, ov: 0.12 });
      Kit.portal(9.04, 10.1, 0, { to: 'chapel', at: 'door', name: 'chapel', label: 'Chapel', ex: 9.04, ey: 11.3 });
      // ---- cloister: a covered walk against the back wall ----
      leanTo(13.4, 32.6, 3.0, 3.6, 3.3, 0.9, T.ROOF_BROWN, 11);
      for (let x = 13.6; x <= 32.5; x += 2.1) if (!use('column', x, 6.4, 0, { h: 2.4, r: 0.17 })) B.cyl(x, 6.4, 0, 0.17, 2.4, 8, T.flat(0xb8b0a2), {});
      for (const x of [15.6, 21.9, 28.2]) use('stoneBench', x, 3.3, 0, {}); use('statue', 19.2, 3.9, 0, { kind: 'angel' }); use('statue', 25.5, 3.9, 0, { kind: 'maiden' });
      for (const x of [17.8, 24.1, 30.4]) use('torch', x, 3.02, 0, { h: 1.7, face: 'y' });
      // ---- staff wing ----
      B.house({ x: 3.2, y: 13, w: 4.6, d: 12.5, floors: 1, axis: 'y', seed: 95, plaster: 0xe2d6b8, shutter: 0x4f7a52, roof: T.ROOF_RED, jetty: 0.14, dormer: [0.25, 0.75], fx: [win(0.12), door(0.36), win(0.6), win(0.86)], fy: [win(0.5)] });
      Kit.portal(8.6, 21.0, 0, { to: 'staff', at: 'door', name: 'staff', label: 'Staff quarters', ex: 9.6, ey: 21.0 });
      use('laundry', 9.6, 23.4, 0, { len: 2.4, face: 'x' });
      // ---- hedge maze with a fountain at its heart ----
      const R = 6, hz = (x, y, w, d) => hedge(MX + x, MY + y, w, d, { h: 0.95 });
      hz(-R, -R, 2 * R, 0.5); hz(-R, R - 0.5, R - 0.8, 0.5); hz(0.8, R - 0.5, R - 0.8, 0.5); hz(-R, -R + 0.5, 0.5, 2 * R - 1); hz(R - 0.5, -R + 0.5, 0.5, 2 * R - 1);
      hz(-4.2, -4.2, 6.6, 0.5); hz(-4.2, -3.7, 0.5, 5.6); hz(-4.2, 3.7, 3.2, 0.5); hz(0.8, 3.7, 3.4, 0.5); hz(3.7, -2.4, 0.5, 6.1);
      hz(-2.4, -2.4, 0.5, 4.3); hz(-1.9, -2.4, 3.8, 0.5); hz(-2.4, 1.9, 3.0, 0.5); hz(1.9, -0.6, 0.5, 3.0);
      if (!use('fountain', MX, MY - 0.2, 0, { r: 0.8 })) B.bush(MX, MY, {});
      // ---- lily pond with a pavilion ----
      use('pond', 29.4, 13.4, 0, { w: 5.2, d: 3.6 });
      const GX = 37.4, GY = 15.2; B.cyl(GX, GY, 0, 1.9, 0.22, 12, T.facade, { P: CS(61, { band: 0, tint: 0xc0b8a8 }), top: Kit.paving }); Kit.walk(GX - 1.3, GY - 1.3, GX + 1.3, GY + 1.3, 0.22); Kit.stairs(GX - 2.3, GY - 0.5, 0.5, 1.0, '+x', 0, 0.22);
      for (let i = 0; i < 6; i++) { const an = i / 6 * 6.283 + 0.52; if (!use('column', GX + Math.cos(an) * 1.6, GY + Math.sin(an) * 1.6, 0.22, { h: 2.2, r: 0.12 })) B.cyl(GX + Math.cos(an) * 1.6, GY + Math.sin(an) * 1.6, 0.22, 0.12, 2.2, 6, T.flat(0xb8b0a2), {}); }
      B.cyl(GX, GY, 2.42, 1.95, 0.16, 12, T.flat(0xb4ad9e), {}); B.cone(GX, GY, 2.58, 2.1, 1.5, 12, T.roof, { P: { pal: T.ROOF_SLATE, seed: 2 } }); B.pois.push({ x: GX, y: GY, z: 0.22, kind: 'sit', fx: -1, fy: 0.2 });
      // ---- rose walk, orchard, kitchen garden ----
      for (const x of [29.6, 32.4, 35.2, 38.0, 40.8]) use('roseArch', x, 9.35, 0, { face: 'x' });
      for (let i = 0; i < 10; i++) { const x = 29.5 + (i % 5) * 3.1, y = 21.6 + ((i / 5) | 0) * 3.4; if (!use('orchardTree', x, y, 0, { seed: i, kind: ['apple', 'pear', 'plum', 'cherry', 'apple'][i % 5], blossom: i % 3 === 0 })) B.tree(x, y, { s: 0.9, flowers: T.APPLE, fp: 0.04 }); }
      use('vegPatch', 34.6, 3.6, 0, { w: 3.6, d: 2.2 }); use('vegPatch', 38.8, 3.6, 0, { w: 3.6, d: 2.2 }); use('beehive', 42.9, 6.9, 0, {}); use('beehive', 43.3, 8.0, 0, {}); use('dovecote', 34, 7.2, 0, {});
      // ---- beds, benches, clipped trees along the walks ----
      for (const p of [[10.8, 11.6, 'roses'], [10.8, 25.4, 'lavender'], [27.6, 17.6, 'tulips'], [41, 11.4, 'mixed']]) use('flowerbed', p[0], p[1], 0, { w: 2.4, d: 1.3, kind: p[2] });
      for (const x of [12, 15, 21, 24]) use('topiary', x, 11.6, 0, { kind: x % 2 ? 'spiral' : 'ball', pot: false }); for (const x of [8, 12, 16, 30, 36, 42]) use('topiary', x, 26.2, 0, { kind: 'cone', pot: false });
      use('stoneBench', 27.6, 20.0, 0, { face: 'x' }); use('stoneBench', 13.6, 26.0, 0, {}); use('sundial', 26.4, 26.9, 0, {}); use('birdBath', 41.6, 18.4, 0, { bird: true }); use('gardenStatue', 26.4, 12.6, 0, { kind: 'maiden' });
      for (const p of [[11, 9.2], [26.4, 8.4], [33.6, 8.6], [26.4, 21.6], [10.2, 27.4], [40.4, 27.6]]) B.lamp(p[0], p[1]);
      B.tree(41.5, 22, { s: 1.5, pal: T.LEAF_D, flowers: null, n: 10 }); B.tree(11.4, 14.4, { s: 1.1, flowers: T.BLOSSOM });
      for (let i = 0; i < 4; i++) Kit.person({ role: 'villager', name: 'Gardener', apron: true, hat: 1, kinds: ['tend'], at: [28 + i * 3, 19, 0] });
      Kit.person({ role: 'monk', name: 'Chaplain', kinds: ['sit', 'pray'], at: [18, 5.2, 0] }); Kit.person({ role: 'monk', name: 'Brother', kinds: ['sit'], at: [26, 5.2, 0] });
      Kit.person({ role: 'noble', name: 'Lady of the court', fem: true, kinds: ['sit', 'tend'], at: [34, 16, 0] }); Kit.person({ role: 'villager', name: 'Laundress', fem: true, apron: true, kinds: ['work', 'tend'], at: [10.4, 22.6, 0] });
    },
  });
  // interiors were written against layout 1's door names: point the two that moved at the garden terrace
  Castle.remap = { 'inner/chapel': ['garden', 'chapel'], 'inner/staff': ['garden', 'staff'] };
  Castle.start = ['inner', null];
})();
