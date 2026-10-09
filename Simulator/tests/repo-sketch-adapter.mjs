// Faithful control port for testing the actual repo defaults on the existing plant.
// No PWM compensation, simulator recovery, or derivative reset is added here.
export function repoController(source, kind) {
 const number = name => {
  const match=source.match(new RegExp(`(?:int|float)\\s+${name}\\s*=\\s*(-?[\\d.]+)`));
  if(!match)throw new Error(`Missing sketch constant ${name}`);
  return Number(match[1]);
 };
 const pid=kind==='pid';
 const settings=pid ? {kp:number('Kp'),ki:number('Ki'),kd:number('Kd'),threshold:number('sensorThreshold'),baseLeft:number('baseSpeedL'),baseRight:number('baseSpeedR'),min:number('minSpeed'),max:number('maxSpeed'),deadband:number('SEARCH_DEADBAND'),startupMs:1000,sensorCount:3} : {threshold:number('THRESHOLD'),left:number('speedKiri'),right:number('speedKanan'),coast:number('COAST_PWM'),grace:number('LOST_GRACE_MS'),sweep:number('SEARCH_SWEEP_MS'),timeout:number('LOST_TIMEOUT_MS'),startupMs:number('STARTUP_MS'),sensorCount:3};
 let lostSince=null,stopped=false,direction=1;
 const positions=pid?source.match(/sensorPositions\[SENSOR_COUNT\]\s*=\s*\{([^}]+)\}/)[1].split(',').map(Number):[];
 const float=Math.fround;
 const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
 function step(s,adc,nowMs) {
  if(nowMs<settings.startupMs)return;
  if(!pid){
   const l=adc[0]>settings.threshold,c=adc[1]>settings.threshold,r=adc[2]>settings.threshold;
   s.detected=l||c||r;s.error=l===r?0:l?-2:2;
   if(stopped){s.pwmLeft=0;s.pwmRight=0;s.mode='lost-stop';return;}
   if(s.detected){
    lostSince=null;
    if(l!==r)direction=l?-1:1;
    s.pwmLeft=l!==r&&l?0:settings.left;s.pwmRight=l!==r&&r?0:settings.right;
    s.mode=l===r?'forward':l?'turn-left':'turn-right';
   }else{
    lostSince??=nowMs;const elapsed=nowMs-lostSince;
    if(elapsed>=settings.timeout){stopped=true;s.pwmLeft=0;s.pwmRight=0;s.mode='lost-stop';}
    else if(elapsed<settings.grace){s.pwmLeft=settings.coast;s.pwmRight=settings.coast;s.mode='coasting';}
    else{const side=direction*(Math.floor((elapsed-settings.grace)/settings.sweep)%2===0?1:-1);
     s.pwmLeft=side===1?settings.left:0;s.pwmRight=side===-1?settings.right:0;s.mode=side===1?'search-right':'search-left';}
   }
   s.output=s.pwmLeft-s.pwmRight;return;
  }
  let total=0,weighted=0;
  for(let i=0;i<3;i++)if(adc[i]>settings.threshold){const w=adc[i]-settings.threshold;total+=w;weighted+=positions[i]*w;}
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
