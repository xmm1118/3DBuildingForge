// 数据大屏（施工阶段 / 运维阶段），1920×1080 画布等比缩放；可嵌入仿真，也可单独全屏投屏
// 数据来源：window.SHAPAN_DASH（教学模拟数据）；配置 window.SHAPAN_API = { enabled:true, base:'https://…' } 后改为接口取数
const DASH = () => window.SHAPAN_DASH;
const STAGES = () => window.SHAPAN_STAGES || [];
const esc = s => String(s).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
const fmt = n => typeof n === 'number' ? n.toLocaleString('zh-CN') : n;

// ---------- 小图表（SVG） ----------
function line(data, w, h, { color = '#22d3ee', limit, limitLabel, labels } = {}) {
  const max = Math.max(...data, limit || 0) * 1.15 || 1, n = data.length;
  const X = i => 30 + i * (w - 40) / (n - 1), Y = v => h - 22 - v / max * (h - 34);
  const pts = data.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
    ${[0, .5, 1].map(k => `<line x1="30" x2="${w - 10}" y1="${Y(max / 1.15 * k)}" y2="${Y(max / 1.15 * k)}" stroke="#1e3a5f" />`).join('')}
    ${limit ? `<line x1="30" x2="${w - 10}" y1="${Y(limit)}" y2="${Y(limit)}" stroke="#f43f5e" stroke-dasharray="6 5"/><text x="${w - 12}" y="${Y(limit) - 6}" fill="#fb7185" font-size="15" text-anchor="end">${limitLabel || '限值 ' + limit}</text>` : ''}
    <polygon points="30,${h - 22} ${pts} ${X(n - 1)},${h - 22}" fill="${color}" opacity=".14"/>
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="3"/>
    ${(labels || []).map((l, i) => l ? `<text x="${X(i)}" y="${h - 4}" fill="#7aa3c7" font-size="14" text-anchor="middle">${l}</text>` : '').join('')}
  </svg>`;
}
function hbars(items, w, { color = '#38bdf8', unit = '', max, hi } = {}) {
  const m = max || Math.max(...items.map(x => x[1]), 1);
  return `<div class="hb">${items.map(([k, v], i) => `<div class="hbr${hi === i ? ' hi' : ''}"><span>${esc(k)}</span><b style="--w:${Math.max(2, v / m * 100)}%;--c:${hi === i ? '#f43f5e' : color}"></b><em>${fmt(v)}${unit}</em></div>`).join('')}</div>`;
}
function donut(items, size = 200) {
  const cols = ['#22d3ee', '#a78bfa', '#34d399', '#fbbf24', '#fb7185'];
  const tot = items.reduce((a, b) => a + b[1], 0); let acc = 0; const r = size / 2 - 18, c = 2 * Math.PI * r;
  return `<div class="donut"><svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><g transform="rotate(-90 ${size / 2} ${size / 2})">${items.map(([k, v], i) => { const len = v / tot * c; const s = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${cols[i % 5]}" stroke-width="26" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-acc}"/>`; acc += len; return s; }).join('')}</g></svg>
    <ul>${items.map(([k, v], i) => `<li><i style="background:${cols[i % 5]}"></i>${esc(k)}<b>${v}%</b></li>`).join('')}</ul></div>`;
}
function gauge(v, max, label, unit, warn) {
  const k = Math.min(v / max, 1), a = Math.PI * (1 - k), r = 62, cx = 80, cy = 78;
  const col = warn && v > warn ? '#f43f5e' : (warn && v > warn * .85 ? '#fbbf24' : '#22d3ee');
  return `<div class="gauge"><svg viewBox="0 0 160 96" width="160" height="96"><path d="M18 78 A62 62 0 0 1 142 78" fill="none" stroke="#1e3a5f" stroke-width="12" stroke-linecap="round"/>
    <path d="M18 78 A62 62 0 0 1 ${(cx + r * Math.cos(a)).toFixed(1)} ${(cy - r * Math.sin(a)).toFixed(1)}" fill="none" stroke="${col}" stroke-width="12" stroke-linecap="round"/>
    <text x="80" y="72" fill="#fff" font-size="28" font-weight="700" text-anchor="middle">${v}</text></svg><div>${label}<small>${unit}${warn ? ' · 限值 ' + warn : ''}</small></div></div>`;
}
const bar = (v, warn, limit) => { const p = Math.min(v / limit * 100, 100); const c = v >= limit ? '#f43f5e' : v >= warn ? '#fbbf24' : '#22d3ee'; return `<div class="pbar"><i style="width:${p}%;background:${c}"></i>${warn <= limit ? `<s style="left:${warn / limit * 100}%"></s>` : ''}</div>`; };
// 模块 → 沙盘定位（p:点位 / s:阶段 / k:大屏页）与关联点位（教学联动高亮）
const LOC = [
  ['人员在场', 'p:realname', 'realname ai-attend person-loc patrol'], ['环境监测', 'p:env', 'env cover vehicle sewage streetlight'], ['AI 视频', 'p:video-ai', 'video-ai smoke helmet'],
  ['进度、构件', 'p:prefab-lift', 'prefab-lift slab-lift stair-lift grout yijian unload rebar-ai quality weigh prefab-show'], ['塔吊运行', 'p:crane1', 'crane1 crane2 jiguan'], ['施工升降机', 'p:hoist', 'hoist'],
  ['基坑监测', 'p:pit-monitor', 'pit-monitor'], ['能耗总览', 'p:energy', 'energy carbon'], ['分项能耗', 'p:energy', 'energy'], ['各楼层今日能耗', 'p:energy', 'energy ienv'], ['停车', 'p:parking', 'parking'],
  ['楼层环境', 'p:ienv', 'ienv hvac'], ['今日逐时用电', 'p:energy', 'energy'], ['设备状态', 'p:hvac', 'hvac elevator water'], ['工单', 'p:workorder', 'workorder'], ['安防与消防', 'p:fire', 'fire access'],
  ['屋顶光伏', 'p:pv', 'pv'], ['充电桩', 'p:ev', 'ev'], ['地源热泵', 'p:gshp', 'gshp'], ['绿色建筑评价', 's:S6', ''], ['运行碳排放', 'k:lca', 'carbon pv'], ['雨水回收', 'p:rainwater', 'rainwater sponge green-roof'],
  ['垃圾分类', 'p:waste', 'waste'], ['室外环境', 'p:sponge', 'sponge green-roof'], ['施工阶段碳排放', 'k:lca', ''], ['主要建材', 's:S3', 'prefab-show prefab-lift'], ['减碳措施', 's:S6', 'pv gshp waste'],
  ['水电与碳', 'p:water-elec', 'water-elec'], ['拆除结构监测', 'p:dm-safety', 'dm-safety dm-sort dm-crush dm-reuse'], ['本阶段绿色要点', 'k:lca', 'gc-recycle gc-earth gc-formwork gc-pv-camp pl-sun pl-wind pl-rain pl-tree pl-zone dm-sort dm-crush dm-reuse']
];
const card = (title, body, cls = '', loc) => { const m = LOC.find(x => String(title).startsWith(x[0])); const l = loc || (m && m[1]) || ''; const pts = (m && m[2]) || (l.startsWith('p:') ? l.slice(2) : '');
  return `<section class="dc ${cls}"${l ? ` data-loc="${l}"` : ''}${pts ? ` data-pts=" ${pts} "` : ''}><h4>${title}${l ? `<i class="loc">${l.startsWith('k:') ? '详情 ›' : '⌖ 定位'}</i>` : ''}</h4>${body}</section>`; };
const lvl = l => l === '高' ? 'hi' : l === '中' ? 'mid' : 'lo';

// ---------- 场地缩略图（告警可点） ----------
function siteMap(points, alarmPts, w = 780, h = 420, done) {
  const zones = ((window.SHAPAN_DATA && window.SHAPAN_DATA.zones) || []).filter(z => !done || !['pit', 'yard', 'edu', 'live'].includes(z.id) && !['pit', 'yard', 'edu', 'live'].includes(z.type));
  const sx = x => (x + 40) / 80 * w, sz = z => (z + 28) / 56 * h;
  const fill = { road: '#16324f', bld: '#2563eb', pit: '#7c5a3a', yard: '#1f4e3d', edu: '#5b3b7a', live: '#24435f' };
  const P = Object.fromEntries((window.SHAPAN_DATA.points || []).concat(window.SHAPAN_DATA.opsPoints || []).map(p => [p.id, p]));
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" class="map">
    <rect x="0" y="0" width="${w}" height="${h}" rx="10" fill="#0b2036" stroke="#1e3a5f"/>
    ${zones.map(z => { const [x1, z1, x2, z2] = z.rect; return `<rect x="${sx(x1)}" y="${sz(z1)}" width="${sx(x2) - sx(x1)}" height="${sz(z2) - sz(z1)}" rx="4" fill="${fill[z.type] || '#1b3550'}" opacity=".85"/>` + (['bldA', 'bldB', 'pit'].includes(z.id) ? `<text x="${(sx(x1) + sx(x2)) / 2}" y="${(sz(z1) + sz(z2)) / 2 + 6}" fill="#dbeafe" font-size="17" text-anchor="middle">${{ bldA: '1#楼', bldB: '2#楼', pit: '基坑' }[z.id]}</text>` : ''); }).join('')}
    ${points.map(id => P[id]).filter(Boolean).map(p => `<circle cx="${sx(p.pos[0])}" cy="${sz(p.pos[2])}" r="6" fill="#38bdf8" stroke="#fff" stroke-width="1.5"/>`).join('')}
    ${alarmPts.map(id => P[id]).filter(Boolean).map(p => `<g class="mapAlarm" data-point="${p.id}"><circle cx="${sx(p.pos[0])}" cy="${sz(p.pos[2])}" r="16" fill="#f43f5e" opacity=".35"><animate attributeName="r" values="10;22;10" dur="1.6s" repeatCount="indefinite"/></circle><circle cx="${sx(p.pos[0])}" cy="${sz(p.pos[2])}" r="8" fill="#f43f5e" stroke="#fff" stroke-width="2"/></g>`).join('')}
  </svg>`;
}

// ---------- 两套大屏 ----------
function construction(d, stage) {
  const p = d.people, e = d.env;
  const tl = Array.from({ length: 24 }, (_, i) => i % 6 === 0 ? i + '时' : '');
  const left = card('人员在场与考勤', p.onsite ? `<div class="kpis"><div><b>${p.onsite}</b><span>在场人数</span></div><div><b>${p.attendRate}%</b><span>出勤率</span></div><div><b class="warnc">${p.noHelmetToday}</b><span>今日未戴安全帽</span></div></div>${`<div data-point="realname">${hbars(p.trades.slice().sort((a, b) => b[1] - a[1]).slice(0, 6), 440, { unit: ' 人' })}</div>`}<div class="sub">近 7 天在场人数</div>${line(p.trend7, 460, 84, { labels: ['一', '二', '三', '四', '五', '六', '今'] })}` : '<p class="empty">工程已竣工，劳务人员已退场</p>')
    + card('环境监测 · 扬尘喷淋联动', `<div class="gauges" data-point="env">${gauge(e.pm25, 150, 'PM2.5', 'μg/m³')}${gauge(e.pm10, 200, 'PM10', 'μg/m³', e.limitPm10)}${gauge(e.noise, 100, '噪声', 'dB(A)', e.limitNoiseDay)}</div>
      <div class="sub">PM10 24 小时变化 · 喷淋 <b class="${e.spray ? 'warnc' : 'okc'}">${e.spray ? '已联动开启' : '待机'}</b></div>${line(e.trend24, 460, 96, { color: '#a3e635', limit: e.limitPm10, limitLabel: '示意限值 ' + e.limitPm10, labels: tl })}`)
    + card('AI 视频识别（今日）', `<div class="kpis five">${[['未戴安全帽', d.ai.helmet], ['未穿反光衣', d.ai.vest], ['区域入侵', d.ai.intrude], ['烟雾', d.ai.smoke], ['明火', d.ai.fire]].map(([k, v]) => `<div data-point="${k === '烟雾' || k === '明火' ? 'smoke' : 'video-ai'}"><b class="${v ? 'warnc' : ''}">${v}</b><span>${k}</span></div>`).join('')}</div>`);
  const alarmPts = d.alarms.map(a => a.point);
  const center = `<section class="dc stagec" data-loc="s:${stage.id}" data-pts=" ${(stage.points || []).join(' ')} "><div class="stageh"><span>${esc(stage.month)}</span><b>${esc(stage.name)}</b><i class="loc">⌖ 切换模型</i></div><ol>${stage.process.slice(0, 6).map((x, i) => `<li class="rowc" data-loc="q:${stage.id},${i}">${esc(x)}</li>`).join('')}</ol>${greenKpi(stage)}${buildCarbon(stage.id)}</section>`
    + card('现场点位与告警（点击红点可在沙盘中定位）', siteMap(stage.points || [], alarmPts), 'mapc')
    + card('进度、构件吊装与质量安全巡检', `<div class="prog2"><div class="rowc" data-loc="t:BLD-A"><span>1# 楼（装配式）</span>${bar(d.progress.bldA, 101, 100)}<b>${d.progress.bldA}%</b></div><div class="rowc" data-loc="t:BLD-B"><span>2# 楼（现浇）</span>${bar(d.progress.bldB, 101, 100)}<b>${d.progress.bldB}%</b></div></div>
      <div class="kpis seven">${d.progress.lifts.map(([k, v]) => `<div data-point="${/梯/.test(k) ? 'stair-lift' : /板/.test(k) && !/墙/.test(k) ? 'slab-lift' : 'prefab-lift'}"><b>${v}</b><span>${k}（件）</span></div>`).join('')}<div><b>${d.inspect.issues}</b><span>本周巡检问题</span></div><div><b>${d.inspect.rectified}</b><span>已整改</span></div><div><b>${d.inspect.issues ? Math.round(d.inspect.rectified / d.inspect.issues * 100) : 100}%</b><span>整改率</span></div></div>`);
  const cr = d.cranes.length ? d.cranes.map(c => `<div class="crane ${c.status === '预警' ? 'warnb' : ''}" data-point="${c.id}"><h5>${c.name}<em>${c.status}</em></h5>
      <div class="cr"><span>起重量</span>${bar(c.load, 80, 100)}<b>${c.load}%</b></div><div class="cr"><span>力矩</span>${bar(c.moment, 80, 100)}<b>${c.moment}%</b></div>
      <div class="crk"><span>风速 ${c.wind} m/s</span><span>回转 ${c.angle}°</span><span>幅度 ${c.radius} m</span></div></div>`).join('') : '<p class="empty">本阶段无塔吊</p>';
  const ho = d.hoist ? `<div class="kpis four" data-point="hoist"><div><b>${d.hoist.load}</b><span>载重 kg / ${d.hoist.rated}</span></div><div><b>${d.hoist.people}</b><span>人数 / ${d.hoist.ratedPeople}</span></div><div><b>${d.hoist.floor}F</b><span>所在楼层</span></div><div><b>${d.hoist.runsToday}</b><span>今日运行</span></div></div><div class="sub">防坠安全器：${d.hoist.antiFall}</div>` : '<p class="empty">本阶段无施工升降机</p>';
  const pit = d.pit ? d.pit.points.map(x => `<div class="pitr rowc"${/^[A-Z]+-\d/.test(x.name) ? ` data-loc="t:${x.name.split(' ')[0]}"` : ' data-point="pit-monitor"'}><span>${x.name}</span>${bar(x.value, x.warn, x.limit)}<b class="${x.value >= x.warn ? 'warnc' : ''}">${x.value}${x.unit}</b></div>`).join('') + '<div class="sub">进度条刻线 = 预警值，满格 = 控制值（示意）</div>' : '<p class="empty">基坑已回填 / 尚未开挖</p>';
  const right = card('塔吊运行监测', cr) + card('施工升降机', ho) + card(d.pitTitle || '基坑监测', pit)
    + card(`告警（${d.alarms.length}）`, `<ul class="alarms">${d.alarms.map(a => `<li class="${lvl(a.level)}" data-point="${a.point}"><time>${a.time}</time><em>${a.level}</em>${esc(a.text)}</li>`).join('') || '<li class="lo">无</li>'}</ul>`)
;
  return { left, center, right };
}
function ops(o) {
  const e = o.energy;
  const fl = e.floors.map((v, i) => [`${i + 1}F`, v]);
  const hi = e.floors.indexOf(Math.max(...e.floors));
  const left = card('能耗总览', `<div class="kpis"><div><b>${fmt(e.todayKwh)}</b><span>今日 kW·h</span></div><div><b>${fmt(e.monthKwh)}</b><span>本月 kW·h</span></div><div><b>${e.yearIntensity}</b><span>年能耗强度 kW·h/(m²·a)</span></div></div>
      <div class="sub">对照 GB/T 51161：约束值 ${e.limit}，引导值 ${e.guide}（示意）</div><div class="pbar big"><i style="width:${e.yearIntensity / e.limit * 100}%;background:${e.yearIntensity > e.limit ? '#f43f5e' : '#22d3ee'}"></i><s style="left:${e.guide / e.limit * 100}%"></s></div>`)
    + card('分项能耗占比', donut(e.split, 190))
    + card('各楼层今日能耗（kW·h）', hbars(fl, 440, { color: '#38bdf8', hi }))
    + card('停车', `<div class="kpis four"><div><b>${o.parking.total}</b><span>车位总数</span></div><div><b class="okc">${o.parking.free}</b><span>空余</span></div><div><b>${o.parking.inToday}</b><span>今日驶入</span></div><div><b>${o.parking.outToday}</b><span>今日驶出</span></div></div>`);
  const floors = o.comfort.slice().reverse().map(c => { const al = o.alarms.find(a => a.text.startsWith(c.floor + ' 层')); return `<div class="fl ${al ? 'bad' : ''}" data-point="${al ? al.point : ''}"><b>${c.floor}F</b><span>${c.temp}℃</span><span>${c.hum}%</span><span class="${c.co2 > 1000 ? 'warnc' : ''}">CO₂ ${c.co2}</span><em>${fmt(e.floors[c.floor - 1])} kW·h</em></div>`; }).join('');
  const center = `<section class="dc stagec"><div class="stageh"><span>${esc(o.building.name)} · ${o.building.floors} 层 · ${fmt(o.building.area)} m²</span><b>建筑智能运维</b></div><p class="sub">${esc(o.building.note)}；点击有告警的楼层可在沙盘中定位</p></section>`
    + card('楼层环境与能耗', `<div class="floors">${floors}</div>`, 'floorc')
    + card('今日逐时用电（kW）', line(e.trend24, 780, 170, { color: '#fbbf24', labels: Array.from({ length: 24 }, (_, i) => i % 3 === 0 ? i + '时' : '') }));
  const right = card('设备状态', `<table class="dt"><tr><th>系统</th><th>总数</th><th>运行</th><th>故障</th></tr>${o.devices.map(x => `<tr><td>${x.name}</td><td>${x.total}</td><td>${x.run}</td><td class="${x.fault ? 'warnc' : ''}">${x.fault}</td></tr>`).join('')}</table>`)
    + card(`告警（${o.alarms.length}）`, `<ul class="alarms">${o.alarms.map(a => `<li class="${lvl(a.level)}" data-point="${a.point}"><time>${a.time}</time><em>${a.level}</em>${esc(a.text)}</li>`).join('')}</ul>`)
    + card(`工单 · 待处理 ${o.orders.open} · 处理中 ${o.orders.doing} · 今日完成 ${o.orders.doneToday}`, `<ul class="alarms orders">${o.orders.list.map(w => `<li data-point="${w.point}"><time>${w.no}</time><em>${w.status}</em>${esc(w.text)}</li>`).join('')}</ul>`)
    + card('安防与消防', `<div class="kpis four"><div><b>${fmt(o.security.accessToday)}</b><span>今日通行</span></div><div><b class="${o.security.abnormalAccess ? 'warnc' : ''}">${o.security.abnormalAccess}</b><span>异常通行</span></div><div><b>${o.security.smokeOnline}</b><span>烟感在线</span></div><div><b>${o.security.fireTankLevel}%</b><span>消防水池</span></div></div><div class="sub">火灾报警主机：${o.security.fireHost} · 喷淋压力 ${o.security.sprinklerPressure} MPa · ${o.security.lastInspect}</div>`)
;
  return { left, center, right };
}

// ---------- 数字运维（6 个分页，行级定位） ----------
const OSUB = [['overview', '运维总览'], ['assets', '设备资产'], ['energy', '能源管理'], ['env', '环境与空间'], ['safety', '安全与应急'], ['service', '工单与服务']];
const PT2T = { ienv: 'VAV-7', fire: 'SMK-3', elevator: 'EL-2', water: 'FT', access: 'ACS-E', hvac: 'CT-1', energy: 'MTR-7', parking: 'PK-B1', workorder: 'FAS' };
const tl = (id) => id ? ` data-loc="t:${id}"` : '';
const hb2 = (items, w, o = {}) => { const m = o.max || Math.max(...items.map(x => x[1]), 1);
  return `<div class="hb">${items.map(([k, v, t], i) => `<div class="hbr${o.hi === i ? ' hi' : ''} rowc"${tl(t)}><span>${esc(k)}</span><b style="--w:${Math.max(2, v / m * 100)}%;--c:${o.hi === i ? '#f43f5e' : (o.color || '#38bdf8')}"></b><em>${fmt(v)}${o.unit || ''}</em></div>`).join('')}</div>`; };
const hbar = (v, good = 85, bad = 70) => `<span class="pbar sm"><i style="width:${v}%;background:${v < bad ? '#f43f5e' : v < good ? '#fbbf24' : '#22c55e'}"></i></span>`;
function phaseStrip(X, sub) {
  return `<section class="dc ophase"><div class="oph">${X.phases.map(p => `<div class="opp ${p.now ? 'on' : ''}" data-loc="${p.loc}" title="${esc(p.desc)}"><b>${esc(p.name)}</b><small>${esc(p.when)}</small><i style="width:${p.pct}%"></i></div>`).join('<span class="oparr">›</span>')}</div>
    <div class="osub">${OSUB.map(([k, n]) => `<button class="${k === sub ? 'on' : ''}" data-loc="u:${k}">${n}</button>`).join('')}<em>${esc(X.nowNote)}</em></div></section>`;
}
function bldSvg(X, hot) {
  const T = window.SHAPAN_TARGETS || [], w = 780, h = 300, fh = 22, top = 24, lx = 150, rx = 640;
  const yF = f => top + (11 - f) * fh, xD = dx => lx + (dx + 5.5) / 11 * (rx - lx), xU = x => 30 + (x - 16) / 7.5 * (w - 60);
  let s = `<svg viewBox="0 0 ${w} ${h}" class="bsvg">`;
  for (let f = 11; f >= 1; f--) s += `<g data-loc="t:${f === 11 ? 'ROOF' : 'F' + f}" class="bfl"><rect x="${lx}" y="${yF(f)}" width="${rx - lx}" height="${fh - 2}" rx="3" fill="${f === 11 ? '#1e3a5f' : hot.includes('F' + f) ? '#7f1d1d' : '#12304f'}"/><text x="${lx - 10}" y="${yF(f) + 15}" fill="#7dd3fc" font-size="14" text-anchor="end">${f === 11 ? '屋面' : f + 'F'}</text></g>`;
  const by = top + 11 * fh + 8; s += `<rect x="20" y="${by}" width="${w - 40}" height="34" rx="4" fill="#0f2740" stroke="#1e3a5f"/><text x="26" y="${by - 4}" fill="#7dd3fc" font-size="13">地下室（冷站 / 配电 / 泵房，示意）</text>`;
  T.filter(t => t.stage === 'S6' && t.kind !== 'floor' && t.id !== 'ROOF' && !/^MTR-/.test(t.id) && !(/^AHU-/.test(t.id) && t.id !== 'AHU-7')).forEach(t => {
    const x = t.ug ? xU(t.pos[0]) : xD(t.dx), y = t.ug ? by + 17 : yF(t.floor) + fh / 2 - 1; const bad = hot.includes(t.id);
    s += `<g data-loc="t:${t.id}" class="bdev"><title>${esc(t.name)}</title><circle cx="${x}" cy="${y}" r="${bad ? 8 : 6}" fill="${bad ? '#f43f5e' : '#38bdf8'}" stroke="#fff" stroke-width="1.5">${bad ? '<animate attributeName="r" values="6;10;6" dur="1.4s" repeatCount="indefinite"/>' : ''}</circle>${t.ug || bad ? `<text x="${x}" y="${y + (t.ug ? -10 : -10)}" fill="${bad ? '#fecdd3' : '#bae6fd'}" font-size="12" text-anchor="middle">${esc(t.id)}</text>` : ''}</g>`;
  });
  return s + '</svg>';
}
function opsPage(o, X, sub) {
  const e = o.energy, alarmT = a => a.t || PT2T[a.point] || '';
  const hot = o.alarms.map(alarmT).concat(['F7']);
  const alarms = card(`告警（${o.alarms.length}）· 点击定位到设备`, `<ul class="alarms">${o.alarms.map(a => `<li class="${lvl(a.level)} rowc"${tl(alarmT(a))}><time>${a.time}</time><em>${a.level}</em>${esc(a.text)}</li>`).join('')}</ul>`, '', 'p:workorder');
  const strip = phaseStrip(X, sub);
  let L = '', C = '', R = '';
  if (sub === 'overview') {
    L = card('运维健康指数', `<div class="hscore"><b>${X.health.score}</b><span>/ 100</span></div>${X.health.items.map(([k, v, l]) => `<div class="hrow" data-loc="${l}"><span>${k}</span>${hbar(v)}<b>${v}</b></div>`).join('')}`, '', 'u:assets')
      + card('能耗总览', `<div class="kpis"><div><b>${fmt(e.todayKwh)}</b><span>今日 kW·h</span></div><div><b>${fmt(e.monthKwh)}</b><span>本月 kW·h</span></div><div><b>${e.yearIntensity}</b><span>kW·h/(m²·a)</span></div></div><div class="sub">GB/T 51161 约束值 ${e.limit}、引导值 ${e.guide}（示意）</div><div class="pbar big"><i style="width:${e.yearIntensity / e.limit * 100}%;background:#22d3ee"></i><s style="left:${e.guide / e.limit * 100}%"></s></div>`, '', 'u:energy')
      + card('分项能耗占比', donut(e.split, 150), '', 'u:energy')
      + card('关键运维指标', `<div class="kpis four">${X.kpi.map(([k, v]) => `<div><b class="sm">${v}</b><span>${k}</span></div>`).join('')}</div>`, '', 'u:service');
    const floors = o.comfort.slice().reverse().map(c => { const bad = c.floor === 7; return `<div class="fl rowc ${bad ? 'bad' : ''}" data-loc="t:F${c.floor}"><b>${c.floor}F</b><span>${c.temp}℃</span><span>${c.hum}%</span><span class="${c.co2 > 1000 ? 'warnc' : ''}">CO₂ ${c.co2}</span><em>${fmt(e.floors[c.floor - 1])} kW·h</em></div>`; }).join('');
    C = strip + card('楼层环境与能耗 · 点击楼层，在沙盘中剖开并定位', `<div class="floors">${floors}</div>`, 'floorc', 'u:env');
    R = alarms + card(`工单 · 待处理 ${o.orders.open} · 处理中 ${o.orders.doing} · 今日完成 ${o.orders.doneToday}`, `<ul class="alarms orders">${X.orders.slice(0, 5).map(w => `<li class="rowc"${tl(w[5])}><time>${w[0]}</time><em>${w[3]}</em>${esc(w[1])}</li>`).join('')}</ul>`, '', 'u:service')
      + card('设备状态', `<table class="dt">${o.devices.map(x => `<tr><td>${x.name}</td><td>${x.run}/${x.total}</td><td class="${x.fault ? 'warnc' : ''}">故障 ${x.fault}</td></tr>`).join('')}</table>`, '', 'u:assets');
  } else if (sub === 'assets') {
    L = card('资产台账（按系统）', `<table class="dt"><tr><th>系统</th><th>台/套</th><th>原值(万)</th><th>健康度</th></tr>${X.assets.map(a => `<tr class="rowc"${tl(a.t)}><td>${a.sys}</td><td>${a.n}</td><td>${a.value}</td><td>${hbar(a.health)} ${a.health}</td></tr>`).join('')}</table>`, '', 'q:S5:4')
      + card('资产编码：BIM ↔ 台账 ↔ 二维码', `<ul class="cpt">${X.coding.map(x => `<li>${esc(x)}</li>`).join('')}</ul><div class="sub">示例设备：7F 空调机组，点击定位</div>`, '', 't:AHU-7');
    C = strip + card('设备分布（1# 楼剖面 · 红点为告警设备）', bldSvg(X, hot), '', 't:F7')
      + card('关键设备运行', `<table class="dt"><tr><th>设备</th><th>状态</th><th>说明</th><th>健康度</th><th>运行 h</th></tr>${X.keyDev.map(d => `<tr class="rowc"${tl(d[0])}><td>${d[1]}</td><td class="${d[2] === '告警' ? 'warnc' : ''}">${d[2]}</td><td>${esc(d[3])}</td><td>${hbar(d[4])} ${d[4]}</td><td>${fmt(d[5])}</td></tr>`).join('')}</table>`);
    R = card(`预防性维护 · 本月 ${X.ppm.done}/${X.ppm.plan} · 逾期 ${X.ppm.overdue}`, `<table class="dt">${X.ppm.list.map(p => `<tr class="rowc"${tl(p[1])}><td>${p[0]}</td><td>${p[2]}</td><td class="${p[3] === '逾期' ? 'warnc' : p[3] === '完成' ? 'okc' : ''}">${p[3]}</td></tr>`).join('')}</table>`)
      + card('寿命预测与更新计划', `<table class="dt">${X.life.map(l => `<tr class="rowc"${tl(l[2])}><td>${l[0]}</td><td>剩余约 ${l[1]}</td></tr>`).join('')}</table>`)
      + card('备品备件（库存 / 安全库存）', `<table class="dt">${X.spares.map(s => `<tr><td>${s[0]}</td><td class="${s[1] < s[2] ? 'warnc' : ''}">${s[1]} / ${s[2]}${s[1] < s[2] ? ' 需补货' : ''}</td></tr>`).join('')}</table>`);
  } else if (sub === 'energy') {
    L = card('分项能耗占比', donut(e.split, 170), '', 't:MTR-1')
      + card('峰谷电量占比（%）', hb2(X.peak.map(p => [p[0], p[1], 'TR-1']), 440, { unit: '%' }))
      + card('冷站能效', `<div class="kpis"><div><b>${X.cop.plant}</b><span>冷站 EER</span></div><div><b>${X.cop.chiller}</b><span>主机 COP</span></div><div><b>${X.cop.target}</b><span>目标值（示意）</span></div></div>${line(X.cop.trend, 460, 80, { color: '#34d399', labels: ['一', '二', '三', '四', '五', '六', '今'] })}`, '', 't:CH-1');
    const mx = Math.max(...X.heat.flat());
    const hm = `<div class="heat"><div class="hrow0"><span></span>${Array.from({ length: 24 }, (_, i) => `<i>${i % 3 ? '' : i}</i>`).join('')}</div>${X.heat.map((r, i) => i).reverse().map(i => `<div class="hr rowc" data-loc="t:MTR-${i + 1}"><span>${i + 1}F</span>${X.heat[i].map((v, h) => { const k = v / mx; const bad = i === 6 && (h >= 20 || h < 6); return `<i style="background:${bad ? '#e11d48' : `rgba(56,189,248,${(.12 + k * .88).toFixed(2)})`}" title="${i + 1}F ${h}:00 ${v} kW"></i>`; }).join('')}</div>`).join('')}</div>`;
    C = strip + card('分层逐时能耗热力图（kW）· 红色 = 夜间异常，点击楼层定位电表', hm, 'floorc')
      + card('今日逐时用电（kW）', line(e.trend24, 780, 120, { color: '#fbbf24', labels: Array.from({ length: 24 }, (_, i) => i % 3 === 0 ? i + '时' : '') }));
    R = card('节能诊断（自动规则）', `<ul class="alarms">${X.diag.map(d => `<li class="mid rowc"${tl(d[1])}><time>诊断</time><em>建议</em>${esc(d[0])}</li>`).join('')}</ul>`)
      + card(`用水 · 今日 ${X.water.today} m³ · 漏损率 ${X.water.leak}%`, hb2(X.water.zones, 440, { unit: ' m³', color: '#22d3ee' }))
      + card('运行碳排放', `<div class="sub">今日用电 ${fmt(e.todayKwh)} kW·h × 0.57 kgCO₂/kW·h（示意）≈ <b>${(e.todayKwh * .57 / 1000).toFixed(2)} t</b>，光伏抵扣见「绿色运维」</div>`, '', 'k:lca');
  } else if (sub === 'env') {
    L = card('室内环境（按楼层）', `<table class="dt"><tr><th>楼层</th><th>温度</th><th>湿度</th><th>CO₂</th><th>PM2.5</th></tr>${X.env.slice().reverse().map(c => `<tr class="rowc"${tl('F' + c.floor)}><td>${c.floor}F</td><td>${c.temp}℃</td><td>${c.hum}%</td><td class="${c.co2 > 1000 ? 'warnc' : ''}">${c.co2}</td><td>${c.pm25}</td></tr>`).join('')}</table><div class="sub">CO₂ 超 1000 ppm 联动加大新风（示意阈值）</div>`, '', 'p:ienv');
    C = strip + card('空间使用率（工位占用 %）· 7F 无人但空调未关', hb2(X.env.slice().reverse().map(c => [c.floor + 'F', c.occ, 'F' + c.floor]), 760, { unit: '%', hi: 3 }), 'floorc')
      + card('会议室与公共空间', `<table class="dt">${X.rooms.map(r => `<tr class="rowc"${tl(r[3])}><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</table>`);
    R = card(`电梯群控 · 今日 ${fmt(X.elevator.trips)} 次 · 平均候梯 ${X.elevator.waitAvg} s`, `<table class="dt">${X.elevator.cars.map(c => `<tr class="rowc"${tl(c[0])}><td>${c[0]}</td><td>${c[1]}F</td><td>${c[2]}</td></tr>`).join('')}</table><div class="sub">早高峰 ${X.elevator.peak}，按目的楼层分配轿厢</div>`, '', 'p:elevator')
      + card('新风与空调末端', `<table class="dt">${[7, 5, 3].map(f => `<tr class="rowc"${tl('AHU-' + f)}><td>AHU-${f}</td><td>${f === 7 ? '夜间未停' : '按时间表运行'}</td><td class="${f === 7 ? 'warnc' : 'okc'}">${f === 7 ? '告警' : '正常'}</td></tr>`).join('')}</table>`, '', 'p:hvac')
      + card('停车', `<div class="kpis four"><div><b>${o.parking.total}</b><span>车位</span></div><div><b class="okc">${o.parking.free}</b><span>空余</span></div><div><b>${o.parking.inToday}</b><span>驶入</span></div><div><b>${o.parking.outToday}</b><span>驶出</span></div></div>`, '', 'p:parking');
  } else if (sub === 'safety') {
    L = card(`门禁通行 · 今日 ${fmt(o.security.accessToday)}`, `<table class="dt"><tr><th>出入口</th><th>通行</th><th>异常</th></tr>${X.access.map(a => `<tr class="rowc"${tl(a[3])}><td>${a[0]}</td><td>${a[1]}</td><td class="${a[2] ? 'warnc' : ''}">${a[2]}</td></tr>`).join('')}</table>`, '', 'p:access')
      + card('视频监控', `<div class="kpis"><div><b>${X.cctv.online}</b><span>在线</span></div><div><b>${X.cctv.total}</b><span>总数</span></div><div><b>${(X.cctv.online / X.cctv.total * 100).toFixed(1)}%</b><span>在线率</span></div></div>`, '', 't:CCTV-7')
      + card('消防设施', `<table class="dt">${X.fire.map(f => `<tr class="rowc"${tl(f[2])}><td>${f[0]}</td><td class="${/离线/.test(f[1]) ? 'warnc' : ''}">${f[1]}</td></tr>`).join('')}</table>`, '', 'p:fire');
    C = strip + card(X.emergency.title, `<ol class="emg">${X.emergency.steps.map(s => `<li class="rowc"${tl(s[2])}><time>${s[0]}</time>${esc(s[1])}</li>`).join('')}</ol>`, 'floorc')
      + card('应急预案与演练', `<table class="dt">${X.drill.map(d => `<tr><td>${d[0]}</td><td>${d[1]}</td><td class="${d[2] === '已完成' ? 'okc' : ''}">${d[2]}</td></tr>`).join('')}</table>`);
    R = alarms + card('安防与消防', `<div class="kpis four"><div><b>${o.security.smokeOnline}</b><span>烟感在线</span></div><div><b>${o.security.fireTankLevel}%</b><span>消防水池</span></div><div><b>${o.security.sprinklerPressure}</b><span>喷淋 MPa</span></div><div><b>${o.security.abnormalAccess}</b><span>异常通行</span></div></div><div class="sub">火灾报警主机：${o.security.fireHost} · ${o.security.lastInspect}</div>`, '', 't:FAS');
  } else {
    L = card('本月服务指标', `<div class="kpis four"><div><b>${X.svc.month}</b><span>工单</span></div><div><b>${X.svc.respond}</b><span>平均响应 min</span></div><div><b>${X.svc.finish}%</b><span>按时完成</span></div><div><b>${X.svc.sat}</b><span>满意度</span></div></div>`, '', 'p:workorder')
      + card('工单来源', donut(X.svc.src, 170))
      + card('维修人员在岗（在岗 / 编制）', `<table class="dt">${X.staff.map(s => `<tr><td>${s[0]}</td><td>${s[2]} / ${s[1]}</td></tr>`).join('')}</table>`);
    const fm = X.funnel[0][1];
    C = strip + card('工单闭环（本月）：报修 → 派单 → 到场 → 处理 → 验收 → 回访', `<div class="funnel">${X.funnel.map(([k, v]) => `<div><span>${k}</span><b style="width:${v / fm * 100}%">${v}</b></div>`).join('')}</div>`)
      + card('工单列表 · 点击定位到设备', `<table class="dt"><tr><th>编号</th><th>内容</th><th>位置</th><th>状态</th><th>用时</th></tr>${X.orders.map(w => `<tr class="rowc"${tl(w[5])}><td>${w[0]}</td><td>${esc(w[1])}</td><td>${w[2]}</td><td class="${w[3] === '已完成' ? 'okc' : w[3] === '待派单' ? 'warnc' : ''}">${w[3]}</td><td>${w[4]}</td></tr>`).join('')}</table>`, 'floorc');
    R = card('巡检完成率（本周 %）', hb2(X.patrol, 440, { unit: '%', color: '#34d399' }))
      + alarms;
  }
  return { left: L, center: C, right: R };
}

// ---------- 全寿命周期与碳排放 ----------
let LIVE = null;   // 教学联动：{ proc, scen }
const BUILD_ORDER = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5'];
function greenKpi(stage) {
  const g = stage.green; if (!g || !g.kpi || !g.kpi.length) return '';
  return `<div class="gkpi" data-loc="k:lca" data-pts=" gc-recycle gc-earth gc-formwork gc-pv-camp dm-crush dm-reuse "><em>绿色施工 · ${esc(g.theme)}</em>${g.kpi.map(k => `<span><b>${esc(k[1])}</b><small>${esc(k[2])}</small><i>${esc(k[0])}</i></span>`).join('')}</div>`;
}
function buildCarbon(sid) {
  const L = DASH().lca; if (!L) return '';
  if (sid === 'S7') { const dm = L.phases.find(p => p.id === 'demo'), rc = L.phases.find(p => p.id === 'recycle'); let f = 1; const pr = LIVE && LIVE.proc; if (pr && pr.stageId === 'S7') f = (pr.idx + pr.k) / pr.n;
    return `<div class="cline" data-loc="k:lca"><span>拆除碳排放 <b>${(dm.t * f).toFixed(0)}</b> tCO₂e</span><span>回收利用抵减 <b>−${Math.abs(rc.t * f).toFixed(0)}</b> t</span><span class="pbar"><i style="width:${(f * 100).toFixed(0)}%;background:#4ade80"></i></span><em>拆除机械、垃圾外运；废钢回炉与再生骨料带来减碳（单独列示）· 全寿命周期 ›</em></div>`; }
  const i = BUILD_ORDER.indexOf(sid === 'LAB' ? 'S3' : sid); if (i < 0) return '';
  let f = 1; const pr = LIVE && LIVE.proc; if (pr && pr.stageId === sid) f = (pr.idx + pr.k) / pr.n;
  const cur = L.build[i][2] * f, cum = L.build.slice(0, i).reduce((a, b) => a + b[2], 0) + cur, tot = L.build.reduce((a, b) => a + b[2], 0);
  return `<div class="cline" data-loc="k:lca"><span>本阶段碳排放 <b>${cur.toFixed(0)}</b> tCO₂e</span><span>开工以来累计 <b>${cum.toFixed(0)}</b> / ${tot} t</span><span class="pbar"><i style="width:${(cum / tot * 100).toFixed(1)}%;background:#4ade80"></i></span><em>主要来源：${esc(L.build[i][3])} · 全寿命周期 ›</em></div>`;
}
function lcPhase() { // 模型当前所处的全寿命周期阶段
  const st = (LIVE && LIVE.model) || 'LAB';
  return st === 'S6' ? 'use' : st === 'P0' ? 'design' : st === 'S7' ? 'demo' : 'build';
}
function lcStrip(hl, compact) {
  const L = DASH().lca; if (!L) return '';
  const now = hl || lcPhase();
  return `<div class="lcs${compact ? ' cmp' : ''}" ${compact ? 'data-loc="k:lca"' : ''}>${L.phases.map(ph => `<div class="lcp ${ph.id === now ? 'on' : ''} ${ph.t < 0 ? 'neg' : ''}" data-loc="${ph.loc}" title="${esc(ph.desc)}"><small>${esc(ph.std)}</small><b>${esc(ph.name)}</b><span>${ph.t === null ? '—' : (ph.t > 0 ? '' : '−') + fmt(Math.abs(ph.t)) + ' t'}</span><em>${esc(ph.green)}</em></div>`).join('<i class="arr">›</i>')}</div>
    ${compact ? '<div class="sub">绿色措施贯穿全寿命周期，点这里看各阶段碳排放 ›</div>' : ''}${compact ? '' : `<div class="sub">点各阶段可在沙盘中查看对应部分；高亮 = 模型当前所处阶段。数值为 1# 楼 ${fmt(L.area)} m²、设计寿命 ${L.life} 年的教学示意值</div>`}`;
}
function mline(series, w, h, { labels = [], marks = [] } = {}) {
  const all = series.flatMap(s => s.data); const max = Math.max(...all) * 1.1, n = series[0].data.length;
  const X = i => 46 + i * (w - 60) / (n - 1), Y = v => h - 24 - v / max * (h - 40);
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
    ${[0, .5, 1].map(k => `<line x1="46" x2="${w - 10}" y1="${Y(max / 1.1 * k)}" y2="${Y(max / 1.1 * k)}" stroke="#1e3a5f"/><text x="40" y="${Y(max / 1.1 * k) + 5}" fill="#7aa3c7" font-size="13" text-anchor="end">${fmt(Math.round(max / 1.1 * k / 1000))}k</text>`).join('')}
    ${marks.map(m => `<line x1="${X(m.i)}" x2="${X(m.i)}" y1="10" y2="${h - 24}" stroke="${m.c || '#fbbf24'}" stroke-dasharray="4 4"/><text x="${X(m.i) + 4}" y="22" fill="${m.c || '#fbbf24'}" font-size="14">${esc(m.t)}</text>`).join('')}
    ${series.map(s => `<polyline points="${s.data.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')}" fill="none" stroke="${s.c}" stroke-width="3" ${s.dash ? 'stroke-dasharray="7 5"' : ''}/>`).join('')}
    ${labels.map((l, i) => l ? `<text x="${X(i)}" y="${h - 5}" fill="#7aa3c7" font-size="13" text-anchor="middle">${l}</text>` : '').join('')}
  </svg><div class="legend2">${series.map(s => `<span><i style="background:${s.c}"></i>${esc(s.name)}</span>`).join('')}</div>`;
}
function lca(L) {
  const life = L.life, emb = L.phases.filter(p => ['mat', 'trans', 'build'].includes(p.id)).reduce((a, b) => a + b.t, 0);
  const demo = L.phases.find(p => p.id === 'demo').t;
  const yrs = Array.from({ length: life + 1 }, (_, y) => y);
  const base = yrs.map(y => emb + L.opsBase * y + (y === life ? demo : 0)), proj = yrs.map(y => emb + L.opsProj * y + (y === life ? demo : 0));
  const yNow = lcPhase() === 'use' ? L.yearNow : 0;
  const tot = L.phases.filter(p => p.t > 0).reduce((a, b) => a + b.t, 0);
  const pos = L.phases.filter(p => p.t > 0);
  const cols = ['#a78bfa', '#38bdf8', '#fbbf24', '#4ade80', '#fb7185'];
  const left = card('碳排放是什么', `<ul class="cpt">${L.concepts.map(c => `<li><b>${esc(c[0])}</b>${esc(c[1])}</li>`).join('')}</ul>`, '', 'k:lca')
    + card('怎么算（GB/T 51366-2019）', `<div class="fml">${L.formulas.map(f => `<div><b>${esc(f[0])}</b><code>${esc(f[1])}</code><small>${esc(f[2])}</small></div>`).join('')}</div>`, '', 'k:lca')
    + card('主要建材隐含碳（tCO₂e）', hbars(L.materials.map(m => [m[0], m[1]]), 440, { color: '#a78bfa' }) + `<div class="sub">建材用量 × 建材碳排放因子；运输：混凝土默认 40 km、其他建材 500 km（附录 E）</div>`);
  const center = card('全寿命周期 · 从图纸到拆除', lcStrip(), 'lcc', 'k:lca')
    + card(`50 年累计碳排放（tCO₂e）· 本项目比常规设计少 ${fmt(Math.round(base[life] - proj[life]))} t`, mline([{ name: '常规设计（无光伏、常规冷热源）', c: '#94a3b8', dash: true, data: base }, { name: '本项目（装配式 + 光伏 + 地源热泵 + 智能运维）', c: '#4ade80', data: proj }], 780, 330,
      { labels: yrs.map(y => y % 10 === 0 ? (y === 0 ? '竣工' : '第' + y + '年') : ''), marks: [{ i: yNow, t: yNow ? `现在：运行第 ${yNow} 年` : '现在：施工建造', c: '#fbbf24' }] })
      + `<div class="sub">竣工那一刻已「背上」${fmt(Math.round(emb))} t 隐含碳（建材生产、运输、建造），之后每年运行再增加约 ${fmt(Math.round(L.opsProj))} t</div>`, '', 'k:lca')
    + card('各阶段占比（全寿命周期 50 年）', `<div class="share">${pos.map((p, i) => `<i style="width:${(p.t / tot * 100).toFixed(2)}%;background:${cols[i % 5]}" title="${esc(p.name)}"></i>`).join('')}</div>
      <div class="shl">${pos.map((p, i) => `<span data-loc="${p.loc}"><i style="background:${cols[i % 5]}"></i>${esc(p.name)} ${(p.t / tot * 100).toFixed(1)}%</span>`).join('')}</div>
      <div class="sub">运行阶段占大头，所以运维节能最关键；但隐含碳在竣工时就已经排放，只能靠设计和选材来减</div>`, '', 'k:lca');
  const bi = BUILD_ORDER.indexOf((LIVE && LIVE.model) || 'LAB');
  const right = card('施工阶段碳排放（建造，tCO₂e）', `<table class="dt lct"><tr><th>阶段</th><th>主要来源</th><th>t</th><th>累计</th></tr>${L.build.map((b, i) => `<tr class="${i === bi ? 'on' : ''}" data-loc="s:${b[0]}"><td>${esc(b[1])}</td><td>${esc(b[3])}</td><td>${b[2]}</td><td>${L.build.slice(0, i + 1).reduce((a, c) => a + c[2], 0)}</td></tr>`).join('')}</table><div class="sub">点一行切换沙盘到该阶段；施工机械燃油、施工用电、临建是主要来源</div>`, '', 's:S3')
    + card('减碳措施贡献（50 年，tCO₂e）', hbars(L.measures, 440, { color: '#4ade80' }) + `<div class="sub">光伏发电和绿地碳汇可从运行碳排放中扣除（GB/T 51366-2019 第 4.1.4 条）；构件回收单独列示</div>`)
    + (() => { const st = STAGES().find(x => x.id === ((LIVE && LIVE.model) || 'LAB')); const g = st && st.green;
      return g ? card(`本阶段绿色要点 · ${esc(st.name)}`, `<ul class="cpt">${g.measures.slice(0, 5).map(m => `<li><b>${esc(m[0])}</b>${esc(m[1])}</li>`).join('')}</ul><p class="lthink" style="margin-top:6px;font-size:14px">想一想：${esc(L.think)}</p>`, '', 's:' + st.id)
        : card('想一想', `<p class="lthink">${esc(L.think)}</p>`, '', 'k:lca'); })();
  return { left, center, right };
}

function green(o) {
  const tl = Array.from({ length: 24 }, (_, i) => i % 3 === 0 ? i + '时' : '');
  const pv = o.pv, c = o.carbon, w = o.water, gs = o.gshp, ev = o.ev, r = o.rating;
  const lowS = pv.strings.findIndex(x => x[1] < 90);
  const left = card('屋顶光伏 · 光伏车棚', `<div class="kpis four"><div><b>${pv.todayKwh}</b><span>今日发电 kW·h</span></div><div><b>${pv.peakKw}</b><span>峰值功率 kW</span></div><div><b>${pv.capacity}</b><span>装机 kWp</span></div><div><b>${pv.selfUse}%</b><span>自发自用</span></div></div>
      <div class="sub">今日逐时发电功率（kW）· 全年约 ${pv.yearMwh} MW·h</div>${line(pv.trend24, 460, 110, { color: '#facc15', labels: tl })}
      <div class="sub">各组串发电效率（%，与额定条件比）</div>${hbars(pv.strings, 440, { color: '#facc15', unit: '%', max: 100, hi: lowS })}`)
    + card('充电桩 · 有序充电', `<div class="kpis four"><div><b class="okc">${ev.free}</b><span>空闲 / ${ev.total}</span></div><div><b>${ev.using}</b><span>充电中</span></div><div><b class="${ev.fault ? 'warnc' : ''}">${ev.fault}</b><span>故障/离线</span></div><div><b>${ev.pvShare}%</b><span>光伏供电占比</span></div></div>
      <div class="cr"><span>变压器负载率</span>${bar(ev.trafo, 80, 100)}<b>${ev.trafo}%</b></div><div class="sub">今日充电 ${ev.todayKwh} kW·h · 负载率超 80% 自动限功率</div>`)
    + card('地源热泵能源站', `<div class="gauges">${gauge(gs.cop, 6, '机组 COP', '', 0)}${gauge(gs.earthIn, 40, '地埋侧出水', '℃', 31)}${gauge(gs.loadKw, 500, '供冷负荷', 'kW')}</div>
      <div class="sub">用户侧供/回水 ${gs.supply}/${gs.ret} ℃ · 地埋侧回水 ${gs.earthOut} ℃ · 监测孔土壤 ${gs.soilT} ℃</div>`);
  const center = `<section class="dc stagec"><div class="stageh"><span>${esc(o.scope)}</span><b>绿色建筑运维 · 全寿命周期</b></div>${lcStrip('use', true)}</section>`
    + card(`绿色建筑评价（GB/T 50378-2019 · 2024 年版）· ${esc(r.level)} · 总分 ${r.total}`, `<div class="rate">${r.items.map(([k, v, m]) => `<div class="cr"><span>${k}</span>${bar(v, m * .3, m)}<b>${v}/${m}</b></div>`).join('')}</div>
      <div class="sub">总分 =（控制项 400 + 五类评分项 + 加分项）÷ 10；60/70/85 分分别对应一/二/三星级（还须满足其他要求）。刻线 = 每类不低于 30%</div>`)
    + card('运行碳排放（tCO₂/月，虚线为目标）', `<div class="kpis four"><div><b>${c.todayT}</b><span>今日 tCO₂</span></div><div><b class="okc">−${c.pvCutT}</b><span>光伏减碳 t</span></div><div><b>${c.yearT}</b><span>近 12 月 t（目标 ${c.target}）</span></div><div><b>${c.intensity}</b><span>kgCO₂/(m²·a)</span></div></div>
      ${line(c.months, 780, 120, { color: '#4ade80', limit: Math.max(...c.monthTarget), limitLabel: '月目标上限', labels: ['1月', '', '3月', '', '5月', '', '7月', '', '9月', '', '11月', ''] })}<div class="sub">碳排放 = 用能量 × 排放因子（电 ${c.factor} kgCO₂/kW·h，示意）− 光伏减碳；方法见 GB/T 51366-2019</div>`)
    + card('现场点位与告警', siteMap(['pv', 'ev', 'green-roof', 'sponge', 'rainwater', 'gshp', 'waste', 'carbon'], o.alarms.map(a => a.point), 780, 210, true), 'mapc');
  const right = card('雨水回收 · 海绵设施', `<div class="kpis"><div><b>${w.level}%</b><span>雨水池液位 / ${w.capacityM3} m³</span></div><div><b>${w.reuseToday}</b><span>今日回用 m³</span></div><div><b>${w.reuseMonth}</b><span>本月回用 m³</span></div></div>
      <div class="cr"><span>雨水池液位</span>${bar(w.level, 101, 100)}<b>${w.level}%</b></div><div class="sub">回用于绿化浇灌、道路冲洗 · 浊度 ${w.turbidity} NTU · 年径流总量控制率设计目标 ${w.runoffTarget}%</div>`)
    + card('垃圾分类（今日 kg）', `${donut(o.waste.items.map(([k, v]) => [k, Math.round(v / o.waste.items.reduce((a, b) => a + b[1], 0) * 100)]), 170)}<div class="sub">分类准确率 ${o.waste.accuracy}%（抽检）· 今日清运 ${o.waste.pickups} 次</div>`)
    + card('室外环境', `<div class="kpis four"><div><b>${o.outdoor.pm25}</b><span>PM2.5 μg/m³</span></div><div><b>${o.outdoor.noise}</b><span>噪声 dB(A)</span></div><div><b>${o.outdoor.temp}</b><span>气温 ℃</span></div><div><b>${o.outdoor.heatIsland}</b><span>热岛强度 ℃</span></div></div>`)
    + card(`告警（${o.alarms.length}）`, `<ul class="alarms">${o.alarms.map(a => `<li class="${lvl(a.level)}" data-point="${a.point}"><time>${a.time}</time><em>${a.level}</em>${esc(a.text)}</li>`).join('')}</ul>`);
  return { left, center, right };
}

// ---------- 教学联动：工序动画 / 场景演示 → 大屏数据 ----------
const GREEN_IDS = ['pv', 'ev', 'green-roof', 'sponge', 'rainwater', 'gshp', 'waste', 'carbon'];
function kindOfPoint(id) { const d = window.SHAPAN_DATA; if (GREEN_IDS.includes(id)) return 'green'; return (d.opsPoints || []).some(p => p.id === id) ? 'ops' : 'construction'; }
function applyLive(kind, d0, stageId) {
  if (!LIVE || !d0) return d0;
  const d = JSON.parse(JSON.stringify(d0)); const sc = LIVE.scen, pr = LIVE.proc;
  const hhmm = new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' });
  if (pr && kind === 'construction' && pr.stageId === stageId && BUILD_ORDER.includes(stageId)) {
    const i = BUILD_ORDER.indexOf(stageId), prev = i > 0 ? DASH().construction[BUILD_ORDER[i - 1]] : null, f = (pr.idx + pr.k) / pr.n;
    const lerp = (a, b) => Math.round(a + (b - a) * f);
    if (d.progress) { d.progress.bldA = lerp(prev ? prev.progress.bldA : 0, d0.progress.bldA); d.progress.bldB = lerp(prev ? prev.progress.bldB : 0, d0.progress.bldB);
      d.progress.lifts = d0.progress.lifts.map(([k, v], j) => [k, lerp(prev && prev.progress.lifts[j] ? prev.progress.lifts[j][1] : 0, v)]); }
    if (d.people && d.people.onsite) d.people.onsite = lerp(prev && prev.people.onsite ? prev.people.onsite : Math.round(d0.people.onsite * .6), d0.people.onsite);
    d.alarms = [{ time: hhmm, level: '低', text: `工序 ${pr.idx + 1}/${pr.n}：${pr.name}`, point: (pr.points || [])[0] || '' }].concat(d.alarms || []);
  }
  if (sc && kindOfPoint(sc.pointId) === kind) {
    const v = sc.value, bad = sc.status !== '正常', id = sc.pointId;
    const set = {
      env: () => { d.env.pm10 = Math.round(v); d.env.spray = sc.step >= 4; d.env.trend24 = d.env.trend24.slice(1).concat(Math.round(v)); },
      crane1: () => { d.cranes[0] && (d.cranes[0].status = bad ? '预警' : '运行'); }, crane2: () => { d.cranes[1] && (d.cranes[1].status = bad ? '预警' : '运行'); },
      hoist: () => { if (d.hoist) d.hoist.load = Math.round(v / 100 * d.hoist.rated); },
      'pit-monitor': () => { if (d.pit) d.pit.points.unshift({ name: '深层水平位移速率（演示）', value: +v.toFixed(1), unit: 'mm/d', warn: sc.warn, limit: sc.limit }); d.pit.points = d.pit.points.slice(0, 4); },
      'video-ai': () => { if (bad) d.ai.helmet += 1; }, smoke: () => { if (bad) d.ai.smoke += 1; },
      energy: () => { d.energy.floors[6] = Math.round(d.energy.floors[6] * v / 8); }, ienv: () => { const c = d.comfort.find(x => x.floor === 7); if (c) c.co2 = Math.round(v); },
      parking: () => { d.parking.free = Math.round(v); }, fire: () => { d.security.smokeOnline = Math.round(v * 3.2) + '/320'; },
      pv: () => { d.pv.strings[2][1] = Math.round(100 - v); d.pv.todayKwh = Math.round(d.pv.todayKwh * (1 - v / 600)); }, ev: () => { d.ev.trafo = Math.round(v); },
      rainwater: () => { d.water.level = Math.round(v); }, gshp: () => { d.gshp.earthIn = +v.toFixed(1); d.gshp.cop = +(4.6 - (v - 27) * .1).toFixed(1); }
    };
    try { set[id] && set[id](); } catch (e) { /* 字段缺失时只显示告警 */ }
    d.alarms = [{ time: hhmm, level: sc.status === '报警' ? '高' : bad ? '中' : '低', text: `【演示·${sc.stepTag}】${sc.title}：${sc.sensor} ${fmt(+v.toFixed(1))} ${sc.unit}`, point: id }].concat(d.alarms || []);
  }
  return d;
}

// 实时抖动：模拟传感器刷新（只改显示，不改原始数据）
function jitter(obj, k = .03) {
  const c = JSON.parse(JSON.stringify(obj));
  const j = v => typeof v === 'number' && v > 3 && !Number.isInteger(v * 1) ? +(v * (1 + (Math.random() - .5) * k)).toFixed(1) : v;
  if (c.env) { ['pm25', 'pm10', 'noise'].forEach(x => c.env[x] = Math.round(c.env[x] * (1 + (Math.random() - .5) * .08))); c.env.trend24 = c.env.trend24.slice(1).concat(c.env.pm10); }
  if (c.cranes) c.cranes.forEach(cr => { cr.load = Math.round(Math.min(98, cr.load * (1 + (Math.random() - .5) * .1))); cr.moment = Math.round(Math.min(97, cr.moment * (1 + (Math.random() - .5) * .06))); cr.angle = Math.round((cr.angle + Math.random() * 20) % 360); cr.wind = j(cr.wind); });
  if (c.hoist) { c.hoist.floor = 1 + Math.floor(Math.random() * 8); c.hoist.load = Math.round(c.hoist.load * (1 + (Math.random() - .5) * .3)); }
  if (c.energy) { c.energy.todayKwh += Math.round(Math.random() * 6); }
  if (c.parking) { c.parking.free = Math.max(0, c.parking.free + Math.round((Math.random() - .5) * 4)); }
  return c;
}

async function fetchData(kind, stageId) {
  const api = window.SHAPAN_API;
  if (api && api.enabled && api.base) {
    try {
      const url = kind === 'lca' ? `${api.base}/carbon/lifecycle` : kind === 'green' ? `${api.base}/green/summary` : kind === 'ops' ? `${api.base}/ops/summary` : `${api.base}/site/summary?stage=${encodeURIComponent(stageId)}`;
      const r = await fetch(url, { headers: api.headers || {} }); if (r.ok) return { data: await r.json(), live: true };
    } catch (e) { /* 接口不可用时回落到本地教学数据 */ }
  }
  const D = DASH();
  return { data: kind === 'lca' ? D.lca : kind === 'green' ? D.green : kind === 'ops' ? D.ops : (D.construction[stageId] || D.construction.LAB), live: false };
}

// ---------- 挂载 ----------
export function mountDash(host, { onLocate, onStage, getStage, setStage, standalone, onTarget, onFocus, onClose, onSplit } = {}) {
  let kind = 'construction', timer = null, base = null, stageId = 'LAB', opsSub = 'overview';
  host.innerHTML = `<div class="dbar"><b>数据面板</b><span>与模型联动 · 点模块可在模型中定位</span><button class="dbFs" title="把数据大屏铺满整个屏幕，用于实验室大屏投屏">⛶ 大屏全屏</button><button class="dbX" aria-label="关闭数据面板" title="关闭数据面板">×</button></div><div class="dwrap"><div class="dboard"><div class="dh"><div class="dt1"><b id="dTitle"></b><small id="dSub"></small></div>
      <div class="dtabs"><button data-k="construction">施工阶段</button><button data-k="ops">运维阶段</button><button data-k="green">绿色运维</button><button data-k="lca">全寿命周期碳</button></div>
      <select id="dStage" aria-label="阶段"></select><span class="dtag">教学模拟数据</span><span id="dClock"></span>
      <button id="dSplit" title="与模型并列">⫴</button><button id="dFs" title="大屏全屏（投屏）">⛶</button>${standalone ? '' : '<button id="dClose" title="关闭">×</button>'}</div>
      <div class="dcols"><div class="dcol l"></div><div class="dcol c"></div><div class="dcol r"></div></div>
      <div class="df" id="dFoot">数据均为教学模拟数据，仅用于课堂演示；配置 SHAPAN_API 后可接入真实平台接口（字段说明见《数据接口说明》）</div></div></div>`;
  const $ = s => host.querySelector(s);
  const sel = $('#dStage');
  sel.innerHTML = STAGES().filter(s => s.id !== 'S6').map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  const board = $('.dboard');
  const wrap = host.querySelector('.dwrap');
  function fit() { const w = wrap.clientWidth || host.clientWidth, h = wrap.clientHeight || host.clientHeight; const k = Math.min(w / 1920, h / 1080); board.style.transform = `scale(${k})`; board.style.left = (w - 1920 * k) / 2 + 'px'; board.style.top = (h - 1080 * k) / 2 + 'px'; }
  window.addEventListener('resize', fit); document.addEventListener('fullscreenchange', () => setTimeout(fit, 30));
  function paint(d) {
    const st = STAGES().find(s => s.id === stageId) || STAGES()[0];
    d = applyLive(kind, d, stageId);
    const r = kind === 'lca' ? lca(d) : kind === 'green' ? green(d) : kind === 'ops' ? (DASH().opsx ? opsPage(d, DASH().opsx, opsSub) : ops(d)) : construction(d, st);
    $('.dcol.l').innerHTML = r.left; $('.dcol.c').innerHTML = r.center; $('.dcol.r').innerHTML = r.right;
    host.querySelectorAll('[data-point]').forEach(el => { if (el.dataset.point) el.classList.add('clk'); });
    // 教学联动：高亮相关模块 + 底部提示条
    const hot = [];
    if (LIVE && LIVE.scen) hot.push(LIVE.scen.pointId);
    if (LIVE && LIVE.proc) hot.push(...(LIVE.proc.points || []));
    host.querySelectorAll('.dc[data-pts]').forEach(el => el.classList.toggle('live', hot.some(id => el.dataset.pts.includes(' ' + id + ' '))));
    const foot = $('#dFoot'), sc = LIVE && LIVE.scen, pr = LIVE && LIVE.proc;
    if (sc) { foot.className = 'df on ' + (sc.status === '正常' ? 'ok' : 'bad'); foot.innerHTML = `▶ 场景演示联动 · ${esc(sc.title)} · 第 ${sc.step + 1}/6 步「${esc(sc.stepTag)}」 · ${esc(sc.sensor)} <b>${fmt(+sc.value.toFixed(1))} ${esc(sc.unit)}</b>（${sc.status}）· 发光的模块与沙盘联动`; }
    else if (pr) { foot.className = 'df on'; foot.innerHTML = `▶ 工序动画联动 · ${esc((STAGES().find(x => x.id === pr.stageId) || {}).name || '')} 第 ${pr.idx + 1}/${pr.n} 步「${esc(pr.name)}」 · 进度、人员、吊装和碳排放随动画变化 · 发光的模块对应本步点位`; }
    else { foot.className = 'df'; foot.textContent = '数据均为教学模拟数据，仅用于课堂演示；点任一模块标题可在沙盘中定位；配置 SHAPAN_API 后可接入真实平台接口（字段说明见《数据接口说明》）'; }
  }
  async function load() {
    base = null; const k0 = kind, s0 = stageId; const { data, live } = await fetchData(kind, stageId); if (k0 !== kind || s0 !== stageId) return; base = data;
    $('#dTitle').textContent = kind === 'lca' ? '全寿命周期碳排放 · 数据大屏' : kind === 'green' ? '绿色建筑运维 · 数据大屏' : kind === 'ops' ? '建筑智能运维 · 数据大屏' : '智慧工地 · 施工阶段数据大屏';
    $('#dSub').textContent = (kind === 'lca' ? 'GB/T 51366' : kind === 'green' ? '运维 · 绿色建筑' : kind === 'ops' ? '运维' : (STAGES().find(s => s.id === stageId) || {}).name || '') + (live ? ' · 实时接口' : ' · 本地数据');
    sel.style.visibility = kind !== 'construction' ? 'hidden' : 'visible'; sel.value = stageId;
    host.querySelectorAll('.dtabs button').forEach(b => b.classList.toggle('on', b.dataset.k === kind));
    paint(base);
  }
  function tick() { const n = new Date(); $('#dClock').textContent = n.toLocaleString('zh-CN', { hour12: false }); if (base && !matchMedia('(prefers-reduced-motion: reduce)').matches) paint(jitter(base)); }
  host.querySelectorAll('.dtabs button').forEach(b => b.onclick = () => {
    kind = b.dataset.k; const m = getStage && getStage();
    if (kind === 'construction') { if (stageId === 'S6') stageId = 'S5'; if (m !== stageId && setStage) setStage(stageId); }
    else if ((kind === 'ops' || kind === 'green') && !['S5', 'S6'].includes(m) && setStage) setStage('S6');
    load();
  });
  // 点击：告警/设备（data-point）→ 定位点位；模块（data-loc）→ 定位点位 / 切换阶段 / 打开详情页
  board.addEventListener('click', e => {
    const t = e.target.closest('[data-point],[data-loc]'); if (!t || !board.contains(t)) return;
    if (t.dataset.point) { onLocate && onLocate(t.dataset.point, kind); return; }
    const i0 = t.dataset.loc.indexOf(':'), k = t.dataset.loc.slice(0, i0), v = t.dataset.loc.slice(i0 + 1);
    if (k === 'p') onLocate && onLocate(v, kind);
    else if (k === 's') { onStage ? onStage(v) : setStage && setStage(v); }
    else if (k === 'k' && kind !== v) { kind = v; load(); }
    else if (k === 't') onTarget && onTarget(v);
    else if (k === 'q') { const [sid, i] = v.split(','); onFocus && onFocus(sid, +i); }
    else if (k === 'u') { opsSub = v; if (kind !== 'ops') { kind = 'ops'; const m = getStage && getStage(); if (!['S5', 'S6'].includes(m) && setStage) setStage('S6'); } load(); }
  });
  sel.onchange = () => { stageId = sel.value; setStage && setStage(stageId); load(); };
  const bigScreen = () => { const el = host; document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen && el.requestFullscreen(); };
  $('#dFs').onclick = bigScreen; $('.dbFs').onclick = bigScreen; $('.dbX').onclick = () => api.close();
  if ($('#dClose')) $('#dClose').onclick = () => api.close();
  $('#dSplit').onclick = () => { if (document.fullscreenElement === host) document.exitFullscreen(); onSplit && onSplit(); };
  const api = {
    open(k, sid) { kind = k || kind; stageId = sid || (getStage && getStage()) || stageId; if (stageId === 'S6' || stageId === 'S5') { if (!k && kind === 'construction') kind = 'ops'; if (kind === 'construction') stageId = 'S5'; } if (stageId === 'P0') { if (kind === 'construction') kind = 'lca'; stageId = 'S0'; } host.classList.add('open'); fit(); load(); clearInterval(timer); timer = setInterval(tick, 3000); tick(); },
    close() { const was = host.classList.contains('open'); if (document.body.classList.contains('split')) { document.body.classList.remove('split', 'split-v'); window.dispatchEvent(new Event('resize')); } host.classList.remove('open'); clearInterval(timer); if (document.fullscreenElement === host) document.exitFullscreen(); if (was && onClose) onClose(); },
    setStage(sid) {
      if (LIVE) LIVE.model = sid; else LIVE = { model: sid };
      if (sid === 'P0') { if (kind !== 'lca') kind = 'lca'; stageId = 'S0'; }
      else if (sid === 'S6') { if (kind === 'construction') kind = 'ops'; stageId = 'S5'; }
      else { stageId = sid; if (kind === 'ops' || kind === 'green') { if (sid !== 'S5') kind = 'construction'; } }
      if (host.classList.contains('open')) load();
    },
    get kind() { return kind; },
    setLive(x) {
      const prevScen = LIVE && LIVE.scen && LIVE.scen.pointId, prevProc = LIVE && LIVE.proc && LIVE.proc.stageId;
      LIVE = Object.assign(LIVE || {}, x);
      if (!host.classList.contains('open')) return;
      if (LIVE.scen && LIVE.scen.pointId !== prevScen && kind !== 'lca') { const k = kindOfPoint(LIVE.scen.pointId); if (k !== kind) { kind = k; if (k === 'construction' && LIVE.model && BUILD_ORDER.includes(LIVE.model)) stageId = LIVE.model; return load(); } }
      if (LIVE.proc && LIVE.proc.stageId !== prevProc && kind !== 'lca') { const sid = LIVE.proc.stageId; if (sid === 'P0') { if (kind !== 'lca') { kind = 'lca'; return load(); } } else if (sid === 'S7') { if (kind !== 'construction' || stageId !== 'S7') { kind = 'construction'; stageId = 'S7'; return load(); } } else if (sid === 'S6') { if (kind === 'construction') { kind = 'ops'; return load(); } } else if (BUILD_ORDER.includes(sid) && (kind !== 'construction' || stageId !== sid)) { kind = 'construction'; stageId = sid; return load(); } }
      if (base) paint(base);
    },
    get isOpen() { return host.classList.contains('open'); }
  };
  return api;
}

export const DASH_CSS = `
#dash{position:fixed;inset:0;z-index:60;background:#020b16;display:none}#dash.open{display:block}
.dbar{display:none;position:absolute;left:0;right:0;top:0;height:42px;align-items:center;gap:10px;padding:0 6px 0 14px;background:#06182c;border-bottom:1px solid #1e3a5f;color:#9cc3e6;font-size:14px;z-index:2;white-space:nowrap;overflow:hidden}
.dbar b{color:#fff;font-size:15px}.dbar span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}
.dbar button{border:1px solid #1e5a85;background:#0b2a4a;color:#e0f2fe;border-radius:8px;height:32px;padding:0 12px;font-size:14px;cursor:pointer;flex-shrink:0}.dbar button:hover{background:#0ea5e9;border-color:#0ea5e9}.dbar .dbX{width:36px;padding:0;font-size:20px}
body.split #dash:not(:fullscreen) .dbar{display:flex}body.split #dash:not(:fullscreen) .dwrap{top:42px}
body.split #dash:not(:fullscreen) .dh>button{display:none}
@media (max-width:520px){.dbar span{display:none}}
.dwrap{position:absolute;inset:0;overflow:hidden}
.dboard{position:absolute;width:1920px;height:1080px;transform-origin:0 0;background:radial-gradient(ellipse at 50% 0,#0c2a4a 0,#061629 60%);color:#dbeafe;font-family:"Noto Sans CJK SC","PingFang SC","Microsoft YaHei",sans-serif;font-size:18px;display:flex;flex-direction:column}
.dh{height:78px;flex-shrink:0;display:flex;align-items:center;gap:18px;padding:0 26px;border-bottom:1px solid #1e3a5f;background:linear-gradient(90deg,#0b2a4a,#08203a)}
.dt1{flex:1;display:flex;align-items:baseline;gap:14px}.dt1 b{font-size:32px;letter-spacing:2px;color:#fff}.dt1 small{font-size:18px;color:#7dd3fc}
.dtabs{display:flex;background:#0b2036;border-radius:10px;overflow:hidden;border:1px solid #1e3a5f}.dtabs button{background:none;border:0;color:#9cc3e6;padding:10px 20px;font-size:18px;cursor:pointer}.dtabs button.on{background:#0ea5e9;color:#fff}
#dStage{background:#0b2036;color:#dbeafe;border:1px solid #1e3a5f;border-radius:8px;font-size:18px;padding:8px 10px}
.dtag{background:#f59e0b;color:#1b1300;border-radius:6px;padding:4px 10px;font-size:16px}#dClock{font-variant-numeric:tabular-nums;color:#7dd3fc;min-width:200px;text-align:right}
.dh>button{background:#0b2036;border:1px solid #1e3a5f;color:#fff;border-radius:8px;width:44px;height:44px;font-size:22px;cursor:pointer}
.dcols{flex:1;display:grid;grid-template-columns:520px 1fr 520px;grid-template-rows:minmax(0,1fr);gap:14px;padding:14px 18px;min-height:0}
.dcol{display:flex;flex-direction:column;gap:12px;min-height:0;overflow:hidden}
.dc{background:rgba(10,32,56,.82);border:1px solid #1e3a5f;border-radius:12px;padding:12px 16px;position:relative}
.dc h4{margin:0 0 10px;font-size:19px;color:#7dd3fc;font-weight:600;padding-left:10px;border-left:4px solid #0ea5e9}
.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px}.kpis.four{grid-template-columns:repeat(4,1fr)}.kpis.five{grid-template-columns:repeat(5,1fr)}
.kpis div{background:#0b2036;border-radius:8px;padding:8px 6px;text-align:center}.kpis b{display:block;font-size:30px;color:#fff;font-variant-numeric:tabular-nums}.kpis span{font-size:14px;color:#8fb3d6}
.warnc{color:#fb7185!important}.okc{color:#4ade80!important}
.sub{font-size:15px;color:#8fb3d6;margin:6px 0 4px}.empty{color:#64809e;text-align:center;padding:14px 0;margin:0}
.hb{display:flex;flex-direction:column;gap:5px}.hbr{display:grid;grid-template-columns:150px 1fr 70px;align-items:center;gap:8px;font-size:15px}.hbr b{height:12px;border-radius:6px;background:linear-gradient(90deg,var(--c) var(--w),#12304f var(--w))}.hbr em{font-style:normal;text-align:right;color:#fff}.hbr.hi span,.hbr.hi em{color:#fb7185;font-weight:700}
.gauges{display:flex;justify-content:space-between}.gauge{text-align:center;font-size:16px}.gauge small{display:block;color:#8fb3d6;font-size:13px}
.pbar{position:relative;height:12px;background:#12304f;border-radius:6px;overflow:visible}.pbar i{display:block;height:100%;border-radius:6px}.pbar s{position:absolute;top:-4px;width:2px;height:20px;background:#fbbf24}.pbar.big{height:18px;margin-top:6px}
.prog2 div,.cr,.pitr{display:grid;grid-template-columns:150px 1fr 90px;align-items:center;gap:10px;margin:6px 0;font-size:16px}.prog2 b,.cr b,.pitr b{text-align:right;color:#fff}
.pitr{grid-template-columns:230px 1fr 100px;font-size:15px}
.crane{background:#0b2036;border-radius:10px;padding:8px 12px;margin-bottom:8px}.crane h5{margin:0 0 4px;font-size:18px;display:flex;justify-content:space-between}.crane h5 em{font-style:normal;font-size:15px;color:#4ade80}.crane.warnb h5 em{color:#fbbf24}.crane.warnb{box-shadow:inset 0 0 0 2px #b45309}
.crk{display:flex;justify-content:space-between;font-size:14px;color:#8fb3d6}.cr{grid-template-columns:70px 1fr 60px}
.alarms{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:5px;max-height:220px;overflow:auto}.alarms li{display:grid;grid-template-columns:62px 40px 1fr;gap:8px;align-items:center;background:#0b2036;border-radius:8px;padding:7px 10px;font-size:15px;border-left:4px solid #38bdf8}
.alarms li.hi{border-color:#f43f5e}.alarms li.mid{border-color:#fbbf24}.alarms time{color:#7dd3fc;font-variant-numeric:tabular-nums}.alarms em{font-style:normal;font-size:13px;text-align:center;border-radius:5px;background:#12304f}.orders li{grid-template-columns:80px 64px 1fr}
.clk{cursor:pointer}.clk:hover{outline:2px solid #22d3ee}
.stagec{padding:14px 20px}.stageh{display:flex;align-items:baseline;gap:16px}.stageh b{font-size:30px;color:#fff}.stageh span{color:#7dd3fc}.stagec ol{margin:8px 0 0;padding-left:1.3em;columns:2;font-size:16px;line-height:1.6;color:#cfe3f7}
.mapc{flex:1}.map{display:block;margin:0 auto;max-width:100%}.mapAlarm{cursor:pointer}
.donut{display:flex;align-items:center;gap:16px}.donut ul{list-style:none;margin:0;padding:0;font-size:16px;flex:1}.donut li{display:flex;align-items:center;gap:8px;margin:6px 0}.donut li i{width:12px;height:12px;border-radius:3px}.donut li b{margin-left:auto;color:#fff}
.floors{display:flex;flex-direction:column;gap:5px}.fl{display:grid;grid-template-columns:60px 90px 70px 120px 1fr;gap:10px;align-items:center;background:#0b2036;border-radius:8px;padding:7px 14px;font-size:17px}.fl b{color:#fff}.fl em{font-style:normal;text-align:right;color:#93c5fd}.fl.bad{background:#3b0d18;box-shadow:inset 0 0 0 2px #f43f5e}.fl.bad em{color:#fb7185}
.floorc{flex:1}
.dt{width:100%;border-collapse:collapse;font-size:15px}.dt th{color:#7dd3fc;font-weight:500;text-align:left;padding:4px}.dt td{padding:5px 4px;border-top:1px solid #12304f}
.dc{flex-shrink:0}.mapc{flex:1 1 0;min-height:0;overflow:hidden;display:flex;flex-direction:column}.mapc .map{flex:1;min-height:0;width:100%;height:100%}
.kpis.seven{grid-template-columns:repeat(7,1fr)}.kpis.seven b{font-size:26px}.kpis.seven span{font-size:13px}
.kpis b{font-size:26px}.kpis div{padding:5px 4px}.dc{padding:10px 14px}.dc h4{margin-bottom:8px;font-size:18px}
.hbr{font-size:14px}.hb{gap:3px}.crane{padding:6px 12px;margin-bottom:6px}.cr{margin:3px 0}.alarms{max-height:240px}.alarms li{padding:5px 10px}
.stagec ol{columns:1;display:grid;grid-template-columns:1fr 1fr;gap:0 24px;padding-left:1.2em}.stagec ol li{font-size:15px}
.floorc{flex:1 1 0;min-height:0}
.df{height:34px;line-height:34px;text-align:center;color:#64809e;font-size:14px;border-top:1px solid #12304f}
.df.on{background:linear-gradient(90deg,#065f46,#0e7490);color:#ecfeff;font-size:17px;height:40px;line-height:40px}.df.on.bad{background:linear-gradient(90deg,#9f1239,#b45309)}.df.on b{color:#fde68a;font-size:19px;margin:0 4px}
.dc[data-loc]{cursor:pointer;transition:border-color .2s,box-shadow .2s}.dc[data-loc]:hover{border-color:#38bdf8;box-shadow:0 0 0 1px #38bdf8 inset}
.dc h4{display:flex;align-items:center}.loc{margin-left:auto;font-style:normal;font-size:13px;font-weight:400;color:#38bdf8;border:1px solid #1e5a85;border-radius:10px;padding:1px 8px;white-space:nowrap}.stageh .loc{margin-left:auto}
.dc.live{border-color:#fbbf24;box-shadow:0 0 18px rgba(251,191,36,.45),0 0 0 2px #fbbf24 inset;animation:livep 1.4s ease-in-out infinite}
@keyframes livep{50%{box-shadow:0 0 6px rgba(251,191,36,.2),0 0 0 2px #fbbf24 inset}}
@media (prefers-reduced-motion:reduce){.dc.live{animation:none}}
.cline{margin-top:8px;display:grid;grid-template-columns:auto auto 1fr;gap:6px 18px;align-items:center;font-size:16px;color:#bbf7d0;background:#062a22;border-radius:8px;padding:6px 12px;cursor:pointer}.cline b{color:#fff;font-size:20px}.cline em{grid-column:1/-1;font-style:normal;font-size:13px;color:#86efac}
.lcs{display:flex;align-items:stretch;gap:2px;margin-top:8px}.lcs .arr{color:#38bdf8;font-style:normal;align-self:center;font-size:20px}
.lcp{flex:1;background:#0b2036;border:1px solid #1e3a5f;border-radius:8px;padding:6px 6px;text-align:center;cursor:pointer;display:flex;flex-direction:column;gap:2px;min-width:0}
.lcp:hover{border-color:#38bdf8}.lcp small{font-size:11px;color:#7aa3c7}.lcp b{font-size:16px;color:#fff}.lcp span{font-size:15px;color:#fbbf24;font-variant-numeric:tabular-nums}.lcp em{font-style:normal;font-size:12px;color:#86efac;line-height:1.3}
.lcs.cmp .lcp{padding:3px 4px}.lcs.cmp .lcp em,.lcs.cmp .lcp small{display:none}.lcs.cmp .lcp b{font-size:14px}.lcs.cmp .lcp span{font-size:13px}
.lcp.on{background:#064e3b;border-color:#4ade80;box-shadow:0 0 12px rgba(74,222,128,.5)}.lcp.neg span{color:#4ade80}
.legend2{display:flex;gap:20px;font-size:14px;color:#9cc3e6}.legend2 i{display:inline-block;width:18px;height:4px;margin-right:6px;vertical-align:middle}
.share{display:flex;height:26px;border-radius:6px;overflow:hidden;margin:4px 0 8px}.shl{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:15px}.shl span{cursor:pointer}.shl i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:5px;vertical-align:-1px}
.cpt{margin:0;padding-left:1.1em;font-size:15px;line-height:1.5;color:#cfe3f7}.cpt li{margin-bottom:5px}.cpt b{color:#fde68a;margin-right:6px}
.fml div{background:#0b2036;border-radius:8px;padding:6px 10px;margin-bottom:6px}.fml b{color:#7dd3fc;font-size:15px;display:block}.fml code{display:block;color:#fff;font-size:16px;font-family:inherit;margin:2px 0}.fml small{color:#8fb3d6;font-size:13px}
.lct td{font-size:14px}.lct tr[data-loc]{cursor:pointer}.lct tr[data-loc]:hover td{background:#12304f}.lct tr.on td{background:#064e3b;color:#fff}
.gkpi{margin-top:8px;display:flex;align-items:center;gap:10px;background:#052e1a;border:1px solid #166534;border-radius:8px;padding:6px 10px;cursor:pointer}.gkpi em{font-style:normal;color:#86efac;font-size:14px;width:150px;line-height:1.3}.gkpi span{flex:1;text-align:center}.gkpi b{font-size:22px;color:#fff}.gkpi small{color:#86efac;margin-left:2px;font-size:13px}.gkpi i{display:block;font-style:normal;font-size:12px;color:#a7f3d0}
.dc.live .gkpi{border-color:#fbbf24}
.rowc{cursor:pointer}.rowc:hover{outline:2px solid #22d3ee;outline-offset:-1px}tr.rowc:hover td{background:#12304f}
.ophase{padding:10px 14px}.oph{display:flex;align-items:stretch;gap:4px}.opp{flex:1;background:#0b2036;border:1px solid #1e3a5f;border-radius:8px;padding:6px 8px;cursor:pointer;position:relative;overflow:hidden}.opp b{display:block;font-size:16px;color:#e0f2fe}.opp small{font-size:12px;color:#7aa3c7}.opp i{position:absolute;left:0;bottom:0;height:3px;background:#22d3ee}.opp.on{border-color:#22d3ee;background:#0c3a5c}.opp:hover{border-color:#38bdf8}.oparr{align-self:center;color:#38bdf8}
.osub{display:flex;gap:6px;margin-top:8px;align-items:center}.osub button{background:#0b2036;border:1px solid #1e3a5f;color:#9cc3e6;border-radius:8px;padding:6px 10px;font-size:15px;cursor:pointer;white-space:nowrap}.osub button.on{background:#0369a1;color:#fff;border-color:#38bdf8}.osub em{margin-left:auto;font-style:normal;font-size:13px;color:#7dd3fc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.hscore{display:flex;align-items:baseline;gap:6px}.hscore b{font-size:54px;color:#4ade80}.hrow{display:grid;grid-template-columns:90px 1fr 40px;gap:10px;align-items:center;margin:5px 0;cursor:pointer;font-size:16px}.hrow:hover{color:#fff}
.pbar.sm{display:inline-block;width:70px;height:8px;vertical-align:middle;margin-right:4px}.kpis b.sm{font-size:22px}
.bsvg{width:100%;display:block}.bfl,.bdev{cursor:pointer}.bfl:hover rect{fill:#1d4ed8}.bdev:hover circle{stroke:#fbbf24;stroke-width:3}
.heat{display:flex;flex-direction:column;gap:2px}.heat .hr,.heat .hrow0{display:grid;grid-template-columns:40px repeat(24,1fr);gap:2px;align-items:center}.heat span{font-size:13px;color:#7dd3fc}.heat i{display:block;height:24px;border-radius:2px}.hrow0 i{height:auto;font-style:normal;font-size:11px;color:#7aa3c7;text-align:center}
.funnel div{display:grid;grid-template-columns:100px 1fr;gap:10px;align-items:center;margin:4px 0;font-size:15px}.funnel b{display:block;background:linear-gradient(90deg,#0ea5e9,#22d3ee);border-radius:4px;padding:2px 8px;color:#002;text-align:right}
.emg{list-style:none;margin:0;padding:0}.emg li{display:grid;grid-template-columns:70px 1fr;gap:10px;padding:8px 10px;margin:5px 0;background:#0b2036;border-left:3px solid #f59e0b;border-radius:6px;font-size:16px}.emg time{color:#fbbf24}
.lthink{font-size:16px;line-height:1.6;color:#fde68a;margin:0}
`;
