'use client';
import {useEffect,useRef,useState} from 'react';
type Ratio='16/9'|'1/1'|'21/9';
const R:Record<Ratio,{r:number;w:number;h:number;name:string}>={'16/9':{r:16/9,w:1600,h:900,name:'16:9'},'1/1':{r:1,w:800,h:800,name:'1:1'},'21/9':{r:21/9,w:2100,h:900,name:'21:9'}};

/** Prozor za sečenje: slika se pomera prstom/mišem, a klizač je uvećava. Izlaz je tačno traženog odnosa strana. */
function Cropper({file,ratio,onDone,onCancel}:{file:File;ratio:Ratio;onDone:(f:File)=>void;onCancel:()=>void}){
 const cfg=R[ratio];
 const [url]=useState(()=>URL.createObjectURL(file));
 const imgRef=useRef<HTMLImageElement>(null);
 const [nat,setNat]=useState<{w:number;h:number}|null>(null),[err,setErr]=useState(false);
 const [z,setZ]=useState(1),[pos,setPos]=useState({x:0,y:0});
 const drag=useRef<{px:number;py:number;x:number;y:number}|null>(null);
 const [fw,setFw]=useState(480);
 useEffect(()=>{const f=()=>setFw(Math.max(240,Math.min(520,window.innerWidth-56,(window.innerHeight-260)*cfg.r)));f();window.addEventListener('resize',f);return()=>window.removeEventListener('resize',f)},[cfg.r]);
 useEffect(()=>()=>URL.revokeObjectURL(url),[url]);
 const fh=fw/cfg.r;
 const base=nat?Math.max(fw/nat.w,fh/nat.h):1,s=base*z,dw=(nat?.w??0)*s,dh=(nat?.h??0)*s;
 const clamp=(x:number,y:number,dw2=dw,dh2=dh)=>({x:Math.min(0,Math.max(fw-dw2,x)),y:Math.min(0,Math.max(fh-dh2,y))});
 useEffect(()=>{if(nat){const b=Math.max(fw/nat.w,fh/nat.h);setPos({x:(fw-nat.w*b)/2,y:(fh-nat.h*b)/2});setZ(1)}},[nat,fw,fh]);
 function zoom(nz:number){if(!nat)return;const cx=(fw/2-pos.x)/s,cy=(fh/2-pos.y)/s,ns=base*nz,ndw=nat.w*ns,ndh=nat.h*ns;setZ(nz);setPos(clamp(fw/2-cx*ns,fh/2-cy*ns,ndw,ndh))}
 function done(){if(!nat||!imgRef.current)return;
  const c=document.createElement('canvas');c.width=cfg.w;c.height=cfg.h;const ctx=c.getContext('2d');if(!ctx)return;
  ctx.drawImage(imgRef.current,-pos.x/s,-pos.y/s,fw/s,fh/s,0,0,cfg.w,cfg.h);
  const finish=(b:Blob)=>{const ext=b.type==='image/webp'?'webp':b.type==='image/jpeg'?'jpg':'png';onDone(new File([b],`slika-${cfg.name.replace(':','x')}.${ext}`,{type:b.type}))};
  c.toBlob(b=>{if(!b)return;
   // Ako pregledač ne ume WebP (vrati PNG) ili je rezultat prevelik, snimi kao JPEG na tamnoj pozadini.
   if(b.type==='image/webp'&&b.size<=1.8*1024*1024){finish(b);return}
   const j=document.createElement('canvas');j.width=cfg.w;j.height=cfg.h;const jc=j.getContext('2d');if(!jc)return;
   jc.fillStyle='#0a0d1a';jc.fillRect(0,0,cfg.w,cfg.h);jc.drawImage(imgRef.current!,-pos.x/s,-pos.y/s,fw/s,fh/s,0,0,cfg.w,cfg.h);
   j.toBlob(jb=>{if(jb)finish(jb)},'image/jpeg',0.85)},'image/webp',0.88)}
 const step=(dx:number,dy:number)=>setPos(p=>clamp(p.x+dx,p.y+dy));
 return <div role="dialog" aria-modal="true" aria-label="Sečenje slike" style={{position:'fixed',inset:0,zIndex:50,background:'rgba(4,6,14,.82)',display:'grid',placeItems:'center',padding:16}}>
  <div className="panel" style={{maxWidth:'100%',display:'flex',flexDirection:'column',gap:14,alignItems:'center'}}>
   <strong className="text-lg">Iseci sliku ({cfg.name})</strong>
   {err?<p style={{color:'#ff9ccb'}}>Ova slika se ne može otvoriti. Koristi JPG, PNG ili WebP.</p>:<>
   <div tabIndex={0} aria-label="Pomeraj sliku strelicama"
    onKeyDown={e=>{const d=12;if(e.key==='ArrowLeft')step(d,0);else if(e.key==='ArrowRight')step(-d,0);else if(e.key==='ArrowUp')step(0,d);else if(e.key==='ArrowDown')step(0,-d);else return;e.preventDefault()}}
    onPointerDown={e=>{(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);drag.current={px:e.clientX,py:e.clientY,x:pos.x,y:pos.y}}}
    onPointerMove={e=>{const d=drag.current;if(d)setPos(clamp(d.x+e.clientX-d.px,d.y+e.clientY-d.py))}}
    onPointerUp={()=>{drag.current=null}}
    style={{position:'relative',width:fw,height:fh,overflow:'hidden',borderRadius:12,border:'2px solid #e879c9',background:'#101629',cursor:'grab',touchAction:'none'}}>
    <img ref={imgRef} src={url} alt="" draggable={false} onLoad={e=>setNat({w:e.currentTarget.naturalWidth,h:e.currentTarget.naturalHeight})} onError={()=>setErr(true)}
     style={{position:'absolute',left:pos.x,top:pos.y,width:dw||undefined,height:dh||undefined,maxWidth:'none',userSelect:'none',pointerEvents:'none'}}/>
   </div>
   <label className="flex items-center gap-3 text-sm" style={{margin:0,width:fw}}>Uvećanje<input type="range" min={1} max={4} step={0.01} value={z} onChange={e=>zoom(Number(e.target.value))} style={{flex:1,padding:0,border:0,background:'transparent',accentColor:'#e879c9'}}/></label>
   <p className="muted text-xs" style={{margin:0}}>Prevuci sliku da izabereš kadar.</p></>}
   <div className="flex gap-3"><button type="button" className="btn" onClick={done} disabled={!nat||err}>Iseci i koristi</button><button type="button" className="pill" onClick={onCancel}>Odustani</button></div>
  </div></div>}

