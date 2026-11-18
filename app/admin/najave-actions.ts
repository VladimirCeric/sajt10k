'use server';
import {db} from '@/lib/db';import {requireEditor} from '@/lib/auth';import {redirect} from 'next/navigation';import {revalidatePath} from 'next/cache';import {z} from 'zod';
import {gameById} from '@/lib/games';import {saveImage} from '@/lib/upload';import {bothScripts} from '@/lib/translit';import {fromBelgrade} from '@/lib/visibility';
const str=(f:FormData,k:string)=>String(f.get(k)??'').trim();
const date=(f:FormData,k='date')=>z.iso.date().parse(str(f,k));
const webUrl=z.union([z.literal(''),z.string().url().refine(v=>v.startsWith('https://'),'Potreban je HTTPS')]);
function stateOf(f:FormData){const s=str(f,'state');
 if(s==='PUBLISHED')return {state:'PUBLISHED' as const,showFrom:null as Date|null};
 return {state:'DRAFT' as const,showFrom:null as Date|null}}
function back(d:string,msg='ok'):never{revalidatePath('/','layout');redirect(`/admin/najave?date=${d}&msg=${msg}`)}

export async function saveAnnouncement(f:FormData){await requireEditor();
 const d=date(f),showId=str(f,'showId');const show=await db.show.findUnique({where:{id:showId}});if(!show)throw new Error('Nepoznata emisija');
 const t=bothScripts(str(f,'title').slice(0,140)),x=bothScripts(str(f,'text').slice(0,320));
 const tr=[{locale:'sr-cyrl',title:t.cyr||show.slug,description:x.cyr},{locale:'sr-latn',title:t.lat||show.slug,description:x.lat}];
 const cur=str(f,'imageUrl'),up=await saveImage(f.get('imageFile'));const imageUrl=up??(f.get('removeImage')==='on'?null:(cur.startsWith('/uploads/')?cur:webUrl.parse(cur)||null)),imageAlt=str(f,'imageAlt').slice(0,250);
 const no=str(f,'episodeNo'),episodeNo=no?z.coerce.number().int().min(1).max(999).parse(no):null;
 const sm=str(f,'slotMinute'),slotMinute=sm===''?null:z.coerce.number().int().min(0).max(59).parse(sm),host=(f.has('host1')?[str(f,'host1'),str(f,'host2')].filter(Boolean).join(' i '):str(f,'host')).slice(0,250),skip=f.get('skip')==='on';
 const st=stateOf(f);const data={showId,airDate:d,imageUrl,imageAlt,episodeNo,host,slotMinute,skip,...st,publishedAt:st.state==='PUBLISHED'?new Date():null};
 const existing=await db.episode.findFirst({where:{showId,airDate:d}});
 if(existing)await db.episode.update({where:{id:existing.id},data:{...data,translations:{deleteMany:{},create:tr}}});
 else{let slug=`${show.slug}-${d}`;if(await db.episode.findUnique({where:{slug}}))slug+=`-${Date.now().toString(36)}`;await db.episode.create({data:{...data,slug,translations:{create:tr}}})}
 back(d)}

export async function addExtra(f:FormData){await requireEditor();const d=date(f),showId=str(f,'showId');const show=await db.show.findUnique({where:{id:showId}});if(!show)throw new Error('Nepoznata emisija');
 if(await db.episode.findFirst({where:{showId,airDate:d}}))back(d,'exists');
 const minute=z.coerce.number().int().min(0).max(59).parse(str(f,'slotMinute')||'0');let slug=`${show.slug}-${d}`;if(await db.episode.findUnique({where:{slug}}))slug+=`-${Date.now().toString(36)}`;
 await db.episode.create({data:{showId,slug,airDate:d,slotMinute:minute,state:'DRAFT',translations:{create:[{locale:'sr-cyrl',title:show.slug,description:''},{locale:'sr-latn',title:show.slug,description:''}]}}});back(d)}

