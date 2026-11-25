# 生成离线单文件版：内嵌数据、程序与照片（NOPHOTOS=1 时不内嵌照片）
import base64, glob, os, json
os.makedirs('dist', exist_ok=True)
html = open('web/index.html', encoding='utf-8').read()
FILES = ['shapan-data.js', 'stages-data.js', 'dashboard-data.js', 'scenarios.js', 'teach-data.js', 'green-data.js', 'greenlife-data.js', 'ops-data.js', 'workshop-data.js']
data = '\n'.join(open('web/data/' + f, encoding='utf-8').read() for f in FILES if os.path.exists('web/data/' + f))
app = open('web/app.js', encoding='utf-8').read()
photos = {}
if not os.environ.get('NOPHOTOS'):
    for f in sorted(glob.glob('web/photos/*.jpg')):
        photos[os.path.basename(f)[:-4]] = 'data:image/jpeg;base64,' + base64.b64encode(open(f, 'rb').read()).decode()
ph = 'window.SHAPAN_PHOTOS=' + json.dumps(photos) + ';window.SHAPAN_PHOTO_LIST=[];'
html = html.replace('<script src="data/shapan-data.js"></script>', '<script>' + data.replace('</script', '<\\/script') + '\n' + ph + '</script>')
for f in FILES[1:] + ['photo-list.js']:
    html = html.replace(f'<script src="data/{f}"></script>', '')
html = html.replace('<script src="app.js"></script>', '<script>' + app.replace('</script', '<\\/script') + '</script>')
open('dist/工程沙盘虚拟仿真-离线版.html', 'w', encoding='utf-8').write(html)
print('single', round(len(html.encode()) / 1e6, 2), 'MB', 'photos', len(photos))
