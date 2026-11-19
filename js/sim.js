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

  /* ---------- sprite drawing ---------- */
  const GWd = 15, GHt = 26, G = new Int32Array(GWd * GHt);
  const sp = (x, y, c) => { if (x >= 0 && x < GWd && y >= 0 && y < GHt) G[y * GWd + x] = c; };
  const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) sp(x, y, c); };
  const dk = (c, f) => T.mul(c, f);
  function drawPerson(p, time) {
    G.fill(-1);
    const cx = 7, role = p.role, kingly = role === 'king';
    const back = (p.fx + p.fy) < -0.25, flip = (p.fx - p.fy) < 0;
    const fr = p.moving ? (Math.floor(p.phase) & 3) : 0, bob = (fr & 1) ? 1 : 0;
    const sit = p.sit ? 1 : 0;
    const legH = p.child ? 2 : 4, torH = p.child ? 4 : 5, y0 = 0;
    const robe = p.fem || role === 'monk' || kingly;
    // legs (rows from feet up)
    const lc = robe ? (role === 'monk' ? 0x6a4a34 : dk(p.top, kingly ? 1 : 0.85)) : p.bot, shoe = 0x2e2420;
    if (!sit) {
      if (robe) { rect(cx - 2, 1, cx + 2, legH, lc); for (let y = 1; y <= legH; y++) sp(cx + 2, y, dk(lc, 0.8)); sp(cx - 1 + (fr === 1 ? -1 : 0), 0, shoe); sp(cx + 1 + (fr === 3 ? 1 : 0), 0, shoe); }
      else {
        const l1 = fr === 1 ? 1 : 0, l2 = fr === 3 ? 1 : 0;
        rect(cx - 1, 1 + l1, cx - 1, legH, lc); rect(cx + 1, 1 + l2, cx + 1, legH, dk(lc, 0.8)); sp(cx - 1, l1, shoe); sp(cx + 1, l2, shoe);
        if (fr === 1) sp(cx - 2, 1, shoe); if (fr === 3) sp(cx + 2, 1, shoe);
      }
    }
    const tb = (sit ? 1 : legH + 1) + bob;         // torso bottom row
    let top = p.top; if (role === 'guard') top = 0x8a8e98; if (role === 'monk') top = 0x7a5638; if (kingly) top = 0x3a4f9a;
    rect(cx - 2, tb, cx + 2, tb + torH - 1, top);
    for (let y = tb; y < tb + torH; y++) { sp(cx + 2, y, dk(top, 0.78)); sp(cx - 2, y, dk(top, 1.12)); }
    if (role === 'guard') { rect(cx - 1, tb, cx + 1, tb + torH - 1, 0xb23a3a); sp(cx, tb + 2, 0xe8c84a); }
    if (p.apron && !robe && role === 'villager') rect(cx - 1, tb, cx + 1, tb + torH - 2, 0xe8e0cc);
    if (role === 'noble') { sp(cx, tb + torH - 1, 0xe8c84a); sp(cx, tb + torH - 2, 0xe8c84a); rect(cx - 2, tb, cx + 2, tb, 0xe8c84a); }
    if (kingly) { rect(cx - 2, tb + torH - 1, cx + 2, tb + torH - 1, 0xf4efe0); sp(cx, tb + 1, 0xe8c84a); sp(cx, tb + 2, 0xe8c84a); rect(cx - 2, tb, cx + 2, tb, 0xe8c84a); }
    else rect(cx - 2, tb, cx + 2, tb, dk(top, 0.7));   // belt
    // arms
    const sw = p.moving ? (fr === 1 ? 1 : fr === 3 ? -1 : 0) : 0;
    const armc = kingly ? 0xb02a2a : dk(top, 0.9);
    rect(cx - 3, tb + 1 + (sw > 0 ? 1 : 0), cx - 3, tb + torH - 1, armc); rect(cx + 3, tb + 1 + (sw < 0 ? 1 : 0), cx + 3, tb + torH - 1, dk(armc, 0.8));
    sp(cx - 3, tb + 1 + (sw > 0 ? 0 : 0), p.skin); sp(cx + 3, tb + 1, dk(p.skin, 0.85));
    // cape (king) drawn as wider back
    if (kingly) { for (let y = (sit ? 0 : 1); y < tb + torH - 1; y++) { sp(cx - 3, y, 0xb02a2a); sp(cx + 3, y, 0x8a2020); if (back) rect(cx - 2, y, cx + 2, y, y % 3 ? 0xb02a2a : 0x9a2424); } if (back) rect(cx - 3, tb + torH - 2, cx + 3, tb + torH - 1, 0xf4efe0); }
    // head
    const hb = tb + torH, hs = p.child ? 3 : 4;
    rect(cx - 2, hb, cx + 1, hb + hs - 1, p.skin); for (let y = hb; y < hb + hs; y++) sp(cx + 1, y, dk(p.skin, 0.86));
    const hair = role === 'monk' ? 0x7a5638 : p.hair;
    rect(cx - 2, hb + hs - 1, cx + 1, hb + hs, hair); sp(cx - 2, hb + hs - 2, hair);
    if (back) rect(cx - 2, hb + (p.fem ? 0 : 1), cx + 1, hb + hs, hair);
    else { sp(cx - 1, hb + hs - 3, 0x2a2026); sp(cx + 1, hb + hs - 3, 0x2a2026); if (p.fem) { sp(cx - 2, hb + 1, hair); sp(cx - 2, hb, hair); } if (!p.fem && !p.child && (p.hair & 3) === 0) rect(cx - 1, hb, cx + 1, hb, hair); }
    const ht = hb + hs + 1;
    if (kingly) { rect(cx - 2, ht - 1, cx + 1, ht - 1, 0xe8c84a); sp(cx - 2, ht, 0xf4dc6a); sp(cx, ht, 0xf4dc6a); sp(cx + 1, ht, 0xd9a83a); sp(cx - 1, ht - 1, 0xd93a3a); }
    else if (role === 'guard') { rect(cx - 2, ht - 2, cx + 1, ht - 1, 0xa8aeb8); rect(cx - 1, ht, cx, ht, 0xc8ced8); sp(cx + 1, ht - 2, 0x7a808a);
      for (let y = 1; y < ht + 5; y++) sp(cx + 5, y, 0x6a4a34); sp(cx + 5, ht + 5, 0xd8dce4); sp(cx + 5, ht + 6, 0xd8dce4); sp(cx + 4, ht + 4, 0xa8aeb8); sp(cx + 6, ht + 4, 0xa8aeb8); }
    else if (role === 'monk') { rect(cx - 2, ht - 1, cx + 1, ht - 1, 0x7a5638); sp(cx - 3, ht - 2, 0x7a5638); }
    else if (role === 'noble') { if (p.fem) { rect(cx - 1, ht, cx, ht + 1, p.top); sp(cx - 1, ht + 2, p.top); } else { rect(cx - 2, ht - 1, cx + 1, ht - 1, p.top); sp(cx + 1, ht, 0xf4efe0); } }
    else if (p.hat === 1) { rect(cx - 3, ht - 1, cx + 2, ht - 1, 0xd9c070); rect(cx - 2, ht, cx + 1, ht, 0xc9b060); }
    else if (p.hat === 2) { rect(cx - 2, ht - 1, cx + 1, ht - 1, p.hatc); rect(cx - 2, ht, cx, ht, p.hatc); }
    else if (p.hat === 3) { rect(cx - 2, ht - 2, cx + 1, ht - 1, p.fem ? 0xf0ece0 : p.hatc); sp(cx - 3, ht - 3, p.fem ? 0xf0ece0 : p.hatc); }
    // blit with outline + lighting
    const zs = p.z || 0;
    const sx = Math.round(E.sx(p.x, p.y)) - (flip ? -cx : cx) , sy = Math.round(E.sy(p.x, p.y, zs)), d0 = p.x + p.y + zs + 0.08;
    const L = E.lightAt(p.x, p.y, zs);
    if (!zs) for (let dx = -3; dx <= 3; dx++) { E.dark(sx + (flip ? -cx : cx) + dx, sy, d0, 0.66); if (Math.abs(dx) < 3) { E.dark(sx + (flip ? -cx : cx) + dx, sy + 1, d0, 0.66); E.dark(sx + (flip ? -cx : cx) + dx, sy - 1, d0, 0.66); } }
    const OUT = T.mul(0x2a2230, Math.min(1.2, (L[0] + L[1] + L[2]) / 3));
    for (let y = 0; y < GHt; y++) for (let x = 0; x < GWd; x++) {
      const c = G[y * GWd + x], px = sx + (flip ? -x : x), py = sy - y, d = d0 + y / 20;
      if (c < 0) {
        if ((x > 0 && G[y * GWd + x - 1] >= 0) || (x < GWd - 1 && G[y * GWd + x + 1] >= 0) || (y > 0 && G[(y - 1) * GWd + x] >= 0) || (y < GHt - 1 && G[(y + 1) * GWd + x] >= 0)) E.px(px, py, d, OUT);
        continue;
      }
      let r = (c >> 16 & 255) * L[0], g = (c >> 8 & 255) * L[1], b = (c & 255) * L[2];
      if (r > 255) r = 255; if (g > 255) g = 255; if (b > 255) b = 255;
      E.px(px, py, d, (r << 16) | (g << 8) | (b | 0));
    }
    if (p.bubble > 0 && !p.moving) {
      const bx = sx + (flip ? -cx : cx) + 3, by = sy - (ht + 7), dd = d0 + 2;
      for (let y = 0; y < 5; y++) for (let x = 0; x < 9; x++) { const edge = (x === 0 || x === 8) && (y === 0 || y === 4); if (!edge) E.px(bx + x, by + y, dd, (x === 0 || x === 8 || y === 0 || y === 4) ? 0x3a3038 : 0xf8f4e8); }
      E.px(bx + 1, by + 5, dd, 0x3a3038); E.px(bx + 2, by + 5, dd, 0xf8f4e8); E.px(bx + 1, by + 6, dd, 0x3a3038);
      const n = 1 + (Math.floor(time * 3) % 3); for (let i = 0; i < n; i++) E.px(bx + 2 + i * 2, by + 2, dd, 0x3a3038);
    }
    p.scrX = sx + (flip ? -cx : cx); p.scrY = sy - 8;
    if (p === Sim.selected) { const mx = p.scrX, my = sy - (ht + 5) - (Math.floor(time * 3) & 1); for (let i = 0; i < 3; i++) for (let j = -(2 - i); j <= 2 - i; j++) E.px(mx + j, my - 3 + i, d0 + 3, i === 0 || Math.abs(j) === 2 - i ? 0x3a2a10 : 0xffe27a); }
  }

  /* ---------- effects ---------- */
  let waterInfo = null;
  Sim.afterBake = function () {
    waterInfo = E.water.map(i => { const o = E.info(i); return [i, o.x, o.y, E.base[i]]; });
  };
  function drawWater(t) {
    const fr = E.frame;
    for (const w of waterInfo) {
      const x = w[1], y = w[2];
      const v = Math.sin(x * 9 + t * 2.1) + Math.sin(y * 11 - t * 1.7) + Math.sin((x - y) * 6 + t * 2.9);
      if (v > 1.55) { const p = w[3]; fr[w[0]] = 0xff000000 | (Math.min(255, (p >> 16 & 255) * 1.4 + 14) << 16) | (Math.min(255, (p >> 8 & 255) * 1.4 + 14) << 8) | Math.min(255, (p & 255) * 1.4 + 14); }
      else if (v < -1.7) { const p = w[3]; fr[w[0]] = 0xff000000 | (((p >> 16 & 255) * 0.85) << 16) | (((p >> 8 & 255) * 0.85) << 8) | ((p & 255) * 0.85); }
    }
  }
  function drawJets(t) {
    const night = E.light.night, c1 = night ? 0x9ab8e0 : 0xffffff, c2 = night ? 0x6a8ac0 : 0xcfeaf4;
    for (const j of B.jets) {
      for (let i = 0; i < 150; i++) {
        const u = (t * 0.75 + i / 150 + h2(i, 3)) % 1, a = h2(i, 9) * 6.283, spread = 0.1 + h2(i, 5) * h2(i, 6) * 0.75;
        const r = spread * u, z = j.z + j.h * 4 * u * (1 - u) * (0.7 + h2(i, 7) * 0.3) - (j.z - j.bowl) * u * u;
        const x = j.x + Math.cos(a) * r, y = j.y + Math.sin(a) * r, sx = Math.round(E.sx(x, y)), sy = Math.round(E.sy(x, y, z)), d = x + y + z + 0.3;
        E.px(sx, sy, d, (i & 3) ? c1 : c2); if (u < 0.55) { E.px(sx, sy + 1, d, c2); if (i & 1) E.px(sx + 1, sy, d, c1); }
      }
      for (let k = 0; k < 10; k++) {         // overflow streams from the upper bowl
        const a = k / 10 * 6.283 + 0.3, x = j.x + Math.cos(a) * (j.br + 0.04), y = j.y + Math.sin(a) * (j.br + 0.04);
        for (let i = 0; i < 9; i++) {
          const u = (t * 1.3 + i / 9 + k * 0.37) % 1, z = j.bowl - 0.1 - (j.bowl - 0.1 - j.basin) * u * u;
          const rr = 1 + u * 0.25, px = j.x + (x - j.x) * rr, py = j.y + (y - j.y) * rr;
          E.px(Math.round(E.sx(px, py)), Math.round(E.sy(px, py, z)), px + py + z + 0.2, (i & 1) ? c1 : c2);
        }
        const u2 = (t * 1.5 + k * 0.21) % 1, rx = j.x + Math.cos(a) * (j.br + 0.3), ry = j.y + Math.sin(a) * (j.br + 0.3);
        for (let q = 0; q < 6; q++) { const b = q / 6 * 6.283, rr = 0.1 + u2 * 0.25; E.px(Math.round(E.sx(rx + Math.cos(b) * rr, ry + Math.sin(b) * rr)), Math.round(E.sy(rx + Math.cos(b) * rr, ry + Math.sin(b) * rr, j.basin)), rx + ry + j.basin + 0.3, c2); }
      }
    }
  }
  function drawSmoke(t) {
    const night = E.light.night, col = night ? 0x4a4a62 : 0xd8d2cc, col2 = night ? 0x3a3a52 : 0xbcb6b2;
    for (let s = 0; s < B.smokes.length; s++) {
      const m = B.smokes[s];
      for (let i = 0; i < 7; i++) {
        const u = (t * 0.16 + i / 7 + s * 0.13) % 1, z = m[2] + u * 3.2, x = m[0] + u * u * 1.6 + Math.sin(t * 0.7 + i) * 0.1, y = m[1] - u * u * 0.9;
        const sx = Math.round(E.sx(x, y)), sy = Math.round(E.sy(x, y, z)), r = 1.5 + u * 4.5, d = x + y + z + 1, dens = 1 - u;
        for (let dy = -Math.ceil(r); dy <= r; dy++) for (let dx = -Math.ceil(r); dx <= r; dx++) {
          if (dx * dx + dy * dy > r * r) continue;
          if (h2(sx + dx + i * 7, sy + dy + (t * 2 | 0)) > dens * 0.85) continue;
          E.px(sx + dx, sy + dy, d, (dx + dy) < 0 ? col : col2);
        }
      }
    }
  }
  function drawFlags(t) {
    for (const f of B.flags) {
      const pole = f.pole || 0.8, sx = Math.round(E.sx(f.x, f.y)), syB = Math.round(E.sy(f.x, f.y, f.z)), syT = Math.round(E.sy(f.x, f.y, f.z + pole)), d = f.x + f.y + f.z + 1;
      for (let y = syT; y <= syB; y++) E.px(sx, y, d, 0x4a4048);
      E.px(sx, syT - 1, d, 0xe8c84a);
      const L = E.lightAt(f.x, f.y, f.z);
      for (let c = 1; c <= 12; c++) {
        const off = Math.round(Math.sin(t * 5 - c * 0.6 + f.x) * 1.4 * c / 12), sl = Math.cos(t * 5 - c * 0.6 + f.x);
        const hgt = c > 9 ? 7 - (c - 9) : 7;
        for (let r = 0; r < hgt; r++) {
          let col = (r === 3 || c === 5) && f.c2 !== 0 ? (f.c2 || 0xf4e8c0) : f.c; col = T.mul(col, (sl > 0.3 ? 1.1 : sl < -0.3 ? 0.8 : 0.95));
          const rr = Math.min(255, (col >> 16 & 255) * L[0]), gg = Math.min(255, (col >> 8 & 255) * L[1]), bb = Math.min(255, (col & 255) * L[2]);
          E.px(sx + c, syT + r + off + (c > 9 ? (c - 9) >> 1 : 0), d, (rr << 16) | (gg << 8) | (bb | 0));
        }
      }
    }
  }
  function drawFlames(t) {
    for (let k = 0; k < B.flames.length; k++) {
      const f = B.flames[k], sx = Math.round(E.sx(f.x, f.y)), sy = Math.round(E.sy(f.x, f.y, f.z)), d = f.x + f.y + f.z + 0.4, ph = Math.floor(t * 9 + k * 3);
      const hgt = Math.round((4 + h2(ph, k) * 3) * f.s), w = Math.round(1.5 * f.s);
      for (let y = 0; y < hgt; y++) {
        const ww = Math.max(0, Math.round(w * (1 - y / hgt) + (h2(ph, y + k) - 0.5))), lean = Math.round((h2(ph + 1, k) - 0.5) * 2 * y / hgt);
        for (let x = -ww; x <= ww; x++) E.px(sx + x + lean, sy - y, d, y < hgt * 0.35 ? (x === 0 ? 0xfff2a8 : 0xffc84a) : y < hgt * 0.7 ? 0xff9a2e : 0xe0521e);
      }
      for (let i = 0; i < 2; i++) { const u = (t * 0.9 + i * 0.5 + k * 0.3) % 1; E.px(sx + Math.round(Math.sin(u * 9 + k) * 2), sy - hgt - Math.round(u * 9), d, 0xffb04a); }
    }
  }
  Sim.draw = function (t) {
    if (waterInfo && waterInfo.length) drawWater(t);
    const list = people.slice().sort((a, b) => (a.x + a.y) - (b.x + b.y));
    for (const p of list) drawPerson(p, t);
    drawJets(t); drawFlames(t); drawSmoke(t); drawFlags(t);
  };
  Sim.personAt = function (lx, ly) {
    let best = null, bd = 14;
    for (const p of people) { const d = Math.hypot(p.scrX - lx, p.scrY - ly); if (d < bd) { bd = d; best = p; } }
    return best;
  };
})();
