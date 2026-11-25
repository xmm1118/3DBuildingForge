#!/bin/bash
# 构建：web/ 部署版文件夹 + 离线单文件版
# 公开发布（不带实验室照片）：NOPHOTOS=1 bash build.sh
set -e
cd "$(dirname "$0")"
ES=${ES:-$( [ -x /opt/panel-apps/node_modules/esbuild/bin/esbuild ] && echo /opt/panel-apps/node_modules/esbuild/bin/esbuild || echo "npx esbuild")}
mkdir -p web/data web/photos
$ES src/main.js --bundle --format=iife --minify --outfile=web/app.js --log-level=warning
cp src/index.html web/index.html
python3 tools/gen_dash.py
cp data/shapan-data.js data/scenarios.js data/stages-data.js data/dashboard-data.js data/dashboard-data.json data/norms.json data/teach-data.js data/green-data.js data/greenlife-data.js data/ops-data.js web/data/
# 构件工坊数据（另行开发）；还没有时放一个空占位，页面照常运行
if [ -f data/workshop-data.js ]; then cp data/workshop-data.js web/data/; else echo 'window.SHAPAN_WORKSHOP = window.SHAPAN_WORKSHOP || null; // 占位：data/workshop-data.js 尚未提供' > web/data/workshop-data.js; fi
for k in construction ops; do n=$([ $k = ops ] && echo 运维 || echo 施工); printf '<!DOCTYPE html><meta charset="utf-8"><title>%s数据大屏</title><script>location.replace("index.html?dash=%s&"+location.search.slice(1))</script>' $n $k > web/大屏-$n.html; done
# 实验室照片：只在本地带；登记到 photo-list.js，页面只显示登记过的照片
if [ -n "$NOPHOTOS" ]; then rm -f web/photos/*.jpg; else cp photos/*.jpg web/photos/ 2>/dev/null || true; fi
python3 - <<'PY'
import glob, os, json
names = sorted(os.path.basename(f)[:-4] for f in glob.glob('web/photos/*.jpg'))
open('web/data/photo-list.js', 'w', encoding='utf-8').write('window.SHAPAN_PHOTO_LIST = ' + json.dumps(names) + ';\n')
print('photos listed:', len(names))
PY
python3 tools/to_json.py
python3 tools/single.py
node tools/battle.js
ls -la web web/app.js dist 2>/dev/null | head -20
rm -f "dist/工程沙盘虚拟仿真-网页版.zip"; zip -qr "dist/工程沙盘虚拟仿真-网页版.zip" web
