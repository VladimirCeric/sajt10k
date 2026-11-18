// Latinica ⇄ ćirilica. Reči u {{lat:...}} ostaju latinica i u ćirilici (npr. {{lat:Imilla Skate}}).
const L2C:Record<string,string>={a:'а',b:'б',v:'в',g:'г',d:'д',đ:'ђ',e:'е',ž:'ж',z:'з',i:'и',j:'ј',k:'к',l:'л',m:'м',n:'н',o:'о',p:'п',r:'р',s:'с',t:'т',ć:'ћ',u:'у',f:'ф',h:'х',c:'ц',č:'ч',š:'ш'};
const DI:Record<string,string>={lj:'љ',nj:'њ','dž':'џ'};
const C2L:Record<string,string>={};for(const [l,c] of Object.entries(L2C))C2L[c]=l;
const isUp=(c:string)=>c!==c.toLowerCase();
// Reči u kojima "nj"/"dž" nisu jedno slovo (n+j, d+ž).
const EXC=['injekc','konjunk','nadživ','podživ','predživ','odživ','nadžet'];
function guard(s:string){return s.replace(/\p{L}+/gu,w=>{const lo=w.toLowerCase();for(const e of EXC)if(lo.includes(e)){const k=lo.indexOf(e);return w.slice(0,k)+[...w.slice(k,k+e.length)].map((c,i,a)=>{const n=(a[i-1]||'').toLowerCase()+c.toLowerCase();return (n==='lj'||n==='nj'||n==='dž')?'\u0001'+c:c}).join('')+w.slice(k+e.length)}return w})}
function conv(s0:string){const s=guard(s0);let out='';for(let i=0;i<s.length;i++){const c=s[i],two=s.slice(i,i+2).toLowerCase();
 if(DI[two]){out+=isUp(c)?DI[two].toUpperCase():DI[two];i++;continue}
 const m=L2C[c.toLowerCase()];out+=m?(isUp(c)?m.toUpperCase():m):c}return out.replace(/\u0001/g,'')}
export function latToCyr(s:string){return s.split(/(\{\{lat:[^}]*\}\})/).map(p=>{const m=p.match(/^\{\{lat:([^}]*)\}\}$/);return m?m[1]:conv(p)}).join('')}
export function cyrToLat(s:string){let out='';for(const c of s){const lo=c.toLowerCase();
 if(lo==='љ'||lo==='њ'||lo==='џ'){const d=lo==='љ'?'lj':lo==='њ'?'nj':'dž';out+=isUp(c)?d[0].toUpperCase()+d.slice(1):d;continue}
 const l=C2L[lo];out+=l?(isUp(c)?l.toUpperCase():l):c}return out}
export function stripMarkers(s:string){return s.replace(/\{\{lat:([^}]*)\}\}/g,'$1')}
/** Unos može biti latinica ili ćirilica; vraća oba pisma. */
export function bothScripts(input:string){const s=input.trim();
 // Latinica se čuva sa oznakama {{lat:…}} da bi se pri izmeni znalo šta mora ostati latinicom; za prikaz se oznake skidaju (localized()).
 return /[Ѐ-ӿ]/.test(s)?{cyr:s,lat:cyrToLat(s)}:{cyr:latToCyr(s),lat:s}}
/** Prikaz teksta na pismu strane (sr-cyrl ili sr-latn), bez obzira na pismo u kom je unet. */
export function toScript(s:string,locale:string){return locale==='sr-cyrl'?latToCyr(s):stripMarkers(cyrToLat(s))}
