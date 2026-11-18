'use client';
import {useEffect,useRef,useState} from 'react';

export type TodayItem={id:string;minute:string;title:string;icon:string;thumb:string|null;img:string|null;label:string;epTitle:string;text:string;meta:string};
export type TodayLabels={title:string;hint:string;group:string;next:string;empty:string};

export default function TodayProgram({items,initial,t}:{items:TodayItem[];initial:number;t:TodayLabels}){
 const [sel,setSel]=useState(Math.min(Math.max(initial,0),Math.max(items.length-1,0)));
 const cur=items[sel],box=useRef<HTMLDivElement>(null);
 // Ako ima više od tri emisije, red se pomera u stranu da izabrana uvek bude vidljiva.
 useEffect(()=>{const c=box.current,b=c?.querySelector<HTMLElement>('[aria-pressed=true]');if(!c||!b)return;const x=b.offsetLeft-c.offsetLeft;if(x<c.scrollLeft||x+b.offsetWidth>c.scrollLeft+c.clientWidth)c.scrollTo({left:x});},[sel]);
 return <>
  <div className="sc12 sg s-line">
   <div className="sc4 s-line-title">
    <h1 id="danas-h" className="sf-head">{t.title}</h1>
    <p>{t.hint}</p>
   </div>
   <div ref={box} className="s-tabs" role="group" aria-label={t.group}>
    {items.map((it,i)=><button key={it.id} className="s-tab" aria-pressed={i===sel} onClick={()=>setSel(i)}>
     <span className="s-dot" aria-hidden="true"/>
     {it.thumb?<img className="s-thumb" src={it.thumb} alt=""/>:<span className="s-thumb" aria-hidden="true">{it.icon}</span>}
     <span className="s-tab-text"><span className="s-tab-min sf-head">{it.minute}</span><span className="s-tab-name">{it.title}</span></span>
    </button>)}
   </div>
   {items.length>1&&<button className="s-next" aria-label={t.next} onClick={()=>setSel((sel+1)%items.length)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>}
  </div>
  {cur?<div className="sc12 s-stage">
   {cur.img?<img className="s-ep-img" src={cur.img} alt=""/>:<div className="s-ep-img" aria-hidden="true">{cur.icon}</div>}
   <div className="s-ep-body">
    <span className="s-ep-label">{cur.label}</span>
    <h3 className="s-ep-title sf-head">{cur.epTitle}</h3>
    {cur.text&&<p className="s-ep-text">{cur.text}</p>}
    {cur.meta&&<p className="s-ep-meta">{cur.meta}</p>}
   </div>
  </div>:<p className="sc12" style={{color:'#9aa1bd'}}>{t.empty}</p>}
 </>;
}
