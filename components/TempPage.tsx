'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {usePathname,useSearchParams} from 'next/navigation';
import {locales,type Locale} from '@/lib/i18n';
const UNITS={'sr-latn':['dana','sati','minuta','sekundi'],'sr-cyrl':['дана','сати','минута','секунди']};
const p2=(n:number)=>n<10?'0'+n:''+n;
/** Privremena strana umesto sajta: naslov, poruka i (nije obavezno) odbrojavanje. */
export default function TempPage({locale,h,s,endMs}:{locale:Locale;h:string;s:string;endMs:number|null}){
 const path=usePathname()||`/${locale}`,search=(useSearchParams()?.toString()??'');
 const swap=(l:string)=>path.replace(/^\/(sr-cyrl|sr-latn)/,`/${l}`)+(search?`?${search}`:'');
 const [left,setLeft]=useState<number|null>(null);
 useEffect(()=>{if(!endMs)return;const tick=()=>setLeft(Math.max(0,Math.floor((endMs-Date.now())/1000)));tick();const i=setInterval(tick,1000);return()=>clearInterval(i)},[endMs]);
 const words=h.split(' '),last=words.pop(),u=UNITS[locale],l=left??0,show=endMs&&(left===null||left>0);
 const cells=[Math.floor(l/86400),p2(Math.floor(l%86400/3600)),p2(Math.floor(l%3600/60)),p2(l%60)];
 return <div className="s-tmp-wrap">
  <div className="s-tmp-lang s-lang">{locales.map(x=><Link key={x} href={swap(x)} scroll={false} lang={x==='sr-cyrl'?'sr-Cyrl':'sr-Latn'} aria-current={x===locale}>{x==='sr-cyrl'?'Ћир':'Lat'}</Link>)}</div>
  <main className="s-tmp">
   <img className="s-tmp-logo" src="/logo-radio-10k.svg" alt="Radio 10K"/>
   <h1 className="sf-head">{words.length?words.join(' ')+' ':''}<span>{last}</span></h1>
   {s&&<p className="s-tmp-sub">{s}</p>}
   {show&&<div className="s-tmp-cd" role="timer">{cells.map((c,i)=><div key={i}><b>{left===null?'–':c}</b><small>{u[i]}</small></div>)}</div>}
  </main>
  <footer className="s-tmp-foot">Radio 10K · VIŠER</footer>
 </div>}