export async function removeAnnouncement(f:FormData){await requireEditor();const d=date(f);await db.episode.deleteMany({where:{showId:str(f,'showId'),airDate:d}});back(d,'deleted')}

export async function copyDay(f:FormData){await requireEditor();const to=date(f,'date'),from=date(f,'from');
 const src=await db.episode.findMany({where:{airDate:from},include:{translations:true}});let n=0;
 for(const e of src){if(await db.episode.findFirst({where:{showId:e.showId,airDate:to}}))continue;
  const show=await db.show.findUnique({where:{id:e.showId}});if(!show)continue;let slug=`${show.slug}-${to}`;if(await db.episode.findUnique({where:{slug}}))slug+=`-${Date.now().toString(36)}`;
  await db.episode.create({data:{showId:e.showId,slug,airDate:to,imageUrl:e.imageUrl,imageAlt:e.imageAlt,episodeNo:e.episodeNo,state:'DRAFT',translations:{create:e.translations.map(t=>({locale:t.locale,title:t.title,description:t.description}))}}});n++}
 // Muzički specijal i zvuk noći se kopiraju na isti način (samo ako za izabrani dan još nema unosa).
 const feats=await db.dayFeature.findMany({where:{date:from},include:{translations:true}});
 for(const ft of feats){if(await db.dayFeature.findUnique({where:{kind_date:{kind:ft.kind,date:to}}}))continue;
  await db.dayFeature.create({data:{kind:ft.kind,date:to,imageUrl:ft.imageUrl,state:'DRAFT',translations:{create:ft.translations.map(t=>({locale:t.locale,title:t.title,text:t.text}))}}});n++}
 back(to,`copied${n}`)}

export async function saveFeature(f:FormData){await requireEditor();const d=date(f),kind=str(f,'kind');if(kind!=='special'&&kind!=='night')throw new Error('Nepoznata vrsta');
 const t=bothScripts(str(f,'title').slice(0,140)),x=bothScripts(str(f,'text').slice(0,320));if(!t.lat){await db.dayFeature.deleteMany({where:{kind,date:d}});back(d,'deleted')}
 const tr=[{locale:'sr-cyrl',title:t.cyr,text:x.cyr},{locale:'sr-latn',title:t.lat,text:x.lat}];const imageUrl=webUrl.parse(str(f,'imageUrl'))||null;const st=stateOf(f);
 await db.dayFeature.upsert({where:{kind_date:{kind,date:d}},update:{imageUrl,...st,translations:{deleteMany:{},create:tr}},create:{kind,date:d,imageUrl,...st,translations:{create:tr}}});
 back(d)}

export async function saveWeeklyChoice(f:FormData){await requireEditor();const weekStart=date(f,'weekStart'),game=str(f,'game'),d=str(f,'date');
 if(game==='auto')await db.weeklyGameChoice.deleteMany({where:{weekStart}});
 else{if(!gameById(game))throw new Error('Nepoznata igra');await db.weeklyGameChoice.upsert({where:{weekStart},update:{game},create:{weekStart,game}})}
 if(!d){revalidatePath('/','layout');redirect('/admin/igra-nedelje?msg=ok')}
 back(z.iso.date().parse(d))}

/* ---------- Raspored (tabela 3 x 7) ---------- */
const MINUTES=[0,15,30];const DAY_ORDER=[1,2,3,4,5,6,0];
export async function saveSchedule(f:FormData){await requireEditor();
 const data:{showId:string;dayOfWeek:number;startMinute:number;durationMinutes:number;repeatHours:string;isRerun:boolean;enabled:boolean}[]=[];
 for(const d of DAY_ORDER)for(const m of MINUTES){const showId=str(f,`cell_${d}_${m}`);if(!showId)continue;data.push({showId,dayOfWeek:d,startMinute:m,durationMinutes:15,repeatHours:'9,12,15,18',isRerun:f.get(`rerun_${d}_${m}`)==='on',enabled:true})}
 await db.$transaction([db.scheduleSlot.deleteMany({}),db.scheduleSlot.createMany({data})]);revalidatePath('/','layout');redirect('/admin/schedule?msg=ok')}

