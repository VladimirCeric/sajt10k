# Radio 10K sajt: stanje projekta (za nastavak rada)

Ovaj fajl služi da se posao može nastaviti i posle dužeg vremena, sa bilo kojim pomoćnikom ili programerom. Ne sadrži lozinke.

## Ljudi i pravila
- Vladimir Cerić, glavni urednik i vođa projekta (nije programer). Razgovor na srpskom (latinica), kratki odgovori.
- Programer Marko je odsutan. Sajt na server postavlja školski administrator.
- Stek se ne menja (Next.js 15 App Router + Prisma 6 + PostgreSQL + Tailwind 4), samo se nadograđuje.
- Radi se na kopiji (`~/Downloads/radio10k-sajt`); original `radio10k-cms-main-3` ostaje netaknut.
- Svaki korak u terminalu piše se redom: `cd`, komande, adresa. Svaka Prisma migracija se izričito najavljuje.
- Posle svakog paketa: pokrenuti sajt, proveriti, pokazati rezultat. Testirati samo ono što se promenilo.
- Brisanje fajlova: ne tražiti dozvolu za ceo Downloads; nepotrebno se premešta u `~/Downloads/radio10k-za-brisanje`.

## Gde šta stoji
- Repozitorijum: https://github.com/VladimirCeric/sajt10k (privatan). Slanje: `git add .`, `git commit -m "..."`, `git push` (lozinka je GitHub token sa pravom `repo`).
- Uputstvo za administratora: `UPUTSTVO-ZA-ADMINISTRATORA.md` (instalacija, nginx, strim, prenos sadržaja, bekap).
- Privremena strana (samostalna, za server pre puštanja sajta): `privremena-strana/index.html`; datum puštanja u njoj: 1. decembar 2026. u 12:00.
- Nalog administratora se menja komandom `ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run admin:set`.

## Važne tehničke odluke
- Podešavanja (tabela Setting): `stream_url`, `stream_metadata_url`, `station_title`, `nav_podcast` (podkast u meniju, podrazumevano skriven), `nav_about`, `temp_on` i `temp_texts` (privremena strana u samom sajtu, vidi je samo posetilac koji nije prijavljen).
- Strim: HTTP strim ne svira na HTTPS sajtu; administrator ga prosleđuje kroz nginx (`/stream` → Icecast na 127.0.0.1:8000). Adrese `.m3u/.m3u8/.pls` admin sam skida.
- Audio podkasta ide kroz `pages/api/podkast-audio/[file].ts` (tačan `Content-Length` zbog Safarija). `compress:false` u `next.config.ts`.
- iPhone ne dozvoljava promenu jačine iz sajta: na telefonu je samo dugme za utišavanje. U igrama se strelice pišu sa oznakom tekstualnog prikaza (da ne postanu emoji).
- Potpisi slika u „Levo od Albukerkija" dolaze iz polja „Opis slike"; na ćirilici se prevode automatski.
- Vreme: Open-Meteo (potrebna veza ka api.open-meteo.com), obavezan navod „Prognoza: Open-Meteo".

## Šta nije isprobano
- Instalacija na pravom serveru, nginx, `pg_dump`/`pg_restore` prenos, `migrate deploy` na praznoj bazi (nema Postgresa u radnom okruženju pomoćnika).

## Šta se čuva van GitHuba (bekap)
- Baza (sadržaj sajta): `pg_dump --no-owner --no-privileges -Fc "<DATABASE_URL>" -f radio10k.dump`
- Folder `uploads/` (slike i podkast snimci).
- Fajl `.env` (tajne; čuvati odvojeno i privatno).
