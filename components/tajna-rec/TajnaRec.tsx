'use client';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { alphabet, dailyAnswer, dayKey, display, hintCandidates, normalizeKey, score, type Mark, type Script } from '@/lib/tajna-rec/engine.mjs';
import { choosePractice, dateLabel, erase, fresh, isDone, restore, reveal, typeLetter, type GameState } from '@/lib/tajna-rec/state.mjs';
import Dialog from './Dialog';
import s from './TajnaRec.module.css';

export type TajnaRecProps = {
 /** Test controls are absent unless the host developer opts in. */
 enablePractice?: boolean;
 /** Set true only on a dedicated test page. Ignored when practice is disabled. */
 startInPractice?: boolean;
 /** Prefix with Next basePath if applicable. */
 assetBaseUrl?: string;
 timeUrl?: string;
 /** Change only to intentionally isolate stored progress. */
 storagePrefix?: string;
 /** Jezik stranice sajta (npr. "sr-cyrl", "sr-latn", "en"). Kada je zadat, igra prati pismo sajta, skriva svoj izbor Ћир/Lat i ne pamti ga; "sr-cyrl" daje ćirilicu, sve ostalo latinicu. */
 locale?: string;
 /** Radio 10K: kada je false, uputstvo se ne otvara samo pri prvom dolasku (dugme ? ostaje). */
 autoHelp?: boolean;
 shareUrl?: string;
};
type Session={key:string;answer:string;practice:boolean;state:GameState};
type Modal='help'|'hint'|'result'|null;
const KEY_ROWS=['ЉЊЕРТЗУИОПШ','АСДФГХЈКЛЧЋ','ЏЦВБНМЂЖ'];
const safeRead=(key:string)=>{try{return localStorage.getItem(key)}catch{return null}};
const safeWrite=(key:string,value:string)=>{try{localStorage.setItem(key,value);return true}catch{return false}};
const random=()=>{const r=new Uint32Array(1);crypto.getRandomValues(r);return r[0]};

