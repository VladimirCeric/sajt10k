'use client';
import {useCallback,useEffect,useId,useRef,useState,type CSSProperties} from 'react';
import {Antenna,AudioLines,Bell,Drum,Guitar,Headphones,Heart,Megaphone,Mic,Music,Piano,Podcast,Radio,RadioTower,Speaker,Star,Sun,Waves} from 'lucide-react';
import Dialog from './Dialog';
import s from './Parovi.module.css';

export type ParoviProps={storagePrefix?:string;locale?:string;autoHelp?:boolean;shareUrl?:string};
type Lvl='lako'|'srednje'|'tesko';
const LEVELS:{id:Lvl;cols:number;rows:number;w:number;lat:string;cyr:string}[]=[
 {id:'lako',cols:4,rows:4,w:390,lat:'Lako',cyr:'Лако'},
 {id:'srednje',cols:5,rows:4,w:470,lat:'Srednje',cyr:'Средње'},
 {id:'tesko',cols:6,rows:4,w:540,lat:'Teško',cyr:'Тешко'}];
const COLORS=['#e879c9','#7dd3fc','#fbbf24','#86efac','#c4b5fd','#fdba74'];
const SYMS=[
 {I:Music,lat:'muzika',cyr:'музика'},{I:Mic,lat:'mikrofon',cyr:'микрофон'},{I:Headphones,lat:'slušalice',cyr:'слушалице'},
 {I:Radio,lat:'radio',cyr:'радио'},{I:Guitar,lat:'gitara',cyr:'гитара'},{I:Drum,lat:'bubanj',cyr:'бубањ'},
 {I:Piano,lat:'klavir',cyr:'клавир'},{I:Speaker,lat:'zvučnik',cyr:'звучник'},{I:Podcast,lat:'podkast',cyr:'подкаст'},
 {I:AudioLines,lat:'zvučni talas',cyr:'звучни талас'},{I:RadioTower,lat:'toranj',cyr:'торањ'},{I:Megaphone,lat:'megafon',cyr:'мегафон'},
 {I:Antenna,lat:'antena',cyr:'антена'},{I:Waves,lat:'talasi',cyr:'таласи'},{I:Bell,lat:'zvono',cyr:'звоно'},
 {I:Star,lat:'zvezda',cyr:'звезда'},{I:Heart,lat:'srce',cyr:'срце'},{I:Sun,lat:'sunce',cyr:'сунце'}];
