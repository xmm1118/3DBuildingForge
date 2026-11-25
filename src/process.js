// 工序动画：按真实施工流程逐步演示（每步：工序名、做法、要点、规范、相关点位、镜头、动画）
import * as THREE from 'three';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const seg = (k, a, b) => clamp((k - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;

export function buildProcess({ scene, world, stages, flyTo }) {
  const L = world.layers, [crane1, crane2] = world.cranes, P = stages.parts;
  const A = L.bldA.userData, B = L.bldB.userData, PIT = L.pit.userData;
  const tmp = new THREE.Group(); tmp.name = '工序动画'; scene.add(tmp);
  const M = (o) => new THREE.MeshStandardMaterial({ roughness: .75, ...o });
  const mats = {
    pc: M({ color: 0xe6e6e2 }), conc: M({ color: 0xb4b8bb }), fresh: M({ color: 0x8d9296, roughness: .4 }), wood: M({ color: 0xb8864b }), ply: M({ color: 0xc9a06a }),
    steel: M({ color: 0x3a3d42, metalness: .5 }), brace: M({ color: 0x2b6fc0 }), prop: M({ color: 0xd9a21b }), grout: M({ color: 0xff8a00, emissive: 0x552200 }), soil: M({ color: 0x8a6a45, roughness: 1 }),
    black: M({ color: 0x1d1f22 }), white: M({ color: 0xf4f4f4 }), red: M({ color: 0xd8262b }), blue: M({ color: 0x2f86d6 }), water: M({ color: 0x4f86b0, roughness: .1, transparent: true, opacity: .75 }),
    sensor: M({ color: 0x10b981, emissive: 0x0a6b4a }), pile: M({ color: 0x9aa0a4 })
  };
  const bx = (w, h, d, m, x, y, z, p = tmp) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y + h / 2, z); o.castShadow = o.receiveShadow = true; p.add(o); return o; };
  const cyl = (r, h, m, x, y, z, p = tmp) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 8), m); o.position.set(x, y + h / 2, z); o.castShadow = true; p.add(o); return o; };
  const rodBetween = (a, b, r, m, p = tmp) => { const v = new THREE.Vector3().subVectors(b, a); const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, v.length(), 6), m); o.position.copy(a).addScaledVector(v, .5); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().normalize()); p.add(o); return o; };
  // 网格贴图（钢筋网）
  const meshTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.strokeStyle = '#2d2d2d'; g.lineWidth = 3; for (let i = 4; i < 64; i += 10) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 64); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(64, i); g.stroke(); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
  const rebarNet = (w, d, x, y, z, rep = 1) => { const t = meshTex.clone(); t.needsUpdate = true; t.repeat.set(w * rep, d * rep); const o = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: .3, side: THREE.DoubleSide })); o.rotation.x = -Math.PI / 2; o.position.set(x, y, z); tmp.add(o); return o; };
  const cageM = new THREE.MeshBasicMaterial({ color: 0x2a2a2a, wireframe: true });
  // 小人
  const figure = (color = 0x8c2a22, hat = 0xf2c400) => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(.09, .11, .42, 6), M({ color })); b.position.y = .21; const h = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 6), M({ color: 0xe0b48f })); h.position.y = .5; const c = new THREE.Mesh(new THREE.SphereGeometry(.1, 8, 4, 0, 6.3, 0, 1.6), M({ color: hat })); c.position.y = .54; g.add(b, h, c); g.scale.setScalar(1.3); tmp.add(g); return g; };
  // 文字标签（精灵）
  const label = (text, x, y, z, color = '#0f2a44') => {
    const c = document.createElement('canvas'); const g = c.getContext('2d'); g.font = 'bold 44px "Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif'; const w = g.measureText(text).width + 40; c.width = w; c.height = 72;
    g.font = 'bold 44px "Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif'; g.fillStyle = color; g.beginPath(); g.roundRect(0, 0, w, 72, 16); g.fill(); g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.fillText(text, 20, 38);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(w / 72 * .55, .55, 1); s.position.set(x, y, z); s.renderOrder = 999; tmp.add(s); return s;
  };
  // 落料粒子（浇筑、喷淋）
  const stream = (n, color) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); const p = new THREE.Points(g, new THREE.PointsMaterial({ size: .18, color })); p.userData.seed = Array.from({ length: n }, () => Math.random()); tmp.add(p); return p; };
  const flowStream = (p, from, to, t, spread = .2) => { const a = p.geometry.attributes.position.array; p.userData.seed.forEach((s, i) => { const k = (t * 1.5 + s) % 1; a[i * 3] = lerp(from.x, to.x, k) + (Math.sin(i * 7.1) * spread); a[i * 3 + 1] = lerp(from.y, to.y, k); a[i * 3 + 2] = lerp(from.z, to.z, k) + (Math.cos(i * 3.3) * spread); }); p.geometry.attributes.position.needsUpdate = true; };

  // ---------- 状态保存与还原 ----------
  const saved = [];
  const save = (o, key) => { if (!o) return; if (!saved.some(s => s.o === o && s.key === key)) saved.push({ o, key, v: (o[key] && o[key].clone) ? o[key].clone() : o[key] }); };
  const setVis = (o, v) => { save(o, 'visible'); o.visible = v; };
  const setScale = (o, sx, sy, sz) => { save(o, 'scale'); o.scale.set(sx, sy, sz); };
  function restoreAll() { saved.forEach(({ o, key, v }) => { if (key === 'scale' || key === 'position' || key === 'rotation') o[key].copy(v); else if (o[key] && o[key].copy && v && v.isColor) o[key].copy(v); else o[key] = v; }); saved.forEach(({ o }) => { if (o.isMaterial) o.needsUpdate = true; }); saved.length = 0; while (tmp.children.length) tmp.remove(tmp.children[0]); }
  // 逐个“长出来”/“消失”
  const reveal = (objs, k, axis = 'y', out = false) => { const n = objs.length; objs.forEach((o, i) => { save(o, 'scale'); save(o, 'visible'); const base = saved.find(s => s.o === o && s.key === 'scale').v; let t = ease(clamp(k * n * 1.0 - i * .85)); if (out) t = 1 - t; o.visible = t > .01; const sc = Math.max(.001, t); o.scale.set(axis.includes('x') ? base.x * sc : base.x, axis.includes('y') ? base.y * sc : base.y, axis.includes('z') ? base.z * sc : base.z); }); };

  // ---------- 塔吊吊装 ----------
  const craneState = new Map();
  const cst = c => { if (!craneState.has(c)) { const u = c.userData; craneState.set(c, { th: u.top.rotation.y, r: u.trolley.position.x, L: 2.5 }); } return craneState.get(c); };
  function setCrane(c, th, r, L) {
    const u = c.userData; u.top.rotation.y = th; u.trolley.position.x = r;
    const rope = u.trolley.children[1], hook = u.trolley.children[2], L0 = u.height * .55;
    save(rope, 'scale'); save(rope, 'position'); save(hook, 'position'); save(u.top, 'rotation'); save(u.trolley, 'position');
    rope.scale.y = Math.max(.02, L / L0); rope.position.y = -L / 2; hook.position.y = -L - .225;
  }
  const hookTopY = (c) => c.userData.height + .35 + .45;   // 小车所在高度
  const polar = (c, x, z) => { const dx = x - c.position.x, dz = z - c.position.z; return { th: Math.atan2(-dz, dx), r: Math.max(2, Math.hypot(dx, dz)) }; };
  const angLerp = (a, b, t) => { let d = ((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return a + d * t; };
  // 返回一次吊装动作：obj 从 from 吊到 to（to.y 为构件底面高度）
  function lift(c, obj, from, to, hClear = 16) {
    let s0 = null; const pf = polar(c, from.x, from.z), pt = polar(c, to.x, to.z), H = hookTopY(c), oh = obj.userData.h || .3;
    const Lfor = y => H - (y + oh) - .5;
    return {
      init() { s0 = { ...cst(c) }; obj.visible = true; obj.position.set(from.x, from.y + oh / 2, from.z); },
      tick(k) {
        let th, r, L, att = false;
        const Lc = H - hClear;
        if (k < .14) { const t = ease(seg(k, 0, .14)); th = angLerp(s0.th, pf.th, t); r = lerp(s0.r, pf.r, t); L = lerp(s0.L, Lc, t); }
        else if (k < .24) { th = pf.th; r = pf.r; L = lerp(Lc, Lfor(from.y), ease(seg(k, .14, .24))); }
        else if (k < .28) { th = pf.th; r = pf.r; L = Lfor(from.y); att = true; }
        else if (k < .38) { th = pf.th; r = pf.r; L = lerp(Lfor(from.y), Lc, ease(seg(k, .28, .38))); att = true; }
        else if (k < .64) { const t = ease(seg(k, .38, .64)); th = angLerp(pf.th, pt.th, t); r = lerp(pf.r, pt.r, t); L = Lc; att = true; }
        else if (k < .78) { th = pt.th; r = pt.r; L = lerp(Lc, Lfor(to.y), ease(seg(k, .64, .78))); att = true; }
        else if (k < .84) { th = pt.th; r = pt.r; L = Lfor(to.y); att = true; }
        else { th = pt.th; r = pt.r; L = lerp(Lfor(to.y), 2.5, ease(seg(k, .84, 1))); }
        setCrane(c, th, r, L);
        if (att) { const x = c.position.x + r * Math.cos(th), z = c.position.z - r * Math.sin(th); obj.position.set(x, H - L - .5 - oh / 2, z); obj.rotation.y = lerp(obj.userData.rotFrom || 0, obj.userData.rotTo || 0, ease(seg(k, .38, .64))); }
        else if (k >= .84) { obj.position.set(to.x, to.y + oh / 2, to.z); obj.rotation.y = obj.userData.rotTo || 0; }
        else { obj.position.set(from.x, from.y + oh / 2, from.z); obj.rotation.y = obj.userData.rotFrom || 0; }
        if (k >= 1) craneState.set(c, { th, r, L });
      }
    };
  }
  // 多次吊装串成一步
  const lifts = (list) => ({ init() { list.forEach(l => l.obj.visible = false); this.i = -1; }, tick(k) { const n = list.length, i = Math.min(n - 1, Math.floor(k * n)), kk = k >= 1 ? 1 : k * n - i; while (this.i < i) { if (this.i >= 0) list[this.i].a.tick(1); this.i++; list[this.i].a.init(); } list[i].a.tick(kk); } });

  // ======================= 各阶段工序 =======================
  const SEQ = {};
  const CAM = {
    A: [[-4, 22, 12], [-18.5, 7, -11]], Awide: [[12, 34, 24], [-17, 5, -15]], B: [[22, 16, 12], [6, 3, -9]], Bwide: [[30, 28, 20], [8, 3, -14]],
    pit: [[30, 14, 6], [20, -1, -9]], site: [[10, 55, 50], [0, 0, 0]], north: [[0, 30, 10], [0, 0, -18]], live: [[10, 30, 45], [0, 0, 14]], top: [[0, 80, 32], [0, 0, 0]]
  };

  // ---------- S3 主体结构：1# 楼装配式框架标准层 + 2# 楼现浇框架标准层（柱 → 梁 → 板 → 楼梯 → 外墙） ----------
  SEQ.S3 = () => {
    const fhA = A.fh, x0 = -24, x1 = -13, z0 = -15, z1 = -5, nA = 5, yA = nA * fhA;   // 1# 楼第 6 层
    const fhB = 1.6, nB = 2, yB = nB * fhB;   // 2# 楼第 3 层
    const pcH = fhA - .16;
    const show = (arr, v) => arr.forEach(o => o.visible = v);
    const hide = (...a) => a.flat().forEach(o => { if (o) o.visible = false; });
    const lbl = {}; const tagA = (k, t, x, y, z) => { const s = label(t, x, y, z); s.visible = false; lbl[k] = s; return s; };
    const L1 = (t) => Object.values(lbl).forEach(s => s.visible = s === t);
    const place = it => { it.o.position.set(it.x, it.y + (it.o.userData.h || 0) / 2, it.z); it.o.rotation.y = it.r || 0; };
    const placeAll = items => items.forEach(it => { place(it); it.o.visible = true; });
    // 用塔吊吊前 nLift 件，其余快速补齐（示意同一工序连续作业）
    const liftStep = (c, items, from, nLift, kEnd = .82) => ({
      init() { items.forEach(it => { it.o.userData.rotTo = it.r || 0; it.o.visible = false; }); this.l = lifts(items.slice(0, nLift).map(it => ({ obj: it.o, a: lift(c, it.o, from, { x: it.x, y: it.y, z: it.z }) }))); this.l.init(); },
      tick(k) { this.l.tick(Math.min(1, k / kEnd)); if (k > kEnd) items.slice(nLift).forEach((it, i) => { place(it); it.o.visible = (k - kEnd) / (1 - kEnd) * (items.length - nLift) > i; }); if (k >= 1) placeAll(items); }
    });
    const mkProp = (x, y, z, h) => { const g = new THREE.Group(); const pole = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, h, 6), mats.prop); pole.position.y = h / 2; g.add(pole); for (let a = 0; a < 3; a++) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .5, 4), mats.prop); leg.position.set(Math.cos(a * 2.1) * .15, .2, Math.sin(a * 2.1) * .15); leg.rotation.z = Math.cos(a * 2.1) * .6; leg.rotation.x = -Math.sin(a * 2.1) * .6; g.add(leg); } const head = new THREE.Mesh(new THREE.BoxGeometry(.5, .06, .12), mats.wood); head.position.y = h - .03; g.add(head); g.position.set(x, y, z); g.visible = false; tmp.add(g); return g; };
    // 楼梯：沿局部 z 由 +run/2（低）到 -run/2（高）
    const mkStair = (w, run, rise, n, m) => { const g = new THREE.Group(); for (let i = 0; i < n; i++) { const hh = (i + 1) * rise / n; const s = new THREE.Mesh(new THREE.BoxGeometry(w, hh, run / n), m); s.position.set(0, -rise / 2 + hh / 2, run / 2 - (i + .5) * run / n); s.castShadow = s.receiveShadow = true; g.add(s); } g.userData = { h: rise }; g.visible = false; tmp.add(g); return g; };
    const slope = (w, run, rise, t, m, x, yBot, zLow) => { const len = Math.hypot(run, rise); const o = new THREE.Mesh(new THREE.BoxGeometry(w, t, len), m); o.position.set(x, yBot + rise / 2 - t / 2, zLow - run / 2); o.rotation.x = Math.atan2(rise, run); o.visible = false; tmp.add(o); return o; };
    const glass = M({ color: 0x3f5566, metalness: .3, roughness: .25 });
    const aacTex = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#e4e2dc'; g.fillRect(0, 0, 128, 64); g.strokeStyle = '#a9a59b'; g.lineWidth = 2; for (let r = 0; r < 4; r++) { g.beginPath(); g.moveTo(0, r * 16); g.lineTo(128, r * 16); g.stroke(); for (let i = 0; i < 3; i++) { const x = (i * 48 + (r % 2) * 24) % 128; g.beginPath(); g.moveTo(x, r * 16); g.lineTo(x, r * 16 + 16); g.stroke(); } } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
    const aac = (len, h) => { const t = aacTex.clone(); t.needsUpdate = true; t.repeat.set(len / 1.2, h / .6); return M({ map: t, roughness: .95 }); };

    // ===== 1# 楼：装配式框架 =====
    const xs = [-23.6, -20.1, -16.6, -13.4], zs = [-14.6, -10, -5.4], cS = .5, bD = .4, colH = pcH - bD;
    const colPts = []; xs.forEach(x => zs.forEach(z => colPts.push([x, z])));
    const yardCol = { x: -19.4, y: .3, z: -22.6 }, yardBeam = { x: -14.3, y: .3, z: -22.6 }, yardSlab = { x: -24.5, y: .3, z: -22.6 };
    const columns = colPts.map(([x, z]) => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(cS, colH, cS), mats.pc); b.castShadow = true; g.add(b); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, c]) => { const r = new THREE.Mesh(new THREE.BoxGeometry(.04, .32, .04), mats.steel); r.position.set(a * .17, colH / 2 + .16, c * .17); g.add(r); }); g.userData = { h: colH }; g.visible = false; tmp.add(g); return { o: g, x, y: yA, z }; });
    const beamA = []; zs.forEach(z => { for (let i = 0; i < 3; i++) beamA.push({ len: xs[i + 1] - xs[i] - cS, x: (xs[i] + xs[i + 1]) / 2, z, r: 0 }); });
    xs.forEach(x => { for (let j = 0; j < 2; j++) beamA.push({ len: zs[j + 1] - zs[j] - cS, x, z: (zs[j] + zs[j + 1]) / 2, r: Math.PI / 2 }); });
    const beamsA = beamA.map(b => { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(b.len, bD - .1, .3), mats.pc); m.position.y = -.05; m.castShadow = true; g.add(m); for (let s = 0; s < Math.floor(b.len / .3); s++) { const st = new THREE.Mesh(new THREE.BoxGeometry(.03, .16, .22), mats.steel); st.position.set(-b.len / 2 + .15 + s * .3, (bD - .1) / 2 + .03, 0); g.add(st); } g.userData = { h: bD }; g.visible = false; tmp.add(g); return { o: g, x: b.x, y: yA + colH, z: b.z, r: b.r, len: b.len }; });
    // 叠合板：每跨两块；东南跨留楼梯洞口
    const slabsA = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) for (let h = 0; h < 2; h++) { if (i === 2 && j === 1 && h === 1) continue; const sx = xs[i + 1] - xs[i], w = sx / 2 - .06, d = zs[j + 1] - zs[j] - .12; const o = new THREE.Mesh(new THREE.BoxGeometry(w, .12, d), mats.pc); o.castShadow = true; o.userData = { h: .12 }; o.visible = false; tmp.add(o); slabsA.push({ o, x: xs[i] + sx * (h ? .75 : .25), y: yA + pcH, z: (zs[j] + zs[j + 1]) / 2 }); }
    const stairX = xs[2] + (xs[3] - xs[2]) * .75, stairRun = 3.6;
    const stairA = mkStair(1.2, stairRun, pcH, 9, mats.pc); const stairItem = { o: stairA, x: stairX, y: yA, z: -5.85 - stairRun / 2 };
    const propsBeam = beamsA.map(b => mkProp(b.x, yA, b.z, colH));
    const propsSlab = slabsA.map(s => mkProp(s.x, yA, s.z, pcH));
    const braces = []; columns.forEach(c => { [[1, 0], [0, 1]].forEach(([dx, dz]) => { const sx = c.x < -18.5 ? 1 : -1, sz = c.z < -10 ? 1 : -1; const top = new THREE.Vector3(c.x, yA + colH * .72, c.z); const bot = new THREE.Vector3(c.x + dx * sx * 1.25, yA + .05, c.z + dz * sz * 1.25); const r = rodBetween(top, bot, .035, mats.brace); r.visible = false; braces.push(r); }); });
    const groutPads = columns.map(c => { const o = bx(cS + .1, .07, cS + .1, mats.grout, c.x, yA, c.z); o.visible = false; return o; });
    const nodeCage = columns.map(c => { const o = bx(cS + .06, bD + .16, cS + .06, cageM, c.x, yA + colH, c.z); o.visible = false; return o; });
    const nodeConc = columns.map(c => { const o = bx(cS, bD, cS, mats.conc, c.x, yA + colH, c.z); o.visible = false; return o; });
    // 叠合层：洞口以外两块
    const topRects = [[x0, -15, -15, z1], [-15, x1, z0, -10]];
    const topNets = topRects.map(([a, b, c, d]) => { const o = rebarNet(b - a, d - c, (a + b) / 2, yA + pcH + .14, (c + d) / 2, 2.2); o.visible = false; return o; });
    const toppings = topRects.map(([a, b, c, d]) => { const o = bx(b - a, .08, d - c, mats.fresh, (a + b) / 2, yA + pcH + .12, (c + d) / 2); o.visible = false; return o; });
    const pipes = [0, 1, 2].map(i => { const o = bx(8, .04, .04, M({ color: 0xff7a1a }), -19.5, yA + pcH + .13, -12.5 + i * 2.5); o.visible = false; return o; });
    const hose = stream(120, 0x777b7f); hose.visible = false;
    // 预制外墙板（外挂墙板，带窗洞）
    const mkWall = (len) => { const g = new THREE.Group(); const H = pcH, ww = len * .46, wh = H * .5, t = .18; const parts = [[len, H * .3, 0, -H / 2 + H * .15], [len, H - H * .3 - wh, 0, H / 2 - (H - H * .3 - wh) / 2], [(len - ww) / 2, wh, -(len + ww) / 4, -H / 2 + H * .3 + wh / 2], [(len - ww) / 2, wh, (len + ww) / 4, -H / 2 + H * .3 + wh / 2]]; parts.forEach(([w, h, x, y]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), mats.pc); m.position.set(x, y, 0); m.castShadow = true; g.add(m); }); const gl = new THREE.Mesh(new THREE.BoxGeometry(ww, wh, .04), glass); gl.position.set(0, -H / 2 + H * .3 + wh / 2, 0); g.add(gl); g.userData = { h: H }; g.visible = false; tmp.add(g); return g; };
    const wallSpec = []; [[x0, -20.1], [-20.1, -16.6], [-16.6, x1]].forEach(([a, b]) => { wallSpec.push({ len: b - a, x: (a + b) / 2, z: z0 + .09, r: 0 }); wallSpec.push({ len: b - a, x: (a + b) / 2, z: z1 - .09, r: 0 }); });
    [[z0 + .2, -10], [-10, z1 - .2]].forEach(([a, b]) => { wallSpec.push({ len: b - a, x: x0 + .09, z: (a + b) / 2, r: Math.PI / 2 }); wallSpec.push({ len: b - a, x: x1 - .09, z: (a + b) / 2, r: Math.PI / 2 }); });
    const wallsA = wallSpec.map(s => ({ o: mkWall(s.len), x: s.x, y: yA, z: s.z, r: s.r }));
    const workersA = [0, 1, 2, 3].map(i => { const f = figure(); f.position.set(-22 + i * 2.2, yA, -8 - (i % 2) * 3); f.visible = false; return f; });
    const gridPts = []; xs.forEach(x => gridPts.push(new THREE.Vector3(x, yA + .02, z0 + .1), new THREE.Vector3(x, yA + .02, z1 - .1))); zs.forEach(z => gridPts.push(new THREE.Vector3(x0 + .1, yA + .02, z), new THREE.Vector3(x1 - .1, yA + .02, z)));
    const marks = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(gridPts), new THREE.LineBasicMaterial({ color: 0xff2d55 })); marks.visible = false; tmp.add(marks);
    const tripod = new THREE.Group(); [0, 1, 2].forEach(a => { const l = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .7, 4), mats.prop); l.position.set(Math.cos(a * 2.1) * .12, .33, Math.sin(a * 2.1) * .12); l.rotation.z = Math.cos(a * 2.1) * .3; tripod.add(l); }); const inst = new THREE.Mesh(new THREE.BoxGeometry(.18, .16, .14), mats.blue); inst.position.y = .72; tripod.add(inst); tripod.position.set(-21.5, yA, -7.5); tripod.visible = false; tmp.add(tripod);
    const hY = yA + 3.2;
    tagA('col', '① 预制柱', -18.5, hY, -4.6); tagA('brace', '柱斜支撑 · 校正垂直度', -18.5, hY, -4.6); tagA('grout', '柱底套筒灌浆', -18.5, hY, -4.6);
    tagA('beam', '② 叠合梁（预制部分）', -18.5, hY, -4.6); tagA('slab', '③ 叠合板（预制底板）', -18.5, hY, -4.6); tagA('stairA', '④ 预制楼梯梯段', stairX, hY, -6);
    tagA('net', '梁柱节点 + 叠合层钢筋', -18.5, hY, -4.6); tagA('pour', '后浇节点与叠合层混凝土', -18.5, hY, -4.6); tagA('wallA', '⑤ 预制外墙板（外挂墙板）', -18.5, hY + .4, -4.2);
    tagA('climb', '爬架提升一层（防坠、同步控制）', -18.5, yA + fhA + 3.4, -4.5); tagA('mark', '轴线 · 柱位控制线', -18.5, hY, -4.6);

    // ===== 2# 楼：现浇框架 =====
    const bx0 = 1.3, bx1 = 10.7, bz0 = -13.7, bz1 = -3.3, bxs = [2, 4.4, 6.8, 9.2], bzs = [-13, -8.5, -4];
    const cols = []; bxs.forEach(x => bzs.forEach(z => cols.push([x, z])));
    const deckTop = yB + fhB - .02, deckBot = yB + fhB - .2, beamH = .4, beamBot = deckBot - beamH;
    const cages = cols.map(([x, z]) => { const o = bx(.32, deckTop - yB, .32, cageM, x, yB, z); o.visible = false; return o; });
    const colForm = cols.map(([x, z]) => { const o = bx(.44, beamBot - yB, .44, mats.wood, x, yB, z); o.visible = false; return o; });
    const colConc = cols.map(([x, z]) => { const o = bx(.34, beamBot - yB, .34, mats.conc, x, yB, z); o.visible = false; return o; });
    const beamB = []; bzs.forEach(z => { for (let i = 0; i < 3; i++) beamB.push({ len: bxs[i + 1] - bxs[i] - .34, x: (bxs[i] + bxs[i + 1]) / 2, z, r: 0 }); });
    bxs.forEach(x => { for (let j = 0; j < 2; j++) beamB.push({ len: bzs[j + 1] - bzs[j] - .34, x, z: (bzs[j] + bzs[j + 1]) / 2, r: Math.PI / 2 }); });
    const onBeam = (x, z) => bzs.some(bz => Math.abs(z - bz) < .25) || bxs.some(bxv => Math.abs(x - bxv) < .25);
    const shoring = []; for (let x = 1.8; x <= 10.4; x += 1.2) for (let z = -13.3; z <= -3.7; z += 1.2) { const h = (onBeam(x, z) ? beamBot - .06 : deckBot - .06) - yB; const o = cyl(.025, h, mats.prop, x, yB, z); o.visible = false; shoring.push(o); }
    const beamForm = beamB.map(b => { const g = new THREE.Group(); const wdt = .25, t = .05; const bot = new THREE.Mesh(new THREE.BoxGeometry(b.len, t, wdt + 2 * t), mats.ply); bot.position.y = -beamH / 2 - t / 2; g.add(bot); [-1, 1].forEach(s => { const sd = new THREE.Mesh(new THREE.BoxGeometry(b.len, beamH, t), mats.ply); sd.position.z = s * (wdt / 2 + t / 2); g.add(sd); }); g.position.set(b.x, beamBot + beamH / 2, b.z); g.rotation.y = b.r; g.visible = false; tmp.add(g); return g; });
    const beamCage = beamB.map(b => { const o = new THREE.Mesh(new THREE.BoxGeometry(b.len, beamH + .32, .2), cageM); o.position.set(b.x, beamBot + (beamH + .32) / 2, b.z); o.rotation.y = b.r; o.visible = false; tmp.add(o); return o; });
    const beamConc = beamB.map(b => { const o = new THREE.Mesh(new THREE.BoxGeometry(b.len, beamH, .25), mats.conc); o.position.set(b.x, beamBot + beamH / 2, b.z); o.rotation.y = b.r; o.castShadow = true; o.visible = false; tmp.add(o); return o; });
    const deckRects = [[bx0, bx1, bz0, -8.5], [bx0, 7.4, -8.5, bz1], [9.0, bx1, -8.5, bz1]];   // 东南留楼梯洞口 x 7.4–9.0
    const deckForm = deckRects.map(([a, b, c, d]) => { const o = bx(b - a, .06, d - c, mats.ply, (a + b) / 2, deckBot - .06, (c + d) / 2); o.visible = false; return o; });
    const deckNet = deckRects.map(([a, b, c, d]) => { const o = rebarNet(b - a, d - c, (a + b) / 2, deckTop - .04, (c + d) / 2, 2.2); o.visible = false; return o; });
    const deckConc = deckRects.map(([a, b, c, d]) => { const o = bx(b - a, .18, d - c, mats.fresh, (a + b) / 2, deckBot, (c + d) / 2); o.visible = false; return o; });
    const sX = 8.2, sRun = 4.2, sZlow = -3.8;
    const stairForm = slope(1.3, sRun, fhB - .02, .06, mats.ply, sX, yB - .08, sZlow);
    const stairProps = [0, 1, 2, 3].map(i => { const z = sZlow - (i + .5) * sRun / 4, h = (i + .5) / 4 * (fhB - .02) - .12; return cyl(.025, Math.max(.05, h), mats.prop, sX, yB, z); }); stairProps.forEach(o => o.visible = false);
    const stairCage = slope(1.1, sRun, fhB - .02, .22, cageM, sX, yB + .04, sZlow);
    const stairB = mkStair(1.2, sRun, fhB - .02, 10, mats.conc); stairB.position.set(sX, yB + (fhB - .02) / 2, sZlow - sRun / 2);
    // 二次结构：加气混凝土砌块填充墙（窗台墙 + 窗间墙 + 过梁）
    const spans = []; [-13, -4].forEach(z => { for (let i = 0; i < 3; i++) spans.push({ a: bxs[i] + .17, b: bxs[i + 1] - .17, z, r: 0 }); }); [2, 9.2].forEach(x => { for (let j = 0; j < 2; j++) spans.push({ a: bzs[j] + .17, b: bzs[j + 1] - .17, x, r: 1 }); });
    const wallH = beamBot - yB, sillH = wallH * .32, winH = wallH * .5, linH = wallH - sillH - winH;
    const masonry = spans.map(s => { const len = s.b - s.a, c = (s.a + s.b) / 2, pier = len * .24; const mk = (w, h, off, y, m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, .2), m); const px = s.r ? s.x : c + off, pz = s.r ? c + off : s.z; o.position.set(px, y + h / 2, pz); o.rotation.y = s.r ? Math.PI / 2 : 0; o.castShadow = true; o.visible = false; tmp.add(o); return o; }; return { sill: mk(len, sillH, 0, yB, aac(len, sillH)), p1: mk(pier, winH, -len / 2 + pier / 2, yB + sillH, aac(pier, winH)), p2: mk(pier, winH, len / 2 - pier / 2, yB + sillH, aac(pier, winH)), lin: mk(len, linH, 0, yB + sillH + winH, mats.conc) }; });
    const bundle = bx(1.6, .25, .5, mats.steel, 0, 0, 0); bundle.userData = { h: .25 }; bundle.visible = false;
    const formBundle = bx(1.4, .35, 1.0, mats.ply, 0, 0, 0); formBundle.userData = { h: .35 }; formBundle.visible = false;
    const blockPallet = bx(1.2, .5, 1.0, aac(1.2, .5), 0, 0, 0); blockPallet.userData = { h: .5 }; blockPallet.visible = false;
    const workersB = [0, 1, 2, 3, 4].map(i => { const f = figure(); f.position.set(2.5 + i * 1.8, yB, -6 - (i % 3) * 2.5); f.visible = false; return f; });
    const inspector = figure(0x1d4ed8, 0xffffff); inspector.visible = false;
    const mist = stream(160, 0xbfe3ff); mist.visible = false;
    const hoseB = stream(140, 0x6f7377); hoseB.visible = false;
    const mixer = new THREE.Group(); bx(.9, .35, 2.4, M({ color: 0x3a3d40 }), 0, .15, 0, mixer); bx(.9, .55, .6, M({ color: 0xe8e8e8 }), 0, .3, 1.0, mixer); const drum = new THREE.Mesh(new THREE.CylinderGeometry(.42, .3, 1.5, 12), M({ color: 0xf28c28 })); drum.rotation.x = Math.PI / 2 - .25; drum.position.set(0, .95, -.4); mixer.add(drum); mixer.visible = false; tmp.add(mixer);
    const hB = yB + 2.9;
    tagA('cage', '① 柱钢筋笼', 6, hB, -3); tagA('colPour', '柱模板 → 浇筑柱混凝土', 6, hB, -3); tagA('form', '② 梁板模板 + 盘扣支撑架', 6, hB, -3); tagA('beamNet', '梁钢筋（主梁、次梁）', 6, hB, -3);
    tagA('deckNet', '③ 板钢筋 · 线管预埋', 6, hB, -3); tagA('check', '隐蔽验收（移动检查）', 6, hB, -3); tagA('pourB', '浇筑梁板混凝土', 6, hB, -3); tagA('cure', '洒水养护', 6, hB, -3);
    tagA('stairB', '④ 现浇楼梯：支模 → 钢筋 → 浇筑', sX, hB, -3); tagA('strip', '拆除梁板模板', 6, hB, -3); tagA('mason', '⑤ 砌筑填充墙 / 外墙（二次结构）', 6, hB, -2.6);
    const seeThrough = (mesh, op) => { if (!mesh) return; (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(m => { save(m, 'transparent'); save(m, 'opacity'); save(m, 'depthWrite'); m.transparent = true; m.opacity = Math.min(m.opacity, op); m.depthWrite = false; m.needsUpdate = true; }); };
    seeThrough(A.climb, .28); (B.parts || []).forEach(p => seeThrough(p.net, .35));
    const climbH0 = yA + 1.7;
    const CAMlow = [[19, 9.5, 9], [6, yB + .6, -8.5]];
    const netOff = () => (B.parts || []).forEach(p => p.net && setVis(p.net, false));
    let bundleLift, formLift, blockLift;
    const allA = () => [columns.map(c => c.o), beamsA.map(b => b.o), slabsA.map(s => s.o), stairA, propsBeam, propsSlab, braces, groutPads, nodeCage, nodeConc, topNets, toppings, pipes, wallsA.map(w => w.o), marks, tripod, hose];
    const allB = () => [cages, colForm, colConc, shoring, beamForm, beamCage, beamConc, deckForm, deckNet, deckConc, stairForm, stairProps, stairCage, stairB, masonry.map(m => [m.sill, m.p1, m.p2, m.lin]), workersB, inspector, mist, hoseB, mixer, bundle, formBundle, blockPallet];
    const colLift = liftStep(crane1, columns, yardCol, 3), beamLift = liftStep(crane1, beamsA, yardBeam, 3), slabLift = liftStep(crane1, slabsA, yardSlab, 3), wallLift = liftStep(crane1, wallsA, yardCol, 3);
    let stairLift;
    return [
      // ---- 1# 楼：装配式框架 ----
      { name: '1# 楼 · 测量放线与插筋校正', desc: '在已完成的第 5 层楼面上用全站仪放出轴线和柱位控制线，校正柱底预留插筋的位置和长度，保证与预制柱的灌浆套筒对得上。', key: '插筋偏位会导致预制柱无法就位，严禁随意弯折插筋。', points: ['grout'], cam: CAM.A, dur: 5,
        init() { stages.setH(yA, yB); stages.planes.planeA2.constant = climbH0; setVis(A.topG, false); show(workersA, true); L1(lbl.mark); }, tick(k) { tripod.visible = true; marks.visible = true; marks.geometry.setDrawRange(0, Math.ceil(k * 7) * 2); } },
      { name: '1# 楼 · ① 预制柱吊装', desc: '塔吊从北侧构件堆场起吊预制柱：先试吊离地 20–30 cm 检查吊具，再吊到楼面，柱底套筒对准插筋缓慢落下，用垫片调好标高。', key: '吊装区域下方设警戒，严禁站人；塔吊有力矩限制和吊钩可视化监测。', points: ['crane1', 'slab-lift'], norm: 'GB/T 51231-2016；JGJ 196-2010', cam: CAM.Awide, dur: 16,
        init() { L1(lbl.col); colLift.init(); }, tick(k) { colLift.tick(k); } },
      { name: '1# 楼 · 柱斜支撑与垂直度校正', desc: '每根柱就位后立即在两个方向安装可调斜支撑，用经纬仪或靠尺校正垂直度后锁紧，之后才能摘钩。', key: '预制柱临时支撑不少于 2 道，后浇混凝土达到强度前不得拆除。', points: ['grout'], cam: CAM.A, dur: 5,
        init() { placeAll(columns); L1(lbl.brace); }, tick(k) { reveal(braces, k, 'y'); } },
      { name: '1# 楼 · 柱底套筒灌浆', desc: '封堵柱底接缝，用灌浆机从柱底灌浆孔压入灌浆料，直到上方出浆孔连续出浆后逐个封堵。', key: '灌浆应饱满、密实，所有出口均应出浆（GB/T 51231-2016 第 11.3.3 条）；冬期施工要控制温度，全程留影像记录。', points: ['grout'], norm: 'GB/T 51231-2016 第 11.3.3 条；JGJ 355-2015（2023年版）', cam: CAM.A, dur: 6,
        init() { braces.forEach(b => { b.visible = true; b.scale.set(1, 1, 1); }); L1(lbl.grout); }, tick(k) { groutPads.forEach((s, i) => { s.visible = k * groutPads.length > i; }); } },
      { name: '1# 楼 · ② 叠合梁吊装', desc: '先在梁下布置独立钢支撑并调好标高，再吊装叠合梁，梁端搁在柱顶，梁上露出的箍筋留着和后浇层连成整体。', key: '先主梁后次梁；梁端搁置长度、梁底标高要复核；梁柱节点钢筋避让按深化图施工。', points: ['crane1', 'slab-lift'], norm: 'GB/T 51231-2016；JGJ 1-2014', cam: CAM.Awide, dur: 16,
        init() { groutPads.forEach(g => g.visible = true); L1(lbl.beam); this.b = false; }, tick(k) { reveal(propsBeam, seg(k, 0, .15), 'y'); if (k > .15) { if (!this.b) { this.b = true; beamLift.init(); } beamLift.tick(seg(k, .15, 1)); } } },
      { name: '1# 楼 · ③ 叠合板吊装', desc: '按方案布置板下独立支撑，叠合板用专用吊架多点起吊，逐块搁在叠合梁上，板缝和标高调平。楼梯间位置留出洞口。', key: '支撑间距和顶标高按方案复核；叠合板不得集中堆放施工荷载。', points: ['crane1', 'slab-lift'], norm: 'GB/T 51231-2016', cam: CAM.Awide, dur: 15,
        init() { show(propsBeam, true); propsBeam.forEach(p => p.scale.set(1, 1, 1)); placeAll(beamsA); L1(lbl.slab); this.b = false; }, tick(k) { reveal(propsSlab, seg(k, 0, .15), 'y'); if (k > .15) { if (!this.b) { this.b = true; slabLift.init(); } slabLift.tick(seg(k, .15, 1)); } } },
      { name: '1# 楼 · ④ 预制楼梯吊装', desc: '楼梯梯段在工厂预制，塔吊用专用吊具保持梯段倾斜角起吊，上下端搁置在梯梁（平台梁）上，端部按设计做固定铰或滑动铰。', key: '起吊前确认吊点和梯段倾角；梯段就位后及时做临时防护栏杆，楼梯可作为施工通道。', points: ['crane1', 'prefab-show'], norm: 'GB/T 51231-2016', cam: CAM.Awide, dur: 8,
        init() { show(propsSlab, true); propsSlab.forEach(p => p.scale.set(1, 1, 1)); placeAll(slabsA); L1(lbl.stairA); stairA.userData.rotTo = 0; stairLift = lift(crane1, stairA, yardBeam, { x: stairItem.x, y: yA, z: stairItem.z }); stairLift.init(); }, tick(k) { stairLift.tick(k); if (k >= 1) { place(stairItem); stairA.visible = true; } } },
      { name: '1# 楼 · 梁柱节点与叠合层钢筋', desc: '在梁柱节点核心区绑扎钢筋、安装节点模板；在叠合板上绑扎上层钢筋网，同步预埋电气线管和线盒，完成后隐蔽验收。', key: '节点区钢筋密集，要按深化图避让；预埋管线不得切断受力钢筋，验收合格才能浇筑。', points: ['yijian'], norm: 'GB 50300-2013', cam: CAM.A, dur: 6,
        init() { place(stairItem); stairA.visible = true; L1(lbl.net); }, tick(k) { reveal(nodeCage, seg(k, 0, .35), 'y'); topNets.forEach((n, i) => { n.visible = k > .35 + i * .2; n.scale.set(Math.max(.01, seg(k, .35 + i * .2, .65 + i * .2)), 1, 1); }); show(pipes, k > .9); } },
      { name: '1# 楼 · 浇筑节点与叠合层混凝土', desc: '泵管送混凝土到楼面，先浇梁柱节点，再从一端向另一端连续浇筑叠合层，振捣密实、收面，使预制构件连成整体。', key: '浇筑时盯住独立支撑；楼面不得集中堆料。', points: ['person-loc'], cam: CAM.A, dur: 7,
        init() { show(nodeCage, true); nodeCage.forEach(o => o.scale.set(1, 1, 1)); L1(lbl.pour); hose.visible = true; }, tick(k) { nodeConc.forEach((o, i) => { o.visible = k > i * .02; if (o.visible) nodeCage[i].visible = false; }); toppings.forEach((o, i) => { const t = seg(k, .25 + i * .4, .65 + i * .4); o.visible = t > 0; o.scale.set(Math.max(.01, t), 1, 1); }); show(topNets, k < .95); flowStream(hose, new THREE.Vector3(-23.5 + 10 * k, yA + 4, -10), new THREE.Vector3(-23.5 + 10 * k, yA + pcH + .2, -10), performance.now() / 1000); if (k >= 1) hose.visible = false; } },
      { name: '1# 楼 · ⑤ 预制外墙板安装', desc: '外围护用预制外挂墙板（带窗洞），塔吊吊到楼层外侧，用预埋连接件挂在梁和楼板上，调好缝宽后固定，最后板缝打胶防水。', key: '外挂墙板通常比主体结构滞后 2–3 层安装，这里为了看清楚放在本层演示；吊装时爬架对应部位要做好防护。', points: ['crane1', 'prefab-show'], norm: 'GB/T 51231-2016', cam: CAM.Awide, dur: 15,
        init() { hose.visible = false; show(nodeConc, true); toppings.forEach(o => { o.visible = true; o.scale.set(1, 1, 1); }); hide(nodeCage, topNets); L1(lbl.wallA); wallLift.init(); }, tick(k) { wallLift.tick(k); } },
      { name: '1# 楼 · 养护拆撑，本层完成', desc: '混凝土终凝后覆盖养护，同条件试块达到规定强度后拆除柱斜撑和独立支撑，第 6 层结构完成，进入上一层循环。', key: '拆除临时支撑前要确认同条件试块强度。', points: [], cam: CAM.A, dur: 4,
        init() { placeAll(wallsA); L1(null); }, tick(k) { if (k > .5) { hide(allA()); stages.setH(lerp(yA, yA + fhA, ease(seg(k, .5, 1))), yB); stages.planes.planeA2.constant = climbH0; } } },
      { name: '1# 楼 · 附着式升降脚手架提升一层', desc: '检查附墙支座、防坠装置和同步控制系统，清理架体杂物，各机位同步提升一个楼层高度后锁定。', key: '架体高度不得大于 5 倍楼层高；每层设附墙支座（JGJ 202-2010 第 4.4.2、4.4.5 条）。提升时架体上严禁站人。', points: [], norm: 'JGJ 202-2010 第 4.4.2、4.4.5 条', cam: CAM.Awide, dur: 6,
        init() { hide(allA()); L1(lbl.climb); show(workersA, false); }, tick(k) { stages.planes.planeA2.constant = climbH0 + fhA * ease(k); } },
      // ---- 2# 楼：现浇框架 ----
      { name: '2# 楼 · 外脚手架随层搭设', desc: '落地式双排脚手架随结构上升，外挂密目安全网，作业层满铺脚手板并设挡脚板和防护栏杆。', key: '脚手架应高出作业面一步以上；连墙件按方案设置。', points: ['video-ai'], cam: CAM.B, dur: 5,
        init() { L1(null); show(workersB, true); stages.planes.planeB2.constant = yB + .4; }, tick(k) { stages.planes.planeB2.constant = yB + .4 + (fhB + .6) * ease(k); } },
      { name: '2# 楼 · ① 柱钢筋绑扎', desc: '塔吊把加工好的钢筋吊到楼面，工人在下层伸出的插筋上连接柱纵筋、套箍筋，绑成柱钢筋笼，接头按要求错开。', key: '钢筋进场用钢筋 AI 盘点核对数量；吊运钢筋两点绑扎，防止滑落。', points: ['crane2', 'rebar-ai'], cam: CAM.Bwide, dur: 12,
        init() { L1(lbl.cage); bundleLift = lift(crane2, bundle, { x: 12.6, y: .3, z: -22.6 }, { x: 6, y: yB, z: -8.5 }); bundleLift.init(); }, tick(k) { bundleLift.tick(seg(k, 0, .7)); if (k > .7) { bundle.visible = false; reveal(cages, seg(k, .7, 1), 'y'); } } },
      { name: '2# 楼 · 柱支模与浇筑柱混凝土', desc: '柱钢筋验收后安装柱模板和柱箍，先单独浇筑柱混凝土到梁底标高，分层振捣。', key: '柱和梁板混凝土强度等级不同时，节点区按高强度等级浇筑，要设拦截措施。', points: ['crane2', 'yijian'], cam: CAM.B, dur: 9,
        init() { show(cages, true); cages.forEach(c => c.scale.set(1, 1, 1)); L1(lbl.colPour); hoseB.visible = false; }, tick(k) { reveal(colForm, seg(k, 0, .45), 'y'); if (k > .5) { const i = Math.min(cols.length - 1, Math.floor(seg(k, .5, 1) * cols.length)), [x, z] = cols[i]; hoseB.visible = k < 1; flowStream(hoseB, new THREE.Vector3(x, yB + 4, z), new THREE.Vector3(x, beamBot, z), performance.now() / 1000, .05); } if (k >= 1) { hoseB.visible = false; show(colConc, true); } } },
      { name: '2# 楼 · ② 拆柱模，支梁板模板', desc: '柱混凝土达到强度后拆柱模，露出混凝土柱；搭设盘扣式满堂支撑架，先铺梁底模、立梁侧模，再铺楼板模板，调整标高和起拱。', key: '模板支撑架严禁与脚手架相连；跨度不小于 4 m 的梁板底模按规定起拱。', points: ['crane2'], cam: CAM.Bwide, dur: 12,
        init() { show(colForm, true); show(colConc, true); L1(lbl.form); formLift = lift(crane2, formBundle, { x: 16, y: .3, z: -22.6 }, { x: 8, y: yB, z: -6 }); formLift.init(); }, tick(k) { if (k > .05) hide(colForm, cages); formLift.tick(seg(k, 0, .45)); if (k > .45) { formBundle.visible = false; reveal(shoring, seg(k, .45, .7), 'y'); reveal(beamForm, seg(k, .65, .85), 'x'); reveal(deckForm, seg(k, .85, 1), 'x'); } } },
      { name: '2# 楼 · 梁钢筋绑扎', desc: '在梁模板里绑扎梁钢筋：先主梁、后次梁，纵筋穿过柱节点，箍筋加密区按图施工。', key: '梁柱节点区箍筋不能漏放；主次梁交接处次梁钢筋放在主梁钢筋之上。', points: [], cam: CAM.B, dur: 6,
        init() { hide(colForm, cages); show(shoring, true); show(beamForm, true); show(deckForm, true); shoring.concat(beamForm, deckForm).forEach(o => o.scale.set(1, 1, 1)); L1(lbl.beamNet); }, tick(k) { reveal(beamCage, k, 'x'); } },
      { name: '2# 楼 · ③ 板钢筋绑扎与水电预埋', desc: '在楼板模板上绑扎双层双向板钢筋，放置马凳和保护层垫块，同步预埋电气线管和线盒。楼梯间位置留出洞口。', key: '负弯矩钢筋不能被踩踏下沉。', points: [], cam: CAM.B, dur: 6,
        init() { show(beamCage, true); beamCage.forEach(o => o.scale.set(1, 1, 1)); L1(lbl.deckNet); }, tick(k) { deckNet.forEach((n, i) => { const t = seg(k, i / 3, (i + 1) / 3); n.visible = t > 0; n.scale.set(Math.max(.01, t), 1, 1); }); } },
      { name: '2# 楼 · 隐蔽工程验收', desc: '施工员自检后，监理用移动检查终端逐项检查钢筋规格、间距、保护层和预埋件，拍照留存。', key: '隐蔽验收合格签字后方可浇筑混凝土。', points: ['yijian'], norm: 'GB 50300-2013', cam: CAM.B, dur: 5,
        init() { deckNet.forEach(n => { n.visible = true; n.scale.set(1, 1, 1); }); L1(lbl.check); inspector.visible = true; }, tick(k) { inspector.position.set(2 + 8 * k, deckBot, -4 - Math.sin(k * 6) * 1.5); } },
      { name: '2# 楼 · 浇筑梁板混凝土', desc: '罐车把商品混凝土送到汽车泵，泵车臂架布料，梁和板一起浇筑，先浇梁、后浇板，振捣密实、表面收光。', key: '浇筑前检查泵车支腿和地基；浇筑时盯住模板支撑架变形。', points: ['person-loc', 'env'], cam: CAM.Bwide, dur: 9,
        init() { L1(lbl.pourB); inspector.visible = false; mixer.visible = true; }, tick(k) { mixer.position.set(lerp(-14, -3.2, ease(seg(k, 0, .3))), 0, -18.6); mixer.rotation.y = Math.PI / 2; drum.rotation.y = k * 30; reveal(deckConc, seg(k, .3, 1), 'x'); show(deckNet, k < .95); hoseB.visible = k > .3 && k < 1; flowStream(hoseB, new THREE.Vector3(2 + 8 * seg(k, .3, 1), yB + 5, -8.5), new THREE.Vector3(2 + 8 * seg(k, .3, 1), deckTop, -8.5), performance.now() / 1000); if (k >= 1) { hoseB.visible = false; hide(deckNet, beamCage); } } },
      { name: '2# 楼 · 养护', desc: '浇筑后 12 小时内覆盖并洒水养护，环境监测联动雾炮降尘；同条件试块随楼面养护。', key: '普通混凝土养护不少于 7 天（常规做法）。', points: ['env', 'water-elec'], cam: CAM.B, dur: 5,
        init() { L1(lbl.cure); mist.visible = true; mixer.visible = false; hide(deckNet, beamCage); }, tick(k) { flowStream(mist, new THREE.Vector3(6, yB + 3, -8.5), new THREE.Vector3(6, deckTop, -8.5), performance.now() / 1000, 3.5); if (k >= 1) mist.visible = false; } },
      { name: '2# 楼 · ④ 现浇楼梯', desc: '在楼梯洞口支楼梯底模和踏步侧模，绑扎梯板钢筋，再浇筑梯段混凝土。楼梯可以和楼板同时浇筑，也可以滞后浇筑。', key: '楼梯施工缝留在梯段跨度端部 1/3 范围内（常规做法）；浇筑后踏步要做成品保护。', points: [], cam: CAM.B, dur: 9,
        init() { mist.visible = false; L1(lbl.stairB); }, tick(k) { reveal(stairProps, seg(k, 0, .2), 'y'); stairForm.visible = k > .15; stairCage.visible = k > .35 && k < .8; stairB.visible = k > .6; stairB.children.forEach((s, i) => { s.visible = seg(k, .6, 1) * stairB.children.length > i; }); if (k >= 1) { stairCage.visible = false; stairB.children.forEach(s => s.visible = true); } } },
      { name: '2# 楼 · 拆除梁板模板', desc: '同条件试块达到拆模强度后，先拆梁侧模和楼梯侧模，再拆板底模和支撑架，模板周转到上一层。', key: '底模拆除要看同条件试块强度报告，悬挑构件要达到 100% 设计强度才能拆。', points: [], cam: CAMlow, dur: 6,
        init() { netOff(); show(stairProps, true); stairForm.visible = true; stairB.visible = true; stairB.children.forEach(s => s.visible = true); L1(lbl.strip); }, tick(k) { const t = seg(k, .1, .9); beamForm.forEach((o, i) => { o.visible = t * beamForm.length < beamForm.length - i; }); show(deckForm, t < .7); show(shoring, t < .9); show(stairProps, t < .5); stairForm.visible = t < .5; if (k > .1) show(beamConc, true); } },
      { name: '2# 楼 · ⑤ 砌筑填充墙与外墙', desc: '框架结构的外墙和隔墙是后砌的非承重墙：塔吊把加气混凝土砌块吊到楼层，先砌窗台以下墙体，再砌窗间墙，窗洞上方安装过梁，墙顶与梁底斜砌顶紧，墙中按规定设构造柱和拉结筋。', key: '二次结构一般在主体施工若干层、结构验收后插入，这里为了看清楚放在本层演示；砌体与梁底之间要隔一段时间（常见 14 天）再顶砌。', points: ['crane2'], cam: CAMlow, dur: 14,
        init() { netOff(); hide(beamForm, deckForm, shoring, stairProps, stairForm); show(beamConc, true); show(colConc, true); deckConc.forEach(o => { o.visible = true; o.scale.set(1, 1, 1); }); L1(lbl.mason); blockLift = lift(crane2, blockPallet, { x: 12.6, y: .3, z: -22.6 }, { x: 6, y: deckTop, z: -8.5 }); blockLift.init(); },
        tick(k) { blockLift.tick(seg(k, 0, .35)); if (k > .35) blockPallet.visible = false; const t = seg(k, .35, .85); masonry.forEach((m, i) => { const ti = clamp(t * masonry.length * .6 - i * .5); [m.sill, m.p1, m.p2, m.lin].forEach((o, j) => { const tj = clamp(ti * 3 - j * .6); o.visible = tj > .02; save(o, 'scale'); o.scale.set(1, Math.max(.02, tj), 1); }); }); if (k > .9) { hide(allB()); (B.parts || []).forEach(p => p.net && (p.net.visible = true)); stages.setH(yA + fhA, lerp(yB, yB + fhB, ease(seg(k, .9, 1)))); stages.planes.planeA2.constant = climbH0 + fhA; } } }
    ];
  };

  // ---------- S0 场地准备与临建 ----------
  const sortBy = (arr, f) => arr.slice().sort((a, b) => f(a) - f(b));
  const wpos = o => { const v = new THREE.Vector3(); o.getWorldPosition(v); return v; };
  SEQ.S0 = () => {
    const fence = sortBy(L.fence.children, o => Math.atan2(wpos(o).z, wpos(o).x));
    const live = sortBy(L.live.children, o => wpos(o).x + wpos(o).z * .3);
    const yard = sortBy(L.yard.children, o => wpos(o).x);
    const edu = sortBy(L.edu.children, o => wpos(o).x);
    const signs = L.sign.children.filter(o => o.visible);
    const tripod = figure(0x1d4ed8, 0xffffff); tripod.position.set(-10, 0, -4); tripod.visible = false;
    const pts = [[-24.3, -15.3], [-12.7, -15.3], [-12.7, -4.7], [-24.3, -4.7], [-24.3, -15.3]].map(([x, z]) => new THREE.Vector3(x, .1, z)).concat([[-5.3, -14.3], [15.3, -14.3], [15.3, -2.7], [-5.3, -2.7], [-5.3, -14.3]].map(([x, z]) => new THREE.Vector3(x, .1, z)));
    const lg = new THREE.BufferGeometry().setFromPoints(pts); const line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xff2d55 })); line.visible = false; tmp.add(line);
    const poles = []; const cables = [];
    [[-28, -22], [-20, -22], [-12, -22], [-4, -22], [4, -22], [12, -22], [20, -22], [28, -22], [-28, -12], [-28, -2], [-28, 6], [-28, 14]].forEach(([x, z], i, a) => { const p = cyl(.06, 2.6, M({ color: 0x8b6b45 }), x, 0, z); poles.push(p); if (i > 0 && !(i === 8)) { const pr = a[i - 1]; const c = rodBetween(new THREE.Vector3(pr[0], 2.5, pr[1]), new THREE.Vector3(x, 2.5, z), .015, mats.black); cables.push(c); } });
    const boxes = [[-26, -19], [0, -19], [22, -19], [-26, 0]].map(([x, z]) => bx(.5, .7, .3, M({ color: 0xf2c400 }), x, 0, z));
    const all = [...poles, ...cables, ...boxes]; all.forEach(o => o.visible = false);
    const tl = label('场地平整', 5, 3, -8.5); const t2 = label('测量放线（楼栋定位）', -9, 3, -9); const t3 = label('围挡 · 大门 · 门卫', 31, 4, 0); const t4 = label('加工棚 · 材料堆场', 0, 4, -22); const t5 = label('办公区 · 生活区板房（不宜超过两层）', 0, 5, 16); const t6 = label('临时用电：三级配电、两级保护', -12, 4.5, -22); const t7 = label('实名制通道 · 视频监控 · 环境监测上线', -17, 4, 8);
    const T = [tl, t2, t3, t4, t5, t6, t7]; const only = t => T.forEach(s => s.visible = s === t);
    return [
      { name: '场地清理与平整', desc: '清除场地障碍物，推土机、装载机平整场地，压路机分层碾压，形成满足临建和道路要求的场坪。', key: '土方作业裸土要覆盖，出场车辆冲洗。', points: ['cover'], cam: CAM.site, dur: 6,
        init() { [L.fence, L.live, L.yard, L.edu, L.worker].forEach(g => setVis(g, false)); signs.forEach(s => setVis(s, false)); only(tl); }, tick(k) { } },
      { name: '测量放线', desc: '依据规划红线和总平面图，用全站仪测设楼栋轴线和标高控制点，撒白灰线。', key: '控制点要引测到不受施工影响的位置并加以保护。', points: [], cam: CAM.top, dur: 5,
        init() { only(t2); tripod.visible = true; line.visible = true; }, tick(k) { lg.setDrawRange(0, Math.ceil(k * pts.length)); tripod.position.x = -10 + 16 * k; } },
      { name: '围挡与大门', desc: '沿场地周边连续设置硬质围挡，设置大门、门卫室和车辆冲洗设施，实行封闭管理。', key: '出入口应有专职门卫并实行封闭式管理（GB 55034-2022 第 2.0.4 条）。', points: ['realname', 'vehicle'], norm: 'GB 55034-2022 第 2.0.4 条', cam: CAM.site, dur: 7,
        init() { only(t3); setVis(L.fence, true); }, tick(k) { reveal(fence, k, 'y'); } },
      { name: '加工棚与材料堆场', desc: '布置钢筋、木工加工棚和预制构件、钢管、砂石堆场，按「近塔吊、少二次搬运」原则布置，危险品库单独设置。', key: '易燃易爆危险品库房与在建工程防火间距不小于 15 m（GB/T 50720-2011（2025年版）第 3.2.1A 条）。', points: ['danger', 'smoke'], norm: 'GB/T 50720-2011（2025年版）第 3.2.1A 条', cam: CAM.north, dur: 7,
        init() { only(t4); setVis(L.yard, true); }, tick(k) { reveal(yard, k, 'y'); } },
      { name: '办公区与生活区板房', desc: '搭设项目部办公室、宿舍、食堂、浴室等临时建筑，办公生活区与施工区用围挡隔开。', key: '临时建筑层数不宜超过两层（JGJ/T 188-2009 第 3.0.4 条）。', points: ['board', 'qrcode'], norm: 'JGJ/T 188-2009 第 3.0.4 条', cam: CAM.live, dur: 7,
        init() { only(t5); setVis(L.live, true); }, tick(k) { reveal(live, k, 'y'); } },
      { name: '临时用水用电', desc: '从业主电源引入总配电箱，按总配电箱—分配电箱—开关箱三级配电，架设临时线路，接通临时给水。', key: 'TN-S 系统 PE 线与 N 线分开；严禁利用大地作相线或中性线（JGJ/T 46-2024 第 3.2.4、3.2.6 条）。', points: ['water-elec'], norm: 'JGJ/T 46-2024 第 3.2.4、3.2.6 条', cam: CAM.north, dur: 6,
        init() { only(t6); }, tick(k) { reveal(all, k, 'y'); } },
      { name: '智慧工地设备上线', desc: '安装实名制闸机、AI 摄像头、环境监测站、车辆识别和智能水电表，接入智慧工地云平台，开工前联调。', key: '人员须完成实名登记和三级安全教育后才能进场。', points: ['realname', 'ai-attend', 'video-ai', 'env', 'vehicle', 'cloud'], cam: CAM.site, dur: 7,
        init() { only(t7); setVis(L.edu, true); setVis(L.worker, true); signs.forEach(s => s.visible = true); }, tick(k) { reveal(edu, k, 'y'); } }
    ];
  };

  // ---------- S1 基坑开挖与支护 ----------
  SEQ.S1 = () => {
    const { x0, x1, z0, z1, dep } = PIT, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const kids = L.pit.children;
    const isSup = o => o.material && o.material.name === 'support';
    const ring = kids.filter(o => isSup(o) && o.geometry.parameters && Math.abs(o.geometry.parameters.height - .35) < .01);
    const struts = kids.filter(o => isSup(o) && !ring.includes(o));
    const soil = bx(x1 - x0 - .3, dep, z1 - z0 - .3, mats.soil, cx, -dep, cz); soil.receiveShadow = true;
    const piles = []; for (let x = x0; x <= x1; x += .8) { piles.push([x, z0 - .05]); piles.push([x, z1 + .05]); } for (let z = z0 + .8; z < z1; z += .8) { piles.push([x0 - .05, z]); piles.push([x1 + .05, z]); }
    const pileM = piles.map(([x, z]) => { const o = cyl(.14, dep + .2, mats.pile, x, -dep, z); o.visible = false; return o; });
    const rig = new THREE.Group(); bx(1.0, .4, 1.4, M({ color: 0xc8202a }), 0, 0, 0, rig); bx(.18, 5, .18, M({ color: 0xc8202a }), 0, .4, -.6, rig); rig.visible = false; tmp.add(rig);
    const pump = cyl(.2, .5, mats.blue, cx + 3, -dep, cz + 4); pump.visible = false; const water = bx(x1 - x0 - .6, .08, z1 - z0 - .6, mats.water, cx, -dep + .02, cz); water.visible = false;
    const sensors = [[cx, z0 - .3, 'ZQS 桩顶位移'], [x1 + .3, cz, 'DB 地表沉降'], [cx - 2.5, cz, 'ZL 支撑轴力'], [x0 - 1, cz + 3, 'SW 地下水位']].map(([x, z, t]) => { const s = new THREE.Mesh(new THREE.SphereGeometry(.22, 12, 8), mats.sensor); s.position.set(x, .3, z); tmp.add(s); const l = label(t, x, 1.4, z, '#047857'); s.visible = l.visible = false; return { s, l }; });
    const inspector = figure(0x1d4ed8, 0xffffff); inspector.visible = false;
    const tags = [label('支护桩（排桩）', cx, 2.5, z1 + .3), label('冠梁', cx, 2, z0 - .2), label('第一层土方开挖', cx, 2.5, cz), label('混凝土内支撑', cx, 2.5, cz), label('开挖至坑底', cx, 2.5, cz), label('坑底排水 · 验槽', cx, 2.5, cz)];
    const only = t => tags.forEach(s => s.visible = s === t);
    const exc = [P.excav, P.excav2];
    return [
      { name: '支护桩施工', desc: '沿基坑周边施工钻孔灌注桩作为围护结构：钻机成孔、下钢筋笼、水下浇筑混凝土，桩间做止水处理。', key: '支护结构安全等级按破坏后果确定（JGJ 120-2012 第 3.1.3 条）。', points: ['pit-monitor'], norm: 'JGJ 120-2012 第 3.1.1、3.1.3 条', cam: CAM.pit, dur: 8,
        init() { setVis(P.dig, false); ring.concat(struts).forEach(o => setVis(o, false)); only(tags[0]); rig.visible = true; }, tick(k) { const i = Math.min(pileM.length - 1, Math.floor(k * pileM.length)); pileM.forEach((p, j) => p.visible = j <= i); const [x, z] = piles[i]; rig.position.set(x + (z < cz ? -.8 : .8) * 0, 0, z + (z < cz ? -1 : 1)); if (k >= 1) rig.visible = false; } },
      { name: '冠梁施工', desc: '凿除桩头，在桩顶浇筑钢筋混凝土冠梁，把排桩连成整体。', key: '冠梁达到设计强度后才能开挖。', points: [], cam: CAM.pit, dur: 4,
        init() { only(tags[1]); rig.visible = false; pileM.forEach(p => p.visible = true); ring.forEach(o => { o.visible = true; }); }, tick(k) { reveal(ring, k, 'x'); } },
      { name: '第一层土方开挖', desc: '分层、分段、对称开挖，挖到第一道支撑底标高以下 0.5 m 左右停止，渣土车冲洗后出场。', key: '严格执行「先撑后挖、分层开挖、严禁超挖」；坑边不得超载堆土。', points: ['vehicle', 'env', 'cover'], cam: CAM.pit, dur: 8,
        init() { only(tags[2]); setVis(P.dig, true); exc.forEach(e => { save(e, 'position'); }); }, tick(k) { const top = -lerp(0, 1.1, k); soil.scale.y = (dep + top) / dep; soil.position.y = -dep + (dep + top) / 2; exc.forEach((e, i) => e.position.y = top); } },
      { name: '第一道内支撑施工', desc: '在冠梁标高浇筑角撑、对撑和桁架式内支撑，形成水平支撑体系。', key: '支撑轴力纳入监测；支撑上严禁堆放材料和行走车辆。', points: ['pit-monitor'], cam: CAM.pit, dur: 6,
        init() { only(tags[3]); struts.forEach(o => o.visible = true); }, tick(k) { reveal(struts, k, 'x'); } },
      { name: '第二层开挖至坑底', desc: '支撑达到强度后在支撑下方继续开挖至坑底，最后 20–30 cm 人工清底，防止扰动基底。', key: '开挖到底后及时浇筑垫层封底。', points: ['pit-monitor', 'patrol'], cam: CAM.pit, dur: 8,
        init() { only(tags[4]); }, tick(k) { const top = -lerp(1.1, dep, k); soil.scale.y = Math.max(.001, (dep + top) / dep); soil.position.y = -dep + Math.max(.001, dep + top) / 2; soil.visible = k < .98; exc.forEach(e => e.position.y = Math.max(top, -dep)); } },
      { name: '坑底排水与验槽', desc: '坑内设排水沟和集水井，用水泵排除积水；勘察、设计、监理共同验槽。', key: '地下水位变化是基坑监测的重点项目之一。', points: ['pit-monitor'], cam: CAM.pit, dur: 5,
        init() { only(tags[5]); soil.visible = false; pump.visible = water.visible = inspector.visible = true; }, tick(k) { water.scale.set(1, 1, Math.max(.01, 1 - k)); inspector.position.set(x0 + 1 + 7 * k, -dep, cz + 2); } },
      { name: '基坑监测布点与自动化监测', desc: '布置桩顶位移、地表沉降、支撑轴力、地下水位等测点，数据自动上传，超过预警值即推送。', key: '安全等级一、二级或开挖深度≥5 m 的基坑应实施监测；需连续观测的项目宜自动化监测（GB 50497-2019 第 3.0.1、3.0.14 条）。', points: ['pit-monitor', 'patrol'], norm: 'GB 50497-2019 第 3.0.1、3.0.14 条', cam: CAM.pit, dur: 6,
        init() { only(null); pump.visible = water.visible = inspector.visible = false; }, tick(k) { sensors.forEach((s, i) => { const v = k * 4 > i; s.s.visible = s.l.visible = v; s.s.scale.setScalar(1 + .3 * Math.sin(performance.now() / 200)); }); } }
    ];
  };

  // ---------- S2 基础与地下室 ----------
  SEQ.S2 = () => {
    const { x0, x1, z0, z1, dep } = PIT, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0 - .6, d = z1 - z0 - .6;
    setVis(P.base, false);
    const cushion = bx(w, .06, d, mats.conc, cx, -dep, cz), wp = bx(w, .03, d, mats.black, cx, -dep + .06, cz), net = rebarNet(w, d, cx, -dep + .3, cz, 2), raft = bx(w, .35, d, mats.fresh, cx, -dep + .09, cz);
    const walls = [[cx, z0 + .45, w, .25], [cx, z1 - .45, w, .25], [x0 + .45, cz, .25, d], [x1 - .45, cz, .25, d]].map(([x, z, ww, dd]) => bx(ww, dep - .5, dd, mats.conc, x, -dep + .44, z));
    const colsB = []; for (let i = 1; i < 4; i++) for (let j = 1; j < 4; j++) colsB.push(bx(.35, dep - .5, .35, mats.conc, x0 + i * (x1 - x0) / 4, -dep + .44, z0 + j * (z1 - z0) / 4));
    const roof = bx(w, .2, d, mats.conc, cx, -.3, cz);
    [cushion, wp, net, raft, roof, ...walls, ...colsB].forEach(o => o.visible = false);
    const tags = [label('C15 垫层 + 防水层', cx, 1.6, cz), label('底板钢筋', cx, 1.6, cz), label('底板大体积混凝土', cx, 1.6, cz), label('塔吊安装：基础 → 标准节 → 回转 → 起重臂', 0, 6, -15), label('地下室墙柱、顶板', cx, 1.6, cz), label('1#、2# 楼基础与首层', -6, 4, -9)];
    const only = t => tags.forEach(s => s.visible = s === t);
    const hose = stream(120, 0x6f7377); hose.visible = false;
    return [
      { name: '垫层与防水', desc: '验槽合格后浇筑混凝土垫层，铺贴防水卷材并做保护层。', key: '卷材搭接宽度、附加层按规范和设计要求。', points: [], cam: CAM.pit, dur: 6,
        init() { cranesOff(); stages.setH(0, 0); only(tags[0]); }, tick(k) { cushion.visible = true; cushion.scale.set(Math.max(.01, seg(k, 0, .5)), 1, 1); wp.visible = k > .5; wp.scale.set(Math.max(.01, seg(k, .5, 1)), 1, 1); } },
      { name: '底板钢筋绑扎', desc: '绑扎底板上下两层钢筋网，设置钢筋支架，预留墙柱插筋。', key: '钢筋进场用 AI 盘点核数，隐蔽验收后浇筑。', points: ['rebar-ai', 'yijian'], cam: CAM.pit, dur: 5,
        init() { only(tags[1]); cushion.scale.set(1, 1, 1); wp.scale.set(1, 1, 1); cushion.visible = wp.visible = true; }, tick(k) { net.visible = true; net.scale.set(Math.max(.01, k), 1, 1); } },
      { name: '底板混凝土浇筑', desc: '汽车泵连续浇筑底板，分层推移、斜面分层；大体积混凝土布置测温点，控制内外温差。', key: '大体积混凝土测温养护；浇筑时观察基坑监测数据。', points: ['pit-monitor', 'env'], cam: CAM.pit, dur: 7,
        init() { only(tags[2]); net.visible = true; net.scale.set(1, 1, 1); hose.visible = true; }, tick(k) { raft.visible = true; raft.scale.set(Math.max(.01, k), 1, 1); raft.position.x = cx - w / 2 + w / 2 * k; flowStream(hose, new THREE.Vector3(x0 + .5 + w * k, 3, cz), new THREE.Vector3(x0 + .5 + w * k, -dep + .3, cz), performance.now() / 1000); if (k >= 1) { hose.visible = false; net.visible = false; } } },
      { name: '塔吊安装与验收', desc: '浇筑塔吊基础，汽车吊安装底架、标准节、回转、塔帽、平衡臂和起重臂，再顶升加节到使用高度，检测验收后使用。', key: '多台塔吊交叉作业须编制专项方案、采取防碰撞措施（JGJ 196-2010 第 2.0.14 条）。', points: ['crane1', 'crane2', 'jiguan'], norm: 'JGJ 196-2010 第 2.0.9、2.0.14 条', cam: CAM.Bwide, dur: 8,
        init() { only(tags[3]); world.cranes.forEach(c => { setVis(c, true); save(c, 'scale'); }); }, tick(k) { world.cranes.forEach((c, i) => { const t = ease(seg(k, i * .3, i * .3 + .7)); c.scale.set(1, Math.max(.05, t), 1); c.visible = t > .02; }); } },
      { name: '地下室墙柱与顶板', desc: '分段施工地下室外墙、柱和顶板，外墙设止水钢板，顶板留后浇带。', key: '外墙防水完成后分层回填。', points: [], cam: CAM.pit, dur: 6,
        init() { only(tags[4]); world.cranes.forEach(c => c.scale.set(1, 1, 1)); raft.visible = true; raft.scale.set(1, 1, 1); raft.position.x = cx; }, tick(k) { reveal(walls.concat(colsB), seg(k, 0, .7), 'y'); roof.visible = k > .75; roof.scale.set(Math.max(.01, seg(k, .75, 1)), 1, 1); } },
      { name: '楼栋基础与首层结构', desc: '1# 楼完成筏板基础后吊装首层预制构件，2# 楼完成基础后支模浇筑首层，进入主体结构阶段。', key: '基础验收合格才能进入主体施工。', points: ['crane1', 'crane2'], cam: CAM.site, dur: 6,
        init() { only(tags[5]); }, tick(k) { stages.setH(1.5 * ease(k), 1.6 * ease(k)); } }
    ];
  };
  function cranesOff() { world.cranes.forEach(c => setVis(c, false)); }

  // ---------- S4 幕墙与装修 ----------
  SEQ.S4 = () => {
    const dA = P.dA, dB = P.dB, floorsA = stages.floorsA;
    const gond = new THREE.Group(); bx(3, .3, .5, M({ color: 0xd9d9d9 }), 0, 0, 0, gond); const r1 = cyl(.015, 10, mats.black, -1.4, .3, 0, gond), r2 = cyl(.015, 10, mats.black, 1.4, .3, 0, gond); gond.visible = false; tmp.add(gond);
    const elev = bx(1.0, 1.2, 1.0, M({ color: 0xc0c6cb, emissive: 0x223344 }), -18.5, 0, -10); elev.visible = false;
    const tags = [label('拆除爬架 / 外脚手架', -10, 16, -6), label('外墙板打胶 · 2# 楼石材幕墙（吊篮作业）', 6, 16, -2), label('屋面防水 · 屋面设备', -18.5, 18, -10), label('机电安装：风管、给水、消防管线', -18.5, 18, -4), label('电梯安装与调试', -18.5, 18, -4), label('室外管网 · 地下室顶板覆土', 20, 4, -9)];
    const only = t => tags.forEach(s => s.visible = s === t);
    return [
      { name: '拆除爬架与外脚手架', desc: '主体封顶、外墙施工完成后，1# 楼爬架分段下降并拆除，2# 楼外脚手架自上而下逐层拆除。', key: '拆除应自上而下逐层进行，严禁上下同时作业；拆除区设警戒。', points: ['video-ai'], norm: 'JGJ 202-2010', cam: CAM.Awide, dur: 6,
        init() { setVis(dA, false); setVis(dB, false); setVis(L.bldA, true); setVis(L.bldB, true); setVis(P.done, true); stages.setH(99, 99); only(tags[0]); }, tick(k) { stages.planes.planeA2.constant = lerp(13.7, 0, ease(k)); stages.planes.planeB2.constant = lerp(10, 0, ease(k)); } },
      { name: '外立面施工', desc: '1# 楼预制外墙板接缝打密封胶、做淋水试验；2# 楼用电动吊篮安装石材幕墙和窗。外立面自下而上完成。', key: '吊篮作业人员系挂独立安全绳；吊篮不得超载。', points: ['hoist'], cam: CAM.site, dur: 9,
        init() { only(tags[1]); setVis(dA, true); setVis(dB, true); gond.visible = true; }, tick(k) { floorsA.forEach((f, i) => { save(f, 'visible'); f.visible = k * floorsA.length > i; }); stages.parts.roofA.visible = k > .95; save(dB, 'scale'); dB.scale.y = Math.max(.01, k); if (k > .02) { setVis(L.bldA, k < .98); setVis(L.bldB, k < .98); } gond.position.set(6, 2 + 12 * (1 - Math.abs(Math.sin(k * Math.PI * 2))), -2.9); } },
      { name: '屋面工程与屋面设备', desc: '屋面找坡、保温、防水，做闭水试验；安装冷却塔、风冷机组、消防水箱和光伏板。', key: '屋面防水完成后 24 h 蓄水试验无渗漏。', points: [], cam: CAM.A, dur: 5,
        init() { only(tags[2]); gond.visible = false; dB.scale.y = 1; floorsA.forEach(f => f.visible = true); }, tick(k) { const r = stages.parts.roofA; r.visible = true; r.children.forEach((c, i) => { save(c, 'scale'); c.scale.y = Math.max(.01, ease(clamp(k * r.children.length - i))); }); } },
      { name: '机电安装', desc: '各层安装空调风管、给水和消防立管、桥架电缆，管线综合按 BIM 深化图施工，减少碰撞返工。', key: '管线安装完成后做压力试验和冲洗。', points: [], cam: CAM.A, dur: 6,
        init() { only(tags[3]); stages.parts.roofA.children.forEach(c => c.scale.y = 1); floorsA.forEach(f => { const inner = f.children[2]; setVis(inner, true); const sh = f.children[0]; sh.material.forEach(m => { save(m, 'opacity'); save(m, 'transparent'); m.transparent = true; m.opacity = .2; m.needsUpdate = true; }); }); }, tick(k) { floorsA.forEach((f, i) => { f.children[2].visible = k * floorsA.length > i; }); } },
      { name: '电梯安装与调试', desc: '安装导轨、曳引机、轿厢和层门，完成调试后由特种设备检验机构检验合格。', key: '电梯井道口在安装期间必须设置防护门。', points: [], cam: CAM.A, dur: 6,
        init() { only(tags[4]); elev.visible = true; }, tick(k) { elev.position.y = .6 + 13 * Math.abs(Math.sin(k * Math.PI)); } },
      { name: '室内装修与室外工程', desc: '室内抹灰、吊顶、地面和涂料；室外做管网、道路，地下室顶板防水后覆土。', key: '装修阶段可燃物多，临时消防设施不得拆除；动火作业要审批。', points: ['smoke', 'water-elec'], norm: 'GB/T 50720-2011（2025年版）', cam: CAM.site, dur: 6,
        init() { only(tags[5]); elev.visible = false; floorsA.forEach(f => { f.children[2].visible = false; f.children[0].material.forEach(m => { m.opacity = 1; m.transparent = false; m.needsUpdate = true; }); }); setVis(P.garage, true); }, tick(k) { P.garage.children.forEach((c, i) => { save(c, 'scale'); c.scale.y = Math.max(.01, clamp(k * 2 - i * .3)); }); } }
    ];
  };

  // ---------- S5 竣工建成 ----------
  SEQ.S5 = () => {
    const temps = sortBy([...L.yard.children, ...L.edu.children, ...L.live.children, ...L.fence.children], o => wpos(o).x);
    const landK = sortBy(P.land.children, o => wpos(o).x);
    const insp = [0, 1, 2].map(i => figure(0x1d4ed8, 0xffffff)); insp.forEach(f => f.visible = false);
    scene.updateMatrixWorld(true); const edges = []; [P.dA, P.dB].forEach(g => g.traverse(o => { if (o.isMesh && o.geometry.type === 'BoxGeometry') { const e = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry), new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true })); o.getWorldPosition(e.position); e.quaternion.copy(o.getWorldQuaternion(new THREE.Quaternion())); e.scale.copy(o.getWorldScale(new THREE.Vector3())); e.visible = false; tmp.add(e); edges.push(e); } }));
    const tags = [label('塔吊拆除：起重臂 → 平衡臂 → 塔身逐节', 0, 30, -15), label('升降机拆除', 0, 14, -3), label('拆除临建，场地恢复', 0, 5, 14), label('室外景观与道路', 0, 4, 14), label('竣工验收（建设单位组织五方）', -10, 6, 4), label('BIM 竣工模型 + 设备台账 → 移交运维', -10, 20, -9)];
    const only = t => tags.forEach(s => s.visible = s === t);
    return [
      { name: '塔吊拆除', desc: '按专项方案先拆起重臂和平衡臂配重，再降节拆除塔身，汽车吊配合。', key: '拆除前检查顶升系统；风速超限停止作业。', points: ['crane1', 'crane2'], norm: 'JGJ 196-2010', cam: CAM.Bwide, dur: 8,
        init() { [L.yard, L.edu, L.live, L.fence, L.worker, L.sign].forEach(g => setVis(g, true)); setVis(P.land, false); world.cranes.forEach(c => { setVis(c, true); save(c, 'scale'); save(c.userData.top, 'scale'); }); stages.parts.hoists.forEach(h => setVis(h, true)); only(tags[0]); },
        tick(k) { world.cranes.forEach(c => { const t1 = seg(k, 0, .45), t2 = seg(k, .45, 1); c.userData.top.scale.x = Math.max(.02, 1 - t1); c.scale.y = Math.max(.02, 1 - t2); c.visible = t2 < .99; }); } },
      { name: '升降机拆除', desc: '自上而下拆除附墙架和标准节，拆除吊笼，封堵楼层出入口。', key: '拆除作业区域设警戒。', points: ['hoist'], cam: CAM.site, dur: 4,
        init() { only(tags[1]); }, tick(k) { stages.parts.hoists.forEach(h => { save(h, 'scale'); h.scale.y = Math.max(.02, 1 - k); h.visible = k < .99; }); } },
      { name: '拆除临建，场地恢复', desc: '拆除加工棚、堆场、板房和围挡，材料周转回收，清运垃圾，恢复场地。', key: '拆除垃圾分类、密闭运输，控制扬尘。', points: [], cam: CAM.site, dur: 8,
        init() { only(tags[2]); setVis(L.worker, false); setVis(L.sign, false); }, tick(k) { reveal(temps, k, 'y', true); } },
      { name: '室外景观与道路', desc: '施工室外管网、道路、广场、绿化和景观照明，地下车库出入口完成。', key: '绿化与管网交叉处先做管网。', points: [], cam: CAM.site, dur: 7,
        init() { only(tags[3]); setVis(P.land, true); }, tick(k) { reveal(landK, k, 'y'); } },
      { name: '竣工验收', desc: '施工单位自检合格提交竣工报告，建设单位组织勘察、设计、施工、监理等单位进行单位工程验收。', key: '单位工程验收由建设单位项目负责人组织（GB 50300-2013 第 6.0.6 条）。', points: [], norm: 'GB 50300-2013 第 4.0.1、6.0.6 条', cam: CAM.site, dur: 6,
        init() { only(tags[4]); insp.forEach(f => f.visible = true); }, tick(k) { insp.forEach((f, i) => f.position.set(-20 + 30 * k + i, 0, 3 + i * .8)); } },
      { name: 'BIM 竣工模型移交运维', desc: '把竣工图、BIM 模型、设备台账、质保资料移交物业，设备编码与运维平台点位一一对应。', key: '施工阶段积累的数据成为运维的「数字底座」。', points: [], cam: CAM.site, dur: 6,
        init() { only(tags[5]); insp.forEach(f => f.visible = false); edges.forEach(e => e.visible = true); }, tick(k) { const v = .5 + .5 * Math.sin(k * 20); edges.forEach(e => e.material.opacity = v); edges.forEach(e => { e.material.transparent = true; }); if (k >= 1) edges.forEach(e => e.visible = false); } }
    ];
  };

  // ---------- S6 运维的一天 ----------
  SEQ.S6 = () => {
    const floorsA = stages.floorsA;
    const tint = (f, hex, a) => { const sh = f.children[0]; sh.material.forEach(m => { save(m, 'emissive'); if (!m.userData.e0) m.userData.e0 = m.emissive.clone(); m.emissive.setHex(hex).multiplyScalar(a); }); };
    const resetT = () => floorsA.forEach(f => tint(f, 0x000000, 0));
    const people = [0, 1, 2, 3, 4, 5].map(i => figure(0x334155, 0x334155)); people.forEach(p => p.visible = false);
    const tech = figure(0x0f766e, 0xffffff); tech.visible = false;
    const elev = bx(1.0, 1.2, 1.0, M({ color: 0xc0c6cb, emissive: 0x223344 }), -18.5, 0, -10); elev.visible = false;
    const heat = [.3, .35, .4, .45, .5, .55, 1, .5, .45, .6];
    const tags = [label('07:30 暖通空调按时间表预冷', -18.5, 18, -4), label('08:30 上班高峰：门禁 + 电梯群控', -18.5, 4, -2), label('12:00 用电高峰：分项计量', -18.5, 18, -4), label('22:00 7 层无人仍在送冷 → 告警', -18.5, 13, -4, '#be123c'), label('22:20 工单派给值班工程师 → 处理 → 回访', -18.5, 13, -4), label('次日：能耗日报，与约束值比较', -18.5, 18, -4)];
    tags.push(label('10:00 光伏发电高峰：自发自用', 6, 19, -8.5), label('16:00 阵雨：海绵设施 + 雨水回收', 12, 5, 16), label('18:00 充电高峰：有序充电', -24, 5, 17.5));
    const only = t => tags.forEach(s => s.visible = s === t);
    return [
      { name: '07:30 空调预冷', desc: 'BA 系统按时间表提前启动冷却塔和空调机组，根据室外温度和各层设定温度调节供水温度。', key: '时间表 + 温度反馈，比人工开关更节能。', points: ['hvac'], cam: CAM.A, dur: 6,
        init() { only(tags[0]); resetT(); }, tick(k) { floorsA.forEach((f, i) => tint(f, 0x2563eb, .5 * clamp(k * 2 - i * .1))); } },
      { name: '08:30 上班高峰', desc: '人脸门禁快速通行，电梯群控按楼层分配轿厢；访客需预约登记。', key: '门禁数据也用来判断各层在室人数，联动空调和照明。', points: ['access', 'elevator'], cam: CAM.A, dur: 6,
        init() { only(tags[1]); resetT(); people.forEach(p => p.visible = true); elev.visible = true; }, tick(k) { people.forEach((p, i) => p.position.set(-21 + i * 1.1, 0, -1 - 3.5 * clamp(k * 1.5 - i * .1))); elev.position.y = .6 + 12 * Math.abs(Math.sin(k * Math.PI * 2)); } },
      { name: '12:00 用电高峰', desc: '分项计量显示空调和照明插座用电最高；按楼层看，7 层明显高于其他楼层。', key: '分项、分层计量才能定位能耗异常（GB/T 51161-2016 约束值/引导值）。', points: ['energy'], norm: 'GB/T 51161-2016 第 2.0.3、5.2.1 条', cam: CAM.A, dur: 6,
        init() { only(tags[2]); people.forEach(p => p.visible = false); elev.visible = false; }, tick(k) { floorsA.forEach((f, i) => tint(f, 0xf97316, heat[i] * k)); } },
      { name: '22:00 夜间能耗异常', desc: '下班后其他楼层空调已关闭，7 层功率仍有 38 kW，是同层基线的 3 倍；室内环境传感器显示无人。', key: '「无人 + 高能耗」是典型浪费告警规则。', points: ['ienv', 'energy'], cam: CAM.A, dur: 6,
        init() { only(tags[3]); resetT(); }, tick(k) { tint(floorsA[6], 0xe11d48, .4 + .4 * Math.sin(k * 30)); } },
      { name: '22:20 工单闭环', desc: '平台自动生成工单派给值班工程师，现场确认是末端控制器故障，远程关闭后更换控制器，回访确认能耗恢复。', key: '告警 → 派单 → 处理 → 验证 → 归档，形成设备维保档案。', points: ['workorder', 'hvac'], cam: CAM.A, dur: 6,
        init() { only(tags[4]); tech.visible = true; }, tick(k) { tech.position.set(-21 + 4 * k, 6 * 1.5 + .12, -10); tint(floorsA[6], 0xe11d48, .6 * (1 - k)); } },
      { name: '10:00 光伏发电高峰', desc: '晴天上午屋面光伏和光伏车棚出力上升，逆变器并入楼内低压配电，电优先给建筑自己用；平台逐组串比较发电效率。', key: '同一时刻比较各组串效率，才能发现积灰、遮挡和热斑（GB 55015-2021 第 5.2.6 条要求监测发电量、背板温度、辐照量）。', points: ['pv', 'carbon'], cam: [[22, 30, 6], [6, 14, -8.5]], dur: 5,
        init() { only(tags[6]); resetT(); stages.setWeather('clear'); if (world.green) world.green.setPv(.2); }, tick(k) { if (world.green) world.green.setPv(.2 + .8 * k); } },
      { name: '16:00 阵雨：海绵设施与雨水回收', desc: '透水铺装和雨水花园让雨水就地下渗、滞留；屋面雨水经弃流、过滤进入雨水池，液位上升，晴天再用于绿化浇灌。', key: '初期雨水先弃流；回用水管与生活饮用水管严格分开（GB 50400-2016）。', points: ['sponge', 'rainwater', 'green-roof'], cam: [[26, 16, 32], [12, 0, 16]], dur: 6,
        init() { only(tags[7]); stages.setWeather('rain'); if (world.green) { world.green.setIrrigate(false); world.green.setRainLevel(.25); } }, tick(k) { if (world.green) world.green.setRainLevel(.25 + .65 * k); } },
      { name: '18:00 充电高峰：有序充电', desc: '下班前多辆电动车同时插枪，光伏出力下降，平台按车辆离场时间分配功率，把一部分充电错到夜间低谷。', key: '变压器负载率超过设定值时自动限功率，削峰填谷。', points: ['ev', 'gshp'], cam: [[-12, 12, 30], [-24, 1, 17.5]], dur: 5,
        init() { only(tags[8]); stages.setWeather('clear'); if (world.green) { world.green.setPv(.3); world.green.setIrrigate(true); } }, tick(k) { if (world.green && k > .95) world.green.setIrrigate(false); } },
      { name: '能耗日报', desc: '系统自动汇总当天能耗、分项占比、异常事件，与《民用建筑能耗标准》的约束值、引导值比较，提出节能措施。', key: '打开运维大屏，找出能耗最高的楼层并说明原因。', points: ['energy'], cam: CAM.A, dur: 5,
        init() { only(tags[5]); tech.visible = false; resetT(); stages.setWeather('clear'); if (world.green) { world.green.setPv(1); world.green.setIrrigate(false); } }, tick(k) { floorsA.forEach((f, i) => tint(f, 0x22c55e, .3 * k)); } }
    ];
  };

  // ======================= 播放控制 =======================
  let steps = [], idx = -1, t = 0, playing = false, stageId = null, speed = 1, onChange = () => {};
  function start(id, from = 0) {
    stop(true); if (!SEQ[id]) return false;
    stageId = id; stages.apply(id, true); world.busy = true;
    steps = SEQ[id](); idx = -1; playing = true;
    for (let i = 0; i < from; i++) { enter(i, false); steps[i].tick(1); }
    enter(from, true); return true;
  }
  function enter(i, cam) { idx = i; t = 0; const s = steps[i]; s.init && s.init(); s.tick(0); if (cam && s.cam && flyTo) flyTo(new THREE.Vector3(...s.cam[0]), new THREE.Vector3(...s.cam[1])); onChange(api.info()); }
  function stop(silent) {
    if (stageId) { if (stageId === 'S6') { stages.setWeather('clear'); if (world.green) { world.green.setPv(1); world.green.setIrrigate(false); } } restoreAll(); craneState.clear(); world.busy = false; const id = stageId; stageId = null; steps = []; idx = -1; playing = false; if (!silent) { stages.apply(id, true); onChange(null); } }
  }
  function update(dt) {
    if (!stageId || !playing || idx < 0) return;
    const s = steps[idx]; t += dt * speed; const k = Math.min(t / s.dur, 1); s.tick(k);
    if (k >= 1) { if (idx < steps.length - 1) enter(idx + 1, true); else { playing = false; onChange(api.info()); } }
    else if (Math.floor((t - dt * speed) * 4) !== Math.floor(t * 4)) onChange(api.info());
  }
  const api = {
    has: id => !!SEQ[id], start, stop, update,
    register(id, fn) { SEQ[id] = fn; },
    extend(id, fn) { const base = SEQ[id]; if (!base) return; SEQ[id] = () => base().concat([].concat(fn())); },
    toggle() { playing = !playing; onChange(api.info()); },
    next() { if (!stageId) return; steps[idx].tick(1); if (idx < steps.length - 1) enter(idx + 1, true); },
    prev() { if (!stageId) return; const id = stageId, i = Math.max(0, idx - 1); start(id, i); },
    jump(i) { if (stageId) start(stageId, i); },
    seek(id, i, k) { start(id, i); const s = steps[idx]; t = k * s.dur; s.tick(k); playing = false; onChange(api.info()); },
    setSpeed(v) { speed = v; },
    get active() { return !!stageId; },
    info() { if (!stageId) return null; const s = steps[idx]; return { stageId, idx, n: steps.length, cam: s.cam, name: s.name, desc: s.desc, key: s.key, norm: s.norm, points: s.points || [], playing, k: Math.min(t / s.dur, 1), names: steps.map(x => x.name) }; },
    onChange(f) { onChange = f; }
  };
  return api;
}
