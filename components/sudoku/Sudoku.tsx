'use client';
import {useCallback,useEffect,useId,useRef,useState,type CSSProperties} from 'react';
import {Eraser,Lightbulb,Pencil,Undo2} from 'lucide-react';
import {CLUES,conflicts,makePuzzle,peers,type Level} from '@/lib/sudoku/engine';
import Dialog from './Dialog';
import s from './Sudoku.module.css';

export type SudokuProps={storagePrefix?:string;locale?:string;autoHelp?:boolean;shareUrl?:string};
const LEVELS:{id:Level;lat:string;cyr:string}[]=[{id:'lako',lat:'Lako',cyr:'Лако'},{id:'srednje',lat:'Srednje',cyr:'Средње'},{id:'tesko',lat:'Teško',cyr:'Тешко'}];
type Snap={vals:number[];notes:number[]};
type Saved={lvl:Level;puzzle:number[];solution:number[];vals:number[];notes:number[];secs:number;hints:number};
const safeRead=(k:string)=>{try{return localStorage.getItem(k)}catch{return null}};
const safeWrite=(k:string,v:string)=>{try{localStorage.setItem(k,v);return true}catch{return false}};
const rnd=()=>{const r=new Uint32Array(1);crypto.getRandomValues(r);return r[0]/4294967296};
const mmss=(n:number)=>`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;
const okArr=(a:unknown,len:number,max:number):a is number[]=>Array.isArray(a)&&a.length===len&&a.every(x=>Number.isInteger(x)&&x>=0&&x<=max);
const PEERS:number[][]=Array.from({length:81},(_,i)=>peers(i));

export default function Sudoku({storagePrefix='sudoku-v1',locale,autoHelp=true,shareUrl}:SudokuProps){
 const cyr=!locale||/cyr/i.test(locale);const t=(lat:string,c:string)=>cyr?c:lat;
 const id=useId();const root=useRef<HTMLDivElement>(null);const copyRef=useRef<HTMLTextAreaElement>(null);
 const [lvl,setLvl]=useState<Level>('lako');const [puzzle,setPuzzle]=useState<number[]>(Array(81).fill(0));const [solution,setSolution]=useState<number[]>(Array(81).fill(0));
 const [vals,setVals]=useState<number[]>(Array(81).fill(0));const [notes,setNotes]=useState<number[]>(Array(81).fill(0));
 const [sel,setSel]=useState<number|null>(null);const [noteMode,setNoteMode]=useState(false);const [secs,setSecs]=useState(0);const [hints,setHints]=useState(0);
 const [won,setWon]=useState(false);const [ready,setReady]=useState(false);const [best,setBest]=useState<number|null>(null);const [newBest,setNewBest]=useState(false);
 const [modal,setModal]=useState<'help'|'win'|'new'|null>(null);const [pending,setPending]=useState<Level>('lako');const [notice,setNotice]=useState('');const [copyText,setCopyText]=useState('');
 const undo=useRef<Snap[]>([]);

 const readBest=useCallback((l:Level)=>{const n=Number(safeRead(`${storagePrefix}-best-${l}`));return Number.isInteger(n)&&n>0?n:null},[storagePrefix]);
 const startNew=useCallback((l:Level)=>{const {puzzle:p,solution:so}=makePuzzle(l,rnd);setLvl(l);setPuzzle(p);setSolution(so);setVals([...p]);setNotes(Array(81).fill(0));setSel(null);setNoteMode(false);setSecs(0);setHints(0);setWon(false);setNewBest(false);setBest(readBest(l));undo.current=[];setModal(null);setNotice('');setCopyText('');setReady(true)},[readBest]);
 useEffect(()=>{
  let saved:Saved|null=null;try{const j=JSON.parse(safeRead(storagePrefix+'-state')??'null');
   if(j&&(j.lvl in CLUES)&&okArr(j.puzzle,81,9)&&okArr(j.solution,81,9)&&okArr(j.vals,81,9)&&okArr(j.notes,81,1022)&&j.solution.every((x:number)=>x>0)&&j.vals.every((v:number,i:number)=>!j.puzzle[i]||v===j.puzzle[i]))saved=j}catch{}
  if(saved&&!saved.vals.every((v,i)=>v===saved!.solution[i])){setLvl(saved.lvl);setPuzzle(saved.puzzle);setSolution(saved.solution);setVals(saved.vals);setNotes(saved.notes);setSecs(Math.max(0,Number(saved.secs)||0));setHints(Math.max(0,Number(saved.hints)||0));setBest(readBest(saved.lvl));setReady(true)}
  else startNew('lako');
  if(autoHelp&&!safeRead(storagePrefix+'-intro'))setModal('help');
 },[storagePrefix,startNew,autoHelp,readBest]);
 useEffect(()=>{if(!ready||won)return;safeWrite(storagePrefix+'-state',JSON.stringify({lvl,puzzle,solution,vals,notes,secs,hints}))},[ready,won,lvl,puzzle,solution,vals,notes,hints,secs,storagePrefix]);
 useEffect(()=>{if(!ready||won||modal)return;const x=setInterval(()=>{if(document.visibilityState==='visible')setSecs(v=>v+1)},1000);return()=>clearInterval(x)},[ready,won,modal]);
 useEffect(()=>{if(!notice)return;const x=setTimeout(()=>setNotice(''),4000);return()=>clearTimeout(x)},[notice]);
 useEffect(()=>{if(copyText)copyRef.current?.select()},[copyText]);

 const bad=conflicts(vals);
 const counts=Array(10).fill(0);vals.forEach(v=>{if(v)counts[v]++});
 function snapshot(){undo.current.push({vals:[...vals],notes:[...notes]});if(undo.current.length>200)undo.current.shift()}
 function finish(nv:number[]){
  if(!nv.every((v,i)=>v===solution[i]))return;
  setWon(true);try{localStorage.removeItem(storagePrefix+'-state')}catch{}
  const old=readBest(lvl);if(old===null||secs<old){safeWrite(`${storagePrefix}-best-${lvl}`,String(secs));setBest(secs);setNewBest(true)}
  setTimeout(()=>setModal('win'),400);
 }
 function enter(d:number){
  if(won||modal||sel===null||puzzle[sel])return;
  if(noteMode){if(vals[sel])return;snapshot();setNotes(n=>{const m=[...n];m[sel]^=1<<d;return m});return}
  snapshot();const nv=[...vals];const same=nv[sel]===d;nv[sel]=same?0:d;setVals(nv);
  setNotes(n=>{const m=[...n];m[sel]=0;if(!same)for(const p of PEERS[sel])m[p]&=~(1<<d);return m});
  if(!same)finish(nv);
 }
 function erase(){if(won||sel===null||puzzle[sel]||(!vals[sel]&&!notes[sel]))return;snapshot();setVals(v=>{const a=[...v];a[sel]=0;return a});setNotes(n=>{const m=[...n];m[sel]=0;return m})}
 function undoMove(){const p=undo.current.pop();if(!p||won)return;setVals(p.vals);setNotes(p.notes)}
 function hint(){
  if(won||modal)return;if(sel===null||puzzle[sel]){setNotice(t('Izaberi prazno polje za nagoveštaj.','Изабери празно поље за наговештај.'));return}
  if(vals[sel]===solution[sel])return;
  snapshot();const nv=[...vals];nv[sel]=solution[sel];setVals(nv);setHints(h=>h+1);
  setNotes(n=>{const m=[...n];m[sel]=0;for(const p of PEERS[sel])m[p]&=~(1<<solution[sel]);return m});finish(nv);
 }
 function askNew(l:Level){const progress=!won&&vals.some((v,i)=>v&&!puzzle[i]);if(progress){setPending(l);setModal('new')}else startNew(l)}
 function closeModal(){if(modal==='help')safeWrite(storagePrefix+'-intro','1');setModal(null);setCopyText('');setNotice('');root.current?.focus({preventScroll:true})}
 async function share(){
  const url=shareUrl||location.origin+location.pathname;const L=LEVELS.find(l=>l.id===lvl)!;
  const text=t('Sudoku','Судоку')+' · '+t(L.lat,L.cyr)+' · '+mmss(secs)+(hints?` · ${hints} ${t('nagoveštaja','наговештаја')}`:'')+`\n\n${url}`;
  try{await navigator.clipboard.writeText(text);setNotice(t('Rezultat je kopiran!','Резултат је копиран!'))}catch{setCopyText(text);setNotice(t('Kopiraj označeni rezultat.','Копирај означени резултат.'))}
 }
 function key(e:React.KeyboardEvent){
  if(e.ctrlKey||e.metaKey||e.altKey||modal)return;
  const k=e.key;
  if(/^[1-9]$/.test(k)){e.preventDefault();enter(Number(k));return}
  if(k==='Backspace'||k==='Delete'||k==='0'){e.preventDefault();erase();return}
  if(k==='n'||k==='N'){e.preventDefault();setNoteMode(m=>!m);return}
  const mv:Record<string,number>={ArrowLeft:-1,ArrowRight:1,ArrowUp:-9,ArrowDown:9};
  if(k in mv){e.preventDefault();setSel(c=>{if(c===null)return 40;const r=Math.floor(c/9),co=c%9;const nr=r+(k==='ArrowUp'?-1:k==='ArrowDown'?1:0),nc=co+(k==='ArrowLeft'?-1:k==='ArrowRight'?1:0);return nr<0||nr>8||nc<0||nc>8?c:nr*9+nc})}
 }
 const helpTitle=t('Kako se igra Sudoku?','Како се игра Судоку?');
 const selVal=sel!==null?vals[sel]:0;
 const L=LEVELS.find(l=>l.id===lvl)!;
 return <div ref={root} className={s.root} lang={cyr?'sr-Cyrl':'sr-Latn'} tabIndex={-1} onKeyDown={key}>
 <header className={s.header}><div className={s.title}><span className={s.brand}>{cyr?<>Су<em>до</em>ку</>:<>Su<em>do</em>ku</>}</span></div><div className={s.tools}><button className={s.help} aria-label={helpTitle} onClick={()=>setModal('help')}>?</button></div></header>
 <section className={s.game} aria-label={t('Sudoku','Судоку')}>
  <div className={s.lay}>
  <div className={s.bar}>
   <div className={s.mini}><span>{t('Vreme','Време')}</span><strong>{mmss(secs)}</strong></div>
   <div className={s.mini}><span>{t('Najbolji','Најбољи')}</span><strong>{best?mmss(best):'–'}</strong></div>
   <div className={s.lv} role="group" aria-label={t('Težina','Тежина')}>{LEVELS.map(l=><button key={l.id} className={`${s.pill} ${l.id===lvl?s.pillOn:''}`} aria-pressed={l.id===lvl} onClick={()=>{if(l.id!==lvl)askNew(l.id)}}>{t(l.lat,l.cyr)}</button>)}</div>
   <button className={`${s.pill} ${s.newBtn}`} onClick={()=>askNew(lvl)}>{t('Nova igra','Нова игра')}</button></div>
  <div className={s.sgrid} style={{gridTemplateColumns:'repeat(9,minmax(0,1fr))'} as CSSProperties} role="grid" aria-label={t('Tabla 9 puta 9','Табла 9 пута 9')}>
   {vals.map((v,i)=>{const r=Math.floor(i/9),c=i%9;const isSel=sel===i;const peer=sel!==null&&!isSel&&PEERS[sel].includes(i);const same=selVal>0&&v===selVal&&!isSel;
    const cls=[s.sc,c%3===2&&c<8?s.cr:'',r%3===2&&r<8?s.cb:'',c===8?s.ce:'',r===8?s.cl:'',puzzle[i]?s.given:v?s.user:'',isSel?s.sel:same?s.same:peer?s.peer:'',bad.has(i)?s.bad:''].join(' ');
    return <button key={i} type="button" role="gridcell" className={cls} aria-selected={isSel} aria-label={`${t('red','ред')} ${r+1}, ${t('kolona','колона')} ${c+1}: ${v?v:t('prazno','празно')}${puzzle[i]?', '+t('zadato','задато'):''}`} onClick={()=>{setSel(i);root.current?.focus({preventScroll:true})}}>
     {v?v:notes[i]?<span className={s.sn} aria-hidden="true">{[1,2,3,4,5,6,7,8,9].map(d=><span key={d}>{notes[i]&(1<<d)?d:''}</span>)}</span>:null}</button>})}
  </div>
  <div className={s.pad9} role="group" aria-label={t('Brojevi','Бројеви')}>{[1,2,3,4,5,6,7,8,9].map(d=><button key={d} type="button" className={s.dg} disabled={won||counts[d]>=9} onClick={()=>enter(d)}>{d}</button>)}</div>
  <div className={s.tools2}>
   <button type="button" className={s.tl} disabled={won||undo.current.length===0} onClick={undoMove}><Undo2/><span>{t('Vrati','Врати')}</span></button>
   <button type="button" className={s.tl} disabled={won} onClick={erase}><Eraser/><span>{t('Obriši','Обриши')}</span></button>
   <button type="button" className={s.tl} aria-pressed={noteMode} onClick={()=>setNoteMode(m=>!m)}><Pencil/><span>{t('Beleške','Белешке')}</span></button>
   <button type="button" className={s.tl} disabled={won} onClick={hint}><Lightbulb/><span>{t('Nagoveštaj','Наговештај')}</span></button></div>
  <div className={s.note2} role="status" aria-live="polite">{notice||(noteMode?t('Beleške su uključene: broj se upisuje kao mala beleška.','Белешке су укључене: број се уписује као мала белешка.'):'')}</div>
  </div>
 </section>
 <Dialog open={modal==='help'} titleId={id+'-help'} onClose={closeModal} closeLabel={t('Zatvori','Затвори')}>
  <h2 id={id+'-help'}>{helpTitle}</h2>
  <p>{t('Popuni tablu tako da se u svakom redu, svakoj koloni i svakom od devet kvadrata 3×3 svaki broj od 1 do 9 pojavi tačno jednom.','Попуни таблу тако да се у сваком реду, свакој колони и сваком од девет квадрата 3×3 сваки број од 1 до 9 појави тачно једном.')}</p>
  <p>{t('Dodirni polje, pa broj. Isti broj ponovo dodirnut briše upis. Crveno znači da se broj ponavlja u redu, koloni ili kvadratu.','Додирни поље, па број. Исти број поново додирнут брише упис. Црвено значи да се број понавља у реду, колони или квадрату.')}</p>
  <div className={s.callout}><strong>{t('Težina','Тежина')}</strong><p>{t(`Zavisi od broja ponuđenih brojeva: lako ${CLUES.lako}, srednje ${CLUES.srednje}, teško ${CLUES.tesko}. Svaka tabla ima tačno jedno rešenje.`,`Зависи од броја понуђених бројева: лако ${CLUES.lako}, средње ${CLUES.srednje}, тешко ${CLUES.tesko}. Свака табла има тачно једно решење.`)}</p></div>
  <div className={s.callout}><strong>{t('Beleške i nagoveštaj','Белешке и наговештај')}</strong><p>{t('Dugme Beleške (ili taster N) upisuje male brojeve kao podsetnik. Nagoveštaj popunjava izabrano polje, ali se računa u rezultat. Taster 1 do 9 upisuje, strelice pomeraju, Backspace briše. Igra se čuva na ovom uređaju dok je ne završiš.','Дугме Белешке (или тастер N) уписује мале бројеве као подсетник. Наговештај попуњава изабрано поље, али се рачуна у резултат. Тастер 1 до 9 уписује, стрелице померају, Backspace брише. Игра се чува на овом уређају док је не завршиш.')}</p></div>
  <button className={s.primary} onClick={closeModal}>{t('Igraj!','Играј!')}</button>
 </Dialog>
 <Dialog open={modal==='new'} titleId={id+'-new'} onClose={closeModal} closeLabel={t('Zatvori','Затвори')}><h2 id={id+'-new'}>{t('Nova igra?','Нова игра?')}</h2><p>{t('Trenutna tabla i njeno vreme biće izgubljeni. Najbolje vreme se čuva.','Тренутна табла и њено време биће изгубљени. Најбоље време се чува.')}</p><button className={s.primary} onClick={()=>startNew(pending)}>{t('Počni novu igru','Почни нову игру')}</button><button className={s.textButton} onClick={closeModal}>{t('Odustani','Одустани')}</button></Dialog>
 <Dialog open={modal==='win'} titleId={id+'-win'} onClose={closeModal} closeLabel={t('Zatvori','Затвори')}><div className={s.result}><span className={s.spark} aria-hidden="true">✦&#xFE0E;</span>
  <h2 id={id+'-win'}>{t('Rešeno!','Решено!')}</h2>
  <p>{t(L.lat,L.cyr)} · {mmss(secs)}{hints?` · ${hints} ${t('nagoveštaja','наговештаја')}`:''}{newBest?' · '+t('novo najbolje vreme!','ново најбоље време!'):''}</p>
  <button className={s.primary} onClick={()=>startNew(lvl)}>{t('Nova igra','Нова игра')}</button><button className={s.primary} onClick={()=>void share()}>{t('Podeli rezultat ↗︎','Подели резултат ↗︎')}</button>
  <p role="status" aria-live="polite">{notice}</p>{copyText&&<textarea ref={copyRef} className={s.copy} readOnly value={copyText} aria-label={t('Rezultat za kopiranje','Резултат за копирање')}/>}</div></Dialog>
 </div>;
}
