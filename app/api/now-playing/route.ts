import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {belgradeParts,expandDay} from '@/lib/schedule';
import {localeOf} from '@/lib/i18n';
import {icecastStatusUrl,readIcecast} from '@/lib/icecast';
import {readdir} from 'fs/promises';
import path from 'path';
export const dynamic='force-dynamic';
const asObject=(v:unknown):Record<string,unknown>|null=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:null;
const asText=(v:unknown)=>typeof v==='string'?v.trim():'';
function maybeUrl(v:unknown,base:string):string|null{
 const raw=asText(v);
 if(!raw)return null;
 try{const u=new URL(raw,base);return /^https?:$/.test(u.protocol)?u.toString():null}catch{return null}
}
function pickArtworkFromJson(data:unknown,base:string):string|null{
 const keys=['artwork','cover','image','art','albumArt','album_art','artwork_url','cover_url','image_url'];
 const queue:unknown[]=[data];
 while(queue.length){
  const current=queue.shift();
  if(Array.isArray(current)){for(const item of current)queue.push(item);continue}
  const obj=asObject(current);if(!obj)continue;
  for(const key of keys){const hit=maybeUrl(obj[key],base);if(hit)return hit}
  for(const value of Object.values(obj))if(value&&typeof value==='object')queue.push(value);
 }
 return null;
}
async function readArtworkJson(url:string):Promise<string|null>{
 const response=await fetch(url,{signal:AbortSignal.timeout(3500),next:{revalidate:12},headers:{Accept:'application/json'}});
 if(!response.ok)return null;
 const data:unknown=await response.json();
 return pickArtworkFromJson(data,url);
}
const IMG_EXT=/\.(jpe?g|png|webp)$/i;
const normalize=(v:string)=>v.normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
let imageIndexCache:{at:number;rows:Array<{norm:string;url:string}>}|null=null;
async function localArtworkIndex():Promise<Array<{norm:string;url:string}>>{
 if(imageIndexCache&&Date.now()-imageIndexCache.at<60_000)return imageIndexCache.rows;
 const dir=path.join(process.cwd(),'uploads','radiodj');
 try{
  const files=await readdir(dir,{withFileTypes:true});
  const rows=files.filter(f=>f.isFile()&&IMG_EXT.test(f.name)).map(f=>({
   norm:normalize(f.name.replace(IMG_EXT,'')),
   url:`/uploads/radiodj/${f.name}`
  }));
  imageIndexCache={at:Date.now(),rows};
  return rows;
 }catch{return []}
}
async function localArtworkFor(artist:string,title:string):Promise<string|null>{
 const index=await localArtworkIndex();
 if(!index.length)return null;
 const a=normalize(artist||'');
 const t=normalize(title||'');
 const full=normalize([artist,title].filter(Boolean).join(' - '));
 const compact=normalize([artist,title].filter(Boolean).join(' '));
 const candidates=[full,compact,t].filter(Boolean);
 for(const c of candidates){
  const exact=index.find(x=>x.norm===c);
  if(exact)return exact.url;
  const loose=index.find(x=>x.norm.includes(c)||c.includes(x.norm));
  if(loose)return loose.url;
 }
 if(a&&t){
  const pair=index.find(x=>x.norm.includes(a)&&x.norm.includes(t));
  if(pair)return pair.url;
 }
 return null;
}
export async function GET(request:Request){
 const locale=localeOf(new URL(request.url).searchParams.get('locale')??'sr-cyrl');
 const now=belgradeParts(new Date());
 const [slots,exceptions,settings]=await Promise.all([
   db.scheduleSlot.findMany({include:{show:{include:{translations:true}}}}),
   db.scheduleException.findMany({where:{date:now.date}}),
   db.setting.findMany({where:{key:{in:['stream_url','stream_metadata_url','station_cover_url','stream_artwork_url']}}})
 ]);
 const schedule=expandDay(slots,now.date,now.day,locale,exceptions);
 const current=schedule.find(e=>e.start<=now.minute&&e.end>now.minute);
 const next=schedule.find(e=>e.start>now.minute);
 const options=Object.fromEntries(settings.map(s=>[s.key,s.value]));
 const streamUrl=options.stream_url??'';
 const metadataUrl=options.stream_metadata_url || icecastStatusUrl(streamUrl);
 const artworkUrl=options.stream_artwork_url||'';
 const fallbackArtwork=options.station_cover_url || '/logo-radio-10k-player.jpg';
 let artworkFromJson:string|null=null;
 let track=null;
 let icecastOnline=false;
 if(artworkUrl){
  try{artworkFromJson=await readArtworkJson(artworkUrl);}catch{/* Artwork JSON is optional. */}
 }
 if(metadataUrl){
  try {
   const result=await readIcecast(metadataUrl,streamUrl);
   if(result){
    icecastOnline=true;
    const artworkLocal=await localArtworkFor(result.artist,result.title);
    track={...result,artwork:artworkLocal||result.artwork||artworkFromJson};
   }
  } catch { /* Keep schedule and player working if Icecast is down. */ }
 }
 return NextResponse.json({
  current:current?{title:current.title,icon:current.icon,image:current.image,start:current.start,end:current.end}:null,
  next:next?{title:next.title,start:next.start}:null,
  track,icecastOnline,fallbackArtwork
 },{headers:{'Cache-Control':'public, max-age=0, s-maxage=15, stale-while-revalidate=15'}});
}
