export const alphabet='АБВГДЂЕЖЗИЈКЛЉМНЊОПРСТЋУФХЦЧЏШ';
const latin=['A','B','V','G','D','Đ','E','Ž','Z','I','J','K','L','LJ','M','N','NJ','O','P','R','S','T','Ć','U','F','H','C','Č','DŽ','Š'];
export const toLatin=Object.fromEntries([...alphabet].map((c,i)=>[c,latin[i]]));
export function display(word,script){return script==='lat'?[...word].map(c=>toLatin[c]||c).join(''):word;}
export function score(guess,answer){const result=Array(5).fill('absent'),remaining={};for(let i=0;i<5;i++){if(guess[i]===answer[i])result[i]='correct';else remaining[answer[i]]=(remaining[answer[i]]||0)+1;}for(let i=0;i<5;i++){if(result[i]!=='correct'&&remaining[guess[i]]>0){result[i]='present';remaining[guess[i]]--;}}return result;}
export function dayKey(date=new Date()){const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Belgrade',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);return ['year','month','day'].map(k=>p.find(x=>x.type===k).value).join('-');}
export function dayIndex(key){return Math.floor((Date.parse(key+'T12:00:00Z')-Date.parse('2026-11-11T12:00:00Z'))/86400000);}
export function dailyAnswer(schedule,key){const n=dayIndex(key);return schedule[((n%schedule.length)+schedule.length)%schedule.length];}
export function hintCandidates(guesses,answer){const known=new Set();guesses.forEach(g=>score(g,answer).forEach((s,i)=>{if(s==='correct')known.add(i)}));return [0,1,2,3,4].filter(i=>!known.has(i));}
export function normalizeKey(key){const k=key.toLocaleUpperCase('sr');if(alphabet.includes(k)&&k.length===1)return k;return Object.keys(toLatin).find(c=>toLatin[c]===k)||null;}
