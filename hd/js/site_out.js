'use strict';
/* Castle layout 3: the grounds (great court, lower bailey, garden terrace) in master-plan coordinates. */
(function () {
  const h2 = E.h2, CS = Kit.CS, use = Site.use, F = Site.feat, RED = 0xb8323a, BLUE = 0x34508f, GOLD = 0xd9a83a, norm = E.norm;
  const H = 4.0, HG = 3.0;                                  // curtain wall heights: castle, garden terrace
  const gravel = (x, y) => h2(Math.floor(x * 32) >> 1, Math.floor(y * 32) >> 1) < 0.5 ? 0xcfc4a8 : 0xbdb294;
  Site.groundTex = function (x, y) {
    const n = T.fbm(x * 0.5, y * 0.5);
    if (x < 43.5 && y < 43.5) { const r = Math.hypot(x - 28.5, y - 28.5); if (x > 15 && y > 15 && r > 2.2 && r < 6.6 && Math.abs(x - 28.5) > 1.1 && Math.abs(y - 28.5) > 1.1) return T.grass(x, y); return n > 0.74 ? T.cobble(x, y) : Kit.paving(x, y); }   // court and under the keep
    if (y < 43.5) return (y > 28.5 && y < 40.5 && x > 49 && x < 77) ? T.dirt(x, y) : n > 0.6 ? T.dirt(x, y) : T.cobble(x, y);                     // bailey, with the drill ground
    if ((x > 17 && x < 20 && y < 57.6) || (y > 55.6 && y < 57.6 && x > 4.6 && x < 44) || (x > 20 && x < 22 && y > 57 && y < 72)) return gravel(x, y);   // garden walks
    return T.grass(x, y);
  };
  const hedge = (x, y, w, d, o) => { if (!(w >= d ? use('hedge', x, y, 0, Object.assign({ len: w, w: d, h: 0.7 }, o || {})) : use('hedge', x, y, 0, Object.assign({ len: d, w: w, h: 0.7, face: 'x' }, o || {})))) { B.box(x, y, 0, w, d, 0.6, { side: T.flat(0x356e3a), top: T.flat(0x4d9440) }); B.block(x, y, w, d, 0); } };
  function leanTo(x0, x1, yw, depth, zh, drop, pal, seed) { E.quad([x0, yw + depth, zh - drop], [x1 - x0, 0, 0], [0, -depth, drop], T.roof, { P: { pal, seed }, n: norm([0, drop, depth]) }); E.quad([x0, yw + depth, zh - drop - 0.14], [x1 - x0, 0, 0], [0, 0, 0.14], T.flat(0x5a4030), { n: [0, 1, 0], noShadow: true }); }
  // a flight up to a wall-walk, with its landing.  The wall must leave its parapet open at [x1, x1 + 1.2]
  function wallStair(x, yw, len, h, seed) { Kit.stairs(x, yw - 1.2, len, 1.2, '+x', 0, h); B.box(x + len, yw - 1.2, 0, 1.2, 1.2, h, { side: T.facade, P: CS(seed, { band: 0 }), top: Kit.paving }); Kit.walk(x + len, yw - 1.2, x + len + 1.2, yw + 0.5, h); B.block(x + len, yw - 1.2, 1.2, 1.2, 0); }

  Site.grounds.push(function (a) {
    const b = a.bounds, near = (x0, y0, x1, y1) => x1 > b[0] - 8 && x0 < b[2] + 8 && y1 > b[1] - 8 && y0 < b[3] + 8;
    const out = !a.open, P = o => { if (out && o.at[0] > b[0] + 0.5 && o.at[0] < b[2] - 0.5 && o.at[1] > b[1] + 0.5 && o.at[1] < b[3] - 0.5) Kit.person(o); };
    const slit = (x, y) => F.slit(x, y || 60);
    // when a building is cut open, leave out the yard furniture standing in front of it, so the rooms can be seen
    const ob = a.open ? Site.BLD[Site.KEYS[a.open][0]] : null, hide = (x, y) => ob && x > ob.x0 - 1 && y > ob.y0 - 1 && (x > ob.x1 - 0.2 || y > ob.y1 - 0.2) && x < ob.x1 + 6 && y < ob.y1 + 6;
    const use = (name, x, y, ...r) => hide(x, y) ? true : Site.use(name, x, y, ...r), lamp = (x, y) => { if (!hide(x, y)) B.lamp(x, y); }, tree = (x, y, o) => { if (!hide(x, y)) B.tree(x, y, o); };

    /* ---------------- walls and towers: one circuit round all three enclosures ---------------- */
    Kit.curtain('y', 42, 3.9, 43.5, H, 1.5, { seed: 51, gate: [27.2, 28.8], feats: [F.arch(0.392, 40, 80, false)] });                       // court | bailey
    Kit.curtain('x', 42, 4, 42, H, 1.5, { seed: 53, gate: [17.7, 19.3], feats: [F.arch(0.3816, 40, 80, false)], openLo: [[36, 37.2]] });   // court | garden
    Kit.curtain('x', 2.4, 40, 43.5, H, 1.5, { seed: 55 });                                                                                 // north of the court
    Kit.curtain('x', 10, 43.5, 90, H, 1.5, { seed: 57, feats: [slit(0.2), slit(0.5), slit(0.8)] });                                         // bailey north
    Kit.curtain('y', 88.5, 10, 43.5, H, 1.5, { seed: 59, feats: [slit(0.15), slit(0.85)] });                                                // bailey east
    Kit.curtain('x', 42, 43.5, 90, H, 1.5, { seed: 61, feats: [slit(0.15), slit(0.4), slit(0.65), slit(0.9)], openLo: [[76, 77.2]] });      // bailey south
    Kit.curtain('y', 44.5, 43.5, 74, HG, 1.5, { seed: 63, feats: [slit(0.2, 40), slit(0.5, 40), slit(0.8, 40)] });                          // garden east
    Kit.curtain('x', 72.5, 2.5, 46, HG, 1.5, { seed: 65, feats: [slit(0.2, 40), slit(0.5, 40), slit(0.8, 40)], openLo: [[30, 31.2]] });     // garden south
    Kit.curtain('y', 2.5, 43.5, 74, HG, 1.5, { seed: 67 });                                                                                // garden west
    Kit.tower(42.75, 3.3, 2.0, 7.2, { seed: 20, n: 12, roof: T.ROOF_SLATE, flag: BLUE, levels: [120, 220] });
    Kit.tower(42.9, 42.9, 2.1, H - 0.5, { seed: 9, flag: RED, n: 14 });                                         // the meeting of three walls: a platform level with the walks
    Kit.tower(89.2, 10.8, 2.1, 6.6, { seed: 21, n: 12, roof: T.ROOF_SLATE, flag: BLUE, levels: [120, 210] });
    Kit.tower(89.2, 42.8, 2.1, H - 0.5, { seed: 10, flag: BLUE, n: 14 });
    Kit.tower(45.2, 73.2, 1.9, HG - 0.5, { seed: 11, flag: RED });
    Kit.tower(3.3, 73.2, 1.9, 5.0, { seed: 12, n: 12, roof: T.ROOF_SLATE, flag: BLUE, levels: [90, 160] });
    wallStair(30, 42, 6, H, 8); wallStair(70, 42, 6, H, 8); wallStair(25.5, 72.5, 4.5, HG, 8);
    // gatehouse on the east wall: the road to the village (not built yet)
    Kit.block(87.4, 24.4, 3.8, 7.2, 6.2, { seed: 44, fx: [F.arch(0.5, 48, 96, false), slit(0.14, 170), slit(0.86, 170)], fy: [slit(0.5, 150)] });
    B.flags.push({ x: 89.3, y: 28, z: 6.2, c: RED, pole: 2.2 });
    for (const g of [[52, 10.75, H], [70, 10.75, H], [89.25, 18, H], [89.25, 37, H], [60, 42.75, H], [42.75, 20, H], [42.75, 36, H], [24, 42.75, H], [42.9, 42.9, H], [89.2, 42.8, H], [45.25, 60, HG], [14, 73.25, HG], [36, 73.25, HG], [86.5, 26.2, 0], [86.5, 29.8, 0], [41.2, 26.6, 0], [41.2, 29.4, 0]]) P({ role: 'guard', name: 'Guard', at: g, fixed: [g[0] > 80 ? -1 : 0.6, 0.8] });

    /* ---------------- the great court ---------------- */
    if (near(15, 15, 42, 42)) {
      if (a.open !== 'W-1') {
      // the outside stair to the throne room door on the first floor of the west range
      B.box(15, 30.4, 0, 3.4, 1.6, 3.2, { side: T.facade, Px: CS(46, { band: 0, quoin: true }), Py: CS(47, { band: 0, quoin: true, feats: [F.slit(0.5, 40)] }), top: Kit.paving }); Kit.walk(15, 30.4, 18.4, 32, 3.2); B.block(15, 30.4, 3.4, 1.6, 0);
      Kit.stairs(15.2, 32, 1.6, 4.8, '-y', 0, 3.2);
      for (const p of [[18.15, 30.4, 0.25, 1.6], [15, 30.4, 3.15, 0.2]]) B.box(p[0], p[1], 3.2, p[2], p[3], 0.5, { side: T.facade, P: CS(48, { band: 0 }), top: T.flat(0xb4ad9e) });
      if (!(a.open === 'W1')) { B.box(15, 30.7, 3.2, 0.07, 1.0, 1.55, { side: T.flat(0xb0a898), top: T.flat(0xb0a898) }); B.box(15.07, 30.8, 3.2, 0.03, 0.8, 1.4, { side: (s, t) => (Math.floor(s * 32) % 8 === 0 ? 0x3a2618 : 0x5e4028), noTop: true }); E.addLight(15.8, 31.2, 5.2, 4, [1, 0.72, 0.4], 0.8); }
      }
      use('torch', 15.02, 29.9, 0, { h: 4.9, face: 'x' }); use('torch', 15.02, 27.0, 0, { h: 1.9, face: 'x' }); use('torch', 15.02, 25.0, 0, { h: 1.9, face: 'x' });
      // fountain garden at the crossing of the walks
      const CX = 28.5, CY = 28.5;
      if (!use('fountain', CX, CY, 0, { r: 1.25, tiers: 2 })) B.cyl(CX, CY, 0, 1.2, 0.5, 12, T.flat(0xb8b0a2), {});
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const cx = CX + sx * 3.5, cy = CY + sy * 3.5;
        if (!use('flowerbed', cx - 1.2, cy - 1.2, 0, { w: 2.4, d: 2.4, seed: sx * 3 + sy + 5, kind: ['roses', 'tulips', 'lavender', 'white'][(sx + 1) + (sy + 1) / 2] })) B.bush(cx, cy, {});
        use('topiary', cx + sx * 1.9, cy + sy * 1.9, 0, { kind: 'cone', pot: false }); }
      for (const p of [[CX - 1, CY - 7.6, 'y'], [CX - 7.6, CY - 1, 'x']]) use('stoneBench', p[0], p[1], 0, { face: p[2] });
      // the north range front
      use('statue', 25.0, 16.6, 0, { kind: 'king' }); use('statue', 29.0, 16.6, 0, { kind: 'knight' });
      for (const x of [22.4, 31.6]) use('banner', x, 15.02, 0, { h: 6.0, face: 'y', c: RED, len: 2.6 });
      use('brazier', 25.6, 15.9, 0, {}); use('brazier', 28.4, 15.9, 0, {});
      for (const p of [[18.6, 17.6], [34.5, 16.6], [38.6, 16.8]]) use('plant', p[0], p[1], 0, { kind: 'tree', s: 1.5 });
      use('well', 37.5, 21, 0, { roof: true }); use('sundial', 21, 37, 0, {}); tree(38.6, 37.2, { s: 1.4, pal: T.LEAF_D, flowers: null, n: 10 }); tree(21.4, 21.2, { s: 1.1, flowers: T.BLOSSOM });
      use('stack', 39.6, 24.2, 0, { kind: 'barrels' }); use('roseArch', 17.65, 40.4, 0, {});
      for (const p of [[23.4, 17.2], [31, 17.2], [40.6, 26.4], [40.6, 29.6], [20.2, 40.6], [16.6, 24.6], [16.6, 27.4], [34, 34], [23, 34]]) lamp(p[0], p[1]);
      for (const g of [[26.0, 16.4], [28.0, 16.4], [16.2, 24.9], [16.2, 27.1], [17.2, 31.6, 3.2], [9.5, 9.5, 13.3]]) P({ role: 'guard', name: 'Guard', at: [g[0], g[1], g[2] || 0], fixed: [0.6, 0.8] });
      P({ role: 'noble', name: 'Courtier', kinds: ['sit'], at: [26, 22, 0] }); P({ role: 'noble', fem: true, name: 'Lady of the court', kinds: ['sit', 'tend'], at: [31, 25, 0] });
      P({ role: 'villager', name: 'Gardener', apron: true, hat: 1, kinds: ['tend'], at: [25, 31, 0] }); P({ role: 'villager', name: 'Page', kinds: ['sit', 'tend'], at: [34, 22, 0] }); P({ role: 'monk', name: 'Scribe', kinds: ['sit'], at: [22, 26, 0] });
    }

    /* ---------------- the lower bailey ---------------- */
    if (near(43.5, 10, 90, 43.5)) {
      // smithy against the north wall
      B.house({ x: 45.4, y: 11.5, w: 5.2, d: 4.0, floors: 0, h0: 2.0, base: 'stone', axis: 'x', roof: T.ROOF_BROWN, rise: 1.8, seed: 88, tint: 0x8a7a6a, fy: [{ k: 'open', x: 0.4, w: 36, h: 50, trim: 0x6a5a4a, lit: true, lamp: false }, F.win(0.82, { box: false })] });
      use('anvil', 46.8, 16.6, 0, {}); use('forge', 48.8, 16.0, 0, { face: 'y' }); use('grindstone', 45.2, 17.4, 0, {}); B.barrel(50.9, 16.1);
      B.pois.push({ x: 47.4, y: 17.3, z: 0, kind: 'smith', fx: -0.4, fy: -1 });
      // stables: stalls under a lean-to on the north wall
      for (let i = 0; i < 5; i++) use('horseStall', 78.4 + i * 1.8, 11.7, 0, { face: 'y', coat: ['bay', 'grey', 'chestnut', 'black', 'dun'][i] });
      leanTo(78.1, 87.7, 11.5, 3.3, 3.5, 1.1, T.ROOF_BROWN, 7); for (let i = 0; i <= 5; i++) B.box(78.3 + i * 1.8, 14.5, 0, 0.14, 0.14, 2.4, { side: T.wood, P: { c: 0x6a4a34 } });
      use('hayBale', 76.6, 12.4, 0, { n: 3 }); use('trough', 79.2, 16.0, 0, {}); use('saddleRack', 83, 15.6, 0, {});
      B.pois.push({ x: 81.2, y: 16.2, z: 0, kind: 'stable', fx: 0, fy: -1 }, { x: 84.8, y: 16.2, z: 0, kind: 'stable', fx: 0, fy: -1 });
      // drill ground south of the barracks
      use('sparRing', 54, 31, 0, { w: 3.6, d: 3.2 });
      for (const p of [[51, 36.4], [51, 33.8], [60.6, 36.2]]) use('dummy', p[0], p[1], 0, {});
      for (const p of [[64.4, 30.2], [67.4, 30.0], [70.4, 30.2]]) use('archeryButt', p[0], p[1], 0, { face: 'y', range: 5 });
      use('weaponRack', 74.6, 30.4, 0, { face: 'x' }); use('weaponRack', 74.6, 32.6, 0, { face: 'x' }); use('weights', 60.4, 30.2, 0, {}); use('armour', 58, 26.4, 0, {});
      use('banner', 57, 25.62, 0, { h: 3.0, face: 'y', c: BLUE, len: 1.6 }); use('banner', 63, 25.62, 0, { h: 3.0, face: 'y', c: BLUE, len: 1.6 });
      // yard dressing
      use('well', 49, 22.6, 0, { roof: true }); B.cart(81, 22); tree(83, 37, { s: 1.4, pal: T.LEAF_D, flowers: null, n: 10 }); tree(46.6, 38.4, { s: 1.2 });
      use('stack', 52.6, 12.4, 0, { kind: 'barrels' }); use('stack', 85.6, 33, 0, { kind: 'crates' }); B.sack(54.6, 13.2); use('stack', 77.4, 26.4, 0, { kind: 'sacks' });
      for (const p of [[45.4, 26.2], [45.4, 29.8], [52, 26.6], [68, 26.6], [78, 27], [85.6, 24.6], [85.6, 31.4], [62, 14.4], [76.4, 38.6], [48.4, 34]]) lamp(p[0], p[1]);
      for (let i = 0; i < 12; i++) B.bush(79 + h2(i, 1) * 8, 34.5 + h2(i, 2) * 6, { s: 0.8 + h2(i, 3) * 0.4, noBlock: true });
      P({ role: 'villager', name: 'Blacksmith', apron: true, kinds: ['smith'], at: [47.6, 17.6, 0] });
      for (let i = 0; i < 2; i++) P({ role: 'villager', name: 'Groom', hat: 1, kinds: ['stable'], at: [81 + i * 3, 17, 0] });
      for (let i = 0; i < 5; i++) P({ role: 'guard', name: 'Man-at-arms', kinds: ['train'], at: [53 + i * 3.2, 34 + (i & 1) * 2, 0] });
      P({ role: 'guard', name: 'Serjeant', at: [58.6, 27.4, 0], fixed: [0.2, 1] });
    }

    /* ---------------- the garden terrace ---------------- */
    if (near(4, 43.5, 44.5, 72.5)) {
      use('roseArch', 17.65, 44.2, 0, {});
      // cloister walk along the chapel's east side
      for (let y = 46; y <= 62; y += 2) if (!use('column', 17.0, y, 0, { h: 2.4, r: 0.15 })) B.cyl(17.0, y, 0, 0.15, 2.4, 8, T.flat(0xb8b0a2), {});
      if (a.open !== 'CH0') E.quad([16, 45.2, 3.3], [0, 17.6, 0], [1.25, 0, -0.75], T.roof, { P: { pal: T.ROOF_SLATE, seed: 3 }, n: norm([0.75, 0, 1.25]) });
      for (const y of [49, 55, 61]) use('torch', 16.02, y, 0, { h: 1.7, face: 'x' });
      use('statue', 12.8, 63.9, 0, { kind: 'angel' }); use('statue', 9.2, 63.9, 0, { kind: 'maiden' });
      // lily pond and pavilion east of the bath house
      use('pond', 38.2, 49.4, 0, { w: 5.2, d: 3.6 });
      const GX = 41, GY = 46.6; B.cyl(GX, GY, 0, 1.9, 0.22, 12, T.facade, { P: CS(61, { band: 0, tint: 0xc0b8a8 }), top: Kit.paving }); Kit.walk(GX - 1.3, GY - 1.3, GX + 1.3, GY + 1.3, 0.22);
      for (let i = 0; i < 6; i++) { const an = i / 6 * 6.283 + 0.52; if (!use('column', GX + Math.cos(an) * 1.6, GY + Math.sin(an) * 1.6, 0.22, { h: 2.2, r: 0.12 })) B.cyl(GX + Math.cos(an) * 1.6, GY + Math.sin(an) * 1.6, 0.22, 0.12, 2.2, 6, T.flat(0xb8b0a2), {}); }
      B.cyl(GX, GY, 2.42, 1.95, 0.16, 12, T.flat(0xb4ad9e), {}); B.cone(GX, GY, 2.58, 2.1, 1.5, 12, T.roof, { P: { pal: T.ROOF_SLATE, seed: 2 } }); B.pois.push({ x: GX, y: GY, z: 0.22, kind: 'sit', fx: -1, fy: 0.2 });
      // hedge maze with a fountain at its heart
      const MX = 33.5, MY = 64.6, R = 6, hz = (x, y, w, d) => hedge(MX + x, MY + y, w, d, { h: 0.95 });
      hz(-R, -R, R - 0.8, 0.5); hz(0.8, -R, R - 0.8, 0.5); hz(-R, R - 0.5, 2 * R, 0.5); hz(-R, -R + 0.5, 0.5, 2 * R - 1); hz(R - 0.5, -R + 0.5, 0.5, 2 * R - 1);
      hz(-4.2, 3.7, 6.6, 0.5); hz(-4.2, -1.9, 0.5, 5.6); hz(-4.2, -4.2, 3.2, 0.5); hz(0.8, -4.2, 3.4, 0.5); hz(3.7, -3.7, 0.5, 6.1);
      hz(-2.4, -1.9, 0.5, 4.3); hz(-1.9, 1.9, 3.8, 0.5); hz(-2.4, -2.4, 3.0, 0.5); hz(1.9, -2.4, 0.5, 3.0);
      if (!use('fountain', MX, MY + 0.2, 0, { r: 0.8 })) B.bush(MX, MY, {});
      // orchard, kitchen garden and bees in the south-west
      for (let i = 0; i < 8; i++) { const x = 6.6 + (i % 4) * 3.3, y = 65.6 + ((i / 4) | 0) * 3.4; if (!use('orchardTree', x, y, 0, { seed: i, kind: ['apple', 'pear', 'plum', 'cherry'][i % 4], blossom: i % 3 === 0 })) tree(x, y, { s: 0.9, flowers: T.APPLE, fp: 0.04 }); }
      use('vegPatch', 22.6, 58.6, 0, { w: 3.6, d: 2.2 }); use('vegPatch', 22.6, 61.6, 0, { w: 3.6, d: 2.2 }); use('beehive', 22.9, 65, 0, {}); use('beehive', 23.3, 66.2, 0, {}); use('dovecote', 24.6, 69.4, 0, {});
      use('laundry', 38.6, 55.4, 0, { len: 2.4 });
      // rose walk, beds, benches
      for (const x of [23.6, 27, 30.4, 33.8]) use('roseArch', x, 56.2, 0, { face: 'x' });
      for (const p of [[20.2, 46, 'roses'], [20.2, 50, 'lavender'], [20.2, 54, 'tulips']]) use('flowerbed', p[0] - 0.05, p[1], 0, { w: 0.8, d: 2.6, kind: p[2] });
      for (const y of [46.4, 49.4, 52.4]) use('topiary', 16.6 + 0.9, y + 1.4, 0, { kind: 'ball', pot: false });
      for (const x of [22.5, 26, 32, 35.5]) use('topiary', x, 55.3, 0, { kind: x > 30 ? 'spiral' : 'cone', pot: false });
      use('stoneBench', 26.6, 57.8, 0, {}); use('stoneBench', 8, 57.8, 0, {}); use('sundial', 41.4, 53.6, 0, {}); use('birdBath', 42.4, 58.6, 0, { bird: true }); use('gardenStatue', 18.5, 59.6, 0, { kind: 'maiden' });
      for (const p of [[17.2, 45], [19.8, 57.9], [28, 55.2], [30, 55.2], [10, 64.2], [12, 64.2], [42.6, 55], [21.4, 70.6]]) lamp(p[0], p[1]);
      tree(42, 69.4, { s: 1.5, pal: T.LEAF_D, flowers: null, n: 10 }); tree(5.6, 64.2, { s: 1.1, flowers: T.BLOSSOM });
      for (let i = 0; i < 3; i++) P({ role: 'villager', name: 'Gardener', apron: true, hat: 1, kinds: ['tend'], at: [22 + i * 6, 57, 0] });
      P({ role: 'monk', name: 'Chaplain', kinds: ['sit', 'pray'], at: [11, 64.6, 0] }); P({ role: 'monk', name: 'Brother', kinds: ['sit'], at: [18.4, 52, 0] });
      P({ role: 'noble', name: 'Lady of the court', fem: true, kinds: ['sit', 'tend'], at: [39, 47, 0] }); P({ role: 'villager', name: 'Laundress', fem: true, apron: true, kinds: ['work', 'tend'], at: [39.4, 56.6, 0] });
    }
  });
})();
