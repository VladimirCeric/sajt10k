// Audio snimci podkasta. Pages API ruta, jer samo ona dopušta da se postavi tačan Content-Length (Safari ga traži).
import type {NextApiRequest,NextApiResponse} from 'next';
import {stat} from 'fs/promises';import {createReadStream} from 'fs';import path from 'path';
const TYPES:Record<string,string>={'.mp3':'audio/mpeg','.m4a':'audio/mp4','.ogg':'audio/ogg','.wav':'audio/wav'};
const DIR=path.join(process.cwd(),'uploads','podkast');
export default async function handler(req:NextApiRequest,res:NextApiResponse){
 const name=String(req.query.file||'');
 if(name!==path.basename(name)){res.status(404).end();return}
 const type=TYPES[path.extname(name).toLowerCase()];if(!type){res.status(404).end();return}
 let size=0;try{size=(await stat(path.join(DIR,name))).size}catch{res.status(404).end();return}
 const m=/^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range||''));
 let start=0,end=size-1,code=200;
 if(m&&(m[1]||m[2])){
  start=m[1]?parseInt(m[1],10):Math.max(0,size-parseInt(m[2],10));
  end=m[1]&&m[2]?Math.min(parseInt(m[2],10),size-1):size-1;
  if(start>end||start>=size){res.status(416).setHeader('Content-Range',`bytes */${size}`);res.end();return}
  code=206;
 }
 const len=end-start+1;
 res.setHeader('Content-Type',type);res.setHeader('Accept-Ranges','bytes');res.setHeader('Cache-Control','no-cache');res.setHeader('Content-Length',String(len));
 if(code===206)res.setHeader('Content-Range',`bytes ${start}-${end}/${size}`);
 res.status(code);
 if(req.method==='HEAD'){res.end();return}
 const rs=createReadStream(path.join(DIR,name),{start,end});
 res.on('close',()=>rs.destroy());rs.on('error',()=>res.destroy());rs.pipe(res);
}
export const config={api:{responseLimit:false}};
