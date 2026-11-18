'use client';
import {useEffect,useRef,useState} from 'react';
export default function GameCard({tag,children}:{tag:string;children:React.ReactNode}){
 const ref=useRef<HTMLElement>(null);const [active,setActive]=useState(false);
 useEffect(()=>{const on=(e:Event)=>setActive(!!ref.current&&ref.current.contains(e.target as Node));
  document.addEventListener('pointerdown',on);document.addEventListener('focusin',on);
  return()=>{document.removeEventListener('pointerdown',on);document.removeEventListener('focusin',on)}},[]);
 return <article ref={ref} className={'s-game'+(active?' is-active':'')}>{children}<span className="s-game-tag">{tag}</span></article>
}
