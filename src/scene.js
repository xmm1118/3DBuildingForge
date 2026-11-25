// 沙盘程序化建模：所有构件按 layers 分组，便于开关与后续阶段动画
import * as THREE from 'three';
import { buildPerimeter } from './perimeter.js';

// ---------- 工具 ----------
let seed = 7;
export const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const M = {};
function mat(key, opts) {
  if (!M[key]) { M[key] = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.8, metalness: 0 }, opts)); M[key].name = key; }
  return M[key];
}
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
function box(w, h, d, m, x = 0, y = 0, z = 0, parent) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y + h / 2, z); o.castShadow = true; o.receiveShadow = true;
  if (parent) parent.add(o); return o;
}
const FONT = '"Noto Sans CJK SC","PingFang SC","Microsoft YaHei",sans-serif';

// ---------- 贴图 ----------
const T = {};
function textures() {
  T.grass = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#6fae3a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 3000; i++) { g.fillStyle = `hsl(${80 + rnd() * 30},${45 + rnd() * 20}%,${30 + rnd() * 25}%)`; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
  }, [20, 3]);
  T.concrete = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#c8cbcc'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) { const v = 180 + rnd() * 40; g.fillStyle = `rgb(${v},${v + 2},${v + 4})`; g.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); }
  }, [16, 12]);
  T.asphalt = canvasTex(64, 512, (g, w, h) => {
    g.fillStyle = '#5b5e62'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { const v = 70 + rnd() * 40; g.fillStyle = `rgb(${v},${v},${v + 4})`; g.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); }
    g.fillStyle = '#f2f2f2'; for (let y = 0; y < h; y += 64) g.fillRect(w / 2 - 1.5, y, 3, 32);
  }, [1, 8]);
  // 绿色安全网 + 黄色脚手架 + 白色剪刀撑
  T.net = (bays, floors, banners) => canvasTex(512, 384, (g, w, h) => {
    g.fillStyle = '#1f5e3a'; g.fillRect(0, 0, w, h);
    g.globalAlpha = .35; g.fillStyle = '#2d7a4c'; for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 2); g.globalAlpha = 1;
    g.strokeStyle = '#f2c230'; g.lineWidth = 4;
    for (let i = 0; i <= floors * 2; i++) { const y = h - i * h / (floors * 2); g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    for (let i = 0; i <= bays * 2; i++) { const x = i * w / (bays * 2); g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 2.5;
    for (let i = 0; i < bays; i += 2) { const x0 = i * w / bays, x1 = (i + 2) * w / bays; g.beginPath(); g.moveTo(x0, h); g.lineTo(x1, 0); g.moveTo(x1, h); g.lineTo(x0, 0); g.stroke(); }
    g.fillStyle = '#e8c21e'; g.fillRect(0, 0, w, 10); // 顶部黄黑踢脚
    (banners || []).forEach(b => {
      g.fillStyle = '#d0262b'; g.fillRect(b.x * w, b.y * h, b.w * w, 22);
      g.fillStyle = '#fff'; g.font = `bold 15px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(b.t, (b.x + b.w / 2) * w, b.y * h + 11);
    });
  });
  // 蓝色全钢爬架（冲孔板）
  T.climb = (cols, signs) => canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#3d9ee6'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(20,70,130,.45)';
    for (let y = 6; y < h; y += 10) for (let x = 5 + ((y / 10) % 2) * 5; x < w; x += 10) { g.beginPath(); g.arc(x, y, 2.2, 0, 7); g.fill(); }
    g.fillStyle = '#6fbaf0'; for (let i = 0; i <= cols; i++) g.fillRect(i * w / cols - 3, 0, 6, h);
    g.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 1; i < 6; i++) g.fillRect(0, i * h / 6 - 1, w, 2);
    (signs || []).forEach(s => {
      g.fillStyle = '#c4262b'; g.fillRect(s.x * w, s.y * h, s.w * w, 26);
      g.fillStyle = '#fff'; g.font = `bold 15px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(s.t, (s.x + s.w / 2) * w, s.y * h + 13);
    });
  });
  T.frame = (bays, floors) => canvasTex(512, 256, (g, w, h) => {   // 裸露混凝土框架立面
    g.fillStyle = '#b9bcbd'; g.fillRect(0, 0, w, h);
    const bw = w / bays, fh = h / floors;
    for (let i = 0; i < bays; i++) for (let j = 0; j < floors; j++) {
      g.fillStyle = '#4b5258'; g.fillRect(i * bw + bw * .14, j * fh + fh * .2, bw * .72, fh * .62);
      g.fillStyle = '#6c757c'; g.fillRect(i * bw + bw * .14, j * fh + fh * .2, bw * .72, fh * .1);
    }
  });
  T.board = (rows, cols, roofBand) => canvasTex(512, 128, (g, w, h) => {   // 板房墙面
    g.fillStyle = '#f4f6f7'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2f86d6'; g.fillRect(0, 0, w, 7); g.fillRect(0, h - 6, w, 6); if (rows > 1) g.fillRect(0, h / 2 - 3, w, 6);
    for (let r = 0; r < rows; r++) for (let i = 0; i < cols; i++) {
      const x = (i + .5) * w / cols, y = (r + .5) * h / rows;
      if (i % 3 === 1) { g.fillStyle = '#2b5f9c'; g.fillRect(x - 6, y - 14, 12, 28); }
      else { g.fillStyle = '#7d93a8'; g.fillRect(x - 11, y - 8, 22, 14); g.fillStyle = '#c6d6e4'; g.fillRect(x - 10, y - 7, 9, 12); }
    }
  });
  T.roof = canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#4aa5ea'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2f8bd6'; for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 3, h);
  }, [6, 1]);
  T.wood = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#d9b98c'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 120; i++) { g.strokeStyle = `rgba(140,95,50,${.1 + rnd() * .25})`; g.lineWidth = 1 + rnd() * 2; g.beginPath(); const y = rnd() * h; g.moveTo(0, y); g.bezierCurveTo(w * .3, y + rnd() * 8 - 4, w * .7, y + rnd() * 8 - 4, w, y + rnd() * 6 - 3); g.stroke(); }
  });
  T.fence = canvasTex(256, 32, (g, w, h) => {   // 蓝白围挡
    g.fillStyle = '#e9f2f5'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#9fd0c8'; g.fillRect(0, 6, w, h - 12);
    g.fillStyle = '#2f86d6'; g.fillRect(0, 0, w, 5); g.fillRect(0, h - 4, w, 4);
    for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 4, h);
  }, [30, 1]);
  T.rail = canvasTex(128, 32, (g, w, h) => {   // 黑色铁艺栏杆
    g.clearRect(0, 0, w, h); g.fillStyle = '#1d1f22';
    g.fillRect(0, 3, w, 3); g.fillRect(0, h - 6, w, 3);
    for (let x = 2; x < w; x += 6) g.fillRect(x, 0, 2, h - 3);
  }, [40, 1]);
  T.lattice = canvasTex(64, 64, (g, w, h) => {   // 塔吊桁架
    g.clearRect(0, 0, w, h); g.strokeStyle = '#f2c400'; g.lineWidth = 6;
    g.strokeRect(3, 3, w - 6, h - 6); g.lineWidth = 4; g.beginPath(); g.moveTo(0, h); g.lineTo(w, 0); g.stroke();
  });
  T.formwork = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#8a5a3c'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#5f3c27'; g.lineWidth = 2;
    for (let i = 0; i < w; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
  }, [2, 1]);
  T.court = canvasTex(256, 192, (g, w, h) => {
    g.fillStyle = '#3f8a5a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#b4424f'; g.fillRect(14, 14, w - 28, h - 28);
    g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeRect(14, 14, w - 28, h - 28);
    g.beginPath(); g.moveTo(w / 2, 14); g.lineTo(w / 2, h - 14); g.stroke();
    g.beginPath(); g.arc(w / 2, h / 2, 22, 0, 7); g.stroke();
    g.fillStyle = '#3f8a5a'; g.beginPath(); g.arc(14, h / 2, 46, -1.57, 1.57); g.fill(); g.stroke();
    g.beginPath(); g.arc(w - 14, h / 2, 46, 1.57, 4.71); g.fill(); g.stroke();
  });
  T.soil = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#c98a45'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${120 + rnd() * 60},${70 + rnd() * 30},30,.5)`; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
  }, [3, 3]);
}

