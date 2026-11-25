# 生成沙盘平面布置图 SVG（数据来自 data/shapan-data.json）
import json, html
D = json.load(open('data/shapan-data.json', encoding='utf-8'))
S = 13; OX, OZ = 42.5, 30.5
X = lambda x: (x + OX) * S; Z = lambda z: (z + OZ) * S
W, H = int(85 * S), int(61 * S) + 60
o = []
def rect(x1, z1, x2, z2, fill, stroke='none', sw=1, op=1, rx=0, dash=None):
    o.append(f'<rect x="{X(min(x1,x2)):.1f}" y="{Z(min(z1,z2)):.1f}" width="{abs(x2-x1)*S:.1f}" height="{abs(z2-z1)*S:.1f}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" opacity="{op}" rx="{rx}"' + (f' stroke-dasharray="{dash}"' if dash else '') + '/>')
def text(x, z, t, size=12, fill='#14212e', weight='600', anchor='middle'):
    o.append(f'<text x="{X(x):.1f}" y="{Z(z):.1f}" font-size="{size}" fill="{fill}" font-weight="{weight}" text-anchor="{anchor}" dominant-baseline="middle">{html.escape(t)}</text>')
rect(-41.5, -29.5, 41.5, 29.5, '#f2f2f0', '#bbb', 2)
rect(-40, -28, 40, 28, '#9fd27a')
for cx in (-35.75, 35.75):
    rect(cx - 2.8, -28, cx + 2.8, 28, '#6b6f73'); o.append(f'<line x1="{X(cx)}" y1="{Z(-28)}" x2="{X(cx)}" y2="{Z(28)}" stroke="#fff" stroke-dasharray="8 8" stroke-width="2"/>')
text(-35.75, 0, '西侧城市道路（B侧）', 13, '#fff'); o[-1] = o[-1].replace('<text ', f'<text transform="rotate(-90 {X(-35.75)} {Z(0)})" ')
text(35.75, 0, '东侧城市道路（A侧）', 13, '#fff'); o[-1] = o[-1].replace('<text ', f'<text transform="rotate(90 {X(35.75)} {Z(0)})" ')
rect(-31, -25, 31, 25, '#e3e6e8', '#2f86d6', 3)
# 场内道路
for r in [(-26, -20, 28.4, -17.5), (-26, -0.6, 28.4, 2.2), (-26.5, -20, -24, 2.2), (25.6, -20, 28.4, 2.2), (28.4, -19.5, 31, -16.5), (-31, 2.4, -24, 5), (-18.6, 2.2, -15.4, 8), (20.5, 2.2, 23.6, 11), (-17.5, 8, 31, 10.4), (26.4, 10.4, 31, 15.6), (-17.5, 8, -15, 24.5)]:
    rect(*r, '#b9bdc0')
colors = {'bld': '#3d9ee6', 'pit': '#d59a55', 'yard': '#f3dfa8', 'edu': '#fbd3b0', 'live': '#cfe6fb', 'road': 'none'}
for zn in D['zones']:
    if zn['type'] == 'road': continue
    x1, z1, x2, z2 = zn['rect']
    fill = '#2d7a4c' if zn['id'] == 'bldB' else colors[zn['type']]
    rect(x1, z1, x2, z2, fill, '#5d6b78', 1, .9 if zn['type'] in ('bld', 'pit') else .75)
lab = {'bldA': ('1# 楼', '装配式·蓝色爬架', '#fff'), 'bldB': ('2# 楼', '现浇主体·绿色安全网', '#fff'), 'pit': ('基坑作业区', '内支撑', '#3b2508'),
       'yard-n': ('构件堆场与加工棚', '', '#5a4500'), 'yard-w': ('', '', ''), 'yard-e': ('', '', ''), 'edu': ('安全体验区·质量样板区·机管大师', '', '#7a3b00'),
       'prefab-show': ('预制构件展示', '', '#7a3b00'), 'office': ('办公区', 'L 形两层办公楼', '#0f3c66'), 'live': ('生活区', '宿舍·文体·党建·餐厅', '#0f3c66')}
for zn in D['zones']:
    if zn['id'] not in lab: continue
    t1, t2, c = lab[zn['id']]
    if not t1: continue
    x1, z1, x2, z2 = zn['rect']; cx, cz = (x1 + x2) / 2, (z1 + z2) / 2
    text(cx, cz - (0.9 if t2 else 0), t1, 14, c, '700')
    if t2: text(cx, cz + 1.0, t2, 11, c, '500')
