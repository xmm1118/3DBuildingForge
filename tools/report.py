import json, html, os
D = json.load(open('data/shapan-data.json', encoding='utf-8'))
CAT = {'site': ('智慧工地设备', '#0ea5e9'), 'green': ('绿色施工', '#16a34a'), 'prefab': ('装配式构件', '#8b5cf6'), 'safe': ('安全教育与管理', '#f97316')}
AREA={'realname':'实名制通道（施工区入口）','ai-attend':'实名制通道（施工区入口）','video-ai':'实名制通道（施工区入口）','crane1':'1# 楼北侧','crane2':'基坑西北角','person-loc':'1# 楼与 2# 楼之间','yijian':'1# 楼与 2# 楼之间','env':'东北大门','vehicle':'东北大门','streetlight':'2# 楼南侧道路','weigh':'西大门','danger':'东侧围挡内','grout':'1# 楼楼顶作业层','unload':'2# 楼西裙楼顶','hoist':'2# 楼南立面','jiguan':'机械停放区','safety-exp':'安全体验区','vr':'安全体验区','quality':'质量样板区'}
def zone(p):
    if p['id'] in AREA: return AREA[p['id']]
    x, _, z = p['pos']
    for zn in D['zones']:
        x1, z1, x2, z2 = zn['rect']
        if min(x1,x2)-1 <= x <= max(x1,x2)+1 and min(z1,z2)-1 <= z <= max(z1,z2)+1 and zn['type'] != 'road': return zn['name'].split('（')[0]
    return '场内道路'
