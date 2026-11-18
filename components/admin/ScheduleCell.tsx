'use client';
import {useState} from 'react';
type Opt={id:string;name:string;icon:string};
/** Ćelija tabele programa: prikazuje ceo naziv emisije (bez sečenja); prozirni izbor je preko cele ćelije. */
export default function ScheduleCell({selectName,rerunName,options,value,rerun}:{selectName:string;rerunName:string;options:Opt[];value:string;rerun:boolean}){
 const [v,setV]=useState(value);const cur=options.find(o=>o.id===v);
 return <div>
  <div style={{position:'relative',border:'1px solid rgba(255,255,255,.2)',borderRadius:10,padding:'8px 11px',minHeight:52,background:cur?'#141831':'transparent',display:'flex',alignItems:'center',gap:10}}>
   <span aria-hidden="true" style={{fontSize:17}}>{cur?.icon??''}</span>
   <span style={{fontWeight:600,fontSize:13,lineHeight:1.25,color:cur?'#fff':'#7d84a3'}}>{cur?.name??'— nema —'}</span>
   <select name={selectName} value={v} onChange={e=>setV(e.target.value)} aria-label="Emisija" style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:0,cursor:'pointer'}}>
    <option value="">— nema —</option>{options.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select>
  </div>
  <label className="text-sm" style={{display:'block',marginTop:4}}><input className="!w-auto mr-1" type="checkbox" name={rerunName} defaultChecked={rerun}/>Repriza</label>
 </div>
}
