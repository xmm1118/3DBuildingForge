import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildScene } from './scene.js';
import { buildStages } from './stages.js';
import { mountDash, DASH_CSS } from './dash.js';
import { buildProcess } from './process.js';
import { buildScenario, SCENARIO_CSS } from './scenario.js';
import { mountTeach, TEACH_CSS } from './teach.js';
import { buildGreen } from './green.js';
import { buildGreenLife } from './greenlife.js';
import { mountWorkshop, WORKSHOP_CSS } from './workshop.js';
import { makeIntro, INTRO_CSS } from './intro.js';
import { icon } from './icons.js';
let teach = null;

const DATA = window.SHAPAN_DATA;
let procInfo = null, liveT = 0, liveSig = '';
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = s => document.querySelector(s);
const body = document.body;
const LS = {
  get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const compact = () => innerWidth < 900 || innerHeight < 500;
const addCSS = css => { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); };
// 照片：只在离线单文件版（SHAPAN_PHOTOS）或构建时登记过的照片（SHAPAN_PHOTO_LIST）里有，才显示；公开仓库不带照片
const photoSrc = n => { const k = String(n).padStart(2, '0'); if (window.SHAPAN_PHOTOS && window.SHAPAN_PHOTOS[k]) return window.SHAPAN_PHOTOS[k]; return (window.SHAPAN_PHOTO_LIST || []).includes(k) ? `photos/${k}.jpg` : null; };
// 小事件总线（新手引导用来判断「学生做到了没有」）
const hooksBus = {};
const on = (e, f) => { (hooksBus[e] = hooksBus[e] || []).push(f); return () => { hooksBus[e] = (hooksBus[e] || []).filter(x => x !== f); }; };
const emit = (e, ...a) => (hooksBus[e] || []).slice().forEach(f => f(...a));

// ---------- 渲染器 ----------
const host = $('#stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.localClippingEnabled = true;
host.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe9edf0);
scene.fog = new THREE.Fog(0xe9edf0, 160, 320);
const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 600);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = !reduceMotion; controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.49; controls.minDistance = 4; controls.maxDistance = 190;
controls.target.set(0, 0, 0);
{ let a0 = null; controls.addEventListener('start', () => { a0 = [controls.getAzimuthalAngle(), controls.getPolarAngle()]; });
  controls.addEventListener('change', () => { if (a0 && (Math.abs(controls.getAzimuthalAngle() - a0[0]) > .3 || Math.abs(controls.getPolarAngle() - a0[1]) > .15)) { a0 = null; emit('rotate'); } });
  controls.addEventListener('end', () => { a0 = null; }); }

// 灯光：实验室顶灯 + 窗光
const hemi = new THREE.HemisphereLight(0xffffff, 0xb8c0c4, 1.15); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.9);
sun.position.set(-30, 70, 40); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 45, bottom: -45, near: 10, far: 200 });
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
scene.add(sun);

const world = buildScene(scene);
const { layers, cars, cranes } = world;
const stages = buildStages(world, scene);
const green = buildGreen(world, scene, stages); world.green = green;
const STAGES = window.SHAPAN_STAGES;

// ---------- 视角 ----------
const VIEWS = {
  top: { name: '俯瞰', pos: [0, 88, 30], tgt: [0, 0, 0] },
  south: { name: '南侧', pos: [18, 30, 70], tgt: [-3, 2, -4], photo: 0 },
  east: { name: '东侧', pos: [90, 23, 2], tgt: [-4, 2, -2], photo: 1 },
  north: { name: '北侧', pos: [-4, 27, -76], tgt: [0, 1, 3], photo: 2 },
  west: { name: '西侧', pos: [-96, 30, 10], tgt: [4, 0, -1], photo: 3 }
};
function setView(v, instant) {
  const V = VIEWS[v]; if (!V) return;
  const tgt = new THREE.Vector3(...V.tgt), pos = new THREE.Vector3(...V.pos);
  const asp = host.clientWidth / host.clientHeight;
  if (asp < 1.2) pos.sub(tgt).multiplyScalar(Math.min(1.7, .78 / Math.max(asp, .45))).add(tgt);
  flyTo(pos, tgt, instant);
}
let fly = null;
function flyTo(pos, tgt, instant) {
  exitWalk();
  if (instant || reduceMotion) { camera.position.copy(pos); controls.target.copy(tgt); controls.update(); return; }
  fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: tgt, s: performance.now(), d: 1100 };
}

// ---------- 模式 ----------
// site ① 智慧工地 = LAB；build ② 建造过程 = P0、S0–S5、S7；ops ③ 建成运维 = S6；ws ④ 构件工坊
const MODES = {
  site: { n: '①', name: '智慧工地', icon: 'site', c: '#0ea5e9' },
  build: { n: '②', name: '建造过程', icon: 'build', c: '#f59e0b' },
  ops: { n: '③', name: '建成运维', icon: 'ops', c: '#14b8a6' },
  ws: { n: '④', name: '构件工坊', icon: 'ws', c: '#8b5cf6' }
};
const TL = ['P0', 'S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S7'];
const modeOfStage = id => id === 'LAB' ? 'site' : id === 'S6' ? 'ops' : 'build';
let mode = null;
const last0 = LS.get('shapan.last', null);
let lastBuild = last0 && last0.build && TL.includes(last0.build) ? last0.build : 'P0';

// ---------- 点位标记 ----------
const CAT = {
  site: { name: '智慧工地设备', color: '#0ea5e9', icon: 'c_site' },
  green: { name: '绿色施工', color: '#16a34a', icon: 'c_green' },
  prefab: { name: '装配式构件', color: '#8b5cf6', icon: 'c_prefab' },
  safe: { name: '安全教育与管理', color: '#f97316', icon: 'c_safe' },
  ops: { name: '智能运维（1#楼）', color: '#14b8a6', icon: 'c_ops' }
};
const OPS = (DATA.opsPoints || []).map(p => ({ ...p, cat: 'ops' }));
const ALLP = DATA.points.concat(OPS);
const pColor = p => p.group ? '#65a30d' : CAT[p.cat].color;
const pIcon = p => p.group ? 'c_gops' : CAT[p.cat].icon;
const pNo = p => p.cat === 'ops' ? '运' + (OPS.indexOf(p) + 1) : String(DATA.points.indexOf(p) + 1);
const inLab = p => p.cat !== 'ops' && (!p.stages || p.stages.includes('LAB'));
const learned = new Set(LS.get('shapan.learned', []));
const saveLearned = () => { LS.set('shapan.learned', [...learned]); updateProgress(); };
const markerLayer = $('#markers');
const markers = ALLP.map((p, i) => {
  const el = document.createElement('button');
  el.className = 'marker'; el.style.setProperty('--c', pColor(p));
  el.innerHTML = `<span class="dot">${icon(pIcon(p))}</span><span class="lbl"><em>${pNo(p)}</em>${p.name}</span>`;
  el.setAttribute('aria-label', `${pNo(p)} ${p.name}`);
  el.addEventListener('click', e => { e.stopPropagation(); openPoint(p.id, true); });
  markerLayer.appendChild(el);
  return { p, el, v: new THREE.Vector3(...p.pos), i };
});
let catFilter = new Set(Object.keys(CAT));
let showMarkers = true, showStagePts = false;
function refreshMarkerClasses() {
  markers.forEach(m => { m.el.classList.toggle('learned', learned.has(m.p.id)); });
  document.querySelectorAll('.pitem[data-p]').forEach(b => b.classList.toggle('learned', learned.has(b.dataset.p)));
}
const tmpV = new THREE.Vector3();
function placeMarkers() {
  const w = host.clientWidth, h = host.clientHeight;
  markers.forEach(m => {
    const st = stages.stage;
    const isOps = m.p.cat === 'ops';
    let stageOk = isOps ? (st && (st.id === 'S6' || st.id === 'S5')) : !(st && (st.id === 'S5' || st.id === 'S6'));
    if (!isOps && st) { const sp = m.p.stages; if (st.id === 'P0' || st.id === 'S7') stageOk = (sp && sp.includes(st.id)) || st.points.includes(m.p.id); else if (sp) stageOk = sp.includes(st.id) || (st.id === 'LAB' && sp.includes('LAB')) || ((st.id === 'S5' || st.id === 'S6') && sp.includes(st.id)); }
    const sv = st ? st.view : {};
    const need = { crane1: sv.crane, crane2: sv.crane, hoist: sv.hoist, unload: sv.oldBld && sv.hA >= 9, grout: sv.oldBld && sv.hA >= 9, 'pit-monitor': sv.pit, patrol: sv.pit || sv.prep === false };
    const hostOk = !(m.p.id in need) || !!need[m.p.id];
    const isCur = current && current.id === m.p.id;
    // 模式规则：① 只显示工地点位；② 默认不显示，打开「点位」后显示本阶段（或本步工序）的点位；③ 只显示运维点位
    let modeOk = false;
    if (mode === 'site') modeOk = !isOps;
    else if (mode === 'ops') modeOk = isOps;
    else if (mode === 'build') modeOk = showStagePts && (procInfo ? procInfo.points.includes(m.p.id) : st.points.includes(m.p.id));
    if (isCur || (scen.active && scen.pointId === m.p.id)) modeOk = mode !== 'ws';
    const scenOk = !scen.active || scen.pointId === m.p.id;
    const vis = showMarkers && catFilter.has(m.p.cat) && !walk && modeOk && (stageOk || isCur) && hostOk && scenOk;
    if (!vis) { m.el.style.display = 'none'; return; }
    m.el.classList.toggle('dim', mode === 'build' && !isOps && st && st.points.length > 0 && !st.points.includes(m.p.id) && !isCur);
    tmpV.copy(m.v); if (isOps && m.p.floor != null) tmpV.y += stages.peelNow * m.p.floor * 1.4;
    tmpV.project(camera);
    if (tmpV.z > 1 || tmpV.x < -1.1 || tmpV.x > 1.1 || tmpV.y < -1.1 || tmpV.y > 1.1) { m.el.style.display = 'none'; return; }
    m.el.style.display = '';
    const x = (tmpV.x * .5 + .5) * w, y = (-tmpV.y * .5 + .5) * h;
    m.el.style.transform = `translate(${x}px,${y}px)`;
    m.el.style.zIndex = String(1000 - Math.round(tmpV.z * 900));
  });
}

