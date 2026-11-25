# 构件工坊截图：每个构件的 构造(拆解) / 安装工艺(中间一步) / 小测，拼成 1920×1080 联系表，另加 844×390 手机横屏图
# 120s 限时环境可分段跑：python tools/ws_shot.py main pc-column comp-beam | steps pc-column | misc | sheet（不带参数=全部）
# 运行：mkdir -p ~/.fonts; cp /workspace/fonts/NotoSansCJK-*.ttc ~/.fonts; fc-cache
#       bash tools/ws_build.sh
#       uv run -q --with playwright==1.52.0 --with pillow python tools/ws_shot.py > /tmp/ws_shot.log 2>&1
import os, sys, json, time
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(os.environ.get('WS_OUT', ROOT / '..' / 'work' / 'ws_shots')).resolve(); OUT.mkdir(parents=True, exist_ok=True)
URL = (ROOT / 'tools' / 'ws_test.html').as_uri()
CHROME = '/workspace/skills/wise-motion/node_modules/.remotion/chrome-headless-shell/linux-arm64/chrome-headless-shell-linux-arm64/headless_shell'
IDS = ['pc-column', 'comp-beam', 'comp-slab', 'pc-stair', 'pc-wall']
NAMES = {'pc-column': '预制柱', 'comp-beam': '叠合梁', 'comp-slab': '叠合板', 'pc-stair': '预制楼梯', 'pc-wall': '外墙板'}
MID = {'pc-column': 5, 'comp-beam': 4, 'comp-slab': 1, 'pc-stair': 4, 'pc-wall': 3}   # 截哪一步（0 起）
EXPL = {'pc-column': .75, 'comp-beam': .7, 'comp-slab': .7, 'pc-stair': .7, 'pc-wall': .75}
errors = []