text(-28.5, -11, '加工棚·材料堆场', 11, '#5a4500'); o[-1] = o[-1].replace('<text ', f'<text transform="rotate(-90 {X(-28.5)} {Z(-11)})" ')
text(29.7, -1, '危险品仓库·钢管堆场', 10, '#5a4500'); o[-1] = o[-1].replace('<text ', f'<text transform="rotate(90 {X(29.7)} {Z(-1)})" ')
# 内部栏杆
o.append(f'<line x1="{X(-31)}" y1="{Z(8)}" x2="{X(31)}" y2="{Z(8)}" stroke="#1d1f22" stroke-width="3" stroke-dasharray="10 4"/>')
o.append(f'<line x1="{X(-17.5)}" y1="{Z(8)}" x2="{X(-17.5)}" y2="{Z(24.6)}" stroke="#1d1f22" stroke-width="2" stroke-dasharray="6 4"/>')
# 大门
for gx, gz, n in [(31, 13, '东南大门'), (31, -18, '东北大门（车辆）'), (-31, 3.7, '西大门')]:
    o.append(f'<circle cx="{X(gx)}" cy="{Z(gz)}" r="9" fill="#2b6fc0" stroke="#fff" stroke-width="2"/>')
    text(gx + (-3.6 if gx > 0 else 3.6), gz, n, 11, '#0f3c66', '700')
text(-17, 9.3, '实名制通道', 10, '#14212e'); text(22, 11.7, '车辆通道', 10, '#14212e')
# 塔吊
for cx, cz, r, n in [(-18.5, -17, 20, '1# 塔吊'), (14.4, -13.6, 19, '2# 塔吊')]:
    o.append(f'<circle cx="{X(cx)}" cy="{Z(cz)}" r="{r*S}" fill="none" stroke="#e0a800" stroke-width="1.5" stroke-dasharray="6 5"/>')
    o.append(f'<rect x="{X(cx)-6}" y="{Z(cz)-6}" width="12" height="12" fill="#f2c400" stroke="#7a5d00"/>')
    text(cx, cz - 1.5, n, 12, '#7a5d00', '700')
# 点位
cat = {'site': '#0ea5e9', 'green': '#16a34a', 'prefab': '#8b5cf6', 'safe': '#f97316'}
for i, p in enumerate(D['points']):
    x, _, z = p['pos']
    o.append(f'<circle cx="{X(x)}" cy="{Z(z)}" r="10" fill="{cat[p["cat"]]}" stroke="#fff" stroke-width="2"/>')
    o.append(f'<text x="{X(x)}" y="{Z(z)+.5}" font-size="11" fill="#fff" font-weight="700" text-anchor="middle" dominant-baseline="middle">{i+1}</text>')
# 指北针、图例
nx, ny = X(-40.5) + 4, Z(-27.5)
o.append(f'<g transform="translate({nx},{ny})"><polygon points="12,0 20,26 12,20 4,26" fill="#14212e"/><text x="12" y="38" font-size="13" text-anchor="middle" font-weight="700">北</text></g>')
lx, ly = 18, H - 36
items = [('#0ea5e9', '智慧工地设备'), ('#16a34a', '绿色施工'), ('#8b5cf6', '装配式构件'), ('#f97316', '安全教育与管理'), ('#f2c400', '塔吊（虚线为起重臂回转范围，示意）')]
for k, (c, n) in enumerate(items):
    o.append(f'<circle cx="{lx + k*170 + 8}" cy="{ly}" r="8" fill="{c}"/><text x="{lx + k*170 + 22}" y="{ly}" font-size="13" dominant-baseline="middle">{n}</text>')
o.append(f'<text x="{W-18}" y="{H-14}" font-size="11" text-anchor="end" fill="#5d6b78">按照片目测比例绘制，台面约 80×56 网格单位（东西×南北），尺寸待实测校正</text>')
svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="Noto Sans CJK SC, PingFang SC, Microsoft YaHei, sans-serif"><rect width="{W}" height="{H}" fill="#fff"/><defs><clipPath id="tb"><rect x="{X(-41.5)}" y="{Z(-29.5)}" width="{83*S}" height="{59*S}"/></clipPath></defs><g clip-path="url(#tb)">' + ''.join(o[:-6]) + '</g>' + ''.join(o[-6:]) + '</svg>'
open('docs/平面布置图.svg', 'w', encoding='utf-8').write(svg)
print(W, H)