// ---------- 点位面板 ----------
const panel = $('#panel');
let current = null;
function openPoint(id, focus) {
  const p = ALLP.find(x => x.id === id); if (!p) return;
  current = p;
  const list = a => a && a.length ? `<ul>${a.map(x => `<li>${x}</li>`).join('')}</ul>` : '<p class="muted">—</p>';
  const ph = (p.photos || []).map(n => ({ n, src: photoSrc(n) })).filter(x => x.src).slice(0, 3);
  panel.querySelector('.pbody').innerHTML = `
    <div class="ptag" style="--c:${pColor(p)}">${pNo(p)} · ${p.group || CAT[p.cat].name}</div>
    <h2>${p.name}</h2>
    ${p.cat === 'ops' ? `<p class="sign">${p.site || '运维阶段 · 1# 楼（竣工后）· 教学设计点位'}</p>` : `<p class="sign">沙盘标牌：<b>${p.sign}</b>${p.verify ? ' <span class="verify">待核实</span>' : ''}</p>`}
    ${ph.length ? `<div class="photos">${ph.map(x => `<figure><img loading="lazy" src="${x.src}" alt="实物照片 ${x.n}"><figcaption>照片 ${String(x.n).padStart(2, '0')}</figcaption></figure>`).join('')}</div>` : ''}
    <h3>这是什么</h3><p>${p.what}</p>
    <h3>解决什么问题</h3><p>${p.problem}</p>
    <h3>采集哪些数据</h3>${list(p.data)}
    <h3>触发什么告警</h3>${list(p.alarms)}
    ${p.norm ? `<h3>参考规范</h3><p class="small">${p.norm}</p>` : ''}
    ${p.verifyNote ? `<p class="note">说明：${p.verifyNote}</p>` : ''}
    <div class="pact">
      ${scen.has(p.id) ? `<button class="btn primary" id="scenBtn">▶ 场景演示（六步闭环 + 小题）</button>` : p.demo ? `<button class="btn primary" id="demoBtn">▶ 场景演示</button>` : ''}
      <button class="btn" id="learnBtn">${learned.has(p.id) ? '✓ 已学习' : '标记为已学'}</button>
    </div>
    ${p.demo ? `<p class="muted small">演示：${p.demo}</p>` : ''}`;
  panel.classList.add('open'); body.classList.add('panel-open'); applyOffset();
  markers.forEach(m => m.el.classList.toggle('active', m.p.id === id));
  document.querySelectorAll('.pitem[data-p]').forEach(b => b.classList.toggle('on', b.dataset.p === id));
  $('#learnBtn').onclick = () => { learned.has(p.id) ? learned.delete(p.id) : learned.add(p.id); saveLearned(); refreshMarkerClasses(); openPoint(p.id, false); };
  const db = $('#demoBtn'); if (db) db.onclick = () => runDemo(p);
  const sb = $('#scenBtn'); if (sb) sb.onclick = () => { if (proc.active) proc.toggle && procInfo && procInfo.playing && proc.toggle(); scen.start(p, panel.querySelector('.pbody')); panel.querySelector('.pbody').scrollTop = 0; const t = new THREE.Vector3(...p.pos); if (p.cat === 'ops' && p.floor != null) t.y += stages.peel * p.floor * 1.4; t.y = Math.min(t.y, 14); const d = p.pos[1] > 12 ? 26 : 13; flyTo(new THREE.Vector3(t.x + d * .55, t.y + d * .7, t.z + d * .75), t); };
  if (scen.active && scen.pointId !== p.id) scen.stop(false);
  panel.querySelectorAll('.photos img').forEach(img => { img.onclick = () => showPhoto(img.src); img.onerror = () => { const f = img.closest('figure'); if (f) f.remove(); const g = panel.querySelector('.photos'); if (g && !g.children.length) g.remove(); }; });
  if (focus) {
    const t = new THREE.Vector3(...p.pos); if (p.cat === 'ops' && p.floor != null) t.y += stages.peel * p.floor * 1.4; t.y = Math.min(t.y, p.cat === 'ops' ? 14 : 8);
    const dir = camera.position.clone().sub(controls.target).normalize();
    const dist = p.pos[1] > 12 ? 40 : 28;
    flyTo(t.clone().add(dir.multiplyScalar(dist)).setY(Math.max(t.y + dist * .55, 9)), t);
  }
  if (!learned.has(p.id)) { learned.add(p.id); saveLearned(); refreshMarkerClasses(); }
  if (compact()) setSide(false);
  emit('point', id);
}
function closePanel() { scen.stop(false); panel.classList.remove('open'); body.classList.remove('panel-open'); applyOffset(); markers.forEach(m => m.el.classList.remove('active')); document.querySelectorAll('.pitem.on').forEach(b => b.classList.remove('on')); current = null; }
$('#panelClose').onclick = closePanel;
// 打开点位前先切到它所在的模式和阶段
function stageForPoint(p) {
  const cur = stages.stage ? stages.stage.id : 'LAB';
  if (p.cat === 'ops') return 'S6';
  const inSt = id => { const s = STAGES.find(x => x.id === id); return (s && (s.points || []).includes(p.id)) || (p.stages && p.stages.includes(id)); };
  if (mode === 'build' && inSt(cur)) return cur;
  if (mode === 'build') { const s = TL.find(id => inSt(id)); if (s) return s; }
  if (inLab(p)) return 'LAB';
  return (p.stages && p.stages.find(x => x !== 'LAB' && x !== 'S6')) || (TL.find(id => inSt(id))) || 'LAB';
}
function gotoPoint(id, focus = true) {
  const p = ALLP.find(x => x.id === id); if (!p) return;
  const sid = stageForPoint(p);
  if (!stages.stage || stages.stage.id !== sid || mode === 'ws') setStage(sid);
  openPoint(id, focus);
}

