import Link from 'next/link';
import {db} from '@/lib/db';
import ScriptField from '@/components/admin/ScriptField';
import ImagePicker from '@/components/admin/ImagePicker';
import AudioPicker from '@/components/admin/AudioPicker';
import {DeleteButton,StatusSelect} from '@/components/admin/DayControls';
import {savePodcast,deletePodcast} from '../../podkast-actions';
export const dynamic='force-dynamic';
const lat=<T extends {locale:string}>(a:T[])=>a.find(x=>x.locale==='sr-latn')??a[0];
const plain=(s?:string)=>(s??'').replace(/\{\{lat:([^}]*)\}\}/g,'$1');
const dmy=(d?:string|null)=>{if(!d)return '';const [y,m,x]=d.split('-');return `${+x}. ${+m}. ${y}.`};
export default async function Podkast({searchParams}:{searchParams:Promise<{edit?:string;novo?:string;msg?:string}>}){
 const {edit,novo,msg}=await searchParams;
 const [shows,eps]=await Promise.all([db.show.findMany({where:{active:true},include:{translations:true},orderBy:{sortOrder:'asc'}}),
  db.podcastEpisode.findMany({include:{translations:true,show:{include:{translations:true}}},orderBy:[{date:{sort:'desc',nulls:'last'}},{createdAt:'desc'}]})]);
 const e=eps.find(x=>x.id===edit),open=!!e||!!novo,tr=e?lat(e.translations):undefined;
 return <>
  <h1 className="text-4xl font-black my-6">Podkast</h1>
  <p className="muted mb-4">Snimljene emisije koje se slušaju na strani „Podkast“. Snimak se otprema ovde (MP3, M4A, OGG ili WAV, do 150 MB). Dugme „Podkast“ u meniju sajta pojavljuje se tek kad postoji bar jedna objavljena epizoda.</p>
  {msg==='ok'&&<p className="panel mb-4" style={{borderColor:'#3fae8a'}} role="status">Sačuvano.</p>}
  {msg==='deleted'&&<p className="panel mb-4" role="status">Epizoda je obrisana.</p>}
  <div className="panel mb-4">
   <div className="flex justify-between items-center mb-3 flex-wrap gap-3"><strong className="text-lg">Epizode</strong><Link className="pill text-sm" href="?novo=1">Dodaj epizodu</Link></div>
   {eps.length===0&&<p className="muted text-sm">Još nema epizoda.</p>}
   <div className="space-y-2">{eps.map(x=>{const t=lat(x.translations);return <Link key={x.id} href={`?edit=${x.id}`} className="flex gap-4 items-center flex-wrap" style={{padding:'8px 14px',borderRadius:12,border:'1px solid '+(x.id===edit?'#fff':'#2c3254'),opacity:x.published?1:.6}}>
    <span style={{flex:1,minWidth:200,fontWeight:600}}>{plain(t?.title)}</span><span className="muted text-sm">{plain(lat(x.show.translations)?.title)}</span><span className="muted text-sm">{dmy(x.date)}</span><span className="muted text-xs">{x.published?'objavljeno':'nacrt'}</span></Link>})}</div>
  </div>
  {open&&<form action={savePodcast} className="panel" key={e?.id??'novo'}><input type="hidden" name="id" value={e?.id??''}/>
   <h2 className="text-2xl font-bold mb-4">{e?'Izmena epizode':'Nova epizoda'}</h2>
   <div className="inputrow" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
    <div className="field"><label>Emisija</label><select name="showId" defaultValue={e?.showId} required style={{height:44,boxSizing:'border-box'}}>{shows.map(s=><option key={s.id} value={s.id}>{plain(lat(s.translations)?.title)||s.slug}</option>)}</select></div>
    <div className="field"><label>Datum emitovanja</label><input type="date" name="date" defaultValue={e?.date??''} style={{height:44,boxSizing:'border-box'}}/></div>
    <div className="field"><label>Broj epizode (nije obavezan)</label><input type="number" name="episodeNo" min={1} max={9999} defaultValue={e?.episodeNo??''} style={{height:44,boxSizing:'border-box'}}/></div></div>
   <ScriptField noKeep name="title" label="Naslov epizode" defaultValue={tr?.title} maxLength={160} required/>
   <ScriptField name="description" label="Opis (par rečenica)" defaultValue={tr?.description} rows={4} maxLength={900} noPreview/>
   <AudioPicker current={e?.audioUrl} duration={e?.durationSec}/>
   <div className="inputrow" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
    <ImagePicker label="Slika epizode (1:1, nije obavezna; bez nje se koristi slika emisije)" ratio="1/1" current={e?.imageUrl}/>
    <StatusSelect defaultValue={e?.published?'PUBLISHED':'DRAFT'} options={[['DRAFT','Nacrt'],['PUBLISHED','Objavljeno']]}/></div>
   <div className="flex gap-4 items-center justify-between"><button className="btn">Sačuvaj epizodu</button>{e&&<DeleteButton action={deletePodcast} label="Obriši epizodu"/>}</div>
  </form>}
 </>}
