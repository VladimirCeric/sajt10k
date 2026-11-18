import {belgradeParts} from './schedule';
/** Prisma uslov: šta posetilac sme da vidi u ovom trenutku (objavljeno, ili zakazano čije je vreme prošlo). */
export function liveWhere(now=new Date()){return {OR:[{state:'PUBLISHED' as const},{state:'SCHEDULED' as const,showFrom:{lte:now}}]}}
/** "2026-11-18T09:00" (beogradsko vreme) -> Date */
export function fromBelgrade(local:string){const guess=new Date(`${local}:00Z`);if(isNaN(guess.getTime()))return null;
 const p=belgradeParts(guess);const shown=Date.parse(`${p.date}T00:00:00Z`)+p.minute*60000;return new Date(guess.getTime()-(shown-guess.getTime()))}
export function toBelgradeLocal(d:Date|null|undefined){if(!d)return '';const p=belgradeParts(d);return `${p.date}T${String(Math.floor(p.minute/60)).padStart(2,'0')}:${String(p.minute%60).padStart(2,'0')}`}
export const stateLabel={DRAFT:'Nacrt',SCHEDULED:'Zakazano',PUBLISHED:'Objavljeno'} as const;