function runDemo(p) {
  const m = markers.find(x => x.p.id === p.id);
  m.el.classList.add('alarm');
  toast(`⚠ 告警演示 · ${p.name}：${p.demo}`, 'alarm');
  if (p.id === 'env') { stages.setSpray(true); $('#sprayToggle').checked = true; setTimeout(() => { stages.setSpray(false); $('#sprayToggle').checked = false; }, 9000); }
  setTimeout(() => m.el.classList.remove('alarm'), 4200);
}
let toastT;
function toast(msg, kind) {
  const t = $('#toast'); t.textContent = msg; t.className = 'show ' + (kind || '');
  clearTimeout(toastT); toastT = setTimeout(() => t.className = '', 4200);
}
function showPhoto(src) { $('#lightbox img').src = src; $('#lightbox').classList.add('open'); }
$('#lightbox').onclick = () => $('#lightbox').classList.remove('open');

// ---------- 进度 ----------
function updateProgress() {
  const n = DATA.points.filter(p => learned.has(p.id)).length;
  $('#progress').textContent = `已学 ${n}/${DATA.points.length}`;
  $('#progressBar').style.width = (n / DATA.points.length * 100) + '%';
}

// ---------- 图标装进按钮 ----------
$('#homeBtn').innerHTML = icon('home'); $('#helpBtn').innerHTML = icon('help'); $('#fsBtn').innerHTML = icon('fs');
$('#teachBtn .ti').outerHTML = icon('learn');
document.querySelectorAll('.mtab').forEach(b => b.querySelector('.mi').outerHTML = icon(MODES[b.dataset.mode].icon));
$('#dataBtn').innerHTML = `${icon('data')}<span>数据</span>`;
const TOOLS = { view: ['view', '视角'], roam: ['roam', '漫游'], env: ['env', '环境'], layers: ['layers', '图层'] };
document.querySelectorAll('#tools>button').forEach(b => { const [k, n] = TOOLS[b.dataset.pop]; b.innerHTML = `${icon(k)}<span>${n}</span>`; b.setAttribute('aria-label', n); });
$('#tlPts').innerHTML = `${icon('pin')}<span>点位</span>`;

// ---------- 图层开关（工具条 · 图层） ----------
const layerBox = $('#layers');
Object.values(layers).forEach(g => {
  if (g.userData.layer === 'base') return;
  const lab = document.createElement('label'); lab.className = 'chk';
  lab.innerHTML = `<input type="checkbox" checked> <span>${g.name}</span>`;
  lab.querySelector('input').onchange = e => { g.visible = e.target.checked; };
  layerBox.appendChild(lab);
});
$('#shellToggle').onchange = e => {
  const on = e.target.checked;
  if (layers.bldA.userData.climb) layers.bldA.userData.climb.visible = !on;
  (layers.bldB.userData.parts || []).forEach(p => p.net && (p.net.visible = !on));
};
const catBox = $('#cats');
Object.entries(CAT).forEach(([k, c]) => {
  const lab = document.createElement('label'); lab.className = 'chk';
  lab.innerHTML = `<input type="checkbox" checked> <i style="background:${c.color}"></i><span>${c.name}</span>`;
  lab.querySelector('input').onchange = e => { e.target.checked ? catFilter.add(k) : catFilter.delete(k); };
  catBox.appendChild(lab);
});
$('#markerToggle').onchange = e => { showMarkers = e.target.checked; };

// ---------- 弹出小面板 ----------
function closePops() { document.querySelectorAll('.pop.open').forEach(p => p.classList.remove('open')); document.querySelectorAll('#tools>button.on').forEach(b => b.classList.remove('on')); }
function openPop(k) {
  const pop = $('#pop-' + k), btn = document.querySelector(`#tools>button[data-pop="${k}"]`);
  const was = pop.classList.contains('open'); closePops(); if (was) return;
  pop.classList.add('open'); btn.classList.add('on');
  const tr = $('#tools').getBoundingClientRect(), br = btn.getBoundingClientRect();
  pop.style.right = (innerWidth - tr.left + 8) + 'px';
  const hdr = $('header').offsetHeight;
  pop.style.top = ''; pop.style.bottom = Math.max(8, innerHeight - br.bottom) + 'px';
  if (pop.getBoundingClientRect().top < hdr + 8) { pop.style.bottom = ''; pop.style.top = hdr + 8 + 'px'; }
}
document.querySelectorAll('#tools>button').forEach(b => b.onclick = e => { e.stopPropagation(); openPop(b.dataset.pop); });
window.addEventListener('pointerdown', e => { if (!e.target.closest('.pop,#tools')) closePops(); });

// ---------- 学习面板（左） ----------
function setSide(open) { body.classList.toggle('side-min', !open); setTimeout(applyOffset, 30); }
$('#sideMin').onclick = () => setSide(false);
$('#sideOpen').onclick = () => setSide(true);
const sideOpenLabel = () => { const m = MODES[mode] || MODES.site; $('#sideOpen').innerHTML = `${icon('list')}<span>${procInfo ? `工序 ${procInfo.idx + 1}/${procInfo.n}` : '学习面板'}</span>`; $('#sideOpen').style.setProperty('--c', m.c); };
const pItem = p => `<button class="pitem${learned.has(p.id) ? ' learned' : ''}" data-p="${p.id}"><i style="background:${pColor(p)}">${icon(pIcon(p))}</i><span>${p.name}</span><em>${pNo(p)}</em></button>`;
function renderSideSite() {
  const lab = STAGES.find(s => s.id === 'LAB');
  const groups = ['site', 'green', 'prefab', 'safe'].map(k => [k, DATA.points.filter(p => p.cat === k && inLab(p))]);
  $('#sideSite').innerHTML = `<div class="sintro"><p>实验室沙盘现状：1# 楼装配式、2# 楼现浇，主体施工中。点一个点位，看它<b>是什么、解决什么问题、采集哪些数据</b>，再看场景演示。</p>
    ${lab && lab.think ? `<p class="think"><b>想一想：</b>${lab.think}</p>` : ''}</div>
    ${groups.map(([k, ps]) => `<div class="pcat"><h4><i style="background:${CAT[k].color}">${icon(CAT[k].icon)}</i>${CAT[k].name}<small>${ps.length}</small></h4>${ps.map(pItem).join('')}</div>`).join('')}`;
  $('#sideSite').querySelectorAll('[data-p]').forEach(b => b.onclick = () => gotoPoint(b.dataset.p, true));
}
function renderSideOps() {
  const smart = OPS.filter(p => !p.group), gr = OPS.filter(p => p.group);
  $('#sideOps').innerHTML = `<div class="sbar"><button class="sbtn" id="peelBtn">${icon('layers')}<span></span></button><button class="sbtn pri" data-dk="ops">${icon('data')}运维大屏</button><button class="sbtn" data-dk="green">绿色运维</button><button class="sbtn" data-dk="lca">全寿命周期碳</button></div>
    <div class="pcat"><h4><i style="background:${CAT.ops.color}">${icon('c_ops')}</i>建筑智能运维<small>${smart.length}</small></h4>${smart.map(pItem).join('')}</div>
    <div class="pcat"><h4><i style="background:#65a30d">${icon('c_gops')}</i>绿色建筑运维<small>${gr.length}</small></h4>${gr.map(pItem).join('')}</div>
    <p class="ssub">运维阶段说明</p>`;
  $('#sideOps').querySelectorAll('[data-p]').forEach(b => b.onclick = () => gotoPoint(b.dataset.p, true));
  $('#sideOps').querySelectorAll('[data-dk]').forEach(b => b.onclick = () => openData(b.dataset.dk));
  $('#peelBtn').onclick = () => { stages.setPeel(!stages.peel); syncPeel(); };
  syncPeel();
}
function syncPeel() { const b = $('#peelBtn'); if (!b) return; b.classList.toggle('on', !!stages.peel); b.querySelector('span').textContent = stages.peel ? '合拢 1# 楼' : '分层剖开 1# 楼'; }

