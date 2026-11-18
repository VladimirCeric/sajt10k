/**
 * SPISAK IGARA NEDELJE — jedino mesto koje treba izmeniti kad stigne nova igra.
 * Odavde se automatski pune: izbor u adminu („Igra nedelje“), smena po nedeljama i kartica na naslovnoj.
 * (Tajna reč je dnevna igra i nije u ovom spisku.)
 * Uputstvo: UPUTSTVO-NOVA-IGRA.md
 */
import type {ComponentType} from 'react';
import Zvukozder from '@/components/zvukozder/Zvukozder';
import Igra2048 from '@/components/igra-2048/Igra2048';

export type GameProps={locale:string;autoHelp?:boolean};
export type WeeklyGameDef={id:string;name:{cyr:string;lat:string};Component:ComponentType<GameProps>};

export const WEEKLY_GAMES:WeeklyGameDef[]=[
 {id:'zvukozder',name:{cyr:'Звукождер',lat:'Zvukožder'},Component:Zvukozder as ComponentType<GameProps>},
 {id:'igra-2048',name:{cyr:'2048',lat:'2048'},Component:Igra2048 as ComponentType<GameProps>},
 // {id:'nova-igra',name:{cyr:'Нова игра',lat:'Nova igra'},Component:NovaIgra as ComponentType<GameProps>},
];
export const gameById=(id?:string|null)=>WEEKLY_GAMES.find(g=>g.id===id);
