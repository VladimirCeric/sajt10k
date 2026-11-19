'use client';
import {useCallback,useEffect,useId,useRef,useState,type CSSProperties} from 'react';
import {Lightbulb,RotateCcw,Undo2} from 'lucide-react';
import {SIZE,makePuzzle,sums,type Level} from '@/lib/zbirovi/engine';
import Dialog from './Dialog';
import s from './Zbirovi.module.css';

export type ZbiroviProps={storagePrefix?:string;locale?:string;autoHelp?:boolean;shareUrl?:string};
const LEVELS:{id:Level;lat:string;cyr:string}[]=[{id:'lako',lat:'Lako',cyr:'Лако'},{id:'srednje',lat:'Srednje',cyr:'Средње'},{id:'tesko',lat:'Teško',cyr:'Тешко'}];
const WIDTH:Record<Level,number>={lako:300,srednje:340,tesko:340};
type Saved={lvl:Level;vals:number[];sol:number[];rowT:number[];colT:number[];st:number[];secs:number;hints:number};
const safeRead=(k:string)=>{try{return localStorage.getItem(k)}catch{return null}};
const safeWrite=(k:string,v:string)=>{try{localStorage.setItem(k,v);return true}catch{return false}};
const rnd=()=>{const r=new Uint32Array(1);crypto.getRandomValues(r);return r[0]/4294967296};
const mmss=(n:number)=>`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;
const okArr=(a:unknown,len:number,min:number,max:number):a is number[]=>Array.isArray(a)&&a.length===len&&a.every(x=>Number.isInteger(x)&&x>=min&&x<=max);

export default function Zbirovi({storagePrefix='zbirovi-v1',locale,autoHelp=true,shareUrl}:ZbiroviProps){
 const cyr=!locale||/cyr/i.test(locale);const t=(lat:string,c:string)=>cyr?c:lat;
 const id=useId();const root=useRef<HTMLDivElement>(null);const copyRef=useRef<HTMLTextAreaElement>(null);
 const [lvl,setLvl]=useState<Level>('lako');const [vals,setVals]=useState<number[]>([]);const [sol,setSol]=useState<number[]>([]);
 const [rowT,setRowT]=useState<number[]>([]);const [colT,setColT]=useState<number[]>([]);const [st,setSt]=useState<number[]>([]);
 const [secs,setSecs]=useState(0);const [hints,setHints]=useState(0);const [won,setWon]=useState(false);const [ready,setReady]=useState(false);
 const [best,setBest]=useState<number|null>(null);const [newBest,setNewBest]=useState(false);
 const [modal,setModal]=useState<'help'|'win'|'new'|null>(null);const [pending,setPending]=useState<Level>('lako');const [notice,setNotice]=useState('');const [copyText,setCopyText]=useState('');
 const undo=useRef<number[][]>([]);
 const n=SIZE[lvl];

 const readBest=useCallback((l:Level)=>{const x=Number(safeRead(`${storagePrefix}-best-${l}`));return Number.isInteger(x)&&x>0?x:null},[storagePrefix]);
 const startNew=useCallback((l:Level)=>{const p=makePuzzle(l,rnd);setLvl(l);setVals(p.vals);setSol(p.sol);setRowT(p.rowT);setColT(p.colT);setSt(Array(p.n*p.n).fill(0));setSecs(0);setHints(0);setWon(false);setNewBest(false);setBest(readBest(l));undo.current=[];setModal(null);setNotice('');setCopyText('');setReady(true)},[readBest]);
 useEffect(()=>{
  let saved:Saved|null=null;
  try{const j=JSON.parse(safeRead(storagePrefix+'-state')??'null');
   if(j&&(j.lvl in SIZE)){const m=SIZE[j.lvl as Level];
    if(okArr(j.vals,m*m,1,9)&&okArr(j.sol,m*m,0,1)&&okArr(j.st,m*m,0,2)&&okArr(j.rowT,m,0,999)&&okArr(j.colT,m,0,999))saved=j}}catch{}
  if(saved){const m=sums(saved.vals,saved.st,SIZE[saved.lvl]);const solved=m.rows.every((v,i)=>v===saved!.rowT[i])&&m.cols.every((v,i)=>v===saved!.colT[i]);
   if(!solved){setLvl(saved.lvl);setVals(saved.vals);setSol(saved.sol);setRowT(saved.rowT);setColT(saved.colT);setSt(saved.st);setSecs(Math.max(0,Number(saved.secs)||0));setHints(Math.max(0,Number(saved.hints)||0));setBest(readBest(saved.lvl));setReady(true)}
   else saved=null}
  if(!saved)startNew('lako');
  if(autoHelp&&!safeRead(storagePrefix+'-intro'))setModal('help');
 },[storagePrefix,startNew,autoHelp,readBest]);
 useEffect(()=>{if(!ready||won)return;safeWrite(storagePrefix+'-state',JSON.stringify({lvl,vals,sol,rowT,colT,st,secs,hints}))},[ready,won,lvl,vals,sol,rowT,colT,st,secs,hints,storagePrefix]);
 useEffect(()=>{if(!ready||won||modal)return;const x=setInterval(()=>{if(document.visibilityState==='visible')setSecs(v=>v+1)},1000);return()=>clearInterval(x)},[ready,won,modal]);
 useEffect(()=>{if(!notice)return;const x=setTimeout(()=>setNotice(''),4000);return()=>clearTimeout(x)},[notice]);
 useEffect(()=>{if(copyText)copyRef.current?.select()},[copyText]);

 const cur=vals.length===n*n&&st.length===n*n?sums(vals,st,n):{rows:Array(n).fill(0),cols:Array(n).fill(0)};
 function check(ns:number[]){
  const m=sums(vals,ns,n);
  if(!m.rows.every((v,i)=>v===rowT[i])||!m.cols.every((v,i)=>v===colT[i]))return;
  setWon(true);try{localStorage.removeItem(storagePrefix+'-state')}catch{}
  const old=readBest(lvl);if(old===null||secs<old){safeWrite(`${storagePrefix}-best-${lvl}`,String(secs));setBest(secs);setNewBest(true)}
  setTimeout(()=>setModal('win'),400);
 }
 function apply(ns:number[]){undo.current.push([...st]);if(undo.current.length>300)undo.current.shift();setSt(ns);check(ns)}
 function tap(i:number){if(won||modal)return;const ns=[...st];ns[i]=(ns[i]+1)%3;apply(ns)}
 function undoMove(){const p=undo.current.pop();if(!p||won)return;setSt(p)}
 function clearAll(){if(won||st.every(v=>v===0))return;apply(Array(n*n).fill(0))}
 function hint(){
  if(won||modal)return;
  const wrong=st.map((v,i)=>(v===1)!==(sol[i]===1)?i:-1).filter(i=>i>=0);
  if(!wrong.length)return;
  const i=wrong[Math.floor(rnd()*wrong.length)];const ns=[...st];ns[i]=sol[i]?1:2;setHints(h=>h+1);apply(ns);
 }
 function askNew(l:Level){const progress=!won&&st.some(v=>v!==0);if(progress){setPending(l);setModal('new')}else startNew(l)}
 function closeModal(){if(modal==='help')safeWrite(storagePrefix+'-intro','1');setModal(null);setCopyText('');setNotice('');root.current?.focus({preventScroll:true})}
 async function share(){
  const url=shareUrl||location.origin+location.pathname;const L=LEVELS.find(l=>l.id===lvl)!;
  const text=t('Zbirovi','Збирови')+' · '+t(L.lat,L.cyr)+` ${n}×${n} · `+mmss(secs)+(hints?` · ${hints} ${t('nagoveštaja','наговештаја')}`:'')+`\n\n${url}`;
  try{await navigator.clipboard.writeText(text);setNotice(t('Rezultat je kopiran!','Резултат је копиран!'))}catch{setCopyText(text);setNotice(t('Kopiraj označeni rezultat.','Копирај означени резултат.'))}
 }
 const helpTitle=t('Kako se igra Zbirovi?','Како се игра Збирови?');
 const L=LEVELS.find(l=>l.id===lvl)!;
 const ready2=ready&&vals.length===n*n&&st.length===n*n;
 return <div ref={root} className={s.root} lang={cyr?'sr-Cyrl':'sr-Latn'} tabIndex={-1}>
 <header className={s.header}><div className={s.title}><span className={s.brand}>{cyr?'Збирови':'Zbirovi'}</span></div><div className={s.tools}><button className={s.help} aria-label={helpTitle} onClick={()=>setModal('help')}>?</button></div></header>
 <section className={s.game} aria-label={t('Zbirovi','Збирови')}>
  <div className={s.bar}>
   <div className={s.mini}><span>{t('Vreme','Време')}</span><strong>{mmss(secs)}</strong></div>
   <div className={s.mini}><span>{t('Najbolji','Најбољи')}</span><strong>{best?mmss(best):'–'}</strong></div>
   <div className={s.lv} role="group" aria-label={t('Težina','Тежина')}>{LEVELS.map(l=><button key={l.id} className={`${s.pill} ${l.id===lvl?s.pillOn:''}`} aria-pressed={l.id===lvl} onClick={()=>{if(l.id!==lvl)askNew(l.id)}}>{t(l.lat,l.cyr)}</button>)}</div>
   <button className={`${s.pill} ${s.newBtn}`} onClick={()=>askNew(lvl)}>{t('Nova igra','Нова игра')}</button></div>
  {ready2&&<div key={lvl} className={s.zgrid} style={{gridTemplateColumns:`repeat(${n+1},minmax(0,1fr))`,'--w':WIDTH[lvl]+'px','--fs':`${(100/(n+1))*0.42}cqw`} as CSSProperties} role="grid" aria-label={t(`Tabla ${n} puta ${n}`,`Табла ${n} пута ${n}`)}>
   <div aria-hidden="true"/>
   {colT.map((v,c)=><div key={'c'+c} className={`${s.zt} ${cur.cols[c]===v?s.ok:''}`} aria-label={`${t('kolona','колона')} ${c+1}: ${v}`}>{v}</div>)}
   {rowT.map((rv,r)=>[
    <div key={'r'+r} className={`${s.zt} ${cur.rows[r]===rv?s.ok:''}`} aria-label={`${t('red','ред')} ${r+1}: ${rv}`}>{rv}</div>,
    ...Array.from({length:n},(_,c)=>{const i=r*n+c;const x=st[i];
     return <button key={i} type="button" role="gridcell" className={`${s.zc} ${x===1?s.rem:x===2?s.keep:''}`} aria-label={`${vals[i]}, ${x===1?t('precrtano','прецртано'):x===2?t('zadržano','задржано'):t('neoznačeno','неозначено')}`} onClick={()=>tap(i)}>{vals[i]}</button>})
   ])}
  </div>}
  <div className={s.tools3}>
   <button type="button" className={s.tl} disabled={won||undo.current.length===0} onClick={undoMove}><Undo2/><span>{t('Vrati','Врати')}</span></button>
   <button type="button" className={s.tl} disabled={won} onClick={clearAll}><RotateCcw/><span>{t('Očisti','Очисти')}</span></button>
   <button type="button" className={s.tl} disabled={won} onClick={hint}><Lightbulb/><span>{t('Nagoveštaj','Наговештај')}</span></button></div>
  <div className={s.note2} role="status" aria-live="polite">{notice}</div>
 </section>
 <Dialog open={modal==='help'} titleId={id+'-help'} onClose={closeModal} closeLabel={t('Zatvori','Затвори')}>
  <h2 id={id+'-help'}>{helpTitle}</h2>
  <p>{t('Brojevi pored reda i iznad kolone su zbir koji treba da ostane. Precrtaj (obriši) polja tako da zbir preostalih brojeva u svakom redu i svakoj koloni bude tačno toliki.','Бројеви поред реда и изнад колоне су збир који треба да остане. Прецртај (обриши) поља тако да збир преосталих бројева у сваком реду и свакој колони буде тачно толики.')}</p>
  <p>{t('Dodir na polje: prvi put ga precrtava, drugi put ga označava kao zadržano (pink okvir), treći put vraća u početno stanje. Kad se zbir reda ili kolone poklopi, polje sa zbirom pozeleni.','Додир на поље: први пут га прецртава, други пут га означава као задржано (пинк оквир), трећи пут враћа у почетно стање. Кад се збир реда или колоне поклопи, поље са збиром позелени.')}</p>
  <div className={s.callout}><strong>{t('Težina','Тежина')}</strong><p>{t('Lako je tabla 4×4, srednje 6×6, teško 8×8. Za jednu tablu može postojati više tačnih rešenja, bilo koje se računa. Nagoveštaj ispravlja jedno pogrešno polje, ali se računa u rezultat. Igra se čuva na ovom uređaju dok je ne završiš.','Лако је табла 4×4, средње 6×6, тешко 8×8. За једну таблу може постојати више тачних решења, било које се рачуна. Наговештај исправља једно погрешно поље, али се рачуна у резултат. Игра се чува на овом уређају док је не завршиш.')}</p></div>
  <button className={s.primary} onClick={closeModal}>{t('Igraj!','Играј!')}</button>
 </Dialog>
 <Dialog open={modal==='new'} titleId={id+'-new'} onClose={closeModal} closeLabel={t('Zatvori','Затвори')}><h2 id={id+'-new'}>{t('Nova igra?','Нова игра?')}</h2><p>{t('Trenutna tabla i njeno vreme biće izgubljeni. Najbolje vreme se čuva.','Тренутна табла и њено време биће изгубљени. Најбоље време се чува.')}</p><button className={s.primary} onClick={()=>startNew(pending)}>{t('Počni novu igru','Почни нову игру')}</button><button className={s.textButton} onClick={closeModal}>{t('Odustani','Одустани')}</button></Dialog>
 <Dialog open={modal==='win'} titleId={id+'-win'} onClose={closeModal} closeLabel={t('Zatvori','Затвори')}><div className={s.result}><span className={s.spark} aria-hidden="true">✦&#xFE0E;</span>
  <h2 id={id+'-win'}>{t('Rešeno!','Решено!')}</h2>
  <p>{t(L.lat,L.cyr)} {n}×{n} · {mmss(secs)}{hints?` · ${hints} ${t('nagoveštaja','наговештаја')}`:''}{newBest?' · '+t('novo najbolje vreme!','ново најбоље време!'):''}</p>
  <button className={s.primary} onClick={()=>startNew(lvl)}>{t('Nova igra','Нова игра')}</button><button className={s.primary} onClick={()=>void share()}>{t('Podeli rezultat ↗︎','Подели резултат ↗︎')}</button>
  <p role="status" aria-live="polite">{notice}</p>{copyText&&<textarea ref={copyRef} className={s.copy} readOnly value={copyText} aria-label={t('Rezultat za kopiranje','Резултат за копирање')}/>}</div></Dialog>
 </div>;
}
