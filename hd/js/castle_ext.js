'use strict';
/* The castle's outdoor areas (outer ward, inner ward with the keep and gardens) and the throne room. */
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

  /* =====================================================================
   *  OUTER WARD: gate, barracks, stables, smithy, training yard
   * ===================================================================== */
  Castle.add('ward', {
    name: 'Outer Ward', blurb: 'Soldiers, horses and iron. Stairs lead up to the wall-walk; the watchtower can be climbed.', bounds: [0, 0, 42, 42, 10.5], spawn: [20, 30, 0], shadow: { sms: 24 },
    build(a) {
      Kit.floor(0, 0, 42, 42, (x, y) => {
        const n = T.fbm(x * 0.45, y * 0.45), dT = Math.max(Math.abs(x - 29.5) - 5.5, Math.abs(y - 20) - 5.5);
        if (dT < 0.3 + n) return T.dirt(x, y);                                       // training yard
        if (Math.abs(x - 20) < 1.7 + n * 0.8 || (Math.abs(y - 30) < 1.5 + n * 0.8 && x < 21) || y < 11.5 + n * 1.5 || x < 10 + n * 1.2) return T.cobble(x, y);
        return n > 0.5 ? T.grass(x, y) : T.dirt(x, y);
      }, 0);
      const H = 4.2, HF = 2.8;
      // back walls (tall) and their stairs
      Kit.curtain('x', 2, 2, 40, H, 1.6, { feats: [slit(0.3, 70), slit(0.5, 70), slit(0.7, 70)], openHi: [[9, 10]] });
      Kit.curtain('y', 2, 3.6, 40, H, 1.6, { feats: [slit(0.2, 70), slit(0.45, 70), arch(0.73, 30, 62)], openHi: [[22, 23]], seed: 37 });
      wallStairX(10, 5, 3.6, H, '-x'); wallStairY(23, 5, 3.6, H, '-y');
      // near walls (lower, so the yard stays visible) and their stair
      Kit.curtain('x', 38.4, 2, 40, HF, 1.6, { feats: [slit(0.15, 44), slit(0.85, 44)], openLo: [[30, 31]], seed: 41 });
      Kit.curtain('y', 38.4, 3.6, 38.4, HF, 1.6, { feats: [slit(0.3, 44), slit(0.7, 44)], seed: 43 });
      Kit.stairs(26, 37.4, 4, 1.0, '+x', 0, HF); Kit.walk(30, 37.4, 31, 38.8, HF); B.box(30, 37.4, 0, 1, 1, HF, { side: T.facade, P: CS(8, { band: 0 }), top: Kit.paving }); B.block(30, 37.4, 1, 1, 0);
      // towers
      Kit.tower(2.9, 2.9, 2.4, 6.6, { flag: RED, seed: 3 });
      Kit.tower(39.1, 2.9, 2.0, 5.2, { seed: 5, roof: T.ROOF_SLATE, flag: BLUE });
      Kit.tower(2.9, 39.1, 2.0, 4.6, { seed: 6, roof: T.ROOF_SLATE, flag: BLUE });
      Kit.tower(39.1, 39.1, 2.0, 3.8, { seed: 8, flag: RED });
      Kit.portal(5.9, 2.8, H, { to: 'ward', at: 'watchtop', name: 'watchfoot', label: 'Watchtower ↑', ex: 6.8, ey: 2.8 });
      Kit.portal(2.9, 2.9, 7.1, { to: 'ward', at: 'watchfoot', name: 'watchtop', label: 'Down ↓', ex: 3.6, ey: 3.6 });
      // gatehouse on the near wall: twin turrets and a raised walk between them
      Kit.block(17.2, 37.6, 2.2, 3.4, 4.4, { seed: 60, fy: [slit(0.5, 90)] }); Kit.block(21.6, 37.6, 2.2, 3.4, 4.4, { seed: 62, fy: [slit(0.5, 90)] });
      B.box(19.4, 38.4, 0, 2.2, 1.6, 4.4, { side: T.facade, Py: CS(64, { feats: [arch(0.5, 44, 86, false)] }), top: Kit.paving }); Kit.walk(19.4, 38.6, 21.6, 39.8, 4.4); B.block(19.4, 38.4, 2.2, 1.6, 0);
      use('banner', 18.3, 41.0, 0, { h: 4.0, face: 'y', c: RED }); use('banner', 22.7, 41.0, 0, { h: 4.0, face: 'y', c: RED });
      Kit.portal(20.5, 37.6, 0, { name: 'gate', label: 'Village gate (to come)', r: 0.6 });
      Kit.portal(4.5, 31.5, 0, { to: 'inner', at: 'gate', name: 'innergate', label: 'Inner ward', ex: 6, ey: 31.5 });
      // barracks against the back wall
      B.house({ x: 15, y: 3.9, w: 11, d: 4.8, floors: 1, base: 'stone', tint: 0xa8a49c, axis: 'x', roof: T.ROOF_SLATE, seed: 81, jetty: 0, rise: 2.6, chimney: true,
        fy: [win(0.12), door(0.36, { lamp: true }), win(0.6), win(0.84)], fx: [win(0.5)] });
      Kit.portal(18.96, 9.4, 0, { to: 'barracks', at: 'door', name: 'barracks', label: 'Barracks', ex: 18.96, ey: 10.4 });
      // stables against the left wall
      B.house({ x: 3.9, y: 10.5, w: 4.2, d: 9.5, floors: 0, h0: 1.8, base: 'timber', axis: 'y', roof: T.ROOF_BROWN, rise: 1.9, chimney: false, plaster: 0xa88a60, seed: 85,
        fx: [{ k: 'shop', x: 0.2, w: 40, h: 46, trim: 0x5a4030, lamp: false }, { k: 'shop', x: 0.52, w: 40, h: 46, trim: 0x5a4030, lamp: false }, { k: 'shop', x: 0.84, w: 40, h: 46, trim: 0x5a4030, lamp: false }] });
      use('horse', 9.4, 12.6, 0, { face: 'x', coat: 'bay' }); use('horse', 9.4, 17.2, 0, { face: 'x', coat: 'grey' }); use('hayBale', 8.5, 20.4, 0, { n: 3 }); use('hayBale', 9.5, 20.6, 0, {}); use('trough', 8.6, 14.4, 0, { face: 'x' }); use('saddleRack', 8.6, 22.2, 0, { face: 'x' }); B.pois.push({ x: 10.4, y: 13.4, z: 0, kind: 'stable', fx: -1, fy: 0 }, { x: 10.4, y: 17.6, z: 0, kind: 'stable', fx: -1, fy: 0 });
      // smithy
      B.house({ x: 29.5, y: 3.9, w: 5.5, d: 4.2, floors: 0, h0: 2.0, base: 'stone', axis: 'x', roof: T.ROOF_BROWN, rise: 1.8, seed: 88, tint: 0x8a7a6a, fy: [{ k: 'open', x: 0.4, w: 36, h: 50, trim: 0x6a5a4a, lit: true, lamp: false }, win(0.82, { box: false })] });
      if (!use('anvil', 31.2, 9.3, 0, {})) B.crate(31.2, 9.3); use('forge', 33.0, 8.6, 0, { face: 'y' }); use('grindstone', 29.6, 9.4, 0, {}); B.barrel(35.4, 8.6); B.barrel(35.9, 9.1);
      // training yard
      for (const p of [[25.4, 23.5], [25.4, 21.2], [33.6, 24.6]]) if (!use('dummy', p[0], p[1], 0, {})) B.crate(p[0], p[1]);
      for (const p of [[26, 14.6], [29, 14.4], [32, 14.6]]) use('archeryButt', p[0], p[1], 0, { face: 'y', range: 5 });
      use('weaponRack', 34.2, 18.5, 0, { face: 'x' }); use('weaponRack', 34.2, 21, 0, { face: 'x' }); use('sparRing', 27.8, 20.8, 0, { w: 3.6, d: 3.2 }); use('weights', 33.4, 22.6, 0, {}); use('armour', 14.2, 10.2, 0, {}); use('horseStall', 8.6, 23.6, 0, { face: 'x', coat: 'chestnut' });
      // yard dressing
      if (!use('well', 14.5, 24.5, 0, { roof: true })) B.barrel(14.5, 24.5);
      B.tree(13.5, 33.2, { s: 1.5, pal: T.LEAF_D, flowers: null, n: 10 }); B.tree(33.5, 30.5, { s: 1.2 }); B.cart(23.5, 30.6);
      B.barrel(26.6, 9.3); B.barrel(27.1, 9.7); B.crate(14.2, 9.2); B.crate(14.3, 9.25, 0.45, 0.42); B.sack(13.6, 10.0);
      for (const p of [[16.6, 26], [23.4, 26], [16.6, 34.5], [23.4, 34.5], [11, 12], [27, 12.5]]) B.lamp(p[0], p[1]);
      for (let i = 0; i < 14; i++) B.bush(11 + h2(i, 1) * 24, 27 + h2(i, 2) * 9, { s: 0.8 + h2(i, 3) * 0.4, noBlock: true });
      // people
      for (const g of [[19.3, 36.9, 0], [21.7, 36.9, 0], [12, 2.8, H], [28, 2.8, H], [2.8, 15, H], [2.8, 30, H], [10, 39.2, HF], [32, 39.2, HF], [2.9, 3.6, 7.1]]) Kit.person({ role: 'guard', name: 'Guard', at: g, fixed: [0.4, 1] });
      Kit.person({ role: 'villager', name: 'Stable hand', kinds: ['stable'], at: [10, 15, 0] }); Kit.person({ role: 'villager', name: 'Blacksmith', apron: true, kinds: ['smith'], at: [32, 10, 0] });
      for (let i = 0; i < 4; i++) Kit.person({ role: 'guard', name: 'Man-at-arms', kinds: ['train'], at: [28 + i, 20, 0] });
    },
  });

  /* =====================================================================
   *  INNER WARD: the keep, chapel, staff wing, pleasure garden
   * ===================================================================== */
  Castle.add('inner', {
    name: 'Inner Ward & Gardens', blurb: 'The keep stands over a walled garden. Its battlements are reached from the royal apartments.', bounds: [0, 0, 44, 44, 15.5], spawn: [30, 32, 0], shadow: { sms: 22 },
    build(a) {
      const GX = 27, GY = 29;                                   // garden centre (fountain)
      Kit.floor(0, 0, 44, 44, (x, y) => {
        const n = T.fbm(x * 0.5, y * 0.5), tx = Math.floor(x * 32), ty = Math.floor(y * 32);
        if (y < 19.5 + n * 0.8 || x < 9.2 + n * 0.6) return Kit.paving(x, y);                    // court before the keep
        const dF = Math.hypot(x - GX, y - GY); if (dF < 4.3) return T.radial(x, y, GX, GY);
        if (Math.abs(x - GX) < 0.9 || Math.abs(y - GY) < 0.9 || Math.abs(Math.max(Math.abs(x - GX), Math.abs(y - GY)) - 9.2) < 0.7) return h2(tx >> 1, ty >> 1) < 0.5 ? 0xcfc4a8 : 0xbdb294;   // gravel walks
        return T.grass(x, y);
      }, 0);
      const H = 4.2, HF = 2.8;
      Kit.curtain('x', 1, 1, 43, H, 1.5, { seed: 51 }); Kit.curtain('y', 1, 2.5, 43, H, 1.5, { seed: 53 });
      Kit.curtain('x', 41.5, 1, 43, HF, 1.5, { feats: [slit(0.2, 44), slit(0.5, 44), slit(0.8, 44)], seed: 55, openLo: [[14, 15]] });
      Kit.curtain('y', 41.5, 2.5, 41.5, HF, 1.5, { feats: [slit(0.25, 44), slit(0.6, 44)], seed: 57 });
      Kit.stairs(10, 40.5, 4, 1.0, '+x', 0, HF); Kit.walk(14, 40.5, 15, 41.9, HF); B.box(14, 40.5, 0, 1, 1, HF, { side: T.facade, P: CS(8, { band: 0 }), top: Kit.paving }); B.block(14, 40.5, 1, 1, 0);
      Kit.tower(42.2, 42.2, 1.9, 3.8, { seed: 9, flag: RED }); Kit.tower(1.8, 42.2, 1.9, 4.6, { seed: 10, roof: T.ROOF_SLATE, flag: BLUE });
      // the astronomer's tower
      Kit.tower(41.8, 3.2, 2.3, 9.2, { seed: 12, roof: T.ROOF_SLATE, roofH: 5, flag: GOLD, levels: [56, 136, 216, 296] });
      Kit.portal(40.9, 6.2, 0, { to: 'study', at: 'down', name: 'studytower', label: "Astronomer's tower", ex: 40.4, ey: 7.4 });
      // ---- the keep ----
      const KX = 4, KY = 4, KW = 17, KD = 13, KH = 9;
      const rows = ys => [].concat(...ys.map(y => [0.14, 0.38, 0.62, 0.86].map(x => slit(x, y))));
      Kit.block(KX, KY, KW, KD, KH, { seed: 70, band: 120, fx: rows([150, 270]).concat([slit(0.25, 40), slit(0.75, 40)]), fy: rows([150, 270]).concat([arch(0.5, 34, 74), slit(0.16, 40), slit(0.84, 40)]) });
      for (const c of [[KX, KY], [KX + KW, KY], [KX, KY + KD], [KX + KW, KY + KD]]) Kit.tower(c[0], c[1], 1.5, KH + 2.2, { seed: 20 + c[0], n: 12, roof: T.ROOF_SLATE, flag: BLUE, levels: [120, 240, 360] });
      B.box(KX + 5, KY + 3, KH, 7, 6.5, 4.6, { side: T.facade, noTop: true, Px: CS(74, { quoin: true, band: 92, feats: [slit(0.3, 80), slit(0.7, 80)] }), Py: CS(75, { quoin: true, band: 92, feats: [slit(0.3, 80), slit(0.7, 80)] }) });
      B.pyramid(KX + 5, KY + 3, KH + 4.6, 7, 6.5, 3.8, { P: { pal: T.ROOF_SLATE, seed: 9 } }); B.flags.push({ x: KX + 8.5, y: KY + 6.25, z: KH + 8.4, c: RED, pole: 1.3 }); B.block(KX + 5, KY + 3, 7, 6.5, KH);
      use('banner', KX + 5.5, KY + KD + 0.02, 0, { h: 7.6, face: 'y', c: RED, len: 3 }); use('banner', KX + 11.5, KY + KD + 0.02, 0, { h: 7.6, face: 'y', c: RED, len: 3 });
      B.box(KX + 6.6, KY + KD, 0, 3.8, 1.0, 0.16, { side: T.facade, P: CS(3, { band: 0 }), top: Kit.paving }); B.box(KX + 7.0, KY + KD, 0.16, 3.0, 0.6, 0.16, { side: T.facade, P: CS(3, { band: 0 }), top: Kit.paving }); Kit.walk(KX + 6.6, KY + KD, KX + 10.4, KY + KD + 1, 0.16);
      Kit.portal(KX + 8.5, KY + KD + 0.75, 0.16, { to: 'hall', at: 'door', name: 'keep', label: 'The Keep', ex: KX + 8.5, ey: KY + KD + 2 });
      Kit.portal(KX + 13, KY + KD - 1.3, KH, { to: 'royal', at: 'roofstair', name: 'roof', label: 'Down to the royal apartments', ex: KX + 11.6, ey: KY + KD - 1.3 });
      for (const g of [[KX + 2, KY + KD - 0.8], [KX + 14, KY + KD - 0.8], [KX + KW - 0.8, KY + 3]]) Kit.person({ role: 'guard', name: 'Sentry', at: [g[0], g[1], KH], fixed: [0.5, 1] });
      // ---- chapel ----
      B.house({ x: 25, y: 2.8, w: 9, d: 6, floors: 0, h0: 3.8, base: 'stone', gmat: 'stone', tint: 0xb0aaa0, axis: 'x', roof: T.ROOF_SLATE, jetty: 0, seed: 91, rise: 3.2, chimney: false, gfeat: { k: 'glass', w: 26, h: 56, y: 10 },
        fy: [{ k: 'glass', x: 0.14, y: 40, w: 16, h: 84 }, { k: 'glass', x: 0.34, y: 40, w: 16, h: 84 }, arch(0.58, 24, 60), { k: 'glass', x: 0.84, y: 40, w: 16, h: 84 }], fx: [{ k: 'glass', x: 0.3, y: 40, w: 16, h: 84 }, { k: 'glass', x: 0.7, y: 40, w: 16, h: 84 }] });
      B.box(25.6, 4.6, 3.8, 1.3, 1.3, 4.6, { side: T.facade, P: CS(93, { quoin: true, band: 0, feats: [slit(0.5, 110)] }), noTop: true }); B.pyramid(25.6, 4.6, 8.4, 1.3, 1.3, 2.2, { P: { pal: T.ROOF_SLATE, seed: 3 }, ov: 0.12 });
      Kit.portal(30.2, 9.5, 0, { to: 'chapel', at: 'door', name: 'chapel', label: 'Chapel', ex: 30.2, ey: 10.6 });
      // ---- staff wing along the left wall ----
      B.house({ x: 2.6, y: 20.5, w: 4.6, d: 13, floors: 1, axis: 'y', seed: 95, plaster: 0xe2d6b8, shutter: 0x4f7a52, roof: T.ROOF_RED, jetty: 0.14, dormer: [0.25, 0.75],
        fx: [win(0.12), door(0.36), win(0.6), win(0.86)], fy: [win(0.5)] });
      Kit.portal(8.0, 28.8, 0, { to: 'staff', at: 'door', name: 'staff', label: 'Staff quarters', ex: 9.1, ey: 28.8 });
      // ---- bath house and games hall by the near wall ----
      B.house({ x: 33.6, y: 12.5, w: 6.4, d: 5.2, floors: 1, axis: 'x', seed: 97, plaster: 0xe9c9a0, shutter: 0x8a4038, roof: T.ROOF_BROWN, fy: [win(0.16), door(0.5), win(0.84)], fx: [win(0.5)] });
      Kit.portal(36.8, 18.4, 0, { to: 'rec', at: 'door', name: 'rec', label: 'Bath house & games hall', ex: 36.8, ey: 19.5 });
      Kit.portal(40.6, 31.5, 0, { to: 'ward', at: 'innergate', name: 'gate', label: 'Outer ward', ex: 39.2, ey: 31.5 });
      // ---- the garden ----
      B.fountain(GX, GY);
      const hedge = (x, y, w, d) => { if (!(w >= d ? use('hedge', x, y, 0, { len: w, w: d, h: 0.7 }) : use('hedge', x, y, 0, { len: d, w: w, h: 0.7, face: 'x' }))) { B.box(x, y, 0, w, d, 0.6, { side: T.flat(0x356e3a), top: T.flat(0x4d9440) }); B.block(x, y, w, d, 0); } };
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) {            // four parterres round the fountain
        const cx = GX + sx * 5.4, cy = GY + sy * 5.4;
        hedge(cx - 2.6, cy - 2.6, 5.2, 0.5); hedge(cx - 2.6, cy + 2.1, 5.2, 0.5); hedge(cx - 2.6, cy - 2.1, 0.5, 1.5); hedge(cx - 2.6, cy + 0.6, 0.5, 1.5); hedge(cx + 2.1, cy - 2.1, 0.5, 1.5); hedge(cx + 2.1, cy + 0.6, 0.5, 1.5);
        if (!use('flowerbed', cx - 1.5, cy - 1.5, 0, { w: 3, d: 3, seed: sx * 3 + sy + 5, kind: ['roses', 'tulips', 'lavender', 'mixed'][(sx + 1) + (sy + 1) / 2] })) for (let i = 0; i < 5; i++) B.flowers(cx - 1.3, cy - 1.2 + i * 0.6, cx + 1.3, cy - 1.2 + i * 0.6, 0.02, 9, i + sx * 7 + sy * 3 + 20, 1.3);
        if (!use('topiary', cx, cy, 0, { kind: ['cone', 'ball', 'spiral', 'tiers'][(sx + 1) + (sy + 1) / 2], pot: false })) B.bush(cx, cy, { s: 1.2, flowers: null });
      }
      use('roseArch', GX - 0.9, GY + 9.6, 0, { face: 'y' }); use('roseArch', GX + 9.4, GY - 0.9, 0, { face: 'x' });
      use('sundial', GX - 11.2, GY - 1.6, 0, {}); use('gardenStatue', GX + 1.8, GY - 11.0, 0, { kind: 'maiden' }); use('statue', 12.5, 19.4, 0, { kind: 'king' }); use('statue', 22, 19.2, 0, { kind: 'knight' }); use('birdBath', GX + 11, GY + 6, 0, { bird: true });
      for (const p of [[GX - 3.6, GY - 9.6], [GX + 2.4, GY - 9.6], [GX - 9.9, GY - 3.4], [GX - 9.9, GY + 2.2]]) if (!use('stoneBench', p[0], p[1], 0, { face: p[1] < GY - 9 ? 'y' : 'x' })) B.bench(p[0], p[1], p[1] < GY - 9 ? 'x' : 'y');
      // orchard and pond by the near walls
      for (let i = 0; i < 6; i++) { const x = 12 + (i % 3) * 2.4, y = 35 + ((i / 3) | 0) * 2.6; if (!use('orchardTree', x, y, 0, { seed: i, kind: ['apple', 'pear', 'plum', 'cherry'][i % 4] })) B.tree(x, y, { s: 0.9, flowers: T.APPLE, fp: 0.04 }); }
      use('pond', 33.6, 34.6, 0, { w: 3.6, d: 2.6 }); use('beehive', 20.2, 38.6, 0, {}); use('beehive', 21.2, 38.9, 0, {}); use('vegPatch', 16.5, 20.6, 0, { w: 3.4, d: 2.6 }); use('dovecote', 22.2, 21.4, 0, {});
      for (let i = 0; i < 18; i++) B.bush(10 + h2(i, 11) * 30, 20 + h2(i, 12) * 20, { s: 0.7 + h2(i, 13) * 0.4, noBlock: true, fp: 0.2 });
      B.tree(11.5, 22.5, { s: 1.4, pal: T.LEAF_D, flowers: null, n: 10 }); B.tree(38.5, 25, { s: 1.2 }); B.tree(23.5, 12.2, { s: 1.0, flowers: T.BLOSSOM });
      for (const p of [[10.6, 18.6], [15.4, 18.6], [22.6, 18.4], [GX - 4.6, GY - 4.6], [GX + 4.6, GY + 4.6], [32, 19.6]]) B.lamp(p[0], p[1]);
      for (let i = 0; i < 3; i++) Kit.person({ role: 'villager', name: 'Gardener', apron: true, hat: 1, kinds: ['tend'], at: [GX + i * 2 - 2, GY + 6, 0] });
      Kit.person({ role: 'noble', name: 'Lady of the court', fem: true, kinds: ['sit', 'tend'], at: [GX + 3, GY - 6, 0] }); Kit.person({ role: 'noble', name: 'Courtier', fem: false, kinds: ['sit'], at: [GX - 6, GY + 3, 0] });
      Kit.person({ role: 'monk', name: 'Chaplain', kinds: ['sit', 'pray'], at: [30, 12, 0] });
      for (const g of [[11.4, 17.9], [13.6, 17.9]]) Kit.person({ role: 'guard', name: 'Keep guard', at: [g[0], g[1], 0], fixed: [0.3, 1] });
    },
  });

  /* =====================================================================
   *  THRONE ROOM (keep, first floor)
   * ===================================================================== */
  Castle.add('throne', {
    name: 'Throne Room', blurb: 'The king holds court here. Stairs lead down to the great hall and up to the royal apartments.', interior: true, bounds: [0, 0, 19, 29, 7.5], spawn: [9, 21, 0],
    build(a) {
      const X0 = 2, Y0 = 2, X1 = 16, Y1 = 26, H = 6.5, flag = Kit.flags(), chk = Kit.diag(46, 0xcfc6b2, 0x6f6a78);
      Kit.floor(X0, Y0, X1, Y1, (x, y) => (x < 4.9 || x > 13.1) ? flag(x, y) : chk(x, y), 0);
      Kit.rug(8, 5.6, 10, 25.6, 0);
      const gl = (x, y, w, h) => ({ k: 'glass', x, y: y || 60, w: w || 28, h: h || 140 });
      Kit.wallX(X0, Y0 - 0.5, Y1, 0, H, Kit.STONE(70, { feats: [gl(0.115), gl(0.3), gl(0.485), gl(0.67), gl(0.855)] }), { light: true });
      Kit.wallY(Y0, X0, X1, 0, H, Kit.STONE(71, { feats: [{ k: 'glass', x: 0.52, y: 124, w: 48, h: 116 }, gl(0.14, 68, 20, 112), door(0.9, { w: 20, h: 48 })] }));
      Kit.enclose(X0, Y0, X1, Y1, 0, H); Kit.stub(X0, Y0, X1, Y1, 0, {});
      // dais and thrones
      const marble = Kit.tiles(24, 0xd8d0be, 0xcac2b0), gold = (s, t) => T.mul(0xd9a83a, 0.9 + h2(s * 32, t * 40) * 0.2);
      B.box(5.6, 2, 0, 6.8, 4.3, 0.2, { side: T.facade, P: CS(74, { band: 0, tint: 0xc8c0ae }), top: marble }); B.box(6.3, 2, 0.2, 5.4, 3.5, 0.2, { side: T.facade, P: CS(75, { band: 0, tint: 0xc8c0ae }), top: marble });
      Kit.walk(5.6, 2, 12.4, 6.3, 0.2); Kit.walk(6.3, 2, 11.7, 5.5, 0.4); Kit.rug(8, 2.6, 10, 5.5, 0.4); Kit.rug(8, 5.5, 10, 6.3, 0.2, 0xa82a2e, 0xa82a2e, 0x7a1c22);
      const velvet = c => (s, t, q) => { const X = Math.floor(s * 32), Y = Math.floor(t * 40), Wt = Math.round(q.ul * 32), Ht = Math.round(q.vl * 40); if (X < 4 || X >= Wt - 4 || Y >= Ht - 6 || Y < 4) return (X + Y) % 8 < 2 ? 0xf4dc6a : 0xd9a83a; if (Y > Ht - 18 && Math.abs(X - Wt / 2 + 0.5) < 4) return 0xf4dc6a; return T.mul(c, ((X + Y) % 12 < 2 || (X - Y + 120) % 12 < 2) ? 0.82 : 1); };
      B.box(8.45, 2.62, 0.4, 1.1, 0.26, 2.5, { side: velvet(0xa82a2e), top: gold }); B.box(8.5, 2.88, 0.4, 1.0, 0.8, 0.5, { side: gold, top: T.flat(RED) }); B.box(8.38, 2.88, 0.9, 0.14, 0.8, 0.3, { side: gold }); B.box(9.48, 2.88, 0.9, 0.14, 0.8, 0.3, { side: gold }); B.block(8.38, 2.62, 1.24, 1.06, 0.4);
      B.box(6.85, 2.75, 0.4, 0.9, 0.22, 1.9, { side: velvet(BLUE), top: gold }); B.box(6.9, 2.97, 0.4, 0.8, 0.7, 0.42, { side: gold, top: T.flat(BLUE) }); B.block(6.85, 2.75, 0.9, 0.92, 0.4);
      // columns, light, banners
      for (const y of [7.2, 11.4, 15.6, 19.8, 24]) { if (!use('column', 4.4, y, 0, { h: 6.3 })) B.cyl(4.4, y, 0, 0.34, 6.3, 10, T.flat(0xb8b0a2), {}); if (y > 8 && !use('column', 13.6, y, 0, { h: 6.3 })) B.cyl(13.6, y, 0, 0.34, 6.3, 10, T.flat(0xb8b0a2), {}); B.blockC(4.4, y, 0.5, 0); if (y > 8) B.blockC(13.6, y, 0.5, 0); }
      for (const y of [10.5, 16.5, 22.5]) if (!use('chandelier', 9, y, 0, { h: 4.6, drop: 1.9, r: 0.8, n: 10 })) E.addLight(9, y, 4.2, 8.5, [1.0, 0.74, 0.4], 0.75);
      for (const x of [4.3, 6.2, 11.9, 13.4]) use('banner', x, Y0 + 0.02, 0, { h: 5.6, face: 'y', c: x > 5 && x < 13 ? RED : BLUE, len: 2.6 });
      for (const f of [0.208, 0.393, 0.578, 0.763]) { const y = Y1 - f * (Y1 - Y0 + 0.5); use('banner', X0 + 0.02, y, 0, { h: 5.2, face: 'x', c: (f * 10 | 0) & 1 ? BLUE : RED, len: 2.3 }); use('torch', X0 + 0.02, y - 0.7, 0, { h: 1.9, face: 'x' }); use('torch', X0 + 0.02, y + 0.7, 0, { h: 1.9, face: 'x' }); }
      for (const p of [[6.3, 7.0], [11.7, 7.0], [5.6, 25.0], [12.4, 25.0]]) if (!use('brazier', p[0], p[1], 0, {})) E.addLight(p[0], p[1], 1.2, 5, [1, 0.6, 0.25], 1.2);
      for (const y of [9.4, 14.4, 19.4]) use('feastTable', 11.3, y, 0, { len: 3.0, food: true, face: 'x' });
      for (const p of [[2.6, 6.2], [2.6, 25.2], [15.3, 6.4], [15.3, 25.2]]) use('plant', p[0], p[1], 0, { kind: 'tree', s: 1.2 });
      // ways out
      Kit.stairwell(13.4, 21.6, 2.2, 1.6, 0, '+x'); Kit.portal(14.4, 22.4, 0, { to: 'hall', at: 'up', name: 'down', label: 'Down to the great hall', ex: 12.6, ey: 22.4 });
      Kit.stairs(13.2, 2.4, 2.8, 1.3, '+x', 0, 1.7); Kit.floor(16, 2.4, 17.3, 3.7, flag, 1.7); B.box(16, 2.4, 0, 1.3, 1.3, 1.7, { side: T.facade, P: CS(8, { band: 0 }), noTop: true });
      Kit.portal(16.7, 3.05, 1.7, { to: 'royal', at: 'down', name: 'up', label: 'Up to the royal apartments', ex: 15.6, ey: 3.05 });
      Kit.portal(3.0, 21.9, 0, { to: 'council', at: 'door', name: 'council', label: 'Council chamber & library', ex: 3.4, ey: 20.9 });
      // the court
      Kit.person({ role: 'noble', fem: true, name: 'The Queen', at: [7.3, 3.45, 0.82], sit: 0.82, fixed: [0.3, 1] });
      Kit.person({ role: 'monk', name: 'The Chancellor', at: [10.5, 4.6, 0.4], fixed: [-0.2, 1] });
      for (const g of [[6.0, 6.8], [12.0, 6.8], [7.3, 11], [10.7, 11], [7.3, 17], [10.7, 17], [7.5, 24.6], [10.5, 24.6]]) Kit.person({ role: 'guard', name: 'Royal guard', at: [g[0], g[1], 0], fixed: [g[0] < 9 ? 1 : -1, 0.5] });
      for (let i = 0; i < 6; i++) Kit.person({ role: i % 3 ? 'villager' : 'noble', name: i % 3 ? 'Petitioner' : 'Courtier', at: [9 + (i & 1 ? 0.35 : -0.35), 8.6 + i * 1.6, 0], kinds: ['court'] });
      for (let i = 0; i < 7; i++) B.pois.push({ x: 9 + (i & 1 ? 0.35 : -0.35), y: 8.4 + i * 1.5, z: 0, kind: 'court', fx: 0, fy: -1 });
      for (const y of [8, 12, 16, 20]) B.pois.push({ x: 3.2, y, z: 0, kind: 'court', fx: 1, fy: 0.2 }, { x: 14.8, y: y + 1.5, z: 0, kind: 'court', fx: -1, fy: 0 });
    },
  });
  Castle.start = ['inner', null];
})();
