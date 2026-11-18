import {latToCyr} from '@/lib/translit';
const LAT={title:'Levo od Albukerkija',sub:'Novi tekst svake srede',prev:'Prethodni tekstovi',thisWeek:'Ove nedelje',read:'Vreme čitanja',
 show:'Prikaži ceo tekst ↓',close:'Zatvori tekst ↑',note:'Ostatak se otvara ovde, bez prelaska na drugu stranu',open:'Pročitaj',
 aboutT:'O rubrici',about:'Priče koje se dešavaju izvan centra: male, neobične i proverene, one koje glavni mediji preskoče. Jedna nedeljno, taman za pesmu ili dve. Pusti radio, pa čitaj uz muziku.',author:'Autor'};
export type AlbUi=typeof LAT;
export const albUi=(locale:string):AlbUi=>locale==='sr-cyrl'?Object.fromEntries(Object.entries(LAT).map(([k,v])=>[k,latToCyr(v)])) as AlbUi:LAT;