// ---------- 漫游（车内 / 人视角 / 参观路线） ----------
const routes = {
  car: [[38, .9, -30], [36.9, .9, -24], [36.9, .9, -19.5], [33, .9, -18], [28.5, .9, -18], [26.4, .9, -14], [26.4, .9, -4], [26.4, .9, .8], [18, .9, .8], [5, .9, .8], [-10, .9, .8], [-22, .9, .8], [-25.2, .9, -2], [-25.2, .9, -12], [-25.2, .9, -18.8], [-18, .9, -18.8], [-5, .9, -18.8], [10, .9, -18.8], [22, .9, -18.8], [28.5, .9, -18], [33, .9, -18], [34.6, .9, -14], [34.6, .9, 8], [34.6, .9, 30]],
  walk: [[30.5, .62, 13], [28, .62, 12.6], [24, .62, 9.3], [10, .62, 9.3], [-8, .62, 9.3], [-17, .62, 9.6], [-17, .62, 6], [-17, .62, 3.2], [-12, .62, 1], [-4, .62, .9], [6, .62, .9], [12, .62, .6], [16, .62, -1.6], [20, .62, -1.6], [26.2, .62, -1], [26.4, .62, -8], [26.4, .62, -16], [20, .62, -19], [8, .62, -19], [-2, .62, -19], [-12, .62, -19], [-20, .62, -19], [-25, .62, -14], [-25, .62, -4]]
};
let walk = null;
function startWalk(kind) {
  closePanel(); fly = null;
  const pts = routes[kind].map(a => new THREE.Vector3(...a));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', .2);
  walk = { kind, curve, t: 0, len: curve.getLength(), speed: kind === 'car' ? 4.2 : 1.6, paused: false, saved: { p: camera.position.clone(), t: controls.target.clone() } };
  controls.enabled = false; camera.fov = 62; camera.updateProjectionMatrix();
  body.classList.add('walking'); $('#walkName').textContent = kind === 'car' ? '车内视角 · 环场行驶' : '人视角 · 从生活区走进施工区';
  $('#walkPause').textContent = '暂停'; applyOffset();
}
function exitWalk() {
  if (!walk) return;
  const s = walk.saved; walk = null;
  controls.enabled = true; camera.fov = 42; camera.updateProjectionMatrix();
  camera.position.copy(s.p); controls.target.copy(s.t); controls.update();
  body.classList.remove('walking'); resize();
}
$('#walkExit').onclick = exitWalk;
$('#walkPause').onclick = () => { if (!walk) return; walk.paused = !walk.paused; $('#walkPause').textContent = walk.paused ? '继续' : '暂停'; };
let look = { yaw: 0, pitch: 0, drag: null };
renderer.domElement.addEventListener('pointerdown', e => { if (walk) look.drag = { x: e.clientX, y: e.clientY, yaw: look.yaw, pitch: look.pitch }; });
window.addEventListener('pointermove', e => { if (walk && look.drag) { look.yaw = look.drag.yaw - (e.clientX - look.drag.x) * .005; look.pitch = Math.max(-.6, Math.min(.6, look.drag.pitch - (e.clientY - look.drag.y) * .004)); } });
window.addEventListener('pointerup', () => look.drag = null);

// 参观路线（在 ① 智慧工地里走）
const TOUR = ['cloud', 'board', 'realname', 'ai-attend', 'video-ai', 'vr', 'helmet', 'hole-fall', 'quality', 'prefab-show', 'jiguan', 'person-loc', 'hoist', 'unload', 'crane1', 'grout', 'pit-monitor', 'crane2', 'env', 'vehicle', 'sewage', 'rebar-ai', 'smoke', 'stair-lift', 'prefab-lift', 'slab-lift', 'water-elec', 'weigh', 'danger'];
let tourI = -1;
function tourStep(d) {
  if (stages.stage.id !== 'LAB' || mode !== 'site') setStage('LAB');
  tourI = (tourI + d + TOUR.length) % TOUR.length;
  openPoint(TOUR[tourI], true);
  body.classList.add('touring');
  $('#tourName').textContent = `参观路线 ${tourI + 1}/${TOUR.length}`;
}
function endTour() { body.classList.remove('touring'); tourI = -1; }
$('#tourNext').onclick = () => tourStep(1);
$('#tourPrev').onclick = () => tourStep(-1);
$('#tourExit').onclick = endTour;

document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => { setView(b.dataset.view); closePops(); });
document.querySelectorAll('[data-walk]').forEach(b => b.onclick = () => { closePops(); startWalk(b.dataset.walk); });
$('#tourBtn').onclick = () => { closePops(); exitWalk(); tourI = -1; tourStep(1); };
$('#fsBtn').onclick = () => { const d = document.documentElement; document.fullscreenElement ? document.exitFullscreen() : (d.requestFullscreen && d.requestFullscreen()); };
$('#rotateBtn').onclick = async () => {
  try { await document.documentElement.requestFullscreen(); await screen.orientation.lock('landscape'); }
  catch (e) { toast('请关闭手机方向锁定，把手机横过来查看'); }
};
renderer.domElement.addEventListener('click', () => { if (!walk && window.innerWidth < 700) closePanel(); });

// ---------- 阶段时间轴（② 建造过程） ----------
addCSS(DASH_CSS);
const chips = $('#tlChips');
TL.forEach((id, i) => {
  const s = STAGES.find(x => x.id === id);
  const b = document.createElement('button'); b.className = 'chip'; b.dataset.stage = id;
  b.innerHTML = `<i>${i + 1}</i><span>${s.name}</span>`; b.onclick = () => { stopPlay(); setStage(id); };
  chips.appendChild(b);
});
function scrollChip() { const c = chips.querySelector('.chip.on'); if (!c) return; requestAnimationFrame(() => { const l = c.offsetLeft - chips.offsetLeft, r = l + c.offsetWidth; if (l < chips.scrollLeft) chips.scrollLeft = l - 4; else if (r > chips.scrollLeft + chips.clientWidth) chips.scrollLeft = r - chips.clientWidth + 4; }); }
window.addEventListener('resize', () => setTimeout(scrollChip, 80));
let playAll = false; setTimeout(() => playLabel(false));
const playLabel = on => { $('#tlPlay').innerHTML = on ? '■<span class="plt"> 停止</span>' : '▶<span class="plt"> 全过程</span>'; $('#tlPlay').title = on ? '停止' : '播放全过程'; };
function stopPlay() { playAll = false; playLabel(false); }
$('#tlPlay').onclick = () => {
  if (playAll) { stopPlay(); proc.stop(); return; }
  playAll = true; playLabel(true);
  let id = stages.stage.id; if (!TL.includes(id) || id === 'S7') id = 'P0';
  setStage(id, true); proc.start(id);
};
$('#tlPts').onclick = () => { showStagePts = !showStagePts; $('#tlPts').classList.toggle('on', showStagePts); $('#tlPts').setAttribute('aria-pressed', String(showStagePts)); toast(showStagePts ? '已显示本阶段的点位' : '已隐藏点位'); };

// 构件工坊交叉链接：主体结构工序里提到的预制构件
const WS_LINKS = [['pc-column', /预制柱|套筒灌浆/, '预制柱'], ['comp-beam', /叠合梁/, '叠合梁'], ['comp-slab', /叠合板/, '叠合板'], ['pc-stair', /预制楼梯/, '预制楼梯'], ['pc-wall', /外墙板/, '外墙板']];
const wsLinks = (sid, text) => {
  if (sid !== 'S3') return '';
  const hit = WS_LINKS.filter(([, re]) => re.test(text));
  if (!hit.length) return '';
  return `<span class="wsl">${hit.length === 1 ? `<button data-ws="${hit[0][0]}" title="在构件工坊里拆开看${hit[0][2]}">构件工坊 ›</button>` : `<small class="muted">构件工坊：</small>${hit.map(([id, , n]) => `<button data-ws="${id}" title="在构件工坊里拆开看${n}">${n} ›</button>`).join('')}`}</span>`;
};
const bindWs = el => el.querySelectorAll('[data-ws]').forEach(b => b.onclick = e => { e.stopPropagation(); enterWorkshop(b.dataset.ws); });

