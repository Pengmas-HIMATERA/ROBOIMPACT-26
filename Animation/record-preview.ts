import {createArena} from './scene';
import {createState,advance,pushRobot,DT} from './model';
import type {PIDConfig} from './types';
const config:PIDConfig={kp:18,ki:0,kd:5,pushStrength:2,bias:0,speed:1,loopMs:10,swapMotors:false,track:'pdf',boardMeters:2,startSide:'left'};
const schedule=[[12,2],[22,-2],[35,2]];
const host=document.getElementById('host')!;
const arena=createArena(host);
const output=document.getElementById('output') as HTMLCanvasElement;
const ctx=output.getContext('2d')!;
const status=document.getElementById('status')!;
const button=document.getElementById('record') as HTMLButtonElement;
let state=createState(config), running=false, nextPush=0, lastPush=-100;
let recorder:MediaRecorder, chunks:Blob[]=[];
let start=0, prev=0, accumulator=0, finishedAt=0;
function draw(){
 arena.update(state,config);
 ctx.drawImage(host.querySelector('canvas')!,0,0,1280,720);
 ctx.fillStyle='#24372a';ctx.fillRect(0,0,1280,64);ctx.fillRect(0,640,1280,80);
 ctx.fillStyle='#eef1e7';ctx.font='bold 22px monospace';ctx.fillText('ROBOIMPACT',28,39);
 ctx.font='16px monospace';ctx.fillText('PID / LINE FOLLOWER',230,39);ctx.fillText('KAMERA IKUTI  |  '+state.t.toFixed(1)+' s',925,39);
 ctx.font='18px monospace';ctx.fillText('Kp 18   Ki 0   Kd 5',28,674);ctx.fillText('ERROR '+state.firmware.error.toFixed(2),410,674);
 ctx.fillText('PWM L '+state.firmware.pwmLeft+' / R '+state.firmware.pwmRight,655,674);
 ctx.fillText(state.finished?'FINISH / MOTOR STOP':state.firmware.mode.toUpperCase(),960,674);
 ctx.font='13px monospace';ctx.fillStyle='#bdc9b7';ctx.fillText('Simulasi fisika asumsi | Dorongan lateral 2.0 selama 0.35 s | Kecepatan 1x',28,704);
 if(state.t-lastPush<2){ctx.fillStyle='#a84225';ctx.fillRect(28,90,355,54);ctx.fillStyle='white';ctx.font='bold 20px monospace';ctx.fillText('DORONG '+(schedule[nextPush-1][1]>0?'KANAN':'KIRI')+'  /  '+nextPush+' DARI 3',45,124);}
 if(state.finished){ctx.fillStyle='#24372ae8';ctx.fillRect(445,90,390,54);ctx.fillStyle='#e9f1dd';ctx.font='bold 20px monospace';ctx.fillText('FINISH / KEDUA MOTOR 0',490,124);}
}
function frame(now:number){
 if(running){
  const elapsed=prev?Math.min((now-prev)/1000,.1):0;accumulator+=elapsed;
  if(now-start>1500&&!state.finished){
   while(accumulator>=DT){
    if(nextPush<schedule.length&&state.t>=schedule[nextPush][0]){pushRobot(state,schedule[nextPush][1]);lastPush=state.t;nextPush++;}
    advance(state,config);accumulator-=DT;
   }
  }else accumulator=0;
  if(state.finished&&!finishedAt)finishedAt=now;
  if((finishedAt&&now-finishedAt>2500)||state.t>100){running=false;recorder.stop();}
 }
 prev=now;draw();requestAnimationFrame(frame);
}
button.addEventListener('click',()=>{
 state=createState(config);nextPush=0;lastPush=-100;finishedAt=0;accumulator=0;chunks=[];
 (document.querySelector('[data-camera="follow"]') as HTMLButtonElement).click();
 const stream=output.captureStream(30);
 recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:6500000});
 recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
 recorder.onstop=async()=>{
  stream.getTracks().forEach(t=>t.stop());
  const blob=new Blob(chunks,{type:'video/webm'});
  const response=await fetch('http://127.0.0.1:8766/video',{method:'POST',headers:{'Content-Type':'text/plain'},body:blob});
  if(!response.ok)throw new Error('Local video save failed');
  const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='pid-follow-preview.webm';link.textContent='Download video';document.body.append(link);
  status.textContent='Selesai | '+state.t.toFixed(2)+' s | finish '+state.finished+' | dorongan '+nextPush;button.disabled=false;
 };
 recorder.start(1000);start=performance.now();running=true;button.disabled=true;status.textContent='Merekam…';
});
requestAnimationFrame(frame);
