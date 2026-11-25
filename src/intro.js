// 新手引导：聚光灯 + 说明卡。每一步都要学生真的动手（拖、点），做到后自动进入下一步；
// 「跳过」一直可见，「下一步」可跳过当前这一步。引导期间做的一切，结束时由调用方清空。
export const INTRO_CSS = `
#intro{position:fixed;inset:0;z-index:90;pointer-events:none;display:none}
body.intro-on #intro{display:block}
#introSpot{position:fixed;border-radius:14px;border:3px solid #22d3ee;box-shadow:0 0 0 200vmax rgba(4,14,28,.55),0 0 22px rgba(34,211,238,.8);transition:left .3s,top .3s,width .3s,height .3s;pointer-events:none}
#introSpot.none{border-color:transparent;box-shadow:0 0 0 200vmax rgba(4,14,28,.55);width:0!important;height:0!important}
#introSpot.ok{border-color:#4ade80;box-shadow:0 0 0 200vmax rgba(4,14,28,.45),0 0 26px rgba(74,222,128,.9)}
#introCard{position:fixed;width:min(380px,calc(100vw - 16px));background:#fff;border-radius:16px;box-shadow:0 16px 40px rgba(0,0,0,.35);padding:14px 16px 12px;pointer-events:auto;color:#14212e;transition:top .25s,left .25s}
#introCard .ih{display:flex;align-items:center;gap:8px;margin-bottom:4px}
#introCard .ih b{font-size:1.12em;color:#0f2a44;flex:1}
#introCard .dots{display:flex;gap:4px}#introCard .dots i{width:7px;height:7px;border-radius:50%;background:#cbd5e1}#introCard .dots i.on{background:#0ea5e9}#introCard .dots i.done{background:#4ade80}
#introCard p{margin:.25em 0 .6em;line-height:1.6}
#introCard .ok{color:#15803d;font-weight:700;min-height:1.4em;margin:0 0 .4em}
#introCard .row{display:flex;gap:8px;justify-content:flex-end;align-items:center}
#introCard .row .t{margin-right:auto;font-size:.82em;color:#5d6b78}
#introCard button{border:1px solid #dfe5ea;background:#f6f8fa;border-radius:10px;padding:.45em .9em;min-height:40px;font:inherit;cursor:pointer;color:#14212e}
#introCard button.pri{background:#0ea5e9;border-color:#0ea5e9;color:#fff;font-weight:600}
#introSkip{position:fixed;top:calc(var(--hdr) + 10px);left:50%;transform:translateX(-50%);pointer-events:auto;border:0;background:#f59e0b;color:#1b1300;font:inherit;font-weight:700;border-radius:999px;padding:.45em 1.2em;min-height:40px;box-shadow:0 4px 14px rgba(0,0,0,.3);cursor:pointer;z-index:2}
@media (orientation:landscape) and (max-height:500px){#introCard{padding:8px 12px;width:min(340px,48vw)}#introCard p{margin:.1em 0 .3em;line-height:1.45}#introSkip{top:calc(var(--hdr) + 4px);min-height:32px;padding:.25em 1em}}
@media (prefers-reduced-motion:reduce){#introSpot,#introCard{transition:none}}
`;

export function makeIntro() {
  const root = document.createElement('div'); root.id = 'intro'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', '新手引导');
  root.innerHTML = `<div id="introSpot"></div><button id="introSkip" type="button">跳过引导 ✕</button><div id="introCard" aria-live="polite"><div class="ih"><b></b><span class="dots"></span></div><p class="txt"></p><p class="ok"></p><div class="row"><span class="t"></span><button type="button" class="nx">下一步 ›</button></div></div>`;
  document.body.appendChild(root);
  const spot = root.querySelector('#introSpot'), card = root.querySelector('#introCard');
  let steps = [], i = -1, raf = 0, unsub = null, onEnd = null, doneT = 0, running = false;

  function place() {
    if (!running) return;
    const s = steps[i]; const vw = innerWidth, vh = innerHeight;
    let r = s.target ? s.target() : null;
    if (r && r.getBoundingClientRect) { const b = r.getBoundingClientRect(); r = b.width || b.height ? { x: b.left, y: b.top, w: b.width, h: b.height } : null; }
    const pad = s.pad != null ? s.pad : 8;
    if (r) { spot.classList.remove('none'); Object.assign(spot.style, { left: r.x - pad + 'px', top: r.y - pad + 'px', width: r.w + pad * 2 + 'px', height: r.h + pad * 2 + 'px' }); }
    else spot.classList.add('none');
    const cw = card.offsetWidth, ch = card.offsetHeight, hdr = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr')) || 56;
    let top, left;
    if (!r) { top = (vh - ch) / 2; left = (vw - cw) / 2; }
    else {
      const below = r.y + r.h + pad + 12, above = r.y - pad - 12 - ch;
      if (below + ch < vh - 8) top = below; else if (above > hdr + 50) top = above;
      else { // 放在目标旁边
        top = Math.max(hdr + 54, Math.min(vh - ch - 8, r.y + r.h / 2 - ch / 2));
        left = r.x + r.w / 2 < vw / 2 ? Math.min(vw - cw - 8, r.x + r.w + pad + 12) : Math.max(8, r.x - pad - 12 - cw);
      }
      if (left == null) left = Math.max(8, Math.min(vw - cw - 8, r.x + r.w / 2 - cw / 2));
    }
    card.style.top = Math.max(8, top) + 'px'; card.style.left = left + 'px';
    raf = requestAnimationFrame(place);
  }
  function show(k) {
    if (unsub) { unsub(); unsub = null; }
    clearTimeout(doneT); i = k; const s = steps[i];
    if (!s) return finish(true);
    if (s.before) s.before();
    spot.classList.remove('ok');
    card.querySelector('.ih b').textContent = s.title;
    card.querySelector('.dots').innerHTML = steps.map((_, j) => `<i class="${j < i ? 'done' : j === i ? 'on' : ''}"></i>`).join('');
    card.querySelector('.txt').innerHTML = s.text;
    card.querySelector('.ok').textContent = '';
    card.querySelector('.t').textContent = `第 ${i + 1} / ${steps.length} 步${s.wait ? ' · 动手试一试' : ''}`;
    const nx = card.querySelector('.nx'); nx.textContent = s.last ? '开始学习 ›' : '下一步 ›'; nx.classList.toggle('pri', !!s.last);
    if (s.wait) unsub = s.wait(() => {
      if (unsub) { unsub(); unsub = null; }
      spot.classList.add('ok'); card.querySelector('.ok').textContent = s.okText || '✓ 做到了！';
      doneT = setTimeout(() => show(i + 1), 1300);
    });
  }
  function finish(completed) {
    if (!running) return;
    running = false; cancelAnimationFrame(raf); clearTimeout(doneT); if (unsub) { unsub(); unsub = null; }
    document.body.classList.remove('intro-on');
    const f = onEnd; onEnd = null; f && f(completed);
  }
  card.querySelector('.nx').onclick = () => show(i + 1);
  root.querySelector('#introSkip').onclick = () => finish(false);
  addEventListener('keydown', e => { if (running && e.key === 'Escape') finish(false); });
  return {
    start(list, end) { steps = list; onEnd = end; running = true; document.body.classList.add('intro-on'); show(0); cancelAnimationFrame(raf); place(); },
    stop: () => finish(false),
    get running() { return running; }
  };
}
