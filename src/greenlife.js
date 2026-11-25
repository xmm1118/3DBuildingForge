// 绿色建造全过程：P0 绿色策划（场地分析图层）→ 各施工阶段绿色措施 → S7 拆除与回收
import * as THREE from 'three';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const seg = (k, a, b) => clamp((k - a) / (b - a));

export function buildGreenLife({ scene, world, stages, proc }) {
  const L = world.layers;
  const M = o => new THREE.MeshStandardMaterial({ roughness: .75, ...o });
  const root = new THREE.Group(); root.name = '绿色建造全过程'; scene.add(root);
  const mk = (geo, m, x, y, z, p) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; p.add(o); return o; };
  const bx = (w, h, d, m, x, y, z, p) => mk(new THREE.BoxGeometry(w, h, d), m, x, y + h / 2, z, p);
  const label = (text, x, y, z, p, color = '#166534', sc = .55) => {
    const c = document.createElement('canvas'); const g = c.getContext('2d'); const f = 'bold 44px "Noto Sans SC","Noto Sans CJK SC","PingFang SC","Microsoft YaHei",sans-serif';
    g.font = f; const w = g.measureText(text).width + 40; c.width = w; c.height = 72; g.font = f;
    g.fillStyle = color; g.beginPath(); g.roundRect(0, 0, w, 72, 16); g.fill(); g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.fillText(text, 20, 38);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(w / 72 * sc, sc, 1); s.position.set(x, y, z); s.renderOrder = 999; p.add(s); return s;
  };
  const arrow = (len, color, p) => { const g = new THREE.Group(); const m = M({ color, emissive: color, emissiveIntensity: .35, transparent: true, opacity: .9 });
    const sh = mk(new THREE.CylinderGeometry(.18, .18, len, 8), m, 0, 0, 0, g); sh.rotation.z = Math.PI / 2; const hd = mk(new THREE.ConeGeometry(.5, 1.2, 10), m, len / 2 + .6, 0, 0, g); hd.rotation.z = -Math.PI / 2; p.add(g); return g; };

  // =============== P0 绿色策划：场地分析图层 ===============
  const plan = new THREE.Group(); plan.name = '绿色策划图层'; root.add(plan);
  const zone = (x0, z0, x1, z1, color, op = .38) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, .09, (z0 + z1) / 2); plan.add(m);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(x1 - x0, .01, z1 - z0)), new THREE.LineBasicMaterial({ color })); e.position.copy(m.position); plan.add(e); return m; };
  const zA = zone(-24, -15, -13, -5, 0x2563eb), zB = zone(-5, -14, 15, -3, 0x2563eb), zPit = zone(15, -15, 25, -3, 0x0891b2, .3);
  const zCamp = zone(-30.5, 10.5, 30.5, 24.6, 0xf59e0b, .22), zYard = zone(-26, -24.6, 30.5, -20.5, 0xf97316, .25);
  const zGreen = zone(-12, 4, 12, 9, 0x22c55e, .35), zGreen2 = zone(16, 2, 28, 9, 0x22c55e, .35);
  const planTags = [
    label('1# 楼 · 南北向 · 装配式', -18.5, 3, -10, plan, '#1d4ed8'), label('2# 楼 · 南北向', 5, 3, -8.5, plan, '#1d4ed8'), label('地下室 / 基坑范围', 20, 2.2, -9, plan, '#0e7490'),
    label('临建区：放在规划道路与后期绿地上（可周转箱式房）', 0, 2.4, 17.5, plan, '#b45309'), label('构件堆场：靠近塔吊覆盖范围', 2, 2.2, -22.5, plan, '#c2410c'),
    label('规划绿地 / 雨水花园（海绵）', 0, 1.8, 6.5, plan), label('透水铺装 · 下凹绿地', 22, 1.8, 5.5, plan)
  ];
  // 太阳轨迹（冬至/夏至示意）：南侧天空的弧线 + 运动的太阳
  const arcPts = (h, r) => Array.from({ length: 41 }, (_, i) => { const a = Math.PI * i / 40; return new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * h + 2, 18 - Math.sin(a) * 6); });
  const arcS = mk(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arcPts(26, 34)), 80, .12, 6), new THREE.MeshBasicMaterial({ color: 0xf97316 }), 0, 0, 0, plan);
  const arcW = mk(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arcPts(14, 26)), 80, .12, 6), new THREE.MeshBasicMaterial({ color: 0xfbbf24 }), 0, 0, 0, plan);
  const sun = mk(new THREE.SphereGeometry(1.1, 18, 12), new THREE.MeshBasicMaterial({ color: 0xffc83d }), 0, 20, 14, plan);
  const sunTag = label('太阳高度角：夏至高、冬至低 → 控制楼间距保证日照（示意）', 0, 30, 14, plan, '#c2410c');
  // 主导风向（示意，以当地气象资料为准）
  const windS = [0, 1, 2].map(i => { const a = arrow(8, 0x0ea5e9, plan); a.rotation.y = Math.PI * .75; a.position.set(30, 4 + i * 1.8, 18 - i * 3); return a; });
  const windW = [0, 1].map(i => { const a = arrow(8, 0x6366f1, plan); a.rotation.y = -Math.PI * .75; a.position.set(30, 5 + i * 2, -22 + i * 3); return a; });
  const windTag = [label('夏季主导风（示意）：引导穿堂风', 26, 9.5, 16, plan, '#0369a1'), label('冬季主导风（示意）：北侧布置防风', 26, 10, -20, plan, '#4338ca')];
  // 雨水径流组织：箭头流向雨水花园
  const runoff = [[-18, -3], [-8, -1], [6, -1], [14, 0], [24, -1], [20, 10]].map(([x, z]) => { const a = arrow(2.6, 0x38bdf8, plan); a.scale.setScalar(.5); a.position.set(x, .4, z); a.userData.o = new THREE.Vector3(x, .4, z); a.userData.t = new THREE.Vector3(x > 14 ? 22 : 0, .4, x > 14 ? 5.5 : 6.5); a.lookAt(a.userData.t); a.rotateY(-Math.PI / 2); return a; });
  // 保留现状行道树（绿圈）
  const keep = [];
  const treeLayer = L.tree; if (treeLayer) treeLayer.children.forEach((t, i) => { if (i % 5) return; const p = new THREE.Vector3(); t.getWorldPosition(p); const r = new THREE.Mesh(new THREE.TorusGeometry(1.1, .1, 6, 24), new THREE.MeshBasicMaterial({ color: 0x16a34a })); r.rotation.x = Math.PI / 2; r.position.set(p.x, .3, p.z); plan.add(r); keep.push(r); });
  const keepTag = label('保留现状行道树', -35.5, 4, 0, plan);
  plan.visible = false;
  const planLayers = { zones: [zA, zB, zPit, zCamp, zYard, zGreen, zGreen2], sun: [arcS, arcW, sun, sunTag], wind: [...windS, ...windW, ...windTag], rain: runoff, keep: [...keep, keepTag], tags: planTags };
  function showPlan(which) { Object.entries(planLayers).forEach(([k, arr]) => arr.forEach(o => o.visible = !which || which.includes(k))); plan.children.forEach(o => { if (o.isLineSegments) o.visible = !which || which.includes('zones'); }); }

  // =============== 施工阶段绿色措施（S0–S4） ===============
  const gc = new THREE.Group(); gc.name = '绿色施工设施'; root.add(gc);
  // 临建屋面光伏（自动找生活/办公区较大的屋面）
  const pvM = M({ color: 0x1e3a8a, metalness: .5, roughness: .25, emissive: 0x0b1f4f, emissiveIntensity: .2 });
  const campPv = new THREE.Group(); gc.add(campPv);
  if (L.live) {
    L.live.updateMatrixWorld(true);
    const cands = [];
    L.live.traverse(o => { if (!o.isMesh) return; const b = new THREE.Box3().setFromObject(o); const s = b.getSize(new THREE.Vector3()); if (s.x > 2.5 && s.z > 1.6 && s.y > .5 && b.max.y < 5 && b.max.y > 1) cands.push({ b, a: s.x * s.z }); });
    cands.sort((p, q) => q.a - p.a);
    const used = []; cands.forEach(({ b }) => { if (used.length >= 6) return; if (used.some(u => u.intersectsBox(b))) return; used.push(b);
      const s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3()); const pv = bx(s.x * .82, .06, s.z * .7, pvM, c.x, b.max.y + .04, c.z, campPv); pv.rotation.x = -.12; });
  }
  // 太阳能路灯（围挡内主路）
  const solar = new THREE.Group(); gc.add(solar);
  [-26, -10, 6, 22].forEach(x => { mk(new THREE.CylinderGeometry(.06, .08, 3, 6), M({ color: 0x94a3b8 }), x, 1.5, 9.2, solar); const pn = bx(.9, .04, .6, pvM, x, 3.05, 9.2, solar); pn.rotation.x = -.4; mk(new THREE.SphereGeometry(.12, 8, 6), M({ color: 0xfff7d6, emissive: 0xffe9a8, emissiveIntensity: .6 }), x + .2, 2.8, 9.2, solar); });
  // 建筑垃圾分类站
  const recyc = new THREE.Group(); recyc.position.set(-22, 0, 2.6); gc.add(recyc);
  bx(5.2, .08, 1.8, M({ color: 0x9ca3af }), 0, 0, 0, recyc); bx(5.4, .06, 2, M({ color: 0x16a34a }), 0, 1.5, 0, recyc);
  [-.75, .75].forEach(z => [-2.6, 2.6].forEach(x => mk(new THREE.CylinderGeometry(.04, .04, 1.5, 6), M({ color: 0x475569 }), x, .75, z * 1.2, recyc)));
  const binC = [[0x64748b, '金属'], [0x9ca3af, '混凝土砖石'], [0xa16207, '木材'], [0x2563eb, '塑料包装'], [0xdc2626, '有害']];
  binC.forEach(([c], i) => bx(.8, .8, .9, M({ color: c }), -2 + i, .08, 0, recyc));
  const recTag = label('建筑垃圾分类站：金属 / 砖石 / 木材 / 塑料 / 有害', -22, 2.6, 2.6, gc);
  // 土方暂存（S1）：绿网覆盖的堆土，用于回填
  const earth = new THREE.Group(); gc.add(earth);
  const netTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); g.fillStyle = '#2f7d3a'; g.fillRect(0, 0, 32, 32); g.strokeStyle = '#4ade80'; g.lineWidth = 1; for (let i = 0; i < 32; i += 4) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 32); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(32, i); g.stroke(); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 3); return t; })();
  const pile = mk(new THREE.ConeGeometry(3.4, 2.2, 18), M({ map: netTex }), -8, 1.1, -17.2, earth); pile.scale.z = .6;
  const earthTag = label('土方场内暂存 → 基础完成后回填（挖填平衡）', -8, 3.4, -17.2, earth);
  // 铝模 / 工具式模板周转（S2–S3）
  const form = new THREE.Group(); gc.add(form);
  for (let i = 0; i < 6; i++) bx(2.4, .12, 1.2, M({ color: 0xcbd5e1, metalness: .7, roughness: .3 }), 9, i * .13, -17.4, form);
  for (let i = 0; i < 4; i++) bx(2.4, .12, 1.2, M({ color: 0xcbd5e1, metalness: .7, roughness: .3 }), 12, i * .13, -17.4, form);
  const formTag = label('铝模 / 工具式模板：周转使用，减少木模废料', 10.5, 2.2, -17.4, form);
  // 雨水回收 + 洗车循环水池（S0–S4）
  const water = new THREE.Group(); gc.add(water);
  mk(new THREE.CylinderGeometry(.9, .9, 1.8, 16), M({ color: 0x0ea5e9, transparent: true, opacity: .85 }), 27.6, .9, 9.6, water);
  const waterTag = label('雨水 / 基坑降水回收 → 降尘、洗车、养护', 27.6, 2.8, 9.6, water, '#0369a1');

  // =============== S7 拆除与回收 ===============
  const demo = new THREE.Group(); demo.name = '拆除与回收'; root.add(demo);
  const yel = M({ color: 0xf0b323 });
  // 长臂拆除机
  const ex = new THREE.Group(); ex.position.set(-18.5, 0, -1.2); ex.rotation.y = Math.PI; demo.add(ex);
  bx(1.6, .5, 2.2, M({ color: 0x333 }), 0, 0, 0, ex); const cab = new THREE.Group(); cab.position.y = .5; ex.add(cab); bx(1.4, .8, 1.4, yel, 0, 0, .3, cab);
  const boom = new THREE.Group(); boom.position.set(0, .8, -.3); cab.add(boom); bx(.22, 9, .22, yel, 0, 0, 0, boom); boom.rotation.x = .38;
  const arm = new THREE.Group(); arm.position.y = 9; boom.add(arm); bx(.18, 5, .18, yel, 0, 0, 0, arm); arm.rotation.x = 1.6;
  const jaw = bx(.6, .5, .4, M({ color: 0x444 }), 0, 5, 0, arm);
  // 移动破碎站 + 输送带
  const crusher = new THREE.Group(); crusher.position.set(-7, 0, 1.6); demo.add(crusher);
  bx(3.2, .9, 1.6, M({ color: 0x2f6f4f }), 0, 0, 0, crusher); bx(1.4, 1, 1.4, M({ color: 0xf0b323 }), -.8, .9, 0, crusher);
  const belt = bx(4, .12, .6, M({ color: 0x222 }), 3, 1.2, 0, crusher); belt.rotation.z = -.28;
  // 分类堆放
  const piles = new THREE.Group(); demo.add(piles);
  const aggr = mk(new THREE.ConeGeometry(1.9, 1.6, 18), M({ color: 0x9ca3af, roughness: 1 }), -1.4, .8, 2, piles);
  for (let i = 0; i < 14; i++) { const r = mk(new THREE.CylinderGeometry(.05, .05, 2.6, 5), M({ color: 0x7c2d12, metalness: .4 }), 2.6 + (i % 5) * .25, .08 + Math.floor(i / 5) * .12, 2, piles); r.rotation.z = Math.PI / 2; r.rotation.y = (i % 3 - 1) * .2; }
  for (let i = 0; i < 4; i++) bx(1.6, .1, 1.1, M({ color: 0xbfdbfe, transparent: true, opacity: .8 }), 6, i * .11, 2, piles);
  for (let i = 0; i < 3; i++) bx(2.6, .22, 1.2, M({ color: 0xe5e7eb }), 9.6, i * .23, 2, piles);
  const demoTags = [label('自上而下 · 逐层分段拆除', -18.5, 0, -10, demo, '#b91c1c'), label('移动破碎：混凝土 → 再生骨料', -7, 3.4, 1.6, demo, '#166534'),
    label('再生骨料', -1.4, 2.3, 2, demo, '#475569', .45), label('钢筋废钢', 3.1, 1.2, 2, demo, '#7c2d12', .45), label('门窗玻璃', 6, 1.2, 2, demo, '#1d4ed8', .45), label('预制构件再利用', 9.6, 1.4, 2, demo, '#334155', .45),
    label('先拆门窗、设备、光伏板等可回收部品', -18.5, 0, -3.6, demo, '#b45309')];
  // 喷淋雾炮
  const fogN = 300, fogG = new THREE.BufferGeometry(), fogP = new Float32Array(fogN * 3), fogS = new Float32Array(fogN).map(() => Math.random());
  fogG.setAttribute('position', new THREE.BufferAttribute(fogP, 3));
  const fog = new THREE.Points(fogG, new THREE.PointsMaterial({ color: 0xe0f2fe, size: .35, transparent: true, opacity: .75, depthWrite: false })); demo.add(fog);
  const cannon = new THREE.Group(); cannon.position.set(-12, 0, -2); demo.add(cannon); bx(.9, .6, .9, M({ color: 0x0f766e }), 0, 0, 0, cannon); const barrel = mk(new THREE.CylinderGeometry(.35, .25, 1, 10), M({ color: 0x115e59 }), 0, 1, 0, cannon); barrel.rotation.z = .9;
  // 楼层碎块（落下的混凝土块）
  const chunks = Array.from({ length: 10 }, () => { const c = bx(.4, .3, .35, M({ color: 0xb8bcc0 }), 0, 0, 0, demo); c.visible = false; return c; });
  demo.visible = false;
  let demoP = 0, demoTarget = 0;
  const { ax, az, afh, AF } = stages.A;
  function setDemo(p, now) { demoTarget = clamp(p); if (now) { demoP = demoTarget; applyDemo(demoP); } }
  function applyDemo(p) {
    const keepN = Math.round(AF * (1 - p));
    stages.floorsA.forEach((f, i) => f.visible = i < keepN);
    stages.roofA.visible = p < .04;
    const topY = keepN * afh;
    demoTags[0].position.set(ax, topY + 2.4, az); demoTags[6].position.set(ax, Math.max(topY - 2, 2), az + 6);
    boom.rotation.x = clamp(.38 + (1 - keepN / AF) * .5, .38, .9); arm.rotation.x = 1.6 - (1 - keepN / AF) * .4;
  }

  // =============== 阶段切换钩子 ===============
  const show = (id) => {
    const v = (stages.stage && stages.stage.view) || {};
    plan.visible = !!v.plan; if (v.plan) showPlan(null);
    const inBuild = ['S0', 'S1', 'S2', 'S3', 'S4'].includes(id);
    gc.visible = inBuild || id === 'S7' || id === 'LAB';
    campPv.visible = inBuild || id === 'LAB'; solar.visible = inBuild || id === 'LAB' || id === 'S7';
    recyc.visible = inBuild || id === 'S7' || id === 'LAB'; recTag.visible = recyc.visible;
    earth.visible = id === 'S1'; form.visible = id === 'S2' || id === 'S3' || id === 'LAB'; water.visible = inBuild || id === 'LAB' || id === 'S7';
    demo.visible = !!v.demo;
    if (v.demo) { demoP = demoTarget = v.demoP ?? .4; applyDemo(demoP); }
    else { stages.floorsA.forEach(f => f.visible = true); stages.roofA.visible = true; }
  };
  const apply0 = stages.apply;
  stages.apply = function (id, instant) { const r = apply0.call(stages, id, instant); show(id); return r; };

  function update(dt, t) {
    if (plan.visible) {
      const a = (t * .12) % 1; const pa = Math.PI * a; sun.position.set(Math.cos(pa) * 34, Math.sin(pa) * 26 + 2, 18 - Math.sin(pa) * 6);
      windS.forEach((w, i) => { const k = (t * .25 + i * .33) % 1; w.position.x = 30 - k * 20; w.position.z = 18 - i * 3 - k * 20; w.children.forEach(c => c.material.opacity = Math.sin(k * Math.PI)); });
      windW.forEach((w, i) => { const k = (t * .25 + i * .5) % 1; w.position.x = 30 - k * 20; w.position.z = -22 + i * 3 + k * 14; w.children.forEach(c => c.material.opacity = Math.sin(k * Math.PI)); });
      runoff.forEach((r, i) => { const k = (t * .3 + i * .17) % 1; r.position.lerpVectors(r.userData.o, r.userData.t, k); });
    }
    if (demo.visible) {
      demoP += (demoTarget - demoP) * Math.min(dt * 1.5, 1); applyDemo(demoP);
      jaw.rotation.x = Math.sin(t * 4) * .3;
      const keepN = Math.round(AF * (1 - demoP)), topY = keepN * afh;
      chunks.forEach((c, i) => { const k = (t * .5 + i / chunks.length) % 1; c.visible = demoP < .98; c.position.set(ax + 3.5 + (i % 3) * .4, topY * (1 - k), az + 3 + (i % 2) * .5); c.rotation.set(k * 6, k * 4, 0); });
      const p = fogG.attributes.position.array; for (let i = 0; i < fogN; i++) { const k = (t * .5 + fogS[i]) % 1; p[i * 3] = -11.4 - k * 6 * (.6 + fogS[i] * .6); p[i * 3 + 1] = 1.3 + k * 4 - k * k * 3; p[i * 3 + 2] = -2 - k * 4 + (fogS[i] - .5) * 2; } fogG.attributes.position.needsUpdate = true;
    }
  }

  // =============== 工序动画 ===============
  const hl = (objs, on) => objs.forEach(o => o.visible = on);
  proc.register('P0', () => [
    { name: '场地调研：地形、水文、现状树木', desc: '收集地形图、地勘、周边道路管线和现状树木资料；标出需要保留的行道树和可利用的地形。', key: '先摸清场地条件，绿色设计才有依据。', points: ['pl-tree'], cam: [[-20, 30, 40], [-10, 0, 0]], dur: 7,
      init() { showPlan(['keep']); }, tick() {} },
    { name: '总图与朝向：南北向布置、控制间距', desc: '根据日照分析确定两栋楼南北向布置和楼间距，主要房间朝南；夏至太阳高、冬至太阳低。', key: '朝向和间距是被动节能的第一步。', points: ['pl-sun'], norm: 'GB/T 50378-2019（2024 年版）第 3.2.1、3.2.8 条（评价对象与星级）', cam: [[0, 34, 52], [0, 6, 0]], dur: 8,
      init() { showPlan(['zones', 'sun', 'tags']); }, tick() {} },
    { name: '风环境：引导夏季通风、阻挡冬季寒风', desc: '用主导风向分析建筑布局：夏季让风穿过场地带走热量，冬季北侧布置构件堆场和围挡挡风。风向为示意，实际以当地气象资料为准。', key: '「先被动、后主动」：能靠布局解决的不靠设备。', points: ['pl-wind'], cam: [[48, 24, 30], [6, 2, 0]], dur: 7,
      init() { showPlan(['zones', 'wind']); }, tick() {} },
    { name: '场地雨水：径流组织与海绵设施', desc: '按竖向设计让屋面和道路雨水流向下凹绿地、雨水花园，透水铺装就地下渗，多余雨水进雨水池回用。', key: '源头控制雨水，减少外排，也为后期绿化浇灌储水。', points: ['pl-rain'], cam: [[10, 26, 34], [6, 0, 2]], dur: 7,
      init() { showPlan(['zones', 'rain']); }, tick() {} },
    { name: '绿色施工策划：临建与分区', desc: '临建放在规划道路和后期绿地位置，用可周转箱式房；构件堆场放在塔吊覆盖范围内；土方尽量场内挖填平衡；定下扬尘、用水、用电和建筑垃圾目标。', key: '施工总平面也要做绿色设计（GB/T 50640-2023 适用于新建及拆除工程）。', points: ['pl-zone'], norm: 'GB/T 50640-2023 建筑与市政工程绿色施工评价标准', cam: [[0, 40, 46], [0, 0, 2]], dur: 8,
      init() { showPlan(['zones', 'tags']); }, tick() {} },
    { name: '定目标：星级与全寿命周期碳', desc: '确定绿色建筑星级目标、装配率、可再生能源比例和全寿命周期碳排放目标，写进设计任务书和施工合同。', key: '目标在策划阶段定下，后面每个阶段都要对照检查。', points: ['pl-sun', 'pl-zone'], norm: 'GB/T 51366-2019 建筑碳排放计算标准', cam: [[-2, 46, 58], [0, 4, 0]], dur: 7,
      init() { showPlan(null); }, tick() {} }
  ]);
  proc.register('S7', () => [
    { name: '拆除前调查与方案', desc: '设计寿命期满（示意：运行约 50 年后），先调查结构现状、周边环境和有害物质，编制拆除专项方案并做书面安全技术交底。', key: '拆除工程同样要做绿色施工策划和碳排放核算。', points: ['dm-safety'], norm: 'JGJ 147-2016 第 3.0.1、3.0.2 条', cam: [[0, 22, 26], [-14, 6, -6]], dur: 7,
      init() { setDemo(0, true); }, tick() {} },
    { name: '断水电气，先拆可回收部品', desc: '先切断电源、水源、气源，再拆设备管线；门窗、幕墙玻璃、屋面光伏板、空调设备整件拆下分类回收。', key: '能整件再用的先拆下来，比破碎后再利用价值高。', points: ['dm-sort'], norm: 'JGJ 147-2016 第 3.0.6 条', cam: [[-4, 18, 16], [-16, 8, -6]], dur: 7,
      init() { setDemo(0, true); }, tick() {} },
    { name: '围挡、雾炮降尘与噪声控制', desc: '围挡封闭，雾炮和喷淋湿法作业；控制作业时间，监测扬尘和噪声。施工现场严禁焚烧废弃物。', key: '拆除扬尘大，必须湿法作业。', points: ['env'], norm: 'JGJ 147-2016 第 7.0.4、7.0.5 条', cam: [[-2, 14, 18], [-12, 4, -3]], dur: 6,
      init() { setDemo(.05, true); }, tick() {} },
    { name: '自上而下、逐层分段机械拆除', desc: '长臂拆除机从顶层开始，先拆非承重结构再拆承重结构，逐层向下；不得立体交叉作业，机械前端作业高度要高于拟拆除物。', key: '顺序反过来就会失稳坍塌。', points: ['dm-safety'], norm: 'JGJ 147-2016 第 3.0.7、5.2.2 条', cam: [[2, 20, 20], [-17, 8, -8]], dur: 10,
      init() { setDemo(.1, true); }, tick(k) { setDemo(.1 + .8 * k); } },
    { name: '现场分类与移动破碎', desc: '钢筋与混凝土分离，废钢回炉；混凝土块进移动破碎站，筛分成再生骨料；木材、塑料、有害废弃物分开存放。', key: '分类越早越细，资源化率越高。', points: ['dm-crush', 'dm-sort'], norm: 'JGJ 147-2016 第 7.0.7 条；GB/T 50743 工程施工废弃物再生利用技术规范', cam: [[4, 10, 14], [0, 1, 2]], dur: 8,
      init() { setDemo(.95, true); }, tick() {} },
    { name: '资源化利用与场地恢复', desc: '再生骨料用于路基、垫层或再生混凝土；预制构件检测合格后可再利用。运输车辆冲洗、密闭运输。统计资源化率，计入全寿命周期碳排放的回收抵减。', key: '拆除是全寿命周期的终点，也是下一栋建筑材料的起点。', points: ['dm-reuse'], norm: 'JGJ 147-2016 第 7.0.8 条；GB/T 51366-2019', cam: [[10, 16, 22], [0, 2, 0]], dur: 7,
      init() { setDemo(1, true); }, tick() {} }
  ]);
  // 各施工阶段追加一步「绿色施工」
  const greenStep = (id, name, desc, key, points, cam, vis) => proc.extend(id, () => ({ name, desc, key, points, cam, dur: 7, norm: 'GB/T 50640-2023 建筑与市政工程绿色施工评价标准',
    init() { vis.forEach(o => { o.visible = true; let p = o.parent; while (p && p !== scene) { p.visible = true; p = p.parent; } }); }, tick() {} }));
  greenStep('S0', '绿色施工 · 临建与场地', '箱式临建可周转，屋面装光伏、太阳能路灯；洗车水和雨水回收降尘；建筑垃圾分类站开始运转。', '临建本身就是第一批「绿色施工」措施。', ['gc-pv-camp', 'gc-recycle', 'sewage'], [[-10, 16, 34], [-12, 2, 10]], [campPv, solar, recyc, water]);
  greenStep('S1', '绿色施工 · 土方平衡', '挖出的土方一部分场内暂存，绿网覆盖，等基础完成后回填；基坑降水回收用于降尘洗车。', '少外运就少油耗、少扬尘、少碳排。', ['gc-earth', 'cover'], [[0, 14, 6], [-8, 1, -17]], [earth, water]);
  greenStep('S2', '绿色施工 · 钢筋与模板', '钢筋集中加工，短料做马凳和预埋件；工具式模板、铝模周转使用；混凝土余料做成小型预制件。', '节材要从下料开始算。', ['gc-formwork', 'rebar-ai'], [[14, 10, -8], [10, 1, -17]], [form]);
  greenStep('S3', '绿色施工 · 装配式与周转材料', '1# 楼装配式构件减少现场湿作业和模板；2# 楼铝模周转；楼层垃圾走封闭垃圾道，到分类站分类。', '装配式让现场垃圾、用水、扬尘都明显下降。', ['gc-formwork', 'gc-recycle', 'prefab-lift'], [[0, 16, 10], [-6, 2, -10]], [form, recyc]);
  greenStep('S4', '绿色施工 · 节能围护与室内环境', '幕墙用 Low-E 中空玻璃，外墙做保温；装修用低挥发性材料并做室内空气检测；边角料回收。', '运行阶段能耗的基础在这一步打下。', ['gc-recycle', 'water-elec'], [[-2, 16, 18], [-14, 8, -6]], [recyc]);
  greenStep('S5', '绿色施工 · 临建拆除与竣工检测', '临建箱式房拆下转场周转；海绵景观完成；做节能检测和系统调试，准备绿色建筑评价资料。', '把绿色设计真正「交付」给运维。', ['sponge'], [[10, 18, 30], [4, 2, 4]], []);

  return { update, setDemo, showPlan, get demoP() { return demoP; }, groups: { plan, gc, demo, campPv, recyc, earth, form } };
}