function setStage(id, instant) {
  const s = STAGES.find(x => x.id === id); if (!s) return;
  if (mode === 'ws') leaveWorkshop();
  if (teach) teach.visit(id);
  if (proc.active) { proc.stop(true); procUI(null); }
  stages.apply(id, instant);
  document.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c.dataset.stage === id));
  scrollChip();
  const pts = s.points.map(pid => ALLP.find(p => p.id === pid)).filter(Boolean);
  const F = (window.SHAPAN_FOCUS || {})[s.id];
  $('#stageCard .scb').innerHTML = `
    <div class="sch"><span>${s.month}</span><b>${s.name}</b></div>
    ${proc.has(id) ? `<div class="spts"><button id="procBtn" style="--c:#f59e0b">▶ 播放本阶段工序动画</button></div>` : ''}
    <h4>主要工序 <small class="fhint">${F ? '点击一条，聚焦到模型' : ''}</small></h4><ol class="pfl">${s.process.map((x, i) => `<li${(F || [])[i] != null ? ` class="pf" data-fi="${i}" title="点击聚焦到模型"` : ''}>${x}${wsLinks(s.id, x)}</li>`).join('')}</ol>
    <h4>关键安全与质量要求</h4><ul>${s.safety.map(x => `<li>${x}</li>`).join('')}</ul>
    ${s.green ? `<h4 class="gh">绿色建造 · ${s.green.theme}</h4><ul class="gl">${s.green.measures.map(([c, t]) => `<li><b class="gtag" data-c="${c}">${c}</b>${t}</li>`).join('')}</ul>` : ''}
    <p class="norms">依据：${s.norms.map(([c, k]) => `<span>${c}${k ? (k.includes('待核实') ? '（条文号待核实）' : ' 第 ' + k + ' 条') : ''}</span>`).join('')}</p>
    ${pts.length ? `<h4>本阶段重点点位</h4><div class="spts">${pts.map(p => `<button data-p="${p.id}" style="--c:${pColor(p)}">${p.name}</button>`).join('')}</div>` : ''}
    <p class="think"><b>想一想：</b>${s.think}</p>`;
  const pbn = $('#procBtn'); if (pbn) pbn.onclick = () => { proc.start(id); };
  $('#stageCard').querySelectorAll('[data-p]').forEach(b => b.onclick = () => openPoint(b.dataset.p, true));
  $('#stageCard').querySelectorAll('li.pf').forEach(li => li.onclick = () => focusProc(id, +li.dataset.fi));
  bindWs($('#stageCard'));
  window.__peelCam = on => { if (on) flyTo(new THREE.Vector3(14, 30, 40), new THREE.Vector3(-16, 13, -9)); };
  syncPeel();
  if (current && ((current.cat === 'ops') !== (id === 'S5' || id === 'S6'))) closePanel();
  dash.setStage(id);
  if (id === 'P0' && !instant) flyTo(new THREE.Vector3(0, 46, 56), new THREE.Vector3(0, 2, 0));
  if (id === 'S7' && !instant) flyTo(new THREE.Vector3(4, 22, 26), new THREE.Vector3(-12, 4, -4));
  if (id === 'S6' && !instant) flyTo(new THREE.Vector3(-2, 26, 32), new THREE.Vector3(-14, 6, -9));
  if (TL.includes(id)) lastBuild = id;
  applyModeUI(modeOfStage(id));
}

// ---------- 模式切换 ----------
function sideTitle() {
  const s = stages.stage;
  if (mode === 'site') return '① 智慧工地 · 点位目录';
  if (mode === 'ops') return '③ 建成运维 · 1# 楼';
  if (mode === 'build' && s) return `② 阶段 ${TL.indexOf(s.id) + 1}/${TL.length} · ${s.name}`;
  return '学习面板';
}
let started = false; // 首页关掉（或深链接打开）之后才记「上次学到哪」
function saveLast() { if (!started) return; LS.set('shapan.last', { mode, stage: mode === 'ws' ? (wsPrev && wsPrev.stage) || 'LAB' : stages.stage && stages.stage.id, build: lastBuild, ws: wsCur }); }
function applyModeUI(m) {
  const prev = mode; mode = m;
  Object.keys(MODES).forEach(k => body.classList.toggle('mode-' + k, k === m));
  document.querySelectorAll('.mtab').forEach(b => { b.classList.toggle('on', b.dataset.mode === m); b.setAttribute('aria-selected', String(b.dataset.mode === m)); });
  $('#sideTitle').textContent = sideTitle(); sideOpenLabel();
  if (prev !== m) { closePops(); emit('mode', m); if (body.classList.contains('split') && m !== 'ws') dash.open(dashKindFor(m)); }
  saveLast(); applyOffset();
}
function setMode(m, o = {}) {
  stopPlay();
  if (m === 'ws') return enterWorkshop(o.ws);
  const tgt = m === 'site' ? 'LAB' : m === 'ops' ? 'S6' : (o.stage && TL.includes(o.stage) ? o.stage : lastBuild);
  const from = mode;
  if (mode === 'ws') leaveWorkshop();
  if (!stages.stage || stages.stage.id !== tgt) setStage(tgt, o.instant); else applyModeUI(m);
  if (m === 'site' && from && from !== 'site' && from !== 'ws' && !o.instant) setView('south');
}
document.querySelectorAll('.mtab').forEach(b => b.onclick = () => setMode(b.dataset.mode));

// ---------- 环境：昼夜、天气、喷淋 ----------
$('#dayToggle').onchange = e => stages.setDay(!e.target.checked);
$('#rainToggle').onchange = e => { stages.setWeather(e.target.checked ? 'rain' : 'clear'); if (e.target.checked) toast('暴雨模拟：基坑监测转为加密观测，塔吊风速、坑外水位重点关注'); };
$('#sprayToggle').onchange = e => { stages.setSpray(e.target.checked); if (e.target.checked) toast('环境监测 PM10 超限 → 围挡喷淋、雾炮联动开启，扬尘逐渐下降'); };
window.addEventListener('keydown', e => { if (e.code === 'Space' && e.target === body) { e.preventDefault(); $('#rainToggle').click(); } });

// ---------- 数据大屏 ----------
const dashKindFor = m => m === 'ops' ? 'ops' : 'construction';
const dash = mountDash($('#dash'), {
  standalone: false,
  onTarget: id => locateTarget(id),
  onFocus: (sid, i) => focusProc(sid, i),
  onStage: id => { if (!body.classList.contains('split')) dash.close(); if (proc.active) proc.stop(); setStage(id); toast('沙盘已切换到：' + ((STAGES.find(x => x.id === id) || {}).name || id)); },
  getStage: () => stages.stage && stages.stage.id,
  setStage: id => setStage(id),
  onClose: () => { setTimeout(() => { resize(); }, 60); },
  onSplit: () => setSplit(true, dash.kind),
  onLocate: (pid) => {
    if (!body.classList.contains('split')) dash.close();
    const p = ALLP.find(x => x.id === pid); if (!p) return;
    gotoPoint(pid, true); showRing(new THREE.Vector3(p.pos[0], Math.max(p.pos[1] - 1, .3), p.pos[2]), p.name, 2.2);
    const mk = markers.find(m => m.p.id === pid); if (mk) { mk.el.classList.add('alarm'); setTimeout(() => mk.el.classList.remove('alarm'), 5000); }
  }
});
// 打开数据面板，并把模式切到能看这块大屏的地方
function openData(kind) {
  if ((kind === 'ops' || kind === 'green') && mode !== 'ops') setStage('S6');
  else if (kind === 'construction' && (mode === 'ops' || mode === 'ws')) setStage('LAB');
  setSplit(true, kind);
}
$('#dataBtn').onclick = () => setSplit(true);

// ---------- 场景演示 ----------
const scen = buildScenario({ scene, world, stages });
addCSS(SCENARIO_CSS);
const quizRes = LS.get('shapan.quiz', {});
scen.onExit = id => openPoint(id, false);
scen.onResult((id, ok) => { quizRes[id] = ok; LS.set('shapan.quiz', quizRes); });

