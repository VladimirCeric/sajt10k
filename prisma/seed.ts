import 'dotenv/config';
import {PrismaClient} from '@prisma/client';import bcrypt from 'bcryptjs';
const db=new PrismaClient();
/** Prvo pokretanje: pravi samo administratorski nalog i prazno podešavanje strima.
 *  Emisije i raspored se prave u adminu (Naš program → „Početni raspored“). */
async function run(){const email=process.env.ADMIN_EMAIL,password=process.env.ADMIN_PASSWORD;
 if(!email||!password||password==='CHANGE_THIS_BEFORE_SEED'||password.length<12)throw new Error('Postavite ADMIN_EMAIL i ADMIN_PASSWORD (najmanje 12 znakova) u .env pre pokretanja.');
 await db.user.upsert({where:{email:email.toLowerCase()},update:{},create:{email:email.toLowerCase(),passwordHash:await bcrypt.hash(password,12),role:'ADMIN'}});
 await db.setting.upsert({where:{key:'stream_url'},update:{},create:{key:'stream_url',value:''}});
 console.log('Baza je pripremljena. Prijavite se na /admin/login');}
run().finally(()=>db.$disconnect());
