'use client';
import {useCallback,useEffect,useId,useRef,useState} from 'react';
import Dialog from './Dialog';
import s from './Pong.module.css';

export type PongProps={storagePrefix?:string;locale?:string;autoHelp?:boolean;shareUrl?:string};
type Level='lako'|'srednje'|'tesko';
const LEVELS:{id:Level;lat:string;cyr:string}[]=[{id:'lako',lat:'Lako',cyr:'Лако'},{id:'srednje',lat:'Srednje',cyr:'Средње'},{id:'tesko',lat:'Teško',cyr:'Тешко'}];
const CFG:Record<Level,{ai:number;err:number}>={lako:{ai:150,err:34},srednje:{ai:235,err:20},tesko:{ai:330,err:6}};
const W=400,H=360,PH=64,PW=8,R=6,PX=16,AX=W-16,TARGET=7,BASE=230,MAXV=520;
const safeRead=(k:string)=>{try{return localStorage.getItem(k)}catch{return null}};
const safeWrite=(k:string,v:string)=>{try{localStorage.setItem(k,v);return true}catch{return false}};
const mmss=(n:number)=>`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));

export default function Pong({storagePrefix='pong-v1',locale,autoHelp=true,shareUrl}:PongProps){
 const cyr=!locale||/cyr/i.test(locale);const t=(lat:string,c:string)=>cyr?c:lat;
 const id=useId();const root=useRef<HTMLDivElement>(null);const cv=useRef<HTMLCanvasElement>(null);const copyRef=useRef<HTMLTextAreaElement>(null);
 const [lvl,setLvl]=useState<Level>('lako');const [score,setScore]=useState<[number,number]>([0,0]);const [best,setBest]=useState<number|null>(null);
 const [modal,setModal]=useState<'help'|'win'|'lose'|null>(null);const [notice,setNotice]=useState('');const [copyText,setCopyText]=useState('');const [res,setRes]=useState({t:0,nb:false});
 const lvlRef=useRef<Level>('lako');const modalRef=useRef<typeof modal>(null);const phase=useRef<'ready'|'play'|'over'>('ready');const cyrRef=useRef(cyr);
 const keys=useRef({up:false,down:false});
 const g=useRef({py:H/2,ay:H/2,bx:W/2,by:H/2,vx:0,vy:0,sp:BASE,off:0,wait:0,t:0,ps:0,as:0});
 cyrRef.current=cyr;

 const readBest=useCallback((l:Level)=>{const x=Number(safeRead(`${storagePrefix}-best-${l}`));return Number.isInteger(x)&&x>0?x:null},[storagePrefix]);
 const serve=useCallback((dir:number)=>{const o=g.current;o.bx=W/2;o.by=H/2;o.sp=BASE;const a=(Math.random()-0.5)*0.7;o.vx=dir*o.sp*Math.cos(a);o.vy=o.sp*Math.sin(a);o.wait=0.7;o.off=(Math.random()*2-1)*CFG[lvlRef.current].err},[]);
 const reset=useCallback(()=>{const o=g.current;o.py=H/2;o.ay=H/2;o.ps=0;o.as=0;o.t=0;phase.current='ready';serve(Math.random()<0.5?1:-1);setScore([0,0]);setNotice('');setCopyText('')},[serve]);
 const startNew=useCallback((l:Level)=>{setLvl(l);lvlRef.current=l;safeWrite(storagePrefix+'-lvl',l);setBest(readBest(l));setModal(null);reset()},[readBest,reset,storagePrefix]);
 useEffect(()=>{const l=safeRead(storagePrefix+'-lvl');startNew(l==='srednje'||l==='tesko'?l:'lako');if(autoHelp&&!safeRead(storagePrefix+'-intro'))setModal('help')},[storagePrefix,startNew,autoHelp]);
 useEffect(()=>{modalRef.current=modal},[modal]);
 useEffect(()=>{if(copyText)copyRef.current?.select()},[copyText]);

 useEffect(()=>{
  const c=cv.current;if(!c)return;const ctx=c.getContext('2d');if(!ctx)return;
  c.width=W*2;c.height=H*2;
  let raf=0,last=performance.now();
  const end=(won:boolean)=>{
   const o=g.current;phase.current='over';const sec=Math.max(1,Math.round(o.t));let nb=false;
   if(won){const old=Number(safeRead(`${storagePrefix}-best-${lvlRef.current}`));if(!(old>0)||sec<old){safeWrite(`${storagePrefix}-best-${lvlRef.current}`,String(sec));setBest(sec);nb=true}}
   setRes({t:sec,nb});setTimeout(()=>setModal(won?'win':'lose'),350);
  };
  const step=(dt:number)=>{
   if(phase.current!=='play'||modalRef.current)return;
   const o=g.current;o.t+=dt;
   if(keys.current.up)o.py-=330*dt;if(keys.current.down)o.py+=330*dt;o.py=clamp(o.py,PH/2,H-PH/2);
   const cfg=CFG[lvlRef.current];
   const tgt=o.vx>0?o.by+o.off:H/2;const sp=(o.vx>0?cfg.ai:cfg.ai*0.4)*dt;
   o.ay=clamp(o.ay+clamp(tgt-o.ay,-sp,sp),PH/2,H-PH/2);
   if(o.wait>0){o.wait-=dt;return}
   o.bx+=o.vx*dt;o.by+=o.vy*dt;
   if(o.by<R){o.by=R;o.vy=Math.abs(o.vy)}if(o.by>H-R){o.by=H-R;o.vy=-Math.abs(o.vy)}
   if(o.vx<0&&o.bx-R<=PX+PW/2&&o.bx>PX-PW&&Math.abs(o.by-o.py)<=PH/2+R){
    o.bx=PX+PW/2+R;o.sp=Math.min(MAXV,o.sp+14);const rel=clamp((o.by-o.py)/(PH/2),-1,1)*0.9;o.vx=o.sp*Math.cos(rel);o.vy=o.sp*Math.sin(rel);o.off=(Math.random()*2-1)*cfg.err;
   }else if(o.vx>0&&o.bx+R>=AX-PW/2&&o.bx<AX+PW&&Math.abs(o.by-o.ay)<=PH/2+R){
    o.bx=AX-PW/2-R;o.sp=Math.min(MAXV,o.sp+14);const rel=clamp((o.by-o.ay)/(PH/2),-1,1)*0.9;o.vx=-o.sp*Math.cos(rel);o.vy=o.sp*Math.sin(rel);
   }
   let scored=0;if(o.bx<-R){o.as++;scored=-1}else if(o.bx>W+R){o.ps++;scored=1}
   if(scored){setScore([o.ps,o.as]);if(o.ps>=TARGET||o.as>=TARGET)end(o.ps>=TARGET);else serve(scored>0?1:-1)}
  };
  const rr=(x:number,y:number,w:number,h:number,r:number)=>{ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();ctx.fill()};
  const draw=()=>{
   const o=g.current;ctx.setTransform(2,0,0,2,0,0);ctx.fillStyle='#0a0d1a';ctx.fillRect(0,0,W,H);
   ctx.strokeStyle='#2c3254';ctx.lineWidth=2;ctx.setLineDash([8,8]);ctx.beginPath();ctx.moveTo(W/2,0);ctx.lineTo(W/2,H);ctx.stroke();ctx.setLineDash([]);
   ctx.font='800 64px Arial,Helvetica,sans-serif';ctx.textAlign='center';ctx.fillStyle='#161a33';ctx.fillText(String(o.ps),W/2-60,80);ctx.fillText(String(o.as),W/2+60,80);
   ctx.fillStyle='#e879c9';rr(PX-PW/2,o.py-PH/2,PW,PH,4);ctx.fillStyle='#c3c8de';rr(AX-PW/2,o.ay-PH/2,PW,PH,4);
   ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(o.bx,o.by,R,0,Math.PI*2);ctx.fill();
   if(phase.current==='ready'&&!modalRef.current){ctx.fillStyle='rgba(10,13,26,.6)';ctx.fillRect(0,H/2-24,W,48);ctx.fillStyle='#fff';ctx.font='700 18px Arial,Helvetica,sans-serif';ctx.textBaseline='middle';ctx.fillText(cyrRef.current?'Додирни за старт':'Dodirni za start',W/2,H/2);ctx.textBaseline='alphabetic'}
  };
  const tick=(now:number)=>{const dt=Math.min(0.033,(now-last)/1000);last=now;step(dt);draw();raf=requestAnimationFrame(tick)};
  raf=requestAnimationFrame(tick);
  return()=>cancelAnimationFrame(raf);
 },[storagePrefix,serve]);

 function begin(){if(phase.current==='ready'&&!modalRef.current)phase.current='play'}
 function ptr(e:React.PointerEvent<HTMLCanvasElement>){const r=e.currentTarget.getBoundingClientRect();g.current.py=clamp((e.clientY-r.top)/r.height*H,PH/2,H-PH/2)}
 function key(e:React.KeyboardEvent,down:boolean){
  if(modal)return;const k=e.key;
  if(k==='ArrowUp'||k==='w'||k==='W'){e.preventDefault();keys.current.up=down;if(down)begin()}
  else if(k==='ArrowDown'||k==='s'||k==='S'){e.preventDefault();keys.current.down=down;if(down)begin()}
  else if((k===' '||k==='Enter')&&down){e.preventDefault();begin()}
 }
 function closeModal(){if(modal==='help')safeWrite(storagePrefix+'-intro','1');setModal(null);setCopyText('');setNotice('');root.current?.focus({preventScroll:true})}
 async function share(){
  const url=shareUrl||location.origin+location.pathname;const L=LEVELS.find(l=>l.id===lvl)!;
  const text=t('Ping-pong','Пинг-понг')+' · '+t(L.lat,L.cyr)+` · ${score[0]}:${score[1]} · `+mmss(res.t)+`\n\n${url}`;
  try{await navigator.clipboard.writeText(text);setNotice(t('Rezultat je kopiran!','Резултат је копиран!'))}catch{setCopyText(text);setNotice(t('Kopiraj označeni rezultat.','Копирај означени резултат.'))}
 }
 const helpTitle=t('Kako se igra Ping-pong?','Како се игра Пинг-понг?');
 const L=LEVELS.find(l=>l.id===lvl)!;
 return <div ref={root} className={s.root} lang={cyr?'sr-Cyrl':'sr-Latn'} tabIndex={-1} onKeyDown={e=>key(e,true)} onKeyUp={e=>key(e,false)}>
 <header className={s.header}><div className={s.title}><span className={s.brand}>{cyr?<>Пинг-<em>понг</em></>:<>Ping-<em>pong</em></>}</span></div><div className={s.tools}><button className={s.help} aria-label={helpTitle} onClick={()=>setModal('help')}>?</button></div></header>
 <section className={s.game} aria-label={t('Ping-pong','Пинг-понг')}>
  <div className={s.bar}>
   <div className={s.mini}><span>{t('Rezultat','Резултат')}</span><strong>{score[0]} : {score[1]}</strong></div>
   <div className={s.mini}><span>{t('Najbolji','Најбољи')}</span><strong>{best?mmss(best):'–'}</strong></div>
   <div className={s.lv} role="group" aria-label={t('Težina','Тежина')}>{LEVELS.map(l=><button key={l.id} className={`${s.pill} ${l.id===lvl?s.pillOn:''}`} aria-pressed={l.id===lvl} onClick={()=>{if(l.id!==lvl)startNew(l.id)}}>{t(l.lat,l.cyr)}</button>)}</div>
   <button className={`${s.pill} ${s.newBtn}`} onClick={()=>startNew(lvl)}>{t('Nova igra','Нова игра')}</button></div>
  <canvas ref={cv} className={s.cv} role="img" aria-label={t('Ping-pong tabla','Пинг-понг табла')} onPointerDown={e=>{try{e.currentTarget.setPointerCapture(e.pointerId)}catch{}root.current?.focus({preventScroll:true});ptr(e);begin()}} onPointerMove={ptr}/>
  <p className={s.tip}>{t(`Pomeraj reket prstom ili mišem (ili strelicama). Prvi do ${TARGET} poena pobeđuje.`,`Померај рекет прстом или мишем (или стрелицама). Први до ${TARGET} поена побеђује.`)}</p>
 </section>
 <Dialog open={modal==='help'} titleId={id+'-help'} onClose={closeModal} closeLabel={t('Zatvori','Затвори')}>
  <h2 id={id+'-help'}>{helpTitle}</h2>
  <p>{t(`Ti si pink reket sa leve strane. Odbij lopticu tako da je računar ne stigne. Prvi do ${TARGET} poena pobeđuje.`,`Ти си пинк рекет са леве стране. Одбиј лоптицу тако да је рачунар не стигне. Први до ${TARGET} поена побеђује.`)}</p>
  <p>{t('Dodirni tablu za početak, pa vuci prstom gore-dole (na računaru mišem ili strelicama). Što se loptica odbije bliže ivici reketa, to je ugao oštriji, a loptica ubrzava sa svakim odbijanjem.','Додирни таблу за почетак, па вуци прстом горе-доле (на рачунару мишем или стрелицама). Што се лоптица одбије ближе ивици рекета, то је угао оштрији, а лоптица убрзава са сваким одбијањем.')}</p>
  <div className={s.callout}><strong>{t('Težina','Тежина')}</strong><p>{t('Zavisi od toga koliko je protivnik brz i koliko greši: lako, srednje, teško. Najbolje vreme je najkraća pobeda na toj težini.','Зависи од тога колико је противник брз и колико греши: лако, средње, тешко. Најбоље време је најкраћа победа на тој тежини.')}</p></div>
  <button className={s.primary} onClick={closeModal}>{t('Igraj!','Играј!')}</button>
 </Dialog>
 <Dialog open={modal==='win'} titleId={id+'-win'} onClose={closeModal} closeLabel={t('Zatvori','Затвори')}><div className={s.result}><span className={s.spark} aria-hidden="true">✦&#xFE0E;</span>
  <h2 id={id+'-win'}>{t('Pobedio si!','Победио си!')}</h2>
  <p>{t(L.lat,L.cyr)} · {score[0]} : {score[1]} · {mmss(res.t)}{res.nb?' · '+t('novo najbolje vreme!','ново најбоље време!'):''}</p>
  <button className={s.primary} onClick={()=>startNew(lvl)}>{t('Nova igra','Нова игра')}</button><button className={s.primary} onClick={()=>void share()}>{t('Podeli rezultat ↗︎','Подели резултат ↗︎')}</button>
  <p role="status" aria-live="polite">{notice}</p>{copyText&&<textarea ref={copyRef} className={s.copy} readOnly value={copyText} aria-label={t('Rezultat za kopiranje','Резултат за копирање')}/>}</div></Dialog>
 <Dialog open={modal==='lose'} titleId={id+'-lose'} onClose={closeModal} closeLabel={t('Zatvori','Затвори')}><div className={s.result}>
  <h2 id={id+'-lose'}>{t('Pokušaj ponovo','Покушај поново')}</h2>
  <p>{t(L.lat,L.cyr)} · {score[0]} : {score[1]}</p>
  <button className={s.primary} onClick={()=>startNew(lvl)}>{t('Nova igra','Нова игра')}</button></div></Dialog>
 </div>;
}