// 文字标牌贴图（仿沙盘灰底白字牌）
function signTex(text, style = 'plaque') {
  const fs = 44, pad = 22;
  const c = document.createElement('canvas'); const g = c.getContext('2d');
  g.font = `bold ${fs}px ${FONT}`; const tw = g.measureText(text).width;
  c.width = Math.ceil(tw + pad * 2); c.height = fs + pad * 1.4;
  const G = c.getContext('2d');
  if (style === 'plaque') {
    G.fillStyle = '#f4f4f4'; G.fillRect(0, 0, c.width, c.height);
    G.fillStyle = '#4a4d52'; G.fillRect(5, 5, c.width - 10, c.height - 10);
    G.fillStyle = '#fff';
  } else if (style === 'arch') {
    G.fillStyle = 'rgba(255,255,255,.55)'; G.beginPath(); G.ellipse(c.width / 2, c.height / 2, c.width / 2 - 2, c.height / 2 - 2, 0, 0, 7); G.fill();
    G.strokeStyle = 'rgba(200,150,150,.9)'; G.lineWidth = 4; G.stroke(); G.fillStyle = '#ffffff';
    G.shadowColor = 'rgba(0,0,0,.45)'; G.shadowBlur = 6;
  } else if (style === 'gate') {
    G.fillStyle = '#2b6fc0'; G.fillRect(0, 0, c.width, c.height); G.fillStyle = '#fff';
  } else if (style === 'band') {
    G.fillStyle = '#2f86d6'; G.fillRect(0, 0, c.width, c.height);
    G.fillStyle = '#f1c40f'; for (let x = -c.height; x < c.width; x += 28) { G.beginPath(); G.moveTo(x, 0); G.lineTo(x + 12, 0); G.lineTo(x + 12 + c.height * .25, 7); G.lineTo(x + c.height * .25, 7); G.fill(); }
    G.fillStyle = '#fff';
  }
  G.font = `bold ${fs}px ${FONT}`; G.textAlign = 'center'; G.textBaseline = 'middle';
  G.fillText(text, c.width / 2, c.height / 2 + 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return { tex: t, aspect: c.width / c.height };
}

function plaque(text, x, z, h = 1.2, size = 0.42, rotY = 0, parent) {
  const g = new THREE.Group();
  const { tex, aspect } = signTex(text);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(size * aspect, size), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
  p.position.y = h; g.add(p);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, h - size / 2, 6), mat('pole', { color: 0x777a7e }));
  pole.position.y = (h - size / 2) / 2; g.add(pole);
  g.position.set(x, 0, z); g.rotation.y = rotY; g.userData.sign = text; parent.add(g); return g;
}
function archSign(text, x, z, rotY = 0, parent, w = 3.6) {
  const g = new THREE.Group();
  const { tex, aspect } = signTex(text, 'arch');
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, w / aspect * 1.25), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  p.position.y = 2.1; p.rotation.x = -0.35; g.add(p);
  const post = new THREE.Mesh(new THREE.BoxGeometry(.22, 1.8, .12), mat('archpost', { color: 0xc99592 }));
  post.position.y = .9; g.add(post);
  const base = new THREE.Mesh(new THREE.BoxGeometry(.9, .12, .3), mat('archpost')); base.position.y = .06; g.add(base);
  g.position.set(x, 0, z); g.rotation.y = rotY; g.userData.sign = text; parent.add(g); return g;
}

// ---------- 构件 ----------
function boardHouse(w, d, floors, parent, x, z, rotY = 0, label) {
  const g = new THREE.Group(); const fh = 1.1;
  const h = floors * fh;
  const wallTex = T.board(floors, Math.max(3, Math.round(w * 1.4))); wallTex.wrapS = THREE.RepeatWrapping;
  const sideTex = T.board(floors, Math.max(2, Math.round(d * 1.4)));
  const mWall = new THREE.MeshStandardMaterial({ map: wallTex, roughness: .7 });
  const mSide = new THREE.MeshStandardMaterial({ map: sideTex, roughness: .7 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [mSide, mSide, mat('roofflat', { color: 0xdfe6ea }), mat('roofflat'), mWall, mWall]);
  body.position.y = h / 2; body.castShadow = body.receiveShadow = true; g.add(body);
  // 坡屋顶
  const sh = new THREE.Shape(); sh.moveTo(-d / 2 - .15, 0); sh.lineTo(d / 2 + .15, 0); sh.lineTo(0, .45); sh.lineTo(-d / 2 - .15, 0);
  const rg = new THREE.ExtrudeGeometry(sh, { depth: w + .3, bevelEnabled: false });
  const roofTex = T.roof.clone(); roofTex.needsUpdate = true; roofTex.repeat.set(w / 1.5, 1);
  const roof = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ map: roofTex, roughness: .55 }));
  roof.rotation.y = Math.PI / 2; roof.position.set(-w / 2 - .15, h, 0); roof.castShadow = true; g.add(roof);
  if (label) {
    const { tex, aspect } = signTex(label);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(.38 * aspect, .38), new THREE.MeshBasicMaterial({ map: tex }));
    p.position.set(0, h + .26, .2); p.rotation.x = -Math.atan2(.45, d / 2) - .02; p.rotation.order = 'YXZ';
    p.rotation.x = -1.15; p.position.z = d / 4; g.add(p);
  }
  g.position.set(x, 0, z); g.rotation.y = rotY; parent.add(g); return g;
}

function shed(w, d, parent, x, z, rotY, label, wood = true) {   // 加工棚
  const g = new THREE.Group(); const h = 1.25;
  const mPost = mat('shedpost', { color: 0x3a8fdc });
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(.08, h, .08, mPost, a * (w / 2 - .05), 0, b * (d / 2 - .05), g));
  const roof = box(w, .08, d, wood ? new THREE.MeshStandardMaterial({ map: T.wood }) : mat('glassroof', { color: 0xbfe3f0, transparent: true, opacity: .55 }), 0, h, 0, g);
  const { tex } = signTex(label || '', 'band');
  const bandM = new THREE.MeshBasicMaterial({ map: tex });
  const b1 = new THREE.Mesh(new THREE.PlaneGeometry(w, .32), bandM); b1.position.set(0, h + .12, d / 2 + .01); g.add(b1);
  const b2 = b1.clone(); b2.position.z = -d / 2 - .01; b2.rotation.y = Math.PI; g.add(b2);
  box(w * .5, .35, .5, mat('bench', { color: 0xb5643a }), 0, 0, 0, g);
  g.position.set(x, 0, z); g.rotation.y = rotY || 0; parent.add(g); return g;
}

