import { CHASSIS_LENGTH, CHASSIS_WIDTH, WHEEL_TRACK, SENSOR_FORWARD, ROBOT_MASS_KG, CENTER_OF_MASS, YAW_INERTIA_KG_M2 } from '../src/robot.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createFirmware, firmwareLoop, SKETCH } from '../src/firmware.ts';
import { advance, createState, pushRobot, robotDynamics, FORCE_UNIT_N, DT } from '../src/model.ts';
import { motorDrive, compensatePWM } from '../src/motor.ts';
import { repoController } from './repo-sketch-adapter.mjs';
const gain = { kp: 18, ki: 0, kd: 5 };
const config = { ...gain, pushStrength: 6, bias: 0, speed: 1, loopMs: 10, swapMotors: false };
const center = [30,850,30], lost = [30,30,30];

test('repo bang-bang uses two independent thresholds and ignores the center sensor', () => {
 const source=readFileSync(new URL('../../code/line_follower_bang_bang/line_follower_bang_bang.ino',import.meta.url),'utf8');
 const calibrated=source.replace(/(THRESHOLD_KIRI\s*=\s*)\d+/, '$1200').replace(/(THRESHOLD_KANAN\s*=\s*)\d+/, '$1600');
 const adapter=repoController(calibrated,'bang-bang'),state=createFirmware();
 assert.equal(adapter.settings.sensorCount,2);assert.deepEqual(adapter.settings.thresholds,[200,600]);
 for(const [adc,pwm] of [
  [[200,0,600],[68,68]],[[200,850,600],[68,68]],
  [[201,850,600],[0,68]],[[200,850,601],[68,0]],
  [[201,850,601],[0,0]],[[200,850,600],[68,68]]
 ]){
  adapter.step(state,adc,0);
  assert.deepEqual([state.pwmLeft,state.pwmRight],pwm);
 }
});

test('repo PID applies each calibrated threshold to detection and error weighting', () => {
 const source=readFileSync(new URL('../../code/line_follower_pid/line_follower_pid.ino',import.meta.url),'utf8');
 const calibrated=source.replace(/(sensorThresholds\[SENSOR_COUNT\]\s*=\s*)\{[^}]+\}/, '$1{200, 400, 600}');
 const adapter=repoController(calibrated,'pid'),state=createFirmware();
 assert.deepEqual(adapter.settings.thresholds,[200,400,600]);
 adapter.step(state,[200,400,600],1000);assert.equal(state.detected,false);
 for(const [adc,error] of [[[300,500,700],0],[[201,400,600],-2],[[200,401,600],0],[[200,400,601],2],[[300,400,800],2/3]]){
  adapter.step(state,adc,1010);
  assert.equal(state.detected,true);assert.ok(Math.abs(state.error-error)<1e-7);
 }
 adapter.step(state,[200,400,600],1020);assert.equal(state.detected,false);assert.equal(state.integral,0);
});

test('motor hysteresis distinguishes startup, continued rotation and restart', () => {
 let running = false;
 for (const [pwm, expected] of [[59,false],[60,true],[59,true],[45,true],[44,false],[59,false],[60,true],[0,false]]) {
  const drive = motorDrive(pwm, running);
  assert.equal(drive.running, expected, `PWM ${pwm}, previously running ${running}`);
  assert.equal(drive.throttle > 0, expected);
  running = drive.running;
 }
 assert.equal(motorDrive(255, false).throttle, 1);
 assert.equal(compensatePWM(0), 0);
 assert.equal(compensatePWM(1), 60);
});

test('sub-threshold commands cannot move stopped motors; reset clears startup history', () => {
 const state = createState(); state.firmware.pwmLeft = state.firmware.pwmRight = 59;
 advance(state, config);
 assert.equal(state.leftMotor, 0); assert.equal(state.rightMotor, 0);
 assert.equal(state.travelled, 0);
 state.firmware.pwmLeft = 60; advance(state, config);
 assert.ok(state.leftMotor > 0); assert.equal(state.leftMotorRunning, true);
 assert.equal(state.rightMotorRunning, false);
 const reset = createState();
 assert.equal(reset.leftMotorRunning, false); assert.equal(reset.rightMotorRunning, false);
});

