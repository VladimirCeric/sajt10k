'use client';
import {useEffect,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import {Pause,Volume2,VolumeX} from 'lucide-react';
type NowPlaying={track:{artist:string;title:string;artwork:string|null;listeners:number|null}|null;current:{title:string;icon:string;image:string|null}|null;next:{title:string}|null;icecastOnline:boolean;fallbackArtwork:string};
const normalized=(v:string)=>v.normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const httpsUrl=(value:string|null|undefined)=>value?.startsWith('https://')?value:null;
/** Naslov pesme: ako ne staje u polje, polako klizi napred-nazad; inače stoji. */
function Marq({text}:{text:string}){
 const o=useRef<HTMLSpanElement>(null),i=useRef<HTMLSpanElement>(null),[d,setD]=useState(0);
 useEffect(()=>{const m=()=>{const a=o.current,b=i.current;if(!a||!b)return;const x=Math.ceil(b.scrollWidth-a.clientWidth);setD(x>4?x+16:0)};m();const r=new ResizeObserver(m);if(o.current)r.observe(o.current);return()=>r.disconnect()},[text]);
 return <span ref={o} className="pl-title"><span ref={i} className="pl-mq" style={d?{['--d' as string]:d+'px',animationDuration:(d/32+6)+'s'} as React.CSSProperties:{animation:'none'}}>{text}</span></span>;
}
export default function Player({src,label,empty}:{src:string;label:string;empty:string}){
 const pathname=usePathname();
 const audio=useRef<HTMLAudioElement>(null);
 const [playing,setPlaying]=useState(false),[volume,setVolume]=useState(0.75),[error,setError]=useState('');
 const lastVol=useRef(0.75);const [muted,setMuted]=useState(false);
 const lastLoggedTitle=useRef('');
 const artworkLookupId=useRef(0);
 function toggleMute(){setMuted(m=>!m)}
 const [now,setNow]=useState<NowPlaying|null>(null),[imageError,setImageError]=useState(false),[clientArtwork,setClientArtwork]=useState<string|null>(null);
 useEffect(()=>{if(audio.current)audio.current.volume=volume},[volume]);
 useEffect(()=>{if(audio.current)audio.current.muted=muted},[muted]);
 // Podkast i radio ne sviraju istovremeno.
 useEffect(()=>{const f=()=>audio.current?.pause();window.addEventListener('r10k-podcast',f);return()=>window.removeEventListener('r10k-podcast',f)},[]);
 useEffect(()=>{setImageError(false);setClientArtwork(null)},[now?.track?.artist,now?.track?.title,now?.track?.artwork]);
 useEffect(()=>{
  let active=true;
  const load=async()=>{
   try{
    const response=await fetch('/api/now-playing?locale=sr-latn',{cache:'no-store'});
    if(response.ok){const data=await response.json() as NowPlaying;if(active)setNow(data);}
   }catch{/* Retain last displayed metadata */}
  };
  void load();const timer=setInterval(()=>void load(),30000);
  const visibility=()=>{if(document.visibilityState==='visible')void load()};
  document.addEventListener('visibilitychange',visibility);
  return()=>{active=false;clearInterval(timer);document.removeEventListener('visibilitychange',visibility)};
 },[]);
 useEffect(()=>{
  const title=now?.track?.title||now?.current?.title||'';
  if(!title||title===lastLoggedTitle.current)return;
  lastLoggedTitle.current=title;
  console.info('[player] now playing',{title,artist:now?.track?.artist||null,artwork:now?.track?.artwork||null,programImage:now?.current?.image||null,fallback:now?.fallbackArtwork||'/logo-radio-10k-player.jpg'});
 },[now?.track?.title,now?.track?.artist,now?.track?.artwork,now?.current?.title,now?.current?.image,now?.fallbackArtwork]);
 useEffect(()=>{
  const artist=now?.track?.artist?.trim()||'';
  const title=now?.track?.title?.trim()||'';
  if(!artist||!title||now?.track?.artwork)return;
  const id=++artworkLookupId.current;
  const endpoint='https://itunes.apple.com/search?'+new URLSearchParams({term:`${artist} ${title}`,entity:'song',limit:'8'});
  const run=async()=>{
   try{
    const response=await fetch(endpoint,{cache:'no-store'});
    if(!response.ok||id!==artworkLookupId.current)return;
    const data=await response.json() as {results?:Array<{artistName?:string;trackName?:string;artworkUrl100?:string}>};
    const match=data.results?.find(item=>normalized(item.artistName??'')===normalized(artist)&&normalized(item.trackName??'')===normalized(title));
    const loose=match??data.results?.find(item=>{const a=normalized(item.artistName??'');const t=normalized(item.trackName??'');const ta=normalized(artist);const tt=normalized(title);return (a===ta||a.includes(ta)||ta.includes(a))&&(t===tt||t.includes(tt)||tt.includes(t));});
    const pick=loose??data.results?.[0];
    const artwork=httpsUrl(pick?.artworkUrl100?.replace(/\/100x100(bb)?\./,'/600x600bb.'));
    if(id!==artworkLookupId.current)return;
    setClientArtwork(artwork||null);
   }catch{/* Keep fallback artwork if iTunes lookup fails in browser */}
  };
  void run();
 },[now?.track?.artist,now?.track?.title,now?.track?.artwork]);
 async function toggle(){
  if(!audio.current)return;
  if(!audio.current.paused){audio.current.pause();return}
  if(!src){setError(empty);return}
  try{setError('');await audio.current.play()}catch{setError('Stream nije dostupan. Proveri HTTPS URL i format.')}
 }
 if(pathname?.startsWith('/admin'))return null;
 const track=now?.track;
 const fallback=now?.fallbackArtwork||'/logo-radio-10k-player.jpg';
 const cover=imageError?fallback:(track?.artwork||clientArtwork||now?.current?.image||fallback);
 return <div className="pl">
  <audio ref={audio} src={src||undefined} preload="none" onError={()=>{setPlaying(false);setError('Problem sa audio streamom')}} onPause={()=>setPlaying(false)} onPlaying={()=>{setPlaying(true);window.dispatchEvent(new Event('r10k-radio'))}}/>
  <div className="pl-in">
   <div className={'pl-eqbg'+(playing?' on':'')} aria-hidden="true">{Array.from({length:150},(_,i)=><i key={i}/>)}</div>
<button aria-label={playing?'Pauziraj radio':'Pusti radio'} onClick={toggle} className="pl-play">{playing?<Pause size={24} fill="currentColor"/>:<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4l13 8-13 8z"/></svg>}</button>
   <div className="pl-info">
    <img src={cover} alt="" className="pl-cover" onError={e=>{console.warn('[player] artwork load failed',{failedSrc:e.currentTarget.src,title:track?.title||now?.current?.title||null,artist:track?.artist||null});if(e.currentTarget.src.endsWith('/logo-radio-10k-player.jpg'))return;setImageError(true)}}/>
    <div className="pl-txt">
     <span className="pl-live" data-on={playing}><span className="a"><b>10k</b></span><span className="b">● UŽIVO</span></span>
     <Marq text={track?.title||now?.current?.title||label}/>
     {(track?.artist||(track?.title&&now?.current))&&<span className="pl-sub">{track?.artist}{track?.artist&&now?.current?' · ':''}{now?.current?`U programu: ${now.current.title}`:''}</span>}
     {error&&<p className="pl-err">{error}</p>}
    </div>
   </div>
   <div className="pl-vol"><button type="button" className="pl-mute" onClick={toggleMute} aria-pressed={muted||volume===0} aria-label={muted||volume===0?'Uključi zvuk':'Isključi zvuk'} title={muted||volume===0?'Uključi zvuk':'Isključi zvuk'}>{muted||volume===0?<VolumeX size={20}/>:<Volume2 size={20}/>}</button><input aria-label="Jačina zvuka" type="range" min="0" max="1" step="0.01" value={volume} onChange={e=>{setVolume(+e.target.value);if(+e.target.value>0)setMuted(false)}}/></div>
  </div>
 </div>;
}
