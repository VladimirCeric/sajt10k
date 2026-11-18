import 'dotenv/config';
import {PrismaClient} from '@prisma/client';import bcrypt from 'bcryptjs';
const db=new PrismaClient();
/** Menja (ili pravi) administratorski nalog: sve postojeće administratore zamenjuje jednim,
 *  sa e-mailom i lozinkom iz promenljivih ADMIN_EMAIL i ADMIN_PASSWORD (najmanje 12 znakova).
 *  Pokreće se: ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run admin:set */
async function run(){const email=process.env.ADMIN_EMAIL?.trim().toLowerCase(),password=process.env.ADMIN_PASSWORD;
 if(!email||!/^\S+@\S+\.\S+$/.test(email))throw new Error('ADMIN_EMAIL mora biti ispravna e-mail adresa.');
 if(!password||password.length<12||password==='CHANGE_THIS_BEFORE_SEED')throw new Error('ADMIN_PASSWORD mora imati najmanje 12 znakova.');
 const passwordHash=await bcrypt.hash(password,12);
 const admins=await db.user.findMany({where:{role:'ADMIN'},orderBy:{createdAt:'asc'}});
 const taken=await db.user.findUnique({where:{email}});
 if(taken&&taken.role!=='ADMIN')throw new Error('Ta adresa već pripada nalogu koji nije administratorski.');
 if(admins.length){const keep=taken??admins[0];await db.user.update({where:{id:keep.id},data:{email,passwordHash}});
  await db.user.deleteMany({where:{role:'ADMIN',id:{not:keep.id}}});}
 else await db.user.create({data:{email,passwordHash,role:'ADMIN'}});
 console.log('Administratorski nalog je podešen: '+email);}
run().finally(()=>db.$disconnect());
