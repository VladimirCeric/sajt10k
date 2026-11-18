import {mkdir,writeFile} from 'fs/promises';import path from 'path';import {randomUUID} from 'crypto';
export const UPLOAD_DIR=path.join(process.cwd(),'uploads');
const EXT:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
/** Čuva otpremljenu sliku u folder `uploads/` (van javnog foldera, služi se preko /uploads/…). Vraća putanju ili null. */
export async function saveImage(file:FormDataEntryValue|null,sub='najave'):Promise<string|null>{
 if(!(file instanceof File)||file.size===0)return null;
 const ext=EXT[file.type];if(!ext)throw new Error('Slika mora biti JPG, PNG ili WebP.');
 if(file.size>2*1024*1024)throw new Error('Slika je prevelika (najviše 2 MB). Prvo je iseci u alatu za sečenje.');
 const name=`${randomUUID()}.${ext}`,dir=path.join(UPLOAD_DIR,sub);await mkdir(dir,{recursive:true});
 await writeFile(path.join(dir,name),Buffer.from(await file.arrayBuffer()));return `/uploads/${sub}/${name}`}

const AUDIO=new Set(['mp3','m4a','ogg','wav']);
export const MAX_AUDIO_MB=150;
/** Čuva podkast snimak (mp3, m4a, ogg ili wav, do 150 MB) u `uploads/podkast/`. Vraća putanju ili null. */
export async function saveAudio(file:FormDataEntryValue|null):Promise<string|null>{
 if(!(file instanceof File)||file.size===0)return null;
 const ext=file.name.split('.').pop()?.toLowerCase()??'';
 if(!AUDIO.has(ext))throw new Error('Snimak mora biti MP3, M4A, OGG ili WAV.');
 if(file.size>MAX_AUDIO_MB*1024*1024)throw new Error(`Snimak je prevelik (najviše ${MAX_AUDIO_MB} MB). Izvezi ga kao MP3.`);
 const name=`${randomUUID()}.${ext}`,dir=path.join(UPLOAD_DIR,'podkast');await mkdir(dir,{recursive:true});
 await writeFile(path.join(dir,name),Buffer.from(await file.arrayBuffer()));return `/uploads/podkast/${name}`}
/** Briše otpremljen fajl (najbolje što može; greške se ignorišu). */
export async function removeUpload(url?:string|null){
 if(!url||!url.startsWith('/uploads/'))return;
 const full=path.join(UPLOAD_DIR,...url.slice('/uploads/'.length).split('/'));
 if(!full.startsWith(UPLOAD_DIR+path.sep))return;
 try{(await import('fs/promises')).unlink(full).catch(()=>{})}catch{}}
