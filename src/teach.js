// 第三步：学习中心（任务卡 · 学习进度 · 退场小测）
// 进度全部存 localStorage；小测在被双人对战平台以 iframe 嵌入时，按平台协议 postMessage 上报 score / progress / done。
const LS = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const OPS_IDS = ['energy', 'hvac', 'elevator', 'water', 'fire', 'access', 'ienv', 'parking', 'workorder'];

// 题库：场景演示的判断题 + 补充题，统一成双人对战平台内置题库的字段 {q, tip, opts, ans}
export function buildBank() {
  const S = window.SHAPAN_SCENARIOS || {}, D = window.SHAPAN_DATA || { points: [], opsPoints: [] }, T = window.SHAPAN_TEACH || { extraQuestions: [] };
  const name = id => (D.points.concat(D.opsPoints || []).find(p => p.id === id) || {}).name || id;
  const bank = [];
  Object.entries(S).forEach(([id, s]) => {
    if (!s.quiz) return;
    bank.push({ id: 'scen-' + id, q: s.quiz.q, tip: name(id) + ' · ' + s.title, opts: s.quiz.options.map(o => o.replace(/^[A-D][.．、]\s*/, '')), ans: s.quiz.answer, explain: s.quiz.explain, cat: (D.opsPoints || []).some(p => p.id === id) ? '运维' : '施工', point: id });
  });
  (T.extraQuestions || []).forEach((q, i) => bank.push({ id: 'x-' + (i + 1), q: q.q, tip: q.cat, opts: q.opts, ans: q.ans, explain: q.explain, cat: q.cat === '运维' ? '运维' : '施工' }));
  return bank;
}

