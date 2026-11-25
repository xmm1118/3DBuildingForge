# 生成数据大屏的教学模拟数据（data/dashboard-data.js + .json）
import json, math, random
random.seed(7)
def series(n, base, amp, noise, lo=0):
    return [round(max(lo, base + amp*math.sin(i/n*2*math.pi - 1.2) + random.uniform(-noise, noise)), 1) for i in range(n)]
ST = {
 # 在场人数, 计划, 工种, pm10基准, 噪声, 吊装进度, 进度A, 进度B, 是否有塔吊/升降机/基坑
 'S0': dict(on=86, plan=95, trades=[['普工',38],['电工',8],['木工',14],['钢筋工',6],['机械司机',6],['管理人员',14]], pm=78, noise=62, A=0, B=0, crane=False, hoist=False, pit=False, lifts=[0,0,0,0]),
 'S1': dict(on=142, plan=150, trades=[['普工',46],['机械司机',22],['支护工',28],['钢筋工',18],['混凝土工',12],['管理人员',16]], pm=96, noise=71, A=0, B=0, crane=False, hoist=False, pit=True, lifts=[0,0,0,0]),
 'S2': dict(on=236, plan=250, trades=[['钢筋工',72],['木工',48],['混凝土工',36],['防水工',22],['普工',34],['塔吊司机/信号工',8],['管理人员',16]], pm=64, noise=68, A=8, B=6, crane=True, hoist=False, pit=True, lifts=[0,0,0,0]),
 'S3': dict(on=318, plan=330, trades=[['钢筋工',84],['木工',62],['构件安装工',46],['灌浆工',12],['架子工',30],['混凝土工',34],['普工',28],['塔吊司机/信号工',10],['管理人员',12]], pm=52, noise=66, A=58, B=34, crane=True, hoist=True, pit=True, lifts=[186,412,268,38]),
 'LAB': dict(on=296, plan=320, trades=[['钢筋工',76],['木工',58],['构件安装工',44],['灌浆工',12],['架子工',28],['混凝土工',30],['普工',26],['塔吊司机/信号工',10],['管理人员',12]], pm=55, noise=65, A=80, B=52, crane=True, hoist=True, pit=True, lifts=[238,526,342,52]),
 'S4': dict(on=264, plan=280, trades=[['装修工',96],['机电安装工',72],['外墙打胶/幕墙工',26],['防水工',18],['普工',30],['管理人员',22]], pm=44, noise=58, A=100, B=100, crane=True, hoist=True, pit=False, lifts=[262,580,376,60]),
 'S5': dict(on=48, plan=52, trades=[['验收与整改',22],['园林绿化',14],['保洁',6],['管理人员',6]], pm=31, noise=48, A=100, B=100, crane=False, hoist=False, pit=False, lifts=[262,580,376,60]),
}
ST['S6'] = dict(ST['S5'], on=0, plan=0, trades=[])
out = {'meta': {'note': '教学模拟数据', 'generated': '2026-11-10', 'units': {'pm': 'μg/m³', 'noise': 'dB(A)', 'disp': 'mm', 'axial': 'kN', 'load': '%'}}, 'construction': {}, 'ops': {}}
for k, s in ST.items():
    on = s['on']
    d = {
      'people': {'onsite': on, 'planned': s['plan'], 'attendRate': round(on/s['plan']*100,1) if s['plan'] else 0,
                 'trades': s['trades'], 'trend7': [max(0, on + random.randint(-25, 18)) for _ in range(6)] + [on],
                 'noHelmetToday': random.randint(1,4) if on else 0},
      'cranes': [
        {'id':'crane1','name':'1# 塔吊','load':62,'moment':71,'wind':6.8,'angle':143,'height':24,'radius':16.5,'status':'运行','alarms':1},
        {'id':'crane2','name':'2# 塔吊','load':48,'moment':86,'wind':6.8,'angle':212,'height':26.5,'radius':18.2,'status':'预警','alarms':3}
      ] if s['crane'] else [],
      'hoist': {'id':'hoist','load':1180,'rated':2000,'people':9,'ratedPeople':12,'floor':5,'runsToday':64,'status':'运行','antiFall':'已标定（有效期至 2027-06）'} if s['hoist'] else None,
      'env': {'pm25': round(s['pm']*0.52), 'pm10': s['pm'], 'noise': s['noise'], 'temp': 18.6, 'hum': 64, 'wind': 2.4,
              'limitPm10': 80, 'limitNoiseDay': 70, 'spray': s['pm'] > 80, 'trend24': series(24, s['pm'], s['pm']*.35, 6, 10)},
      'ai': {'helmet': 3 if on else 0, 'vest': 5 if on else 0, 'intrude': 1 if on else 0, 'smoke': 0, 'fire': 0},
      'pit': {'points': [
                 {'name':'ZQS-3 支护桩顶水平位移','value':18.6,'unit':'mm','warn':24,'limit':30},
                 {'name':'DB-7 周边地表沉降','value':21.2,'unit':'mm','warn':20,'limit':30},
                 {'name':'ZL-2 支撑轴力','value':3120,'unit':'kN','warn':3400,'limit':4250},
                 {'name':'SW-1 坑外地下水位变化','value':0.42,'unit':'m','warn':0.8,'limit':1.0}],
              'trend7': series(7, 16, 3, 1)} if s['pit'] else None,
      'progress': {'bldA': s['A'], 'bldB': s['B'], 'lifts': [['预制墙板', s['lifts'][0]], ['叠合板', s['lifts'][1]], ['叠合梁', s['lifts'][2]], ['预制楼梯', s['lifts'][3]]]},
      'inspect': {'issues': [12,18,23,27,26,19,6,0][list(ST).index(k)], 'rectified': [10,15,21,24,22,17,6,0][list(ST).index(k)]},
    }
    al = []
    if on: al.append({'time':'09:42','level':'高','text':'未戴安全帽进入作业区（实名制通道 3 号闸）','point':'video-ai'})
    if s['crane']: al.append({'time':'10:15','level':'中','text':'2# 塔吊力矩 86%，接近 90% 预警','point':'crane2'}); al.append({'time':'10:18','level':'中','text':'1#/2# 塔吊回转干涉区有人员','point':'crane1'})
    if s['pit']: al.append({'time':'08:30','level':'中','text':'DB-7 地表沉降 21.2 mm，超预警值 20 mm','point':'pit-monitor'})
    if s['pm'] > 80: al.append({'time':'11:02','level':'中','text':f"PM10 {s['pm']} μg/m³ 超限，已联动喷淋",'point':'env'})
    if s['hoist']: al.append({'time':'13:26','level':'低','text':'升降机吊笼人数 11/12，接近额定','point':'hoist'})
    if k in ('S0','S4'): al.append({'time':'14:05','level':'中','text':'木工加工棚烟感报警（已确认为切割粉尘）','point':'smoke'})
    if k in ('S3','LAB'): al.append({'time':'15:40','level':'低','text':'7 层卸料平台荷载 0.85 t（限载 1.0 t）','point':'unload'})
    d['alarms'] = al
    out['construction'][k] = d
