'use strict';
/* The throne room (keep, first floor): shared by every castle layout. */
(function () {
  const h2 = E.h2, CS = Kit.CS, RED = 0xb8323a, BLUE = 0x34508f;
  const door = (x, o) => Object.assign({ k: 'door', x, w: 18, h: 44, trim: 0xb0a898 }, o || {});
  const use = (name, ...args) => { if (typeof Fz !== 'undefined' && Fz[name]) { Fz[name](...args); return true; } return false; };
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
})();
