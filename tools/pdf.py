import asyncio, os
from playwright.async_api import async_playwright
EXE='/workspace/skills/wise-motion/node_modules/.remotion/chrome-headless-shell/linux-arm64/chrome-headless-shell-linux-arm64/headless_shell'
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=EXE)
    pg=await b.new_page(); await pg.goto('file://'+os.path.abspath('docs/report.html')); await pg.wait_for_timeout(1500)
    await pg.pdf(path='docs/第一步确认稿-平面布置图与点位清单.pdf', format='A4', landscape=True, print_background=True)
    pg2=await b.new_page(viewport={'width':1105,'height':853}); await pg2.goto('file://'+os.path.abspath('docs/平面布置图.svg')); await pg2.screenshot(path='docs/平面布置图.png')
    await b.close()
asyncio.run(main())
