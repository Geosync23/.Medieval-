'use strict';
const Scenes = {};
(function () {
  const h2 = E.h2, Q = E.quad;
  const RED = 0xc8503c, CREAM = 0xeadfc4, BLUE = 0x4a6a9a, GREEN = 0x5a8a4a, GOLD = 0xd9a83a;
  const SH_G = 0x4f7a52, SH_B = 0x4a6688, SH_R = 0x8a4038, SH_BR = 0x6a4a36;
  const win = (x, o) => Object.assign({ k: 'win', x, y: 13, w: 7, h: 11, box: true, rows: 6 }, o || {});
  const door = (x, o) => Object.assign({ k: 'door', x, w: 9, h: 21, trim: 0xb0a898 }, o || {});

  /* =====================================================================
   *  1. TOWN SQUARE
   * ===================================================================== */
  Scenes.town = {
    name: 'Town Square', bounds: [-3, -3, 42, 42, 13], focus: [18.5, 18.5], king: [20.5, 22], npcs: 46, guards: [[11.3, 10.4, 1], [10.4, 11.3, 1]],
    walk: [8, 8, 36, 36],
    blurb: 'Mock-up 1: market square. ~50 simulated villagers wander between stalls, shops, the well and the fountain.',
    build() {
      const FX = 18, FY = 18;
      // ground
      Q([-3, -3, 0], [45, 0, 0], [0, 45, 0], (s, t) => {
        const x = s - 3, y = t - 3;
        const dF = Math.hypot(x - FX, y - FY);
        if (dF < 5.7) return T.radial(x, y, FX, FY);
        const edge = Math.max(x, y) + T.fbm(x * 0.6, y * 0.6) * 2.2;
        if (edge > 31.5) {
          const road = Math.abs(x - y) + T.vn(x * 0.7, y * 0.7) * 0.9;
          if (road < 1.9) return T.dirt(x, y);
          return T.grass(x, y);
        }
        if (edge > 31.2) return T.dirt(x, y);
        return T.cobble(x, y);
      }, { n: [0, 0, 1] });

      /* --- church / town hall in the back corner --- */
      const ST = { mat: 'stone', seed: 40, tint: 0xa9a294 };
      B.box(3.5, 3.5, 0, 6.5, 6.5, 4.6, { side: T.facade, noTop: true,
        Px: Object.assign({}, ST, { feats: [{ k: 'glass', x: 0.2, y: 22, w: 9, h: 46 }, { k: 'gothic', x: 0.5, w: 13, h: 34, trim: 0xc0b8a6, lit: true }, { k: 'glass', x: 0.8, y: 22, w: 9, h: 46 }] }),
        Py: Object.assign({}, ST, { seed: 41, feats: [{ k: 'glass', x: 0.2, y: 22, w: 9, h: 46 }, { k: 'glass', x: 0.5, y: 22, w: 9, h: 46 }, { k: 'glass', x: 0.8, y: 22, w: 9, h: 46 }] }) });
      B.gable(3.5, 3.5, 4.6, 6.5, 6.5, 3.4, 'x', { P: { pal: T.ROOF_SLATE, seed: 4 }, GP: Object.assign({}, ST, { gfeat: { k: 'glass', w: 14, h: 30, y: 6 } }) });
      // bell tower
      B.box(8.6, 8.6, 0, 2.7, 2.7, 8.6, { side: T.facade, noTop: true,
        Px: Object.assign({}, ST, { seed: 42, band: 40, feats: [{ k: 'gothic', x: 0.5, w: 11, h: 26, trim: 0xc0b8a6 }, { k: 'awin', x: 0.5, y: 60, w: 6, h: 14, frame: 0x4a4038 }, { k: 'awin', x: 0.5, y: 120, w: 8, h: 22, frame: 0x4a4038, lit: false }] }),
        Py: Object.assign({}, ST, { seed: 43, band: 40, feats: [{ k: 'gothic', x: 0.5, w: 11, h: 26, trim: 0xc0b8a6 }, { k: 'awin', x: 0.5, y: 60, w: 6, h: 14, frame: 0x4a4038 }, { k: 'awin', x: 0.5, y: 120, w: 8, h: 22, frame: 0x4a4038, lit: false }] }) });
      B.box(8.45, 8.45, 8.6, 3.0, 3.0, 0.25, { side: T.flat(0xb8b0a0) });
      B.pyramid(8.6, 8.6, 8.85, 2.7, 2.7, 4.2, { P: { pal: T.ROOF_SLATE, seed: 5 }, ov: 0.1 });
      B.flags.push({ x: 9.95, y: 9.95, z: 13.05, c: 0xd9a83a, pole: 0.9 });
      B.block(3.4, 3.4, 8, 8); B.poi(11.9, 9.9, 'door', -1, 0); B.poi(9.9, 11.9, 'door', 0, -1);
      E.addLight(11.6, 10.4, 1.5, 3.5, null, 1); E.addLight(10.4, 11.6, 1.5, 3.5, null, 1);

      /* --- left row: facades face +x (towards the square) --- */
      B.house({ x: 4.2, y: 11.9, w: 6.2, d: 5.0, floors: 2, axis: 'x', seed: 3, shutter: SH_G, dormer: 0,
        fx: [win(0.2, { shut: SH_G }), door(0.52), win(0.82, { shut: SH_G })], fy: [win(0.3), win(0.7)] });
      B.house({ x: 4.8, y: 17.3, w: 5.6, d: 4.7, floors: 2, axis: 'y', seed: 8, plaster: 0xe9c9a0, shutter: SH_R, dormer: 0.5, roof: T.ROOF_BROWN,
        fx: [{ k: 'shop', x: 0.36, w: 26, h: 22, trim: 0x6a4a36, lit: true }, door(0.82, { trim: 0x6a4a36 })], fy: [win(0.5)] });
      B.awning(10.4, 17.5, 1.8, 3.2, 1.0, 'x', RED, CREAM);
      B.house({ x: 4.2, y: 22.4, w: 6.2, d: 5.4, floors: 3, axis: 'x', seed: 14, plaster: 0xe2d6b8, shutter: SH_B, jetty: 0.14,
        fx: [{ k: 'open', x: 0.25, w: 11, h: 22, trim: 0xb0a898, lit: true }, win(0.6, { shut: SH_B }), win(0.86, { shut: SH_B })], fy: [win(0.25), door(0.6), win(0.85)] });
      B.sign(10.5, 26.9, 'x', GOLD);
      B.house({ x: 4.9, y: 28.3, w: 5.4, d: 4.6, floors: 1, axis: 'y', seed: 22, plaster: 0xdccba4, shutter: SH_BR, rtex: T.thatch, rise: 2.4,
        fx: [door(0.3), win(0.7)], fy: [win(0.3), win(0.72)] });

      /* --- right row: facades face +y --- */
      B.house({ x: 11.9, y: 4.2, w: 5.0, d: 6.2, floors: 2, axis: 'y', seed: 31, plaster: 0xead9b0, shutter: SH_B,
        fy: [door(0.3), win(0.72, { shut: SH_B })], fx: [win(0.3), win(0.7)] });
      B.house({ x: 17.3, y: 4.8, w: 5.0, d: 5.6, floors: 2, axis: 'x', seed: 37, plaster: 0xe6d0a2, shutter: SH_G, dormer: 0.5, roof: T.ROOF_BROWN,
        fy: [{ k: 'shop', x: 0.4, w: 28, h: 22, trim: 0x6a4a36, lit: true }, door(0.85, { trim: 0x6a4a36 })], fx: [win(0.5)] });
      B.awning(17.5, 10.4, 1.8, 3.6, 1.0, 'y', RED, CREAM);
      B.house({ x: 22.7, y: 4.2, w: 5.6, d: 6.2, floors: 3, axis: 'y', seed: 44, plaster: 0xf0dcae, shutter: SH_R, jetty: 0.14,
        fy: [win(0.16, { shut: SH_R }), { k: 'open', x: 0.5, w: 11, h: 22, trim: 0xb0a898, lit: true }, win(0.84, { shut: SH_R })], fx: [win(0.3), win(0.7)] });
      B.sign(25.5, 10.5, 'y', 0x8a3a3a);
      B.house({ x: 28.9, y: 4.9, w: 4.8, d: 5.4, floors: 1, axis: 'x', seed: 52, plaster: 0xdccba4, shutter: SH_G, roof: T.ROOF_BROWN,
        fy: [door(0.35), win(0.75)], fx: [win(0.3), win(0.7)] });
      B.awning(28.9, 10.3, 1.75, 4.8, 0.9, 'y', BLUE, CREAM);

      /* --- back streets: more roofs behind --- */
      B.house({ x: -2.5, y: 9, w: 5, d: 5, floors: 2, axis: 'x', seed: 61, shutter: SH_R, fx: [door(0.5)], roof: T.ROOF_BROWN });
      B.house({ x: -2.5, y: 15.5, w: 5.5, d: 5.5, floors: 3, axis: 'y', seed: 63, plaster: 0xe9c9a0, shutter: SH_G, fx: [win(0.5)] });
      B.house({ x: -2.5, y: 22.5, w: 5, d: 5, floors: 2, axis: 'x', seed: 65, shutter: SH_B, fx: [win(0.5)], roof: T.ROOF_SLATE });
      B.house({ x: 9.5, y: -2.5, w: 5, d: 5, floors: 2, axis: 'y', seed: 67, shutter: SH_B, fy: [door(0.5)] });
      B.house({ x: 15.8, y: -2.5, w: 5.5, d: 5.5, floors: 3, axis: 'x', seed: 69, plaster: 0xf0dcae, shutter: SH_R, fy: [win(0.5)], roof: T.ROOF_BROWN });
      B.house({ x: 22.6, y: -2.5, w: 5, d: 5, floors: 2, axis: 'y', seed: 71, shutter: SH_G, fy: [win(0.5)], roof: T.ROOF_SLATE });
      B.house({ x: -2.5, y: 29.5, w: 5, d: 5, floors: 1, axis: 'x', seed: 73, rtex: T.thatch, fx: [door(0.5)] });
      B.house({ x: 29.5, y: -2.5, w: 5, d: 5, floors: 2, axis: 'y', seed: 75, fy: [door(0.5)] });

      /* --- plaza --- */
      B.fountain(FX, FY);
      B.lamp(12.6, 12.6); B.lamp(23.9, 12.3); B.lamp(12.3, 23.9); B.lamp(24.2, 24.2); B.lamp(29.2, 16.5); B.lamp(16.5, 29.2);
      B.stall(20.2, 11.6, 2.4, 1.3, 'y', RED, CREAM, 3);
      B.stall(11.6, 20.6, 1.3, 2.4, 'x', BLUE, CREAM, 8);
      B.stall(24.6, 19.2, 1.3, 2.4, 'x', GREEN, CREAM, 12);
      B.stall(19.4, 25.2, 2.4, 1.3, 'y', RED, 0xe8c070, 17);
      B.stall(13.2, 26.2, 2.2, 1.3, 'y', 0x8a5aa0, CREAM, 23);
      B.stall(26.3, 13.0, 1.3, 2.2, 'x', GOLD, RED, 29);
      // clutter
      B.barrel(11.3, 16.6); B.barrel(11.9, 16.3); B.barrel(11.5, 16.0, 0.6); B.crate(11.2, 15.2); B.crate(11.25, 15.25, 0.45, 0.42);
      B.barrel(22.9, 11.4); B.barrel(23.4, 11.8); B.crate(19.4, 11.5); B.sack(19.3, 12.3); B.sack(19.7, 12.5, 0, 0xb89a6a);
      B.barrel(16.3, 11.4); B.barrel(16.8, 11.3); B.crate(15.4, 11.2, 0, 0.55);
      B.barrel(26.2, 19.0); B.crate(26.1, 21.2); B.crate(26.6, 21.3, 0, 0.42); B.sack(25.6, 22); B.barrel(24.9, 18.7);
      B.crate(22.1, 25.6); B.barrel(22.3, 26.4); B.pile(18.9, 26.7, 0xe07a2a, 0xf0983a, 6); B.sack(21.9, 26.9);
      B.crate(12.6, 26.3, 0, 0.45); B.barrel(15.7, 26.6); B.pile(15.9, 27.5, 0x6fa044, 0x8cba58, 5);
      B.barrel(11.4, 23.3); B.sack(11.5, 19.9); B.crate(27.8, 13.4); B.barrel(27.9, 14.4); B.barrel(28.3, 14.0);
      B.cart(21.6, 21.9); B.well(27.3, 26.3);
      B.bench(14.2, 15.4, 'y'); B.bench(15.4, 14.2, 'x'); B.bench(21.6, 14.4, 'x'); B.bench(14.3, 20.9, 'y');
      B.pile(13.6, 21.2, 0xc8452f, 0xd9643a, 4);
      // greenery framing the front
      B.tree(29.4, 21.3, { s: 1.15 }); B.tree(21.5, 29.6, { s: 1.2, flowers: T.APPLE, fp: 0.05 }); B.tree(30.2, 27.2, { s: 1.3 });
      B.tree(26.4, 30.6, { s: 1.1, pal: T.LEAF_Y, flowers: null }); B.tree(32.6, 23.6, { s: 1.0, flowers: T.APPLE, fp: 0.05 }); B.tree(23.6, 33.2, { s: 1.25 });
      B.tree(33.3, 30.0, { s: 1.4, pal: T.LEAF_D, flowers: null }); B.tree(29.6, 33.4, { s: 1.2 }); B.tree(34.6, 34.8, { s: 1.3, pal: T.LEAF_Y, flowers: null });
      B.tree(32.6, 12.2, { s: 1.1 }); B.tree(12.0, 32.4, { s: 1.15, flowers: T.APPLE, fp: 0.05 }); B.tree(35, 17, { s: 1.3, pal: T.LEAF_D, flowers: null }); B.tree(17, 35, { s: 1.3 });
      B.tree(34.8, 27.5, { s: 1.1 }); B.tree(27.3, 35.2, { s: 1.15, pal: T.LEAF_D, flowers: null });
      for (let i = 0; i < 26; i++) { const u = h2(i, 91), v = h2(i, 92), side = i & 1, tx = side ? 36.5 + u * 5 : 8 + v * 33, ty = side ? 8 + v * 33 : 36.5 + u * 5;
        B.tree(tx, ty, { s: 1.0 + h2(i, 93) * 0.5, pal: [T.LEAF_G, T.LEAF_D, T.LEAF_Y, T.LEAF_G][i & 3], flowers: (i % 3) ? null : T.BLOSSOM }); }
      B.flowerbed(28.2, 28.6, 2.4, 1.0); B.flowerbed(31.2, 24.8, 1.0, 2.2); B.flowerbed(24.8, 31.4, 2.2, 1.0);
      for (let i = 0; i < 16; i++) B.bush(28.5 + h2(i, 1) * 7.5, 28.5 + h2(i, 2) * 7.5 - (h2(i, 1) > 0.5 ? 9 * h2(i, 3) : 0), { s: 0.9 + h2(i, 4) * 0.5 });
      for (let i = 0; i < 8; i++) B.bush(31 + h2(i, 11) * 5, 11 + h2(i, 12) * 9, { s: 0.9 });
      for (let i = 0; i < 8; i++) B.bush(11 + h2(i, 21) * 9, 31 + h2(i, 22) * 5, { s: 0.9 });
      B.fence(30.5, 19.5, 30.5, 23.5); B.fence(19.5, 30.5, 23.5, 30.5);
      B.bush(11.1, 12.2, { s: 0.8 }); B.bush(11.0, 27.9, { s: 0.9 }); B.bush(28.2, 11.0, { s: 0.9 }); B.bush(22.3, 11.0, { s: 0.7 });
      B.poi(16, 16, 'chat'); B.poi(20.5, 15.2, 'chat'); B.poi(15.2, 21.5, 'chat'); B.poi(22.5, 23.5, 'chat'); B.poi(26, 26, 'chat'); B.poi(28.5, 20, 'chat'); B.poi(20, 28.5, 'chat');
      B.poi(26.6, 27.3, 'well', 1, -1); B.poi(13.9, 16.2, 'bench', -1, 0); B.poi(21.9, 14.0, 'bench', 0, 1);
    },
  };
})();
