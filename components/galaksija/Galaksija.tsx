'use client';
import {useCallback,useEffect,useId,useRef,useState} from 'react';
import Dialog from './Dialog';
import s from './Galaksija.module.css';

export type GalaksijaProps={storagePrefix?:string;locale?:string;autoHelp?:boolean;shareUrl?:string};
type Level='lako'|'srednje'|'tesko';
const CFG:Record<Level,{spd:number;fire:number;bul:number}>={lako:{spd:24,fire:1.4,bul:0.85},srednje:{spd:32,fire:1.0,bul:1},tesko:{spd:42,fire:0.72,bul:1.12}};
const EMOJI_FONT='"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const SETS=[['👾','👽','🤖'],['👹','👻','💀'],['🐙','🦑','🦠'],['😈','👿','🤡']];
const W=400,H=500,PY=H-42,COLS=7,DX=46,DY=38,LIVES=3;
const safeRead=(k:string)=>{try{return localStorage.getItem(k)}catch{return null}};
const safeWrite=(k:string,v:string)=>{try{localStorage.setItem(k,v);return true}catch{return false}};
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
type En={r:number;c:number;alive:boolean;e:string};
type Bu={x:number;y:number;vx:number;vy:number};
type Boom={x:number;y:number;t:number;s:number};
const mk=()=>({lvl:1,score:0,lives:LIVES,px:W/2,inv:0,fireT:0.3,dbl:0,en:[] as En[],total:1,fx:0,fy:94,dir:1,rows:3,
 boss:null as null|{x:number;y:number;hp:number;max:number;dir:number},eB:[] as Bu[],pB:[] as Bu[],ufo:null as null|{x:number;dir:number},ufoT:22,
 items:[] as {x:number;y:number}[],boom:[] as Boom[],wait:1.3,banner:1.3,enT:1.2,t:0,stars:Array.from({length:50},()=>({x:Math.random()*W,y:Math.random()*H,z:0.3+Math.random()*0.9}))});

