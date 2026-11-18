import type { ScheduleSlot,Show,ShowTranslation,ScheduleException } from '@prisma/client';
import type { Locale } from './i18n';
import { localized } from './i18n';
type Slot = ScheduleSlot & { show: Show & {translations:ShowTranslation[]} };
export type Occurrence = {key:string;date:string;start:number;end:number;title:string;icon:string;slug:string;rerun:boolean;image:string|null};
export function belgradeParts(now:Date) { const fmt = new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Belgrade',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23',weekday:'short'}); const parts=Object.fromEntries(fmt.formatToParts(now).map(x=>[x.type,x.value])); return {date:`${parts.year}-${parts.month}-${parts.day}`, day:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(parts.weekday),minute:Number(parts.hour)*60+Number(parts.minute)}; }
export function expandDay(slots:Slot[],date:string,day:number,locale:Locale,exceptions:ScheduleException[]=[]):Occurrence[] {
 const out:Occurrence[]=[];
 for (const slot of slots.filter(s=>s.enabled && s.dayOfWeek===day && s.show.active)) for(const hour of slot.repeatHours.split(',').map(x=>Number(x.trim())).filter(x=>Number.isInteger(x)&&x>=0&&x<24)) {
  const start=hour*60+slot.startMinute; if(start>=1440)continue;
  out.push({key:`${slot.id}:${hour}`,date,start,end:Math.min(1440,start+slot.durationMinutes),title:localized(slot.show.translations,locale)?.title??slot.show.slug,icon:slot.show.icon,slug:slot.show.slug,rerun:slot.isRerun,image:slot.show.imageUrl});
 }
 // Exceptions override any regular occurrences that overlap them.
 for(const ex of exceptions.filter(x=>x.date===date && x.enabled)) {
  const [h,m]=ex.startTime.split(':').map(Number); const start=h*60+m;
  const [eh,em]=ex.endTime?.split(':').map(Number)??[h,m+15]; const end=eh*60+em;
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)continue;
  for(let i=out.length-1;i>=0;i--)if(out[i].start<end && out[i].end>start)out.splice(i,1);
  if(ex.showId){const show=slots.find(x=>x.showId===ex.showId)?.show;out.push({key:ex.id,date,start,end,title:show?localized(show.translations,locale)?.title??show.slug:ex.note??'Special',icon:show?.icon??'📻',slug:show?.slug??'',rerun:false,image:show?.imageUrl??null});}
 }
 return out.sort((a,b)=>a.start-b.start);
}
export function clock(min:number){return `${String(Math.floor(min/60)).padStart(2,'0')}:${String(min%60).padStart(2,'0')}`;}
export function localDateOffset(date:string,offset:number){const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10);}
