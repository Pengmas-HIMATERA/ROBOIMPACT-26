"""Render a deterministic, editable wiring illustration; no CAD libraries needed."""
from pathlib import Path
from html import escape

OUT = Path(__file__).parent
parts = []
def rect(x,y,w,h,fill,rx=12,stroke='none'):
    parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}"/>')
def text(x,y,value,size=18,fill='#24354a',anchor='start',weight=400):
    parts.append(f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}" text-anchor="{anchor}" font-weight="{weight}">{escape(value)}</text>')
def wire(points,color,width=4):
    p=' '.join(f'{x},{y}' for x,y in points)
    parts.append(f'<polyline points="{p}" fill="none" stroke="#f5f7fa" stroke-width="{width+4}" stroke-linejoin="round"/>')
    parts.append(f'<polyline points="{p}" fill="none" stroke="{color}" stroke-width="{width}" stroke-linejoin="round"/>')
def pin(x,y,label='',color='#dce6ee',anchor='middle'):
    parts.append(f'<circle cx="{x}" cy="{y}" r="5" fill="{color}" stroke="#182436" stroke-width="1.5"/>')
    if label: text(x,y-12,label,14,'#fff',anchor)
def tag(x,y,label,color):
    rect(x,y-18,110,29,'#fff',5,color);text(x+55,y+3,label,14,color,'middle',700)

RED='#d94c4c'; BLACK='#344150'; BLUE='#367ee6'; GREEN='#349b78'; PURPLE='#916acb'; ORANGE='#db8a28'
rect(0,0,1600,1360,'#f5f7fa',0)
text(70,65,'ROBOIMPACT / BANG-BANG',32,weight=700)
text(70,102,'Wiring dasar · Arduino Uno R3 · L298N · 3 sensor analog · 2 sel Li-ion seri',20)
text(70,135,'Ilustrasi modul; posisi terminal digambar ulang. Ikuti nama pin, bukan posisi gambar.',16,'#65768a')

# Sensor cards: board-like visual, explicit labels rather than guessed pin order.
for x,name,adc,col in [(100,'KIRI','A0',BLUE),(380,'TENGAH','A1',PURPLE),(660,'KANAN','A2',ORANGE)]:
    text(x+110,190,f'SENSOR {name}',18,anchor='middle',weight=700)
    rect(x,210,220,200,'#245b9b')
    rect(x+22,232,75,52,'#d5dcea',5);rect(x+31,242,56,31,'#667c9a',3)
    parts.append(f'<circle cx="{x+60}" cy="257" r="13" fill="#b5bfcc"/>')
    rect(x+122,243,72,35,'#142a48',3);text(x+110,325,'IR + LM393',20,'#fff','middle',700)
    text(x+110,354,'Modul dengan AO',15,'#c7ddf6','middle')
    for dx,label in [(40,'VCC'),(100,'GND'),(160,'AO'),(195,'DO')]: pin(x+dx,410,label)
    text(x+195,435,'NC',12,'#65768a','middle')
    wire([(x+40,410),(x+40,465)],RED)
    wire([(x+100,410),(x+100,495)],BLACK)
    # Signal ends at the matching analog header of the Uno.
    dest={'A0':210,'A1':270,'A2':330}[adc]
    level={'A0':520,'A1':534,'A2':548}[adc]
    wire([(x+160,410),(x+160,level),(dest,level),(dest,580)],col)

# Buses: crossover halos distinguish crossings from soldered junctions.
wire([(100,465),(1180,465)],RED)
wire([(100,495),(1280,495)],BLACK)
for x in [140,420,700]: parts.append(f'<circle cx="{x}" cy="465" r="6" fill="{RED}"/>')
for x in [200,480,760]: parts.append(f'<circle cx="{x}" cy="495" r="6" fill="{BLACK}"/>')
tag(1000,448,'+5V REG',RED);wire([(1055,465),(1055,459)],RED);tag(1280,498,'GND',BLACK)

# Arduino simplified breadboard-style component.
rect(100,580,550,300,'#248f9f')
for x in [120,630]:
    for y in [600,860]: parts.append(f'<circle cx="{x}" cy="{y}" r="8" fill="#f5f7fa" stroke="#b7cace" stroke-width="3"/>')
text(360,641,'ARDUINO',30,'#fff','middle',700);text(360,681,'UNO R3',36,'#fff','middle',700)
rect(275,724,180,48,'#172d39',3)
for x,label in [(210,'A0'),(270,'A1'),(330,'A2')]:
    pin(x,580);text(x,605,label,14,'#fff','middle')
rect(88,704,61,60,'#cdd6df',4);text(165,732,'USB-B: 5 V',17,'#fff')
wire([(100,740),(70,740),(70,465),(100,465)],RED)
wire([(100,792),(40,792),(40,495),(100,495)],BLACK);pin(100,792);text(165,796,'GND',17,'#fff')
text(360,823,'VIN tidak dipakai',15,'#d6f2f4','middle')

