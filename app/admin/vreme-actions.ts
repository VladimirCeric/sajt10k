'use server';
import {db} from '@/lib/db';import {requireEditor} from '@/lib/auth';import {redirect} from 'next/navigation';import {revalidatePath} from 'next/cache';
import {RULES,WEATHER_KEY} from '@/lib/weather';import {cyrToLat} from '@/lib/translit';

export async function saveWeatherTexts(f:FormData){await requireEditor();
 const ov:Record<string,string>={};
 for(const r of RULES){
  const raw=String(f.get('t_'+r.id)??'').trim().slice(0,160);
  const lat=/[Ѐ-ӿ]/.test(raw)?cyrToLat(raw):raw;
  if(lat&&lat!==r.text)ov[r.id]=lat;
 }
 await db.setting.upsert({where:{key:WEATHER_KEY},update:{value:JSON.stringify(ov)},create:{key:WEATHER_KEY,value:JSON.stringify(ov)}});
 revalidatePath('/','layout');redirect('/admin/vreme?msg=ok');
}
export async function resetWeatherTexts(){await requireEditor();
 await db.setting.deleteMany({where:{key:WEATHER_KEY}});
 revalidatePath('/','layout');redirect('/admin/vreme?msg=reset');
}
