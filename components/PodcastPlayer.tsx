'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {PodUi} from '@/lib/podcast-ui';
export type PodEp={id:string;showId:string;show:string;title:string;desc:string;img:string|null;icon:string;date:string;no:number|null;dur:number|null;src:string};
const fmt=(s:number)=>{if(!isFinite(s)||s<0)s=0;const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),x=Math.floor(s%60);return (h?`${h}:${String(m).padStart(2,'0')}`:`${m}`)+`:${String(x).padStart(2,'0')}`};
const RATES=[1,1.25,1.5,2,0.75];
const PlayI=()=><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4l13 8-13 8z"/></svg>;
const PauseI=()=><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>;

/** Podkast: plejer na vrhu (izabrana epizoda) i spisak epizoda ispod; klik na epizodu je odmah pušta. */
export default function PodcastPlayer({eps,shows,ui,initial}:{eps:PodEp[];shows:{id:string;name:string}[];ui:PodUi;initial?:string}){
 const [filter,setFilter]=useState('');
 const list=useMemo(()=>filter?eps.filter(e=>e.showId===filter):eps,[eps,filter]);
 const [curId,setCurId]=useState(initial&&eps.some(e=>e.id===initial)?initial:eps[0]?.id);
 const cur=eps.find(e=>e.id===curId)??eps[0];
 const audio=useRef<HTMLAudioElement>(null),pending=useRef(false);
 const [playing,setPlaying]=useState(false),[t,setT]=useState(0),[d,setD]=useState(cur?.dur??0),[rate,setRate]=useState(1),[err,setErr]=useState(false);

 // Nova epizoda: učitaj; ako je kliknuta, odmah pusti.
 useEffect(()=>{const a=audio.current;if(!a||!cur)return;a.load();a.defaultPlaybackRate=rate;a.playbackRate=rate;setT(0);setD(cur.dur??0);setErr(false);
  if(pending.current){pending.current=false;a.play().catch(()=>setErr(true))}
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[curId]);
 useEffect(()=>{const a=audio.current;if(a){a.defaultPlaybackRate=rate;a.playbackRate=rate}},[rate]);
 // Radio i podkast ne sviraju istovremeno.
 useEffect(()=>{const f=()=>audio.current?.pause();window.addEventListener('r10k-radio',f);return()=>window.removeEventListener('r10k-radio',f)},[]);
 // Kontrole na zaključanom ekranu telefona.
 useEffect(()=>{if(!cur||!('mediaSession' in navigator))return;try{
  navigator.mediaSession.metadata=new MediaMetadata({title:cur.title,artist:cur.show,album:'Radio 10K',artwork:cur.img?[{src:location.origin+cur.img}]:[]});
  navigator.mediaSession.setActionHandler('play',()=>void audio.current?.play());navigator.mediaSession.setActionHandler('pause',()=>audio.current?.pause());
  navigator.mediaSession.setActionHandler('seekbackward',()=>skip(-15));navigator.mediaSession.setActionHandler('seekforward',()=>skip(30));
 }catch{}
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[curId]);

 function skip(s:number){const a=audio.current;if(a)a.currentTime=Math.max(0,Math.min((a.duration||Infinity),a.currentTime+s))}
 function choose(id:string){pending.current=true;setCurId(id);try{history.replaceState(null,'',`?ep=${id}`)}catch{}
  if(id===curId){pending.current=false;void audio.current?.play().catch(()=>setErr(true))}}
 function toggle(){const a=audio.current;if(!a)return;if(a.paused)a.play().catch(()=>setErr(true));else a.pause()}
 if(!cur)return <p style={{color:'#9aa1bd'}}>{ui.empty}</p>;
 const label=[cur.show,cur.no?`${ui.episode} ${cur.no}`:'',cur.date].filter(Boolean).join(' · ');
 return <>
  <audio ref={audio} src={cur.src} preload="metadata"
   onPlay={()=>{setPlaying(true);window.dispatchEvent(new Event('r10k-podcast'))}} onPause={()=>setPlaying(false)}
   onTimeUpdate={e=>setT(e.currentTarget.currentTime)} onLoadedMetadata={e=>{if(isFinite(e.currentTarget.duration))setD(e.currentTarget.duration)}}
   onEnded={()=>{setPlaying(false)}} onError={()=>{setPlaying(false);setErr(true)}}/>
  <section className="s-pod-now" aria-label={cur.title}>
   {cur.img?<img className="s-pod-cover" src={cur.img} alt=""/>:<div className="s-pod-cover s-pod-ph" aria-hidden="true">{cur.icon}</div>}
   <div className="s-pod-body">
    <span className="s-pod-label">{label}</span>
    <h2 className="s-pod-title sf-head">{cur.title}</h2>
    {cur.desc&&<p className="s-pod-desc">{cur.desc}</p>}
    <div className="s-pod-ctl">
     <button type="button" className="s-pod-skip" onClick={()=>skip(-15)} aria-label={ui.back}>−15</button>
     <button type="button" className="s-pod-play" onClick={toggle} aria-label={playing?ui.pause:ui.play}>{playing?<PauseI/>:<PlayI/>}</button>
     <button type="button" className="s-pod-skip" onClick={()=>skip(30)} aria-label={ui.fwd}>+30</button>
     <button type="button" className="s-pod-rate" onClick={()=>setRate(RATES[(RATES.indexOf(rate)+1)%RATES.length])} aria-label={ui.speed}>{String(rate).replace('.',',')}×</button>
    </div>
    <div className="s-pod-bar"><span>{fmt(t)}</span>
     <input type="range" className="s-pod-seek" min={0} max={Math.max(1,Math.floor(d))} step={1} value={Math.min(Math.floor(t),Math.max(1,Math.floor(d)))} aria-label={ui.seek} onChange={e=>{const a=audio.current;if(a)a.currentTime=+e.target.value}}/>
     <span>{fmt(d)}</span></div>
    {err&&<p className="s-pod-err" role="alert">{ui.error}</p>}
   </div>
  </section>

  <section className="s-pod-list-wrap" aria-label={ui.list}>
   <h3 className="sf-head s-pod-h3">{ui.list}</h3>
   {shows.length>1&&<div className="s-pod-chips" role="group">{[{id:'',name:ui.all},...shows].map(s=><button key={s.id} type="button" className={'s-pod-chip'+(filter===s.id?' is-on':'')} aria-pressed={filter===s.id} onClick={()=>setFilter(s.id)}>{s.name}</button>)}</div>}
   <ul className="s-pod-list">{list.map(e=>{const on=e.id===cur.id,pl=on&&playing;
    return <li key={e.id}><button type="button" className={'s-pod-row'+(on?' is-on':'')} onClick={()=>on?toggle():choose(e.id)} aria-current={on||undefined}>
     {e.img?<img src={e.img} alt=""/>:<span className="s-pod-th" aria-hidden="true">{e.icon}</span>}
     <span className="s-pod-rt"><span className="s-pod-rl">{[e.show,e.no?`${ui.episode} ${e.no}`:'',e.date].filter(Boolean).join(' · ')}</span><span className="s-pod-rn">{e.title}</span></span>
     {e.dur?<span className="s-pod-rd">{fmt(e.dur)}</span>:null}
     <span className="s-pod-rp" aria-hidden="true">{pl?<PauseI/>:<PlayI/>}</span></button></li>})}</ul>
  </section>
 </>}
