#!/bin/bash
# 构件工坊独立测试页：把 src/workshop.js 打成 IIFE，内联进 tools/ws_test.html
# 用法：bash tools/ws_build.sh   （只读 src/workshop.js、data/workshop-data.js，不动其他文件）
set -e
cd "$(dirname "$0")/.."
ES=/opt/panel-apps/node_modules/esbuild/bin/esbuild
TMP=$(mktemp -d)
printf "import { mountWorkshop, WORKSHOP_CSS } from './src/workshop.js';\nwindow.__WS = { mountWorkshop, WORKSHOP_CSS };\n" | \
  $ES --bundle --format=iife --minify --sourcefile=ws_entry.js --outfile=$TMP/ws.js --log-level=warning
python3 - "$TMP/ws.js" <<'PY'
import sys
js=open(sys.argv[1],encoding='utf-8').read().replace('</script','<\\/script')
html='''<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>构件工坊 · 独立测试</title>
<style>html,body{margin:0;height:100%;overflow:hidden;background:#dfe6ec}#host{position:fixed;inset:0}
#exitMsg{position:fixed;left:50%;top:40%;transform:translate(-50%,-50%);background:#0f2a44;color:#fff;padding:16px 22px;border-radius:12px;display:none;z-index:9;font-family:sans-serif}</style>
<script src="../data/workshop-data.js"></script>
</head><body><div id="host"></div><div id="exitMsg">onExit() 已调用（宿主应切回工地）<br><button onclick="this.parentNode.style.display='none'">好</button></div>
<script>'''+js+'''</script>
<script>
(function(){
  var st=document.createElement('style'); st.textContent=__WS.WORKSHOP_CSS; document.head.appendChild(st);
  window.__quiz=[];
  var ws=__WS.mountWorkshop(document.getElementById('host'),{
    onExit:function(){document.getElementById('exitMsg').style.display='block';},
    onQuiz:function(r){window.__quiz.push(r);console.log('onQuiz',JSON.stringify(r));}
  });
  window.__ws=ws;
  var q=new URLSearchParams(location.search); ws.open(q.get('id')||undefined);
  window.addEventListener('resize',function(){ws.resize();});
})();
</script></body></html>'''
open('tools/ws_test.html','w',encoding='utf-8').write(html)
print('tools/ws_test.html', len(html)//1024, 'KB')
PY
rm -rf $TMP
