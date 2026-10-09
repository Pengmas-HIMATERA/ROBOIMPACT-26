"""Compose general robot wiring using real Fritzing breadboard parts and connector geometry."""
from pathlib import Path
import xml.etree.ElementTree as ET
import re, math, csv
from html import escape

ROOT = Path(__file__).parent
P = ROOT / 'parts'
SVG = 'http://www.w3.org/2000/svg'
ET.register_namespace('', SVG)
WHITE = '#fafaf7'
RED, BLACK = '#d34545', '#303f4e'
COLORS = ['#c68a1c', '#7b68b4', '#268d82', '#5184c2', '#bf6783']

def multiply(m,n):
    a,b,c,d,e,f=m; A,B,C,D,E,F=n
    return (a*A+c*B,b*A+d*B,a*C+c*D,b*C+d*D,a*E+c*F+e,b*E+d*F+f)
def matrix(s):
    result=(1,0,0,1,0,0)
    for op,args in re.findall(r'(matrix|translate|scale|rotate)\(([^)]+)\)',s or ''):
        v=[float(x) for x in re.split(r'[ ,]+',args.strip())]
        if op=='matrix': m=tuple(v)
        elif op=='translate': m=(1,0,0,1,v[0],v[1] if len(v)>1 else 0)
        elif op=='scale': m=(v[0],0,0,v[-1],0,0)
        else:
            a=math.radians(v[0]);m=(math.cos(a),math.sin(a),-math.sin(a),math.cos(a),0,0)
            if len(v)==3:m=multiply(multiply((1,0,0,1,v[1],v[2]),m),(1,0,0,1,-v[1],-v[2]))
        result=multiply(result,m)
    return result

