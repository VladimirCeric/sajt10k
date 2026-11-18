'use client';
import {useState} from 'react';
/** Izmena vremena početka (zaključana dok se ne čekira) i „Nije na programu!“ (roze upozorenje). */
export function TimeChange({defaultValue,custom}:{defaultValue:number;custom:boolean}){
 const [on,setOn]=useState(custom);
 return <div className="field"><label><input className="!w-auto mr-2" type="checkbox" checked={on} onChange={e=>setOn(e.target.checked)}/>Izmeni vreme početka <span className="muted">(upiši samo minut: 0, 15 ili 30)</span></label>
  {on?<input name="slotMinute" type="number" min={0} max={59} defaultValue={defaultValue} placeholder="minut (.00, .15, .30)"/>:<p className="muted text-sm" style={{padding:'10px 2px'}}>Počinje u .{String(defaultValue).padStart(2,'0')}</p>}</div>}
export function SkipToggle({defaultChecked}:{defaultChecked:boolean}){
 const [on,setOn]=useState(defaultChecked);
 return <div className="field"><label>&nbsp;</label><label style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',borderRadius:12,border:'1px solid '+(on?'#ff5fa8':'#2c3254'),background:on?'rgba(255,95,168,.16)':'transparent',color:on?'#ff9ccb':undefined,fontWeight:on?700:400}}>
  <input className="!w-auto" type="checkbox" name="skip" checked={on} onChange={e=>setOn(e.target.checked)}/>Nije na programu!</label></div>}
const TONE:Record<string,{bg:string;bd:string;fg?:string}>={DRAFT:{bg:'#101629',bd:'#313a56'},SCHEDULED:{bg:'rgba(217,164,65,.18)',bd:'#d9a441',fg:'#f0c978'},PUBLISHED:{bg:'rgba(63,174,138,.18)',bd:'#3fae8a',fg:'#7fe0bd'}};
/** Status najave: boja polja pokazuje stanje (nacrt bez boje, zakazano žuto, objavljeno zeleno). */
export function StatusSelect({defaultValue,options}:{defaultValue:string;options:[string,string][]}){
 const [v,setV]=useState(defaultValue);const t=TONE[v]??TONE.DRAFT;
 return <div className="field"><label>Status</label><select name="state" value={v} onChange={e=>setV(e.target.value)} style={{background:t.bg,borderColor:t.bd,color:t.fg??'white',fontSize:'13.3333px',fontFamily:'inherit',padding:11,height:44,boxSizing:'border-box'}}>{options.map(([k,l])=><option key={k} value={k} style={{background:'#101629',color:'white'}}>{l}</option>)}</select></div>}
/** Brisanje u dva koraka: prvi klik samo traži potvrdu, tek drugi briše. */
export function DeleteButton({action,label='Obriši najavu'}:{action:(f:FormData)=>void|Promise<void>;label?:string}){
 const [ask,setAsk]=useState(false);
 if(!ask)return <button type="button" onClick={()=>setAsk(true)} className="muted text-sm" style={{padding:'6px 10px'}}>{label}</button>;
 return <span className="flex items-center gap-3 text-sm"><span style={{color:'#ff9ccb'}}>Sigurno želiš da obrišeš?</span>
  <button formNoValidate formAction={action} style={{padding:'8px 14px',borderRadius:10,background:'rgba(255,95,168,.2)',border:'1px solid #ff5fa8',color:'#ff9ccb',fontWeight:700}}>Da, obriši</button>
  <button type="button" onClick={()=>setAsk(false)} className="muted" style={{padding:'6px 10px'}}>Odustani</button></span>}
