/** Sudoku 9×9: generator sa jedinstvenim rešenjem. Težina = broj ponuđenih brojeva. */
export type Level='lako'|'srednje'|'tesko';
export const CLUES:Record<Level,number>={lako:42,srednje:33,tesko:26};
const ALL=0x3fe; // bitovi 1..9
const R=(i:number)=>Math.floor(i/9),C=(i:number)=>i%9,B=(i:number)=>Math.floor(R(i)/3)*3+Math.floor(C(i)/3);
const pop=(m:number)=>{let n=0;while(m){m&=m-1;n++}return n};
export function peers(i:number){const out:number[]=[];for(let j=0;j<81;j++)if(j!==i&&(R(j)===R(i)||C(j)===C(i)||B(j)===B(i)))out.push(j);return out}

type St={g:number[];rows:number[];cols:number[];boxes:number[]};
function init(g:number[]):St{const rows=Array(9).fill(0),cols=Array(9).fill(0),boxes=Array(9).fill(0);
 for(let i=0;i<81;i++)if(g[i]){const b=1<<g[i];rows[R(i)]|=b;cols[C(i)]|=b;boxes[B(i)]|=b}
 return {g:[...g],rows,cols,boxes}}
function pick(st:St){let best=-1,bm=0,bn=10;
 for(let i=0;i<81;i++){if(st.g[i])continue;const m=ALL&~(st.rows[R(i)]|st.cols[C(i)]|st.boxes[B(i)]);const n=pop(m);
  if(n===0)return {best:-2,bm:0};if(n<bn){best=i;bm=m;bn=n;if(n===1)break}}
 return {best,bm}}
const put=(st:St,i:number,d:number)=>{const b=1<<d;st.g[i]=d;st.rows[R(i)]|=b;st.cols[C(i)]|=b;st.boxes[B(i)]|=b};
const unput=(st:St,i:number,d:number)=>{const b=~(1<<d);st.g[i]=0;st.rows[R(i)]&=b;st.cols[C(i)]&=b;st.boxes[B(i)]&=b};

/** Koliko rešenja ima zadata tabla (staje čim dostigne limit). */
export function countSolutions(g:number[],limit=2):number{
 const st=init(g);let count=0;
 const rec=():boolean=>{const {best,bm}=pick(st);if(best===-2)return false;if(best===-1){count++;return count>=limit}
  for(let d=1;d<=9;d++)if(bm&(1<<d)){put(st,best,d);if(rec())return true;unput(st,best,d)}
  return false};
 rec();return count}

function shuffle<T>(a:T[],rnd:()=>number):T[]{const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}
function fullGrid(rnd:()=>number):number[]{
 const st=init(Array(81).fill(0));
 const rec=():boolean=>{const {best,bm}=pick(st);if(best===-2)return false;if(best===-1)return true;
  for(const d of shuffle([1,2,3,4,5,6,7,8,9],rnd))if(bm&(1<<d)){put(st,best,d);if(rec())return true;unput(st,best,d)}
  return false};
 rec();return st.g}

export function makePuzzle(level:Level,rnd:()=>number){
 const solution=fullGrid(rnd),puzzle=[...solution],target=CLUES[level];let clues=81;
 for(const i of shuffle(Array.from({length:81},(_,k)=>k),rnd)){
  if(clues<=target)break;const v=puzzle[i];puzzle[i]=0;
  if(countSolutions(puzzle,2)!==1)puzzle[i]=v;else clues--}
 return {puzzle,solution,clues}}

/** Polja čiji se broj ponavlja u redu, koloni ili kvadratu. */
export function conflicts(v:number[]):Set<number>{
 const bad=new Set<number>();
 const groups:number[][]=[];for(let k=0;k<9;k++){groups.push(Array.from({length:9},(_,c)=>k*9+c),Array.from({length:9},(_,r)=>r*9+k));
  const br=Math.floor(k/3)*3,bc=(k%3)*3;groups.push(Array.from({length:9},(_,x)=>(br+Math.floor(x/3))*9+bc+(x%3)))}
 for(const g of groups){const seen:Record<number,number>={};for(const i of g){const d=v[i];if(!d)continue;if(seen[d]!==undefined){bad.add(i);bad.add(seen[d])}else seen[d]=i}}
 return bad}
