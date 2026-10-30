// Faithful control port for testing the actual repo defaults on the existing plant.
// No PWM compensation, simulator recovery, or derivative reset is added here.
export function repoController(source, kind) {
 const number = name => {
  const match=source.match(new RegExp(`(?:int|float)\\s+${name}\\s*=\\s*(-?[\\d.]+)`));
  if(!match)throw new Error(`Missing sketch constant ${name}`);
  return Number(match[1]);
 };
 const numbers = name => {
  const match=source.match(new RegExp(`(?:int|float)\\s+${name}\\[[^\\]]+\\]\\s*=\\s*\\{([^}]+)\\}`));
  if(!match)throw new Error(`Missing sketch array ${name}`);
  return match[1].split(',').map(value=>{
   const token=value.trim();
   return /^-?[\d.]+$/.test(token)?Number(token):number(token);
  });
 };
 const pid=kind==='pid';
 const settings=pid ? {kp:number('Kp'),ki:number('Ki'),kd:number('Kd'),thresholds:numbers('sensorThresholds'),baseLeft:number('baseSpeedL'),baseRight:number('baseSpeedR'),min:number('minSpeed'),max:number('maxSpeed'),deadband:number('SEARCH_DEADBAND'),startupMs:1000,sensorCount:number('SENSOR_COUNT')} : {thresholds:[number('THRESHOLD_KIRI'),number('THRESHOLD_KANAN')],left:number('speedKiri'),right:number('speedKanan'),startupMs:0,sensorCount:2};
 const positions=pid?numbers('sensorPositions'):[];
 if(settings.thresholds.length!==settings.sensorCount||settings.thresholds.some(value=>!Number.isFinite(value))||pid&&positions.length!==settings.sensorCount)throw new Error('Sketch sensor arrays must match sensorCount');
 const float=Math.fround;
 const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
 function step(s,adc,nowMs) {
  if(nowMs<settings.startupMs)return;
  if(!pid){
   // The plant provides left/center/right ADC; the two-sensor sketch ignores center.
   const l=adc[0]>settings.thresholds[0],r=adc[2]>settings.thresholds[1];
   s.detected=l||r;s.error=l===r?0:l?-2:2;
   s.pwmLeft=l?0:settings.left;s.pwmRight=r?0:settings.right;
   s.mode=l&&r?'stopped':l?'turn-left':r?'turn-right':'forward';
   s.output=s.pwmLeft-s.pwmRight;return;
  }
  let total=0,weighted=0;
  for(let i=0;i<settings.sensorCount;i++)if(adc[i]>settings.thresholds[i]){const w=adc[i]-settings.thresholds[i];total+=w;weighted+=positions[i]*w;}
  s.detected=total!==0;
  if(s.detected){
   s.error=float(weighted/total);s.lastLineMs=nowMs;
   if(s.error>settings.deadband)s.searchDirection=1;
   else if(s.error< -settings.deadband)s.searchDirection=-1;
   s.p=float(float(settings.kp)*s.error);
   s.integral=float(clamp(float(s.integral+s.error),-100,100));
   s.i=float(float(settings.ki)*s.integral);
   s.derivative=float(s.error-s.lastError);
   s.d=float(float(settings.kd)*s.derivative);
   s.output=float(float(s.p+s.i)+s.d);s.lastError=s.error;
  }else s.integral=0; // readSensors() returns previous error and retains PID output.
  if(s.detected||nowMs-s.lastLineMs<1000){
   s.pwmLeft=clamp(Math.trunc(float(settings.baseLeft+s.output)),settings.min,settings.max);
   s.pwmRight=clamp(Math.trunc(float(settings.baseRight-s.output)),settings.min,settings.max);
   s.mode=s.detected?'tracking':'coasting';
  }else if(s.searchDirection!==0){
   s.pwmLeft=s.searchDirection===1?90:0;s.pwmRight=s.searchDirection===-1?90:0;
   s.mode=s.searchDirection===1?'search-right':'search-left';
  }
 }
 return {settings,step};
}
