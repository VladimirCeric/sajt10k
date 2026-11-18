import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {belgradeParts,expandDay} from '@/lib/schedule';
import {localeOf} from '@/lib/i18n';
import {icecastStatusUrl,lookupArtwork,readIcecast} from '@/lib/icecast';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const locale=localeOf(new URL(request.url).searchParams.get('locale')??'sr-cyrl');
 const now=belgradeParts(new Date());
 const [slots,exceptions,settings]=await Promise.all([
   db.scheduleSlot.findMany({include:{show:{include:{translations:true}}}}),
   db.scheduleException.findMany({where:{date:now.date}}),
   db.setting.findMany({where:{key:{in:['stream_url','stream_metadata_url','station_cover_url']}}})
 ]);
 const schedule=expandDay(slots,now.date,now.day,locale,exceptions);
 const current=schedule.find(e=>e.start<=now.minute&&e.end>now.minute);
 const next=schedule.find(e=>e.start>now.minute);
 const options=Object.fromEntries(settings.map(s=>[s.key,s.value]));
 const streamUrl=options.stream_url??'';
 const metadataUrl=options.stream_metadata_url || icecastStatusUrl(streamUrl);
 let track=null;
 let icecastOnline=false;
 if(metadataUrl){
  try {
   const result=await readIcecast(metadataUrl,streamUrl);
   if(result){
    icecastOnline=true;
    const artwork=await lookupArtwork(result.artist,result.title);
    track={...result,artwork:artwork || options.station_cover_url || '/radio-cover.svg'};
   }
  } catch { /* Keep schedule and player working if Icecast is down. */ }
 }
 return NextResponse.json({
  current:current?{title:current.title,icon:current.icon,image:current.image,start:current.start,end:current.end}:null,
  next:next?{title:next.title,start:next.start}:null,
  track,icecastOnline,fallbackArtwork:options.station_cover_url || '/radio-cover.svg'
 },{headers:{'Cache-Control':'public, max-age=0, s-maxage=15, stale-while-revalidate=15'}});
}
