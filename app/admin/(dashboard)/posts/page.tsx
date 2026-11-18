import Link from 'next/link';
import {db} from '@/lib/db';
import ScriptField from '@/components/admin/ScriptField';
import ImagePicker from '@/components/admin/ImagePicker';
import {StatusSelect,DeleteButton} from '@/components/admin/DayControls';
import {belgradeParts} from '@/lib/schedule';
import {saveText,deleteText} from '../../tekstovi-actions';
const lat=<T extends {locale:string}>(a:T[])=>a.find(x=>x.locale==='sr-latn')??a[0];
const fmt=(d?:string|null)=>d?d.split('-').reverse().join('. ')+'.':'bez datuma';
const OPTS:[string,string][]=[['DRAFT','Nacrt (ne vidi se na sajtu)'],['PUBLISHED','Objavljeno (vidi se od izabranog datuma)']];
export default async function Tekstovi({searchParams}:{searchParams:Promise<{edit?:string;novo?:string;msg?:string}>}){
 const {edit,novo,msg}=await searchParams,today=belgradeParts(new Date()).date;
 const posts=await db.post.findMany({include:{translations:true},orderBy:[{date:'desc'},{createdAt:'desc'}]});
 const p=posts.find(x=>x.id===edit),show=!!p||novo==='1',tr=p?lat(p.translations):undefined;
 let imgs:{url:string;alt:string}[]=[];try{imgs=JSON.parse(p?.bodyImages??'[]')}catch{}
 return <>
  <h1 className="text-4xl font-black my-6">Tekstovi <span className="muted text-2xl font-normal">· Levo od Albukerkija</span></h1>
  <p className="muted mb-4">Na sajtu se vidi poslednji objavljeni tekst kao glavni i još dva prethodna. Novi tekst izlazi svake srede.</p>
  {msg==='ok'&&<p className="panel mb-4" style={{borderColor:'#3fae8a'}} role="status">Tekst je sačuvan.</p>}
  {msg==='deleted'&&<p className="panel mb-4" role="status">Tekst je obrisan.</p>}
  <div className="panel mb-6">
   <div className="flex justify-between items-center mb-3 flex-wrap gap-3"><strong className="text-lg">Svi tekstovi</strong><Link className="btn" href="?novo=1">Novi tekst</Link></div>
   {posts.length===0&&<p className="muted">Još nema tekstova.</p>}
   <div className="space-y-2">{posts.map(x=>{const t=lat(x.translations);return <Link key={x.id} href={`?edit=${x.id}`} className="flex gap-4 items-center flex-wrap" style={{padding:'10px 14px',borderRadius:12,border:'1px solid '+(x.id===edit?'#fff':'#2c3254')}}>
    <span className="muted text-sm" style={{width:110}}>{fmt(x.date)}</span><span style={{flex:1,minWidth:200,fontWeight:600}}>{(t?.title??x.slug).replace(/\{\{lat:([^}]*)\}\}/g,'$1')}</span>
    <span className="text-sm" style={{color:x.state==='PUBLISHED'?'#7fe0bd':'#aab4d0'}}>{x.state==='PUBLISHED'?(x.date&&x.date>today?'Objavljeno (čeka svoj dan)':'Objavljeno'):'Nacrt'}{x.position?` · mesto ${x.position}`:''}</span></Link>})}</div>
  </div>
  {show&&<form action={saveText} className="panel" key={p?.id??'novi'}><input type="hidden" name="id" value={p?.id??''}/>
   <h2 className="text-2xl font-bold mb-4">{p?'Izmena teksta':'Novi tekst'}</h2>
   <ScriptField name="title" label="Naslov" defaultValue={tr?.title} maxLength={200} required/>
   <ScriptField name="lead" label="Lid (uvodni pasus, krupnije slovo ispod naslova)" defaultValue={tr?.lead} rows={4} maxLength={700}/>
   <ScriptField noPreview format name="body" label="Tekst" defaultValue={tr?.body} rows={20} maxLength={60000}/>
   <p className="muted text-sm mb-4" style={{lineHeight:1.7}}>Novi pasus počinje posle <b>praznog reda</b>. Link: <b>[tekst linka](https://adresa)</b>. Slika u tekstu: <b>[[slika 1]]</b> u posebnom redu, tamo gde treba da stoji (slike se dodaju niže). Vreme čitanja se računa samo.</p>
   <div className="inputrow" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
    <div className="field"><label>Datum objave (od kog dana se vidi)</label><input type="date" name="date" defaultValue={p?.date??today} required/></div>
    <StatusSelect defaultValue={p?.state==='PUBLISHED'?'PUBLISHED':'DRAFT'} options={OPTS}/>
    <div className="field"><label>Mesto na sajtu</label><select name="position" defaultValue={p?.position??''} style={{height:44,boxSizing:'border-box',fontSize:'13.3333px',fontFamily:'inherit'}}><option value="">Automatski (po datumu)</option><option value="1">1. tekst (glavni, levo)</option><option value="2">2. tekst (desno, gore)</option><option value="3">3. tekst (desno, dole)</option></select></div></div>
   <div className="inputrow" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
    <ImagePicker label="Glavna slika (16:9)" current={p?.imageUrl}/>
    <div className="field"><label>Opis slike (za slepe i slabovide)</label><input name="imageAlt" maxLength={250} defaultValue={p?.imageAlt}/></div>
    <div className="field"><label>Autor (prazno = ne prikazuje se)</label><input name="author" defaultValue={p?.author??'Radio 10k - redakcija'} maxLength={200}/></div></div>
   <h3 className="text-lg font-bold mb-2">Slike u tekstu (do tri)</h3>
   <div className="inputrow" style={{gridTemplateColumns:'repeat(3,1fr)'}}>{[1,2,3].map(i=><div key={i}>
    <ImagePicker label={`Slika ${i} — u tekstu napiši [[slika ${i}]]`} current={imgs[i-1]?.url||null} fileName={`bodyFile${i}`} urlName={`bodyUrl${i}`} removeName={`bodyRemove${i}`}/>
    <div className="field"><label>Opis slike {i}</label><input name={`bodyAlt${i}`} maxLength={250} defaultValue={imgs[i-1]?.alt??''}/></div></div>)}</div>
   <div className="flex gap-4 items-center justify-between"><button className="btn">Sačuvaj tekst</button>{p&&<DeleteButton action={deleteText} label="Obriši tekst"/>}</div>
  </form>}
 </>}
