'use server';
import {db} from '@/lib/db';import {requireEditor} from '@/lib/auth';import {redirect} from 'next/navigation';import {revalidatePath} from 'next/cache';
import {latToCyr,cyrToLat} from '@/lib/translit';import {saveImage} from '@/lib/upload';
import {ABOUT_DEFAULTS,ABOUT_KEY} from '@/lib/about-ui';
const str=(f:FormData,k:string)=>String(f.get(k)??'').trim();
const KINDS=['STUDENT','FORMER','CHIEF','EDITOR'];
const isCyr=(s:string)=>/[Ѐ-ӿ]/.test(s);
/** Latinica se čuva sa oznakama {{lat:…}}, ćirilica se računa; i obrnuto ako je upisano ćirilicom. */
const pair=(raw:string)=>{const s=raw.trim();return isCyr(s)?{cyr:s,lat:cyrToLat(s)}:{cyr:latToCyr(s),lat:s}};
const back=(msg='ok',edit='')=>{revalidatePath('/','layout');redirect(`/admin/o-nama?msg=${msg}${edit?`&edit=${edit}`:''}`)};
const year=(v:string)=>{const n=Number(v);return v&&Number.isInteger(n)&&n>=1990&&n<=2100?n:null};

export async function savePerson(f:FormData){await requireEditor();
 const id=str(f,'id'),kind=str(f,'kind');if(!KINDS.includes(kind))throw new Error('Nepoznata vrsta');
 const name=pair(str(f,'name').slice(0,120));if(!name.lat)throw new Error('Ime je obavezno');
 const role=pair(str(f,'role').slice(0,120)),shows=pair(str(f,'shows').slice(0,200)),bio=pair(str(f,'bio').slice(0,700));
 const up=await saveImage(f.get('imageFile'),'ljudi');
 const imageUrl=up??(f.get('removeImage')==='on'?null:(str(f,'imageUrl')||null));
 const data={kind,imageUrl,yearFrom:year(str(f,'yearFrom')),yearTo:year(str(f,'yearTo')),sortOrder:Math.max(0,Math.min(999,Number(str(f,'sortOrder'))||0)),active:f.get('active')==='on'};
 const tr=[{locale:'sr-cyrl',name:name.cyr,role:role.cyr,shows:shows.cyr,bio:bio.cyr},{locale:'sr-latn',name:name.lat,role:role.lat,shows:shows.lat,bio:bio.lat}];
 if(id){await db.person.update({where:{id},data:{...data,translations:{deleteMany:{},create:tr}}});return back('ok',id)}
 const p=await db.person.create({data:{...data,translations:{create:tr}}});back('ok',p.id)}

export async function deletePerson(f:FormData){await requireEditor();const id=str(f,'id');if(id)await db.person.delete({where:{id}});back('deleted')}

export async function saveAboutImage(f:FormData){await requireEditor();
 const up=await saveImage(f.get('imageFile'),'o-nama');
 const val=up??(f.get('removeImage')==='on'?'':str(f,'imageUrl'));
 await db.setting.upsert({where:{key:'about_image'},update:{value:val},create:{key:'about_image',value:val}});back('image')}

/** Početni podaci iz mokapa (samo kad još nema nijedne osobe). */
export async function seedPeople(){await requireEditor();
 if(await db.person.count())return back('ok');
 const S:[string,string,string,string][]=[
  ['Irina Bejatović','Voditeljka','Tema nedelje','Puštam muziku i fotografišem.'],
  ['Katarina Sapun','','','Iz Kule sam. Fotografišem, snimam kratke video zapise i ne odbijam karaoke.'],
  ['Vukašin Stojković','Voditelj','Putovanje kroz vreme','Muzika, grafički dizajn, putovanja i trening.'],
  ['Vladimir Milanović','','','Iz Pančeva. Čitam, pišem, gledam filmove i serije.'],
  ['Lazar Lazarević','','','Iz Kusatka. Muzika, filmovi, stripovi, a od svega toga najviše filozofija i antropologija.'],
  ['Veljko Kojić','','','Iz Zemuna. Najviše muzika, posle nje filmovi i igre.'],
  ['Mihailo Drmanović','','','Iz Dubleja. Pravim male elektronske projekte i igram video igre.']];
 const mk=(kind:string,i:number,n:string,r='',sh='',b='')=>{const a=pair(n),ro=pair(r),s=pair(sh),bi=pair(b);
  return db.person.create({data:{kind,sortOrder:i+1,translations:{create:[{locale:'sr-cyrl',name:a.cyr,role:ro.cyr,shows:s.cyr,bio:bi.cyr},{locale:'sr-latn',name:a.lat,role:ro.lat,shows:s.lat,bio:bi.lat}]}}})};
 for(let i=0;i<S.length;i++)await mk('STUDENT',i,...S[i]);
 await mk('CHIEF',0,'dr Vladimir Cerić');
 for(const [i,n] of ['Sanela Petković','Stefan Šućurović','Andrej Mladenović'].entries())await mk('EDITOR',i,n);
 back('ok')}

export async function saveAboutTexts(f:FormData){await requireEditor();
 const lat:Record<string,string>={},cyr:Record<string,string>={};
 for(const [k,def] of Object.entries(ABOUT_DEFAULTS)){
  const raw=str(f,'a_'+k).slice(0,900);if(!raw||raw===def)continue;
  const p=pair(raw);lat[k]=p.lat;cyr[k]=p.cyr;
 }
 const v=JSON.stringify({lat,cyr});
 await db.setting.upsert({where:{key:ABOUT_KEY},update:{value:v},create:{key:ABOUT_KEY,value:v}});back('texts')}
export async function resetAboutTexts(){await requireEditor();await db.setting.deleteMany({where:{key:ABOUT_KEY}});back('texts')}