# 运维（1# 楼 10 层）
floors = [round(x,1) for x in [412,386,392,401,388,395,612,404,398,436]]
out['ops'] = {
  'building': {'name':'1# 楼（竣工）','area':8600,'floors':10,'note':'按夏热冬冷地区办公建筑示意'},
  'energy': {'todayKwh': 4224, 'monthKwh': 98620, 'yearIntensity': 61.8, 'limit': 70, 'guide': 55,
             'split': [['空调用电', 41], ['照明插座', 28], ['动力（电梯、水泵）', 19], ['特殊用电（机房）', 12]],
             'floors': floors, 'trend24': series(24, 176, 90, 10, 40)},
  'devices': [{'name':'空调机组/新风','total':22,'run':19,'fault':1},{'name':'电梯','total':4,'run':4,'fault':0},{'name':'生活/消防水泵','total':8,'run':3,'fault':0},{'name':'送排风机','total':16,'run':12,'fault':1},{'name':'照明回路','total':120,'run':86,'fault':2}],
  'comfort': [{'floor':f+1,'temp':round(24.5+random.uniform(-1,1),1),'hum':round(52+random.uniform(-6,6)),'co2':round(620+random.uniform(-80,120))} for f in range(10)],
  'security': {'accessToday': 1268, 'abnormalAccess': 2, 'fireHost':'正常', 'smokeOnline':'318/320', 'fireTankLevel': 92, 'sprinklerPressure': 0.42, 'lastInspect':'今日 08:30 已巡查'},
  'parking': {'total': 186, 'free': 47, 'inToday': 312, 'outToday': 268, 'trend24': series(24, 120, 55, 8, 10)},
  'orders': {'open': 5, 'doing': 3, 'doneToday': 11, 'list': [
     {'no':'WO-1108','text':'7 层空调末端夜间未关闭','status':'处理中','point':'ienv'},
     {'no':'WO-1109','text':'2# 电梯门机异响','status':'待派单','point':'elevator'},
     {'no':'WO-1110','text':'屋顶冷却塔补水阀渗漏','status':'待派单','point':'hvac'},
     {'no':'WO-1111','text':'B1 车库 3 处照明回路故障','status':'已完成','point':'parking'}]},
  'alarms': [
     {'time':'02:14','level':'中','text':'7 层夜间用电 38 kW，高于同层基线 3 倍','point':'ienv'},
     {'time':'07:55','level':'低','text':'3 层 2 只烟感离线','point':'fire'},
     {'time':'09:20','level':'低','text':'2# 电梯平层误差 12 mm','point':'elevator'},
     {'time':'10:41','level':'中','text':'消防水池液位 92%，补水阀动作频繁','point':'water'},
     {'time':'11:30','level':'低','text':'东门门禁连续 2 次刷卡失败','point':'access'}]
}
for k in ['S0','S1','S2','S3','S4','S5','LAB']:
    for a in out['construction'][k]['alarms']: pass
js = "/* 数据大屏 · 教学模拟数据（由 tools/gen_dash.py 生成）\n * 结构说明见 docs/数据接口说明.md；接入真实数据时，让接口返回同样结构的 JSON 即可。\n */\nwindow.SHAPAN_DASH = " + json.dumps(out, ensure_ascii=False, indent=1) + ";\n"
open('data/dashboard-data.js','w').write(js); json.dump(out, open('data/dashboard-data.json','w'), ensure_ascii=False, indent=1)
print('ok', len(js))
