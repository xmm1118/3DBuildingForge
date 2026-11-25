// 点位场景演示：感知 → 异常 → 识别 → 推送 → 处置 → 归档 → 你来判断（六步闭环 + 三维效果 + 读数曲线 + 小题）
import * as THREE from 'three';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const STEP_COLORS = ['#16a34a', '#f59e0b', '#e11d48', '#e11d48', '#2563eb', '#16a34a'];

export function buildScenario({ scene, world, stages }) {
  const tmp = new THREE.Group(); tmp.name = '场景演示'; scene.add(tmp);
  const M = o => new THREE.MeshStandardMaterial({ roughness: .7, ...o });
  const figure = (color = 0x8c2a22, hat = true) => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(.09, .11, .42, 6), M({ color })); b.position.y = .21; const h = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 6), M({ color: 0xe0b48f })); h.position.y = .5; g.add(b, h); const c = new THREE.Mesh(new THREE.SphereGeometry(.1, 8, 4, 0, 6.3, 0, 1.6), M({ color: 0xf2c400 })); c.position.y = .54; c.visible = hat; g.add(c); g.userData.hat = c; g.scale.setScalar(1.6); tmp.add(g); return g; };
  const label = (text, color = '#0f2a44') => {
    const c = document.createElement('canvas'), g = c.getContext('2d'), F = 'bold 40px "Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif'; g.font = F; const w = Math.ceil(g.measureText(text).width) + 36; c.width = w; c.height = 64; g.font = F;
    g.fillStyle = color; g.beginPath(); g.roundRect(0, 0, w, 64, 14); g.fill(); g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.fillText(text, 18, 34);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(w / 64 * .5, .5, 1); s.renderOrder = 1000; tmp.add(s); return s;
  };
  const ringGeo = new THREE.RingGeometry(.9, 1.1, 40);
  const particles = (n, color, size = .25) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); const p = new THREE.Points(g, new THREE.PointsMaterial({ size, color, transparent: true, opacity: .8, depthWrite: false })); p.userData.seed = Array.from({ length: n }, () => [Math.random(), Math.random(), Math.random()]); tmp.add(p); return p; };

  let cur = null;   // { p, sc, fx, t, step, ... }
  function clear() { while (tmp.children.length) tmp.remove(tmp.children[0]); if (cur && cur.cleanup) cur.cleanup(); }

  // 读数曲线：0–1 时间轴上的数值（6 步各占 1/6）
  function valueAt(sc, x) {
    const s = sc.sensor, b = s.base, pk = s.peak, n = Math.sin(x * 70) * .03 * Math.abs(pk - b);
    if (x < 1 / 6) return b + n;
    if (x < 2 / 6) return lerp(b, lerp(b, pk, .75), (x - 1 / 6) * 6) + n;
    if (x < 4 / 6) return lerp(lerp(b, pk, .75), pk, clamp((x - 2 / 6) * 6)) + n * .5;
    if (x < 5 / 6) return lerp(pk, b, (x - 4 / 6) * 6) + n;
    return b + n;
  }
  function chartSVG(sc, x) {
    const s = sc.sensor, W = 360, H = 120, N = 90, inv = !!s.invert;
    const vals = Array.from({ length: N }, (_, i) => valueAt(sc, i / (N - 1)));
    const lo = Math.min(...vals, s.warn, s.limit), hi = Math.max(...vals, s.warn, s.limit), pad = (hi - lo) * .15 || 1;
    const Y = v => H - 16 - (v - lo + pad) / (hi - lo + 2 * pad) * (H - 26), X = i => 8 + i / (N - 1) * (W - 16);
    const upto = Math.max(1, Math.round(x * (N - 1)));
    const pts = vals.slice(0, upto + 1).map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" class="scChart">
      <rect x="0" y="0" width="${W}" height="${H}" rx="8" fill="#0b2036"/>
      <line x1="8" x2="${W - 8}" y1="${Y(s.warn)}" y2="${Y(s.warn)}" stroke="#fbbf24" stroke-dasharray="5 4"/><text x="${W - 10}" y="${Y(s.warn) - 4}" fill="#fbbf24" font-size="11" text-anchor="end">预警 ${s.warn}</text>
      <line x1="8" x2="${W - 8}" y1="${Y(s.limit)}" y2="${Y(s.limit)}" stroke="#f43f5e" stroke-dasharray="5 4"/><text x="${W - 10}" y="${Y(s.limit) + (inv ? 12 : -4)}" fill="#fb7185" font-size="11" text-anchor="end">${inv ? '控制' : '报警'} ${s.limit}</text>
      ${[1, 2, 3, 4, 5].map(i => `<line x1="${8 + i / 6 * (W - 16)}" x2="${8 + i / 6 * (W - 16)}" y1="6" y2="${H - 12}" stroke="#16324f"/>`).join('')}
      <polyline points="${pts}" fill="none" stroke="#22d3ee" stroke-width="2.5"/>
      <circle cx="${X(upto)}" cy="${Y(vals[upto])}" r="4" fill="#fff"/>
    </svg>`;
  }
  const statusOf = (sc, v) => { const s = sc.sensor; const bad = s.invert ? v <= s.limit : v >= s.limit, warn = s.invert ? v <= s.warn : v >= s.warn; return bad ? ['报警', '#e11d48'] : warn ? ['预警', '#f59e0b'] : ['正常', '#16a34a']; };
  const fmt = v => Math.abs(v) >= 100 ? Math.round(v) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2);

  // ---------- 三维效果 ----------
  function buildFx(p, sc) {
    const pos = new THREE.Vector3(...p.pos); let ground = new THREE.Vector3(pos.x, 0, pos.z);
    if (p.cat === 'ops' && p.floor != null) ground.y = Math.min(pos.y, p.floor * 1.5);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x16a34a, transparent: true, opacity: .85, side: THREE.DoubleSide, depthTest: false })); ring.rotation.x = -Math.PI / 2; ring.position.copy(ground).setY(ground.y + .08); ring.renderOrder = 998; tmp.add(ring);
    const tag = label('—'); tag.position.copy(pos).setY(pos.y + 1.6);
    const push = label('推送：安全员 App · 大屏 · 短信', '#be123c'); push.position.copy(pos).add(new THREE.Vector3(0, 2.6, 0)); push.visible = false;
    const fx = { ring, tag, push, upd: () => {} };
    const T = sc.fx;
    if (T === 'gate' || T === 'walker') {
      const w = figure(T === 'gate' ? 0x6b4f35 : 0x8c2a22, !/安全帽/.test(sc.title + sc.sensor.name) || T === 'walker');
      const from = ground.clone().add(new THREE.Vector3(T === 'gate' ? 0 : -4, 0, T === 'gate' ? 5 : 2)), to = ground.clone().add(new THREE.Vector3(0, 0, T === 'gate' ? .9 : 0));
      const zone = new THREE.Mesh(new THREE.CircleGeometry(1.6, 32), new THREE.MeshBasicMaterial({ color: 0xe11d48, transparent: true, opacity: .25, depthWrite: false })); zone.rotation.x = -Math.PI / 2; zone.position.copy(ground).setY(ground.y + .05); zone.visible = T === 'walker'; tmp.add(zone);
      const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(.7, 1.1, .7)), new THREE.LineBasicMaterial({ color: 0xe11d48, depthTest: false })); box.renderOrder = 999; box.visible = false; tmp.add(box);
      fx.upd = (step, k, t) => {
        let q;
        if (step === 0) q = from; else if (step === 1) q = from.clone().lerp(to, k); else if (step <= 3) q = to; else if (step === 4) q = to.clone().lerp(from, Math.min(1, k * 1.5)); else q = from.clone().lerp(to, k);
        w.position.copy(q); w.lookAt(to.x, q.y, to.z);
        if (w.userData.hat) w.userData.hat.visible = step >= 4 || T === 'walker' || !/安全帽/.test(sc.title + sc.sensor.name);
        box.visible = step >= 2 && step <= 3; box.position.copy(q).setY(q.y + .85); box.material.color.setHex(Math.sin(t * 10) > 0 ? 0xe11d48 : 0xffffff);
        zone.material.opacity = step >= 2 && step <= 3 ? .25 + .2 * Math.sin(t * 8) : .15;
      };
    } else if (T === 'crane') {
      const c = world.cranes.find(c => c.position.distanceTo(ground) < 3) || world.cranes[0], other = world.cranes.find(x => x !== c);
      const sector = new THREE.Mesh(new THREE.CylinderGeometry(c.userData.jibLen, c.userData.jibLen, .4, 48, 1, true, 0, Math.PI / 3), new THREE.MeshBasicMaterial({ color: 0xe11d48, transparent: true, opacity: .25, side: THREE.DoubleSide, depthWrite: false })); sector.position.set(c.position.x, c.userData.height + .6, c.position.z); tmp.add(sector);
      const th0 = c.userData.top.rotation.y; const thO = Math.atan2(-(other.position.z - c.position.z), other.position.x - c.position.x);
      fx.cleanup = () => { c.userData.top.rotation.y = th0; world.busy = false; };
      world.busy = true;
      fx.upd = (step, k) => { const target = step === 1 ? lerp(th0, thO, k) : (step === 2 || step === 3) ? thO : step === 4 ? lerp(thO, th0, k) : th0; c.userData.top.rotation.y = target; sector.rotation.y = thO - Math.PI / 6 - Math.PI / 2; sector.visible = step >= 1 && step <= 3; };
    } else if (T === 'dust') {
      fx.upd = (step) => { stages.setSpray(step === 4 || step === 5); };
      fx.cleanup = () => stages.setSpray(false);
      const dust = particles(400, 0xb08a5a, .5); fx.upd2 = (step, t) => { const a = dust.geometry.attributes.position.array; dust.visible = step >= 1 && step <= 4; dust.material.opacity = step === 4 ? .25 : .7; dust.userData.seed.forEach(([u, v, w], i) => { a[i * 3] = ground.x - 4 + u * 8 + Math.sin(t + i) * .3; a[i * 3 + 1] = (v * 4 + t * .4 * (1 + w)) % 4; a[i * 3 + 2] = ground.z - 3 + w * 6; }); dust.geometry.attributes.position.needsUpdate = true; };
    } else if (T === 'smoke' || T === 'water') {
      const pr = particles(240, T === 'smoke' ? 0x6b7280 : 0x60a5fa, T === 'smoke' ? .6 : .25);
      fx.upd2 = (step, t) => { const a = pr.geometry.attributes.position.array; pr.visible = step >= 1 && step <= 4; pr.material.opacity = step === 4 ? .3 : .8; pr.userData.seed.forEach(([u, v, w], i) => { const k = (t * .35 + u) % 1; if (T === 'smoke') { a[i * 3] = pos.x + (v - .5) * (.4 + k * 2); a[i * 3 + 1] = ground.y + .5 + k * 5; a[i * 3 + 2] = pos.z + (w - .5) * (.4 + k * 2); } else { a[i * 3] = pos.x + (v - .5) * 1.2; a[i * 3 + 1] = pos.y + .5 - k * 1.5; a[i * 3 + 2] = pos.z + (w - .5) * 1.2; } }); pr.geometry.attributes.position.needsUpdate = true; };
    } else if (T === 'vehicle') {
      const tr = new THREE.Group(); const body = new THREE.Mesh(new THREE.BoxGeometry(.9, .6, 2), M({ color: 0xd9a21b })); body.position.y = .45; tr.add(body); const cab = new THREE.Mesh(new THREE.BoxGeometry(.9, .55, .6), M({ color: 0xe5e5e5 })); cab.position.set(0, .55, 1.1); tr.add(cab); tr.scale.setScalar(1.3); tmp.add(tr);
      const a = ground.clone().add(new THREE.Vector3(-6, 0, 0)), b = ground.clone();
      const spray = particles(120, 0x93c5fd, .2);
      fx.upd = (step, k) => { const q = step === 0 ? a : step === 1 ? a.clone().lerp(b, k) : b; tr.position.copy(q); tr.rotation.y = Math.PI / 2; };
      fx.upd2 = (step, t) => { spray.visible = step === 4; const arr = spray.geometry.attributes.position.array; spray.userData.seed.forEach(([u, v, w], i) => { arr[i * 3] = b.x + (u - .5) * 2.4; arr[i * 3 + 1] = ((v + t) % 1) * 1.2; arr[i * 3 + 2] = b.z + (w - .5) * 1.2; }); spray.geometry.attributes.position.needsUpdate = true; };
    } else if (T === 'load') {
      const boxes = []; for (let i = 0; i < 8; i++) { const o = new THREE.Mesh(new THREE.BoxGeometry(.5, .3, .5), M({ color: i > 4 ? 0xb45309 : 0x9ca3af })); o.position.set(pos.x - .3 + (i % 2) * .55, pos.y - 1 + Math.floor(i / 2) * .32, pos.z); tmp.add(o); boxes.push(o); }
      fx.upd = (step, k) => { const n = step === 0 ? 3 : step === 1 ? 3 + Math.round(5 * k) : step <= 3 ? 8 : step === 4 ? Math.round(8 - 5 * k) : 3; boxes.forEach((b, i) => b.visible = i < n); };
    } else if (T === 'pv') {
      fx.upd = (step) => { if (world.green) world.green.setPv(step >= 1 && step <= 4 ? .25 : 1); };
      fx.cleanup = () => world.green && world.green.setPv(1);
    } else if (T === 'rainwater' || T === 'sponge') {
      fx.upd = (step) => { const raining = T === 'sponge' ? (step >= 1 && step <= 3) : (step === 0 || step === 5); stages.setWeather(raining ? 'rain' : 'clear'); if (world.green) { world.green.setIrrigate(T === 'rainwater' && step >= 4); if (T === 'rainwater') world.green.setRainLevel(step === 0 ? .9 : step === 1 ? .35 : step <= 3 ? .12 : step === 4 ? .12 : .6); } };
      fx.cleanup = () => { stages.setWeather('clear'); if (world.green) { world.green.setIrrigate(false); world.green.setRainLevel(.5); } };
    } else if (T === 'lamp') {
      fx.upd = (step) => stages.setDay(!(step >= 1 && step <= 5));
      fx.cleanup = () => stages.setDay(true);
      const glow = new THREE.PointLight(0xffe9a8, 0, 8); glow.position.copy(pos); tmp.add(glow); fx.upd2 = (step) => { glow.intensity = step === 1 || step === 2 || step === 3 ? 0 : step >= 4 ? 6 : 0; };
    } else if (T === 'pit') {
      const P = world.layers.pit.userData; const water = new THREE.Mesh(new THREE.BoxGeometry(P.x1 - P.x0 - .6, .1, P.z1 - P.z0 - .6), M({ color: 0x4f86b0, transparent: true, opacity: .7 })); water.position.set((P.x0 + P.x1) / 2, -P.dep + .05, (P.z0 + P.z1) / 2); tmp.add(water);
      const arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(pos.x, .6, P.z1 + .3), 1, 0xe11d48, .5, .35); tmp.add(arrow);
      fx.upd = (step, k) => { const lv = step === 0 ? .1 : step === 1 ? .1 + 1.2 * k : step <= 3 ? 1.3 : step === 4 ? 1.3 - 1.2 * k : .1; water.scale.y = lv / .1; water.position.y = -P.dep + lv / 2; arrow.setLength(step >= 1 && step <= 3 ? 1 + .8 * (step === 1 ? k : 1) : .4, .5, .35); };
    } else if (T === 'hoist') {
      const cab = new THREE.Mesh(new THREE.BoxGeometry(.9, 1.0, .8), M({ color: 0xc8282b, emissive: 0x330000 })); tmp.add(cab);
      const H = Math.max(3, pos.y + 2);
      fx.upd = (step, k, t) => { const y = step === 0 ? .5 + (H - 1) * (.5 + .5 * Math.sin(t)) : step === 1 ? lerp(H * .3, H * .5, k) : step <= 3 ? H * .5 : step === 4 ? lerp(H * .5, .5, k) : .5; cab.position.set(pos.x + .8, y, pos.z); cab.material.emissive.setHex(step >= 2 && step <= 3 && Math.sin(t * 8) > 0 ? 0x880000 : 0x330000); };
    } else if (T === 'floor') {
      const f = stages.floorsA[(p.floor || 7) - 1];
      const sh = f && f.children[0];
      const mats = sh ? sh.material : []; const e0 = mats.map(m => m.emissive.clone());
      fx.upd = (step, k, t) => mats.forEach(m => m.emissive.setHex(step >= 1 && step <= 3 ? (Math.sin(t * 6) > 0 ? 0x991b1b : 0x450a0a) : step === 4 ? 0x1e3a8a : 0x000000));
      fx.cleanup = () => mats.forEach((m, i) => m.emissive.copy(e0[i]));
    }
    return fx;
  }

  // ---------- 面板 ----------
  let host = null, onEnd = () => {}, auto = true;
  function render() {
    if (!cur || !host) return;
    const { sc, step } = cur, k = cur.k;
    const x = (step + k) / 6, v = valueAt(sc, x), [st, col] = statusOf(sc, v);
    if (cur.quiz) {
      const q = sc.quiz, done = cur.answered != null;
      host.innerHTML = `<div class="scHead"><span class="ptag" style="--c:#0f4c75">场景演示 · 你来判断</span><h2>${sc.title}</h2></div>
        <p class="scQ">${q.q}</p><div class="scOpts">${q.options.map((o, i) => `<button data-o="${i}" class="${done ? (i === q.answer ? 'ok' : i === cur.answered ? 'bad' : '') : ''}">${o}</button>`).join('')}</div>
        ${done ? `<p class="scExp ${cur.answered === q.answer ? 'ok' : 'bad'}"><b>${cur.answered === q.answer ? '答对了。' : '再想想：正确答案是 ' + 'ABCD'[q.answer] + '。'}</b>${q.explain}</p><p class="scTake"><b>知识点：</b>${sc.takeaway}</p>` : ''}
        <div class="pact"><button class="btn" data-a="replay">↺ 重看演示</button><button class="btn primary" data-a="exit">返回点位说明</button></div>`;
      host.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { if (cur.answered != null) return; cur.answered = +b.dataset.o; cur.result = cur.answered === sc.quiz.answer; onEnd(cur.p.id, cur.result); render(); });
    } else {
      host.innerHTML = `<div class="scHead"><span class="ptag" style="--c:#0f4c75">场景演示 · 你的角色：${sc.role}</span><h2>${sc.title}</h2></div>
        <ol class="scSteps">${sc.steps.map((s, i) => `<li class="${i < step ? 'done' : i === step ? 'on' : ''}" data-i="${i}" style="--c:${STEP_COLORS[i]}"><b>${i + 1}</b><span>${s.tag}</span></li>`).join('')}</ol>
        <div class="scNow" style="--c:${STEP_COLORS[step]}"><b>${step + 1}. ${sc.steps[step].tag}</b><p>${sc.steps[step].text}</p></div>
        <div class="scLive">${live()}</div><p class="muted small">${sc.sensor.note}</p>
        <div class="pact"><button class="btn" data-a="prev">‹ 上一步</button><button class="btn" data-a="auto">${auto ? '❚❚ 暂停' : '▶ 自动'}</button><button class="btn primary" data-a="next">${step < 5 ? '下一步 ›' : '去答题 ›'}</button><button class="btn" data-a="exit">退出</button></div>`;
      host.querySelectorAll('[data-i]').forEach(li => li.onclick = () => go(+li.dataset.i));
    }
    host.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { const a = b.dataset.a; if (a === 'next') go(step + 1); else if (a === 'prev') go(Math.max(0, step - 1)); else if (a === 'auto') { auto = !auto; render(); } else if (a === 'exit') api.stop(true); else if (a === 'replay') { const p = cur.p; api.start(p, host); } });
  }
  function live() { const { sc, step, k } = cur, x = (step + k) / 6, v = valueAt(sc, x), [st, col] = statusOf(sc, v); return `<div class="scRead"><span>${sc.sensor.name}</span><b style="color:${col}">${fmt(v)} <small>${sc.sensor.unit}</small></b><em style="background:${col}">${st}</em></div>${chartSVG(sc, x)}`; }
  function refresh() { const el = host && host.querySelector('.scLive'); if (el) el.innerHTML = live(); }
  function go(i) { if (!cur) return; if (i > 5) { cur.quiz = true; cur.step = 5; cur.k = 1; render(); return; } cur.quiz = false; cur.step = i; cur.k = 0; cur.t = 0; render(); }

  const api = {
    has: id => !!(window.SHAPAN_SCENARIOS || {})[id],
    get active() { return !!cur; },
    get pointId() { return cur && cur.p.id; },
    live() { if (!cur) return null; const { sc, step, k, p } = cur; const v = valueAt(sc, cur.quiz ? 1 : (step + k) / 6), [st] = statusOf(sc, v); return { pointId: p.id, title: sc.title, sensor: sc.sensor.name, unit: sc.sensor.unit, warn: sc.sensor.warn, limit: sc.sensor.limit, value: v, status: st, step: cur.quiz ? 5 : step, stepTag: cur.quiz ? '你来判断' : sc.steps[step].tag }; },
    start(p, el) {
      api.stop(false); const sc = (window.SHAPAN_SCENARIOS || {})[p.id]; if (!sc) return false;
      host = el; clear(); cur = { p, sc, step: 0, k: 0, t: 0, quiz: false, answered: null }; cur.fx = buildFx(p, sc); cur.cleanup = cur.fx.cleanup; render(); return true;
    },
    stop(back) { if (!cur) return; const p = cur.p; clear(); cur = null; if (back && api.onExit) api.onExit(p.id); },
    update(dt, time) {
      if (!cur) return;
      const STEP = 7;
      if (!cur.quiz && auto) { cur.t += dt; cur.k = clamp(cur.t / STEP); if (cur.k >= 1 && cur.step < 5) go(cur.step + 1); else if (Math.floor((cur.t - dt) * 3) !== Math.floor(cur.t * 3)) refresh(); }
      const { fx, sc, step, k } = cur;
      const v = valueAt(sc, (step + k) / 6), [, col] = statusOf(sc, v);
      fx.ring.material.color.set(cur.quiz ? '#16a34a' : (step === 4 ? '#2563eb' : col)); const s = 1 + .25 * Math.sin(time * 5); fx.ring.scale.set(s, s, s);
      const tq = Math.floor(time * 3); if (fx.tagLast !== tq) { fx.tagLast = tq; tmp.remove(fx.tag); fx.tag.material.map.dispose(); fx.tag.material.dispose(); const nt = label(`${sc.sensor.name}  ${fmt(v)} ${sc.sensor.unit}`, col === '#16a34a' ? '#15803d' : col === '#f59e0b' ? '#b45309' : '#be123c'); nt.position.copy(fx.tag.position); fx.tag = nt; }
      fx.push.visible = !cur.quiz && step === 3;
      fx.upd(cur.quiz ? 5 : step, cur.quiz ? 1 : k, time); if (fx.upd2) fx.upd2(cur.quiz ? 5 : step, time);
    },
    onResult(f) { onEnd = f; }
  };
  return api;
}

export const SCENARIO_CSS = `
.scHead h2{margin:.3em 0 .4em;font-size:1.3em}
.scSteps{list-style:none;margin:.2em 0 .6em;padding:0;display:grid;grid-template-columns:repeat(6,1fr);gap:4px}
.scSteps li{display:flex;flex-direction:column;align-items:center;gap:2px;font-size:.72em;color:#94a3b8;cursor:pointer;text-align:center}
.scSteps li b{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:#e2e8f0;color:#64748b;font-size:1.25em}
.scSteps li.done b{background:#cbd5e1;color:#fff}.scSteps li.on{color:var(--c);font-weight:700}.scSteps li.on b{background:var(--c);color:#fff;box-shadow:0 0 0 4px color-mix(in srgb,var(--c) 25%,transparent)}
.scNow{border-left:4px solid var(--c);background:#f8fafc;padding:.5em .8em;border-radius:0 10px 10px 0}.scNow b{color:var(--c)}.scNow p{margin:.3em 0 0}
.scRead{display:flex;align-items:center;gap:.6em;margin:.7em 0 .4em}.scRead span{flex:1;color:var(--muted);font-size:.9em}.scRead b{font-size:1.6em;font-variant-numeric:tabular-nums}.scRead small{font-size:.55em;color:var(--muted)}.scRead em{font-style:normal;color:#fff;border-radius:6px;padding:.1em .5em;font-size:.85em}
.scChart{display:block;border-radius:8px}
.scQ{font-weight:600;line-height:1.6}.scOpts{display:flex;flex-direction:column;gap:6px}.scOpts button{border:1px solid var(--line);background:#f6f8fa;border-radius:10px;padding:.6em .8em;text-align:left;min-height:44px}
.scOpts button.ok{background:#dcfce7;border-color:#16a34a}.scOpts button.bad{background:#ffe4e6;border-color:#e11d48}
.scExp{padding:.5em .7em;border-radius:8px;margin-top:.7em}.scExp.ok{background:#f0fdf4}.scExp.bad{background:#fff1f2}.scTake{background:#ecfeff;border-left:3px solid #14b8a6;padding:.45em .7em}
`;
