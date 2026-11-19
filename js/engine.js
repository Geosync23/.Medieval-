'use strict';
/*
 * Tiny software "deferred" isometric pixel renderer.
 *
 * Scenes are built from textured quads / triangles / leaf blobs in 3D world
 * space.  They are rasterised once into a G-buffer (albedo, depth, world
 * position, normal), lit with a sun shadow-map + point lights in a small
 * number of discrete bands (so it reads as pixel art, not as a 3D render),
 * and outlined.  Every frame the baked image is copied and dynamic sprites
 * (people, water, smoke...) are drawn on top with a per-pixel depth test.
 */
const E = {};
(function () {
  const HW = 16, HH = 8, ZS = 20;            // half tile w/h in px, px per unit height
  E.HW = HW; E.HH = HH; E.ZS = ZS;
  E.F_WIN = 1; E.F_EMIS = 2; E.F_WATER = 4; E.F_SOFT = 8; E.F_NOLINE = 16;

  let W = 0, H = 0, OX = 0, OY = 0, N = 0;
  let alb, dep, wpx, wpy, wpz, nrx, nry, nrz, flg, base, lit;
  let prims = [], lights = [];
  let SM, SMW = 0, SMS = 20, smA, smB, smL, smOX = 0, smOY = 0;
  E.water = [];

  // view basis (for blobs)
  const DN = norm([1, 1, HH * 2 / ZS]);
  const RV = norm([1, -1, 0]);
  const UV = cross(RV, DN);

  function norm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  E.norm = norm;

  E.light = {
    L: norm([-0.45, 0.75, 0.8]),
    sun: [0.80, 0.66, 0.44], amb: [0.50, 0.52, 0.70],
    fill: [0.16, 0.15, 0.13], fillDir: norm([0.8, -0.3, 0.35]),
    night: false, glow: [255, 196, 92], lampScale: 0, bg: [24, 20, 30],
  };

  E.init = function (w, h, ox, oy) {
    W = w; H = h; OX = ox; OY = oy; N = w * h;
    E.W = W; E.H = H; E.OX = OX; E.OY = OY;
    alb = new Uint8Array(N * 3); dep = new Float32Array(N);
    wpx = new Float32Array(N); wpy = new Float32Array(N); wpz = new Float32Array(N);
    nrx = new Float32Array(N); nry = new Float32Array(N); nrz = new Float32Array(N);
    flg = new Uint8Array(N); base = new Uint32Array(N); lit = new Float32Array(N * 3);
    E.dep = dep; E.base = base;
    prims = []; lights = [];
  };
  E.sx = (x, y) => (x - y) * HW + OX;
  E.sy = (x, y, z) => (x + y) * HH - (z || 0) * ZS + OY;

  /* ---------- primitive registration ---------- */
  E.quad = function (o, u, v, tex, opt) {
    const q = Object.assign({ k: 0, o, u, v, tex, s0: 0, t0: 0, bias: 0, P: null, tri: false, f: 0 }, opt || {});
    q.ul = Math.hypot(u[0], u[1], u[2]); q.vl = Math.hypot(v[0], v[1], v[2]);
    if (!q.n) { let n = norm(cross(u, v)); if (dot(n, DN) < 0) n = [-n[0], -n[1], -n[2]]; q.n = n; }
    else if (dot(q.n, DN) < -0.02) { q.back = true; q.n = [-q.n[0], -q.n[1], -q.n[2]]; }   // underside (eaves etc.)
    prims.push(q); return q;
  };
  E.blob = function (c, r, tex, opt) {
    const b = Object.assign({ k: 1, c, r, tex, P: null }, opt || {});
    prims.push(b); return b;
  };
  E.addLight = function (x, y, z, r, col, power) { lights.push({ x, y, z, r, col: col || [1.0, 0.72, 0.36], p: power || 1 }); };
  E.lights = () => lights;

  /* ---------- camera pass ---------- */
  function put(i, c, d, X, Y, Z, n, f) {
    dep[i] = d; const j = i * 3;
    alb[j] = (c >> 16) & 255; alb[j + 1] = (c >> 8) & 255; alb[j + 2] = c & 255;
    wpx[i] = X; wpy[i] = Y; wpz[i] = Z; nrx[i] = n[0]; nry[i] = n[1]; nrz[i] = n[2];
    flg[i] = ((c >> 24) & 127) | f;
  }
  function rasterCam(q) {
    const o = q.o, u = q.u, v = q.v;
    const ox = (o[0] - o[1]) * HW + OX, oy = (o[0] + o[1]) * HH - o[2] * ZS + OY;
    const ux = (u[0] - u[1]) * HW, uy = (u[0] + u[1]) * HH - u[2] * ZS;
    const vx = (v[0] - v[1]) * HW, vy = (v[0] + v[1]) * HH - v[2] * ZS;
    const det = ux * vy - uy * vx; if (Math.abs(det) < 1e-3) return;
    let x0 = Math.min(ox, ox + ux, ox + vx, ox + ux + vx), x1 = Math.max(ox, ox + ux, ox + vx, ox + ux + vx);
    let y0 = Math.min(oy, oy + uy, oy + vy, oy + uy + vy), y1 = Math.max(oy, oy + uy, oy + vy, oy + uy + vy);
    x0 = Math.max(0, Math.floor(x0)); x1 = Math.min(W - 1, Math.ceil(x1));
    y0 = Math.max(0, Math.floor(y0)); y1 = Math.min(H - 1, Math.ceil(y1));
    const e = 1e-4, tri = q.tri, bias = q.bias, n = q.n, tex = q.tex, ul = q.ul, vl = q.vl, s0 = q.s0, t0 = q.t0, f = q.f;
    for (let iy = y0; iy <= y1; iy++) {
      const dy = iy + 0.5 - oy;
      for (let ix = x0; ix <= x1; ix++) {
        const dx = ix + 0.5 - ox;
        const a = (dx * vy - dy * vx) / det, b = (ux * dy - uy * dx) / det;
        if (a < -e || a > 1 + e || b < -e || b > 1 + e) continue;
        if (tri && a + b > 1 + e) continue;
        const X = o[0] + a * u[0] + b * v[0], Y = o[1] + a * u[1] + b * v[1], Z = o[2] + a * u[2] + b * v[2];
        const d = X + Y + Z + bias, i = iy * W + ix;
        if (d < dep[i]) continue;
        let c = tex(a * ul + s0, b * vl + t0, q, a, b);
        if (c < 0) continue;
        if (q.back) c = 0x4a382c;
        put(i, c, d, X, Y, Z, n, f);
      }
    }
  }
  const nb = [0, 0, 0];
  function rasterBlobCam(bl) {
    const c = bl.c, r = bl.r, rp = r * 21;
    const cx = (c[0] - c[1]) * HW + OX, cy = (c[0] + c[1]) * HH - c[2] * ZS + OY;
    const x0 = Math.max(0, Math.floor(cx - rp)), x1 = Math.min(W - 1, Math.ceil(cx + rp));
    const y0 = Math.max(0, Math.floor(cy - rp)), y1 = Math.min(H - 1, Math.ceil(cy + rp));
    for (let iy = y0; iy <= y1; iy++) for (let ix = x0; ix <= x1; ix++) {
      const dx = (ix + 0.5 - cx) / rp, dy = (iy + 0.5 - cy) / rp, d2 = dx * dx + dy * dy;
      if (d2 > 1) continue;
      const nz = Math.sqrt(1 - d2);
      nb[0] = dx * RV[0] - dy * UV[0] + nz * DN[0];
      nb[1] = dx * RV[1] - dy * UV[1] + nz * DN[1];
      nb[2] = dx * RV[2] - dy * UV[2] + nz * DN[2];
      const X = c[0] + nb[0] * r, Y = c[1] + nb[1] * r, Z = c[2] + nb[2] * r;
      const d = X + Y + Z, i = iy * W + ix;
      if (d < dep[i]) continue;
      const col = bl.tex(dx, dy, ix, iy, bl, d2);
      if (col < 0) continue;
      put(i, col, d, X, Y, Z, nb, E.F_SOFT);
    }
  }

  /* ---------- shadow map ---------- */
  function setupShadow(bounds) {
    const L = E.light.L;
    smL = L; smA = norm(cross(L, [0, 0, 1])); smB = cross(L, smA);
    // bounds: [x0,y0,x1,y1,zmax]
    let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
    for (const x of [bounds[0], bounds[2]]) for (const y of [bounds[1], bounds[3]]) for (const z of [0, bounds[4]]) {
      const p = [x, y, z], a = dot(p, smA), b = dot(p, smB);
      a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b);
    }
    SMS = 22;
    const w = Math.ceil((a1 - a0) * SMS) + 4, h = Math.ceil((b1 - b0) * SMS) + 4;
    SMW = w; smOX = -a0 * SMS + 2; smOY = -b0 * SMS + 2;
    SM = new Float32Array(w * h).fill(-1e9); SM.h = h;
  }
  function rasterShadow(q) {
    if (q.noShadow) return;
    const A = smA, B = smB, L = smL, w = SMW, h = SM.h;
    if (q.k === 1) {
      const cx = dot(q.c, A) * SMS + smOX, cy = dot(q.c, B) * SMS + smOY, rp = q.r * SMS * 0.92, ld = dot(q.c, L);
      for (let iy = Math.max(0, Math.floor(cy - rp)); iy <= Math.min(h - 1, Math.ceil(cy + rp)); iy++)
        for (let ix = Math.max(0, Math.floor(cx - rp)); ix <= Math.min(w - 1, Math.ceil(cx + rp)); ix++) {
          const dx = ix + 0.5 - cx, dy = iy + 0.5 - cy; if (dx * dx + dy * dy > rp * rp) continue;
          const i = iy * w + ix; if (ld > SM[i]) SM[i] = ld;
        }
      return;
    }
    const o = q.o, u = q.u, v = q.v;
    const ox = dot(o, A) * SMS + smOX, oy = dot(o, B) * SMS + smOY;
    const ux = dot(u, A) * SMS, uy = dot(u, B) * SMS, vx = dot(v, A) * SMS, vy = dot(v, B) * SMS;
    const det = ux * vy - uy * vx; if (Math.abs(det) < 1e-4) return;
    let x0 = Math.min(ox, ox + ux, ox + vx, ox + ux + vx), x1 = Math.max(ox, ox + ux, ox + vx, ox + ux + vx);
    let y0 = Math.min(oy, oy + uy, oy + vy, oy + uy + vy), y1 = Math.max(oy, oy + uy, oy + vy, oy + uy + vy);
    x0 = Math.max(0, Math.floor(x0)); x1 = Math.min(w - 1, Math.ceil(x1));
    y0 = Math.max(0, Math.floor(y0)); y1 = Math.min(h - 1, Math.ceil(y1));
    const lo = dot(o, L), lu = dot(u, L), lv = dot(v, L), cut = q.cut, tri = q.tri;
    for (let iy = y0; iy <= y1; iy++) for (let ix = x0; ix <= x1; ix++) {
      const dx = ix + 0.5 - ox, dy = iy + 0.5 - oy;
      const a = (dx * vy - dy * vx) / det, b = (ux * dy - uy * dx) / det;
      if (a < 0 || a > 1 || b < 0 || b > 1) continue;
      if (tri && a + b > 1) continue;
      if (cut && q.tex(a * q.ul + q.s0, b * q.vl + q.t0, q, a, b) < 0) continue;
      const ld = lo + a * lu + b * lv, i = iy * w + ix;
      if (ld > SM[i]) SM[i] = ld;
    }
  }
  function sunVisible(X, Y, Z) {
    const A = smA, B = smB, L = smL;
    const ix = (X * A[0] + Y * A[1] + Z * A[2]) * SMS + smOX | 0, iy = (X * B[0] + Y * B[1] + Z * B[2]) * SMS + smOY | 0;
    if (ix < 0 || iy < 0 || ix >= SMW || iy >= SM.h) return 1;
    return SM[iy * SMW + ix] <= X * L[0] + Y * L[1] + Z * L[2] + 0.07 ? 1 : 0;
  }

  /* ---------- hash / dither ---------- */
  function h2(x, y) { let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
  E.h2 = h2;
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

  /* ---------- bake ---------- */
  E.bake = function (bounds) {
    const Lt = E.light, L = Lt.L, sun = Lt.sun, amb = Lt.amb, fill = Lt.fill, FD = Lt.fillDir;
    dep.fill(-1e9); flg.fill(0); alb.fill(0);
    setupShadow(bounds);
    for (const p of prims) rasterShadow(p);
    for (const p of prims) { if (p.shadowOnly) continue; if (p.k === 1) rasterBlobCam(p); else rasterCam(p); }
    E.water = [];
    const glow = Lt.glow;
    for (let i = 0; i < N; i++) {
      const j = i * 3;
      if (dep[i] < -1e8) { lit[j] = Lt.bg[0]; lit[j + 1] = Lt.bg[1]; lit[j + 2] = Lt.bg[2]; continue; }
      const f = flg[i];
      let r = alb[j], g = alb[j + 1], b = alb[j + 2];
      if (f & E.F_EMIS) { lit[j] = r; lit[j + 1] = g; lit[j + 2] = b; continue; }
      if ((f & E.F_WIN) && Lt.night) {
        if (r + g + b > 235) { lit[j] = r * 1.9 + 20; lit[j + 1] = g * 1.9 + 20; lit[j + 2] = b * 1.9 + 20; }   // stained glass keeps its hue
        else { const k = 0.55 + (r + g + b) / 300; lit[j] = glow[0] * k; lit[j + 1] = glow[1] * k; lit[j + 2] = glow[2] * k; }
        flg[i] |= E.F_EMIS; continue;
      }
      const nx = nrx[i], ny = nry[i], nz = nrz[i];
      let k = nx * L[0] + ny * L[1] + nz * L[2];
      if (k > 0) k *= sunVisible(wpx[i] + nx * 0.07, wpy[i] + ny * 0.07, wpz[i] + nz * 0.07); else k = 0;
      if (f & E.F_SOFT) {
        const ix = i % W, iy = (i / W) | 0, jit = (h2(ix >> 1, iy >> 1) - 0.5) * 0.22;
        k = k + jit > 0.62 ? 1 : k + jit > 0.22 ? 0.5 : 0;
      } else k = k > 0 ? 0.35 + 0.75 * k : 0;
      let fl = nx * FD[0] + ny * FD[1] + nz * FD[2]; if (fl < 0) fl = 0;
      lit[j] = r * (amb[0] + sun[0] * k + fill[0] * fl);
      lit[j + 1] = g * (amb[1] + sun[1] * k + fill[1] * fl);
      lit[j + 2] = b * (amb[2] + sun[2] * k + fill[2] * fl);
      if (f & E.F_WATER) E.water.push(i);
    }
    // point lights (banded + ordered dither)
    if (Lt.lampScale > 0) for (const lt of lights) {
      const cx = (lt.x - lt.y) * HW + OX, cy = (lt.x + lt.y) * HH - lt.z * ZS + OY, rp = lt.r * 24;
      const x0 = Math.max(0, Math.floor(cx - rp)), x1 = Math.min(W - 1, Math.ceil(cx + rp));
      const y0 = Math.max(0, Math.floor(cy - rp)), y1 = Math.min(H - 1, Math.ceil(cy + rp * 1.3));
      const pw = lt.p * Lt.lampScale;
      for (let iy = y0; iy <= y1; iy++) for (let ix = x0; ix <= x1; ix++) {
        const i = iy * W + ix; if (dep[i] < -1e8 || (flg[i] & E.F_EMIS)) continue;
        const dx = lt.x - wpx[i], dy = lt.y - wpy[i], dz = lt.z - wpz[i];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz); if (d >= lt.r) continue;
        let nl = (dx * nrx[i] + dy * nry[i] + dz * nrz[i]) / (d + 1e-3);
        if (flg[i] & E.F_SOFT) nl = 0.5 + 0.5 * nl;
        if (nl < 0.18) nl = 0.18;
        let v = 1 - d / lt.r; v = v * v * nl * pw * 3.4;
        v = Math.floor(v * 6 + BAYER[(iy & 3) * 4 + (ix & 3)] / 16) / 6;
        if (v <= 0) continue;
        const j = i * 3;
        lit[j] += alb[j] * lt.col[0] * v; lit[j + 1] += alb[j + 1] * lt.col[1] * v; lit[j + 2] += alb[j + 2] * lt.col[2] * v;
      }
    }
    // outlines + pack
    for (let iy = 0; iy < H; iy++) for (let ix = 0; ix < W; ix++) {
      const i = iy * W + ix, j = i * 3, d0 = dep[i];
      let m = 1;
      if (d0 > -1e8 && !(flg[i] & E.F_NOLINE)) {
        const thr = 0.55;
        if ((ix > 0 && dep[i - 1] < d0 - thr) || (ix < W - 1 && dep[i + 1] < d0 - thr) ||
          (iy > 0 && dep[i - W] < d0 - thr) || (iy < H - 1 && dep[i + W] < d0 - thr)) m = (flg[i] & E.F_EMIS) ? 0.85 : 0.68;
      }
      let r = lit[j] * m, g = lit[j + 1] * m, b = lit[j + 2] * m;
      if (r > 255) r = 255; if (g > 255) g = 255; if (b > 255) b = 255;
      base[i] = 0xff000000 | (b << 16) | (g << 8) | (r | 0);
    }
  };

  /* ---------- per-frame dynamic drawing ---------- */
  E.begin = function (frame) { frame.set(base); E.frame = frame; };
  E.px = function (ix, iy, d, c) {       // c = 0xRRGGBB
    if (ix < 0 || iy < 0 || ix >= W || iy >= H) return;
    const i = iy * W + ix; if (dep[i] > d) return;
    E.frame[i] = 0xff000000 | ((c & 255) << 16) | (c & 0xff00) | (c >> 16);
  };
  E.dark = function (ix, iy, d, k) {     // multiply existing pixel
    if (ix < 0 || iy < 0 || ix >= W || iy >= H) return;
    const i = iy * W + ix; if (dep[i] > d) return;
    const p = E.frame[i];
    E.frame[i] = 0xff000000 | (((p >> 16 & 255) * k) << 16) | (((p >> 8 & 255) * k) << 8) | ((p & 255) * k);
  };
  E.add = function (ix, iy, d, r, g, b) {  // additive
    if (ix < 0 || iy < 0 || ix >= W || iy >= H) return;
    const i = iy * W + ix; if (dep[i] > d) return;
    const p = E.frame[i];
    E.frame[i] = 0xff000000 | (Math.min(255, (p >> 16 & 255) + b) << 16) | (Math.min(255, (p >> 8 & 255) + g) << 8) | Math.min(255, (p & 255) + r);
  };
  E.setIdx = function (i, r, g, b) { E.frame[i] = 0xff000000 | (b << 16) | (g << 8) | r; };
  E.info = function (i) { return { x: wpx[i], y: wpy[i], z: wpz[i], nz: nrz[i], f: flg[i] }; };
  E.pick = function (ix, iy) {
    if (ix < 0 || iy < 0 || ix >= W || iy >= H) return null;
    const i = (iy | 0) * W + (ix | 0); if (dep[i] < -1e8) return null;
    return E.info(i);
  };
  // light multiplier for a sprite standing at world pos
  E.lightAt = function (x, y, z) {
    const Lt = E.light, v = sunVisible(x, y, z + 0.5);
    let r = Lt.amb[0] + Lt.sun[0] * 0.8 * v + 0.08, g = Lt.amb[1] + Lt.sun[1] * 0.8 * v + 0.08, b = Lt.amb[2] + Lt.sun[2] * 0.8 * v + 0.08;
    if (Lt.lampScale > 0) for (const lt of lights) {
      const d = Math.hypot(lt.x - x, lt.y - y, lt.z - z - 0.4); if (d >= lt.r) continue;
      let k = 1 - d / lt.r; k = Math.round(k * k * lt.p * Lt.lampScale * 2.2 * 5) / 5;
      r += lt.col[0] * k; g += lt.col[1] * k; b += lt.col[2] * k;
    }
    return [r, g, b];
  };
})();
if (typeof module !== 'undefined') module.exports = E;