export const TEACH_CSS = `
#teach{position:fixed;inset:0;z-index:60;background:rgba(10,22,38,.55);display:none;align-items:center;justify-content:center;padding:clamp(0px,2vw,24px)}
body.teach-open #teach{display:flex}
#teach .tbox{background:#f6f8fb;width:min(1080px,100%);height:min(860px,100%);border-radius:18px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.35)}
#teach .thead{display:flex;align-items:center;gap:8px;padding:12px 16px;background:#0f2a44;color:#fff;flex-wrap:wrap}
#teach .thead h2{margin:0 10px 0 0;font-size:clamp(1.05em,1.6vw,1.3em)}
#teach .tabs{display:flex;gap:6px;flex:1;flex-wrap:wrap}
#teach .tab{background:rgba(255,255,255,.12);color:#fff;border:0;border-radius:999px;padding:.45em 1em;font-size:clamp(.9em,1.2vw,1em);cursor:pointer}
#teach .tab.on{background:#fbbf24;color:#0f2a44;font-weight:700}
#teach .tclose{background:none;border:0;color:#fff;font-size:1.8em;line-height:1;cursor:pointer;padding:0 .2em}
#teach .tbody{flex:1;overflow:auto;padding:clamp(12px,2vw,22px)}
#teach .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr));gap:14px}
#teach .card{background:#fff;border-radius:14px;padding:14px 16px;box-shadow:0 2px 10px rgba(15,42,68,.08);display:flex;flex-direction:column;gap:6px;cursor:pointer;border:2px solid transparent;text-align:left;font:inherit;color:inherit}
#teach .card:hover,#teach .card:focus-visible{border-color:#0ea5e9}
#teach .card h3{margin:0;font-size:1.08em;color:#0f2a44}
#teach .card p{margin:0;color:#475569;line-height:1.55;font-size:.95em}
#teach .meta{display:flex;gap:6px;flex-wrap:wrap;font-size:.8em}
#teach .pill{background:#e0f2fe;color:#0369a1;border-radius:999px;padding:.15em .7em}
#teach .pill.done{background:#dcfce7;color:#15803d}
#teach .pill.lv{background:#fef3c7;color:#92400e}
#teach .back{background:none;border:0;color:#0369a1;cursor:pointer;font-size:1em;padding:0;margin-bottom:8px}
#teach .task h3{margin:.2em 0 .4em;font-size:1.3em;color:#0f2a44}
#teach .goal{background:#fff;border-left:4px solid #0ea5e9;padding:10px 14px;border-radius:8px;line-height:1.65;margin:0 0 12px}
#teach .steps{list-style:none;padding:0;margin:0 0 14px;display:flex;flex-direction:column;gap:8px}
#teach .steps li{background:#fff;border-radius:10px;padding:8px 12px;display:flex;align-items:center;gap:10px;line-height:1.5}
#teach .steps li b{flex:0 0 1.8em;height:1.8em;border-radius:50%;background:#0f2a44;color:#fff;display:grid;place-items:center;font-size:.85em}
#teach .steps li span{flex:1}
#teach .go{background:#0ea5e9;color:#fff;border:0;border-radius:8px;padding:.4em .9em;cursor:pointer;white-space:nowrap;font:inherit;font-size:.9em}
#teach .sub{background:#fff;border-radius:12px;padding:12px 14px;margin-bottom:12px}
#teach .sub h4{margin:0 0 8px;color:#0f4c75}
#teach textarea{width:100%;min-height:120px;border:1px solid #cbd5e1;border-radius:8px;padding:10px;font:inherit;line-height:1.6;box-sizing:border-box;resize:vertical}
#teach .opts{display:flex;flex-direction:column;gap:8px}
#teach .opt{background:#f1f5f9;border:2px solid transparent;border-radius:10px;padding:.65em .9em;text-align:left;font:inherit;cursor:pointer;line-height:1.5;color:#0f172a}
#teach .opt.sel{border-color:#0ea5e9;background:#e0f2fe}
#teach .opt.ok{border-color:#16a34a;background:#dcfce7}
#teach .opt.bad{border-color:#dc2626;background:#fee2e2}
#teach .pool,#teach .seq{display:flex;flex-wrap:wrap;gap:8px;min-height:44px;padding:8px;border-radius:10px}
#teach .pool{background:#f1f5f9}
#teach .seq{background:#ecfeff;border:2px dashed #67e8f9;flex-direction:column;flex-wrap:nowrap}
#teach .chipq{background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:.45em .8em;cursor:pointer;font:inherit;text-align:left;color:#0f172a}
#teach .seq .chipq{display:flex;gap:8px;align-items:center}
#teach .seq .chipq i{font-style:normal;background:#0f2a44;color:#fff;border-radius:6px;padding:0 .45em;font-size:.85em}
#teach .seq .chipq.ok{border-color:#16a34a;background:#dcfce7}
#teach .seq .chipq.bad{border-color:#dc2626;background:#fee2e2}
#teach .rub label{display:flex;gap:8px;align-items:flex-start;padding:4px 0;line-height:1.5}
#teach .ref{background:#fffbeb;border-radius:10px;padding:10px 14px;line-height:1.7;display:none;margin-top:8px}
#teach .ref.show{display:block}
#teach .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px}
#teach .btnp{background:#0f2a44;color:#fff;border:0;border-radius:10px;padding:.6em 1.2em;font:inherit;cursor:pointer}
#teach .btnp.alt{background:#fff;color:#0f2a44;border:1px solid #0f2a44}
#teach .btnp.gold{background:#fbbf24;color:#0f2a44;font-weight:700}
#teach .msg{font-weight:600}
#teach .msg.ok{color:#15803d}#teach .msg.bad{color:#b91c1c}
#teach .stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(220px,100%),1fr));gap:12px;margin-bottom:16px}
#teach .stat{background:#fff;border-radius:12px;padding:12px 14px}
#teach .stat .n{font-size:1.9em;font-weight:800;color:#0f2a44}
#teach .stat .l{color:#64748b;font-size:.9em}
#teach .bar{height:8px;background:#e2e8f0;border-radius:99px;overflow:hidden;margin-top:6px}
#teach .bar i{display:block;height:100%;background:#0ea5e9}
#teach table{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;font-size:.92em}
#teach th,#teach td{padding:8px 10px;border-bottom:1px solid #eef2f7;text-align:left}
#teach th{background:#eef4fa;color:#0f4c75}
#teach .field{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 12px}
#teach .field input{border:1px solid #cbd5e1;border-radius:8px;padding:.5em .7em;font:inherit;min-width:0;flex:1 1 140px}
#teach .qbox{background:#fff;border-radius:14px;padding:clamp(14px,2.4vw,26px);max-width:760px;margin:0 auto}
#teach .qbox .qt{font-size:clamp(1.1em,2vw,1.35em);font-weight:700;line-height:1.55;margin:.3em 0 .2em;color:#0f172a}
#teach .qbox .tip{color:#64748b;font-size:.9em;margin-bottom:12px}
#teach .qbox .opt{font-size:clamp(1em,1.6vw,1.1em)}
#teach .exp{background:#f0f9ff;border-radius:10px;padding:10px 14px;margin-top:10px;line-height:1.65}
#teach .big{font-size:clamp(2.4em,6vw,3.6em);font-weight:900;color:#0f2a44;text-align:center;margin:.2em 0}
#teach .muted{color:#64748b}
#teach .seg{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 14px}
#teach .seg button{border:1px solid #0f2a44;background:#fff;color:#0f2a44;border-radius:999px;padding:.35em .9em;cursor:pointer;font:inherit}
#teach .seg button.on{background:#0f2a44;color:#fff}
body.embed-quiz header,body.embed-quiz #timeline,body.embed-quiz .legend,body.embed-quiz .watermark,body.embed-quiz #side,body.embed-quiz #sideOpen,body.embed-quiz #tools,body.embed-quiz #dataBtn,body.embed-quiz #home{display:none!important}
body.embed-quiz #teach{background:#f6f8fb;padding:0}
body.embed-quiz #teach .tbox{width:100%;height:100%;border-radius:0;box-shadow:none}
body.embed-quiz #teach .tabs,body.embed-quiz #teach .tclose{display:none}
@media (orientation:landscape) and (max-height:500px){#teach{padding:0}#teach .tbox{height:100%;border-radius:0}#teach .thead{padding:6px 12px}#teach .tbody{padding:10px 14px}}
@media (prefers-reduced-motion:reduce){#teach *{transition:none!important}}
`;

