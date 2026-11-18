import TajnaRec from '@/components/tajna-rec/TajnaRec';
import {gameById} from '@/lib/games';
import {weeklyGame} from '@/lib/weekly-game';
import {liveWhere} from '@/lib/visibility';
import {toScript} from '@/lib/translit';
import Albukerki,{type AlbText} from '@/components/Albukerki';
import {albUi} from '@/lib/albukerki-ui';
import {parseBody,countWords,readTimeLabel,type BodyImage} from '@/lib/text-body';
import {stripMarkers} from '@/lib/translit';
import ProgramTable from '@/components/ProgramTable';
import GameCard from '@/components/GameCard';
import TodayProgram,{type TodayItem} from '@/components/TodayProgram';
import WeatherIcon from '@/components/WeatherIcon';
import {getWeather,iconOf,pickRule,textOf,parseOverrides,WEATHER_KEY,inScript,tempText} from '@/lib/weather';
import {db} from '@/lib/db';import {localeOf,localized,ui} from '@/lib/i18n';import {belgradeParts,expandDay,localDateOffset} from '@/lib/schedule';
export const dynamic='force-dynamic';

const stroke={fill:'none',stroke:'#c3c8de',strokeWidth:1.3,strokeLinecap:'round' as const,strokeLinejoin:'round' as const};
function Info({icon,k,v,d,x,src}:{icon:React.ReactNode;k:string;v:string;d:string;x?:string;src?:React.ReactNode}){
 return <article className="sc4 s-info">{icon}<div><div className="kr"><span className="k">{k}</span>{src&&<span className="src">{src}</span>}</div><p className="v">{v}</p><p className="d">{d}</p>{x&&<p className="x">{x}</p>}</div></article>;
}

