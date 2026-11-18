import Link from 'next/link';
import {db} from '@/lib/db';
import ScheduleCell from '@/components/admin/ScheduleCell';
import {saveSchedule,resetSchedule} from '../../najave-actions';
const DAYS=[[1,'Ponedeljak'],[2,'Utorak'],[3,'Sreda'],[4,'Četvrtak'],[5,'Petak'],[6,'Subota'],[0,'Nedelja']] as const;
export default async function NasProgram({searchParams}:{searchParams:Promise<{msg?:string}>}){
 const msg=(await searchParams).msg;
 const [shows,slots]=await Promise.all([db.show.findMany({where:{active:true},include:{translations:true},orderBy:{sortOrder:'asc'}}),db.scheduleSlot.findMany()]);
 const options=shows.map(s=>({id:s.id,icon:s.icon,name:(s.translations.find(t=>t.locale==='sr-latn')??s.translations[0])?.title??s.slug}));
 return <>
  <h1 className="text-4xl font-bold my-8">Naš program</h1>
  {msg==='ok'&&<p className="panel mb-4" role="status">Program je sačuvan.</p>}
  {msg==='reset'&&<p className="panel mb-4" role="status">Postavljen je početni program.</p>}
  <p className="muted mb-4">Ovo je tabela „Naš program“ sa sajta. Za svaki minut i dan klikni polje i izaberi emisiju. Sve emisije se emituju u 9, 12, 15 i 18 časova. Izuzetke za pojedinačne dane (emisija se ne emituje, ili ide druga) podešavaš u „Najave“. <b>Nova emisija?</b> Dodaj je u <Link className="text-pink-300" href="/admin/shows">Emisije</Link>, pa će se pojaviti u izboru ovde.</p>
  <form action={saveSchedule} className="panel overflow-x-auto">
   <table style={{width:'100%',minWidth:900,borderCollapse:'separate',borderSpacing:'2px 6px',tableLayout:'fixed'}}><colgroup><col style={{width:50}}/>{DAYS.map(([d])=><col key={d}/>)}</colgroup>
    <thead><tr><th/>{DAYS.map(([d,n])=><th key={d} className="text-left muted text-sm" style={{padding:'0 2px 4px',border:0}}>{n}</th>)}</tr></thead>
    <tbody>{[0,15,30].map(m=><tr key={m}><th className="text-left" style={{verticalAlign:'top',padding:'18px 0 0',border:0}}>.{String(m).padStart(2,'0')}</th>{DAYS.map(([d])=>{const sl=slots.find(s=>s.dayOfWeek===d&&s.startMinute===m);
     return <td key={d} style={{verticalAlign:'top',padding:0,border:0}}><ScheduleCell selectName={`cell_${d}_${m}`} rerunName={`rerun_${d}_${m}`} options={options} value={sl?.showId??''} rerun={sl?.isRerun??false}/></td>})}</tr>)}</tbody></table>
   <button className="btn mt-4">Sačuvaj program</button></form>
  <form action={resetSchedule} className="panel mt-6"><strong>Početni program</strong><p className="muted text-sm my-2">Vraća početni program (Putovanje kroz vreme svaki dan u .00, Tema nedelje radnim danima u .15…) i dodaje emisije koje nedostaju (npr. „Na dlanu“). Zamenjuje trenutni program.</p><button className="pill">Vrati početni program</button></form>
 </>}
