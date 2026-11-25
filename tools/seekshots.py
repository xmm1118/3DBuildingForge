# 用法: python tools/seekshots.py outdir WxH "STAGE:step:k" ...
import asyncio,os,sys
from playwright.async_api import async_playwright
EXE='/workspace/skills/wise-motion/node_modules/.remotion/chrome-headless-shell/linux-arm64/chrome-headless-shell-linux-arm64/headless_shell'
out=sys.argv[1]; os.makedirs(out,exist_ok=True); w,h=map(int,sys.argv[2].split('x'))
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=EXE,args=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=await b.new_page(viewport={'width':w,'height':h})
    errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
    await pg.goto('file://'+os.path.abspath(os.environ.get('PAGE','web/index.html'))+'?'+os.environ.get('Q','')); await pg.wait_for_timeout(3000)
    for spec in sys.argv[3:]:
      st,i,k=spec.split(':')
      await pg.evaluate(f"__shapan.setStage('{st}',true);__shapan.proc.seek('{st}',{i},{k})"); await pg.wait_for_timeout(2600)
      await pg.screenshot(path=f'{out}/{st}_{i}.png')
    print('errors',errs)
    await b.close()
asyncio.run(main())
