'use client';
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { keyToDir, maxTile, move, newGame, restore, serialize, stripTransient, type Dir, type GameState } from '@/lib/igra-2048/engine.mjs';
import Dialog from './Dialog';
import s from './Igra2048.module.css';

export type Igra2048Props = {
 /** Change only to intentionally isolate stored progress. */
 storagePrefix?: string;
 /** Jezik stranice sajta (npr. "sr-cyrl", "sr-latn", "en"). Kada je zadat, igra prati pismo sajta, skriva svoj izbor Ћир/Lat i ne pamti ga; "sr-cyrl" daje ćirilicu, sve ostalo latinicu. */
 locale?: string;
 /** Radio 10K: kada je false, uputstvo se ne otvara samo pri prvom dolasku (dugme ? ostaje). */
 autoHelp?: boolean;
 /** Fixed canonical URL for sharing, if the game is embedded on several pages. */
 shareUrl?: string;
};
type Script='cyr'|'lat';
type Modal='help'|'win'|'over'|'new'|null;
const safeRead=(key:string)=>{try{return localStorage.getItem(key)}catch{return null}};
const safeWrite=(key:string,value:string)=>{try{localStorage.setItem(key,value);return true}catch{return false}};
const rnd=()=>{const r=new Uint32Array(1);crypto.getRandomValues(r);return r[0]/4294967296};
const fmt=(n:number)=>String(n).replace(/\B(?=(\d{3})+(?!\d))/g,'.');
const faceClass=(v:number)=>v>2048?'vbig':'v'+v;
const SWIPE=24;