const START:Record<string,[string,string,string]>={ // slug -> [ikona, ćirilica, latinica]
 'time-travel':['🕰','Путовање кроз време','Putovanje kroz vreme'],'topic-of-week':['🧠','Тема недеље','Tema nedelje'],'na-dlanu':['🤲','На длану','Na dlanu'],
 'five-and-five':['🎙','5 редом и 5 рендом','5 redom i 5 rendom'],'fonorama':['🎧','Фонорама','Fonorama'],'cirkus':['🎪','Циркус','Cirkus'],'movies':['🍿','Кокице и блејице','Kokice i blejice'],'niti':['🧵','Нити','Niti']};
/** Početni raspored po mokapu (ne briše emisije; pravi one koje nedostaju). */
export async function resetSchedule(){await requireEditor();
 const ids:Record<string,string>={};let order=0;
 for(const [slug,[icon,cyr,lat]] of Object.entries(START)){order++;const ex=await db.show.findUnique({where:{slug}});
  if(ex){ids[slug]=ex.id;continue}
  const s=await db.show.create({data:{slug,icon,sortOrder:order,translations:{create:[{locale:'sr-cyrl',title:cyr,description:'',host:''},{locale:'sr-latn',title:lat,description:'',host:''}]}}});ids[slug]=s.id}
 await db.show.updateMany({where:{slug:'forum'},data:{active:false}});
 const row=(day:number,min:number,slug:string,rerun=false)=>({showId:ids[slug],dayOfWeek:day,startMinute:min,durationMinutes:15,repeatHours:'9,12,15,18',isRerun:rerun,enabled:true});
 const slots=[];for(const d of [0,1,2,3,4,5,6])slots.push(row(d,0,'time-travel'));
 for(const d of [1,2,3,4,5])slots.push(row(d,15,'topic-of-week'));slots.push(row(6,15,'movies',true),row(0,15,'cirkus',true));
 slots.push(row(1,30,'na-dlanu'),row(2,30,'fonorama'),row(3,30,'cirkus'),row(4,30,'movies'),row(5,30,'niti'),row(6,30,'fonorama',true),row(0,30,'niti',true));
 await db.$transaction([db.scheduleSlot.deleteMany({}),db.scheduleSlot.createMany({data:slots})]);revalidatePath('/','layout');redirect('/admin/schedule?msg=reset')}

/* ---------- Emisije ---------- */
const slugify=(s:string)=>s.toLowerCase().replace(/đ/g,'dj').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'emisija';
export async function saveShowSimple(f:FormData){await requireEditor();const id=str(f,'id');
 const t=bothScripts(str(f,'title').slice(0,140)),x=bothScripts(str(f,'description').slice(0,600));if(!t.lat)throw new Error('Naziv je obavezan');
 const cur=str(f,'imageUrl'),up=await saveImage(f.get('imageFile'));const imageUrl=up??(f.get('removeImage')==='on'?null:(cur||null)),icon=str(f,'icon').slice(0,12)||'🎙',active=f.get('active')==='on';
 const tr=[{locale:'sr-cyrl',title:t.cyr,description:x.cyr,host:''},{locale:'sr-latn',title:t.lat,description:x.lat,host:''}];
 if(id)await db.show.update({where:{id},data:{icon,imageUrl,active,translations:{deleteMany:{},create:tr}}});
 else{let slug=slugify(t.lat.replace(/\{\{lat:([^}]*)\}\}/g,'$1'));if(await db.show.findUnique({where:{slug}}))slug+=`-${Date.now().toString(36)}`;const n=await db.show.count();await db.show.create({data:{slug,icon,imageUrl,active,sortOrder:n+1,translations:{create:tr}}})}
 revalidatePath('/','layout');redirect('/admin/shows?msg=ok')}
