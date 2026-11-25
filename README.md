# 工程沙盘虚拟仿真系统 · 网页版（第二步：阶段时间轴 + 两套数据大屏）

安徽工业大学 建筑工程学院 · 工程沙盘。页面中的数据均为「教学模拟数据」。

## 部署（火山引擎 teacherlele.cn）
把整个 web 文件夹上传到网站目录（例如 /shapan/），访问 https://teacherlele.cn/shapan/ 即可。
纯静态文件，无需后端；three.js 已打包进 app.js，离线可用。直接双击 index.html 也能打开。

## 页面入口
- index.html：三维沙盘（时间轴、点位、漫游、大屏）
- 大屏-施工.html：直接打开施工阶段数据大屏（适合投到实验室拼接屏，按 ⛶ 全屏）
- 大屏-运维.html：直接打开运维阶段数据大屏

## 本版功能（2026-11-10 更新）
- 工序动画：7 个阶段共 62 步，按真实流程演示（主体结构 24 步，按柱 → 梁 → 板 → 楼梯 → 外墙的顺序：1# 楼装配式框架、2# 楼现浇框架）。每步有做法、要点、规范依据和相关点位，可暂停、单步、调速、跳步；「全过程」按钮会连续播放全部阶段。
- 场景演示：44 个点位都有六步闭环（正常运行 → 异常出现 → 识别判断 → 告警推送 → 现场处置 → 闭环归档），配三维效果和实时读数曲线（含预警值、报警值），最后一道判断题；答题结果存在 localStorage 的 shapan.quiz 中。场景内容见 data/scenarios.js。
- 并列双屏：顶部「并列」按钮让沙盘和数据大屏左右并列，中间分隔条可以拖动；竖屏设备自动改为上下排列。

## URL 参数
- ?split=1：打开时直接并列显示
- ?stage=S3&proc=1&step=0：打开时直接播放某阶段的工序动画
- ?stage=S0…S6 或 LAB：初始阶段（S0 场地准备与临建，S1 基坑开挖与支护，S2 基础与地下室，S3 主体结构，S4 幕墙与装修，S5 竣工建成，S6 运维，LAB 实验室沙盘现状，默认 LAB）
- ?dash=construction|ops：打开时直接显示数据大屏
- ?view=top|south|east|north|west：初始视角
- ?point=<id>：直接打开某个点位
- ?nomarkers=1：隐藏点位标记

## 文件
- index.html：页面与样式；app.js：三维场景、时间轴、大屏程序
- data/shapan-data.js(.json)：分区 zones、施工点位 points（35 个）、运维点位 opsPoints（9 个）
- data/stages-data.js：7 个建设阶段 + 实验室现状（工序、安全要求、规范依据、重点点位、思考题、三维显示开关）
- data/dashboard-data.js(.json)：两套大屏的教学模拟数据（由 tools/gen_dash.py 生成）
- data/norms.json：引用的 18 本规范（编号、现行状态、要点条文、来源链接，2026-11-10 核实）
- photos/：沙盘实物照片

## 接入真实数据（预留接口）
在 index.html 中把
`window.SHAPAN_API = { enabled: false, base: "" }`
改为
`window.SHAPAN_API = { enabled: true, base: "https://你的接口地址", headers: { Authorization: "Bearer …" } }`
页面每 3 秒刷新显示；接口失败时自动回落到本地教学数据。接口需允许跨域（CORS）。

### 1. 施工阶段：GET {base}/site/summary?stage=S3
返回 JSON（与 dashboard-data.json 中 construction.S3 同结构）：
| 字段 | 类型 | 说明 |
|---|---|---|
| people.onsite / planned / attendRate | 数字 | 在场人数、计划人数、出勤率 % |
| people.trades | [[工种, 人数]] | 工种分布 |
| people.trend7 | 数字[7] | 近 7 天在场人数 |
| people.noHelmetToday | 数字 | 今日未戴安全帽次数 |
| cranes[] | 对象 | id（对应点位 crane1/crane2）、name、load 起重量 %、moment 力矩 %、wind 风速 m/s、angle 回转角°、height 高度 m、radius 幅度 m、status 运行/预警/报警、alarms |
| hoist | 对象或 null | load kg、rated、people、ratedPeople、floor、runsToday、status、antiFall 防坠器标定 |
| env | 对象 | pm25、pm10 μg/m³，noise dB(A)，temp、hum、wind，limitPm10、limitNoiseDay，spray 喷淋是否开启，trend24 PM10 24 小时 |
| ai | 对象 | helmet 未戴安全帽、vest 未穿反光衣、intrude 区域入侵、smoke 烟雾、fire 明火（今日次数） |
| pit | 对象或 null | points[]：{name, value, unit, warn 预警值, limit 控制值}；trend7 |
| progress | 对象 | bldA、bldB 进度 %；lifts [[构件类型, 件数]] |
| inspect | 对象 | issues 本周问题数、rectified 已整改 |
| alarms[] | 对象 | time、level 高/中/低、text、point（点位 id，大屏点击后在沙盘中定位） |

### 2. 运维阶段：GET {base}/ops/summary
返回 JSON（与 dashboard-data.json 中 ops 同结构）：
| 字段 | 说明 |
|---|---|
| building | name、area m²、floors、note |
| energy | todayKwh、monthKwh、yearIntensity kW·h/(m²·a)、limit 约束值、guide 引导值、split [[分项, 占比%]]、floors[10] 各层今日 kW·h、trend24 逐时 kW |
| devices[] | name、total、run、fault |
| comfort[] | floor、temp ℃、hum %、co2 ppm |
| security | accessToday、abnormalAccess、fireHost、smokeOnline、fireTankLevel %、sprinklerPressure MPa、lastInspect |
| parking | total、free、inToday、outToday、trend24 |
| orders | open、doing、doneToday、list[]：{no, text, status, point} |
| alarms[] | time、level、text、point（运维点位 id：energy、hvac、elevator、water、fire、access、ienv、parking、workorder） |

### 点位 id 与设备编号
大屏告警的 point 字段必须是 shapan-data.js 中已有的点位 id，才能点击后在沙盘中定位。接真实设备时，在后台维护「设备编号 → 点位 id」的对照表即可。

## 学习中心（第三步）
- 顶栏「🎓 学习」或菜单底部按钮打开，三页：任务卡（8 张）、学习进度、退场小测。
- 任务卡数据：`data/teach-data.js` 的 `tasks`。每步 `act` 可跳转：`stage` 阶段、`point` 点位、`scen` 场景演示、`proc` 工序动画、`dash` 大屏。答题类型 `text` / `pick` / `order`。
- 本机存储（localStorage）：`shapan.learned` 已学点位，`shapan.quiz` 场景题，`shapan.tasks` 任务卡，`shapan.visited` 浏览过的阶段，`shapan.exam` 小测记录，`shapan.student` 姓名学号班级。学习进度页可导出 JSON。
- 题库 56 题 = 44 道场景演示题 + 12 道补充题（`extraQuestions`）。导出字段与双人对战平台内置题库一致：`q`、`tip`、`opts`、`ans`（从 0 开始），另有 `explain`、`cat`、`point`。
- 接入双人对战平台：「网址接入」填 `index.html?quiz=1&n=5`（可加 `&scope=施工` 或 `运维`），或用「上传 HTML」上传 `对战小测.html`；开启「单人游戏转分屏对战」。答题时按平台协议 postMessage 发送 `{type:'score'}`、`{type:'progress', current, total}`、`{type:'done'}`。