export default function Igra2048({storagePrefix='igra2048-v1',shareUrl,locale,autoHelp=true}:Igra2048Props){
 const forced:Script|null=locale==null?null:/cyr/i.test(locale)?'cyr':'lat';
 const id=useId();const root=useRef<HTMLDivElement>(null);const copyRef=useRef<HTMLTextAreaElement>(null);
 const [script,setScript]=useState<Script>(forced??'cyr');const [game,setGame]=useState<GameState|null>(null);const [best,setBest]=useState(0);
 useEffect(()=>{if(forced)setScript(forced)},[forced]);
 const gameRef=useRef<GameState|null>(null);const bestRef=useRef(0);const prev=useRef<GameState|null>(null);const [canUndo,setCanUndo]=useState(false);
 const [modal,setModal]=useState<Modal>(null);const [notice,setNotice]=useState('');const [copyText,setCopyText]=useState('');const [storageWarning,setStorageWarning]=useState(false);
 const touch=useRef<{x:number;y:number;id:number}|null>(null);const timer=useRef<ReturnType<typeof setTimeout>>(undefined);
 const t=(lat:string,cyr:string)=>script==='lat'?lat:cyr;
 const helpTitle=t('Kako se igra 2048?','Како се игра 2048?');

 const commit=useCallback((next:GameState)=>{
  gameRef.current=next;setGame(next);
  if(!safeWrite(storagePrefix+'-state',serialize(next)))setStorageWarning(true);
  if(next.score>bestRef.current){bestRef.current=next.score;setBest(next.score);safeWrite(storagePrefix+'-best',String(next.score))}
 },[storagePrefix]);
 const later=useCallback((m:Modal)=>{clearTimeout(timer.current);timer.current=setTimeout(()=>setModal(m),450)},[]);

 useEffect(()=>{
  setScript(forced??(safeRead(storagePrefix+'-script')==='lat'?'lat':'cyr'));
  const b=Number(safeRead(storagePrefix+'-best'));bestRef.current=Number.isInteger(b)&&b>0?b:0;setBest(bestRef.current);
  const saved=restore(safeRead(storagePrefix+'-state'));const g=saved??newGame(rnd);
  if(!saved)safeWrite(storagePrefix+'-state',serialize(g));
  gameRef.current=g;setGame(g);
  if(g.score>bestRef.current){bestRef.current=g.score;setBest(g.score)}
  setModal(autoHelp&&!safeRead(storagePrefix+'-intro')?'help':g.over?'over':g.won&&!g.keepGoing?'win':null);
  return()=>clearTimeout(timer.current);
 },[storagePrefix]);
 useEffect(()=>{if(!notice)return;const x=setTimeout(()=>setNotice(''),4500);return()=>clearTimeout(x)},[notice]);
 useEffect(()=>{if(copyText)copyRef.current?.select()},[copyText]);

 function act(dir:Dir){
  const g=gameRef.current;if(!g||modal||g.over||(g.won&&!g.keepGoing))return;
  const r=move(g,dir,rnd);if(!r.moved)return;
  prev.current=stripTransient(g);setCanUndo(true);setNotice('');commit(r.state);
  if(r.state.over)later('over');else if(r.state.won&&!g.won)later('win');
 }
 function undo(){
  const p=prev.current;if(!p)return;prev.current=null;setCanUndo(false);clearTimeout(timer.current);commit(p);setModal(null);setNotice('');root.current?.focus({preventScroll:true});
 }
 function startNew(){clearTimeout(timer.current);prev.current=null;setCanUndo(false);commit(newGame(rnd));setModal(null);setNotice('');setCopyText('');root.current?.focus({preventScroll:true})}
 function askNew(){const g=gameRef.current;if(g&&g.score>0&&!g.over)setModal('new');else startNew()}
 function keepGoing(){const g=gameRef.current;if(g)commit({...g,keepGoing:true});setModal(null);root.current?.focus({preventScroll:true})}
 function closeModal(){
  if(modal==='help')safeWrite(storagePrefix+'-intro','1');
  if(modal==='win'){keepGoing();return}
  setModal(null);setCopyText('');setNotice('');root.current?.focus({preventScroll:true});
 }
 async function share(){
  const g=gameRef.current;if(!g)return;const url=shareUrl||location.origin+location.pathname;
  const text='2048 · '+t('rezultat ','резултат ')+fmt(g.score)+' · '+t('najveća pločica ','највећа плочица ')+fmt(maxTile(g.tiles))+'\n\n'+url;
  try{await navigator.clipboard.writeText(text);setNotice(t('Rezultat je kopiran!','Резултат је копиран!'))}catch{setCopyText(text);setNotice(t('Kopiraj označeni rezultat.','Копирај означени резултат.'))}
 }
 function down(e:PointerEvent<HTMLDivElement>){root.current?.focus({preventScroll:true});touch.current={x:e.clientX,y:e.clientY,id:e.pointerId};try{e.currentTarget.setPointerCapture(e.pointerId)}catch{}}
 function up(e:PointerEvent<HTMLDivElement>){
  const st=touch.current;touch.current=null;if(!st||st.id!==e.pointerId)return;
  const dx=e.clientX-st.x,dy=e.clientY-st.y;if(Math.max(Math.abs(dx),Math.abs(dy))<SWIPE)return;
  act(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'));
 }

 const items=game?[...game.ghosts.map(g=>({...g,ghost:true,born:false,merged:false})),...game.tiles.map(x=>({...x,ghost:false}))].sort((a,b)=>a.id-b.id):[];
 const top=game?maxTile(game.tiles):0;
 const pad:[Dir,string,string,string][]=[['up','▲',t('Gore','Горе'),s.up],['left','◀︎',t('Levo','Лево'),s.left],['down','▼',t('Dole','Доле'),s.down],['right','▶︎',t('Desno','Десно'),s.right]];
 return <div ref={root} className={s.root} lang={script==='cyr'?'sr-Cyrl':'sr-Latn'} tabIndex={-1} onKeyDown={e=>{
  if(e.ctrlKey||e.metaKey||e.altKey||modal)return;const target=e.target as HTMLElement;
  if(['INPUT','TEXTAREA','SELECT'].includes(target.tagName)||target.isContentEditable)return;
  const dir=keyToDir(e.key,e.code);if(dir){e.preventDefault();act(dir)}
 }}>
 <header className={s.header}><div className={s.title}><span className={s.brand}>2048 <em>{t('igra','игра')}</em></span></div>
 <div className={s.tools}>{!forced&&<div className={s.language} aria-label={t('Pismo','Писмо')}>{(['cyr','lat'] as Script[]).map(x=><button key={x} aria-pressed={script===x} className={script===x?s.active:''} onClick={()=>{setScript(x);safeWrite(storagePrefix+'-script',x);setNotice('')}}>{x==='cyr'?'Ћир':'Lat'}</button>)}</div>}<button className={s.help} aria-label={helpTitle} onClick={()=>setModal('help')}>?</button></div></header>
 {!game?<p className={s.loading} role="status">{t('Učitavanje igre…','Учитавање игре…')}</p>:<section className={s.game} aria-label={t('Tabla za igru 2048','Табла за игру 2048')}>
 <div className={s.top}><div className={s.stats}><div className={s.stat}><span>{t('Rezultat','Резултат')}</span><strong>{fmt(game.score)}</strong></div><div className={s.stat}><span>{t('Najbolji','Најбољи')}</span><strong>{fmt(best)}</strong></div></div>
 <div className={s.buttons}><button className={`${s.pill} ${canUndo?'':s.locked}`} disabled={!canUndo} onClick={undo}><span aria-hidden="true">↶ </span>{t('Vrati potez','Врати потез')}</button><button className={s.pill} onClick={askNew}><span aria-hidden="true">✧ </span>{t('Nova igra','Нова игра')}</button></div></div>
 <div className={s.board} role="group" aria-label={t('Tabla. Pomeraj pločice strelicama ili prevlačenjem.','Табла. Помери плочице стрелицама или превлачењем.')} onPointerDown={down} onPointerUp={up} onPointerCancel={()=>{touch.current=null}}>
  <div className={s.field}><div className={s.cells} aria-hidden="true">{Array.from({length:16},(_,i)=><div key={i} className={s.cell}/>)}</div>
  {items.map(x=><div key={x.id} aria-hidden={x.ghost||undefined} role={x.ghost?undefined:'img'} aria-label={x.ghost?undefined:`${x.v}, ${t('red','ред')} ${x.r+1}, ${t('kolona','колона')} ${x.c+1}`} className={[s.tile,x.ghost?s.ghost:'',x.born?s.born:'',x.merged?s.merged:''].join(' ')} style={{'--r':x.r,'--c':x.c} as CSSProperties}><div className={`${s.face} ${s[faceClass(x.v)]} ${s['len'+Math.min(String(x.v).length,6)]}`}>{x.v}</div></div>)}</div>
 </div>
 <div className={s.message} role="status" aria-live="polite">{modal?null:notice||(game.over?t('Nema više poteza.','Нема више потеза.'):'')}<span style={{position:'absolute',width:1,height:1,overflow:'hidden',clip:'rect(0 0 0 0)'}}>{t('Rezultat ','Резултат ')}{game.score}, {t('najveća pločica ','највећа плочица ')}{top}</span></div>
 <div className={s.pad} aria-label={t('Tasteri za pomeranje','Тастери за померање')}>{pad.map(([dir,sym,label,cls])=><button key={dir} className={`${s.padKey} ${cls}`} aria-label={label} onClick={()=>act(dir)}>{sym}</button>)}</div>
 </section>}
 <Dialog open={modal==='help'} titleId={id+'-help'} onClose={closeModal} closeLabel={t('Zatvori','Затвори')}>
 <h2 id={id+'-help'}>{helpTitle}</h2><p>{t('Spajaj pločice sa istim brojem i stigni do pločice 2048. Pomeraj ih strelicama ili tasterima W A S D, prevlačenjem prsta po tabli ili tasterima ispod table.','Спајај плочице са истим бројем и стигни до плочице 2048. Помери их стрелицама или тастерима W A S D, превлачењем прста по табли или тастерима испод табле.')}</p>
 <div className={s.examples}>
  <div className={s.example}><span className={s.samples}><span className={`${s.sample} ${s.v2}`}>2</span><span className={`${s.sample} ${s.v2}`}>2</span><span className={s.arrow} aria-hidden="true">→</span></span><p><strong>{t('Isti brojevi se spajaju','Исти бројеви се спајају')}</strong>{t('Dve pločice sa istim brojem postaju jedna, a zbir ulazi u rezultat.','Две плочице са истим бројем постају једна, а збир улази у резултат.')}</p></div>
  <div className={s.example}><span className={s.samples}><span className={`${s.sample} ${s.v4}`}>4</span><span className={s.arrow} aria-hidden="true">+</span><span className={`${s.sample} ${s.v2}`}>2</span></span><p><strong>{t('Posle svakog poteza','После сваког потеза')}</strong>{t('Na slobodno polje stiže nova pločica, 2 ili 4.','На слободно поље стиже нова плочица, 2 или 4.')}</p></div>
 </div>
 <p>{t('Igra se završava kada nema praznih polja ni mogućih spajanja. Kada stigneš do 2048, možeš da nastaviš i za veći rezultat.','Игра се завршава када нема празних поља ни могућих спајања. Када стигнеш до 2048, можеш да наставиш и за већи резултат.')}</p>
 <div className={s.callout}><strong>↶ {t('Vrati potez','Врати потез')}</strong><p>{t('Poslednji potez možeš da poništiš jednom. Najbolji rezultat i napredak čuvaju se na ovom uređaju.','Последњи потез можеш да поништиш једном. Најбољи резултат и напредак чувају се на овом уређају.')}</p></div>
 {storageWarning&&<p role="status">{t('Pregledač ne dozvoljava čuvanje napretka.','Прегледач не дозвољава чување напретка.')}</p>}
 <button className={s.primary} onClick={closeModal}>{t('Igraj!','Играј!')}</button>
 </Dialog>
 <Dialog open={modal==='new'} titleId={id+'-new'} onClose={closeModal} closeLabel={t('Zatvori','Затвори')}><h2 id={id+'-new'}>{t('Nova igra?','Нова игра?')}</h2><p>{t('Trenutna partija i njen rezultat biće izgubljeni. Najbolji rezultat se čuva.','Тренутна партија и њен резултат биће изгубљени. Најбољи резултат се чува.')}</p><button className={s.primary} onClick={startNew}>{t('Počni novu igru','Почни нову игру')}</button><button className={s.textButton} onClick={closeModal}>{t('Odustani','Одустани')}</button></Dialog>
 <Dialog open={modal==='win'} titleId={id+'-win'} onClose={closeModal} closeLabel={t('Zatvori','Затвори')}><div className={s.result}><span className={s.spark} aria-hidden="true">✦</span><h2 id={id+'-win'}>{t('Stigao si do 2048!','Стигао си до 2048!')}</h2><p>{t('Rezultat: ','Резултат: ')}{game?fmt(game.score):''}. {t('Možeš da nastaviš i pokušaš još veću pločicu.','Можеш да наставиш и покушаш још већу плочицу.')}</p>
 <button className={s.primary} onClick={keepGoing}>{t('Nastavi igru','Настави игру')}</button><button className={s.primary} onClick={()=>void share()}>{t('Podeli rezultat ↗︎','Подели резултат ↗︎')}</button><p role="status" aria-live="polite">{notice}</p>{copyText&&<textarea ref={copyRef} className={s.copy} readOnly value={copyText} aria-label={t('Rezultat za kopiranje','Резултат за копирање')}/>}<div className={s.actions}><button className={s.secondary} onClick={startNew}>{t('Nova igra','Нова игра')}</button></div></div></Dialog>
 <Dialog open={modal==='over'} titleId={id+'-over'} onClose={closeModal} closeLabel={t('Zatvori','Затвори')}><div className={s.result}><span className={s.spark} aria-hidden="true">✦</span><h2 id={id+'-over'}>{t('Nema više poteza','Нема више потеза')}</h2><p>{t('Rezultat: ','Резултат: ')}{game?fmt(game.score):''} · {t('Najveća pločica: ','Највећа плочица: ')}{fmt(top)}</p>
 <button className={s.primary} onClick={startNew}>{t('Nova igra','Нова игра')}</button><button className={s.primary} onClick={()=>void share()}>{t('Podeli rezultat ↗︎','Подели резултат ↗︎')}</button><p role="status" aria-live="polite">{notice}</p>{copyText&&<textarea ref={copyRef} className={s.copy} readOnly value={copyText} aria-label={t('Rezultat za kopiranje','Резултат за копирање')}/>}{canUndo&&<div className={s.actions}><button className={s.secondary} onClick={undo}>{t('Vrati potez','Врати потез')}</button></div>}</div></Dialog>
 </div>;
}
