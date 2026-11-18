'use client';
import { useCallback, useEffect, useId, useRef, useState, type PointerEvent } from 'react';
import { H, MAZE, W, createGame, dirFromKey, pos, setDirection, update, type Dir, type Game, type Status } from '@/lib/zvukozder/engine.mjs';
import Dialog from './Dialog';
import s from './Zvukozder.module.css';

export type ZvukozderProps = {
 /** Change only to intentionally isolate stored best score and settings. */
 storagePrefix?: string;
 /** Jezik stranice sajta (npr. "sr-cyrl", "sr-latn", "en"). Kada je zadat, igra prati pismo sajta, skriva svoj izbor Ћир/Lat i ne pamti ga; "sr-cyrl" daje ćirilicu, sve ostalo latinicu. */
 locale?: string;
 /** Radio 10K: kada je false, uputstvo se ne otvara samo pri prvom dolasku (dugme ? ostaje). */
 autoHelp?: boolean;
 /** Fixed canonical URL for sharing, if the game is embedded on several pages. */
 shareUrl?: string;
};
type Script='cyr'|'lat';
type Modal='help'|'over'|null;
type Fx={x:number;y:number;t:number;color:string};
const EMOJI_FONT='"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const TINT={blue:'rgba(58,141,255,.7)',teal:'rgba(47,214,198,.72)',gray:'rgba(125,129,150,.72)'};
const ANGLE:Record<Dir,number>={right:0,down:90,left:180,up:270};
const safeRead=(key:string)=>{try{return localStorage.getItem(key)}catch{return null}};
const safeWrite=(key:string,value:string)=>{try{localStorage.setItem(key,value);return true}catch{return false}};
const fmt=(n:number)=>String(n).replace(/\B(?=(\d{3})+(?!\d))/g,'.');
const SWIPE=18;

// Which way does the speaker glyph open on this device? Apple draws it opening to the upper right (-45 deg).
// Elsewhere we measure where the ink mass sits relative to its bounding box and snap to 45 deg.
function nativeAngle():number{
 if(/Mac|iPhone|iPad|iPod/.test(navigator.userAgent))return -45;
 try{
  const n=64,c=document.createElement('canvas');c.width=c.height=n;const x=c.getContext('2d',{willReadFrequently:true})!;
  x.font=`48px ${EMOJI_FONT}`;x.textAlign='center';x.textBaseline='middle';x.fillText('🔈',n/2,n/2);
  const d=x.getImageData(0,0,n,n).data;let sx=0,sy=0,m=0,x0=n,x1=0,y0=n,y1=0;
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){const a=d[(i*n+j)*4+3];if(a>20){sx+=j*a;sy+=i*a;m+=a;x0=Math.min(x0,j);x1=Math.max(x1,j);y0=Math.min(y0,i);y1=Math.max(y1,i)}}
  if(!m)return 0;
  const dx=sx/m-(x0+x1)/2,dy=sy/m-(y0+y1)/2;if(Math.hypot(dx,dy)<1.2)return 0;
  return Math.round(Math.atan2(dy,dx)*180/Math.PI/45)*45;
 }catch{return 0}
}

