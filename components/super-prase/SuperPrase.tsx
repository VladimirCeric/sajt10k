'use client';
import {useCallback,useEffect,useId,useRef,useState} from 'react';
import Dialog from './Dialog';
import s from './SuperPrase.module.css';

export type SuperPraseProps={storagePrefix?:string;locale?:string;autoHelp?:boolean;shareUrl?:string};
const EMOJI_FONT='"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const FOOD=['🍎','🍕','🍔','🍟','🍩','🌭','🥕','🍗','🍌','🍪','🥐','🍉'];
const OBST=['📻','🎸','🎺','🥁','🎹'];
const W=400,H=500,GY=452,PX=84,LIVES=3,MAXL=5,GRAV=2000,JUMP=640,MINHOP=470;
const safeRead=(k:string)=>{try{return localStorage.getItem(k)}catch{return null}};
const safeWrite=(k:string,v:string)=>{try{localStorage.setItem(k,v);return true}catch{return false}};
type Ent={kind:'food'|'obs'|'fly'|'ledge'|'life';wx:number;ay:number;e:string;w?:number};
type Fl={x:number;y:number;t:number;txt:string;c:string};
const hh=(n:number)=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)};
const terr=(wx:number)=>{let y=6*(1+Math.sin(wx/170))+3*(1+Math.sin(wx/63+1.3));
 const k=Math.floor(wx/3200);for(let j=k-1;j<=k+1;j++){if(j<0||hh(j+1)<0.4)continue;const c=j*3200+1800+hh(j+7)*700,hgt=120+hh(j+13)*40,t=Math.abs(wx-c)/360;if(t<1)y+=hgt*(0.5+0.5*Math.cos(Math.PI*t))}
 return y};
const mk=()=>({lvl:1,score:0,eaten:0,lives:LIVES,h:0,vy:0,inv:0,ents:[] as Ent[],spawn:260,t:0,dist:0,banner:1.3,floats:[] as Fl[],nextHeart:10,buf:0,coy:0,held:false,
 clouds:[{x:60,y:110,z:.5,s:90},{x:210,y:210,z:.35,s:110},{x:340,y:150,z:.6,s:80},{x:130,y:300,z:.4,s:96}]});
const pick=<T,>(a:T[])=>a[Math.floor(Math.random()*a.length)];

