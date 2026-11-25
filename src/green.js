// 绿色建筑运维设施（竣工与运维阶段显示）：光伏、光伏车棚与充电桩、绿色屋顶、海绵设施、雨水回收、地源热泵、垃圾分类、碳排放公示屏、微气象站
// 程序化示意模型，按沙盘比例布置在竣工后的空地上；坐标同 scene.js（x 向东，z 向南）
import * as THREE from 'three';

const mk = (geo, m, x, y, z, parent) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; parent.add(o); return o; };
const bx = (w, h, d, m, x, y, z, parent) => mk(new THREE.BoxGeometry(w, h, d), m, x, y + h / 2, z, parent);
const M = o => new THREE.MeshStandardMaterial({ roughness: .7, ...o });
const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };

export function buildGreen(world, scene, stages) {
  const g = new THREE.Group(); g.name = '绿色建筑设施'; g.visible = false;
  scene.add(g);
  const A = world.layers.bldA.userData;
  const afh = A.fh, roofA = 10 * afh;
  const pvTex = tex(64, 40, (c, w, h) => { c.fillStyle = '#16305a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#7fa6d6'; c.lineWidth = 1; for (let x = 0; x <= w; x += 8) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } for (let y = 0; y <= h; y += 10) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } });
  const pvM = M({ map: pvTex, metalness: .5, roughness: .25, emissive: 0x0b1f3d, emissiveIntensity: .0 });
  const steel = M({ color: 0x9aa3ab, metalness: .4 });
  const grass = M({ color: 0x6fae4a, roughness: 1 }), shrub = M({ color: 0x3f8f3a, flatShading: true });
  const pvPanels = [];
  const panel = (w, d, x, y, z, tilt, parent) => { const p = bx(w, .05, d, pvM, x, y, z, parent); p.rotation.x = -tilt; pvPanels.push(p); return p; };

  // 1. 2# 楼主楼屋顶光伏（x 1~11，z -14~-3，屋面 14.4）
  const roofB = 9 * 1.6;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) { bx(.06, .35, .06, steel, 1.9 + c * 1.55, roofB, -12.3 + r * 3.2, g); panel(1.4, 1.5, 1.9 + c * 1.55, roofB + .35, -12.3 + r * 3.2, .35, g); }
  // 1# 楼屋顶补一排光伏（原有 4 块在北侧）
  for (let i = 0; i < 4; i++) panel(1.1, .7, A.cx - 3.6 + i * 1.3, roofA + .4, A.cz - .2, .35, g);

  // 2. 绿色屋顶：2# 西裙房（x -5~1，z -13~-4，屋面 4.8）与东裙房（x 11~15，z -14~-3，屋面 6.4）
  const greenRoof = (x0, x1, z0, z1, y) => {
    bx(x1 - x0 - .4, .14, z1 - z0 - .4, grass, (x0 + x1) / 2, y, (z0 + z1) / 2, g);
    const ico = new THREE.IcosahedronGeometry(.32, 0);
    for (let x = x0 + .8; x < x1 - .5; x += 1.3) for (let z = z0 + .8; z < z1 - .5; z += 1.6) mk(ico, shrub, x + (Math.sin(x * 7 + z) * .25), y + .4, z, g);
    bx(x1 - x0 - .3, .05, .25, M({ color: 0xb9a88a }), (x0 + x1) / 2, y + .14, (z0 + z1) / 2, g);   // 检修步道
  };
  greenRoof(-5, 1, -13, -4, 4.8); greenRoof(11, 15, -14, -3, 6.4);

  // 3. 光伏车棚与充电桩（西南停车场 x -30~-18，z 11~24）
  const carCols = [0xd0d4d8, 0x2f6fb3, 0xc23b3b, 0x3d4650, 0xf2f2f2, 0x2c8a5a];
  const chargers = [];
  [12.5, 22].forEach((zr, ri) => {
    const dz = ri === 0 ? -1 : 1;
    for (let x = -29; x <= -19; x += 3.4) bx(.12, 2.1, .12, steel, x, 0, zr + dz * .2, g);
    const can = bx(12.6, .08, 3.2, pvM, -24, 2.1, zr + dz * .9, g); can.rotation.x = dz * .12; pvPanels.push(can);
    for (let i = 0; i < 7; i++) {
      const x = -29 + i * 1.8;
      if ((i + ri) % 3 !== 2) { const car = new THREE.Group(); car.position.set(x, 0, zr + dz * 1.2); g.add(car); bx(.9, .32, 1.7, M({ color: carCols[(i + ri * 3) % 6], metalness: .3 }), 0, .12, 0, car); bx(.8, .26, .9, M({ color: 0x1f2937, metalness: .5, roughness: .2 }), 0, .44, .05, car); }
      if (i % 2 === 0) { const ch = bx(.28, .9, .2, M({ color: 0xf1f5f9 }), x + .9, 0, zr - dz * .45, g); const scr = bx(.18, .12, .02, M({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: .8 }), x + .9, .62, zr - dz * .45 + (dz < 0 ? .11 : -.11), g); chargers.push(scr); }
    }
  });

  // 4. 海绵设施：雨水花园（下凹绿地）+ 透水铺装
  const rainG = M({ color: 0x4e8f3c, roughness: 1 }), gravel = M({ color: 0xb6b2a6, roughness: 1 });
  const rainGarden = (x, z, w, d) => { bx(w, .03, d, gravel, x, .02, z, g); bx(w - .6, .04, d - .6, rainG, x, .03, z, g); const ico = new THREE.IcosahedronGeometry(.22, 0); for (let i = 0; i < 6; i++) mk(ico, M({ color: i % 2 ? 0x8bc34a : 0xd4a5d8, flatShading: true }), x - w / 2 + .6 + (i % 3) * (w - 1.2) / 2, .25, z - d / 4 + Math.floor(i / 3) * d / 2, g); bx(.25, .35, .25, M({ color: 0x64748b }), x + w / 2 - .3, .03, z - d / 2 + .3, g); };
  rainGarden(-8, 11.6, 8, 1.6); rainGarden(16, 11.6, 9, 1.6); rainGarden(24.5, 19, 2, 8);
  const permTex = tex(64, 64, (c, w, h) => { c.fillStyle = '#c9b48f'; c.fillRect(0, 0, w, h); c.fillStyle = '#b89b6d'; for (let y = 0; y < h; y += 8) for (let x = (y / 8 % 2) * 8; x < w; x += 16) c.fillRect(x, y, 8, 8); c.fillStyle = 'rgba(80,60,30,.35)'; for (let y = 0; y < h; y += 8) c.fillRect(0, y, w, 1); });
  permTex.wrapS = permTex.wrapT = THREE.RepeatWrapping; permTex.repeat.set(17, 2.2);
  bx(34, .02, 4.4, M({ map: permTex, roughness: 1 }), 2.5, .06, 5.8, g);

  // 5. 雨水回收：2# 屋面雨落管 → 地埋管 → 雨水收集模块池（剖开示意）→ 回用于绿化浇灌
  const pipeM = M({ color: 0x0ea5e9 });
  const hPipe = (x0, z0, x1, z1, y = .08) => { const len = Math.hypot(x1 - x0, z1 - z0); const p = mk(new THREE.CylinderGeometry(.07, .07, len, 6), pipeM, (x0 + x1) / 2, y, (z0 + z1) / 2, g); p.rotation.z = Math.PI / 2; p.rotation.y = -Math.atan2(z1 - z0, x1 - x0); return p; };
  mk(new THREE.CylinderGeometry(.07, .07, roofB, 6), pipeM, 11.2, roofB / 2, -2.85, g);
  hPipe(11.2, -2.85, 11.2, 20); hPipe(11.2, 20, 13, 20);
  const tankG = new THREE.Group(); tankG.position.set(15.5, 0, 20.5); g.add(tankG);
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fd8f5, transparent: true, opacity: .28, roughness: .1, depthWrite: false });
  bx(5, 1.4, 3, glass, 0, 0, 0, tankG);
  const water = bx(4.8, 1, 2.8, M({ color: 0x1d8fd6, transparent: true, opacity: .75, roughness: .1 }), 0, .02, 0, tankG);
  for (let i = -2; i <= 2; i++) bx(.04, 1.38, 2.9, M({ color: 0x5b6b7a, transparent: true, opacity: .5 }), i * .95, 0, 0, tankG);   // PP 模块
  bx(1.2, 1.1, 1.2, M({ color: 0xe5e7eb }), 3.4, 0, 0, tankG); bx(1.3, .12, 1.3, M({ color: 0x0f766e }), 3.4, 1.1, 0, tankG);   // 回用泵房
  hPipe(19.5, 20.5, 19.5, 15); hPipe(19.5, 15, 8, 15);
  const sprinklers = [[8, 15], [12, 15], [16, 15], [19.5, 17.5]].map(([x, z]) => bx(.12, .25, .12, M({ color: 0x334155 }), x, 0, z, g));
  const mistGeo = new THREE.BufferGeometry(); const mistN = 240, mistA = new Float32Array(mistN * 3); mistGeo.setAttribute('position', new THREE.BufferAttribute(mistA, 3));
  const mist = new THREE.Points(mistGeo, new THREE.PointsMaterial({ color: 0x7dd3fc, size: .12, transparent: true, opacity: .8 })); mist.visible = false; g.add(mist);

  // 6. 地源热泵：埋管换热孔群（草坪下）+ 能源站
  const holes = [];
  for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) holes.push(mk(new THREE.CylinderGeometry(.16, .16, .08, 10), M({ color: 0x94a3b8 }), -13 + i * 2.2, .08, 15.5 + j * 2.6, g));
  const loopM = M({ color: 0xf97316, emissive: 0x7c2d12, emissiveIntensity: .3 });
  for (let j = 0; j < 3; j++) { const p = mk(new THREE.CylinderGeometry(.04, .04, 8.8, 6), loopM, -8.6, .07, 15.5 + j * 2.6, g); p.rotation.z = Math.PI / 2; }
  { const p = mk(new THREE.CylinderGeometry(.05, .05, 6, 6), loopM, -14.3, .07, 18, g); p.rotation.x = Math.PI / 2; }
  const station = new THREE.Group(); station.position.set(-15.6, 0, 12.6); g.add(station);
  bx(3.2, 1.5, 2.2, M({ color: 0xe2e8f0 }), 0, 0, 0, station); bx(3.4, .12, 2.4, M({ color: 0x15803d }), 0, 1.5, 0, station);
  bx(.9, .7, .02, M({ color: 0x334155 }), -.6, .1, 1.11, station);
  [0.7, 1.3].forEach(x => mk(new THREE.CylinderGeometry(.25, .25, .9, 10), M({ color: 0x0f766e }), x, .45, 1.4, station));
  { const p = mk(new THREE.CylinderGeometry(.05, .05, 12, 6), loopM, -15.6, .07, 6.6, g); p.rotation.x = Math.PI / 2; }

  // 7. 垃圾分类站（可回收、厨余、有害、其他）
  const ws = new THREE.Group(); ws.position.set(26.5, 0, 12); g.add(ws);
  bx(3.6, .1, 1.6, M({ color: 0x166534 }), 0, 1.5, 0, ws); [-1.7, 1.7].forEach(x => bx(.08, 1.5, .08, steel, x, 0, -.7, ws));
  [[0x2563eb], [0x16a34a], [0xdc2626], [0x6b7280]].forEach(([c], i) => { bx(.7, .8, .6, M({ color: c }), -1.2 + i * .8, 0, 0, ws); bx(.72, .06, .62, M({ color: 0xffffff }), -1.2 + i * .8, .8, 0, ws); });

  // 8. 碳排放公示屏（广场）+ 微气象站
  const scrTex = tex(256, 128, (c, w, h) => { c.fillStyle = '#052e16'; c.fillRect(0, 0, w, h); c.fillStyle = '#4ade80'; c.font = 'bold 22px sans-serif'; c.fillText('今日碳排放', 14, 32); c.font = 'bold 44px sans-serif'; c.fillText('2.41 tCO₂', 14, 82); c.font = '18px sans-serif'; c.fillStyle = '#bbf7d0'; c.fillText('光伏减碳 0.24 t · 教学模拟', 14, 114); });
  const screen = new THREE.Group(); screen.position.set(-6, 0, 7.2); g.add(screen);
  bx(.15, 1.4, .15, steel, -1.1, 0, 0, screen); bx(.15, 1.4, .15, steel, 1.1, 0, 0, screen);
  const scr = bx(2.6, 1.3, .12, [M({ color: 0x1f2937 }), M({ color: 0x1f2937 }), M({ color: 0x1f2937 }), M({ color: 0x1f2937 }), new THREE.MeshBasicMaterial({ map: scrTex }), M({ color: 0x1f2937 })], 0, 1.4, 0, screen);
  scr.material[4].toneMapped = false;
  const ws2 = new THREE.Group(); ws2.position.set(9.5, 0, 12.6); g.add(ws2);
  bx(.08, 2.6, .08, steel, 0, 0, 0, ws2); bx(.6, .04, .04, steel, 0, 2.4, 0, ws2); const cup = mk(new THREE.CylinderGeometry(.12, .12, .1, 3), M({ color: 0xffffff }), .28, 2.55, 0, ws2);
  bx(.4, .3, .25, M({ color: 0xf8fafc }), 0, 1.4, .12, ws2); bx(.5, .02, .35, pvM, 0, 2.62, 0, ws2);

  // 9. 非机动车停放 + 散步的人
  for (let i = 0; i < 8; i++) { const b = new THREE.Group(); b.position.set(16 + i * .45, 0, 8.6); b.rotation.y = .3; g.add(b); [-.22, .22].forEach(z => { const w = mk(new THREE.TorusGeometry(.16, .025, 5, 12), M({ color: 0x111827 }), 0, .16, z, b); w.rotation.y = Math.PI / 2; }); bx(.04, .04, .44, M({ color: i % 2 ? 0xf59e0b : 0x0ea5e9 }), 0, .3, 0, b); }
  const walkers = [];
  const figure = (col) => { const f = new THREE.Group(); mk(new THREE.CylinderGeometry(.09, .11, .42, 6), M({ color: col }), 0, .21, 0, f); mk(new THREE.SphereGeometry(.09, 8, 6), M({ color: 0xe0b48f }), 0, .5, 0, f); f.scale.setScalar(1.5); g.add(f); return f; };
  [0x2563eb, 0xdb2777, 0x16a34a, 0xf59e0b, 0x7c3aed, 0x0f766e].forEach((c, i) => walkers.push({ f: figure(c), ph: i / 6, sp: .018 + (i % 3) * .004 }));
  const route = new THREE.CatmullRomCurve3([[-14, 5], [0, 4.6], [18, 5.2], [20, 9.6], [6, 10.6], [-10, 9.6]].map(([x, z]) => new THREE.Vector3(x, 0, z)), true);

  let rainK = 0, irrigate = false, pvK = 1;
  function update(dt, t, dayK) {
    const land = stages.parts.land;
    g.visible = !!(land && land.visible && land.parent && land.parent.visible !== false);
    if (!g.visible) return;
    pvM.emissiveIntensity = .15 + .25 * (dayK ?? 1) * pvK * (.85 + .15 * Math.sin(t * 1.3));
    chargers.forEach((c, i) => { c.material.emissiveIntensity = .4 + .6 * Math.abs(Math.sin(t * 2 + i)); });
    walkers.forEach(w => { const u = (w.ph + t * w.sp) % 1; const p = route.getPointAt(u), q = route.getPointAt((u + .002) % 1); w.f.position.copy(p); w.f.lookAt(q.x, 0, q.z); });
    // 雨水池水位随下雨上升、浇灌时下降
    const raining = stages.weather === 'rain';
    rainK = THREE.MathUtils.clamp(rainK + (raining ? dt * .08 : irrigate ? -dt * .05 : 0), 0, 1);
    const lv = .35 + .95 * rainK; water.scale.y = lv; water.position.y = .02 + lv / 2;
    mist.visible = irrigate; if (irrigate) { for (let i = 0; i < mistN; i++) { const s = sprinklers[i % sprinklers.length].position, k = ((t * .9 + i * .137) % 1); const a = i * 2.39; mistA[i * 3] = s.x + Math.cos(a) * k * 1.8; mistA[i * 3 + 1] = .3 + Math.sin(k * Math.PI) * .9; mistA[i * 3 + 2] = s.z + Math.sin(a) * k * 1.8; } mistGeo.attributes.position.needsUpdate = true; }
  }
  return {
    group: g, update,
    setIrrigate(on) { irrigate = on; }, setRainLevel(k) { rainK = k; }, setPv(k) { pvK = k; },
    get rainLevel() { return rainK; }, parts: { pvPanels, chargers, holes, station, tankG, water, screen }
  };
}
