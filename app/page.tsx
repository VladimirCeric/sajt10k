import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
/** Prvi dolazak: latinica. Ko promeni pismo, pamti se (kolačić postavlja middleware.ts). */
export default async function Home(){
 const l=(await cookies()).get('radio10k_lang')?.value;
 redirect(l==='sr-cyrl'?'/sr-cyrl':'/sr-latn');
}