test('PID and bang-bang complete the PDF route from both starts across supported loads', () => {
 for (const controller of ['pid', 'bang-bang']) for (const massKg of [.3, .55, .6, .9, 1.2]) for (const startSide of ['left', 'right']) {
  const cfg = { ...config, kp: SKETCH.kp, ki: SKETCH.ki, kd: SKETCH.kd,
    controller, massKg, track: 'pdf', boardMeters: 2, startSide };
  const state = createState(cfg);
  for (let step = 0; step < 90 / DT && !state.finished; step++) {
   advance(state, cfg);
   assert.notEqual(state.firmware.mode, 'lost-stop', `${massKg} kg, ${startSide}, ${state.t}s`);
  }
  assert.ok(state.finished, `${massKg} kg, ${startSide} did not finish`);
  assert.equal(state.firmware.pwmLeft, 0); assert.equal(state.firmware.pwmRight, 0);
  const position = [state.x, state.forward, state.t];
  pushRobot(state, 6); advance(state, cfg);
  assert.deepEqual([state.x, state.forward, state.t], position);
 }
});

test('bang-bang uses fixed motor states for all three-sensor patterns regardless of PID gains', () => {
 for (const kp of [0, 40]) for (let pattern = 1; pattern < 8; pattern++) {
  const sensors = [1, 2, 4].map(bit => pattern & bit ? 850 : 30);
  const fw = createFirmware();
  firmwareLoop(fw, sensors, 1000, { kp, ki: 1, kd: 20 }, 'bang-bang');
  const left = !!(pattern & 1), right = !!(pattern & 4);
  const direction = left === right ? 0 : left ? -1 : 1;
  assert.deepEqual([fw.pwmLeft, fw.pwmRight], direction === -1 ? [0, 86] : direction === 1 ? [86, 0] : [86, 86]);
  assert.deepEqual([fw.p, fw.i, fw.d, fw.integral, fw.derivative], [0, 0, 0, 0, 0]);
 }
 const fw = createFirmware();
 firmwareLoop(fw, [400, 400, 400], 1000, gain, 'bang-bang');
 assert.equal(fw.detected, false); assert.equal(fw.mode, 'coasting');
 firmwareLoop(fw, lost, 1150, gain, 'bang-bang');
 assert.equal(fw.mode, 'search-right');
 firmwareLoop(fw, lost, 4000, gain, 'bang-bang');
 assert.equal(fw.mode, 'lost-stop');
 firmwareLoop(fw, center, 4010, gain, 'bang-bang');
 assert.deepEqual([fw.pwmLeft, fw.pwmRight], [0, 0]);
});

test('same physical push accelerates twice the mass at half the initial rate', () => {
 const light = createState(), heavy = createState();
 pushRobot(light, 6); pushRobot(heavy, 6);
 advance(light, { ...config, massKg: .6 }); advance(heavy, { ...config, massKg: 1.2 });
 assert.ok(Math.abs(light.v - 6 * FORCE_UNIT_N / .6 / .1 * DT) < 1e-10);
 assert.ok(Math.abs(light.v / heavy.v - 2) < 1e-10);
});

test('heavier load reduces initial drive and turn response and coasts longer', () => {
 for (const x of [0, .18]) {
  const light = createState(), heavy = createState();
  for (const state of [light, heavy]) { state.t = 1; state.x = x; }
  advance(light, { ...config, massKg: .6 }); advance(heavy, { ...config, massKg: 1.2 });
  assert.ok(light.travelled > heavy.travelled);
  if (x !== 0) assert.ok(Math.abs(light.yawRate) > Math.abs(heavy.yawRate));
 }
 const light = createState(), heavy = createState();
 for (const state of [light, heavy]) state.leftMotor = state.rightMotor = 1;
 advance(light, { ...config, massKg: .6 }); advance(heavy, { ...config, massKg: 1.2 });
 assert.ok(heavy.leftMotor > light.leftMotor);
});

test('estimated mass budget has a centered load and invalid masses fall back safely', () => {
 assert.ok(Math.abs(ROBOT_MASS_KG - .55) < 1e-10);
 assert.ok(Math.abs(CENTER_OF_MASS.z) < 1e-10);
 assert.ok(CENTER_OF_MASS.y > .2 && CENTER_OF_MASS.y < .54);
 assert.ok(YAW_INERTIA_KG_M2 > 0);
 for (const mass of [NaN, Infinity, 0, -1]) assert.equal(robotDynamics(mass).massKg, ROBOT_MASS_KG);
});