export default function Galaksija({storagePrefix='galaksija-v1',locale,autoHelp=true,shareUrl}:GalaksijaProps){
 const cyr=!locale||/cyr/i.test(locale);const t=(lat:string,c:string)=>cyr?c:lat;
 const id=useId();const root=useRef<HTMLDivElement>(null);const cv=useRef<HTMLCanvasElement>(null);const copyRef=useRef<HTMLTextAreaElement>(null);
 const [lvl,setLvl]=useState<Level>('srednje');const [,setScore]=useState(0);const [best,setBest]=useState<number|null>(null);
 const [modal,setModal]=useState<'help'|'over'|null>(null);const [notice,setNotice]=useState('');const [copyText,setCopyText]=useState('');const [res,setRes]=useState({score:0,level:1,nb:false});
 const lvlRef=useRef<Level>('srednje');const bestRef=useRef<number|null>(null);const modalRef=useRef<typeof modal>(null);const phase=useRef<'ready'|'play'|'over'>('ready');const cyrRef=useRef(cyr);
 const keys=useRef({l:false,r:false});const g=useRef(mk());
 cyrRef.current=cyr;

 const setupLevel=useCallback((n:number)=>{
  const o=g.current;o.lvl=n;o.wait=1.3;o.banner=1.3;o.pB=[];o.eB=[];o.items=[];o.ufo=null;o.ufoT=18+Math.random()*10;o.enT=1.2;o.en=[];o.boss=null;
  if(n%5===0){const hp=10+Math.floor(n/5)*2;o.boss={x:W/2,y:105,hp,max:hp,dir:1};o.total=1}
  else{o.rows=Math.min(6,3+Math.floor((n-1)/2));o.fx=(W-(COLS-1)*DX)/2;o.fy=94;o.dir=1;const set=SETS[(n-1)%SETS.length];
   for(let r=0;r<o.rows;r++)for(let c=0;c<COLS;c++)o.en.push({r,c,alive:true,e:set[r%set.length]});o.total=o.en.length}
 },[]);
 const readBest=useCallback((l:Level)=>{const x=Number(safeRead(`${storagePrefix}-best-${l}`));return Number.isInteger(x)&&x>0?x:null},[storagePrefix]);
 const reset=useCallback(()=>{g.current=mk();phase.current='ready';setupLevel(1);setScore(0);setNotice('');setCopyText('')},[setupLevel]);
 const startNew=useCallback((l:Level)=>{setLvl(l);lvlRef.current=l;setBest(readBest(l));setModal(null);reset()},[readBest,reset,storagePrefix]);
 useEffect(()=>{startNew('srednje');if(autoHelp&&!safeRead(storagePrefix+'-intro'))setModal('help')},[storagePrefix,startNew,autoHelp]);
 useEffect(()=>{modalRef.current=modal},[modal]);
 useEffect(()=>{bestRef.current=best},[best]);
 useEffect(()=>{if(copyText)copyRef.current?.select()},[copyText]);

 useEffect(()=>{
  const c=cv.current;if(!c)return;const ctx=c.getContext('2d');if(!ctx)return;
  c.width=W*2;c.height=H*2;
  const cache=new Map<string,HTMLCanvasElement>();
  const spr=(e:string,size:number)=>{const k=e+size;let s2=cache.get(k);if(!s2){const box=Math.ceil(size*1.4*2);s2=document.createElement('canvas');s2.width=s2.height=box;const x=s2.getContext('2d')!;x.font=`${size*2}px ${EMOJI_FONT}`;x.textAlign='center';x.textBaseline='middle';x.fillText(e,box/2,box/2+size*2*0.06);cache.set(k,s2)}return s2};
  const put=(e:string,size:number,x:number,y:number,alpha=1)=>{const b=size*1.4;ctx.globalAlpha=alpha;ctx.drawImage(spr(e,size),x-b/2,y-b/2,b,b);ctx.globalAlpha=1};
  let raf=0,last=performance.now();
  const addScore=(n:number)=>{g.current.score+=n;setScore(g.current.score)};
  const boom=(x:number,y:number,s2=34)=>{g.current.boom.push({x,y,t:0.4,s:s2})};
  const end=()=>{
   const o=g.current;phase.current='over';let nb=false;
   const old=Number(safeRead(`${storagePrefix}-best-${lvlRef.current}`));
   if(o.score>0&&(!(old>0)||o.score>old)){safeWrite(`${storagePrefix}-best-${lvlRef.current}`,String(o.score));setBest(o.score);nb=true}
   setRes({score:o.score,level:o.lvl,nb});setTimeout(()=>setModal('over'),500);
  };
  const hitPlayer=()=>{const o=g.current;if(o.inv>0)return;o.lives--;boom(o.px,PY,40);o.inv=2;o.eB=[];o.dbl=0;if(o.lives<=0)end()};
  const enPos=(o:ReturnType<typeof mk>,e:En)=>({x:o.fx+e.c*DX,y:o.fy+e.r*DY});
  const step=(dt:number)=>{
   const o=g.current;for(const st of o.stars){st.y+=st.z*28*dt;if(st.y>H){st.y=0;st.x=Math.random()*W}}
   for(const b of o.boom)b.t-=dt;o.boom=o.boom.filter(b=>b.t>0);
   if(phase.current!=='play'||modalRef.current)return;
   const cfg=CFG[lvlRef.current];o.t+=dt;
   if(keys.current.l)o.px-=330*dt;if(keys.current.r)o.px+=330*dt;o.px=clamp(o.px,28,W-28);
   if(o.inv>0)o.inv-=dt;if(o.dbl>0)o.dbl-=dt;
   if(o.banner>0)o.banner-=dt;
   if(o.wait>0){o.wait-=dt;return}
   o.fireT-=dt;if(o.fireT<=0){o.fireT=0.3;if(o.dbl>0){o.pB.push({x:o.px-9,y:PY-20,vx:0,vy:-540},{x:o.px+9,y:PY-20,vx:0,vy:-540})}else o.pB.push({x:o.px,y:PY-22,vx:0,vy:-540})}
   const fireInt=Math.max(0.35,cfg.fire*Math.pow(0.93,o.lvl-1));const bs=Math.min(300,(150+o.lvl*6)*cfg.bul);
   const alive=o.en.filter(e=>e.alive);
   if(o.boss){const b=o.boss;b.x+=b.dir*(70+o.lvl*3)*dt;if(b.x>W-50){b.x=W-50;b.dir=-1}if(b.x<50){b.x=50;b.dir=1}}
   else if(alive.length){
    let minC=99,maxC=-1,lowY=0;for(const e of alive){if(e.c<minC)minC=e.c;if(e.c>maxC)maxC=e.c;lowY=Math.max(lowY,o.fy+e.r*DY)}
    const v=Math.min(170,cfg.spd*(1+0.1*(o.lvl-1))*(1+1.5*(1-alive.length/o.total)));o.fx+=o.dir*v*dt;
    const left=o.fx+minC*DX-16,right=o.fx+maxC*DX+16;
    if(o.dir>0&&right>W-6){o.dir=-1;o.fy+=16;o.fx-=right-(W-6)}else if(o.dir<0&&left<6){o.dir=1;o.fy+=16;o.fx+=6-left}
    if(lowY+16>=PY-22){o.lives=0;end();return}
   }
   o.enT-=dt;
   if(o.enT<=0){o.enT=fireInt*(o.boss?1.4:1)*(0.6+Math.random()*0.8);
    if(o.boss){for(const a of [-0.35,0,0.35])o.eB.push({x:o.boss.x,y:o.boss.y+30,vx:Math.sin(a)*bs,vy:Math.cos(a)*bs})}
    else if(alive.length){const cols=[...new Set(alive.map(e=>e.c))];const col=cols[Math.floor(Math.random()*cols.length)];const low=alive.filter(e=>e.c===col).sort((a,b)=>b.r-a.r)[0];const p=enPos(o,low);o.eB.push({x:p.x,y:p.y+14,vx:0,vy:bs})}}
   o.ufoT-=dt;if(!o.boss&&!o.ufo&&o.ufoT<=0){const d=Math.random()<0.5?1:-1;o.ufo={x:d>0?-20:W+20,dir:d};o.ufoT=20+Math.random()*12}
   if(o.ufo){o.ufo.x+=o.ufo.dir*95*dt;if(o.ufo.x<-30||o.ufo.x>W+30)o.ufo=null}
   for(const b of o.pB){b.x+=b.vx*dt;b.y+=b.vy*dt}for(const b of o.eB){b.x+=b.vx*dt;b.y+=b.vy*dt}
   o.pB=o.pB.filter(b=>b.y>-12);o.eB=o.eB.filter(b=>b.y<H+12&&b.x>-12&&b.x<W+12);
   // pogoci igrača
   const dead=new Set<Bu>();
   for(const b of o.pB){
    if(o.boss){const k=o.boss;if(Math.abs(b.x-k.x)<38&&Math.abs(b.y-k.y)<34){dead.add(b);k.hp--;boom(b.x,b.y,16);if(k.hp<=0){boom(k.x,k.y,80);addScore(300*o.lvl);o.boss=null;o.eB=[];setupLevel(o.lvl+1);return}continue}}
    if(o.ufo&&Math.abs(b.x-o.ufo.x)<20&&Math.abs(b.y-56)<14){dead.add(b);boom(o.ufo.x,56,40);addScore(200);if(Math.random()<0.6)o.items.push({x:o.ufo.x,y:62});o.ufo=null;continue}
    for(const e of alive){if(!e.alive)continue;const p=enPos(o,e);if(Math.abs(b.x-p.x)<16&&Math.abs(b.y-p.y)<15){e.alive=false;dead.add(b);boom(p.x,p.y);addScore(10+5*(o.rows-1-e.r));break}}
   }
   if(dead.size)o.pB=o.pB.filter(b=>!dead.has(b));
   if(!o.boss&&o.en.every(e=>!e.alive)){addScore(100*o.lvl);o.eB=[];setupLevel(o.lvl+1);return}
   for(const b of o.eB){if(Math.abs(b.x-o.px)<17&&Math.abs(b.y-PY)<15){hitPlayer();break}}
   for(const it of o.items){it.y+=95*dt}
   o.items=o.items.filter(it=>{if(Math.abs(it.x-o.px)<24&&Math.abs(it.y-PY)<22){o.dbl=9;addScore(50);return false}return it.y<H+20});
  };
  const ship=(x:number,y:number,tt:number)=>{
   ctx.save();ctx.translate(x,y);
   const fl=7+Math.sin(tt*40)*3;
   for(const sx of [-8,8]){const g2=ctx.createLinearGradient(0,14,0,14+fl+8);g2.addColorStop(0,'#fff3b0');g2.addColorStop(.5,'#ff9a3c');g2.addColorStop(1,'rgba(255,80,40,0)');ctx.fillStyle=g2;ctx.beginPath();ctx.moveTo(sx-4,14);ctx.lineTo(sx+4,14);ctx.lineTo(sx,14+fl+8);ctx.closePath();ctx.fill()}
   ctx.fillStyle='#b44fa0';for(const m of [-1,1]){ctx.beginPath();ctx.moveTo(m*8,-4);ctx.lineTo(m*28,16);ctx.lineTo(m*28,21);ctx.lineTo(m*18,17);ctx.lineTo(m*8,16);ctx.closePath();ctx.fill()}
   ctx.fillStyle='#e879c9';for(const m of [-1,1]){ctx.beginPath();ctx.moveTo(m*8,2);ctx.lineTo(m*22,17);ctx.lineTo(m*8,14);ctx.closePath();ctx.fill()}
   const bg=ctx.createLinearGradient(-9,0,9,0);bg.addColorStop(0,'#aeb4d6');bg.addColorStop(.5,'#ffffff');bg.addColorStop(1,'#aeb4d6');ctx.fillStyle=bg;
   ctx.beginPath();ctx.moveTo(0,-24);ctx.bezierCurveTo(10,-12,10,6,8,16);ctx.lineTo(-8,16);ctx.bezierCurveTo(-10,6,-10,-12,0,-24);ctx.closePath();ctx.fill();
   ctx.fillStyle='#e879c9';ctx.beginPath();ctx.moveTo(0,-24);ctx.bezierCurveTo(5,-19,6,-15,6,-13);ctx.lineTo(-6,-13);ctx.bezierCurveTo(-6,-15,-5,-19,0,-24);ctx.closePath();ctx.fill();
   ctx.fillStyle='#38bdf8';ctx.beginPath();ctx.ellipse(0,-4,4,6,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(255,255,255,.75)';ctx.beginPath();ctx.ellipse(-1.2,-6,1.4,2.4,0,0,Math.PI*2);ctx.fill();
   ctx.restore();
  };
  const draw=()=>{
   const o=g.current;ctx.setTransform(2,0,0,2,0,0);ctx.fillStyle='#05070f';ctx.fillRect(0,0,W,H);
   for(const st of o.stars){ctx.fillStyle=`rgba(255,255,255,${0.25+st.z*0.45})`;ctx.fillRect(st.x,st.y,1+st.z,1+st.z)}
   for(const e of o.en){if(!e.alive)continue;const p=enPos(o,e);put(e.e,28,p.x,p.y)}
   if(o.boss){const k=o.boss;put('☄️',72,k.x,k.y);ctx.fillStyle='#2c3254';ctx.fillRect(k.x-36,k.y-52,72,5);ctx.fillStyle='#e879c9';ctx.fillRect(k.x-36,k.y-52,72*Math.max(0,k.hp)/k.max,5)}
   if(o.ufo)put('🛸',34,o.ufo.x,56);
   for(const it of o.items)put('⭐',22,it.x,it.y);
   ctx.fillStyle='#7dd3fc';for(const b of o.pB){ctx.fillRect(b.x-1.6,b.y-8,3.2,14)}
   for(const b of o.eB){const gg=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,7);gg.addColorStop(0,'#fff');gg.addColorStop(.4,'#ff6b6b');gg.addColorStop(1,'rgba(255,60,60,0)');ctx.fillStyle=gg;ctx.beginPath();ctx.arc(b.x,b.y,7,0,Math.PI*2);ctx.fill()}
   if(o.lives>0&&!(o.inv>0&&Math.floor(o.inv*10)%2===0))ship(o.px,PY,o.t);
   for(const b of o.boom)put('💥',b.s,b.x,b.y,Math.min(1,b.t*3));
   for(let i=0;i<o.lives;i++)put('❤️',15,24+i*26,22);
   if(o.dbl>0)put('⭐',15,24+LIVES*26,22);
   ctx.fillStyle='#c3c8de';ctx.font='700 14px Arial,Helvetica,sans-serif';ctx.textAlign='right';ctx.textBaseline='middle';ctx.fillText(`${cyrRef.current?'Ниво':'Nivo'} ${o.lvl}`,W-12,20);
   ctx.textAlign='center';ctx.fillStyle='#ffffff';ctx.font='800 20px Arial,Helvetica,sans-serif';ctx.fillText(String(o.score),W/2,20);
   ctx.fillStyle='#9aa1bd';ctx.font='600 10px Arial,Helvetica,sans-serif';ctx.fillText((cyrRef.current?'НАЈБОЉИ ':'NAJBOLJI ')+(bestRef.current??'–'),W/2,38);
   if(phase.current==='ready'&&!modalRef.current){ctx.fillStyle='rgba(5,7,15,.65)';ctx.fillRect(0,H/2-26,W,52);ctx.fillStyle='#fff';ctx.font='700 18px Arial,Helvetica,sans-serif';ctx.fillText(cyrRef.current?'Додирни за старт':'Dodirni za start',W/2,H/2)}
   else if(phase.current==='play'&&o.banner>0){ctx.globalAlpha=Math.min(1,o.banner*2);ctx.fillStyle='#e879c9';ctx.font='800 30px Arial,Helvetica,sans-serif';ctx.fillText(`${cyrRef.current?'Ниво':'Nivo'} ${o.lvl}${o.boss?(cyrRef.current?' · Метеор':' · Meteor'):''}`,W/2,H/2-40);ctx.globalAlpha=1}
   ctx.textBaseline='alphabetic';
  };
  const tick=(now:number)=>{const dt=Math.min(0.033,(now-last)/1000);last=now;step(dt);draw();raf=requestAnimationFrame(tick)};
  raf=requestAnimationFrame(tick);
  return()=>cancelAnimationFrame(raf);
 },[storagePrefix,setupLevel]);

 function begin(){if(phase.current==='ready'&&!modalRef.current)phase.current='play'}
 function ptr(e:React.PointerEvent<HTMLCanvasElement>){const r=e.currentTarget.getBoundingClientRect();g.current.px=clamp((e.clientX-r.left)/r.width*W,28,W-28)}
 function key(e:React.KeyboardEvent,down:boolean){
  if(modal)return;const k=e.key;
  if(k==='ArrowLeft'||k==='a'||k==='A'){e.preventDefault();keys.current.l=down;if(down)begin()}
  else if(k==='ArrowRight'||k==='d'||k==='D'){e.preventDefault();keys.current.r=down;if(down)begin()}
  else if((k===' '||k==='Enter')&&down){e.preventDefault();begin()}
 }
 function closeModal(){if(modal==='help')safeWrite(storagePrefix+'-intro','1');setModal(null);setCopyText('');setNotice('');root.current?.focus({preventScroll:true})}
 async function share(){
  const url=shareUrl||location.origin+location.pathname;
  const text=t('Osvajanje galaksije','Освајање галаксије')+` · ${res.score} ${t('poena','поена')} · ${t('nivo','ниво')} ${res.level}\n\n${url}`;
  try{await navigator.clipboard.writeText(text);setNotice(t('Rezultat je kopiran!','Резултат је копиран!'))}catch{setCopyText(text);setNotice(t('Kopiraj označeni rezultat.','Копирај означени резултат.'))}
 }
 const helpTitle=t('Kako se igra Osvajanje galaksije?','Како се игра Освајање галаксије?');
 return <div ref={root} className={s.root} lang={cyr?'sr-Cyrl':'sr-Latn'} tabIndex={-1} onKeyDown={e=>key(e,true)} onKeyUp={e=>key(e,false)}>
 <header className={s.header}><div className={s.title}><span className={s.brand}>{cyr?<>Освајање <em>галаксије</em></>:<>Osvajanje <em>galaksije</em></>}</span></div><div className={s.tools}><button className={s.help} aria-label={helpTitle} onClick={()=>setModal('help')}>?</button></div></header>
 <section className={s.game} aria-label={t('Osvajanje galaksije','Освајање галаксије')}>
  <div className={s.stage}><canvas ref={cv} className={s.cv} role="img" aria-label={t('Osvajanje galaksije, tabla','Освајање галаксије, табла')} onPointerDown={e=>{try{e.currentTarget.setPointerCapture(e.pointerId)}catch{}root.current?.focus({preventScroll:true});ptr(e);begin()}} onPointerMove={ptr}/><button type="button" className={s.ng} onClick={()=>startNew(lvl)}>{t('Nova igra','Нова игра')}</button></div>
 </section>
 <Dialog open={modal==='help'} titleId={id+'-help'} onClose={closeModal} closeLabel={t('Zatvori','Затвори')}>
  <h2 id={id+'-help'}>{helpTitle}</h2>
  <p>{t('Ti si raketa na dnu. Dodirni tablu za početak, pa vuci prstom levo-desno (na računaru miš ili strelice). Raketa puca sama, a ti izbegavaš pucnje protivnika.','Ти си ракета на дну. Додирни таблу за почетак, па вуци прстом лево-десно (на рачунару миш или стрелице). Ракета пуца сама, а ти избегаваш пуцње противника.')}</p>
  <p>{t('Imaš tri života ❤️. Ako protivnici stignu do tvoje rakete, igra je gotova. Kad pobiješ sve, počinje sledeći nivo: protivnici su brži, češće pucaju, a svaki peti nivo je meteor (veliki ☄️ koji traži mnogo pogodaka). Leteći tanjir 🛸 daje bonus poene, a ⭐ koji padne daje dupli metak na nekoliko sekundi.','Имаш три живота ❤️. Ако противници стигну до твоје ракете, игра је готова. Кад побијеш све, почиње следећи ниво: противници су бржи, чешће пуцају, а сваки пети ниво је метеор (велики ☄️ који тражи много погодака). Летећи тањир 🛸 даје бонус поене, а ⭐ који падне даје дупли метак на неколико секунди.')}</p>
  <button className={s.primary} onClick={closeModal}>{t('Igraj!','Играј!')}</button>
 </Dialog>
 <Dialog open={modal==='over'} titleId={id+'-over'} onClose={closeModal} closeLabel={t('Zatvori','Затвори')}><div className={s.result}><span className={s.spark} aria-hidden="true">✦&#xFE0E;</span>
  <h2 id={id+'-over'}>{t('Kraj igre','Крај игре')}</h2>
  <p>{res.score} {t('poena','поена')} · {t('nivo','ниво')} {res.level}{res.nb?' · '+t('novi rekord!','нови рекорд!'):''}</p>
  <button className={s.primary} onClick={()=>startNew(lvl)}>{t('Nova igra','Нова игра')}</button><button className={s.primary} onClick={()=>void share()}>{t('Podeli rezultat ↗︎','Подели резултат ↗︎')}</button>
  <p role="status" aria-live="polite">{notice}</p>{copyText&&<textarea ref={copyRef} className={s.copy} readOnly value={copyText} aria-label={t('Rezultat za kopiranje','Резултат за копирање')}/>}</div></Dialog>
 </div>;
}
