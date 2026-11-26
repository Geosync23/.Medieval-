'use strict';
/* Fast soldier sprites for massed battles.
 * Every pose of every soldier type is painted once (procedurally, in the style of Sim.drawPerson)
 * into a compact run list of palette indices.  Drawing a unit is then one tight loop of
 * depth-tested pixel writes through a light-specific colour table (no per-pixel maths).
 *   Troops.init()                              build the caches (needs E and T only, no bake)
 *   Troops.draw(u, time)                       draw one soldier; sets u.scrX, u.scrY, u.scrTop
 *   Troops.banner(x, y, team, time, kind, z, pole)   waving standard on a pole
 *   Troops.H                                   sprite height in px (feet to top of helmet)
 *   Troops.setClip(x0, y0, x1, y1) / Troops.setClip()   optional: skip units outside this buffer rectangle
 *   Troops.relight()                           force every unit to re-sample its light (after a re-bake)
 */
const Troops = {};
(function () {
  const GW = 64, GH = 56, CX = 30, NOL = 1 << 24;            // NOL: pixel casts no outline (strings, streaks)
  const G = new Int32Array(GW * GH), G2 = new Int32Array(GW * GH);
  const sp = (x, y, c) => { if (x >= 0 && x < GW && y >= 0 && y < GH) G[y * GW + x] = c; };
  const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) sp(x, y, c); };
  const gp = (x, y) => (x >= 0 && x < GW && y >= 0 && y < GH) ? G[y * GW + x] : -1;
  const dk = (c, f) => T.mul(c, f);
  const rnd = v => Math.floor(v + 0.5);
  function line(x0, y0, x1, y1, c, c2) {                      // c2: second pixel beside the line (makes it 2 px thick)
    x0 = rnd(x0); y0 = rnd(y0); x1 = rnd(x1); y1 = rnd(y1);
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, flat = dx >= dy; let e = dx - dy;
    for (let k = 0; k < 200; k++) {
      if (c2 !== undefined) { if (flat) sp(x0, y0 - 1, c2); else sp(x0 + 1, y0, c2); }
      sp(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e; if (e2 > -dy) { e -= dy; x0 += sx; } if (e2 < dx) { e += dx; y0 += sy; }
    }
  }

  /* ---------- colours ---------- */
  const STEEL = 0x9aa0ac, STEELL = 0xc8ced8, STEELD = 0x6a707c, GOLD = 0xe8c84a, GOLDD = 0xc9a030, SHOE = 0x2e2420, EYE = 0x2a2026, WHITE = 0xf4efe0;
  const WOOD = 0x8a6a48, WOODD = 0x6a4c34, CREAM = 0xdccfa8, LEATHER = 0x7a5234, STRING = 0xece4d0 | NOL, OUTC = 0x2a2230;
  const TC = [
    { main: 0xc8302c, light: 0xe2523e, dark: 0x8e2026, hood: 0x7c2a26, cap: 0x4f7a3a },      // England: red and gold
    { main: 0x2a56c6, light: 0x4a7ce4, dark: 0x1e3a90, hood: 0x24387c, cap: 0xd8cfb0 },      // France: blue and gold
  ];
  const SKIN = [0xf0c8a0, 0xe6b88a, 0xd9a273, 0xb9805a], HAIR = [0x3a2a20, 0x8a5a2c, 0xc9a04a, 0x5a3a24];

  /* ---------- frames ---------- */
  const F = { IDLE: 0, IDLE2: 1, W1: 2, W3: 3, WIND: 4, SWA: 5, SWB: 6, AIMA: 7, AIMB: 8, STAG: 9, D0: 10, D1: 11, D2: 12, D3: 13 }, NF = 14, NV = 4;
  const KIND = { sword: 0, spear: 1, bow: 2 };

  /* ---------- equipment ---------- */
  function sword(hx, hy, tx, ty) {
    const L = Math.hypot(tx - hx, ty - hy) || 1, ux = (tx - hx) / L, uy = (ty - hy) / L;
    line(hx + ux * 2, hy + uy * 2, tx, ty, STEELL, STEEL);
    sp(rnd(tx), rnd(ty), WHITE);
    const gx = hx + ux * 1.6, gy = hy + uy * 1.6; line(gx - uy * 2.2, gy + ux * 2.2, gx + uy * 2.2, gy - ux * 2.2, GOLD, GOLDD);
    sp(rnd(hx - ux * 1.6), rnd(hy - uy * 1.6), GOLD);
  }
  function spear(x0, y0, x1, y1, team, pennon) {
    const L = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / L, uy = (y1 - y0) / L, C = TC[team];
    if (pennon) { const px = x1 - ux * 2, py = y1 - uy * 2, vx = Math.abs(ux) > 0.7 ? 0 : -1, vy = Math.abs(ux) > 0.7 ? -1 : 0; for (let i = 1; i <= 5; i++) for (let j = 0; j < (i < 3 ? 4 : i < 5 ? 3 : 2); j++) sp(rnd(px + vx * i - (vx ? 0 : j)), rnd(py + vy * i - (vy ? 0 : j)), j === 0 && i < 5 ? C.light : i === 2 ? GOLD : C.main); }
    line(x0, y0, x1, y1, WOOD, WOODD);
    for (let k = 1; k <= 6; k++) { const px = x1 + ux * k, py = y1 + uy * k; sp(rnd(px), rnd(py), STEELL); if (k < 5) { sp(rnd(px - uy), rnd(py + ux), k < 3 ? STEELL : STEEL); if (k > 1 && k < 4) sp(rnd(px + uy), rnd(py - ux), STEEL); } }
    sp(rnd(x1 + ux * 6), rnd(y1 + uy * 6), WHITE);
  }
  function heater(x, y, team, mini) {                   // x, y: top-left of a 9 x 11 heater shield
    const C = TC[team], wd = [9, 9, 9, 9, 9, 9, 9, 7, 7, 5, 3];
    for (let r = 0; r < 11; r++) {
      const w = wd[r], x0 = x + ((9 - w) >> 1), yy = y - r;
      for (let i = 0; i < w; i++) sp(x0 + i, yy, r === 0 ? GOLD : i === 0 ? C.light : i >= w - 2 ? C.dark : C.main);
      if (r > 6) { sp(x0, yy, C.dark); }
    }
    if (team === 0) { for (const r of [2, 4, 6]) { rect(x + 2, y - r, x + 5, y - r, GOLD); sp(x + 6, y - r + (r === 6 ? 0 : 0), GOLDD); } }       // three lions
    else { for (const p of [[2, 2], [6, 2], [4, 5], [2, 5], [6, 5], [4, 8]]) sp(x + p[0], y - p[1], GOLD); sp(x + 4, y - 2, GOLD); }                // fleurs-de-lis
  }
  function roundShield(cx, cy, team) {
    const C = TC[team];
    for (let dy = -5; dy <= 5; dy++) for (let dx = -4; dx <= 4; dx++) {
      const d = dx * dx * 1.35 + dy * dy; if (d > 26) continue;
      let c = d > 17 ? STEELD : (team === 0 ? (Math.abs(dx) < 1 || Math.abs(dy) < 1 ? WHITE : C.main) : (dx + dy + 40) % 4 === 0 ? GOLD : C.main);
      if (d <= 17 && dx <= -3) c = dk(c, 1.15); if (d <= 17 && dx >= 3) c = dk(c, 0.75);
      sp(cx + dx, cy + dy, c);
    }
    rect(cx - 1, cy - 1, cx, cy, GOLD); sp(cx, cy - 1, GOLDD);
  }
  function shieldBack(cx, cy) { for (let dy = -5; dy <= 5; dy++) for (let dx = -4; dx <= 4; dx++) { const d = dx * dx * 1.35 + dy * dy; if (d > 26) continue; sp(cx + dx, cy + dy, d > 17 ? STEELD : (dx & 1 ? 0x6a4c34 : 0x7a5a40)); } }
  function longbow(bx, by, pull, arrow, rise) {         // stave centred on the bow hand; pull 0..1 draws the string back
    const half = 13;
    for (let k = -half; k <= half; k++) { const x = bx + rnd((2.6 + pull * 1.4) * (1 - (k / half) * (k / half))) - rnd(pull * 1.2), c = Math.abs(k) > half - 2 ? 0x4a3626 : 0x9a6a34; sp(x, by + k, c); if (Math.abs(k) < half - 3) sp(x + 1, by + k, 0x7a5228); }
    const tx = bx - rnd(pull * 1.2), vx = bx - 1 - pull * 10;
    if (pull > 0.05) { line(tx, by + half, vx, by, STRING); line(tx, by - half, vx, by, STRING); } else line(tx - 1, by + half - 1, tx - 1, by - half + 1, STRING);
    if (arrow) { const ax = bx + 7 - pull * 3; line(vx, by, ax, by + rise, 0xd8c8a0 | NOL); sp(rnd(ax + 1), by + rise, STEELL | NOL); sp(rnd(ax + 2), by + rise, WHITE | NOL); sp(rnd(vx), by + 1, WHITE | NOL); sp(rnd(vx) + 1, by - 1, WHITE | NOL); }
  }
  function crossbow(x0, y0, x1, y1, spanned, bolt) {    // stock from butt (x0,y0) to nose (x1,y1); the prod sits across the nose
    const L = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / L, uy = (y1 - y0) / L, px = -uy, py = ux;
    const nx = x1 - ux * 6, ny = y1 - uy * 6, t = [];
    for (const k of [-5, 5]) t.push([x1 + px * k - ux * 2, y1 + py * k - uy * 2]);
    if (spanned) { line(t[0][0], t[0][1], nx, ny, STRING); line(t[1][0], t[1][1], nx, ny, STRING); } else line(t[0][0] - ux, t[0][1] - uy, t[1][0] - ux, t[1][1] - uy, STRING);
    line(x0, y0, x1, y1, 0x7a5636, 0x5a3e28);
    if (bolt) { line(nx, ny + (Math.abs(ux) > 0.5 ? 1 : 0), x1 + ux * 3, y1 + uy * 3 + (Math.abs(ux) > 0.5 ? 1 : 0), 0xd8c8a0 | NOL); sp(rnd(x1 + ux * 4), rnd(y1 + uy * 4) + (Math.abs(ux) > 0.5 ? 1 : 0), WHITE | NOL); }
    for (let k = -5; k <= 5; k++) { const b = Math.abs(k) > 3 ? 2 : Math.abs(k) > 1 ? 1 : 0, qx = rnd(x1 + px * k - ux * b), qy = rnd(y1 + py * k - uy * b); sp(qx, qy, STEELD); sp(rnd(qx + ux), rnd(qy + uy), Math.abs(k) < 4 ? STEEL : STEELD); }
    sp(rnd(x0), rnd(y0), 0x4a3020);
  }
  function arm(x0, y0, x1, y1, c, hand) {               // sleeve from shoulder to hand, 2 px thick, with a 2 x 2 hand
    x0 = rnd(x0); y0 = rnd(y0); x1 = rnd(x1); y1 = rnd(y1);
    const steep = Math.abs(y1 - y0) >= Math.abs(x1 - x0);
    line(x0, y0, x1, y1, c, steep ? dk(c, 0.82) : dk(c, 1.12));
    rect(x1, y1 - 1, x1 + 1, y1, hand); sp(x1 + 1, y1 - 1, dk(hand, 0.82));
  }
  function swoosh(ox, oy, r, a0, a1) {                  // motion arc of a blade
    const n = Math.ceil(Math.abs(a1 - a0) * r);
    for (let i = 0; i <= n; i++) { const t = i / n, a = a0 + (a1 - a0) * t; if (t < 0.35 && (i & 1)) continue; sp(rnd(ox + Math.cos(a) * r), rnd(oy + Math.sin(a) * r), (t > 0.6 ? 0xffffff : 0xdcd8d0) | NOL); if (t > 0.75) sp(rnd(ox + Math.cos(a) * (r - 1)), rnd(oy + Math.sin(a) * (r - 1)), 0xe8e4dc | NOL); }
  }

  /* ---------- one soldier, one pose ---------- */
  let headTop = 31;
  function paint(kind, team, v, back, f, limp) {
    G.fill(-1);
    const C = TC[team], cx = CX, xbow = kind === 2 && team === 1;
    let s = 0, bob = 0, lean = 0, sL = 0, sR = 0, crouch = 0;
    if (f === F.IDLE2) bob = 1; else if (f === F.W1) { s = 1; bob = 1; } else if (f === F.W3) { s = -1; bob = 1; }
    else if (f === F.WIND) { lean = kind === 2 ? (xbow ? 2 : 0) : -1; sR = 1; crouch = xbow ? 1 : 0; }
    else if (f === F.SWA) { if (kind === 2) lean = xbow ? -1 : 0; else { lean = 2; sR = 2; sL = -1; } }
    else if (f === F.SWB) { if (kind === 2) lean = 0; else { lean = 2; sR = 2; sL = -1; crouch = 1; } }
    else if (f === F.AIMA) { lean = kind === 2 ? 0 : -1; sR = 1; } else if (f === F.AIMB) { lean = -1; sR = 1; }
    else if (f === F.STAG) { lean = -2; sL = -1; sR = 1; }
    if (s) { sL = -s; sR = s; }
    const skin = SKIN[(v + team) & 3], hair = HAIR[(v * 3 + kind) & 3];
    const legH = 9, l1 = s > 0 ? 1 : 0, l2 = s < 0 ? 1 : 0;
    const tb = legH + 1 + bob - crouch, tt = tb + 10, shf = y => rnd(lean * (y - tb) / 10), hb = tt + 2, hTop = hb + 7, hx = cx + lean;
    const top = C.main;
    const sleeve = kind === 0 ? STEEL : kind === 1 ? CREAM : (v & 1 ? 0xcdbf98 : CREAM), hand = kind === 0 ? STEELL : skin;
    const walkA = s > 0 ? 1 : 0, walkB = s < 0 ? 1 : 0;

    const drawBody = () => {
      // legs
      const lc = kind === 0 ? 0x8a8e98 : kind === 1 ? C.dark : (v & 2 ? 0x5a4a36 : 0x6a5238), ld = dk(lc, 0.78), boot = kind === 0 ? 0x5a5f6a : SHOE;
      rect(cx - 4, 6, cx - 2, legH + 1, lc); rect(cx + 1, 6, cx + 3, legH + 1, ld);
      rect(cx - 4 + sL, 2 + l1, cx - 2 + sL, 5, lc); rect(cx + 1 + sR, 2 + l2, cx + 3 + sR, 5, ld);
      for (let y = 2 + l1; y <= legH; y++) sp(cx - 4 + (y < 6 ? sL : 0), y, dk(lc, 1.16));
      if (kind === 0) { for (let y = 2; y <= legH; y++) for (let x = cx - 5; x <= cx + 6; x++) { const c = gp(x, y); if (c >= 0 && ((x + y) & 1)) sp(x, y, dk(c, 1.14)); } sp(cx - 3 + sL, 6, STEELL); sp(cx + 2 + sR, 6, STEEL); }
      rect(cx - 4 + sL, l1, cx - 1 + sL, 1 + l1, boot); rect(cx + 1 + sR, l2, cx + 4 + sR, 1 + l2, dk(boot, 0.85));
      if (kind === 1) { rect(cx - 4 + sL, 2 + l1, cx - 2 + sL, 3 + l1, 0x5a4636); rect(cx + 1 + sR, 2 + l2, cx + 3 + sR, 3 + l2, 0x4a3a2c); }
      // skirt of the surcoat / tunic
      const sk0 = kind === 0 ? 6 : 8, skc = kind === 2 ? dk(top, 0.9) : dk(C.main, 0.9);
      for (let y = sk0; y <= legH + 1; y++) { rect(cx - 5 + (y < sk0 + 2 ? 0 : 0), y, cx + 4, y, skc); sp(cx - 5, y, dk(skc, 1.14)); sp(cx + 4, y, dk(skc, 0.68)); sp(cx + 3, y, dk(skc, 0.82)); if (kind === 0 && y < legH) { sp(cx - 1, y, lc); sp(cx, y, ld); } }
      rect(cx - 5, sk0, cx + 4, sk0, kind === 2 ? dk(skc, 0.7) : GOLDD); if (kind === 0) { sp(cx - 1, sk0, lc); sp(cx, sk0, ld); }
      // torso
      for (let y = tb; y <= tt; y++) {
        const o = shf(y); rect(cx - 4 + o, y, cx + 3 + o, y, top);
        if (y >= tt - 1) { sp(cx - 5 + o, y, kind === 2 ? top : sleeve); sp(cx + 4 + o, y, dk(kind === 2 ? top : sleeve, 0.74)); }
        sp(cx - 4 + o, y, dk(top, 1.16)); sp(cx + 3 + o, y, dk(top, 0.68)); sp(cx + 2 + o, y, dk(top, 0.82));
      }
      const o1 = shf(tb + 1), om = shf(tb + 5);
      if (kind === 0) {
        rect(cx - 4 + o1, tb + 1, cx + 3 + o1, tb + 1, GOLD); sp(cx + 3 + o1, tb + 1, GOLDD); sp(cx - 1 + o1, tb + 1, WHITE);
        if (!back) { if (team === 0) { rect(cx - 2 + om, tb + 6, cx + om, tb + 6, GOLD); rect(cx - 2 + om, tb + 4, cx + om, tb + 4, GOLD); sp(cx + 1 + om, tb + 6, GOLDD); sp(cx + 1 + om, tb + 4, GOLDD); } else { sp(cx - 2 + om, tb + 6, GOLD); sp(cx + 1 + om, tb + 6, GOLD); sp(cx - 1 + om, tb + 4, GOLD); sp(cx + om, tb + 4, GOLDD); sp(cx - 1 + om, tb + 7, GOLD); } }
        rect(cx - 3 + shf(tt), tt, cx + 2 + shf(tt), tt, STEEL);                                   // mail at the collar
      } else if (kind === 1) {
        rect(cx - 4 + o1, tb + 1, cx + 3 + o1, tb + 1, 0x3a2a20); sp(cx - 1 + o1, tb + 1, GOLD);
        for (let y = tb + 2; y <= tt; y++) { const o = shf(y); sp(cx - 4 + o, y, CREAM); sp(cx + 3 + o, y, dk(CREAM, 0.7)); }                      // gambeson shows at the sides
        if (!back) { if (team === 0) { rect(cx - 1 + om, tb + 3, cx + om, tb + 8, WHITE); rect(cx - 2 + om, tb + 6, cx + 1 + om, tb + 6, WHITE); } else { sp(cx - 1 + om, tb + 7, GOLD); sp(cx + om, tb + 7, GOLDD); sp(cx - 2 + om, tb + 4, GOLD); sp(cx + 1 + om, tb + 4, GOLDD); } }
        rect(cx - 3 + shf(tt), tt, cx + 2 + shf(tt), tt, GOLDD);
      } else {
        rect(cx - 4 + o1, tb + 1, cx + 3 + o1, tb + 1, LEATHER); sp(cx - 1 + o1, tb + 1, GOLD);
        rect(cx - 2 + shf(tt), tt, cx + 1 + shf(tt), tt, CREAM);
        if (!back) { for (let y = tb + 3; y < tt; y++) sp(cx + 2 + shf(y) - ((tt - y) >> 1), y, LEATHER); }                                      // quiver strap
        if (back) { const q = shf(tb + 6); rect(cx - 3 + q, tb + 3, cx - 1 + q, tt, 0x6a4a34); rect(cx - 3 + q, tt + 1, cx - 1 + q, tt + 1, 0x4a3020); for (let i = 0; i < 3; i++) { sp(cx - 3 + i + q, tt + 2, WHITE); sp(cx - 3 + i + q, tt + 3, i & 1 ? 0xd8414f : WHITE); } }
        else if (!limp) { const q = shf(tt); sp(cx - 5 + q, tt + 1, WHITE); sp(cx - 6 + q, tt + 2, WHITE); sp(cx - 6 + q, tt + 1, 0x6a4a34); sp(cx - 5 + q, tt + 3, 0xd8414f); }   // fletchings over the shoulder
      }
      // neck + head
      rect(hx - 1, tt + 1, hx, tt + 1, dk(skin, 0.8));
      rect(hx - 4, hb, hx + 2, hTop, skin); sp(hx - 4, hb, -1); sp(hx + 2, hb, -1);
      for (let y = hb; y <= hTop; y++) { sp(hx + 2, y, y === hb ? -1 : dk(skin, 0.8)); sp(hx + 1, y, dk(skin, 0.92)); }
      rect(hx - 3, hb, hx + 1, hb, dk(skin, 0.88));
      const hl = dk(hair, 1.25), hd = dk(hair, 0.75), beard = (v === 1 || v === 3) && kind !== 0;
      if (back) { rect(hx - 4, hb + 1, hx + 2, hTop + 1, hair); for (let y = hb + 1; y <= hTop + 1; y++) { sp(hx + 2, y, hd); if (y & 1) sp(hx - 1, y, hd); } rect(hx - 3, hTop + 1, hx, hTop + 1, hl); }
      else {
        sp(hx - 1, hb + 4, EYE); sp(hx + 1, hb + 4, EYE); sp(hx - 1, hb + 5, dk(hair, 0.9)); sp(hx + 1, hb + 5, dk(hair, 0.9));
        sp(hx, hb + 3, dk(skin, 0.84)); sp(hx - 1, hb + 2, dk(skin, 0.62)); sp(hx, hb + 2, dk(skin, 0.7));
        rect(hx - 4, hTop - 1, hx + 2, hTop + 1, hair); sp(hx - 4, hTop + 1, -1); sp(hx + 2, hTop + 1, -1); rect(hx - 3, hTop + 1, hx - 1, hTop + 1, hl);
        sp(hx - 1, hTop - 1, skin); sp(hx, hTop - 1, skin); sp(hx - 4, hTop - 2, hair); sp(hx - 4, hTop - 3, hair); sp(hx + 2, hTop - 2, hd); sp(hx + 2, hTop - 1, hd); sp(hx + 2, hTop, hd);
        if (beard) { rect(hx - 3, hb, hx + 1, hb + 1, hair); sp(hx - 4, hb + 1, hair); sp(hx - 4, hb + 2, hair); sp(hx - 3, hb + 2, hair); sp(hx + 1, hb + 2, hd); sp(hx - 1, hb - 1, hair); sp(hx, hb - 1, hd); sp(hx - 1, hb + 2, dk(skin, 0.62)); }
        if (f === F.STAG || f >= F.D0) { sp(hx - 1, hb + 2, EYE); sp(hx, hb + 2, EYE); }            // open mouth
      }
      const ht = hTop + 2; headTop = ht + 1;
      if (kind === 0) {
        if (v === 2) {                                   // great helm with a gold cross
          rect(hx - 5, hb - 1, hx + 3, hTop + 1, STEEL); rect(hx - 4, hTop + 2, hx + 2, hTop + 2, STEELL); for (let y = hb - 1; y <= hTop + 1; y++) { sp(hx - 5, y, STEELL); sp(hx + 3, y, STEELD); sp(hx + 2, y, dk(STEEL, 0.86)); } rect(hx - 5, hb - 1, hx + 3, hb - 1, STEELD);
          if (!back) { rect(hx - 1, hb + 1, hx - 1, hTop, GOLD); rect(hx - 4, hb + 5, hx + 2, hb + 5, GOLD); sp(hx - 3, hb + 4, EYE); sp(hx - 2, hb + 4, EYE); sp(hx, hb + 4, EYE); sp(hx + 1, hb + 4, EYE); sp(hx - 3, hb + 1, STEELD); sp(hx + 1, hb + 1, STEELD); sp(hx - 3, hb + 2, STEELD); }
          headTop = hTop + 3;
        } else {
          const open = !back && (v === 1 || v === 3);
          // mail aventail and bascinet skull
          for (let y = hb - 1; y <= hb + (open ? 0 : 2); y++) for (let x = hx - 4; x <= hx + 2; x++) sp(x, y, ((x + y) & 1) ? STEEL : STEELD);
          if (open) { for (let y = hb + 1; y <= hb + 4; y++) { sp(hx - 4, y, (y & 1) ? STEEL : STEELD); sp(hx + 2, y, STEELD); } }
          rect(hx - 4, open ? hb + 6 : hb + 3, hx + 2, hTop + 1, STEEL); rect(hx - 3, hTop + 2, hx + 1, hTop + 2, STEEL); rect(hx - 2, hTop + 3, hx, hTop + 3, STEELL);
          for (let y = (open ? hb + 6 : hb + 3); y <= hTop + 2; y++) { sp(hx - 4 + (y > hTop + 1 ? 1 : 0), y, STEELL); sp(hx - 3 + (y > hTop + 1 ? 1 : 0), y, STEELL); sp(hx + 2 - (y > hTop + 1 ? 1 : 0), y, STEELD); }
          if (!back && !open) { rect(hx - 3, hb + 4, hx + 2, hb + 4, EYE); sp(hx + 2, hb + 4, STEELD); rect(hx - 3, hb + 3, hx + 1, hb + 3, STEELL); sp(hx - 2, hb + 2, STEELD); sp(hx, hb + 2, STEELD); sp(hx - 1, hb + 1, STEELD); sp(hx + 1, hb + 1, STEELD); }
          if (open && v === 1) { rect(hx - 1, hb + 3, hx - 1, hb + 5, STEELL); }                     // nasal
          if (open) rect(hx - 4, hb + 6, hx + 2, hb + 6, STEELD);
          if (v === 3 || v === 0) { sp(hx - 1, hTop + 4, C.main); sp(hx - 2, hTop + 5, C.light); sp(hx - 3, hTop + 5, C.main); sp(hx - 4, hTop + 4, C.main); sp(hx - 2, hTop + 4, C.main); sp(hx - 3, hTop + 4, C.dark); sp(hx - 5, hTop + 3, C.dark); }   // plume
          headTop = hTop + 4;
        }
      } else if (kind === 1 || (kind === 2 && team === 1 && v === 2)) {          // kettle hat
        const kc = v === 3 ? 0x7a808c : STEEL;
        if (v === 2 && kind === 1) { for (let y = hb - 1; y <= hTop - 2; y++) { sp(hx - 4, y, (y & 1) ? STEEL : STEELD); sp(hx + 2, y, STEELD); } rect(hx - 3, hb - 1, hx + 1, hb - 1, STEELD); if (!back) { rect(hx - 3, hb, hx + 1, hb, STEEL); } }
        rect(hx - 7, hTop - 1, hx + 5, hTop - 1, dk(kc, 0.72)); rect(hx - 6, hTop, hx + 4, hTop, kc); rect(hx - 6, hTop, hx - 3, hTop, STEELL);
        rect(hx - 4, hTop + 1, hx + 2, hTop + 2, kc); rect(hx - 3, hTop + 3, hx + 1, hTop + 3, kc); rect(hx - 3, hTop + 1, hx - 2, hTop + 3, STEELL); sp(hx + 2, hTop + 1, STEELD); sp(hx + 2, hTop + 2, STEELD); sp(hx + 1, hTop + 3, STEELD);
        rect(hx - 4, hTop + 1, hx + 2, hTop + 1, dk(kc, 0.86)); sp(hx - 3, hTop + 1, kc);
        headTop = hTop + 4;
      } else {                                           // archers: hood, cap, bare head, coif
        const hv = v;
        if (hv === 0) {
          const hc = C.hood, hcl = dk(hc, 1.25), hcd = dk(hc, 0.72);
          rect(hx - 5, hb - 1, hx - 4, hTop, hc); rect(hx + 2, hb - 1, hx + 3, hTop, hcd); rect(hx - 4, hTop - 1, hx + 2, hTop + 1, hc); rect(hx - 3, hTop + 2, hx + 1, hTop + 2, hcl); sp(hx - 5, hTop - 1, hcl); sp(hx - 5, hTop - 2, hcl);
          if (!back) { rect(hx - 2, hTop - 1, hx, hTop - 1, skin); } else rect(hx - 4, hb, hx + 2, hTop, hc);
          const o = shf(tt); rect(cx - 6 + o, tt - 1, cx + 5 + o, tt + 1, hc); rect(cx - 6 + o, tt - 1, cx + 5 + o, tt - 1, hcd); sp(cx - 6 + o, tt, hcl); sp(cx - 6 + o, tt + 1, -1); sp(cx + 5 + o, tt + 1, -1); sp(cx + 5 + o, tt, hcd);
          if (back) { sp(hx - 1, hb - 1, hcd); sp(hx - 1, hb - 2, hcd); }
          headTop = hTop + 3;
        } else if (hv === 1) {
          const hc = C.cap; rect(hx - 5, hTop - 1, hx + 3, hTop, hc); rect(hx - 4, hTop + 1, hx + 2, hTop + 1, dk(hc, 1.15)); rect(hx - 5, hTop - 1, hx + 3, hTop - 1, dk(hc, 0.7)); sp(hx + 3, hTop, dk(hc, 0.8));
          sp(hx + 3, hTop + 1, WHITE); sp(hx + 4, hTop + 2, WHITE); sp(hx + 5, hTop + 3, team ? GOLD : 0xd8414f);
          headTop = hTop + 2;
        } else if (hv === 3) {                         // straw hat
          rect(hx - 7, hTop - 1, hx + 5, hTop - 1, 0xb89a50); rect(hx - 6, hTop, hx + 4, hTop, 0xd9c070); rect(hx - 3, hTop + 1, hx + 1, hTop + 3, 0xd9c070); rect(hx - 3, hTop + 1, hx + 1, hTop + 1, C.main); rect(hx - 2, hTop + 3, hx, hTop + 3, 0xecd88a); sp(hx + 1, hTop + 2, 0xb89a50); sp(hx + 1, hTop + 3, 0xb89a50);
          headTop = hTop + 4;
        } else { rect(hx - 4, hTop - 2, hx + 2, hTop - 2, C.main); headTop = hTop + 2; }               // bare head with a headband
      }
    };

    const drawGear = () => {
      const shR = [cx + 4 + shf(tt - 1), tt - 1], shL = [cx - 5 + shf(tt - 1), tt - 1];
      const slR = dk(sleeve, 0.78), slL = sleeve, hdR = dk(hand, 0.86);
      if (kind === 0) {
        let R, tip, sh;
        if (limp) { arm(shR[0], shR[1], cx + 8 + lean, tb + 6, slR, hdR); arm(shL[0], shL[1], cx - 9 + lean, tb + 7, slL, hand); heater(cx - 13 + lean, tb + 11, team); return; }
        if (f === F.WIND || f === F.AIMA || f === F.AIMB) { R = [cx + 5 + lean, tt + 3]; tip = [R[0] - 5, R[1] + 13]; sh = [cx - 8 + lean, tb + 11]; }
        else if (f === F.SWA) { R = [cx + 9 + lean, tt - 3]; tip = [R[0] + 12, R[1] + 4]; sh = [cx - 11 + lean, tb + 10]; }
        else if (f === F.SWB) { R = [cx + 8 + lean, tb + 3]; tip = [R[0] + 11, R[1] - 6]; sh = [cx - 11 + lean, tb + 10]; }
        else if (f === F.STAG) { R = [cx + 9 + lean, tb + 4]; tip = [R[0] + 9, R[1] - 6]; sh = [cx - 14 + lean, tb + 13]; }
        else { R = [cx + 5, tb + 3 - walkB]; tip = [R[0] + 3, R[1] + 14]; sh = [cx - 10, tb + 10 - walkA]; }
        if (f === F.SWA) swoosh(shR[0], shR[1], 15, 1.9, 0.5); if (f === F.SWB) swoosh(shR[0], shR[1], 15, 1.2, -0.35);
        sword(R[0] + 0.5, R[1], tip[0], tip[1]); arm(shR[0], shR[1], R[0], R[1], slR, hdR);
        arm(shL[0], shL[1], sh[0] + 4, sh[1] - 5, slL, hand); heater(sh[0], sh[1], team);
      } else if (kind === 1) {
        let R, sc;
        if (limp) { arm(shR[0], shR[1], cx + 8 + lean, tb + 6, slR, hdR); arm(shL[0], shL[1], cx - 9 + lean, tb + 7, slL, hand); roundShield(cx - 9 + lean, tb + 6, team); return; }
        if (f === F.WIND || f === F.AIMA || f === F.AIMB) { R = [cx + 1 + lean, tt - 1]; spear(cx - 17, tt - 1, cx + 11, tt - 2, team, true); sc = [cx - 3 + lean, tb + 5]; }
        else if (f === F.SWA) { R = [cx + 8 + lean, tt - 3]; spear(cx - 7, tt - 2, cx + 21, tt - 4, team, true); for (let i = 0; i < 4; i++) { sp(cx + 14 + i * 2, tt - 1, 0xe8e4dc | NOL); sp(cx + 17 + i * 2, tt - 7, 0xffffff | NOL); } sc = [cx - 4 + lean, tb + 5]; }
        else if (f === F.SWB) { R = [cx + 6 + lean, tt - 3]; spear(cx - 11, tt - 2, cx + 17, tt - 4, team, true); sc = [cx - 4 + lean, tb + 5]; }
        else if (f === F.STAG) { R = [cx + 7 + lean, tb + 5]; spear(cx + 10, 1, cx + 2, 40, team, true); sc = [cx - 9 + lean, tb + 7]; }
        else { R = [cx + 6, tb + 4 - walkB]; spear(cx + 7, 1 - walkB, cx + 7, 40 - walkB, team, true); sc = [cx - 6, tb + 5 - walkA]; }
        arm(shR[0], shR[1], R[0], R[1], slR, hdR);
        arm(shL[0], shL[1], sc[0] + 1, sc[1] + 1, slL, hand); if (back) shieldBack(sc[0], sc[1]); else roundShield(sc[0], sc[1], team);
      } else if (!xbow) {
        if (limp) { arm(shR[0], shR[1], cx + 8 + lean, tb + 6, slR, skin); arm(shL[0], shL[1], cx - 9 + lean, tb + 7, slL, skin); return; }
        let Bh, pull = 0, arrow = false, rise = 0, Lh = [cx - 6, tb + 3 - walkA];
        if (f === F.WIND) { Bh = [cx + 9, tt - 3]; arrow = true; pull = 0.12; Lh = [cx + 6, tt - 3]; }
        else if (f === F.AIMA) { Bh = [cx + 10, tt - 1]; pull = 0.55; arrow = true; rise = 2; Lh = [cx + 3, tt - 1]; }
        else if (f === F.AIMB) { Bh = [cx + 10 + lean, tt]; pull = 1; arrow = true; rise = 3; Lh = [cx - 1 + lean, tt]; }
        else if (f === F.SWA) { Bh = [cx + 10, tt]; Lh = [cx - 3, tt + 1]; for (let i = 0; i < 3; i++) sp(cx + 15 + i * 3, tt + 2 + i, 0xffffff | NOL); }
        else if (f === F.SWB) { Bh = [cx + 9, tb + 7]; Lh = [cx - 5, tb + 6]; }
        else if (f === F.STAG) { Bh = [cx + 9 + lean, tb + 3]; Lh = [cx - 9 + lean, tb + 8]; }
        else Bh = [cx + 6, tb + 5 - walkB];
        longbow(Bh[0] + 1, Bh[1], pull, arrow, rise); arm(shR[0], shR[1], Bh[0], Bh[1], slR, dk(skin, 0.86));
        arm(shL[0], shL[1], Lh[0], Lh[1], slL, skin);
      } else {
        if (limp) { arm(shR[0], shR[1], cx + 8 + lean, tb + 6, slR, skin); arm(shL[0], shL[1], cx - 9 + lean, tb + 7, slL, skin); return; }
        let Rh, Lh;
        if (f === F.WIND) { crossbow(cx + 8, 13, cx + 8, 2, true, false); Rh = [cx + 8, 11]; Lh = [cx + 5, 10]; }                     // spanning, foot in the stirrup
        else if (f === F.AIMA) { crossbow(cx + 1, tb + 6, cx + 13, tt - 2, true, true); Rh = [cx + 9, tt - 5]; Lh = [cx + 3, tb + 6]; }
        else if (f === F.AIMB) { crossbow(cx + 1 + lean, tt - 2, cx + 15 + lean, tt - 1, true, true); Rh = [cx + 10 + lean, tt - 3]; Lh = [cx + 3 + lean, tt - 3]; }
        else if (f === F.SWA) { crossbow(cx + lean, tt - 2, cx + 14 + lean, tt - 1, false, false); Rh = [cx + 9 + lean, tt - 3]; Lh = [cx + 2 + lean, tt - 3]; for (let i = 0; i < 3; i++) sp(cx + 18 + i * 3, tt - 1, 0xffffff | NOL); }
        else if (f === F.STAG) { crossbow(cx + 4 + lean, tb + 1, cx + 13 + lean, tb + 8, false, false); Rh = [cx + 8 + lean, tb + 4]; Lh = [cx - 9 + lean, tb + 8]; }
        else { crossbow(cx + 1, tb + 3 - walkB, cx + 13, tb + 6 - walkB, false, false); Rh = [cx + 8, tb + 4 - walkB]; Lh = [cx + 2, tb + 3 - walkB]; }
        arm(shR[0], shR[1], Rh[0], Rh[1], slR, dk(skin, 0.86)); arm(shL[0], shL[1], Lh[0], Lh[1], slL, skin);
      }
    };
    if (back) { drawGear(); drawBody(); } else { drawBody(); drawGear(); }
  }

  /* tip the painted figure over backwards (to the left) around its feet */
  function fall(deg, squash, shx) {
    G2.set(G); G.fill(-1);
    const a = deg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a), up = 6 * sa;
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      const rx = x - CX - shx, ry = y / squash - up, qx = rnd(CX + rx * ca + ry * sa), qy = rnd(-rx * sa + ry * ca);
      if (qx < 0 || qy < 0 || qx >= GW || qy >= GH) continue;
      const c = G2[qy * GW + qx]; if (c >= 0) G[y * GW + x] = c;
    }
  }
  function dropped(kind, team) {                        // weapon lying beside the body (only where the ground is free)
    const put = (x, y, c) => { if (gp(x, y) < 0) sp(x, y, c); };
    if (kind === 0) { for (let i = 0; i < 12; i++) { put(CX + 2 + i, 1 + (i > 8 ? 1 : 0), i < 2 ? GOLD : STEELL); put(CX + 2 + i, 0 + (i > 8 ? 1 : 0), i < 2 ? GOLDD : STEEL); } put(CX + 4, 2, GOLD); put(CX + 4, 3, GOLD); }
    else if (kind === 1) { for (let i = 0; i < 34; i++) { const x = CX - 20 + i, y = 11 + (i > 20 ? 1 : 0); put(x, y, i > 29 ? STEELL : WOOD); put(x, y - 1, i > 29 ? STEEL : WOODD); } }
    else if (team === 0) { for (let i = 0; i < 20; i++) { const y = 10 + rnd(2 * (1 - ((i - 10) / 10) ** 2)); put(CX - 4 + i, y, 0x9a6a34); } }
    else { for (let i = 0; i < 10; i++) { put(CX + 4 + i, 1, 0x7a5636); put(CX + 4 + i, 0, 0x5a3e28); } for (let i = -3; i <= 3; i++) put(CX + 13, 1 + i, STEELD); }
  }

  /* ---------- caches ---------- */
  let PAL = [OUTC], palMap = new Map([[OUTC, 0]]), SPR = null, luts = new Map(), epoch = 1;
  const pidx = c => { let i = palMap.get(c); if (i === undefined) { i = PAL.length; PAL.push(c); palMap.set(c, i); } return i; };
  const solid = (x, y) => { const c = gp(x, y); return c >= 0 && !(c & NOL); };
  function encode(top) {
    const out = []; let rows = 0, x0 = 99, x1 = -99, h = 0, px = 0;
    for (let y = 0; y < GH; y++) {
      const at = out.length; out.push(y, 0); let n = 0;
      for (let x = 0; x < GW; x++) {
        const c = G[y * GW + x]; let i = -1;
        if (c >= 0) i = pidx(c & 0xffffff); else if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) i = 0;
        if (i < 0) continue;
        out.push(x - CX, i); n++; if (x - CX < x0) x0 = x - CX; if (x - CX > x1) x1 = x - CX;
      }
      if (n) { out[at + 1] = n; rows++; h = y; px += n; } else out.length = at;
    }
    return { d: Int16Array.from(out), rows, x0, x1, h, top, px };
  }
  const sprIndex = (kind, team, v, back, f) => ((((kind * 2 + team) * NV + v) * 2 + back) * NF + f);
  Troops.init = function () {
    if (SPR) return;
    SPR = new Array(3 * 2 * NV * 2 * NF);
    for (let kind = 0; kind < 3; kind++) for (let team = 0; team < 2; team++) for (let v = 0; v < NV; v++) for (let back = 0; back < 2; back++) {
      for (let f = 0; f < NF; f++) {
        let top;
        if (f < F.D0) { paint(kind, team, v, back, f, false); top = headTop + 1; }
        else if (f === F.D0) { paint(kind, team, v, back, F.STAG, false); fall(24, 1, 3); top = headTop; }
        else { paint(kind, team, v, back, F.STAG, true); if (f === F.D1) { fall(52, 0.95, 8); top = 26; } else if (f === F.D2) { fall(78, 0.85, 12); top = 16; } else { fall(90, 0.72, 15); dropped(kind, team); top = 12; } }
        SPR[sprIndex(kind, team, v, back, f)] = encode(top);
      }
    }
    luts = new Map();
  };
  Troops.H = 32;
  Troops.frames = F;
  Troops.relight = function () { epoch++; };
  let clip = null;
  Troops.setClip = function (x0, y0, x1, y1) { clip = x0 === undefined ? null : [x0, y0, x1, y1]; };

  function getLut(L, fl) {
    let qr = Math.round(L[0] * 20), qg = Math.round(L[1] * 20), qb = Math.round(L[2] * 20);
    if (qr > 63) qr = 63; if (qg > 63) qg = 63; if (qb > 63) qb = 63;
    const key = qr | (qg << 6) | (qb << 12) | (fl << 18);
    let t = luts.get(key);
    if (!t) {
      if (luts.size > 600) luts.clear();
      t = new Uint32Array(PAL.length); const kr = qr / 20, kg = qg / 20, kb = qb / 20, w = fl / 3;
      for (let i = 0; i < PAL.length; i++) {
        const c = PAL[i]; let r = (c >> 16 & 255) * kr, g = (c >> 8 & 255) * kg, b = (c & 255) * kb;
        if (i === 0) { const m = Math.min(1.2, (kr + kg + kb) / 3); r = (c >> 16 & 255) * m; g = (c >> 8 & 255) * m; b = (c & 255) * m; }
        if (r > 255) r = 255; if (g > 255) g = 255; if (b > 255) b = 255;
        if (w) { r += (255 - r) * w; g += (255 - g) * w; b += (255 - b) * w; }
        t[i] = (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
      }
      luts.set(key, t);
    }
    return t;
  }

  /* ---------- drawing ---------- */
  const SHW = [4, 6, 7, 8, 7, 6, 4];                    // ground shadow half-widths, rows -3..3
  const NOISE = new Float32Array(256); for (let i = 0; i < 256; i++) NOISE[i] = E.h2(i & 15, (i >> 4) + 7);
  let uid = 1;
  Troops.draw = function (u, time) {
    if (u._v === undefined) { const seed = u.seed !== undefined ? u.seed : u.id !== undefined ? u.id : uid++; u._v = (Math.imul((seed | 0) + 1, 2654435761) >>> 8) & 0xffff; u._lt = -1; u._ep = 0; u._bk = 0; u._fp = u.team ? 1 : 0; u._fl = -1; u._lut = null; }
    const W = E.W, H = E.H, z = u.z || 0, x = u.x, y = u.y;
    const sx = Math.round((x - y) * E.HW + E.OX), sy = Math.round((x + y) * E.HH - z * E.ZS + E.OY);
    // view from the facing, with a little hysteresis so men do not flicker between views
    const fa = u.face || 0, fx = Math.cos(fa), fy = Math.sin(fa), a = fx + fy, b = fx - fy;
    if (u._bk) { if (a > -0.15) u._bk = 0; } else if (a < -0.35) u._bk = 1;
    if (u._fp) { if (b > 0.12) u._fp = 0; } else if (b < -0.12) u._fp = 1;
    const flip = u._fp;
    // pose
    let f = 0; const an = u.anim, t = u.t || 0;
    if (an === 'walk') { const k = Math.floor(u.phase || 0) & 3; f = k === 1 ? F.W1 : k === 3 ? F.W3 : F.IDLE; }
    else if (an === 'wind') f = F.WIND; else if (an === 'swing') f = t < 0.5 ? F.SWA : F.SWB; else if (an === 'aim') f = t < 0.5 ? F.AIMA : F.AIMB;
    else if (an === 'stag') f = F.STAG; else if (an === 'dead') f = t < 0.2 ? F.D0 : t < 0.45 ? F.D1 : t < 0.7 ? F.D2 : F.D3;
    else f = ((time * 0.7 + u._v * 0.137) % 1) < 0.3 ? F.IDLE2 : F.IDLE;
    const kind = KIND[u.kind] || 0, S = SPR[sprIndex(kind, u.team ? 1 : 0, u._v & 3, u._bk, f)];
    u.scrX = sx; u.scrY = sy - 16; u.scrTop = sy - S.top;
    if (clip && (sx + 34 < clip[0] || sx - 34 > clip[2] || sy < clip[1] || sy - 58 > clip[3])) return;
    if (sx < -34 || sx > W + 34 || sy < 0 || sy - 58 >= H) return;
    // light: re-sampled a couple of times a second per unit
    if (time >= u._lt || time < u._lt - 2 || u._ep !== epoch) {
      const L = E.lightAt(x, y, z), Lt = E.light;
      u._L = L; u._lt = time + 0.35 + (u._v & 15) * 0.012; u._ep = epoch; u._fl = -1;
      u._sun = L[0] + L[1] > Lt.amb[0] + Lt.amb[1] + 0.16 + (Lt.sun[0] + Lt.sun[1]) * 0.4 ? 1 : 0;
    }
    let fl = u.flash ? Math.round(u.flash * 3) : 0; if (fl > 3) fl = 3; if (fl < 0) fl = 0;
    if (fl !== u._fl) { u._lut = getLut(u._L, fl); u._fl = fl; }
    const lut = u._lut, dep = E.dep, fr = E.frame, base = E.base, d0 = x + y + z + 0.08;
    // ground shadow (never darkens the same pixel twice, never covers men already drawn)
    if (f < F.D2) {
      const gy = z ? Math.round((x + y) * E.HH + E.OY) : sy, k = u._sun ? 0.64 : 0.8, sh = z > 0.4 ? 1 : 0, ds = x + y + 0.08;
      for (let r = sh; r < 7 - sh; r++) {
        const py = gy + r - 3; if (py < 0 || py >= H) continue;
        const hw = SHW[r] - sh * 2; let xa = sx + 1 - hw, xb = sx + 1 + hw; if (xa < 0) xa = 0; if (xb >= W) xb = W - 1;
        for (let i = py * W + xa, e = py * W + xb; i <= e; i++) { const p = base[i]; if (fr[i] === p && dep[i] <= ds) fr[i] = (0xff000000 | (((p >> 16 & 255) * k) << 16) | (((p >> 8 & 255) * k) << 8) | ((p & 255) * k)) >>> 0; }
      }
    }
    // sprite
    const D = S.d, fade = u.fade || 0, safe = !fade && sx - 34 >= 0 && sx + 34 < W;
    let p = 0;
    if (safe) {
      for (let r = S.rows; r > 0; r--) {
        const yy = D[p], n = D[p + 1], py = sy - yy; p += 2;
        if (py < 0 || py >= H) { p += n * 2; continue; }
        const d = d0 + yy * 0.025, row = py * W + sx, e = p + n * 2;
        if (flip) for (; p < e; p += 2) { const i = row - D[p]; if (dep[i] <= d) fr[i] = lut[D[p + 1]]; }
        else for (; p < e; p += 2) { const i = row + D[p]; if (dep[i] <= d) fr[i] = lut[D[p + 1]]; }
      }
    } else {
      for (let r = S.rows; r > 0; r--) {
        const yy = D[p], n = D[p + 1], py = sy - yy; p += 2;
        if (py < 0 || py >= H) { p += n * 2; continue; }
        const d = d0 + yy * 0.025, e = p + n * 2;
        for (; p < e; p += 2) {
          const dx = D[p], px = flip ? sx - dx : sx + dx; if (px < 0 || px >= W) continue;
          if (fade && NOISE[((dx + 32) & 15) | ((yy & 15) << 4)] < fade) continue;
          const i = py * W + px; if (dep[i] <= d) fr[i] = lut[D[p + 1]];
        }
      }
    }
  };

  /* ---------- regimental standard ---------- */
  function device(team, kind, c, r) {
    const C = TC[team];
    if (team === 0) {
      if (kind === 1) return (r >= 6 && r <= 8) || (c >= 11 && c <= 13) ? 0xc8302c : WHITE;                              // St George
      if (kind === 2) { const m = r - 3 - Math.abs(c - 13) * 0.75; return m > 0 && m < 3 ? GOLD : C.main; }                    // gold chevron
      return (r === 3 || r === 4 || r === 7 || r === 8 || r === 11 || r === 12) && c > 5 && c < 20 && (c % 7) !== 5 ? GOLD : C.main;   // three lions
    }
    if (kind === 1) return (r >= 6 && r <= 8) || (c >= 11 && c <= 13) ? WHITE : C.main;                                   // white cross
    if (kind === 2) return r < 2 || r > 12 || c < 4 ? GOLD : (Math.abs(c - 13) + Math.abs(r - 7) < 4 ? GOLD : C.main);
    const m = (c + (((r + 1) / 5 | 0) & 1) * 3) % 6, n = (r + 1) % 5; return (m === 2 && n < 3) || (n === 1 && m > 0 && m < 4) ? GOLD : C.main;   // fleurs-de-lis
  }
  Troops.banner = function (x, y, team, time, kind, z, pole) {
    z = z || 0; pole = pole || 2.2; kind = kind || 0; team = team ? 1 : 0;
    const sx = Math.round(E.sx(x, y)), syB = Math.round(E.sy(x, y, z)), syT = Math.round(E.sy(x, y, z + pole)), d = x + y + z + 0.5, L = E.lightAt(x, y, z + pole * 0.6);
    const lit = c => (Math.min(255, (c >> 16 & 255) * L[0]) << 16) | (Math.min(255, (c >> 8 & 255) * L[1]) << 8) | (Math.min(255, (c & 255) * L[2]) | 0);
    const pc = lit(0x8a6a48), pd = lit(0x5a4030), oc = lit(dk(OUTC, 0.8));
    for (let yy = syT; yy <= syB; yy++) { E.px(sx, yy, d, pc); E.px(sx + 1, yy, d, pd); }
    const g = lit(GOLD); E.px(sx, syT - 1, d, g); E.px(sx + 1, syT - 1, d, g); E.px(sx, syT - 2, d, g); E.px(sx + 1, syT - 2, d, g); E.px(sx, syT - 3, d, lit(WHITE));
    let prev = 0;
    for (let c = 2; c <= 27; c++) {
      const ph = time * 5 - c * 0.3 + x * 1.7, off = Math.round(Math.sin(ph) * 2.6 * c / 27), sl = Math.cos(ph), hgt = 15, tail = c > 22 ? (c - 22) : 0, sh = sl > 0.3 ? 1.12 : sl < -0.3 ? 0.76 : 0.94;
      const y0 = syT + off;
      E.px(sx + c, y0 - 1, d, oc); E.px(sx + c, y0 + hgt, d, oc);
      for (let r = 0; r < hgt; r++) { if (tail && Math.abs(r - 7) < tail) { if (Math.abs(r - 7) === tail - 1) E.px(sx + c, y0 + r, d, oc); continue; } E.px(sx + c, y0 + r, d, lit(dk(device(team, kind, c - 2, r), sh))); }
      prev = off;
    }
    for (let r = 0; r < 15; r++) if (Math.abs(r - 7) >= 6) E.px(sx + 28, syT + prev + r, d, oc);
  };
})();