test('Arduino PID uses three sensors and uploaded-source tuning; simulator keeps independent tuning', () => {
 const source = readFileSync(new URL('../../code/line_follower_pid/line_follower_pid.ino', import.meta.url), 'utf8');
 for (const [symbol, value] of Object.entries({Kp:18,Ki:0.01,Kd:5,baseSpeedL:60,baseSpeedR:60,minSpeed:0,maxSpeed:85})) {
   assert.equal(Number(source.match(new RegExp('(?:float|int) '+symbol+'\\s*=\\s*([0-9.]+)'))?.[1]),value);
 }
 assert.match(source,/sensorPositions\[SENSOR_COUNT\] = \{-2, 0, 2\}/);
 assert.match(source,/SENSOR_COUNT = 3/);
 assert.deepEqual(repoController(source,'pid').settings.thresholds,[300,300,300]);
 assert.doesNotMatch(source,/\bs[456]\b|\bA[345]\b/);
 assert.equal(SKETCH.kp, 30);
});
test('startup delay and centered tracking produce compensated 86/86 PWM', () => {
 const s=createFirmware(); firmwareLoop(s,center,999,gain); assert.equal(s.pwmLeft,0);
 firmwareLoop(s,center,1000,gain); assert.equal(s.mode,'tracking'); assert.equal(s.error,0);
 assert.equal(s.pwmLeft,86); assert.equal(s.pwmRight,86);
});
test('bang-bang uses fixed signed correction, deadband, and bounded motor PWM', () => {
 const cfg={...gain,controller:'bang-bang-adjustable',bangStrength:35,bangDeadband:.25};
 const s=createFirmware();firmwareLoop(s,center,999,cfg);assert.equal(s.pwmLeft,0);
 for(const [sensors,output,left,right] of [
  [[0,0,900],35,116,compensatePWM(20)],
  [[900,0,0],-35,compensatePWM(20),116],
  [center,0,86,86], [[0,800,150],0,86,86]
 ]) {
  firmwareLoop(s,sensors,1000,cfg);
  assert.equal(s.output,output);assert.equal(s.pwmLeft,left);assert.equal(s.pwmRight,right);
  assert.deepEqual([s.p,s.i,s.d,s.integral,s.derivative],[0,0,0,0,0]);
 }
 firmwareLoop(s,[0,0,900],1010,{...cfg,bangStrength:90});
 assert.equal(s.pwmLeft,116);assert.equal(s.pwmRight,0);
 firmwareLoop(s,center,1020,gain);assert.equal(s.output,-10); // PID resumes normally.
});
test('bang-bang preserves line-loss recovery and latched stop', () => {
 const cfg={...gain,controller:'bang-bang-adjustable'};
 for(const side of [-1,1]) {
  const s=createFirmware(), sensors=[0,0,0];sensors[side===1?2:0]=900;
  firmwareLoop(s,sensors,1000,cfg);firmwareLoop(s,lost,1010,cfg);
  assert.equal(s.mode,'coasting');assert.equal(s.output,0);
  firmwareLoop(s,lost,1160,cfg);assert.equal(s.mode,side===1?'search-right':'search-left');
  firmwareLoop(s,center,1170,cfg);assert.equal(s.mode,'tracking');assert.equal(s.output,0);
  firmwareLoop(s,lost,1180,cfg);firmwareLoop(s,lost,4180,cfg);
  firmwareLoop(s,center,4190,cfg);assert.equal(s.mode,'lost-stop');assert.equal(s.pwmLeft,0);
 }
});
test('weighted ADC, derivative per loop, and integer PWM truncation', () => {
 const s=createFirmware(); firmwareLoop(s,[100,300,200],1000,gain);
 assert.ok(Math.abs(s.error-2/3)<1e-10);
 assert.ok(Math.abs(s.output-46/3)<1e-10);
 assert.equal(s.pwmLeft,99); assert.equal(s.pwmRight,73);
 firmwareLoop(s,[100,300,200],1010,gain);
 assert.equal(s.d,0); assert.equal(s.pwmLeft,96); assert.equal(s.pwmRight,76);
});
test('loss clears stale PID, bridges briefly, searches both sides, and latches timeout', () => {
 for(const side of [-1,1]) {
  const s=createFirmware(), sensors=[0,0,0]; sensors[side===1?2:0]=900;
  firmwareLoop(s,sensors,1000,gain);
  firmwareLoop(s,lost,1010,gain);
  assert.equal(s.output,0); assert.equal(s.d,0);assert.equal(s.integral,0);
  firmwareLoop(s,lost,1159,gain);assert.equal(s.mode,'coasting');assert.equal(s.pwmLeft,65);assert.equal(s.pwmRight,65);
  firmwareLoop(s,lost,1160,gain);assert.equal(s.mode,side===1?'search-right':'search-left');
  firmwareLoop(s,lost,2560,gain);assert.equal(s.mode,side===1?'search-left':'search-right');
  firmwareLoop(s,lost,4009,gain);assert.notEqual(s.mode,'lost-stop');
  firmwareLoop(s,lost,4010,gain);assert.equal(s.mode,'lost-stop');
  firmwareLoop(s,center,4020,gain);assert.equal(s.mode,'lost-stop');assert.equal(s.pwmLeft,0);assert.equal(s.pwmRight,0);
  assert.equal(createFirmware().mode,'startup');
 }
});
test('unknown direction searches instead of retaining PWM or staying stuck at startup', () => {
 const s=createFirmware();firmwareLoop(s,lost,1000,gain);
 firmwareLoop(s,lost,1150,gain);assert.equal(s.mode,'search-right');
 firmwareLoop(s,lost,2550,gain);assert.equal(s.mode,'search-left');
});
test('last small error updates search side and reacquisition suppresses derivative kick', () => {
 const s=createFirmware();firmwareLoop(s,[0,0,900],1000,gain);
 firmwareLoop(s,[900,0,0],1010,gain);assert.equal(s.searchDirection,-1);
 firmwareLoop(s,lost,1020,gain);firmwareLoop(s,lost,1170,gain);assert.equal(s.mode,'search-left');
 firmwareLoop(s,[0,0,900],1180,gain);assert.equal(s.d,0);assert.equal(s.mode,'tracking');assert.equal(s.lostSinceMs,null);
 firmwareLoop(s,center,1190,gain);assert.equal(s.d,-10);
 firmwareLoop(s,lost,1200,gain);assert.equal(s.lostSinceMs,1200);
});
test('integral accumulates even with Ki zero, clamps at 100, and resets on loss', () => {
 const s=createFirmware();
 for(let n=0;n<60;n++)firmwareLoop(s,[0,0,900],1000+n,gain);
 assert.equal(s.integral,100); assert.equal(s.i,0);
 firmwareLoop(s,[0,0,900],1100,{...gain,ki:1}); assert.equal(s.i,100);
 firmwareLoop(s,lost,1200,gain); assert.equal(s.integral,0);
});
test('plant stays centered without a push at each supported loop period', () => {
 for(const loopMs of [1,5,10,20]) {
  const s=createState();for(let n=0;n<5/DT;n++)advance(s,{...config,loopMs});
  assert.equal(s.x,0);assert.ok(s.forward>2);assert.equal(s.firmware.pwmLeft,86);
 }
});
test('plant runs bang-bang at all loop periods and reacts to lateral pushes', () => {
 for(const loopMs of [1,5,10,20]) {
  const cfg={...config,controller:'bang-bang-adjustable',loopMs};
  const s=createState();for(let n=0;n<2/DT;n++)advance(s,cfg);
  assert.equal(s.x,0);assert.ok(s.forward>0);assert.equal(s.firmware.pwmLeft,86);
  pushRobot(s,3);let corrected=false;
  for(let n=0;n<3/DT;n++) {
   advance(s,cfg);corrected ||= Math.abs(s.u)===35;
   assert.ok(Number.isFinite(s.x));assert.ok(Number.isFinite(s.heading));
   assert.ok(s.firmware.pwmLeft>=0 && s.firmware.pwmLeft<=116);
   assert.ok(s.firmware.pwmRight>=0 && s.firmware.pwmRight<=116);
  }
  assert.ok(corrected);
 }
});
test('lateral pushes change sensors and preserve finite physical state', () => {
 for(const sign of [-1,1]) {
  const s=createState();for(let n=0;n<2/DT;n++)advance(s,config);
  pushRobot(s,sign*6);let peak=0,sawCorrection=false;
  for(let n=0;n<10/DT;n++){advance(s,config);peak=Math.max(peak,Math.abs(s.x));sawCorrection ||= s.firmware.pwmLeft!==s.firmware.pwmRight;}
  assert.ok(peak>.05);assert.ok(sawCorrection);assert.ok(Number.isFinite(s.x));
  assert.ok(s.firmware.pwmLeft>=0&&s.firmware.pwmLeft<=116);
 }
});


test('PDF mask follows actual artwork, including black markers and white background', async () => {
 const {trackBlack} = await import('../src/track.ts');
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
 const {atTrackFinish,trackStart}=await import('../src/track.ts');
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
