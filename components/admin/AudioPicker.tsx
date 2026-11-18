'use client';
import {useRef,useState} from 'react';
const fmt=(s:number)=>{const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),x=Math.floor(s%60);return (h?`${h}:${String(m).padStart(2,'0')}`:`${m}`)+`:${String(x).padStart(2,'0')}`};
/** Izbor audio snimka (MP3, M4A, OGG, WAV do 150 MB). Dužina se izračuna u pregledaču i šalje uz formu. */
export default function AudioPicker({label='Snimak (audio fajl)',current,duration}:{label?:string;current?:string|null;duration?:number|null}){
 const input=useRef<HTMLInputElement>(null);
 const [name,setName]=useState(''),[dur,setDur]=useState<number|null>(duration??null),[err,setErr]=useState('');
 function onPick(e:React.ChangeEvent<HTMLInputElement>){
  const f=e.target.files?.[0];setErr('');if(!f)return;
  const ext=f.name.split('.').pop()?.toLowerCase()??'';
  if(!['mp3','m4a','ogg','wav'].includes(ext)){setErr('Snimak mora biti MP3, M4A, OGG ili WAV.');e.target.value='';return}
  if(f.size>150*1024*1024){setErr('Snimak je prevelik (najviše 150 MB). Izvezi ga kao MP3.');e.target.value='';return}
  setName(`${f.name} · ${(f.size/1024/1024).toFixed(1)} MB`);setDur(null);
  const a=new Audio(),u=URL.createObjectURL(f);a.preload='metadata';a.src=u;
  a.onloadedmetadata=()=>{if(isFinite(a.duration))setDur(Math.round(a.duration));URL.revokeObjectURL(u)};a.onerror=()=>URL.revokeObjectURL(u);
 }
 return <div className="field"><label>{label}</label>
  <input ref={input} type="file" name="audioFile" accept=".mp3,.m4a,.ogg,.wav,audio/*" onChange={onPick} style={{display:'none'}}/>
  <input type="hidden" name="audioUrl" value={current??''}/><input type="hidden" name="durationSec" value={dur??''}/>
  <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
   <button type="button" className="btn" onClick={()=>input.current?.click()}>{current||name?'Zameni snimak':'Izaberi snimak'}</button>
   <span className="muted text-sm">{name||(current?`Snimak je otpremljen${dur?` · ${fmt(dur)}`:''}`:'Nijedan snimak nije izabran')}{name&&dur?` · ${fmt(dur)}`:''}</span>
  </div>
  {current&&!name&&<audio controls preload="none" src={current} style={{marginTop:10,width:'100%',maxWidth:420}}/>}
  {err&&<p style={{color:'#fca5a5',fontSize:13,margin:'6px 0 0'}} role="alert">{err}</p>}
 </div>}
