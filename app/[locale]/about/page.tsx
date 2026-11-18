import {db} from '@/lib/db';
import {localeOf,localized} from '@/lib/i18n';
import {aboutUi,parseAbout,ABOUT_KEY} from '@/lib/about-ui';
export const dynamic='force-dynamic';
const ic={width:44,height:44,viewBox:'0 0 24 24',fill:'none',stroke:'#c3c8de',strokeWidth:1.3,strokeLinecap:'round' as const,strokeLinejoin:'round' as const,'aria-hidden':true};
const initials=(n:string)=>{const w=n.split(/\s+/).filter(x=>x&&!/^(dr|мр|др)$/i.test(x));return ((w[0]?.[0]??'')+(w.length>1?w[w.length-1][0]:'')).toLocaleUpperCase()};

export default async function About({params}:{params:Promise<{locale:string}>}){
 const locale=localeOf((await params).locale);
 const saved=await db.setting.findUnique({where:{key:ABOUT_KEY}}),ui=aboutUi(locale,parseAbout(saved?.value));
 const up=(x:string)=>x.toLocaleUpperCase(locale==='sr-cyrl'?'sr-Cyrl':'sr-Latn');
 const [people,img]=await Promise.all([db.person.findMany({where:{active:true},include:{translations:true},orderBy:[{sortOrder:'asc'},{createdAt:'asc'}]}),db.setting.findUnique({where:{key:'about_image'}})]);
 const P=people.map(x=>({...x,t:localized(x.translations,locale)}));
 const students=P.filter(x=>x.kind==='STUDENT'),former=P.filter(x=>x.kind==='FORMER'),chief=P.filter(x=>x.kind==='CHIEF'),editors=P.filter(x=>x.kind==='EDITOR');
 const half=Math.ceil(former.length/2),cols=[former.slice(0,half),former.slice(half)];
 const years=(a:number|null,b:number|null)=>a?(b?(a===b?`${a}`:`${a}–${b}`):`${a}–`):'';
 return <>
  <section aria-labelledby="onama-h" className="s-ab-hero">
   <h1 id="onama-h" className="sf-head">{ui.title}</h1>
   {img?.value&&<img className="s-ab-img" src={img.value} alt={ui.imgAlt}/>}
   <div className="s-ab-grid">
    <p className="s-ab-lead">{ui.lead}</p>
    <div className="s-ab-text"><p>{ui.p1}</p><p>{ui.p2}</p><p>{ui.p3}</p></div>
   </div>
  </section>

  <section id="zasto" aria-labelledby="zasto-h" className="s-ab-sec">
   <h2 id="zasto-h" className="sf-head">{ui.whyT}</h2>
   <div className="s-ab-why">
    <article><svg {...ic}><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5V21"/><path d="M8.5 21h7"/></svg><div><h3>{ui.mission}</h3><p>{ui.missionT}</p></div></article>
    <article><svg {...ic}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg><div><h3>{ui.vision}</h3><p>{ui.visionT}</p></div></article>
    <article><svg {...ic}><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></svg><div><h3>{ui.goals}</h3><p>{ui.goalsT}</p></div></article>
   </div>
  </section>

  {students.length>0&&<section id="studenti" aria-labelledby="studenti-h" className="s-ab-sec">
   <div><h2 id="studenti-h" className="sf-head">{ui.students}</h2><p className="s-ab-sub">{ui.studentsSub}</p></div>
   <div className="s-ab-people">{students.map(x=><article key={x.id} className="s-ab-person">
    {x.imageUrl?<img src={x.imageUrl} alt={x.t?.name??''}/>:<div className="s-ab-ph sf-head" role="img" aria-label={x.t?.name??''}>{initials(x.t?.name??'')}</div>}
    <div className="s-ab-pbody"><h3 className="sf-head">{x.t?.name}</h3>
     {x.t?.role&&<span className="s-ab-role">{up(x.t.role)}</span>}
     {x.t?.shows&&<p className="s-ab-shows">{ui.shows}: <span>{x.t.shows}</span></p>}
     {x.t?.bio&&<p className="s-ab-bio">{x.t.bio}</p>}</div></article>)}</div>
  </section>}

  {former.length>0&&<section id="ranije" aria-labelledby="ranije-h" className="s-ab-sec">
   <h2 id="ranije-h" className="sf-head s-ab-h2s">{ui.former}</h2>
   <div className="s-ab-former">{cols.map((c,i)=><ul key={i}>{c.map(x=><li key={x.id}><span>{x.t?.name}</span><span>{x.t?.role}</span><span>{years(x.yearFrom,x.yearTo)}</span></li>)}</ul>)}</div>
  </section>}

  {(chief.length>0||editors.length>0)&&<section id="urednistvo" aria-labelledby="urednistvo-h" className="s-ab-sec s-ab-edit">
   <h2 id="urednistvo-h" className="sf-head s-ab-h2s">{ui.editorial}</h2>
   <div className="s-ab-editors">
    {chief.length>0&&<div><span className="s-ab-label">{up(ui.chief)}</span>{chief.map(x=><span key={x.id} className="s-ab-name sf-head">{x.t?.name}</span>)}</div>}
    {editors.length>0&&<div><span className="s-ab-label">{up(ui.editors)}</span>{editors.map(x=><span key={x.id} className="s-ab-name sf-head">{x.t?.name}</span>)}</div>}
   </div>
  </section>}
 </>}
