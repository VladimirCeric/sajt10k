'use client';
import {useRef,useState} from 'react';
import type {Block} from '@/lib/text-body';
import type {AlbUi} from '@/lib/albukerki-ui';
export type AlbText={slug:string;dateLabel:string;read:string;title:string;lead:string;img:string|null;imgAlt:string;author:string;blocks:Block[]};

function Parts({parts}:{parts:{text:string;href?:string;b?:boolean;i?:boolean}[]}){return <>{parts.map((p,i)=>{let n:React.ReactNode=p.text;if(p.i)n=<em>{n}</em>;if(p.b)n=<strong>{n}</strong>;
 return p.href?<a key={i} className="s-link" href={p.href} target="_blank" rel="noopener noreferrer">{n}</a>:<span key={i}>{n}</span>})}</>}
function BlockView({b}:{b:Block}){
 if(b.t==='h')return <h4 className="s-alb-h sf-head">{b.text}</h4>;
 if(b.t==='img')return <figure className="s-alb-figure"><img className="s-alb-fig" src={b.url} alt={b.alt} loading="lazy"/>{b.alt&&<figcaption className="s-alb-cap">{b.alt}</figcaption>}</figure>;
 return <p className="s-alb-p"><Parts parts={b.parts}/></p>}

export default function Albukerki({texts,initial,locale,ui}:{texts:AlbText[];initial:string;locale:string;ui:AlbUi}){
 const [sel,setSel]=useState(texts.some(x=>x.slug===initial)?initial:texts[0]?.slug??'');
 const [open,setOpen]=useState(false);const root=useRef<HTMLElement>(null);
 const cur=texts.find(x=>x.slug===sel)??texts[0];if(!cur)return null;
 const up=(s:string)=>s.toLocaleUpperCase(locale==='sr-cyrl'?'sr-Cyrl':'sr-Latn');
 const isNewest=cur.slug===texts[0].slug,others=texts.filter(x=>x.slug!==cur.slug);
 function choose(slug:string){setSel(slug);setOpen(false);
  try{const u=new URL(window.location.href);if(slug===texts[0].slug)u.searchParams.delete('tekst');else u.searchParams.set('tekst',slug);window.history.replaceState(null,'',u.pathname+u.search+u.hash)}catch{}
  root.current?.scrollIntoView({behavior:'smooth',block:'start'})}
 const first=cur.blocks[0],rest=cur.blocks.slice(1);
 const long=rest.length>0||(first?.t==='p'&&first.parts.map(p=>p.text).join('').length>240);
 return <section ref={root} id="albukerki" aria-labelledby="albukerki-h" className="s-alb">
  <div className="s-alb-grid s-alb-head">
   <div style={{display:'flex',flexDirection:'column',gap:4}}><h2 id="albukerki-h" className="sf-head">{ui.title}</h2><span style={{color:'#9aa1bd',fontSize:13}}>{ui.sub}</span></div>
   {others.length>0&&<h3 className="s-alb-prevh">{ui.prev}</h3>}
  </div>
  <div className="s-alb-grid" style={{alignItems:'start'}}>
   <article key={cur.slug} aria-live="polite">
    {cur.img&&<img className="s-alb-img" src={cur.img} alt={cur.imgAlt}/>}
    <div className="s-alb-body">
     <span className="s-alb-kicker">{up(`${isNewest?ui.thisWeek:cur.dateLabel} · ${ui.read}: ${cur.read}`)}</span>
     <h3 className="s-alb-title sf-head">{cur.title}</h3>
     {cur.lead&&<p className="s-alb-lead">{cur.lead}</p>}
     {first&&(open||!long?<BlockView b={first}/>:<><div className="s-alb-clamp"><BlockView b={first}/></div><div className="s-alb-fade" aria-hidden="true"/></>)}
     {long&&!open&&<div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10,paddingTop:4}}><button className="s-alb-btn" onClick={()=>setOpen(true)} aria-expanded="false">{ui.show}</button><span className="s-alb-note">{ui.note}</span></div>}
     {open&&<>{rest.map((b,i)=><BlockView key={i} b={b}/>)}
      {cur.author&&<p className="s-alb-author">{ui.author}: {cur.author}</p>}
      <div style={{display:'flex',justifyContent:'center',paddingTop:12}}><button className="s-alb-btn" onClick={()=>setOpen(false)} aria-expanded="true">{ui.close}</button></div></>}
     {!long&&cur.author&&<p className="s-alb-author">{ui.author}: {cur.author}</p>}
    </div>
   </article>
   <aside aria-label={ui.prev} className="s-alb-side">
    {others.map((x,i)=>{const intro=x.lead||(x.blocks[0]?.t==='p'?x.blocks[0].parts.map(p=>p.text).join(''):'');
     return <button key={x.slug} className={'s-alb-card'+(i>0?' s-alb-card-b':'')} onClick={()=>choose(x.slug)}>
      {x.img&&<img src={x.img} alt={x.imgAlt} loading="lazy"/>}
      <span className="s-alb-meta">{up(`${x.dateLabel} · ${ui.read}: ${x.read}`)}</span>
      <span className="s-alb-ctitle sf-head">{x.title}</span>
      {intro&&<span className="s-alb-intro"><span>{intro}</span></span>}
      <span className="s-alb-open">{ui.open}</span></button>})}
    <div className="s-alb-about"><span>{ui.aboutT}</span><p>{ui.about}</p></div>
   </aside>
  </div>
 </section>}
