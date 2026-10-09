"""Compare the simulator test adapter with compiled, unmodified repo sketches.

Uses g++ and Arduino API mocks; this is not an Uno-target build.
"""
from pathlib import Path
import json, re, shutil, subprocess, tempfile

ROOT = Path(__file__).resolve().parents[2]
compiler = shutil.which('g++')
if not compiler:
    raise SystemExit('g++ is required for C++ parity verification')
samples = [
    [1000+i*10, 850 if bits&4 else 30, 850 if bits&2 else 30, 850 if bits&1 else 30]
    for i,bits in enumerate([2,4,6,1,3,5,7,0])
] + [
    [1219,30,30,30], [1220,30,30,30], [2619,30,30,30],
    [2620,30,30,30], [2700,30,850,30], [2710,400,400,400],
    [2800,401,30,401], [2810,30,30,30], [5809,30,30,30],
    [5810,30,30,30], [5820,850,850,850],
]
for i in range(150):
    samples.append([10010+i*10, 301+(i*67)%550, 300+(i*113)%551, 299+(i*43)%552])
mock = r'''
#include <iostream>
#include <iomanip>
#include <algorithm>
const int A0=14,A1=15,A2=16,A3=17,INPUT=0,OUTPUT=1,HIGH=1,LOW=0;
int adc[20]={}, pwm[20]={};unsigned long clockMs=0;
int analogRead(int pin){return adc[pin];}void pinMode(int,int){}void digitalWrite(int,int){}
void analogWrite(int pin,int value){pwm[pin]=value;}unsigned long millis(){return clockMs;}
void delay(unsigned long ms){clockMs+=ms;}
template<class T,class L,class H>T constrain(T x,L lo,H hi){return std::max(T(lo),std::min(T(hi),x));}
struct SerialMock{void begin(int){}template<class T>void print(T){}template<class T>void println(T){}void println(){}}Serial;
'''
with tempfile.TemporaryDirectory(prefix='roboimpact-sketch-parity-') as temp:
    temp=Path(temp)
    traces={}
    for kind,folder in [('pid','line_follower_pid'),('bang-bang','line_follower_bang_bang')]:
        source=ROOT/'code'/folder/(folder+'.ino')
        text=source.read_text(encoding='utf-8')
        prototypes='\n'.join(m.group(0)+';' for m in re.finditer(r'void\s+\w+\([^)]*\)',text))
        telemetry = '<< ",\\\"error\\\":" << error << ",\\\"integral\\\":" << integral << ",\\\"direction\\\":" << searchDirection' if kind=='pid' else ''
        # A0/A1/A2 are the three physical optical modules.
        main = r'''int main(){setup();unsigned long t;int l,c,r;std::cout<<std::setprecision(9);
while(std::cin>>t>>l>>c>>r){clockMs=t;adc[A0]=l;adc[A1]=c;adc[A2]=r;adc[A3]=l;loop();
std::cout<<"{\"left\":"<<pwm[11]<<",\"right\":"<<pwm[6] TELEMETRY <<"}\n";}}'''.replace('TELEMETRY',telemetry)
        cpp=temp/(folder+'.cpp');exe=temp/(folder+'.exe')
        cpp.write_text(mock+prototypes+'\n#include "'+source.as_posix()+'"\n'+main,encoding='utf-8')
        subprocess.run([compiler,'-std=c++17',str(cpp),'-o',str(exe)],check=True,capture_output=True,text=True)
        run=subprocess.run([str(exe)],input='\n'.join(' '.join(map(str,s)) for s in samples)+'\n',check=True,capture_output=True,text=True)
        traces[kind]=[json.loads(line) for line in run.stdout.splitlines()]
    payload=temp/'traces.json';payload.write_text(json.dumps({'samples':samples,'traces':traces}),encoding='utf-8')
    script=r'''
import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
import{repoController}from'./Simulator/tests/repo-sketch-adapter.mjs';
import{createFirmware}from'./Simulator/src/firmware.ts';
const data=JSON.parse(readFileSync(process.argv[1],'utf8'));
for(const kind of ['pid','bang-bang']){
 const folder=kind==='pid'?'line_follower_pid':'line_follower_bang_bang';
 const source=readFileSync(`code/${folder}/${folder}.ino`,'utf8');
 const adapter=repoController(source,kind);const state=createFirmware();
 data.samples.forEach(([time,...adc],i)=>{
  adapter.step(state,adc,time);const actual=data.traces[kind][i];
  assert.equal(state.pwmLeft,actual.left,`${kind} left PWM sample ${i}`);
  assert.equal(state.pwmRight,actual.right,`${kind} right PWM sample ${i}`);
  if(kind==='pid'){
   assert.ok(Math.abs(state.error-actual.error)<1e-6,`error ${i}`);
   assert.ok(Math.abs(state.integral-actual.integral)<1e-5,`integral ${i}`);
   assert.equal(state.searchDirection,actual.direction);
  }
 });
 console.log(`${kind}: ${data.samples.length} stateful C++/adapter samples agree (PWM and PID state).`);
}
'''
    run=subprocess.run(['node','--experimental-strip-types','--input-type=module','-e',script,str(payload)],cwd=ROOT,capture_output=True,text=True)
    print(run.stdout+run.stderr,end='')
    run.check_returncode()