// ---------- 工序动画 ----------
const proc = buildProcess({ scene, world, stages, flyTo });
const pbar = $('#procBar');
const procUI = info => {
  procInfo = info;
  body.classList.toggle('proc-on', !!info);
  sideOpenLabel();
  if (!info) { pbar.innerHTML = ''; return; }
  const st = STAGES.find(x => x.id === info.stageId);
  pbar.innerHTML = `<div class="ph"><b>${st.name} · 第 ${info.idx + 1}/${info.n} 步</b><span class="pp"><i style="width:${((info.idx + info.k) / info.n * 100).toFixed(1)}%"></i></span>
      <button data-a="prev" title="上一步">⏮</button><button data-a="toggle" title="暂停/继续">${info.playing ? '❚❚' : '▶'}</button><button data-a="next" title="下一步">⏭</button>
      <select data-a="speed" aria-label="速度"><option value="0.6">0.6×</option><option value="1" selected>1×</option><option value="1.6">1.6×</option><option value="2.5">2.5×</option></select><button data-a="list" title="步骤目录">☰</button><button data-a="stop" title="退出">✕</button></div>
    <h3>${info.name}</h3>${wsLinks(info.stageId, info.name)}<p>${info.desc}</p><p class="pk"><b>要点：</b>${info.key}</p>${info.norm ? `<p class="pn">依据：${info.norm}</p>` : ''}
    ${info.points.length ? `<div class="spts">${info.points.map(id => { const p = ALLP.find(x => x.id === id); return p ? `<button data-p="${id}" style="--c:${pColor(p)}">${p.name}</button>` : ''; }).join('')}</div>` : ''}
    <ol class="plist">${info.names.map((n, i) => `<li class="${i === info.idx ? 'on' : i < info.idx ? 'done' : ''}" data-i="${i}">${n}</li>`).join('')}</ol>`;
  pbar.querySelector('[data-a=speed]').value = String(procSpeed);
  pbar.querySelectorAll('button[data-a]').forEach(b => b.onclick = () => { const a = b.dataset.a; if (a === 'stop') { stopPlay(); proc.stop(); } else if (a === 'list') pbar.classList.toggle('showlist'); else proc[a](); });
  pbar.querySelector('[data-a=speed]').onchange = e => { procSpeed = +e.target.value; proc.setSpeed(procSpeed); };
  pbar.querySelectorAll('[data-p]').forEach(b => b.onclick = () => openPoint(b.dataset.p, false));
  pbar.querySelectorAll('[data-i]').forEach(li => li.onclick = () => proc.jump(+li.dataset.i));
  bindWs(pbar);
  if (playAll && !info.playing && info.idx === info.n - 1 && info.k >= 1) {
    const i = TL.indexOf(info.stageId);
    if (i >= 0 && i < TL.length - 1) setTimeout(() => { if (!playAll) return; setStage(TL[i + 1], true); proc.start(TL[i + 1]); }, 1500); else stopPlay();
  }
};
proc.onChange(procUI);
let procSpeed = 1;
const glife = buildGreenLife({ scene, world, stages, proc }); world.glife = glife;
if (stages.stage) stages.apply(stages.stage.id, true);

// ---------- 数据面板（并列双屏） ----------
function setSplit(on, kind) {
  body.classList.toggle('split', on);
  body.classList.toggle('split-v', on && innerWidth / innerHeight < 1);
  if (on) dash.open(kind || dashKindFor(mode)); else dash.close();
  setTimeout(() => { resize(); window.dispatchEvent(new Event('resize')); }, 60);
  if (on) emit('data');
}
{ const hd = $('#splitHandle'); let drag = false;
  hd.addEventListener('pointerdown', e => { drag = true; hd.setPointerCapture(e.pointerId); });
  hd.addEventListener('pointermove', e => { if (!drag) return; const p = Math.max(30, Math.min(75, e.clientX / innerWidth * 100)); body.style.setProperty('--sp', p + '%'); resize(); window.dispatchEvent(new Event('resize')); });
  hd.addEventListener('pointerup', () => drag = false); }

// ---------- 构件工坊（④） ----------
addCSS(WORKSHOP_CSS);
let ws = null, wsPrev = null, wsCur = null, paused = false, rafId = 0;
function enterWorkshop(id) {
  if (mode !== 'ws') {
    wsPrev = { mode: mode && mode !== 'ws' ? mode : 'site', stage: stages.stage ? stages.stage.id : 'LAB' };
    stopPlay(); if (proc.active) { proc.stop(true); procUI(null); }
    closePanel(); if (body.classList.contains('split')) setSplit(false); exitWalk(); endTour();
    paused = true;
  }
  wsCur = id || wsCur;
  applyModeUI('ws');
  if (!ws) { try { ws = mountWorkshop($('#wsHost'), { onExit: backToSite, onQuiz: r => { if (!r || !r.id) return; const q = LS.get('shapan.wsquiz', {}); q[r.id] = { correct: r.correct, total: r.total, t: Date.now() }; LS.set('shapan.wsquiz', q); } }); } catch (e) { console.warn('构件工坊加载失败', e); } }
  if (ws) { ws.resize && ws.resize(); ws.open && ws.open(id); }
}
function leaveWorkshop() {
  if (mode !== 'ws') return;
  if (ws && ws.close) ws.close();
  mode = null; paused = false; clock.getDelta(); if (!rafId) tick(); resize();
}
function backToSite() {
  const p = wsPrev || { mode: 'site', stage: 'LAB' };
  leaveWorkshop();
  setMode(p.mode, { stage: p.stage, instant: true });
}
$('#wsBack').onclick = backToSite;

// ---------- 尺寸 ----------
function applyOffset() {
  const w = host.clientWidth, h = host.clientHeight;
  const sideW = (!body.classList.contains('side-min') && mode && mode !== 'ws' && !walk && !compact()) ? $('#side').offsetWidth + 12 : 0;
  const rpW = (panel.classList.contains('open') && w > 700 && !walk) ? Math.min(panel.offsetWidth + 12, w * .45) : 0;
  const x = (rpW - sideW) / 2;
  if (Math.abs(x) > 1) camera.setViewOffset(w, h, x, 0, w, h); else camera.clearViewOffset();
}
function resize() {
  const w = host.clientWidth, h = host.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  camera.fov = walk ? 62 : (w / h < 1 ? 50 : 42); camera.updateProjectionMatrix(); applyOffset();
  if (mode === 'ws' && ws && ws.resize) ws.resize();
}
window.addEventListener('resize', () => { body.classList.toggle('split-v', body.classList.contains('split') && innerWidth / innerHeight < 1); resize(); });
window.addEventListener('orientationchange', () => setTimeout(() => { resize(); window.dispatchEvent(new Event('resize')); }, 250));

