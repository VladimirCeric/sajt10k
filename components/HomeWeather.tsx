'use client';
import {useEffect,useState} from 'react';
import WeatherIcon from '@/components/WeatherIcon';
import {iconOf,inScript,pickRule,tempText,textOf,type W} from '@/lib/weather';

const stroke={fill:'none',stroke:'#c3c8de',strokeWidth:1.3,strokeLinecap:'round' as const,strokeLinejoin:'round' as const};
const WEATHER_URL='https://api.open-meteo.com/v1/forecast?latitude=44.76&longitude=20.48&current=temperature_2m,apparent_temperature,relative_humidity_2m,is_day,precipitation,snowfall,weather_code,cloud_cover,wind_speed_10m,wind_gusts_10m&hourly=precipitation_probability&forecast_hours=4&timezone=Europe%2FBelgrade&wind_speed_unit=kmh';

function parseWeather(json:unknown):W|null{
 try{
  const j=json as {current?:Record<string,unknown>;hourly?:{precipitation_probability?:unknown[]}};
  const c=j.current??{};
  const p=(j.hourly?.precipitation_probability??[]).filter((x):x is number=>typeof x==='number');
  const w:W={
   temp:Number(c.temperature_2m),
   feels:Number(c.apparent_temperature),
   hum:Number(c.relative_humidity_2m),
   precip:Number(c.precipitation??0),
   snow:Number(c.snowfall??0),
   cloud:Number(c.cloud_cover),
   gust:Number(c.wind_gusts_10m??0),
   wind:Number(c.wind_speed_10m??0),
   code:Number(c.weather_code),
   day:Number(c.is_day)===1,
   pnext:Math.max(0,...p.slice(1,4))
  };
  return [w.temp,w.feels,w.hum,w.cloud,w.code].every(Number.isFinite)?w:null;
 }catch{return null}
}

export default function HomeWeather({locale,label,dateText}:{locale:string;label:string;dateText:string}){
 const [data,setData]=useState<{temp:string;label:string;icon:ReturnType<typeof iconOf>['icon'];text:string}|null>(null);
 useEffect(()=>{
  let active=true;
  const load=async()=>{
   try{
    const response=await fetch(WEATHER_URL,{cache:'no-store'});
    if(!response.ok)return;
    const wx=parseWeather(await response.json());
    if(!wx||!active)return;
    const icon=iconOf(wx);
    const text=inScript(textOf(pickRule(wx),{}),locale);
    setData({temp:tempText(wx.temp),label:inScript(icon.label,locale),icon:icon.icon,text});
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