type Card={id:number;sym:number;open:boolean;done:boolean};
type Best={moves:number;sec:number};
const safeRead=(k:string)=>{try{return localStorage.getItem(k)}catch{return null}};
const safeWrite=(k:string,v:string)=>{try{localStorage.setItem(k,v);return true}catch{return false}};
const rnd=()=>{const r=new Uint32Array(1);crypto.getRandomValues(r);return r[0]/4294967296};
const mmss=(n:number)=>`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;
function shuffle<T>(a:T[]):T[]{const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}
function deal(l:typeof LEVELS[number]):Card[]{
 const pairs=l.cols*l.rows/2,pick=shuffle(SYMS.map((_,i)=>i)).slice(0,pairs);
 return shuffle([...pick,...pick]).map((sym,id)=>({id,sym,open:false,done:false}))}
function readBest(prefix:string,lvl:Lvl):Best|null{try{const b=JSON.parse(safeRead(`${prefix}-best-${lvl}`)??'null');return b&&Number.isInteger(b.moves)&&Number.isInteger(b.sec)?b:null}catch{return null}}
const better=(a:Best,b:Best|null)=>!b||a.moves<b.moves||(a.moves===b.moves&&a.sec<b.sec);

export default function Parovi({storagePrefix='parovi-v1',locale,autoHelp=true,shareUrl}:ParoviProps){
 const cyr=!locale||/cyr/i.test(locale);const t=(lat:string,c:string)=>cyr?c:lat;
 const id=useId();const root=useRef<HTMLDivElement>(null);const copyRef=useRef<HTMLTextAreaElement>(null);
 const [lvl,setLvl]=useState<Lvl>('lako');const [cards,setCards]=useState<Card[]>([]);const [moves,setMoves]=useState(0);const [sec,setSec]=useState(0);
 const [started,setStarted]=useState(false);const [won,setWon]=useState(false);const [best,setBest]=useState<Best|null>(null);const [newBest,setNewBest]=useState(false);
 const [modal,setModal]=useState<'help'|'win'|null>(null);const [notice,setNotice]=useState('');const [copyText,setCopyText]=useState('');
 const lock=useRef(false),first=useRef<number|null>(null),t0=useRef(0),timers=useRef<ReturnType<typeof setTimeout>[]>([]);
 const level=LEVELS.find(l=>l.id===lvl)!;

 const clearTimers=()=>{timers.current.forEach(clearTimeout);timers.current=[]};
 const startNew=useCallback((l:Lvl)=>{clearTimers();lock.current=false;first.current=null;setLvl(l);setCards(deal(LEVELS.find(x=>x.id===l)!));setMoves(0);setSec(0);setStarted(false);setWon(false);setNewBest(false);setBest(readBest(storagePrefix,l));setModal(null);setNotice('');setCopyText('')},[storagePrefix]);
 useEffect(()=>{startNew('lako');if(autoHelp&&!safeRead(storagePrefix+'-intro'))setModal('help');return clearTimers},[startNew,autoHelp,storagePrefix]);
 useEffect(()=>{if(!started||won)return;const x=setInterval(()=>setSec(Math.floor((Date.now()-t0.current)/1000)),500);return()=>clearInterval(x)},[started,won]);
 useEffect(()=>{if(!notice)return;const x=setTimeout(()=>setNotice(''),4500);return()=>clearTimeout(x)},[notice]);
 useEffect(()=>{if(copyText)copyRef.current?.select()},[copyText]);

 function flip(i:number){
  if(lock.current||won)return;const c=cards[i];if(!c||c.open||c.done)return;
  if(!started){t0.current=Date.now();setStarted(true)}
  const next=cards.map((x,k)=>k===i?{...x,open:true}:x);setCards(next);
  if(first.current===null){first.current=i;return}
  const a=first.current;first.current=null;const m=moves+1;setMoves(m);
  if(next[a].sym===next[i].sym){
   const done=next.map((x,k)=>k===a||k===i?{...x,done:true}:x);
   lock.current=true;
   timers.current.push(setTimeout(()=>{lock.current=false;setCards(done);
    if(done.every(x=>x.done)){const time=Math.floor((Date.now()-t0.current)/1000);setSec(time);setWon(true);
     const res={moves:m,sec:time},old=readBest(storagePrefix,lvl);
     if(better(res,old)){safeWrite(`${storagePrefix}-best-${lvl}`,JSON.stringify(res));setBest(res);setNewBest(true)}
     timers.current.push(setTimeout(()=>setModal('win'),550))}},280));
  }else{
   lock.current=true;
   timers.current.push(setTimeout(()=>{setCards(cs=>cs.map((x,k)=>k===a||k===i?{...x,open:false}:x));lock.current=false},800));
  }
 }
 function closeModal(){if(modal==='help')safeWrite(storagePrefix+'-intro','1');setModal(null);setCopyText('');setNotice('');root.current?.focus({preventScroll:true})}
 async function share(){
  const url=shareUrl||location.origin+location.pathname;
  const text=t('Parovi','Парови')+' · '+t(level.lat,level.cyr)+` ${level.cols}×${level.rows} · ${moves} ${t('poteza','потеза')} · ${mmss(sec)}\n\n${url}`;
  try{await navigator.clipboard.writeText(text);setNotice(t('Rezultat je kopiran!','Резултат је копиран!'))}catch{setCopyText(text);setNotice(t('Kopiraj označeni rezultat.','Копирај означени резултат.'))}
 }
 const helpTitle=t('Kako se igra Parovi?','Како се игра Парови?');
 const matched=cards.filter(c=>c.done).length/2;
 return <div ref={root} className={s.root} lang={cyr?'sr-Cyrl':'sr-Latn'} tabIndex={-1}>
 <header className={s.header}><div className={s.title}><span className={s.brand}>{t('Parovi','Парови')} <em>{t('igra','игра')}</em></span></div>
 <div className={s.tools}><button className={s.help} aria-label={helpTitle} onClick={()=>setModal('help')}>?</button></div></header>
 <section className={s.game} aria-label={t('Igra Parovi','Игра Парови')}>
  <div className={s.top}><div className={s.stats}>
   <div className={s.stat}><span>{t('Potezi','Потези')}</span><strong>{moves}</strong></div>
   <div className={s.stat}><span>{t('Vreme','Време')}</span><strong>{mmss(sec)}</strong></div>
   <div className={s.stat}><span>{t('Parovi','Парови')}</span><strong role="status" aria-live="polite">{matched}/{cards.length/2}</strong></div>
   <div className={s.stat}><span>{t('Najbolji','Најбољи')}</span><strong>{best?best.moves:'–'}</strong></div></div></div>
  <div className={s.levels} role="group" aria-label={t('Težina','Тежина')}>{LEVELS.map(l=><button key={l.id} className={`${s.pill} ${l.id===lvl?s.pillOn:''}`} aria-pressed={l.id===lvl} onClick={()=>{if(l.id!==lvl)startNew(l.id)}}>{t(l.lat,l.cyr)} <small>{l.cols}×{l.rows}</small></button>)}<button className={`${s.pill} ${s.newBtn}`} onClick={()=>startNew(lvl)}>{t('Nova igra','Нова игра')}</button></div>
  <div key={lvl} className={s.grid} style={{gridTemplateColumns:`repeat(${level.cols},minmax(0,1fr))`,width:`min(100%,${level.w}px)`} as CSSProperties} role="group" aria-label={t('Kartice. Pronađi parove sa istim znakom.','Картице. Пронађи парове са истим знаком.')}>
   {cards.map((c,i)=>{const sy=SYMS[c.sym],I=sy.I,shown=c.open||c.done;
    return <button key={c.id} type="button" disabled={c.done} className={`${s.card} ${shown?s.shown:''} ${c.done?s.done:''}`} aria-label={shown?`${i+1}: ${t(sy.lat,sy.cyr)}`:`${i+1}: ${t('zatvorena kartica','затворена картица')}`} onClick={()=>flip(i)}>
     <span className={s.inner}><span className={s.back} aria-hidden="true"/><span className={s.face} aria-hidden="true"><I color={COLORS[c.sym%COLORS.length]}/></span></span></button>})}
  </div>
 </section>
 <Dialog open={modal==='help'} titleId={id+'-help'} onClose={closeModal} closeLabel={t('Zatvori','Затвори')}>
  <h2 id={id+'-help'}>{helpTitle}</h2>
  <p>{t('Okreni dve kartice. Ako imaju isti znak, ostaju otvorene. Ako nemaju, vraćaju se, pa pokušaj ponovo i zapamti gde je šta.','Окрени две картице. Ако имају исти знак, остају отворене. Ако немају, враћају се, па покушај поново и запамти где је шта.')}</p>
  <p>{t('Cilj je da pronađeš sve parove sa što manje poteza (jedan potez su dve okrenute kartice) i što brže. Biraj težinu: lako 4×4, srednje 5×4, teško 6×4.','Циљ је да пронађеш све парове са што мање потеза (један потез су две окренуте картице) и што брже. Бирај тежину: лако 4×4, средње 5×4, тешко 6×4.')}</p>
  <div className={s.callout}><strong>{t('Najbolji rezultat','Најбољи резултат')}</strong><p>{t('Čuva se za svaku težinu posebno, na ovom uređaju. Računa se prvo broj poteza, pa vreme.','Чува се за сваку тежину посебно, на овом уређају. Рачуна се прво број потеза, па време.')}</p></div>
  <button className={s.primary} onClick={closeModal}>{t('Igraj!','Играј!')}</button>
 </Dialog>
 <Dialog open={modal==='win'} titleId={id+'-win'} onClose={closeModal} closeLabel={t('Zatvori','Затвори')}><div className={s.result}><span className={s.spark} aria-hidden="true">✦&#xFE0E;</span>
  <h2 id={id+'-win'}>{t('Svi parovi su pronađeni!','Сви парови су пронађени!')}</h2>
  <p>{t(level.lat,level.cyr)} {level.cols}×{level.rows} · {moves} {t('poteza','потеза')} · {mmss(sec)}{newBest?' · '+t('novi najbolji rezultat!','нови најбољи резултат!'):''}</p>
  <button className={s.primary} onClick={()=>startNew(lvl)}>{t('Nova igra','Нова игра')}</button><button className={s.primary} onClick={()=>void share()}>{t('Podeli rezultat ↗︎','Подели резултат ↗︎')}</button>
  <p role="status" aria-live="polite">{notice}</p>{copyText&&<textarea ref={copyRef} className={s.copy} readOnly value={copyText} aria-label={t('Rezultat za kopiranje','Резултат за копирање')}/>}</div></Dialog>
 </div>;
}
