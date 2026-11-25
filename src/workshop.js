// 构件工坊：5 种装配式构件的构造拆解、安装工艺动画与小测（工程沙盘虚拟仿真系统 · 安徽工业大学）
// 接口：
//   import { mountWorkshop, WORKSHOP_CSS } from './workshop.js'
//   const ws = mountWorkshop(hostEl, { onExit, onQuiz })  →  { open(id), close(), list(), resize(), dispose() }
//   onQuiz({ id, correct, total })；数据 window.SHAPAN_WORKSHOP（data/workshop-data.js）
// 文字都在数据文件里；这里只搭几何模型和动画。部件 id、工序顺序与数据文件一一对应。单位：米。
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const IDS = ['pc-column', 'comp-beam', 'comp-slab', 'pc-stair', 'pc-wall'];
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const seg = (k, a, b) => ease(clamp((k - a) / (b - a)));
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const V = (x, y, z) => new THREE.Vector3(x, y, z);

const C = {
  conc: 0xcdc9c0, concDk: 0x9e998e, adj: 0xe2e5e8, cast: 0xd8c7a2, steel: 0xc0392b, stir: 0xe67e22, cap: 0xf5b041,
  embed: 0x5d6d7e, grout: 0x95a5b3, lift: 0xf1c40f, temp: 0x2e86de, brace: 0x17a589, insul: 0x8fd3f4, tie: 0x27ae60,
  seal: 0x2c3e50, wood: 0xc8a165, red: 0xe74c3c, hole: 0x2b2b2b, foam: 0xf7e9b0, pvc: 0x5dade2, white: 0xf4f4f4
};
const KIND_LABEL = { conc: '预制混凝土', adj: '相邻结构', cast: '现浇混凝土', steel: '钢筋', embed: '预埋件 / 连接件', temp: '临时支撑', other: '其他材料' };

export const WORKSHOP_CSS = `
.ws-root{position:absolute;inset:0;display:flex;flex-direction:column;background:#eef2f5;color:#14212e;font-family:"PingFang SC","Microsoft YaHei","Noto Sans CJK SC",system-ui,sans-serif;font-size:15px;overflow:hidden;-webkit-tap-highlight-color:transparent}
.ws-root *{box-sizing:border-box}
.ws-root button{font:inherit;cursor:pointer;touch-action:manipulation}
.ws-hd{display:flex;align-items:center;gap:10px;padding:8px 12px;background:#fff;border-bottom:1px solid #dde4ea;flex-wrap:wrap;z-index:3}
.ws-ttl{font-size:1.12em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:0 1 auto}
.ws-ttl b{color:#0f2a44}.ws-ttl span{color:#4a5b6b}
.ws-tabs{display:flex;gap:4px;background:#eef2f5;border-radius:999px;padding:3px}
.ws-tab{border:0;background:transparent;color:#334455;border-radius:999px;padding:.42em 1.05em;min-height:36px}
.ws-tab.on{background:#0f2a44;color:#fff;font-weight:600}
.ws-sp{flex:1}
.ws-sel{font:inherit;border:1px solid #cfd8e0;border-radius:10px;padding:.35em .6em;min-height:38px;background:#fff;color:#14212e;max-width:13em}
.ws-btn{border:1px solid #cfd8e0;background:#fff;color:#0f2a44;border-radius:10px;padding:.4em .9em;min-height:38px;white-space:nowrap}
.ws-btn:hover{border-color:#0ea5e9}
.ws-exit{background:#0f2a44;color:#fff;border-color:#0f2a44}
.ws-bd{position:relative;flex:1;display:flex;min-height:0}
.ws-view{position:relative;flex:1;min-width:0;min-height:0;overflow:hidden;background:linear-gradient(180deg,#f7f9fb,#e4eaef)}
.ws-view canvas{display:block;width:100%;height:100%;touch-action:none;outline:none}
.ws-tags{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.ws-tag{position:absolute;left:0;top:0;transform:translate(-50%,-100%);background:rgba(255,255,255,.95);border:1px solid #0ea5e9;color:#0f2a44;border-radius:8px;padding:3px 8px;font-size:13px;line-height:1.35;white-space:nowrap;box-shadow:0 2px 8px rgba(15,42,68,.15);max-width:min(320px,60vw);white-space:normal;text-align:center}
.ws-tag:after{content:"";position:absolute;left:50%;bottom:-7px;width:2px;height:6px;background:#0ea5e9;transform:translateX(-50%)}
.ws-tag.warn{border-color:#e67e22;color:#7a3e06}.ws-tag.warn:after{background:#e67e22}
.ws-tag.ok{border-color:#16a34a;color:#14532d}.ws-tag.ok:after{background:#16a34a}
.ws-ctl{position:absolute;left:10px;bottom:10px;background:rgba(255,255,255,.94);border:1px solid #dde4ea;border-radius:12px;padding:8px 10px;display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;box-shadow:0 4px 14px rgba(15,42,68,.1);max-width:calc(100% - 20px)}
.ws-ctl label{display:flex;align-items:center;gap:6px;white-space:nowrap;min-height:34px;cursor:pointer}
.ws-ctl input[type=range]{width:150px;accent-color:#0ea5e9}
.ws-ctl input[type=checkbox]{width:18px;height:18px;accent-color:#0ea5e9}
.ws-hint{position:absolute;left:10px;top:10px;background:rgba(15,42,68,.78);color:#fff;border-radius:8px;padding:4px 10px;font-size:12.5px;pointer-events:none}
.ws-pbar{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.95);border:1px solid #dde4ea;border-radius:999px;padding:5px 8px;box-shadow:0 4px 14px rgba(15,42,68,.12);max-width:calc(100% - 20px)}
.ws-pbar button{border:0;background:#eef2f5;color:#0f2a44;border-radius:999px;min-width:42px;height:40px;font-size:16px}
.ws-pbar button.ws-play{background:#0f2a44;color:#fff;min-width:52px}
.ws-prog{display:flex;flex-direction:column;gap:3px;min-width:120px;padding:0 4px}
.ws-prog small{color:#4a5b6b;white-space:nowrap}
.ws-prog i{display:block;height:5px;border-radius:3px;background:#dde4ea;overflow:hidden}
.ws-prog i b{display:block;height:100%;width:0;background:#0ea5e9}
.ws-side{width:370px;flex:0 0 auto;background:#fff;border-left:1px solid #dde4ea;display:flex;flex-direction:column;min-height:0;z-index:2}
.ws-card{padding:14px 16px;overflow:auto;flex:0 1 auto;max-height:60%}
.ws-list{padding:8px 12px 14px;overflow:auto;flex:1 1 auto;border-top:1px solid #eef2f5}
.ws-lh{display:flex;align-items:center;justify-content:space-between;color:#4a5b6b;font-size:.88em;margin:2px 2px 8px}
.ws-drag{display:none}
.ws-card h3{margin:0 0 6px;font-size:1.12em;color:#0f2a44}
.ws-card p{margin:.35em 0;line-height:1.6}
.ws-card .ws-k{display:inline-block;font-size:.78em;border-radius:6px;padding:1px 7px;margin-right:6px;background:#eef2f5;color:#334455}
.ws-sec{margin-top:8px;padding:8px 10px;border-radius:10px;background:#f6f8fa;line-height:1.6}
.ws-sec b{display:block;font-size:.82em;color:#4a5b6b;margin-bottom:2px}
.ws-sec.key{background:#fff7ed}.ws-sec.key b{color:#b45309}
.ws-sec.norm{background:#eff6ff}.ws-sec.norm b{color:#1d4ed8}
.ws-chips{display:flex;flex-wrap:wrap;gap:6px}
.ws-chip{border:1px solid #dde4ea;background:#fff;border-radius:999px;padding:.35em .8em;min-height:34px;display:flex;align-items:center;gap:6px;color:#14212e}
.ws-chip i{width:10px;height:10px;border-radius:50%;display:inline-block;flex:0 0 auto}
.ws-chip.on{border-color:#0ea5e9;background:#e0f2fe}
.ws-steps{list-style:none;margin:0;padding:0;counter-reset:s}
.ws-steps li{counter-increment:s}
.ws-steps button{width:100%;text-align:left;border:1px solid transparent;background:transparent;border-radius:10px;padding:.5em .6em .5em 2.4em;position:relative;color:#14212e;min-height:40px;line-height:1.4}
.ws-steps button:before{content:counter(s);position:absolute;left:.55em;top:50%;transform:translateY(-50%);width:1.5em;height:1.5em;border-radius:50%;background:#eef2f5;color:#334455;display:grid;place-items:center;font-size:.85em}
.ws-steps li.done button:before{background:#bbf7d0;color:#14532d}
.ws-steps li.on button{border-color:#0ea5e9;background:#e0f2fe;font-weight:600}
.ws-steps li.on button:before{background:#0ea5e9;color:#fff}
.ws-norms{margin-top:10px;font-size:.85em;color:#4a5b6b;line-height:1.6}
.ws-quiz,.ws-gal{position:absolute;inset:0;overflow:auto;background:#eef2f5;z-index:4;display:none;padding:clamp(10px,2.4vw,26px)}
.ws-qwrap{max-width:860px;margin:0 auto;display:flex;flex-direction:column;gap:12px}
.ws-qhd{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.ws-qhd h3{margin:0;color:#0f2a44;flex:1}
.ws-q{background:#fff;border-radius:14px;padding:14px 16px;box-shadow:0 2px 10px rgba(15,42,68,.06)}
.ws-q h4{margin:0 0 10px;font-size:1.04em;line-height:1.55}
.ws-opts{display:grid;gap:8px}
.ws-opt{text-align:left;border:1.5px solid #dde4ea;background:#fff;border-radius:10px;padding:.6em .8em;min-height:44px;color:#14212e;line-height:1.45}
.ws-opt.sel{border-color:#0ea5e9;background:#e0f2fe}
.ws-opt.right{border-color:#16a34a;background:#dcfce7}
.ws-opt.wrong{border-color:#dc2626;background:#fee2e2}
.ws-tip{margin-top:8px;font-size:.9em;color:#1d4ed8;display:none}
.ws-done .ws-tip{display:block}
.ws-score{font-weight:700;color:#0f2a44}
.ws-primary{background:#0ea5e9;color:#fff;border:0;border-radius:10px;padding:.55em 1.3em;min-height:42px}
.ws-primary:disabled{background:#9fb3c4;cursor:not-allowed}
.ws-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(220px,100%),1fr));gap:14px;max-width:1300px;margin:0 auto}
.ws-gcard{background:#fff;border:2px solid transparent;border-radius:14px;overflow:hidden;text-align:left;padding:0;color:#14212e;box-shadow:0 2px 10px rgba(15,42,68,.07);display:flex;flex-direction:column}
.ws-gcard:hover,.ws-gcard:focus-visible{border-color:#0ea5e9}
.ws-gcard img,.ws-gcard .ws-ph{width:100%;aspect-ratio:3/2;object-fit:cover;background:#e4eaef;display:block}
.ws-gcard div{padding:10px 12px 12px}
.ws-gcard h4{margin:0 0 4px;color:#0f2a44;font-size:1.05em}
.ws-gcard p{margin:0;color:#4a5b6b;font-size:.9em;line-height:1.55}
.ws-gintro{max-width:1300px;margin:0 auto 14px;color:#334455;line-height:1.6}
.ws-gintro h2{margin:0 0 4px;color:#0f2a44;font-size:1.3em}
.ws-root.ws-gallery .ws-tabs,.ws-root.ws-gallery .ws-sel{display:none}
.ws-tgl{display:none}
/* 窄屏竖向：侧栏变成底部面板 */
.ws-root.ws-narrow .ws-bd{flex-direction:column}
.ws-root.ws-narrow .ws-side{width:auto;height:44%;border-left:0;border-top:1px solid #dde4ea}
.ws-root.ws-narrow .ws-card{max-height:none;flex:0 0 auto}
.ws-root.ws-narrow .ws-list{flex:0 0 auto;overflow:visible}
.ws-root.ws-narrow .ws-side{overflow:auto}
.ws-root.ws-narrow .ws-hd{gap:6px;padding:6px 8px}
.ws-root.ws-narrow .ws-ttl{flex:1 1 auto;font-size:1em;order:0}
.ws-root.ws-narrow .ws-exit{order:1}
.ws-root.ws-narrow .ws-sp{order:2;flex:0 0 100%;height:0}
.ws-root.ws-narrow .ws-tabs,.ws-root.ws-narrow .ws-sel,.ws-root.ws-narrow .ws-galbtn{order:3}
.ws-root.ws-narrow .ws-sel{max-width:9.5em;flex:1 1 auto}
.ws-root.ws-narrow .ws-l,.ws-root.ws-short .ws-l{display:none}
.ws-root.ws-narrow .ws-hint{display:none}
.ws-root.ws-narrow .ws-btn,.ws-root.ws-narrow .ws-sel{min-height:36px;padding:.25em .6em}
.ws-root.ws-narrow .ws-tab{padding:.35em .8em}
.ws-root.ws-narrow .ws-ctl input[type=range]{width:110px}
.ws-root.ws-narrow .ws-ctl{left:6px;bottom:6px;padding:4px 8px;gap:2px 10px;font-size:13.5px}
.ws-root.ws-narrow .ws-pbar{bottom:6px}
/* 手机横屏（高度 ≤500）：紧凑侧卡 + 底部抽屉 */
.ws-root.ws-short{font-size:13px}
.ws-root.ws-short .ws-hd{flex-wrap:nowrap;padding:4px 8px;gap:6px}
.ws-root.ws-short .ws-ttl{flex:0 1 auto;font-size:1em;max-width:28%}
.ws-root.ws-short .ws-tab{padding:.25em .7em;min-height:32px}
.ws-root.ws-short .ws-sel,.ws-root.ws-short .ws-btn{min-height:32px;padding:.2em .55em}
.ws-root.ws-short .ws-sel{max-width:9em}
.ws-root.ws-short .ws-side{position:absolute;right:0;top:0;bottom:0;width:min(300px,37%);height:auto;border-left:1px solid #dde4ea;background:#fff;overflow:visible}
.ws-root.ws-short .ws-view{margin-right:min(300px,37%)}
.ws-root.ws-short .ws-card{max-height:none;flex:1 1 auto;padding:8px 10px 52px;overflow:auto}
.ws-root.ws-short .ws-card h3{font-size:1.02em}
.ws-root.ws-short .ws-card p{margin:.2em 0}
.ws-root.ws-short .ws-sec{padding:5px 8px;margin-top:5px;line-height:1.5}
.ws-root.ws-short .ws-list{position:absolute;right:6px;bottom:52px;width:min(560px,calc(100vw - 20px));max-height:0;padding:0 10px;overflow:hidden;background:#fff;border:1px solid #dde4ea;border-radius:12px;box-shadow:0 -6px 18px rgba(15,42,68,.18);transition:max-height .25s;z-index:5;visibility:hidden}
.ws-root.ws-short .ws-list.ws-open{max-height:min(72vh,300px);padding:8px 10px;overflow:auto;visibility:visible}
.ws-root.ws-short .ws-tgl{display:block;position:absolute;right:8px;bottom:6px;z-index:6;min-height:40px;width:calc(min(300px,37%) - 16px)}
.ws-root.ws-short .ws-ctl{left:6px;bottom:6px;right:auto;max-width:calc(62% - 12px);padding:3px 8px;gap:0 8px}
.ws-root.ws-short .ws-ctl input[type=range]{width:90px}
.ws-root.ws-short .ws-ctl label{min-height:30px}
.ws-root.ws-short .ws-pbar{left:8px;transform:none;bottom:6px;padding:3px 6px;gap:4px}
.ws-root.ws-short .ws-pbar button{height:34px;min-width:36px}
.ws-root.ws-short .ws-prog{min-width:90px}
.ws-root.ws-short .ws-hint{display:none}
.ws-root.ws-short .ws-tag{font-size:11.5px;padding:2px 6px}
.ws-root.ws-short.ws-tquiz .ws-tgl{display:none}
`;

