import Link from 'next/link';
import {TimeChange,SkipToggle,StatusSelect,DeleteButton} from '@/components/admin/DayControls';
import ImagePicker from '@/components/admin/ImagePicker';
import ScriptField from '@/components/admin/ScriptField';
import {db} from '@/lib/db';
import {belgradeParts,localDateOffset} from '@/lib/schedule';
import {toBelgradeLocal,stateLabel} from '@/lib/visibility';
import {weeklyGame} from '@/lib/weekly-game';
import {saveAnnouncement,removeAnnouncement,addExtra,copyDay,saveFeature} from '../../najave-actions';

const DAYS=['Nedelja','Ponedeljak','Utorak','Sreda','Četvrtak','Petak','Subota'];
const MONTHS=['januar','februar','mart','april','maj','jun','jul','avgust','septembar','oktobar','novembar','decembar'];
const dow=(d:string)=>new Date(`${d}T12:00:00Z`).getUTCDay();
const STATES=[['DRAFT','Nacrt (ne vidi se na sajtu)'],['PUBLISHED','Objavljeno (vidi se u izabranom danu)']] as const;

function StateFields({state,cols=3}:{state?:string;showFrom?:Date|null;cols?:number}){
 return <div className="inputrow" style={{gridTemplateColumns:`repeat(${cols},1fr)`}}><StatusSelect defaultValue={state==='DRAFT'||!state?'DRAFT':'PUBLISHED'} options={STATES as unknown as [string,string][]}/></div>;
}

