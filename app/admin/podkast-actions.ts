'use server';
import {db} from '@/lib/db';import {requireEditor} from '@/lib/auth';import {redirect} from 'next/navigation';import {revalidatePath} from 'next/cache';
import {latToCyr,cyrToLat} from '@/lib/translit';import {saveImage,saveAudio,removeUpload} from '@/lib/upload';
const str=(f:FormData,k:string)=>String(f.get(k)??'').trim();
const isCyr=(s:string)=>/[Ѐ-ӿ]/.test(s);
const pair=(raw:string)=>{const s=raw.trim();return isCyr(s)?{cyr:s,lat:cyrToLat(s)}:{cyr:latToCyr(s),lat:s}};
const back=(msg:string,edit='')=>{revalidatePath('/','layout');redirect(`/admin/podkast?msg=${msg}${edit?`&edit=${edit}`:''}`)};

export async function savePodcast(f:FormData){await requireEditor();
 const id=str(f,'id'),showId=str(f,'showId');
 if(!await db.show.findUnique({where:{id:showId}}))throw new Error('Izaberi emisiju.');
 const title=pair(str(f,'title').slice(0,160));if(!title.lat)throw new Error('Naslov je obavezan.');
 const desc=pair(str(f,'description').slice(0,900));
 const old=id?await db.podcastEpisode.findUnique({where:{id}}):null;
 const upAudio=await saveAudio(f.get('audioFile'));
 const audioUrl=upAudio??old?.audioUrl??'';
 if(!audioUrl)throw new Error('Dodaj audio snimak.');
 const upImg=await saveImage(f.get('imageFile'),'podkast');
 const imageUrl=upImg??(f.get('removeImage')==='on'?null:(str(f,'imageUrl')||null));
 const date=/^\d{4}-\d{2}-\d{2}$/.test(str(f,'date'))?str(f,'date'):null;
 const no=Number(str(f,'episodeNo')),dur=Number(str(f,'durationSec'));
 const data={showId,audioUrl,imageUrl,date,episodeNo:Number.isInteger(no)&&no>0&&no<10000?no:null,
  durationSec:upAudio?(Number.isFinite(dur)&&dur>0?Math.round(dur):null):(old?.durationSec??(Number.isFinite(dur)&&dur>0?Math.round(dur):null)),
  published:str(f,'state')==='PUBLISHED'};
 const tr=[{locale:'sr-cyrl',title:title.cyr,description:desc.cyr},{locale:'sr-latn',title:title.lat,description:desc.lat}];
 let eid=id;
 if(id){await db.podcastEpisode.update({where:{id},data:{...data,translations:{deleteMany:{},create:tr}}});
  if(upAudio&&old?.audioUrl&&old.audioUrl!==upAudio)await removeUpload(old.audioUrl);
  if(old?.imageUrl&&old.imageUrl!==imageUrl)await removeUpload(old.imageUrl);
 }else eid=(await db.podcastEpisode.create({data:{...data,translations:{create:tr}}})).id;
 back('ok',eid)}

export async function deletePodcast(f:FormData){await requireEditor();
 const id=str(f,'id');const e=id?await db.podcastEpisode.findUnique({where:{id}}):null;
 if(e){await db.podcastEpisode.delete({where:{id}});await removeUpload(e.audioUrl);await removeUpload(e.imageUrl)}
 back('deleted')}