// ======================= 建模工具 =======================
const UB = new THREE.BoxGeometry(1, 1, 1);
const UC = new THREE.CylinderGeometry(1, 1, 1, 10);
const UCL = new THREE.CylinderGeometry(1, 1, 1, 6);
const US = new THREE.SphereGeometry(1, 10, 8);
const UT = new THREE.TorusGeometry(1, .22, 6, 16);
const YAX = V(0, 1, 0);

function makeKit() {
  const root = new THREE.Group();
  const procG = new THREE.Group(); procG.name = 'proc'; root.add(procG);
  const parts = {}; const order = [];
  const matCache = new Map();
  const extraMats = [];
  const P = (id, kind, ex = [0, 0, 0], parent = root, opt = {}) => {
    const g = new THREE.Group(); g.userData.part = id; parent.add(g);
    parts[id] = { id, kind, g, ex: V(...ex), radial: opt.radial || null, mats: [], color: opt.color };
    order.push(id); return g;
  };
  const M = (pid, color, o = {}) => {
    const key = pid + ':' + color + ':' + (o.metal || 0);
    if (matCache.has(key)) return matCache.get(key);
    const m = new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? .78, metalness: o.metal ?? 0, side: o.side ?? THREE.FrontSide });
    matCache.set(key, m); if (parts[pid]) { parts[pid].mats.push(m); if (parts[pid].color == null) parts[pid].color = color; } else extraMats.push(m);
    return m;
  };
  const PM = (color, o = {}) => { const m = new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? .7, metalness: o.metal ?? 0, transparent: !!o.op, opacity: o.op ?? 1, depthWrite: o.op ? false : true }); extraMats.push(m); return m; };
  const box = (g, m, w, h, d, x, y, z) => { const o = new THREE.Mesh(UB, m); o.scale.set(w, h, d); o.position.set(x, y, z); o.userData.h = h; o.userData.bot = y - h / 2; g.add(o); return o; };
  const cyl = (g, m, r, a, b, geo = UC) => {
    const A = V(...a), B = V(...b), d = B.clone().sub(A), L = d.length() || 1e-4;
    const o = new THREE.Mesh(geo, m); o.scale.set(r, L, r); o.position.copy(A).add(B).multiplyScalar(.5);
    o.quaternion.setFromUnitVectors(YAX, d.normalize()); g.add(o); return o;
  };
  const poly = (g, m, r, pts, joints = true) => { const out = []; for (let i = 0; i < pts.length - 1; i++) out.push(cyl(g, m, r, pts[i], pts[i + 1], UCL)); if (joints) for (let i = 1; i < pts.length - 1; i++) { const s = new THREE.Mesh(US, m); s.scale.setScalar(r); s.position.set(...pts[i]); g.add(s); } return out; };
  const loop = (g, m, r, hx, hz, y, cx = 0, cz = 0) => poly(g, m, r, [[cx - hx, y, cz - hz], [cx + hx, y, cz - hz], [cx + hx, y, cz + hz], [cx - hx, y, cz + hz], [cx - hx, y, cz - hz]]);
  const ring = (g, m, r, x, y, z, ry = 0) => { const o = new THREE.Mesh(UT, m); o.scale.setScalar(r); o.position.set(x, y, z); o.rotation.y = ry; g.add(o); return o; };
  const sph = (g, m, r, x, y, z) => { const o = new THREE.Mesh(US, m); o.scale.setScalar(r); o.position.set(x, y, z); g.add(o); return o; };
  // 带洞口的板（4 块拼成）
  const holeSlab = (g, m, x0, x1, y0, y1, z0, z1, h) => {
    const zc = (z0 + z1) / 2, d = z1 - z0, out = [];
    out.push(box(g, m, x1 - x0, h.y0 - y0, d, (x0 + x1) / 2, (y0 + h.y0) / 2, zc));
    out.push(box(g, m, x1 - x0, y1 - h.y1, d, (x0 + x1) / 2, (h.y1 + y1) / 2, zc));
    out.push(box(g, m, h.x0 - x0, h.y1 - h.y0, d, (x0 + h.x0) / 2, (h.y0 + h.y1) / 2, zc));
    out.push(box(g, m, x1 - h.x1, h.y1 - h.y0, d, (h.x1 + x1) / 2, (h.y0 + h.y1) / 2, zc));
    return out;
  };
  // 从底部向上「长出来」（浇筑、灌浆）
  const grow = (o, f) => { const h = o.userData.h, b = o.userData.bot; f = Math.max(.002, f); o.scale.y = h * f; o.position.y = b + h * f / 2; o.visible = f > .003; };
  return { root, procG, parts, order, P, M, PM, box, cyl, poly, loop, ring, sph, holeSlab, grow, extraMats };
}

// 楼面控制线（红色细线）
const lineBox = (K, m, x0, z0, x1, z1, y) => { const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz); const o = K.box(K.procG, m, L, .004, .012, (x0 + x1) / 2, y, (z0 + z1) / 2); o.rotation.y = -Math.atan2(dz, dx); return o; };

