import { CHASSIS_LENGTH, CHASSIS_WIDTH, WHEEL_TRACK, SENSOR_FORWARD } from './robot.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createFirmware, firmwareLoop, SKETCH } from './firmware.ts';
import { advance, createState, pushRobot, DT } from './model.ts';
const gain = { kp: 18, ki: 0, kd: 5 };
const config = { ...gain, pushStrength: 6, bias: 0, speed: 1, loopMs: 10, swapMotors: false };
const center = [30,30,850,30,30], lost = [30,30,30,30,30];

test('constants match the active sketch', () => {
 const source = readFileSync(new URL('../code/line_follower_pid/line_follower_pid.ino', import.meta.url), 'utf8');
 for (const [symbol, value] of Object.entries({Kp:18,Ki:0,Kd:5,baseSpeedL:55,baseSpeedR:55,minSpeed:0,maxSpeed:90,sensorThreshold:100})) {
   assert.equal(Number(source.match(new RegExp('(?:float|int) '+symbol+'\\s*=\\s*([0-9.]+)'))?.[1]),value);
 }
 assert.match(source,/positions\[5\] = \{-10, -2, 0, 2, 10\}/);
});
test('startup delay and centered tracking produce 55/55 PWM', () => {
 const s=createFirmware(); firmwareLoop(s,center,999,gain); assert.equal(s.pwmLeft,0);
 firmwareLoop(s,center,1000,gain); assert.equal(s.mode,'tracking'); assert.equal(s.error,0);
 assert.equal(s.pwmLeft,55); assert.equal(s.pwmRight,55);
});
test('weighted ADC, derivative per loop, and integer PWM truncation', () => {
 const s=createFirmware(); firmwareLoop(s,[100,100,300,200,100],1000,gain);
 assert.ok(Math.abs(s.error-2/3)<1e-10);
 assert.ok(Math.abs(s.output-46/3)<1e-10);
 assert.equal(s.pwmLeft,70); assert.equal(s.pwmRight,39);
 firmwareLoop(s,[100,100,300,200,100],1010,gain);
 assert.equal(s.d,0); assert.equal(s.pwmLeft,67); assert.equal(s.pwmRight,43);
});
test('loss clears stale PID, bridges briefly, searches both sides, and latches timeout', () => {
 for(const side of [-1,1]) {
  const s=createFirmware(), sensors=[0,0,0,0,0]; sensors[side===1?4:0]=900;
  firmwareLoop(s,sensors,1000,gain);
  firmwareLoop(s,lost,1010,gain);
  assert.equal(s.output,0); assert.equal(s.d,0);assert.equal(s.integral,0);
  firmwareLoop(s,lost,1159,gain);assert.equal(s.mode,'coasting');assert.equal(s.pwmLeft,30);assert.equal(s.pwmRight,30);
  firmwareLoop(s,lost,1160,gain);assert.equal(s.mode,side===1?'search-right':'search-left');
  firmwareLoop(s,lost,1760,gain);assert.equal(s.mode,side===1?'search-left':'search-right');
  firmwareLoop(s,lost,4009,gain);assert.notEqual(s.mode,'lost-stop');
  firmwareLoop(s,lost,4010,gain);assert.equal(s.mode,'lost-stop');
  firmwareLoop(s,center,4020,gain);assert.equal(s.mode,'lost-stop');assert.equal(s.pwmLeft,0);assert.equal(s.pwmRight,0);
  assert.equal(createFirmware().mode,'startup');
 }
});
test('unknown direction searches instead of retaining PWM or staying stuck at startup', () => {
 const s=createFirmware();firmwareLoop(s,lost,1000,gain);
 firmwareLoop(s,lost,1150,gain);assert.equal(s.mode,'search-right');
 firmwareLoop(s,lost,1750,gain);assert.equal(s.mode,'search-left');
});
test('last small error updates search side and reacquisition suppresses derivative kick', () => {
 const s=createFirmware();firmwareLoop(s,[0,0,0,0,900],1000,gain);
 firmwareLoop(s,[0,900,0,0,0],1010,gain);assert.equal(s.searchDirection,-1);
 firmwareLoop(s,lost,1020,gain);firmwareLoop(s,lost,1170,gain);assert.equal(s.mode,'search-left');
 firmwareLoop(s,[0,0,0,900,0],1180,gain);assert.equal(s.d,0);assert.equal(s.mode,'tracking');assert.equal(s.lostSinceMs,null);
 firmwareLoop(s,center,1190,gain);assert.equal(s.d,-10);
 firmwareLoop(s,lost,1200,gain);assert.equal(s.lostSinceMs,1200);
});
test('integral accumulates even with Ki zero, clamps at 100, and resets on loss', () => {
 const s=createFirmware();
 for(let n=0;n<30;n++)firmwareLoop(s,[0,0,0,0,900],1000+n,gain);
 assert.equal(s.integral,100); assert.equal(s.i,0);
 firmwareLoop(s,[0,0,0,0,900],1100,{...gain,ki:1}); assert.equal(s.i,100);
 firmwareLoop(s,lost,1200,gain); assert.equal(s.integral,0);
});
test('plant stays centered without a push at each supported loop period', () => {
 for(const loopMs of [1,5,10,20]) {
  const s=createState();for(let n=0;n<5/DT;n++)advance(s,{...config,loopMs});
  assert.equal(s.x,0);assert.ok(s.forward>2);assert.equal(s.firmware.pwmLeft,55);
 }
});
test('lateral pushes change sensors and preserve finite physical state', () => {
 for(const sign of [-1,1]) {
  const s=createState();for(let n=0;n<2/DT;n++)advance(s,config);
  pushRobot(s,sign*6);let peak=0,sawCorrection=false;
  for(let n=0;n<10/DT;n++){advance(s,config);peak=Math.max(peak,Math.abs(s.x));sawCorrection ||= s.firmware.pwmLeft!==s.firmware.pwmRight;}
  assert.ok(peak>.05);assert.ok(sawCorrection);assert.ok(Number.isFinite(s.x));
  assert.ok(s.firmware.pwmLeft>=0&&s.firmware.pwmLeft<=90);
 }
});


