import { cookies } from 'next/headers';
import { SignJWT,jwtVerify } from 'jose';
import { redirect } from 'next/navigation';
import { db } from './db';
function key(){const s=process.env.SESSION_SECRET; if(!s||s.length<32)throw new Error('SESSION_SECRET must contain at least 32 characters');return new TextEncoder().encode(s);}
export async function setSession(id:string){const jwt=await new SignJWT({sub:id}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('7d').sign(key());(await cookies()).set('radio10k_session',jwt,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:7*86400});}
export async function getUser(){const token=(await cookies()).get('radio10k_session')?.value; if(!token)return null;try{const {payload}=await jwtVerify(token,key());if(!payload.sub)return null;return db.user.findUnique({where:{id:payload.sub}});}catch{return null;}}
export async function requireEditor(){const user=await getUser();if(!user)redirect('/admin/login');return user;}
export async function logout(){(await cookies()).delete('radio10k_session');}
