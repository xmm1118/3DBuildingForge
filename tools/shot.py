# 用法: uv run --with playwright==1.52.0 python tools/shot.py <outdir> <spec...>   spec = name:WxH:query
import sys, asyncio, os
from playwright.async_api import async_playwright
EXE='/workspace/skills/wise-motion/node_modules/.remotion/chrome-headless-shell/linux-arm64/chrome-headless-shell-linux-arm64/headless_shell'
out=sys.argv[1]; os.makedirs(out,exist_ok=True)
url='file://'+os.path.abspath(os.environ.get('PAGE','web/index.html'))
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=EXE,args=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    for spec in sys.argv[2:]:
      name,size,q=(spec.split(':',2)+[''])[:3]; w,h=map(int,size.split('x'))
      pg=await b.new_page(viewport={'width':w,'height':h},device_scale_factor=1, has_touch=(w<900 or h<500), is_mobile=(w<900 or h<500))
      errs=[]
      pg.on('console',lambda m: errs.append(m.type+': '+m.text) if m.type in('error','warning') else None)
      pg.on('pageerror',lambda e: errs.append('PAGEERROR '+str(e)))
      await pg.goto(url+('?'+q if q else ''))
      await pg.wait_for_timeout(int(os.environ.get('WAIT','6000')))
      js=os.environ.get('JS')
      if js: await pg.evaluate(js); await pg.wait_for_timeout(2500)
      await pg.screenshot(path=f'{out}/{name}.png')
      print(name, 'errors:', errs[:6])
      await pg.close()
    await b.close()
asyncio.run(main())