export default async function Najave({searchParams}:{searchParams:Promise<{date?:string;msg?:string}>}){
 const sp=await searchParams,today=belgradeParts(new Date()).date;
 const date=sp.date&&/^\d{4}-\d{2}-\d{2}$/.test(sp.date)?sp.date:today;
 const [y,m,dd]=date.split('-').map(Number),day=dow(date);
 const monthStart=`${y}-${String(m).padStart(2,'0')}-01`,lead=(dow(monthStart)+6)%7,daysIn=new Date(Date.UTC(y,m,0)).getUTCDate();
 const monday=localDateOffset(date,-((day+6)%7));
 const [slots,monthEps,dayEps,features,choice,allShows]=await Promise.all([
  db.scheduleSlot.findMany({where:{enabled:true,show:{active:true}},include:{show:{include:{translations:true}}},orderBy:{startMinute:'asc'}}),
  db.episode.findMany({where:{airDate:{startsWith:monthStart.slice(0,7)}},select:{airDate:true,state:true}}),
  db.episode.findMany({where:{airDate:date},include:{translations:true}}),
  db.dayFeature.findMany({where:{date},include:{translations:true}}),
  db.weeklyGameChoice.findUnique({where:{weekStart:monday}}),
  db.show.findMany({where:{active:true},include:{translations:true},orderBy:{sortOrder:'asc'}})]);
 const perDay=(wd:number)=>new Set(slots.filter(s=>s.dayOfWeek===wd).map(s=>s.showId)).size;
 const daySlots=slots.filter(s=>s.dayOfWeek===day);const seen=new Set<string>();const rows=daySlots.filter(s=>seen.has(s.showId)?false:(seen.add(s.showId),true));
 const regular=new Set(rows.map(r=>r.showId));
 const extras=dayEps.filter(e=>!regular.has(e.showId));
 const lat=<T extends {locale:string}>(a:T[])=>a.find(x=>x.locale==='sr-latn')??a[0];
 const cells:(string|null)[]=[...Array(lead).fill(null),...Array.from({length:daysIn},(_,i)=>`${monthStart.slice(0,8)}${String(i+1).padStart(2,'0')}`)];
 const msg=sp.msg??'';
 const prevMonth=localDateOffset(monthStart,-1).slice(0,7)+'-01',nextMonth=localDateOffset(monthStart,32).slice(0,7)+'-01';
 const wk=weeklyGame(monday);
 return <>
  <h1 className="text-4xl font-bold my-8">Najave</h1>
  {msg==='ok'&&<p className="panel mb-4" role="status">Sačuvano.</p>}
  {msg==='exists'&&<p className="panel mb-4" role="status">Ta emisija već ima unos za ovaj dan.</p>}
  {msg==='deleted'&&<p className="panel mb-4" role="status">Obrisano.</p>}
  {msg.startsWith('copied')&&<p className="panel mb-4" role="status">Kopirano: {msg.slice(6)} unosa (kao nacrti).</p>}

  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:20,alignItems:'start',marginBottom:24}}>
   <div>
  <div className="flex gap-3 items-center flex-wrap mb-4" >
   <Link className="pill" href={`?date=${localDateOffset(date,-1)}`}>‹ Prethodni dan</Link>
   <h2 className="text-2xl font-bold" style={{order:-1,width:'100%'}}>{DAYS[day]}, {dd}. {MONTHS[m-1]} {y}.</h2>
   <Link className="pill" href={`?date=${localDateOffset(date,1)}`}>Sledeći dan ›</Link>
  </div>

  <form action={copyDay} className="panel flex gap-3 items-end flex-wrap"><input type="hidden" name="date" value={date}/>
   <div className="field !mb-0"><label>Kopiraj najave iz dana</label><input type="date" name="from" defaultValue={localDateOffset(date,-1)} required/></div>
   <button className="btn">Kopiraj kao nacrte</button><span className="muted text-sm">Kopira emisije, muzički specijal i zvuk noći, samo ono što za ovaj dan još nema unos. Sve dolazi kao nacrt.</span></form>

   </div>
   <div style={{maxWidth:440,justifySelf:'end',width:'100%'}}>
  <div className="panel" style={{padding:14}}>
   <div className="flex justify-between items-center mb-3"><Link className="pill" href={`?date=${prevMonth}`}>‹</Link><strong>{MONTHS[m-1]} {y}.</strong><Link className="pill" href={`?date=${nextMonth}`}>›</Link></div>
   <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3}}>
    {['Pon','Uto','Sre','Čet','Pet','Sub','Ned'].map(x=><span key={x} className="muted text-xs text-center">{x}</span>)}
    {cells.map((c,i)=>{if(!c)return <span key={i}/>;const wd=dow(c),total=perDay(wd),eps=monthEps.filter(e=>e.airDate===c),pub=eps.filter(e=>e.state==='PUBLISHED').length,sch=eps.filter(e=>e.state==='SCHEDULED').length;
     const col=total>0&&pub+sch>=total?'#3fae8a':eps.length?'#d9a441':'#2c3254';
     return <Link key={c} href={`?date=${c}`} style={{border:c===date?'2px solid #fff':'1px solid #2c3254',borderRadius:8,padding:'2px 2px',fontSize:13,lineHeight:1.25,textAlign:'center',background:c===today?'#1b2040':'transparent'}}>
      <div>{Number(c.slice(8))}</div><div className="text-xs" style={{color:col}}>{total?`${eps.length}/${total}`:'—'}</div></Link>})}
   </div>
   <p className="muted text-xs mt-2">Broj ispod dana: unete najave / emisija u rasporedu tog dana. Zeleno: sve objavljeno ili zakazano, žuto: nešto fali ili je nacrt.</p>
  </div>

   </div>
  </div>

  <h2 className="text-2xl font-bold mb-3">Emisije na programu</h2>
  <p className="muted text-sm mb-3">Redovne emisije dolaze iz stranice „Naš program“ (po danima u nedelji). Ovde ih za izabrani datum možeš da isključiš, pomeriš minut ili dodaš dodatnu emisiju.</p>
  {rows.length===0&&extras.length===0&&<p className="panel muted mb-6">U rasporedu nema emisija za ovaj dan. Postavi ih u „Naš program“ ili dodaj dole kao dodatnu emisiju.</p>}
  <div className="space-y-4 mb-8">{[...rows.map(s=>({key:s.id,showId:s.showId,minute:s.startMinute,name:lat(s.show.translations)?.title??s.show.slug,slug:s.show.slug,extra:false})),...extras.map(e=>({key:e.id,showId:e.showId,minute:e.slotMinute??0,name:lat(allShows.find(x=>x.id===e.showId)?.translations??[])?.title??'Emisija',slug:allShows.find(x=>x.id===e.showId)?.slug??'',extra:true}))].map(s=>{const ep=dayEps.find(e=>e.showId===s.showId),tr=ep?lat(ep.translations):undefined,name=s.name;
   return <form key={s.key+date} action={saveAnnouncement} className="panel"><input type="hidden" name="date" value={date}/><input type="hidden" name="showId" value={s.showId}/>
    <div className="flex justify-between flex-wrap gap-2 mb-3"><strong className="text-lg">.{String(ep?.slotMinute??s.minute).padStart(2,'0')} · {name}{s.extra?' (dodatna emisija)':''}</strong><span className="muted text-sm">{ep?stateLabel[ep.state]:'Nema najave'}</span></div>
    <ScriptField name="title" label="Naslov epizode" defaultValue={tr?.title} maxLength={140} required/>
    <ScriptField name="text" label="Kratak opis (do dve rečenice)" defaultValue={tr?.description} rows={3} maxLength={320}/>
    <div className="inputrow" style={{gridTemplateColumns:'repeat(3,1fr)'}}><ImagePicker label="Slika (16:9)" current={ep?.imageUrl}/>
     <div className="field"><label>Opis slike (za slepe i slabovide)</label><input name="imageAlt" maxLength={250} defaultValue={ep?.imageAlt}/></div>
     {s.slug==='topic-of-week'?<div className="field"><label>Broj epizode</label><input name="episodeNo" type="number" min={1} max={999} defaultValue={ep?.episodeNo??''}/></div>:<div/>}</div>
    {(()=>{const dual=['cirkus','fonorama'].includes(s.slug),[h1='',h2='']=dual?(ep?.host??'').split(/ (?:i|и) /):[];return <>
     <div className="inputrow" style={{gridTemplateColumns:'repeat(3,1fr)'}}>{dual?<ScriptField noKeep name="host1" label="Prvi voditelj" defaultValue={h1} maxLength={120}/>:<ScriptField noKeep name="host" label="Voditelj (prazno = ne prikazuje se)" defaultValue={ep?.host??''} maxLength={250}/>}
      <TimeChange defaultValue={ep?.slotMinute??s.minute} custom={ep?.slotMinute!=null}/><SkipToggle defaultChecked={ep?.skip??false}/></div>
     {dual&&<div className="inputrow" style={{gridTemplateColumns:'repeat(3,1fr)'}}><ScriptField noKeep name="host2" label="Drugi voditelj (prazno = samo jedan)" defaultValue={h2} maxLength={120}/></div>}</>})()}
    <StateFields state={ep?.state} showFrom={ep?.showFrom}/>
    <div className="flex gap-4 items-center justify-between"><button className="btn">Sačuvaj</button>{ep&&<DeleteButton action={removeAnnouncement}/>}</div></form>})}</div>

  <form action={addExtra} className="panel mb-8"><input type="hidden" name="date" value={date}/>
   <h3 className="text-lg font-bold mb-1">Dodatna emisija (samo za ovaj dan)</h3>
   <p className="muted text-sm mb-3">Za emisiju koje nema u „Našem programu“ za ovaj dan. Posle klika na „Dodaj“ pojaviće se gore u listi, pa je popuniš kao ostale.</p>
   <div className="inputrow" style={{gridTemplateColumns:'repeat(3,1fr)',alignItems:'end'}}>
    <div className="field !mb-0"><label>Emisija</label><select name="showId" style={{height:44,boxSizing:'border-box',fontSize:'13.3333px',fontFamily:'inherit'}}>{allShows.map(x=><option key={x.id} value={x.id}>{lat(x.translations)?.title??x.slug}</option>)}</select></div>
    <div className="field !mb-0"><label>Minut početka (0, 15 ili 30)</label><input name="slotMinute" type="number" min={0} max={59} defaultValue={0}/></div>
    <div><button className="btn">Dodaj emisiju</button></div></div></form>

  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(380px,1fr))',gap:16,alignItems:'stretch'}} className="mb-4">{(['special','night'] as const).map(kind=>{const f=features.find(x=>x.kind===kind),tr=f?lat(f.translations):undefined;
   return <form key={kind} action={saveFeature} className="panel flex flex-col"><input type="hidden" name="date" value={date}/><input type="hidden" name="kind" value={kind}/>
    <div className="flex justify-between mb-3"><strong className="text-lg">{kind==='special'?'Muzički specijal (od 22:00)':'Večeras spavaš uz (zvuk noći)'}</strong><span className="muted text-sm">{f?stateLabel[f.state]:'Nema unosa'}</span></div>
    <ScriptField name="title" label={kind==='special'?'Tema / žanr večeri':'Zvuk noći'} defaultValue={tr?.title} maxLength={140}/>
    <ScriptField name="text" label={kind==='special'?'Izvođači, period ili povod':'Opis (npr. od kada do kada)'} defaultValue={tr?.text} rows={2} maxLength={320}/>
    <StateFields cols={1} state={f?.state} showFrom={f?.showFrom}/>
    <div className="mt-auto"><button className="btn">Sačuvaj</button></div><p className="muted text-sm mt-3">{kind==='special'?'Prikazuje se samo na dan za koji postoji unos. Prazan naslov briše unos.':'Ako za neki dan nema unosa, prikazuje se poslednji raniji.'}</p></form>})}</div>


 </>}
