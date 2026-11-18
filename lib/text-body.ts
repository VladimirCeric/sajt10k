import {latToCyr,stripMarkers} from '@/lib/translit';
/**
 * Telo teksta (rubrika „Levo od Albukerkija“) je običan tekst:
 *  - novi pasus = prazan red
 *  - podnaslov = red koji počinje sa „## “
 *  - slika = [[slika 1]], [[slika 2]], [[slika 3]] (slike se dodaju iznad, u polju za slike u tekstu)
 *  - link = [tekst](https://adresa)
 *  - **podebljano**, *kurziv*, ***podebljano i kurziv***
 */
export type Inline={text:string;href?:string;b?:boolean;i?:boolean};
export type Block={t:'p';parts:Inline[]}|{t:'h';text:string}|{t:'img';url:string;alt:string};
export type BodyImage={url:string;alt:string};

/** Pre prevođenja na drugo pismo: adrese i oznake slika ostaju netaknute. */
export function protectForScript(s:string){
 return s.replace(/\]\(([^)\s]+)\)/g,(_,u)=>`]({{lat:${u}}})`).replace(/\[\[\s*(slika|слика)\s*(\d)\s*\]\]/gi,(_,w,n)=>`{{lat:[[slika ${n}]]}}`)}

/** ***podebljano i kurziv***, **podebljano**, *kurziv* unutar običnog teksta. */
function emph(t:string):Inline[]{const out:Inline[]=[];const re=/\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|\*([^*]+)\*/g;let last=0,m:RegExpExecArray|null;
 while((m=re.exec(t))){if(m.index>last)out.push({text:t.slice(last,m.index)});
  out.push(m[1]?{text:m[1],b:true,i:true}:m[2]?{text:m[2],b:true}:{text:m[3],i:true});last=m.index+m[0].length}
 if(last<t.length)out.push({text:t.slice(last)});return out}
export function parseBody(raw:string,images:BodyImage[]):Block[]{
 const out:Block[]=[];
 for(const chunk0 of raw.replace(/\r/g,'').split(/\n\s*\n/)){let b=chunk0.trim();if(!b)continue;
  // podnaslov može stajati i u istom bloku neposredno iznad pasusa
  const hm=b.match(/^##\s*([^\n]+)\n+([\s\S]+)$/);if(hm){out.push({t:'h',text:hm[1].trim()});b=hm[2].trim()}
  const img=b.match(/^\[\[\s*(?:slika|слика)\s*(\d)\s*\]\]$/i);
  if(img){const im=images[Number(img[1])-1];if(im?.url)out.push({t:'img',url:im.url,alt:im.alt});continue}
  if(/^##\s*\S/.test(b)){out.push({t:'h',text:b.replace(/^##\s*/,'').trim()});continue}
  const parts:Inline[]=[];let last=0;const re=/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;let m:RegExpExecArray|null;
  while((m=re.exec(b))){if(m.index>last)parts.push(...emph(b.slice(last,m.index)));parts.push({text:m[1],href:m[2]});last=m.index+m[0].length}
  if(last<b.length)parts.push(...emph(b.slice(last)));
  out.push({t:'p',parts})}
 return out}

export const countWords=(s:string)=>(s.match(/\p{L}[\p{L}\p{N}'’-]*/gu)??[]).length;
/** Vreme čitanja u „pesmama“ (jedna pesma ≈ 3,5 min čitanja, 200 reči u minuti), zaokruženo na pola pesme. */
export function readTimeLabel(words:number,locale:string){
 const songs=Math.max(0.5,Math.round((words/200/3.5)*2)/2);
 const lat=songs===0.5?'pola pesme':songs===1?'jedna pesma':songs===1.5?'jedna i po pesma':songs===2?'dve pesme':songs===2.5?'dve i po pesme':songs===3?'tri pesme':songs===3.5?'tri i po pesme':songs===4?'četiri pesme':`${Math.round(songs)} pesama`;
 return locale==='sr-cyrl'?latToCyr(lat):lat}
export const plain=(s:string)=>stripMarkers(s);
