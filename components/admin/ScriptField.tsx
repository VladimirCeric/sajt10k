'use client';
import {useRef,useState} from 'react';
import {latToCyr,cyrToLat} from '@/lib/translit';
/** Polje za unos na jednom pismu, sa pregledom drugog pisma i dugmetom "Ostavi latinicom". */
export default function ScriptField({name,label,defaultValue='',rows=1,maxLength=320,required=false,noKeep=false,noPreview=false,format=false}:{name:string;label:string;defaultValue?:string;rows?:number;maxLength?:number;required?:boolean;noKeep?:boolean;noPreview?:boolean;format?:boolean}){
 const [v,setV]=useState(defaultValue);const ref=useRef<HTMLTextAreaElement&HTMLInputElement>(null);
 const cyr=/[Ѐ-ӿ]/.test(v);const preview=v?(cyr?cyrToLat(v):latToCyr(v)):'';
 function keepLatin(){const el=ref.current;if(!el)return;const a=el.selectionStart??0,b=el.selectionEnd??0;if(a===b)return;
  const next=v.slice(0,a)+'{{lat:'+v.slice(a,b)+'}}'+v.slice(b);setV(next)}
 function wrap(mark:string){const el=ref.current;if(!el)return;const a=el.selectionStart??0,b=el.selectionEnd??0;if(a===b)return;setV(v.slice(0,a)+mark+v.slice(a,b)+mark+v.slice(b))}
 function heading(){const el=ref.current;if(!el)return;const a=el.selectionStart??0;const ls=v.lastIndexOf('\n',a-1)+1;if(v.slice(ls,ls+2)==='##')return;setV(v.slice(0,ls)+'## '+v.slice(ls))}
 const common={ref:ref as never,name,value:v,maxLength:maxLength+40,required,onChange:(e:React.ChangeEvent<HTMLTextAreaElement|HTMLInputElement>)=>setV(e.target.value)};
 return <div className="field"><label>{label}</label>
  {rows>1?<textarea {...common} rows={rows}/>:<input {...common}/>}
  <div className="flex gap-3 items-start mt-1 flex-wrap">
   {!cyr&&!noKeep&&<button type="button" className="pill text-xs" onClick={keepLatin} title="Obeleži reč ili ime u polju, pa klikni: ostaće latinicom i u ćirilici">Ostavi označeno latinicom</button>}
   {format&&<><button type="button" className="pill text-xs" onClick={()=>wrap('**')} title="Označi reči, pa klikni"><b>B</b> Podebljano</button><button type="button" className="pill text-xs" onClick={()=>wrap('*')} title="Označi reči, pa klikni"><i>I</i> Kurziv</button><button type="button" className="pill text-xs" onClick={heading} title="Stani u red, pa klikni">Podnaslov</button></>}
   {preview&&!noPreview&&<span className="muted text-sm" style={{flex:1,minWidth:200}}><b>{cyr?'Latinica':'Ćirilica'}:</b> {preview}</span>}
  </div></div>
}
