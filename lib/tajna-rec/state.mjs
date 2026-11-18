import { alphabet, hintCandidates } from './engine.mjs';
export function fresh(){return {guesses:[],input:Array(5).fill(''),hint:null};}
export function isDone(state,answer){return state.guesses.includes(answer)||state.guesses.length===6;}
export function restore(raw,answer,allowed){
 const blank=fresh();let x;try{x=typeof raw==='string'?JSON.parse(raw):raw}catch{return blank}
 if(!x||!Array.isArray(x.guesses)||x.guesses.length>6)return blank;
 const valid=w=>typeof w==='string'&&w.length===5&&[...w].every(c=>alphabet.includes(c))&&allowed.has(w);
 if(!x.guesses.every(valid))return blank;
 const win=x.guesses.indexOf(answer);if(win>=0&&win!==x.guesses.length-1)return blank;
 blank.guesses=[...x.guesses];
 if(Array.isArray(x.input)&&x.input.length===5&&x.input.every(c=>c===''||typeof c==='string'&&c.length===1&&alphabet.includes(c)))blank.input=[...x.input];
 if(x.hint&&x.guesses.length>=5&&x.guesses[4]!==answer&&Number.isInteger(x.hint.index)&&x.hint.index>=0&&x.hint.index<5&&x.hint.letter===answer[x.hint.index]&&hintCandidates(x.guesses.slice(0,5),answer).includes(x.hint.index))blank.hint={index:x.hint.index,letter:x.hint.letter};
 if(isDone(blank,answer))blank.input=Array(5).fill('');else if(blank.hint)blank.input[blank.hint.index]=blank.hint.letter;
 return blank;
}
export function typeLetter(state,letter){const input=[...state.input];const i=input.findIndex((v,i)=>!v&&i!==state.hint?.index);if(i>=0)input[i]=letter;return {...state,input};}
export function erase(state){const input=[...state.input];for(let i=4;i>=0;i--)if(input[i]&&i!==state.hint?.index){input[i]='';break}return {...state,input};}
export function reveal(state,answer,randomIndex){
 if(isDone(state,answer)||state.guesses.length!==5||state.hint)return state;
 const candidates=hintCandidates(state.guesses,answer);if(!candidates.length)return state;
 const index=candidates[randomIndex%candidates.length];const hint={index,letter:answer[index]};const input=[...state.input];input[index]=hint.letter;return {...state,input,hint};
}
export function choosePractice(schedule,current,daily,used,randomIndex){let history=used.filter(w=>schedule.includes(w));let pool=schedule.filter(w=>w!==current&&w!==daily&&!history.includes(w));if(!pool.length){history=[];pool=schedule.filter(w=>w!==current&&w!==daily)}if(!pool.length)throw Error('Insufficient schedule');const word=pool[randomIndex%pool.length];return {word,used:[...history,word]};}
export function dateLabel(key,script){const [y,m,d]=key.split('-').map(Number);const names=script==='lat'?['nedelja','ponedeljak','utorak','sreda','četvrtak','petak','subota']:['недеља','понедељак','уторак','среда','четвртак','петак','субота'];return `- ${names[new Date(Date.UTC(y,m-1,d)).getUTCDay()]}, ${d}.${m}.${y}.`;}
