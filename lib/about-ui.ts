import {latToCyr} from '@/lib/translit';
const R='{{lat:Radio 10K}}';
export const ABOUT_DEFAULTS={
 title:'O nama',imgAlt:'Fotografija radija',
 lead:`${R} je studentski internet radio studijskog programa Audio i video tehnologije na VIŠER-u.`,
 p1:'Program prave studenti: osmišljavaju emisije, vode ih, snimaju ton, montiraju i uređuju muziku. Mentori iz nastave su tu da pomognu i da paze na kvalitet, ali ideje i glas su studentski. Ono što se uči na predavanjima i vežbama ovde odmah dobija slušaoce.',
 p2:'Dnevni program ide četiri puta, u 9, 12, 15 i 18 sati: tri emisije, svaka u svom terminu. Uveče su na redu muzički specijali, a noću svake večeri drugi zvuk za spavanje. Jednom nedeljno izlazi tekst rubrike Levo od Albukerkija, za čitanje dok svira radio, a na sajtu su i igre za pauzu.',
 p3:`${R} je neprofitan: nema reklama, ne ostvaruje prihod i postoji kao deo obrazovnog procesa. Sadržaj se pravi u skladu sa akademskim vrednostima i medijskom etikom.`,
 whyT:`Zašto postoji ${R}`,
 mission:'Misija',missionT:'Da studenti imaju prostor za kreativno izražavanje, razvoj profesionalnih veština i stvaranje zajednice.',
 vision:'Vizija',visionT:`Da ${R} postane prepoznatljiv studentski glas na internet radiju, glas budućih inženjera.`,
 goals:'Ciljevi',goalsT:'Predstavljanje studentskih projekata i aktivnosti, kvalitetan program koji informiše i zabavlja, i mesto susreta studenata i nastavnika.',
 students:'Studenti',studentsSub:'Trenutni sastav · Audio i video tehnologije',shows:'Emisije',
 former:'Ranije su sa nama radili',editorial:'Uredništvo',chief:'Glavni urednik i vođa projekta',editors:'Urednici'};
export type AboutUi=Record<keyof typeof ABOUT_DEFAULTS,string>;
export const ABOUT_KEY='about_texts';
const unmark=(s:string)=>s.replace(/\{\{lat:([^}]*)\}\}/g,'$1');
export type AboutSaved={lat?:Record<string,string>;cyr?:Record<string,string>};
export function parseAbout(raw?:string|null):AboutSaved{try{const o=JSON.parse(raw||'{}');return o&&typeof o==='object'?o:{}}catch{return{}}}
/** Tekstovi strane „O nama“: početni iz koda, preko njih ono što je sačuvano u Admin → O nama. */
export const aboutUi=(locale:string,saved:AboutSaved={}):AboutUi=>Object.fromEntries(Object.entries(ABOUT_DEFAULTS).map(([k,v])=>{
 if(locale==='sr-cyrl')return[k,unmark(saved.cyr?.[k]||latToCyr(v))];
 return[k,unmark(saved.lat?.[k]||v)];
})) as AboutUi;
