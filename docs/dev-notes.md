
## 2026-11-11 Dashboard linkage and full-lifecycle carbon
- Split view keeps the current tab (dash.kind). Tab clicks sync the model stage.
- main loop → dash.setLive({scen, proc}) about once a second. applyLive overrides fields, adds a demo alarm at the top, makes related cards glow (.dc.live) and shows the footer strip.
- New 4th tab 'lca', data SHAPAN_DASH.lca: GB/T 51366-2019 4.1.2, 4.1.4, appendix E.
- Every card can be clicked through data-loc: p:point, s:stage, k:tab.
- Test: /workspace/work/g6/t2.py. Headless CJK fonts: copy /workspace/fonts/NotoSansCJK-*.ttc to ~/.fonts and run fc-cache.

## 2026-11-11 Green building across the full lifecycle
- ORDER is P0, S0–S6, S7. data/greenlife-data.js adds the P0 and S7 stages, a `green` field on every stage, 13 points with `stages`, DASH.construction.S7, a task card and 4 questions.
- src/greenlife.js wraps stages.apply and holds three sets of models: the planning overlay, the green site facilities, and demolition (1# floors hidden top-down). process.js register/extend gives P0 and S7 6 steps each; S0–S5 each get one extra 绿色施工 step.
- Norms verified: GB/T 50640-2023; JGJ 147-2016 3.0.6, 3.0.7, 5.2.2, 7.0.4, 7.0.5, 7.0.7, 7.0.8. GB/T 50743 and GB/T 50905 are listed by name only.
- Test: /workspace/work/g6/t3.py. Known issue: the header stage label does not update when a process starts without setStage.

## 2026-11-12 Process focus and digital O&M dashboard
- data/ops-data.js holds three things:
  - SHAPAN_TARGETS: fine-grained targets, each with floor/dx/dz (floor 11 = roof), or pos with ug (basement, shown at the garage).
  - SHAPAN_FOCUS: maps stage.process[i] to a SEQ step index, or to {pt}.
  - SHAPAN_DASH.opsx: data for the 6 ops sub-pages (overview / assets / energy / env / safety / service) and the 7-phase digital O&M strip.
- Loc codes: t:target, q:stage,i (process focus), u:ops sub-page, plus the existing p:/s:/k:.
- main.js:
  - locateTarget(id): floor targets turn peel on, tint the floor and show a ring.
  - focusProc(sid, i): proc.seek(sid, step, .7) plus a ring at step.cam[1].
  - showRing/updateRing.
  - procUI(null) hides the process bar when stopping silently.
- Stage card process items are li.pf (clickable). The dashboard construction stagec li items have data-loc q:.
- Test: /workspace/work/g6/t4.py and t5.py. Run with output redirected to a file: piping to grep causes EPIPE.

## 2026-11-25: repo and restructure plan (waiting on her OK)
- Repo: github.com/xmm1118/3DBuildingForge.
  - Current state: public, MIT, Pages on, base /3DBuildingForge/. It is a React fork of 3DCellForge with node_modules committed (207 MB pack). The Hark App has push access.
  - Plan: put the old code on a legacy branch, give main a clean history, and publish the static web/ to Pages.
  - Do not push any lab photos: no web/photos, and no inlined photos. The comparison panel needs a fallback for when photos are missing.
- Colleague: the UI looks messy. The restructure I proposed:
  - Home page with 4 entry cards and "continue". Guided intro (try things, trial cleared, skippable).
  - 4 mode tabs: ①智慧工地 (LAB model, points and scenarios, construction dashboard), ②建造过程 (timeline P0–S5 and S7, process animations), ③建成运维 (S6, peel; ops/green/LCA dashboards), ④构件工坊 (new).
  - Layout: left learning panel (collapsible); markers only for the current mode/stage, with icons and hover names; right data panel (dashboard and split merged into one toggle, plus a 大屏全屏 for projectors); bottom-right view toolbar (views, roam, env, layers) replacing the menu drawer; header keeps only 学习中心 and 全屏. Phone landscape: icon tabs, panels become drawers.
  - 构件工坊 first batch: 预制柱 (套筒灌浆), 叠合梁, 叠合板, 预制楼梯, 外墙板. Each gets an exploded view, a process animation and 2–3 quiz questions, and cross-links with the S3 process list.
  - Order: restructure, then the workshop, then push.

## 2026-11-25 UI restructure (done)
- Files: src/index.html (all layout CSS), src/main.js (modes, home, side panel, tools, data toggle, workshop host), new src/icons.js (inline SVG icons), new src/intro.js (spotlight intro engine), src/dash.js (unscaled .dbar with 「大屏全屏」/×, hooks onClose/onSplit, fit() uses .dwrap), src/teach.js (embed-quiz hides the new chrome). Preview: docs/界面梳理预览.jpg. Screenshots: /workspace/work/ux2/.
- Layout: header = home · 4 mode tabs · (‹回到工地 in ④) · 教学模拟数据 · 学习中心+progress · ? · 全屏. Left #side = learning panel for the mode (collapsible; drawer on phones). Centre = model. Right edge 「数据」 toggle opens the split view (one toggle replaces 数据大屏 + 并列). Bottom-right #tools: 视角 / 漫游 / 环境 / 图层 popovers (the old drawer is gone; layers popover also holds marker on/off and category filters).
- Mode ↔ stage (mode is derived from the stage in setStage → applyModeUI):
  - ① site = LAB. Markers: site/green/prefab/safe only. Side: points grouped by category (LAB-visible points). Data: construction.
  - ② build = P0, S0–S5, S7 (TL array; S6 is not on the timeline; ▶全过程 plays TL). Markers hidden unless the 「点位」 chip is on (then current stage points, or the current process step's points). Side: stage card (+ #procBar while an animation plays). Data: construction, following the stage (P0 → lca as before).
  - ③ ops = S6. Markers: ops only. Side: peel toggle, 运维大屏 / 绿色运维 / 全寿命周期碳 buttons, ops + green-ops lists, then the S6 stage card. Data: ops.
  - ④ ws: pauses the main render loop (tick returns while paused), hides canvas/markers/side/tools; mounts src/workshop.js into #wsHost on first entry. ws.open(id) (no id = gallery). onExit and header 「回到工地」 return to the previous mode+stage. onQuiz({id,correct,total}) is stored in shapan.wsquiz.
  - The opened point and a running scenario's point are always shown. gotoPoint(id) picks the right stage/mode first (used by the side lists, tour, dashboard alarms, task cards).
  - S3 process items that mention 预制柱/套筒灌浆, 叠合梁, 叠合板, 预制楼梯 or 外墙板 get 「构件工坊 ›」 links (stage card item 2 gets one per component; #procBar step titles too).
- Home overlay: shown on every load without a deep link (mode/stage/point/split/dash/proc/quiz). Forced with ?home=1. Cards set the mode; 「继续上次学习」 uses shapan.last.
- Intro (新手引导), 5 steps: rotate (OrbitControls start/change emits 'rotate'), click the spotlighted marker ('point'), click 建造过程 ('mode'), click 数据 ('data'), then a wrap-up step. 跳过 is always visible; Esc skips. Runs automatically only after the first home-card click when shapan.introDone is unset; otherwise from ? or ?intro=1. At the end, every shapan.* key except introDone is restored from a snapshot taken at the start, in-memory learned/quiz are reloaded, and panels/split/proc/scenario/walk/tour/env toggles/peel are reset. Then it goes to the chosen mode, or back to where the user was.
- URL params: ?mode=site|build|ops|ws (&stage=, &ws=<id>), ?pts=1 (show stage points in ②), ?side=0, ?intro=1, ?home=1; existing ?stage/point/split/dash/proc/quiz/view/nomarkers still work; ?dash=construction|ops still opens the full overlay (大屏-施工/运维.html unchanged).
- localStorage keys: shapan.last {mode, stage, build, ws} (written only after the home closes or for a deep link), shapan.introDone, shapan.wsquiz; existing shapan.learned / quiz / tasks / visited / exam / student unchanged.
- Photos: shown only if listed in window.SHAPAN_PHOTOS (offline single file) or window.SHAPAN_PHOTO_LIST (web/data/photo-list.js, written by build.sh from web/photos). For the public repo, run `NOPHOTOS=1 bash build.sh` (empties web/photos, empty list, no photos inlined). img onerror also removes a thumbnail. View names no longer mention 照片00.
- build.sh/single.py: data/workshop-data.js is copied/inlined like ops-data.js; if it is missing, a null placeholder is written to web/data so there is no 404.
- Responsive: phone landscape (max-height:500px) gets icon-only tabs and tools, side as a left drawer, 数据 as a right drawer (dash left:16vw), and compact chips (number only, active chip labelled; the active chip scrolls into view). Portrait keeps 横屏 (hidden in ④); split-v puts tools in a row at the top. ≥1800px: --fs 19px, larger markers.
