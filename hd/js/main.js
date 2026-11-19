'use strict';
(function () {
  const cv = document.getElementById('view'), ctx = cv.getContext('2d');
  const off = document.createElement('canvas'), octx = off.getContext('2d');
  let img = null, frame = null, scene = null, sceneKey = 'square', tod = 'day';
  let camX = 0, camY = 0, zoom = 3, dpr = 1, ready = false, follow = false;

  const TIMES = {
    day: { label: 'Day', L: [-0.45, 0.75, 0.8], sun: [0.80, 0.66, 0.44], amb: [0.50, 0.52, 0.70], fill: [0.16, 0.15, 0.13], night: false, lamp: 0, bg: [24, 20, 30] },
    dusk: { label: 'Dusk', L: [-0.8, 0.5, 0.36], sun: [1.02, 0.52, 0.22], amb: [0.40, 0.36, 0.60], fill: [0.10, 0.08, 0.14], night: true, lamp: 0.6, bg: [22, 16, 28], glow: [255, 190, 96] },
    night: { label: 'Night', L: [0.5, 0.42, 0.75], sun: [0.14, 0.20, 0.40], amb: [0.15, 0.18, 0.37], fill: [0.03, 0.04, 0.08], night: true, lamp: 1, bg: [10, 10, 20], glow: [255, 200, 104] },
  };

  function applyTime(sc) {
    const t = Object.assign({}, TIMES[tod], (sc.times && sc.times[tod]) || {}), Lt = E.light;
    Lt.L = E.norm(t.L); Lt.sun = t.sun; Lt.amb = t.amb; Lt.fill = t.fill; Lt.night = t.night; Lt.lampScale = t.lamp; Lt.bg = t.bg; if (t.glow) Lt.glow = t.glow;
  }
  function load(key, keepCam) {
    scene = Scenes[key]; sceneKey = key; ready = false;
    const b = scene.bounds;
    const W = Math.ceil((b[2] - b[0] + b[3] - b[1]) * E.HW), H = Math.ceil((b[2] - b[0] + b[3] - b[1]) * E.HH + b[4] * E.ZS) + 8;
    E.init(W, H, Math.round(-(b[0] - b[3]) * E.HW), Math.round(-(b[0] + b[1]) * E.HH + b[4] * E.ZS) + 4);
    B.reset(); scene.build();
    applyTime(scene); E.bake(b);
    off.width = W; off.height = H; img = octx.createImageData(W, H); frame = new Uint32Array(img.data.buffer);
    Sim.selected = null; Sim.setup(scene); Sim.afterBake();
    if (!keepCam) { camX = E.sx(scene.focus[0], scene.focus[1]); camY = E.sy(scene.focus[0], scene.focus[1], scene.focusZ || 1.5); }
    ready = true;
  }
  function rebake() { applyTime(scene); E.bake(scene.bounds); Sim.afterBake(); }
  function busy(fn) {
    const el = document.getElementById('busy'); el.classList.add('on');
    setTimeout(() => { fn(); el.classList.remove('on'); }, 30);
  }

  function resize() {
    dpr = Math.min(3, window.devicePixelRatio || 1);
    cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr);
    if (!resize.done) { zoom = Math.max(1, Math.round(Math.min(cv.width, cv.height) / 780)); resize.done = true; }
  }
  addEventListener('resize', resize); resize();

  /* ---------- UI ---------- */
  function buttons(id, items, cur, cb) {
    const el = document.getElementById(id); el.innerHTML = '';
    for (const k in items) { const b = document.createElement('button'); b.textContent = items[k]; if (k === cur()) b.className = 'on'; b.onclick = () => { cb(k); buttons(id, items, cur, cb); }; el.appendChild(b); }
  }
  function ui() {
    const names = {}; for (const k in Scenes) names[k] = Scenes[k].name;
    buttons('scenes', names, () => sceneKey, k => busy(() => { load(k); try { location.hash = k; } catch (e) { } hint(); }));
    buttons('times', { day: 'Day', dusk: 'Dusk', night: 'Night' }, () => tod, k => { tod = k; busy(rebake); });
  }
  function hint() { document.getElementById('hint').textContent = scene.blurb || ''; document.getElementById('hint').style.display = scene.blurb ? '' : 'none'; }
  document.getElementById('zi').onclick = () => { zoom = Math.min(10, zoom + 1); };
  document.getElementById('zo').onclick = () => { zoom = Math.max(1, zoom - 1); };
  const info = document.getElementById('info');
  function showInfo(p) { info.innerHTML = '<b>' + p.name + '</b><br><i>' + p.doing + '</i>'; }

  /* ---------- input ---------- */
  const ptr = new Map(); let moved = 0, pinch0 = 0, zoom0 = 1;
  const toLogical = (cx, cy) => [camX + (cx * dpr - cv.width / 2) / zoom, camY + (cy * dpr - cv.height / 2) / zoom];
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ptr.set(e.pointerId, [e.clientX, e.clientY]); moved = 0; if (ptr.size === 2) { const a = [...ptr.values()]; pinch0 = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]); zoom0 = zoom; } });
  cv.addEventListener('pointermove', e => {
    const p = ptr.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p[0], dy = e.clientY - p[1]; p[0] = e.clientX; p[1] = e.clientY;
    if (ptr.size === 1) { moved += Math.abs(dx) + Math.abs(dy); if (moved > 6) { camX -= dx * dpr / zoom; camY -= dy * dpr / zoom; follow = false; } }
    else if (ptr.size === 2) { const a = [...ptr.values()], d = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]); zoom = Math.max(1, Math.min(10, Math.round(zoom0 * d / pinch0))); moved = 99; }
  });
  const up = e => {
    if (!ptr.has(e.pointerId)) return; ptr.delete(e.pointerId);
    if (moved <= 6 && ready && e.type === 'pointerup') {
      const [lx, ly] = toLogical(e.clientX, e.clientY);
      const p = Sim.personAt(lx, ly);
      if (p) { Sim.selected = p; showInfo(p); return; }
      const hit = E.pick(lx, ly);
      if (hit && hit.nz > 0.9 && hit.z < 0.6 && Sim.kingTo(hit.x, hit.y)) { Sim.selected = Sim.king(); showInfo(Sim.king()); marker = [hit.x, hit.y, 1]; }
    }
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', e => { e.preventDefault(); zoom = Math.max(1, Math.min(10, zoom + (e.deltaY < 0 ? 1 : -1))); }, { passive: false });
  let marker = null;

  /* ---------- loop ---------- */
  let last = performance.now(), time = 0;
  function tick(now) {
    requestAnimationFrame(tick);
    if (!ready) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now; time += dt;
    Sim.update(dt);
    E.begin(frame);
    if (marker) { marker[2] -= dt; if (marker[2] <= 0) marker = null; else { const mx = Math.round(E.sx(marker[0], marker[1])), my = Math.round(E.sy(marker[0], marker[1], 0)), r = 10 - Math.floor(marker[2] * 8); for (let a = 0; a < 32; a++) E.px(mx + Math.round(Math.cos(a * 0.19635) * r * 1.6), my + Math.round(Math.sin(a * 0.19635) * r * 0.8), marker[0] + marker[1] + 0.02, 0xffe27a); } }
    Sim.draw(time);
    if (Sim.selected) showInfo(Sim.selected);
    const vw = cv.width / zoom, vh = cv.height / zoom;
    camX = Math.max(Math.min(vw / 2, E.W / 2), Math.min(Math.max(E.W - vw / 2, E.W / 2), camX));
    camY = Math.max(Math.min(vh / 2, E.H / 2), Math.min(Math.max(E.H - vh / 2, E.H / 2), camY));
    const x0 = Math.round(camX - vw / 2), y0 = Math.round(camY - vh / 2);
    const dx0 = Math.max(0, x0), dy0 = Math.max(0, y0), dw = Math.min(E.W, Math.ceil(x0 + vw) + 1) - dx0, dh = Math.min(E.H, Math.ceil(y0 + vh) + 1) - dy0;
    octx.putImageData(img, 0, 0, dx0, dy0, dw, dh);
    const bg = E.light.bg; ctx.fillStyle = 'rgb(' + bg[0] + ',' + bg[1] + ',' + bg[2] + ')'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, dx0, dy0, dw, dh, (dx0 - x0) * zoom, (dy0 - y0) * zoom, dw * zoom, dh * zoom);
  }

  const h = (location.hash || '').slice(1); if (Scenes[h]) sceneKey = h;
  ui();
  // test hooks (used by the screenshot script)
  window.__ks = { load: k => { load(k); ui(); hint(); }, time: k => { tod = k; rebake(); ui(); }, cam: (x, y, z) => { camX = E.sx(x, y); camY = E.sy(x, y, 0); if (z) zoom = z; }, step: s => { for (let i = 0; i < s * 30; i++) Sim.update(1 / 30); time += s; } };
  busy(() => { const t0 = performance.now(); load(sceneKey); hint(); console.log('bake ms', Math.round(performance.now() - t0)); requestAnimationFrame(tick); });
})();