/** Izbor slike na srpskom, sa sečenjem na traženi odnos strana, pregledom i „Ukloni sliku“. */
export default function ImagePicker({label,current,ratio='16/9',fileName='imageFile',urlName='imageUrl',removeName='removeImage'}:{label:string;current?:string|null;ratio?:Ratio;fileName?:string;urlName?:string;removeName?:string}){
 const ref=useRef<HTMLInputElement>(null);const [name,setName]=useState('');const [prev,setPrev]=useState('');const [rm,setRm]=useState(false);const [raw,setRaw]=useState<File|null>(null),[big,setBig]=useState(false);
 const w=ratio==='1/1'?64:ratio==='21/9'?126:96,h=54;const size=ratio==='1/1'?64:h;
 const shown=prev||(!rm&&current)||'';
 function picked(f:File){const dt=new DataTransfer();dt.items.add(f);if(ref.current)ref.current.files=dt.files;setName(f.name);setPrev(URL.createObjectURL(f));setRm(false);setRaw(null)}
 function cancel(){if(ref.current)ref.current.value='';setRaw(null)}
 return <div className="field"><label>{label}</label>
  <input ref={ref} type="file" name={fileName} accept="image/jpeg,image/png,image/webp" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>30*1024*1024){e.target.value='';setBig(true);return}setBig(false);setRaw(f)}}/>
  <input type="hidden" name={urlName} value={current??''}/>
  <div className="flex items-center gap-3 flex-wrap">
   {shown?<img src={shown} alt="" style={{width:w,height:size,objectFit:'cover',borderRadius:8,border:'1px solid #313a56'}}/>:<div style={{width:w,height:size,borderRadius:8,border:'1px dashed #313a56'}}/>}
   <div><button type="button" className="pill text-sm" onClick={()=>ref.current?.click()}>{shown?'Zameni sliku':'Izaberi sliku'}</button>
    <div className="muted text-xs mt-1">{name?`Isečeno: ${name}`:(shown?'Slika je postavljena':'Nijedna slika nije izabrana')}</div></div>
   {current&&!prev&&<label className="text-sm" style={{margin:0}}><input className="!w-auto mr-2" type="checkbox" name={removeName} checked={rm} onChange={e=>setRm(e.target.checked)}/>Ukloni sliku</label>}
  </div>
  {big&&<p className="text-xs mt-1" style={{color:'#ff9ccb'}}>Slika je prevelika (preko 30 MB). Izaberi manju.</p>}
  {raw&&<Cropper file={raw} ratio={ratio} onDone={picked} onCancel={cancel}/>}</div>}
