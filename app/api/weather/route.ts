import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {localeOf} from '@/lib/i18n';
import {getWeather,iconOf,inScript,parseOverrides,pickRule,tempText,textOf,WEATHER_KEY} from '@/lib/weather';

export const dynamic='force-dynamic';

export async function GET(request:Request){
 const locale=localeOf(new URL(request.url).searchParams.get('locale')??'sr-cyrl');
 const [wx,wxRow]=await Promise.all([getWeather(),db.setting.findUnique({where:{key:WEATHER_KEY}})]);
 if(!wx)return NextResponse.json({weather:null},{headers:{'Cache-Control':'public, max-age=0, s-maxage=60, stale-while-revalidate=120'}});
 const icon=iconOf(wx);
 const comment=inScript(textOf(pickRule(wx),parseOverrides(wxRow?.value)),locale);
 return NextResponse.json({weather:{temp:tempText(wx.temp),label:inScript(icon.label,locale),icon:icon.icon,text:comment}},{headers:{'Cache-Control':'public, max-age=0, s-maxage=60, stale-while-revalidate=120'}});
}