// ---------- 动画循环 ----------
const clock = new THREE.Clock();
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
// ---------- 聚焦：工序说明 → 模型位置；大屏行 → 楼层 / 设备 / 传感器 ----------
const ringG = new THREE.Group(); ringG.visible = false; scene.add(ringG);
const ringM = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: .9, depthTest: false });
const ring = new THREE.Mesh(new THREE.TorusGeometry(1, .07, 8, 48), ringM); ring.rotation.x = Math.PI / 2; ring.renderOrder = 998; ringG.add(ring);
const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1, .04, 8, 48), ringM.clone()); ring2.rotation.x = Math.PI / 2; ring2.renderOrder = 998; ringG.add(ring2);
const beam = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 3.2, 6), new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: .6, depthTest: false })); beam.position.y = 1.6; beam.renderOrder = 998; ringG.add(beam);
let ringLabel = null, ringT = 0, ringR = 2, tintFloor = null;
function showRing(v, text, r = 2.5) {
  ringG.position.copy(v); ringR = r; ringT = 7; ringG.visible = true;
  if (ringLabel) { ringG.remove(ringLabel); ringLabel.material.map.dispose(); ringLabel = null; }
  if (text) { const c = document.createElement('canvas'), g = c.getContext('2d'), f = 'bold 40px "Noto Sans SC","Noto Sans CJK SC","PingFang SC","Microsoft YaHei",sans-serif'; g.font = f; const w = Math.min(g.measureText(text).width + 36, 1400); c.width = w; c.height = 64; g.font = f; g.fillStyle = '#0e7490'; g.beginPath(); g.roundRect(0, 0, w, 64, 14); g.fill(); g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.fillText(text, 18, 34, w - 36);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; ringLabel = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); ringLabel.scale.set(w / 64 * .38, .38, 1); ringLabel.position.y = 3.6; ringLabel.renderOrder = 999; ringG.add(ringLabel); }
}
function updateRing(dt, t) {
  if (!ringG.visible) return; ringT -= dt; if (ringT <= 0) { ringG.visible = false; if (tintFloor) { tintFloor.forEach(m => m.emissive.setHex(0)); tintFloor = null; } return; }
  const k = (t * .8) % 1; ring.scale.setScalar(ringR * (.9 + .15 * Math.sin(t * 4))); ring2.scale.setScalar(ringR * (1 + k * 1.2)); ring2.material.opacity = .8 * (1 - k);
  if (tintFloor) tintFloor.forEach(m => m.emissive.setHex(0x0891b2).multiplyScalar(.35 + .3 * Math.sin(t * 5)));
}
function focusProc(sid, i) {
  const f = ((window.SHAPAN_FOCUS || {})[sid] || [])[i]; if (f == null) return;
  if (!body.classList.contains('split')) dash.close();
  if (!stages.stage || stages.stage.id !== sid || mode === 'ws') setStage(sid, true);
  document.querySelectorAll('#stageCard li.pf').forEach(li => li.classList.toggle('on', +li.dataset.fi === i));
  if (typeof f === 'object') { const p = ALLP.find(x => x.id === f.pt); if (p) { openPoint(p.id, true); showRing(new THREE.Vector3(p.pos[0], Math.max(p.pos[1] - 1, .3), p.pos[2]), p.name, 2.2); } return; }
  if (!proc.has(sid)) return;
  proc.seek(sid, f, .7);
  const inf = proc.info(); if (inf && inf.cam) showRing(new THREE.Vector3(...inf.cam[1]), (STAGES.find(x => x.id === sid).process[i] || inf.name).split(/[：:]/)[0].slice(0, 22), 3);
}
function locateTarget(id) {
  const T = (window.SHAPAN_TARGETS || []).find(t => t.id === id); if (!T) return;
  if (!body.classList.contains('split')) dash.close();
  if (proc.active) { proc.stop(true); procUI(null); }
  const cur = stages.stage && stages.stage.id;
  const ok = { S6: ['S6'], S1: ['S1', 'S2', 'S3', 'LAB'], S3: ['S3', 'LAB'] }[T.stage] || [T.stage];
  if (!ok.includes(cur) || mode === 'ws') setStage(T.stage === 'S6' ? 'S6' : T.stage, true);
  closePanel();
  let v;
  if (T.floor) {
    const A = stages.A; if (stages.stage.id !== 'S6') setStage('S6', true);
    stages.setPeel(true); syncPeel();
    const i = Math.min(T.floor, A.AF + 1) - 1;
    v = new THREE.Vector3(A.ax + (T.dx || 0), i * A.afh + i * 1.4 + (T.floor > A.AF ? .4 : .2), A.az + (T.dz || 0));
    if (tintFloor) tintFloor.forEach(m => m.emissive.setHex(0));
    const fl = stages.floorsA[i]; tintFloor = fl ? fl.children[0].material.slice() : null;
    flyTo(new THREE.Vector3(v.x + 15, v.y + 7, v.z + 19), new THREE.Vector3(v.x, v.y + .5, v.z));
    showRing(v, T.name, T.kind === 'floor' ? 6 : 1.3);
  } else {
    v = new THREE.Vector3(...T.pos);
    flyTo(new THREE.Vector3(v.x + 12, v.y + 12, v.z + 17), v.clone());
    showRing(v, T.name, 1.4);
  }
  toast('已定位：' + T.name);
}

function tick() {
  if (paused) { rafId = 0; return; }
  const dt = Math.min(clock.getDelta(), .05);
  const now = performance.now();
  if (fly) {
    const k = Math.min((now - fly.s) / fly.d, 1), e = ease(k);
    camera.position.lerpVectors(fly.p0, fly.p1, e); controls.target.lerpVectors(fly.t0, fly.t1, e);
    if (k >= 1) fly = null;
  }
  if (!reduceMotion) {
    cars.forEach(c => { c.o.position.z += c.dir * dt * 2.2; if (c.o.position.z > 27.5) c.o.position.z = -27.5; if (c.o.position.z < -27.5) c.o.position.z = 27.5; });
    const t = now / 1000;
    if (!world.busy) {
      cranes[0].userData.top.rotation.y = Math.PI - 0.25 + Math.sin(t * .12) * .35;
      cranes[1].userData.top.rotation.y = Math.PI - 0.05 + Math.sin(t * .1 + 1.3) * .35;
      cranes.forEach((c, i) => { c.userData.trolley.position.x = c.userData.jibLen * (.5 + .25 * Math.sin(t * .2 + i)); });
    }
  }
  proc.update(reduceMotion ? dt * .6 : dt);
  scen.update(dt, now / 1000);
  const dk = stages.update(dt, now / 1000, {});
  green.update(dt, now / 1000, dk); if (glife) glife.update(dt, now / 1000); updateRing(dt, now / 1000);
  if (dash.isOpen && now - liveT > 900) { liveT = now; const sl = scen.live(), pr = procInfo ? { stageId: procInfo.stageId, idx: procInfo.idx, n: procInfo.n, k: procInfo.k, name: procInfo.name, points: procInfo.points } : null; const sig = JSON.stringify([sl && [sl.pointId, sl.step, Math.round(sl.value * 10)], pr && [pr.stageId, pr.idx, Math.round(pr.k * 10)]]); if (sig !== liveSig) { liveSig = sig; dash.setLive({ scen: sl, proc: pr }); } }
  hemi.intensity = .25 + .9 * dk; sun.intensity = .15 + 1.75 * dk;
  scene.background.setRGB(.06 + .85 * dk, .09 + .84 * dk, .16 + .78 * dk); scene.fog.color.copy(scene.background);
  if (walk) {
    if (!walk.paused) { walk.t += (walk.speed * dt) / walk.len; if (walk.t >= 1) walk.t = 0; }
    const p = walk.curve.getPointAt(walk.t), a = walk.curve.getPointAt(Math.min(walk.t + .004, 1));
    camera.position.copy(p);
    const dir = a.clone().sub(p); dir.y = 0; dir.normalize();
    dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), look.yaw);
    camera.lookAt(p.x + dir.x, p.y + Math.tan(look.pitch + .02), p.z + dir.z);
  } else controls.update();
  renderer.render(scene, camera);
  placeMarkers();
  rafId = requestAnimationFrame(tick);
}

// ---------- 学习中心 ----------
addCSS(TEACH_CSS);
teach = mountTeach({
  setStage: id => { stopPlay(); setStage(id); },
  openPoint: id => gotoPoint(id, true),
  playScenario: id => { gotoPoint(id, true); setTimeout(() => { const b = document.querySelector('#scenBtn'); if (b) b.click(); }, 350); },
  playProcess: id => { stopPlay(); setStage(id, true); proc.start(id); },
  openDash: kind => openData(kind),
  onReset: () => { learned.clear(); saveLearned(); refreshMarkerClasses(); Object.keys(quizRes).forEach(k => delete quizRes[k]); }
});
$('#teachBtn').onclick = () => teach.open();

// ---------- 首页 ----------
const nLab = DATA.points.filter(inLab).length;
const HOME = [
  ['site', `认识沙盘上 ${nLab} 个智慧工地、绿色施工、装配式和安全教育点位，看告警怎样发现、处置和闭环。`],
  ['build', `从绿色策划到拆除回收 ${TL.length} 个阶段：看工序动画，读安全要点和规范条文，数据大屏跟着阶段变。`],
  ['ops', '1# 楼建成以后：按楼层剖开，看能耗、设备告警和工单，再看绿色运维和全寿命周期碳排放。'],
  ['ws', '把预制柱、叠合梁、叠合板、预制楼梯和外墙板拆开，看构造和安装工序，再做几道小题。']
];
function renderHome() {
  $('#hcards').innerHTML = HOME.map(([k, line]) => { const M = MODES[k]; return `<button class="hcard" data-mode="${k}" style="--c:${M.c}"><span class="hi">${icon(M.icon)}</span><h3>${M.n} ${M.name}</h3><p>${line}</p><span class="go">进入 ›</span></button>`; }).join('');
  const L = LS.get('shapan.last', null);
  const lastName = L && L.mode && MODES[L.mode] ? `${MODES[L.mode].n} ${MODES[L.mode].name}${L.mode === 'build' && L.stage ? ' · ' + ((STAGES.find(s => s.id === L.stage) || {}).name || '') : ''}` : '';
  $('#hrow').innerHTML = `${lastName ? `<button class="hbig pri" id="hCont">▶ 继续上次学习 <small>${lastName}</small></button>` : ''}<button class="hbig sec" id="hTeach">${icon('learn')}学习中心</button><button class="hbig sec" id="hIntro">${icon('help')}新手引导</button>`;
  $('#hcards').querySelectorAll('.hcard').forEach(b => b.onclick = () => { const m = b.dataset.mode; closeHome(); if (!LS.get('shapan.introDone', false)) startIntro(() => setMode(m)); else setMode(m); });
  const hc = $('#hCont'); if (hc) hc.onclick = () => { closeHome(); if (L.mode === 'ws') setMode('ws', { ws: L.ws }); else setMode(L.mode, { stage: L.stage }); };
  $('#hTeach').onclick = () => { closeHome(); teach.open(); };
  $('#hIntro').onclick = () => { closeHome(); startIntro(); };
}
function openHome() { closePops(); renderHome(); body.classList.add('home-on'); }
function closeHome() { body.classList.remove('home-on'); if (!started) { started = true; saveLast(); } }
$('#homeBtn').onclick = openHome;
window.addEventListener('keydown', e => { if (e.key === 'Escape' && body.classList.contains('home-on')) closeHome(); });

