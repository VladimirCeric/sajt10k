import {db} from '@/lib/db';
import {RULES,WEATHER_KEY,getWeather,iconOf,parseOverrides,pickRule,textOf,tempText} from '@/lib/weather';
import {saveWeatherTexts,resetWeatherTexts} from '../../vreme-actions';
export const dynamic='force-dynamic';
export default async function Vreme({searchParams}:{searchParams:Promise<{msg?:string}>}){
 const {msg}=await searchParams;
 const [row,w]=await Promise.all([db.setting.findUnique({where:{key:WEATHER_KEY}}),getWeather()]);
 const ov=parseOverrides(row?.value),cur=w?pickRule(w):null;
 return <>
  <h1 className="text-4xl font-black my-6">Vreme</h1>
  <p className="muted mb-4">Šaljivi komentar uz vreme na naslovnoj. Ovde menjaš samo rečenice; uslovi i prioriteti su stalni (manji broj = važnije; prikazuje se jedna rečenica). Možeš da pišeš latinicom ili ćirilicom.</p>
  {msg==='ok'&&<p className="panel mb-4" style={{borderColor:'#3fae8a'}} role="status">Sačuvano.</p>}
  {msg==='reset'&&<p className="panel mb-4" role="status">Vraćene su početne rečenice.</p>}
  <div className="panel mb-6">
   <strong>Trenutno vreme (Beograd)</strong>
   {w&&cur?<p className="mt-2">{tempText(w.temp)} · {iconOf(w).label} · vlažnost {Math.round(w.hum)} % · udari {Math.round(w.gust)} km/h · oblačnost {Math.round(w.cloud)} %<br/>
    <span className="muted">Sada se prikazuje ({cur.id}, {cur.name}):</span> <em>{textOf(cur,ov)}</em></p>
    :<p className="mt-2 muted">Prognoza trenutno nije dostupna (servis ne odgovara ili server nema pristup api.open-meteo.com). Sajt tada samo ne prikazuje vreme.</p>}
  </div>
  <form action={saveWeatherTexts} className="panel">
   <div style={{display:'grid',gridTemplateColumns:'48px minmax(150px,220px) minmax(180px,1fr) 28px minmax(260px,2fr)',gap:'10px 14px',alignItems:'center'}}>
    {['ID','Situacija','Uslov','Pr.','Rečenica'].map(h=><span key={h} className="muted text-xs" style={{fontWeight:700,letterSpacing:1}}>{h.toUpperCase()}</span>)}
    {RULES.map(r=><div key={r.id} style={{display:'contents'}}>
     <span className="muted text-sm">{r.id}</span>
     <span className="text-sm" style={{fontWeight:600}}>{r.name}</span>
     <span className="muted text-sm">{r.cond}</span>
     <span className="muted text-sm">{r.p}</span>
     <input name={'t_'+r.id} defaultValue={textOf(r,ov)} maxLength={160} style={{height:44,boxSizing:'border-box',width:'100%'}} aria-label={`Rečenica ${r.id}`}/>
    </div>)}
   </div>
   <div className="flex gap-3 mt-5 flex-wrap"><button className="btn">Sačuvaj rečenice</button></div>
  </form>
  <form action={resetWeatherTexts} className="mt-4"><button className="pill text-sm">Vrati sve na početne rečenice</button></form>
 </>}
