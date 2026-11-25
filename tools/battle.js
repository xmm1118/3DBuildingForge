// 生成「对战小测」单文件：可在双人对战平台里用「上传 HTML」或「网址接入」，配合「单人游戏转分屏对战」
// 用法：node tools/battle.js  →  dist/工程沙盘-对战小测.html、dist/工程沙盘-题库.json
const fs = require('fs');
global.window = global;
['shapan-data', 'scenarios', 'dashboard-data', 'teach-data', 'green-data', 'greenlife-data'].forEach(f => require('../data/' + f + '.js'));
const D = window.SHAPAN_DATA, S = window.SHAPAN_SCENARIOS, T = window.SHAPAN_TEACH;
const OPS = (D.opsPoints || []).map(p => p.id);
const name = id => (D.points.concat(D.opsPoints || []).find(p => p.id === id) || {}).name || id;
const bank = [];
Object.entries(S).forEach(([id, s]) => { if (s.quiz) bank.push({ id: 'scen-' + id, q: s.quiz.q, tip: name(id) + ' · ' + s.title, opts: s.quiz.options.map(o => o.replace(/^[A-D][.．、]\s*/, '')), ans: s.quiz.answer, explain: s.quiz.explain, cat: OPS.includes(id) ? '运维' : '施工', point: id }); });
T.extraQuestions.forEach((q, i) => bank.push({ id: 'x-' + (i + 1), q: q.q, tip: q.cat, opts: q.opts, ans: q.ans, explain: q.explain, cat: q.cat === '运维' ? '运维' : '施工' }));
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/工程沙盘-题库.json', JSON.stringify({ name: '工程沙盘虚拟仿真 · 智慧工地与建筑智能运维题库', school: '安徽工业大学 · 建筑工程学院', format: '与双人对战平台内置题库字段一致：q 题干，tip 提示，opts 选项，ans 正确选项下标（从 0 开始）；explain、cat、point 为扩展字段', count: bank.length, questions: bank }, null, 2));