export default function Zvukozder({storagePrefix='zvukozder-v1',shareUrl,locale,autoHelp=true}:ZvukozderProps){
 const forced:Script|null=locale==null?null:/cyr/i.test(locale)?'cyr':'lat';
 const id=useId();const root=useRef<HTMLDivElement>(null);const wrap=useRef<HTMLDivElement>(null);const canvas=useRef<HTMLCanvasElement>(null);const copyRef=useRef<HTMLTextAreaElement>(null);
 const game=useRef<Game|null>(null);const walls=useRef<HTMLCanvasElement|null>(null);const sprites=useRef(new Map<string,HTMLCanvasElement>());
 const [script,setScript]=useState<Script>(forced??'cyr');const [cell,setCell]=useState(20);const [modal,setModal]=useState<Modal>(null);const [paused,setPaused]=useState(false);
 useEffect(()=>{if(forced)setScript(forced)},[forced]);
 const [hud,setHud]=useState<{score:number;lives:number;level:number;status:Status}>({score:0,lives:3,level:1,status:'ready'});const [best,setBest]=useState(0);
 const [notice,setNotice]=useState('');const [copyText,setCopyText]=useState('');const [storageWarning,setStorageWarning]=useState(false);
 const bestRef=useRef(0);const pausedRef=useRef(false);const modalRef=useRef<Modal>(null);const hudRef=useRef(hud);const cellRef=useRef(cell);const scriptRef=useRef<Script>('cyr');
 const origin=useRef<{x:number;y:number;id:number}|null>(null);const fx=useRef<Fx[]>([]);const facing=useRef<Dir>('right');const nat=useRef(-45);
 
 const t=(lat:string,cyr:string)=>script==='lat'?lat:cyr;
 const helpTitle=t('Kako se igra Zvukožder?','Како се игра Звукождер?');
 pausedRef.current=paused;modalRef.current=modal;cellRef.current=cell;scriptRef.current=script;

 const saveBest=useCallback(()=>{if(!safeWrite(storagePrefix+'-best',String(bestRef.current)))setStorageWarning(true)},[storagePrefix]);
 const sprite=useCallback((emoji:string,size:number,tint?:string)=>{
  const dpr=window.devicePixelRatio||1,key=emoji+'|'+size+'|'+dpr+'|'+(tint||'');let c=sprites.current.get(key);
  if(!c){const box=Math.ceil(size*1.4*dpr);c=document.createElement('canvas');c.width=c.height=box;const x=c.getContext('2d')!;x.font=`${Math.round(size*dpr)}px ${EMOJI_FONT}`;x.textAlign='center';x.textBaseline='middle';x.fillText(emoji,box/2,box/2+size*dpr*0.06);
   if(tint){x.globalCompositeOperation='source-atop';x.fillStyle=tint;x.fillRect(0,0,box,box)}
   sprites.current.set(key,c)}
  return c;
 },[]);

 // Size the canvas to the available width and viewport height.
 useEffect(()=>{
  const el=wrap.current;if(!el)return;
  const fit=()=>{const avail=Math.min(el.clientWidth||W*20,620);const byHeight=(window.innerHeight-200)/H;
   setCell(Math.max(14,Math.min(36,Math.floor(Math.min(avail/W,Math.max(14,byHeight))))))};
  fit();const ro=new ResizeObserver(fit);ro.observe(el);window.addEventListener('resize',fit);
  return()=>{ro.disconnect();window.removeEventListener('resize',fit)};
 },[]);
 useEffect(()=>{
  const c=canvas.current;if(!c)return;const dpr=window.devicePixelRatio||1;
  c.width=W*cell*dpr;c.height=H*cell*dpr;sprites.current.clear();
  const w=document.createElement('canvas');w.width=c.width;w.height=c.height;const x=w.getContext('2d')!;x.scale(dpr,dpr);
  for(let r=0;r<H;r++)for(let col=0;col<W;col++){const ch=MAZE[r][col];
   if(ch==='#'){x.fillStyle='#141831';x.strokeStyle='#5a5f86';x.lineWidth=1.5;x.beginPath();x.roundRect(col*cell+2,r*cell+2,cell-4,cell-4,Math.max(3,cell*0.22));x.fill();x.stroke()}
   else if(ch==='G'){x.fillStyle='#0a0d1a';x.fillRect(col*cell,r*cell,cell,cell)}}
  walls.current=w;
 },[cell]);

 const draw=useCallback(()=>{
  const c=canvas.current,g=game.current,w=walls.current;if(!c||!g||!w)return;const ctx=c.getContext('2d')!;const dpr=window.devicePixelRatio||1,k=cellRef.current;
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(w,0,0);ctx.setTransform(dpr,0,0,dpr,0,0);
  const put=(emoji:string,size:number,x:number,y:number,o:{scale?:number;rot?:number;alpha?:number;tint?:string}={})=>{
   const sp=sprite(emoji,size,o.tint),b=size*1.4*(o.scale??1);
   for(const dx of (x>W-1?[0,-W]:x<1?[0,W]:[0])){ctx.save();ctx.globalAlpha=o.alpha??1;ctx.translate((x+dx+0.5)*k,(y+0.5)*k);if(o.rot)ctx.rotate(o.rot);ctx.drawImage(sp,-b/2,-b/2,b,b);ctx.restore()}
  };
  const warn=g.enemies.some(e=>e.warn);
  if(warn){ctx.fillStyle='rgba(255,120,40,'+(0.18+0.12*Math.sin(g.time*18))+')';ctx.beginPath();ctx.arc(7.5*k,5.5*k,k*0.62,0,Math.PI*2);ctx.fill()}
  put('🌋',k*0.95,7+(warn?Math.sin(g.time*55)*0.04:0),5);
  ctx.fillStyle='#e879c9';
  for(let r=0;r<H;r++)for(let col=0;col<W;col++){const v=g.pellets[r*W+col];
   if(v===1){ctx.beginPath();ctx.arc((col+0.5)*k,(r+0.5)*k,Math.max(2,k*0.11),0,Math.PI*2);ctx.fill()}
   else if(v===2)put('🔊',k*0.78,col,r,{scale:1+0.12*Math.sin(g.time*6),tint:TINT.blue});
   else if(v===3)put('🔇',k*0.78,col,r,{scale:1+0.12*Math.sin(g.time*6)})}
  if(g.bonus&&(g.bonus.t>3||Math.floor(g.time*6)%2===0))put('🎵',k*0.8,g.bonus.c,g.bonus.r,{scale:1+0.12*Math.sin(g.time*8),tint:TINT.teal});
  for(const e of g.enemies){if(e.mode==='house')continue;const q=pos(e);
   if(e.mode==='eaten')put('✨',k*0.6,q.x,q.y);
   else if(g.mute>0)put(e.emoji,k*0.8,q.x,q.y,{tint:TINT.gray,alpha:0.85});
   else if(e.mode==='scared'){const blink=g.scared<2&&Math.floor(g.time*6)%2===0;put(e.emoji,k*0.8,q.x,q.y,{tint:blink?undefined:TINT.blue})}
   else put(e.emoji,k*0.8,q.x,q.y)}
  const p=pos(g.player);
  if(g.player.dir)facing.current=g.player.dir;
  const rot=((ANGLE[facing.current]-nat.current)*Math.PI)/180;
  ctx.fillStyle='rgba(223,143,234,.22)';ctx.beginPath();ctx.arc((p.x+0.5)*k,(p.y+0.5)*k,k*0.46,0,Math.PI*2);ctx.fill();
  if(g.status==='dying'){const f=Math.min(1,(1.4-g.timer)/1.2);put('🔈',k*0.82,p.x,p.y,{scale:Math.max(0.05,1-f),rot:rot+f*Math.PI*4})}
  else put('🔈',k*0.82,p.x,p.y,{rot,scale:1+(g.player.dir&&g.status==='playing'?0.08*Math.sin(g.time*16):0)});
  const now=performance.now();fx.current=fx.current.filter(f=>now-f.t<650);
  for(const f of fx.current){const pr=(now-f.t)/650;for(const d of [0,0.22]){const q=Math.max(0,pr-d);if(q<=0)continue;ctx.strokeStyle=f.color;ctx.globalAlpha=(1-q)*0.8;ctx.lineWidth=2;ctx.beginPath();ctx.arc((f.x+0.5)*k,(f.y+0.5)*k,(0.4+1.5*q)*k,0,Math.PI*2);ctx.stroke()}}
  ctx.globalAlpha=1;
 },[sprite]);

 useEffect(()=>{
  setScript(forced??(safeRead(storagePrefix+'-script')==='lat'?'lat':'cyr'));
  const b=Number(safeRead(storagePrefix+'-best'));bestRef.current=Number.isInteger(b)&&b>0?b:0;setBest(bestRef.current);
  nat.current=nativeAngle();
  game.current=createGame();if(autoHelp&&!safeRead(storagePrefix+'-intro'))setModal('help');
  let raf=0,last=performance.now(),overTimer:ReturnType<typeof setTimeout>|undefined;
  const tt=(lat:string,cyr:string)=>scriptRef.current==='lat'?lat:cyr;
  const frame=(now:number)=>{raf=requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,0.1);last=now;const g=game.current;if(!g)return;
   if(!pausedRef.current&&!modalRef.current&&!document.hidden)update(g,dt);
   draw();
   if(g.score>bestRef.current){bestRef.current=g.score;setBest(g.score)}
   const h=hudRef.current;if(h.score!==g.score||h.lives!==g.lives||h.level!==g.level||h.status!==g.status){hudRef.current={score:g.score,lives:g.lives,level:g.level,status:g.status};setHud(hudRef.current)}
   if(g.events.length){const ev=g.events.splice(0),p=pos(g.player);
    for(const name of ev){
     if(name==='amp'){fx.current.push({x:p.x,y:p.y,t:performance.now(),color:'#3a8dff'});setNotice(tt('Pomodrili su. Pojedi ih!','Помодрили су. Поједи их!'))}
     else if(name==='mute'){fx.current.push({x:p.x,y:p.y,t:performance.now(),color:'#9aa1bd'});setNotice(tt('Utišani su i bezopasni na nekoliko sekundi.','Утишани су и безопасни на неколико секунди.'))}
     else if(name==='bonus'||name==='eat')fx.current.push({x:p.x,y:p.y,t:performance.now(),color:name==='bonus'?'#2fd6c6':'#e879c9'})}
    if(ev.some(x=>x==='die'||x==='over'||x==='clear'))saveBest();if(ev.includes('over'))overTimer=setTimeout(()=>setModal('over'),500)}
  };
  raf=requestAnimationFrame(frame);
  const hide=()=>{if(document.hidden&&game.current?.status==='playing')setPaused(true)};
  document.addEventListener('visibilitychange',hide);window.addEventListener('pagehide',saveBest);
  return()=>{cancelAnimationFrame(raf);clearTimeout(overTimer);document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',saveBest)};
 },[storagePrefix,draw,saveBest]);
 useEffect(()=>{if(!notice)return;const x=setTimeout(()=>setNotice(''),3500);return()=>clearTimeout(x)},[notice]);
 useEffect(()=>{if(copyText)copyRef.current?.select()},[copyText]);

 function input(dir:Dir){const g=game.current;if(!g||modalRef.current)return;if(pausedRef.current)setPaused(false);setDirection(g,dir)}
 function togglePause(){const g=game.current;if(!g||g.status==='over'||g.status==='ready')return;setPaused(p=>!p);root.current?.focus({preventScroll:true})}
 function startNew(){game.current=createGame();fx.current=[];setModal(null);setPaused(false);setNotice('');setCopyText('');root.current?.focus({preventScroll:true})}
 function closeModal(){if(modal==='help')safeWrite(storagePrefix+'-intro','1');setModal(null);setCopyText('');setNotice('');root.current?.focus({preventScroll:true})}
 async function share(){
  const g=game.current;if(!g)return;const url=shareUrl||location.origin+location.pathname;
  const text='Zvukožder · '+t('rezultat ','резултат ')+fmt(g.score)+' · '+t('nivo ','ниво ')+g.level+'\n\n'+url;
  try{await navigator.clipboard.writeText(text);setNotice(t('Rezultat je kopiran!','Резултат је копиран!'))}catch{setCopyText(text);setNotice(t('Kopiraj označeni rezultat.','Копирај означени резултат.'))}
 }
 function down(e:PointerEvent<HTMLElement>){root.current?.focus({preventScroll:true});origin.current={x:e.clientX,y:e.clientY,id:e.pointerId};try{e.currentTarget.setPointerCapture(e.pointerId)}catch{}}
 function moveP(e:PointerEvent<HTMLElement>){
  const o=origin.current;if(!o||o.id!==e.pointerId)return;const dx=e.clientX-o.x,dy=e.clientY-o.y;
  if(Math.max(Math.abs(dx),Math.abs(dy))<SWIPE)return;
  input(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'));origin.current={x:e.clientX,y:e.clientY,id:e.pointerId};
 }
  const pad:[Dir,string,string,string][]=[['up','▲',t('Gore','Горе'),s.up],['left','◀︎',t('Levo','Лево'),s.left],['down','▼',t('Dole','Доле'),s.down],['right','▶︎',t('Desno','Десно'),s.right]];
 return <div ref={root} className={s.root} lang={script==='cyr'?'sr-Cyrl':'sr-Latn'} tabIndex={-1} onKeyDown={e=>{
  if(e.ctrlKey||e.metaKey||e.altKey||modal)return;const target=e.target as HTMLElement;
  if(['INPUT','TEXTAREA','SELECT'].includes(target.tagName)||target.isContentEditable)return;
  const dir=dirFromKey(e.key,e.code);if(dir){e.preventDefault();input(dir);return}
  if(e.code==='KeyP'||(e.code==='Space'&&target.tagName!=='BUTTON')){e.preventDefault();togglePause()}
 }}>
 <header className={s.header}><div className={s.title}><span className={s.brand}>{t('ZVUKO','ЗВУКО')}<em>{t('ŽDER','ЖДЕР')}</em></span></div>
 <div className={s.tools}>{!forced&&<div className={s.language} aria-label={t('Pismo','Писмо')}>{(['cyr','lat'] as Script[]).map(x=><button key={x} aria-pressed={script===x} className={script===x?s.active:''} onClick={()=>{setScript(x);safeWrite(storagePrefix+'-script',x);setNotice('')}}>{x==='cyr'?'Ћир':'Lat'}</button>)}</div>}<button className={s.help} aria-label={helpTitle} onClick={()=>setModal('help')}>?</button></div></header>
 <section className={s.game} aria-label={t('Igra Zvukožder','Игра Звукождер')}>
 <div className={s.play}>
 <div className={s.mainCol}>
 <div ref={wrap} style={{width:'100%'}}><div className={s.stage} onPointerDown={down} onPointerMove={moveP} onPointerUp={()=>{origin.current=null}} onPointerCancel={()=>{origin.current=null}}>
  <canvas ref={canvas} className={s.canvas} style={{width:W*cell,height:H*cell}} role="img" aria-label={t('Lavirint sa tačkicama. Pomeraj Zvukožder strelicama ili prevlačenjem.','Лавиринт са тачкицама. Помери Звукождер стрелицама или превлачењем.')}/>
  {paused?<div className={s.overlay}><strong>{t('Pauza','Пауза')}</strong><button className={s.secondary} onClick={togglePause}>{t('Nastavi','Настави')}</button></div>
  :hud.status==='ready'&&!modal?<div className={s.overlay}><strong>{hud.level>1?`${t('Nivo','Ниво')} ${hud.level}`:t('Spreman?','Спреман?')}</strong><span>{t('Prevuci prstom po tabli ili pritisni strelicu.','Превуци прстом по табли или притисни стрелицу.')}</span></div>
  :hud.status==='clear'?<div className={s.overlay}><strong>{t('Sve tačkice su pojedene!','Све тачкице су поједене!')}</strong></div>:null}
 </div></div>
 <div className={s.message} role="status" aria-live="polite">{modal?null:notice}</div>
 </div>
 <div className={s.side}>
<div className={s.stats}><div className={s.stat}><span>{t('Rezultat','Резултат')}</span><strong>{fmt(hud.score)}</strong></div><div className={s.stat}><span>{t('Najbolji','Најбољи')}</span><strong>{fmt(best)}</strong></div><div className={s.stat}><span>{t('Nivo','Ниво')}</span><strong>{hud.level}</strong></div><div className={s.stat}><span>{t('Životi','Животи')}</span><strong>{hud.lives}</strong></div></div>
 <div className={s.buttons}><button className={`${s.pill} ${s.iconPill}`} aria-label={paused?t('Nastavi','Настави'):t('Pauza','Пауза')} onClick={togglePause}>{paused?'▶︎':'Ⅱ'}</button><button className={s.pill} onClick={startNew}><span aria-hidden="true">✧ </span>{t('Nova igra','Нова игра')}</button></div>
 <div className={s.legend}><span><b className={s.dotIcon}/>{t('poeni','поени')}</span><span><i>🔥</i><i>⚡</i>{t('opasno','опасно')}</span><span><i className={s.tintBlue}>🔊</i>{t('plave jedi','плаве једи')}</span><span><i>🔇</i>{t('zaustavi ih','заустави их')}</span></div>
 </div>
 </div>
 <div className={s.pad} aria-label={t('Tasteri za pomeranje','Тастери за померање')}>{pad.map(([dir,sym,label,cls])=><button key={dir} className={`${s.padKey} ${cls}`} aria-label={label} onPointerDown={e=>{e.preventDefault();input(dir)}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();input(dir)}}}>{sym}</button>)}</div>
 </section>
 <Dialog open={modal==='help'} titleId={id+'-help'} onClose={closeModal} closeLabel={t('Zatvori','Затвори')}>
 <h2 id={id+'-help'}>{helpTitle}</h2><p>{t('Vodi zvučnik kroz lavirint i pojedi sve tačkice. Pomeraj ga strelicama ili tasterima W A S D, prevlačenjem prsta po tabli ili tasterima ispod table.','Води звучник кроз лавиринт и поједи све тачкице. Помери га стрелицама или тастерима W A S D, превлачењем прста по табли или тастерима испод табле.')}</p>
 <div className={s.examples}>
  <div className={s.example}><span className={s.sampleEmoji}>🔈</span><p><strong>{t('Zvukožder','Звукождер')}</strong>{t('Tvoj lik. Ima tri života; dodatni stiže na 5.000 poena. Tačkica nosi 10 poena.','Твој лик. Има три живота; додатни стиже на 5.000 поена. Тачкица носи 10 поена.')}</p></div>
  <div className={s.example}><span className={s.sampleEmoji}>🔥⚡</span><p><strong>{t('Toplo je opasno','Топло је опасно')}</strong>{t('Dodir košta život. Vatra juri, munja je brža. Izlaze iz vulkana 🌋, koji se pre toga zatrese.','Додир кошта живот. Ватра јури, муња је бржа. Излазе из вулкана 🌋, који се пре тога затресе.')}</p></div>
  <div className={s.example}><span className={s.sampleEmoji}><span className={s.tintBlue}>🔊</span></span><p><strong>{t('Pojačanje: 50 poena','Појачање: 50 поена')}</strong>{t('Zvučni talas pretvara neprijatelje u plave. Plave možeš da pojedeš za 200, 400, 800 i 1600 poena.','Звучни талас претвара непријатеље у плаве. Плаве можеш да поједеш за 200, 400, 800 и 1600 поена.')}</p></div>
  <div className={s.example}><span className={s.sampleEmoji}>🔇</span><p><strong>{t('Mute: 50 poena','Муте: 50 поена')}</strong>{t('Neprijatelji se utišaju i nekoliko sekundi stoje, bezopasni.','Непријатељи се утишају и неколико секунди стоје, безопасни.')}</p></div>
  <div className={s.example}><span className={s.sampleEmoji}><span className={s.tintTeal}>🎵</span></span><p><strong>{t('Bonus nota','Бонус нота')}</strong>{t('Povremeno se pojavi na sredini lavirinta i brzo nestane. Nosi 200 poena ili više.','Повремено се појави на средини лавиринта и брзо нестане. Носи 200 поена или више.')}</p></div>
 </div>
 <div className={s.callout}><strong>↔︎ {t('Tunel i pauza','Тунел и пауза')}</strong><p>{t('Izlaz sa leve ivice vodi na desnu, i obrnuto. Pauza: taster P ili razmak.','Излаз са леве ивице води на десну, и обрнуто. Пауза: тастер P или размак.')}</p></div>
 {storageWarning&&<p role="status">{t('Pregledač ne dozvoljava čuvanje najboljeg rezultata.','Прегледач не дозвољава чување најбољег резултата.')}</p>}
 <button className={s.primary} onClick={closeModal}>{t('Igraj!','Играј!')}</button>
 </Dialog>
 <Dialog open={modal==='over'} titleId={id+'-over'} onClose={closeModal} closeLabel={t('Zatvori','Затвори')}><div className={s.result}><span className={s.spark} aria-hidden="true">✦</span><h2 id={id+'-over'}>{t('Kraj igre','Крај игре')}</h2><p>{t('Rezultat: ','Резултат: ')}{fmt(hud.score)} · {t('Nivo: ','Ниво: ')}{hud.level} · {t('Najbolji: ','Најбољи: ')}{fmt(best)}</p>
 <button className={s.primary} onClick={startNew}>{t('Nova igra','Нова игра')}</button><button className={s.primary} onClick={()=>void share()}>{t('Podeli rezultat ↗︎','Подели резултат ↗︎')}</button><p role="status" aria-live="polite">{notice}</p>{copyText&&<textarea ref={copyRef} className={s.copy} readOnly value={copyText} aria-label={t('Rezultat za kopiranje','Резултат за копирање')}/>}</div></Dialog>
 </div>;
}
