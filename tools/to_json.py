# 从 data/shapan-data.js 导出纯 JSON（便于后台/真实数据接口使用）
import json, re, subprocess
src = open('data/shapan-data.js', encoding='utf-8').read()
js = "global.window={};" + src + ";process.stdout.write(JSON.stringify(window.SHAPAN_DATA,null,2))"
out = subprocess.run(['node', '-e', js], capture_output=True, text=True, check=True).stdout
open('web/data/shapan-data.json', 'w', encoding='utf-8').write(out)
open('data/shapan-data.json', 'w', encoding='utf-8').write(out)
