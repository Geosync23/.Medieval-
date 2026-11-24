'use strict';
/* Villager agents, pixel people, particles (water, smoke, flags, flames). */
const Sim = {};
(function () {
  const h2 = E.h2;
  const SKIN = [0xf0c8a0, 0xe6b88a, 0xd9a273, 0xb9805a, 0x8a5a3c, 0xf4d4b4];
  const HAIR = [0x3a2a20, 0x5a3a24, 0x8a5a2c, 0xc9a04a, 0x2a2428, 0x9a9a9a, 0xb5532a];
  const CLOTH = [0x9a3a34, 0x3f5f8a, 0x4f7a48, 0x8a6a3a, 0x6a4a7a, 0xb8863a, 0x4a7a7a, 0xa85a3a, 0x7a7a6a, 0xc9b48a, 0x5a4a3a, 0x8a3a5a];
  const PANTS = [0x4a3a2e, 0x3a3a4a, 0x5a4a36, 0x2e2e36, 0x6a5a44];
  const FIRST = ['Aldric', 'Mabel', 'Osric', 'Edith', 'Godwin', 'Hilda', 'Wymond', 'Isolde', 'Bertram', 'Agnes', 'Leofric', 'Maud', 'Tobias', 'Rowena', 'Cedric', 'Beatrix', 'Hamon', 'Sybil', 'Gareth', 'Avice', 'Piers', 'Elfrida', 'Ulric', 'Joan', 'Warin', 'Petronilla', 'Drogo', 'Emma'];
  const TRADE = ['baker', 'weaver', 'cooper', 'fishmonger', 'farmer', 'smith', 'tanner', 'miller', 'brewer', 'candlemaker', 'shepherd', 'mason', 'carpenter', 'herbalist', 'tailor', 'potter'];
  const DOING = {
    stall: ['Haggling over turnips', 'Buying bread', 'Inspecting the cloth', 'Selling eggs', 'Looking for a bargain'],
    shop: ['Browsing the shop', 'Collecting an order', 'Arguing about prices'],
    fountain: ['Resting by the fountain', 'Watching the water', 'Filling a jug'],
    chat: ['Swapping gossip', 'Complaining about taxes', 'Talking about the harvest', 'Sharing news of the king'],
    door: ['Calling on a neighbour', 'Stopping at home', 'Making a delivery'],
    well: ['Drawing water'], bench: ['Taking a rest'], court: ['Waiting to petition the king', 'Rehearsing a grievance'],
    guard: ['Standing watch'], patrol: ['Patrolling'], throne: ['Holding court'], noble: ['Whispering at court', 'Seeking royal favour'],
  };
  let grid, GW, GH, GX, GY;
  const RES = 2;
  let people = [], king = null, scene = null, rng = 1;
  const rnd = () => { rng = (Math.imul(rng, 1664525) + 1013904223) | 0; return (rng >>> 0) / 4294967296; };
  const pick = a => a[(rnd() * a.length) | 0];
  Sim.people = () => people; Sim.king = () => king;

  /* ---------- navigation ---------- */
  function buildGrid(sc) {
    const b = sc.walk || sc.bounds; GX = b[0]; GY = b[1]; GW = Math.ceil((b[2] - b[0]) * RES); GH = Math.ceil((b[3] - b[1]) * RES);
    grid = new Uint8Array(GW * GH);
    const pad = 0.22;
    for (const r of B.blocks) {
      const x0 = Math.floor((r[0] - pad - GX) * RES), x1 = Math.ceil((r[0] + r[2] + pad - GX) * RES), y0 = Math.floor((r[1] - pad - GY) * RES), y1 = Math.ceil((r[1] + r[3] + pad - GY) * RES);
      for (let y = Math.max(0, y0); y < Math.min(GH, y1); y++) for (let x = Math.max(0, x0); x < Math.min(GW, x1); x++) grid[y * GW + x] = 1;
    }
    if (sc.blockFn) for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (sc.blockFn((x + 0.5) / RES + GX, (y + 0.5) / RES + GY)) grid[y * GW + x] = 1;
  }
  const cell = (x, y) => { const cx = Math.floor((x - GX) * RES), cy = Math.floor((y - GY) * RES); return (cx < 0 || cy < 0 || cx >= GW || cy >= GH) ? -1 : cy * GW + cx; };
  Sim.walkable = (x, y) => { const c = cell(x, y); return c >= 0 && !grid[c]; };
  function nearestFree(x, y) {
    if (Sim.walkable(x, y)) return [x, y];
    for (let r = 0.5; r < 6; r += 0.5) for (let a = 0; a < 12; a++) { const nx = x + Math.cos(a * 0.5236) * r, ny = y + Math.sin(a * 0.5236) * r; if (Sim.walkable(nx, ny)) return [nx, ny]; }
    return null;
  }
  function path(x0, y0, x1, y1) {
    const s = cell(x0, y0), e = cell(x1, y1); if (s < 0 || e < 0) return null;
    const prev = new Int32Array(GW * GH).fill(-1), cost = new Float32Array(GW * GH).fill(1e9), open = [s];
    cost[s] = 0; prev[s] = s;
    const ex = e % GW, ey = (e / GW) | 0;
    // simple A* with array scan (grids are tiny)
    while (open.length) {
      let bi = 0, bf = 1e9;
      for (let i = 0; i < open.length; i++) { const c = open[i], f = cost[c] + Math.hypot(c % GW - ex, ((c / GW) | 0) - ey); if (f < bf) { bf = f; bi = i; } }
      const c = open[bi]; open[bi] = open[open.length - 1]; open.pop();
      if (c === e) break;
      const cx = c % GW, cy = (c / GW) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
        const n = ny * GW + nx; if (grid[n]) continue;
        if (dx && dy && (grid[cy * GW + nx] || grid[ny * GW + cx])) continue;
        const nc = cost[c] + (dx && dy ? 1.414 : 1);
        if (nc < cost[n]) { if (cost[n] > 1e8) open.push(n); cost[n] = nc; prev[n] = c; }
      }
    }
    if (prev[e] < 0) return null;
    const out = []; let c = e;
    while (c !== s) { out.push([(c % GW + 0.5) / RES + GX, (((c / GW) | 0) + 0.5) / RES + GY]); c = prev[c]; }
    out.reverse(); if (out.length) out[out.length - 1] = [x1, y1];
    return out;
  }

  /* ---------- people ---------- */
  function mkPerson(role, x, y) {
    const fem = rnd() < 0.5, p = {
      role, x, y, fx: 1, fy: 1, path: null, wait: rnd() * 4, phase: rnd() * 4, moving: false, speed: 0.95 + rnd() * 0.5,
      skin: pick(SKIN), hair: pick(HAIR), top: pick(CLOTH), bot: pick(PANTS), fem, hat: rnd() < 0.35 ? 1 + ((rnd() * 3) | 0) : 0, hatc: pick(CLOTH),
      apron: rnd() < 0.2, name: pick(FIRST) + ' the ' + pick(TRADE), doing: 'Out for a stroll', bubble: 0, child: false,
    };
    if (role === 'villager' && rnd() < 0.12) { p.child = true; p.name = 'Little ' + pick(FIRST); p.speed *= 1.3; }
    if (role === 'guard') { p.name = 'Guard ' + pick(FIRST); p.doing = 'Standing watch'; }
    if (role === 'noble') { p.name = (fem ? 'Lady ' : 'Lord ') + pick(FIRST); p.top = pick([0x6a2a6a, 0x2a4a7a, 0x8a2a3a, 0x2a6a5a]); p.hat = 0; }
    if (role === 'monk') { p.name = 'Brother ' + pick(FIRST); p.fem = false; }
    if (role === 'king') { p.name = 'The King (you)'; p.doing = 'Surveying the realm'; p.speed = 1.7; p.skin = SKIN[0]; p.hair = HAIR[1]; }
    return p;
  }
  Sim.setup = function (sc) {
    scene = sc; rng = 12345; people = []; buildGrid(sc);
    const pois = B.pois;
    for (let i = 0; i < (sc.npcs || 0); i++) {
      const poi = pois[(rnd() * pois.length) | 0], f = nearestFree(poi.x + rnd() * 2 - 1, poi.y + rnd() * 2 - 1); if (!f) continue;
      const r = rnd(), p = mkPerson(sc.roles ? pick(sc.roles) : r < 0.06 ? 'monk' : r < 0.14 ? 'noble' : 'villager', f[0], f[1]);
      people.push(p);
    }
    for (const g of (sc.guards || [])) { const p = mkPerson('guard', g[0], g[1]); p.fixed = true; p.fx = g[2] || 1; p.fy = g[3] === undefined ? 1 : g[3]; p.z = g[4] || 0; people.push(p); }
    for (const g of (sc.fixed || [])) { const p = mkPerson(g.role, g.x, g.y); p.fixed = true; p.fx = g.fx; p.fy = g.fy; p.doing = g.doing || p.doing; if (g.name) p.name = g.name; p.sit = !!g.sit; p.z = g.z || 0; if (g.fem !== undefined) p.fem = g.fem; people.push(p); }
    king = mkPerson('king', sc.king[0], sc.king[1]); if (sc.kingSit) { king.sit = true; king.z = sc.kingSit; king.fx = 0.3; king.fy = 1; king.doing = 'Holding court'; }
    people.push(king);
  };
  Sim.kingTo = function (x, y) {
    const f = nearestFree(x, y); if (!f) return false;
    const p = path(king.x, king.y, f[0], f[1]); if (!p) return false;
    king.path = p; king.sit = false; king.z = 0; king.doing = 'Walking'; return true;
  };
  function think(p) {
    if (p.fixed || p === king) return;
    const pois = B.pois; if (!pois.length) return;
    const poi = pois[(rnd() * pois.length) | 0];
    const f = nearestFree(poi.x + (rnd() - 0.5) * 1.2, poi.y + (rnd() - 0.5) * 1.2); if (!f) return;
    const pa = path(p.x, p.y, f[0], f[1]); if (!pa) { p.wait = 2; return; }
    p.path = pa; p.goal = poi; p.doing = 'Walking to ' + ({ stall: 'the market', shop: 'a shop', fountain: 'the fountain', chat: 'meet a friend', door: 'a house', well: 'the well', bench: 'a bench', court: 'the throne', noble: 'the court' }[poi.kind] || 'somewhere');
  }
  Sim.update = function (dt) {
    for (const p of people) {
      p.bubble = Math.max(0, p.bubble - dt);
      if (p.path && p.path.length) {
        const t = p.path[0], dx = t[0] - p.x, dy = t[1] - p.y, d = Math.hypot(dx, dy), st = p.speed * dt;
        if (d <= st) { p.x = t[0]; p.y = t[1]; p.path.shift(); }
        else { p.x += dx / d * st; p.y += dy / d * st; p.fx = dx / d; p.fy = dy / d; }
        p.moving = true; p.phase += dt * p.speed * 5.5;
        if (!p.path.length) {
          p.path = null; p.moving = false;
          if (p === king) p.doing = 'Surveying the realm';
          else { const g = p.goal; p.wait = 3 + rnd() * 9; if (g) { if (g.fx || g.fy) { p.fx = g.fx; p.fy = g.fy; } p.doing = pick(DOING[g.kind] || DOING.chat); if (g.kind === 'chat' || g.kind === 'stall') p.bubble = 1.5 + rnd() * 2; } }
        }
      } else {
        p.moving = false;
        if (!p.fixed && p !== king) { p.wait -= dt; if (p.wait <= 0) think(p); else if (rnd() < dt * 0.08) p.bubble = 1.5; }
      }
    }
  };

  /* ---------- sprite drawing (high detail: ~30px tall people) ---------- */
  const GWd = 33, GHt = 54, G = new Int32Array(GWd * GHt);
  const sp = (x, y, c) => { if (x >= 0 && x < GWd && y >= 0 && y < GHt) G[y * GWd + x] = c; };
  const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) sp(x, y, c); };
  const dk = (c, f) => T.mul(c, f);
  const STEEL = 0x9aa0ac, STEELL = 0xc8ced8, GOLDC = 0xe8c84a, SHOE = 0x2e2420, EYE = 0x2a2026, WHITE = 0xf4efe0;
  function drawPerson(p, time) {
    G.fill(-1);
    const cx = 15, role = p.role, kingly = role === 'king', fem = p.fem, ch = p.child;
    const back = (p.fx + p.fy) < -0.25, flip = (p.fx - p.fy) < 0;
    const fr = p.moving ? (Math.floor(p.phase) & 3) : 0, bob = (fr & 1) ? 1 : 0, sit = p.sit;
    const legH = ch ? 5 : 9, torH = ch ? 8 : 11, hs = ch ? 7 : 8;
    const robe = fem || role === 'monk' || kingly;
    let top = p.top; if (role === 'guard') top = 0x8a8e98; if (role === 'monk') top = 0x7a5638; if (kingly) top = 0x3a4f9a;
    const skin = p.skin, hair = role === 'monk' ? 0x6a4a30 : p.hair, s = fr === 1 ? 1 : fr === 3 ? -1 : 0;
    const beard = !fem && !ch && (p.hair & 1) && role !== 'guard', carry = role === 'villager' && (p.hatc & 1) && !ch, vest = role === 'villager' && !fem && (p.bot & 2);
    // --- legs / skirt ---
    if (!sit) {
      if (robe) {
        const lc = role === 'monk' ? 0x6f4e34 : kingly ? 0x34478c : dk(top, 0.88);
        for (let y = 2; y <= legH; y++) { const wv = y < 4 ? 5 : 4; rect(cx - wv, y, cx + wv - 1, y, lc); sp(cx - wv, y, dk(lc, 1.14)); sp(cx + wv - 1, y, dk(lc, 0.7)); sp(cx + wv - 2, y, dk(lc, 0.84)); sp(cx - 2 + (s && y < 6 ? s : 0), y, dk(lc, 0.82)); sp(cx + 1, y, dk(lc, 0.84)); }
        rect(cx - 5, 2, cx + 4, 2, kingly ? GOLDC : dk(lc, 0.66));
        rect(cx - 3 - (s > 0 ? 1 : 0), 0, cx - 2 - (s > 0 ? 1 : 0), 1, SHOE); rect(cx + 1 + (s < 0 ? 1 : 0), 0, cx + 2 + (s < 0 ? 1 : 0), 1, SHOE);
        if (p.apron || (fem && role === 'villager' && (p.hatc & 2))) { rect(cx - 2, 3, cx + 1, legH, 0xe8e0cc); for (let y = 3; y <= legH; y++) sp(cx + 1, y, 0xcfc6b0); }
      } else {
        const lc = p.bot, ld = dk(lc, 0.78), l1 = s > 0 ? 1 : 0, l2 = s < 0 ? 1 : 0;
        rect(cx - 4, 6, cx - 2, legH, lc); rect(cx + 1, 6, cx + 3, legH, ld);
        rect(cx - 4 - s, 2 + l1, cx - 2 - s, 5, lc); rect(cx + 1 + s, 2 + l2, cx + 3 + s, 5, ld);
        for (let y = 2 + l1; y <= legH; y++) sp(cx - 4 - (y < 6 ? s : 0), y, dk(lc, 1.16));
        rect(cx - 4 - s, l1, cx - 1 - s, 1 + l1, SHOE); rect(cx + 1 + s, l2, cx + 4 + s, 1 + l2, SHOE);
        if (role === 'guard') { rect(cx - 4 - s, 2 + l1, cx - 2 - s, 4, 0x5a4636); rect(cx + 1 + s, 2 + l2, cx + 3 + s, 4, 0x4a3a2c); }
      }
    }
    // --- torso ---
    const tb = (sit ? 2 : legH + 1) + bob, tt = tb + torH - 1;
    rect(cx - 4, tb, cx + 3, tt, top); rect(cx - 5, tt - 1, cx + 4, tt, top);
    for (let y = tb; y <= tt; y++) { sp(cx - 4, y, dk(top, 1.16)); sp(cx + 3, y, dk(top, 0.68)); sp(cx + 2, y, dk(top, 0.82)); }
    if (role === 'guard') { for (let y = tb; y <= tt; y++) for (let x = cx - 4; x <= cx + 3; x++) if ((x + y) & 1) sp(x, y, dk(G[y * GWd + x], 1.15)); rect(cx - 2, tb, cx + 1, tt - 1, 0xb23a3a); for (let y = tb; y < tt; y++) sp(cx + 1, y, 0x8e2a2e); rect(cx - 1, tb + 5, cx, tb + 6, GOLDC); sp(cx - 1, tb + 7, GOLDC); sp(cx, tb + 4, GOLDC); }
    if (vest) { for (let y = tb + 2; y <= tt; y++) { rect(cx - 4, y, cx - 3, y, 0x5a4030); rect(cx + 2, y, cx + 3, y, 0x47321f); } sp(cx - 1, tt, WHITE); sp(cx, tt, WHITE); }
    if (p.apron && !robe) { rect(cx - 2, tb, cx + 1, tt - 2, 0xe8e0cc); for (let y = tb; y <= tt - 2; y++) sp(cx + 1, y, 0xcfc6b0); }
    if (fem && !kingly && role !== 'monk') { rect(cx - 2, tt - 1, cx + 1, tt, dk(top, 1.25)); sp(cx - 1, tt, skin); sp(cx, tt, dk(skin, 0.9)); }   // neckline
    if (role === 'noble') { rect(cx - 1, tb + 2, cx, tt - 2, dk(top, 1.3)); for (let y = tb + 2; y < tt - 1; y += 2) sp(cx - 1, y, GOLDC); rect(cx - 5, tt, cx + 4, tt, GOLDC); }
    if (role === 'monk') { rect(cx - 1, tb + 3, cx, tt - 3, 0x8a6a48); sp(cx - 1, tb + 2, 0xd9c070); sp(cx, tb + 1, 0xd9c070); }
    rect(cx - 4, tb + 1, cx + 3, tb + 1, kingly ? GOLDC : 0x3a2a20); sp(cx - 1, tb + 1, kingly ? 0xd93a3a : 0xc9a84a);
    if (kingly) { rect(cx - 5, tt - 1, cx + 4, tt, WHITE); sp(cx - 3, tt, EYE); sp(cx, tt - 1, EYE); sp(cx + 3, tt, EYE); sp(cx - 1, tt - 3, GOLDC); sp(cx, tt - 4, GOLDC); sp(cx - 1, tt - 5, GOLDC); sp(cx, tt - 2, GOLDC); }
    // --- arms ---
    const armc = kingly ? 0xb02a2a : dk(top, 0.94), a1 = s > 0 ? 1 : 0, a2 = s < 0 ? 1 : 0;
    rect(cx - 6, tb + 3 - a1, cx - 5, tt - 1, armc); for (let y = tb + 3 - a1; y < tt; y++) sp(cx - 6, y, dk(armc, 1.15));
    rect(cx + 4, tb + 3 - a2, cx + 5, tt - 1, dk(armc, 0.74));
    rect(cx - 6, tb + 1 - a1, cx - 5, tb + 2 - a1, skin); rect(cx + 4, tb + 1 - a2, cx + 5, tb + 2 - a2, dk(skin, 0.84));
    if (carry) { rect(cx + 5, tb - 2, cx + 10, tb + 1, 0x8a6838); for (let x = cx + 5; x <= cx + 10; x++) { if (x & 1) sp(x, tb - 1, 0xb08a50); sp(x, tb + 2, [0xc8452f, 0xd9a441, 0x6fa044][(p.hatc >> 4) % 3]); } sp(cx + 6, tb + 3, 0xe8c060); sp(cx + 9, tb + 3, 0xc8452f); rect(cx + 5, tb - 2, cx + 10, tb - 2, 0x6a4c2c); }
    if (kingly) { for (let y = (sit ? 0 : 2); y < tt - 1; y++) { rect(cx - 7, y, cx - 6, y, y % 4 ? 0xb02a2a : 0x9a2424); rect(cx + 5, y, cx + 6, y, 0x8a2020); if (back) rect(cx - 5, y, cx + 4, y, (y % 5) ? 0xb02a2a : 0x9a2424); } rect(cx - 7, sit ? 0 : 2, cx - 6, sit ? 0 : 2, WHITE); rect(cx + 5, sit ? 0 : 2, cx + 6, sit ? 0 : 2, 0xd8d0c0); if (back) { rect(cx - 6, tt - 2, cx + 5, tt, WHITE); rect(cx - 5, 2, cx + 4, 2, WHITE); } }
    // --- head ---
    const hb = tt + 2, hTop = hb + hs - 1;
    rect(cx - 1, tt + 1, cx, tt + 1, dk(skin, 0.8));
    rect(cx - 4, hb, cx + 2, hTop, skin); sp(cx - 4, hb, -1); sp(cx + 2, hb, -1);
    for (let y = hb; y <= hTop; y++) { sp(cx + 2, y, y === hb ? -1 : dk(skin, 0.8)); sp(cx + 1, y, dk(skin, 0.92)); }
    rect(cx - 3, hb, cx + 1, hb, dk(skin, 0.88));
    const hl = dk(hair, 1.25), hd = dk(hair, 0.75);
    if (back) { rect(cx - 4, hb + (fem ? -3 : 1), cx + 2, hTop + 1, hair); for (let y = hb + (fem ? -3 : 1); y <= hTop + 1; y++) { sp(cx + 2, y, hd); if (y & 1) sp(cx - 1, y, hd); } rect(cx - 3, hTop + 1, cx, hTop + 1, hl); }
    else {
      sp(cx - 2, hb + 4, EYE); sp(cx + 1, hb + 4, EYE); sp(cx - 2, hb + 5, dk(hair, 0.9)); sp(cx + 1, hb + 5, dk(hair, 0.9));
      sp(cx, hb + 3, dk(skin, 0.84)); sp(cx - 1, hb + 2, dk(skin, 0.62)); sp(cx, hb + 2, dk(skin, 0.7));
      if (fem || ch) { sp(cx - 3, hb + 3, T.mix(skin, 0xe07a7a, 0.45)); sp(cx + 1, hb + 3, T.mix(skin, 0xd06a6a, 0.45)); }
      rect(cx - 4, hTop - 1, cx + 2, hTop + 1, hair); sp(cx - 4, hTop + 1, -1); sp(cx + 2, hTop + 1, -1); rect(cx - 3, hTop + 1, cx - 1, hTop + 1, hl);
      sp(cx - 1, hTop - 1, skin); sp(cx, hTop - 1, skin); if (fem) sp(cx - 2, hTop - 1, skin);
      sp(cx - 4, hTop - 2, hair); sp(cx - 4, hTop - 3, hair); sp(cx + 2, hTop - 2, hd); sp(cx + 2, hTop - 1, hd); sp(cx + 2, hTop, hd);
      if (fem && role !== 'noble') { rect(cx - 5, hb - 2, cx - 4, hTop - 1, hair); rect(cx + 2, hb - 2, cx + 3, hTop - 2, hd); sp(cx - 5, hb - 2, hl); }
      if (beard) { rect(cx - 3, hb, cx + 1, hb + 1, hair); sp(cx - 4, hb + 1, hair); sp(cx - 4, hb + 2, hair); sp(cx - 3, hb + 2, hair); sp(cx + 1, hb + 2, hd); sp(cx - 1, hb - 1, hair); sp(cx, hb - 1, hd); sp(cx - 1, hb + 2, dk(skin, 0.62)); }
    }
    const ht = hTop + 2;
    if (kingly) { rect(cx - 4, ht - 2, cx + 2, ht - 1, GOLDC); rect(cx - 4, ht - 2, cx + 2, ht - 2, 0xc9a030); for (const x of [cx - 4, cx - 1, cx + 2]) { sp(x, ht, 0xf4dc6a); sp(x, ht + 1, 0xf4dc6a); } sp(cx - 1, ht + 2, 0xf4dc6a); sp(cx - 3, ht - 1, 0xd93a3a); sp(cx, ht - 1, 0x3a8ad9); sp(cx - 2, ht, GOLDC); sp(cx, ht, GOLDC); sp(cx + 1, ht, 0xc9a030); }
    else if (role === 'guard') { rect(cx - 5, ht - 4, cx + 3, ht - 1, STEEL); rect(cx - 4, ht, cx + 2, ht, STEEL); rect(cx - 3, ht + 1, cx + 1, ht + 1, STEELL); rect(cx - 4, ht - 2, cx - 2, ht, STEELL); for (let y = ht - 4; y <= ht; y++) sp(cx + 3 - (y === ht ? 1 : 0), y, 0x6a707c); rect(cx - 5, ht - 4, cx + 3, ht - 4, 0x6a707c); if (!back) { sp(cx - 1, ht - 5, STEEL); sp(cx - 1, ht - 6, STEEL); }
      for (let y = 1; y < ht + 9; y++) { sp(cx + 9, y, 0x6a4a34); sp(cx + 10, y, 0x54382a); } for (let i = 0; i < 6; i++) rect(cx + 9 - (i < 3 ? 1 : 0), ht + 9 + i, cx + 10 + (i < 2 ? 1 : 0), ht + 9 + i, i < 3 ? STEEL : STEELL); sp(cx + 9, ht + 15, STEELL); rect(cx + 8, ht + 8, cx + 11, ht + 8, 0xb23a3a); }
    else if (role === 'monk') { rect(cx - 5, hb + 1, cx - 4, ht - 1, 0x7a5638); rect(cx - 4, ht - 3, cx + 2, ht - 1, 0x7a5638); rect(cx - 3, ht, cx + 1, ht, 0x8a6442); rect(cx + 2, hb + 2, cx + 3, ht - 2, 0x5e4028); if (!back) { rect(cx - 2, ht - 3, cx, ht - 3, skin); } }
    else if (role === 'noble') { if (fem) { for (let i = 0; i < 7; i++) rect(cx - 3 + ((i + 1) >> 1), ht - 1 + i, cx + 1 - (i >> 1), ht - 1 + i, i === 0 ? GOLDC : p.top); sp(cx - 1, ht + 6, WHITE); sp(cx - 3, ht + 5, WHITE); sp(cx - 4, ht + 3, WHITE); sp(cx - 5, ht + 1, WHITE); sp(cx - 5, ht - 1, WHITE); rect(cx - 5, hb + 1, cx - 5, ht - 2, hair); }
      else { rect(cx - 5, ht - 2, cx + 3, ht - 1, p.top); rect(cx - 4, ht, cx + 2, ht, dk(p.top, 1.2)); rect(cx - 5, ht - 2, cx + 3, ht - 2, dk(p.top, 0.7)); sp(cx + 3, ht, WHITE); sp(cx + 4, ht + 1, WHITE); sp(cx + 5, ht + 2, WHITE); sp(cx + 4, ht + 2, 0xd8d0c0); } }
    else if (p.hat === 1) { rect(cx - 7, ht - 2, cx + 5, ht - 2, 0xb89a50); rect(cx - 6, ht - 1, cx + 4, ht - 1, 0xd9c070); rect(cx - 3, ht, cx + 1, ht + 2, 0xd9c070); rect(cx - 3, ht, cx + 1, ht, 0x8a5a3a); rect(cx - 2, ht + 2, cx, ht + 2, 0xecd88a); sp(cx + 1, ht + 1, 0xb89a50); }
    else if (p.hat === 2) { rect(cx - 4, ht - 3, cx + 2, ht - 1, p.hatc); rect(cx - 3, ht, cx + 1, ht, dk(p.hatc, 1.2)); rect(cx - 4, ht - 3, cx + 2, ht - 3, dk(p.hatc, 0.7)); rect(cx + 3, ht - 4, cx + 3, ht - 2, dk(p.hatc, 0.8)); sp(cx + 4, ht - 5, dk(p.hatc, 0.8)); }
    else if (p.hat === 3) { const hc = fem ? 0xf0ece0 : p.hatc; rect(cx - 5, hb + 1, cx - 4, ht - 1, hc); rect(cx - 4, ht - 3, cx + 2, ht - 1, hc); rect(cx - 3, ht, cx + 1, ht, dk(hc, 1.1)); rect(cx + 2, hb + 1, cx + 3, ht - 2, dk(hc, 0.8)); if (!back) { sp(cx - 2, ht - 3, skin); sp(cx - 1, ht - 3, skin); sp(cx, ht - 3, skin); } }
    // --- blit with outline + lighting ---
    const zs = p.z || 0, sc = p.scale || 1, ox = Math.round((flip ? -cx : cx) * sc), fl = p.flash || 0, fade = p.fade || 0;
    const sx = Math.round(E.sx(p.x, p.y)) - ox, sy = Math.round(E.sy(p.x, p.y, zs)), d0 = p.x + p.y + zs + 0.08;
    const L = E.lightAt(p.x, p.y, zs);
    if (!zs) for (let dy = -3; dy <= 3; dy++) { const hw = Math.round(8 * Math.sqrt(1 - dy * dy / 12)); for (let dx = -hw; dx <= hw; dx++) E.dark(sx + ox + dx, sy + dy, d0, 0.66); }
    const OUT = T.mul(0x2a2230, Math.min(1.2, (L[0] + L[1] + L[2]) / 3));
    for (let yy = 0; yy < GHt * sc; yy++) for (let xx = 0; xx < GWd * sc; xx++) {
      const x = (xx / sc) | 0, y = (yy / sc) | 0, c = G[y * GWd + x], px = sx + (flip ? -xx : xx), py = sy - yy, d = d0 + yy / 40;
      if (fade && h2(xx, yy) < fade) continue;
      if (c < 0) { if ((x > 0 && G[y * GWd + x - 1] >= 0) || (x < GWd - 1 && G[y * GWd + x + 1] >= 0) || (y > 0 && G[(y - 1) * GWd + x] >= 0) || (y < GHt - 1 && G[(y + 1) * GWd + x] >= 0)) E.px(px, py, d, OUT); continue; }
      let r = (c >> 16 & 255) * L[0], g = (c >> 8 & 255) * L[1], b = (c & 255) * L[2];
      if (fl) { r += (255 - r) * fl; g += (255 - g) * fl; b += (255 - b) * fl; }
      if (r > 255) r = 255; if (g > 255) g = 255; if (b > 255) b = 255;
      E.px(px, py, d, (r << 16) | (g << 8) | (b | 0));
    }
    p.scrX = sx + ox; p.scrY = sy - 16; p.scrTop = sy - Math.round((ht + 3) * sc);
    if (p.bubble > 0 && !p.moving) {
      const bx = p.scrX + 6, by = sy - (ht + 16), dd = d0 + 2;
      for (let y = 0; y < 10; y++) for (let x = 0; x < 18; x++) { const edge = (x < 2 || x > 15) && (y < 2 || y > 7); if (!edge) E.px(bx + x, by + y, dd, (x < 2 || x > 15 || y < 2 || y > 7) ? 0x3a3038 : 0xf8f4e8); }
      rect2(bx + 2, by + 10, 0x3a3038, dd); rect2(bx + 4, by + 10, 0xf8f4e8, dd); rect2(bx + 2, by + 12, 0x3a3038, dd);
      const n = 1 + (Math.floor(time * 3) % 3); for (let i = 0; i < n; i++) rect2(bx + 4 + i * 4, by + 4, 0x3a3038, dd);
    }
    if (p === Sim.selected) { const mx = p.scrX, my = sy - (ht + 12) - (Math.floor(time * 3) & 1) * 2; for (let i = 0; i < 5; i++) for (let j = -(4 - i); j <= 4 - i; j++) E.px(mx + j, my - 5 + i, d0 + 3, i === 0 || Math.abs(j) === 4 - i ? 0x3a2a10 : 0xffe27a); }
  }
  function rect2(x, y, c, d) { E.px(x, y, d, c); E.px(x + 1, y, d, c); E.px(x, y + 1, d, c); E.px(x + 1, y + 1, d, c); }

  /* ---------- effects ---------- */
  let waterInfo = null;
  Sim.afterBake = function () { waterInfo = E.water.map(i => { const o = E.info(i); return [i, o.x, o.y, E.base[i]]; }); };
  function drawWater(t) {
    const fr = E.frame;
    for (const w of waterInfo) {
      const x = w[1], y = w[2], v = Math.sin(x * 9 + t * 2.1) + Math.sin(y * 11 - t * 1.7) + Math.sin((x - y) * 6 + t * 2.9);
      if (v > 1.5) { const p = w[3], k = v > 2.2 ? 1.6 : 1.3; fr[w[0]] = 0xff000000 | (Math.min(255, (p >> 16 & 255) * k + 14) << 16) | (Math.min(255, (p >> 8 & 255) * k + 14) << 8) | Math.min(255, (p & 255) * k + 14); }
      else if (v < -1.6) { const p = w[3]; fr[w[0]] = 0xff000000 | (((p >> 16 & 255) * 0.85) << 16) | (((p >> 8 & 255) * 0.85) << 8) | ((p & 255) * 0.85); }
    }
  }
  function drawJets(t) {
    const night = E.light.night && E.light.lampScale > 0.8, c1 = night ? 0x9ab8e0 : 0xffffff, c2 = night ? 0x6a8ac0 : 0xcfeaf4, c3 = night ? 0x5070a8 : 0xa8d8e8;
    for (const j of B.jets) {
      for (let i = 0; i < 300; i++) {
        const u = (t * 0.7 + i / 300 + h2(i, 3)) % 1, a = h2(i, 9) * 6.283, spread = 0.08 + h2(i, 5) * h2(i, 6) * 0.9;
        const r = spread * u, z = j.z + j.h * 4 * u * (1 - u) * (0.65 + h2(i, 7) * 0.35) - (j.z - j.bowl) * u * u;
        const x = j.x + Math.cos(a) * r, y = j.y + Math.sin(a) * r, sx = Math.round(E.sx(x, y)), sy = Math.round(E.sy(x, y, z)), d = x + y + z + 0.3;
        const c = (i % 5 === 0) ? c3 : (i & 1) ? c1 : c2; E.px(sx, sy, d, c); E.px(sx, sy + 1, d, c); if (u < 0.6) { E.px(sx + 1, sy, d, c1); E.px(sx + 1, sy + 1, d, c2); if (i & 2) E.px(sx, sy + 2, d, c3); }
      }
      for (let k = 0; k < 12; k++) {
        const a = k / 12 * 6.283 + 0.3, x = j.x + Math.cos(a) * (j.br + 0.04), y = j.y + Math.sin(a) * (j.br + 0.04);
        for (let i = 0; i < 16; i++) {
          const u = (t * 1.2 + i / 16 + k * 0.37) % 1, z = j.bowl - 0.1 - (j.bowl - 0.1 - j.basin) * u * u, rr = 1 + u * 0.22, px = j.x + (x - j.x) * rr, py = j.y + (y - j.y) * rr;
          const sx = Math.round(E.sx(px, py)), sy = Math.round(E.sy(px, py, z)); E.px(sx, sy, px + py + z + 0.2, (i & 1) ? c1 : c2); E.px(sx, sy + 1, px + py + z + 0.2, c2); if (i & 2) E.px(sx + 1, sy, px + py + z + 0.2, c3);
        }
        const u2 = (t * 1.4 + k * 0.21) % 1, rx = j.x + Math.cos(a) * (j.br + 0.26), ry = j.y + Math.sin(a) * (j.br + 0.26);
        for (let q = 0; q < 14; q++) { const b = q / 14 * 6.283, rr = 0.08 + u2 * 0.3, wx = rx + Math.cos(b) * rr, wy = ry + Math.sin(b) * rr; E.px(Math.round(E.sx(wx, wy)), Math.round(E.sy(wx, wy, j.basin)), wx + wy + j.basin + 0.3, u2 < 0.5 ? c1 : c2); }
      }
    }
  }
  function drawSmoke(t) {
    const night = E.light.night && E.light.lampScale > 0.8, col = night ? 0x4a4a62 : 0xdcd6d0, col2 = night ? 0x3a3a52 : 0xbeb8b4;
    for (let s = 0; s < B.smokes.length; s++) {
      const m = B.smokes[s];
      for (let i = 0; i < 8; i++) {
        const u = (t * 0.14 + i / 8 + s * 0.13) % 1, z = m[2] + u * 3.4, x = m[0] + u * u * 1.7 + Math.sin(t * 0.7 + i) * 0.1, y = m[1] - u * u * 0.9;
        const sx = Math.round(E.sx(x, y)), sy = Math.round(E.sy(x, y, z)), r = (3 + u * 9) * (u > 0.75 ? (1 - u) * 4 : 1), d = x + y + z + 1, dens = 1 - u;
        for (let dy = -Math.ceil(r); dy <= r; dy++) for (let dx = -Math.ceil(r); dx <= r; dx++) {
          const dd = dx * dx + dy * dy; if (dd > r * r) continue;
          if (dd > r * r * 0.45 && (((sx + dx) >> 1) + ((sy + dy) >> 1) & 1) && dens < 0.75) continue; if (dd > r * r * 0.8 && dens < 0.45) continue;
          E.px(sx + dx, sy + dy, d, (dx + dy) < 0 ? col : col2);
        }
      }
    }
  }
  function drawFlags(t) {
    for (const f of B.flags) {
      const pole = f.pole || 0.8, sx = Math.round(E.sx(f.x, f.y)), syB = Math.round(E.sy(f.x, f.y, f.z)), syT = Math.round(E.sy(f.x, f.y, f.z + pole)), d = f.x + f.y + f.z + 1;
      for (let y = syT; y <= syB; y++) { E.px(sx, y, d, 0x5a5058); E.px(sx + 1, y, d, 0x3a3038); }
      rect2(sx, syT - 2, 0xe8c84a, d);
      const L = E.lightAt(f.x, f.y, f.z);
      for (let c = 2; c <= 25; c++) {
        const ph = t * 5 - c * 0.32 + f.x, off = Math.round(Math.sin(ph) * 2.6 * c / 25), sl = Math.cos(ph), hgt = c > 19 ? 14 - (c - 19) : 14;
        for (let r = 0; r < hgt; r++) {
          let col = (r === 6 || r === 7 || c === 10 || c === 11) ? (f.c2 || 0xf4e8c0) : f.c; col = T.mul(col, (sl > 0.3 ? 1.12 : sl < -0.3 ? 0.78 : 0.95));
          E.px(sx + c, syT + r + off + (c > 19 ? (c - 19) >> 1 : 0), d, (Math.min(255, (col >> 16 & 255) * L[0]) << 16) | (Math.min(255, (col >> 8 & 255) * L[1]) << 8) | (Math.min(255, (col & 255) * L[2]) | 0));
        }
      }
    }
  }
  Sim.draw = function (t) {
    if (waterInfo && waterInfo.length) drawWater(t);
    const list = people.slice().sort((a, b) => (a.x + a.y) - (b.x + b.y));
    for (const p of list) drawPerson(p, t);
    drawJets(t); if (Sim.fx) for (const f of Sim.fx) f(t); drawSmoke(t); drawFlags(t);
  };
  Sim.drawPerson = drawPerson;
  Sim.personAt = function (lx, ly) {
    let best = null, bd = 26;
    for (const p of people) { const d = Math.hypot(p.scrX - lx, p.scrY - ly); if (d < bd) { bd = d; best = p; } }
    return best;
  };
})();
