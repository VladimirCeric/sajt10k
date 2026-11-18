// Igra nedelje: ako urednik ništa ne izabere, igre se smenjuju po nedeljama (ponedeljak je početak).
// Spisak igara je u lib/games.tsx.
import {WEEKLY_GAMES} from '@/lib/games';
export type WeeklyGame=string;
const EPOCH='2026-01-05'; // ponedeljak
const dayNo=(d:string)=>Math.floor(new Date(`${d}T12:00:00Z`).getTime()/86400000);
export function weeklyGame(date:string,offsetWeeks=0){
 const weeks=Math.floor((dayNo(date)-dayNo(EPOCH))/7)+offsetWeeks,n=WEEKLY_GAMES.length;
 const game=WEEKLY_GAMES[((weeks%n)+n)%n].id;
 const monday=dayNo(date)-(((dayNo(date)-dayNo(EPOCH))%7)+7)%7;
 const sunday=new Date((monday+6)*86400000+43200000).toISOString().slice(0,10);
 return {game,until:sunday};
}
export const gameName=(id:string)=>WEEKLY_GAMES.find(g=>g.id===id)?.name??{cyr:id,lat:id};
