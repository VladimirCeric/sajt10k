import {db} from '@/lib/db';
import {belgradeParts,localDateOffset} from '@/lib/schedule';
import {weeklyGame,gameName} from '@/lib/weekly-game';
import {WEEKLY_GAMES} from '@/lib/games';
import {saveWeeklyChoice} from '../../najave-actions';
const fmt=(d:string)=>d.split('-').reverse().join('.')+'.';
export default async function IgraNedelje({searchParams}:{searchParams:Promise<{msg?:string}>}){
 const msg=(await searchParams).msg;
 const today=belgradeParts(new Date()).date,dow=new Date(`${today}T12:00:00Z`).getUTCDay();
 const monday=localDateOffset(today,-((dow+6)%7));
 const weeks=[0,1,2,3].map(i=>localDateOffset(monday,i*7));
 const choices=await db.weeklyGameChoice.findMany({where:{weekStart:{in:weeks}}});
 return <>
  <h1 className="text-4xl font-black my-6">Igra nedelje</h1>
  <p className="muted mb-4">Igra se menja svakog ponedeljka. Ako ništa ne izabereš, igre se smenjuju same.</p>
  {msg==='ok'&&<p className="panel mb-4" style={{borderColor:'#3fae8a'}}>Sačuvano.</p>}
  <div className="space-y-3">{weeks.map((w,i)=>{const c=choices.find(x=>x.weekStart===w),auto=weeklyGame(w).game;
   return <form key={w} action={saveWeeklyChoice} className="panel flex gap-4 items-end flex-wrap"><input type="hidden" name="weekStart" value={w}/>
    <div style={{minWidth:230}}><strong className="text-lg">{i===0?'Ova nedelja':i===1?'Sledeća nedelja':`Za ${i} nedelje`}</strong><div className="muted text-sm">{fmt(w)} – {fmt(localDateOffset(w,6))}</div></div>
    <div className="field !mb-0" style={{flex:1,minWidth:260}}><label>Igra</label><select name="game" defaultValue={c?.game??'auto'} style={{height:44,boxSizing:'border-box',fontSize:'13.3333px',fontFamily:'inherit'}}>
     <option value="auto">Automatski ({gameName(auto).lat})</option>{WEEKLY_GAMES.map(g=><option key={g.id} value={g.id}>{g.name.lat}</option>)}</select></div>
    <button className="btn">Sačuvaj</button></form>})}</div>
 </>}