function towerCrane(parent, x, z, height, jibLen, rotY, name) {
  const g = new THREE.Group(); g.name = name;
  const yel = mat('craneY', { color: 0xf2c400, roughness: .5 });
  const latM = new THREE.MeshStandardMaterial({ map: T.lattice, transparent: true, alphaTest: .5, side: THREE.DoubleSide, roughness: .5 });
  box(1.4, .35, 1.4, mat('cbase', { color: 0x9a9da0 }), 0, 0, 0, g);
  // 塔身
  const mastTex = T.lattice.clone(); mastTex.needsUpdate = true; mastTex.wrapS = mastTex.wrapT = THREE.RepeatWrapping; mastTex.repeat.set(1, height / .7);
  const mastM = latM.clone(); mastM.map = mastTex;
  const mast = new THREE.Mesh(new THREE.BoxGeometry(.7, height, .7), mastM); mast.position.y = height / 2 + .35; mast.castShadow = true; g.add(mast);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(.07, height, .07, yel, a * .33, .35, b * .33, g));
  const top = new THREE.Group(); top.position.y = height + .35; g.add(top);
  box(1.0, .5, 1.0, yel, 0, 0, 0, top);   // 回转平台
  box(.55, .55, .6, mat('cab', { color: 0xf5f5f5 }), .55, .15, .55, top);   // 司机室
  box(.5, .4, .55, mat('cabglass', { color: 0x274a66, roughness: .2 }), .62, .22, .56, top);
  const apex = box(.35, 2.6, .35, latM, 0, .5, 0, top);   // 塔帽
  // 起重臂
  const jibTex = T.lattice.clone(); jibTex.needsUpdate = true; jibTex.wrapS = jibTex.wrapT = THREE.RepeatWrapping; jibTex.repeat.set(jibLen / .8, 1);
  const jibM = latM.clone(); jibM.map = jibTex;
  const jib = new THREE.Mesh(new THREE.BoxGeometry(jibLen, .55, .5), jibM); jib.position.set(jibLen / 2 + .4, .75, 0); jib.castShadow = true; top.add(jib);
  box(jibLen, .06, .06, yel, jibLen / 2 + .4, .72, .22, top); box(jibLen, .06, .06, yel, jibLen / 2 + .4, .72, -.22, top);
  // 平衡臂 + 配重
  const cj = 6.5; box(cj, .3, .7, yel, -cj / 2, .75, 0, top);
  box(1.4, 1.0, .8, mat('cw', { color: 0x9b9fa4 }), -cj + .9, .25, 0, top);
  // 拉杆
  const tieM = new THREE.LineBasicMaterial({ color: 0xc9a300 });
  const tie = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(jibLen * .7, 1.3, 0), new THREE.Vector3(0, 3.1, 0), new THREE.Vector3(-cj + .5, 1.0, 0)]);
  top.add(new THREE.Line(tie, tieM));
  // 小车 + 吊钩
  const trolley = new THREE.Group(); trolley.position.set(jibLen * .62, .45, 0); top.add(trolley);
  box(.5, .2, .5, mat('trol', { color: 0x333333 }), 0, 0, 0, trolley);
  const ropeLen = height * .55;
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, ropeLen, 4), mat('rope', { color: 0x222222 })); rope.position.y = -ropeLen / 2; trolley.add(rope);
  const hook = box(.35, .45, .25, mat('hook', { color: 0xd23b2b }), 0, -ropeLen - .45, 0, trolley);
  top.rotation.y = rotY;
  g.position.set(x, 0, z); parent.add(g);
  g.userData = { top, trolley, jibLen, height };
  return g;
}

function hoist(parent, x, z, height, faceZ = 1) {   // 施工升降机
  const g = new THREE.Group();
  const latTex = T.lattice.clone(); latTex.needsUpdate = true; latTex.wrapS = latTex.wrapT = THREE.RepeatWrapping; latTex.repeat.set(1, height / .5);
  const m = new THREE.MeshStandardMaterial({ map: latTex, transparent: true, alphaTest: .5, side: THREE.DoubleSide });
  const mast = new THREE.Mesh(new THREE.BoxGeometry(.4, height, .4), m); mast.position.y = height / 2; g.add(mast);
  const cage = mat('cage', { color: 0xc8282b });
  box(.75, .8, .6, cage, -.6, height * .35, 0, g); box(.75, .8, .6, cage, .6, height * .62, 0, g);
  box(1.8, .05, 1.0, mat('hbase', { color: 0x777777 }), 0, 0, 0, g);
  g.position.set(x, 0, z); parent.add(g); return g;
}

function safetyPassage(parent, x, z, w = 2.2, rotY = 0) {   // 安全通道
  const g = new THREE.Group(); const h = 1.15, d = 1.4;
  const blue = mat('sp', { color: 0x3a8fdc });
  box(.12, h, d, blue, -w / 2, 0, 0, g); box(.12, h, d, blue, w / 2, 0, 0, g); box(.12, h, d, blue, 0, 0, 0, g);
  box(w + .2, .14, d, new THREE.MeshStandardMaterial({ map: T.wood }), 0, h, 0, g);
  const { tex } = signTex('安全通道        安全通道', 'gate');
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w + .2, .28), new THREE.MeshBasicMaterial({ map: tex })); p.position.set(0, h - .05, d / 2 + .01); g.add(p);
  g.position.set(x, 0, z); g.rotation.y = rotY; parent.add(g); return g;
}
function silo(parent, x, z) {   // 预拌砂浆罐
  const g = new THREE.Group();
  box(.7, .5, .7, mat('silobase', { color: 0x3a8fdc }), 0, 0, 0, g);
  const c = new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, 1.6, 20), mat('silo', { color: 0xf5f5f5, roughness: .4 })); c.position.y = 1.3; c.castShadow = true; g.add(c);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(.42, 16, 8, 0, 6.3, 0, 1.57), mat('silo')); cap.position.y = 2.1; g.add(cap);
  g.position.set(x, 0, z); parent.add(g); return g;
}
function pool(parent, x, z, w = 1.6, d = 1.1) {   // 绿色水池
  const g = new THREE.Group();
  box(w, .25, d, mat('poolrim', { color: 0xe7f1ef }), 0, 0, 0, g);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(w - .12, d - .12), mat('water', { color: 0x1d6b4f, roughness: .15, metalness: .2 }));
  water.rotation.x = -Math.PI / 2; water.position.y = .26; g.add(water);
  g.position.set(x, 0, z); parent.add(g); return g;
}

