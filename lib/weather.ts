import {latToCyr} from '@/lib/translit';

/** Beograd (Voždovac). Svi posetioci vide isto vreme; ne lociramo ih. */
const LAT=44.76,LON=20.48;
export type W={temp:number;feels:number;hum:number;precip:number;snow:number;cloud:number;gust:number;wind:number;code:number;day:boolean;pnext:number};

const URL=`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}`
 +'&current=temperature_2m,apparent_temperature,relative_humidity_2m,is_day,precipitation,snowfall,weather_code,cloud_cover,wind_speed_10m,wind_gusts_10m'
 +'&hourly=precipitation_probability&forecast_hours=4&timezone=Europe%2FBelgrade&wind_speed_unit=kmh';

let last:{at:number;w:W}|null=null;
/** Jedan poziv na ~15 min (keš), uz rezervu: ako servis ne odgovori, do 3 sata koristi poslednji dobar podatak. */
export async function getWeather():Promise<W|null>{
 try{
  const r=await fetch(URL,{next:{revalidate:900},signal:AbortSignal.timeout(4000)});
  if(!r.ok)throw new Error(String(r.status));
  const j=await r.json(),c=j.current,p:number[]=(j.hourly?.precipitation_probability??[]).filter((x:unknown)=>typeof x==='number');
  const w:W={temp:c.temperature_2m,feels:c.apparent_temperature,hum:c.relative_humidity_2m,precip:c.precipitation??0,snow:c.snowfall??0,cloud:c.cloud_cover,gust:c.wind_gusts_10m??0,wind:c.wind_speed_10m??0,code:c.weather_code,day:c.is_day===1,pnext:Math.max(0,...p.slice(1,4))};
  if(![w.temp,w.feels,w.hum,w.cloud,w.code].every(x=>typeof x==='number'))throw new Error('bad');
  last={at:Date.now(),w};return w;
 }catch{return last&&Date.now()-last.at<3*3600e3?last.w:null}
}

const rain=(w:W)=>(w.code>=51&&w.code<=67)||(w.code>=80&&w.code<=82);
const snowy=(w:W)=>(w.code>=71&&w.code<=77)||w.code===85||w.code===86;
const dry=(w:W)=>w.precip===0&&!rain(w)&&!snowy(w)&&w.code<95;
const clear=(w:W)=>w.code===0||w.code===1;

