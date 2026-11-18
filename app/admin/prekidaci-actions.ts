'use server';
import {db} from '@/lib/db';import {requireEditor} from '@/lib/auth';import {redirect} from 'next/navigation';import {revalidatePath} from 'next/cache';
import {latToCyr,cyrToLat} from '@/lib/translit';import {SW,TEMP_DEFAULT} from '@/lib/site-switches';import {fromBelgrade} from '@/lib/visibility';
const str=(f:FormData,k:string)=>String(f.get(k)??'').trim();
const isCyr=(s:string)=>/[Ѐ-ӿ]/.test(s);
const pair=(raw:string)=>{const s=raw.trim();return isCyr(s)?{cyr:s,lat:cyrToLat(s)}:{cyr:latToCyr(s),lat:s}};
async function admin(){const u=await requireEditor();if(u.role!=='ADMIN')throw new Error('Administrator only')}
const put=(key:string,value:string)=>db.setting.upsert({where:{key},update:{value},create:{key,value}});
const back=(msg:string)=>{revalidatePath('/','layout');redirect(`/admin/settings?msg=${msg}`)};

export async function saveMenu(f:FormData){await admin();
 await put(SW.pod,f.get('nav_podcast')?'1':'0');await put(SW.about,f.get('nav_about')?'1':'0');back('menu')}

export async function saveTemp(f:FormData){await admin();
 const h=str(f,'t_h').slice(0,120),s=str(f,'t_s').slice(0,300),date=str(f,'t_date');
 const lat:Record<string,string>={},cyr:Record<string,string>={};
 if(h&&h!==TEMP_DEFAULT.h){const p=pair(h);lat.h=p.lat;cyr.h=p.cyr}
 if(s&&s!==TEMP_DEFAULT.s){const p=pair(s);lat.s=p.lat;cyr.s=p.cyr}
 await put(SW.tempTexts,JSON.stringify({lat,cyr,date:date&&fromBelgrade(date)?date:''}));
 await put(SW.temp,f.get('temp_on')?'1':'0');back('temp')}
