'use client';
import Link from 'next/link';
import {usePathname,useSearchParams} from 'next/navigation';
import {locales,type Locale} from '@/lib/i18n';

export default function SiteHeader({locale,labels}:{locale:Locale;labels:{home:string;about?:string;nav:string;podcast?:string}}){
 const path=usePathname()||`/${locale}`;
 const search=(useSearchParams()?.toString()??'');
 const swap=(l:string)=>path.replace(/^\/(sr-cyrl|sr-latn)/,`/${l}`)+(search?`?${search}`:'');
 const home=`/${locale}`,about=`/${locale}/about`,pod=`/${locale}/podkast`;
 return <header className="s-header">
  <nav aria-label={labels.nav} className="s-nav">
   <Link href={home} aria-current={path===home?'page':undefined}>{labels.home}</Link>
   {labels.podcast&&<Link href={pod} aria-current={path===pod?'page':undefined}>{labels.podcast}</Link>}
   {labels.about&&<Link href={about} aria-current={path===about?'page':undefined}>{labels.about}</Link>}
  </nav>
  <Link href={home} aria-label="Radio 10K" className="s-logo"><span className="halo" aria-hidden="true"/><img src="/logo-radio-10k.svg" alt="Radio 10K"/></Link>
  <div className="s-lang">{locales.map(l=><Link key={l} href={swap(l)} scroll={false} lang={l==='sr-cyrl'?'sr-Cyrl':'sr-Latn'} aria-current={l===locale}>{l==='sr-cyrl'?'Ћир':'Lat'}</Link>)}</div>
 </header>;
}
