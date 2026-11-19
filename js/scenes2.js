'use strict';
(function () {
  const h2 = E.h2, Q = E.quad, CS = B.CS, mul = T.mul;
  const RED = 0xb8323a, GOLD = 0xd9a83a, BLUE = 0x34508f, CREAM = 0xeadfc4;
  const WHEAT = T.pal(['#d9b84a', '#c9a63c', '#e6c95e', '#bf9a36']);
  const wheat = (x, y) => { const tx = Math.floor(x * 16), ty = Math.floor(y * 16); if (tx % 5 === 0) return 0x9a7a2c; return WHEAT[(h2(tx, ty >> 1) * 4) | 0]; };
  const paving = (s, t) => T.flag(s, t, 8, 0x9a958c, 0x8f8a82);
  const kwin = (x, y, o) => Object.assign({ k: 'awin', x, y, w: 6, h: 13, frame: 0x4a4038 }, o || {});

  /* =====================================================================
   *  2. CASTLE
   * ===================================================================== */
  Scenes.castle = {
    name: 'Castle', bounds: [0, 0, 45, 45, 15], focus: [21, 23], focusZ: 3, king: [17.5, 21.5], npcs: 26,
    roles: ['guard', 'guard', 'villager', 'villager', 'villager', 'noble', 'monk'], walk: [8, 8, 45, 45],
    blurb: 'Mock-up 2: the castle. Keep, great hall, stables, smithy and training yard inside the walls; moat, bridge and the road to the village outside.',
    guards: [[17.9, 32.0, 0.2, 1], [20.1, 32.0, 0.2, 1], [12, 30.5, 0.3, 1, 3.6], [26, 30.5, 0.3, 1, 3.6], [30.5, 13, 1, 0.3, 3.6], [30.5, 24, 1, 0.3, 3.6], [30.5, 30.5, 1, 1, 5.75], [13.2, 18.2, 0.2, 1], [14.8, 18.2, 0.2, 1]],
    build() {
      Q([0, 0, 0], [45, 0, 0], [0, 45, 0], (x, y) => {
        const n = T.fbm(x * 0.45, y * 0.45);
        if (x > 8 && x < 30 && y > 8 && y < 30) {
          const toGate = Math.abs(x - 19) < 1.5 + n && y > 17, apron = y < 19.2 + n * 1.2 || x < 12.4 + n;
          if (toGate || apron) return T.cobble(x, y);
          if (x > 20.6 && y > 21) return T.dirt(x, y);
          return n > 0.47 ? T.grass(x, y) : T.dirt(x, y);
        }
        const m = Math.max(x, y), wob = T.vn(x * 0.35, y * 0.35) * 0.9;
        if (m <= 31.6) return T.dirt(x, y);
        if (m < 31.85) return mul(0x8a857a, 0.8 + h2(x * 16, y * 16) * 0.2);
        if (m < 34.9 + wob) return (m < 32.15 ? 0x1f5a6a | (E.F_WATER << 24) : T.water(x, y, 1));
        if (m < 35.2 + wob) return mul(0x6a5a44, 0.9 + h2(x * 16, y * 16) * 0.2);
        if (Math.abs(x - 19) < 1.25 + T.vn(y * 0.6, 3) * 0.7 && y > 34) return T.dirt(x, y);
        if (x > 37.3 && y > 9 && y < 29 && x < 44) return wheat(x, y);
        return T.grass(x, y);
      }, { n: [0, 0, 1] });

      /* curtain walls + towers */
      B.wallX(7, 31, 7, 4.4, 1); B.wallY(7, 31, 7, 4.4, 1);
      B.wallX(8, 17.2, 30, 3.6, 1); B.wallX(20.8, 30, 30, 3.6, 1); B.wallY(8, 30, 30, 3.6, 1);
      B.roundTower(7.5, 7.5, 2.0, 7.2, { roof: T.ROOF_SLATE, seed: 3, lit: true, roofH: 4.6, flag: RED });
      B.roundTower(30.5, 7.5, 1.9, 5.6, { seed: 5, flag: BLUE, lit: true });
      B.roundTower(7.5, 30.5, 1.9, 5.6, { seed: 6, flag: BLUE, lit: true });
      B.roundTower(30.5, 30.5, 1.9, 5.2, { seed: 8, flag: RED, lit: true, levels: [28, 68] });
      // gatehouse (passable arch)
      B.box(17, 29.6, 0, 4, 1.9, 5.3, { side: T.facade, top: paving,
        Py: CS(60, { band: 53, feats: [{ k: 'gothic', x: 0.5, w: 24, h: 46, trim: 0xc0b8a6 }, kwin(0.5, 72, { w: 5, h: 12 })] }), Px: CS(61) });
      B.merlonsX(17, 21, 31.25, 5.3); B.merlonsX(17, 21, 29.6, 5.3);
      B.block(17, 29.6, 1.25, 1.9); B.block(19.75, 29.6, 1.25, 1.9);
      B.roundTower(16.6, 31.3, 1.0, 6.0, { roof: T.ROOF_RED, seed: 11, n: 10, roofH: 2.6, flag: GOLD, lit: true, levels: [50, 90] });
      B.roundTower(21.4, 31.3, 1.0, 6.0, { roof: T.ROOF_RED, seed: 12, n: 10, roofH: 2.6, flag: GOLD, lit: true, levels: [50, 90] });
      B.banner(18.0, 31.5, 5.0, 'y', RED, GOLD, 1.5); B.banner(20.0, 31.5, 5.0, 'y', RED, GOLD, 1.5);
      for (const y of [11.5, 16, 20.5, 25]) B.banner(31, y, 3.1, 'x', y % 2 > 0.6 ? BLUE : RED, GOLD, 1.7);
      for (const x of [10.5, 14, 24, 27.5]) B.banner(x, 31, 3.1, 'y', BLUE, GOLD, 1.7);
      E.addLight(18.1, 31.9, 1.6, 4, null, 1.1); E.addLight(19.9, 31.9, 1.6, 4, null, 1.1);
      B.torch(31, 28.2, 1.9, 'x'); B.torch(31, 18.2, 1.9, 'x'); B.torch(31, 9.8, 1.9, 'x'); B.torch(12.2, 31, 1.9, 'y'); B.torch(25.8, 31, 1.9, 'y');
      // bridge
      B.box(17.9, 31.5, 0, 2.2, 3.9, 0.14, { side: T.wood, P: { c: 0x6a4a34 }, top: (s, t) => T.planks(t, s, 0x8a6846) });
      for (const x of [17.9, 20.0]) { B.box(x, 31.6, 0.14, 0.1, 3.7, 0.08, { side: T.flat(0x5a4030) }); for (let y = 31.7; y < 35.4; y += 0.9) B.box(x, y, 0.14, 0.1, 0.1, 0.5, { side: T.flat(0x5a4030) }); B.box(x, 31.6, 0.6, 0.1, 3.7, 0.07, { side: T.flat(0x6a4c36) }); B.block(x - 0.2, 31.5, 0.4, 3.9); }
      B.block(8, 31.6, 9.6, 3.6); B.block(20.4, 31.6, 25, 3.6); B.block(31.6, 0, 3.6, 35);   // moat

      /* keep */
      B.box(10, 10, 0, 8, 7, 7.5, { side: T.facade, top: paving,
        Px: CS(50, { band: 50, feats: [kwin(0.2, 44), kwin(0.5, 44), kwin(0.8, 44), kwin(0.2, 98), kwin(0.5, 98), kwin(0.8, 98)] }),
        Py: CS(51, { band: 50, feats: [{ k: 'gothic', x: 0.5, w: 15, h: 34, trim: 0xc0b8a6, lit: true }, kwin(0.16, 52), kwin(0.84, 52), kwin(0.2, 104), kwin(0.5, 104), kwin(0.8, 104)] }) });
      B.merlonsX(10, 18, 16.75, 7.5); B.merlonsX(10, 18, 10, 7.5); B.merlonsY(10, 17, 17.75, 7.5); B.merlonsY(10, 17, 10, 7.5);
      B.box(12.3, 11.6, 7.5, 3.4, 3.4, 4.2, { side: T.facade, noTop: true, Px: CS(52, { band: 42, feats: [kwin(0.5, 40, { w: 8, h: 18 })] }), Py: CS(53, { band: 42, feats: [kwin(0.5, 40, { w: 8, h: 18 })] }) });
      B.pyramid(12.3, 11.6, 11.7, 3.4, 3.4, 3.6, { P: { pal: T.ROOF_SLATE, seed: 9 } });
      B.flags.push({ x: 14, y: 13.3, z: 15.3, c: RED, pole: 1.1 });
      B.roundTower(10, 10, 1.2, 9.2, { roof: T.ROOF_SLATE, seed: 21, n: 10, lit: true, flag: BLUE, levels: [60, 110, 160] });
      B.roundTower(18, 10, 1.2, 8.6, { roof: T.ROOF_SLATE, seed: 22, n: 10, lit: true, flag: BLUE, levels: [60, 110, 150] });
      B.roundTower(10, 17, 1.2, 8.6, { roof: T.ROOF_SLATE, seed: 23, n: 10, lit: true, flag: BLUE, levels: [60, 110, 150] });
      B.roundTower(18, 17, 1.2, 8.2, { roof: T.ROOF_SLATE, seed: 24, n: 10, lit: true, flag: BLUE, levels: [60, 110, 140] });
      B.block(10, 10, 8, 7); B.poi(14, 18.4, 'door', 0, -1);
      B.banner(12.2, 17.05, 6.4, 'y', RED, GOLD, 2.2); B.banner(15.8, 17.05, 6.4, 'y', RED, GOLD, 2.2);
      E.addLight(14, 17.8, 1.8, 4.5, null, 1.2);
      // great hall
      B.house({ x: 18.9, y: 10.4, w: 7.2, d: 5.0, floors: 0, h0: 3.6, base: 'stone', gmat: 'stone', tint: 0xa8a49c, axis: 'x', roof: T.ROOF_RED, jetty: 0, seed: 81, rise: 3.0,
        gfeat: { k: 'glass', w: 12, h: 26, y: 5 },
        fy: [{ k: 'glass', x: 0.16, y: 18, w: 9, h: 42 }, { k: 'glass', x: 0.39, y: 18, w: 9, h: 42 }, { k: 'gothic', x: 0.64, w: 12, h: 30, trim: 0xc0b8a6, lit: true }, { k: 'glass', x: 0.88, y: 18, w: 9, h: 42 }],
        fx: [{ k: 'glass', x: 0.3, y: 18, w: 9, h: 42 }, { k: 'glass', x: 0.7, y: 18, w: 9, h: 42 }] });
      // stables (thatch, against the back wall)
      B.house({ x: 8.1, y: 19.6, w: 3.3, d: 7, floors: 0, h0: 1.7, base: 'timber', axis: 'y', rtex: T.thatch, rise: 1.7, chimney: false, plaster: 0xa88a60, seed: 85, plain: true,
        fx: [{ k: 'shop', x: 0.27, w: 24, h: 22, trim: 0x5a4030 }, { k: 'shop', x: 0.75, w: 24, h: 22, trim: 0x5a4030 }] });
      for (let i = 0; i < 4; i++) B.box(11.8 + (i & 1) * 0.75, 23.1 + (i >> 1) * 0.55, 0, 0.7, 0.5, 0.45, { side: (s, t) => mul(0xd9b84a, 0.85 + h2(s * 16, t * 20) * 0.25) });
      B.box(12.1, 23.3, 0.45, 0.7, 0.5, 0.45, { side: (s, t) => mul(0xd9b84a, 0.85 + h2(s * 16, t * 20) * 0.25) }); B.block(11.8, 23.1, 1.5, 1.1);
      // smithy
      B.house({ x: 25.3, y: 16.9, w: 4.4, d: 3.3, floors: 0, h0: 1.9, base: 'stone', axis: 'x', roof: T.ROOF_BROWN, rise: 1.6, seed: 88, tint: 0x8a7a6a,
        fy: [{ k: 'open', x: 0.4, w: 18, h: 25, trim: 0x6a5a4a, lit: true }, { k: 'win', x: 0.82, y: 13, w: 6, h: 9 }] });
      B.brazier(28.2, 21.2); B.box(26.4, 21.0, 0, 0.6, 0.35, 0.4, { side: T.flat(0x4a4a52) }); B.block(26.4, 21, 0.6, 0.35); B.barrel(25.5, 20.6); B.crate(29.0, 20.6);
      B.poi(26.9, 21.9, 'shop', 0, -1);
      /* yard */
      B.well(15.2, 22.2); B.tree(13.4, 27.0, { s: 1.5, pal: T.LEAF_D, flowers: null, n: 9 }); B.tree(27.6, 11.6, { s: 1.1 }); B.cart(21.9, 18.2);
      B.flowerbed(19.2, 16.0, 2.6, 0.9); B.flowerbed(23.0, 16.0, 2.2, 0.9); B.bench(15.6, 18.3, 'x');
      const rings = (s, t, q, a, b) => { const d = Math.hypot(a - 0.5, b - 0.5); return d > 0.5 ? -1 : d > 0.38 ? 0xf0ece0 : d > 0.26 ? 0x3a4a8a : d > 0.13 ? 0xc23b3b : 0xe8c84a; };
      for (const x of [22.5, 24.6, 26.7]) { Q([x, 23.0, 0.25], [0.9, 0, 0], [0, 0, 0.9], rings, { n: [0, 1, 0], cut: true }); B.box(x + 0.4, 22.8, 0, 0.1, 0.2, 0.7, { side: T.flat(0x5a4030) }); B.block(x, 22.7, 0.9, 0.4); B.poi(x + 0.45, 27.6, 'chat', 0, -1); }
      for (const p of [[22.4, 25.6], [28.4, 25.0], [28.2, 27.6]]) { B.box(p[0] - 0.05, p[1] - 0.05, 0, 0.1, 0.1, 1.1, { side: T.flat(0x5a4030) }); B.box(p[0] - 0.4, p[1] - 0.04, 0.78, 0.8, 0.08, 0.08, { side: T.flat(0x6a4c36) }); B.sack(p[0], p[1], 0.62, 0xc9b070); B.blockC(p[0], p[1], 0.3); B.poi(p[0] + 0.1, p[1] + 0.8, 'chat', 0, -1); }
      B.barrel(11.9, 19.2); B.barrel(12.4, 19.5); B.crate(18.6, 28.9); B.crate(19.6 + 1.4, 29.0, 0, 0.42); B.barrel(8.6, 27.4); B.barrel(9.1, 27.9); B.sack(9.6, 27.2); B.barrel(29.3, 28.8); B.crate(28.5, 29.1);
      B.lamp(17.2, 24.5); B.lamp(20.8, 24.5); B.lamp(12.6, 18.6); B.lamp(24.3, 21.2);
      B.poi(12.2, 21.5, 'stall', -1, 0); B.poi(12.2, 25.3, 'stall', -1, 0); B.poi(19, 27, 'chat'); B.poi(17, 20.3, 'chat'); B.poi(23.2, 17.6, 'door', 0, -1); B.poi(15.9, 23.3, 'well', -1, -1);
      B.poi(19, 37.5, 'chat'); B.poi(19, 33.5, 'chat'); B.poi(25, 27.5, 'chat');

      /* outside the walls */
      for (let i = 0; i < 34; i++) { const u = h2(i, 41), v = h2(i, 42), side = i % 3; const tx = side === 0 ? 36.4 + u * 8 : side === 1 ? 2 + v * 14 : 23 + v * 21, ty = side === 0 ? 29.5 + v * 15 : 36.3 + u * 8.4;
        if (Math.abs(tx - 19) < 2.4) continue; B.tree(tx, ty, { s: 0.95 + h2(i, 43) * 0.55, pal: [T.LEAF_G, T.LEAF_D, T.LEAF_Y][i % 3], flowers: i % 4 ? null : T.BLOSSOM }); }
      for (let i = 0; i < 9; i++) B.cypress(36.2 + (i % 2) * 0.5, 2 + i * 3.1, 1.0 + h2(i, 4) * 0.3);
      for (let i = 0; i < 20; i++) B.bush(15 + h2(i, 51) * 8, 36 + h2(i, 52) * 8.5, { s: 0.8 + h2(i, 53) * 0.4 });
      B.house({ x: 22.4, y: 38.6, w: 4.6, d: 4.2, floors: 1, axis: 'x', seed: 91, rtex: T.thatch, rise: 2.2, fx: [{ k: 'door', x: 0.5, w: 9, h: 21, trim: 0xb0a898 }] });
      B.house({ x: 10.6, y: 39.0, w: 4.4, d: 4.2, floors: 1, axis: 'y', seed: 93, plaster: 0xe9c9a0, fy: [{ k: 'win', x: 0.5, y: 13, w: 7, h: 11, box: true, rows: 6 }], fx: [{ k: 'door', x: 0.5, w: 9, h: 21, trim: 0xb0a898 }] });
      B.fence(20.6, 36.2, 20.6, 38.4); B.fence(17.4, 36.2, 17.4, 39.8); B.lamp(20.9, 35.6); B.lamp(17.1, 35.6);
    },
  };

  /* =====================================================================
   *  3. THRONE ROOM (cut-away interior)
   * ===================================================================== */
  const noGlass = (s, t, q, a, b) => { const c = T.facade(s, t, q, a, b); return (c >> 24) & E.F_WIN ? -1 : c; };
  Scenes.throne = {
    name: 'Throne Room', bounds: [0, 0, 18, 28.5, 8], focus: [8.6, 12.5], focusZ: 1.5, king: [9.0, 3.35], kingSit: 0.94, npcs: 20,
    roles: ['villager', 'villager', 'villager', 'noble', 'noble', 'monk'], walk: [2.1, 2.1, 15.9, 25.9],
    blurb: 'Mock-up 3: holding court. Sun shafts through the stained glass are real cast light; petitioners queue on the carpet. Try Dusk and Night.',
    times: {
      day: { L: [-0.8, 0.2, 0.52], sun: [1.2, 1.0, 0.68], amb: [0.40, 0.37, 0.50], fill: [0.10, 0.08, 0.06], night: true, lamp: 0.7, bg: [14, 11, 18] },
      dusk: { L: [-0.85, 0.16, 0.34], sun: [1.45, 0.66, 0.28], amb: [0.33, 0.27, 0.42], fill: [0.08, 0.05, 0.05], night: true, lamp: 0.9, bg: [14, 10, 16] },
      night: { L: [-0.75, 0.25, 0.6], sun: [0.22, 0.34, 0.66], amb: [0.13, 0.13, 0.26], fill: [0.02, 0.02, 0.05], night: false, lamp: 1.3, bg: [7, 7, 14] },
    },
    guards: [[6.0, 6.7, 0.2, 1], [12.0, 6.7, 0.2, 1], [7.3, 11, 1, 0.2], [10.7, 11, -1, 0.9], [7.3, 17, 1, 0.2], [10.7, 17, -1, 0.9], [7.5, 24.6, 0.2, 1], [10.5, 24.6, 0.2, 1]],
    fixed: [
      { role: 'noble', fem: true, name: 'The Queen', doing: 'Judging the petitioners', x: 7.3, y: 3.45, z: 0.86, sit: true, fx: 0.3, fy: 1 },
      { role: 'monk', name: 'The Chancellor', doing: 'Whispering counsel', x: 10.5, y: 4.4, z: 0.44, fx: -0.2, fy: 1 },
      { role: 'noble', fem: false, name: 'The Royal Herald', doing: 'Announcing the next petitioner', x: 10.4, y: 7.3, fx: -1, fy: 0.6 },
    ],
    build() {
      // floor
      Q([2, 2, 0], [14, 0, 0], [0, 24, 0], (s, t) => {
        const x = s + 2, y = t + 2;
        if (x < 4.9 || x > 13.1) return T.flag(x, y, 16, 0x8a8478, 0x7f7a70);
        return T.flag(x + y, y - x + 40, 23, 0xcfc6b2, 0x6f6a78);
      }, { n: [0, 0, 1] });
      Q([8, 5.6, 0.015], [2, 0, 0], [0, 20.4, 0], T.carpet(0xa82a2e, 0xd9a83a, 0x7a1c22), { n: [0, 0, 1], noShadow: true });
      // walls: camera sees solid stained glass; the shadow pass sees holes, so the sun really shines through
      const glass = (x, y, w, h) => ({ k: 'glass', x, y: y || 30, w: w || 14, h: h || 70 });
      const PA = { mat: 'stone', seed: 70, tint: 0xa39c90, band: 26, feats: [glass(0.115), glass(0.3), glass(0.485), glass(0.67), glass(0.855)] };
      const PB = { mat: 'stone', seed: 71, tint: 0xa39c90, band: 26, feats: [{ k: 'glass', x: 0.52, y: 62, w: 24, h: 58 }, glass(0.14, 34, 10, 56), glass(0.9, 34, 10, 56)] };
      B.box(1.4, 1.4, 0, 0.6, 24.6, 6.5, { side: T.facade, Px: PA, P: CS(72), noShadow: true, top: T.flat(0x3a3640) });
      B.box(1.4, 1.4, 0, 14.6, 0.6, 6.5, { side: T.facade, Py: PB, Px: CS(72), noShadow: true, top: T.flat(0x3a3640) });
      Q([2, 26, 0], [0, -24.6, 0], [0, 0, 6.5], noGlass, { P: PA, shadowOnly: true, cut: true });
      Q([1.4, 2, 0], [14.6, 0, 0], [0, 0, 6.5], T.flat(0), { shadowOnly: true });
      Q([1.4, 26.4, 0], [15, 0, 0], [0, 0, 7], T.flat(0), { shadowOnly: true });
      Q([16.4, 1.4, 0], [0, 25, 0], [0, 0, 7], T.flat(0), { shadowOnly: true });
      Q([1.4, 1.4, 6.5], [15, 0, 0], [0, 25, 0], T.flat(0), { shadowOnly: true });
      // cut-away stubs of the near walls
      const stub = { side: T.facade, P: CS(73), top: T.flat(0x2a2630), noShadow: true };
      B.box(16, 1.4, 0, 0.5, 25.1, 0.45, stub); B.box(1.4, 26, 0, 6.4, 0.5, 0.45, stub); B.box(10.2, 26, 0, 6.3, 0.5, 0.45, stub);
      Q([7.8, 26, 0.01], [2.4, 0, 0], [0, 0.5, 0], (s, t) => T.planks(t, s, 0x6a4a34), { n: [0, 0, 1] });
      B.box(7.55, 26, 0, 0.25, 0.5, 1.2, stub); B.box(10.2, 26, 0, 0.25, 0.5, 1.2, stub);
      // columns
      for (const y of [7.2, 11.4, 15.6, 19.8, 24]) { B.column(4.4, y, 6.3); if (y > 8) B.column(13.6, y, 6.3); }
      // dais + thrones
      const marble = (s, t) => T.flag(s, t, 12, 0xd8d0be, 0xcac2b0);
      B.box(5.6, 2, 0, 6.8, 4.3, 0.22, { side: T.facade, P: CS(74, { tint: 0xc8c0ae }), top: marble });
      B.box(6.3, 2, 0.22, 5.4, 3.5, 0.22, { side: T.facade, P: CS(75, { tint: 0xc8c0ae }), top: marble });
      Q([8, 2.6, 0.455], [2, 0, 0], [0, 2.9, 0], T.carpet(0xa82a2e, 0xd9a83a, 0x7a1c22), { n: [0, 0, 1], noShadow: true });
      Q([8, 5.5, 0.235], [2, 0, 0], [0, 0.8, 0], T.flat(0xa82a2e), { n: [0, 0, 1], noShadow: true });
      B.block(5.6, 2, 6.8, 4.3);
      const velvet = (c) => (s, t, q) => { const X = Math.floor(s * 16), Y = Math.floor(t * 20), Wt = Math.round(q.ul * 16), Ht = Math.round(q.vl * 20);
        if (X < 2 || X >= Wt - 2 || Y >= Ht - 3 || Y < 2) return (X + Y) % 4 === 0 ? 0xf4dc6a : 0xd9a83a;
        if (Y > Ht - 9 && Math.abs(X - Wt / 2 + 0.5) < 2) return 0xf4dc6a;
        return mul(c, ((X + Y) % 6 === 0 || (X - Y + 60) % 6 === 0) ? 0.82 : 1); };
      const gold = (s, t) => mul(0xd9a83a, 0.9 + h2(s * 16, t * 20) * 0.2);
      B.box(8.45, 2.62, 0.44, 1.1, 0.26, 2.5, { side: velvet(0xa82a2e), top: gold });
      B.box(8.5, 2.88, 0.44, 1.0, 0.8, 0.5, { side: gold, top: T.flat(0xb8323a) });
      B.box(8.38, 2.88, 0.94, 0.14, 0.8, 0.3, { side: gold }); B.box(9.48, 2.88, 0.94, 0.14, 0.8, 0.3, { side: gold });
      B.box(8.38, 2.6, 2.94, 0.16, 0.16, 0.35, { side: gold }); B.box(9.46, 2.6, 2.94, 0.16, 0.16, 0.35, { side: gold });
      B.box(6.85, 2.75, 0.44, 0.9, 0.22, 1.9, { side: velvet(0x34508f), top: gold });
      B.box(6.9, 2.97, 0.44, 0.8, 0.7, 0.42, { side: gold, top: T.flat(0x34508f) });
      // banners, torches, braziers
      for (const x of [4.3, 6.2, 11.9, 13.9]) B.banner(x, 2, 5.6, 'y', x > 5 && x < 13 ? RED : BLUE, GOLD, 2.6);
      for (const f of [0.208, 0.393, 0.578, 0.763]) { const y = 26 - f * 24.6; B.banner(2, y, 5.2, 'x', (f * 10 | 0) & 1 ? BLUE : RED, GOLD, 2.3); B.torch(2, y - 0.65, 1.9, 'x'); B.torch(2, y + 0.65, 1.9, 'x'); }
      B.torch(5.3, 2, 2.0, 'y'); B.torch(12.9, 2, 2.0, 'y');
      B.brazier(6.3, 6.9); B.brazier(11.7, 6.9); B.brazier(5.6, 25.2); B.brazier(12.4, 25.2);
      // chandeliers
      for (const y of [10.5, 16.5, 22.5]) {
        B.box(8.97, y - 0.03, 4.7, 0.06, 0.06, 1.8, { side: T.flat(0x2e2a30), noShadow: true });
        B.cyl(9, y, 4.5, 0.8, 0.12, 10, T.flat(0x4a3a2a), { top: T.flat(0x3a2e24), inner: 0.8, noShadow: true });
        for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; B.box(9 + Math.cos(a) * 0.72 - 0.05, y + Math.sin(a) * 0.72 - 0.05, 4.62, 0.1, 0.1, 0.16, { side: T.emis(0xffe9a0), noShadow: true }); }
        E.addLight(9, y, 4.2, 8.5, [1.0, 0.74, 0.4], 0.75);
      }
      // feast tables on the sunny side + benches
      for (const y of [9.2, 14.2, 19.2]) {
        B.box(11.6, y, 0, 1.0, 3.2, 0.5, { side: T.wood, P: { c: 0x6a4630 }, top: B.goodsTex(y | 0) }); B.block(11.6, y, 1.0, 3.2);
        B.box(11.1, y + 0.2, 0.2, 0.3, 2.8, 0.07, { side: T.wood, P: { c: 0x7a5a3c } }); B.box(12.75, y + 0.2, 0.2, 0.3, 2.8, 0.07, { side: T.wood, P: { c: 0x7a5a3c } });
        B.poi(10.8, y + 1.0, 'noble', 1, 0); B.poi(10.8, y + 2.3, 'noble', 1, 0);
      }
      B.box(14.7, 9, 0, 0.9, 0.9, 0.9, { side: T.wood, P: { c: 0x8a6444, crate: true }, top: T.woodTop }); B.block(14.7, 9, 0.9, 0.9);
      for (const p of [[2.5, 6.0], [2.5, 25.2], [15.3, 2.6], [15.3, 25.2], [2.5, 2.6]]) { B.cyl(p[0], p[1], 0, 0.3, 0.45, 8, T.flat(0x9a5a3a), { top: T.dirt }); B.bush(p[0], p[1], { z: 0.45, s: 1.3, n: 3, flowers: null, noBlock: true, pal: T.LEAF_G }); B.blockC(p[0], p[1], 0.35); }
      // petitioners queue on the carpet, courtiers in the aisles
      for (let i = 0; i < 7; i++) B.poi(9 + (i & 1 ? 0.35 : -0.35), 8.4 + i * 1.5, 'court', 0, -1);
      for (const y of [8, 12, 16, 20, 23]) { B.poi(3.2, y, 'noble', 1, 0.2); B.poi(6.2, y + 1, 'noble', 1, -0.3); B.poi(14.8, y + 1.5, 'noble', -1, 0); }
    },
  };
})();