// ======================= 1 预制柱（套筒灌浆连接） =======================
function buildColumn(K) {
  const { P, M, PM, box, cyl, poly, loop, ring, sph, procG, root } = K;
  const H = 2.9, y0 = .02, top = y0 + H, hb = .3;
  const pos = [[-.24, -.24], [0, -.24], [.24, -.24], [-.24, 0], [.24, 0], [-.24, .24], [0, .24], [.24, .24]];
  // 下层结构与插筋
  const gB = P('below', 'adj', [0, -.75, 0]); const mB = M('below', C.adj);
  box(gB, mB, 2.4, .2, 2.4, 0, -.1, 0); box(gB, mB, .6, 1.0, .6, 0, -.7, 0);
  const gD = P('dowels', 'steel', [0, -.75, 0]); const mD = M('dowels', C.steel, { rough: .5, metal: .3 });
  const dowelPiv = pos.map(([x, z]) => { const pv = new THREE.Group(); pv.position.set(x, 0, z); gD.add(pv); cyl(pv, mD, .015, [0, -1.15, 0], [0, .28, 0]); return pv; });
  const gJ = P('joint', 'embed', [0, -.38, 0]); const mJ = M('joint', 0x7f8c8d, { metal: .5, rough: .4 });
  const shims = [[-.19, -.19], [.19, -.19], [.19, .19], [-.19, .19]].map(([x, z]) => box(gJ, mJ, .08, .02, .08, x, .01, z));
  // 柱子总成
  const colG = new THREE.Group(); root.add(colG);
  const gBody = P('body', 'conc', [-1.5, 0, 0], colG); const mC = M('body', C.conc), mCd = M('body', C.concDk);
  box(gBody, mC, .6, H, .6, 0, y0 + H / 2, 0);
  box(gBody, mCd, .34, .006, .34, 0, y0 - .003, 0);           // 柱底键槽示意
  box(gBody, mCd, .6, .006, .6, 0, top + .003, 0);           // 柱顶粗糙面
  const gBars = P('bars', 'steel', [0, .7, 0], colG); const mS = M('bars', C.steel, { rough: .5, metal: .3 });
  pos.forEach(([x, z]) => cyl(gBars, mS, .015, [x, .28, z], [x, top + .55, z]));
  const gSt = P('stirrups', 'steel', [1.45, 0, 0], colG); const mSt = M('stirrups', C.stir, { rough: .5, metal: .3 });
  const ys = [.07, .3, .53]; for (let y = .63; y <= 1.04; y += .1) ys.push(y); for (let y = 1.23; y <= 2.44; y += .2) ys.push(y); for (let y = 2.53; y <= 2.86; y += .1) ys.push(y);
  ys.forEach(y => loop(gSt, mSt, .006, .268, .268, y));
  const gSl = P('sleeves', 'embed', [0, 0, 0], colG); const mSl = M('sleeves', C.embed, { metal: .6, rough: .35 });
  pos.forEach(([x, z]) => cyl(gSl, mSl, .031, [x, .05, z], [x, .5, z]));
  const gP = P('ports', 'embed', [0, 0, .5], colG); const mP = M('ports', 0x34495e, { rough: .5 }), mPe = M('ports', 0x1b2631);
  const portEnds = { in: [], out: [] };
  pos.forEach(([x, z]) => {
    const dir = Math.abs(z) >= Math.abs(x) ? [0, Math.sign(z)] : [Math.sign(x), 0];
    [['in', .1], ['out', .45]].forEach(([k, y]) => {
      const a = [x + dir[0] * .03, y, z + dir[1] * .03];
      const e = [dir[0] ? dir[0] * .305 : x, y, dir[1] ? dir[1] * .305 : z];
      cyl(gP, mP, .009, a, e); const cap = cyl(gP, mPe, .015, e, [e[0] + dir[0] * .015, y, e[2] + dir[1] * .015]);
      portEnds[k].push(V(e[0] + dir[0] * .02, y, e[2] + dir[1] * .02));
    });
  });
  const gL = P('lift', 'embed', [0, 1.0, 0], colG); const mL = M('lift', C.lift, { metal: .4, rough: .4 });
  const liftR = [-.15, .15].map(x => { cyl(gL, mL, .008, [x, top - .15, 0], [x, top, 0]); return ring(gL, mL, .04, x, top + .04, 0); });
  // 斜撑（两个方向）
  const gBr = P('brace', 'temp', [-1.5, 0, 0]); const mBr = M('brace', C.brace, { metal: .4, rough: .45 }), mBp = M('brace', 0x566573, { metal: .5 });
  const yb = y0 + H * 2 / 3 + .02;
  const braces = [[1, 0], [0, 1]].map(([dx, dz]) => {
    const g = new THREE.Group(); gBr.add(g);
    const A = [dx * .3, yb, dz * .3], B = [dx * 1.95, .02, dz * 1.95];
    cyl(g, mBr, .028, A, B); cyl(g, mBp, .045, [lerp(A[0], B[0], .42), lerp(A[1], B[1], .42), lerp(A[2], B[2], .42)], [lerp(A[0], B[0], .55), lerp(A[1], B[1], .55), lerp(A[2], B[2], .55)]);
    box(g, mBp, dx ? .02 : .16, .16, dz ? .02 : .16, dx * .31, yb, dz * .31); box(g, mBp, .18, .02, .18, B[0], .01, B[2]);
    return g;
  });
  // —— 工序专用 ——
  const mRed = PM(C.red), mGr = PM(C.grout, { rough: .9 }), mDark = PM(0x2c3e50), mTpl = PM(0x3498db, { op: .45 }), mGr2 = PM(0x7b8a97);
  const lines = [lineBox(K, mRed, -.3, -.3, .3, -.3, .003), lineBox(K, mRed, .3, -.3, .3, .3, .003), lineBox(K, mRed, .3, .3, -.3, .3, .003), lineBox(K, mRed, -.3, .3, -.3, -.3, .003), lineBox(K, mRed, -1.1, 0, 1.1, 0, .003), lineBox(K, mRed, 0, -1.1, 0, 1.1, .003)];
  const tpl = box(procG, mTpl, .72, .012, .72, 0, .3, 0);
  const seal = [box(procG, mGr2, .66, .03, .03, 0, .015, .315), box(procG, mGr2, .66, .03, .03, 0, .015, -.315), box(procG, mGr2, .03, .03, .6, .315, .015, 0), box(procG, mGr2, .03, .03, .6, -.315, .015, 0)];
  const bed = box(procG, mGr, .6, .02, .6, 0, .01, 0);
  const mFill = PM(0x4fc3f7, { rough: .6 }); const fills = pos.map(([x, z]) => box(procG, mFill, .056, .45, .056, x, .275, z));
  const blobs = portEnds.out.map(p => sph(procG, mFill, .032, p.x, p.y - .005, p.z));
  const plugs = portEnds.out.map(p => sph(procG, mDark, .02, p.x, p.y, p.z));
  const inPlug = sph(procG, mDark, .02, portEnds.in[1].x, portEnds.in[1].y, portEnds.in[1].z);
  const pIn = portEnds.in[1]; // 灌浆点：-z 面中间套筒的下灌浆孔
  const hoseM = PM(0x1f2d3a);
  const hose = new THREE.Group(); procG.add(hose); poly(hose, hoseM, .018, [[pIn.x, pIn.y, pIn.z], [pIn.x, pIn.y, pIn.z - .25], [pIn.x + .3, .05, pIn.z - .7], [pIn.x + .9, .05, pIn.z - 1.1]]);
  const pump = box(hose, PM(0x2e86de), .4, .35, .3, pIn.x + 1.1, .175, pIn.z - 1.2);
  const mould = new THREE.Group(); procG.add(mould); box(mould, PM(0x7f8c8d, { metal: .4 }), .2, .05, .2, 1.1, .025, -.75); [-.05, 0, .05].forEach(dx => box(mould, mGr, .04, .04, .16, 1.1 + dx, .07, -.75));
  const plumb = box(procG, PM(C.red), .006, 2.7, .006, .345, 1.5, .33);
  return {
    cam: { p: [3.4, 2.7, 4.6], t: [0, 1.25, 0] },
    focus: { 0: [0, .2, 0, 1.3], 1: [0, .25, 0, 1.2], 4: [0, .25, 0, 1.45], 5: [.35, .35, -.3, 1.6] },
    base() {
      colG.visible = false; gBr.visible = false; shims.forEach(s => s.visible = false);
      dowelPiv[2].rotation.z = -.13; dowelPiv[5].rotation.x = .11; dowelPiv[6].rotation.z = .08;
      [...lines, tpl, ...seal, bed, ...fills, ...blobs, ...plugs, inPlug, hose, mould, plumb].forEach(o => o.visible = false);
    },
    steps: [
      (k, A) => {
        lines.forEach((l, i) => l.visible = k > .05 + i * .05);
        shims.forEach((s, i) => { s.visible = k > .35 + i * .1; s.position.y = .01 + .12 * (1 - seg(k, .35 + i * .1, .45 + i * .1)); });
        A.tag('轴线 + 外轮廓控制线', .3, .02, .55); if (k > .4) A.tag('钢垫片：用水准仪调到柱底标高', -.2, .03, -.25, 'warn');
      },
      (k, A) => {
        tpl.visible = k > .08 && k < .95; tpl.position.y = lerp(.55, .3, seg(k, .08, .3));
        const t = seg(k, .35, .8); dowelPiv[2].rotation.z = -.13 * (1 - t); dowelPiv[5].rotation.x = .11 * (1 - t); dowelPiv[6].rotation.z = .08 * (1 - t);
        A.tag('定位钢板复核插筋位置与外露长度', 0, .34, .4); if (k > .3) A.tag('偏差 ≤3mm；倾斜的校直，严禁切割', .3, .3, -.3, 'warn');
      },
      (k, A) => {
        colG.visible = true; A.fade('body', .42);
        let y, x = 0;
        if (k < .15) y = 3.2; else if (k < .55) y = lerp(3.2, .6, seg(k, .15, .55)); else if (k < .75) y = .6; else y = lerp(.6, 0, seg(k, .75, 1));
        x = k < .55 ? .09 : lerp(.09, 0, seg(k, .55, .73));
        colG.position.set(x, y, 0); colG.rotation.z = .025 * seg(k, .8, 1);
        A.rigTo(liftR, 1.1);
        if (k < .17) A.tag('试吊：先提升约300mm，停稳检查', .35, top + y - .4, .3);
        else if (k < .76) A.tag('距插筋顶300~500mm停住，镜子观察，对准套筒', .35, .5 + y, .35);
        else A.tag('缓缓落位：插筋进入套筒', .3, .6, .35);
        A.tag('吊运时构件下方严禁站人', 1.2, .05, 1.2, 'warn');
      },
      (k, A) => {
        colG.visible = true; gBr.visible = true; shims.forEach(s => s.visible = true);
        braces.forEach((b, i) => { const t = seg(k, .08 + i * .15, .25 + i * .15); b.visible = t > .01; b.position.y = .6 * (1 - t); });
        colG.rotation.z = .025 * (1 - seg(k, .45, .8));
        plumb.visible = k > .35 && k < .95;
        if (k < .85) A.rigTo(liftR, 1.1); else A.hookAt(V(0, top + 1.1 + (k - .85) * 6, 0));
        A.tag('两个方向斜撑；上支点 ≥2/3 柱高', 1.1, 1.2, 0);
        if (k > .35 && k < .9) A.tag('调节斜撑校正垂直度', .35, 2.6, .4, 'warn');
        if (k >= .85) A.tag('斜撑装好后才摘钩', 0, top + .4, 0, 'ok');
      },
      (k, A) => {
        seal.forEach((s, i) => { const t = seg(k, .1 + i * .15, .3 + i * .15); s.visible = t > .02; s.scale.x = (i < 2 ? .66 : .03) * (i < 2 ? Math.max(t, .02) : 1); s.scale.z = (i < 2 ? .03 : .6 * Math.max(t, .02)); });
        A.tag('封浆料封缝，形成密闭连通腔', 0, .06, .55);
        if (k > .5) A.tag('只留灌浆孔、出浆孔', .35, .3, -.4, 'warn');
      },
      (k, A) => {
        A.fade('body', .3); A.fade('sleeves', .35); hose.visible = true;
        bed.visible = true; bed.scale.x = .6 * Math.max(.02, seg(k, .03, .16));
        fills.forEach((f, i) => { const t0 = .12 + i * .075, t = seg(k, t0, t0 + .16); K.grow(f, t); blobs[i].visible = t >= 1 && k < t0 + .23; plugs[i].visible = k >= t0 + .23; });
        inPlug.visible = k > .97; mould.visible = k > .55;
        A.tag('一点灌浆：从下灌浆孔压浆', pIn.x + .2, .35, pIn.z - .4);
        if (k > .25 && k < .85) A.tag('出浆孔平稳出浆 → 逐个封堵', .35, .62, .35, 'ok');
        A.tag('压力宜0.2~0.3MPa；加水后30min内用完', pIn.x + 1.1, .55, pIn.z - 1.2, 'warn');
        if (k > .55) A.tag('留置 40×40×160mm 试块', 1.1, .14, -.75);
      },
      (k, A) => {
        bed.visible = true; fills.forEach(f => f.visible = true); plugs.forEach(p => p.visible = true); inPlug.visible = true; mould.visible = true;
        const fc = Math.round(lerp(4, 38, seg(k, 0, .62)));
        braces.forEach((b, i) => { const t = seg(k, .7 + i * .1, .82 + i * .1); b.visible = t < .99; b.position.y = .6 * t; });
        A.tag(fc >= 35 ? `同条件试块 ${fc}MPa ≥35MPa，可进行扰动接头的后续施工` : `同条件试块强度 ${fc}MPa（<35MPa，不得扰动接头）`, 1.1, .2, -.75, fc >= 35 ? 'ok' : 'warn');
        if (k > .7) A.tag('按方案拆除斜撑', 1.1, 1.2, 0);
      }
    ]
  };
}

// ======================= 2 叠合梁 =======================
function buildBeam(K) {
  const { P, M, PM, box, cyl, poly, ring, procG, root } = K;
  const L = 3.92, yb = 2.5, hp = .35, w = .3, ht = .15, yt = yb + hp;
  const gCo = P('cols', 'adj', [0, -.9, 0]); const mCo = M('cols', C.adj), mCs = M('cols', C.steel, { metal: .3, rough: .5 });
  [-2.25, 2.25].forEach(x => { box(gCo, mCo, .6, yb, .6, x, yb / 2, 0); [[-.24, -.24], [.24, -.24], [-.24, .24], [.24, .24], [0, -.24], [0, .24]].forEach(([dx, dz]) => cyl(gCo, mCs, .014, [x + dx, yb - .2, dz], [x + dx, yb + .95, dz])); });
  const gPr = P('props', 'temp', [0, 0, 1.1]); const mPr = M('props', C.temp, { metal: .4, rough: .4 }), mW = M('props', C.wood);
  [-1.0, 1.0].forEach(x => { cyl(gPr, mPr, .03, [x, 0, 0], [x, yb - .08, 0]); for (let a = 0; a < 3; a++) cyl(gPr, mPr, .015, [x, .35, 0], [x + Math.cos(a * 2.1) * .35, .01, Math.sin(a * 2.1) * .35]); box(gPr, mW, .36, .08, .14, x, yb - .04, 0); });
  const beamG = new THREE.Group(); root.add(beamG);
  const gBo = P('body', 'conc', [0, 0, -1.05], beamG); box(gBo, M('body', C.conc), L, hp, w, 0, yb + hp / 2, 0);
  const gK = P('key', 'conc', [0, 0, -1.05], beamG); const mK = M('key', C.concDk);
  [-1, 1].forEach(s => { [yb + .1, yb + .25].forEach(y => box(gK, mK, .008, .07, .2, s * (L / 2 + .002), y, 0)); });
  box(gK, mK, L - .02, .006, w - .02, 0, yt + .003, 0);
  const gSt = P('stirrups', 'steel', [0, 0, 0], beamG); const mSt = M('stirrups', C.stir, { metal: .3, rough: .5 });
  const sx = []; for (let x = -L / 2 + .05; x <= L / 2 - .04; x += (Math.abs(x) > L / 2 - .8 ? .1 : .2)) sx.push(x);
  const yTopSt = yt + .11, yBotSt = yb + .035, zz = .11;
  sx.forEach(x => poly(gSt, mSt, .005, [[x, yTopSt - .05, -zz + .05], [x, yTopSt, -zz], [x, yBotSt, -zz], [x, yBotSt, zz], [x, yTopSt, zz], [x, yTopSt - .05, zz - .05]]));
  const gBb = P('botbars', 'steel', [0, -.5, 0], beamG); const mBb = M('botbars', C.steel, { metal: .3, rough: .5 }), mAp = M('botbars', 0x7f8c8d, { metal: .5 });
  [-.075, 0, .075].forEach(z => { cyl(gBb, mBb, .011, [-2.42, yb + .05, z], [2.42, yb + .05, z]); [-1, 1].forEach(s => cyl(gBb, mAp, .03, [s * 2.42, yb + .05, z], [s * 2.44, yb + .05, z])); });
  const gL = P('lift', 'embed', [0, .7, -1.05], beamG); const mL = M('lift', C.lift, { metal: .4, rough: .4 });
  const liftR = [-1.0, 1.0].map(x => ring(gL, mL, .04, x, yt + .04, 0));
  const gCap = P('cap', 'steel', [0, .5, 0]); const mCap = M('cap', C.cap, { metal: .3, rough: .5 });
  const caps = sx.map(x => { const g = new THREE.Group(); gCap.add(g); poly(g, mCap, .005, [[x, yTopSt - .05, -zz], [x, yTopSt + .004, -zz], [x, yTopSt + .004, zz], [x, yTopSt - .05, zz]]); return g; });
  const gTb = P('topbars', 'steel', [0, 1.0, 0]); const mTb = M('topbars', C.steel, { metal: .3, rough: .5 });
  [-.075, .075].forEach(z => cyl(gTb, mTb, .011, [-2.6, yTopSt - .005, z], [2.6, yTopSt - .005, z]));
  const gT = P('topping', 'cast', [0, 1.5, 0]); const mT = M('topping', C.cast);
  const topMeshes = [box(gT, mT, L, ht, w, 0, yt + ht / 2, 0), box(gT, mT, .6, hp + ht, .6, -2.25, yb + (hp + ht) / 2, 0), box(gT, mT, .6, hp + ht, .6, 2.25, yb + (hp + ht) / 2, 0)];
  const mRed = PM(C.red);
  const lines = []; [-2.25, 2.25].forEach(x => [-.15, .15].forEach(z => lines.push(lineBox(K, mRed, x - .3, z, x + .3, z, yb + .003))));
  return {
    cam: { p: [3.6, 4.1, 5.0], t: [0, 2.35, 0] },
    focus: { 1: [2.0, 2.75, 0, 2.3], 4: [-.4, 2.9, 0, 2.2] },
    base() { beamG.visible = false; gCap.visible = false; gTb.visible = false; gT.visible = false; lines.forEach(l => l.visible = false); },
    steps: [
      (k, A) => { gPr.scale.y = lerp(.25, 1, seg(k, .05, .7)); A.tag('独立支撑顶标高 = 梁底标高', 1.0, yb + .05, .25); if (k > .6) A.tag('上下层支撑宜对准', -1.0, 1.2, .3, 'warn'); },
      (k, A) => { lines.forEach((l, i) => l.visible = k > .1 + i * .12); A.tag('柱顶弹出梁边控制线', 2.25, yb + .05, .4); if (k > .45) A.tag('复核柱筋与梁筋位置，冲突的按设计确认方案处理', -2.25, yb + .95, 0, 'warn'); },
      (k, A) => {
        beamG.visible = true; beamG.position.set(0, lerp(2.8, .55, seg(k, .12, .85)), 0); beamG.rotation.y = lerp(.4, .06, seg(k, .12, .9));
        A.rigTo(liftR, 1.2);
        if (k < .15) A.tag('试吊后起吊；风力大于5级不得吊装', 0, yt + 3.1, 0); else A.tag('先主梁后次梁、先低后高', 0, yt + beamG.position.y + 1.4, 0);
        A.tag('缆风绳控制方向，下方严禁站人', 1.6, yb - .4, .6, 'warn');
      },
      (k, A) => {
        beamG.visible = true; beamG.position.set(0, lerp(.55, 0, seg(k, 0, .5)), 0); beamG.rotation.y = lerp(.06, 0, seg(k, .3, .65));
        if (k < .82) A.rigTo(liftR, 1.2); else A.hookAt(V(0, yt + 1.2 + (k - .82) * 6, 0));
        if (k > .45) A.tag('核对搁置长度、水平度、位置、标高', 1.95, yb + .2, .3);
        if (k > .82) A.tag('校正完成后摘钩', 0, yt + .5, 0, 'ok');
      },
      (k, A) => {
        beamG.visible = true; gTb.visible = true; gTb.position.x = 3.2 * (1 - seg(k, .05, .45));
        gCap.visible = true; caps.forEach((c, i) => { const t = seg(k, .45 + i / caps.length * .45, .5 + i / caps.length * .45); c.visible = t > .01; c.position.y = .3 * (1 - t); });
        A.tag('穿入上部纵向钢筋', -1.2, yTopSt + .1, 0);
        if (k > .45) A.tag('扣箍筋帽：两端135°弯钩，平直段≥10d（抗震）', .9, yTopSt + .15, .2, 'warn');
      },
      (k, A) => {
        beamG.visible = true; gTb.visible = true; gCap.visible = true;
        if (k < .32) A.tag('隐蔽工程验收：钢筋规格、数量、位置 ✔', 0, yTopSt + .3, 0, 'ok');
        gT.visible = k > .3; topMeshes.forEach(o => K.grow(o, seg(k, .32, .95)));
        if (k > .32) A.tag('浇筑节点核心区与叠合层，振捣密实', 2.25, yt + .4, .3);
        if (k > .5) A.tag('框架梁叠合层厚度不宜小于150mm', -1.0, yt + .3, .3, 'warn');
      },
      (k, A) => {
        beamG.visible = true; gTb.visible = true; gCap.visible = true; gT.visible = true;
        const p = Math.round(lerp(20, 100, seg(k, 0, .6)));
        A.tag(p >= 100 ? '后浇混凝土达到设计强度 → 可拆支撑' : `养护中：强度约达设计值的 ${p}%`, 0, yt + .45, 0, p >= 100 ? 'ok' : 'warn');
        gPr.visible = k < .9; gPr.position.y = -2.6 * seg(k, .65, .9);
      }
    ]
  };
}

