'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import styles from './Parovi.module.css';
export default function Dialog({open,titleId,onClose,closeLabel,children}:{open:boolean;titleId:string;onClose:()=>void;closeLabel:string;children:ReactNode}) {
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const d=ref.current;if(!d)return;if(open&&!d.open)d.showModal();else if(!open&&d.open)d.close();return ()=>{if(d.open)d.close()}},[open]);
 return <dialog ref={ref} className={styles.dialog} aria-labelledby={titleId} onCancel={e=>{e.preventDefault();onClose()}}>
  <button type="button" className={styles.close} aria-label={closeLabel} onClick={onClose}>×</button>{children}
 </dialog>;
}
