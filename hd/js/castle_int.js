'use strict';
/* Interior areas of the castle: great hall & kitchens, royal apartments, undercroft, barracks, staff quarters,
 * bath house & games hall, chapel, council chamber & library, astronomer's study.
 * Every area is one rectangle: the two back walls (low x, low y) are full height, rooms inside are divided by low partitions. */
(function () {
  const h2 = E.h2, mul = T.mul, STONE = Kit.STONE;
  const RED = 0xa82a2e, BLUE = 0x34508f, GREEN = 0x3f7a46, PURPLE = 0x6a3a8a, GOLD = 0xd9a83a, CREAM = 0xe8dcc0;
  const F = (n, x, y, z, o) => Fz[n](x, y, z || 0, o);
  const awin = (x, o) => Object.assign({ k: 'awin', x, y: 52, w: 20, h: 50, frame: 0x4a4038, sill: 0xc4bcaa }, o || {});
  const glass = (x, o) => Object.assign({ k: 'glass', x, y: 44, w: 26, h: 84 }, o || {});
  const door = (x, o) => Object.assign({ k: 'door', x, w: 20, h: 46, trim: 0xb0a898 }, o || {});
  const P = (role, name, kinds, at, o) => Kit.person(Object.assign({ role, name, kinds, at }, o || {}));
  const flags = Kit.flags(), warm = Kit.flags(0xb09a80), dark = Kit.flags(0x6e6a70), oak = Kit.planks(0x8a6846), pine = Kit.planks(0xa07a4e), walnut = Kit.planks(0x6e5038);
  const terra = Kit.tiles(20, 0xa8674a, 0x96583f), chk = Kit.diag(40, 0xcfc6b2, 0x6f6a78), marble = Kit.tiles(26, 0xd8d0be, 0xbcb4a6), slate = Kit.tiles(22, 0x7c8494, 0x687080);
  /* back walls, sun-only enclosure and the cut edge of the near walls.  fx / fy: wall features given by WORLD position `at` along the wall */
  function shell(X0, Y0, X1, Y1, H, o) {
    o = o || {};
    const cx = (o.fx || []).map(f => Object.assign({}, f, { x: (Y1 - f.x) / (Y1 - Y0 + 0.5) })), cy = (o.fy || []).map(f => Object.assign({}, f, { x: (f.x - X0) / (X1 - X0) }));
    Kit.wallX(X0, Y0 - 0.5, Y1, 0, H, STONE(o.seed || 70, { feats: cx, tint: o.tint, band: o.band }), { light: o.light !== false });
    Kit.wallY(Y0, X0, X1, 0, H, STONE((o.seed || 70) + 3, { feats: cy, tint: o.tint, band: o.band }), { light: !!o.lightY });
    Kit.enclose(X0, Y0, X1, Y1, 0, H); Kit.stub(X0, Y0, X1, Y1, 0, { gapsX: o.gapsX, gapsY: o.gapsY });
  }
  /* a doorway through the near wall: 'y' = in the y1 stub at x = c, 'x' = in the x1 stub at y = c */
  function exit(axis, c, edge, tex, o) {
    if (axis === 'y') { Kit.floor(c - 0.8, edge, c + 0.8, edge + 0.9, tex, 0); Kit.portal(c, edge + 0.5, 0, Object.assign({ ex: c, ey: edge - 1.4 }, o)); }
    else { Kit.floor(edge, c - 0.8, edge + 0.9, c + 0.8, tex, 0); Kit.portal(edge + 0.5, c, 0, Object.assign({ ex: edge - 1.4, ey: c }, o)); }
  }
  /* raised platform you can walk on (one step up per 0.2) */
  function dais(x0, y0, x1, y1, z, tex, tint) { B.box(x0, y0, 0, x1 - x0, y1 - y0, z, { side: T.facade, P: STONE(74, { band: 0, tint: tint || 0xc8c0ae }), top: (s, t) => tex(s + x0, t + y0) }); Kit.walk(x0, y0, x1, y1, z); }
  /* flight of stairs with a landing at the top (against a back wall).  dir = the way it rises; returns the landing centre */
  function flight(x, y, w, d, dir, h, tex, land) {
    Kit.stairs(x, y, w, d, dir, 0, h); land = land || 1.3;
    const L = dir === '-y' ? [x, y - land, w, land] : dir === '+y' ? [x, y + d, w, land] : dir === '-x' ? [x - land, y, land, d] : [x + w, y, land, d];
    B.box(L[0], L[1], 0, L[2], L[3], h, { side: T.facade, P: STONE(8, { band: 0 }), top: (s, t) => tex(s + L[0], t + L[1]) }); Kit.walk(L[0], L[1], L[0] + L[2], L[1] + L[3], h);
    return [L[0] + L[2] / 2, L[1] + L[3] / 2];
  }
  const torchesY = (y, xs, h) => { for (const x of xs) F('torch', x, y, 0, { h: h || 1.8 }); };
  const torchesX = (x, ys, h) => { for (const y of ys) F('torch', x, y, 0, { face: 'x', h: h || 1.8 }); };

  /* =====================================================================
   *  1. GREAT HALL, KITCHENS, PANTRY, SERVANTS' HALL  (keep, ground floor)
   * ===================================================================== */
  Castle.add('hall', {
    name: 'Great Hall & Kitchens', blurb: 'The keep\'s ground floor: the dining hall, the screens passage, kitchens, buttery and servants\' hall.', interior: true, bounds: [0, 0, 28.6, 22.8, 4.6], spawn: [8, 19, 0],
    build(a) {
      const X0 = 1, Y0 = 1, X1 = 27, Y1 = 21, H = 4;
      Kit.floor(X0, Y0, 15, Y1, (x, y) => (x > 6.4 && x < 9.6 ? chk(x, y) : flags(x, y)), 0); Kit.floor(15, Y0, 17, Y1, dark, 0);
      Kit.floor(17, Y0, X1, 9, terra, 0); Kit.floor(17, 9, X1, 14, dark, 0); Kit.floor(17, 14, X1, Y1, oak, 0);
      shell(X0, Y0, X1, Y1, H, { seed: 80, gapsY: [[7.2, 8.8]],
        fx: [awin(4.2), awin(7), awin(15), awin(18)],
        fy: [awin(21.5, { y: 70, w: 16, h: 40 }), awin(25.6, { y: 70, w: 16, h: 40 })] });
      exit('y', 8, Y1, flags, { to: 'inner', at: 'keep', name: 'door', label: 'Out to the inner ward' });
      Kit.part('y', 15, Y0, Y1, 0, { gaps: [[8, 9.4], [16, 17.4]] }); Kit.part('y', 17, Y0, Y1, 0, { gaps: [[5, 6.4], [10.8, 12.2], [16, 17.4]], seed: 25 });
      Kit.part('x', 9, 17, X1, 0, { gaps: [[22, 23.4]], seed: 26 }); Kit.part('x', 14, 17, X1, 0, { gaps: [[24, 25.4]], seed: 27 });
      // ---- great hall: high table on the dais, feast tables, fireplace, minstrels ----
      dais(3, Y0, 13, 4.5, 0.2, marble);
      F('feastTable', 5.2, 2.55, 0.2, { len: 5.6, benches: false, cloth: RED, seed: 2 });
      F('throne', 7.5, 1.45, 0.2, { kind: 'eat' }); F('throne', 8.5, 1.5, 0.2, { c: BLUE, kind: 'eat' });
      for (const x of [5.5, 6.4, 9.7, 10.6]) F('chair', x, 1.75, 0.2, { cushion: x < 8 ? RED : BLUE, kind: 'eat', c: 0x5c3f2c });
      F('candelabra', 3.6, 1.6, 0.2); F('candelabra', 12.4, 1.6, 0.2);
      F('tapestry', 8, Y0, 0, { w: 3.6, h: 2.15, hh: 1.5 }); F('banner', 4.4, Y0, 0, { h: 3.7, len: 2.2 }); F('banner', 11.6, Y0, 0, { h: 3.7, len: 2.2, c: BLUE, dev: 'eagle' });
      F('runner', 7.4, 4.7, 0, { len: 16.2 });
      for (const y of [5.6, 11.6]) { F('feastTable', 3.6, y, 0, { face: 'x', len: 5, seed: y | 0 }); F('feastTable', 10.9, y, 0, { face: 'x', len: 5, seed: 3 + (y | 0), cloth: y < 8 ? 0 : 0 }); }
      F('fireplace', X0, 11, 0, { face: 'x', w: 2.8, h: 3.7 }); F('rug', 2.0, 10.3, 0, { w: 1.3, d: 1.4, pat: 'plain', c: 0x5a4a3a, c2: 0x8a7a5a });
      for (const y of [5.6, 16.5]) F('banner', X0, y, 0, { face: 'x', h: 3.6, len: 2.0, c: y < 8 ? GREEN : PURPLE, dev: y < 8 ? 'tower' : 'fleur' });
      F('stagHead', X0, 13.4, 0, { face: 'x', h: 2.5 }); F('crossedSwords', X0, 8.6, 0, { face: 'x', h: 2.4 }); torchesX(X0, [2.6, 19.6], 2.0);
      F('chandelier', 8, 8, 0, { h: 3.0, drop: 1.0, r: 0.8, n: 10, tiers: 2 }); F('chandelier', 8, 15, 0, { h: 3.0, drop: 1.0, r: 0.8, n: 10 });
      F('brazier', 6.2, 20.2, 0); F('brazier', 9.8, 20.2, 0); F('armour', 2, 20.2, 0, { face: 'x' }); F('plant', 14.2, 5.2, 0, { kind: 'tree' });
      // minstrels' corner
      dais(11.4, 17.6, 14.6, 20.8, 0.2, oak, 0x8a6a4a); F('rug', 11.7, 17.9, 0.2, { w: 2.6, d: 2.6, pat: 'diamond', c: 0x2c4078, c2: CREAM, c3: 0x1a2040 });
      F('harp', 12.3, 18.6, 0.2); F('lute', 14.1, 18.2, 0.2); F('drum', 13.6, 20.0, 0.2); F('stool', 12.6, 20.1, 0.2, { kind: 'play', look: [-0.5, -1] });
      // ---- screens passage: stair up to the throne room, stairwell down to the undercroft ----
      const L = flight(15.3, 2.4, 1.4, 3.0, '-y', 1.7, dark, 1.4);
      Kit.portal(L[0], L[1], 1.7, { to: 'throne', at: 'down', name: 'up', label: 'Up to the throne room', ex: 16, ey: 2.8 });
      Kit.stairwell(15.3, 18.4, 1.4, 2.2, 0, '+y'); Kit.portal(16, 19.9, 0, { to: 'undercroft', at: 'up', name: 'cellar', label: 'Down to the undercroft', ex: 16, ey: 17.6 });
      F('rug', 15.35, 9.8, 0, { w: 1.3, d: 5, pat: 'stripe', c: 0x7a2030, face: 'y' }); F('torch', 16, Y0, 1.7, { h: 1.6 });
      // ---- kitchen ----
      F('hearth', 18, Y0, 0, { w: 2.6, h: 3.7 }); F('dishShelf', 22.2, Y0, 0, { w: 1.3 }); F('shelves', 23.8, Y0, 0, { w: 1.2, seed: 5 }); F('waterBarrel', 26.3, 1.6, 0);
      F('cauldron', 25.4, 4, 0); F('butcherBlock', 21.2, 4.6, 0); F('breadTable', 22.6, 6.6, 0); F('hangRack', 18.6, 6.2, 0, { len: 2.4, ceiling: true, h: 1.7 });
      F('stack', 25.4, 7.2, 0, { kind: 'sacks' }); F('roundTable', 19.2, 4.3, 0, { r: 0.5, food: true, seed: 4 }); F('chandelier', 22, 5, 0, { h: 2.9, drop: 1.1, r: 0.5, n: 6 });
      // ---- pantry and buttery ----
      for (const x of [17.4, 18.6, 19.8]) F('cask', x, 9.3, 0, { c: x > 18 && x < 19 ? 0x7a4a34 : 0x8a5a3a });
      F('wineRack', 23.8, 9.2, 0, { w: 1.4 }); F('shelves', 25.4, 9.2, 0, { w: 1.3, seed: 9 }); F('stack', 25.4, 12.6, 0, { kind: 'barrels' }); F('stack', 19.4, 12.7, 0, { kind: 'crates' });
      F('hangRack', 21.4, 12.9, 0, { len: 2.2, h: 1.5, seed: 2 }); F('sconce', 22.7, 9.14, 0, { h: 0.8 }); F('candelabra', 22.6, 11.6, 0, { iron: true, n: 3 });
      // ---- servants' hall ----
      F('feastTable', 19, 16.4, 0, { len: 4.4, food: true, seed: 7, c: 0x7a5a3c }); F('shelves', 17.4, 14.2, 0, { w: 1.2, seed: 12 }); F('dishShelf', 18.8, 14.2, 0);
      F('bench', 26.3, 15.6, 0, { face: '-x', len: 2.4, back: true }); F('brazier', 25, 19.6, 0); F('chest', 17.4, 19.8, 0); F('waterBarrel', 20.2, 20.2, 0); F('candelabra', 24.4, 15, 0, { iron: true });
      F('rug', 23.9, 16.2, 0, { w: 2.0, d: 2.6, pat: 'stripe', c: 0x6a5a3a, face: 'y' });
      // ---- people ----
      P('guard', 'Door guard', null, [6.9, 19.4, 0], { fixed: [0.4, 1] }); P('guard', 'Door guard', null, [9.1, 19.4, 0], { fixed: [-0.4, 1] });
      P('noble', 'The Steward', ['work', 'eat'], [9.6, 6, 0]); for (let i = 0; i < 5; i++) P('noble', null, ['eat', 'sit'], [6 + i, 9 + i, 0], { fem: i % 2 === 0 });
      P('villager', 'Harper', ['play'], [12.6, 19.2, 0.2], { top: 0x6a3a7a, hat: 2 }); P('villager', 'Drummer', ['play'], [13.2, 19.6, 0.2], { top: 0x3a6a5a });
      for (let i = 0; i < 3; i++) P('villager', ['Head cook', 'Cook', 'Baker'][i], ['cook'], [21 + i, 3.4, 0], { apron: true, hat: i ? 0 : 3 });
      for (let i = 0; i < 2; i++) P('villager', 'Scullion', ['cook', 'drink', 'work'], [24, 6 + i, 0], { apron: true });
      P('villager', 'Butler', ['drink', 'work'], [22, 11, 0], { top: 0x3a3a4a }); for (let i = 0; i < 4; i++) P('villager', 'Servant', ['work', 'eat', 'drink'], [20 + i, 18.6, 0], { apron: i % 2 === 0 });
    },
  });

  /* =====================================================================
   *  2. ROYAL APARTMENTS  (keep, top floor)
   * ===================================================================== */
  Castle.add('royal', {
    name: 'Royal Apartments', blurb: 'The top of the keep: the long gallery, the king\'s and queen\'s chambers, bath, solar and nursery.', interior: true, bounds: [0, 0, 26.6, 22.8, 4.2], spawn: [23, 15, 0],
    build(a) {
      const X0 = 1, Y0 = 1, X1 = 25, Y1 = 21, H = 3.6;
      Kit.floor(X0, Y0, 4, Y1, chk, 0); Kit.floor(4, Y0, 13, 10, walnut, 0); Kit.floor(13, Y0, 21, 10, oak, 0); Kit.floor(21, Y0, X1, 5.5, marble, 0); Kit.floor(21, 5.5, X1, 10, pine, 0);
      Kit.floor(4, 10, 15, Y1, oak, 0); Kit.floor(15, 10, 21, Y1, pine, 0); Kit.floor(21, 10, X1, Y1, flags, 0);
      shell(X0, Y0, X1, Y1, H, { seed: 90, tint: 0xb0a694, fx: [awin(8), awin(12), awin(16), awin(20)], fy: [awin(23.6, { y: 64, w: 16, h: 40 })] });
      Kit.part('y', 4, Y0, Y1, 0, { gaps: [[5.4, 6.8], [14.5, 15.9]] }); Kit.part('x', 10, 4, X1, 0, { gaps: [[8, 9.4], [17, 18.4], [22.3, 23.7]], seed: 24 });
      Kit.part('y', 13, Y0, 10, 0, { gaps: [[6, 7.4]], seed: 25 }); Kit.part('y', 21, Y0, 10, 0, { gaps: [[3, 4.4], [7, 8.4]], seed: 26 }); Kit.part('x', 5.5, 21, X1, 0, { seed: 27 });
      Kit.part('y', 15, 10, Y1, 0, { gaps: [[18, 19.4]], seed: 28 }); Kit.part('y', 21, 10, Y1, 0, { gaps: [[12.5, 13.9]], seed: 29 });
      // ---- long gallery: stair to the roof, paintings, suits of armour ----
      const L = flight(1.3, 2.5, 1.6, 3.2, '-y', 1.9, chk, 1.5);
      Kit.portal(L[0], L[1], 1.9, { to: 'inner', at: 'roof', name: 'roofstair', label: 'Up to the battlements', ex: 2.1, ey: 3.0 });
      F('runner', 1.7, 6.2, 0, { len: 14.4, w: 1.3, c: 0x2c4078, c2: GOLD, c3: 0x1a2040 });
      [10, 14, 18].forEach((y, i) => F('painting', X0, y, 0, { face: 'x', h: 1.5, seed: i, kind: i === 1 ? 'landscape' : 'portrait', w: i === 1 ? 1.2 : 0.8, hh: i === 1 ? 0.9 : 1.0 }));
      F('painting', X0, 6.2, 0, { face: 'x', h: 1.5, kind: 'ship', hh: 0.9 }); [8, 12, 16].forEach((y, i) => F('armour', 3.45, y, 0, { face: '-x', plume: [0xc8372f, 0x4a70c0, 0xd9a83a][i], weapon: i === 1 ? 'sword' : 'halberd' }));
      F('vase', 1.5, 20.4, 0, { stand: true }); F('plant', 3.4, 20.3, 0, { kind: 'fern', pot: 0x4a6a8a }); F('chandelier', 2.5, 13, 0, { h: 2.7, drop: 0.9, r: 0.5, n: 6, gold: true }); torchesX(X0, [22 - 0.5], 0);
      // ---- king's bedchamber ----
      F('fireplace', 5.7, Y0, 0, { w: 1.9, h: 3.4, seed: 1 }); F('royalBed', 8.2, 1.15, 0); F('wardrobe', 10.6, 1.1, 0, { w: 1.1 }); F('banner', 12.2, Y0, 0, { h: 3.3, len: 1.9 });
      F('chest', 8.65, 3.3, 0); F('rug', 6.2, 4.2, 0, { w: 4.6, d: 3, c: 0x7a1c22 }); F('desk', 4.5, 7.2, 0, { face: 'x' }); F('armourStand', 12.3, 9.2, 0, { plume: 0xc8372f }); F('candelabra', 7.6, 1.6, 0);
      F('chair', 10.8, 5.2, 0, { cushion: RED, face: '-x' }); F('roundTable', 10, 5.4, 0, { r: 0.4, food: true, seed: 7 }); F('chandelier', 8.5, 6.2, 0, { h: 2.7, drop: 0.9, r: 0.6, gold: true }); F('crossedSwords', 7.4, Y0, 0, { h: 2.6 });
      // ---- queen's chamber ----
      F('nobleBed', 15.2, 1.15, 0, { c: 0x6a3a8a }); F('tapestry', 15.8, Y0, 0, { w: 2.2, hh: 1.2, h: 2.0, scene: 'unicorn', c: 0x3a5a3a }); F('wardrobe', 13.3, 1.1, 0, { c: 0x8a6444 }); F('dressingTable', 17.4, 1.1, 0);
      F('bookcase', 19.2, 1.1, 0, { w: 1.4, seed: 2 }); F('rug', 14.6, 3.6, 0, { w: 4.4, d: 2.8, c: 0x4a2a6a, c2: 0xe8c8d8, c3: 0x2a1a40 }); F('chest', 15.5, 2.95, 0, { c: 0x8a5a44 }); F('screen', 13.4, 8.2, 0, { len: 1.8, c: 0x7a2a3a });
      F('loom', 18.6, 6.6, 0, { face: '-x' }); F('vase', 20.4, 9.3, 0, { stand: true, c: 0x8a2a3a, seed: 3 }); F('chair', 16.4, 7.4, 0, { cushion: PURPLE }); F('candelabra', 14.8, 1.6, 0); F('chandelier', 17, 5.8, 0, { h: 2.7, drop: 0.9, r: 0.6, gold: true });
      // ---- royal bath and dressing room ----
      dais(22, 1.8, 24.8, 4.6, 0.2, marble); F('bathTub', 23.4, 3.2, 0.2); F('washstand', 21.25, 1.1, 0); F('screen', 21.3, 4.7, 0, { len: 1.2, c: 0x2f5a5a }); F('sconce', 22.4, Y0, 0, { h: 1.7 }); F('stool', 24.5, 5.0, 0); F('plant', 24.5, 1.4, 0, { kind: 'fern' });
      F('wardrobe', 21.3, 5.7, 0, { w: 1.1 }); F('wardrobe', 22.6, 5.7, 0, { w: 1.1, c: 0x8a6444 }); F('dressingTable', 23.9, 5.7, 0, { c: 0x6a4a34 }); F('chest', 24.2, 8.9, 0, { open: true, gold: false }); F('rug', 21.8, 7.3, 0, { w: 2.2, d: 1.6, pat: 'diamond', c: 0x2f5a5a, c2: CREAM, c3: 0x1a3030 }); F('candelabra', 21.5, 9.4, 0, { n: 3 });
      // ---- solar ----
      F('bookcase', 4.3, 10.2, 0, { w: 1.5, seed: 4 }); F('bookcase', 5.9, 10.2, 0, { w: 1.5, seed: 5 }); F('rug', 6, 12.6, 0, { w: 6, d: 4.4, c: 0x2c4078, c2: 0xe8dcc0, c3: 0x1a2040 });
      F('roundTable', 9, 14.8, 0, { r: 0.7, cloth: CREAM, food: true, stools: 0 }); F('bench', 8.1, 12.9, 0, { len: 1.8, back: true }); F('bench', 8.1, 16.1, 0, { len: 1.8, back: true, face: '-y' }); F('chair', 10.6, 14.6, 0, { cushion: BLUE, face: '-x' }); F('chair', 7.0, 14.6, 0, { cushion: BLUE, face: 'x' });
      F('harp', 13.2, 12.2, 0); F('gameTable', 12.6, 15.2, 0); F('globe', 4.8, 13, 0); F('chandelier', 9.2, 14.8, 0, { h: 2.7, drop: 0.9, r: 0.7, n: 8, gold: true });
      dais(5.4, 18.8, 13.6, Y1, 0.2, marble); for (const x of [5.9, 13.1]) F('topiary', x, 20.3, 0.2, { kind: 'ball' }); F('stoneBench', 7, 19.6, 0.2, { len: 1.6, face: '-y' }); F('telescope', 11.6, 20.0, 0.2); F('vase', 9.5, 20.4, 0.2, { c: 0x3a5aa0 }); F('plant', 4.5, 20.3, 0, { kind: 'flowers' });
      // ---- nursery ----
      F('wardrobe', 15.3, 10.2, 0, { c: 0x9a7448 }); F('shelves', 19.5, 10.2, 0, { w: 1.2, seed: 8, h: 1.2 }); F('cradle', 16.2, 13.2, 0); F('cot', 19.9, 14.2, 0, { face: '-x', c: 0x9ab0d0, s: 0.85 }); F('cot', 19.9, 15.6, 0, { face: '-x', c: 0xe8a0b0, s: 0.85 });
      F('rug', 16, 15.8, 0, { w: 3, d: 2.6, pat: 'stripe', c: 0xd9a83a, c2: 0x4a70c0, face: 'y' }); F('quoits', 17.4, 17, 0, { range: 1.4 }); F('roundTable', 16.6, 19.6, 0, { r: 0.42, stools: 3, kind: 'play' }); F('chest', 19.9, 19.9, 0, { c: 0x4a6a8a }); F('candelabra', 20.4, 12.6, 0, { n: 3 });
      // ---- stair lobby ----
      Kit.stairwell(22.2, 17.6, 1.6, 2.3, 0, '+y'); Kit.portal(23, 19.1, 0, { to: 'throne', at: 'up', name: 'down', label: 'Down to the throne room', ex: 23, ey: 16.4 });
      F('brazier', 24.3, 11, 0); F('armour', 21.6, 15.4, 0, { face: 'x' }); F('bench', 24.4, 13, 0, { face: '-x', len: 1.6 }); F('rug', 22.2, 12.2, 0, { w: 1.7, d: 3.6, pat: 'diamond', face: 'y' }); F('plant', 24.4, 20.3, 0, { kind: 'tree' });
      // ---- people ----
      P('guard', 'Chamber guard', null, [21.8, 17.2, 0], { fixed: [0.3, -1] }); P('guard', 'Chamber guard', null, [2.5, 6.4, 0], { fixed: [0, 1] }); P('guard', 'Chamber guard', null, [5, 5.2, 0], { fixed: [-1, 0.2] });
      P('noble', 'Lady-in-waiting', ['sit', 'read', 'work', 'play'], [16, 6, 0], { fem: true }); P('noble', 'Lady-in-waiting', ['sit', 'read', 'play'], [10, 13, 0], { fem: true, top: 0x2a6a5a }); P('noble', 'The Prince', ['play', 'read', 'sit'], [17, 17, 0], { fem: false, top: 0x8a2a3a });
      P('villager', 'Royal nurse', ['work', 'play'], [17.5, 13.4, 0], { fem: true, apron: true }); P('villager', 'Chambermaid', ['work', 'bathe'], [22.5, 8, 0], { fem: true, apron: true }); P('villager', 'Chambermaid', ['work', 'bathe', 'sleep'], [9, 8, 0], { fem: true, apron: true });
      P('villager', 'Valet', ['work', 'read'], [6, 8, 0], { fem: false, top: 0x3a3a4a, hat: 0 }); P('villager', 'Page', ['sit', 'play', 'work'], [23, 13, 0], { fem: false, top: 0x34508f });
    },
  });

  /* =====================================================================
   *  3. UNDERCROFT: prison, guard room, wine cellar, treasury, cistern, crypt
   * ===================================================================== */
  const GLOOM = { day: { amb: [0.2, 0.2, 0.29], sun: [0, 0, 0], lamp: 0.95, bg: [7, 6, 10] }, dusk: { amb: [0.19, 0.18, 0.27], sun: [0, 0, 0], lamp: 1.0, bg: [7, 6, 10] }, night: { amb: [0.16, 0.16, 0.27], sun: [0, 0, 0], lamp: 1.1, bg: [6, 6, 10] } };
  Castle.add('undercroft', {
    name: 'Undercroft', blurb: 'Beneath the keep: the prison, the guard room, the wine cellar, the treasury, the cistern and the crypt.', interior: true, light: GLOOM, bounds: [0, 0, 26.6, 24.8, 3.7], spawn: [14.5, 5, 0],
    build(a) {
      const X0 = 1, Y0 = 1, X1 = 25, Y1 = 23, H = 3.1, mossy = Kit.flags(0x66706a), earth = Kit.earth;
      Kit.floor(X0, Y0, 8, 14, dark, 0); Kit.floor(X0, 14, 8, Y1, mossy, 0); Kit.floor(8, Y0, 16, 8, flags, 0); Kit.floor(16, Y0, X1, 9, (x, y) => (h2(Math.floor(x * 3), Math.floor(y * 3)) < 0.5 ? earth(x, y) : dark(x, y)), 0);
      Kit.floor(16, 9, X1, 16, slate, 0); Kit.floor(8, 8, 16, 16, mossy, 0); Kit.floor(8, 16, X1, Y1, dark, 0);
      shell(X0, Y0, X1, Y1, H, { seed: 100, tint: 0x7e7a80, band: 0, light: false });
      Kit.part('y', 8, Y0, Y1, 0, { gaps: [[5.4, 6.8], [17.6, 19]], tint: 0x77737a }); Kit.part('x', 14, X0, 8, 0, { gaps: [[6.2, 7.6]], tint: 0x77737a, seed: 24 });
      Kit.part('x', 8, 8, 16, 0, { gaps: [[11.3, 12.7]], tint: 0x77737a, seed: 25 }); Kit.part('y', 16, Y0, 9, 0, { gaps: [[4, 5.4]], tint: 0x77737a, seed: 26 }); Kit.part('x', 9, 16, X1, 0, { tint: 0x77737a, seed: 27 });
      Kit.part('x', 16, 8, X1, 0, { gaps: [[11.3, 12.7]], tint: 0x77737a, seed: 28 });
      // ---- prison: four cells along the back wall, a corridor in front ----
      for (let i = 0; i < 4; i++) { const y = 1 + i * 3.2;
        F('cellFront', 5.4, y + 0.05, 0, { face: 'x', len: 3.1, door: 1.7, dw: 0.9, open: i === 2, h: 2.2 }); if (i) Kit.part('x', y, X0, 5.4, 0, { h: 1.5, tint: 0x6e6a72, seed: 30 + i });
        F('pallet', i & 1 ? 1.2 : 3.8, y + 0.5, 0, { face: i & 1 ? 'y' : 'y', kind: 'pris' }); F('shackles', X0, y + 2.3, 0, { face: 'x' }); if (i % 2 === 0) F('ratHole', X0, y + 0.8, 0, { face: 'x' }); }
      F('skeleton', 1.6, 8, 0, { face: 'x' }); torchesX(X0, [1.5 + 1.2, 7.6 + 1.6], 2.2); F('brazier', 7.2, 2, 0); F('brazier', 7.2, 12.8, 0); F('keyRack', X0, 13.3, 0, { face: 'x', h: 1.5 });
      P('villager', 'Prisoner', null, [1.5, 3.3, 0], { fixed: [1, 0.2], top: 0x7a7468, hat: 0, fem: false }); P('villager', 'Poacher', null, [4.1, 5.1, 0.08], { fixed: [1, 0.6], sit: 0.08, top: 0x6a6a5a, hat: 0, fem: false }); P('villager', 'Cutpurse', null, [1.5, 12.9, 0], { fixed: [1, -0.2], top: 0x8a7a60, hat: 0 });
      // ---- interrogation room ----
      F('interroChair', 4, 17.2, 0, { face: 'x' }); F('stocks', 1.5, 20.8, 0); F('brazier', 6.2, 16.2, 0); F('desk', 5.6, 20.2, 0, { chair: false, face: '-y' }); F('shackles', X0, 16, 0, { face: 'x' }); F('waterBarrel', 1.7, 14.8, 0); F('torch', X0, 19, 0, { face: 'x', h: 2 }); F('stool', 6.4, 18.4, 0);
      // ---- guard room, with the stair up to the hall ----
      const L = flight(13.6, 2.4, 1.5, 3.0, '-y', 1.7, flags, 1.4);
      Kit.portal(L[0], L[1], 1.7, { to: 'hall', at: 'cellar', name: 'up', label: 'Up to the great hall', ex: 14.3, ey: 2.8 });
      F('weaponRack', 8.3, 1.1, 0, { w: 1.3 }); F('keyRack', 10.4, Y0, 0, { h: 1.5 }); F('shieldWall', 9, Y0, 0, { h: 2.4, n: 2 }); torchesY(Y0, [11.6], 2.0); F('roundTable', 10.6, 4.8, 0, { r: 0.55, stools: 3, kind: 'sit', food: true, seed: 5 });
      F('brazier', 12.6, 7, 0); F('cask', 8.3, 6.4, 0, { face: 'x', s: 0.7 }); F('bench', 12.2, 1.2, 0, { len: 1.3 }); F('armourStand', 15.4, 7.2, 0);
      // ---- wine cellar ----
      for (let i = 0; i < 5; i++) F('cask', 16.6 + i * 1.15, 1.15, 0, { c: i % 2 ? 0x7a4a34 : 0x8a5a3a }); F('wineRack', 22.6, 1.1, 0, { w: 2.2, h: 1.6 }); torchesY(Y0, [22.3], 2.3);
      F('wineRack', 16.3, 6.2, 0, { face: 'x', w: 1.6 }); F('stack', 22.6, 6.8, 0, { kind: 'barrels' }); F('stack', 19.6, 7, 0, { kind: 'crates' }); F('hangRack', 19, 4.4, 0, { len: 2.4, h: 1.5, seed: 4 }); F('candelabra', 24.2, 4.6, 0, { iron: true, n: 3 }); F('roundTable', 21.6, 4.4, 0, { r: 0.4 });
      // ---- cistern hall ----
      dais(9.6, 9.6, 14.4, 14.4, 0.2, mossy, 0x7a8078); F('well', 12, 12, 0.2, { r: 0.9, h: 0.5, c: 0x8a9088 }); for (const p of [[8.9, 8.9], [15.1, 8.9], [8.9, 15.1], [15.1, 15.1]]) F('column', p[0], p[1], 0, { h: 2.9, r: 0.24, c: 0x9a968e });
      F('brazier', 9, 12, 0); F('waterBarrel', 15.3, 10.2, 0);
      // ---- treasury behind its own bars ----
      F('cellFront', 15.93, 9.15, 0, { face: 'x', len: 6.75, door: 3.4, dw: 1.5, open: true, h: 2.4 });
      F('treasure', 21.6, 11.6, 0, { r: 1.0, seed: 4 }); F('treasure', 23.6, 14.4, 0, { r: 0.6, seed: 2 }); F('treasure', 18.6, 14.8, 0, { r: 0.55 }); F('chest', 17.2, 9.3, 0, { open: true }); F('chest', 18.2, 9.3, 0); F('chest', 19.2, 9.3, 0, { open: true });
      F('statue', 24.2, 9.9, 0, { kind: 'king', gilt: true }); F('armour', 16.8, 15.2, 0, { face: 'x', plume: 0xd9a83a }); F('candelabra', 20.6, 14.6, 0); F('candelabra', 24.3, 12, 0, { n: 3 }); F('shelves', 20.4, 9.2, 0, { w: 1.4, seed: 3, h: 1.2 });
      // ---- crypt ----
      for (let i = 0; i < 4; i++) F('sarcophagus', 13.6 + i * 2.5, 17.4, 0, { c: i % 2 ? 0x9a9aa2 : 0xb0a89a, effigy: i !== 3 }); F('sarcophagus', 9, 20.6, 0, { face: 'x', c: 0xa8a8b0 });
      F('altar', 21.6, 21.2, 0, { face: '-y', c: 0x5a3a6a }); F('statue', 24.2, 17, 0, { kind: 'angel', c: 0xc8c4bc }); for (const x of [13, 18, 23.6]) F('candelabra', x, 22.4, 0, { iron: true, n: 3 }); F('brazier', 8.8, 17, 0); F('skeleton', 24.4, 22.2, 0, { face: '-x', chain: false });
      // ---- people ----
      P('guard', 'Gaoler', ['guard', 'sit'], [6.6, 6, 0]); P('guard', 'Turnkey', ['guard'], [6.6, 10, 0]); P('guard', 'Cellar guard', ['guard', 'sit', 'drink'], [10, 6.5, 0]); P('guard', 'Vault guard', null, [15.2, 13.6, 0], { fixed: [-1, 0.3] });
      P('villager', 'Cellarer', ['drink', 'work'], [20, 5.6, 0], { apron: true, fem: false }); P('noble', 'Treasurer', ['work'], [19, 12, 0], { fem: false, top: 0x2a4a7a }); P('monk', 'Crypt keeper', ['pray'], [18, 21, 0]); P('villager', 'Questioner', ['work', 'sit'], [5.5, 18.6, 0], { top: 0x3a3038, hat: 0, fem: false });
    },
  });

  /* =====================================================================
   *  4. BARRACKS
   * ===================================================================== */
  Castle.add('barracks', {
    name: 'Barracks', blurb: 'Dormitory, armoury, the captain\'s office, the guards\' mess and the training hall.', interior: true, bounds: [0, 0, 26.6, 22.8, 4.0], spawn: [14, 19, 0],
    build(a) {
      const X0 = 1, Y0 = 1, X1 = 25, Y1 = 21, H = 3.4, sand = (x, y) => mul(0xc8b088, 0.9 + T.fbm(x * 0.7, y * 0.7) * 0.2 - (h2(Math.floor(x * 32), Math.floor(y * 32)) < 0.05 ? 0.1 : 0));
      Kit.floor(X0, Y0, 10, 11, pine, 0); Kit.floor(10, Y0, 18, 8, flags, 0); Kit.floor(18, Y0, X1, 8, walnut, 0); Kit.floor(X0, 11, 10, Y1, oak, 0); Kit.floor(10, 8, X1, Y1, (x, y) => (x > 10.6 && y > 8.6 && x < 22 && y < 20.4 ? sand(x, y) : flags(x, y)), 0);
      shell(X0, Y0, X1, Y1, H, { seed: 110, gapsY: [[13.2, 14.8]], fx: [awin(3), awin(6.2), awin(9.4), awin(18.6)], fy: [awin(20, { y: 60, w: 16, h: 40 })] });
      exit('y', 14, Y1, flags, { to: 'ward', at: 'barracks', name: 'door', label: 'Out to the outer ward' });
      Kit.part('x', 11, X0, 10, 0, { gaps: [[6.5, 7.9]] }); Kit.part('y', 10, Y0, Y1, 0, { gaps: [[5, 6.4], [15, 16.4]], seed: 24 }); Kit.part('x', 8, 10, X1, 0, { gaps: [[13, 14.4], [20.6, 22]], seed: 25 }); Kit.part('y', 18, Y0, 8, 0, { seed: 26 });
      // ---- dormitory ----
      for (let i = 0; i < 5; i++) { F('bunk', 2.0 + i * 1.5, 1.15, 0, { c: i % 2 ? 0x6a3a34 : 0x3a4a6a }); F('chest', 2.0 + i * 1.5, 2.9, 0, { s: 0.8 }); }
      for (let i = 0; i < 2; i++) F('bunk', 1.15, 5.6 + i * 2.4, 0, { face: 'x' }); F('rug', 3.4, 5.4, 0, { w: 4.6, d: 3, pat: 'stripe', c: 0x6a3a34, face: 'y' }); F('brazier', 8.8, 9.8, 0); F('washstand', 9.3, 1.15, 0, { s: 0.9 }); F('stool', 6.5, 9.4, 0); F('stool', 5.2, 9.9, 0);
      F('banner', 9, Y0, 0, { h: 3.2, len: 1.5, dev: 'tower', c: BLUE }); torchesX(X0, [4.6, 10.2], 2.1);
      // ---- armoury ----
      F('weaponRack', 10.4, 1.1, 0, { w: 1.6 }); F('weaponRack', 12.2, 1.1, 0, { w: 1.6, kind: 'spears', seed: 3 }); F('weaponRack', 14, 1.1, 0, { w: 1.6, kind: 'swords', seed: 5 }); F('shieldWall', 16.6, Y0, 0, { n: 4, h: 2.3 }); F('shieldWall', 12.6, Y0, 0, { n: 5, h: 2.6, seed: 2, spears: false });
      for (let i = 0; i < 3; i++) F('armourStand', 11 + i * 1.3, 4.2, 0, { plume: i === 1 ? 0xc8372f : undefined }); F('armour', 17.2, 3.2, 0, { face: '-x' }); F('grindstone', 15.4, 6.2, 0); F('chest', 16.6, 1.2, 0); F('stack', 10.4, 6.2, 0, { kind: 'crates' }); F('candelabra', 17.4, 7.2, 0, { iron: true });
      // ---- captain's office ----
      F('fireplace', 20, Y0, 0, { w: 1.7, h: 3.2, seed: 3 }); F('bookcase', 22.2, 1.1, 0, { w: 1.2, seed: 6 }); F('cot', 24, 1.15, 0, { c: 0x34508f }); F('desk', 20.4, 4, 0); F('mapTable', 22.4, 5.6, 0, { s: 0.75 }); F('chest', 18.3, 6.9, 0, { face: 'x' }); F('banner', 23.6, Y0, 0, { h: 3.2, len: 1.5 });
      F('rug', 19.6, 3.4, 0, { w: 2.8, d: 2, pat: 'diamond' }); F('armourStand', 18.6, 1.6, 0, { plume: 0xd9a83a });
      // ---- guards' mess ----
      F('fireplace', X0, 16.2, 0, { face: 'x', w: 2, h: 3.2, seed: 4 }); F('dartBoard', X0, 12.6, 0, { face: 'x', range: 2 }); F('barCounter', 5.6, 12.4, 0, { len: 3 }); F('cask', 8.3, 11.2, 0, { s: 0.75 }); F('shelves', 5.6, 11.15, 0, { w: 1.4, h: 1.0, seed: 7 });
      F('roundTable', 4.4, 16.4, 0, { r: 0.6, stools: 4, food: true, seed: 3 }); F('roundTable', 7.6, 18.6, 0, { r: 0.6, stools: 4, food: true, seed: 6, kind: 'drink' }); F('gameTable', 2.4, 18.8, 0, { game: 'dice', face: 'x' }); F('chandelier', 5.6, 16.6, 0, { h: 2.7, drop: 0.7, r: 0.6 }); F('stagHead', X0, 19.4, 0, { face: 'x', h: 2.3 });
      // ---- training hall, with a raised step for onlookers ----
      F('sparRing', 11.6, 9.4, 0, { w: 3.6, d: 3.6 }); for (let i = 0; i < 3; i++) F('dummy', 17.2 + i * 1.5, 9.4, 0); F('archeryButt', 10.5, 15.6, 0, { face: 'x', range: 7.5 }); F('archeryButt', 10.5, 17.2, 0, { face: 'x', range: 7.5 });
      F('weights', 16.6, 12.4, 0); F('hayBale', 10.6, 18.9, 0, { n: 2 }); F('weaponRack', 18.4, 8.2, 0, { w: 1.5, kind: 'swords', shields: false, seed: 9 });
      dais(22.4, 9, X1, 20.6, 0.2, oak, 0x8a6a4a); F('bench', 24.4, 10, 0.2, { face: '-x', len: 2.4, back: true }); F('bench', 24.4, 13.4, 0.2, { face: '-x', len: 2.4, back: true }); F('brazier', 24.2, 17.4, 0.2); F('waterBarrel', 24.3, 19.6, 0.2); F('chandelier', 17, 14, 0, { h: 2.8, drop: 0.6, r: 0.8, n: 10 }); F('chandelier', 13, 17.6, 0, { h: 2.8, drop: 0.6, r: 0.6 });
      // ---- people ----
      P('guard', 'The Captain', ['work', 'read', 'sit'], [21, 5.6, 0]); P('villager', 'Armourer', ['work'], [14, 5, 0], { apron: true, fem: false }); P('villager', 'Mess keeper', ['work', 'drink'], [7, 11.8, 0], { apron: true });
      for (let i = 0; i < 4; i++) P('guard', 'Guard in training', ['train'], [15 + i, 13 + (i & 1), 0]); for (let i = 0; i < 4; i++) P('guard', 'Off-duty guard', ['drink', 'eat', 'play', 'sleep', 'sit'], [4 + i, 15, 0]);
      P('guard', 'Sergeant', ['guard', 'sit', 'train'], [20, 16, 0]); P('guard', 'Door guard', null, [12.6, 20.2, 0], { fixed: [0.3, 1] });
    },
  });

  /* =====================================================================
   *  5. STAFF QUARTERS
   * ===================================================================== */
  Castle.add('staff', {
    name: 'Staff Quarters', blurb: 'Where the household lives and works: dormitories, the steward and housekeeper, laundry, sewing room and common room.', interior: true, bounds: [0, 0, 27.4, 20.8, 3.9], spawn: [22, 9.2, 0],
    build(a) {
      const X0 = 1, Y0 = 1, X1 = 25, Y1 = 19, H = 3.3;
      Kit.floor(X0, Y0, 14, 8, pine, 0); Kit.floor(14, Y0, 19, 8, oak, 0); Kit.floor(19, Y0, X1, 8, walnut, 0); Kit.floor(X0, 8, X1, 10.4, flags, 0);
      Kit.floor(X0, 10.4, 9, Y1, slate, 0); Kit.floor(9, 10.4, 16, Y1, pine, 0); Kit.floor(16, 10.4, X1, Y1, oak, 0);
      shell(X0, Y0, X1, Y1, H, { seed: 120, tint: 0xa89e8c, gapsX: [[8.4, 10]], fx: [awin(3.4), awin(6.4), awin(12.6), awin(15.4), awin(17.8)], fy: [awin(4.5, { y: 64, w: 14, h: 36 }), awin(11, { y: 64, w: 14, h: 36 })] });
      exit('x', 9.2, X1, flags, { to: 'inner', at: 'staff', name: 'door', label: 'Out to the inner ward' });
      Kit.part('x', 8, X0, X1, 0, { gaps: [[4, 5.4], [10.5, 11.9], [16, 17.4], [21.5, 22.9]] }); Kit.part('x', 10.4, X0, X1, 0, { gaps: [[4.5, 5.9], [12, 13.4], [19.5, 20.9]], seed: 24 });
      Kit.part('y', 8, Y0, 8, 0, { seed: 25 }); Kit.part('y', 14, Y0, 8, 0, { seed: 26 }); Kit.part('y', 19, Y0, 8, 0, { seed: 27 }); Kit.part('y', 9, 10.4, Y1, 0, { seed: 28 }); Kit.part('y', 16, 10.4, Y1, 0, { seed: 29 });
      // ---- corridor ----
      F('runner', 1.4, 8.6, 0, { face: 'x', len: 23.2, w: 1.2, c: 0x3f5a46, c2: 0xd9c070, c3: 0x1e3024 }); torchesX(X0, [9.2], 2); for (const x of [8, 14, 19]) F('candelabra', x + 0.5, 10.05, 0, { iron: true, n: 3, s: 0.9 });
      // ---- women's and men's dormitories ----
      for (let i = 0; i < 4; i++) { F('cot', 1.8 + i * 1.5, 1.15, 0, { c: [0x8a8272, 0x9a6a6a, 0x6a7a8a, 0x8a8272][i] }); F('chest', 1.8 + i * 1.5, 2.8, 0, { s: 0.7 }); } F('washstand', 7.3, 1.15, 0); F('rug', 2.6, 4.6, 0, { w: 3.6, d: 2, pat: 'stripe', c: 0x8a5a6a, face: 'y' }); F('wardrobe', 1.15, 5.6, 0, { face: 'x' });
      for (let i = 0; i < 3; i++) { F('cot', 8.5 + i * 1.6, 1.15, 0, { c: 0x6a6a5a }); F('chest', 8.5 + i * 1.6, 2.8, 0, { s: 0.7 }); } F('bunk', 13.1, 4.4, 0, { face: '-x' }); F('rug', 9, 4.6, 0, { w: 3, d: 2, pat: 'stripe', c: 0x4a5a7a, face: 'y' }); F('stool', 12.6, 7.2, 0); F('washstand', 13.3, 1.15, 0);
      // ---- housekeeper's room ----
      F('nobleBed', 14.4, 1.15, 0, { c: 0x6a8a5a, s: 0.85 }); F('wardrobe', 16.4, 1.1, 0, { w: 1.0, c: 0x8a6444 }); F('keyRack', 18.2, Y0, 0, { h: 1.5 }); F('desk', 17.7, 4.2, 0, { face: '-x', s: 0.9 }); F('chest', 14.3, 6.9, 0, { face: 'x' }); F('rug', 14.8, 3.6, 0, { w: 2.4, d: 1.8, pat: 'diamond', c: 0x3f5a46, c2: CREAM, c3: 0x1e3024 }); F('candelabra', 18.4, 1.7, 0, { n: 3 });
      // ---- steward's office ----
      F('fireplace', 20.6, Y0, 0, { w: 1.7, h: 3.1, seed: 5 }); F('bookcase', 22.2, 1.1, 0, { w: 1.3, seed: 8 }); F('shelves', 23.6, 1.1, 0, { w: 1.2, seed: 2 }); F('desk', 21.4, 4, 0); F('chest', 19.3, 6.9, 0, { face: 'x', open: true }); F('scrollRack', 19.3, 2.6, 0, { face: 'x', w: 1.2 });
      F('rug', 20.8, 3.4, 0, { w: 2.6, d: 2.2 }); F('chair', 24.2, 5.6, 0, { face: '-x', cushion: GREEN }); F('globe', 24.3, 7.2, 0, { s: 0.9 });
      // ---- laundry ----
      F('laundry', 1.6, 11, 0, { len: 3.4 }); F('laundry', 4.2, 15.2, 0, { len: 3, seed: 2 }); F('cauldron', 7.6, 11.6, 0); F('waterBarrel', 1.7, 14.4, 0); F('waterBarrel', 1.7, 15.2, 0); F('stack', 1.3, 17.6, 0, { kind: 'sacks', s: 0.8 }); F('bathTub', 7.6, 14.2, 0, { steam: true, s: 0.8 });
      F('shelves', 5.2, 10.55, 0, { w: 1.3, h: 1.0, seed: 4 }); torchesX(X0, [13.9], 2);
      // ---- sewing and weaving room ----
      F('loom', 9.4, 10.6, 0); F('loom', 11, 10.6, 0, { c: 0x2c4078 }); F('spinningWheel', 14.6, 11.4, 0, { face: '-x' }); F('spinningWheel', 14.6, 12.8, 0, { face: '-x' }); F('breadTable', 11.2, 14.4, 0, { c: 0 }); F('shelves', 13.4, 10.55, 0, { w: 1.1, h: 1.0, seed: 6 });
      F('chest', 9.3, 17.9, 0, { open: true, gold: false }); F('stool', 12, 15.6, 0, { kind: 'work', look: [0, -1] }); F('rug', 10, 15.4, 0, { w: 4, d: 2.4, pat: 'diamond', c: 0x7a4a2a, c2: 0xe8c890 }); F('candelabra', 15.3, 17.8, 0, { n: 3 }); F('chandelier', 12.4, 14, 0, { h: 2.6, drop: 0.7, r: 0.5, n: 6 });
      // ---- common room ----
      dais(21.4, 10.6, 24.9, 13.6, 0.2, flags, 0x9a948a); F('cauldron', 23.2, 12, 0.2); F('bench', 21.6, 14, 0, { len: 2.6, face: '-y', back: true });
      F('feastTable', 17, 14.2, 0, { len: 3.6, food: true, seed: 5, c: 0x7a5a3c }); F('shelves', 16.3, 10.55, 0, { w: 1.4, seed: 9 }); F('dishShelf', 17.9, 10.55, 0); F('gameTable', 23.6, 16.4, 0, { game: 'dice' }); F('waterBarrel', 16.6, 18.2, 0); F('lute', 21, 18.2, 0); F('chandelier', 19.6, 14.6, 0, { h: 2.6, drop: 0.7, r: 0.6 });
      // ---- people ----
      P('noble', 'The Steward\'s clerk', ['work', 'read'], [22, 5.6, 0], { fem: false }); P('villager', 'Housekeeper', ['work', 'sit'], [16.5, 5, 0], { fem: true, apron: true, top: 0x3a3a4a });
      for (let i = 0; i < 2; i++) P('villager', 'Laundress', ['work', 'cook', 'drink'], [4 + i, 13.6, 0], { fem: true, apron: true }); for (let i = 0; i < 2; i++) P('villager', i ? 'Weaver' : 'Seamstress', ['work'], [11 + i, 13.4, 0], { fem: true });
      for (let i = 0; i < 4; i++) P('villager', ['Footman', 'Maid', 'Groom', 'Kitchen boy'][i], ['eat', 'sit', 'play', 'drink', 'sleep'], [18 + i, 9.2, 0], { fem: i === 1 }); P('villager', 'Page', ['sit', 'play', 'sleep'], [10, 9.2, 0]);
    },
  });

  /* =====================================================================
   *  6. BATH HOUSE, GAMES HALL, TAP ROOM, MUSIC ROOM
   * ===================================================================== */
  Castle.add('rec', {
    name: 'Bath House & Games Hall', blurb: 'For the court\'s leisure: the baths, the games hall, the tap room and the music room.', interior: true, bounds: [0, 0, 26.6, 22.8, 4.0], spawn: [13, 19, 0],
    build(a) {
      const X0 = 1, Y0 = 1, X1 = 25, Y1 = 21, H = 3.4, pale = Kit.tiles(18, 0xcfd6d2, 0xa8c0c0);
      Kit.floor(X0, Y0, 12, 11, pale, 0); Kit.floor(12, Y0, 14, Y1, chk, 0); Kit.floor(14, Y0, X1, 11, oak, 0); Kit.floor(X0, 11, 12, Y1, walnut, 0); Kit.floor(14, 11, X1, Y1, pine, 0);
      shell(X0, Y0, X1, Y1, H, { seed: 130, gapsY: [[12.2, 13.8]], fx: [awin(3.2, { y: 70, h: 40 }), awin(8.8, { y: 70, h: 40 }), awin(13.2), awin(19.4)], fy: [awin(13, { y: 60, w: 18, h: 46 })] });
      exit('y', 13, Y1, chk, { to: 'inner', at: 'rec', name: 'door', label: 'Out to the inner ward' });
      Kit.part('y', 12, Y0, Y1, 0, { gaps: [[8.6, 10], [15, 16.4]] }); Kit.part('y', 14, Y0, Y1, 0, { gaps: [[5, 6.4], [15, 16.4]], seed: 24 }); Kit.part('x', 11, X0, 12, 0, { seed: 25 }); Kit.part('x', 11, 14, X1, 0, { seed: 26 });
      // ---- corridor ----
      F('runner', 12.4, 2.2, 0, { len: 18.4, w: 1.2, c: 0x2f5a5a, c2: GOLD, c3: 0x1a3030 }); F('statue', 13, 1.5, 0, { kind: 'maiden', c: 0xd0cabc, s: 0.9 }); F('chandelier', 13, 11, 0, { h: 2.7, drop: 0.7, r: 0.5, n: 6 });
      // ---- bath house: a pool raised two steps, tubs, washstands ----
      dais(1.6, 1.6, 9.4, 8.4, 0.2, pale, 0xb8c4c0);
      for (const r of [[2.2, 2.2, 6.6, 0.9], [2.2, 6.9, 6.6, 0.9], [2.2, 3.1, 0.9, 3.8], [7.9, 3.1, 0.9, 3.8]]) { B.box(r[0], r[1], 0.2, r[2], r[3], 0.2, { side: T.facade, P: STONE(76, { band: 0, tint: 0xc8d0cc }), top: (s, t) => marble(s + r[0], t + r[1]) }); Kit.walk(r[0], r[1], r[0] + r[2], r[1] + r[3], 0.4); }
      E.quad([3.1, 3.1, 0.34], [4.8, 0, 0], [0, 3.8, 0], (s, t) => T.water(s + 3, t + 3), { n: [0, 0, 1], noShadow: true }); B.blocks.push([3.1, 3.1, 4.8, 3.8, 0.2]); E.addLight(5.5, 5, 1.0, 4, [0.5, 0.8, 0.9], 0.5);
      F('statue', 2.7, 2.7, 0.4, { kind: 'urn', ph: 0.3, s: 0.8, c: 0xd0cabc }); F('plant', 8.4, 2.7, 0.4, { kind: 'fern', pot: 0x4a6a8a }); F('brazier', 8.4, 7.4, 0.4, { s: 0.8 }); F('stool', 2.7, 7.4, 0.4);
      F('bathTub', 10.6, 2.4, 0); F('bathTub', 10.6, 4.6, 0); F('screen', 9.9, 6.2, 0, { len: 1.6 }); F('washstand', 9.9, 1.1, 0); F('washstand', 11.2, 1.1, 0); F('bench', 2, 9.4, 0, { len: 2.2, back: true }); F('bench', 5, 9.4, 0, { len: 2.2, back: true });
      F('shelves', 7.8, 9.4, 0, { w: 1.2, h: 1.1, seed: 4 }); F('waterBarrel', 10.2, 10.2, 0); F('sconce', 5.5, Y0, 0, { h: 1.9 }); torchesX(X0, [6], 2.2); F('curtain', 2.6, Y0, 0, { w: 1.6, hh: 2.4, c: 0x2f5a5a, open: false }); F('curtain', 8.4, Y0, 0, { w: 1.6, hh: 2.4, c: 0x2f5a5a, open: false });
      // ---- games hall ----
      F('fireplace', 19.5, Y0, 0, { w: 2, h: 3.2, seed: 6 }); F('dartBoard', 16, Y0, 0, { range: 2.2 }); F('stagHead', 22.8, Y0, 0, { h: 2.4 }); F('cardTable', 17.4, 5.2, 0); F('gameTable', 22.6, 3.4, 0); F('gameTable', 20.4, 6, 0, { game: 'dice', face: 'x' });
      F('skittles', 15.4, 8.9, 0, { face: 'x', len: 5.4 }); F('quoits', 23.6, 8, 0, { range: 1.6 }); F('rug', 15.4, 3, 0, { w: 4.2, d: 4.4, pat: 'diamond', c: 0x2f6a44, c2: 0xe8c890, c3: 0x1a3020 }); F('chandelier', 19.6, 5.6, 0, { h: 2.7, drop: 0.7, r: 0.7 }); F('bench', 24.4, 4, 0, { face: '-x', len: 2, back: true });
      // ---- tap room ----
      F('fireplace', X0, 15.5, 0, { face: 'x', w: 2, h: 3.2, seed: 7 }); for (let i = 0; i < 3; i++) F('cask', 1.4 + i * 1.15, 11.25, 0); F('wineRack', 5, 11.2, 0, { w: 1.3 }); F('barCounter', 6.6, 12.5, 0, { len: 3.4 }); F('shelves', 7.4, 11.15, 0, { w: 1.6, h: 1.0, seed: 11 });
      F('roundTable', 4.6, 15, 0, { r: 0.6, stools: 4, food: true, kind: 'drink', seed: 2 }); F('roundTable', 8.4, 17, 0, { r: 0.6, stools: 4, food: true, seed: 5 }); F('roundTable', 4.4, 18.8, 0, { r: 0.6, stools: 3, food: true, kind: 'drink', seed: 7 });
      F('bench', 10.9, 18, 0, { face: '-x', len: 2.4, back: true }); F('chandelier', 6.4, 16.6, 0, { h: 2.7, drop: 0.7, r: 0.7 }); F('stack', 1.3, 19.8, 0, { kind: 'barrels', s: 0.8 }); F('crossedSwords', X0, 12.6, 0, { face: 'x', h: 2.3, seed: 3 }); F('banner', X0, 18.6, 0, { face: 'x', h: 3.1, len: 1.7, c: GREEN, dev: 'stag' });
      // ---- music room: organ, a little stage, seats for listeners ----
      F('organ', 18.4, 11.2, 0); dais(14.4, 11.3, 18, 14.6, 0.2, oak, 0x8a6a4a); F('harp', 15.4, 12.6, 0.2); F('lute', 17.3, 12, 0.2); F('drum', 16.9, 13.8, 0.2); F('stool', 15.4, 13.9, 0.2, { kind: 'play', look: [0.3, 1] });
      for (let r = 0; r < 3; r++) for (const x of [15.2, 19]) F('bench', x, 15.6 + r * 1.5, 0, { len: 2.6, face: '-y', c: 0x6a4a34 }); F('rug', 14.8, 15.2, 0, { w: 7.4, d: 5, pat: 'plain', c: 0x5a2a3a, c2: GOLD, c3: 0x2a1420 });
      F('candelabra', 21.8, 13.2, 0); F('candelabra', 24.4, 11.8, 0); F('vase', 24.3, 20.2, 0, { stand: true, seed: 4 }); F('plant', 22.6, 20.2, 0, { kind: 'tree' }); F('chandelier', 19.6, 16.8, 0, { h: 2.7, drop: 0.7, r: 0.7, gold: true }); F('screen', 22.4, 15, 0, { face: 'x', len: 1.8, c: 0x34508f });
      // ---- people ----
      for (let i = 0; i < 2; i++) P('villager', 'Bath attendant', ['work', 'bathe'], [10 + i * 0.6, 8 + i, 0], { apron: true }); P('noble', null, ['bathe', 'sit'], [6, 9, 0], { fem: true }); P('noble', null, ['bathe', 'sit', 'drink'], [4, 9, 0], { fem: false });
      P('villager', 'Tapster', ['work'], [8, 12, 0], { apron: true, fem: false }); for (let i = 0; i < 4; i++) P(i % 2 ? 'guard' : 'villager', i % 2 ? 'Off-duty guard' : null, ['drink', 'eat', 'play'], [5 + i, 16, 0]);
      for (let i = 0; i < 3; i++) P('noble', null, ['play', 'sit'], [18 + i, 7, 0], { fem: i === 1 }); P('monk', 'Organist', ['play'], [19.4, 13, 0]); P('villager', 'Minstrel', ['play'], [16, 14, 0.2], { top: 0x8a2a6a, hat: 2 }); for (let i = 0; i < 3; i++) P('noble', 'Listener', ['sit'], [17 + i * 2, 19.6, 0], { fem: i !== 1 });
    },
  });

  /* =====================================================================
   *  7. CHAPEL
   * ===================================================================== */
  Castle.add('chapel', {
    name: 'Chapel', blurb: 'Nave, chancel and altar under stained glass; a vestry, a side chapel with a founder\'s tomb, and the baptistery.', interior: true, bounds: [0, 0, 18.6, 24.8, 5.8], spawn: [6.5, 21, 0],
    build(a) {
      const X0 = 1, Y0 = 1, X1 = 17, Y1 = 23, H = 5.2, g = (x, o) => glass(x, Object.assign({ y: 60, w: 28, h: 120 }, o || {}));
      Kit.floor(X0, Y0, 12, Y1, (x, y) => (x > 5.7 && x < 7.3 ? chk(x, y) : flags(x, y)), 0); Kit.floor(12, Y0, X1, 8, oak, 0); Kit.floor(12, 8, X1, 16, slate, 0); Kit.floor(12, 16, X1, Y1, marble, 0);
      shell(X0, Y0, X1, Y1, H, { seed: 140, tint: 0xb4aa98, gapsY: [[5.7, 7.3]], fx: [g(7.6), g(11.2), g(14.8), g(18.4), g(21.6, { w: 20, h: 100 })], fy: [g(6.5, { y: 84, w: 44, h: 116 }), g(2.6, { w: 20, h: 100 }), g(10.4, { w: 20, h: 100 }), awin(14.6, { y: 70, w: 14, h: 40 })], lightY: true });
      exit('y', 6.5, Y1, flags, { to: 'inner', at: 'chapel', name: 'door', label: 'Out to the inner ward' });
      Kit.part('y', 12, Y0, Y1, 0, { gaps: [[5, 6.4], [11.2, 12.6], [18.6, 20]] }); Kit.part('x', 8, 12, X1, 0, { seed: 24 }); Kit.part('x', 16, 12, X1, 0, { seed: 25 });
      // ---- chancel and altar ----
      dais(X0, Y0, 11.87, 6.4, 0.2, marble); dais(2.6, Y0, 10.4, 5.0, 0.4, marble); Kit.rug(5.5, 3.0, 7.5, 5.0, 0.4); Kit.rug(5.5, 5.0, 7.5, 6.4, 0.2, RED, RED, 0x7a1c22);
      F('altar', 5.75, 1.5, 0.4); F('candelabra', 3.4, 1.7, 0.4); F('candelabra', 9.6, 1.7, 0.4); F('statue', 1.7, 1.7, 0.2, { kind: 'angel', gilt: true, c: 0xd8d2c8 }); F('statue', 11.1, 1.7, 0.2, { kind: 'angel', gilt: true, c: 0xd8d2c8, face: 'x' });
      F('lectern', 9.4, 5.2, 0.2, { face: 'y' }); F('bench', 1.3, 3.6, 0.2, { face: 'x', len: 2.4, back: true, kind: 'pray' }); F('banner', 4, Y0, 0, { h: 4.9, len: 2.2, c: 0xe8e2d4, c2: GOLD, dev: 'cross' }); F('banner', 9, Y0, 0, { h: 4.9, len: 2.2, c: 0xe8e2d4, c2: GOLD, dev: 'cross' });
      // ---- nave ----
      F('runner', 5.9, 6.6, 0, { len: 16, w: 1.2 }); for (let r = 0; r < 6; r++) { F('pew', 2.3, 8.2 + r * 1.9, 0, { len: 3.2, face: '-y' }); F('pew', 7.6, 8.2 + r * 1.9, 0, { len: 3.2, face: '-y' }); }
      for (const y of [7.4, 13.1, 18.8]) F('column', 1.75, y, 0, { h: 5, r: 0.22 });
      F('chandelier', 6.5, 10.5, 0, { h: 3.6, drop: 1.4, r: 0.8, n: 10, gold: true }); F('chandelier', 6.5, 17, 0, { h: 3.6, drop: 1.4, r: 0.8, n: 10, gold: true }); torchesX(X0, [9.4, 16.6], 2); F('candelabra', 4.6, 22.2, 0, { iron: true }); F('candelabra', 8.4, 22.2, 0, { iron: true });
      // ---- vestry ----
      F('wardrobe', 12.3, 1.1, 0, { w: 1.2 }); F('bookcase', 15.6, 1.1, 0, { w: 1.2, seed: 3 }); F('desk', 14.2, 3.6, 0, { face: 'x' }); F('chest', 12.3, 6.9, 0, { face: 'x' }); F('rug', 12.8, 3.4, 0, { w: 2.6, d: 2.4, pat: 'diamond', c: 0x5a3a6a, c2: GOLD, c3: 0x2a1a30 }); F('candelabra', 16.4, 7.2, 0, { n: 3 }); F('sconce', 14.4, Y0, 0, { h: 1.3 });
      // ---- side chapel with the founder's tomb ----
      dais(13.6, 9.6, 16.6, 13.4, 0.2, slate, 0x8a8a94); F('sarcophagus', 14.6, 10.4, 0.2, { c: 0xc0bab0 }); F('statue', 13, 14.6, 0, { kind: 'knight', c: 0xa8a49c }); F('candelabra', 13.9, 9, 0); F('candelabra', 16.3, 9, 0); F('pew', 14, 14.2, 0, { len: 2.4, face: '-y' }); F('vase', 16.4, 15.3, 0, { stand: true, c: 0xf0ece0 });
      // ---- baptistery ----
      dais(13.4, 17.6, 16.4, 20.6, 0.2, marble); F('font', 14.9, 19.1, 0.2); F('candelabra', 12.9, 16.8, 0, { n: 3 }); F('stoneBench', 14, 21.8, 0, { len: 2, face: '-y' }); F('plant', 16.3, 22.2, 0, { kind: 'flowers' }); F('vase', 16.4, 16.8, 0, { stand: true, seed: 2 });
      // ---- people ----
      P('monk', 'The Chaplain', ['pray', 'work', 'read'], [6.5, 6, 0.2]); for (let i = 0; i < 3; i++) P('monk', null, ['pray', 'read'], [3 + i * 3, 7.2, 0]); P('villager', 'Sexton', ['work', 'pray'], [14, 5, 0], { fem: false, top: 0x4a4a52 });
      for (let i = 0; i < 6; i++) P(i % 3 === 0 ? 'noble' : 'villager', i % 3 === 0 ? null : 'Worshipper', ['pray'], [6.5, 9 + i * 2, 0]);
    },
  });

  /* =====================================================================
   *  8. COUNCIL CHAMBER, LIBRARY, SCRIBES' OFFICE, WAR ROOM
   * ===================================================================== */
  Castle.add('council', {
    name: 'Council Chamber & Library', blurb: 'Where the realm is governed: the council table, the library with its gallery, the scribes and the war room.', interior: true, bounds: [0, 0, 28.6, 22.8, 5.0], spawn: [6, 19, 0],
    build(a) {
      const X0 = 1, Y0 = 1, X1 = 27, Y1 = 21, H = 4.4, MZ = 1.8;
      Kit.floor(X0, Y0, 12, 11, chk, 0); Kit.floor(X0, 11, 12, Y1, flags, 0); Kit.floor(12, Y0, X1, 14, walnut, 0); Kit.floor(12, 14, 20, Y1, pine, 0); Kit.floor(20, 14, X1, Y1, dark, 0);
      shell(X0, Y0, X1, Y1, H, { seed: 150, tint: 0xa89e90, gapsY: [[5.2, 6.8]], fx: [awin(3.4, { y: 60, h: 64, w: 22 }), awin(8.6, { y: 60, h: 64, w: 22 }), awin(13.4), awin(18.8)], fy: [] });
      exit('y', 6, Y1, flags, { to: 'throne', at: 'council', name: 'door', label: 'Back to the throne room' });
      Kit.part('x', 11, X0, 12, 0, { gaps: [[5.3, 6.7]] }); Kit.part('y', 12, Y0, Y1, 0, { gaps: [[7.4, 8.8], [16, 17.4]], seed: 24 }); Kit.part('x', 14, 12, X1, 0, { gaps: [[15.5, 16.9], [23, 24.4]], seed: 25 }); Kit.part('y', 20, 14, Y1, 0, { gaps: [[17, 18.4]], seed: 26 });
      // ---- council chamber ----
      dais(2.6, 2.4, 10.4, 9.4, 0.2, marble); F('rug', 3.2, 3.2, 0.2, { w: 6.6, d: 5.4, c: 0x2c4078, c2: GOLD, c3: 0x1a2040 }); F('mapTable', 5.2, 5.0, 0.2, { s: 1.25, seed: 7 });
      F('throne', 5.8, 3.0, 0.2, { grand: true, s: 0.85 }); for (let i = 0; i < 3; i++) { F('chair', 4.3, 5.0 + i * 0.55, 0.2, { face: 'x', cushion: RED, c: 0x5c3f2c }); F('chair', 7.7, 5.0 + i * 0.55, 0.2, { face: '-x', cushion: BLUE, c: 0x5c3f2c }); } F('chair', 5.6, 6.7, 0.2, { face: '-y', cushion: GREEN, c: 0x5c3f2c }); F('chair', 6.5, 6.7, 0.2, { face: '-y', cushion: GREEN, c: 0x5c3f2c });
      F('fireplace', X0, 6, 0, { face: 'x', w: 2.2, h: 4.0, seed: 2 }); ['lion', 'eagle', 'tower', 'sun'].forEach((d, i) => F('banner', 2.6 + i * 2.5, Y0, 0, { h: 4.1, len: 2.4, dev: d, c: [RED, BLUE, GREEN, 0x2a2630][i], c2: i === 3 ? 0xe07a2a : GOLD }));
      F('candelabra', 1.7, 1.7, 0); F('candelabra', 11.2, 1.7, 0); F('chandelier', 6.5, 5.9, 0, { h: 3.3, drop: 1.0, r: 0.9, n: 12, tiers: 2, gold: true }); F('armour', 1.7, 10.2, 0, { face: 'x' }); F('armour', 11.2, 10.2, 0, { face: 'x', plume: 0x4a70c0 });
      // ---- entrance gallery ----
      F('runner', 5.4, 11.4, 0, { len: 9.4, w: 1.2 }); F('statue', 2.2, 12.6, 0, { kind: 'king', gilt: true }); F('statue', 2.2, 16, 0, { kind: 'knight' }); F('statue', 2.2, 19.4, 0, { kind: 'maiden' }); F('painting', X0, 14.3, 0, { face: 'x', h: 1.7, seed: 3 }); F('painting', X0, 17.7, 0, { face: 'x', h: 1.7, seed: 4 });
      F('bench', 10.4, 12.4, 0, { face: '-x', len: 2.4, back: true }); F('plant', 11.2, 19.8, 0, { kind: 'tree' }); F('vase', 10.9, 16.4, 0, { stand: true, seed: 5 }); F('brazier', 8.2, 20.2, 0); F('brazier', 3.9, 20.2, 0);
      // ---- library: a book gallery along the back wall, reached by a stair ----
      const shelfFront = STONE(77, { band: 0, tint: 0x8a6a4a });
      B.box(12.13, Y0, 0, X1 - 12.13, 2.2, MZ, { side: T.facade, P: shelfFront, top: (s, t) => walnut(s + 12.13, t + Y0) }); B.blocks.push([12.13, Y0, X1 - 12.13, 2.2, 0]); Kit.walk(12.13, Y0, X1, 3.2, MZ);
      Kit.stairs(20.6, 3.2, 4.6, 1.2, '+x', 0, MZ, { tint: 0x9a7a5a }); B.box(25.2, 3.2, 0, 1.8, 1.2, MZ, { side: T.facade, P: shelfFront, top: (s, t) => walnut(s + 25.2, t + 3.2) }); B.blocks.push([25.2, 3.2, 1.8, 1.2, 0]); Kit.walk(25.2, 3.2, X1, 4.4, MZ);
      for (let x = 12.2; x < 25.1; x += 0.9) { B.box(x, 3.1, MZ, 0.08, 0.08, 0.55, { side: T.flat(0x5c3f2c), noShadow: true }); } B.box(12.13, 3.1, MZ + 0.5, 13.07, 0.08, 0.07, { side: T.flat(0x7a5a3c), noShadow: true }); B.blocks.push([12.13, 3.14, 13.07, 0.06, MZ]);
      for (let i = 0; i < 8; i++) F('bookcase', 12.4 + i * 1.75, 1.05, MZ, { w: 1.6, seed: 10 + i, h: 2.0 }); for (let i = 0; i < 5; i++) F('bookcase', 12.4 + i * 1.6, 3.2, 0, { w: 1.5, seed: 20 + i, h: 1.7 });
      for (const x of [14, 18.2]) { F('bookcase', x, 7.2, 0, { w: 2.6, seed: x | 0 }); F('bookcase', x, 6.84, 0, { w: 2.6, seed: 3 + (x | 0), face: '-y' }); } F('bookcase', 22.6, 8.4, 0, { w: 2.6, seed: 31 }); F('bookcase', 22.6, 8.04, 0, { w: 2.6, seed: 32, face: '-y' });
      F('desk', 14.4, 10.4, 0); F('desk', 17.8, 10.4, 0, { c: 0x6a4a34 }); F('lectern', 21.4, 5.6, 0); F('lectern', 13, 12.6, 0, { face: 'x' }); F('globe', 25.6, 6.6, 0, { s: 1.2 }); F('scrollRack', 25.9, 9.6, 0, { face: '-x', w: 1.6 }); F('telescope', 25.8, 12.8, 0, { s: 0.9 });
      F('rug', 20.6, 10.6, 0, { w: 4.2, d: 2.8, c: 0x5a2a2a }); F('chair', 22, 11.4, 0, { cushion: RED, face: 'x' }); F('roundTable', 23, 12, 0, { r: 0.45 }); F('chair', 24, 11.8, 0, { cushion: RED, face: '-x' });
      F('chandelier', 16.5, 9, 0, { h: 3.3, drop: 1.0, r: 0.7, gold: true }); F('chandelier', 23, 6.4, 0, { h: 3.3, drop: 1.0, r: 0.7, gold: true }); F('candelabra', 26.3, 2.6, MZ, { n: 3 }); F('candelabra', 12.7, 2.6, MZ, { n: 3 });
      // ---- scribes' office ----
      F('shelves', 12.3, 14.2, 0, { w: 1.4, seed: 4 }); F('scrollRack', 13.8, 14.2, 0, { w: 1.4 }); F('scrollRack', 17.4, 14.2, 0, { w: 1.2, seed: 5 }); for (let i = 0; i < 3; i++) F('desk', 12.8 + i * 2.3, 17.2, 0, { c: 0x7a5a3c });
      F('chest', 18.9, 19.9, 0); F('candelabra', 19.3, 15, 0, { n: 3 }); F('rug', 12.6, 16.6, 0, { w: 6.6, d: 3, pat: 'stripe', c: 0x5a4a3a, face: 'y' }); F('chandelier', 16, 17.6, 0, { h: 3.0, drop: 0.8, r: 0.6 });
      // ---- war room ----
      F('mapTable', 22.4, 16.6, 0, { seed: 11 }); F('weaponRack', 20.3, 14.2, 0, { w: 1.5, seed: 4 }); F('armourStand', 26.2, 15, 0, { plume: 0xc8372f }); F('chest', 25.9, 19.9, 0, { open: true, gold: false }); F('globe', 20.9, 19.9, 0); F('brazier', 26.1, 17.4, 0); F('stool', 21.6, 17.2, 0); F('stack', 24.6, 14.3, 0, { kind: 'crates', s: 0.7 });
      // ---- people ----
      P('monk', 'The Chancellor', ['sit', 'work', 'read'], [6, 8, 0.2]); for (let i = 0; i < 4; i++) P('noble', ['Lord Treasurer', 'Lord Marshal', 'Lady Justice', 'Lord Admiral'][i], ['sit', 'work'], [3.4 + i * 2, 9.8, 0], { fem: i === 2 });
      P('guard', 'Council guard', null, [4.7, 12, 0], { fixed: [0.2, 1] }); P('guard', 'Council guard', null, [7.3, 12, 0], { fixed: [-0.2, 1] }); P('monk', 'Librarian', ['read', 'work'], [16, 12, 0]); P('noble', 'Scholar', ['read', 'work'], [20, 9.6, 0], { fem: true }); P('monk', 'Scholar', ['read'], [24, 2.4, MZ]);
      for (let i = 0; i < 3; i++) P('villager', 'Scribe', ['work'], [13.6 + i * 2.3, 19, 0], { fem: i === 1, hat: 0, top: 0x4a4a5a }); P('guard', 'The Marshal\'s aide', ['work'], [23.6, 18.6, 0]);
    },
  });

  /* =====================================================================
   *  9. THE ASTRONOMER'S STUDY  (top of the tower)
   * ===================================================================== */
  Castle.add('study', {
    name: "Astronomer's Study", blurb: 'A room at the top of the tower: the great telescope, the alchemist\'s bench, star charts and far too many books.', interior: true, bounds: [0, 0, 13.6, 13.8, 4.8], spawn: [8, 9, 0],
    build(a) {
      const X0 = 1, Y0 = 1, X1 = 12, Y1 = 12, H = 4.2;
      const chart = seed => (s, t, q) => { const X = Math.floor(s * 32), Y = Math.floor(t * 40), Wt = Math.round(q.ul * 32), Ht = Math.round(q.vl * 40), e = Math.min(X, Y, Wt - 1 - X, Ht - 1 - Y), dx = X - Wt / 2, dy = (Y - Ht / 2) * 0.8, d = Math.hypot(dx, dy), r = h2(X + seed * 9, Y); if (e < 2) return e ? 0xd9a83a : 0x8a6a22; if (Math.abs(d - Ht * 0.3) < 0.6 || Math.abs(d - Ht * 0.16) < 0.6 || (Math.abs(dx) < 0.6 && d < Ht * 0.3) || (Math.abs(dy) < 0.5 && d < Ht * 0.3)) return 0x6a84c0; if (r < 0.05) return r < 0.012 ? 0xfff6c0 | (E.F_EMIS << 24) : 0xe8e2d4; return mul(0x1a2448, 0.9 + h2(X >> 2, Y >> 2) * 0.25); };
      Kit.floor(X0, Y0, X1, Y1, walnut, 0);
      shell(X0, Y0, X1, Y1, H, { seed: 160, tint: 0x9a94a0, fx: [awin(9.6, { y: 56, w: 30, h: 80 })], fy: [awin(9.6, { y: 60, w: 22, h: 60 })] });
      // observing platform with the great telescope under the big window
      dais(1, 8, 4.6, Y1, 0.2, oak, 0x8a6a4a); dais(1, 8.6, 4, Y1, 0.4, oak, 0x8a6a4a); F('telescope', 2.4, 10.2, 0.4, { s: 1.5, face: '-x' }); F('globe', 3.5, 8.9, 0.4, { seed: 9 }); F('stool', 3.4, 11.3, 0.4);
      // alchemy and books along the back wall
      F('alchemy', 1.4, 1.1, 0); F('bookcase', 3.2, 1.1, 0, { w: 1.5, seed: 3, h: 2.2 }); F('bookcase', 4.8, 1.1, 0, { w: 1.5, seed: 4, h: 2.2 }); F('scrollRack', 6.5, 1.1, 0, { w: 1.2, h: 1.5 });
      B.box(7.3, Y0, 1.75, 1.7, 0.05, 1.5, { side: T.flat(0x8a6a22), ty: chart(1), noShadow: true }); B.box(X0, 5.3, 1.5, 0.05, 1.9, 1.5, { side: T.flat(0x8a6a22), tx: chart(2), noShadow: true });
      F('alchemy', 1.15, 2.6, 0, { face: 'x', seed: 2 }); F('cauldron', 2.8, 6.4, 0, { s: 0.8 }); F('shelves', 1.15, 7, 0, { face: 'x', w: 0.9, seed: 7, h: 1.2 }); F('sconce', X0, 4.6, 0, { face: 'x', h: 2.0 });
      // bed in the corner, desk, clutter
      F('nobleBed', 10.6, 1.15, 0, { c: 0x2a3a6a, s: 0.9 }); F('chest', 10.9, 2.9, 0, { s: 0.85 }); F('candelabra', 10.1, 1.6, 0, { n: 3 }); F('desk', 6.6, 4.6, 0); F('rug', 5.4, 3.8, 0, { w: 4.2, d: 3.4, c: 0x2a2a5a, c2: 0xd9c070, c3: 0x14143a });
      F('lectern', 9.6, 6.6, 0, { face: '-x' }); F('mapTable', 6, 9.4, 0, { s: 0.8, seed: 5 }); F('stack', 9.9, 10.6, 0, { kind: 'crates', s: 0.7 }); F('plant', 11.3, 4.6, 0, { kind: 'fern', pot: 0x4a4a7a });
      F('chandelier', 6.6, 6.4, 0, { h: 3.1, drop: 1.0, r: 0.7, n: 8 }); F('candelabra', 4.3, 11.6, 0.2, { n: 3 }); F('candelabra', 11.3, 11.2, 0); F('brazier', 8.2, 11.2, 0, { s: 0.8 }); F('vase', 5.2, 11.3, 0, { c: 0x5a3a8a, seed: 1 });
      Kit.stairwell(9.2, 8.2, 2.2, 1.5, 0, '+x'); Kit.portal(10.4, 8.95, 0, { to: 'inner', at: 'studytower', name: 'down', label: 'Down the tower', ex: 8.2, ey: 8.9 });
      P('monk', 'The Astronomer', ['work', 'read', 'sleep'], [5, 7, 0]); P('villager', 'Apprentice', ['work', 'read', 'cook', 'sit'], [7.4, 8.4, 0], { fem: false, top: 0x34508f, hat: 0 });
    },
  });
})();
