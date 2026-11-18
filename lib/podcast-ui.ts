import {latToCyr} from '@/lib/translit';
const LAT={title:'Podkast',sub:'Snimljene emisije koje možete da slušate kad vam odgovara.',all:'Sve emisije',episode:'Epizoda',list:'Epizode',
 play:'Pusti',pause:'Pauziraj',back:'Nazad 15 sekundi',fwd:'Napred 30 sekundi',speed:'Brzina',seek:'Premotavanje',empty:'Još nema epizoda.',error:'Snimak nije moguće pustiti.'};
export type PodUi=typeof LAT;
export const podUi=(locale:string):PodUi=>(locale==='sr-cyrl'?Object.fromEntries(Object.entries(LAT).map(([k,v])=>[k,latToCyr(v)])):LAT) as PodUi;
