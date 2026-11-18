'use client';
import {useState} from 'react';
export type PShow={id:string;title:string;desc:string;icon:string;img:string|null};
export type PCell={slotId:string;show:PShow;rerun:boolean};
/** Tabela „Naš program“: klik na emisiju otvara ispod tabele „Naziv: opis“; ponovni klik je zatvara. */
export default function ProgramGrid({days,order,minutes,cells,ui,rerunText,today}:{days:readonly string[];order:number[];minutes:number[];cells:Record<string,PCell[]>;ui:{minute:string;note:string};rerunText:string;today:number}){
 const [sel,setSel]=useState<PShow|null>(null);
 const [day,setDay]=useState(order.includes(today)?today:order[0]);
 const pick=(c:PCell,on:boolean)=>setSel(on?null:c.show);
 return <>
  <div className="s-prog-d" style={{overflowX:'auto'}}><table className="s-prog-table">
   <thead><tr><th scope="col" className="s-prog-min">{ui.minute}</th>{order.map(d=><th key={d} scope="col">{days[d]}</th>)}</tr></thead>
   <tbody>{minutes.map(m=><tr key={m}><th scope="row" className="s-prog-rowh sf-head">.{String(m).padStart(2,'0')}</th>
    {order.map(d=><td key={d}><div className="s-prog-cell">{(cells[`${d}-${m}`]??[]).map(c=>{const on=sel?.id===c.show.id;
     return <button key={c.slotId} type="button" className={'s-prog-show'+(on?' is-on':'')} aria-pressed={on} onClick={()=>setSel(on?null:c.show)}>
      {c.show.img?<img src={c.show.img} alt=""/>:<span className="s-prog-ico" aria-hidden="true">{c.show.icon}</span>}<span>{c.show.title}</span>{c.rerun&&<span className="s-prog-rerun">{rerunText}</span>}</button>})}</div></td>)}</tr>)}</tbody>
  </table></div>
  <div className="s-prog-m">
   <div className="s-prog-days" role="group" aria-label={ui.minute}>{order.map(d=><button key={d} type="button" className={'s-prog-day'+(d===day?' is-on':'')} aria-pressed={d===day} onClick={()=>setDay(d)}><span aria-hidden="true">{days[d].slice(0,3)}</span><span className="sr-only">{days[d]}</span></button>)}</div>
   <h3 className="s-prog-dayname sf-head">{days[day]}</h3>
   <ul className="s-prog-dl">{minutes.filter(m=>(cells[`${day}-${m}`]??[]).length>0).map(m=><li key={m}><span className="s-prog-dm sf-head">.{String(m).padStart(2,'0')}</span>
    <div className="s-prog-dshows">{(cells[`${day}-${m}`]??[]).map(c=>{const on=sel?.id===c.show.id;
     return <button key={c.slotId} type="button" className={'s-prog-drow'+(on?' is-on':'')} aria-pressed={on} onClick={()=>pick(c,on)}>
      {c.show.img?<img src={c.show.img} alt=""/>:<span className="s-prog-ico" aria-hidden="true">{c.show.icon}</span>}<span className="s-prog-dt">{c.show.title}</span>{c.rerun&&<span className="s-prog-rerun">{rerunText}</span>}</button>})}</div></li>)}</ul>
  </div>
  {sel&&sel.desc&&<div className="s-prog-desc" role="status"><strong className="s-prog-desc-t sf-head">{sel.title}</strong><p>{sel.desc}</p></div>}
  <p className="s-prog-note">{ui.note}</p></>}