// ======================= 3 叠合板（桁架钢筋叠合板） =======================
function buildSlab(K) {
  const { P, M, PM, box, cyl, poly, sph, ring, procG, root } = K;
  const yb = 2.85, W = 2.0, Lz = 3.02;
  const gBm = P('beams', 'adj', [0, 0, .75], root, { radial: { ax: 'z', c: 0 } }); const mBm = M('beams', C.adj), mBs = M('beams', C.stir, { metal: .3 });
  [-1.65, 1.65].forEach(z => {
    const g = new THREE.Group(); g.position.set(0, 0, z); gBm.add(g);
    box(g, mBm, 2.6, .35, .3, 0, yb - .175, 0);
    for (let x = -1.2; x <= 1.21; x += .2) poly(g, mBs, .005, [[x, yb + .06, -.11], [x, yb + .11, -.11], [x, yb - .3, -.11], [x, yb - .3, .11], [x, yb + .11, .11], [x, yb + .06, .11]], false);
  });
  const gPr = P('props', 'temp', [0, -.95, 0]); const mPr = M('props', C.temp, { metal: .4, rough: .4 }), mW = M('props', C.wood), mU = M('props', 0x566573, { metal: .5 });
  [-.6, .6].forEach(x => [-.72, .72].forEach(z => { cyl(gPr, mPr, .03, [x, 0, z], [x, yb - .16, z]); for (let a = 0; a < 3; a++) cyl(gPr, mPr, .014, [x, .3, z], [x + Math.cos(a * 2.1) * .3, .01, z + Math.sin(a * 2.1) * .3]); box(gPr, mU, .12, .04, .12, x, yb - .14, z); }));
  [-.72, .72].forEach(z => box(gPr, mW, 2.1, .12, .08, 0, yb - .06, z));
  const slabG = new THREE.Group(); root.add(slabG);
  const gPa = P('panel', 'conc', [0, 0, 0], slabG); box(gPa, M('panel', C.conc), W, .06, Lz, 0, yb + .03, 0);
  const gR = P('rough', 'conc', [0, .16, 0], slabG); box(gR, M('rough', C.concDk), W - .02, .004, Lz - .02, 0, yb + .062, 0);
  const gMe = P('mesh', 'steel', [0, -.4, 0], slabG); const mMe = M('mesh', C.steel, { metal: .3, rough: .5 });
  for (let x = -.9; x <= .91; x += .15) cyl(gMe, mMe, .005, [x, yb + .02, -1.49], [x, yb + .02, 1.49]);
  for (let z = -1.375; z <= 1.38; z += .25) cyl(gMe, mMe, .004, [-.97, yb + .03, z], [.97, yb + .03, z]);
  const gOb = P('outbars', 'steel', [0, -.4, 0], slabG); const mOb = M('outbars', 0xa93226, { metal: .3, rough: .5 });
  for (let x = -.9; x <= .91; x += .3) [-1, 1].forEach(s => cyl(gOb, mOb, .005, [x, yb + .02, s * 1.49], [x, yb + .02, s * 1.72]));
  const gTr = P('truss', 'steel', [0, .42, 0], slabG); const mTr = M('truss', 0x922b21, { metal: .4, rough: .45 });
  const tx = [-.75, -.25, .25, .75], zb = yb + .025, zt = yb + .105;
  tx.forEach(xc => {
    [-.04, .04].forEach(dx => cyl(gTr, mTr, .005, [xc + dx, zb, -1.42], [xc + dx, zb, 1.42]));
    cyl(gTr, mTr, .006, [xc, zt, -1.42], [xc, zt, 1.42]);
    [-.04, .04].forEach(dx => { const pts = []; for (let i = 0; i <= 14; i++) pts.push([i % 2 ? xc : xc + dx, i % 2 ? zt : zb, -1.4 + i * .2]); poly(gTr, mTr, .0035, pts, false); });
  });
  const gL = P('lift', 'embed', [0, .42, 0], slabG); const mL = M('lift', C.lift, { metal: .4, rough: .4 });
  const liftP = []; [-.75, .75].forEach(x => [-.9, .9].forEach(z => { liftP.push(sph(gL, mL, .03, x, zt + .01, z)); }));
  const gCd = P('conduit', 'embed', [0, .65, 0], slabG); const mBx = M('conduit', 0x85929e), mPv = M('conduit', C.pvc);
  box(gCd, mBx, .09, .07, .09, 0, yb + .035, .35);
  const tubes = new THREE.Group(); gCd.add(tubes);
  poly(tubes, mPv, .012, [[0, yb + .07, .35], [0, yb + .075, 1.0], [.5, yb + .075, 1.45]]);
  poly(tubes, mPv, .012, [[0, yb + .07, .35], [-.5, yb + .075, -.3], [-.5, yb + .075, -1.45]]);
  const gTm = P('topmesh', 'steel', [0, .95, 0]); const mTm = M('topmesh', C.steel, { metal: .3, rough: .5 });
  const tmBars = [];
  for (let x = -.9; x <= .91; x += .2) tmBars.push(cyl(gTm, mTm, .005, [x, yb + .115, -1.78], [x, yb + .115, 1.78]));
  for (let z = -1.7; z <= 1.71; z += .2) tmBars.push(cyl(gTm, mTm, .005, [-.97, yb + .125, z], [.97, yb + .125, z]));
  const gT = P('topping', 'cast', [0, 1.45, 0]); const mT = M('topping', C.cast);
  const topMs = [box(gT, mT, W, .07, Lz, 0, yb + .095, 0), box(gT, mT, W, .13, .3, 0, yb + .065, 1.65), box(gT, mT, W, .13, .3, 0, yb + .065, -1.65)];
  return {
    cam: { p: [3.6, 4.7, 4.4], t: [0, 2.5, 0] },
    base() { slabG.visible = false; tubes.visible = false; gTm.visible = false; gT.visible = false; },
    steps: [
      (k, A) => { gPr.scale.y = lerp(.25, 1, seg(k, .05, .7)); A.tag('独立钢支柱 + 可调托座 + 木工字梁', .6, yb - .2, .72); if (k > .55) A.tag('支撑间距经计算确定', -.6, 1.4, -.72, 'warn'); },
      (k, A) => {
        slabG.visible = true; let y = lerp(2.4, .42, seg(k, .05, .55)); slabG.position.set(lerp(.25, 0, seg(k, .6, .92)), y, 0); slabG.rotation.y = lerp(.28, 0, seg(k, .6, .92));
        A.rigTo(liftP, 1.15);
        A.tag('吊点在桁架上弦；吊索水平夹角≥60°（不应<45°）', 1.2, yb + y + .9, .3);
        if (k > .5) A.tag('距梁顶300~500mm停住，转动使板端钢筋与梁箍筋错开', -1.2, yb + .7, 1.6, 'warn');
      },
      (k, A) => {
        slabG.visible = true; slabG.position.set(0, lerp(.42, 0, seg(k, 0, .5)), 0);
        if (k < .8) A.rigTo(liftP, 1.15); else A.hookAt(V(0, yb + 1.3 + (k - .8) * 6, 0));
        if (k > .45) A.tag('校核板底接缝高差、接缝宽度', 1.0, yb + .1, 1.1);
        if (k > .55) A.tag('调节立杆，使所有立杆均匀受力', .6, 1.6, -.72, 'warn');
      },
      (k, A) => {
        slabG.visible = true; tubes.visible = k > .05; gTm.visible = true;
        tmBars.forEach((b, i) => b.visible = k > .3 + .65 * i / tmBars.length);
        A.tag('敷设线管、接线盒', -.5, yb + .2, -.3); if (k > .3) A.tag('绑扎板面钢筋（支座负筋）', .6, yb + .25, 1.3);
      },
      (k, A) => {
        slabG.visible = true; tubes.visible = true; gTm.visible = true;
        if (k < .3) A.tag('隐蔽工程验收：钢筋、管线、预埋 ✔', 0, yb + .35, 0, 'ok');
        gT.visible = k > .28; topMs.forEach(o => K.grow(o, seg(k, .3, .95)));
        if (k > .35) A.tag('叠合层厚度不应小于60mm；布料均衡', 0, yb + .3, .9, 'warn');
      },
      (k, A) => {
        slabG.visible = true; tubes.visible = true; gTm.visible = true; gT.visible = true;
        const p = Math.round(lerp(20, 100, seg(k, 0, .6)));
        A.tag(p >= 100 ? '达到设计强度 → 拆除独立支撑' : `养护中：强度约达设计值的 ${p}%`, 0, yb + .4, 0, p >= 100 ? 'ok' : 'warn');
        gPr.visible = k < .9; gPr.position.y = -2.9 * seg(k, .65, .9);
      }
    ]
  };
}

