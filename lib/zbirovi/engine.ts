export type Level='lako'|'srednje'|'tesko';
export const SIZE:Record<Level,number>={lako:4,srednje:6,tesko:8};
const DENS:Record<Level,number>={lako:0.4,srednje:0.45,tesko:0.5};
export type Puzzle={n:number;vals:number[];sol:number[];rowT:number[];colT:number[]};
/** st: 0 = neoznačeno, 1 = precrtano, 2 = zadržano. Računaju se sva polja koja nisu precrtana. */
export function sums(vals:number[],st:number[],n:number){
 const rows=Array(n).fill(0),cols=Array(n).fill(0);
 for(let i=0;i<n*n;i++)if(st[i]!==1){rows[Math.floor(i/n)]+=vals[i];cols[i%n]+=vals[i]}
 return {rows,cols};
}
export function makePuzzle(level:Level,rnd:()=>number):Puzzle{
 const n=SIZE[level];
 for(;;){
  const vals=Array.from({length:n*n},()=>1+Math.floor(rnd()*9));
  const sol=Array.from({length:n*n},()=>rnd()<DENS[level]?1:0);
  let ok=true;
  for(let k=0;k<n&&ok;k++){
   let rr=0,cr=0;for(let j=0;j<n;j++){rr+=sol[k*n+j];cr+=sol[j*n+k]}
   if(rr<1||rr>n-1||cr<1||cr>n-1)ok=false;
  }
  if(!ok)continue;
  const {rows,cols}=sums(vals,sol,n);
  return {n,vals,sol,rowT:rows,colT:cols};
 }
}
