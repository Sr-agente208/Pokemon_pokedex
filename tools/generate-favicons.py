"""Generate small local Pokeball-inspired PNG/ICO tab icons (standard library only)."""
from pathlib import Path
import re
import struct
import zlib

DESIGNS = {
    'index': ('poke', (239, 51, 64), None),
    'login': ('great', (42, 116, 219), 'red'),
    'cadastro': ('premier', (244, 244, 248), 'redband'),
    'favoritos': ('love', (242, 119, 179), 'heart'),
    'recuperar-senha': ('ultra', (42, 44, 55), 'yellow'),
    'historia': ('master', (134, 70, 192), 'master'),
    'sobre': ('safari', (105, 154, 80), 'spots'),
}
DARK = (23, 32, 51)

def pixel(a, b, top, pattern):
    r = a*a+b*b
    if r > 29**2:
        return (0, 0, 0, 0)
    c = DARK
    if r <= 25.5**2:
        c = top if b < 0 else (255, 255, 255)
        if b < -3:
            if pattern == 'red' and 13 < abs(a) < 20:
                c = (235, 65, 75)
            elif pattern == 'yellow' and (14 < abs(a) < 20 or b < -20):
                c = (249, 205, 49)
            elif pattern == 'master':
                if (abs(a)-17)**2+(b+12)**2 < 6**2:
                    c = (241, 109, 178)
                if -20 < b < -10 and (abs(abs(a)-6)<1.6 or abs(b+19-abs(a))<1.8 and abs(a)<6):
                    c = (255, 255, 255)
            elif pattern == 'spots' and any((a-x)**2+(b-y)**2 < 4**2 for x,y in [(-15,-13),(10,-18),(19,-7),(-3,-8)]):
                c = (62, 92, 53)
            elif pattern == 'heart':
                x,y = a/9, -(b+13)/8
                if (x*x+y*y-1)**3-x*x*y**3 <= 0:
                    c = (255,255,255)
    band = (220, 57, 69) if pattern == 'redband' else DARK
    if abs(b) < 3 or r <= 10**2:
        c = band
    if r <= 6**2:
        c = (255,255,255)
    return (*c,255)

def png(top, pattern):
    rows=[]
    for y in range(64):
        row=bytearray()
        for x in range(64):
            samples=[pixel(x+(sx+.5)/4-32, y+(sy+.5)/4-32, top, pattern) for sy in range(4) for sx in range(4)]
            alpha=sum(c[3] for c in samples)
            row.extend([round(sum(c[i]*c[3] for c in samples)/alpha) if alpha else 0 for i in range(3)]+[round(alpha/16)])
        rows.append(b'\x00'+row)
    def chunk(t,d):
        return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',64,64,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(rows)))+chunk(b'IEND',b'')

root = Path(__file__).resolve().parents[1]
for folder in [root, root/'public', root/'docs']:
    assets=folder/'icons'
    assets.mkdir(exist_ok=True)
    for page,(name,top,pattern) in DESIGNS.items():
        image=png(top,pattern)
        (assets/(name+'.png')).write_bytes(image)
        (assets/(name+'.ico')).write_bytes(struct.pack('<HHH',0,1,1)+struct.pack('<BBBBHHII',64,64,0,0,1,32,len(image),22)+image)
        path=folder/(page+'.html')
        html=path.read_text()
        html=re.sub(r'<link\b[^>]*rel=[\"\'](?:shortcut )?icon[\"\'][^>]*>', '', html, flags=re.I)
        html=html.replace('</head>',f'<link rel="icon" type="image/png" sizes="64x64" href="icons/{name}.png?v=3"><link rel="icon" href="icons/{name}.ico?v=3" sizes="any"></head>')
        path.write_text(html)