// ======================= 4 预制楼梯 =======================
function buildStair(K) {
  const { P, M, PM, box, cyl, poly, ring, procG, root } = K;
  const a = .4, n = 9, r = 1.5 / n, tr = .26, m = r / tr, Wz = 1.2, t = .12, s = t * Math.sqrt(1 + m * m);
  const x1 = a + (-.2 + s) / m, x2 = a + (1.3 + s) / m, xe = a + 8 * tr + .4, xi = i => a + i * tr;
  // 支座
  const gLo = P('lowerSeat', 'adj', [-.75, -.35, 0]); const mA = M('lowerSeat', C.adj);
  box(gLo, mA, .32, .62, 1.6, -.19, -.31, 0); box(gLo, mA, .45, .2, 1.6, .195, -.32, 0); box(gLo, mA, .9, .12, 1.6, -.8, -.06, 0);
  const gUp = P('upperSeat', 'adj', [.75, .35, 0]); const mA2 = M('upperSeat', C.adj);
  box(gUp, mA2, .32, .62, 1.6, 3.07, 1.19, 0); box(gUp, mA2, .46, .2, 1.6, 2.68, 1.18, 0); box(gUp, mA2, .9, .12, 1.6, 3.68, 1.44, 0);
  const gBed = P('bed', 'other', [.42, 0, 0], root, { radial: { ax: 'x', c: 1.44 } }); const mBed = M('bed', C.grout, { rough: .95 });
  const bedLo = new THREE.Group(); bedLo.position.x = .2; gBed.add(bedLo); const bLo = box(bedLo, mBed, .4, .02, 1.2, 0, -.21, 0);
  const bedUp = new THREE.Group(); bedUp.position.x = 2.68; gBed.add(bedUp); const bUp = box(bedUp, mBed, .4, .02, 1.2, 0, 1.29, 0);
  const gPin = P('pins', 'embed', [.75, .35, 0], root, { radial: { ax: 'x', c: 1.44 } }); const mPin = M('pins', C.embed, { metal: .6, rough: .35 });
  [[.2, -.34, -.05], [2.68, 1.16, 1.45]].forEach(([x, ya, yb]) => { const g = new THREE.Group(); g.position.x = x; gPin.add(g); [-.35, .35].forEach(z => cyl(g, mPin, .014, [0, ya, z], [0, yb, z])); });
  const gGap = P('gap', 'other', [.3, 0, 0], root, { radial: { ax: 'x', c: 1.44 } }); const mGap = M('gap', C.foam), mSl = M('gap', C.seal);
  const gapLo = new THREE.Group(); gapLo.position.x = -.015; gGap.add(gapLo); box(gapLo, mGap, .028, .19, 1.2, 0, -.105, 0); const sealLo = box(gapLo, mSl, .03, .012, 1.2, 0, -.004, 0);
  const gapUp = new THREE.Group(); gapUp.position.x = 2.895; gGap.add(gapUp); box(gapUp, mGap, .028, .19, 1.2, 0, 1.395, 0); const sealUp = box(gapUp, mSl, .03, .012, 1.2, 0, 1.496, 0);
  // 梯段总成
  const stairG = new THREE.Group(); root.add(stairG);
  const gF = P('flight', 'conc', [0, 1.25, -.6], stairG);
  const sh = new THREE.Shape(); const pts = [[0, -.2], [x1, -.2], [x2, 1.3], [xe, 1.3], [xe, 1.5]];
  for (let i = 8; i >= 0; i--) { pts.push([xi(i), (i + 1) * r]); pts.push([xi(i), i * r]); }
  pts.push([0, 0]); sh.moveTo(...pts[0]); pts.slice(1).forEach(p => sh.lineTo(...p)); sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: Wz, bevelEnabled: false }); geo.translate(0, 0, -Wz / 2); geo.computeVertexNormals();
  const flightMesh = new THREE.Mesh(geo, M('flight', C.conc)); gF.add(flightMesh);
  const gH = P('holes', 'embed', [0, 1.25, -.6], stairG); const mH = M('holes', C.hole, { rough: 1 });
  [[.2, -.205, .005], [2.68, 1.295, 1.505]].forEach(([x, ya, yb]) => [-.35, .35].forEach(z => cyl(gH, mH, .026, [x, ya, z], [x, yb, z])));
  const gBb = P('botbars', 'steel', [0, -.3, 0], stairG); const mBb = M('botbars', C.steel, { metal: .3, rough: .5 });
  const bp = [[.04, -.175], [x1, -.175], [x2, 1.325], [xe - .04, 1.325]];
  for (let z = -.525; z <= .53; z += .15) poly(gBb, mBb, .006, bp.map(([x, y]) => [x, y, z]));
  const gTb = P('topbars', 'steel', [0, .45, 0], stairG); const mTb = M('topbars', 0xa93226, { metal: .3, rough: .5 });
  const xTop = a + 1.5 / m, tp = [[.04, -.035], [a, -.035], [xTop, 1.465], [xe - .04, 1.465]];
  for (let z = -.525; z <= .53; z += .21) poly(gTb, mTb, .005, tp.map(([x, y]) => [x, y, z]));
  const gDb = P('distbars', 'steel', [0, 0, 0], stairG); const mDb = M('distbars', C.stir, { metal: .3, rough: .5 });
  const along = (pl, step, dy) => { const out = []; for (let i = 0; i < pl.length - 1; i++) { const [ax, ay] = pl[i], [bx, by] = pl[i + 1], Ls = Math.hypot(bx - ax, by - ay), nn = Math.max(1, Math.round(Ls / step)); for (let j = 0; j < nn; j++) { const f = (j + .5) / nn; out.push([lerp(ax, bx, f), lerp(ay, by, f) + dy]); } } return out; };
  along(bp, .25, .011).forEach(([x, y]) => cyl(gDb, mDb, .004, [x, y, -.56], [x, y, .56]));
  along(tp, .3, -.01).forEach(([x, y]) => cyl(gDb, mDb, .004, [x, y, -.56], [x, y, .56]));
  const gL = P('lift', 'embed', [0, 1.6, -.6], stairG); const mL = M('lift', C.lift, { metal: .4, rough: .4 });
  const liftR = []; [2, 6].forEach(i => [-.35, .35].forEach(z => liftR.push(ring(gL, mL, .035, xi(i) + tr / 2, (i + 1) * r + .035, z, Math.PI / 2))));
  // —— 工序专用 ——
  const mGr = PM(C.grout, { rough: .95 }), mFoam = PM(C.foam), mDk = PM(0x566573), mWood = PM(C.wood), mRed = PM(C.red);
  const fillsUp = [-.35, .35].map(z => box(procG, mGr, .046, .2, .046, 2.68, 1.4, z));
  const fillsLo = [-.35, .35].map(z => box(procG, mFoam, .046, .14, .046, .2, -.13, z));
  const capsLo = [-.35, .35].map(z => box(procG, mDk, .05, .04, .05, .2, -.02, z));
  const boards = []; for (let i = 0; i <= 7; i++) boards.push(box(procG, mWood, tr - .02, .015, Wz - .06, xi(i) + tr / 2, (i + 1) * r + .008, 0));
  const lines = [lineBox(K, mRed, 0, -.62, .42, -.62, -.218), lineBox(K, mRed, 2.45, -.62, 2.9, -.62, 1.282), lineBox(K, mRed, 0, .62, .42, .62, -.218), lineBox(K, mRed, 2.45, .62, 2.9, .62, 1.282)];
  return {
    cam: { p: [2.2, 3.6, 6.4], t: [1.45, .55, 0] },
    focus: { 2: [1.45, .9, 0, 2.6], 4: [1.45, .7, 0, 2.4] },
    base() { stairG.visible = false; gBed.visible = false; gGap.visible = false; [...fillsUp, ...fillsLo, ...capsLo, ...boards, ...lines].forEach(o => o.visible = false); },
    steps: [
      (k, A) => {
        lines.forEach((l, i) => l.visible = k > .05 + i * .06); gBed.visible = k > .3;
        bLo.scale.x = .4 * Math.max(.02, seg(k, .3, .6)); bUp.scale.x = .4 * Math.max(.02, seg(k, .45, .75));
        A.tag('复核挑耳平面位置、标高与销键位置', 2.68, 1.5, .55); if (k > .3) A.tag('铺找平砂浆 / 设调平垫片', .2, -.15, .65, 'warn');
      },
      (k, A) => {
        gBed.visible = true; stairG.visible = true;
        const x = lerp(-1.6, 0, seg(k, .22, 1)), y = k < .2 ? 2.0 : lerp(2.0, .9, seg(k, .22, 1)); stairG.position.set(x, y, 0);
        A.rigTo(liftR, 1.3);
        if (k < .22) A.tag('先提升约300mm停稳，检查吊具与构件', x + 1.4, y + 2.2, 0);
        else A.tag('长短索使梯段接近安装坡度', x + 1.4, y + 2.4, 0);
        A.tag('缆风绳控制方向，严禁高空用手扶构件', x + .3, y + .2, .7, 'warn');
      },
      (k, A) => {
        gBed.visible = true; stairG.visible = true; A.fade('flight', .62);
        const y = k < .4 ? lerp(.9, .3, seg(k, 0, .4)) : k < .62 ? .3 : lerp(.3, 0, seg(k, .62, 1)); const x = k < .62 ? lerp(.04, 0, seg(k, .4, .6)) : 0;
        stairG.position.set(x, y, 0); A.rigTo(liftR, 1.3);
        if (k > .35 && k < .7) A.tag('距挑耳约300mm稍停，销键对准预留孔', .2, .35, .6, 'warn');
        if (k >= .62) A.tag('缓慢落位，销键穿入预留孔', 2.68, 1.85, .6);
      },
      (k, A) => {
        gBed.visible = true; stairG.visible = true;
        stairG.position.set(lerp(.012, 0, seg(k, .15, .5)), 0, 0);
        if (k < .75) A.rigTo(liftR, 1.3); else A.hookAt(V(1.45, 3.4 + (k - .75) * 6, 0));
        A.tag('检查位置、标高、搁置长度（6、7度≥75mm）', .2, .15, .75);
        if (k > .75) A.tag('就位后及时调整、固定，再摘钩', 1.45, 2.0, 0, 'ok');
      },
      (k, A) => {
        gBed.visible = true; stairG.visible = true; A.fade('flight', .55); gGap.visible = k > .55;
        fillsUp.forEach(f => K.grow(f, seg(k, .05, .4))); fillsLo.forEach(f => K.grow(f, seg(k, .3, .5))); capsLo.forEach(c => c.visible = k > .5);
        sealLo.visible = sealUp.visible = k > .75;
        A.tag('上端：孔内灌浆 → 固定铰', 2.68, 1.6, .7); if (k > .3) A.tag('下端：孔内留空腔、孔口封堵 → 滑动铰', .2, .1, .75, 'warn');
        if (k > .55) A.tag('端缝填柔性材料并打胶，防止滑落', -.02, .05, -.8);
      },
      (k, A) => {
        gBed.visible = true; stairG.visible = true; gGap.visible = true; fillsUp.forEach(f => f.visible = true); fillsLo.forEach(f => f.visible = true); capsLo.forEach(c => c.visible = true);
        boards.forEach((b, i) => b.visible = k > .1 + i * .08);
        A.tag('踏步铺板保护棱角', 1.5, 1.1, 0); if (k > .75) A.tag('验收：位置、标高、搁置长度 ✔', 2.68, 1.7, .6, 'ok');
      }
    ]
  };
}

