// 第二步：建设阶段时间轴（生长动画）、竣工建筑与运维剖切、动态机械、昼夜与天气
import * as THREE from 'three';

const mk = (geo, m, x, y, z, parent) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; parent.add(o); return o; };
const bx = (w, h, d, m, x, y, z, parent) => mk(new THREE.BoxGeometry(w, h, d), m, x, y + h / 2, z, parent);
const canvasTex = (w, h, draw, rx = 1, ry = 1) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 4; return t; };

// 立面贴图：1# 装配式住宅（白色预制外墙板 + 蓝灰窗），2# 公建（米灰石材 + 横向带窗）
const facadeA = (cols) => canvasTex(128, 64, (g, w, h) => {
  g.fillStyle = '#eef0f1'; g.fillRect(0, 0, w, h); g.fillStyle = '#c9cfd3'; g.fillRect(0, h - 6, w, 6);
  for (let i = 0; i < 4; i++) { g.fillStyle = '#5b7f9e'; g.fillRect(8 + i * 30, 14, 20, 30); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(8 + i * 30, 14, 20, 4); g.fillStyle = '#d7dcdf'; g.fillRect(6 + i * 30, 44, 24, 4); }
}, cols, 1);
const facadeB = (cols) => canvasTex(128, 64, (g, w, h) => {
  g.fillStyle = '#d9cfbf'; g.fillRect(0, 0, w, h); g.fillStyle = '#3f5a70'; g.fillRect(0, 18, w, 26);
  g.fillStyle = '#c7bba8'; for (let x = 0; x < w; x += 16) g.fillRect(x, 18, 3, 26); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(0, 18, w, 4);
}, cols, 1);

