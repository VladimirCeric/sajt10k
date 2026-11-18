import {Suspense} from 'react';
import {notFound} from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import {localeOf,locales,ui} from '@/lib/i18n';
import {podUi} from '@/lib/podcast-ui';
import {getUser} from '@/lib/auth';
import {getSwitches,tempView} from '@/lib/site-switches';
import TempPage from '@/components/TempPage';
import Link from 'next/link';
export default async function LocaleLayout({children,params}:{children:React.ReactNode;params:Promise<{locale:string}>}){
 const {locale:raw}=await params;if(!locales.includes(raw as any))notFound();
 const locale=localeOf(raw),t=ui[locale];
 const [sw,user]=await Promise.all([getSwitches(),getUser()]);
 if(sw.temp&&!user){const v=tempView(sw.saved,locale);
  return <div className="site s-tmp-site" lang={locale==='sr-cyrl'?'sr-Cyrl':'sr-Latn'}><Suspense fallback={null}><TempPage locale={locale} h={v.h} s={v.s} endMs={v.endMs}/></Suspense></div>}
 return <div className="site" lang={locale==='sr-cyrl'?'sr-Cyrl':'sr-Latn'}>
  {sw.temp&&<div className="s-tmp-bar" role="status">Privremena strana je uključena: posetioci vide nju, a ne ovaj sajt. <Link href="/admin/settings">Isključi u Podešavanjima</Link></div>}
  <Suspense fallback={null}><SiteHeader locale={locale} labels={{home:t.home,about:sw.about?t.about:undefined,nav:t.mainNav,podcast:sw.pod?podUi(locale).title:undefined}}/></Suspense>
  <main className="s-main">{children}</main>
  <footer className="s-footer"><div>
   <img src="/logo-radio-10k.svg" alt="Radio 10K"/>
   <div className="col"><p>{t.footer}</p><p>{t.footerLine}</p></div>
  </div></footer>
 </div>}
