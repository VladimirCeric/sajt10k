import '@fontsource-variable/inter';
import '@fontsource/montserrat-alternates/600.css';
import './globals.css';
import './site.css';
import type { Metadata } from 'next';
import {db} from '@/lib/db';
import Player from '@/components/Player';
import {ui} from '@/lib/i18n';
import {getUser} from '@/lib/auth';
import {getSwitches} from '@/lib/site-switches';
export const dynamic='force-dynamic';
export const metadata: Metadata = {title:'Radio 10K | VIŠER',description:'Studentski internet radio VIŠER – emisije, program i arhiva.'};
export default async function RootLayout({children}:{children:React.ReactNode}){
 const setting=await db.setting.findUnique({where:{key:'stream_url'}});
 const t=ui['sr-latn'],sw=await getSwitches(),hidePlayer=sw.temp&&!(await getUser());
 return <html lang="sr" suppressHydrationWarning><body>{children}{!hidePlayer&&<Player src={setting?.value??''} label={t.listen} empty={t.noStream}/>}</body></html>}
