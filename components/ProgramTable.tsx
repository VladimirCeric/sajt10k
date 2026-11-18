import {db} from '@/lib/db';
import {localized,type Locale} from '@/lib/i18n';
import {programUi} from '@/lib/program-ui';
import {belgradeParts} from '@/lib/schedule';
import ProgramGrid,{type PCell} from '@/components/ProgramGrid';
const ORDER=[1,2,3,4,5,6,0],MINUTES=[0,15,30];
/** „Naš program“: nedeljna tabela .00 / .15 / .30 × dani (iz stranice Admin → Naš program). */
export default async function ProgramTable({locale,days}:{locale:Locale;days:readonly string[]}){
 const ui=programUi(locale);
 const slots=await db.scheduleSlot.findMany({where:{enabled:true,show:{active:true}},include:{show:{include:{translations:true}}}});
 const cells:Record<string,PCell[]>={};
 for(const s of slots){const tr=localized(s.show.translations,locale);const k=`${s.dayOfWeek}-${s.startMinute}`;
  (cells[k]??=[]).push({slotId:s.id,rerun:s.isRerun,show:{id:s.showId,title:tr?.title??s.show.slug,desc:tr?.description??'',icon:s.show.icon,img:s.show.imageUrl}})}
 return <section id="emisije" aria-labelledby="emisije-h" className="s-prog">
  <h2 id="emisije-h" className="sf-head">{ui.title}</h2>
  <ProgramGrid today={belgradeParts(new Date()).day} days={days} order={ORDER} minutes={MINUTES} cells={cells} ui={{minute:ui.minute,note:ui.note}} rerunText={ui.rerun.toLocaleUpperCase(locale==='sr-cyrl'?'sr-Cyrl':'sr-Latn')}/>
 </section>}
