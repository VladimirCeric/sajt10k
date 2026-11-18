import {latToCyr} from '@/lib/translit';
const LAT={title:'Naš program',minute:'Minut u satu',rerun:'Repriza',note:'Ovaj raspored važi za svaki termin emitovanja: u 9, 12, 15 i 18 časova.'};
export type ProgramUi=typeof LAT;
export const programUi=(locale:string):ProgramUi=>locale==='sr-cyrl'?Object.fromEntries(Object.entries(LAT).map(([k,v])=>[k,latToCyr(v)])) as ProgramUi:LAT;