export function mountTeach(hooks) {
  const T = window.SHAPAN_TEACH || { tasks: [] }, D = window.SHAPAN_DATA, STG = window.SHAPAN_STAGES || [];
  const bank = buildBank();
  const embedded = window.parent !== window;
  const post = (type, value, extra) => { if (embedded) try { window.parent.postMessage(Object.assign({ type, value }, extra || {}), '*'); } catch (e) {} };
  const root = document.createElement('div'); root.id = 'teach'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', '学习中心');
  root.innerHTML = `<div class="tbox"><div class="thead"><h2>🎓 学习中心</h2><div class="tabs"><button class="tab" data-t="tasks">任务卡</button><button class="tab" data-t="prog">学习进度</button><button class="tab" data-t="quiz">退场小测</button></div><button class="tclose" aria-label="关闭">×</button></div><div class="tbody"></div></div>`;
  document.body.appendChild(root);
  const body = root.querySelector('.tbody');
  let tab = 'tasks';
  const tasksState = () => LS.get('shapan.tasks', {});
  const saveTask = (id, patch) => { const s = tasksState(); s[id] = Object.assign({}, s[id], patch, { t: Date.now() }); LS.set('shapan.tasks', s); };

  function open(t) { document.body.classList.add('teach-open'); show(t || tab); }
  function close() { document.body.classList.remove('teach-open'); }
  root.querySelector('.tclose').onclick = close;
  root.addEventListener('click', e => { if (e.target === root) close(); });
  root.querySelectorAll('.tab').forEach(b => b.onclick = () => show(b.dataset.t));
  function show(t) { tab = t; root.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.t === t)); body.scrollTop = 0; ({ tasks: renderTasks, prog: renderProg, quiz: renderQuizHome })[t](); }

  // ---------- 任务卡 ----------
  const stageName = id => id === 'LAB' ? '实验室沙盘现状' : (STG.find(s => s.id === id) || {}).name || id;
  function renderTasks() {
    const st = tasksState();
    body.innerHTML = `<p class="muted" style="margin:0 0 12px">每张任务卡都能一键跳到沙盘里对应的阶段、点位和场景演示。写好的答案保存在本机浏览器。</p><div class="cards">${T.tasks.map(t => `<button class="card" data-id="${t.id}"><div class="meta"><span class="pill">${esc(stageName(t.stage))}</span><span class="pill lv">${t.level} · 约 ${t.mins} 分钟</span>${st[t.id] && st[t.id].done ? '<span class="pill done">✓ 已完成</span>' : ''}</div><h3>${esc(t.title)}</h3><p>${esc(t.goal)}</p></button>`).join('')}</div>`;
    body.querySelectorAll('.card').forEach(c => c.onclick = () => renderTask(c.dataset.id));
  }
  function act(a) {
    if (!a) return; close();
    if (a.type === 'stage') hooks.setStage(a.id);
    else if (a.type === 'point') hooks.openPoint(a.id);
    else if (a.type === 'scen') hooks.playScenario(a.id);
    else if (a.type === 'proc') hooks.playProcess(a.id);
    else if (a.type === 'dash') hooks.openDash(a.id);
  }
  function renderTask(id) {
    const t = T.tasks.find(x => x.id === id), st = tasksState()[id] || {};
    const sub = t.submit;
    let subHtml = '';
    if (sub.type === 'text') subHtml = `<textarea id="tAns" placeholder="${esc(sub.prompt)}">${esc(st.text || '')}</textarea>`;
    if (sub.type === 'pick') subHtml = `<div class="opts">${sub.options.map((o, i) => `<button class="opt${st.pick === i ? (i === sub.answer ? ' ok' : ' bad') : ''}" data-i="${i}">${String.fromCharCode(65 + i)}. ${esc(o)}</button>`).join('')}</div><p class="msg" id="tMsg"></p>${sub.followup ? `<h4 style="margin-top:12px">${esc(sub.followup)}</h4><textarea id="tAns">${esc(st.text || '')}</textarea>` : ''}`;
    if (sub.type === 'order') subHtml = `<p class="muted" style="margin:0 0 6px">点击待选工序加入顺序；点已排的工序可以退回。</p><div class="seq" id="tSeq"></div><div class="pool" id="tPool"></div><p class="msg" id="tMsg"></p>`;
    body.innerHTML = `<div class="task"><button class="back">‹ 返回任务卡</button><div class="meta"><span class="pill">${esc(stageName(t.stage))}</span><span class="pill lv">${t.level} · 约 ${t.mins} 分钟</span></div><h3>${esc(t.title)}</h3><p class="goal">${esc(t.goal)}</p>
      <ol class="steps">${t.steps.map((s, i) => `<li><b>${i + 1}</b><span>${esc(s.text)}</span><button class="go" data-i="${i}">前往 ›</button></li>`).join('')}</ol>
      <div class="sub"><h4>✍ ${esc(sub.prompt)}</h4>${subHtml}</div>
      <div class="sub rub"><h4>自查清单</h4>${t.rubric.map((r, i) => `<label><input type="checkbox" data-i="${i}" ${(st.rub || [])[i] ? 'checked' : ''}> <span>${esc(r)}</span></label>`).join('')}
      <div class="ref${st.showRef ? ' show' : ''}" id="tRef">${esc(t.ref)}</div>
      <div class="row"><button class="btnp" id="tSave">保存并标记完成</button><button class="btnp alt" id="tRefBtn">${st.showRef ? '收起参考答案' : '看参考答案'}</button><span class="msg ok" id="tSaved"></span></div></div></div>`;
    body.querySelector('.back').onclick = renderTasks;
    body.querySelectorAll('.go').forEach(b => b.onclick = () => act(t.steps[+b.dataset.i].act));
    body.querySelectorAll('.rub input').forEach(c => c.onchange = () => saveTask(id, { rub: [...body.querySelectorAll('.rub input')].map(x => x.checked) }));
    body.querySelector('#tRefBtn').onclick = () => { const r = body.querySelector('#tRef'); r.classList.toggle('show'); saveTask(id, { showRef: r.classList.contains('show') }); body.querySelector('#tRefBtn').textContent = r.classList.contains('show') ? '收起参考答案' : '看参考答案'; };
    const ta = body.querySelector('#tAns'); if (ta) ta.oninput = () => saveTask(id, { text: ta.value });
    if (sub.type === 'pick') body.querySelectorAll('.opt').forEach(b => b.onclick = () => { const i = +b.dataset.i; body.querySelectorAll('.opt').forEach(x => x.className = 'opt'); b.classList.add(i === sub.answer ? 'ok' : 'bad'); const m = body.querySelector('#tMsg'); m.className = 'msg ' + (i === sub.answer ? 'ok' : 'bad'); m.textContent = i === sub.answer ? '答对了！' : '再看看大屏上的数据。'; saveTask(id, { pick: i, correct: i === sub.answer }); });
    if (sub.type === 'order') {
      let seq = (st.seq || []).slice(); const pool0 = shuffle(sub.answer);
      const draw = (checked) => {
        const left = pool0.filter(x => !seq.includes(x));
        body.querySelector('#tSeq').innerHTML = seq.map((x, i) => `<button class="chipq${checked ? (x === sub.answer[i] ? ' ok' : ' bad') : ''}" data-x="${esc(x)}"><i>${i + 1}</i>${esc(x)}</button>`).join('') || '<span class="muted">（在这里排顺序）</span>';
        body.querySelector('#tPool').innerHTML = left.map(x => `<button class="chipq" data-x="${esc(x)}">${esc(x)}</button>`).join('');
        body.querySelectorAll('#tPool .chipq').forEach(b => b.onclick = () => { seq.push(b.dataset.x); saveTask(id, { seq }); draw(seq.length === sub.answer.length); if (seq.length === sub.answer.length) judge(); });
        body.querySelectorAll('#tSeq .chipq').forEach(b => b.onclick = () => { seq = seq.filter(x => x !== b.dataset.x); saveTask(id, { seq }); body.querySelector('#tMsg').textContent = ''; draw(false); });
      };
      const judge = () => { const n = seq.filter((x, i) => x === sub.answer[i]).length, ok = n === sub.answer.length; const m = body.querySelector('#tMsg'); m.className = 'msg ' + (ok ? 'ok' : 'bad'); m.textContent = ok ? '顺序完全正确！' : `有 ${sub.answer.length - n} 项位置不对（标红），点它退回再排。`; saveTask(id, { correct: ok }); };
      draw(seq.length === sub.answer.length); if (seq.length === sub.answer.length) judge();
    }
    body.querySelector('#tSave').onclick = () => { if (ta) saveTask(id, { text: ta.value }); saveTask(id, { done: true }); body.querySelector('#tSaved').textContent = '✓ 已保存'; };
  }

  // ---------- 学习进度 ----------
  function renderProg() {
    const learned = new Set(LS.get('shapan.learned', [])), quiz = LS.get('shapan.quiz', {}), tasks = tasksState(), visited = LS.get('shapan.visited', []), hist = LS.get('shapan.exam', []), me = LS.get('shapan.student', {});
    const cats = {}; D.points.forEach(p => { const c = cats[p.cat] = cats[p.cat] || { n: 0, d: 0 }; c.n++; if (learned.has(p.id)) c.d++; });
    const catName = { site: '智慧工地', green: '绿色施工', prefab: '装配式', safe: '安全教育', edu: '安全教育' };
    const opsN = (D.opsPoints || []).length, opsD = (D.opsPoints || []).filter(p => learned.has(p.id)).length;
    const qk = Object.keys(quiz), qok = qk.filter(k => quiz[k]).length;
    const tDone = T.tasks.filter(t => tasks[t.id] && tasks[t.id].done).length;
    const best = hist.reduce((m, h) => Math.max(m, h.score), 0);
    const ptN = D.points.filter(p => learned.has(p.id)).length;
    const stat = (n, l, pct) => `<div class="stat"><div class="n">${n}</div><div class="l">${l}</div>${pct != null ? `<div class="bar"><i style="width:${Math.round(pct * 100)}%"></i></div>` : ''}</div>`;
    body.innerHTML = `<div class="field"><input id="sName" placeholder="姓名" value="${esc(me.name || '')}"><input id="sNo" placeholder="学号" value="${esc(me.no || '')}"><input id="sCls" placeholder="班级" value="${esc(me.cls || '')}"></div>
      <div class="stats">${stat(`${ptN}/${D.points.length}`, '智慧工地点位已学', ptN / D.points.length)}${stat(`${opsD}/${opsN}`, '运维点位已学', opsN ? opsD / opsN : 0)}${stat(`${qk.length}/${Object.keys(window.SHAPAN_SCENARIOS || {}).length}`, `场景演示已答（答对 ${qok}）`, qk.length / Math.max(1, Object.keys(window.SHAPAN_SCENARIOS || {}).length))}${stat(`${tDone}/${T.tasks.length}`, '任务卡已完成', tDone / T.tasks.length)}${stat(`${visited.length}/8`, '已浏览的阶段', visited.length / 8)}${stat(hist.length ? best : '—', `退场小测最高分（共 ${hist.length} 次）`, hist.length ? best / 100 : 0)}</div>
      <h4 style="margin:0 0 8px;color:#0f4c75">分类进度</h4>
      <table><tr><th>类别</th><th>已学 / 总数</th></tr>${Object.entries(cats).map(([c, v]) => `<tr><td>${catName[c] || c}</td><td>${v.d} / ${v.n}</td></tr>`).join('')}<tr><td>建筑智能运维</td><td>${opsD} / ${opsN}</td></tr></table>
      <h4 style="margin:16px 0 8px;color:#0f4c75">任务卡</h4>
      <table><tr><th>任务</th><th>状态</th></tr>${T.tasks.map(t => { const s = tasks[t.id] || {}; return `<tr><td>${esc(t.title)}</td><td>${s.done ? '✓ 已完成' : s.t ? '进行中' : '未开始'}${s.correct === true ? ' · 判断正确' : s.correct === false ? ' · 判断有误' : ''}</td></tr>`; }).join('')}</table>
      ${hist.length ? `<h4 style="margin:16px 0 8px;color:#0f4c75">退场小测记录</h4><table><tr><th>时间</th><th>得分</th><th>答对</th></tr>${hist.slice(-8).reverse().map(h => `<tr><td>${new Date(h.t).toLocaleString('zh-CN', { hour12: false })}</td><td>${h.score}</td><td>${h.right}/${h.n}</td></tr>`).join('')}</table>` : ''}
      <div class="row"><button class="btnp" id="expRec">导出学习记录（JSON）</button><button class="btnp alt" id="clrRec">清空全部学习记录</button></div>`;
    const saveMe = () => LS.set('shapan.student', { name: body.querySelector('#sName').value.trim(), no: body.querySelector('#sNo').value.trim(), cls: body.querySelector('#sCls').value.trim() });
    body.querySelectorAll('.field input').forEach(i => i.oninput = saveMe);
    body.querySelector('#expRec').onclick = () => { saveMe(); download(`学习记录-${(LS.get('shapan.student', {}).name || '未署名')}.json`, { system: '工程沙盘虚拟仿真系统', school: '安徽工业大学 · 建筑工程学院', exported: new Date().toISOString(), student: LS.get('shapan.student', {}), learnedPoints: [...learned], scenarioQuiz: quiz, tasks, visitedStages: visited, exitQuiz: hist }); };
    body.querySelector('#clrRec').onclick = () => { if (!confirm('确定清空本机的全部学习记录？')) return; ['shapan.learned', 'shapan.quiz', 'shapan.tasks', 'shapan.visited', 'shapan.exam'].forEach(k => localStorage.removeItem(k)); hooks.onReset && hooks.onReset(); renderProg(); };
  }

  // ---------- 退场小测 ----------
  let scope = '全部', N = 5;
  function renderQuizHome() {
    const cnt = s => bank.filter(q => s === '全部' || q.cat === s).length;
    body.innerHTML = `<div class="qbox"><h3 style="margin:0 0 6px;color:#0f2a44">退场小测</h3><p class="muted" style="margin:0">从题库随机抽题，每题 ${Math.round(100 / N)} 分，满分 100。题库共 ${bank.length} 题，来自 ${Object.keys(window.SHAPAN_SCENARIOS || {}).length} 个场景演示和主体结构、绿色建筑、规范补充题。</p>
      <div class="seg" id="qScope">${['全部', '施工', '运维'].map(s => `<button class="${s === scope ? 'on' : ''}" data-s="${s}">${s}（${cnt(s)}）</button>`).join('')}</div>
      <div class="seg" id="qN">${[3, 4, 5].map(n => `<button class="${n === N ? 'on' : ''}" data-n="${n}">${n} 题</button>`).join('')}</div>
      <div class="row"><button class="btnp gold" id="qStart">开始小测</button><button class="btnp alt" id="qExport">导出题库 JSON（双人对战平台格式）</button></div>
      <p class="muted small" style="margin-top:14px;line-height:1.6">在双人对战平台里用：选「网址接入」，填本系统地址并加 <b>?quiz=1</b>（例如 index.html?quiz=1&amp;n=5），打开「单人游戏转分屏对战」，两人各答一份；答题过程会自动把分数和完成状态同步给平台。</p></div>`;
    body.querySelectorAll('#qScope button').forEach(b => b.onclick = () => { scope = b.dataset.s; renderQuizHome(); });
    body.querySelectorAll('#qN button').forEach(b => b.onclick = () => { N = +b.dataset.n; renderQuizHome(); });
    body.querySelector('#qStart').onclick = () => startQuiz();
    body.querySelector('#qExport').onclick = exportBank;
  }
  function exportBank() {
    download('工程沙盘-题库.json', { name: '工程沙盘虚拟仿真 · 智慧工地与建筑智能运维题库', school: '安徽工业大学 · 建筑工程学院', format: '与双人对战平台内置题库字段一致：q 题干，tip 提示，opts 选项，ans 正确选项下标（从 0 开始）；explain、cat、point 为扩展字段', count: bank.length, questions: bank.map(({ id, q, tip, opts, ans, explain, cat, point }) => ({ id, q, tip, opts, ans, explain, cat, point })) });
  }
  function startQuiz() {
    const pool = bank.filter(q => scope === '全部' || q.cat === scope);
    const qs = shuffle(pool).slice(0, N).map(q => { const order = shuffle(q.opts.map((_, i) => i)); return Object.assign({}, q, { opts: order.map(i => q.opts[i]), ans: order.indexOf(q.ans) }); });
    const per = Math.round(100 / qs.length); let i = 0, score = 0, right = 0; const log = [];
    post('score', 0); post('progress', 0, { current: 0, total: qs.length });
    const draw = () => {
      const q = qs[i];
      body.innerHTML = `<div class="qbox"><div class="meta"><span class="pill">第 ${i + 1} / ${qs.length} 题</span><span class="pill lv">得分 ${score}</span></div><div class="qt">${esc(q.q)}</div><div class="tip">${esc(q.tip)}</div><div class="opts">${q.opts.map((o, k) => `<button class="opt" data-k="${k}">${String.fromCharCode(65 + k)}. ${esc(o)}</button>`).join('')}</div><div id="qExp"></div></div>`;
      body.querySelectorAll('.opt').forEach(b => b.onclick = () => {
        if (body.querySelector('.opt.ok')) return;
        const k = +b.dataset.k, ok = k === q.ans;
        body.querySelectorAll('.opt')[q.ans].classList.add('ok'); if (!ok) b.classList.add('bad');
        if (ok) { score += per; right++; } score = Math.min(100, score);
        log.push({ id: q.id, ok });
        post('score', score); post('progress', i + 1, { current: i + 1, total: qs.length });
        body.querySelector('#qExp').innerHTML = `<div class="exp"><b>${ok ? '✓ 答对了' : '✗ 答错了'}</b>　${esc(q.explain || '')}</div><div class="row"><button class="btnp" id="qNext">${i + 1 < qs.length ? '下一题 ›' : '看成绩'}</button></div>`;
        body.querySelector('#qNext').onclick = () => { i++; i < qs.length ? draw() : finish(); };
      });
    };
    const finish = () => {
      if (right === qs.length) score = 100;
      const hist = LS.get('shapan.exam', []); hist.push({ t: Date.now(), score, right, n: qs.length, scope, log }); LS.set('shapan.exam', hist.slice(-50));
      post('done', score);
      const wrong = log.filter(x => !x.ok).map(x => qs.find(q => q.id === x.id));
      body.innerHTML = `<div class="qbox"><p class="muted" style="text-align:center;margin:0">退场小测完成</p><div class="big">${score}</div><p style="text-align:center;margin:0 0 12px">答对 ${right} / ${qs.length} 题</p>
        ${wrong.length ? `<h4 style="color:#0f4c75">需要复习</h4>${wrong.map(q => `<div class="exp"><b>${esc(q.q)}</b><br>正确答案：${esc(q.opts[q.ans])}<br>${esc(q.explain || '')}${q.point ? `<div class="row" style="margin-top:6px"><button class="go" data-p="${q.point}">回到这个点位 ›</button></div>` : ''}</div>`).join('')}` : '<p style="text-align:center">全部答对，太棒了！</p>'}
        <div class="row" style="justify-content:center"><button class="btnp gold" id="qAgain">再测一次</button>${embedded ? '' : '<button class="btnp alt" id="qProg">看学习进度</button>'}</div></div>`;
      body.querySelector('#qAgain').onclick = () => startQuiz();
      const qp = body.querySelector('#qProg'); if (qp) qp.onclick = () => show('prog');
      body.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { close(); hooks.openPoint(b.dataset.p); });
    };
    draw();
  }

  function download(name, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  // 阶段浏览记录
  function visit(id) { const v = LS.get('shapan.visited', []); if (!v.includes(id)) { v.push(id); LS.set('shapan.visited', v); } }

  // 嵌入对战平台：?quiz=1 直接进入小测
  const qp = new URLSearchParams(location.search);
  if (qp.get('quiz')) {
    if (embedded || qp.get('embed')) document.body.classList.add('embed-quiz');
    const n = +qp.get('n'); if ([3, 4, 5].includes(n)) N = n;
    if (['施工', '运维'].includes(qp.get('scope'))) scope = qp.get('scope');
    document.body.classList.add('teach-open'); tab = 'quiz'; root.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.t === 'quiz'));
    if (embedded || qp.get('embed')) startQuiz(); else renderQuizHome();
  }
  return { open, close, visit, bank, exportBank };
}