export type Rule={id:string;name:string;cond:string;p:number;text:string;test:(w:W)=>boolean};
const R=(id:string,name:string,cond:string,p:number,text:string,test:(w:W)=>boolean):Rule=>({id,name,cond,p,text,test});
/** Prikazuje se komentar sa najmanjim p među ispunjenim uslovima; pri istom p pobeđuje onaj ranije u listi. */
export const RULES:Rule[]=[
 R('U1','Oluja ili grad (ozbiljno)','šifra 96 ili 99, ili udari ≥ 90 km/h',0,'Napolju je opasno vreme. Ostani na sigurnom.',w=>w.code===96||w.code===99||w.gust>=90),
 R('U2','Izuzetna hladnoća','osećaj ≤ −15 °C',0,'Toplije je u zamrzivaču, ne izlazi ako ne moraš.',w=>w.feels<=-15),
 R('U3','Izuzetna vrućina','temperatura ≥ 38 °C',0,'Pakleno je. Pićence i drži se hlada.',w=>w.temp>=38),
 R('01','Kiša + jak vetar','kiša i udari ≥ 55 km/h',1,'„Pasje“ vreme.',w=>rain(w)&&w.gust>=55),
 R('02','Vrućina + sparina','≥ 30 °C i vlažnost ≥ 60 %',1,'Ne može da se diše, topljenje.',w=>w.temp>=30&&w.hum>=60),
 R('03','Grmljavina','šifra 95',1,'Grmi i seva. Radio je bezbedniji od kišobrana.',w=>w.code===95),
 R('04','Jak sneg','šifra 73, 75 ili 86, ili sneg ≥ 1 cm/h',1,'Mećava je. Ostani gde je toplo, slušaj 10ku.',w=>[73,75,86].includes(w.code)||w.snow>=1),
 R('05','Ledena kiša','šifra 56, 57, 66 ili 67',1,'Ledena kiša. Imaš li klizaljke? Hodaj kao pingvin.',w=>[56,57,66,67].includes(w.code)),
 R('06','Jaka kiša','padavine ≥ 4 mm/h ili šifra 65',2,'Ako ne moraš, sačekaj malo da prođe ova kiša.',w=>w.precip>=4||w.code===65),
 R('07','Jak vetar','udari ≥ 55 km/h',2,'Zakopčaj se, navuci kapuljaču – baš nosi.',w=>w.gust>=55),
 R('08','Jaka hladnoća','temperatura < −5 °C',2,'A kukali smo letos… Ako izlaziš, obuci se dobro.',w=>w.temp<-5),
 R('09','Pljusak','šifra 80, 81 ili 82',2,'Pljusak! Brzo prolazi, sačekaj pod krovom.',w=>[80,81,82].includes(w.code)),
 R('10','Magla','šifra 45 ili 48',2,'Magla je. Ne vidi se prst pred okom.',w=>w.code===45||w.code===48),
 R('11','Vruće (suvo)','30–38 °C i vlažnost < 60 %',2,'Vruće je. Hlad, piće i dobra muzika.',w=>w.temp>=30&&w.temp<38&&w.hum<60),
 R('12','Hladna kiša','kiša i temperatura < 5 °C',2,'Hladno i mokro. Ćebe, čaj, radio.',w=>rain(w)&&w.temp<5),
 R('17','Kiša uskoro','bez padavina, verovatnoća ≥ 60 % u naredna 3 sata, temp. > 1 °C',3,'Pevale su dodole, verovatno će kiša.',w=>dry(w)&&w.pnext>=60&&w.temp>1),
 R('18','Sneg uskoro','bez padavina, verovatnoća ≥ 60 % u naredna 3 sata, temp. ≤ 1 °C',3,'Miriše na sneg.',w=>dry(w)&&w.pnext>=60&&w.temp<=1),
 R('13','Mraz','temperatura od −5 do 0 °C',3,'Toplije je u frižideru.',w=>w.temp>=-5&&w.temp<=0),
 R('14','Slaba kiša','bilo koja kiša koja nije jača',3,'Možda bolje da poneseš kišobran.',w=>rain(w)),
 R('15','Topla kiša','kiša i temperatura ≥ 20 °C',3,'Topla kiša. Pokisni slobodno, osušićeš se.',w=>rain(w)&&w.temp>=20),
 R('16','Slab sneg','šifra 71, 77 ili 85',3,'Pada sneg. Čaj i radio idu zajedno.',w=>snowy(w)),
 R('19','Sparno','26–30 °C i vlažnost ≥ 70 %',3,'Malo je lepljivo.',w=>w.temp>=26&&w.temp<=30&&w.hum>=70),
 R('20','Vetrovito','udari 35–55 km/h',4,'Malo duva, frizura neće preživeti.',w=>w.gust>=35&&w.gust<55),
 R('21','Sunčano, ali hladno','vedro, dan, < 10 °C',4,'Što bi rekli „zubato sunce“, ogrni se.',w=>clear(w)&&w.day&&w.temp<10),
 R('22','Sunčano i vruće','vedro, dan, 27–30 °C',4,'Sunce prži, hlad se ceni.',w=>clear(w)&&w.day&&w.temp>=27&&w.temp<30),
 R('23','Hladno i oblačno','oblačnost ≥ 85 %, dan, < 8 °C',4,'Sivilo. Zabavi se uz nas.',w=>w.cloud>=85&&w.day&&w.temp<8),
 R('24','Hladna noć','noć, < 5 °C, bez padavina',4,'Hladna noć. Ogrni se ćebencetom.',w=>!w.day&&w.temp<5&&dry(w)),
 R('25','Topla noć','noć, ≥ 20 °C, bez padavina',4,'Topla noć. Otvori prozor i pojačaj radio.',w=>!w.day&&w.temp>=20&&dry(w)),
 R('26','Sunčano i prijatno','vedro, dan, 10–27 °C',5,'Lepo je, ponesi naočare za sunce.',w=>clear(w)&&w.day&&w.temp>=10&&w.temp<27),
 R('27','Delimično oblačno','šifra 2, dan',5,'Malo sunca, malo oblaka. Taman za šetnju.',w=>w.code===2&&w.day),
 R('28','Potpuno oblačno','oblačnost ≥ 85 %, dan',5,'Sve je sivo, makar je muzika OK.',w=>w.cloud>=85&&w.day),
 R('29','Vedra noć','vedro, noć',5,'Vedra noć. Pogledaj gore i slušaj nas.',w=>clear(w)&&!w.day),
 R('30','Oblačna noć','noć, oblačnost ≥ 50 %',5,'Noć je oblačna: nema zvezda, ali mi smo tu.',w=>!w.day&&w.cloud>=50),
 R('R','Rezerva','ništa drugo ne odgovara',9,'Kakvo god da je vreme, muzika je tu.',()=>true),
];

export const WEATHER_KEY='weather_comments';
export function parseOverrides(raw?:string|null):Record<string,string>{try{const o=JSON.parse(raw||'{}');return o&&typeof o==='object'?o:{}}catch{return{}}}
export function textOf(r:Rule,ov:Record<string,string>){const t=ov[r.id];return typeof t==='string'&&t.trim()?t.trim():r.text}
export function pickRule(w:W):Rule{
 let best:Rule|null=null;
 for(const r of RULES)if(r.test(w)&&(!best||r.p<best.p))best=r;
 return best!;
}

export type IconName='sunce'|'mesec'|'sunce-oblak'|'mesec-oblak'|'oblak'|'magla'|'kisa'|'pljusak'|'ledena-kisa'|'malo-snega'|'sneg'|'grmljavina'|'vetar';
export function iconOf(w:W):{icon:IconName;label:string}{
 const c=w.code,d=w.day;
 if(c<=3&&w.wind>=40)return{icon:'vetar',label:'vetrovito'};
 if(c<=1)return{icon:d?'sunce':'mesec',label:'vedro'};
 if(c===2)return{icon:d?'sunce-oblak':'mesec-oblak',label:'delimično oblačno'};
 if(c===3)return{icon:'oblak',label:'oblačno'};
 if(c===45||c===48)return{icon:'magla',label:'magla'};
 if([56,57,66,67].includes(c))return{icon:'ledena-kisa',label:'ledena kiša'};
 if([65,80,81,82].includes(c))return{icon:'pljusak',label:'pljusak'};
 if(c>=51&&c<=63)return{icon:'kisa',label:'kiša'};
 if([71,77,85].includes(c))return{icon:'malo-snega',label:'slab sneg'};
 if([73,75,86].includes(c))return{icon:'sneg',label:'sneg'};
 if(c>=95)return{icon:'grmljavina',label:'grmljavina'};
 return{icon:d?'sunce-oblak':'mesec-oblak',label:'promenljivo'};
}
export const inScript=(s:string,locale:string)=>locale==='sr-cyrl'?latToCyr(s):s;
export const tempText=(t:number)=>{const n=Math.round(t);return `${n<0?'−':''}${Math.abs(n)}°`};