export default function SuperPrase({storagePrefix='super-prase-v1',locale,autoHelp=true,shareUrl}:SuperPraseProps){
 const cyr=!locale||/cyr/i.test(locale);const t=(lat:string,c:string)=>cyr?c:lat;
 const id=useId();const root=useRef<HTMLDivElement>(null);const cv=useRef<HTMLCanvasElement>(null);const copyRef=useRef<HTMLTextAreaElement>(null);
 const [best,setBest]=useState<number|null>(null);
 const [modal,setModal]=useState<'help'|'over'|null>(null);const [notice,setNotice]=useState('');const [copyText,setCopyText]=useState('');const [res,setRes]=useState({score:0,level:1,nb:false});
 const bestRef=useRef<number|null>(null);const modalRef=useRef<typeof modal>(null);const phase=useRef<'ready'|'play'|'over'>('ready');const cyrRef=useRef(cyr);
 const g=useRef(mk());const pausedRef=useRef(false);const [paused,setPaused]=useState(false);
 cyrRef.current=cyr;

 const readBest=useCallback(()=>{const x=Number(safeRead(`${storagePrefix}-best`));return Number.isInteger(x)&&x>0?x:null},[storagePrefix]);
 const startNew=useCallback(()=>{g.current=mk();phase.current='ready';pausedRef.current=false;setPaused(false);setBest(readBest());setModal(null);setNotice('');setCopyText('')},[readBest]);
 useEffect(()=>{startNew();if(autoHelp&&!safeRead(storagePrefix+'-intro'))setModal('help')},[storagePrefix,startNew,autoHelp]);
 useEffect(()=>{modalRef.current=modal},[modal]);
 useEffect(()=>{bestRef.current=best},[best]);
 useEffect(()=>{if(copyText)copyRef.current?.select()},[copyText]);


 useEffect(()=>{
  const c=cv.current;if(!c)return;const ctx=c.getContext('2d');if(!ctx)return;
  c.width=W*2;c.height=H*2;
  const cache=new Map<string,HTMLCanvasElement>();
  const spr=(e:string,size:number)=>{const k=e+size;let s2=cache.get(k);if(!s2){const box=Math.ceil(size*1.4*2);s2=document.createElement('canvas');s2.width=s2.height=box;const x=s2.getContext('2d')!;x.font=`${size*2}px ${EMOJI_FONT}`;x.textAlign='center';x.textBaseline='middle';x.fillText(e,box/2,box/2+size*2*0.06);cache.set(k,s2)}return s2};
  const put=(e:string,size:number,x:number,y:number,alpha=1,rot=0)=>{const b=size*1.4;ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);if(rot)ctx.rotate(rot);ctx.drawImage(spr(e,size),-b/2,-b/2,b,b);ctx.restore()};
  let raf=0,last=performance.now();
  const end=()=>{
   const o=g.current;phase.current='over';let nb=false;const old=Number(safeRead(`${storagePrefix}-best`));
   if(o.score>0&&(!(old>0)||o.score>old)){safeWrite(`${storagePrefix}-best`,String(o.score));setBest(o.score);nb=true}
   setRes({score:o.score,level:o.lvl,nb});setTimeout(()=>setModal('over'),500);
  };
  const spawn=(o:ReturnType<typeof mk>,speed:number)=>{
   const x0=o.dist+W+60;const lv=o.lvl;const kinds=['row','row','arc','arc'];if(lv>=2){kinds.push('air','ledge')}if(lv>=3)kinds.push('flyer','ledge');if(lv>=5)kinds.push('double');
   let kind=pick(kinds);const food=()=>pick(FOOD);const ob=()=>pick(OBST.slice(0,Math.min(5,lv+1)));let L=0;
   const F=(dx:number,rel:number)=>o.ents.push({kind:'food',wx:x0+dx,ay:terr(x0+dx)+rel,e:food()});
   const bad=lv>20?Math.min(0.45,(lv-20)*0.03):0;let lastBad=false;
   const FD=(dx:number,rel:number)=>{const ay=terr(x0+dx)+rel;if(!lastBad&&Math.random()<bad){lastBad=true;o.ents.push({kind:'obs',wx:x0+dx,ay,e:ob()})}else{lastBad=false;o.ents.push({kind:'food',wx:x0+dx,ay,e:food()})}};
   const lw=pick([64,96,128,160]);
   if(kind==='ledge'&&Math.abs(terr(x0+lw+20)-terr(x0+20))>10)kind='row';
   if(kind==='row'){const n=3+Math.floor(Math.random()*3);let dx=0;for(let i=0;i<n;i++){FD(dx,pick([18,18,46,76]));dx+=52+Math.random()*34}L=dx}
   else if(kind==='arc'){o.ents.push({kind:'obs',wx:x0+50,ay:terr(x0+50)+17,e:ob()});F(10,60);F(50,88);F(90,60);L=110}
   else if(kind==='air'){let dx=0;for(let i=0;i<4;i++){FD(dx,60+Math.random()*34);dx+=48+Math.random()*30}L=dx}
   else if(kind==='flyer'){o.ents.push({kind:'fly',wx:x0+50,ay:terr(x0+50)+84,e:'🎤'});let dx=0;for(let i=0;i<4;i++){FD(dx,18);dx+=50+Math.random()*26}L=dx}
   else if(kind==='ledge'){const cx=x0+lw/2+20,b=terr(cx);o.ents.push({kind:'ledge',wx:cx,ay:b,e:'',w:lw});const nu=Math.max(2,Math.floor(lw/44));for(let i=0;i<nu;i++)F(20+(lw/nu)*(i+0.5),18);const nt=Math.max(1,Math.floor(lw/56));for(let i=0;i<nt;i++)o.ents.push({kind:'food',wx:cx-lw/2+(lw/nt)*(i+0.5),ay:b+76+16,e:food()});L=lw+60}
   else{o.ents.push({kind:'obs',wx:x0+30,ay:terr(x0+30)+17,e:ob()},{kind:'obs',wx:x0+92,ay:terr(x0+92)+17,e:ob()});F(20,74);F(61,100);F(102,74);L=130}
   if(lv>=o.nextHeart){o.nextHeart=lv+8+Math.floor(Math.random()*5);const rel=kind==='air'?70:18;o.ents.push({kind:'life',wx:x0+L+40,ay:terr(x0+L+40)+rel,e:'❤️'});L+=80}
   const obstacle=kind==='arc'||kind==='double'||kind==='flyer';
   o.spawn=L+(obstacle?speed*(0.8+Math.random()*0.4):speed*(0.55+Math.random()*0.6))+50;
  };
  const support=(o:ReturnType<typeof mk>,hRef:number)=>{
   const pw=o.dist+PX;let sup=terr(pw);
   for(const e of o.ents){if(e.kind!=='ledge')continue;const top=e.ay+76;if(Math.abs(pw-e.wx)<(e.w??96)/2+8&&hRef>=top-3&&top>sup)sup=top}
   return sup;
  };
  const step=(dt:number)=>{
   const o=g.current;
   if(phase.current!=='play'||modalRef.current||pausedRef.current)return;
   o.t+=dt;const speed=Math.min(270,185+(o.lvl-1)*9);o.dist+=speed*dt;
   const prevH=o.h;const pwNow=o.dist+PX;
   const supBefore=support(o,prevH);
   const grounded=o.vy<=0&&prevH<=supBefore+Math.max(8,speed*dt*0.9+4);
   if(!grounded){o.vy-=GRAV*dt;o.h+=o.vy*dt}
   // izbočine (platforme): udar glavom odozdo, sletanje odozgo
   for(const e of o.ents){
    if(e.kind!=='ledge')continue;const under=e.ay+62,top=e.ay+76;
    if(Math.abs(pwNow-e.wx)<(e.w??96)/2+8){
     if(o.vy>0&&o.h+36>under&&prevH+36<=under+6&&o.h<top){o.h=under-36;if(o.vy>200)o.floats.push({x:PX,y:GY-o.h-48,t:0.7,txt:cyrRef.current?'Ау!':'Au!',c:'#ffd1e8'});o.vy=-40}
    }
   }
   const sup=support(o,prevH);
   if(o.vy<=0&&(grounded||o.h<=sup)){o.h=sup;o.vy=0}
   const on=o.vy<=0&&o.h<=sup+14;if(on)o.coy=0.1;else o.coy-=dt;
   if(o.buf>0){o.buf-=dt;if(on||(o.coy>0&&o.vy<=0)){o.vy=o.held?JUMP:MINHOP;o.buf=0;o.coy=0}}
   if(o.inv>0)o.inv-=dt;if(o.banner>0)o.banner-=dt;
   for(const k of o.clouds){k.x-=speed*k.z*0.25*dt;if(k.x<-50){k.x=W+50;k.y=80+Math.random()*240}}
   o.spawn-=speed*dt;if(o.spawn<=0)spawn(o,speed);
   const yc=o.h+18;
   o.ents=o.ents.filter(e=>{
    const sx=e.wx-o.dist;if(sx<-80)return false;
    if(e.kind==='ledge')return true;
    const dx=Math.abs(sx-PX),dy=Math.abs(e.ay-yc);
    if(e.kind==='life'){if(dx<24&&dy<28){if(o.lives<MAXL)o.lives++;else o.score+=50;o.floats.push({x:PX,y:GY-o.h-50,t:0.9,txt:cyrRef.current?'Њам!!!':'Njam!!!',c:'#ff9ad5'});return false}return true}
    if(e.kind==='food'){if(dx<22&&dy<26){o.score+=10;o.eaten++;o.floats.push({x:sx,y:GY-e.ay-12,t:0.6,txt:'+10',c:'#fff3b0'});const nl=1+Math.floor(o.eaten/10);if(nl>o.lvl){o.lvl=nl;o.banner=1.3}return false}return true}
    if(dx<20&&dy<28){if(o.inv<=0){o.lives--;o.inv=1.6;o.floats.push({x:PX,y:GY-o.h-50,t:0.9,txt:cyrRef.current?'Фуј!':'Fuj!',c:'#ff8f8f'});if(o.lives<=0)end()}return false}
    return true;
   });
   for(const f of o.floats){f.t-=dt;f.y-=30*dt}o.floats=o.floats.filter(f=>f.t>0);
  };
  const pig=(o:ReturnType<typeof mk>,x:number,feet:number,grounded:boolean,tt:number)=>{
   ctx.save();ctx.translate(x,feet-(grounded?Math.abs(Math.sin(tt*9))*1.6:0));
   ctx.scale(1.15,1.15);if(!grounded)ctx.rotate(Math.max(-0.25,Math.min(0.25,-o.vy/JUMP*0.22)));
   const leg=(hx:number,ph:number,col:string)=>{const a=grounded?Math.sin(tt*18+ph)*0.75:(hx>0?0.85:-0.85);const ex=hx+Math.sin(a)*12,ey=-12+Math.cos(a)*12;ctx.strokeStyle=col;ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(hx,-13);ctx.lineTo(ex,ey);ctx.stroke();ctx.fillStyle='#9d2f6b';ctx.beginPath();ctx.ellipse(ex+1,ey+0.5,3.2,2,0,0,Math.PI*2);ctx.fill()};
   leg(5,Math.PI,'#e879c9');leg(-15,0,'#e879c9');
   ctx.strokeStyle='#f472b6';ctx.lineWidth=2.2;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-20,-25);ctx.bezierCurveTo(-28,-29,-27,-37,-21,-34);ctx.bezierCurveTo(-17,-32,-21,-28,-24,-30);ctx.stroke();
   ctx.fillStyle='#fbb6d6';ctx.beginPath();ctx.ellipse(-2,-21,20,13,0,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#fdd5e8';ctx.beginPath();ctx.ellipse(-1,-15,14,6,0,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#f472b6';ctx.beginPath();ctx.moveTo(9,-34);ctx.lineTo(15,-42);ctx.lineTo(19,-32);ctx.closePath();ctx.fill();
   ctx.fillStyle='#fbb6d6';ctx.beginPath();ctx.arc(16,-25,11,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#f472b6';ctx.beginPath();ctx.ellipse(26,-23,6,4.6,0,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#9d2f6b';ctx.beginPath();ctx.ellipse(25,-23,1,1.5,0,0,Math.PI*2);ctx.ellipse(28.5,-23,1,1.5,0,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#111';ctx.beginPath();ctx.arc(19.5,-29,2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(20.1,-29.7,0.7,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='rgba(244,114,182,.55)';ctx.beginPath();ctx.ellipse(14,-21,3,2,0,0,Math.PI*2);ctx.fill();
   leg(9,0,'#f9a8d4');leg(-11,Math.PI,'#f9a8d4');
   ctx.restore();
  };
  const brick=(cx:number,top:number,w:number)=>{
   const x0=cx-w/2;ctx.fillStyle='#3b4060';ctx.fillRect(x0,top,w,14);ctx.fillStyle='#7a7f9e';
   for(let i=0;i<Math.ceil(w/24);i++){const bx=x0+i*24;ctx.fillRect(bx+1,top+1,Math.min(22,w-i*24-1),5.5);ctx.fillRect(Math.max(x0,bx+(i%2?-8:8)+1),top+7.5,Math.min(20,x0+w-Math.max(x0,bx+(i%2?-8:8)+1)),5.5)}
   ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillRect(x0,top,w,1.5);
  };
  const draw=()=>{
   const o=g.current;ctx.setTransform(2,0,0,2,0,0);
   const sky=ctx.createLinearGradient(0,0,0,GY);sky.addColorStop(0,'#05070f');sky.addColorStop(.6,'#15133a');sky.addColorStop(1,'#2a1f55');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
   ctx.fillStyle='rgba(255,255,255,.5)';for(let i=0;i<40;i++){const sx=((i*97)%W+W-(o.dist*0.02*(1+i%3))%W)%W;ctx.fillRect(sx,(i*53)%(GY-160)+8,1.4,1.4)}
   for(const k of o.clouds)put('☁️',k.s,k.x,k.y,0.3);
   const off=(o.dist*0.3)%120;ctx.fillStyle='#1a1740';for(let i=-1;i<5;i++){const x=i*120-off;ctx.beginPath();ctx.moveTo(x,GY);ctx.lineTo(x+60,GY-170);ctx.lineTo(x+120,GY);ctx.closePath();ctx.fill()}
   const off2=(o.dist*0.5)%80;ctx.fillStyle='#211d4e';for(let i=-1;i<7;i++){const x=i*80-off2;ctx.beginPath();ctx.moveTo(x,GY);ctx.lineTo(x+40,GY-80);ctx.lineTo(x+80,GY);ctx.closePath();ctx.fill()}
   ctx.fillStyle='#141831';ctx.beginPath();ctx.moveTo(0,H);for(let x=0;x<=W;x+=4)ctx.lineTo(x,GY-terr(o.dist+x));ctx.lineTo(W,H);ctx.closePath();ctx.fill();
   ctx.strokeStyle='#5a5f86';ctx.lineWidth=2;ctx.beginPath();for(let x=0;x<=W;x+=4){const y=GY-terr(o.dist+x);if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.stroke();
   ctx.fillStyle='#2c3254';for(let k=0;k<12;k++){const wxs=Math.floor((o.dist-o.dist%40)/40)*40+k*40-80;const sx=wxs-o.dist;if(sx<-30||sx>W)continue;ctx.fillRect(sx,GY-terr(wxs)+12+(k%3)*10,20,3)}
   for(const e of o.ents){const sx=e.wx-o.dist;if(sx<-80||sx>W+80)continue;if(e.kind==='ledge')brick(sx,GY-(e.ay+76),e.w??96);else put(e.e,e.kind==='food'?26:e.kind==='life'?30:34,sx,GY-e.ay,1,e.kind==='food'||e.kind==='life'?Math.sin(o.t*5+e.wx*0.05)*0.12:0)}
   const grounded=o.vy<=0&&o.h<=support(o,o.h)+8;
   if(!(o.inv>0&&Math.floor(o.inv*10)%2===0))pig(o,PX,GY-o.h,grounded,o.t);
   for(const f of o.floats){ctx.globalAlpha=Math.min(1,f.t*2);ctx.fillStyle=f.c;ctx.font='800 16px Arial,Helvetica,sans-serif';ctx.textAlign='center';ctx.fillText(f.txt,f.x,f.y);ctx.globalAlpha=1}
   for(let i=0;i<o.lives;i++)put('❤️',15,24+i*26,22);
   ctx.textBaseline='middle';ctx.textAlign='right';ctx.fillStyle='#c3c8de';ctx.font='700 14px Arial,Helvetica,sans-serif';ctx.fillText(`${cyrRef.current?'Ниво':'Nivo'} ${o.lvl}`,W-12,20);
   ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='800 20px Arial,Helvetica,sans-serif';ctx.fillText(String(o.score),W/2,20);
   ctx.fillStyle='#9aa1bd';ctx.font='600 10px Arial,Helvetica,sans-serif';ctx.fillText((cyrRef.current?'НАЈБОЉИ ':'NAJBOLJI ')+(bestRef.current??'–'),W/2,38);
   if(pausedRef.current&&phase.current==='play'){ctx.fillStyle='rgba(5,7,15,.6)';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.font='800 26px Arial,Helvetica,sans-serif';ctx.fillText(cyrRef.current?'Пауза':'Pauza',W/2,H/2-10);ctx.fillStyle='#c3c8de';ctx.font='600 14px Arial,Helvetica,sans-serif';ctx.fillText(cyrRef.current?'Додирни за наставак':'Dodirni za nastavak',W/2,H/2+20)}
   else if(phase.current==='ready'&&!modalRef.current){ctx.fillStyle='rgba(5,7,15,.65)';ctx.fillRect(0,H/2-24,W,48);ctx.fillStyle='#fff';ctx.font='700 18px Arial,Helvetica,sans-serif';ctx.fillText(cyrRef.current?'Додирни за старт':'Dodirni za start',W/2,H/2)}
   else if(phase.current==='play'&&o.banner>0){ctx.globalAlpha=Math.min(1,o.banner*2);ctx.fillStyle='#e879c9';ctx.font='800 28px Arial,Helvetica,sans-serif';ctx.fillText(`${cyrRef.current?'Ниво':'Nivo'} ${o.lvl}`,W/2,H/2-60);ctx.globalAlpha=1}
   ctx.textBaseline='alphabetic';
  };
  const tick=(now:number)=>{const dt=Math.min(0.033,(now-last)/1000);last=now;step(dt);draw();raf=requestAnimationFrame(tick)};
  raf=requestAnimationFrame(tick);
  return()=>cancelAnimationFrame(raf);
 },[storagePrefix]);

 function togglePause(){if(phase.current!=='play'||modalRef.current)return;pausedRef.current=!pausedRef.current;setPaused(pausedRef.current)}
 useEffect(()=>{const f=()=>{if(document.hidden&&phase.current==='play'&&!pausedRef.current){pausedRef.current=true;setPaused(true)}};document.addEventListener('visibilitychange',f);return()=>document.removeEventListener('visibilitychange',f)},[]);
 function jump(){
  if(modalRef.current)return;
  if(pausedRef.current){togglePause();return}
  if(phase.current==='ready'){phase.current='play';return}
  if(phase.current==='play'){const o=g.current;o.held=true;if(o.vy<=0&&(o.h<=terr(o.dist+PX)+14||o.coy>0)){o.vy=JUMP;o.buf=0;o.coy=0}else o.buf=0.14}
 }
 function release(){const o=g.current;o.held=false;if(o.vy>MINHOP)o.vy=MINHOP}
 const fn=useRef({jump,release,togglePause});fn.current={jump,release,togglePause};
 useEffect(()=>{
  const h=(e:KeyboardEvent,down:boolean)=>{
   if(modalRef.current)return;
   const tg=e.target as HTMLElement|null;if(tg&&/^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName))return;
   const r=root.current?.getBoundingClientRect();if(!r||r.bottom<0||r.top>window.innerHeight)return;
   const k=e.key;
   if(k==='p'||k==='P'||k==='Escape'){if(down){e.preventDefault();fn.current.togglePause()}return}
   if(k===' '||k==='ArrowUp'||k==='w'||k==='W'){e.preventDefault();if(down){if(!e.repeat)fn.current.jump()}else fn.current.release()}
  };
  const d=(e:KeyboardEvent)=>h(e,true),u=(e:KeyboardEvent)=>h(e,false);
  window.addEventListener('keydown',d);window.addEventListener('keyup',u);
  return()=>{window.removeEventListener('keydown',d);window.removeEventListener('keyup',u)};
 },[]);
 function closeModal(){if(modal==='help')safeWrite(storagePrefix+'-intro','1');setModal(null);setCopyText('');setNotice('');root.current?.focus({preventScroll:true})}
 async function share(){
  const url=shareUrl||location.origin+location.pathname;
  const text=t('Super-prase','Супер-прасе')+` · ${res.score} ${t('poena','поена')} · ${t('nivo','ниво')} ${res.level}\n\n${url}`;
  try{await navigator.clipboard.writeText(text);setNotice(t('Rezultat je kopiran!','Резултат је копиран!'))}catch{setCopyText(text);setNotice(t('Kopiraj označeni rezultat.','Копирај означени резултат.'))}
 }
 const helpTitle=t('Kako se igra Super-prase?','Како се игра Супер-прасе?');
 return <div ref={root} className={s.root} lang={cyr?'sr-Cyrl':'sr-Latn'} tabIndex={-1}> 
 <header className={s.header}><div className={s.title}><span className={s.brand}>{cyr?<>Супер-<em>прасе</em></>:<>Super-<em>prase</em></>}</span></div><div className={s.tools}><button className={s.help} aria-label={helpTitle} onClick={()=>setModal('help')}>?</button></div></header>
 <section className={s.game} aria-label={t('Super-prase','Супер-прасе')}>
  <div className={s.stage}><canvas ref={cv} className={s.cv} role="img" aria-label={t('Super-prase, tabla','Супер-прасе, табла')} onPointerDown={e=>{try{e.currentTarget.setPointerCapture(e.pointerId)}catch{}root.current?.focus({preventScroll:true});jump()}} onPointerUp={release} onPointerCancel={release}/><button type="button" className={s.ng} onClick={startNew}>{t('Nova igra','Нова игра')}</button><button type="button" className={s.pz} onClick={togglePause} aria-label={paused?t('Nastavi','Настави'):t('Pauza','Пауза')}>{paused?<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 1 L11 6 L2 11 Z" fill="currentColor"/></svg>:<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><rect x="2" y="1" width="3" height="10" rx="0.8" fill="currentColor"/><rect x="7" y="1" width="3" height="10" rx="0.8" fill="currentColor"/></svg>}</button></div>
 </section>
 <Dialog open={modal==='help'} titleId={id+'-help'} onClose={closeModal} closeLabel={t('Zatvori','Затвори')}>
  <h2 id={id+'-help'}>{helpTitle}</h2>
  <p>{t('Prase trči samo. Dodirni tablu (ili pritisni razmak) da skočiš: kratak dodir je mali skok, duži je veći. Prase jede hranu 🍎🍕🍔 i skuplja poene.','Прасе трчи само. Додирни таблу (или притисни размак) да скочиш: кратак додир је мали скок, дужи је већи. Прасе једе храну 🍎🍕🍔 и скупља поене.')}</p>
  <p>{t('Radio 📻, gitaru 🎸 i druge instrumente prase ne sme da pojede, preskoči ih! Mikrofon 🎤 koji lebdi propusti ispod sebe, bez skoka. Imaš tri života ❤️, a retko (otprilike na svakih deset nivoa) se pojavi srce ❤️ koje vraća jedan život (najviše pet). Dugme za pauzu (gore desno, ispod nivoa, ili taster P) zaustavlja igru. Ciglene platforme 🧱 možeš da pretrčiš ispod njih (ako skočiš, prase udari glavom) ili da se popneš na njih po dodatnu hranu. Na svakih deset pojedenih namirnica počinje novi nivo: prase trči malo brže, a stižu nove prepreke.','Радио 📻, гитару 🎸 и друге инструменте прасе не сме да поједе, прескочи их! Микрофон 🎤 који лебди пропусти испод себе, без скока. Имаш три живота ❤️, а ретко (отприлике на сваких десет нивоа) се појави срце ❤️ које враћа један живот (највише пет). Дугме за паузу (горе десно, испод нивоа, или тастер P) зауставља игру. Циглене платформе 🧱 можеш да претрчиш испод њих (ако скочиш, прасе удари главом) или да се попнеш на њих по додатну храну. На сваких десет поједених намирница почиње нови ниво: прасе трчи мало брже, а стижу нове препреке.')}</p>
  <button className={s.primary} onClick={closeModal}>{t('Igraj!','Играј!')}</button>
 </Dialog>
 <Dialog open={modal==='over'} titleId={id+'-over'} onClose={closeModal} closeLabel={t('Zatvori','Затвори')}><div className={s.result}><span className={s.spark} aria-hidden="true">🐷</span>
  <h2 id={id+'-over'}>{t('Prase je sito!','Прасе је сито!')}</h2>
  <p>{res.score} {t('poena','поена')} · {t('nivo','ниво')} {res.level}{res.nb?' · '+t('novi rekord!','нови рекорд!'):''}</p>
  <button className={s.primary} onClick={startNew}>{t('Nova igra','Нова игра')}</button><button className={s.primary} onClick={()=>void share()}>{t('Podeli rezultat ↗︎','Подели резултат ↗︎')}</button>
  <p role="status" aria-live="polite">{notice}</p>{copyText&&<textarea ref={copyRef} className={s.copy} readOnly value={copyText} aria-label={t('Rezultat za kopiranje','Резултат за копирање')}/>}</div></Dialog>
 </div>;
}