// ======================= 5 预制外墙板（夹心保温外挂墙板） =======================
function buildWall(K) {
  const { P, M, PM, box, cyl, poly, ring, holeSlab, procG, root } = K;
  const X0 = -1.5, X1 = 1.5, Y0 = .06, Y1 = 2.98, hole = { x0: -.6, x1: .6, y0: .9, y1: 2.4 };
  const zi0 = .02, zi1 = .17, zo0 = .24, zo1 = .30;
  const gBe = P('beam', 'adj', [0, 0, -2.2]); const mBe = M('beam', C.adj);
  box(gBe, mBe, 3.8, .5, .3, 0, -.25, -.15); box(gBe, mBe, 3.8, .12, 1.3, 0, -.06, -.95);
  box(gBe, mBe, 3.8, .5, .3, 0, 2.75, -.15); box(gBe, mBe, 3.8, .12, 1.3, 0, 2.94, -.95);
  const gAdj = P('adj', 'conc', [.9, 0, 0], root, { radial: { ax: 'x', c: 0 } }); const mAdj = M('adj', 0xd9d6cf);
  [-1, 1].forEach(sg => { const g = new THREE.Group(); g.position.x = sg * 1.74; gAdj.add(g); box(g, mAdj, .45, Y1 - Y0, zo1 - zi0, 0, (Y0 + Y1) / 2, (zi0 + zo1) / 2); });
  const wallG = new THREE.Group(); root.add(wallG);
  const gIn = P('inner', 'conc', [0, 0, 0], wallG); holeSlab(gIn, M('inner', C.conc), X0, X1, Y0, Y1, zi0, zi1, hole);
  const gIs = P('insul', 'other', [0, 0, 1.0], wallG); holeSlab(gIs, M('insul', C.insul, { rough: .9 }), X0 + .02, X1 - .02, Y0 + .02, Y1 - .02, zi1, zo0, hole);
  const gOu = P('outer', 'conc', [0, 0, 1.9], wallG); holeSlab(gOu, M('outer', 0xd3cfc6), X0, X1, Y0, Y1, zo0, zo1, hole);
  const gTi = P('ties', 'embed', [0, 0, .55], wallG); const mTi = M('ties', C.tie, { rough: .5 });
  const inHole = (x, y, pad = .05) => x > hole.x0 - pad && x < hole.x1 + pad && y > hole.y0 - pad && y < hole.y1 + pad;
  for (let x = -1.3; x <= 1.31; x += .43) for (let y = .3; y <= 2.8; y += .45) if (!inHole(x, y, .12)) cyl(gTi, mTi, .009, [x, y, .08], [x, y, .285]);
  const mesh = (g, m, z, step) => {
    for (let x = X0 + .1; x <= X1 - .09; x += step) { if (x > hole.x0 - .03 && x < hole.x1 + .03) { cyl(g, m, .004, [x, Y0 + .04, z], [x, hole.y0 - .03, z]); cyl(g, m, .004, [x, hole.y1 + .03, z], [x, Y1 - .04, z]); } else cyl(g, m, .004, [x, Y0 + .04, z], [x, Y1 - .04, z]); }
    for (let y = Y0 + .1; y <= Y1 - .09; y += step) { if (y > hole.y0 - .03 && y < hole.y1 + .03) { cyl(g, m, .004, [X0 + .04, y, z], [hole.x0 - .03, y, z]); cyl(g, m, .004, [hole.x1 + .03, y, z], [X1 - .04, y, z]); } else cyl(g, m, .004, [X0 + .04, y, z], [X1 - .04, y, z]); }
  };
  const gMi = P('meshIn', 'steel', [0, 0, -.65], wallG); const mMi = M('meshIn', C.steel, { metal: .3, rough: .5 }); mesh(gMi, mMi, .05, .2); mesh(gMi, mMi, .14, .2);
  const gMo = P('meshOut', 'steel', [0, 0, 1.45], wallG); mesh(gMo, M('meshOut', C.stir, { metal: .3, rough: .5 }), .27, .2);
  const gWi = P('window', 'steel', [0, 0, -.65], wallG); const mWi = M('window', 0x7b241c, { metal: .3, rough: .5 });
  [.06, .1].forEach(o => { cyl(gWi, mWi, .007, [hole.x0 - .4, hole.y0 - o, .095], [hole.x1 + .4, hole.y0 - o, .095]); cyl(gWi, mWi, .007, [hole.x0 - .4, hole.y1 + o, .095], [hole.x1 + .4, hole.y1 + o, .095]); cyl(gWi, mWi, .007, [hole.x0 - o, hole.y0 - .4, .095], [hole.x0 - o, hole.y1 + .4, .095]); cyl(gWi, mWi, .007, [hole.x1 + o, hole.y0 - .4, .095], [hole.x1 + o, hole.y1 + .4, .095]); });
  [[hole.x0, hole.y0, -1, -1], [hole.x1, hole.y0, 1, -1], [hole.x0, hole.y1, -1, 1], [hole.x1, hole.y1, 1, 1]].forEach(([x, y, sx, sy]) => { const cx = x + sx * .13, cy = y + sy * .13, dx = sx * .18, dy = -sy * .18; cyl(gWi, mWi, .007, [cx - dx, cy - dy, .11], [cx + dx, cy + dy, .11]); });
  const gLi = P('lift', 'embed', [0, .55, 0], wallG); const mL = M('lift', C.lift, { metal: .4, rough: .4 });
  const liftR = [-.9, .9].map(x => { cyl(gLi, mL, .008, [x, Y1 - .15, .095], [x, Y1, .095]); return ring(gLi, mL, .04, x, Y1 + .04, .095, Math.PI / 2); });
  // 连接节点（下部承重 2 个 + 上部限位 2 个）
  const gCn = P('conn', 'embed', [0, 0, -1.3]); const mCn = M('conn', 0x34495e, { metal: .6, rough: .4 }), mSlot = M('conn', 0x111111);
  [-1.1, 1.1].forEach(x => { box(gCn, mCn, .22, .02, .3, x, Y0 - .01, 0); box(gCn, mCn, .22, .2, .016, x, -.04, .008); box(gCn, mCn, .2, .1, .006, x, Y0 + .08, .017); });
  const topConn = [-1.1, 1.1].map(x => { const g = new THREE.Group(); gCn.add(g); box(g, mCn, .2, .28, .016, x, 2.72, .008); box(g, mCn, .2, .1, .006, x, 2.78, .017); box(g, mSlot, .1, .02, .004, x, 2.72, .018); return g; });
  const gSe = P('seal', 'other', [0, 0, 2.3]); const mPe = M('seal', C.white), mSe = M('seal', C.seal, { rough: .4 });
  const peRods = [], seals = [];
  [-1, 1].forEach(sg => { const x = sg * 1.5075; const g = new THREE.Group(); gSe.add(g); peRods.push(g); cyl(g, mPe, .0095, [x, Y0 + .02, .275], [x, Y1 - .02, .275]); seals.push(box(gSe, mSe, .016, Y1 - Y0 - .02, .012, x, (Y0 + Y1) / 2, .293)); });
  // —— 工序专用 ——
  const mRed = PM(C.red), mSp = PM(0xd4ac0d, { metal: .4, rough: .4 }), mWat = PM(0x3498db, { op: .75 });
  const lines = [lineBox(K, mRed, -1.9, .02, 1.9, .02, .003), lineBox(K, mRed, -1.9, .30, 1.9, .30, .003), lineBox(K, mRed, -1.5, -.4, -1.5, .5, .003), lineBox(K, mRed, 1.5, -.4, 1.5, .5, .003)];
  const spreader = box(procG, mSp, 2.1, .12, .12, 0, 0, .095);
  const drops = []; for (let i = 0; i < 46; i++) drops.push(K.sph(procG, mWat, .012, 0, 0, 0));
  const seeThru = (A, k) => { const op = lerp(1, .32, seg(k, 0, .25)); ['inner', 'insul', 'outer', 'adj'].forEach(p => A.fade(p, op)); };
  const dropX = drops.map((d, i) => (i % 2 ? 1 : -1) * (1.5075 + ((i * 37) % 9 - 4) * .012));
  return {
    cam: { p: [2.7, 2.4, 5.6], t: [0, 1.45, .1] },
    focus: { 2: [1.1, .3, .1, 1.3], 3: [1.1, 2.6, .1, 1.3], 4: [1.5, 2.0, .3, 1.5], 5: [1.5, 2.0, .3, 1.8], 6: [0, 1.5, 0, 2.4] },
    base() { wallG.visible = false; topConn.forEach(g => g.visible = false); gSe.visible = false; [...lines, spreader, ...drops].forEach(o => o.visible = false); },
    steps: [
      (k, A) => { lines.forEach((l, i) => l.visible = k > .05 + i * .08); A.tag('弹轴线、外轮廓线和标高控制线', -1.0, .05, .5); if (k > .4) A.tag('复核承重角码与预埋件位置', 1.1, .15, .35, 'warn'); },
      (k, A) => {
        wallG.visible = true; const t = seg(k, .15, 1); wallG.position.set(0, lerp(1.9, .5, t), lerp(1.3, 0, t)); wallG.rotation.y = lerp(.18, 0, t);
        const sy = Y1 + .04 + wallG.position.y + .9; spreader.visible = true; spreader.position.set(0, sy, .095 + wallG.position.z); spreader.rotation.y = wallG.rotation.y;
        A.rigSpreader(liftR, spreader, .9);
        if (k < .15) A.tag('分配梁两点起吊，试吊检查', 0, sy + .9, wallG.position.z); else A.tag('保持竖直，不得偏斜、摇摆、扭转', 0, sy + .9, wallG.position.z);
        A.tag('缆风绳控制方向，下方严禁站人', 1.7, .4, 1.2, 'warn');
      },
      (k, A) => {
        wallG.visible = true; wallG.position.set(0, lerp(.5, 0, seg(k, .1, .75)), 0); seeThru(A, k);
        const sy = Y1 + .04 + wallG.position.y + .9; spreader.visible = true; spreader.position.set(0, sy, .095); A.rigSpreader(liftR, spreader, .9);
        if (k > .6) A.tag('下部2个承重节点落在角码上', 1.1, .22, .4); if (k > .75) A.tag('承重连接点不应多于2个', -1.1, .22, .4, 'warn');
      },
      (k, A) => {
        wallG.visible = true; seeThru(A, k); topConn.forEach((g, i) => { const t = seg(k, .1 + i * .12, .3 + i * .12); g.visible = t > .01; g.position.z = -.25 * (1 - t); });
        wallG.rotation.x = -.012 * (1 - seg(k, .4, .75));
        if (k < .82) { const sy = Y1 + .94; spreader.visible = true; spreader.position.set(0, sy, .095); A.rigSpreader(liftR, spreader, .9); } else { spreader.visible = true; spreader.position.set(0, Y1 + .94 + (k - .82) * 6, .095); A.hookAt(V(0, Y1 + 1.84 + (k - .82) * 6, .095)); }
        A.tag('上部限位节点：滑动孔，适应层间位移', 1.1, 2.9, .35);
        if (k > .4 && k < .85) A.tag('校正垂直度、平整度、板缝宽度', -1.2, 1.6, .5, 'warn');
      },
      (k, A) => {
        wallG.visible = true; topConn.forEach(g => g.visible = true); gSe.visible = true;
        peRods.forEach((g, i) => { g.position.z = .12 * (1 - seg(k, .05 + i * .1, .3 + i * .1)); g.visible = k > .05; });
        seals.forEach((s, i) => K.grow(s, seg(k, .4 + i * .15, .75 + i * .15)));
        A.tag('塞PE背衬棒，控制胶深', 1.51, 2.2, .45); if (k > .4) A.tag('打密封胶：缝宽≥15mm（JGJ 1）', -1.51, 1.4, .45, 'warn');
      },
      (k, A) => {
        wallG.visible = true; topConn.forEach(g => g.visible = true); gSe.visible = true;
        drops.forEach((d, i) => { const ph = ((k * 4 + i * .137) % 1); d.visible = k > .04; d.position.set(dropX[i], Y1 - ph * (Y1 - Y0), .33 + (i % 3) * .01); });
        A.tag('对板缝淋水，室内侧检查有无渗漏', 1.51, 2.6, .5); A.tag('检验方法与数量：条文待核实', -1.51, 2.2, .5, 'warn');
      },
      (k, A) => {
        wallG.visible = true; topConn.forEach(g => g.visible = true); gSe.visible = true;
        A.pulse('conn', k);
        A.tag('节点防腐、防锈、防火', 1.1, 2.95, .1); if (k > .4) A.tag('露明金属件用A级材料封堵', -1.1, .3, .1, 'warn'); if (k > .75) A.tag('形成验收记录 ✔', 0, 2.5, .5, 'ok');
      }
    ]
  };
}

const BUILDERS = { 'pc-column': buildColumn, 'comp-beam': buildBeam, 'comp-slab': buildSlab, 'pc-stair': buildStair, 'pc-wall': buildWall };