// ---------- 新手引导（试一试，结束后清空） ----------
addCSS(INTRO_CSS);
const intro = makeIntro();
function clearTrial(snap) {
  stopPlay(); if (proc.active) { proc.stop(true); procUI(null); }
  scen.stop(false); closePanel(); exitWalk(); endTour(); closePops(); teach.close();
  if (body.classList.contains('split')) setSplit(false); else dash.close();
  [['dayToggle', () => stages.setDay(true)], ['rainToggle', () => stages.setWeather('clear')], ['sprayToggle', () => stages.setSpray(false)]].forEach(([id, f]) => { if ($('#' + id).checked) { $('#' + id).checked = false; f(); } });
  if (stages.peel) { stages.setPeel(false); syncPeel(); }
  // 恢复引导前的学习记录（已学点位、场景答题、阶段浏览、任务卡、上次位置）
  Object.keys(localStorage).filter(k => k.startsWith('shapan.') && k !== 'shapan.introDone').forEach(k => localStorage.removeItem(k));
  Object.entries(snap).forEach(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} });
  learned.clear(); LS.get('shapan.learned', []).forEach(x => learned.add(x));
  Object.keys(quizRes).forEach(k => delete quizRes[k]); Object.assign(quizRes, LS.get('shapan.quiz', {}));
  refreshMarkerClasses(); updateProgress();
  const L = LS.get('shapan.last', null); if (L && L.build && TL.includes(L.build)) lastBuild = L.build; else lastBuild = 'P0';
  showStagePts = false; $('#tlPts').classList.remove('on');
}
function startIntro(after) {
  if (intro.running) return;
  closeHome();
  const back = { mode: mode || 'site', stage: stages.stage ? stages.stage.id : 'LAB', ws: wsCur };
  const resume = after || (() => { if (back.mode === 'ws') setMode('ws', { ws: back.ws }); else setMode(back.mode, { stage: back.stage, instant: true }); });
  const snap = {}; Object.keys(localStorage).filter(k => k.startsWith('shapan.') && k !== 'shapan.introDone').forEach(k => { snap[k] = localStorage.getItem(k); });
  // 试用环境：① 智慧工地，南侧视角，面板都关着
  closePanel(); if (body.classList.contains('split')) setSplit(false); stopPlay();
  if (mode === 'ws') leaveWorkshop();
  setStage('LAB', true); setView('south', true);
  const sideWas = !body.classList.contains('side-min');
  const pickMarker = () => { const pref = ['video-ai', 'env', 'realname', 'crane1', 'vehicle']; const vis = m => m && m.el.style.display !== 'none' && m.el.getBoundingClientRect().width > 0; const r = $('#stage').getBoundingClientRect(); const inView = m => { const b = m.el.getBoundingClientRect(); return b.left > r.left + 60 && b.right < r.right - 120 && b.top > r.top + 40 && b.bottom < r.bottom - 60; }; return pref.map(id => markers.find(m => m.p.id === id)).find(m => vis(m) && inView(m)) || markers.find(m => vis(m) && inView(m)) || markers.find(vis); };
  const steps = [
    { title: '转一转模型', text: '按住模型<b>拖动</b>，从不同方向看工地；滚轮或双指可以<b>缩放</b>。', target: () => { const r = $('#stage').getBoundingClientRect(), sm = innerHeight < 500; return sm ? { x: r.left + r.width * .44, y: r.top + r.height * .2, w: r.width * .34, h: r.height * .6 } : { x: r.left + r.width * .28, y: r.top + r.height * .25, w: r.width * .44, h: r.height * .5 }; }, pad: 0, wait: done => on('rotate', done) },
    { title: '点一个点位', text: '模型上的圆形图标是沙盘里的设备，颜色和图标代表类别，鼠标停在上面能看到名字。<b>点一下发光的这个</b>，右边会打开它的说明卡。', before: () => { closePanel(); if (mode !== 'site') setStage('LAB', true); }, target: () => { const m = pickMarker(); return m ? m.el.querySelector('.dot') : null; }, pad: 10, wait: done => on('point', done) },
    { title: '换一个学习模式', text: '顶部是四个模式：①智慧工地 ②建造过程 ③建成运维 ④构件工坊。<b>点「建造过程」</b>，看工地从策划到拆除的 8 个阶段。', before: () => { closePanel(); }, target: () => document.querySelector('.mtab[data-mode="build"]'), pad: 4, wait: done => on('mode', m => { if (m === 'build') done(); }) },
    { title: '打开数据面板', text: '<b>点右边的「数据」</b>，打开和当前阶段联动的数据大屏。里面的「大屏全屏」可以投到实验室的大屏上。', before: () => { closePanel(); }, target: () => { const b = $('#dataBtn'); return b && b.offsetParent ? b : null; }, pad: 4, wait: done => on('data', done) },
    { title: '准备好了', text: '左边是<b>学习面板</b>，右下角是<b>视角、漫游、环境、图层</b>工具，右上角是<b>学习中心</b>（任务卡、进度、小测）和 <b>?</b>（再看一遍引导）。<br>刚才试过的操作都会清空，现在正式开始。', target: () => $('#tools'), pad: 6, last: true }
  ];
  intro.start(steps, () => {
    clearTrial(snap);
    LS.set('shapan.introDone', true);
    setSide(sideWas || !compact());
    resume();
  });
}
$('#helpBtn').onclick = () => startIntro();

// ---------- 初始化 ----------
renderSideSite(); renderSideOps();
if (compact()) body.classList.add('side-min');
resize();
const q = new URLSearchParams(location.search);
setView(q.get('view') || 'south', true);
if (q.get('nomarkers')) { showMarkers = false; $('#markerToggle').checked = false; }
if (q.get('side') === '0') body.classList.add('side-min');
if (q.get('pts')) { showStagePts = true; $('#tlPts').classList.add('on'); }
const qm = q.get('mode');
if (qm === 'ws') { setStage('LAB', true); setMode('ws', { ws: q.get('ws') }); }
else if (qm && MODES[qm] && !q.get('stage')) setMode(qm, { instant: true });
else setStage(q.get('stage') || 'LAB', true);
if (q.get('point')) gotoPoint(q.get('point'), false);
if (q.get('split')) setSplit(true, q.get('dash') || undefined); else if (q.get('dash')) dash.open(q.get('dash'), q.get('stage') || undefined);
if (q.get('proc')) { proc.start(q.get('stage') || 'S3', +(q.get('step') || 0)); }
refreshMarkerClasses(); updateProgress(); sideOpenLabel();
tick();
const deep = ['mode', 'stage', 'point', 'split', 'dash', 'proc', 'quiz'].some(k => q.has(k));
if (deep) { started = true; saveLast(); }
if (q.get('intro')) startIntro();
else if (q.get('home') || !deep) openHome();

window.__shapan = { locateTarget, focusProc, glife, camera, controls, setView, VIEWS, scene, layers, openPoint, gotoPoint, startWalk, renderer, setStage, setMode, stages, dash, proc, setSplit, openData, scen, teach, green, startIntro, openHome, enterWorkshop, openPop, get mode() { return mode; } };
