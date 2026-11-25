/*
 * 建设阶段数据（时间轴）
 * view：三维模型显示开关与楼层可见高度（hA = 1#楼，hB = 2#楼，单位为模型单位，1#层高 1.5、2#层高 1.6）
 * points：本阶段重点启用的智慧工地点位 id（时间轴切换时高亮，其余点位变淡）
 * norms：引用的规范，编号与条文已用网络检索核实（2026-11-10），详见 norms.json；查不到条文号的写「条文号待核实」
 */
window.SHAPAN_STAGES = [
  {
    id: "S0", name: "场地准备与临建", short: "临建", month: "第 1 月",
    view: { oldBld: false, done: false, prep: true, pitCover: true, dig: false, base: false, pit: false, crane: false, hoist: false, dust: true, hA: 0, hB: 0 },
    process: ["场地平整、测量放线（楼栋定位）", "围挡、大门、门卫与实名制通道", "临时道路硬化、洗车台、三级沉淀池", "办公区、生活区板房，加工棚与材料堆场", "临时用水、临时用电（三级配电、两级保护）"],
    safety: ["危险品库房与在建工程防火间距不小于 15 m，可燃材料堆场不小于 10 m", "临时消防车道宜成环，净宽、净空不小于 4 m", "临时建筑层数不宜超过两层", "临时用电 PE 线与 N 线分开，严禁利用大地作相线或中性线"],
    norms: [["GB/T 50720-2011（2025年版）", "3.2.1A"], ["GB/T 50720-2011（2025年版）", "3.3.2"], ["JGJ/T 188-2009", "3.0.4"], ["JGJ/T 46-2024", "3.2.4、3.2.6"], ["GB 55034-2022", "2.0.4"]],
    points: ["realname", "ai-attend", "video-ai", "vehicle", "env", "sewage", "water-elec", "cloud", "board", "danger", "weigh"],
    think: "危险品仓库为什么放在场地东侧角落？用平面图量一量它到 2# 楼的距离是否满足要求。"
  },
  {
    id: "S1", name: "基坑开挖与支护", short: "基坑", month: "第 2–4 月",
    view: { oldBld: false, done: false, prep: false, pitCover: false, dig: true, base: false, pit: true, crane: false, hoist: false, dust: true, hA: 0, hB: 0 },
    process: ["支护桩（围护结构）施工", "分层分段开挖，先撑后挖", "冠梁、内支撑（角撑、对撑）施工", "降排水，坑边临边防护", "土方外运，渣土车出场冲洗"],
    safety: ["支护设计使用期限不应小于一年", "按破坏后果确定支护结构安全等级", "安全等级一、二级或开挖深度≥5 m 的基坑应实施监测", "需要连续观测的监测项目宜自动化监测"],
    norms: [["JGJ 120-2012", "3.1.1、3.1.3"], ["GB 50497-2019", "3.0.1、3.0.14"], ["GB 55034-2022", "3.2.3"]],
    points: ["pit-monitor", "patrol", "vehicle", "env", "cover", "video-ai", "jiguan"],
    think: "暴雨天基坑监测的哪几项数据最先变化？你会先看大屏上的哪一块？"
  },
  {
    id: "S2", name: "基础与地下室", short: "基础", month: "第 5–6 月",
    view: { oldBld: true, done: false, prep: false, pitCover: false, dig: false, base: true, pit: true, crane: true, hoist: false, dust: false, climb: false, net: false, topWork: false, hA: 1.5, hB: 1.6 },
    process: ["垫层、防水层", "底板钢筋绑扎、混凝土浇筑（汽车泵）", "地下室墙柱、顶板施工", "塔吊安装验收后投入使用", "后浇带、外墙防水与回填"],
    safety: ["塔吊安装后须验收、取得使用登记", "多台塔吊交叉作业应编制专项方案，防碰撞", "大体积混凝土测温养护", "坑边堆载控制"],
    norms: [["JGJ 196-2010", "2.0.9、2.0.14"], ["GB 50497-2019", "3.0.14"], ["JGJ 59-2011", "4.0.3"]],
    points: ["crane1", "crane2", "pit-monitor", "rebar-ai", "jiguan", "person-loc", "yijian"],
    think: "两台塔吊的大臂会在哪里交叉？在俯瞰图上找出可能碰撞的区域。"
  },
  {
    id: "S3", name: "主体结构", short: "主体", month: "第 7–12 月",
    view: { oldBld: true, done: false, prep: false, pitCover: false, dig: false, base: true, pit: true, crane: true, hoist: true, dust: false, climb: true, net: true, topWork: false, hA: 9, hB: 4.8 },
    process: ["标准层顺序：柱 → 梁 → 楼板 → 楼梯 → 外墙", "1# 楼（装配式框架）：预制柱吊装、套筒灌浆、叠合梁、叠合板、预制楼梯、预制外墙板", "构件临时支撑（柱斜撑、独立支撑），后浇节点与叠合层", "附着式升降脚手架（爬架）随层提升", "2# 楼（现浇框架）：先浇柱，再支梁板模板、绑钢筋、浇梁板，然后现浇楼梯，最后砌填充墙；落地脚手架 + 密目网", "施工升降机安装，楼层卸料平台"],
    safety: ["附着式升降脚手架架体高度不大于 5 倍楼层高，每层设附墙支座", "升降机必须装防坠安全器（一年标定期）与超载保护", "套筒灌浆应饱满密实，所有出口均出浆", "洞口、临边严禁随意拆除防护"],
    norms: [["JGJ 202-2010", "4.4.2、4.4.5"], ["JGJ 215-2010", "4.1.7"], ["GB/T 51231-2016", "10.1.4、11.3.3"], ["JGJ 1-2014", "6.5.3"], ["JGJ 355-2015（2023年版）", "条文号待核实"], ["GB 55034-2022", "3.2.3"]],
    points: ["crane1", "crane2", "hoist", "unload", "grout", "slab-lift", "prefab-lift", "stair-lift", "person-loc", "video-ai", "yijian"],
    think: "装配式的 1# 楼和现浇的 2# 楼，哪一栋现场工人更少、扬尘更低？从大屏数据里找证据。"
  },
  {
    id: "LAB", name: "实验室沙盘现状", short: "现状", month: "沙盘",
    view: { oldBld: true, done: false, prep: false, pitCover: false, dig: false, base: false, pit: true, crane: true, hoist: true, dust: false, hA: 99, hB: 99 },
    process: ["与实验室沙盘一致：1# 楼装配式主体施工至顶层，2# 楼现浇主体施工中", "基坑内支撑完成，坑底作业", "四周构件堆场、加工棚、安全体验区、质量样板区齐全"],
    safety: ["对照沙盘实物，逐一认识智慧工地点位"],
    norms: [["JGJ 59-2011", "5.0.2"]],
    points: [],
    think: "在沙盘上找出 3 处你认为最容易发生事故的地方，说说用哪种智慧工地设备来防范。"
  },
  {
    id: "S4", name: "幕墙与装修", short: "装修", month: "第 13–16 月",
    view: { oldBld: false, done: true, garage: true, prep: false, pitCover: false, dig: false, base: false, pit: false, crane: true, hoist: true, dust: false, hA: 99, hB: 99 },
    process: ["外墙装饰（1# 楼预制外墙板打胶，2# 楼石材/幕墙）", "屋面防水、保温", "机电安装：给排水、暖通、电气、消防、智能化", "室内装修、电梯安装", "地下室顶板回填与覆土"],
    safety: ["高处作业吊篮与临边防护", "动火作业审批、看火人", "装修阶段可燃物多，临时消防设施不得拆除"],
    norms: [["GB/T 50720-2011（2025年版）", "3.2.1A"], ["GB/T 50905-2014", "2.0.1"], ["GB 55034-2022", "3.2.3"]],
    points: ["hoist", "smoke", "video-ai", "water-elec", "yijian", "env"],
    think: "装修阶段为什么烟感报警比主体阶段更重要？"
  },
  {
    id: "S5", name: "竣工建成", short: "竣工", month: "第 17 月",
    view: { oldBld: false, done: true, garage: true, land: true, prep: false, pitCover: false, dig: false, base: false, pit: false, crane: false, hoist: false, dust: false, yard: false, edu: false, live: false, worker: false, fence: false, sign: false, hA: 99, hB: 99 },
    process: ["塔吊、升降机拆除", "拆除临建，场地恢复，室外景观与道路", "分部分项验收、专项验收（消防、节能等）", "单位工程竣工验收，资料归档", "BIM 竣工模型与设备台账移交运维"],
    safety: ["塔吊拆除专项方案", "验收按单位、分部、分项、检验批划分"],
    norms: [["GB 50300-2013", "4.0.1、6.0.6"]],
    points: [],
    think: "施工阶段积累的哪些数据，竣工后还能给运维用？"
  },
  {
    id: "S6", name: "运维", short: "运维", month: "交付后",
    view: { oldBld: false, done: true, garage: true, land: true, prep: false, pitCover: false, dig: false, base: false, pit: false, crane: false, hoist: false, dust: false, yard: false, edu: false, live: false, worker: false, fence: false, sign: false, hA: 99, hB: 99 },
    process: ["建筑设备监控：暖通空调、给排水、电梯、照明", "能耗分项计量与能效监管", "消防设施巡查、检测与维保", "安防、门禁、停车管理", "报修工单与设备维保闭环", "绿色建筑运维：屋顶光伏、光伏车棚与充电桩、地源热泵", "节水与海绵：雨水回收、雨水花园、透水铺装、绿色屋顶", "垃圾分类与运行碳排放核算公示"],
    safety: ["消防设施每年至少检测一次", "重点单位每日巡查", "能耗不超过约束值，向引导值靠近", "光伏屋面检修系好安全带，回用雨水不得接入饮用水管"],
    norms: [["GB 50314-2015", "3.4.2、4.3.1"], ["GB/T 51161-2016", "2.0.3、5.2.1"], ["GB 25201-2010", "6.1.4、7.1.1"], ["GB 55015-2021", "5.2.1、5.2.6"], ["GB/T 50378-2019（2024年版）", "3.2.1、3.2.8"]],
    points: [],
    ops: true,
    think: "打开运维大屏，找出哪一层的能耗明显偏高，猜一猜可能的原因。"
  }
];
