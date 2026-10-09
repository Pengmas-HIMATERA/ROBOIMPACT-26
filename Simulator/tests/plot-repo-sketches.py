"""Render measured trajectories from run-repo-sketches.mjs, using the existing SVG track."""
from pathlib import Path
import json, xml.etree.ElementTree as ET

SIM=Path(__file__).resolve().parents[1]
OUT=SIM/'output/repo-sketch-test'
data=json.loads((OUT/'results.json').read_text(encoding='utf-8'))
ET.register_namespace('','http://www.w3.org/2000/svg')
parts=['<svg xmlns="http://www.w3.org/2000/svg" width="1700" height="1060" viewBox="0 0 1700 1060"><rect width="1700" height="1060" fill="#f7f7f2"/><g font-family="Segoe UI,Arial,sans-serif">']
def text(x,y,s,size=22,color='#283e42',bold=False):
    parts.append(f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}" font-weight="{700 if bold else 400}">{s}</text>')
text(65,62,'ROBOIMPACT / UJI KODE REPO',34,bold=True)
text(65,103,'Arena 2 × 2 m · massa 550 g · loop 10 ms · tanpa gangguan · deadzone 60/45 PWM',22)
for x,kind,title,detail in [(65,'pid','PID / 3 sensor','18 / 0,01 / 5 · threshold 300 · PWM dasar 60'),(895,'bang-bang','BANG-BANG / 3 sensor','A0/A1/A2 · threshold 400 · PWM tetap 86')]:
    text(x,156,title,27,bold=True);text(x,190,detail,18)
    track=ET.parse(SIM/'assets/track.svg').getroot()
    for key,value in [('x',x),('y',220),('width',740),('height',740)]:track.set(key,str(value))
    parts.append(ET.tostring(track,encoding='unicode'))
    for side,color in [('left','#ce8d20'),('right','#2879b5')]:
        run=next(r for r in data['results'] if r['controller']==kind and r['massKg']==.55 and r['loopMs']==10 and r['startSide']==side)
        points=[(x+(p['x']/20+.5)*740,220+(-p['forward']/20+.5)*740) for p in run['trajectory']]
        pstr=' '.join(f'{a:.2f},{b:.2f}' for a,b in points)
        parts.append(f'<polyline points="{pstr}" fill="none" stroke="{color}" stroke-width="3.5" stroke-linejoin="round"/>')
        a,b=points[-1];parts.append(f'<circle cx="{a}" cy="{b}" r="7" fill="{color}" stroke="#fff" stroke-width="2"/>')
        result='zona finish' if run['outcome']=='finish-zone' else f'stop setelah {run["travelledMeters"]*100:.1f} cm'
        text(x,994 if side=='left' else 1025,f'Start {"kiri" if side=="left" else "kanan"}: {run["time"]} s · {result}',19,color)
text(65,1054,'Finish dinilai oleh zona simulator; sketch Arduino belum memiliki stop finish tersendiri.',15,'#687977')
parts.append('</g></svg>');(OUT/'comparison.svg').write_text(''.join(parts),encoding='utf-8')
print(OUT/'comparison.svg')
