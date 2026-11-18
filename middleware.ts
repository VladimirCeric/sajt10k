import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';
/** Pamti poslednje izabrano pismo (godinu dana) da ga naslovna `/` može ponovo otvoriti. */
export function middleware(req:NextRequest){
 const l=req.nextUrl.pathname.split('/')[1];
 const res=NextResponse.next();
 if(l==='sr-cyrl'||l==='sr-latn')res.cookies.set('radio10k_lang',l,{maxAge:60*60*24*365,path:'/',sameSite:'lax'});
 return res;
}
export const config={matcher:['/sr-cyrl','/sr-cyrl/:path*','/sr-latn','/sr-latn/:path*']};