# Driver, six direct control lines, two output channels.
rect(950,580,300,300,'#ba4949')
rect(1020,618,175,110,'#23303f',5)
for x in range(1032,1190,20): rect(x,625,8,95,'#405062',1)
text(1100,769,'L298N',27,'#fff','middle',700)
text(1100,804,'ENA / ENB: jumper OFF',15,'#fff','middle')
text(1100,832,'5V-EN: jumper OFF*',15,'#fff','middle')
controls=[('D11 ~','ENA',600,GREEN),('D10','IN1',644,GREEN),('D9','IN2',688,GREEN),('D8','IN3',732,BLUE),('D7','IN4',776,BLUE),('D6 ~','ENB',820,BLUE)]
for uno,driver,y,color in controls:
    text(623,y-11,uno,16,'#fff','end');pin(650,y)
    wire([(650,y),(950,y)],color);pin(950,y)
    text(966,y+5,driver,15,'#fff')
for x,label in [(1020,'VS'),(1110,'5V'),(1200,'GND')]:
    pin(x,580);text(x,606,label,14,'#fff','middle')
wire([(1110,580),(1110,465)],RED);wire([(1200,580),(1200,495)],BLACK)
wire([(1020,580),(1020,560),(1032,560)],ORANGE);tag(1032,560,'+6V MOTOR',ORANGE)
for name,y,labels in [('KIRI',600,['OUT1','OUT2']),('KANAN',776,['OUT3','OUT4'])]:
    rect(1380,y-25,155,115,'#e9c53c')
    parts.append(f'<circle cx="1470" cy="{y+30}" r="26" fill="#fff1ae" stroke="#a78a23" stroke-width="3"/>')
    text(1455,y+112,f'MOTOR {name}',16,anchor='middle',weight=700)
    for dy,label,color in [(0,labels[0],GREEN),(44,labels[1],BLUE)]:
        pin(1250,y+dy);text(1262,y+dy-10,label,13)
        wire([(1250,y+dy),(1380,y+dy)],color);pin(1380,y+dy)

text(100,938,'DAYA / Semua GND tersambung',24,weight=700)
rect(100,974,310,230,'#293849')
for x in [122,203]:
    rect(x,1005,63,141,'#769cca',20);text(x+31,1080,'18650',15,'#fff','middle')
text(320,1035,'2S',27,'#fff','middle',700);text(320,1070,'7,4 V',21,'#fff','middle')
text(320,1099,'8,4 V penuh',13,'#d3e3f4','middle')
text(255,1180,'Paket dengan proteksi 2S',16,'#fff','middle')
wire([(410,1010),(460,1010)],RED)
parts.append('<path d="M460 1010 L475 1010 M475 1010 L510 992 M515 1010 L535 1010" stroke="#344150" stroke-width="4" fill="none"/>')
text(480,972,'SW1',15,anchor='middle');wire([(535,1010),(555,1010),(555,1135)],RED)
wire([(410,1160),(540,1160),(540,1060),(615,1060)],BLACK)
wire([(540,1160),(540,1175),(615,1175)],BLACK);tag(420,1193,'GND',BLACK)
for y,voltage,col in [(985,5,RED),(1100,6,ORANGE)]:
    rect(615,y,310,90,'#608e82');text(770,y+34,f'BUCK → {voltage} V',23,'#fff','middle',700)
    text(770,y+65,'Set sebelum koneksi',13,'#e7f2ed','middle')
    text(639,y+29,'IN+',12,'#fff');text(639,y+79,'IN−',12,'#fff')
    text(902,y+29,'OUT+',12,'#fff','end');text(902,y+79,'OUT−',12,'#fff','end')
    wire([(555,y+25),(615,y+25)],RED);pin(615,y+25)
    wire([(925,y+25),(970,y+25)],col);tag(970,y+25,'+5V REG' if voltage==5 else '+6V MOTOR',col)
    pin(615,y+75);pin(925,y+75);tag(967,y+75,'GND',BLACK);wire([(925,y+75),(967,y+75)],BLACK)

for x,y,c in [(555,1010,RED),(555,1125,RED),(540,1060,BLACK),(540,1160,BLACK)]:
    parts.append(f'<circle cx="{x}" cy="{y}" r="5" fill="{c}"/>')
wire([(475,1160),(475,1175)],BLACK)

text(1140,996,'REGULASI TERPISAH',18,weight=700)
text(1140,1030,'5 V → USB Uno, sensor, logika L298N',16)
text(1140,1061,'6 V → VS L298N untuk kanal motor',16)
text(1140,1092,'Sesuaikan VS dengan rating motor.',16)
text(1140,1123,'Jangan hubungkan baterai ke 5V Uno.',16,RED)
text(1140,1160,'*Cek fungsi jumper pada modul sendiri.',14,'#65768a')
text(70,1255,'● Titik = tersambung  |  Persilangan tanpa titik = tidak tersambung  |  NC = tidak dipakai',17)
text(70,1290,'~ = PWM   |   Sensor harus punya AO. Modul DO-only membutuhkan pembacaan digital dan kode berbeda.',16)
text(70,1320,'Pin motor mengikuti sketch bang-bang asli (kiri EN11, kanan EN6); label sisi simulator memakai pemetaan berbeda.',15,'#65768a')

svg='<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1360" viewBox="0 0 1600 1360" role="img"><title>Wiring bang-bang tiga sensor Arduino Uno dan L298N</title><g font-family="Segoe UI,Arial,sans-serif">'+''.join(parts)+'</g></svg>'
(OUT/'wiring-3-sensor.svg').write_text(svg,encoding='utf-8')
print(OUT/'wiring-3-sensor.svg')
