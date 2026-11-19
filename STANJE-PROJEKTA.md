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

## Igre nedelje (registar: `lib/games.tsx`)
Svaka igra je klijentska komponenta u `components/<igra>/` (komponenta, `.module.css`, `Dialog.tsx`) i upisuje se u `WEEKLY_GAMES`; admin „Igra nedelje", nedeljna rotacija i kartica na početnoj to preuzimaju automatski. Nova igra ne traži Prisma migraciju. Uputstvo: `UPUTSTVO-NOVA-IGRA.md`.
- Ranije: Tajna reč (dnevna), Zvukožder, 2048.
- Parovi (`parovi`): igra pamćenja, tri veličine table.
- $ifr@ (`kombinacija`): pogađanje šifre od 4 simbola, težina je broj pokušaja.
- Sudoku (`sudoku`): 9×9, težina je broj ponuđenih brojeva (42/33/26); generator je u `lib/sudoku/engine.ts`.
- Zbirovi (`zbirovi`): precrtavanje brojeva do zadatih zbirova, 4×4/6×6/8×8; generator u `lib/zbirovi/engine.ts`.
- Ping-pong (`pong`): protiv računara, prvi do 7; canvas.
- Osvajanje galaksije (`galaksija`): pucačina sa emoji protivnicima, nivoi bez kraja, svaki peti je meteor; canvas.
- Super-prase (`super-prase`): trčanje i skakanje, prase jede hranu, izbegava instrumente; brdašca, ciglene platforme, retko srce za život; beskonačna igra; canvas.
- Zajedničko: najbolji rezultat i napredak čuvaju se u `localStorage` na uređaju; ćirilica/latinica po `locale`; emoji se crtaju fontom uređaja (izgled se razlikuje po uređaju); igre sa canvas-om ne koriste dodatne biblioteke.
- Kod canvas igara koristi se `touch-action:none` na polju (na telefonu se tu ne skroluje).

## Šta nije isprobano
- Nove igre (Parovi, $ifr@, Sudoku, Zbirovi, Ping-pong, Osvajanje galaksije, Super-prase) proverene su u Chrome-u i na računaru Vladimira; Safari/iPhone samo delimično.
- Instalacija na pravom serveru, nginx, `pg_dump`/`pg_restore` prenos, `migrate deploy` na praznoj bazi (nema Postgresa u radnom okruženju pomoćnika).

## Šta se čuva van GitHuba (bekap)
- Baza (sadržaj sajta): `pg_dump --no-owner --no-privileges -Fc "<DATABASE_URL>" -f radio10k.dump`
- Folder `uploads/` (slike i podkast snimci).
- Fajl `.env` (tajne; čuvati odvojeno i privatno).
