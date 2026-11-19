'use strict';
const Scenes = {};
(function () {
  const h2 = E.h2, Q = E.quad;
  const RED = 0xc8503c, CREAM = 0xeadfc4, BLUE = 0x4a6a9a, GREEN = 0x5a8a4a, GOLD = 0xd9a83a, PURP = 0x8a5aa0;
  const SH_G = 0x4f7a52, SH_B = 0x4a6688, SH_R = 0x8a4038, STN = 0xb0a898, WD = 0x6a4a36;
  const win = (x, o) => Object.assign({ k: 'win', x, y: 24, w: 14, h: 24, sill: 0xb8ae9c, frame: 0x4d3528, curtain: 0xa84a3a }, o || {});
  const door = (x, o) => Object.assign({ k: 'door', x, w: 18, h: 44, trim: STN }, o || {});

  Scenes.square = {
    name: 'Market Square HD', bounds: [0, 0, 27.5, 27.5, 13.5], focus: [14.5, 14.5], focusZ: 1.2, king: [17.2, 18.4], npcs: 36, guards: [[8.5, 7.3, 1, 0.3], [7.3, 8.5, 0.3, 1]],
    walk: [8, 8, 27, 27],
    blurb: 'High-detail test: 2× pixel density, soft dithered shadows, ambient occlusion, 3D flower boxes, ivy, produce baskets.',
    build() {
      const FX = 14.5, FY = 14.5;
      Q([0, 0, 0], [27.5, 0, 0], [0, 27.5, 0], (x, y) => {
        if (Math.hypot(x - FX, y - FY) < 5.4) return T.radial(x, y, FX, FY);
        const edge = Math.max(x, y) + T.fbm(x * 0.7, y * 0.7) * 1.8;
        if (edge > 24.2) { if (Math.abs(x - y) + T.vn(x * 0.8, y * 0.8) < 1.7) return T.dirt(x, y); return T.grass(x, y); }
        if (edge > 23.95) return T.dirt(x, y);
        return T.cobble(x, y);
      }, { n: [0, 0, 1] });

      /* --- guild hall with arcade + bell tower (back corner) --- */
      const ST = { mat: 'stone', seed: 40, tint: 0xa9a294, band: 100, quoin: true };
      const arc = x => ({ k: 'gothic', x, w: 26, h: 58, trim: 0xc4bcaa, lit: true }), sg = x => ({ k: 'glass', x, y: 112, w: 16, h: 62 });
      B.box(1.2, 1.2, 0, 6.8, 6.8, 4.8, { side: T.facade, noTop: true,
        Px: Object.assign({}, ST, { feats: [arc(0.17), arc(0.42), sg(0.17), sg(0.42), sg(0.66)] }),
        Py: Object.assign({}, ST, { seed: 41, feats: [arc(0.17), arc(0.42), sg(0.17), sg(0.42), sg(0.66)] }) });
      B.gable(1.2, 1.2, 4.8, 6.8, 6.8, 3.5, 'x', { P: { pal: T.ROOF_SLATE, seed: 4 }, GP: Object.assign({}, ST, { gfeat: { k: 'glass', w: 26, h: 60, y: 10 } }), ov: 0.3 });
      const TW = { mat: 'stone', seed: 42, tint: 0xb0a898, band: 96, quoin: true };
      const tf = [{ k: 'gothic', x: 0.5, w: 22, h: 52, trim: 0xc4bcaa }, { k: 'awin', x: 0.5, y: 118, w: 12, h: 30, frame: 0x4a4038, sill: 0xc4bcaa, box: false }, { k: 'awin', x: 0.5, y: 214, w: 12, h: 30, frame: 0x4a4038, sill: 0xc4bcaa }, { k: 'awin', x: 0.5, y: 300, w: 18, h: 44, frame: 0x4a4038, lit: false, sill: 0xc4bcaa }];
      B.box(6.0, 6.0, 0, 2.7, 2.7, 9.2, { side: T.facade, noTop: true, Px: Object.assign({}, TW, { feats: tf }), Py: Object.assign({}, TW, { seed: 43, feats: tf }) });
      B.box(5.85, 5.85, 9.2, 3.0, 3.0, 0.28, { side: (s, t) => T.mul(0xbdb5a4, t > 0.2 ? 1.08 : 0.85) });
      B.pyramid(6.0, 6.0, 9.48, 2.7, 2.7, 3.6, { P: { pal: T.ROOF_SLATE, seed: 5 }, ov: 0.12 });
      B.flags.push({ x: 7.35, y: 7.35, z: 13.08, c: GOLD, pole: 0.9 });
      B.block(1.1, 1.1, 7.8, 7.8); B.poi(9.2, 7.3, 'door', -1, 0); B.poi(7.3, 9.2, 'door', 0, -1);
      B.lantern('x', 5.7, 8.7, 1.5); B.lantern('y', 5.7, 8.7, 1.5);
      B.ivy('y', 2.2, 8.0, 3.6, 5, 0.6); B.ivy('x', 2.4, 8.0, 2.8, 9, 0.5);
      B.pot(9.0, 5.6, 0xa8604a, 1.1); B.pot(5.6, 9.0, 0x8a8478, 1.1);

      /* --- left row: facades face +x --- */
      B.house({ x: 2.2, y: 8.9, w: 5.8, d: 5.2, floors: 2, axis: 'x', seed: 3, shutter: SH_G,
        fx: [win(0.2), door(0.52), win(0.82)], fy: [win(0.3), win(0.72)] });
      B.sign('x', 12.55, 8.0, 1.5, 0x5a7a4a, 3);
      B.house({ x: 2.6, y: 14.6, w: 5.4, d: 4.8, floors: 2, axis: 'y', seed: 8, plaster: 0xe9c9a0, shutter: SH_R, dormer: [0.3, 0.7], roof: T.ROOF_BROWN,
        fx: [{ k: 'shop', x: 0.37, w: 56, h: 48, trim: WD, lit: true, lamp: false }, door(0.86, { trim: WD })], fy: [win(0.5)] });
      B.awning(8.0, 15.5, 2.05, 3.0, 1.15, 'x', RED, CREAM); B.sign('x', 19.2, 8.0, 1.6, 0xb8863a, 0);
      B.house({ x: 2.2, y: 20.0, w: 5.8, d: 5.4, floors: 3, axis: 'x', seed: 14, plaster: 0xe2d6b8, shutter: SH_B, jetty: 0.14,
        fx: [{ k: 'open', x: 0.26, w: 24, h: 48, trim: STN, lit: true }, win(0.62), win(0.87)], fy: [win(0.25), door(0.6), win(0.86)] });
      B.sign('x', 24.9, 8.0, 1.6, 0x8a3a3a, 1); B.ivy('x', 20.6, 8.0, 3.2, 13, 0.45);

      /* --- right row: facades face +y --- */
      B.house({ x: 8.9, y: 2.2, w: 5.2, d: 5.8, floors: 2, axis: 'y', seed: 31, plaster: 0xead9b0, shutter: SH_B,
        fy: [door(0.3), win(0.72)], fx: [win(0.3), win(0.72)] });
      B.house({ x: 14.6, y: 2.6, w: 5.0, d: 5.4, floors: 2, axis: 'x', seed: 37, plaster: 0xe6d0a2, shutter: SH_G, dormer: [0.5], roof: T.ROOF_BROWN,
        fy: [{ k: 'shop', x: 0.4, w: 58, h: 48, trim: WD, lit: true, lamp: false }, door(0.87, { trim: WD })], fx: [win(0.5)] });
      B.awning(15.1, 8.0, 2.05, 3.1, 1.15, 'y', RED, CREAM); B.sign('y', 19.3, 8.0, 1.6, 0x4a6a9a, 2);
      B.house({ x: 20.1, y: 2.2, w: 5.6, d: 5.8, floors: 3, axis: 'y', seed: 44, plaster: 0xf0dcae, shutter: SH_R, jetty: 0.14,
        fy: [win(0.16), { k: 'open', x: 0.5, w: 24, h: 48, trim: STN, lit: true }, win(0.84)], fx: [win(0.3), win(0.72)] });
      B.ivy('y', 20.5, 8.0, 3.4, 21, 0.4); B.awning(21.0, 8.0, 2.1, 3.9, 0.9, 'y', BLUE, CREAM);
      // more roofs behind, to close the skyline
      B.house({ x: -3.5, y: 9.5, w: 5, d: 5, floors: 3, axis: 'y', seed: 61, shutter: SH_R, roof: T.ROOF_BROWN, chimney: true });
      B.house({ x: -3.5, y: 16, w: 5.2, d: 5.5, floors: 3, axis: 'x', seed: 63, plaster: 0xe9c9a0, shutter: SH_G });
      B.house({ x: 9.5, y: -3.5, w: 5, d: 5, floors: 3, axis: 'x', seed: 67, shutter: SH_B });
      B.house({ x: 16, y: -3.5, w: 5.5, d: 5.2, floors: 3, axis: 'y', seed: 69, plaster: 0xf0dcae, shutter: SH_R, roof: T.ROOF_SLATE });
      B.bunting(8.2, 11.0, 4.9, 11.0, 8.2, 4.9, [RED, GOLD, BLUE, CREAM, GREEN], 0.6);
      B.bunting(8.2, 14.2, 4.6, 8.2, 20.2, 4.6, [RED, CREAM, GOLD], 0.7); B.bunting(14.3, 8.2, 4.6, 20.3, 8.2, 4.6, [BLUE, CREAM, GOLD], 0.7);

      /* --- plaza --- */
      B.fountain(FX, FY);
      B.lamp(9.6, 9.6); B.lamp(20.4, 9.4); B.lamp(9.4, 20.4); B.lamp(20.6, 20.6); B.lamp(24.6, 13.5); B.lamp(13.5, 24.6);
      B.stall(16.6, 8.9, 2.5, 1.3, 'y', RED, CREAM, 3);
      B.stall(8.9, 17.0, 1.3, 2.5, 'x', BLUE, CREAM, 8);
      B.stall(20.9, 15.6, 1.3, 2.5, 'x', GREEN, CREAM, 12);
      B.stall(15.6, 21.2, 2.5, 1.3, 'y', RED, 0xe8c070, 17);
      B.stall(10.0, 22.0, 2.3, 1.3, 'y', PURP, CREAM, 23);
      B.stall(22.3, 9.6, 1.3, 2.3, 'x', GOLD, RED, 29);
      B.barrel(8.6, 13.6); B.barrel(9.2, 13.3); B.barrel(8.8, 13.0, 0.64); B.crate(8.5, 12.2); B.crate(8.55, 12.25, 0.45, 0.42); B.basket(9.3, 12.3, 0, 0, 0.2); B.sack(9.5, 14.0);
      B.barrel(19.5, 8.6); B.barrel(20.0, 9.0); B.crate(15.8, 8.7); B.sack(15.8, 9.5); B.sack(16.2, 9.7, 0, 0xb89a6a); B.basket(19.4, 9.6, 0, 2, 0.2);
      B.barrel(13.0, 8.6); B.crate(12.2, 8.5, 0, 0.55); B.basket(12.5, 9.3, 0, 4, 0.2); B.pot(14.4, 8.5, 0x7a8a9a);
      B.barrel(22.5, 15.3); B.crate(22.4, 17.6); B.crate(22.9, 17.7, 0, 0.42); B.sack(21.9, 18.5); B.barrel(21.2, 15.1); B.basket(22.6, 18.5, 0, 1, 0.2);
      B.crate(18.4, 21.6); B.barrel(18.6, 22.4); B.basket(15.2, 22.7, 0, 4, 0.22); B.basket(15.0, 22.2, 0, 0, 0.2); B.sack(18.2, 22.9);
      B.crate(9.4, 22.3, 0, 0.45); B.barrel(12.6, 22.6); B.basket(12.7, 23.4, 0, 2, 0.22); B.basket(13.2, 23.1, 0, 7, 0.2);
      B.barrel(8.7, 19.8); B.sack(8.8, 16.5); B.crate(23.8, 10.0); B.barrel(23.9, 11.0); B.barrel(24.3, 10.6); B.basket(23.7, 11.7, 0, 5, 0.2);
      B.cart(18.0, 18.4);
      B.bench(11.0, 12.0, 'y'); B.bench(12.0, 11.0, 'x'); B.bench(17.6, 11.0, 'x'); B.bench(11.0, 17.2, 'y');
      B.pot(8.5, 8.9 + 5.6, 0xa8604a); B.pot(8.5, 25.6, 0x8a8478, 1.1); B.pot(25.9, 8.5, 0xa8604a, 1.1); B.pot(8.5, 11.0, 0x8a8478); B.pot(11.1, 8.5, 0xa8604a);
      // greenery framing the front
      B.tree(25.3, 17.6, { s: 1.15 }); B.tree(17.8, 25.6, { s: 1.2, flowers: T.APPLE, fp: 0.035 }); B.tree(25.4, 22.6, { s: 1.3 });
      B.tree(22.2, 25.9, { s: 1.15, pal: T.LEAF_Y, flowers: null }); B.tree(26.6, 26.4, { s: 1.4, pal: T.LEAF_D, flowers: null }); B.tree(26.8, 10.2, { s: 1.0 }); B.tree(10.0, 26.6, { s: 1.05, flowers: T.APPLE, fp: 0.035 });
      B.tree(24.2, 28.2, { s: 1.2 }); B.tree(28.2, 24.2, { s: 1.2, pal: T.LEAF_Y, flowers: null }); B.tree(28.6, 16, { s: 1.3, pal: T.LEAF_D, flowers: null }); B.tree(15, 28.6, { s: 1.3 });
      for (let i = 0; i < 22; i++) { const u = h2(i, 1), v = h2(i, 2), side = i & 1; B.bush(side ? 24.6 + u * 2.6 : 9 + v * 18, side ? 9 + v * 18 : 24.6 + u * 2.6, { s: 0.9 + h2(i, 4) * 0.6, fp: 0.14 }); }
      B.poi(12.5, 12.5, 'chat'); B.poi(17, 11.8, 'chat'); B.poi(11.8, 18, 'chat'); B.poi(19, 20, 'chat'); B.poi(22.5, 22.5, 'chat'); B.poi(23.8, 19.8, 'chat'); B.poi(19.8, 23.8, 'chat');
      B.poi(10.7, 12.7, 'bench', -1, 0); B.poi(18.2, 10.7, 'bench', 0, 1);
    },
  };
})();