export default async function Home({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{tekst?:string}>}){
 const {tekst}=await searchParams;
 const locale=localeOf((await params).locale),t=ui[locale],bp=belgradeParts(new Date());
 const slots=await db.scheduleSlot.findMany({where:{enabled:true,dayOfWeek:bp.day,show:{active:true}},include:{show:{include:{translations:true}}},orderBy:{startMinute:'asc'}});
 const ex=await db.scheduleException.findMany({where:{date:bp.date}});
 const occ=expandDay(slots,bp.date,bp.day,locale,ex);
 const cur=occ.find(x=>x.start<=bp.minute&&x.end>bp.minute)??occ.find(x=>x.start>bp.minute);
 const found=cur?slots.findIndex(s=>cur.key.startsWith(`${s.id}:`)):-1;
 const now=new Date();
 const episodes=await db.episode.findMany({where:{airDate:bp.date,...liveWhere(now)},include:{translations:true}});
 const slotShows=new Set(slots.map(s=>s.showId));
 const extraEps=episodes.filter(e=>!slotShows.has(e.showId)&&!e.skip);
 const extraShows=extraEps.length?await db.show.findMany({where:{id:{in:extraEps.map(e=>e.showId)}},include:{translations:true}}):[];
 const featWhere={...liveWhere(now)};
 const [wx,wxRow]=await Promise.all([getWeather(),db.setting.findUnique({where:{key:WEATHER_KEY}})]);
 const wxText=wx?inScript(textOf(pickRule(wx),parseOverrides(wxRow?.value)),locale):undefined;
 const [special,night,choice]=await Promise.all([
  db.dayFeature.findFirst({where:{kind:'special',date:bp.date,...featWhere},include:{translations:true}}),
  db.dayFeature.findFirst({where:{kind:'night',date:{lte:bp.date},...featWhere},orderBy:{date:'desc'},include:{translations:true}}),
  db.weeklyGameChoice.findUnique({where:{weekStart:localDateOffset(bp.date,-((bp.day+6)%7))}})]);
 // Poslednja tri objavljena teksta (datum je stigao); „Mesto na sajtu“ iz admina može da ih rasporedi ručno.
 const liveP={state:'PUBLISHED' as const,date:{not:null,lte:bp.date}};
 const [recent,pinned]=await Promise.all([
  db.post.findMany({where:liveP,include:{translations:true},orderBy:[{date:'desc'},{createdAt:'desc'}],take:3}),
  db.post.findMany({where:{...liveP,position:{in:[1,2,3]}},include:{translations:true},orderBy:[{date:'desc'},{createdAt:'desc'}]})]);
 const pool=[...pinned,...recent.filter(r=>!pinned.some(p=>p.id===r.id))];
 const placed:(typeof pool[number]|null)[]=[null,null,null];
 for(const p of pinned)if(p.position&&!placed[p.position-1])placed[p.position-1]=p;
 const restP=pool.filter(p=>!placed.includes(p)).sort((a,b)=>(b.date??'').localeCompare(a.date??''));
 const postRows=placed.map(p=>p??restP.shift()??null).filter((p):p is typeof pool[number]=>!!p);
 const texts:AlbText[]=postRows.map(pr=>{const tr=pr.translations.find(x=>x.locale===locale)??pr.translations.find(x=>x.locale==='sr-latn')??pr.translations[0];
  let imgs:BodyImage[]=[];try{imgs=(JSON.parse(pr.bodyImages) as BodyImage[]).map(im=>({...im,alt:toScript(im.alt??'',locale)}))}catch{}
  const [py,pm,pd]=(pr.date??bp.date).split('-').map(Number),body=stripMarkers(tr?.body??'');
  return {slug:pr.slug,dateLabel:`${pd}. ${pm}. ${py}.`,read:readTimeLabel(countWords(body),locale),title:stripMarkers(tr?.title??pr.slug),lead:stripMarkers(tr?.lead??''),
   img:pr.imageUrl,imgAlt:pr.imageAlt,author:pr.author,blocks:parseBody(body,imgs).map(b=>b.t==='h'?{...b,text:stripMarkers(b.text)}:b)}});
 const up=(x:string)=>x.toLocaleUpperCase(locale==='sr-cyrl'?'sr-Cyrl':'sr-Latn');
 type Row={item:TodayItem;at:number;slotId?:string};
 const mk=(id:string,show:{icon:string;imageUrl:string|null;slug:string;translations:{locale:string;title:string;description:string}[]},ep:typeof episodes[number]|undefined,startMinute:number):Row=>{
  const sh=localized(show.translations,locale),et=ep?localized(ep.translations,locale):undefined,at=ep?.slotMinute??startMinute;
  const minute=`.${String(at).padStart(2,'0')}`,title=sh?.title??show.slug,host=ep?.host?toScript(ep.host,locale):'';
  return {at,slotId:id,item:{id,minute,title,icon:show.icon,thumb:show.imageUrl,img:ep?.imageUrl??show.imageUrl,
   label:`${minute} · ${up(title)}`,epTitle:et?.title??title,text:(et?.description||sh?.description)??'',
   meta:[ep?.episodeNo?`${t.epNo} ${ep.episodeNo}`:'',host?`${/ (i|и) /.test(host)?(locale==='sr-cyrl'?'Воде':'Vode'):t.host}: ${host}`:''].filter(Boolean).join(' · ')}};
 };
 const rows:Row[]=[...slots.map(sl=>({sl,ep:episodes.find(e=>e.showId===sl.showId)})).filter(x=>!x.ep?.skip).map(x=>mk(x.sl.id,x.sl.show,x.ep,x.sl.startMinute)),
  ...extraEps.flatMap(e=>{const sh=extraShows.find(x=>x.id===e.showId);return sh?[mk(e.id,sh,e,0)]:[]})].sort((a,b)=>a.at-b.at);
 const items=rows.map(r=>r.item);
 const initial=Math.max(0,rows.findIndex(r=>r.slotId===(found>=0?slots[found].id:'')));
 const [y,m,d]=bp.date.split('-').map(Number),dateText=`${t.days[bp.day]}, ${d}. ${t.months[m-1]} ${y}.`;
 const wk1=weeklyGame(bp.date),wk0=choice&&gameById(choice.game)?{game:choice.game,until:localDateOffset(localDateOffset(bp.date,-((bp.day+6)%7)),6)}:wk1,wk=wk0,[uy,um,ud]=wk.until.split('-').map(Number),untilText=`${ud}. ${um}. ${uy}.`;
 return <>
  <section id="danas" aria-labelledby="danas-h" className="s-today">
   <div className="sg s-today-grid">
    <TodayProgram items={items} initial={initial} t={{title:t.today,hint:t.todayHint,group:t.todayGroup,next:t.nextShow,empty:t.noToday}}/>
    {wx?<Info k={t.nowIn} v={`${tempText(wx.temp)} · ${inScript(iconOf(wx).label,locale)}`} d={dateText} x={wxText} src={<a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">{locale==='sr-cyrl'?'Прогноза':'Prognoza'}: Open-Meteo</a>} icon={<WeatherIcon name={iconOf(wx).icon}/>}/>
    :<Info k={t.nowIn} v={dateText} d="" icon={<svg width="44" height="44" viewBox="0 0 24 24" {...stroke} aria-hidden="true"><path d="M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 11 3.5 3.5 0 0 0 7 18z"/></svg>}/>}
    {special&&<Info k={t.special} v={localized(special.translations,locale)?.title??''} d={localized(special.translations,locale)?.text??''} icon={<svg width="44" height="44" viewBox="0 0 24 24" {...stroke} aria-hidden="true"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>}/>}
    {night&&<Info k={t.night} v={localized(night.translations,locale)?.title??''} d={localized(night.translations,locale)?.text??''} icon={<svg width="44" height="44" viewBox="0 0 24 24" {...stroke} aria-hidden="true"><path d="M9 3.5a8.5 8.5 0 1 0 11.5 11.5A9.5 9.5 0 0 1 9 3.5z"/></svg>}/>}
   </div>
  </section>
  <section id="igre" aria-labelledby="igre-h" className="s-games">
  <h2 id="igre-h" className="sf-head">{t.games}</h2>
  <div className="s-games-grid">
   <GameCard tag={t.tajnaTag}><TajnaRec locale={locale} autoHelp={false}/></GameCard>
   <GameCard tag={`${t.weeklyTag} ${untilText}`}>{(()=>{const G=(gameById(wk.game)??gameById(wk1.game))!.Component;return <G locale={locale} autoHelp={false}/>})()}</GameCard>
  </div>
 </section>
 {texts.length>0&&<Albukerki texts={texts} initial={tekst??''} locale={locale} ui={albUi(locale)}/>}
 <ProgramTable locale={locale} days={t.days}/>
 </>}
