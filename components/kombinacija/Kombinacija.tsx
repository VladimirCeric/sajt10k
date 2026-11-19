'use client';
import {useCallback,useEffect,useId,useRef,useState,type CSSProperties} from 'react';
import {CornerDownLeft,Delete,Drum,Guitar,Headphones,Heart,Mic,Music,Radio,Star} from 'lucide-react';
import Dialog from './Dialog';
import s from './Kombinacija.module.css';

export type KombinacijaProps={storagePrefix?:string;locale?:string;autoHelp?:boolean;shareUrl?:string};
type Lvl='lako'|'srednje'|'tesko';
const LEVELS:{id:Lvl;pos:number;syms:number;max:number;repeat:boolean;lat:string;cyr:string}[]=[
 {id:'lako',pos:4,syms:6,max:8,repeat:false,lat:'Lako',cyr:'Лако'},
 {id:'srednje',pos:4,syms:6,max:7,repeat:false,lat:'Srednje',cyr:'Средње'},
 {id:'tesko',pos:4,syms:6,max:6,repeat:false,lat:'Teško',cyr:'Тешко'}];
const SYMS=[
 {I:Music,c:'#e879c9',lat:'muzika',cyr:'музика'},{I:Mic,c:'#7dd3fc',lat:'mikrofon',cyr:'микрофон'},
 {I:Headphones,c:'#fbbf24',lat:'slušalice',cyr:'слушалице'},{I:Radio,c:'#86efac',lat:'radio',cyr:'радио'},
 {I:Guitar,c:'#c4b5fd',lat:'gitara',cyr:'гитара'},{I:Drum,c:'#fdba74',lat:'bubanj',cyr:'бубањ'},
 {I:Star,c:'#f87171',lat:'zvezda',cyr:'звезда'},{I:Heart,c:'#2dd4bf',lat:'srce',cyr:'срце'}];
type Guess={g:number[];b:number;w:number};
const safeRead=(k:string)=>{try{return localStorage.getItem(k)}catch{return null}};
const safeWrite=(k:string,v:string)=>{try{localStorage.setItem(k,v);return true}catch{return false}};
const rnd=()=>{const r=new Uint32Array(1);crypto.getRandomValues(r);return r[0]/4294967296};
function makeSecret(l:typeof LEVELS[number]):number[]{
 if(l.repeat)return Array.from({length:l.pos},()=>Math.floor(rnd()*l.syms));
 const pool=Array.from({length:l.syms},(_,i)=>i);const out:number[]=[];
 while(out.length<l.pos)out.push(pool.splice(Math.floor(rnd()*pool.length),1)[0]);return out}
function score(secret:number[],g:number[]){
 let b=0;const rs:number[]=[],rg:number[]=[];
 secret.forEach((x,i)=>{if(x===g[i])b++;else{rs.push(x);rg.push(g[i])}});
 let w=0;for(const x of rg){const k=rs.indexOf(x);if(k>=0){w++;rs.splice(k,1)}}
 return {b,w}}