export default function TajnaRec({enablePractice=false,startInPractice=false,assetBaseUrl='/tajna-rec',timeUrl='/api/tajna-rec/time',storagePrefix='tajna-react-v1',shareUrl,locale,autoHelp=true}:TajnaRecProps){
 const forced:Script|null=locale==null?null:/cyr/i.test(locale)?'cyr':'lat';
 const id=useId();const root=useRef<HTMLDivElement>(null);const copyRef=useRef<HTMLTextAreaElement>(null);
 const [script,setScript]=useState<Script>(forced??'cyr');const [session,setSession]=useState<Session|null>(null);
 useEffect(()=>{if(forced)setScript(forced)},[forced]);
 const current=useRef<Session|null>(null);const data=useRef<{schedule:string[];allowed:Set<string>}|null>(null);
 const clock=useRef<{epoch:number;tick:number}|null>(null);const dateRef=useRef('');
 const [date,setDate]=useState('');const [clockWarning,setClockWarning]=useState(false);const [storageWarning,setStorageWarning]=useState(false);
 const [modal,setModal]=useState<Modal>(null);const [notice,setNotice]=useState('');const [hintText,setHintText]=useState('');const [copyText,setCopyText]=useState('');
 const [loadError,setLoadError]=useState(false);const [reload,setReload]=useState(0);
 const t=(lat:string,cyr:string)=>script==='lat'?lat:cyr;
 const word=(w:string)=>display(w,script);
 const helpTitle=t('Kako se igra TAJNA reč?','Како се игра ТАЈНА реч?');
 const hintTitle=t('Šapni mi slovo','Шапни ми слово');
 const done=session?isDone(session.state,session.answer):false;
 const won=session?.state.guesses.includes(session.answer)??false;
 const persist=useCallback((next:Session)=>{current.current=next;setSession(next);if(!safeWrite(next.key,JSON.stringify(next.state)))setStorageWarning(true)},[]);
 const openSaved=useCallback((answer:string,key:string,practice:boolean)=>{
  const next={answer,key,practice,state:restore(safeRead(key),answer,data.current!.allowed)};
  current.current=next;setSession(next);return next;
 },[]);
 const now=useCallback(()=>clock.current?new Date(clock.current.epoch+performance.now()-clock.current.tick):new Date(),[]);
 const nextPractice=useCallback(()=>{
  if(!enablePractice||!data.current||!current.current)return;
  const daily=dailyAnswer(data.current.schedule,dateRef.current);let used:string[]=[];
  try{const parsed=JSON.parse(safeRead(storagePrefix+'-practice-used')||'[]');if(Array.isArray(parsed))used=parsed.filter(x=>typeof x==='string')}catch{}
  const pick=choosePractice(data.current.schedule,current.current.answer,daily,used,random());
  const key=storagePrefix+'-practice-'+Date.now().toString(36)+'-'+random().toString(36);
  safeWrite(storagePrefix+'-practice-used',JSON.stringify(pick.used));safeWrite(storagePrefix+'-practice-active',JSON.stringify({key,answer:pick.word}));
  persist({answer:pick.word,key,practice:true,state:fresh()});setModal(null);setNotice('');setCopyText('');
 },[enablePractice,persist,storagePrefix]);
 const backToDaily=()=>{if(!data.current)return;const next=openSaved(dailyAnswer(data.current.schedule,dateRef.current),storagePrefix+'-day-'+dateRef.current,false);setCopyText('');setNotice('');setModal(isDone(next.state,next.answer)?'result':null)};

 useEffect(()=>{
  let disposed=false,busy=false;const abort=new AbortController();
  setLoadError(false);setScript(forced??(safeRead(storagePrefix+'-script')==='lat'?'lat':'cyr'));
  function syncDate(){if(!data.current||disposed)return;const key=dayKey(now());if(key===dateRef.current)return;dateRef.current=key;setDate(key);
   if(!current.current?.practice){const next=openSaved(dailyAnswer(data.current.schedule,key),storagePrefix+'-day-'+key,false);setModal(isDone(next.state,next.answer)?'result':null);setCopyText('')}
  }
  async function syncClock(){if(busy||disposed)return;busy=true;try{
   const started=performance.now();const res=await fetch(timeUrl,{cache:'no-store',signal:AbortSignal.any([abort.signal,AbortSignal.timeout(6000)])});
   if(!res.ok)throw Error('clock');const body=await res.json();if(typeof body.epochMs!=='number'||!Number.isFinite(body.epochMs)||body.epochMs<0)throw Error('clock');
   if(!disposed){clock.current={epoch:body.epochMs+(performance.now()-started)/2,tick:performance.now()};setClockWarning(false)}
  }catch{if(!disposed)setClockWarning(true)}finally{busy=false}syncDate()}
  async function init(){try{
   const base=assetBaseUrl.replace(/\/$/,'');const responses=await Promise.all([fetch(base+'/schedule.json',{signal:abort.signal}),fetch(base+'/dictionary.json',{signal:abort.signal})]);
   if(responses.some(r=>!r.ok))throw Error('data');const [schedule,dict]=await Promise.all(responses.map(r=>r.json()));
   const valid=(x:unknown):x is string=>typeof x==='string'&&x.length===5&&[...x].every(c=>alphabet.includes(c));
   if(!Array.isArray(schedule)||schedule.length<3||!schedule.every(valid)||new Set(schedule).size!==schedule.length||!Array.isArray(dict)||!dict.every(valid))throw Error('data');
   if(disposed)return;data.current={schedule,allowed:new Set([...dict,...schedule])};await syncClock();if(disposed)return;
   if(enablePractice&&startInPractice){let active;try{active=JSON.parse(safeRead(storagePrefix+'-practice-active')||'null')}catch{}
    if(active&&typeof active.key==='string'&&active.key.startsWith(storagePrefix+'-practice-')&&schedule.includes(active.answer))openSaved(active.answer,active.key,true);else nextPractice();
   }
   const st=current.current;setModal(autoHelp&&!safeRead(storagePrefix+'-intro')?'help':st&&isDone(st.state,st.answer)?'result':null);
  }catch{if(!disposed)setLoadError(true)}}
  void init();const tick=setInterval(syncDate,1000);const check=setInterval(()=>void syncClock(),60000);
  const visibility=()=>{if(!document.hidden){syncDate();void syncClock()}};
  const storage=(event:StorageEvent)=>{if(event.key===current.current?.key&&data.current){const old=current.current;const next=openSaved(old.answer,old.key,old.practice);if(isDone(next.state,next.answer))setModal('result')}};
  document.addEventListener('visibilitychange',visibility);window.addEventListener('storage',storage);
  return()=>{disposed=true;abort.abort();clearInterval(tick);clearInterval(check);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('storage',storage);dateRef.current='';current.current=null;data.current=null};
 },[assetBaseUrl,timeUrl,storagePrefix,now,openSaved,enablePractice,startInPractice,nextPractice,reload]);
 useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),4500);return()=>clearTimeout(timer)},[notice]);
 useEffect(()=>{if(copyText)copyRef.current?.select()},[copyText]);
 function closeModal(){if(modal==='help'){safeWrite(storagePrefix+'-intro','1');setModal(done?'result':null)}else setModal(null);setCopyText('');setNotice('');root.current?.focus({preventScroll:true})}
 function press(key:string){const active=current.current;if(!active||!data.current||modal||isDone(active.state,active.answer))return;
  if(!active.practice&&dayKey(now())!==dateRef.current){const day=dayKey(now());dateRef.current=day;setDate(day);openSaved(dailyAnswer(data.current.schedule,day),storagePrefix+'-day-'+day,false);setNotice(t('Stigla je nova tajna reč.','Стигла је нова тајна реч.'));return}
  if(key==='Enter'){
   if(active.state.input.some(x=>!x)){setNotice(t('Unesi svih pet slova.','Унеси свих пет слова.'));return}
   const guess=active.state.input.join('');if(!data.current.allowed.has(guess)){setNotice(t('Reč nije u rečniku. Pokušaj drugu.','Реч није у речнику. Покушај другу.'));return}
   const next={...active,state:{...active.state,guesses:[...active.state.guesses,guess],input:Array(5).fill('')}};persist(next);setNotice('');if(isDone(next.state,next.answer))setModal('result');return;
  }
  if(key==='Backspace'){persist({...active,state:erase(active.state)});return}
  const letter=normalizeKey(key);if(letter)persist({...active,state:typeLetter(active.state,letter)});
 }
 function useHint(){const active=current.current;if(!active)return;
  if(!active.practice&&dayKey(now())!==dateRef.current){backToNewDay();return}
  const candidates=hintCandidates(active.state.guesses,active.answer);
  if(isDone(active.state,active.answer))setHintText(t('Partija je završena.','Партија је завршена.'));
  else if(active.state.hint)setHintText(t('Pomoć je već iskorišćena. Rezultat se označava „uz pomoć“.','Помоћ је већ искоришћена. Резултат се означава „уз помоћ“.'));
  else if(active.state.guesses.length!==5)setHintText(t('Pomoć je dostupna pred poslednji pokušaj.','Помоћ је доступна пред последњи покушај.'));
  else if(!candidates.length)setHintText(t('Sva mesta su već otkrivena prethodnim tragovima.','Сва места су већ откривена претходним траговима.'));
  else {const updated=reveal(active.state,active.answer,random());persist({...active,state:updated});setHintText(t('Šapat: ','Шапат: ')+word(updated.hint!.letter)+t(' je na mestu ',' је на месту ')+(updated.hint!.index+1)+t('. Rezultat će biti označen „uz pomoć“.','. Резултат ће бити означен „уз помоћ“.'))}
  setModal('hint');
 }
 function backToNewDay(){if(!data.current)return;const day=dayKey(now());dateRef.current=day;setDate(day);openSaved(dailyAnswer(data.current.schedule,day),storagePrefix+'-day-'+day,false);setModal(null);setNotice(t('Stigla je nova tajna reč.','Стигла је нова тајна реч.'))}
 async function share(){if(!session)return;const emoji={correct:'🟩',present:'🟨',absent:'⬛'};const url=shareUrl||location.origin+location.pathname;
  const text=t('TAJNA reč','ТАЈНА реч')+(session.practice?t(' · PROBA',' · ПРОБА'):'')+' · '+date+'\n'+(won?session.state.guesses.length:'X')+'/6'+(session.state.hint?t(' · uz pomoć ✧',' · уз помоћ ✧'):'')+'\n\n'+session.state.guesses.map(g=>score(g,session.answer).map(m=>emoji[m]).join('')).join('\n')+'\n\n'+url;
  try{await navigator.clipboard.writeText(text);setNotice(t('Rezultat je kopiran!','Резултат је копиран!'))}catch{setCopyText(text);setNotice(t('Kopiraj označeni rezultat.','Копирај означени резултат.'))}
 }
 const keyboardMarks:Record<string,Mark>={};const ranks={absent:1,present:2,correct:3};
 session?.state.guesses.forEach(g=>score(g,session.answer).forEach((m,i)=>{if(!keyboardMarks[g[i]]||ranks[m]>ranks[keyboardMarks[g[i]]])keyboardMarks[g[i]]=m}));
 if(session?.state.hint)keyboardMarks[session.state.hint.letter]='correct';
 const locked=!session||done||session.state.guesses.length!==5||!!session.state.hint||!hintCandidates(session.state.guesses,session.answer).length;
 const statusLabels={correct:t('tačno mesto','тачно место'),present:t('drugo mesto','друго место'),absent:t('nije dostupno u reči','није доступно у речи')};
 const practiceButtons=enablePractice?<div className={s.actions}><button className={s.secondary} onClick={nextPractice}>{t('Nova probna reč','Нова пробна реч')}</button>{session?.practice&&<button className={s.textButton} onClick={backToDaily}>{t('Nazad na dnevni izazov','Назад на дневни изазов')}</button>}</div>:null;
 return <div ref={root} className={s.root} lang={script==='cyr'?'sr-Cyrl':'sr-Latn'} tabIndex={-1} onKeyDown={e=>{
  if(e.ctrlKey||e.metaKey||e.altKey||modal)return;const target=e.target as HTMLElement;
  if(['INPUT','TEXTAREA','SELECT'].includes(target.tagName)||target.isContentEditable)return;
  if(target.tagName==='BUTTON'&&(e.key==='Enter'||e.key===' '))return;
  if(e.key==='Enter'||e.key==='Backspace'||normalizeKey(e.key)){e.preventDefault();press(e.key);root.current?.focus({preventScroll:true})}
 }}>
 <header className={s.header}><div className={s.title}><span className={s.brand}>{t('TAJNA','ТАЈНА')} <em>{t('reč','реч')}</em></span>{date&&<time dateTime={date}>{dateLabel(date,script)}</time>}</div>
 <div className={s.tools}>{!forced&&<div className={s.language} aria-label={t('Pismo','Писмо')}>{(['cyr','lat'] as Script[]).map(x=><button key={x} aria-pressed={script===x} className={script===x?s.active:''} onClick={()=>{setScript(x);safeWrite(storagePrefix+'-script',x);setNotice('')}}>{x==='cyr'?'Ћир':'Lat'}</button>)}</div>}<button className={s.help} aria-label={helpTitle} onClick={()=>setModal('help')}>?</button></div></header>
 {loadError?<div className={s.loading} role="alert">{t('Igra se nije učitala.','Игра се није учитала.')} <button className={s.secondary} onClick={()=>setReload(x=>x+1)}>{t('Pokušaj ponovo','Покушај поново')}</button></div>:!session?<p className={s.loading} role="status">{t('Učitavanje igre…','Учитавање игре…')}</p>:<section className={s.game} aria-label={t('Tabla i tastatura','Табла и тастатура')}>
 <div className={s.play}>
 <div className={s.top}><span>{done?t('Izazov završen','Изазов завршен'):t('Pokušaj','Покушај')+' '+(session.state.guesses.length+1)+' / 6'}</span>{session.practice&&<span className={s.chip}>{t('PROBA','ПРОБА')}</span>}<button className={`${s.hint} ${locked?s.locked:''}`} onClick={useHint}><span aria-hidden="true">✧ </span>{hintTitle}<span aria-hidden="true"> ↗︎</span></button></div>
 <div className={s.board}>{Array.from({length:30},(_,cell)=>{const row=Math.floor(cell/5),col=cell%5,g=session.state.guesses[row];const currentRow=row===session.state.guesses.length&&!done;const hinted=currentRow&&session.state.hint?.index===col;const letter=g?.[col]||(currentRow?session.state.input[col]:'');const mark=g?score(g,session.answer)[col]:hinted?'correct':null;
  return <div key={cell} className={[s.tile,currentRow?s.current:'',letter&&!g?s.filled:'',mark?s[mark]:''].join(' ')} aria-label={`${t('Red','Ред')} ${row+1}, ${t('polje','поље')} ${col+1}: ${word(letter)||t('prazno','празно')}${mark?', '+statusLabels[mark]:''}${hinted?', '+t('uz pomoć','уз помоћ'):''}`}>{word(letter)}{hinted&&<small aria-hidden="true">✧</small>}</div>
 })}</div><div className={s.message} role="status" aria-live="polite">{modal?null:notice}</div></div>
 <div className={s.keyboard} aria-label={t('Tastatura na ekranu','Тастатура на екрану')}>{KEY_ROWS.map((letters,row)=><div className={s.keyRow} key={row}>{row===2&&<button disabled={done} className={`${s.key} ${s.wide} ${s.submit}`} aria-label={t('Potvrdi','Потврди')} title={t('Potvrdi','Потврди')} onClick={()=>press('Enter')}>↵</button>}{[...letters].map(c=><button disabled={done} key={c} className={`${s.key} ${keyboardMarks[c]?s[keyboardMarks[c]]:''}`} onClick={()=>press(c)}>{word(c)}</button>)}{row===2&&<button disabled={done} className={`${s.key} ${s.wide}`} aria-label={t('Obriši slovo','Обриши слово')} onClick={()=>press('Backspace')}>⌫</button>}</div>)}</div>
 </section>}
 <Dialog open={modal==='help'} titleId={id+'-help'} onClose={closeModal} closeLabel={t('Zatvori','Затвори')}>
 <h2 id={id+'-help'}>{helpTitle}</h2><p>{t('Otkrij tajnu reč od pet slova u najviše šest pokušaja. Unesi reč i pritisni POTVRDI.','Откриј тајну реч од пет слова у највише шест покушаја. Унеси реч и притисни ПОТВРДИ.')}</p>
 <div className={s.examples}>{(['correct','present','absent'] as Mark[]).map((mark,i)=><div key={mark} className={s.example}><span className={`${s.sample} ${s[mark]}`}>{word(['Т','А','Ј'][i])}</span><p><strong>{[t('Na pravom mestu','На правом месту'),t('Potraži drugo mesto','Потражи друго место'),t('Nema ga više u reči','Нема га више у речи')][i]}</strong>{[t('Slovo je tačno i nalazi se gde treba.','Слово је тачно и налази се где треба.'),t('Slovo postoji, ali se nalazi na drugom mestu.','Слово постоји, али се налази на другом месту.'),t('Slovo nije sadržano u reči ili je uneto više puta nego što tajna reč sadrži.','Слово није садржано у речи или је унето више пута него што тајна реч садржи.')][i]}</p></div>)}</div>
 <p>{t('Slova mogu da se ponavljaju. Svaki pokušaj mora biti reč koju igra prepoznaje. Neprihvaćena reč ne troši pokušaj.','Слова могу да се понављају. Сваки покушај мора бити реч коју игра препознаје. Неприхваћена реч не троши покушај.')}</p>
 <div className={s.callout}><strong>✧ {hintTitle}</strong><p>{t('Posle pet neuspelih pokušaja, možeš da zatražiš pomoć: Šapni mi slovo. Novo slovo će biti na pravom mestu, a polje ostaje popunjeno u poslednjem pokušaju.','После пет неуспелих покушаја, можеш да затражиш помоћ: Шапни ми слово. Ново слово ће бити на правом месту, а поље остаје попуњено у последњем покушају.')}</p></div>
 <p>{t('Svi igraju istu tajnu reč. Nova stiže u ponoć po vremenu u Srbiji. Napredak se čuva na ovom uređaju.','Сви играју исту тајну реч. Нова стиже у поноћ по времену у Србији. Напредак се чува на овом уређају.')}</p>
 {script==='lat'&&<p>LJ, NJ i DŽ računaju se kao jedno slovo i zauzimaju jedno polje. Za njihov unos koristi posebne tastere na ekranu.</p>}
 {clockWarning&&<p role="status">{t('Veza sa serverom vremena nije dostupna. Koristi se poslednje usklađeno vreme ili sat uređaja.','Веза са сервером времена није доступна. Користи се последње усклађено време или сат уређаја.')}</p>}
 {storageWarning&&<p role="status">{t('Pregledač ne dozvoljava čuvanje napretka.','Прегледач не дозвољава чување напретка.')}</p>}
 {practiceButtons}{done&&<button className={s.secondary} onClick={()=>setModal('result')}>{t('Rezultat','Резултат')}</button>}<button className={s.primary} onClick={closeModal}>{t('Otkrij tajnu reč!','Откриј тајну реч!')}</button>
 </Dialog>
 <Dialog open={modal==='hint'} titleId={id+'-hint'} onClose={closeModal} closeLabel={t('Zatvori','Затвори')}><h2 id={id+'-hint'}>{hintTitle}</h2><p>{hintText}</p><button className={s.primary} onClick={closeModal}>{t('U redu','У реду')}</button></Dialog>
 <Dialog open={modal==='result'} titleId={id+'-result'} onClose={closeModal} closeLabel={t('Zatvori','Затвори')}>
 <div className={s.result}><span className={s.spark} aria-hidden="true">✦</span><h2 id={id+'-result'}>{won?(session?.state.hint?t('Tajna otkrivena — uz pomoć!','Тајна откривена — уз помоћ!'):t('Tajna je otkrivena!','Тајна је откривена!')):t('Ovog puta je ostala tajna.','Овог пута је остала тајна.')}</h2>
 <p>{won?t('Broj pokušaja: ','Број покушаја: ')+session?.state.guesses.length+'/6 · ':t('Tražena reč je: ','Тражена реч је: ')}{word(session?.answer||'')}{!won&&session?.state.hint?t(' · Uz pomoć',' · Уз помоћ'):''}</p>
 <p className={s.tomorrow}>{session?.practice?t('Probna partija · možeš odmah da otkriješ novu reč.','Пробна партија · можеш одмах да откријеш нову реч.'):t('Nova tajna reč sutra.','Нова тајна реч сутра.')}</p>
 <button className={s.primary} onClick={()=>void share()}>{t('Podeli rezultat ↗︎','Подели резултат ↗︎')}</button><p role="status" aria-live="polite">{notice}</p>{copyText&&<textarea ref={copyRef} className={s.copy} readOnly value={copyText} aria-label={t('Rezultat za kopiranje','Резултат за копирање')}/>}{practiceButtons}</div>
 </Dialog>
 </div>;
}