class Diagram:
    def __init__(self,n): self.n=n;self.items=[];self.connections=[]
    def label(self,x,y,s,size=18,color=BLACK,anchor='start',bold=False):
        self.items.append(f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}" text-anchor="{anchor}" font-weight="{700 if bold else 400}">{escape(s)}</text>')
    def wire(self,points,color=BLACK):
        p=' '.join(f'{x:.2f},{y:.2f}' for x,y in points)
        self.items.extend([f'<polyline points="{p}" fill="none" stroke="{WHITE}" stroke-width="8" stroke-linejoin="round"/>',f'<polyline points="{p}" fill="none" stroke="{color}" stroke-width="4" stroke-linejoin="round"/>'])
    def dot(self,point,color):
        x,y=point;self.items.append(f'<circle cx="{x}" cy="{y}" r="5" fill="{color}"/>')
    def tag(self,x,y,s,color):
        w=max(70,len(s)*9+20)
        self.items.append(f'<rect x="{x}" y="{y-18}" width="{w}" height="28" rx="4" fill="{WHITE}" stroke="{color}"/>')
        self.label(x+10,y+2,s,15,color,bold=True)
    def part(self,name,key,x,y,w):
        r=ET.parse(P/(name+'.svg')).getroot()
        vb=r.get('viewBox') or '0 0 '+r.get('width')+' '+r.get('height')
        vx,vy,vw,vh=map(float,vb.split());h=w*vh/vw
        pins={}
        def walk(el,parent):
            m=multiply(parent,matrix(el.get('transform')))
            eid=el.get('id','')
            if eid.startswith('connector') and (eid.endswith('pin') or eid.endswith('terminal')):
                a=el.attrib
                if 'cx' in a: px,py=float(a['cx']),float(a['cy'])
                else: px,py=float(a.get('x',0))+float(a.get('width',0))/2,float(a.get('y',0))+float(a.get('height',0))/2
                A,B,C,D,E,F=m
                pins[eid]=(x+(A*px+C*py+E-vx)*w/vw,y+(B*px+D*py+F-vy)*w/vw)
            for child in el:walk(child,m)
        walk(r,(1,0,0,1,0,0))
        for el in r.iter():
            if el.get('id'):el.set('id',key+'-'+el.get('id'))
            for attr,val in list(el.attrib.items()):
                if 'url(#' in val:el.set(attr,val.replace('url(#','url(#'+key+'-'))
                if attr.endswith('href') and val.startswith('#'):el.set(attr,'#'+key+'-'+val[1:])
        r.set('x',str(x));r.set('y',str(y));r.set('width',str(w));r.set('height',str(h));r.set('viewBox',vb)
        self.items.append(ET.tostring(r,encoding='unicode'))
        return pins
    def build(self):
        n=self.n
        self.items.append(f'<rect width="1600" height="1490" fill="{WHITE}"/>')
        self.label(70,65,'ROBOIMPACT / HARDWARE LINE FOLLOWER',31,bold=True)
        self.label(70,103,f'Arduino Uno R3 · L298N · motor TT · {n} modul IR analog · bisa untuk bang-bang atau PID',20)
        self.label(70,136,'Bentuk part Fritzing; kabel masuk ke konektor aslinya. Nama net yang sama berarti tersambung.',16,'#6d7982')
        uno=self.part('uno-r3','uno',250,650,640)
        driver=self.part('l298n','driver',1030,650,370)
        ml=self.part('tt-motor','motor-a',1030,200,340)
        mr=self.part('tt-motor','motor-b',1030,414,340)
        self.label(1320,198,'MOTOR KIRI / A',17,bold=True)
        self.label(1320,412,'MOTOR KANAN / B',17,bold=True)
        self.label(270,1160,'ARDUINO UNO R3',21,bold=True)
        self.label(1050,1050,'L298N · kanal A / B',21,bold=True)
        self.label(1050,1080,'Lepas jumper ENA, ENB dan 5V-EN*',15,'#6d7982')
        for i in range(n):
            sx=120+i*(650/(n-1))
            pins=self.part('ky-033',f'sensor{i}',sx,190,95)
            self.items.append(f'<rect x="{sx+14}" y="198" width="67" height="37" rx="6" fill="#1d2530"/><ellipse cx="{sx+31}" cy="213" rx="12" ry="13" fill="#3c537b" stroke="#8995a7"/><ellipse cx="{sx+63}" cy="213" rx="12" ry="13" fill="#d8e1e5" stroke="#8995a7"/>')
            self.label(sx+47,180,f'S{i+1} → A{i}',16,anchor='middle',bold=True)
            self.label(sx+47,486,'AO / DO / GND / VCC',12,anchor='middle')
            ao=pins['connector0terminal'];gnd=pins['connector2terminal'];vcc=pins['connector3terminal']
            # AO-to-ADC cables run around the outside of the Uno, clear of the board.
            dest=uno[f'connector{i}pin'];lane=45+i*18;level=1200+i*14
            self.wire([ao,(ao[0],515+i*12),(lane,515+i*12),(lane,level),(dest[0],level),dest],COLORS[i])
            self.label(dest[0],dest[1]-22,f'A{i}',13,COLORS[i],anchor='middle',bold=True)
            self.wire([gnd,(gnd[0],496)],BLACK);self.dot((gnd[0],496),BLACK)
            # Use net labels to keep sensor power wires from hiding AO connectors.
            self.wire([vcc,(vcc[0]+18,vcc[1]),(vcc[0]+18,456)],RED)
            self.tag(vcc[0]-10,446,'5V_REG',RED)
            self.connections += [(f'S{i+1}.AO',f'Uno.A{i}',f'ANALOG_{i}'),(f'S{i+1}.GND','GND','GND'),(f'S{i+1}.VCC','5V_REG','5V_REG')]
        self.wire([(170,496),(900,496)],BLACK);self.tag(900,496,'GND',BLACK)
        for i in range(n):
            sx=120+i*(650/(n-1));self.dot((sx+317.40402495*95/530.31495,496),BLACK)
        # Exact Uno header positions from the Fritzing connector metadata.
        controls=[('D11',54,'ENA',4),('D10',53,'IN1',5),('D9',52,'IN2',6),('D8',51,'IN3',7),('D7',68,'IN4',8),('D6',67,'ENB',9)]
        for i,(u,uid,d,did) in enumerate(controls):
            a=uno[f'connector{uid}pin'];b=driver[f'connector{did}pin'];lane=1540-i*19;y=555+i*13
            c='#459179' if i<3 else '#527eb4'
            self.wire([a,(a[0],y),(lane,y),(lane,b[1]),b],c)
            self.label(a[0],a[1]+35,u,12,c,anchor='middle',bold=True)
            self.label(lane-2,y-5,d,12,c,anchor='end')
            self.connections.append((f'Uno.{u}',f'L298N.{d}',d))
        for motor,ids,lane in [(ml,[10,11],980),(mr,[13,14],995)]:
            for j,did in enumerate(ids):
                a=driver[f'connector{did}pin'];b=motor[f'connector{j}pin']
                c='#c88524' if j==0 else '#8c669f'
                self.wire([a,(a[0],a[1]+(22 if did>=13 else -22)),(lane+j*15,a[1]+(22 if did>=13 else -22)),(lane+j*15,b[1]),b],c)
                self.connections.append((f'L298N.OUT{j+1 if did<13 else j+3}',f'Motor{ "A" if did<13 else "B"}.terminal{j+1}','MOTOR'))
        for did,label,c,dy in [(1,'VMOTOR',RED,0),(2,'GND',BLACK,35),(3,'5V_REG',RED,70)]:
            a=driver[f'connector{did}pin'];bx=1445+dy
            self.wire([a,(bx,a[1]),(bx,1012+dy)],c);self.tag(bx-40,1030+dy,label,c)
        g=uno['connector88pin'];self.wire([g,(g[0],1135)],BLACK);self.tag(g[0]-20,1155,'GND',BLACK)
        # USB regulated input shown as a power cable, never as an invented GPIO pin.
        self.wire([(260,758),(185,758),(185,641)],RED);self.tag(160,623,'USB 5V_REG',RED)
        self.connections += [('USB.VBUS','5V_REG','5V_REG'),('Uno.GND','GND','GND'),('L298N.5V','5V_REG','5V_REG'),('L298N.GND','GND','GND'),('L298N.VS','VMOTOR','VMOTOR')]
        self.power_panel()
        self.label(70,1412,'*Jumper / urutan pin bergantung varian modul. AO dipakai; DO tidak terhubung. Atur tegangan regulator sebelum merakit.',15,'#6d7982')
        self.label(70,1445,'Kiri / A: EN11, IN10/9 · Kanan / B: EN6, IN8/7. Sensor kiri → tengah → kanan: A0, A1, A2.',15,'#6d7982')
        self.label(70,1475,'Part vektor: Fritzing / althaus; Yohendry; Peter Van Epp. Referensi dan perbedaan sketch ada di README hardware.',13,'#87919a')
        out=ROOT/f'wiring-{n}-sensor.svg'
        out.write_text(f'<svg xmlns="{SVG}" width="1600" height="1490" viewBox="0 0 1600 1490"><title>Wiring umum line follower {n} sensor</title><g font-family="Segoe UI,Arial,sans-serif">'+''.join(self.items)+'</g></svg>',encoding='utf-8')
        with (ROOT/f'connections-{n}-sensor.csv').open('w',newline='',encoding='utf-8') as f:
            w=csv.writer(f);w.writerow(['from','to','net']);w.writerows(self.connections)
        print(out)
    def power_panel(self):
        self.items.append('<rect x="900" y="1175" width="630" height="205" rx="14" fill="#eef0eb"/>')
        self.label(920,1207,'DAYA BERSAMA UNTUK SEMUA ALGORITMA',16,bold=True)
        self.items.append('<rect x="918" y="1226" width="157" height="119" rx="7" fill="#30383c"/>')
        for x in [928,1001]:
            self.items.append(f'<rect x="{x}" y="1234" width="63" height="101" rx="13" fill="#417cb2"/><rect x="{x+17}" y="1228" width="29" height="7" fill="#b2b6b7"/>')
            self.label(x+31,1290,'18650',12,'#fff',anchor='middle')
        self.label(920,1365,'Paket 2S berproteksi',12)
        self.wire([(1075,1250),(1090,1250)],RED)
        self.items.append('<path d="M1090 1250 L1100 1250 L1120 1238 M1125 1250 L1140 1250" stroke="#303f4e" stroke-width="3" fill="none"/>')
        self.label(1110,1230,'SW',13,anchor='middle')
        self.wire([(1140,1250),(1152,1250),(1152,1309),(1170,1309)],RED)
        self.wire([(1152,1250),(1170,1250)],RED);self.dot((1152,1250),RED)
        for y,word,net in [(1230,'Regulator 5 V','5V_REG'),(1289,'Regulator motor','VMOTOR')]:
            self.items.append(f'<rect x="1170" y="{y}" width="160" height="42" rx="5" fill="#fff" stroke="#879a94"/>')
            self.label(1250,y+26,word,14,anchor='middle');self.wire([(1330,y+20),(1370,y+20)],RED);self.tag(1370,y+20,net,RED)
        self.label(1090,1352,'VMOTOR sesuai rating motor; contoh 6 V.',12)
        self.label(1090,1371,'GND bersama untuk seluruh rangkaian.',12)
        self.connections += [('Battery2S.+','Switch.IN','VBAT'),('Switch.OUT','Regulator5V.IN+','VBAT_SWITCHED'),('Switch.OUT','RegulatorMotor.IN+','VBAT_SWITCHED'),('Regulator5V.OUT+','5V_REG','5V_REG'),('RegulatorMotor.OUT+','VMOTOR','VMOTOR')]
        self.connections += [(node,'GND','GND') for node in ['Battery2S.-','Regulator5V.IN-','Regulator5V.OUT-','RegulatorMotor.IN-','RegulatorMotor.OUT-','USB.GND']]

for n in [3,5]: Diagram(n).build()
