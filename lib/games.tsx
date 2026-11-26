/**
 * SPISAK IGARA NEDELJE — jedino mesto koje treba izmeniti kad stigne nova igra.
 * Odavde se automatski pune: izbor u adminu („Igra nedelje“), smena po nedeljama i kartica na naslovnoj.
 * (Tajna reč je dnevna igra i nije u ovom spisku.)
 */
import type {ComponentType} from 'react';
import Zvukozder from '@/components/zvukozder/Zvukozder';
import Igra2048 from '@/components/igra-2048/Igra2048';
import Parovi from '@/components/parovi/Parovi';
import Kombinacija from '@/components/kombinacija/Kombinacija';
import Sudoku from '@/components/sudoku/Sudoku';
import Zbirovi from '@/components/zbirovi/Zbirovi';
import Pong from '@/components/pong/Pong';
import Galaksija from '@/components/galaksija/Galaksija';
import SuperPrase from '@/components/super-prase/SuperPrase';

export type GameProps={locale:string;autoHelp?:boolean};
export type WeeklyGameDef={id:string;name:{cyr:string;lat:string};Component:ComponentType<GameProps>};

export const WEEKLY_GAMES:WeeklyGameDef[]=[
 {id:'zvukozder',name:{cyr:'Звукождер',lat:'Zvukožder'},Component:Zvukozder as ComponentType<GameProps>},
 {id:'igra-2048',name:{cyr:'2048',lat:'2048'},Component:Igra2048 as ComponentType<GameProps>},
 {id:'parovi',name:{cyr:'Парови',lat:'Parovi'},Component:Parovi as ComponentType<GameProps>},
 {id:'kombinacija',name:{cyr:'$ifr@',lat:'$ifr@'},Component:Kombinacija as ComponentType<GameProps>},
 {id:'sudoku',name:{cyr:'Судоку',lat:'Sudoku'},Component:Sudoku as ComponentType<GameProps>},
 {id:'zbirovi',name:{cyr:'Збирови',lat:'Zbirovi'},Component:Zbirovi as ComponentType<GameProps>},
 {id:'pong',name:{cyr:'Пинг-понг',lat:'Ping-pong'},Component:Pong as ComponentType<GameProps>},
 {id:'galaksija',name:{cyr:'Освајање галаксије',lat:'Osvajanje galaksije'},Component:Galaksija as ComponentType<GameProps>},
 {id:'super-prase',name:{cyr:'Супер-прасе',lat:'Super-prase'},Component:SuperPrase as ComponentType<GameProps>},
 // {id:'nova-igra',name:{cyr:'Нова игра',lat:'Nova igra'},Component:NovaIgra as ComponentType<GameProps>},
];
export const gameById=(id?:string|null)=>WEEKLY_GAMES.find(g=>g.id===id);
