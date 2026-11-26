'use strict';
/* Room contents for castle layout 3: Rooms[key] = { name, blurb, wallX, wallY, build(c) }.  See site.js.
 * Everything is in WORLD coordinates, standing on c.z.  site.js draws the outer walls, doors, stairs and portals;
 * this file lays the floors, divides each storey into bays with low partitions, and furnishes and staffs it. */
(function () {
  const h2 = E.h2, mul = T.mul, STONE = Kit.STONE, BLD = Site.BLD;
  const RED = 0xa82a2e, BLUE = 0x34508f, GREEN = 0x3f7a46, PURPLE = 0x6a3a8a, GOLD = 0xd9a83a, CREAM = 0xe8dcc0;
  const flags = Kit.flags(), dark = Kit.flags(0x6e6a70), mossy = Kit.flags(0x66706a), oak = Kit.planks(0x8a6846), pine = Kit.planks(0xa07a4e), walnut = Kit.planks(0x6e5038);
  const terra = Kit.tiles(20, 0xa8674a, 0x96583f), chk = Kit.diag(40, 0xcfc6b2, 0x6f6a78), marble = Kit.tiles(26, 0xd8d0be, 0xbcb4a6), slate = Kit.tiles(22, 0x7c8494, 0x687080), pale = Kit.tiles(18, 0xcfd6d2, 0xa8c0c0);
  const sand = (x, y) => mul(0xc8b088, 0.9 + T.fbm(x * 0.7, y * 0.7) * 0.2 - (h2(Math.floor(x * 32), Math.floor(y * 32)) < 0.05 ? 0.1 : 0));
  /* wall features by WORLD position along a building's back walls */
  const onX = (id, y, f) => Object.assign({ k: 'awin', y: 44, w: 18, h: 46, frame: 0x4a4038, sill: 0xc4bcaa }, f || {}, { x: (BLD[id].y1 - y) / (BLD[id].y1 - BLD[id].y0) });
  const onY = (id, x, f) => Object.assign({ k: 'awin', y: 44, w: 18, h: 46, frame: 0x4a4038, sill: 0xc4bcaa }, f || {}, { x: (x - BLD[id].x0 - 0.5) / (BLD[id].x1 - BLD[id].x0 - 0.5) });
  const GL = { k: 'glass', y: 36, w: 18, h: 70 };
  /* per-room helpers bound to the storey's floor height */
  function kit(c) {
    const z = c.z;
    return { z,
      F: (n, x, y, o, dz) => Fz[n](x, y, z + (dz || 0), o),
      P: (role, name, kinds, x, y, o) => Kit.person(Object.assign({ role, name, kinds, at: [x, y, z + ((o && o.dz) || 0)] }, o || {})),
      fl: (x0, y0, x1, y1, tex) => Kit.floor(x0, y0, x1, y1, tex, z),
      part: (axis, cc, a0, a1, o) => Kit.part(axis, cc, a0, a1, z, o),
      dais: (x0, y0, x1, y1, hh, tex, tint) => { B.box(x0, y0, z, x1 - x0, y1 - y0, hh, { side: T.facade, P: STONE(74, { band: 0, tint: tint || 0xc8c0ae }), top: (s, t) => tex(s + x0, t + y0) }); Kit.walk(x0, y0, x1, y1, z + hh); },
    };
  }

  /* =====================================================================
   *  GREAT TOWER  (7.8 x 7.8; the stair hugs the north wall on T0 / T2 and the west wall on T1 / T3)
   * ===================================================================== */
  Rooms.T0 = { name: 'Great Tower: Guardroom', blurb: 'The foot of the great tower: the guard on the stair, with arms to hand.',
    wallX: [onX('T', 12.2, { y: 60, w: 12, h: 30 })], wallY: [],
    build(c) { const { F, P, fl } = kit(c);
      fl(c.x0, c.y0, c.x1, c.y1, flags);
      F('weaponRack', 5.72, 7.7, { face: 'x', w: 1.5 }); F('shieldWall', 5.6, 10.4, { face: 'x', n: 3, h: 2.1 }); F('armour', 6.25, 12.75, { face: 'x' }); F('torch', 5.6, 11.8, { face: 'x', h: 1.7 });
      F('roundTable', 8.1, 10.5, { r: 0.5, stools: 3, kind: 'sit', food: true, seed: 3 }); F('brazier', 12.7, 12.7); F('stack', 12.0, 7.3, { kind: 'barrels', s: 0.7 }); F('chest', 11.0, 12.8, { s: 0.9 }); F('rug', 10.4, 8.4, { w: 1.6, d: 2.4, pat: 'stripe', c: 0x6a3a34, face: 'y' });
      P('guard', 'Tower guard', null, 12.3, 10.6, { fixed: [-1, 0.2] }); P('guard', 'Tower guard', ['sit', 'work'], 9, 9); P('guard', 'Sergeant of the tower', ['sit', 'work'], 10.5, 11.5);
    } };
  Rooms.T1 = { name: 'Great Tower: Treasury', blurb: 'The muniment room and strongroom, one stair above the guard.',
    wallX: [], wallY: [onY('T', 12.6, { y: 60, w: 12, h: 30 })],
    build(c) { const { F, P, fl } = kit(c);
      fl(c.x0, c.y0, c.x1, c.y1, slate);
      F('banner', 8.2, 5.6, { h: 2.8, len: 1.7 }); F('torch', 10.4, 5.6, { h: 1.8 }); F('shieldWall', 9.3, 5.6, { h: 2.2, n: 1, spears: false });
      F('treasure', 10.5, 8.5, { r: 0.6, seed: 3 }); F('chest', 7.3, 12.85, { open: true, face: '-y' }); F('chest', 10.9, 12.85, { face: '-y' }); F('chest', 11.9, 12.85, { open: true, face: '-y' }); F('desk', 7.6, 9.2, { chair: false, face: 'x', s: 0.9 });
      F('scrollRack', 12.9, 10.9, { face: '-x', w: 1.3, h: 1.0 }); F('candelabra', 12.8, 7.9, { n: 3 }); F('candelabra', 8.3, 12.2, { iron: true, n: 3 }); F('armourStand', 12.8, 12.8, { plume: 0xd9a83a, s: 0.9 });
      P('noble', 'Keeper of the rolls', ['work'], 9, 10.5, { fem: false, top: 0x2a4a7a }); P('guard', 'Treasury guard', null, 11.6, 10.6, { fixed: [-0.6, 1] });
    } };
  Rooms.T2 = { name: "Great Tower: King's Solar", blurb: "The king's private room and oratory, above the treasury.",
    wallX: [], wallY: [],
    build(c) { const { F, P, fl } = kit(c);
      fl(c.x0, c.y0, c.x1, c.y1, walnut);
      F('rug', 8, 8, { w: 4, d: 3.6, c: 0x7a1c22 }); F('throne', 9.3, 7.5, { s: 0.85 }); F('roundTable', 10.9, 9.6, { r: 0.42, food: true, seed: 6 }); F('chair', 11.6, 9.4, { face: '-x', cushion: BLUE }); F('harp', 8.2, 10.4);
      F('statue', 12.7, 12.7, { kind: 'angel', gilt: true, c: 0xd8d2c8, face: '-x' }); F('lectern', 11.4, 12.4, { face: 'x' }); F('candelabra', 12.8, 11.3); F('vase', 6.1, 12.95, { stand: true }); F('chest', 9.3, 12.85, { face: '-y' }); F('globe', 12.8, 7.6);
      F('torch', 5.6, 6.2, { face: 'x', h: 1.9 }); F('chandelier', 9.9, 9.9, { h: 2.4, drop: 0.5, r: 0.5, n: 6, gold: true });
      P('monk', "The king's confessor", ['read', 'sit', 'play'], 10, 11.4); P('villager', 'Page', ['sit', 'play', 'work'], 9, 10, { fem: false, top: 0x34508f });
    } };
  const chart = seed => (s, t, q) => { const X = Math.floor(s * 32), Y = Math.floor(t * 40), Wt = Math.round(q.ul * 32), Ht = Math.round(q.vl * 40), e = Math.min(X, Y, Wt - 1 - X, Ht - 1 - Y), dx = X - Wt / 2, dy = (Y - Ht / 2) * 0.8, d = Math.hypot(dx, dy), r = h2(X + seed * 9, Y); if (e < 2) return e ? 0xd9a83a : 0x8a6a22; if (Math.abs(d - Ht * 0.3) < 0.6 || Math.abs(d - Ht * 0.16) < 0.6 || (Math.abs(dx) < 0.6 && d < Ht * 0.3) || (Math.abs(dy) < 0.5 && d < Ht * 0.3)) return 0x6a84c0; if (r < 0.05) return r < 0.012 ? 0xfff6c0 | (E.F_EMIS << 24) : 0xe8e2d4; return mul(0x1a2448, 0.9 + h2(X >> 2, Y >> 2) * 0.25); };
  Rooms.T3 = { name: "Great Tower: Astronomer's Study", blurb: 'Top of the tower: the telescope, the alchemist\'s bench and star charts. The stair goes on to the roof.',
    wallX: [], wallY: [onY('T', 12.6, { y: 50, w: 16, h: 44 })],
    build(c) { const { z, F, P, fl, dais } = kit(c);
      fl(c.x0, c.y0, c.x1, c.y1, walnut);
      B.box(7.6, 5.6, z + 1.2, 1.7, 0.05, 1.4, { side: T.flat(0x8a6a22), ty: chart(1), noShadow: true }); B.box(9.6, 5.6, z + 1.2, 1.5, 0.05, 1.4, { side: T.flat(0x8a6a22), ty: chart(4), noShadow: true }); F('sconce', 11.6, 5.6, { h: 1.8 });
      dais(10.6, 10.6, 13.4, 13.4, 0.2, oak, 0x8a6a4a); F('telescope', 12.2, 12.2, { s: 1.4, face: '-x' }, 0.2); F('stool', 11.2, 12.8, {}, 0.2);
      F('alchemy', 7.2, 12.75, { face: '-y' }); F('rug', 7.9, 8.1, { w: 3.2, d: 2.8, c: 0x2a2a5a, c2: 0xd9c070, c3: 0x14143a }); F('desk', 8.5, 8.6, { chair: true, s: 0.9 }); F('globe', 12.9, 12.95, {}, 0.2); F('cot', 12.7, 8.8, { c: 0x2a3a6a, s: 0.9 });
      F('scrollRack', 9.2, 12.95, { face: '-y', w: 1.2, h: 0.9 }); F('candelabra', 7.4, 11.9, { n: 3 }); F('chandelier', 9.6, 10, { h: 2.4, drop: 0.5, r: 0.5, n: 6 });
      P('monk', 'The Astronomer', ['work', 'read', 'sleep'], 9.5, 10.5); P('villager', 'Apprentice', ['work', 'read', 'sit'], 10.2, 8.2, { fem: false, top: 0x34508f, hat: 0 });
    } };

  /* =====================================================================
   *  NORTH RANGE  (inside 15.5..39.5 x 4.5..14.5): bays open onto a central passage
   * ===================================================================== */
  Rooms.N0 = { name: 'North Range: Staff Quarters', blurb: 'The household\'s own floor: the steward, the servants\' dormitory, stores, their hall and the laundry.',
    wallX: [onX('N', 6.4, GL), onX('N', 12.6, GL)], wallY: [onY('N', 16.6), onY('N', 26.2), onY('N', 30.2), onY('N', 35.2)],
    build(c) { const { F, P, fl, part } = kit(c);
      fl(15.5, 4.5, 21.5, 8.6, walnut); fl(21.5, 4.5, 31, 8.6, pine); fl(31, 4.5, 39.5, 8.6, dark); fl(15.5, 8.6, 39.5, 10.6, flags); fl(15.5, 10.6, 25, 14.5, oak); fl(25, 10.6, 29, 14.5, flags); fl(29, 10.6, 39.5, 14.5, slate);
      part('y', 21.5, 4.5, 8.4); part('y', 31, 4.5, 8.4, { seed: 24 }); part('y', 25, 10.8, 14.5, { seed: 25 }); part('y', 29, 10.8, 14.5, { seed: 26 });
      F('runner', 17.6, 9, { face: 'x', len: 21.4, w: 1.2, c: 0x3f5a46, c2: 0xd9c070, c3: 0x1e3024 }); F('torch', 15.5, 7.9, { face: 'x', h: 1.8 }); F('torch', 15.5, 11.2, { face: 'x', h: 1.8 });
      // steward's office
      F('fireplace', 18.6, 4.5, { w: 1.7, h: 2.9, seed: 5 }); F('bookcase', 20, 4.6, { w: 1.3, seed: 8 }); F('desk', 17.2, 6.6, { s: 0.9 }); F('chest', 15.7, 5, { face: 'x', open: true }); F('rug', 16.8, 6.1, { w: 2.4, d: 1.8 }); F('scrollRack', 15.65, 6.4, { face: 'x', w: 1.1, h: 1.1 });
      // servants' dormitory
      for (let i = 0; i < 6; i++) { F('cot', 22 + i * 1.45, 4.65, { c: [0x8a8272, 0x9a6a6a, 0x6a7a8a, 0x6a6a5a][i % 4] }); if (i % 2 === 0) F('chest', 22.05 + i * 1.45, 6.2, { s: 0.7 }); } F('rug', 23, 7, { w: 6, d: 1.3, pat: 'stripe', c: 0x8a5a6a }); F('washstand', 30.3, 4.65);
      // stores
      F('shelves', 31.3, 4.6, { w: 1.4, seed: 9 }); F('shelves', 32.8, 4.6, { w: 1.4, seed: 2 }); F('cask', 34.6, 4.65, { s: 0.8 }); F('cask', 35.6, 4.65, { s: 0.8 }); F('stack', 37.9, 4.8, { kind: 'sacks' }); F('stack', 31.4, 7.2, { kind: 'crates', s: 0.8 }); F('hangRack', 35, 7.4, { len: 2.2, h: 1.5 }); F('candelabra', 38.9, 8.1, { iron: true, n: 3 });
      // servants' hall
      F('feastTable', 16.6, 11.5, { len: 4.2, food: true, seed: 5, c: 0x7a5a3c }); F('dishShelf', 22.2, 10.75, { w: 1.2 }); F('waterBarrel', 24.3, 13.8); F('brazier', 22.6, 13.5); F('gameTable', 23.6, 11.6, { game: 'dice', s: 0.85 }); F('chandelier', 19, 12.4, { h: 2.4, drop: 0.5, r: 0.6 });
      // lobby by the court door
      F('rug', 26.1, 11, { w: 1.8, d: 2.6, pat: 'diamond', face: 'y' }); F('plant', 25.5, 11.1, { kind: 'tree' }); F('bench', 28.2, 11, { face: '-x', len: 1.6 });
      // laundry and sewing
      F('laundry', 29.6, 10.8, { len: 3.2 }); F('cauldron', 34.2, 11.6); F('bathTub', 30.4, 13.5, { s: 0.75 }); F('loom', 35.4, 10.75); F('spinningWheel', 37, 10.9); F('stack', 37.9, 13.2, { kind: 'sacks', s: 0.8 }); F('waterBarrel', 33, 13.9); F('chandelier', 33.6, 12.6, { h: 2.4, drop: 0.5, r: 0.5, n: 6 });
      P('noble', 'The Steward', ['work', 'read'], 18, 8, { fem: false }); P('villager', 'Housekeeper', ['work', 'sit'], 26, 9.6, { fem: true, apron: true, top: 0x3a3a4a });
      for (let i = 0; i < 2; i++) P('villager', 'Laundress', ['work', 'cook'], 32 + i, 12.6, { fem: true, apron: true }); P('villager', 'Weaver', ['work'], 36, 12.4, { fem: true });
      for (let i = 0; i < 4; i++) P('villager', ['Footman', 'Maid', 'Groom', 'Kitchen boy'][i], ['eat', 'sit', 'play', 'drink', 'sleep'], 19 + i * 2, 9.6, { fem: i === 1 });
    } };
  Rooms.N1 = { name: 'North Range: Council & Library', blurb: 'Above the staff: the council chamber, and the library with its scriptorium.',
    wallX: [onX('N', 6.2, GL), onX('N', 12.8, GL)], wallY: [onY('N', 16.8), onY('N', 25)],
    build(c) { const { F, P, fl, part, dais } = kit(c);
      fl(15.5, 4.5, 26.5, 14.5, chk); fl(26.5, 4.5, 39.5, 14.5, walnut);
      part('y', 26.5, 4.5, 14.5, { gaps: [[8.8, 10.2]] });
      // council chamber
      dais(18.6, 6.6, 25.4, 12.4, 0.2, marble); F('rug', 19, 7, { w: 6, d: 5, c: 0x2c4078, c2: GOLD, c3: 0x1a2040 }, 0.2); F('mapTable', 20.4, 8.8, { s: 1.2, seed: 7 }, 0.2);
      F('throne', 23.6, 9, { face: '-x', grand: true, s: 0.8 }, 0.2); for (let i = 0; i < 3; i++) { F('chair', 20.5 + i * 0.6, 8.2, { cushion: RED, c: 0x5c3f2c }, 0.2); F('chair', 20.5 + i * 0.6, 10.2, { face: '-y', cushion: BLUE, c: 0x5c3f2c }, 0.2); }
      F('fireplace', 21.6, 4.5, { w: 2, h: 2.9, seed: 2 }); ['lion', 'eagle', 'tower'].forEach((d, i) => F('banner', [18.6, 23.6, 25.6][i], 4.5, { h: 2.85, len: 1.9, dev: d, c: [RED, BLUE, GREEN][i] })); F('candelabra', 15.9, 5); F('armour', 16.1, 13.8, { face: 'x' }); F('armour', 25.9, 13.8, { face: '-x', plume: 0x4a70c0 });
      F('chandelier', 22, 9.6, { h: 2.5, drop: 0.5, r: 0.8, n: 10, gold: true }); F('painting', 15.5, 12.4, { face: 'x', h: 1.2, hh: 0.8, w: 0.7, seed: 3 }); F('bench', 18, 13.9, { len: 2.2, face: '-y', back: true });
      // library and scriptorium
      for (let i = 0; i < 7; i++) F('bookcase', 26.9 + i * 1.78, 4.6, { w: 1.7, seed: 10 + i, h: 2.2 });
      for (const x of [28.6, 33]) { F('bookcase', x, 8, { w: 2.6, seed: x | 0 }); F('bookcase', x, 7.64, { w: 2.6, seed: 3 + (x | 0), face: '-y' }); }
      F('lectern', 37.4, 7, {}); F('globe', 38.6, 9.4, { s: 1.1 }); F('scrollRack', 38.95, 10.6, { face: '-x', w: 1.5 }); F('rug', 28, 9.8, { w: 9, d: 2.2, pat: 'stripe', c: 0x5a4a3a }); for (let i = 0; i < 4; i++) F('desk', 27.6 + i * 2.6, 12.2, { c: i % 2 ? 0x6a4a34 : 0x7a5a3c });
      F('chandelier', 31.8, 10.6, { h: 2.5, drop: 0.5, r: 0.6, gold: true }); F('chandelier', 36.4, 10.6, { h: 2.5, drop: 0.5, r: 0.6, gold: true }); F('candelabra', 27, 11, { n: 3 });
      P('monk', 'The Chancellor', ['sit', 'work'], 22, 12, { dz: 0.2 }); for (let i = 0; i < 3; i++) P('noble', ['Lord Treasurer', 'Lord Marshal', 'Lady Justice'][i], ['sit', 'work', 'read'], 17 + i * 0.8, 8 + i, { fem: i === 2 });
      P('guard', 'Council guard', null, 17.4, 8.4, { fixed: [0.5, 1] }); P('monk', 'Librarian', ['read', 'work'], 30, 10.6); P('noble', 'Scholar', ['read'], 35, 9.6, { fem: true }); for (let i = 0; i < 3; i++) P('villager', 'Scribe', ['work'], 28.4 + i * 2.6, 11.4, { fem: i === 1, hat: 0, top: 0x4a4a5a });
    } };
  Rooms.N2 = { name: 'North Range: Royal Apartments', blurb: 'The top floor: an antechamber, the king\'s and queen\'s chambers, the nursery and the privy gallery.',
    wallX: [onX('N', 6.2, GL), onX('N', 12.8, GL)], wallY: [onY('N', 16.9), onY('N', 26), onY('N', 33.9, { w: 14 })],
    build(c) { const { F, P, fl, part } = kit(c);
      fl(15.5, 4.5, 18.5, 14.5, chk); fl(18.5, 4.5, 26.5, 10.6, walnut); fl(26.5, 4.5, 33.5, 10.6, oak); fl(33.5, 4.5, 39.5, 10.6, pine); fl(18.5, 10.6, 39.5, 14.5, flags);
      part('y', 18.5, 4.5, 10.6, { gaps: [[6.4, 7.8]] }); part('y', 26.5, 4.5, 10.6, { seed: 24 }); part('y', 33.5, 4.5, 10.6, { seed: 25 }); part('x', 10.6, 18.5, 39.5, { gaps: [[21.6, 23.2], [29, 30.6], [35.8, 37.4]], seed: 26 });
      // antechamber
      F('painting', 15.5, 7.6, { face: 'x', h: 1.3, hh: 0.9, w: 0.7 }); F('painting', 15.5, 11.4, { face: 'x', h: 1.3, hh: 0.9, w: 0.7, seed: 1 }); F('banner', 17.9, 4.5, { h: 2.85, len: 1.8 }); F('armour', 16.2, 5.3, { face: 'x' }); F('armour', 16.2, 13.8, { face: 'x', plume: 0x4a70c0 }); F('rug', 16, 7.6, { w: 2, d: 4, pat: 'diamond', face: 'y' }); F('chandelier', 17, 9.6, { h: 2.5, drop: 0.5, r: 0.5, n: 6, gold: true });
      // king's bedchamber
      F('fireplace', 20, 4.5, { w: 1.8, h: 2.9, seed: 1 }); F('royalBed', 21.6, 4.65); F('wardrobe', 23.6, 4.6, { w: 1.1 }); F('banner', 25.6, 4.5, { h: 2.85, len: 1.7 }); F('chest', 22.05, 6.8); F('rug', 20, 7.6, { w: 5, d: 2.6, c: 0x7a1c22 }); F('desk', 24.8, 7.4, { face: '-x', s: 0.9 }); F('candelabra', 21.2, 5.2); F('armourStand', 19.1, 9.9, { plume: 0xc8372f, s: 0.9 });
      // queen's chamber
      F('nobleBed', 27.6, 4.65, { c: 0x6a3a8a }); F('tapestry', 28.2, 4.5, { w: 1.9, hh: 1.0, h: 1.75, scene: 'unicorn', c: 0x3a5a3a }); F('dressingTable', 29.4, 4.65); F('wardrobe', 30.6, 4.6, { c: 0x8a6444 }); F('bookcase', 31.8, 4.6, { w: 1.4, seed: 2, h: 1.6 }); F('rug', 27.4, 7.4, { w: 4.6, d: 2.6, c: 0x4a2a6a, c2: 0xe8c8d8, c3: 0x2a1a40 });
      F('loom', 32.2, 7.6, { face: '-x', s: 0.9 }); F('screen', 26.8, 9.8, { len: 1.6, c: 0x7a2a3a }); F('chair', 28.4, 9.6, { cushion: PURPLE, face: '-y' }); F('candelabra', 27.1, 5.2);
      // nursery and wardrobe
      F('wardrobe', 33.8, 4.6, { c: 0x9a7448 }); F('cradle', 35.4, 5); F('cot', 38.6, 4.7, { c: 0x9ab0d0, s: 0.85 }); F('cot', 37.5, 4.7, { c: 0xe8a0b0, s: 0.85 }); F('rug', 34.4, 7, { w: 4, d: 2.4, pat: 'stripe', c: 0xd9a83a, c2: 0x4a70c0 }); F('quoits', 36.4, 8.2, { range: 1.2 }); F('chest', 38.6, 9.8, { c: 0x4a6a8a }); F('roundTable', 34.4, 9.2, { r: 0.4, stools: 2, kind: 'play' });
      // privy gallery along the court side
      F('runner', 19.2, 11.9, { face: 'x', len: 19.6, w: 1.3, c: 0x2c4078, c2: GOLD, c3: 0x1a2040 }); for (const x of [20.2, 25.4, 32, 38.6]) F('statue', x, 10.95 + 0.4, { kind: ['king', 'knight', 'maiden', 'angel'][(x | 0) % 4], s: 0.8, gilt: true }); F('bench', 26.6, 13.9, { len: 2, face: '-y', back: true }); F('bench', 33.4, 13.9, { len: 2, face: '-y', back: true });
      F('plant', 19, 14, { kind: 'tree' }); F('plant', 39, 14, { kind: 'fern', pot: 0x4a6a8a }); F('vase', 30.8, 14, { stand: true, seed: 3 }); F('chandelier', 24, 12.6, { h: 2.5, drop: 0.5, r: 0.5, n: 6, gold: true }); F('chandelier', 34.6, 12.6, { h: 2.5, drop: 0.5, r: 0.5, n: 6, gold: true });
      P('guard', 'Chamber guard', null, 17.6, 8.3, { fixed: [0.4, 1] }); P('guard', 'Chamber guard', null, 17.6, 10.8, { fixed: [0.4, 1] }); P('noble', 'The Queen\'s lady', ['sit', 'read', 'work', 'play'], 29, 8.6, { fem: true }); P('noble', 'The Prince', ['play', 'sit'], 36, 9, { fem: false, top: 0x8a2a3a });
      P('villager', 'Royal nurse', ['work', 'play'], 35.4, 6.4, { fem: true, apron: true }); P('villager', 'Chambermaid', ['work', 'sleep'], 23, 9.4, { fem: true, apron: true }); P('villager', 'Valet', ['work', 'read'], 24, 12.6, { fem: false, top: 0x3a3a4a, hat: 0 }); P('noble', 'Courtier', ['sit'], 30, 12.6);
    } };

  /* =====================================================================
   *  WEST RANGE  (inside 4.5..14.5 x 15.5..37.5)
   * ===================================================================== */
  Rooms['W-1'] = { name: 'Undercroft', blurb: 'Under the great hall: three cells and a guard post, the wine cellar, and the stores by the kitchen stair.',
    wallX: [], wallY: [],
    build(c) { const { F, P, fl, part } = kit(c);
      fl(4.5, 15.5, 14.5, 24, dark); fl(4.5, 24, 14.5, 30.4, (x, y) => (h2(Math.floor(x * 3), Math.floor(y * 3)) < 0.5 ? Kit.earth(x, y) : dark(x, y))); fl(4.5, 30.4, 14.5, 37.5, mossy);
      part('x', 24, 4.5, 14.5, { gaps: [[8.6, 10.2]], tint: 0x77737a }); part('x', 30.4, 6, 14.5, { gaps: [[9, 10.6]], tint: 0x77737a, seed: 24 });
      // prison
      for (let i = 0; i < 3; i++) { const x = 4.5 + i * 3.33; F('cellFront', x + 0.04, 18.6, { len: 3.26, door: 1.63, dw: 0.9, open: i === 1, h: 2.2 }); if (i) part('y', x, 15.5, 18.6, { h: 1.5, tint: 0x6e6a72, seed: 30 + i });
        F('pallet', x + 0.3, 15.8, { kind: 'pris', s: 0.9 }); F('shackles', x + 2.4, 15.5, { h: 1.2 }); if (i !== 1) F('ratHole', x + 1.4, 15.5); }
      F('skeleton', 9.4, 16.1, {}); P('villager', 'Prisoner', null, 6.9, 15.9, { fixed: [0, 1], top: 0x7a7468, hat: 0, fem: false }); P('villager', 'Poacher', null, 13.6, 15.9, { fixed: [-0.2, 1], top: 0x8a7a60, hat: 0 });
      // guard post
      F('weaponRack', 4.62, 19.6, { face: 'x', w: 1.4 }); F('keyRack', 4.5, 22, { face: 'x', h: 1.4 }); F('torch', 4.5, 23, { face: 'x', h: 1.8 }); F('roundTable', 11.6, 21.6, { r: 0.5, stools: 3, kind: 'sit', food: true }); F('brazier', 7.2, 22.4); F('bench', 13.9, 19.4, { face: '-x', len: 1.6 });
      // wine cellar
      for (let i = 0; i < 4; i++) F('cask', 4.65, 24.4 + i * 1.12, { face: 'x', c: i % 2 ? 0x7a4a34 : 0x8a5a3a }); F('wineRack', 11, 24.2, { w: 1.6 }); F('wineRack', 12.7, 24.2, { w: 1.5, seed: 7 }); F('stack', 12.8, 28.4, { kind: 'barrels', s: 0.9 }); F('candelabra', 7.6, 29.4, { iron: true, n: 3 }); F('roundTable', 10.4, 27.6, { r: 0.4 });
      // stores at the foot of the stair
      F('shelves', 6.3, 30.55, { w: 1.3, seed: 3, h: 1.0 }); F('shelves', 11, 30.55, { w: 1.5, seed: 5 }); F('stack', 12.9, 31.2, { kind: 'sacks', s: 0.9 }); F('stack', 12.9, 35.8, { kind: 'crates' }); F('well', 10.6, 34.2, { r: 0.5, c: 0x8a9088 }); F('hangRack', 7.6, 36.6, { len: 2.4, h: 1.5, seed: 3 }); F('brazier', 7, 32.6); F('torch', 4.5, 36.5, { face: 'x', h: 1.8 });
      P('guard', 'Gaoler', ['guard', 'sit'], 9, 21); P('guard', 'Turnkey', ['guard', 'sit'], 8, 19.6); P('villager', 'Cellarer', ['drink', 'work'], 9, 27, { apron: true, fem: false }); P('villager', 'Scullion', ['work', 'drink'], 9, 33, { apron: true });
    } };
  Rooms.W0 = { name: 'Great Hall', blurb: 'The dining hall of the keep, with the kitchens at its south end. The stair in the kitchen goes down to the undercroft.',
    wallX: [onX('W', 16.9, GL), onX('W', 29.6, GL), onX('W', 36.6, { y: 60, w: 12, h: 30 })], wallY: [onY('W', 6.6, { y: 50, h: 40 }), onY('W', 12.6, { y: 50, h: 40 })],
    build(c) { const { F, P, fl, part, dais } = kit(c);
      fl(4.5, 15.5, 14.5, 30.4, (x, y) => (x > 10.2 && x < 11.4 ? chk(x, y) : flags(x, y))); fl(4.5, 30.4, 14.5, 37.5, terra);
      part('x', 30.4, 7.4, 14.5, { gaps: [[8.8, 10.4]] });
      // high table on a dais along the west wall
      dais(4.5, 18.4, 7.6, 25.2, 0.2, marble); F('feastTable', 6.2, 19, { face: 'x', len: 5.6, benches: false, cloth: RED, seed: 2 }, 0.2);
      F('throne', 5, 21.3, { face: 'x', kind: 'eat' }, 0.2); F('throne', 5, 22.3, { face: 'x', c: BLUE, kind: 'eat' }, 0.2); for (const y of [19.2, 24.6]) F('chair', 5.3, y, { face: 'x', cushion: y < 22 ? RED : BLUE, kind: 'eat', c: 0x5c3f2c }, 0.2);
      F('tapestry', 4.5, 21.8, { face: 'x', w: 3.4, h: 1.75, hh: 1.1 }); F('banner', 4.5, 18.9, { face: 'x', h: 2.85, len: 1.6 }); F('banner', 4.5, 24.7, { face: 'x', h: 2.85, len: 1.6, c: BLUE, dev: 'eagle' }); F('candelabra', 8, 25.6); F('candelabra', 8, 18);
      F('fireplace', 4.5, 27.2, { face: 'x', w: 2, h: 2.9 }); F('torch', 4.5, 16.3, { face: 'x', h: 1.8 }); F('stagHead', 7, 15.5, { h: 2.1 }); F('crossedSwords', 12.2, 15.5, { h: 1.3, seed: 2 }); F('banner', 11, 15.5, { h: 2.85, len: 1.6, c: GREEN, dev: 'tower' });
      // feast tables
      F('feastTable', 8.5, 18.6, { face: 'x', len: 5.4, seed: 4 }); F('feastTable', 11.9, 18.6, { face: 'x', len: 5.4, seed: 9 }); F('chandelier', 10.8, 21, { h: 2.5, drop: 0.5, r: 0.8, n: 10, tiers: 2 }); F('chandelier', 9.6, 27.6, { h: 2.5, drop: 0.5, r: 0.7 });
      F('brazier', 13.8, 24.6); F('brazier', 13.8, 27.4); F('armour', 5.2, 16.2, { face: 'x' }); F('plant', 13.9, 16.1, { kind: 'tree' });
      // minstrels
      F('rug', 10.4, 27.6, { w: 3, d: 2.4, pat: 'diamond', c: 0x2c4078, c2: CREAM, c3: 0x1a2040 }); F('harp', 11.2, 28.6); F('lute', 12.9, 28.2); F('drum', 12.4, 29.5); F('stool', 11.4, 29.6, { kind: 'play', look: [-0.5, -1] });
      // kitchen and buttery
      F('hearth', 10.7, 30.55, { w: 2.4, h: 1.9 }); F('dishShelf', 7.5, 30.55, { w: 1.2 }); F('cauldron', 8.2, 33.4); F('butcherBlock', 10.4, 34); F('breadTable', 12.6, 33.2, { face: '-x' }); F('hangRack', 9.4, 36.7, { len: 2.4, h: 1.5 });
      for (let i = 0; i < 2; i++) F('cask', 12.4 + i * 1.05, 36.2, { face: '-y', s: 0.85 }); F('waterBarrel', 7.4, 36.8); F('stack', 5.9, 35.9, { kind: 'sacks', s: 0.8 }); F('chandelier', 9.6, 33, { h: 2.4, drop: 0.5, r: 0.5, n: 6 });
      P('guard', 'Hall guard', null, 13.6, 24.9, { fixed: [-1, 0.3] }); P('noble', 'The Steward', ['eat', 'drink'], 10.8, 25); for (let i = 0; i < 4; i++) P('noble', null, ['eat'], 10.8, 17 + i * 2, { fem: i % 2 === 0 });
      P('villager', 'Harper', ['play'], 11.6, 27.9, { top: 0x6a3a7a, hat: 2 }); for (let i = 0; i < 3; i++) P('villager', ['Head cook', 'Cook', 'Baker'][i], ['cook'], 8 + i * 1.5, 32, { apron: true, hat: i ? 0 : 3 }); P('villager', 'Butler', ['drink', 'cook'], 11.6, 35.4, { top: 0x3a3a4a }); for (let i = 0; i < 2; i++) P('villager', 'Server', ['eat', 'drink'], 9.4, 26 + i, { apron: true });
    } };

  /* =====================================================================
   *  BARRACKS  (inside 54.5..75.5 x 17.1..25.1)
   * ===================================================================== */
  Rooms.BK0 = { name: 'Barracks', blurb: 'Dormitory, armoury, the training room and the captain\'s office, off one passage.',
    wallX: [onX('BK', 23.4, GL)], wallY: [onY('BK', 63.3, { w: 12, h: 30, y: 62 }), onY('BK', 68.6), onY('BK', 74.6, { w: 12 })],
    build(c) { const { F, P, fl, part } = kit(c), y0 = 17.1;
      fl(54.5, y0, 61, 22, pine); fl(61, y0, 65.5, 22, flags); fl(65.5, y0, 71.5, 22, sand); fl(71.5, y0, 75.5, 22, walnut); fl(54.5, 22, 75.5, 25.1, flags);
      part('y', 61, y0, 22); part('y', 65.5, y0, 22, { seed: 24 }); part('y', 71.5, y0, 22, { seed: 25 });
      // dormitory
      for (let i = 0; i < 3; i++) F('bunk', 55.8 + i * 1.8, y0 + 0.15, { c: i % 2 ? 0x6a3a34 : 0x3a4a6a }); F('bunk', 54.65, 20.1, { face: 'x' }); F('chest', 58.8, 19.2, { s: 0.8 }); F('rug', 56.6, 20.2, { w: 3.6, d: 1.5, pat: 'stripe', c: 0x6a3a34 }); F('torch', 54.5, 18.6, { face: 'x', h: 1.8 });
      // armoury
      F('weaponRack', 61.25, y0 + 0.1, { w: 1.5 }); F('weaponRack', 62.9, y0 + 0.1, { w: 1.5, kind: 'spears', seed: 3 }); F('shieldWall', 64.8, y0, { n: 1, h: 2.1 }); F('shieldWall', 62.6, y0, { n: 4, h: 2.5, seed: 2, spears: false });
      F('armourStand', 61.8, 20.2); F('armourStand', 63, 20.2, { plume: 0xc8372f }); F('armour', 64.8, 18, { face: '-x' }); F('grindstone', 63.6, 21.2, { s: 0.85 }); F('chest', 64.5, 20, { face: '-x' });
      // training room
      F('sparRing', 65.8, y0 + 0.3, { w: 3.2, d: 3.2 }); F('dummy', 70.2, 18); F('dummy', 70.6, 19.6); F('weights', 69.4, 21.2, { s: 0.9 }); F('weaponRack', 66, 21.4, { w: 1.3, kind: 'swords', shields: false, seed: 9, s: 0.9 }); F('chandelier', 68.6, 19.6, { h: 2.6, drop: 0.5, r: 0.6 });
      // captain's office
      F('fireplace', 72.8, y0, { w: 1.6, h: 3.0, seed: 3 }); F('bookcase', 74.2, y0 + 0.1, { w: 1.2, seed: 6 }); F('desk', 72.6, 19.4, { s: 0.9 }); F('chest', 71.75, 21.2, { face: 'x' }); F('banner', 71.9, y0, { h: 3.0, len: 1.5 }); F('cot', 74.75, 19.4, { c: 0x34508f, s: 0.9 });
      // passage
      F('runner', 61.6, 23, { face: 'x', len: 13, w: 1.1, c: 0x6a3a34 }); F('bench', 55, 24.5, { len: 2.4, face: '-y', back: true }); F('roundTable', 57.6, 23.4, { r: 0.45, stools: 3, kind: 'drink', food: true }); F('brazier', 62.4, 24.5); F('waterBarrel', 75, 24.5); F('archeryButt', 74.9, 22.6, { face: '-x', range: 7 }); F('bench', 64, 24.5, { len: 2.4, face: '-y', back: true }); F('candelabra', 70, 24.6, { iron: true });
      P('guard', 'The Captain', ['work', 'read'], 73.4, 21); P('villager', 'Armourer', ['work'], 63, 21.6, { apron: true, fem: false }); for (let i = 0; i < 3; i++) P('guard', 'Guard in training', ['train'], 67 + i * 1.5, 22.6); for (let i = 0; i < 3; i++) P('guard', 'Off-duty guard', ['drink', 'sleep', 'sit'], 56 + i, 22.6);
      P('guard', 'Door guard', null, 58.8, 24.4, { fixed: [0.3, 1] });
    } };

  /* =====================================================================
   *  CHAPEL  (inside 6.5..15.5 x 45.1..62.1; altar at the north end)
   * ===================================================================== */
  const cg = (o) => Object.assign({ k: 'glass', y: 50, w: 22, h: 110 }, o || {});
  Rooms.CH0 = { name: 'Chapel', blurb: 'Nave and chancel under stained glass, with the vestry beside the altar and the founder\'s tomb in the side chapel.',
    wallX: [48, 51.4, 54.8, 58.2].map(y => onX('CH', y, cg())).concat([onX('CH', 61, cg({ w: 14, h: 80 }))]), wallY: [onY('CH', 11, cg({ y: 76, w: 36, h: 96 })), onY('CH', 8, cg({ w: 16, h: 90 }))],
    build(c) { const { z, F, P, fl, part, dais } = kit(c), y0 = 45.1;
      fl(6.5, y0, 15.5, 62.1, (x, y) => (x > 10.2 && x < 11.8 ? chk(x, y) : flags(x, y)));
      dais(6.5, y0, 13, 49.6, 0.2, marble); dais(8.4, y0, 13, 48.4, 0.4, marble); Kit.rug(10, 47, 12, 48.4, z + 0.4); Kit.rug(10, 48.4, 12, 49.6, z + 0.2, RED, RED, 0x7a1c22);
      F('altar', 10.25, 45.5, {}, 0.4); F('candelabra', 9, 45.7, {}, 0.4); F('statue', 7.2, 45.8, { kind: 'angel', gilt: true, c: 0xd8d2c8 }, 0.2); F('lectern', 8.6, 48.8, {}, 0.2); F('banner', 9.3, y0, { h: 4.4, len: 2, c: 0xe8e2d4, c2: GOLD, dev: 'cross' }); F('banner', 12.7, y0, { h: 4.4, len: 2, c: 0xe8e2d4, c2: GOLD, dev: 'cross' });
      // vestry beside the altar
      part('y', 13.13, y0, 49.6, { gaps: [[47.6, 49]] }); Kit.floor(13.26, y0, 15.5, 49.6, oak, z + 0.012, { noWalk: true }); F('wardrobe', 13.4, y0 + 0.1, { w: 1.0 }); F('chest', 14.7, 46.2, { face: '-x' }); F('sconce', 14.9, y0, { h: 1.6 }); F('shelves', 14.5, y0 + 0.1, { w: 0.9, h: 1.2, seed: 3 });
      // nave
      F('runner', 10.4, 49.8, { len: 12.2, w: 1.2 }); for (let r = 0; r < 4; r++) F('pew', 7.2, 50.6 + r * 1.7, { len: 2.8, face: '-y' }); for (let r = 0; r < 5; r++) F('pew', 12.1, 50.6 + r * 1.7, { len: 2.8, face: '-y' });
      F('chandelier', 11, 52.4, { h: 3.2, drop: 1.2, r: 0.7, n: 8, gold: true }); F('chandelier', 11, 57.6, { h: 3.2, drop: 1.2, r: 0.7, n: 8, gold: true }); F('torch', 6.5, 49.7, { face: 'x', h: 1.9 }); F('torch', 6.5, 56.5, { face: 'x', h: 1.9 });
      // side chapel with the founder's tomb, font by the door
      part('x', 57.6, 6.5, 9.9, { gaps: [[8.4, 9.77]], seed: 24 }); F('sarcophagus', 6.75, 58.2, { face: 'x', c: 0xc0bab0 }); F('candelabra', 6.9, 59.6, { n: 3 }); F('statue', 7.2, 61.3, { kind: 'knight', c: 0xa8a49c, s: 0.9, face: 'x' }); F('vase', 9.4, 61.6, { stand: true, c: 0xf0ece0 });
      F('font', 13.6, 60.4); F('candelabra', 14.9, 61.5, { iron: true }); F('stoneBench', 14.9, 58.2, { face: '-x', len: 1.6 });
      P('monk', 'The Chaplain', ['pray', 'work', 'read'], 11, 49, { dz: 0.2 }); for (let i = 0; i < 2; i++) P('monk', null, ['pray', 'read'], 10.6 + i * 0.8, 50.4); P('villager', 'Sexton', ['work', 'pray'], 14.3, 48.4, { fem: false, top: 0x4a4a52 });
      for (let i = 0; i < 5; i++) P(i % 3 === 0 ? 'noble' : 'villager', i % 3 === 0 ? null : 'Worshipper', ['pray'], 11, 52 + i * 1.6);
    } };

  /* =====================================================================
   *  BATH HOUSE & GAMES HALL  (inside 21.5..36.5 x 45.1..54.1)
   * ===================================================================== */
  Rooms.RC0 = { name: 'Bath House & Games Hall', blurb: 'The baths, with a raised pool, and next door the games hall: tables, cards, darts and music.',
    wallX: [onX('RC', 47.6, GL), onX('RC', 52.2, GL)], wallY: [onY('RC', 29.6, { y: 50, h: 40 }), onY('RC', 35.6, { y: 50, h: 40, w: 14 })],
    build(c) { const { z, F, P, fl, part, dais } = kit(c), y0 = 45.1;
      fl(21.5, y0, 28.4, 54.1, pale); fl(28.4, y0, 36.5, 54.1, oak);
      part('y', 28.4, y0, 51, {});
      // baths: a pool raised two steps in the back corner
      dais(21.5, y0, 27.4, 50.6, 0.2, pale, 0xb8c4c0);
      for (const r of [[21.5, y0, 5.3, 0.8], [21.5, 49.2, 5.3, 0.8], [21.5, 45.9, 0.8, 3.3], [26, 45.9, 0.8, 3.3]]) { B.box(r[0], r[1], z + 0.2, r[2], r[3], 0.2, { side: T.facade, P: STONE(76, { band: 0, tint: 0xc8d0cc }), top: (s, t) => marble(s + r[0], t + r[1]) }); Kit.walk(r[0], r[1], r[0] + r[2], r[1] + r[3], z + 0.4); }
      E.quad([22.3, 45.9, z + 0.34], [3.7, 0, 0], [0, 3.3, 0], (s, t) => T.water(s + 22, t + 45), { n: [0, 0, 1], noShadow: true }); B.blocks.push([22.3, 45.9, 3.7, 3.3, z + 0.2]); E.addLight(24.2, 47.6, z + 1, 4, [0.5, 0.8, 0.9], 0.5);
      F('statue', 26.4, 45.6, { kind: 'urn', ph: 0.3, s: 0.7, c: 0xd0cabc }, 0.4); F('brazier', 26.4, 49.6, { s: 0.8 }, 0.4); F('sconce', 24.2, y0, { h: 2.0 }); F('torch', 21.5, 50.4, { face: 'x', h: 1.9 });
      F('bathTub', 22.5, 52.6, { s: 0.9 }); F('bathTub', 24.3, 52.9, { s: 0.9 }); F('washstand', 27.75, 45.3, { face: '-x' }); F('screen', 25.4, 51.5, { len: 1.6 }); F('bench', 27.9, 47.4, { face: '-x', len: 2, back: true }); F('plant', 27.8, 50.2, { kind: 'fern', pot: 0x4a6a8a });
      // games hall
      F('fireplace', 32.6, y0, { w: 1.9, h: 3.0, seed: 6 }); F('dartBoard', 30.6, y0, { range: 1.9, h: 1.3 }); F('stagHead', 34.6, y0, { h: 2.6 });
      B.box(30.4, 48.2, z, 2.2, 1.2, 0.5, { side: T.wood, P: { c: 0x5c3f2c }, top: (s, t, q, a, b) => { const e = Math.min(a * 2.2, (1 - a) * 2.2, b * 1.2, (1 - b) * 1.2); return e < 0.08 ? 0x7a5a3c : e < 0.1 ? 0x1a3020 : mul(0x2f7a48, 0.94 + h2(Math.floor(s * 32) >> 1, Math.floor(t * 32) >> 1) * 0.1); } }); B.blocks.push([30.4, 48.2, 2.2, 1.2, z]);
      [[30.9, 48.6, 0xe8e2d4], [31.6, 48.9, 0xc8372f], [31.9, 48.6, 0xe0b040], [32.1, 49.1, 0x2a2630]].forEach(p => E.blob([p[0], p[1], z + 0.54], 0.045, () => p[2], { noShadow: true, f: E.F_NOAO }));
      B.pois.push({ x: 31.5, y: 49.75, z, kind: 'play', fx: 0, fy: -1 }, { x: 31.5, y: 47.85, z, kind: 'play', fx: 0, fy: 1 });
      F('cardTable', 34.7, 49.6); F('gameTable', 30.4, 52.8, { face: 'x', s: 0.9 }); F('harp', 35.4, 52.8); F('lute', 34.2, 53.4); F('drum', 33, 53.2, { s: 0.9 }); F('bench', 35.9, 46, { face: '-x', len: 2, back: true });
      F('rug', 33.2, 48.2, { w: 3, d: 2.9, pat: 'diamond', c: 0x2f6a44, c2: 0xe8c890, c3: 0x1a3020 }); F('chandelier', 32.4, 49.6, { h: 2.6, drop: 0.5, r: 0.7 }); F('cask', 28.7, 45.3, { s: 0.75 }); F('candelabra', 36, 53.5);
      for (let i = 0; i < 2; i++) P('villager', 'Bath attendant', ['bathe', 'drink'], 25 + i, 51.6, { apron: true }); P('noble', null, ['bathe', 'sit'], 27, 52.4, { fem: true });
      for (let i = 0; i < 3; i++) P('noble', null, ['play', 'sit', 'drink'], 31 + i, 51, { fem: i === 1 }); P('villager', 'Minstrel', ['play'], 34.4, 52.4, { top: 0x8a2a6a, hat: 2 }); P('guard', 'Off-duty guard', ['play', 'drink', 'sit'], 30, 50.4);
    } };
})();
