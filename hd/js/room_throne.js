'use strict';
/* Castle layout 3: the throne room, the whole upper storey of the west range (W1), in master-plan coordinates. */
(function () {
  const h2 = E.h2, CS = Kit.CS, use = Site.use, RED = 0xb8323a, BLUE = 0x34508f;
  const gl = (x, y, w, h) => ({ k: 'glass', x, y: y || 56, w: w || 24, h: h || 120 });
  Rooms['W1'] = {
    name: 'Throne Room', blurb: 'The king holds court on the upper floor of the west range. The door behind the dais leads into the great tower; the east door opens on the stair down to the court.',
    wallX: [gl(0.1), gl(0.28), gl(0.46), gl(0.64), gl(0.82)],
    wallY: [{ k: 'glass', x: 0.476, y: 112, w: 44, h: 88 }, gl(0.14, 60, 18, 104), gl(0.82, 60, 18, 104)],
    build(c) {
      const Z = c.z, X0 = c.x0, Y0 = c.y0, X1 = c.x1, Y1 = c.y1, CX = (X0 + X1) / 2, flag = Kit.flags(), chk = Kit.diag(46, 0xcfc6b2, 0x6f6a78);
      Kit.floor(X0, Y0, X1, Y1, (x, y) => (x < X0 + 1.8 || x > X1 - 1.8) ? flag(x, y) : chk(x, y), Z);
      // dais: it stands clear of the north wall, so the king can come in from the tower behind his throne
      const DY = Y0 + 1.9, marble = Kit.tiles(24, 0xd8d0be, 0xcac2b0), gold = (s, t) => T.mul(0xd9a83a, 0.9 + h2(s * 32, t * 40) * 0.2);
      B.box(CX - 3.4, DY, Z, 6.8, 4.3, 0.2, { side: T.facade, P: CS(74, { band: 0, tint: 0xc8c0ae }), top: marble }); B.box(CX - 2.7, DY, Z + 0.2, 5.4, 3.5, 0.2, { side: T.facade, P: CS(75, { band: 0, tint: 0xc8c0ae }), top: marble });
      Kit.walk(CX - 3.4, DY, CX + 3.4, DY + 4.3, Z + 0.2); Kit.walk(CX - 2.7, DY, CX + 2.7, DY + 3.5, Z + 0.4);
      Kit.rug(CX - 1, DY + 0.6, CX + 1, DY + 3.5, Z + 0.4); Kit.rug(CX - 1, DY + 3.5, CX + 1, DY + 4.3, Z + 0.2, 0xa82a2e, 0xa82a2e, 0x7a1c22); Kit.rug(CX - 1, DY + 4.3, CX + 1, Y1 - 0.6, Z);
      const velvet = col => (s, t, q) => { const X = Math.floor(s * 32), Y = Math.floor(t * 40), Wt = Math.round(q.ul * 32), Ht = Math.round(q.vl * 40); if (X < 4 || X >= Wt - 4 || Y >= Ht - 6 || Y < 4) return (X + Y) % 8 < 2 ? 0xf4dc6a : 0xd9a83a; if (Y > Ht - 18 && Math.abs(X - Wt / 2 + 0.5) < 4) return 0xf4dc6a; return T.mul(col, ((X + Y) % 12 < 2 || (X - Y + 120) % 12 < 2) ? 0.82 : 1); };
      const zt = Z + 0.4, ky = DY + 0.62, kx = CX - 0.55;
      B.box(kx, ky, zt, 1.1, 0.26, 2.5, { side: velvet(0xa82a2e), top: gold }); B.box(kx + 0.05, ky + 0.26, zt, 1.0, 0.8, 0.5, { side: gold, top: T.flat(RED) }); B.box(kx - 0.07, ky + 0.26, zt + 0.5, 0.14, 0.8, 0.3, { side: gold }); B.box(kx + 1.03, ky + 0.26, zt + 0.5, 0.14, 0.8, 0.3, { side: gold }); B.block(kx - 0.07, ky, 1.24, 1.06, zt);
      B.box(kx - 1.6, ky + 0.13, zt, 0.9, 0.22, 1.9, { side: velvet(BLUE), top: gold }); B.box(kx - 1.55, ky + 0.35, zt, 0.8, 0.7, 0.42, { side: gold, top: T.flat(BLUE) }); B.block(kx - 1.6, ky + 0.13, 0.9, 0.92, zt);
      // columns, light, banners
      for (const y of [Y0 + 7.4, Y0 + 11, Y0 + 14.6, Y0 + 18.2, Y0 + 21]) for (const x of [X0 + 1.2, X1 - 1.2]) { if (x > CX && (Math.abs(y - 31.2) < 2 || y < Y0 + 8)) continue; if (!use('column', x, y, Z, { h: c.h - 0.2 })) B.cyl(x, y, Z, 0.34, c.h - 0.2, 10, T.flat(0xb8b0a2), {}); B.blockC(x, y, 0.5, Z); }
      for (const y of [Y0 + 8.6, Y0 + 13.6, Y0 + 18.6]) if (!use('chandelier', CX, y, Z, { h: 4.4, drop: 1.8, r: 0.8, n: 10 })) E.addLight(CX, y, Z + 4, 8.5, [1.0, 0.74, 0.4], 0.75);
      for (const x of [X0 + 0.9, X0 + 2.6, X1 - 2.6, X1 - 0.9]) use('banner', x, Y0 + 0.02, Z, { h: 4.8, face: 'y', c: x > X0 + 2 && x < X1 - 2 ? RED : BLUE, len: 2.3 });
      for (const f of [0.19, 0.37, 0.55, 0.73]) { const y = 38 - f * 23; use('banner', X0 + 0.02, y, Z, { h: 4.6, face: 'x', c: (f * 10 | 0) & 1 ? BLUE : RED, len: 2.0 }); use('torch', X0 + 0.02, y - 0.75, Z, { h: 1.9, face: 'x' }); use('torch', X0 + 0.02, y + 0.75, Z, { h: 1.9, face: 'x' }); }
      for (const p of [[CX - 3.9, DY + 4.9], [CX + 3.9, DY + 4.9], [X0 + 2.2, Y1 - 1.2], [X1 - 2.2, Y1 - 1.2]]) if (!use('brazier', p[0], p[1], Z, {})) E.addLight(p[0], p[1], Z + 1.2, 5, [1, 0.6, 0.25], 1.2);
      for (const p of [[X0 + 0.7, Y0 + 0.8], [X1 - 0.7, Y0 + 0.8], [X0 + 0.7, Y1 - 0.8]]) use('plant', p[0], p[1], Z, { kind: 'tree', s: 1.1 });
      // the court
      Kit.person({ role: 'noble', fem: true, name: 'The Queen', at: [kx - 1.15, ky + 0.83, zt + 0.42], sit: 0.82, fixed: [0.3, 1] });
      Kit.person({ role: 'monk', name: 'The Chancellor', at: [CX + 1.6, DY + 2.6, zt], fixed: [-0.2, 1] });
      for (const g of [[CX - 3.9, DY + 5.8], [CX + 3.9, DY + 5.8], [CX - 1.9, Y0 + 11], [CX + 1.9, Y0 + 11], [CX - 1.9, Y0 + 16], [CX + 1.9, Y0 + 16], [X1 - 1.0, 29.9], [X1 - 1.0, 32.5]]) Kit.person({ role: 'guard', name: 'Royal guard', at: [g[0], g[1], Z], fixed: [g[0] < CX ? 1 : -1, 0.5] });
      for (let i = 0; i < 6; i++) Kit.person({ role: i % 3 ? 'villager' : 'noble', name: i % 3 ? 'Petitioner' : 'Courtier', at: [CX + (i & 1 ? 0.35 : -0.35), Y0 + 8 + i * 1.6, Z], kinds: ['court'] });
      for (let i = 0; i < 7; i++) B.pois.push({ x: CX + (i & 1 ? 0.35 : -0.35), y: Y0 + 7.6 + i * 1.5, z: Z, kind: 'court', fx: 0, fy: -1 });
      for (const y of [Y0 + 9, Y0 + 13, Y0 + 17, Y0 + 20]) B.pois.push({ x: X0 + 2.2, y, z: Z, kind: 'court', fx: 1, fy: 0.2 }, { x: X1 - 2.4, y: y - 1.3, z: Z, kind: 'court', fx: -1, fy: 0 });
    },
  };
})();
