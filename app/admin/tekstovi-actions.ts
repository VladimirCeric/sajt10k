'use server';
import {db} from '@/lib/db';import {requireEditor} from '@/lib/auth';import {redirect} from 'next/navigation';import {revalidatePath} from 'next/cache';import {z} from 'zod';
import {latToCyr,cyrToLat} from '@/lib/translit';import {protectForScript} from '@/lib/text-body';import {saveImage} from '@/lib/upload';
const str=(f:FormData,k:string)=>String(f.get(k)??'').trim();
const slugify=(s:string)=>s.toLowerCase().replace(/đ/g,'dj').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'tekst';
const isCyr=(s:string)=>/[Ѐ-ӿ]/.test(s);
/** Latinica se čuva onako kako je upisana (sa oznakama {{lat:…}}), ćirilica se računa iz nje; i obrnuto ako je upisano ćirilicom. */
function pair(raw:string,protect=false){const s=raw.trim();
 if(isCyr(s))return {cyr:s,lat:cyrToLat(s)};
 return {cyr:latToCyr(protect?protectForScript(s):s),lat:s}}
const done=(id:string,msg='ok'):never=>{revalidatePath('/','layout');redirect(`/admin/posts?edit=${id}&msg=${msg}`)};

export async function saveText(f:FormData){await requireEditor();
 const id=str(f,'id'),date=z.iso.date().parse(str(f,'date')),state=str(f,'state')==='PUBLISHED'?'PUBLISHED' as const:'DRAFT' as const;
 const ti=pair(str(f,'title').slice(0,200));if(!ti.lat)throw new Error('Naslov je obavezan');
 const le=pair(str(f,'lead').slice(0,700)),bo=pair(str(f,'body').slice(0,60000),true);
 const old=id?await db.post.findUnique({where:{id}}):null;
 // naslovna slika
 const up=await saveImage(f.get('imageFile'),'tekstovi');
 const imageUrl=up??(f.get('removeImage')==='on'?null:(str(f,'imageUrl')||null));
 // do tri slike u tekstu
 let prev:{url:string;alt:string}[]=[];try{prev=JSON.parse(old?.bodyImages??'[]')}catch{}
 const bodyImages:{url:string;alt:string}[]=[];
 for(let i=1;i<=3;i++){const u=await saveImage(f.get(`bodyFile${i}`),'tekstovi');
  const url=u??(f.get(`bodyRemove${i}`)==='on'?'':(str(f,`bodyUrl${i}`)||prev[i-1]?.url||''));bodyImages.push({url,alt:str(f,`bodyAlt${i}`).slice(0,250)})}
 const data={imageUrl,imageAlt:str(f,'imageAlt').slice(0,250),author:str(f,'author').slice(0,200),position:[1,2,3].includes(Number(str(f,'position')))?Number(str(f,'position')):null,bodyImages:JSON.stringify(bodyImages),date,state,
  publishedAt:state==='PUBLISHED'?(old?.publishedAt??new Date()):null};
 const tr=[{locale:'sr-cyrl',title:ti.cyr,lead:le.cyr,body:bo.cyr},{locale:'sr-latn',title:ti.lat,lead:le.lat,body:bo.lat}];
 if(id){await db.post.update({where:{id},data:{...data,translations:{deleteMany:{},create:tr}}});return done(id)}
 let slug=`${slugify(ti.lat.replace(/\{\{lat:([^}]*)\}\}/g,'$1'))}-${date}`;if(await db.post.findUnique({where:{slug}}))slug+=`-${Date.now().toString(36)}`;
 const p=await db.post.create({data:{...data,slug,translations:{create:tr}}});done(p.id)}

export async function deleteText(f:FormData){await requireEditor();
 const id=str(f,'id');if(id)await db.post.delete({where:{id}});
 revalidatePath('/','layout');redirect('/admin/posts?msg=deleted')}
