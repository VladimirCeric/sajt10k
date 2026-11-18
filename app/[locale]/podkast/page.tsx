import {db} from '@/lib/db';
import {localeOf,localized,ui} from '@/lib/i18n';
import {podUi} from '@/lib/podcast-ui';
import PodcastPlayer,{type PodEp} from '@/components/PodcastPlayer';
export const dynamic='force-dynamic';
export default async function Podkast({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{ep?:string}>}){
 const locale=localeOf((await params).locale),t=ui[locale],p=podUi(locale),{ep}=await searchParams;
 const rows=await db.podcastEpisode.findMany({where:{published:true},include:{translations:true,show:{include:{translations:true}}},orderBy:[{date:{sort:'desc',nulls:'last'},},{createdAt:'desc'}]});
 const eps:PodEp[]=rows.map(r=>{const tr=localized(r.translations,locale),st=localized(r.show.translations,locale);
  const [y,m,d]=(r.date??'').split('-').map(Number);
  return {id:r.id,showId:r.showId,show:st?.title??r.show.slug,title:tr?.title??'',desc:tr?.description??'',img:r.imageUrl??r.show.imageUrl,icon:r.show.icon,
   date:r.date?`${d}. ${t.months[m-1]} ${y}.`:'',no:r.episodeNo,dur:r.durationSec,src:r.audioUrl}});
 const shows=[...new Map(eps.map(e=>[e.showId,{id:e.showId,name:e.show}])).values()];
 return <section aria-labelledby="pod-h" className="s-pod">
  <div><h1 id="pod-h" className="sf-head">{p.title}</h1><p className="s-pod-sub">{p.sub}</p></div>
  <PodcastPlayer eps={eps} shows={shows} ui={p} initial={ep}/>
 </section>}
