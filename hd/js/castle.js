'use strict';
/*
 * The castle: a set of areas (courtyards, floors of the keep, undercroft, towers) joined by portals.
 * Each area is baked once and kept in memory, so walking back through a door is instant.
 * Walking is height-aware: every floor and stair registers its height, and a step is only allowed
 * between neighbouring cells whose heights nearly match, so ledges and walls need no extra colliders.
 */
const Castle = { areas: {}, start: ['ward', null] };
Castle.add = (id, def) => { def.id = id; Castle.areas[id] = def; };
(function () {
  const $ = id => document.getElementById(id), h2 = E.h2, HW = E.HW, HH = E.HH, ZS = E.ZS, RES = 3;
  const cv = $('view'), ctx = cv.getContext('2d'), off = document.createElement('canvas'), octx = off.getContext('2d');
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, rnd = Math.random;
  let img, frame, dpr = 1, zoom = 2, camX = 0, camY = 0, time = 0, tod = 'day', cur = null, nav = null, K = null, staff = [], cache = new Map(), busyN = 0, arrived = null, seen = new Set();

  const OUT = { day: { L: [-0.45, 0.75, 0.8], sun: [0.84, 0.7, 0.46], amb: [0.5, 0.52, 0.68], fill: [0.16, 0.15, 0.13], night: false, lamp: 0.15, bg: [20, 17, 26] },
    dusk: { L: [-0.8, 0.5, 0.36], sun: [1.02, 0.52, 0.22], amb: [0.4, 0.36, 0.6], fill: [0.1, 0.08, 0.14], night: true, lamp: 0.65, bg: [22, 16, 28], glow: [255, 190, 96] },
    night: { L: [0.5, 0.42, 0.75], sun: [0.14, 0.2, 0.4], amb: [0.16, 0.19, 0.38], fill: [0.03, 0.04, 0.08], night: true, lamp: 1, bg: [10, 10, 20], glow: [255, 200, 104] } };
  const IN = { day: { L: [-0.8, 0.2, 0.52], sun: [1.2, 1.0, 0.68], amb: [0.42, 0.39, 0.5], fill: [0.1, 0.08, 0.06], night: true, lamp: 0.75, bg: [14, 11, 18] },
    dusk: { L: [-0.85, 0.16, 0.34], sun: [1.45, 0.66, 0.28], amb: [0.34, 0.28, 0.42], fill: [0.08, 0.05, 0.05], night: true, lamp: 0.95, bg: [14, 10, 16] },
    night: { L: [-0.75, 0.25, 0.6], sun: [0.22, 0.34, 0.66], amb: [0.15, 0.15, 0.27], fill: [0.02, 0.02, 0.05], night: false, lamp: 1.3, bg: [7, 7, 14] } };

  /* ---------- people ---------- */
  const SKIN = [0xf0c8a0, 0xe6b88a, 0xd9a273, 0xb9805a, 0x8a5a3c], HAIR = [0x3a2a20, 0x5a3a24, 0x8a5a2c, 0xc9a04a, 0x2a2428, 0x9a9a9a, 0xb5532a], CLOTH = [0x9a3a34, 0x3f5f8a, 0x4f7a48, 0x8a6a3a, 0x6a4a7a, 0xb8863a, 0x4a7a7a, 0xa85a3a, 0x7a7a6a, 0xc9b48a];
  function look(o, i) {
    const r = k => h2(i * 7 + k, 91 + i), pick = (a, k) => a[(r(k) * a.length) | 0];
    const p = { role: o.role || 'villager', x: 0, y: 0, fx: 1, fy: 1, moving: false, phase: r(1) * 4, skin: pick(SKIN, 2), hair: pick(HAIR, 3), top: o.top || pick(CLOTH, 4), bot: [0x4a3a2e, 0x3a3a4a, 0x5a4a36, 0x2e2e36][(r(5) * 4) | 0], fem: o.fem === undefined ? r(6) < 0.5 : o.fem, hat: o.hat === undefined ? (r(7) < 0.35 ? 1 + ((r(8) * 3) | 0) : 0) : o.hat, hatc: pick(CLOTH, 9), apron: !!o.apron, child: false, sit: false, z: 0, bubble: 0, name: o.name || 'Servant' };
    if (p.role === 'king') { p.skin = SKIN[0]; p.hair = HAIR[1]; p.fem = false; }
    return p;
  }

  /* ---------- navigation grid with heights ---------- */
  function buildNav(a) {
    const b = a.bounds, gw = Math.ceil((b[2] - b[0]) * RES), gh = Math.ceil((b[3] - b[1]) * RES), z = new Float32Array(gw * gh).fill(NaN);
    const cells = (x0, y0, x1, y1, fn) => { for (let gy = Math.max(0, Math.round((y0 - b[1]) * RES)); gy < Math.min(gh, Math.round((y1 - b[1]) * RES)); gy++) for (let gx = Math.max(0, Math.round((x0 - b[0]) * RES)); gx < Math.min(gw, Math.round((x1 - b[0]) * RES)); gx++) fn(gy * gw + gx, (gx + 0.5) / RES + b[0], (gy + 0.5) / RES + b[1]); };
    for (const f of a.floors) cells(f[0], f[1], f[2], f[3], i => { z[i] = f[4]; });
    for (const r of a.ramps) cells(r.x0, r.y0, r.x1, r.y1, (i, x, y) => { const u = r.ax === 'x' ? (x - r.x0) / (r.x1 - r.x0) : (y - r.y0) / (r.y1 - r.y0); z[i] = r.z0 + (r.z1 - r.z0) * (r.up ? u : 1 - u); });
    const pad = 0.16; for (const k of B.blocks) { const bz = k[4] || 0; cells(k[0] - pad, k[1] - pad, k[0] + k[2] + pad, k[1] + k[3] + pad, i => { if (z[i] > bz - 0.3 && z[i] < bz + 1.2) z[i] = NaN; }); }
    return { gw, gh, z, x0: b[0], y0: b[1] };
  }
  const cellOf = (x, y) => { const gx = Math.floor((x - nav.x0) * RES), gy = Math.floor((y - nav.y0) * RES); return gx < 0 || gy < 0 || gx >= nav.gw || gy >= nav.gh ? -1 : gy * nav.gw + gx; };
  const zAt = (x, y) => { const c = cellOf(x, y); return c < 0 ? NaN : nav.z[c]; };
  const STEP = 0.42;
  function canStep(x, y, z) { const nz = zAt(x, y); return !(nz !== nz) && Math.abs(nz - z) <= STEP; }
  function nearest(x, y, z, R) {      // closest walkable point to (x,y) at about height z
    let best = null, bd = 1e9; const n = Math.ceil((R || 1.6) * RES), gx0 = Math.floor((x - nav.x0) * RES), gy0 = Math.floor((y - nav.y0) * RES);
    for (let dy = -n; dy <= n; dy++) for (let dx = -n; dx <= n; dx++) { const gx = gx0 + dx, gy = gy0 + dy; if (gx < 0 || gy < 0 || gx >= nav.gw || gy >= nav.gh) continue; const cz = nav.z[gy * nav.gw + gx]; if (cz !== cz) continue; const d = dx * dx + dy * dy + (z === undefined ? 0 : Math.abs(cz - z) * 30); if (d < bd) { bd = d; best = [(gx + 0.5) / RES + nav.x0, (gy + 0.5) / RES + nav.y0, cz]; } }
    return best;
  }
  function findPath(x0, y0, x1, y1) {
    const s = cellOf(x0, y0), e = cellOf(x1, y1); if (s < 0 || e < 0 || nav.z[e] !== nav.z[e]) return null;
    const gw = nav.gw, gh = nav.gh, z = nav.z, prev = new Int32Array(gw * gh).fill(-1), q = [s]; prev[s] = s;
    for (let qi = 0; qi < q.length; qi++) {
      const c = q[qi]; if (c === e) break; const cx = c % gw, cy = (c / gw) | 0, cz = z[c];
      for (let k = 0; k < 8; k++) { const dx = [1, -1, 0, 0, 1, 1, -1, -1][k], dy = [0, 0, 1, -1, 1, -1, 1, -1][k], nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue; const n = ny * gw + nx; if (prev[n] >= 0) continue; const nz = z[n]; if (nz !== nz || Math.abs(nz - cz) > STEP) continue;
        if (dx && dy) { const a = z[cy * gw + nx], b = z[ny * gw + cx]; if (a !== a || b !== b || Math.abs(a - cz) > STEP || Math.abs(b - cz) > STEP) continue; }
        prev[n] = c; q.push(n); }
    }
    if (prev[e] < 0) return null;
    const out = []; let c = e; while (c !== s) { out.push([(c % gw + 0.5) / RES + nav.x0, (((c / gw) | 0) + 0.5) / RES + nav.y0]); c = prev[c]; }
    out.reverse(); if (out.length) out[out.length - 1] = [x1, y1]; return out;
  }

  /* ---------- areas ---------- */
  function build(a) {
    const b = a.bounds, zt = b[4], zb = b[5] || 0, W = Math.ceil((b[2] - b[0] + b[3] - b[1]) * HW), H = Math.ceil((b[2] - b[0] + b[3] - b[1]) * HH + (zt + zb) * ZS) + 10;
    E.init(W, H, Math.round(-(b[0] - b[3]) * HW), Math.round(-(b[0] + b[1]) * HH + zt * ZS) + 5);
    B.reset(); if (B.flies !== undefined) { /* forest.js wraps reset and clears its own lists */ }
    Kit.begin(a); a.build(a);
    const t = Object.assign({}, (a.interior ? IN : OUT)[tod], (a.light && a.light[tod]) || {}), Lt = E.light;
    Lt.L = E.norm(t.L); Lt.sun = t.sun; Lt.amb = t.amb; Lt.fill = t.fill; Lt.night = t.night; Lt.lampScale = t.lamp; Lt.bg = t.bg; if (t.glow) Lt.glow = t.glow;
    E.bake(Object.assign([b[0], b[1], b[2], b[3], zt], a.shadow || {}));
  }
  function enter(id, at, fromPortal) {
    const rm = Castle.remap && Castle.remap[id + '/' + at]; if (rm) { id = rm[0]; at = rm[1]; }     // a layout may move a door to another area
    const a = Castle.areas[id]; if (!a) return;
    busyN++; $('busy').textContent = a.name.toUpperCase(); $('busy').classList.add('on');
    setTimeout(() => {
      const key = id + '|' + tod; let c = cache.get(key);
      if (c) { E.load(c.snap); Object.assign(B, c.b); cache.delete(key); cache.set(key, c); }
      else {
        build(a); c = { snap: E.save(), b: {}, nav: buildNav(a), staff: null };
        for (const k of ['blocks', 'pois', 'flames', 'flags', 'jets', 'smokes', 'flies', 'falls', 'deer', 'gulls']) c.b[k] = B[k];
        c.px = E.W * E.H; cache.set(key, c); let tot = 0; for (const v of cache.values()) tot += v.px; while (tot > 9e6 && cache.size > 1) { const k0 = cache.keys().next().value; tot -= cache.get(k0).px; cache.delete(k0); }
      }
      cur = a; nav = c.nav; off.width = E.W; off.height = E.H; img = octx.createImageData(E.W, E.H); frame = new Uint32Array(img.data.buffer);
      if (!a.rt) a.rt = a.roster.map((o, i) => mkStaff(o, i)); staff = a.rt;
      let p = a.portals.find(q => q.name === at) || null, sx, sy, sz;
      if (p) { const n = nearest(p.ex === undefined ? p.x : p.ex, p.ey === undefined ? p.y : p.ey, p.z, 2); sx = n[0]; sy = n[1]; sz = n[2]; arrived = p; }
      else { const s = a.spawn || [(a.bounds[0] + a.bounds[2]) / 2, (a.bounds[1] + a.bounds[3]) / 2, 0], n = nearest(s[0], s[1], s[2] || 0, 4); sx = n[0]; sy = n[1]; sz = n[2]; arrived = null; }
      K.x = sx; K.y = sy; K.z = sz; K.path = null; K.hold = null; K.p.z = sz;
      camX = E.sx(K.x, K.y); camY = E.sy(K.x, K.y, K.z + 0.6);
      seen.add(id); $('area').textContent = a.name; $('sub').textContent = a.blurb || ''; labels();
      try { location.hash = id; } catch (e) { }
      if (--busyN <= 0) $('busy').classList.remove('on');
    }, 30);
  }
  function labels() {
    const el = $('labels'); el.innerHTML = '';
    for (const p of cur.portals) { if (!p.label) continue; const d = document.createElement('div'); d.className = 'plabel'; d.textContent = p.label; d.onclick = e => { e.stopPropagation(); walkTo(p.x, p.y, p.z); }; el.appendChild(d); p.el = d; }
  }

  /* ---------- movement ---------- */
  function mkStaff(o, i) {
    const s = { o, p: look(o, i + 3 + (cur ? cur.id.length * 13 : 0)), x: 0, y: 0, z: 0, path: null, wait: rnd() * 3, speed: 1.0 + rnd() * 0.4, poi: null, doing: o.doing || '' };
    const at = o.at || [0, 0, 0], n = nearest(at[0], at[1], at[2] || 0, 3) || [at[0], at[1], at[2] || 0]; s.x = n[0]; s.y = n[1]; s.z = n[2]; s.p.name = o.name || s.p.name;
    if (o.fixed) { s.fixed = true; s.p.fx = o.fixed[0]; s.p.fy = o.fixed[1]; if (o.sit !== undefined) { s.p.sit = true; s.z = o.sit; s.x = at[0]; s.y = at[1]; } }
    return s;
  }
  function follow(m, dt) {
    if (!m.path || !m.path.length) { m.p.moving = false; return false; }
    const t = m.path[0], dx = t[0] - m.x, dy = t[1] - m.y, d = Math.hypot(dx, dy), st = m.speed * dt;
    if (d <= st) { m.x = t[0]; m.y = t[1]; m.path.shift(); } else { m.x += dx / d * st; m.y += dy / d * st; m.p.fx = dx / d; m.p.fy = dy / d; }
    const z = zAt(m.x, m.y); if (z === z) m.z += (z - m.z) * Math.min(1, dt * 14);
    m.p.moving = true; m.p.phase += dt * m.speed * 5; if (!m.path.length) { m.path = null; m.p.moving = false; } return true;
  }
  function walkTo(x, y, z) { const n = nearest(x, y, z, 1.8); if (!n) return false; const p = findPath(K.x, K.y, n[0], n[1]); if (!p) return false; K.path = p; K.hold = null; K.p.sit = false; marker = [n[0], n[1], n[2], 1]; return true; }
  let marker = null;
  function update(dt) {
    time += dt;
    // king: hold = steer straight toward the finger, sliding along edges
    if (K.hold) {
      const dx = K.hold[0] - K.x, dy = K.hold[1] - K.y, d = Math.hypot(dx, dy);
      if (d > 0.2) { const st = K.speed * dt, ux = dx / d, uy = dy / d, zc = zAt(K.x, K.y); let mv = false;
        for (const [ax, ay] of [[ux, uy], [ux, 0], [0, uy]]) { if (!ax && !ay) continue; const m = Math.hypot(ax, ay), nx = K.x + ax / m * st * (m < 1 ? Math.abs(ax + ay) : 1), ny = K.y + ay / m * st * (m < 1 ? Math.abs(ax + ay) : 1); if (canStep(nx, ny, zc) && canStep(nx + ax / m * 0.12, ny + ay / m * 0.12, zc)) { K.x = nx; K.y = ny; mv = true; break; } }
        K.p.fx = ux; K.p.fy = uy; K.p.moving = mv; if (mv) K.p.phase += dt * K.speed * 5; const z = zAt(K.x, K.y); if (z === z) K.z += (z - K.z) * Math.min(1, dt * 14); K.p.sit = false;
      } else K.p.moving = false;
    } else follow(K, dt);
    // portals
    if (arrived && Math.hypot(K.x - arrived.x, K.y - arrived.y) > arrived.r + 0.5) arrived = null;
    if (!busyN) for (const p of cur.portals) { if (p === arrived || !p.to) continue; if (Math.abs(K.z - p.z) < 0.6 && Math.hypot(K.x - p.x, K.y - p.y) < p.r) { if (p.to === cur.id) { const q = cur.portals.find(r => r.name === p.at); if (q) { const n = nearest(q.ex === undefined ? q.x : q.ex, q.ey === undefined ? q.y : q.ey, q.z, 2); K.x = n[0]; K.y = n[1]; K.z = n[2]; K.path = null; K.hold = null; arrived = q; camX = E.sx(K.x, K.y); camY = E.sy(K.x, K.y, K.z); } } else enter(p.to, p.at); break; } }
    // staff: wander between the places their job uses
    for (const s of staff) {
      if (s.fixed) continue;
      if (follow(s, dt)) continue;
      s.wait -= dt; if (s.wait > 0) continue;
      if (s.poi && s.poi.sit !== undefined && s.p.sit) { s.p.sit = false; const n = nearest(s.x, s.y, s.poi.z, 1.5); if (n) { s.x = n[0]; s.y = n[1]; s.z = n[2]; } }
      const kinds = s.o.kinds, list = B.pois.filter(q => (!kinds || kinds.indexOf(q.kind) >= 0) && !q.busy); if (!list.length) { s.wait = 3; continue; }
      const q = list[(rnd() * list.length) | 0], n = nearest(q.ax === undefined ? q.x : q.ax, q.ay === undefined ? q.y : q.ay, q.z || 0, 1.4); if (!n) { s.wait = 2; continue; }
      const p = findPath(s.x, s.y, n[0], n[1]); if (!p) { s.wait = 2; continue; }
      if (s.poi) s.poi.busy = false; s.poi = q; q.busy = true; s.path = p; s.wait = 4 + rnd() * 9; s.arr = false;
    }
    for (const s of staff) if (!s.fixed && !s.path && s.poi && !s.arr) { s.arr = true; const q = s.poi; if (q.fx || q.fy) { s.p.fx = q.fx; s.p.fy = q.fy; } if (q.sit !== undefined) { s.p.sit = true; s.x = q.x; s.y = q.y; s.z = q.sit; } }
  }

  /* ---------- drawing ---------- */
  function blend(ix, iy, d, c, a) { if (ix < 0 || iy < 0 || ix >= E.W || iy >= E.H) return; const i = iy * E.W + ix; if (E.dep[i] > d) return; const p = frame[i], r = (p & 255) * (1 - a) + (c >> 16 & 255) * a, g = (p >> 8 & 255) * (1 - a) + (c >> 8 & 255) * a, b = (p >> 16 & 255) * (1 - a) + (c & 255) * a; frame[i] = 0xff000000 | (b << 16) | (g << 8) | r; }
  function ring(x, y, z, R, w, col, a) { const sx = E.sx(x, y), sy = E.sy(x, y, z), rx = Math.ceil(R * HW * 1.45), ry = Math.ceil(R * HH * 1.45); for (let iy = Math.floor(sy - ry); iy <= sy + ry; iy++) for (let ix = Math.floor(sx - rx); ix <= sx + rx; ix++) { const u = (ix + 0.5 - sx) / HW, v = (iy + 0.5 - sy) / HH, dx = (v + u) / 2, dy = (v - u) / 2, d = Math.hypot(dx, dy); if (d > R || d < R - w) continue; blend(ix, iy, x + y + z + 0.04, col, ((ix + iy) & 1) ? a : a * 0.55); } }
  function draw() {
    { const vh = cv.height / zoom, r0 = clamp(Math.floor(camY - vh / 2 - 120), 0, E.H), r1 = clamp(Math.ceil(camY + vh / 2 + 120), 0, E.H); E.frame = frame; frame.set(E.base.subarray(r0 * E.W, r1 * E.W), r0 * E.W); }   // only the rows on screen
    for (const p of cur.portals) { if (!p.to) continue; const pu = 0.5 + 0.5 * Math.sin(time * 3 + p.x); ring(p.x, p.y, p.z, p.r * (0.8 + 0.15 * pu), 0.1, 0xffe27a, 0.35 + 0.3 * pu); }
    if (marker) { marker[3] -= 0.03; if (marker[3] <= 0) marker = null; else ring(marker[0], marker[1], marker[2], 0.35 * marker[3] + 0.1, 0.07, 0xffffff, 0.6); }
    const list = staff.concat([K]).sort((a, b) => (a.x + a.y) - (b.x + b.y));
    for (const m of list) { m.p.x = m.x; m.p.y = m.y; m.p.z = m.z; Sim.drawPerson(m.p, time); }
    if (Sim.fx) for (const f of Sim.fx) f(time);
    const tx = E.sx(K.x, K.y), ty = E.sy(K.x, K.y, K.z + 0.6); camX += (tx - camX) * 0.1; camY += (ty - camY) * 0.1;
    const vw = cv.width / zoom, vh = cv.height / zoom, x0 = camX - vw / 2, y0 = camY - vh / 2;
    const dx0 = Math.max(0, Math.floor(x0)), dy0 = Math.max(0, Math.floor(y0)), dw = Math.min(E.W, Math.ceil(x0 + vw) + 1) - dx0, dh = Math.min(E.H, Math.ceil(y0 + vh) + 1) - dy0;
    if (dw > 0 && dh > 0) octx.putImageData(img, 0, 0, dx0, dy0, dw, dh);
    const bg = E.light.bg; ctx.fillStyle = 'rgb(' + bg[0] + ',' + bg[1] + ',' + bg[2] + ')'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.imageSmoothingEnabled = zoom < 1;
    if (dw > 0 && dh > 0) ctx.drawImage(off, dx0, dy0, dw, dh, Math.round((dx0 - x0) * zoom), Math.round((dy0 - y0) * zoom), dw * zoom, dh * zoom);
    for (const p of cur.portals) if (p.el) { p.el.style.left = ((E.sx(p.x, p.y) - camX) * zoom + cv.width / 2) / dpr + 'px'; p.el.style.top = ((E.sy(p.x, p.y, p.z + 1.5) - camY) * zoom + cv.height / 2) / dpr + 'px'; }
  }

  /* ---------- input ---------- */
  const ptr = new Map(); let G = null, pinch0 = 0, zoom0 = 1;
  const toWorld = (cx, cy, z) => { const lx = camX + (cx * dpr - cv.width / 2) / zoom, ly = camY + (cy * dpr - cv.height / 2) / zoom + z * ZS, a = (lx - E.OX) / HW, b = (ly - E.OY) / HH; return [(b + a) / 2, (b - a) / 2, lx, ly - z * ZS]; };
  cv.addEventListener('pointerdown', e => { try { cv.setPointerCapture(e.pointerId); } catch (er) { } ptr.set(e.pointerId, [e.clientX, e.clientY]); if (ptr.size === 2) { const a = [...ptr.values()]; pinch0 = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]) || 1; zoom0 = zoom; G = null; K.hold = null; return; } G = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: performance.now(), x: e.clientX, y: e.clientY, held: false }; });
  cv.addEventListener('pointermove', e => { if (!ptr.has(e.pointerId)) return; ptr.set(e.pointerId, [e.clientX, e.clientY]); if (ptr.size === 2) { const a = [...ptr.values()]; zoom = clamp(zoom0 * Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]) / pinch0, 0.6, 8); return; } if (G && e.pointerId === G.id) { G.x = e.clientX; G.y = e.clientY; } });
  const up = e => { if (!ptr.has(e.pointerId)) return; ptr.delete(e.pointerId); if (!G || e.pointerId !== G.id) return; const g = G; G = null; K.hold = null; if (busyN || !cur) return;
    if (!g.held && Math.hypot(g.x - g.x0, g.y - g.y0) < 14) { const w = toWorld(g.x, g.y, 0), hit = E.pick(w[2], w[3]); if (hit) walkTo(hit.x, hit.y, hit.z); } };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', e => { e.preventDefault(); zoom = clamp(zoom * Math.exp(-e.deltaY * 0.0015), 0.6, 8); }, { passive: false });
  cv.addEventListener('contextmenu', e => e.preventDefault());

  /* ---------- shell ---------- */
  function resize() { dpr = Math.min(3, window.devicePixelRatio || 1); cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr); if (!resize.done) { zoom = clamp(Math.min(cv.width / 760, cv.height / 620), 0.8, 6); resize.done = true; } }
  addEventListener('resize', resize); resize();
  function menu() {
    const t = $('times'); t.innerHTML = ''; for (const k of ['day', 'dusk', 'night']) { const b = document.createElement('button'); b.textContent = k; if (k === tod) b.className = 'on'; b.onclick = () => { tod = k; cache.clear(); menu(); enter(cur.id, arrived ? arrived.name : null); }; t.appendChild(b); }
    const m = $('map'); m.innerHTML = '<option value="">Go to…</option>' + Object.keys(Castle.areas).map(k => '<option value="' + k + '">' + Castle.areas[k].name + '</option>').join(''); m.onchange = () => { if (m.value) enter(m.value, null); m.value = ''; };
  }
  let last = 0;
  function tick(now) {
    requestAnimationFrame(tick); const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now; if (!cur || busyN) return;
    if (G && !G.held && performance.now() - G.t0 > 180) G.held = true;
    if (G && G.held) { const w = toWorld(G.x, G.y, K.z); K.hold = [w[0], w[1]]; K.path = null; }
    update(dt); draw();
  }
  Castle.go = function () {
    K = { x: 0, y: 0, z: 0, speed: 2.5, path: null, hold: null, p: look({ role: 'king', name: 'The King' }, 0) };
    menu(); const h = (location.hash || '').slice(1); enter(Castle.areas[h] ? h : Castle.start[0], Castle.areas[h] ? null : Castle.start[1]); requestAnimationFrame(tick);
    window.__cs = { K: () => K, cur: () => cur, nav: () => nav, enter, walkTo, update, draw, staff: () => staff, zAt, findPath, busy: () => busyN };
  };
})();