export function buildStages(world, scene) {
  const { layers: L, cranes } = world;
  const A = L.bldA.userData, B = L.bldB.userData, P = L.pit.userData;
  const extra = new THREE.Group(); extra.name = '阶段模型'; scene.add(extra);
  const M = (o) => new THREE.MeshStandardMaterial({ roughness: .7, ...o });

  // ---------- 1. 剖切面（楼层生长） ----------
  const planeA = new THREE.Plane(new THREE.Vector3(0, -1, 0), 99), planeB = new THREE.Plane(new THREE.Vector3(0, -1, 0), 99);
  const planeA2 = new THREE.Plane(new THREE.Vector3(0, -1, 0), 99), planeB2 = new THREE.Plane(new THREE.Vector3(0, -1, 0), 99);
  const clipGroup = (g, plane, shellPlane) => g.traverse(o => {
    if (!o.isMesh) return;
    const shell = /爬架|安全网/.test(o.name);
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    const cl = ms.map(m => { const c = m.clone(); c.clippingPlanes = [shell ? shellPlane : plane]; c.clipShadows = true; return c; });
    o.material = Array.isArray(o.material) ? cl : cl[0];
  });
  clipGroup(L.bldA, planeA, planeA2); clipGroup(L.bldB, planeB, planeB2);
  const hoists = L.crane.children.filter(c => !cranes.includes(c));
  hoists.forEach((h, i) => clipGroup(h, i === 0 ? planeA2 : planeB2, i === 0 ? planeA2 : planeB2));

  // ---------- 2. 场地准备：基础放线、平整机械 ----------
  const prep = new THREE.Group(); prep.name = '场地准备'; extra.add(prep);
  const soil = M({ color: 0x9a7b55, roughness: 1 });
  const footA = bx(12, .04, 11, soil, -18.5, 0, -10, prep), footB = bx(20.5, .04, 11.5, soil, 5, 0, -8.5, prep);
  const lineM = new THREE.LineBasicMaterial({ color: 0xffffff });
  [[-24.3, -15.3, -12.7, -4.7], [-5.3, -14.3, 15.3, -2.7]].forEach(([x0, z0, x1, z1]) => {
    const g = new THREE.BufferGeometry().setFromPoints([[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]].map(([x, z]) => new THREE.Vector3(x, .08, z)));
    prep.add(new THREE.Line(g, lineM));
  });
  const pitCover = bx(10.2, .06, 12.2, soil, 20, 0, -9, extra);   // 基坑未开挖时的场地
  // 压路机（往复）
  const roller = new THREE.Group(); bx(.9, .55, 1.0, M({ color: 0xf0b323 }), 0, .1, 0, roller);
  const drum = mk(new THREE.CylinderGeometry(.32, .32, 1.0, 14), M({ color: 0x777b7e, metalness: .5 }), 0, .32, -.75, roller); drum.rotation.z = Math.PI / 2;
  roller.position.set(5, 0, -8.5); prep.add(roller);
  const loader = new THREE.Group(); bx(.9, .5, 1.3, M({ color: 0xf0b323 }), 0, .15, 0, loader); bx(1.1, .3, .25, M({ color: 0x555 }), 0, .1, -.85, loader); loader.position.set(-18.5, 0, -10); prep.add(loader);

  // ---------- 3. 基坑阶段：挖机 + 渣土车循环 ----------
  const dig = new THREE.Group(); dig.name = '土方开挖'; extra.add(dig);
  const yel = M({ color: 0xf0b323 });
  const excav = new THREE.Group(); bx(1.1, .4, 1.5, M({ color: 0x333 }), 0, 0, 0, excav);
  const cab = new THREE.Group(); excav.add(cab); cab.position.y = .4; bx(1.0, .55, 1.0, yel, 0, 0, .1, cab);
  const boom = new THREE.Group(); boom.position.set(-.15, .5, -.4); cab.add(boom); const b1 = bx(.16, 1.6, .16, yel, 0, 0, 0, boom); boom.rotation.x = .75;
  const stick = new THREE.Group(); stick.position.set(0, 1.6, 0); boom.add(stick); bx(.13, 1.1, .13, yel, 0, 0, 0, stick); stick.rotation.x = 1.3;
  const bucket = bx(.4, .3, .3, M({ color: 0x444 }), 0, 1.1, 0, stick);
  excav.position.set(18.5, -P.dep, -6); dig.add(excav);
  const excav2 = excav.clone(); excav2.position.set(22, -P.dep, -12); excav2.rotation.y = 2.4; dig.add(excav2);
  const dumpTruck = () => { const t = new THREE.Group(); bx(.85, .35, 2.0, M({ color: 0x3a3d40 }), 0, .18, 0, t); bx(.85, .55, .55, M({ color: 0xd9a21b }), 0, .3, .8, t); const bed = bx(.85, .45, 1.3, M({ color: 0xb8bcc0, metalness: .4 }), 0, .53, -.3, t); const load = bx(.75, .2, 1.1, M({ color: 0x7a5a3a }), 0, .9, -.3, t); t.userData.load = load;
    [-.65, .65].forEach(z => [-.42, .42].forEach(x => { const w = mk(new THREE.CylinderGeometry(.17, .17, .12, 10), M({ color: 0x111 }), x, .17, z, t); w.rotation.z = Math.PI / 2; })); return t; };
  const truckPath = new THREE.CatmullRomCurve3([[20, .0, -1.4], [26.4, 0, -1], [26.4, 0, -12], [26.4, 0, -17], [30, 0, -18], [36, 0, -18], [36, 0, -30], [36, 0, 30], [36, 0, 13], [30, 0, 13], [26.4, 0, 6], [26.4, 0, 1], [20, 0, -1.4]].map(a => new THREE.Vector3(...a)), true, 'catmullrom', .1);
  const trucks = [0, .33, .66].map(o => { const t = dumpTruck(); dig.add(t); return { o: t, u: o }; });

  // ---------- 4. 基础与地下室：坑底垫层/底板 ----------
  const base = new THREE.Group(); base.name = '基础底板'; extra.add(base);
  bx(9.4, .2, 11.4, M({ color: 0xb9bcbe }), 20, -P.dep + .02, -9, base);
  const rebarNet = canvasTex(64, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#3a3a3a'; g.lineWidth = 2; for (let i = 0; i < w; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); } }, 10, 12);
  const rn = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 11.2), new THREE.MeshBasicMaterial({ map: rebarNet, transparent: true, alphaTest: .3 })); rn.rotation.x = -Math.PI / 2; rn.position.set(20, -P.dep + .3, -9); base.add(rn);

  // ---------- 5. 竣工建筑 ----------
  const done = new THREE.Group(); done.name = '竣工建筑'; extra.add(done);
  // 1# 楼：10 层，逐层分组以便运维剖切
  const dA = new THREE.Group(); dA.name = '1#楼（竣工）'; done.add(dA);
  const AF = 10, afh = A.fh, ax = A.cx, az = A.cz, aw = A.w, ad = A.d;
  const fA = facadeA(Math.round(aw / 2.2)), fAs = facadeA(Math.round(ad / 2.2));
  const shellMs = [M({ map: fAs }), M({ map: fAs }), M({ color: 0xdfe3e5 }), M({ color: 0xdfe3e5 }), M({ map: fA }), M({ map: fA })];
  const floorsA = [];
  const coreM = M({ color: 0x8a94a0 }), slabM = M({ color: 0xcfd4d7 }), ductM = M({ color: 0x9fd3f0 }), pipeM = M({ color: 0x2f9e5b }), fireM = M({ color: 0xd8262b });
  for (let i = 0; i < AF; i++) {
    const f = new THREE.Group(); f.position.set(ax, i * afh, az); f.userData.base = i * afh; dA.add(f);
    const shell = new THREE.Mesh(new THREE.BoxGeometry(aw, afh - .12, ad), shellMs.map(m => m.clone())); shell.position.y = (afh - .12) / 2; shell.castShadow = shell.receiveShadow = true; shell.name = 'shell'; f.add(shell);
    bx(aw + .2, .12, ad + .2, slabM, 0, afh - .12, 0, f);
    // 室内（剖切时可见）：核心筒、风管、给水立管、消防管、空调末端
    const inner = new THREE.Group(); inner.name = 'inner'; inner.visible = false; f.add(inner);
    bx(aw - .2, .06, ad - .2, M({ color: 0xe9e4da }), 0, 0, 0, inner);
    bx(2.2, afh - .15, 2.0, coreM, 0, 0, 0, inner);
    bx(aw - 1.6, .16, .3, ductM, 0, afh - .45, -1.8, inner); bx(aw - 1.6, .16, .3, ductM, 0, afh - .45, 1.8, inner);
    mk(new THREE.CylinderGeometry(.07, .07, afh, 8), pipeM, 1.4, afh / 2, -.6, inner); mk(new THREE.CylinderGeometry(.07, .07, afh, 8), fireM, 1.7, afh / 2, -.6, inner);
    for (let k = 0; k < 4; k++) bx(.5, .18, .5, M({ color: 0xf4f4f4 }), -aw / 2 + 1.4 + k * 2.6, afh - .5, 0, inner);
    floorsA.push(f);
  }
  const roofA = new THREE.Group(); roofA.position.set(ax, AF * afh, az); dA.add(roofA);
  bx(aw, .35, .15, M({ color: 0xdfe3e5 }), 0, 0, -ad / 2 + .07, roofA); bx(aw, .35, .15, M({ color: 0xdfe3e5 }), 0, 0, ad / 2 - .07, roofA);
  bx(2.4, 1.2, 2.2, coreM, 0, 0, 0, roofA);   // 电梯机房
  [-3.2, -1.6].forEach(x => { mk(new THREE.CylinderGeometry(.55, .65, 1.0, 14), M({ color: 0x8fc7e8 }), x, .5, 2.6, roofA); });   // 冷却塔
  bx(1.8, .9, 1.1, M({ color: 0xc0c6cb }), 3.0, 0, 2.5, roofA);   // 风冷机组
  bx(1.6, 1.0, 1.0, M({ color: 0x5aaee8 }), 3.2, 0, -2.6, roofA);   // 屋顶消防水箱
  // 光伏
  for (let i = 0; i < 4; i++) { const pv = bx(1.1, .05, .7, M({ color: 0x1d3b6b, metalness: .4, roughness: .3 }), -3.6 + i * 1.3, .4, -2.6, roofA); pv.rotation.x = -.35; }
  // 入口雨棚、地下车库出入口
  bx(4, .15, 1.6, M({ color: 0x3b4a59 }), ax, 1.8, A.cz + ad / 2 + .8, done);
  const dB = new THREE.Group(); dB.name = '2#楼（竣工）'; done.add(dB);
  [{ x0: -5, x1: 1, z0: -13, z1: -4, n: 3 }, { x0: 1, x1: 11, z0: -14, z1: -3, n: 9 }, { x0: 11, x1: 15, z0: -14, z1: -3, n: 4 }].forEach(p => {
    const w = p.x1 - p.x0, d = p.z1 - p.z0, H = p.n * 1.6;
    const fb = facadeB(Math.round(w / 2)), fbs = facadeB(Math.round(d / 2)); fb.repeat.y = p.n; fbs.repeat.y = p.n;
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, H, d), [M({ map: fbs }), M({ map: fbs }), M({ color: 0xe6e2da }), M({ color: 0xe6e2da }), M({ map: fb }), M({ map: fb })]);
    o.position.set((p.x0 + p.x1) / 2, H / 2, (p.z0 + p.z1) / 2); o.castShadow = o.receiveShadow = true; dB.add(o);
    bx(w, .3, .12, M({ color: 0xe6e2da }), (p.x0 + p.x1) / 2, H, p.z0 + .06, dB);
  });
  // 地下车库顶板绿化 + 出入口
  const garage = new THREE.Group(); garage.name = '地下车库与景观'; extra.add(garage);
  const grass = M({ color: 0x86b95a, roughness: 1 }), pave = M({ color: 0xd9d4ca, roughness: .9 });
  bx(10.2, .08, 12.2, grass, 20, 0, -9, garage);
  bx(1.8, .7, 3.2, M({ color: 0x9aa4ad }), 23.8, 0, -1.2, garage); bx(1.6, .06, 3, M({ color: 0x3b4148 }), 23.8, .7, -1.2, garage);
  // 建成后景观：拆除临建后的绿地与道路
  const land = new THREE.Group(); land.name = '竣工景观'; extra.add(land);
  bx(56, .06, 4.2, grass, 2, 0, -22.6, land);
  bx(3.6, .06, 25, grass, -28.7, 0, -11, land);
  bx(3.2, .06, 22, grass, 29.2, 0, -5, land);
  bx(34, .06, 4.4, pave, 2.5, 0, 5.8, land);
  bx(44, .06, 14, grass, 7, 0, 17.5, land); bx(12, .06, 14, pave, -24, 0, 17.5, land);
  for (let i = 0; i < 14; i++) { bx(1.6, .02, .9, M({ color: 0xffffff }), -29 + (i % 7) * 1.8, .07, 12.5 + Math.floor(i / 7) * 9.5, land); }
  const treeG = new THREE.IcosahedronGeometry(.9, 0), trunkG = new THREE.CylinderGeometry(.1, .12, .9, 6);
  const tree = (x, z) => { mk(trunkG, M({ color: 0x6b4f35 }), x, .45, z, land); mk(treeG, M({ color: 0x3f9a3a, flatShading: true }), x, 1.4, z, land); };
  for (let x = -24; x <= 28; x += 4) { tree(x, -21.8); tree(x + 2, 12.5); tree(x, 22.5); }
  for (let z = -18; z <= 2; z += 4) { tree(-29, z); tree(29.5, z); }
  bx(6, .06, 6, M({ color: 0x5fb3e6, roughness: .1 }), 6, .02, 17.5, land);   // 景观水池
  const lampM = M({ color: 0xffffff, emissive: 0x000000 });
  const lamps = [];
  for (let x = -20; x <= 26; x += 6) { bx(.08, 1.6, .08, M({ color: 0x777 }), x, 0, 3.2, land); lamps.push(bx(.3, .12, .3, lampM, x, 1.6, 3.2, land)); }

  // ---------- 6. 运维剖切 ----------
  let peel = 0, peelTarget = 0;
  function setPeel(on) { peelTarget = on ? 1 : 0; if (window.__peelCam) window.__peelCam(on); floorsA.forEach(f => f.children.forEach(c => { if (c.name === 'inner') c.visible = true; })); }

  // ---------- 7. 粒子：扬尘、喷雾、雨 ----------
  const dustN = 600, dustGeo = new THREE.BufferGeometry(), dustPos = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) { dustPos[i * 3] = 14 + Math.random() * 16; dustPos[i * 3 + 1] = Math.random() * 4; dustPos[i * 3 + 2] = -20 + Math.random() * 20; }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustTex = canvasTex(32, 32, (g, w, h) => { const r = g.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, 'rgba(180,150,110,.9)'); r.addColorStop(1, 'rgba(180,150,110,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); });
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 1.2, map: dustTex, transparent: true, opacity: .55, depthWrite: false })); dust.name = '扬尘'; scene.add(dust);
  const mistTex = canvasTex(32, 32, (g, w, h) => { const r = g.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, 'rgba(220,240,255,.9)'); r.addColorStop(1, 'rgba(220,240,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); });
  const mistN = 500, mistGeo = new THREE.BufferGeometry(), mistPos = new Float32Array(mistN * 3), mistSeed = new Float32Array(mistN);
  // 围挡顶部喷淋：沿北、东围挡
  for (let i = 0; i < mistN; i++) { const north = i % 2 === 0; mistSeed[i] = Math.random(); mistPos[i * 3] = north ? -30 + Math.random() * 60 : 30.6; mistPos[i * 3 + 1] = 1.6; mistPos[i * 3 + 2] = north ? -24.8 : -24 + Math.random() * 48; }
  mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPos, 3));
  const mist = new THREE.Points(mistGeo, new THREE.PointsMaterial({ size: .9, map: mistTex, transparent: true, opacity: .7, depthWrite: false })); mist.visible = false; scene.add(mist);
  const rainN = 3000, rainGeo = new THREE.BufferGeometry(), rainPos = new Float32Array(rainN * 6);
  for (let i = 0; i < rainN; i++) { const x = -40 + Math.random() * 80, y = Math.random() * 40, z = -28 + Math.random() * 56; rainPos.set([x, y, z, x + .1, y + .9, z], i * 6); }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0x9ab6cc, transparent: true, opacity: .55 })); rain.visible = false; scene.add(rain);
  const puddle = new THREE.Mesh(new THREE.PlaneGeometry(9.4, 11.4), M({ color: 0x4f7896, roughness: .05, metalness: .3, transparent: true, opacity: .75 })); puddle.rotation.x = -Math.PI / 2; puddle.position.set(20, -P.dep + .08, -9); puddle.visible = false; extra.add(puddle);

  // ---------- 阶段定义 ----------
  // hA/hB：可见高度（世界单位）；flags：显示的构件
  const STAGES = window.SHAPAN_STAGES;
  const F = { pit: L.pit, crane: L.crane, yard: L.yard, edu: L.edu, live: L.live, worker: L.worker, fence: L.fence, sign: L.sign };
  let cur = null, grow = null;
  function apply(id, instant) {
    const s = STAGES.find(x => x.id === id); if (!s) return; cur = s;
    const v0 = s.view, v = {}; Object.keys(v0).forEach(k => v[k] = v0[k]);
    const B_ = k => !!v[k], D_ = k => v[k] !== false;
    L.bldA.visible = B_('oldBld'); L.bldB.visible = B_('oldBld');
    done.visible = B_('done'); garage.visible = B_('done') || B_('garage'); land.visible = B_('land');
    prep.visible = B_('prep'); pitCover.visible = B_('pitCover');
    dig.visible = B_('dig'); base.visible = B_('base'); L.pit.visible = B_('pit');
    cranes.forEach(c => c.visible = B_('crane')); hoists.forEach(h => h.visible = B_('hoist'));
    ['yard', 'edu', 'live', 'worker', 'fence'].forEach(k => F[k].visible = D_(k));
    L.sign.visible = D_('sign');
    L.sign.children.forEach(c => { if (c.userData.top == null) c.userData.top = new THREE.Box3().setFromObject(c).max.y; if (c.userData.top > 4.5) c.visible = v.hA >= 99 && B_('oldBld'); });
    dust.visible = B_('dust');
    if (A.climb) A.climb.visible = D_('climb');
    (B.parts || []).forEach(p => p.net && (p.net.visible = D_('net')));
    if (A.topG) A.topG.visible = D_('topWork');
    puddle.visible = weather === 'rain' && L.pit.visible;
    const toA = v.hA, toB = v.hB;
    if (instant || matchMedia('(prefers-reduced-motion: reduce)').matches) { setH(toA, toB); grow = null; }
    else grow = { a0: Math.min(planeA.constant, 40), b0: Math.min(planeB.constant, 40), a1: toA, b1: toB, t: 0 };
    if (s.id !== 'S6') setPeel(false);
  }
  function setH(a, b) { planeA.constant = a; planeB.constant = b; planeA2.constant = a + 1.7; planeB2.constant = b + 1.0; }

  let dayK = 1, dayTarget = 1, weather = 'clear', spray = false;
  function update(dt, t, env) {
    if (grow) { grow.t = Math.min(grow.t + dt / 2.4, 1); const e = grow.t < .5 ? 2 * grow.t * grow.t : 1 - Math.pow(-2 * grow.t + 2, 2) / 2; setH(grow.a0 + (grow.a1 - grow.a0) * e, grow.b0 + (grow.b1 - grow.b0) * e); if (grow.t >= 1) grow = null; }
    // 机械
    if (dig.visible) {
      [excav, excav2].forEach((e, i) => { const k = t * .9 + i * 1.7; e.children[1].rotation.y = Math.sin(k * .5) * 1.1; e.children[1].children[1].rotation.x = .75 + Math.sin(k) * .25; });
      trucks.forEach(tr => { tr.u = (tr.u + dt * .018) % 1; const p = truckPath.getPointAt(tr.u), q = truckPath.getPointAt((tr.u + .002) % 1); tr.o.position.copy(p); tr.o.lookAt(q.x, 0, q.z); tr.o.userData.load.visible = tr.u < .5; });
    }
    if (prep.visible) { roller.position.x = 5 + Math.sin(t * .4) * 7; roller.rotation.y = Math.PI / 2; drum.rotation.x = t * 3; loader.position.z = -10 + Math.sin(t * .5) * 3; }
    // 剖切动画
    peel += (peelTarget - peel) * Math.min(dt * 4, 1);
    floorsA.forEach((f, i) => { f.position.y = f.userData.base + peel * i * 1.4; const sh = f.children[0]; sh.material.forEach(m => { m.transparent = peel > .02; m.opacity = 1 - peel * .88; m.depthWrite = peel < .5; }); f.children[2].visible = peel > .02; });
    roofA.position.y = AF * afh + peel * AF * 1.4;
    // 扬尘：随风飘，喷淋开启后浓度降
    if (dust.visible) {
      const target = spray ? .12 : (env.dust ?? .55); dust.material.opacity += (target - dust.material.opacity) * dt;
      const p = dustGeo.attributes.position.array; for (let i = 0; i < dustN; i++) { p[i * 3] += dt * (.6 + Math.sin(i) * .3); p[i * 3 + 1] += dt * .15; if (p[i * 3] > 31 || p[i * 3 + 1] > 5) { p[i * 3] = 14 + Math.random() * 6; p[i * 3 + 1] = 0; } }
      dustGeo.attributes.position.needsUpdate = true;
    }
    if (mist.visible) { const p = mistGeo.attributes.position.array; for (let i = 0; i < mistN; i++) { const k = (t * .6 + mistSeed[i]) % 1; p[i * 3 + 1] = 1.6 + k * 1.2 - k * k * 2.2; } mistGeo.attributes.position.needsUpdate = true; }
    if (rain.visible) { const p = rainGeo.attributes.position.array; for (let i = 0; i < rainN; i++) { p[i * 6 + 1] -= dt * 30; p[i * 6 + 4] -= dt * 30; if (p[i * 6 + 1] < 0) { p[i * 6 + 1] += 40; p[i * 6 + 4] += 40; } } rainGeo.attributes.position.needsUpdate = true; }
    // 昼夜
    dayK += (dayTarget - dayK) * Math.min(dt * 1.5, 1);
    return dayK;
  }
  function setDay(on) { dayTarget = on ? 1 : 0; lampM.emissive.setHex(on ? 0x000000 : 0xffe9a8); }
  function setWeather(w) { weather = w; rain.visible = w === 'rain'; puddle.visible = w === 'rain' && L.pit.visible; }
  function setSpray(on) { spray = on; mist.visible = on; }

  return { setH, getH: () => [planeA.constant, planeB.constant], planes: { planeA, planeB, planeA2, planeB2 }, parts: { dig, base, prep, pitCover, done, dA, dB, roofA, land, garage, excav, excav2, trucks, roller, loader, rn, dust, mist, hoists }, apply, update, setPeel, setDay, setWeather, setSpray, get stage() { return cur; }, get weather() { return weather; }, get peel() { return peelTarget; }, get peelNow() { return peel; }, get dayNow() { return dayK; }, floorsA, roofA, A: { ax, az, aw, ad, afh, AF } };
}
