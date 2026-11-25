// 沿边一圈的小展示区（北侧构件堆场与加工棚、东侧钢管/危险品、西侧加工棚与材料、体验区、办公区宣传栏）
// 位置按照片 13–31、36–52 逐一核对；看不清的名称在数据层标「待核实」
import * as THREE from 'three';

export function buildPerimeter(C) {
  const { box, mat, T, signTex, plaque, archSign, boardHouse, rnd, L } = C;
  const gYard = L.yard, gEdu = L.edu, gWork = L.worker, gSign = L.sign, gLive = L.live, gRoad = L.road;
  const workers = [];   // [x, y, z] 额外工人
  const addWorkers = (x0, z0, x1, z1, n, y = 0) => { for (let i = 0; i < n; i++) workers.push([x0 + rnd() * (x1 - x0), y, z0 + rnd() * (z1 - z0)]); };

  // ---------- 贴图 ----------
  const cv = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
  const dashTex = cv(64, 32, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#f4f4f4'; g.fillRect(0, 2, w, 7); g.fillStyle = '#222'; for (let x = 2; x < w; x += 8) g.fillRect(x, 2, 4, h - 2); });
  const stubTex = cv(64, 16, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#1e1f22'; for (let x = 1; x < w; x += 8) g.fillRect(x, 0, 3, h); });
  const meshTex = cv(64, 64, (g, w, h) => { g.fillStyle = '#2e6f45'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(160,230,180,.55)'; g.lineWidth = 1; for (let i = 0; i < w; i += 4) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); } });
  const hazardTex = cv(64, 16, (g, w, h) => { g.fillStyle = '#f2c400'; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; for (let x = -16; x < w; x += 16) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 8, h); g.lineTo(x + 16, 0); g.lineTo(x + 8, 0); g.fill(); } });
  const slatTex = cv(64, 64, (g, w, h) => { g.fillStyle = '#c9744f'; g.fillRect(0, 0, w, h); g.fillStyle = '#9b5236'; for (let y = 0; y < h; y += 8) g.fillRect(0, y, w, 2); });
  const waterTex = cv(64, 64, (g, w, h) => { g.fillStyle = '#5fb3e6'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 18; i++) g.fillRect(Math.random() * w, Math.random() * h, 10, 1.5); });
  const posterTex = (title) => cv(256, 128, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#1d5fb8'; g.fillRect(0, 0, w, 24);
    g.fillStyle = '#fff'; g.font = `bold 15px "Noto Sans CJK SC",sans-serif`; g.textAlign = 'center'; g.fillText(title, w / 2, 17);
    const cols = ['#f4b942', '#e8573f', '#3aa0e8', '#57b65a'];
    for (let i = 0; i < 6; i++) { const x = 8 + (i % 3) * 82, y = 32 + Math.floor(i / 3) * 46; g.fillStyle = '#eef3f8'; g.fillRect(x, y, 76, 40); g.fillStyle = cols[i % 4]; g.beginPath(); g.arc(x + 14, y + 20, 10, 0, 7); g.fill(); g.fillStyle = '#c0392b'; g.fillRect(x + 30, y + 10, 40, 4); g.fillRect(x + 30, y + 20, 34, 4); g.fillRect(x + 30, y + 30, 38, 4); }
  });


  // 施工安全动漫海报：每块两格漫画（卡通工人 + 标语）
  const FONTC = '"Noto Sans SC","Noto Sans CJK SC","PingFang SC","Microsoft YaHei",sans-serif';
  const drawWorker = (g, x, y, s, opt = {}) => {
    g.save(); g.translate(x, y); g.scale(s, s); g.lineCap = 'round'; g.lineJoin = 'round';
    g.fillStyle = '#ff8a1f'; g.fillRect(-14, 0, 28, 34); g.fillStyle = '#ffe14d'; g.fillRect(-14, 12, 28, 5);   // 反光背心
    g.strokeStyle = '#2b3a55'; g.lineWidth = 7; g.beginPath(); g.moveTo(-8, 34); g.lineTo(-10, 56); g.moveTo(8, 34); g.lineTo(10, 56); g.stroke();
    g.strokeStyle = '#ff8a1f'; g.lineWidth = 7; g.beginPath(); g.moveTo(-14, 6); g.lineTo(-24, opt.armUp ? -12 : 22); g.moveTo(14, 6); g.lineTo(24, opt.thumb ? -6 : 22); g.stroke();
    g.fillStyle = '#ffd7b0'; g.beginPath(); g.arc(0, -14, 14, 0, 7); g.fill();
    g.fillStyle = '#222'; g.beginPath(); g.arc(-5, -15, 2, 0, 7); g.arc(5, -15, 2, 0, 7); g.fill();
    g.strokeStyle = '#222'; g.lineWidth = 2; g.beginPath(); if (opt.sad) g.arc(0, -4, 5, Math.PI * 1.15, Math.PI * 1.85); else g.arc(0, -10, 5, .2, Math.PI - .2); g.stroke();
    if (opt.helmet !== false) { g.fillStyle = '#ffd400'; g.beginPath(); g.arc(0, -18, 16, Math.PI, 0); g.fill(); g.fillRect(-19, -19, 38, 4); }
    if (opt.harness) { g.strokeStyle = '#d61f2c'; g.lineWidth = 3; g.beginPath(); g.moveTo(-12, 0); g.lineTo(12, 30); g.moveTo(12, 0); g.lineTo(-12, 30); g.stroke(); g.beginPath(); g.moveTo(0, 2); g.quadraticCurveTo(30, -30, 40, -40); g.stroke(); }
    g.restore();
  };
  const props = {
    helmet: (g, x, y) => { g.fillStyle = '#16a34a'; g.font = `bold 34px ${FONTC}`; g.fillText('✓', x + 34, y - 10); },
    harness: (g, x, y) => { g.strokeStyle = '#8a8f96'; g.lineWidth = 4; g.beginPath(); g.moveTo(x + 46, y - 50); g.lineTo(x + 46, y + 60); g.stroke(); },
    hole: (g, x, y) => { g.fillStyle = '#222'; g.fillRect(x - 40, y + 58, 50, 8); g.fillStyle = '#e8c21e'; for (let i = 0; i < 4; i++) g.fillRect(x - 44 + i * 14, y + 30, 7, 28); g.fillStyle = '#d61f2c'; g.fillRect(x - 46, y + 30, 58, 5); },
    electric: (g, x, y) => { g.fillStyle = '#f2c400'; g.fillRect(x + 30, y - 10, 30, 40); g.fillStyle = '#222'; g.beginPath(); g.moveTo(x + 48, y - 4); g.lineTo(x + 40, y + 12); g.lineTo(x + 48, y + 12); g.lineTo(x + 42, y + 26); g.lineTo(x + 54, y + 8); g.lineTo(x + 46, y + 8); g.fill(); },
    lift: (g, x, y) => { g.strokeStyle = '#555'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 10, y - 60); g.lineTo(x + 10, y - 34); g.stroke(); g.fillStyle = '#9aa3ab'; g.fillRect(x - 14, y - 34, 48, 14); g.fillStyle = '#d61f2c'; g.beginPath(); g.arc(x + 10, y + 30, 26, 0, 7); g.lineWidth = 5; g.strokeStyle = '#d61f2c'; g.stroke(); g.beginPath(); g.moveTo(x - 8, y + 12); g.lineTo(x + 28, y + 48); g.stroke(); },
    fire: (g, x, y) => { g.fillStyle = '#ff5a1f'; g.beginPath(); g.moveTo(x + 40, y + 50); g.quadraticCurveTo(x + 20, y + 20, x + 44, y); g.quadraticCurveTo(x + 50, y + 24, x + 62, y + 14); g.quadraticCurveTo(x + 70, y + 40, x + 40, y + 50); g.fill(); g.fillStyle = '#d61f2c'; g.fillRect(x - 40, y + 20, 14, 34); },
    broom: (g, x, y) => { g.strokeStyle = '#8b5a2b'; g.lineWidth = 4; g.beginPath(); g.moveTo(x + 24, y - 6); g.lineTo(x + 40, y + 50); g.stroke(); g.fillStyle = '#d9a21b'; g.fillRect(x + 30, y + 48, 22, 10); },
    card: (g, x, y) => { g.fillStyle = '#fff'; g.strokeStyle = '#1d5fb8'; g.lineWidth = 3; g.fillRect(x + 28, y - 16, 40, 28); g.strokeRect(x + 28, y - 16, 40, 28); g.fillStyle = '#1d5fb8'; g.fillRect(x + 32, y - 10, 12, 14); g.fillRect(x + 48, y - 8, 16, 3); g.fillRect(x + 48, y, 14, 3); }
  };
  const cartoonPoster = (panels) => cv(512, 256, (g, w, h) => {
    g.fillStyle = '#fffaf0'; g.fillRect(0, 0, w, h); g.fillStyle = '#1d5fb8'; g.fillRect(0, 0, w, 34);
    g.fillStyle = '#fff'; g.font = `bold 21px ${FONTC}`; g.textAlign = 'center'; g.fillText('建筑施工安全操作动漫标语', w / 2, 24);
    panels.forEach((p, i) => {
      const x0 = 8 + i * 252, y0 = 42, pw = 244, ph = 206;
      g.fillStyle = p.bg; g.fillRect(x0, y0, pw, ph); g.strokeStyle = '#2b3a55'; g.lineWidth = 3; g.strokeRect(x0, y0, pw, ph);
      drawWorker(g, x0 + 80, y0 + 80, 1.3, p.w || {}); if (props[p.prop]) props[p.prop](g, x0 + 80, y0 + 80);
      g.fillStyle = '#d61f2c'; g.fillRect(x0, y0 + ph - 50, pw, 50);
      g.fillStyle = '#fff'; g.font = `bold 22px ${FONTC}`; g.textAlign = 'center'; g.fillText(p.t1, x0 + pw / 2, y0 + ph - 28); g.font = `bold 16px ${FONTC}`; g.fillText(p.t2, x0 + pw / 2, y0 + ph - 8);
    });
  });
  const POSTERS = [
    [{ bg: '#dff3ff', w: { thumb: true }, prop: 'helmet', t1: '进入现场 必戴安全帽', t2: '系紧下颏带' }, { bg: '#e8f8e6', w: { harness: true, armUp: true }, prop: 'harness', t1: '高处作业 必系安全带', t2: '高挂低用' }],
    [{ bg: '#fff3d6', w: { sad: true }, prop: 'hole', t1: '临边洞口 必须防护', t2: '防护设施严禁随意拆除' }, { bg: '#ffe5e5', w: { sad: true }, prop: 'lift', t1: '吊装作业 下方禁止站人', t2: '设警戒、专人指挥' }],
    [{ bg: '#fffbe0', w: {}, prop: 'electric', t1: '施工用电 一机一闸一漏', t2: '非电工严禁接线' }, { bg: '#ffe9dc', w: { sad: true }, prop: 'fire', t1: '动火作业 先审批', t2: '配灭火器、设看火人' }],
    [{ bg: '#e8f8e6', w: { thumb: true }, prop: 'broom', t1: '文明施工 工完场清', t2: '材料分类堆放' }, { bg: '#e7efff', w: { thumb: true }, prop: 'card', t1: '特种作业 持证上岗', t2: '实名登记、先教育后上岗' }]
  ];

  const M = {
    white: mat('pcslab', { color: 0xf5f5f3 }), wall: mat('pcw', { color: 0xe8e8e6 }), blue: mat('shedpost', { color: 0x3a8fdc }),
    yellow: mat('pipe', { color: 0xf2c230 }), black: mat('blackbox', { color: 0x1e1f22 }), cream: mat('block', { color: 0xf3dfc0 }),
    slat: new THREE.MeshStandardMaterial({ map: slatTex, roughness: .8 }), dash: new THREE.MeshBasicMaterial({ map: dashTex, transparent: true, alphaTest: .4, side: THREE.DoubleSide }),
    stub: new THREE.MeshBasicMaterial({ map: stubTex, transparent: true, alphaTest: .4, side: THREE.DoubleSide }),
    wood: new THREE.MeshStandardMaterial({ map: T.wood }), glass: mat('glassroof', { color: 0xcfe9f5, transparent: true, opacity: .45, roughness: .1 }),
    machine: mat('machB', { color: 0x6fb6ef }), dbox: mat('dbox', { color: 0xf0b323 }), gray: mat('gray', { color: 0x9aa0a4 }),
    rebar: mat('rebarB', { color: 0x1c1d1f, roughness: .5, metalness: .4 })
  };

  // ---------- 小构件 ----------
  // 堆场低矮黑白栏杆（沿边四周，留出口）
  const lowRail = (x1, z1, x2, z2, parent = gYard) => {
    const len = Math.hypot(x2 - x1, z2 - z1); if (len < .1) return;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, .22), M.dash.clone()); m.material.map = dashTex.clone(); m.material.map.needsUpdate = true; m.material.map.repeat.set(len / .6, 1);
    m.position.set((x1 + x2) / 2, .11, (z1 + z2) / 2); m.rotation.y = -Math.atan2(z2 - z1, x2 - x1); parent.add(m);
  };
  const yard = (x1, z1, x2, z2, gapSide = 'S') => {   // 三面围合，靠路一侧留口
    if (gapSide !== 'S') lowRail(x1, z2, x2, z2); else { lowRail(x1, z2, x1 + (x2 - x1) * .3, z2); lowRail(x2 - (x2 - x1) * .3, z2, x2, z2); }
    lowRail(x1, z1, x1, z2); lowRail(x2, z1, x2, z2);
  };
  const stubStrip = (len, x, y, z, rotY = 0, parent = gYard) => { const s = new THREE.Mesh(new THREE.PlaneGeometry(len, .1), M.stub); s.position.set(x, y + .05, z); s.rotation.y = rotY; parent.add(s); return s; };
  // 叠合板垛（带桁架钢筋）
  const slabStack = (x, z, w = 1.5, d = 1.1, n = 5, parent = gYard) => {
    for (let k = 0; k < n; k++) { box(w, .06, d, M.white, x, k * .1 + .04, z, parent); box(w - .1, .04, .06, M.black, x, k * .1, z - d / 2 + .1, parent); box(w - .1, .04, .06, M.black, x, k * .1, z + d / 2 - .1, parent); }
    for (let i = 0; i < 3; i++) { box(w - .1, .05, .04, M.rebar, x, n * .1 + .04, z - d / 3 + i * d / 3, parent); stubStrip(w - .1, x, n * .1 + .04, z - d / 3 + i * d / 3, 0, parent); }
  };
  // 插放架 + 预制墙板
  const wallRack = (x, z, len = 2.2, rotY = 0, parent = gYard) => {
    const g = new THREE.Group();
    box(len, .08, .5, M.blue, 0, 0, 0, g); box(len, .05, .9, mat('rackgnd', { color: 0x666b70 }), 0, 0, 0, g);
    for (let i = 0; i < 3; i++) { const b = box(.05, .7, .05, M.blue, -len / 2 + .2 + i * (len - .4) / 2, .05, .3, g); b.rotation.x = -.5; const c = b.clone(); c.position.z = -.3; c.rotation.x = .5; g.add(c); }
    [-.08, .08].forEach(o => { box(len - .2, .95, .06, M.wall, 0, .08, o, g); stubStrip(len - .2, 0, 1.03, o, 0, g); });
    g.position.set(x, 0, z); g.rotation.y = rotY; parent.add(g); return g;
  };
  // 叠合梁一组
  const beamGroup = (x, z, n = 6, len = 2.0, parent = gYard) => {
    for (let k = 0; k < n; k++) { const zz = z - (n - 1) * .14 + k * .28; box(len, .12, .12, M.white, x, .04, zz, parent); stubStrip(len - .1, x, .16, zz, 0, parent); box(.08, .04, .14, M.gray, x - len / 2 + .3, 0, zz, parent); box(.08, .04, .14, M.gray, x + len / 2 - .3, 0, zz, parent); }
  };
  const stairFlight = (x, z, rotY = 0, parent = gYard) => { const g = new THREE.Group(); for (let k = 0; k < 7; k++) box(.18, .08 + k * .06, 1.0, M.white, -.6 + k * .18, 0, 0, g); g.position.set(x, 0, z); g.rotation.y = rotY; parent.add(g); };
  const creamBlock = (x, z, w = .8, d = .55, h = .4, parent = gYard) => box(w, h, d, M.cream, x, 0, z, parent);
  const pallet = (x, z, w = 1.0, d = .7, parent = gYard) => box(w, .22, d, M.slat, x, 0, z, parent);
  const rebarBundle = (x, z, len = 2.4, rotY = 0, parent = gYard) => {   // 黑色钢筋 + 黄色支墩
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, len, 6), M.rebar); r.rotation.x = Math.PI / 2; r.position.set((i % 2) * .09 - .045, .2 + Math.floor(i / 2) * .08, 0); r.castShadow = true; g.add(r); }
    for (let k = 0; k < 4; k++) { box(.04, .22, .04, M.yellow, -.15, 0, -len / 2 + .2 + k * (len - .4) / 3, g); box(.04, .22, .04, M.yellow, .15, 0, -len / 2 + .2 + k * (len - .4) / 3, g); }
    g.position.set(x, 0, z); g.rotation.y = rotY; parent.add(g);
  };
  const pipeStack = (x, z, len = 2.0, parent = gYard) => {   // 黄色钢管垛（管沿 z 方向）
    const g = new THREE.Group();
    for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, len, 6), M.yellow); p.rotation.x = Math.PI / 2; p.position.set(-.3 + i * .12, .14 + r * .08, 0); g.add(p); }
    [-len / 2 + .2, 0, len / 2 - .2].forEach(zz => box(.9, .1, .08, M.yellow, 0, 0, zz, g));
    g.position.set(x, 0, z); parent.add(g);
  };
  const blackBoxes = (x, z, parent = gYard) => { pallet(x, z, 1.4, .95, parent); for (let i = 0; i < 6; i++) { box(.38, .32, .38, M.black, x - .45 + (i % 3) * .45, .22, z - .22 + Math.floor(i / 3) * .44, parent); box(.3, .02, .3, mat('boxin', { color: 0x6b4a33 }), x - .45 + (i % 3) * .45, .5, z - .22 + Math.floor(i / 3) * .44, parent); } };
  const cage = (x, z, w = 1.5, d = .9, h = .75, parent = gYard) => {   // 黄色材料笼
    const g = new THREE.Group();
    box(w - .08, h - .1, d - .08, mat('cagein', { color: 0xf3f3f3 }), 0, .02, 0, g);
    const bars = mat('cageY', { color: 0xf2c230 });
    for (let i = 0; i <= 6; i++) { box(.03, h, .03, bars, -w / 2 + i * w / 6, 0, d / 2, g); box(.03, h, .03, bars, -w / 2 + i * w / 6, 0, -d / 2, g); }
    for (let j = 0; j <= 3; j++) { box(w, .03, .03, bars, 0, j * h / 3, d / 2, g); box(w, .03, .03, bars, 0, j * h / 3, -d / 2, g); box(.03, .03, d, bars, -w / 2, j * h / 3, 0, g); box(.03, .03, d, bars, w / 2, j * h / 3, 0, g); }
    g.position.set(x, 0, z); parent.add(g);
  };
  const distBox = (x, z, parent = gYard) => { box(.32, .4, .14, M.dbox, x, .18, z, parent); box(.04, .2, .04, M.dbox, x - .12, 0, z, parent); box(.04, .2, .04, M.dbox, x + .12, 0, z, parent); };
  // 绿网覆盖堆（裸土/砂石覆盖）
  const coveredPile = (x, z, w, d, parent = gYard) => {
    const t = meshTex.clone(); t.needsUpdate = true; t.repeat.set(w, d);
    const top = new THREE.Mesh(new THREE.BoxGeometry(w - .2, .35, d - .2), [M.black, M.black, new THREE.MeshStandardMaterial({ map: t }), M.black, M.black, M.black]); top.position.set(x, .2, z); parent.add(top);
    const hz = hazardTex.clone(); hz.needsUpdate = true; hz.repeat.set(w * 2, 1);
    const hm = new THREE.MeshBasicMaterial({ map: hz });
    [[0, d / 2, w, 0], [0, -d / 2, w, Math.PI], [w / 2, 0, d, Math.PI / 2], [-w / 2, 0, d, -Math.PI / 2]].forEach(([dx, dz, l, r]) => { const p = new THREE.Mesh(new THREE.BoxGeometry(l, .32, .08), [hm, hm, hm, hm, hm, hm]); p.position.set(x + dx, .16, z + dz); p.rotation.y = r; parent.add(p); });
  };
  // 加工棚：蓝色斜撑柱 + 黄黑警示带 + 木纹/半透明屋面 + 内部设备
  const workShed = (x, z, w, d, label, endText, opt = {}) => {
    const g = new THREE.Group(); const h = 1.3;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { box(.07, h, .07, M.blue, a * (w / 2 - .05), 0, b * (d / 2 - .05), g); const br = box(.04, .45, .04, M.blue, a * (w / 2 - .18), h - .4, b * (d / 2 - .05), g); br.rotation.z = a * .6; });
    if (opt.half) { box(w * .55, .07, d, M.wood, -w * .225, h, 0, g); box(w * .45, .03, d, M.glass, w * .275, h + .02, 0, g); }
    else box(w, .07, d, M.wood, 0, h, 0, g);
    const band = (txt, len, px, pz, ry) => {
      const s = signTex(txt || ' ', 'band'); const p = new THREE.Mesh(new THREE.BoxGeometry(len, .34, .05), new THREE.MeshBasicMaterial({ map: s.tex })); p.position.set(px, h + .1, pz); p.rotation.y = ry; g.add(p);
    };
    band(label, w, 0, d / 2, 0); band(label, w, 0, -d / 2, Math.PI);
    band(endText || '安全生产 人人有责', d, w / 2, 0, Math.PI / 2); band(endText || '防微杜渐 警钟长鸣', d, -w / 2, 0, -Math.PI / 2);
    // 内部：工作台、蓝色机械、黄色配电箱
    box(w * .45, .3, .38, mat('bench', { color: 0xb5643a }), -w * .15, 0, -d * .15, g);
    for (let i = 0; i < (opt.machines || 2); i++) box(.42, .32, .35, M.machine, w * .1 + i * .55, 0, d * .18, g);
    distBox(w / 2 - .35, -d / 2 + .3, g);
    g.position.set(x, 0, z); g.rotation.y = opt.rotY || 0; gYard.add(g); return g;
  };
  const gableBox = (x, z, w, d, h, color, label, rotY = 0, parent = gYard) => {   // 蓝色坡屋面小房（养护室、门卫）
    const g = new THREE.Group();
    box(w, h, d, mat('gbwall', { color: 0xf3f6f8 }), 0, 0, 0, g);
    const sh = new THREE.Shape(); sh.moveTo(-d / 2 - .1, 0); sh.lineTo(d / 2 + .1, 0); sh.lineTo(0, .35); sh.lineTo(-d / 2 - .1, 0);
    const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: w + .2, bevelEnabled: false }), new THREE.MeshStandardMaterial({ map: T.roof, color }));
    roof.rotation.y = Math.PI / 2; roof.position.set(-w / 2 - .1, h, 0); g.add(roof);
    if (label) { const s = signTex(label); const p = new THREE.Mesh(new THREE.PlaneGeometry(.3 * s.aspect, .3), new THREE.MeshBasicMaterial({ map: s.tex })); p.rotation.x = -1.2; p.position.set(0, h + .22, d / 4); g.add(p); }
    g.position.set(x, 0, z); g.rotation.y = rotY; parent.add(g); return g;
  };
  // 车辆：汽车吊、混凝土罐车
  const truckCrane = (x, z, rotY) => {
    const g = new THREE.Group();
    box(.8, .35, 2.2, mat('tcBody', { color: 0x4d5257 }), 0, .18, 0, g); box(.8, .5, .6, mat('tcCab', { color: 0xd39b2a }), 0, .3, .85, g);
    const arm = box(.25, .25, 2.0, mat('tcArm', { color: 0xc9cdd1, metalness: .5 }), 0, .65, -.3, g); arm.rotation.x = .35;
    [-.7, .7].forEach(zz => [-.42, .42].forEach(xx => { const w = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .12, 10), M.black); w.rotation.z = Math.PI / 2; w.position.set(xx, .16, zz); g.add(w); }));
    g.position.set(x, 0, z); g.rotation.y = rotY; gWork.add(g);
  };
  const mixer = (x, z, rotY) => {
    const g = new THREE.Group();
    box(.8, .3, 2.0, mat('mxBody', { color: 0x3f4347 }), 0, .2, 0, g); box(.8, .5, .55, mat('tcCab'), 0, .3, .8, g);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(.32, .22, 1.2, 12), mat('drum', { color: 0xd9dcdf, metalness: .5, roughness: .3 })); drum.rotation.x = Math.PI / 2 - .2; drum.position.set(0, .78, -.25); drum.castShadow = true; g.add(drum);
    [-.6, .6].forEach(zz => [-.42, .42].forEach(xx => { const w = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, .12, 10), M.black); w.rotation.z = Math.PI / 2; w.position.set(xx, .15, zz); g.add(w); }));
    g.position.set(x, 0, z); g.rotation.y = rotY; gWork.add(g);
  };
  // 场内灯杆（带彩旗）
  const flagLamp = (x, z, parent = gYard) => {
    box(.06, 2.0, .06, mat('lamp'), x, 0, z, parent); box(.5, .05, .06, mat('lamp'), x + .25, 1.95, z, parent);
    box(.24, .5, .02, mat('flag', { color: 0x2f86d6 }), x + .14, 1.2, z, parent); box(.24, .1, .021, mat('flagR', { color: 0xd23b2b }), x + .14, 1.4, z, parent);
  };

  // ================= 北侧（沿北围挡，自西向东） =================
  const zc = -22.6, z1 = -24.6, z2 = -20.6;
  // 1 西北角：智能水电监测（加工棚 + 标牌）
  workShed(-28.8, zc, 3.2, 3.2, '水 电 加 工 棚', '安全生产 人人有责', { machines: 2 });
  plaque('智能水电监测', -26.9, -20.9, 1.25, .36, 0, gSign);
  // 2 叠合板吊装 #1
  yard(-26.6, z1, -22.4, z2);
  slabStack(-25.5, -23.6); slabStack(-23.5, -23.6); slabStack(-25.5, -21.9, 1.5, 1.1, 4); slabStack(-23.5, -21.9, 1.5, 1.1, 4);
  // 3 预制剪力墙吊装（插放架 3 排）
  yard(-22, z1, -16.8, z2);
  wallRack(-20.8, -23.9, 2.2); wallRack(-18.2, -23.9, 2.2); wallRack(-20.8, -22.2, 2.2); wallRack(-18.2, -22.2, 2.2);
  creamBlock(-17.3, -21.3, .7, .5, .45); pallet(-17.3, -24.1, .8, .6);
  // 4 叠合板吊装 #2（含构件区拱形牌）
  yard(-16.4, z1, -12.2, z2);
  slabStack(-15.3, -23.6); slabStack(-13.3, -23.6); slabStack(-15.3, -21.9, 1.5, 1.1, 4); slabStack(-13.3, -21.9, 1.5, 1.1, 4);
  wallRack(-12.6, -22.8, 2.4, Math.PI / 2);
  // 5 叠合梁吊装（4 组）
  yard(-11.8, z1, -6.2, z2);
  beamGroup(-10.3, -23.6); beamGroup(-7.7, -23.6); beamGroup(-10.3, -21.7); beamGroup(-7.7, -21.7);
  // 6 装配式楼梯吊装
  yard(-5.8, z1, -2.4, z2);
  stairFlight(-4.1, -24.0); stairFlight(-4.1, -22.7); stairFlight(-4.1, -21.4);
  // 7 木工加工棚
  workShed(-0.1, zc, 3.6, 3.4, '木 工 加 工 棚', '防微杜渐 警钟长鸣', { machines: 1 });
  for (let i = 0; i < 2; i++) creamBlock(2.0 + i * .02, -24 + i * 1.2, .45, .9, .5);
  // 8 烟感报警（木料、砌块堆场）
  yard(2.6, z1, 5.8, z2);
  for (let i = 0; i < 8; i++) creamBlock(3.3 + (i % 2) * 1.0, -24.1 + Math.floor(i / 2) * .75, .75, .5, .38);
  pallet(3.6, -21.3, 1.1, .6); pallet(5.0, -21.3, 1.1, .6);
  box(.12, .08, .12, mat('smoke', { color: 0xffffff, emissive: 0x552222 }), 5.6, 1.0, -24.4, gYard);
  // 9 钢筋加工棚（半透明屋面）
  workShed(7.9, zc, 3.4, 3.4, '钢 筋 加 工 棚', '安全生产 人人有责', { half: true, machines: 3 });
  // 10 钢筋 AI 盘点管理（钢筋 6 捆 + 汽车吊）
  rebarBundle(10.6, -22.6, 3.0); rebarBundle(11.3, -22.6, 3.0); rebarBundle(12.0, -22.6, 3.0);
  rebarBundle(13.2, -22.6, 3.0); rebarBundle(13.9, -22.6, 3.0); rebarBundle(14.6, -22.6, 3.0);
  // 11 加工棚（端头「防微杜渐 警钟长鸣」）
  workShed(17.2, zc, 3.2, 3.4, '加 工 棚', '防微杜渐 警钟长鸣', { machines: 2 });
  // 12 绿网覆盖
  coveredPile(20.6, -22.7, 2.6, 3.4);
  // 13 养护室 · 水泵房 · 三级污水沉淀池
  gableBox(23.5, -23.5, 2.0, 1.6, .7, 0x5aaee8, '养护室');
  box(1.0, .65, 1.0, mat('pumpRoom', { color: 0xf5f5f5 }), 25.4, 0, -23.5, gYard);
  for (let i = 0; i < 3; i++) { box(.9, .18, .9, mat('poolrim', { color: 0xe7f1ef }), 24.0 + i * 1.0, 0, -21.4, gYard); const w = new THREE.Mesh(new THREE.PlaneGeometry(.78, .78), new THREE.MeshStandardMaterial({ map: waterTex, roughness: .1 })); w.rotation.x = -Math.PI / 2; w.position.set(24.0 + i * 1.0, .19, -21.4); gYard.add(w); }
  // 14 东北门：门卫 + 道闸 + 洗车台
  gableBox(29.4, -21.4, 2.2, 1.6, .8, 0x5aaee8, '门卫');
  box(2.2, .05, 1.8, mat('wash', { color: 0x8b9aa1 }), 26.6, 0, -18, gYard);
  for (let i = 0; i < 7; i++) box(.06, .04, 1.6, mat('washbar', { color: 0x4a5257 }), 25.8 + i * .26, .05, -18, gYard);
  box(.14, .9, .14, mat('gatepostW', { color: 0xf5f5f5 }), 28.2, 0, -19.4, gYard); box(.18, .55, .18, M.black, 28.5, 0, -19.4, gYard);
  const arm = box(2.6, .05, .05, mat('barrier', { color: 0xd23b2b }), 29.8, .5, -19.3, gYard); arm.rotation.y = -Math.PI / 2; arm.position.set(28.5, .5, -18.0);
  mixer(26.6, -18, -Math.PI / 2);
  // 场内车辆
  truckCrane(12.6, -19.0, Math.PI / 2); mixer(4, -18.6, Math.PI / 2); mixer(-14, -18.2, -Math.PI / 2);
  [-22, -10, 2, 14, 24].forEach(x => flagLamp(x, -20.3));
  plaque('构件运输与堆放', -1.0, -19.6, 1.2, .38, 0, gSign);
  addWorkers(-26.4, -24.4, -2.6, -20.9, 26); addWorkers(2.7, -24.4, 15, -20.9, 16);

  // ================= 东侧（沿东围挡，自北向南） =================
  coveredPile(29.2, -14.2, 3.0, 2.6);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) pipeStack(28.2 + i * 1.05, -11.4 + j * 2.2, 1.8);
  addWorkers(27.8, -12.4, 30.6, -3.4, 10);
  boardHouse(9.2, 1.8, 1, gYard, 29.7, 2.2, Math.PI / 2, '危险品仓库');
  gableBox(29.4, 8.9, 1.6, 1.4, .8, 0x5aaee8, '');
  [-12.6, -6, 0.8].forEach(z => flagLamp(27.7, z));
  plaque('危险品仓库', 28.4, -2.9, 1.2, .34, -Math.PI / 2, gSign);

  // ================= 西侧（沿西围挡，自北向南） =================
  const xc = -28.7;
  // 配电房 + 钢筋堆
  box(1.6, .9, 1.2, mat('elecRoom', { color: 0xf5f7f8 }), -29.6, 0, -19.6, gYard); box(.35, .55, .02, mat('door', { color: 0x2f6fb8 }), -29.6, 0, -18.99, gYard);
  rebarBundle(-27.9, -19.6, 1.8, Math.PI / 2); rebarBundle(-27.9, -19.2, 1.8, Math.PI / 2); rebarBundle(-27.9, -20.0, 1.8, Math.PI / 2);
  workShed(xc, -16.1, 3.4, 3.4, '钢 筋 加 工 棚', '防微杜渐 警钟长鸣', { half: true, machines: 3, rotY: Math.PI / 2 });
  blackBoxes(xc - .6, -12.8); blackBoxes(xc + 1.0, -12.8);
  workShed(xc, -9.4, 3.4, 3.4, '水 电 加 工 棚', '防微杜渐 警钟长鸣', { half: true, machines: 2, rotY: Math.PI / 2 });
  for (let i = 0; i < 6; i++) cage(xc - .8 + (i % 2) * 1.6, -6.6 + Math.floor(i / 2) * 1.15);
  boardHouse(4.6, 1.8, 1, gYard, xc + .4, -0.5, Math.PI / 2, '物料仓库');
  const lb = signTex('磅房'); const lbp = new THREE.Mesh(new THREE.PlaneGeometry(.3 * lb.aspect, .3), new THREE.MeshBasicMaterial({ map: lb.tex })); lbp.position.set(-28.0, 1.3, 1.2); lbp.rotation.set(-1.15, Math.PI / 2, 0, 'YXZ'); gSign.add(lbp);
  // 地磅（格栅）+ 道闸
  const grid = cv(64, 64, (g, w, h) => { g.fillStyle = '#8c9396'; g.fillRect(0, 0, w, h); g.strokeStyle = '#5c6366'; g.lineWidth = 2; for (let i = 0; i < w; i += 6) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); } });
  const sc = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.4), new THREE.MeshStandardMaterial({ map: grid })); sc.rotation.x = -Math.PI / 2; sc.position.set(-25.2, .03, 3.7); gYard.add(sc);
  box(.3, .85, .3, mat('brick', { color: 0x8e3b2c }), -26.6, 0, 5.4, gYard); box(.22, .5, .4, M.black, -26.6, 0, 4.9, gYard);
  [-22, -14, -6, 0.5].forEach(z => flagLamp(-25.9, z));
  addWorkers(-30.4, -20.5, -27.2, -4, 10);

  // ================= 施工区南侧体验/样板/机管带（黑色栏杆围合） =================
  const railM = () => { const t = T.rail.clone(); t.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: .4, side: THREE.DoubleSide }); };
  const rail = (x1, x2, z) => { const len = x2 - x1; const m = new THREE.Mesh(new THREE.PlaneGeometry(len, .45), railM()); m.material.map.repeat.set(len, 1); m.position.set((x1 + x2) / 2, .24, z); gEdu.add(m); };
  rail(-14.4, -11.4, 3.5); rail(-10.6, -1.4, 3.5); rail(-0.6, 8.6, 3.5); rail(9.4, 19.6, 3.5);
  [[-10.6, -1.4], [-0.6, 8.6], [9.4, 19.6]].forEach(([a, b]) => { const s = new THREE.Mesh(new THREE.PlaneGeometry(4.5, .45), railM()); s.material.map.repeat.set(4.5, 1); s.rotation.y = Math.PI / 2; s.position.set(a, .24, 5.75); gEdu.add(s); const s2 = s.clone(); s2.position.x = b; gEdu.add(s2); });
  // VR 安全教育
  const vr = new THREE.Group(); box(1.5, .1, 1.6, M.blue, 0, 1.4, 0, vr); box(.12, 1.45, 1.6, M.blue, -.75, 0, 0, vr); box(1.1, .9, 1.0, mat('vrbox', { color: 0xf5f7f8 }), .1, 0, -.1, vr);
  box(1.5, .1, .1, M.blue, 0, 1.3, .8, vr); vr.position.set(-12.6, 0, 5.4); gEdu.add(vr);
  // 安全体验区
  const hat = new THREE.Group(); box(1.4, .8, .6, M.blue, 0, 0, 0, hat); for (let i = 0; i < 3; i++) box(.36, .62, .05, mat('hatbay', { color: 0x1d5fa8 }), -.45 + i * .45, .08, .31, hat);
  hat.position.set(-9.3, 0, 4.2); gEdu.add(hat);
  const tower = new THREE.Group(); box(1.0, 1.9, 1.0, mat('towerW', { color: 0xf4f6f8 }), 0, 0, 0, tower); box(1.05, .06, 1.05, M.blue, 0, .9, 0, tower);
  for (let i = 0; i < 6; i++) box(.4, .04, .12, mat('ladder', { color: 0x5aaee8 }), -.7, i * .3 + .1, .3, tower);
  box(.06, 1.9, .06, mat('ladder'), -.9, 0, .3, tower); box(.06, 1.9, .06, mat('ladder'), -.5, 0, .3, tower);
  gableBox(0, 0, 1.2, 1.2, 0, 0x5aaee8, '', 0, tower).position.y = 1.9;
  tower.position.set(-5.3, 0, 4.4); gEdu.add(tower);
  box(1.1, .55, .06, mat('redboard', { color: 0xc0392b }), -7.6, .25, 4.0, gEdu); box(.05, .3, .05, M.gray, -8.0, 0, 4.0, gEdu); box(.05, .3, .05, M.gray, -7.2, 0, 4.0, gEdu);
  const belt = new THREE.Group(); [[-.35, -.3], [.35, -.3], [-.35, .3], [.35, .3]].forEach(([a, b]) => box(.05, 1.1, .05, M.yellow, a, 0, b, belt)); box(.8, .05, .7, M.yellow, 0, 1.1, 0, belt); box(.8, .05, .05, M.yellow, 0, .55, .3, belt); belt.position.set(-8.8, 0, 6.6); gEdu.add(belt);
  const edge = new THREE.Group(); for (let i = 0; i < 5; i++) box(.05, .8, .05, M.yellow, -1 + i * .5, 0, 0, edge); box(2.05, .05, .05, M.yellow, 0, .8, 0, edge); box(2.05, .05, .05, M.yellow, 0, .4, 0, edge);
  box(2.0, .35, .02, mat('greennet', { color: 0x2f8a4a }), 0, .3, .01, edge); edge.position.set(-6.4, 0, 6.8); gEdu.add(edge);
  box(.9, .7, .7, M.blue, -3.0, 0, 6.6, gEdu); box(1.6, .9, .1, mat('expR', { color: 0xc0392b }), -2.4, 0, 4.4, gEdu);
  addWorkers(-10.2, 3.9, -1.8, 7.6, 6);
  // 质量样板区
  box(2.4, .9, .25, mat('masonry', { color: 0xa8423a }), 1.4, 0, 6.9, gEdu);
  const fw = new THREE.Group(); for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) box(.05, 1.0, .05, M.yellow, -.9 + i * .6, 0, -.5 + j * .5, fw);
  for (let k = 0; k < 4; k++) { box(1.9, .05, .05, M.yellow, 0, .25 + k * .25, -.5, fw); box(1.9, .05, .05, M.yellow, 0, .25 + k * .25, .5, fw); }
  box(1.9, .5, 1.0, mat('formW', { color: 0xf4f4f2 }), 0, .55, 0, fw); fw.position.set(5.0, 0, 5.3); gEdu.add(fw);
  const st = new THREE.Group(); for (let k = 0; k < 7; k++) box(.8, .12 + k * .12, .25, M.white, 0, 0, -.8 + k * .25, st); st.position.set(2.0, 0, 4.9); gEdu.add(st);
  box(1.6, 1.0, .1, M.wall, 7.2, 0, 7.4, gEdu);
  addWorkers(0, 3.9, 8, 7.6, 4);
  // 机管大师
  [9.4, 12, 14.6, 17.2, 19.6].forEach(x => { box(.28, .8, .28, mat('brick', { color: 0x8e3b2c }), x, 0, 3.5, gEdu); });
  const exc = (x, z, c, rot) => { const g = new THREE.Group(); box(.7, .25, 1.0, M.black, 0, 0, 0, g); box(.65, .45, .65, mat('mc' + c, { color: c }), 0, .25, .05, g); const a = box(.1, .9, .1, mat('mc' + c), 0, .4, -.5, g); a.rotation.x = .6; g.position.set(x, 0, z); g.rotation.y = rot; gWork.add(g); };
  exc(10.6, 5.6, 0xf4f4f4, .3); exc(13.0, 6.0, 0x3a8fdc, 0); exc(15.0, 5.4, 0xc0392b, -.4);
  const roller = new THREE.Group(); box(.8, .5, .9, M.blue, 0, .15, 0, roller); const dr = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .9, 12), mat('drum')); dr.rotation.z = Math.PI / 2; dr.position.set(0, .3, -.7); roller.add(dr); roller.position.set(16.8, 0, 6.2); gWork.add(roller);
  gableBox(18.6, 6.4, 1.6, 1.6, 1.0, 0x5aaee8, '', 0, gEdu);
  addWorkers(9.8, 4, 18, 7.5, 4);
  // 预制构件展示（栏杆外侧，立板 + 地面标签）
  const pcs = ['预制梁', '预制楼梯', '预制阳台', '预制护角板(PCF板)', '预制内墙板', '叠合楼板', '预制外墙板', '预制飘窗'];
  pcs.forEach((n, i) => {
    const x = -1.5 + i * 2.6;
    if (n === '预制梁') { box(1.6, .22, .22, M.white, x, 0, 8.7, gEdu); stubStrip(1.5, x, .22, 8.7, 0, gEdu); }
    else if (n === '预制楼梯') stairFlight(x, 8.9, Math.PI / 2, gEdu);
    else if (n === '预制阳台') { box(1.2, .12, .8, M.white, x, 0, 8.9, gEdu); box(1.2, .4, .08, M.white, x, .12, 9.28, gEdu); }
    else if (n === '叠合楼板') { box(.08, 1.1, 1.1, M.wall, x, 0, 8.9, gEdu); for (let k = 0; k < 3; k++) stubStrip(1.0, x + .05, .25 + k * .3, 8.9, Math.PI / 2, gEdu); }
    else if (n === '预制飘窗') { box(1.2, 1.0, .5, M.wall, x, 0, 8.9, gEdu); box(.7, .5, .02, mat('win', { color: 0x4b6a85 }), x, .25, 9.16, gEdu); }
    else { box(1.1, 1.1, .1, M.wall, x, 0, 8.7, gEdu); stubStrip(1.0, x, 1.1, 8.7, 0, gEdu); }
    const s = signTex(n); const p = new THREE.Mesh(new THREE.PlaneGeometry(.26 * s.aspect, .26), new THREE.MeshBasicMaterial({ map: s.tex })); p.rotation.x = -Math.PI / 2; p.position.set(x, .03, 9.95); gSign.add(p);
  });

  // 北侧「堆场加工区」椭圆拱牌（照片 15，标牌文字经老师确认）
  archSign('堆场加工区', -1.5, -20.2, 0, gSign, 3.2);

  // ================= 办公区：云平台、宣传栏、二维码、旗杆 =================
  plaque('智慧工地云平台', -25, 22.8, 3.3, .46, 0, gSign);
  box(.04, 2.6, .04, mat('flagpole', { color: 0xdddddd }), -23.4, 0, 20.9, gLive); box(.5, .32, .02, mat('redflag', { color: 0xd8262b }), -23.15, 2.2, 20.9, gLive);
  box(1.4, .03, .9, mat('lawn', { color: 0x7ab648 }), -23.2, 0, 19.0, gLive); box(1.0, .03, .7, mat('lawn'), -21.2, 0, 18.4, gLive);
  const shrub = new THREE.Mesh(new THREE.IcosahedronGeometry(.35, 0), mat('crown')); shrub.position.set(-23.2, .35, 19.0); gLive.add(shrub);
  // 宣传栏（建筑施工安全操作动漫标语 等）
  POSTERS.forEach((pp, i) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.7, .85, .06), [M.blue, M.blue, M.blue, M.blue, new THREE.MeshBasicMaterial({ map: cartoonPoster(pp) }), M.blue]); p.name = '安全动漫海报';
    p.position.set(-19.2, .62, 11.2 + i * 1.85); p.rotation.y = -Math.PI / 2; gLive.add(p); box(.04, .2, .04, M.gray, -19.2, 0, 11.2 + i * 1.85, gLive);
  });
  box(.25, 1.0, .25, mat('qrpost', { color: 0xf2f2f2 }), -19.3, 0, 18.9, gLive);
  plaque('二维码应用', -19.3, 18.9, 1.35, .32, -Math.PI / 2, gSign);

  // ================= 生活区南侧围挡：长雨棚 / 车棚 =================
  const canopy = (x, z, w, d) => { const g = new THREE.Group(); for (let i = 0; i <= Math.round(w / 1.5); i++) { box(.05, .9, .05, M.blue, -w / 2 + i * w / Math.round(w / 1.5), 0, -d / 2 + .05, g); box(.05, .9, .05, M.blue, -w / 2 + i * w / Math.round(w / 1.5), 0, d / 2 - .05, g); } const r = box(w, .06, d + .1, new THREE.MeshStandardMaterial({ map: T.roof }), 0, .9, 0, g); g.position.set(x, 0, z); gLive.add(g); };
  canopy(13, 24.2, 24, .9); canopy(24.4, 11.7, 6.0, .9);

  return workers;
}