test('PDF mask follows actual artwork, including black markers and white background', async () => {
 const {trackBlack} = await import('./track.ts');
 const cfg={...config,track:'pdf',boardMeters:2};
 const at=(px,py)=>trackBlack((px/1600-.5)*20,(py/1600-.5)*20,cfg);
 assert.equal(at(150,700),1); // left outer straight
 assert.equal(at(800,1140),1); // center cross
 assert.equal(at(800,600),0); // white interior, not the old x=0 line
 assert.equal(at(50,1250),1); // long start marker
 assert.equal(trackBlack(100,100,cfg),0);
});

test('compact chassis has wheels outside and sensors ahead of the body', () => {
 assert.ok(CHASSIS_LENGTH<1);assert.ok(CHASSIS_WIDTH<1);
 assert.ok(WHEEL_TRACK>CHASSIS_WIDTH);assert.ok(SENSOR_FORWARD>CHASSIS_LENGTH/2);
 for(const startSide of ['left','right']) {
  const cfg={...config,track:'pdf',boardMeters:2,startSide};
  const s=createState(cfg);
  assert.equal(Math.sign(s.heading),startSide==='left'?1:-1);
  for(let n=0;n<5/DT;n++)advance(s,cfg);
  assert.ok(Number.isFinite(s.x));assert.ok(s.travelled>0);
 }
});
test('approaching the central finish from either side stops until reset', () => {
 for (const startSide of ['left', 'right']) {
  const cfg={...config,track:'pdf',boardMeters:2,startSide};
  const s=createState(cfg);
  const direction=startSide==='left'?1:-1;
  s.heading=direction*Math.PI/2;
  s.x=-direction*(SENSOR_FORWARD+.4);s.forward=-4.25;
  for(let n=0;n<5/DT && !s.finished;n++)advance(s,cfg);
  assert.equal(s.finished,true);
  assert.ok(Math.abs(s.x)<SENSOR_FORWARD+.4);
  assert.equal(s.firmware.pwmLeft,0);assert.equal(s.firmware.pwmRight,0);
  const pose=[s.x,s.forward,s.heading,s.t];
  pushRobot(s,6);
  for(let n=0;n<120;n++)advance(s,{...cfg,bias:1});
  assert.deepEqual([s.x,s.forward,s.heading,s.t],pose);
  assert.equal(createState(cfg).finished,false);
 }
});
test('finish detects the center from both sides and excludes start bars and straight mode', async () => {
 const {atTrackFinish,trackStart}=await import('./track.ts');
 for(const startSide of ['left','right']) {
  const cfg={...config,track:'pdf',boardMeters:2,startSide};
  const s=trackStart(cfg);
  assert.equal(atTrackFinish(s.x,s.forward,s.heading,cfg),false);
  assert.equal(atTrackFinish(-SENSOR_FORWARD,-4.25,Math.PI/2,cfg),true);
  assert.equal(atTrackFinish(SENSOR_FORWARD,-4.25,-Math.PI/2,cfg),true);
 }
 assert.equal(atTrackFinish(9.375-.71,-6.5,Math.PI/2,{...config,track:'straight'}),false);
});

test('push and constant force follow local right/left at every heading', () => {
 for (const heading of [0,Math.PI/2,Math.PI,-Math.PI/2,.7]) {
  for (const sign of [-1,1]) for (const constant of [false,true]) {
   const s=createState();s.heading=heading;
   if(!constant)pushRobot(s,sign*6);
   // During startup motors are off: displacement isolates the applied force.
   for(let n=0;n<24;n++)advance(s,{...config,bias:constant?sign*6:0});
   const lateral=s.x*Math.cos(heading)-s.forward*Math.sin(heading);
   const longitudinal=s.x*Math.sin(heading)+s.forward*Math.cos(heading);
   assert.ok(sign*lateral>.01);
   assert.ok(Math.abs(longitudinal)<1e-10);
  }
 }
});
test('existing disturbance momentum does not rotate when heading changes', () => {
 const s=createState();pushRobot(s,6);advance(s,config);
 s.push=0;s.pushRemaining=0;s.heading=Math.PI/2;
 const x=s.x;advance(s,config);
 assert.ok(s.x>x);assert.equal(s.forward,0);
});
