import {db} from './db';
import {latToCyr,stripMarkers} from './translit';
import {fromBelgrade} from './visibility';
/** Prekidači sajta iz Podešavanja: link u meniju za Podkast i O nama, i privremena strana umesto sajta. */
export const SW={pod:'nav_podcast',about:'nav_about',temp:'temp_on',tempTexts:'temp_texts'};
export const TEMP_DEFAULT={h:'Radio ponovo radi!',s:'Novi sajt i radio 10K stižu uskoro. Još malo strpljenja.'};
export type TempSaved={lat?:{h?:string;s?:string};cyr?:{h?:string;s?:string};date?:string};
export function parseTemp(raw?:string|null):TempSaved{try{const o=JSON.parse(raw||'{}');return o&&typeof o==='object'?o:{}}catch{return {}}}
export async function getSwitches(){
 const rows=await db.setting.findMany({where:{key:{in:Object.values(SW)}}}),m=Object.fromEntries(rows.map(r=>[r.key,r.value]));
 return {pod:m[SW.pod]==='1',about:m[SW.about]!=='0',temp:m[SW.temp]==='1',saved:parseTemp(m[SW.tempTexts])};
}
/** Tekst privremene strane za dato pismo i trenutak kraja odbrojavanja (null = bez odbrojavanja ili je prošao). */
export function tempView(saved:TempSaved,locale:string){
 const cyr=locale==='sr-cyrl',h=saved.lat?.h||TEMP_DEFAULT.h,s=saved.lat?.s||TEMP_DEFAULT.s;
 const pick=(l:string|undefined,c:string|undefined,def:string)=>cyr?(c||latToCyr(l||def)):stripMarkers(l||def);
 const d=saved.date?fromBelgrade(saved.date):null,end=d&&d.getTime()>Date.now()?d.getTime():null;
 return {h:pick(saved.lat?.h,saved.cyr?.h,TEMP_DEFAULT.h),s:pick(saved.lat?.s,saved.cyr?.s,TEMP_DEFAULT.s),endMs:end,dateLocal:saved.date||''};
}