// ---------- 主建模 ----------
export function buildScene(scene) {
  textures();
  const L = {};
  const layer = (k, name) => { const g = new THREE.Group(); g.name = name; g.userData.layer = k; scene.add(g); L[k] = g; return g; };
  const gBase = layer('base', '台面与地坪'), gRoad = layer('road', '城市道路与车辆'), gTree = layer('tree', '绿化树木'),
    gFence = layer('fence', '围挡与大门'), gA = layer('bldA', '1#楼 装配式'), gB = layer('bldB', '2#楼 现浇'),
    gPit = layer('pit', '基坑与内支撑'), gCrane = layer('crane', '塔吊与升降机'), gYard = layer('yard', '加工棚与构件堆场'),
    gEdu = layer('edu', '体验区与样板区'), gLive = layer('live', '办公生活区'), gWork = layer('worker', '工人与机械'),
    gSign = layer('sign', '标牌');

  // 台面（四周白边框 + 草地 + 场区混凝土地坪，基坑处挖洞）
  const W = 80, D = 56;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(W + 3, 3.2, D + 3), mat('table', { color: 0xf2f2f0, roughness: .4 }));
  frame.position.y = -1.62 - .02; frame.receiveShadow = true;
  // 用空心台：边框四条 + 底板，避免盖住基坑
  const rimM = mat('table');
  [[0, -(D + 1.5) / 2, W + 3, 1.5], [0, (D + 1.5) / 2, W + 3, 1.5]].forEach(([x, z, w, d]) => box(w, 3.4, d, rimM, x, -3.2, z, gBase));
  [[-(W + 1.5) / 2, 0, 1.5, D], [(W + 1.5) / 2, 0, 1.5, D]].forEach(([x, z, w, d]) => box(w, 3.4, d, rimM, x, -3.2, z, gBase));
  box(W, .2, D, mat('under', { color: 0x8b8f92 }), 0, -3.2, 0, gBase);
  // 玻璃罩（只做低矮边沿，避免遮挡）
  const glassM = mat('glass', { color: 0xd8f0f0, transparent: true, opacity: .18, roughness: .05, metalness: .1 });
  [[0, -(D / 2 + 1.2), W + 2.4, .08], [0, D / 2 + 1.2, W + 2.4, .08]].forEach(([x, z, w, d]) => box(w, 2.2, d, glassM, x, .2, z, gBase));
  [[-(W / 2 + 1.2), 0, .08, D + 2.4], [W / 2 + 1.2, 0, .08, D + 2.4]].forEach(([x, z, w, d]) => box(w, 2.2, d, glassM, x, .2, z, gBase));

  // 地面：草地全铺，场区混凝土带洞
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: T.grass, roughness: 1 }));
  grass.rotation.x = -Math.PI / 2; grass.position.y = -.02; grass.receiveShadow = true;
  // 草地也要挖基坑洞：草地只铺在场区外
  const outer = new THREE.Shape(); outer.moveTo(-W / 2, -D / 2); outer.lineTo(W / 2, -D / 2); outer.lineTo(W / 2, D / 2); outer.lineTo(-W / 2, D / 2); outer.lineTo(-W / 2, -D / 2);
  const siteHole = new THREE.Path(); siteHole.moveTo(-31, -25); siteHole.lineTo(-31, 25); siteHole.lineTo(31, 25); siteHole.lineTo(31, -25); siteHole.lineTo(-31, -25);
  outer.holes.push(siteHole);
  const grassG = new THREE.Mesh(new THREE.ShapeGeometry(outer), new THREE.MeshStandardMaterial({ map: T.grass, roughness: 1 }));
  T.grass.repeat.set(.12, .12);
  grassG.rotation.x = -Math.PI / 2; grassG.position.y = -.02; grassG.receiveShadow = true; gBase.add(grassG);
  const site = new THREE.Shape(); site.moveTo(-31, -25); site.lineTo(31, -25); site.lineTo(31, 25); site.lineTo(-31, 25); site.lineTo(-31, -25);
  const pitHole = new THREE.Path(); pitHole.moveTo(15, -15); pitHole.lineTo(15, -3); pitHole.lineTo(25, -3); pitHole.lineTo(25, -15); pitHole.lineTo(15, -15);
  site.holes.push(pitHole);
  T.concrete.repeat.set(.1, .1);
  const siteM = new THREE.MeshStandardMaterial({ map: T.concrete, roughness: .9, color: 0xe6e8e9 });
  const siteMesh = new THREE.Mesh(new THREE.ShapeGeometry(site), siteM);
  siteMesh.rotation.x = Math.PI / 2; siteMesh.scale.y = -1; // ShapeGeometry 在 XY；翻到 XZ 且 z 与 shape-y 同向
  siteMesh.rotation.set(-Math.PI / 2, 0, 0); siteMesh.scale.set(1, -1, 1);
  siteMesh.position.y = 0; siteMesh.receiveShadow = true; gBase.add(siteMesh);
  siteM.side = THREE.DoubleSide;

  // 场内道路（深灰）+ 白边线
  const roadM = mat('siteroad', { color: 0xa9adb0, roughness: .95 });
  const edgeM = mat('roadedge', { color: 0xf7f7f7 });
  const sroad = (x1, z1, x2, z2) => {
    const w = x2 - x1, d = z2 - z1;
    const r = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roadM); r.rotation.x = -Math.PI / 2; r.position.set(x1 + w / 2, .015, z1 + d / 2); r.receiveShadow = true; gBase.add(r);
  };
  sroad(-26, -20, 27.4, -17.5);   // 北环路
  sroad(-26, -0.6, 27.4, 2.2);    // 南环路
  sroad(-26.5, -20, -24, 2.2);    // 西环路
  sroad(25.4, -20, 27.4, 2.2);    // 东环路
  sroad(27.4, -19.5, 31, -16.5);  // 东北门
  sroad(-31, 2.4, -26, 5);        // 西门
  sroad(-26.5, 2.2, -24, 4.6);
  sroad(-18.6, 2.2, -15.4, 8);    // 实名制通道
  sroad(20.5, 2.2, 23.6, 11);     // 车辆通道
  sroad(23.6, 2.2, 27.4, 3.6);
  sroad(-17.5, 8, 31, 10.4);      // 生活区主路
  sroad(26.4, 10.4, 31, 15.6);    // 东南门
  sroad(-17.5, 8, -15, 24.5);

  // 城市道路（东西两侧）
  const asM = new THREE.MeshStandardMaterial({ map: T.asphalt, roughness: .9 });
  [[-35.75], [35.75]].forEach(([cx]) => {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(5.6, D), asM); r.rotation.x = -Math.PI / 2; r.position.set(cx, .02, 0); r.receiveShadow = true; gRoad.add(r);
    const med = new THREE.Mesh(new THREE.PlaneGeometry(.35, D), mat('med', { color: 0x7fbf3f })); med.rotation.x = -Math.PI / 2; med.position.set(cx, .03, 0); gRoad.add(med);
    [-2.85, 2.85].forEach(o => { const s = new THREE.Mesh(new THREE.PlaneGeometry(.5, D), mat('walk', { color: 0xbfc3c6 })); s.rotation.x = -Math.PI / 2; s.position.set(cx + o + Math.sign(o) * .25, .025, 0); gRoad.add(s); });
  });
  // 车辆
  const carColors = [0xffffff, 0xd8d8d8, 0xc0392b, 0x2c3e50, 0xe8b04b, 0x7f8c8d, 0xb03a2e, 0xf4f6f7, 0x34495e];
  const cars = [];
  const mkCar = (x, z, rot, color) => {
    const c = new THREE.Group();
    box(.9, .32, 1.9, new THREE.MeshStandardMaterial({ color, roughness: .3, metalness: .3 }), 0, .08, 0, c);
    box(.78, .28, 1.0, mat('carglass', { color: 0x2a3a48, roughness: .15, metalness: .3 }), 0, .4, -.05, c);
    c.position.set(x, 0, z); c.rotation.y = rot; c.children.forEach(m => m.castShadow = true); return c;
  };
  for (let i = 0; i < 9; i++) {
    const z1 = -26 + i * 6.2 + rnd() * 2, z2 = -24 + i * 6 + rnd() * 2;
    let c = mkCar(-34.6, z1, 0, carColors[i % 9]); gRoad.add(c); cars.push({ o: c, x: -34.6, dir: 1 });
    c = mkCar(-36.9, z2, Math.PI, carColors[(i + 3) % 9]); gRoad.add(c); cars.push({ o: c, x: -36.9, dir: -1 });
    c = mkCar(36.9, z1 + 1, 0, carColors[(i + 5) % 9]); gRoad.add(c); cars.push({ o: c, x: 36.9, dir: 1 });
    c = mkCar(34.6, z2 + 1, Math.PI, carColors[(i + 7) % 9]); gRoad.add(c); cars.push({ o: c, x: 34.6, dir: -1 });
  }
  // 路灯
  const lampM = mat('lamp', { color: 0xf0f0f0 });
  const lamp = (x, z, side, parent) => {
    const g = new THREE.Group();
    box(.07, 2.2, .07, lampM, 0, 0, 0, g); box(.6, .05, .07, lampM, side * .3, 2.15, 0, g);
    box(.22, .08, .14, mat('lampHead', { color: 0xfafafa, emissive: 0x333322 }), side * .6, 2.1, 0, g);
    g.position.set(x, 0, z); parent.add(g); return g;
  };
  for (let z = -25; z <= 25; z += 5) { lamp(-32.8, z, -1, gRoad); lamp(32.8, z, 1, gRoad); }

  // 树（实例化）
  const treePos = [];
  for (let x = -38.5; x <= 38.5; x += 2.1) { treePos.push([x, -26.6]); treePos.push([x, 26.6]); }
  for (let z = -24.5; z <= 24.5; z += 2.2) { treePos.push([-32.3, z]); treePos.push([32.3, z]); treePos.push([-39.3, z + 1]); treePos.push([39.3, z + 1]); }
  const trunkG = new THREE.CylinderGeometry(.06, .08, .7, 5); const crownG = new THREE.IcosahedronGeometry(.62, 1);
  const trunks = new THREE.InstancedMesh(trunkG, mat('trunk', { color: 0x6b5a45 }), treePos.length);
  const crowns = new THREE.InstancedMesh(crownG, mat('crown', { color: 0x4f9b32, roughness: .95, flatShading: true }), treePos.length * 2);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sv = new THREE.Vector3();
  const gapOK = ([x, z]) => !((x > 30 && x < 33 && ((z > -20.5 && z < -15.5) || (z > 9.5 && z < 16.5))) || (x < -30 && x > -33 && z > 1.5 && z < 6));
  for (let i = treePos.length - 1; i >= 0; i--) if (!gapOK(treePos[i])) treePos.splice(i, 1);
  treePos.forEach(([x, z], i) => {
    m4.compose(new THREE.Vector3(x, .35, z), q, sv.set(1, 1, 1)); trunks.setMatrixAt(i, m4);
    const s = .85 + rnd() * .35;
    m4.compose(new THREE.Vector3(x, 1.0 * s, z), q, sv.set(s, s * .9, s)); crowns.setMatrixAt(i * 2, m4);
    m4.compose(new THREE.Vector3(x + (rnd() - .5) * .3, 1.45 * s, z + (rnd() - .5) * .3), q, sv.set(s * .7, s * .65, s * .7)); crowns.setMatrixAt(i * 2 + 1, m4);
  });
  crowns.castShadow = true; gTree.add(trunks, crowns);

  // 围挡（蓝白）
  const fenceM = new THREE.MeshStandardMaterial({ map: T.fence, roughness: .6 });
  const fenceSeg = (x1, z1, x2, z2, h = .75) => {
    const len = Math.hypot(x2 - x1, z2 - z1); if (len < .05) return;
    const t = T.fence.clone(); t.needsUpdate = true; t.repeat.set(len / 2.2, 1);
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, h, .1), new THREE.MeshStandardMaterial({ map: t, roughness: .6 }));
    m.position.set((x1 + x2) / 2, h / 2, (z1 + z2) / 2); m.rotation.y = -Math.atan2(z2 - z1, x2 - x1); m.castShadow = true; gFence.add(m);
  };
  fenceSeg(-31, -25, 31, -25); fenceSeg(-31, 25, 31, 25);
  fenceSeg(31, -25, 31, -19.6); fenceSeg(31, -16.4, 31, 10.2); fenceSeg(31, 15.8, 31, 25);
  fenceSeg(-31, -25, -31, 2.2); fenceSeg(-31, 5.2, -31, 25);
  // 大门（安工大 建工学院 门楼）
  const gate = (x, z, w, rotY, words) => {
    const g = new THREE.Group(); const blue = mat('gateblue', { color: 0x2b6fc0 });
    box(.35, 1.9, .35, blue, -w / 2, 0, 0, g); box(.35, 1.9, .35, blue, w / 2, 0, 0, g);
    const { tex, aspect } = signTex(words, 'gate');
    const beam = new THREE.Mesh(new THREE.BoxGeometry(w + .4, .5, .25), [blue, blue, blue, blue, new THREE.MeshBasicMaterial({ map: tex }), new THREE.MeshBasicMaterial({ map: tex })]);
    beam.position.y = 1.95; g.add(beam);
    const logo = signTex('安徽工业大学 · 建筑工程学院', 'gate'); const lg = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w - .2, 3.0), Math.min(w - .2, 3.0) / logo.aspect), new THREE.MeshBasicMaterial({ map: logo.tex, side: THREE.DoubleSide }));
    lg.position.set(0, 1.45, .14); g.add(lg);
    box(.9, .9, .8, mat('guard', { color: 0x63b0ec }), w / 2 + .9, 0, -.7, g);   // 门卫亭
    g.position.set(x, 0, z); g.rotation.y = rotY; gFence.add(g); return g;
  };
  gate(31, 13, 5.2, Math.PI / 2, '安全生产   文明施工');
  gate(31, -18, 3.2, Math.PI / 2, '安全生产   文明施工');
  gate(-31, 3.7, 3, -Math.PI / 2, '安全生产   文明施工');

  // 内部黑色栏杆 + 砖柱（分隔施工区与生活办公区）
  const railSeg = (x1, z1, x2, z2) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const t = T.rail.clone(); t.needsUpdate = true; t.repeat.set(len / 1.0, 1);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, .5), new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: .4, side: THREE.DoubleSide }));
    m.position.set((x1 + x2) / 2, .27, (z1 + z2) / 2); m.rotation.y = -Math.atan2(z2 - z1, x2 - x1); gFence.add(m);
  };
  const pillar = (x, z) => { box(.3, .85, .3, mat('brick', { color: 0x8e3b2c }), x, 0, z, gFence); box(.18, .12, .18, mat('lampw', { color: 0xffffff, emissive: 0x444444 }), x, .85, z, gFence); };
  railSeg(-31, 8, -18.6, 8); railSeg(-15.4, 8, 20.5, 8); railSeg(23.6, 8, 31, 8);
  [-31, -24, -18.6, -15.4, -8, -1, 6, 13, 20.5, 23.6, 27].forEach(x => pillar(x, 8));
  railSeg(-17.5, 8, -17.5, 24.6);   // 办公区与生活区分隔

  // ===== 1# 楼：装配式 + 蓝色全钢爬架 =====
  {
    const x0 = -24, x1 = -13, z0 = -15, z1 = -5, w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const fh = 1.5, nF = 8;
    const mainG = new THREE.Group(); mainG.name = '1#楼主体'; gA.add(mainG);
    const frFront = new THREE.MeshStandardMaterial({ map: T.frame(6, 1) }), frSide = new THREE.MeshStandardMaterial({ map: T.frame(5, 1) });
    const floors = [];
    for (let i = 0; i < nF; i++) {
      const f = new THREE.Group(); f.position.y = i * fh; f.userData.floor = i + 1;
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, fh - .16, d), [frSide, frSide, mat('slab', { color: 0xd3d6d8 }), mat('slab'), frFront, frFront]);
      wall.position.y = (fh - .16) / 2; wall.castShadow = wall.receiveShadow = true; f.add(wall);
      box(w + .3, .16, d + .3, mat('slab'), 0, fh - .16, 0, f);
      f.position.x = cx; f.position.z = cz; mainG.add(f); floors.push(f);
    }
    // 顶层：预制墙板 + 叠合板 + 斜撑
    const topY = nF * fh;
    const topG = new THREE.Group(); topG.position.set(cx, topY, cz); topG.name = '1#楼作业层'; mainG.add(topG);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) box(1.9, .12, 2.2, mat('pc', { color: 0xf3f3f1 }), -w / 2 + 1.1 + i * 2.2, 0, -d / 2 + 1.25 + j * 2.5, topG);
    for (let i = 0; i < 6; i++) box(.18, 1.0, 1.6, mat('pcw', { color: 0xe8e8e6 }), -w / 2 + 1 + i * 1.8, .12, -d / 2 + .9, topG);
    for (let i = 0; i < 8; i++) { const s = box(.05, 1.3, .05, mat('brace', { color: 0x30343a }), -w / 2 + 1.2 + i * 1.2, .1, -d / 2 + 2.0, topG); s.rotation.x = .6; }
    // 爬架外壳（覆盖 3–9 层 + 1 层护栏）
    const climbH = (nF - 2) * fh + 1.6;
    const cTex = T.climb(10, [{ t: '安全生产 人人有责', x: .08, y: .12, w: .34 }, { t: '质量第一 安全第一', x: .08, y: .32, w: .34 }, { t: '文明施工 铸就精品', x: .08, y: .52, w: .34 }]);
    const cSide = T.climb(8);
    const climbM = [new THREE.MeshStandardMaterial({ map: cSide, roughness: .5 }), new THREE.MeshStandardMaterial({ map: cSide, roughness: .5 }), mat('climbTop', { color: 0x3d9ee6, transparent: true, opacity: 0 }), mat('climbTop'), new THREE.MeshStandardMaterial({ map: cTex, roughness: .5 }), new THREE.MeshStandardMaterial({ map: T.climb(10), roughness: .5 })];
    const climb = new THREE.Mesh(new THREE.BoxGeometry(w + .9, climbH, d + .9), climbM);
    climb.position.set(cx, 2 * fh + climbH / 2, cz); climb.castShadow = true; climb.name = '爬架'; gA.add(climb);
    gA.userData = { floors, climb, topG, fh, nF, cx, cz, w, d };
    // 南侧：升降机、安全通道、砂浆罐、水池
    hoist(gCrane, x0 + 2.2, z1 + .6, nF * fh + 2.5);
    safetyPassage(gA, cx + .5, z1 + 1.4);
    silo(gA, x1 - 1.2, z1 + 2.2);
    pool(gA, x1 + 1.6, z1 + 2.3); pool(gA, x1 + 3.3, z1 + 2.3);
    box(1.2, .25, .8, mat('pallet', { color: 0xf0e6d6 }), x0 - 1.5, 0, z1 + 2, gA);
  }

  // ===== 2# 楼：现浇主体 + 落地脚手架 + 绿色安全网 =====
  {
    const fh = 1.6;
    const parts = [
      { name: '西裙楼', x0: -5, x1: 1, z0: -13, z1: -4, nF: 3, net: true, roof: 'white' },
      { name: '主楼', x0: 1, x1: 11, z0: -14, z1: -3, nF: 5, net: true, roof: 'form' },
      { name: '东侧框架', x0: 11, x1: 15, z0: -14, z1: -3, nF: 4, net: false, roof: 'slab' }
    ];
    const banners = [{ t: '防微杜渐 警钟长鸣', x: .1, y: .3, w: .35 }, { t: '安全勤劳 生活美好', x: .55, y: .3, w: .35 }, { t: '生产效益 节节攀高', x: .05, y: .62, w: .35 }, { t: '安全生产出效益 文明施工铸精品', x: .3, y: .06, w: .5 }];
    gB.userData.parts = [];
    parts.forEach(p => {
      const w = p.x1 - p.x0, d = p.z1 - p.z0, cx = (p.x0 + p.x1) / 2, cz = (p.z0 + p.z1) / 2;
      const pg = new THREE.Group(); pg.name = p.name; gB.add(pg);
      const floors = [];
      const frF = new THREE.MeshStandardMaterial({ map: T.frame(Math.round(w / 1.6), 1) }), frS = new THREE.MeshStandardMaterial({ map: T.frame(Math.round(d / 1.6), 1) });
      for (let i = 0; i < p.nF; i++) {
        const f = new THREE.Group(); f.position.set(cx, i * fh, cz); f.userData.floor = i + 1;
        const wall = new THREE.Mesh(new THREE.BoxGeometry(w - .2, fh - .18, d - .2), [frS, frS, mat('slab'), mat('slab'), frF, frF]);
        wall.position.y = (fh - .18) / 2; wall.castShadow = wall.receiveShadow = true; f.add(wall);
        box(w, .18, d, mat('slab'), 0, fh - .18, 0, f);
        pg.add(f); floors.push(f);
      }
      const H = p.nF * fh;
      if (p.roof === 'form') { const r = box(w - .3, .06, d - .3, new THREE.MeshStandardMaterial({ map: T.formwork }), cx, H, cz, pg); }
      if (p.roof === 'white') box(w - .3, .06, d - .3, mat('roofw', { color: 0xf3f4f4 }), cx, H, cz, pg);
      let net = null;
      if (p.net) {
        const nh = H + .9;
        const tF = T.net(Math.round(w / 1.4), p.nF, p.name === '主楼' ? banners : banners.slice(0, 1)), tS = T.net(Math.round(d / 1.4), p.nF);
        const nm = [new THREE.MeshStandardMaterial({ map: tS }), new THREE.MeshStandardMaterial({ map: tS }), mat('none', { transparent: true, opacity: 0 }), mat('none'), new THREE.MeshStandardMaterial({ map: tF }), new THREE.MeshStandardMaterial({ map: tF })];
        net = new THREE.Mesh(new THREE.BoxGeometry(w + .7, nh, d + .7), nm);
        net.position.set(cx, nh / 2, cz); net.castShadow = true; net.name = '脚手架安全网'; pg.add(net);
      }
      gB.userData.parts.push({ ...p, group: pg, floors, net, fh });
    });
    hoist(gCrane, 3, -2.6, 5 * fh + 2.2);
    safetyPassage(gB, 7.5, -1.6, 2.4);
    silo(gB, 10.6, -1.6);
    pool(gB, 12.4, -1.5); pool(gB, 14.1, -1.5);
    // 汽车泵（红色臂架）
    const pump = new THREE.Group();
    box(1.0, .55, 3.2, mat('truckY', { color: 0xd9a21b }), 0, .15, 0, pump);
    box(.95, .5, .8, mat('truckCab', { color: 0xe5b63a }), 0, .5, 1.3, pump);
    const red = mat('boom', { color: 0xc8202a });
    const b1 = box(.18, 4.2, .18, red, 0, 0, 0, pump); b1.position.set(0, 2.7, -.4); b1.rotation.x = -.35;
    const b2 = box(.15, 3.6, .15, red, 0, 0, 0, pump); b2.position.set(0, 5.4, 1.2); b2.rotation.x = 1.25;
    const b3 = box(.12, 2.2, .12, red, 0, 0, 0, pump); b3.position.set(0, 4.8, 3.0); b3.rotation.x = .2;
    pump.position.set(-0.5, 0, -16.2); pump.rotation.y = Math.PI; pump.name = '汽车泵'; gWork.add(pump);
  }

  // ===== 基坑 =====
  {
    const x0 = 15, x1 = 25, z0 = -15, z1 = -3, dep = 2.6, w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const wallM = mat('pitwall', { color: 0x9da3a6, roughness: .95 });
    box(w, dep, .25, wallM, cx, -dep, z0 + .12, gPit); box(w, dep, .25, wallM, cx, -dep, z1 - .12, gPit);
    box(.25, dep, d, wallM, x0 + .12, -dep, cz, gPit); box(.25, dep, d, wallM, x1 - .12, -dep, cz, gPit);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: T.soil, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(cx, -dep, cz); floor.receiveShadow = true; gPit.add(floor);
    // 冠梁 + 内支撑（白色桁架）
    const sup = mat('support', { color: 0xf4f4f4, roughness: .5 });
    const ringY = -.55;
    box(w, .35, .45, sup, cx, ringY, z0 + .35, gPit); box(w, .35, .45, sup, cx, ringY, z1 - .35, gPit);
    box(.45, .35, d, sup, x0 + .35, ringY, cz, gPit); box(.45, .35, d, sup, x1 - .35, ringY, cz, gPit);
    const strut = (ax, az, bx, bz) => {
      const len = Math.hypot(bx - ax, bz - az);
      const s = new THREE.Mesh(new THREE.BoxGeometry(len, .3, .32), sup);
      s.position.set((ax + bx) / 2, ringY + .17, (az + bz) / 2); s.rotation.y = -Math.atan2(bz - az, bx - ax); s.castShadow = true; gPit.add(s);
    };
    // 角撑 + 对撑 + 斜撑网格（仿照片中的三角形桁架）
    strut(x0 + .4, z0 + 3, x0 + 3, z0 + .4); strut(x1 - .4, z0 + 3, x1 - 3, z0 + .4);
    strut(x0 + .4, z1 - 3, x0 + 3, z1 - .4); strut(x1 - .4, z1 - 3, x1 - 3, z1 - .4);
    strut(x0 + .4, cz, x1 - .4, cz); strut(cx, z0 + .4, cx, z1 - .4);
    strut(x0 + 3, z0 + .4, cx, cz); strut(x1 - 3, z0 + .4, cx, cz); strut(x0 + 3, z1 - .4, cx, cz); strut(x1 - 3, z1 - .4, cx, cz);
    strut(x0 + .4, z0 + 3, x0 + 3, cz); strut(x1 - .4, z0 + 3, x1 - 3, cz); strut(x0 + .4, z1 - 3, x0 + 3, cz); strut(x1 - .4, z1 - 3, x1 - 3, cz);
    // 立柱
    [[cx - 2.5, cz], [cx + 2.5, cz], [cx, cz - 3], [cx, cz + 3]].forEach(([x, z]) => box(.2, dep - .5, .2, sup, x, -dep, z, gPit));
    // 坑边临边防护（红白栏杆）
    const guardM = mat('guard', { color: 0xe74c3c });
    [[cx, z0 - .25, w + .5, .06], [cx, z1 + .25, w + .5, .06]].forEach(([x, z, ww, dd]) => box(ww, .06, dd, guardM, x, .45, z, gPit));
    [[x0 - .25, cz, .06, d + .5], [x1 + .25, cz, .06, d + .5]].forEach(([x, z, ww, dd]) => box(ww, .06, dd, guardM, x, .45, z, gPit));
    for (let x = x0 - .25; x <= x1 + .3; x += 1.25) { box(.05, .5, .05, guardM, x, 0, z0 - .25, gPit); box(.05, .5, .05, guardM, x, 0, z1 + .25, gPit); }
    for (let z = z0 - .25; z <= z1 + .3; z += 1.25) { box(.05, .5, .05, guardM, x0 - .25, 0, z, gPit); box(.05, .5, .05, guardM, x1 + .25, 0, z, gPit); }
    // 坑底小挖机
    const ex = new THREE.Group(); box(.9, .35, 1.2, mat('exY', { color: 0xf0b323 }), 0, 0, 0, ex); box(.55, .45, .55, mat('exY'), .1, .35, .2, ex);
    const arm = box(.12, 1.1, .12, mat('exY'), 0, 0, 0, ex); arm.position.set(-.1, .9, -.6); arm.rotation.x = .7;
    ex.position.set(cx + 2, -dep, cz + 2.5); gPit.add(ex);
    gPit.userData = { x0, x1, z0, z1, dep };
  }

  // ===== 塔吊 =====
  const crane1 = towerCrane(gCrane, -18.5, -17, 24, 20, Math.PI - 0.25, '1#塔吊');
  const crane2 = towerCrane(gCrane, 14.4, -13.6, 26.5, 19, Math.PI - 0.05, '2#塔吊');

  // ===== 实名制闸机通道 =====
  {
    const booth = new THREE.Group();
    box(1.1, 1.0, 1.0, mat('booth', { color: 0x63b0ec }), -19.4, 0, 7.4, booth);
    for (let i = 0; i < 4; i++) box(.12, .5, .7, mat('turn', { color: 0xd8dde0 }), -18.3 + i * .85, 0, 7.6, booth);
    gEdu.add(booth);
    for (let i = 0; i < 4; i++) { const t = new THREE.Group(); box(.8, .5, 1.6, mat('dump', { color: 0xc9a227 }), 0, .1, 0, t); box(.8, .4, .5, mat('dumpc', { color: 0xdedede }), 0, .2, .9, t); t.position.set(25 + i * 1.3, 0, 9.3); t.rotation.y = .1; gWork.add(t); }
  }
  const extraWorkers = buildPerimeter({ box, mat, T, signTex, plaque, archSign, boardHouse, rnd, L });

  // ===== 办公区 =====
  {
    const off = new THREE.Group();
    const whiteWall = (w, d, x, z) => {
      const tF = T.board(2, Math.round(w * 1.6)), tS = T.board(2, Math.round(d * 1.6));
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 2.3, d), [new THREE.MeshStandardMaterial({ map: tS }), new THREE.MeshStandardMaterial({ map: tS }), mat('offroof', { color: 0xf7f7f7 }), mat('offroof'), new THREE.MeshStandardMaterial({ map: tF }), new THREE.MeshStandardMaterial({ map: tF })]);
      m.position.set(x, 1.15, z); m.castShadow = m.receiveShadow = true; off.add(m);
    };
    whiteWall(11.5, 2.4, -24.5, 22.8); whiteWall(2.4, 9.5, -29.3, 16.6);
    gLive.add(off);
    // 停车位与小车
    for (let i = 0; i < 7; i++) { const c = mkCar(-26 + i * 1.15, 12, Math.PI / 2 * 0, carColors[(i * 2) % 9]); c.scale.setScalar(.85); gLive.add(c); }
    box(.6, .02, .6, mat('lawn', { color: 0x7ab648 }), -23, 0, 17, gLive); box(.6, .02, .6, mat('lawn'), -21, 0, 16, gLive);
    // 学校铭牌
    const lg = signTex('安徽工业大学 建筑工程学院  ·  工程沙盘', 'plaque'); const pl = new THREE.Mesh(new THREE.PlaneGeometry(.55 * lg.aspect, .55), new THREE.MeshBasicMaterial({ map: lg.tex }));
    pl.rotation.x = -Math.PI / 2 + .5; pl.position.set(-34, .4, 27.3); gSign.add(pl);
  }
  // ===== 生活区 =====
  {
    const court = new THREE.Mesh(new THREE.PlaneGeometry(7, 5.4), new THREE.MeshStandardMaterial({ map: T.court }));
    court.rotation.x = -Math.PI / 2; court.position.set(-12, .02, 17.5); court.receiveShadow = true; gLive.add(court);
    [-1, 1].forEach(s => { box(.08, 1.2, .08, mat('hoop', { color: 0x2f86d6 }), -12 + s * 3.3, 0, 17.5, gLive); box(.05, .4, .6, mat('board', { color: 0xffffff }), -12 + s * 3.2, 1.1, 17.5, gLive); });
    boardHouse(7, 1.8, 1, gLive, -12, 12.4, 0, '文体活动室');
    boardHouse(7, 1.8, 1, gLive, -12, 22.8, 0, '党建活动室');
    const rows = [13.4, 17.2, 21.0];
    rows.forEach((z, r) => {
      boardHouse(13, 2.2, 2, gLive, 3.5, z, 0, '宿舍');
      boardHouse(r === 0 ? 7 : 11, 2.2, 2, gLive, r === 0 ? 17 : 19, z, 0, r === 0 ? '餐厅' : '宿舍');
    });
    boardHouse(3.2, 2, 1, gLive, 28.4, 18.2, Math.PI / 2, '浴室');
    boardHouse(2.4, 2, 1, gLive, 28.4, 21.4, Math.PI / 2, '卫生间');
    boardHouse(2.6, 2, 1, gLive, 28.4, 23.6 - .1, Math.PI / 2, '垃圾站');
    boardHouse(2.2, 1.6, 1, gLive, 23.2, 13.0, 0, '门卫');
    for (let i = 0; i < 9; i++) { const c = mkCar(-3 + i * 1.15, 11.2, 0, carColors[(i * 4) % 9]); c.scale.setScalar(.85); gLive.add(c); }
  }

  // ===== 标牌（文字以照片为准） =====
  const S = gSign;
  archSign('主体作业区', -10, -1.4, 0, S);
  archSign('基坑作业区', 18, -1.2, 0, S, 3.8);
  archSign('质量样板区', 4, 4.0, 0, S);
  archSign('安全体验区', -7.2, 3.9, 0, S);
  archSign('生活区', -3, 10.9, 0, S, 3);
  archSign('办公区', -21, 15, 0, S, 3);
  plaque('人员实名制', -17.0, 6.6, 1.3, .42, 0, S); plaque('AI无感考勤', -15.4, 6.0, 1.3, .42, 0, S); plaque('视频监控', -18.8, 6.0, 1.3, .42, 0, S);
  
  plaque('人员定位', -9, -2.0, 1.2, .38, 0, S); plaque('移动检查', -11.6, -2.0, 1.1, .38, 0, S); plaque('智能路灯', -7.8, -.4, 1.2, .38, 0, S);
  plaque('移动检查', 0.5, 3.2, 1.1, .38, 0, S); plaque('智能路灯', 5.5, 3.2, 1.2, .38, 0, S); plaque('智能路灯', 13, -1.0, 1.2, .38, 0, S);
  plaque('升降机安全监控', 3.0, -2.0, 9.4, .5, 0, S).children[1].visible = false;
  plaque('卸料平台监测', -2, -8, 5.4, .42, 0, S).children[1].visible = false;
  plaque('深基坑监测', 21.5, -2.0, 1.2, .38, 0, S); plaque('移动巡更', 25.4, -8, 1.2, .38, -Math.PI / 2, S);
  plaque('机械设备管理', 18.6, 4.2, 2.0, .42, 0, S);
  plaque('VR安全教育', -12.6, 5.4, 2.2, .42, 0, S);
  plaque('叠合板吊装', -24.5, -20.9, 1.1, .36, 0, S); plaque('预制剪力墙吊装', -19.4, -20.9, 1.1, .36, 0, S); plaque('叠合板吊装', -14.3, -20.9, 1.1, .36, 0, S);
  plaque('叠合梁吊装', -9, -20.9, 1.1, .36, 0, S); plaque('装配式楼梯吊装', -4.1, -20.9, 1.1, .36, 0, S); plaque('烟感报警', 4.2, -20.9, 1.1, .36, 0, S);
  plaque('钢筋AI盘点管理', 12.6, -20.9, 1.1, .36, 0, S); plaque('三级污水沉淀池', 25, -20.6, 1.0, .32, 0, S); plaque('水泵房', 25.4, -22.4, 1.1, .3, 0, S);
  plaque('环境监测', 28.6, -16.0, 1.8, .4, -Math.PI / 2, S); plaque('车辆管理', 27.6, -19.8, 1.3, .4, 0, S);
  
  
  
  
  
  plaque('套筒灌浆', -17.5, -12, 12.9, .36, 0, S).children[1].visible = false; plaque('构件T型连接', -21.5, -12.5, 12.9, .36, 0, S).children[1].visible = false; plaque('独立式支撑', -15, -11, 12.9, .36, 0, S).children[1].visible = false;
  plaque('构件斜支撑', -20, -8.5, 12.9, .36, 0, S).children[1].visible = false;
  

  // ===== 工人（实例化小人） =====
  const workerZones = [
    [15.8, -14.2, 24.2, -3.8, 10, -2.6]   // 基坑底
  ];
  // 楼顶作业面工人：挂在楼栋图层下，随楼层生长一起剖切显示
  const roofZones = [[gA, -23.5, -14.5, -13.5, -5.5, 6, 12.5], [gB, 1.5, -13.5, 10.5, -3.5, 5, 8.0], [gB, -4.6, -12.5, 0.6, -4.5, 3, 4.8]];
  roofZones.forEach(([g, x0, z0, x1, z1, n, y]) => {
    const pts = []; for (let i = 0; i < n; i++) pts.push([x0 + rnd() * (x1 - x0), y, z0 + rnd() * (z1 - z0)]);
    const parts = [[new THREE.CylinderGeometry(.09, .11, .42, 6), 0x8c2a22, .21], [new THREE.SphereGeometry(.09, 8, 6), 0xe0b48f, .5], [new THREE.SphereGeometry(.1, 8, 4, 0, 6.3, 0, 1.6), 0xf2c400, .54]];
    parts.forEach(([geo, col, dy]) => { const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: col }), n); pts.forEach(([x, yy, z], i) => { m4.makeTranslation(x, yy + dy, z); im.setMatrixAt(i, m4); }); g.add(im); });
  });
  const wPos = [];
  workerZones.forEach(([x0, z0, x1, z1, n, y]) => { for (let i = 0; i < n; i++) wPos.push([x0 + rnd() * (x1 - x0), y, z0 + rnd() * (z1 - z0)]); });
  extraWorkers.forEach(w => wPos.push(w));
  const bodyG = new THREE.CylinderGeometry(.09, .11, .42, 6), headG = new THREE.SphereGeometry(.09, 8, 6), hatG = new THREE.SphereGeometry(.1, 8, 4, 0, 6.3, 0, 1.6);
  const bodies = new THREE.InstancedMesh(bodyG, mat('wbody', { color: 0x8c2a22 }), wPos.length);
  const heads = new THREE.InstancedMesh(headG, mat('whead', { color: 0xe0b48f }), wPos.length);
  const hats = new THREE.InstancedMesh(hatG, mat('what', { color: 0xf2c400 }), wPos.length);
  wPos.forEach(([x, y, z], i) => {
    m4.makeTranslation(x, y + .21, z); bodies.setMatrixAt(i, m4);
    m4.makeTranslation(x, y + .5, z); heads.setMatrixAt(i, m4);
    m4.makeTranslation(x, y + .54, z); hats.setMatrixAt(i, m4);
  });
  bodies.castShadow = true; gWork.add(bodies, heads, hats);

  return { layers: L, cars, cranes: [crane1, crane2] };
}
