'use strict';
/*
 * Castle layout 3: ONE master plan in ONE coordinate system.
 *
 * Every building has a real footprint and real storey heights.  Outdoors it is drawn closed.  When the
 * king goes in, the same world is drawn again with that building cut open at his storey: the storeys
 * below stay solid, the storeys above and the two near walls are lifted away, and the rooms sit exactly
 * inside the outer walls.  Doors and stairs are at the same world position on both sides, so nothing
 * moves when the view changes.  Each "area" is therefore just (a window onto the plan) + (which
 * building, if any, is open at which storey).
 *
 * Rooms are supplied separately:  Rooms[key] = { name, blurb, wallX: [feats], wallY: [feats], build(c) }
 * where c = { key, x0, y0, x1, y1 (inside faces of the outer walls), z (floor height), h (wall height) }.
 */
const Site = {}, Rooms = {};
(function () {
  const h2 = E.h2, CS = Kit.CS, Q = E.quad, norm = E.norm;
  const use = (name, ...args) => { if (typeof Fz !== 'undefined' && Fz[name]) { Fz[name](...args); return true; } return false; };
  const RED = 0xb8323a, BLUE = 0x34508f, GOLD = 0xd9a83a, WT = 0.5, FH = 3.2;
  const slit = (x, y) => ({ k: 'awin', x, y, w: 12, h: 26, frame: 0x4a4038, sill: 0xc4bcaa, box: false });
  const arch = (x, w, h, lit) => ({ k: 'gothic', x, w: w || 26, h: h || 58, trim: 0xc4bcaa, lit: lit !== false });
  const door = (x, o) => Object.assign({ k: 'door', x, w: 18, h: 44, trim: 0xb0a898 }, o || {});
  const win = (x, o) => Object.assign({ k: 'win', x, y: 24, w: 14, h: 24, sill: 0xb8ae9c, frame: 0x4d3528, curtain: 0xa84a3a }, o || {});
  const tall = (x, y, h) => ({ k: 'glass', x, y: y || 44, w: 18, h: h || 96 });
  const stoneP = (seed, o) => CS(seed, Object.assign({ quoin: true, band: 128 }, o || {}));
  Site.use = use; Site.feat = { slit, arch, door, win, tall };

  /* ---------- the plan (world units; z = height) ---------- */
  const BLD = Site.BLD = {
    T: { name: 'Great Tower', cx: 9.5, cy: 9.5, r: 5.5, x0: 5.1, y0: 5.1, x1: 13.9, y1: 13.9, floors: [0, 3.2, 6.4, 9.6], hs: [3.0, 3.0, 3.0, 3.0], top: 12.8 },
    N: { name: 'North Range', x0: 15, y0: 4, x1: 40, y1: 15, floors: [0, 3.2, 6.4], hs: [3.0, 3.0, 3.0], top: 9.6 },
    W: { name: 'West Range', x0: 4, y0: 15, x1: 15, y1: 38, floors: [-3.2, 0, 3.2], hs: [3.0, 3.0, 5.4], top: 8.8, base: -1 },
    BK: { name: 'Barracks', x0: 54, y0: 16.6, x1: 76, y1: 25.6, floors: [0], hs: [3.2], top: 3.4 },
    CH: { name: 'Chapel', x0: 6, y0: 44.6, x1: 16, y1: 62.6, floors: [0], hs: [4.6], top: 5.0 },
    RC: { name: 'Bath House', x0: 21, y0: 44.6, x1: 37, y1: 54.6, floors: [0], hs: [3.2], top: 3.4 },
  };
  // inside rectangle of a building
  const inner = b => [b.x0 + WT, b.y0 + WT, b.x1 - WT, b.y1 - WT];
  const KEYS = { 'T0': ['T', 0], 'T1': ['T', 1], 'T2': ['T', 2], 'T3': ['T', 3], 'N0': ['N', 0], 'N1': ['N', 1], 'N2': ['N', 2], 'W-1': ['W', 0], 'W0': ['W', 1], 'W1': ['W', 2], 'BK0': ['BK', 0], 'CH0': ['CH', 0], 'RC0': ['RC', 0] };
  Site.KEYS = KEYS;

  /* ---------- connections: the same world position on both sides ---------- */
  // doorways: [areaA, areaB, x, y, z, axis of travel ('x' = you cross it moving along x), label A->B, label B->A].  A is the side with the larger coordinate
  const DOORS = [
    ['court', 'N0', 27, 15, 0, 'y', 'North range', 'Great court'],
    ['court', 'W0', 15, 26, 0, 'x', 'Great hall', 'Great court'],
    ['court', 'W1', 15, 31.2, 3.2, 'x', 'Throne room', 'Great court', 0.8],        // last number: how far outside the trigger stands (the landing is small)
    ['N0', 'T0', 14.45, 9.5, 0, 'x', 'Great tower', 'North range'], ['N1', 'T1', 14.45, 9.5, 3.2, 'x', 'Great tower', 'North range'], ['N2', 'T2', 14.45, 9.5, 6.4, 'x', 'Great tower', 'Royal apartments'],
    ['W0', 'T0', 9.5, 14.45, 0, 'y', 'Great tower', 'Great hall'], ['W1', 'T1', 9.5, 14.45, 3.2, 'y', 'Great tower', 'Throne room'],
    ['bailey', 'BK0', 60, 25.6, 0, 'y', 'Barracks', 'Lower bailey'],
    ['garden', 'CH0', 11, 62.6, 0, 'y', 'Chapel', 'Garden terrace'],
    ['garden', 'RC0', 29, 54.6, 0, 'y', 'Bath house & games hall', 'Garden terrace'],
    ['bailey', 'court', 42.75, 28, 0, 'x', 'Great court', 'Lower bailey'],
    ['garden', 'court', 18.5, 42.75, 0, 'y', 'Great court', 'Garden terrace'],
  ];
  // flights of stairs: [lower area, upper area, x, y, w, d, direction it rises, z0, z1]
  const STAIRS = [
    ['T0', 'T1', 6.8, 5.6, 4.8, 1.2, '+x', 0, 3.2], ['T1', 'T2', 5.6, 6.9, 1.2, 4.8, '+y', 3.2, 6.4], ['T2', 'T3', 6.8, 5.6, 4.8, 1.2, '+x', 6.4, 9.6], ['T3', 'court', 5.6, 6.9, 1.2, 4.8, '+y', 9.6, 13.3],
    ['W-1', 'W0', 4.5, 30.6, 1.2, 4.8, '-y', -3.2, 0],
  ];
  Site.DOORS = DOORS; Site.STAIRS = STAIRS;
  function links(a) {
    const id = a.id, R = 0.5;
    for (const d of DOORS) {
      const A = d[0] === id, Bb = d[1] === id; if (!A && !Bb) continue;
      const x = d[2], y = d[3], z = d[4], ax = d[5], s = A ? 1 : -1;       // A stands on the + side (outside), B on the - side
      // the trigger sits just on my side of the threshold; I arrive a little further in on the other side
      const o = A ? (d[8] || 1.5) : -0.9, e = A ? 2.65 : -2.1, tx = ax === 'x' ? x + o : x, ty = ax === 'y' ? y + o : y, ex = ax === 'x' ? x + e : x, ey = ax === 'y' ? y + e : y;
      Kit.portal(tx, ty, z, { to: A ? d[1] : d[0], at: 'd' + DOORS.indexOf(d), name: 'd' + DOORS.indexOf(d), label: A ? d[6] : d[7], r: R, ex, ey });
    }
    for (const s of STAIRS) {
      const lo = s[0] === id, hi = s[1] === id; if (!lo && !hi) continue;
      const [x, y, w, d, dir, z0, z1] = s.slice(2), ax = dir[1], up = dir[0] === '+', nm = 's' + STAIRS.indexOf(s);
      const topX = ax === 'x' ? (up ? x + w - 0.35 : x + 0.35) : x + w / 2, topY = ax === 'y' ? (up ? y + d - 0.35 : y + 0.35) : y + d / 2;      // head of the flight
      const offX = ax === 'x' ? (up ? x + w + 0.7 : x - 0.7) : x + w / 2, offY = ax === 'y' ? (up ? y + d + 0.7 : y - 0.7) : y + d / 2;          // floor just beyond the head
      if (lo) { Kit.stairs(x, y, w, d, dir, z0, z1); Kit.portal(topX, topY, z1 - 0.1, { to: s[1], at: nm, name: nm, label: 'Up ↑', r: 0.45, ex: topX, ey: topY }); }
      if (hi) { if (s[1] !== 'court') Kit.stairwell(x, y, w, d, z1, dir); Kit.portal(offX, offY, z1, { to: s[0], at: nm, name: nm, label: 'Down ↓', r: 0.45, ex: offX + (ax === 'y' ? 1.25 : 0), ey: offY + (ax === 'x' ? 1.25 : 0) }); if (s[1] !== 'court') B.block(x, y, w, d, z1); }
    }
  }
  // where on a wall a doorway is, as [from, to] along the wall (for gaps in stubs and features on back walls)
  const doorGaps = (id, axis, c) => DOORS.filter(d => (d[0] === id || d[1] === id) && d[5] === axis && Math.abs((axis === 'x' ? d[2] : d[3]) - c) < 1.2 && Math.abs(d[4] - (KEYS[id] ? BLD[KEYS[id][0]].floors[KEYS[id][1]] : 0)) < 0.5).map(d => { const p = axis === 'x' ? d[3] : d[2]; return [p - 0.7, p + 0.7]; });

  /* ---------- facades of the closed buildings ---------- */
  const rowsAt = (xs, ys, f) => [].concat(...ys.map(y => xs.map(x => f(x, y))));
  const FAC = {
    N: () => ({ Py: stoneP(70, { feats: rowsAt([0.08, 0.2, 0.32, 0.64, 0.76, 0.9], [168, 296], slit).concat(rowsAt([0.08, 0.2, 0.32, 0.64, 0.76, 0.9], [40], (x, y) => ({ k: 'awin', x, y, w: 14, h: 34, frame: 0x4a4038, sill: 0xc4bcaa })), [arch(0.48, 34, 76)]) }), Px: stoneP(71, { feats: [tall(0.5, 60), slit(0.2, 40), slit(0.8, 40), slit(0.3, 296), slit(0.7, 296)] }) }),
    W: () => ({ Px: stoneP(80, { feats: [tall(0.1, 148, 150), tall(0.24, 148, 150), tall(0.4, 148, 150), tall(0.56, 148, 150), slit(0.9, 60), slit(0.1, 40), slit(0.24, 40), slit(0.4, 40), arch(0.522, 30, 70), slit(0.9, 190)] }), Py: stoneP(81, { feats: [tall(0.5, 148, 150), slit(0.25, 50), slit(0.75, 50)] }) }),
    BK: () => ({ Py: stoneP(82, { band: 0, tint: 0xa8a49c, feats: [win(0.1), door(0.273), win(0.45), win(0.63), win(0.8), win(0.93)] }), Px: stoneP(83, { band: 0, feats: [win(0.5)] }) }),
    CH: () => ({ Py: stoneP(91, { band: 0, tint: 0xb0aaa0, feats: [arch(0.5, 26, 62), { k: 'glass', x: 0.16, y: 50, w: 14, h: 80 }, { k: 'glass', x: 0.84, y: 50, w: 14, h: 80 }] }), Px: stoneP(92, { band: 0, tint: 0xb0aaa0, feats: [0.1, 0.26, 0.42, 0.58, 0.74, 0.9].map(x => ({ k: 'glass', x, y: 44, w: 16, h: 96 })) }) }),
    RC: () => ({ Py: stoneP(97, { band: 0, tint: 0xb8ad98, feats: [win(0.1), win(0.26), door(0.5), win(0.74), win(0.9)] }), Px: stoneP(98, { band: 0, tint: 0xb8ad98, feats: [win(0.3), win(0.7)] }) }),
  };
  const slab = Kit.flags(0x8a857c);

  /* ---------- a building, closed or cut open ---------- */
  function building(id, a) {
    const b = BLD[id], open = a.open && KEYS[a.open][0] === id ? KEYS[a.open][1] : -1, w = b.x1 - b.x0, d = b.y1 - b.y0;
    const base = b.floors[0] < 0 ? 0 : 0;                       // solid part starts at ground
    if (id === 'T') return tower(b, open, a);
    const fac = FAC[id]();
    if (a.open && a.open[0] === 'T' && (id === 'N' || id === 'W')) {   // the tower stands behind both ranges: slice them at the king's storey so he can be seen
      const cut = BLD.T.floors[KEYS[a.open][1]] + 0.9;
      B.box(b.x0, b.y0, 0, w, d, cut, { side: T.facade, Px: fac.Px, Py: fac.Py, top: (s, t) => T.mul(Kit.paving(s * 0.5 + b.x0, t * 0.5 + b.y0), 0.42) }); B.block(b.x0, b.y0, w, d, 0); return;
    }
    if (open < 0) {                                             // ---- closed ----
      B.box(b.x0, b.y0, base, w, d, b.top - base, { side: T.facade, Px: fac.Px, Py: fac.Py, noTop: id !== 'W', top: (s, t) => Kit.paving(s + b.x0, t + b.y0) });
      B.block(b.x0, b.y0, w, d, 0);
      if (id === 'W') { Kit.merlons('x', b.y1 - 0.22, b.x0, b.x1, b.top, 0.22); Kit.merlons('x', b.y0, b.x0, b.x1, b.top, 0.22); Kit.merlons('y', b.x1 - 0.22, b.y0, b.y1, b.top, 0.22); Kit.merlons('y', b.x0, b.y0, b.y1, b.top, 0.22); Kit.walk(b.x0 + 0.24, b.y0 + 0.24, b.x1 - 0.24, b.y1 - 0.24, b.top);
        for (let i = 0; i < 4; i++) { const y = [28.9, 23.4, 20.2, 17.2][i]; B.box(b.x1, y - 0.3, 0, 0.5, 0.6, 6.4, { side: T.facade, P: CS(84, { band: 0 }), top: T.flat(0xb4ad9e) }); } }
      else if (id === 'N') { B.gable(b.x0, b.y0, b.top, w, d, 3.6, 'x', { P: { pal: T.ROOF_SLATE, seed: 4 }, GP: stoneP(72, { gfeat: { k: 'glass', w: 22, h: 48, y: 10 } }), ov: 0.3 });
        for (const dp of [0.12, 0.3, 0.58, 0.76, 0.92]) { const dx = b.x0 + w * dp - 0.6, dy = b.y0 + d * 0.5, dz = b.top + 3.6 * 0.16; B.box(dx, dy, dz, 1.2, d * 0.3, 0.9, { side: T.facade, P: stoneP(73, { band: 0, quoin: false, feats: [{ k: 'awin', x: 0.5, y: 6, w: 12, h: 22, frame: 0x4a4038, sill: 0xc4bcaa }] }), noTop: true }); B.gable(dx, dy, dz + 0.9, 1.2, d * 0.3, 0.6, 'y', { P: { pal: T.ROOF_SLATE, seed: 5 }, GP: stoneP(74, { band: 0, quoin: false }), ov: 0.12 }); }
        for (const cx of [b.x0 + 6, b.x0 + 18]) { B.box(cx, b.y0 + 3.6, b.top, 0.7, 0.7, 4.8, { side: T.facade, P: CS(76, { band: 0, tint: 0x9a6a58 }) }); B.smokes.push([cx + 0.35, b.y0 + 3.95, b.top + 5.1]); } }
      else { const ax = w > d ? 'x' : 'y', span = ax === 'x' ? d : w; B.gable(b.x0, b.y0, b.top, w, d, span * (id === 'CH' ? 0.62 : 0.34), ax, { P: { pal: id === 'RC' ? T.ROOF_BROWN : T.ROOF_SLATE, seed: 7 }, GP: stoneP(75, { band: 0, tint: id === 'CH' ? 0xb0aaa0 : 0xa8a49c, gfeat: id === 'CH' ? { k: 'glass', w: 24, h: 50, y: 8 } : null }), ov: 0.3 });
        if (id !== 'CH') { B.box(b.x0 + w * 0.3, b.y0 + d * 0.3, b.top, 0.6, 0.6, span * 0.34 + 0.8, { side: T.facade, P: CS(76, { band: 0, tint: 0x9a6a58 }) }); B.smokes.push([b.x0 + w * 0.3 + 0.3, b.y0 + d * 0.3 + 0.3, b.top + span * 0.34 + 1.1]); } }
      return;
    }
    // ---- cut open at storey `open` ----
    const z = b.floors[open], h = b.hs[open], R = inner(b), key = a.open, room = Rooms[key] || {};
    if (z > 0) { B.box(b.x0, b.y0, 0, w, d, z, { side: T.facade, Px: fac.Px, Py: fac.Py, noTop: true }); B.block(b.x0, b.y0, w, d, 0); }
    Q([b.x0, b.y0, z - 0.02], [w, 0, 0], [0, d, 0], T.flat(0x2a2630), { n: [0, 0, 1], noShadow: true });               // dark under-slab: any gap in the room floors shows as shadow
    const gX = doorGaps(key, 'x', b.x1), gY = doorGaps(key, 'y', b.y1), bX = doorGaps(key, 'x', b.x0 + 0.55), bY = doorGaps(key, 'y', b.y0 + 0.55);
    const len = b.y1 - b.y0, lenX = b.x1 - R[0];
    const fx = (room.wallX || []).concat(bX.map(g => door((b.y1 - (g[0] + g[1]) / 2) / len, { w: 20, h: 48 }))), fy = (room.wallY || []).concat(bY.map(g => door(((g[0] + g[1]) / 2 - R[0]) / lenX, { w: 20, h: 48 })));
    const below = z < 0, WP = (seed, feats) => Kit.STONE(seed, { feats, tint: below ? 0x8a8478 : 0xa39c90, band: below ? 0 : 52 });
    Kit.wallX(R[0], b.y0, b.y1, z, h, WP(70 + open, fx), { light: !below && fx.some(f => f.k === 'glass') });
    Kit.wallY(R[1], R[0], b.x1, z, h, WP(74 + open, fy), {});
    Kit.enclose(R[0], R[1], R[2], R[3], z, h);
    Kit.stub(R[0], R[1], R[2], R[3], z, { gapsX: gX, gapsY: gY });
    const c = { key, x0: R[0], y0: R[1], x1: R[2], y1: R[3], z, h, id, floor: open };
    if (room.build) room.build(c); else Kit.floor(R[0], R[1], R[2], R[3], slab, z);
  }
  function tower(b, open, a) {
    const n = 22, tex = Kit.towerTex(12, [70, 198, 326, 454], true);
    if (open < 0) {
      B.cyl(b.cx, b.cy, 0, b.r, b.top, n, tex, {}); B.cyl(b.cx, b.cy, b.top, b.r + 0.22, 0.5, n, Kit.towerTex(13, []), { top: (s, t) => Kit.paving(s + b.cx, t + b.cy) });
      const m = 18; for (let i = 0; i < m; i++) { const an = i / m * 6.283 + 0.2; B.box(b.cx + Math.cos(an) * (b.r + 0.05) - 0.17, b.cy + Math.sin(an) * (b.r + 0.05) - 0.17, b.top + 0.5, 0.34, 0.34, 0.42, { side: T.facade, P: CS(6, { band: 0 }), top: T.flat(0xb4ad9e) }); }
      const q = b.r * 0.68; Kit.walk(b.cx - q, b.cy - q, b.cx + q, b.cy + q, b.top + 0.5);
      Kit.tower(b.cx + 1.2, b.cy - 1.4, 1.5, 2.2, { z: b.top + 0.5, seed: 14, n: 12, roof: T.ROOF_SLATE, roofH: 3.2, flag: RED, levels: [30] });
      B.blockC(b.cx, b.cy, b.r, 0); return;
    }
    const z = b.floors[open], h = b.hs[open], R = [b.x0 + WT, b.y0 + WT, b.x1 - WT, b.y1 - WT], key = a.open, room = Rooms[key] || {};
    if (z > 0) { B.cyl(b.cx, b.cy, 0, b.r, z, n, tex, {}); B.blockC(b.cx, b.cy, b.r, 0); }
    B.disk(b.cx, b.cy, z - 0.02, b.r, T.flat(0x2a2630), { noShadow: true });
    Kit.wallX(R[0], b.y0, b.y1, z, h, Kit.STONE(60 + open, { feats: room.wallX || [], tint: 0xa39c90 }), {}); Kit.wallY(R[1], R[0], b.x1, z, h, Kit.STONE(64 + open, { feats: room.wallY || [], tint: 0xa39c90 }), {});
    Kit.enclose(R[0], R[1], R[2], R[3], z, h); Kit.stub(R[0], R[1], R[2], R[3], z, { gapsX: doorGaps(key, 'x', 14.45), gapsY: doorGaps(key, 'y', 14.45) });
    const c = { key, x0: R[0], y0: R[1], x1: R[2], y1: R[3], z, h, id: 'T', floor: open };
    if (room.build) room.build(c); else Kit.floor(R[0], R[1], R[2], R[3], slab, z);
  }
  // little thresholds so the short walk through a thick wall is floor on both sides
  function thresholds(a) { for (const d of DOORS) { const A = d[0] === a.id; if (!A && d[1] !== a.id) continue; const x = d[2], y = d[3], lo = A ? -0.1 : -1.4, hi = A ? 2.0 : 0.1; if (d[5] === 'x') Kit.walk(x + lo, y - 0.6, x + hi, y + 0.6, d[4]); else Kit.walk(x - 0.6, y + lo, x + 0.6, y + hi, d[4]); } }

  /* ---------- the grounds ---------- */
  Site.grounds = [];                       // filled by site_out.js: functions (a) that dress the court, bailey and garden
  function ground(a) {
    const b = a.bounds, cutW = a.open === 'W-1';
    Kit.floor(b[0], b[1], b[2], b[3], (x, y) => {
      if (cutW && (x > 4.4 && y > 15.4)) return -1;                                   // the undercroft is seen from above with the earth in front of it taken away
      return (Site.groundTex || T.grass)(x, y);
    }, 0, { noShadow: false });
  }
  Site.draw = function (a) {
    ground(a);
    for (const id in BLD) building(id, a);
    thresholds(a); links(a);
    for (const f of Site.grounds) f(a);
  };

  /* ---------- the areas: windows onto the plan ---------- */
  const OPEN = { day: { night: true, lamp: 0.75 }, dusk: { lamp: 0.95 }, night: { lamp: 1.2 } };
  const win3 = (id, name, blurb, bounds, spawn, open) => Castle.add(id, { name, blurb, bounds, spawn, open: open || null, light: open ? OPEN : null, shadow: { sms: bounds[2] - bounds[0] > 40 ? 20 : 24 }, build: a => Site.draw(a) });
  Site.define = function () {
    win3('court', 'Great Court', 'The keep wraps two sides of the court. Every building here is real inside: walk in and it opens where it stands.', [2, 2, 45.5, 45.5, 16.6], [26, 24, 0]);
    win3('bailey', 'Lower Bailey', 'The working yard east of the court: barracks, smithy, stables, drill ground and the outer gate.', [40, 9, 92, 44, 9.6], [50, 28, 0]);
    win3('garden', 'Garden Terrace', 'South of the court: chapel, bath house, hedge maze, lily pond and orchard.', [0, 39, 48, 76, 9.4], [28, 46, 0]);
    const nm = k => (Rooms[k] && Rooms[k].name) || k, bl = k => (Rooms[k] && Rooms[k].blurb) || '';
    for (const k of ['T0', 'T1', 'T2', 'T3']) win3(k, nm(k), bl(k), [1, 1, 18, 18, BLD.T.floors[KEYS[k][1]] + 3.4], [9.5, 9.5, BLD.T.floors[KEYS[k][1]]], k);
    for (const k of ['N0', 'N1', 'N2']) win3(k, nm(k), bl(k), [11, 0, 44, 20, BLD.N.floors[KEYS[k][1]] + 3.4], [27, 12, BLD.N.floors[KEYS[k][1]]], k);
    win3('W-1', nm('W-1'), bl('W-1'), [0, 11, 20, 42, 1.0, 3.4], [9, 26, -3.2], 'W-1');
    win3('W0', nm('W0'), bl('W0'), [0, 11, 20, 42, 3.4], [12, 26, 0], 'W0');
    win3('W1', nm('W1'), bl('W1'), [0, 11, 20, 42, 9.2], [9.5, 30, 3.2], 'W1');
    win3('BK0', nm('BK0'), bl('BK0'), [50, 12, 80, 30, 3.6], [60, 23, 0], 'BK0');
    win3('CH0', nm('CH0'), bl('CH0'), [2, 40.5, 20, 67, 5.0], [11, 60, 0], 'CH0');
    win3('RC0', nm('RC0'), bl('RC0'), [17, 40.5, 41, 59, 3.6], [29, 52.5, 0], 'RC0');
    Castle.start = ['court', null];
  };
})();
