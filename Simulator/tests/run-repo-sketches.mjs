import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {advance,createState,DT} from '../src/model.ts';
import {repoController} from './repo-sketch-adapter.mjs';
const output=new URL('../output/repo-sketch-test/',import.meta.url);mkdirSync(output,{recursive:true});
const results=[];
for(const kind of ['pid','bang-bang']){
 const path=new URL(`../../code/line_follower_${kind==='pid'?'pid':'bang_bang'}/line_follower_${kind==='pid'?'pid':'bang_bang'}.ino`,import.meta.url);
 const source=readFileSync(path,'utf8');
 for(const massKg of [.3,.55,1.2])for(const loopMs of [1,10,20])for(const startSide of ['left','right']){
  const adapter=repoController(source,kind);
  const config={controller:kind,kp:0,ki:0,kd:0,pushStrength:6,bias:0,speed:1,loopMs,swapMotors:false,massKg,track:'pdf',boardMeters:2,startSide};
  const s=createState(config);s.nextLoopMs=adapter.settings.startupMs;
  const trajectory=[];let nextSample=0,stallSince=null;
  while(s.t<120&&!s.finished){
   advance(s,config,adapter.step);
   if(s.t>=nextSample){trajectory.push({t:s.t,x:s.x,forward:s.forward,pwm:[s.firmware.pwmLeft,s.firmware.pwmRight],mode:s.firmware.mode});nextSample+=.25;}
   const still=s.t>1.5&&Math.abs(s.leftMotor)+Math.abs(s.rightMotor)<.002;
   stallSince=still?(stallSince??s.t):null;
   if(stallSince!==null&&s.t-stallSince>3)break;
   if(Math.abs(s.x)>10.5||Math.abs(s.forward)>10.5)break;
  }
  const outcome=s.finished?'finish-zone':stallSince!==null&&s.t-stallSince>3?'stalled':Math.abs(s.x)>10.5||Math.abs(s.forward)>10.5?'left-arena':'timeout';
  const result={controller:kind,massKg,loopMs,startSide,outcome,time:Number(s.t.toFixed(2)),stationarySince:outcome==='stalled'?Number(stallSince.toFixed(2)):null,travelledMeters:Number((s.travelled*.1).toFixed(3)),lastPWM:[s.firmware.pwmLeft,s.firmware.pwmRight],lastADC:s.sensors,mode:s.firmware.mode,settings:adapter.settings,trajectory};
  results.push(result);
  if(massKg===.55&&loopMs===10)console.log(JSON.stringify({...result,trajectory:undefined}));
 }
}
writeFileSync(new URL('results.json',output),JSON.stringify({conditions:{arenaMeters:2,noDisturbance:true,limitSeconds:120,finish:'External simulator zone judge; neither sketch implements finish latch.',motor:'Existing deadzone 60/45 and inertia; raw sketch PWM.'},results},null,2));
console.log('Saved 36 runs:',new URL('results.json',output).pathname);