rows = ''.join(f"<tr><td class=n style='background:{CAT[p['cat']][1]}'>{i+1}</td><td><b>{html.escape(p['name'])}</b></td><td>{html.escape(p['sign'])}{' <span class=v>待核实</span>' if p.get('verify') else ''}</td><td>{CAT[p['cat']][0]}</td><td>{zone(p)}</td><td>{'、'.join(str(n).zfill(2) for n in p['photos'])}</td><td>{html.escape(p['alarms'][0] if p['alarms'] else '—')}</td></tr>" for i, p in enumerate(D['points']))
md = '# 沙盘点位清单（第一步）\n\n| 序号 | 点位 | 沙盘标牌原文 | 类别 | 所在区域 | 照片编号 |\n|---|---|---|---|---|---|\n' + ''.join(f"| {i+1} | {p['name']} | {p['sign']}{'（待核实）' if p.get('verify') else ''} | {CAT[p['cat']][0]} | {zone(p)} | {'、'.join(str(n).zfill(2) for n in p['photos'])} |\n" for i, p in enumerate(D['points']))
open('docs/点位清单.md', 'w', encoding='utf-8').write(md)
svg = open('docs/平面布置图.svg', encoding='utf-8').read()
here = 'file://' + os.path.abspath('docs') + '/'
H = f"""<!doctype html><html lang=zh-CN><meta charset=utf-8><style>
@page{{size:A4 landscape;margin:12mm}}
body{{font-family:"Noto Sans CJK SC",sans-serif;color:#14212e;font-size:11.5px;margin:0}}
h1{{font-size:24px;margin:0 0 2px}} h2{{font-size:17px;margin:0 0 8px;color:#0f4c75;border-left:5px solid #0ea5e9;padding-left:8px}}
.sub{{color:#5d6b78;margin-bottom:10px}}
.page{{page-break-after:always}}
.find{{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:8px 0 10px}}
.find div{{background:#f3f8fc;border-radius:8px;padding:8px 10px;line-height:1.55}}
.find b{{color:#b45309}}
svg{{width:100%;height:auto;max-height:128mm}}
table{{border-collapse:collapse;width:100%}} th,td{{border:1px solid #dfe5ea;padding:3.5px 6px;text-align:left;vertical-align:top}} th{{background:#0f2a44;color:#fff}}
td.n{{color:#fff;font-weight:700;text-align:center;width:22px}} .v{{background:#fde68a;color:#7c4a00;padding:0 4px;border-radius:3px;font-size:10px}}
.pair{{width:100%;margin-bottom:6px}} .cap{{color:#5d6b78;margin:0 0 10px}}
ol li{{margin-bottom:6px;line-height:1.6}}
</style><body>
<div class=page>
<h1>工程沙盘虚拟仿真系统 · 第一步确认稿</h1>
<div class=sub>安徽工业大学 工程沙盘（PMS 品茗 智慧工地沙盘）· 依据 55 张照片 + 1 段视频整理 · 2026-11-10</div>
<div class=find>
<div><b>发现 1：</b>两栋楼都在施工。蓝色那栋不是建成的玻璃幕墙楼，而是<b>装配式主体 + 蓝色全钢附着式升降脚手架（爬架）</b>，下部 2 层露出灰色框架，楼顶有「套筒灌浆」「构件临时支撑」等小牌。</div>
<div><b>发现 2：</b>标牌是「<b>机管大师</b>」（品茗的机械管理产品），不是「机管大厅」；「易检」也是品茗产品名。沙盘上未见扬尘喷淋设备，只有「环境监测」牌，喷淋联动作为教学补充。</div>
<div><b>发现 3：</b>东西两端各有一条城市道路，大门 3 处；一道黑色铁艺栏杆把北侧施工区与南侧办公生活区隔开，工人经「人员实名制 / AI 无感考勤 / 视频监控」通道进入施工区。</div>
</div>
<h2>沙盘平面布置图</h2>
{svg}
</div>
<div class=page><h2>点位清单（{len(D['points'])} 处，标牌文字以照片为准）</h2>
<table><tr><th>#</th><th>点位</th><th>沙盘标牌原文</th><th>类别</th><th>所在区域</th><th>照片编号</th><th>典型告警</th></tr>{rows}</table></div>
<div class=page><h2>同角度对照：照片 vs 三维重建</h2>
<img class=pair src="{here}pair_south.jpg"><p class=cap>南侧（照片 00）</p>
<img class=pair src="{here}pair_east.jpg"><p class=cap>东侧（照片 01）</p></div>
<div class=page><h2>同角度对照（续）</h2>
<img class=pair src="{here}pair_north.jpg"><p class=cap>北侧（照片 02）</p>
<img class=pair src="{here}pair_west.jpg"><p class=cap>西侧（照片 03）</p></div>
<div><h2>需要您确认的几处</h2>
<ol>
<li><b>运维阶段用哪栋楼？</b>沙盘里两栋都在建。建议时间轴后段让 <b>1# 楼（装配式）竣工</b>、拆除爬架，作为「建成运维」对象；「实验室沙盘现状」保持两栋在建。</li>
<li><b>台面实际尺寸。</b>目前按照片目测为东西约 80、南北约 56 的比例。若方便量一下长宽（以及两栋楼大致高度），我按实测校正。</li>
<li><b>生活区细节。</b>宿舍排数、篮球场位置是按照片概括的，不追求一栋不差；若需要精确到每栋，请告诉我。</li>
<li><b>两条道路与大门。</b>东侧两门（东南大门、东北车辆门）、西侧一门，与您的印象是否一致。</li>
<li>标「待核实」的点位：两台塔吊沙盘上无监控标牌（按塔吊设置点位）；楼顶小牌字迹较小。</li>
</ol>
<img src="{here}top.png" style="width:62%;border-radius:8px;margin:4px 0"><p style="color:#5d6b78">网页已可漫游：俯瞰旋转缩放、四个照片同角度、车内视角、人视角、17 站参观路线；点位可点开学习，构件可按图层开关、可剥开爬架和安全网。全部数据标注「教学模拟数据」。</p>
</div></body></html>"""
open('docs/report.html', 'w', encoding='utf-8').write(H)
