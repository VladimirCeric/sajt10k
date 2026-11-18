import ImagePicker from '@/components/admin/ImagePicker';
import {db} from '@/lib/db';
import ScriptField from '@/components/admin/ScriptField';
import {saveShowSimple} from '../../najave-actions';
export default async function Emisije({searchParams}:{searchParams:Promise<{edit?:string;msg?:string}>}){
 const sp=await searchParams;const shows=await db.show.findMany({include:{translations:true},orderBy:{sortOrder:'asc'}});
 const lat=(s:typeof shows[number])=>s.translations.find(t=>t.locale==='sr-latn')??s.translations[0];const e=shows.find(x=>x.id===sp.edit),et=e?lat(e):undefined;
 return <>
  <h1 className="text-4xl font-bold my-8">Emisije</h1>
  {sp.msg==='ok'&&<p className="panel mb-4" role="status">Sačuvano.</p>}
  <p className="muted mb-4">Spisak emisija radija. Kada emisija ima najavu za neki dan, na sajtu se prikazuje ona; ovaj opis se koristi samo kad najave nema. Emisija se u tabelu postavlja u „Naš program“.</p>
  <section className="panel mb-6"><h2 className="text-2xl font-bold mb-4">{e?'Izmena emisije':'Nova emisija'}</h2>
   <form action={saveShowSimple}><input type="hidden" name="id" value={e?.id??''}/>
    <ScriptField name="title" label="Naziv" defaultValue={et?.title} maxLength={140} required/>
    <ScriptField name="description" label="Opis emisije (par rečenica: prikazuje se u „Našem programu“ kad se klikne na emisiju, i na naslovnoj kad nema najave)" defaultValue={et?.description} rows={3} maxLength={600}/>
    <div className="inputrow"><div className="field"><label>Ikona (emoji, ako nema slike)</label><input name="icon" defaultValue={e?.icon??'🎙'}/></div>
     <ImagePicker label="Slika emisije (1:1, kvadrat)" ratio="1/1" current={e?.imageUrl}/></div>
    <label><input className="!w-auto mr-2" type="checkbox" name="active" defaultChecked={e?.active??true}/>Aktivna (neaktivne se ne prikazuju i ne mogu u raspored)</label>
    <div className="mt-4"><button className="btn">Sačuvaj emisiju</button>{e&&<a className="pill ml-3" href="/admin/shows">Otkaži</a>}</div></form></section>
  <div className="space-y-3">{shows.map(x=><div className="panel flex justify-between items-center gap-3" key={x.id} style={{opacity:x.active?1:.5}}><span>{x.icon} {lat(x)?.title} {!x.active&&<span className="muted">(neaktivna)</span>}</span><a className="text-pink-300" href={`?edit=${x.id}`}>Izmeni</a></div>)}</div>
 </>}