// ======================= 组件：构造 + 工艺 =======================
function createComp(id) {
  const K = makeKit();
  const def = BUILDERS[id](K);
  const { root, procG, parts, order } = K;
  // 工序吊钩与钢丝绳
  const rigG = new THREE.Group(); procG.add(rigG);
  const hookM = new THREE.MeshStandardMaterial({ color: 0xf39c12, metalness: .4, roughness: .4 });
  const hook = new THREE.Group(); rigG.add(hook);
  const hb = new THREE.Mesh(UB, hookM); hb.scale.set(.22, .26, .14); hb.position.y = .16; hook.add(hb);
  const hk = new THREE.Mesh(UT, hookM); hk.scale.setScalar(.06); hook.add(hk);
  const MAXC = 14; const cabPos = new Float32Array(MAXC * 6);
  const cabGeo = new THREE.BufferGeometry(); cabGeo.setAttribute('position', new THREE.BufferAttribute(cabPos, 3));
  const cables = new THREE.LineSegments(cabGeo, new THREE.LineBasicMaterial({ color: 0x1f2d3a })); cables.frustumCulled = false; rigG.add(cables);
  K.extraMats.push(hookM, cables.material);
  // 快照（每帧复位）
  const snap = []; root.updateMatrixWorld(true);
  root.traverse(o => snap.push([o, o.position.clone(), o.quaternion.clone(), o.scale.clone(), o.visible]));
  const allMats = new Set(); root.traverse(o => { if (o.material) allMats.add(o.material); });
  const matSnap = [...allMats].map(m => [m, m.opacity, m.transparent, m.depthWrite, m.emissive ? m.emissive.getHex() : 0, m.emissiveIntensity]);
  const childBase = {}; order.forEach(pid => { childBase[pid] = parts[pid].g.children.map(c => c.position.clone()); });
  const resetMats = () => {
    for (const [m, op, tr, dw, em, ei] of matSnap) { if (m.opacity !== op || m.transparent !== tr) { m.opacity = op; m.transparent = tr; m.depthWrite = dw; m.needsUpdate = true; } if (m.emissive) { m.emissive.setHex(em); m.emissiveIntensity = ei; } }
  };
  const reset = () => { for (const [o, p, q, s, v] of snap) { o.position.copy(p); o.quaternion.copy(q); o.scale.copy(s); o.visible = v; } resetMats(); };
  const setOpacity = (pid, op) => parts[pid].mats.forEach(m => { const tr = op < .99; if (m.transparent !== tr) m.needsUpdate = true; m.transparent = tr; m.opacity = op; m.depthWrite = !tr; });
  const tags = [];
  let cabN = 0;
  const A = {
    tag: (text, x, y, z, cls = '') => tags.push({ text, p: V(x, y, z), cls }),
    fade: (pid, op) => setOpacity(pid, op),
    pulse: (pid, k) => parts[pid].mats.forEach(m => { m.emissive.setHex(0x0ea5e9); m.emissiveIntensity = .25 + .25 * Math.sin(k * Math.PI * 8); }),
    hookAt(p) { rigG.visible = true; hook.position.copy(p); this._cab(p, V(p.x, p.y + 8, p.z)); },
    _cab(a, b) { if (cabN >= MAXC) return; cabPos.set([a.x, a.y, a.z, b.x, b.y, b.z], cabN * 6); cabN++; },
    rigTo(objs, h = 1.2) {
      root.updateMatrixWorld(true);
      const ws = objs.map(o => o.getWorldPosition(new THREE.Vector3()));
      const c = ws.reduce((s, v) => s.add(v), V(0, 0, 0)).multiplyScalar(1 / ws.length);
      const hp = V(c.x, Math.max(...ws.map(v => v.y)) + h, c.z);
      this.hookAt(hp); ws.forEach(w => this._cab(hp, w));
    },
    rigSpreader(objs, spreader, h) {
      root.updateMatrixWorld(true);
      const sp = spreader.getWorldPosition(new THREE.Vector3()); const hp = V(sp.x, sp.y + h, sp.z);
      this.hookAt(hp);
      objs.forEach(o => { const w = o.getWorldPosition(new THREE.Vector3()); const top = V(w.x, sp.y, w.z); this._cab(hp, top); this._cab(top, w); });
    }
  };
  const finishRig = () => { cabGeo.setDrawRange(0, cabN * 2); cabGeo.attributes.position.needsUpdate = true; };
  const comp = {
    id, root, parts, order, def, tags,
    steps: def.steps,
    pickables() { const out = []; root.traverse(o => { if (o.isMesh) { let p = o, vis = true, pid = null; while (p && p !== root) { if (!p.visible) { vis = false; break; } if (p.userData.part && !pid) pid = p.userData.part; p = p.parent; } if (vis && pid) out.push(o); } }); return out; },
    partOf(o) { while (o && o !== root) { if (o.userData.part) return o.userData.part; o = o.parent; } return null; },
    struct({ explode = 0, trans = false, rebar = false, sel = null }) {
      reset(); tags.length = 0; procG.visible = false;
      order.forEach(pid => {
        const pt = parts[pid];
        if (pt.radial) { const ax = pt.radial.ax, c = pt.radial.c; pt.g.children.forEach((ch, i) => { const b = childBase[pid][i]; const sg = Math.sign(b[ax] - c) || 1; ch.position.copy(b).addScaledVector(pt.ex, sg * explode); }); }
        else pt.g.position.addScaledVector(pt.ex, explode);
        const isSteel = pt.kind === 'steel' || pt.kind === 'embed';
        pt.g.visible = !rebar || isSteel;
        if (trans && !isSteel && pt.kind !== 'temp') setOpacity(pid, .16);
        if (sel && pid === sel) pt.mats.forEach(m => { m.emissive.setHex(0x0ea5e9); m.emissiveIntensity = .55; });
      });
      if (sel && !trans && !rebar) order.forEach(pid => { if (pid !== sel && parts[pid].kind !== 'steel' && parts[pid].kind !== 'embed') setOpacity(pid, .6); });
    },
    pose(i, k) {
      reset(); tags.length = 0; procG.visible = true; rigG.visible = false; cabN = 0;
      def.base(A);
      for (let j = 0; j < i; j++) { cabN = 0; rigG.visible = false; def.steps[j](1, A); }
      tags.length = 0; cabN = 0; rigG.visible = false; resetMats(); def.steps[i](k, A); finishRig();
    },
    dispose() { allMats.forEach(m => m.dispose()); cabGeo.dispose(); }
  };
  return comp;
}

