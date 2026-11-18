import Link from 'next/link';
import {db} from '@/lib/db';
import ScriptField from '@/components/admin/ScriptField';
import ImagePicker from '@/components/admin/ImagePicker';
import {DeleteButton} from '@/components/admin/DayControls';
import {savePerson,deletePerson,saveAboutImage,seedPeople,saveAboutTexts,resetAboutTexts} from '../../ljudi-actions';
import {ABOUT_DEFAULTS,ABOUT_KEY,parseAbout} from '@/lib/about-ui';
const lat=<T extends {locale:string}>(a:T[])=>a.find(x=>x.locale==='sr-latn')??a[0];
const plain=(s?:string)=>(s??'').replace(/\{\{lat:([^}]*)\}\}/g,'$1');
const KIND:Record<string,{one:string;add:string}>={STUDENT:{one:'Student (trenutni sastav)',add:'Dodaj studenta'},FORMER:{one:'Ranije angažovan',add:'Dodaj raniju osobu'},CHIEF:{one:'Glavni urednik',add:'Dodaj glavnog urednika'},EDITOR:{one:'Urednik',add:'Dodaj urednika'}};
const GROUPS:[string,string[]][]=[['Studenti (trenutni sastav)',['STUDENT']],['Ranije su sa nama radili',['FORMER']],['Uredništvo',['CHIEF','EDITOR']]];
const sel={height:44,boxSizing:'border-box' as const,fontSize:'13.3333px',fontFamily:'inherit'};
export default async function ONama({searchParams}:{searchParams:Promise<{edit?:string;novo?:string;msg?:string}>}){
 const {edit,novo,msg}=await searchParams;
 const [people,img,txtRow]=await Promise.all([db.person.findMany({include:{translations:true},orderBy:[{sortOrder:'asc'},{createdAt:'asc'}]}),db.setting.findUnique({where:{key:'about_image'}}),db.setting.findUnique({where:{key:ABOUT_KEY}})]);
 const sv=parseAbout(txtRow?.value),tv=(k:keyof typeof ABOUT_DEFAULTS)=>sv.lat?.[k]||ABOUT_DEFAULTS[k];
 const p=people.find(x=>x.id===edit),kind=p?.kind??(novo&&KIND[novo]?novo:''),tr=p?lat(p.translations):undefined;
 return <>
  <h1 className="text-4xl font-black my-6">O nama</h1>
  <p className="muted mb-4">Ovde se uređuju slika radija i ljudi na strani „O nama“. Uvodni tekst, misija, vizija i ciljevi su za sada stalni.</p>
  {msg==='ok'&&<p className="panel mb-4" style={{borderColor:'#3fae8a'}} role="status">Sačuvano.</p>}
  {msg==='image'&&<p className="panel mb-4" style={{borderColor:'#3fae8a'}} role="status">Slika radija je sačuvana.</p>}
  {msg==='texts'&&<p className="panel mb-4" style={{borderColor:'#3fae8a'}} role="status">Tekstovi strane su sačuvani.</p>}
  {msg==='deleted'&&<p className="panel mb-4" role="status">Obrisano.</p>}
  <form action={saveAboutImage} className="panel mb-6"><h2 className="text-xl font-bold mb-3">Slika radija (21:9)</h2>
   <div className="inputrow" style={{gridTemplateColumns:'repeat(3,1fr)'}}><ImagePicker label="Fotografija radija: studio, ekipa u radu" ratio="21/9" current={img?.value||null}/></div>
   <button className="btn">Sačuvaj sliku</button></form>


  <form action={saveAboutTexts} className="panel mb-6"><h2 className="text-xl font-bold mb-3">Tekst strane</h2>
   <p className="muted text-sm mb-3">Možeš da pišeš latinicom ili ćirilicom; drugo pismo se pravi samo. Ime radija piši kao {'{{lat:Radio 10K}}'} (ili dugmetom „Ostavi označeno latinicom“) da ostane latinicom.</p>
   <ScriptField noKeep name="a_title" label="Naslov strane" defaultValue={tv('title')} maxLength={80}/>
   <ScriptField name="a_lead" label="Uvod (veći tekst levo)" defaultValue={tv('lead')} rows={3} maxLength={400} noPreview/>
   <ScriptField name="a_p1" label="Pasus 1" defaultValue={tv('p1')} rows={4} maxLength={700} noPreview/>
   <ScriptField name="a_p2" label="Pasus 2" defaultValue={tv('p2')} rows={4} maxLength={700} noPreview/>
   <ScriptField name="a_p3" label="Pasus 3" defaultValue={tv('p3')} rows={3} maxLength={700} noPreview/>
   <ScriptField name="a_whyT" label="Naslov: Zašto postoji radio" defaultValue={tv('whyT')} maxLength={120}/>
   <div className="inputrow" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
    <div><ScriptField noKeep name="a_mission" label="Misija: naslov" defaultValue={tv('mission')} maxLength={40}/><ScriptField name="a_missionT" label="Misija: tekst" defaultValue={tv('missionT')} rows={5} maxLength={400} noPreview/></div>
    <div><ScriptField noKeep name="a_vision" label="Vizija: naslov" defaultValue={tv('vision')} maxLength={40}/><ScriptField name="a_visionT" label="Vizija: tekst" defaultValue={tv('visionT')} rows={5} maxLength={400} noPreview/></div>
    <div><ScriptField noKeep name="a_goals" label="Ciljevi: naslov" defaultValue={tv('goals')} maxLength={40}/><ScriptField name="a_goalsT" label="Ciljevi: tekst" defaultValue={tv('goalsT')} rows={5} maxLength={400} noPreview/></div></div>
   <div className="inputrow" style={{gridTemplateColumns:'repeat(2,1fr)'}}>
    <ScriptField noKeep name="a_students" label="Naslov: Studenti" defaultValue={tv('students')} maxLength={60}/>
    <ScriptField noKeep name="a_studentsSub" label="Podnaslov ispod Studenata" defaultValue={tv('studentsSub')} maxLength={120}/>
    <ScriptField noKeep name="a_former" label="Naslov: Ranije angažovani" defaultValue={tv('former')} maxLength={80}/>
    <ScriptField noKeep name="a_editorial" label="Naslov: Uredništvo" defaultValue={tv('editorial')} maxLength={60}/></div>
   <div className="flex gap-3 items-center flex-wrap"><button className="btn">Sačuvaj tekst</button></div>
  </form>
  <form action={resetAboutTexts} className="mb-6"><button className="pill text-sm">Vrati početne tekstove strane</button></form>
  {people.length===0&&<form action={seedPeople} className="panel mb-6"><p className="muted mb-3">Još nema nijedne osobe. Mogu da ubacim imena iz mokapa (7 studenata i uredništvo), pa ih ti dopunjavaš.</p><button className="btn">Ubaci početne podatke iz mokapa</button></form>}

  {GROUPS.map(([title,kinds])=>{const list=people.filter(x=>kinds.includes(x.kind));
   return <div key={title} className="panel mb-4">
    <div className="flex justify-between items-center mb-3 flex-wrap gap-3"><strong className="text-lg">{title}</strong>
     <span className="flex gap-2 flex-wrap">{kinds.map(k=><Link key={k} className="pill text-sm" href={`?novo=${k}`}>{KIND[k].add}</Link>)}</span></div>
    {list.length===0&&<p className="muted text-sm">Nema unosa.</p>}
    <div className="space-y-2">{list.map(x=>{const t=lat(x.translations);return <Link key={x.id} href={`?edit=${x.id}`} className="flex gap-4 items-center flex-wrap" style={{padding:'8px 14px',borderRadius:12,border:'1px solid '+(x.id===edit?'#fff':'#2c3254'),opacity:x.active?1:.5}}>
     <span style={{flex:1,minWidth:200,fontWeight:600}}>{plain(t?.name)}</span><span className="muted text-sm">{x.kind==='FORMER'?`${x.yearFrom??''}–${x.yearTo??''}`:plain(t?.role)}</span>{x.kind==='CHIEF'&&<span className="muted text-xs">glavni</span>}{!x.active&&<span className="muted text-xs">sakriveno</span>}</Link>})}</div>
   </div>})}

  {kind&&<form action={savePerson} className="panel" key={p?.id??`novi-${kind}`}><input type="hidden" name="id" value={p?.id??''}/><input type="hidden" name="kind" value={kind}/>
   <h2 className="text-2xl font-bold mb-4">{p?'Izmena':'Nova osoba'} · {KIND[kind].one}</h2>
   <div className="inputrow" style={{gridTemplateColumns:'repeat(2,1fr)'}}>
    <ScriptField noKeep name="name" label="Ime i prezime" defaultValue={tr?.name} maxLength={120} required/>
    {kind!=='CHIEF'&&kind!=='EDITOR'&&<ScriptField noKeep name="role" label={kind==='FORMER'?'Uloga (npr. montaža, ton)':'Pozicija (npr. voditeljka; prazno = ne prikazuje se)'} defaultValue={tr?.role} maxLength={120}/>}</div>
   {kind==='STUDENT'&&<>
    <ScriptField noKeep name="shows" label="Emisije (npr. Tema nedelje, Niti)" defaultValue={tr?.shows} maxLength={200}/>
    <ScriptField name="bio" label="Kratak opis (dve-tri rečenice o sebi)" defaultValue={tr?.bio} rows={3} maxLength={700}/>
    <div className="inputrow" style={{gridTemplateColumns:'repeat(3,1fr)'}}><ImagePicker label="Fotografija (1:1, kvadrat)" ratio="1/1" current={p?.imageUrl}/></div></>}
   {kind==='FORMER'&&<div className="inputrow" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
    <div className="field"><label>Godina početka</label><input name="yearFrom" type="number" min={1990} max={2100} defaultValue={p?.yearFrom??''}/></div>
    <div className="field"><label>Godina završetka (prazno = i dalje)</label><input name="yearTo" type="number" min={1990} max={2100} defaultValue={p?.yearTo??''}/></div></div>}
   <div className="inputrow" style={{gridTemplateColumns:'repeat(3,1fr)',alignItems:'end'}}>
    <div className="field"><label>Redosled (manji broj ide prvi)</label><input name="sortOrder" type="number" min={0} max={999} defaultValue={p?.sortOrder??((people.filter(x=>x.kind===kind).length+1))}/></div>
    <div className="field"><label style={{display:'flex',alignItems:'center',gap:8,margin:0,padding:'12px 0'}}><input className="!w-auto" type="checkbox" name="active" defaultChecked={p?.active??true}/>Prikazuje se na sajtu</label></div></div>
   <div className="flex gap-4 items-center justify-between"><button className="btn">Sačuvaj</button>{p&&<DeleteButton action={deletePerson} label="Obriši osobu"/>}</div>
  </form>}
 </>}