const html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>工程沙盘 · 对战小测</title>
<style>
:root{--c:#0f2a44}
*{box-sizing:border-box}
body{margin:0;font-family:"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif;background:#f6f8fb;color:#0f172a;min-height:100vh;display:flex;flex-direction:column}
header{background:var(--c);color:#fff;padding:10px 16px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
header b{font-size:clamp(1em,2.2vw,1.25em)}
header .sp{flex:1}
.pill{background:rgba(255,255,255,.15);border-radius:999px;padding:.2em .8em;font-size:.9em}
main{flex:1;display:flex;align-items:flex-start;justify-content:center;padding:clamp(10px,3vw,28px)}
.box{background:#fff;border-radius:16px;padding:clamp(14px,3vw,28px);width:min(760px,100%);box-shadow:0 4px 20px rgba(15,42,68,.08)}
.qt{font-size:clamp(1.1em,2.6vw,1.45em);font-weight:700;line-height:1.55;margin:.2em 0}
.tip{color:#64748b;font-size:.9em;margin-bottom:14px}
.opts{display:flex;flex-direction:column;gap:10px}
.opt{background:#f1f5f9;border:2px solid transparent;border-radius:12px;padding:.75em 1em;text-align:left;font:inherit;font-size:clamp(1em,2vw,1.12em);cursor:pointer;line-height:1.5;color:inherit}
.opt.ok{border-color:#16a34a;background:#dcfce7}.opt.bad{border-color:#dc2626;background:#fee2e2}
.exp{background:#f0f9ff;border-radius:10px;padding:10px 14px;margin-top:12px;line-height:1.65}
.btn{background:var(--c);color:#fff;border:0;border-radius:10px;padding:.7em 1.4em;font:inherit;font-size:1.05em;cursor:pointer;margin-top:12px}
.btn.gold{background:#fbbf24;color:var(--c);font-weight:700}
.seg{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}
.seg button{border:1px solid var(--c);background:#fff;color:var(--c);border-radius:999px;padding:.4em 1em;font:inherit;cursor:pointer}
.seg button.on{background:var(--c);color:#fff}
.big{font-size:clamp(3em,10vw,4.5em);font-weight:900;text-align:center;color:var(--c);margin:.1em 0}
.muted{color:#64748b;line-height:1.6}
.bar{height:8px;background:#e2e8f0;border-radius:99px;overflow:hidden;margin:4px 0 14px}.bar i{display:block;height:100%;background:#0ea5e9;transition:width .3s}
@media (orientation:landscape) and (max-height:500px){header{padding:6px 12px}main{padding:8px}.opts{display:grid;grid-template-columns:1fr 1fr;gap:8px}.opt{padding:.5em .8em}}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
</style></head><body>
<header><b>🏗 工程沙盘 · 对战小测</b><span class="sp"></span><span class="pill" id="hp">得分 0</span><span class="pill" id="hq">准备</span></header>
<main><div class="box" id="box"></div></main>
<script>
const BANK=${JSON.stringify(bank)};
const qs0=new URLSearchParams(location.search);
let N=[3,4,5].includes(+qs0.get('n'))?+qs0.get('n'):5, scope=['施工','运维'].includes(qs0.get('scope'))?qs0.get('scope'):'全部';
const box=document.getElementById('box'),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
function post(type,value,extra){try{window.parent.postMessage(Object.assign({type,value},extra||{}),'*')}catch(e){}}
function home(){
  const cnt=s=>BANK.filter(q=>s==='全部'||q.cat===s).length;
  box.innerHTML='<div class="qt">智慧工地与建筑智能运维 · 退场小测</div><p class="muted">从 '+BANK.length+' 道题中随机抽题，每题 '+Math.round(100/N)+' 分，满分 100。答题时分数和完成状态会自动同步给双人对战平台。</p>'+
  '<div class="seg" id="s">'+['全部','施工','运维'].map(s=>'<button class="'+(s===scope?'on':'')+'" data-s="'+s+'">'+s+'（'+cnt(s)+'）</button>').join('')+'</div>'+
  '<div class="seg" id="n">'+[3,4,5].map(n=>'<button class="'+(n===N?'on':'')+'" data-n="'+n+'">'+n+' 题</button>').join('')+'</div><button class="btn gold" id="go">开始答题</button><p class="muted" style="font-size:.85em;margin-top:14px">安徽工业大学 · 建筑工程学院 · 工程沙盘虚拟仿真系统</p>';
  box.querySelectorAll('#s button').forEach(b=>b.onclick=()=>{scope=b.dataset.s;home()});
  box.querySelectorAll('#n button').forEach(b=>b.onclick=()=>{N=+b.dataset.n;home()});
  box.querySelector('#go').onclick=start;
}
function start(){
  const qs=shuffle(BANK.filter(q=>scope==='全部'||q.cat===scope)).slice(0,N).map(q=>{const o=shuffle(q.opts.map((_,i)=>i));return Object.assign({},q,{opts:o.map(i=>q.opts[i]),ans:o.indexOf(q.ans)})});
  const per=Math.round(100/qs.length);let i=0,score=0,right=0;
  const hud=()=>{document.getElementById('hp').textContent='得分 '+score;document.getElementById('hq').textContent=i<qs.length?('第 '+(i+1)+'/'+qs.length+' 题'):'完成'};
  post('score',0);post('progress',0,{current:0,total:qs.length});
  const draw=()=>{const q=qs[i];hud();
    box.innerHTML='<div class="bar"><i style="width:'+(i/qs.length*100)+'%"></i></div><div class="qt">'+esc(q.q)+'</div><div class="tip">'+esc(q.tip)+'</div><div class="opts">'+q.opts.map((o,k)=>'<button class="opt" data-k="'+k+'">'+String.fromCharCode(65+k)+'. '+esc(o)+'</button>').join('')+'</div><div id="e"></div>';
    box.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{if(box.querySelector('.opt.ok'))return;const k=+b.dataset.k,ok=k===q.ans;
      box.querySelectorAll('.opt')[q.ans].classList.add('ok');if(!ok)b.classList.add('bad');if(ok){score=Math.min(100,score+per);right++}
      if(right===qs.length)score=100;hud();post('score',score);post('progress',i+1,{current:i+1,total:qs.length});
      box.querySelector('#e').innerHTML='<div class="exp"><b>'+(ok?'✓ 答对了':'✗ 答错了')+'</b>　'+esc(q.explain||'')+'</div><button class="btn" id="nx">'+(i+1<qs.length?'下一题 ›':'看成绩')+'</button>';
      box.querySelector('#nx').onclick=()=>{i++;i<qs.length?draw():end()}})};
  const end=()=>{hud();post('done',score);box.innerHTML='<p class="muted" style="text-align:center;margin:0">答题完成</p><div class="big">'+score+'</div><p style="text-align:center">答对 '+right+' / '+qs.length+' 题</p><div style="text-align:center"><button class="btn gold" id="ag">再来一局</button></div>';box.querySelector('#ag').onclick=start};
  draw();
}
qs0.get('auto')?start():home();
</script></body></html>`;
fs.writeFileSync('dist/工程沙盘-对战小测.html', html);
fs.copyFileSync('dist/工程沙盘-对战小测.html', 'web/对战小测.html');
console.log('battle', bank.length, 'questions');