// ======================= 挂载 =======================
export function mountWorkshop(hostEl, { onExit, onQuiz } = {}) {
  const DATA = window.SHAPAN_WORKSHOP || { components: [], questions: [] };
  const byId = id => DATA.components.find(c => c.id === id);
  const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (getComputedStyle(hostEl).position === 'static') hostEl.style.position = 'relative';

  const root = document.createElement('div'); root.className = 'ws-root';
  root.innerHTML = `
  <header class="ws-hd">
    <div class="ws-ttl"><b>构件工坊</b><span class="ws-cn"></span></div>
    <nav class="ws-tabs" role="tablist"><button class="ws-tab" data-tab="struct">构造</button><button class="ws-tab" data-tab="proc">安装工艺</button><button class="ws-tab" data-tab="quiz">小测</button></nav>
    <span class="ws-sp"></span>
    <select class="ws-sel" aria-label="切换构件"></select>
    <button class="ws-btn ws-galbtn" type="button"><span class="ws-l">构件</span>目录</button>
    <button class="ws-btn ws-exit" type="button">回到工地</button>
  </header>
  <div class="ws-bd">
    <div class="ws-view"><div class="ws-tags"></div><div class="ws-hint"></div>
      <div class="ws-ctl">
        <label>拆解 <input type="range" class="ws-ex" min="0" max="1" step="0.01" value="0"></label>
        <label><input type="checkbox" class="ws-tr"> 混凝土透明</label>
        <label><input type="checkbox" class="ws-rb"> 只看钢筋</label>
        <button class="ws-btn ws-rv" type="button">复位视角</button>
      </div>
      <div class="ws-pbar">
        <button class="ws-prev" type="button" aria-label="上一步">◀</button>
        <button class="ws-play" type="button" aria-label="播放">▶</button>
        <button class="ws-next" type="button" aria-label="下一步">▶▶</button>
        <div class="ws-prog"><small class="ws-pt"></small><i><b></b></i></div>
      </div>
    </div>
    <aside class="ws-side"><div class="ws-card"></div><div class="ws-list"></div></aside>
    <button class="ws-btn ws-tgl" type="button">列表 ▴</button>
    <div class="ws-quiz"></div>
    <div class="ws-gal"></div>
  </div>`;
  hostEl.appendChild(root);
  const $ = s => root.querySelector(s);
  const view = $('.ws-view'), tagsEl = $('.ws-tags'), card = $('.ws-card'), list = $('.ws-list'), quizEl = $('.ws-quiz'), galEl = $('.ws-gal');
  const sel = $('.ws-sel');
  sel.innerHTML = IDS.map(id => `<option value="${id}">${esc((byId(id) || {}).name || id)}</option>`).join('');

  // three
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.localClippingEnabled = false;
  view.insertBefore(renderer.domElement, view.firstChild);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb9c2c9, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(4, 8, 6); scene.add(sun);
  const fill = new THREE.DirectionalLight(0xffffff, .55); fill.position.set(-5, 3, -4); scene.add(fill);
  const grid = new THREE.GridHelper(14, 28, 0xb8c3cc, 0xd5dde3); grid.position.y = -1.25; scene.add(grid);
  const camera = new THREE.PerspectiveCamera(40, 1, .05, 200);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener('start', () => { camAnim = null; });
  controls.enableDamping = !reduced; controls.dampingFactor = .09; controls.minDistance = 1.2; controls.maxDistance = 22; controls.maxPolarAngle = Math.PI * .58;

  const cache = new Map();
  let cur = null, comp = null, tab = 'struct', gallery = false, running = false, raf = 0, last = 0;
  const st = { explode: 0, trans: false, rebar: false, sel: null };
  const pr = { i: 0, k: 0, playing: false, hold: 0 };
  const STEP_T = 7.5;
  const tagPool = [];
  const getComp = id => { if (!cache.has(id)) cache.set(id, createComp(id)); return cache.get(id); };
  const gridY = { 'pc-column': -1.25, 'comp-beam': 0, 'comp-slab': 0, 'pc-stair': -.62, 'pc-wall': -.5 };

  // 按可见部件的包围球自动取景（方向取自构件预设 cam）
  const _bx = new THREE.Box3(), _b2 = new THREE.Box3();
  function fitOf(c) {
    if (c._fit) return c._fit;
    c.struct({ explode: .45, trans: false, rebar: false, sel: null }); c.root.updateMatrixWorld(true); _bx.makeEmpty();
    c.root.traverse(o => { if (!o.isMesh) return; let p = o; while (p) { if (!p.visible) return; p = p.parent; } if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); _b2.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); _bx.union(_b2); });
    const sp = _bx.getBoundingSphere(new THREE.Sphere());
    c._fit = { center: sp.center.clone().lerp(V(...c.def.cam.t), .35), r: sp.radius, dir: V(...c.def.cam.p).sub(V(...c.def.cam.t)).normalize() };
    return c._fit;
  }
  let camAnim = null;
  function camGoal(c, fc) {
    const f = fitOf(c); const vf = THREE.MathUtils.degToRad(camera.fov), hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
    const r = fc ? fc[3] : f.r, t = fc ? V(fc[0], fc[1], fc[2]) : f.center.clone();
    return { t, p: t.clone().addScaledVector(f.dir, r / Math.sin(Math.min(vf, hf) / 2) * .82) };
  }
  function flyTo(fc) { const g = camGoal(comp, fc); if (reduced) { controls.target.copy(g.t); camera.position.copy(g.p); controls.update(); camAnim = null; return; } camAnim = { p0: camera.position.clone(), t0: controls.target.clone(), p1: g.p, t1: g.t, k: 0 }; }
  function setCam(c) {
    const f = fitOf(c.comp || comp); const vf = THREE.MathUtils.degToRad(camera.fov), hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
    const d = f.r / Math.sin(Math.min(vf, hf) / 2) * .82;
    controls.target.copy(f.center); camera.position.copy(f.center).addScaledVector(f.dir, d); controls.update();
  }
  function showComp(id) {
    if (comp) scene.remove(comp.root);
    cur = id; comp = getComp(id); scene.add(comp.root); grid.position.y = gridY[id] ?? 0;
    st.sel = null; st.explode = 0; $('.ws-ex').value = 0; pr.i = 0; pr.k = 0; pr.playing = false;
    setCam({}); sel.value = id;
    $('.ws-cn').textContent = ' · ' + ((byId(id) || {}).name || id);
  }

  // ---------- 侧栏 ----------
  const kindColor = pt => '#' + (pt.color ?? 0x999999).toString(16).padStart(6, '0');
  function renderStructSide() {
    const d = byId(cur) || { parts: [] };
    const p = st.sel && d.parts.find(x => x.id === st.sel);
    const pt = st.sel && comp.parts[st.sel];
    card.innerHTML = p ? `<h3>${esc(p.name)}</h3><span class="ws-k">${esc(KIND_LABEL[pt.kind] || '')}</span>
      <div class="ws-sec"><b>作用</b>${esc(p.fn)}</div><div class="ws-sec key"><b>关键要求</b>${esc(p.req)}</div><div class="ws-sec norm"><b>依据</b>${esc(p.norm)}</div>`
      : `<h3>${esc(d.name)}</h3><p>${esc(d.desc)}</p><p style="color:#4a5b6b">拖动「拆解」滑块把各层分开；点模型上的任意部件，或点下面的名称，看它的作用和关键要求。</p>`;
    list.innerHTML = `<div class="ws-lh"><span>部件（${d.parts.length}）</span>${st.sel ? '<button class="ws-btn ws-clr" type="button" style="min-height:30px;padding:.1em .6em">取消选择</button>' : ''}</div>
      <div class="ws-chips">${d.parts.map(x => `<button type="button" class="ws-chip${x.id === st.sel ? ' on' : ''}" data-p="${x.id}"><i style="background:${comp.parts[x.id] ? kindColor(comp.parts[x.id]) : '#999'}"></i>${esc(x.name)}</button>`).join('')}</div>
      <div class="ws-norms">本构件引用：${(d.norms || []).map(n => esc(n[0] + ' ' + n[1])).join('；')}</div>`;
    list.querySelectorAll('[data-p]').forEach(b => b.onclick = () => selectPart(b.dataset.p === st.sel ? null : b.dataset.p));
    const clr = list.querySelector('.ws-clr'); if (clr) clr.onclick = () => selectPart(null);
  }
  function renderProcSide() {
    const d = byId(cur) || { steps: [] }; const n = Math.min(d.steps.length, comp.steps.length); const s = d.steps[pr.i] || {};
    card.innerHTML = `<h3>第 ${pr.i + 1} 步 · ${esc(s.t)}</h3><div class="ws-sec"><b>做什么</b>${esc(s.do)}</div><div class="ws-sec key"><b>质量 / 安全要点</b>${esc(s.key)}</div><div class="ws-sec norm"><b>规范依据</b>${esc(s.norm)}</div>`;
    list.innerHTML = `<div class="ws-lh"><span>安装工序（${n} 步）</span></div><ol class="ws-steps">${d.steps.slice(0, n).map((x, i) => `<li class="${i === pr.i ? 'on' : i < pr.i ? 'done' : ''}"><button type="button" data-i="${i}">${esc(x.t)}</button></li>`).join('')}</ol>`;
    list.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { goStep(+b.dataset.i, false); if (root.classList.contains('ws-short')) list.classList.remove('ws-open'); });
  }
  function selectPart(pid) { st.sel = pid; applyStruct(); renderStructSide(); }
  function applyStruct() { if (comp && tab === 'struct') comp.struct(st); }

  // ---------- 工艺 ----------
  const nSteps = () => Math.min((byId(cur) || { steps: [] }).steps.length, comp ? comp.steps.length : 0);
  function goStep(i, play) { const fc = comp && comp.def.focus || {}; const ni = clamp(i, 0, nSteps() - 1); if (comp && (ni !== pr.i || tab !== lastFocusTab || fc[ni])) flyTo(fc[ni]); lastFocusTab = tab; pr.i = ni; pr.k = reduced ? 1 : 0; pr.hold = 0; pr.playing = play ?? pr.playing; poseNow(); renderProcSide(); updBar(); }
  function poseNow() { if (comp && tab === 'proc') comp.pose(pr.i, pr.k); }
  function updBar() { const n = nSteps(); $('.ws-pt').textContent = `第 ${pr.i + 1} / ${n} 步`; $('.ws-prog b').style.width = ((pr.i + pr.k) / n * 100).toFixed(1) + '%'; const pb = $('.ws-play'); pb.textContent = pr.playing ? '❚❚' : '▶'; pb.setAttribute('aria-label', pr.playing ? '暂停' : '播放'); }
  $('.ws-prev').onclick = () => goStep(pr.i - 1, false);
  $('.ws-next').onclick = () => goStep(pr.i + 1, false);
  $('.ws-play').onclick = () => { if (!pr.playing && pr.i >= nSteps() - 1 && pr.k >= 1) goStep(0, true); else { pr.playing = !pr.playing; if (pr.playing && pr.k >= 1 && reduced) pr.hold = 0; updBar(); } };

  // ---------- 小测 ----------
  let qState = null, lastFocusTab = null;
  function renderQuiz() {
    const d = byId(cur) || {}; const qs = DATA.questions.filter(q => q.comp === cur);
    if (!qState || qState.id !== cur) qState = { id: cur, pick: qs.map(() => -1), done: false };
    const done = qState.done, correct = qs.reduce((s, q, i) => s + (qState.pick[i] === q.ans ? 1 : 0), 0);
    quizEl.innerHTML = `<div class="ws-qwrap${done ? ' ws-done' : ''}"><div class="ws-qhd"><h3>小测 · ${esc(d.name)}</h3>${done ? `<span class="ws-score">得分 ${correct} / ${qs.length}</span>` : `<span style="color:#4a5b6b">共 ${qs.length} 题，选好后提交</span>`}</div>
      ${qs.map((q, i) => `<div class="ws-q"><h4>${i + 1}. ${esc(q.q)}</h4><div class="ws-opts">${q.opts.map((o, j) => {
        let c = ''; if (done) { if (j === q.ans) c = ' right'; else if (j === qState.pick[i]) c = ' wrong'; } else if (j === qState.pick[i]) c = ' sel';
        return `<button type="button" class="ws-opt${c}" data-q="${i}" data-o="${j}" ${done ? 'disabled' : ''}>${'ABCD'[j]}. ${esc(o)}</button>`; }).join('')}</div><div class="ws-tip">依据：${esc(q.tip)}</div></div>`).join('')}
      <div class="ws-qhd">${done ? '<button type="button" class="ws-primary ws-redo">再做一次</button><button type="button" class="ws-btn ws-toproc">回看安装工艺</button>' : `<button type="button" class="ws-primary ws-sub" ${qState.pick.includes(-1) ? 'disabled' : ''}>提交</button>`}</div></div>`;
    quizEl.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { qState.pick[+b.dataset.q] = +b.dataset.o; renderQuiz(); });
    const sub = quizEl.querySelector('.ws-sub'); if (sub) sub.onclick = () => { qState.done = true; renderQuiz(); quizEl.scrollTop = 0; const c = qs.reduce((s, q, i) => s + (qState.pick[i] === q.ans ? 1 : 0), 0); try { onQuiz && onQuiz({ id: cur, correct: c, total: qs.length }); } catch (e) { console.warn(e); } };
    const redo = quizEl.querySelector('.ws-redo'); if (redo) redo.onclick = () => { qState = null; renderQuiz(); quizEl.scrollTop = 0; };
    const tp = quizEl.querySelector('.ws-toproc'); if (tp) tp.onclick = () => setTab('proc');
  }

  // ---------- 目录 ----------
  const thumbs = {};
  function makeThumbs() {
    const w = 450, h = 300, saved = new THREE.Vector2(); renderer.getSize(saved); const prev = comp, prevCam = { p: camera.position.clone(), t: controls.target.clone(), a: camera.aspect };
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setClearColor(0xe9eef2, 1);
    IDS.forEach(id => {
      if (thumbs[id]) return; const c = getComp(id); if (comp) scene.remove(comp.root); scene.add(c.root); comp = c; grid.position.y = gridY[id] ?? 0;
      setCam({ comp: c }); c.struct({ explode: .35, trans: false, rebar: false, sel: null });
      renderer.render(scene, camera); try { thumbs[id] = renderer.domElement.toDataURL('image/jpeg', .82); } catch (e) { thumbs[id] = ''; }
    });
    if (comp) scene.remove(comp.root); comp = prev; if (comp) { scene.add(comp.root); grid.position.y = gridY[cur] ?? 0; }
    camera.position.copy(prevCam.p); controls.target.copy(prevCam.t); camera.aspect = prevCam.a; camera.updateProjectionMatrix(); controls.update();
    renderer.setSize(saved.x || 1, saved.y || 1, false); renderer.setClearColor(0x000000, 0);
  }
  function renderGallery() {
    makeThumbs();
    galEl.innerHTML = `<div class="ws-gintro"><h2>构件工坊</h2>选一个装配式构件：先拆开看构造，再看一遍安装工艺，最后做 2~3 道小题。</div><div class="ws-grid">${IDS.map(id => { const d = byId(id) || {}; return `<button type="button" class="ws-gcard" data-id="${id}">${thumbs[id] ? `<img src="${thumbs[id]}" alt="">` : '<span class="ws-ph"></span>'}<div><h4>${esc(d.name)}</h4><p>${esc(d.desc)}</p></div></button>`; }).join('')}</div>`;
    galEl.querySelectorAll('[data-id]').forEach(b => b.onclick = () => api.open(b.dataset.id));
  }

  // ---------- 标签页 ----------
  function setTab(t) {
    tab = t; root.querySelectorAll('.ws-tab').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
    root.classList.toggle('ws-tquiz', t === 'quiz');
    $('.ws-ctl').style.display = t === 'struct' ? '' : 'none';
    $('.ws-pbar').style.display = t === 'proc' ? '' : 'none';
    quizEl.style.display = t === 'quiz' ? 'block' : 'none';
    $('.ws-hint').textContent = t === 'struct' ? '拖动旋转 · 滚轮/双指缩放 · 点部件看说明' : '拖动旋转视角 · 点右侧工序跳转';
    list.classList.remove('ws-open');
    if (t === 'struct') { if (lastFocusTab === 'proc') flyTo(null); lastFocusTab = 'struct'; applyStruct(); renderStructSide(); hideTags(); }
    else if (t === 'proc') { goStep(pr.i, !reduced); }
    else { renderQuiz(); hideTags(); }
  }
  root.querySelectorAll('.ws-tab').forEach(b => b.onclick = () => setTab(b.dataset.tab));
  sel.onchange = () => api.open(sel.value);
  $('.ws-galbtn').onclick = () => api.open();
  $('.ws-exit').onclick = () => { try { onExit && onExit(); } catch (e) { console.warn(e); } };
  $('.ws-ex').oninput = e => { st.explode = +e.target.value; applyStruct(); };
  $('.ws-tr').onchange = e => { st.trans = e.target.checked; applyStruct(); };
  $('.ws-rb').onchange = e => { st.rebar = e.target.checked; applyStruct(); };
  $('.ws-rv').onclick = () => comp && setCam({});
  $('.ws-tgl').onclick = () => list.classList.toggle('ws-open');

  // ---------- 点选 ----------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let down = null;
  renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!down || tab !== 'struct' || !comp) return; const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]); down = null; if (moved > 7) return;
    const r = renderer.domElement.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ndc, camera); const hits = ray.intersectObjects(comp.pickables(), false);
    let pid = null;
    for (const h of hits) { const p = comp.partOf(h.object); const k = comp.parts[p].kind; if (st.trans && !(k === 'steel' || k === 'embed' || k === 'temp')) { if (!pid) pid = p; continue; } pid = p; break; }
    if (st.trans && hits.length) { const firstSolid = hits.find(h => { const k = comp.parts[comp.partOf(h.object)].kind; return k === 'steel' || k === 'embed' || k === 'temp'; }); if (firstSolid) pid = comp.partOf(firstSolid.object); }
    selectPart(pid);
  });

  // ---------- 标签投影 ----------
  const tv = new THREE.Vector3();
  function hideTags() { tagPool.forEach(t => t.style.display = 'none'); }
  function drawTags() {
    const list2 = tab === 'proc' && comp ? comp.tags : []; const w = view.clientWidth, h = view.clientHeight, placed = [];
    while (tagPool.length < list2.length) { const d = document.createElement('div'); d.className = 'ws-tag'; tagsEl.appendChild(d); tagPool.push(d); }
    tagPool.forEach((d, i) => {
      const t = list2[i]; if (!t) { d.style.display = 'none'; return; }
      tv.copy(t.p).project(camera); if (tv.z > 1) { d.style.display = 'none'; return; }
      d.style.display = ''; if (d._t !== t.text) { d.textContent = t.text; d._t = t.text; d._w = 0; } d.className = 'ws-tag' + (t.cls ? ' ' + t.cls : '');
      if (!d._w) { d._w = d.offsetWidth; d._h = d.offsetHeight; }
      const hw = Math.min(d._w / 2 + 4, w / 2), x = clamp((tv.x * .5 + .5) * w, hw, w - hw), y = clamp((-tv.y * .5 + .5) * h, d._h + 4, h - 4);
      let yy = y; const L = x - d._w / 2, R = x + d._w / 2;
      for (let g = 0; g < 6; g++) { const hit = placed.find(b => L < b[1] + 4 && R > b[0] - 4 && yy - d._h < b[3] + 3 && yy > b[2] - 3); if (!hit) break; yy = hit[2] - 4; }
      yy = Math.max(yy, d._h + 2); placed.push([L, R, yy - d._h, yy]);
      d.style.transform = `translate(${x.toFixed(0)}px,${yy.toFixed(0)}px) translate(-50%,-100%)`;
    });
  }

  // ---------- 循环 ----------
  function frame(ts) {
    if (!running) return; raf = requestAnimationFrame(frame);
    const dt = Math.min(.12, (ts - (last || ts)) / 1000); last = ts;
    if (tab === 'quiz' || gallery) return;
    if (camAnim) { camAnim.k = Math.min(1, camAnim.k + dt / .9); const e = ease(camAnim.k); camera.position.lerpVectors(camAnim.p0, camAnim.p1, e); controls.target.lerpVectors(camAnim.t0, camAnim.t1, e); if (camAnim.k >= 1) camAnim = null; }
    if (tab === 'proc' && comp && pr.playing) {
      if (pr.k < 1) { pr.k = reduced ? 1 : Math.min(1, pr.k + dt / STEP_T); poseNow(); updBar(); }
      else { pr.hold += dt; if (pr.hold > (reduced ? 5 : 1.6)) { if (pr.i < nSteps() - 1) goStep(pr.i + 1, true); else { pr.playing = false; updBar(); } } }
    }
    controls.update(); renderer.render(scene, camera); drawTags();
  }
  function start() { if (running) return; running = true; last = 0; raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  // ---------- 尺寸 ----------
  function resize() {
    const W = hostEl.clientWidth || root.clientWidth || 1, H = hostEl.clientHeight || root.clientHeight || 1;
    root.classList.toggle('ws-short', H <= 500 && W > H);
    root.classList.toggle('ws-narrow', !(H <= 500 && W > H) && W < 760);
    const vw = view.clientWidth || 1, vh = view.clientHeight || 1;
    renderer.setSize(vw, vh, false); camera.aspect = vw / vh; camera.fov = vw < vh ? 52 : 40; camera.updateProjectionMatrix();
    if (running && !gallery && tab !== 'quiz') { renderer.render(scene, camera); drawTags(); }
  }
  let ro = null; if (window.ResizeObserver) { ro = new ResizeObserver(() => resize()); ro.observe(hostEl); }

  const api = {
    open(id) {
      resize();
      if (!id || !BUILDERS[id]) {
        gallery = true; root.classList.add('ws-gallery'); $('.ws-cn').textContent = ' · 构件目录'; galEl.style.display = 'block'; quizEl.style.display = 'none'; hideTags();
        renderGallery(); start(); return;
      }
      gallery = false; root.classList.remove('ws-gallery'); galEl.style.display = 'none';
      if (id !== cur || !comp) { showComp(id); qState = null; }
      setTab(tab); resize(); start();
    },
    close() { stop(); pr.playing = false; },
    list: () => IDS.map(id => { const d = byId(id) || {}; return { id, name: d.name || id, short: d.short || d.name || id }; }),
    resize,
    dispose() { stop(); if (ro) ro.disconnect(); controls.dispose(); cache.forEach(c => c.dispose()); cache.clear(); renderer.dispose(); root.remove(); }
  };
  return api;
}
