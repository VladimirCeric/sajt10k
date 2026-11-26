'use client';
import {useEffect,useState} from 'react';
import WeatherIcon from '@/components/WeatherIcon';
import type {IconName} from '@/lib/weather';

type Payload={weather:{temp:string;label:string;icon:IconName;text:string}|null};

const stroke={fill:'none',stroke:'#c3c8de',strokeWidth:1.3,strokeLinecap:'round' as const,strokeLinejoin:'round' as const};

export default function HomeWeather({locale,label,dateText}:{locale:string;label:string;dateText:string}){
 const [data,setData]=useState<Payload['weather']>(null);
 useEffect(()=>{
  let active=true;
  const load=async()=>{
   try{
    const response=await fetch(`/api/weather?locale=${encodeURIComponent(locale)}`,{cache:'no-store'});
    if(!response.ok)return;
    const json=await response.json() as Payload;
    if(active)setData(json.weather);
   }catch{/* Keep date-only fallback if weather fetch fails */}
  };
  void load();
  const timer=setInterval(()=>void load(),300000);
  const visibility=()=>{if(document.visibilityState==='visible')void load()};
  document.addEventListener('visibilitychange',visibility);
  return()=>{active=false;clearInterval(timer);document.removeEventListener('visibilitychange',visibility)};
 },[locale]);
 if(!data)return <article className="sc4 s-info"><svg width="44" height="44" viewBox="0 0 24 24" {...stroke} aria-hidden="true"><path d="M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 11 3.5 3.5 0 0 0 7 18z"/></svg><div><div className="kr"><span className="k">{label}</span></div><p className="v">{dateText}</p><p className="d"/></div></article>;
 return <article className="sc4 s-info"><WeatherIcon name={data.icon}/><div><div className="kr"><span className="k">{label}</span><span className="src"><a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">{locale==='sr-cyrl'?'Прогноза':'Prognoza'}: Open-Meteo</a></span></div><p className="v">{`${data.temp} · ${data.label}`}</p><p className="d">{dateText}</p>{data.text&&<p className="x">{data.text}</p>}</div></article>;
}