def page_for(b, w, h, cid=None):
    p = b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=1)
    p.on('console', lambda m: errors.append(f'[{w}x{h}] {m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    p.on('pageerror', lambda e: errors.append(f'[{w}x{h}] pageerror: {e}'))
    p.goto(URL + (f'?id={cid}' if cid else ''))
    p.wait_for_timeout(900)
    return p

def set_explode(p, v, sel=None, trans=False):
    p.evaluate("""([v,trans])=>{const r=document.querySelector('.ws-ex');r.value=v;r.dispatchEvent(new Event('input'));
      const t=document.querySelector('.ws-tr'); if(t.checked!==trans){t.checked=trans;t.dispatchEvent(new Event('change'));}}""", [v, trans])
    if sel: p.click(f'.ws-chip[data-p="{sel}"]')
    p.wait_for_timeout(500)

def proc_mid(p, i, wait=4200):
    p.click('.ws-tab[data-tab="proc"]'); p.wait_for_timeout(300)
    p.evaluate("i=>{const l=document.querySelector('.ws-list');l.classList.add('ws-open');document.querySelector(`.ws-steps [data-i=\"${i}\"]`).click();}", i)
    p.wait_for_timeout(200); p.click('.ws-play'); p.wait_for_timeout(wait); p.click('.ws-play'); p.wait_for_timeout(300)

def quiz(p, answer=True):
    p.click('.ws-tab[data-tab="quiz"]'); p.wait_for_timeout(300)
    if answer:
        n = p.evaluate("document.querySelectorAll('.ws-q').length")
        for qi in range(n): p.click(f'.ws-opt[data-q="{qi}"][data-o="{(qi + 1) % 2}"]')
        p.click('.ws-sub'); p.wait_for_timeout(300)

SEL = {'pc-column': 'sleeves', 'comp-beam': 'key', 'comp-slab': 'truss', 'pc-stair': 'upperSeat', 'pc-wall': 'ties'}
args = sys.argv[1:] or ['all']
phase, ids = args[0], (args[1:] or IDS)
def run_main(b, cid):
    p = page_for(b, 1280, 860, cid)
    set_explode(p, EXPL[cid], SEL[cid]); p.screenshot(path=str(OUT / f'{cid}-s.png'))
    set_explode(p, 0, None, True); p.screenshot(path=str(OUT / f'{cid}-trans.png'))
    proc_mid(p, MID[cid]); p.screenshot(path=str(OUT / f'{cid}-p.png'))
    quiz(p); p.screenshot(path=str(OUT / f'{cid}-q.png'))
    print(cid, 'quiz cb:', p.evaluate('JSON.stringify(window.__quiz)'))
    p.close()
def run_steps(b, cid):
    p = page_for(b, 1100, 720, cid)
    p.click('.ws-tab[data-tab="proc"]'); p.wait_for_timeout(200)
    n = p.evaluate("document.querySelectorAll('.ws-steps li').length")
    for i in range(n):
        p.evaluate("i=>document.querySelector(`.ws-steps [data-i=\"${i}\"]`).click()", i); p.click('.ws-play'); p.wait_for_timeout(3000); p.click('.ws-play'); p.wait_for_timeout(150)
        p.screenshot(path=str(OUT / f'{cid}-step{i + 1}.png'))
    p.close()
def run_misc(b):
    p = page_for(b, 1440, 900); p.wait_for_timeout(600); p.screenshot(path=str(OUT / 'gallery.png')); p.close()
    p = page_for(b, 844, 390, 'pc-column'); proc_mid(p, 5, 3800)
    p.evaluate("document.querySelector('.ws-list').classList.remove('ws-open')"); p.wait_for_timeout(300)
    p.screenshot(path=str(OUT / 'phone-land-proc.png'))
    p.click('.ws-tab[data-tab="struct"]'); p.click('.ws-tgl'); p.wait_for_timeout(400); p.screenshot(path=str(OUT / 'phone-land-drawer.png'))
    set_explode(p, .7, 'sleeves'); p.evaluate("document.querySelector('.ws-list').classList.remove('ws-open')"); p.wait_for_timeout(400); p.screenshot(path=str(OUT / 'phone-land-struct.png'))
    quiz(p, False); p.screenshot(path=str(OUT / 'phone-land-quiz.png')); p.close()
    p = page_for(b, 390, 844, 'comp-slab'); set_explode(p, .7, 'truss'); p.screenshot(path=str(OUT / 'phone-port-struct.png'))
    proc_mid(p, 1); p.screenshot(path=str(OUT / 'phone-port-proc.png')); p.close()
    p = page_for(b, 1024, 768, 'pc-wall'); proc_mid(p, 3); p.screenshot(path=str(OUT / 'tablet-proc.png')); p.close()
if phase != 'sheet':
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path=CHROME, args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        if phase in ('main', 'all'): [run_main(b, c) for c in ids]
        if phase in ('steps', 'all'): [run_steps(b, c) for c in ids]
        if phase in ('misc', 'all'): run_misc(b)
        b.close()
    print('ERRORS', len(errors)); [print(e) for e in errors[:60]]
    if phase not in ('sheet', 'all'): sys.exit(0)

# 联系表 1920×1080：5 列（构件）× 3 行（构造拆解 / 工艺中间步 / 小测）
font = ImageFont.truetype('/workspace/fonts/NotoSansCJK-Bold.ttc', 30, index=2)
small = ImageFont.truetype('/workspace/fonts/NotoSansCJK-Regular.ttc', 20, index=2)
W, H = 1920, 1080; sheet = Image.new('RGB', (W, H), (238, 242, 245)); d = ImageDraw.Draw(sheet)
d.text((24, 14), '构件工坊 · 预览（构造拆解 / 安装工艺 / 小测）', font=font, fill=(15, 42, 68))
top, lab = 70, 36; cw = (W - 24 * 2 - 12 * 4) // 5; ch = (H - top - lab - 16 - 10 * 2) // 3
for c, cid in enumerate(IDS):
    x = 24 + c * (cw + 12); d.text((x, top - 6), NAMES[cid], font=small, fill=(15, 42, 68))
    for r, k in enumerate('spq'):
        im = Image.open(OUT / f'{cid}-{k}.png').convert('RGB')
        if k in 'sp': im = im.crop((0, 0, 910, im.height))
        iw, ih = im.size
        sc = max(cw / iw, ch / ih); im = im.resize((int(iw * sc), int(ih * sc)), Image.LANCZOS)
        ox, oy = (im.width - cw) // 2, (im.height - ch) // 2; im = im.crop((ox, oy, ox + cw, oy + ch))
        sheet.paste(im, (x, top + lab - 10 + r * (ch + 10)))
docs = ROOT / 'docs'
sheet.save(docs / '构件工坊预览.jpg', quality=88)
Image.open(OUT / 'phone-land-proc.png').convert('RGB').save(docs / '构件工坊预览-手机横屏.jpg', quality=90)
print('saved', docs / '构件工坊预览.jpg')