export default function Kombinacija({storagePrefix='kombinacija-v1',locale,autoHelp=true,shareUrl}:KombinacijaProps){
 const cyr=!locale||/cyr/i.test(locale);const t=(lat:string,c:string)=>cyr?c:lat;
 const id=useId();const root=useRef<HTMLDivElement>(null);const copyRef=useRef<HTMLTextAreaElement>(null);
 const [lvl,setLvl]=useState<Lvl>('lako');const [secret,setSecret]=useState<number[]>([]);const [guesses,setGuesses]=useState<Guess[]>([]);
 const [cur,setCur]=useState<(number|null)[]>([]);const [status,setStatus]=useState<'play'|'won'|'lost'>('play');
 const [best,setBest]=useState<number|null>(null);const [newBest,setNewBest]=useState(false);
 const [modal,setModal]=useState<'help'|'end'|null>(null);const [notice,setNotice]=useState('');const [copyText,setCopyText]=useState('');
 const timer=useRef<ReturnType<typeof setTimeout>>(undefined);
 const L=LEVELS.find(l=>l.id===lvl)!;

 const readBest=useCallback((l:Lvl)=>{const n=Number(safeRead(`${storagePrefix}-best-${l}`));return Number.isInteger(n)&&n>0?n:null},[storagePrefix]);
 const startNew=useCallback((l:Lvl)=>{clearTimeout(timer.current);const d=LEVELS.find(x=>x.id===l)!;setLvl(l);setSecret(makeSecret(d));setGuesses([]);setCur(Array(d.pos).fill(null));setStatus('play');setNewBest(false);setBest(readBest(l));setModal(null);setNotice('');setCopyText('')},[readBest]);
 useEffect(()=>{startNew('lako');if(autoHelp&&!safeRead(storagePrefix+'-intro'))setModal('help');return()=>clearTimeout(timer.current)},[startNew,autoHelp,storagePrefix]);
 useEffect(()=>{if(!notice)return;const x=setTimeout(()=>setNotice(''),4500);return()=>clearTimeout(x)},[notice]);
 useEffect(()=>{if(copyText)copyRef.current?.select()},[copyText]);

 const full=cur.length>0&&cur.every(x=>x!==null);
 function put(sym:number){if(status!=='play'||modal)return;setCur(c=>{const k=c.indexOf(null);if(k<0)return c;const n=[...c];n[k]=sym;return n})}
 function clearAt(i:number){if(status!=='play')return;setCur(c=>{const n=[...c];n[i]=null;return n})}
 function back(){if(status!=='play')return;setCur(c=>{let k=c.length-1;while(k>=0&&c[k]===null)k--;if(k<0)return c;const n=[...c];n[k]=null;return n})}
 function check(){
  if(status!=='play'||!full)return;
  const g=cur as number[];const r=score(secret,g);const next=[...guesses,{g,...r}];setGuesses(next);setCur(Array(L.pos).fill(null));
  if(r.b===L.pos){setStatus('won');const n=next.length,old=readBest(lvl);if(old===null||n<old){safeWrite(`${storagePrefix}-best-${lvl}`,String(n));setBest(n);setNewBest(true)}timer.current=setTimeout(()=>setModal('end'),500)}
  else if(next.length>=L.max){setStatus('lost');timer.current=setTimeout(()=>setModal('end'),500)}
 }
 function closeModal(){if(modal==='help')safeWrite(storagePrefix+'-intro','1');setModal(null);setCopyText('');setNotice('');root.current?.focus({preventScroll:true})}
 async function share(){
  const url=shareUrl||location.origin+location.pathname;
  const text='$ifr@'+' · '+t(L.lat,L.cyr)+' · '+(status==='won'?`${guesses.length}/${L.max} ${t('pokušaja','покушаја')}`:t('nisam pogodio','нисам погодио'))+`\n\n${url}`;
  try{await navigator.clipboard.writeText(text);setNotice(t('Rezultat je kopiran!','Резултат је копиран!'))}catch{setCopyText(text);setNotice(t('Kopiraj označeni rezultat.','Копирај означени резултат.'))}
 }
 function key(e:React.KeyboardEvent){
  if(e.ctrlKey||e.metaKey||e.altKey||modal)return;
  if(e.key==='Enter'){if((e.target as HTMLElement).tagName==='BUTTON')return;e.preventDefault();check();return}
  if(e.key==='Backspace'){e.preventDefault();back();return}
  const n=Number(e.key);if(n>=1&&n<=L.syms){e.preventDefault();put(n-1)}
 }
 const helpTitle=t('Kako se igra $ifr@?','Како се игра $ifr@?');
 const rowsLeft=Math.max(0,L.max-guesses.length-(status==='play'?1:0));
 const colsStyle:CSSProperties={gridTemplateColumns:`repeat(${L.pos},minmax(0,1fr))`};
 const Row=({g,fb,active,num}:{g:(number|null)[];fb?:{b:number;w:number};active?:boolean;num:number})=>
  <div className={`${s.row} ${active?s.cur:s.past}`}><span className={s.rowNum} aria-hidden="true">{num}</span>
   <div className={s.slots} style={colsStyle}>{g.map((x,i)=>{const sy=x===null?null:SYMS[x],I=sy?.I;
    return <button key={i} type="button" className={`${s.slot} ${sy?s.filled:''}`} disabled={!active||x===null} aria-label={sy?`${i+1}: ${t(sy.lat,sy.cyr)}`:`${i+1}: ${t('prazno','празно')}`} onClick={()=>clearAt(i)}>{I&&<I color={sy!.c}/>}</button>})}</div>
   <div className={s.fb} aria-label={fb?`${fb.b} ${t('na pravom mestu','на правом месту')}, ${fb.w} ${t('na pogrešnom mestu','на погрешном месту')}`:undefined}>
    <span className={s.cnt}><i className={`${s.dot} ${fb?s.b:''}`}/>{fb?fb.b:''}</span><span className={s.cnt}><i className={`${s.dot} ${fb?s.w:''}`}/>{fb?fb.w:''}</span></div></div>;
 return <div ref={root} className={s.root} lang={cyr?'sr-Cyrl':'sr-Latn'} tabIndex={-1} onKeyDown={key}>
 <header className={s.header}><div className={s.title}><span className={s.brand}>$ifr<em className={s.at}>@</em></span></div>
 <div className={s.tools}><button className={s.help} aria-label={helpTitle} onClick={()=>setModal('help')}>?</button></div></header>
 <section className={s.game} aria-label={'$ifr@'}>
  <div className={s.bar}>
   <div className={s.mini}><span>{t('Pokušaj','Покушај')}</span><strong role="status" aria-live="polite">{Math.min(guesses.length+(status==='play'?1:0),L.max)}/{L.max}</strong></div>
   <div className={s.mini}><span>{t('Najbolji','Најбољи')}</span><strong>{best??'–'}</strong></div>
   <div className={s.lv} role="group" aria-label={t('Težina','Тежина')}>{LEVELS.map(l=><button key={l.id} className={`${s.pill} ${l.id===lvl?s.pillOn:''}`} aria-pressed={l.id===lvl} onClick={()=>{if(l.id!==lvl)startNew(l.id)}}>{t(l.lat,l.cyr)}</button>)}</div>
   <button className={`${s.pill} ${s.newBtn}`} onClick={()=>startNew(lvl)}>{t('Nova igra','Нова игра')}</button></div>
  <div className={s.board2} role="group" aria-label={t('Pokušaji','Покушаји')}>
   {guesses.map((x,i)=><Row key={i} g={x.g} fb={x} num={i+1}/>)}
   {status==='play'&&<Row g={cur} active num={guesses.length+1}/>}
   {Array.from({length:rowsLeft},(_,i)=><Row key={'e'+i} g={Array(L.pos).fill(null)} num={guesses.length+(status==='play'?2:1)+i}/>)}
  </div>
  <div className={s.keys} role="group" aria-label={t('Simboli','Симболи')}>{SYMS.slice(0,L.syms).map((sy,i)=>{const I=sy.I;return <button key={i} type="button" className={s.sym} disabled={status!=='play'||full} aria-label={`${i+1}: ${t(sy.lat,sy.cyr)}`} onClick={()=>put(i)}><I color={sy.c}/></button>})}
   <button type="button" className={`${s.sym} ${s.act}`} disabled={status!=='play'} aria-label={t('Obriši poslednji simbol','Обриши последњи симбол')} title={t('Obriši','Обриши')} onClick={back}><Delete/></button>
   <button type="button" className={`${s.sym} ${s.act} ${s.go}`} disabled={!full||status!=='play'} aria-label={t('Proveri','Провери')} title={t('Proveri','Провери')} onClick={check}><CornerDownLeft/></button></div>
 </section>
 <Dialog open={modal==='help'} titleId={id+'-help'} onClose={closeModal} closeLabel={t('Zatvori','Затвори')}>
  <h2 id={id+'-help'}>{helpTitle}</h2>
  <p>{t('Računar je zamislio tajni niz simbola. Složi svoj niz i pritisni Proveri. Pored svakog pokušaja pišu dva broja:','Рачунар је замислио тајни низ симбола. Сложи свој низ и притисни Провери. Поред сваког покушаја пишу два броја:')}</p>
  <div className={s.callout}><strong>● {t('Pun roze krug i broj','Пун розе круг и број')}</strong><p>{t('Koliko je simbola tačno i na pravom mestu.','Колико је симбола тачно и на правом месту.')}</p></div>
  <div className={s.callout}><strong>○ {t('Prazan krug i broj','Празан круг и број')}</strong><p>{t('Koliko simbola postoji u nizu, ali je na pogrešnom mestu. Brojevi ne kažu koji su to simboli, samo koliko ih ima.','Колико симбола постоји у низу, али је на погрешном месту. Бројеви не кажу који су то симболи, само колико их има.')}</p></div>
  <p>{t('Uvek se pogađaju 4 različita simbola od njih 6 (simboli se ne ponavljaju). Težina je samo u broju pokušaja: lako 8, srednje 7, teško 6. Taster 1 do 8 bira simbol, Backspace briše, Enter proverava. Najbolji rezultat (najmanje pokušaja) čuva se za svaku težinu na ovom uređaju.','Увек се погађају 4 различита симбола од њих 6 (симболи се не понављају). Тежина је само у броју покушаја: лако 8, средње 7, тешко 6. Тастер 1 до 8 бира симбол, Backspace брише, Enter проверава. Најбољи резултат (најмање покушаја) чува се за сваку тежину на овом уређају.')}</p>
  <button className={s.primary} onClick={closeModal}>{t('Igraj!','Играј!')}</button>
 </Dialog>
 <Dialog open={modal==='end'} titleId={id+'-end'} onClose={closeModal} closeLabel={t('Zatvori','Затвори')}><div className={s.result}><span className={s.spark} aria-hidden="true">✦&#xFE0E;</span>
  <h2 id={id+'-end'}>{status==='won'?t('Pogodio si šifru!','Погодио си шифру!'):t('Pokušaj ponovo','Покушај поново')}</h2>
  <p>{status==='won'?`${guesses.length}/${L.max} ${t('pokušaja','покушаја')}${newBest?' · '+t('novi najbolji rezultat!','нови најбољи резултат!'):''}`:t('Tajna šifra je bila:','Тајна шифра је била:')}</p>
  {status==='lost'&&<div className={s.secretRow}>{secret.map((x,i)=>{const sy=SYMS[x],I=sy.I;return <span key={i} className={s.sym} role="img" aria-label={t(sy.lat,sy.cyr)}><I color={sy.c}/></span>})}</div>}
  <button className={s.primary} onClick={()=>startNew(lvl)}>{t('Nova igra','Нова игра')}</button><button className={s.primary} onClick={()=>void share()}>{t('Podeli rezultat ↗︎','Подели резултат ↗︎')}</button>
  <p role="status" aria-live="polite">{notice}</p>{copyText&&<textarea ref={copyRef} className={s.copy} readOnly value={copyText} aria-label={t('Rezultat za kopiranje','Резултат за копирање')}/>}</div></Dialog>
 </div>;
}
