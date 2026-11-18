# 7 mini-igara na početnoj stranici

Dodata je `components/DailyMiniGame.tsx`, a `app/[locale]/page.tsx` već uključuje komponentu.

Raspored po vremenskoj zoni `Europe/Belgrade`:

- Ponedeljak: Radio kviz
- Utorak: Memorija
- Sreda: Refleks
- Četvrtak: Pogodi broj
- Petak: Složi reč
- Subota: Iks-oks
- Nedelja: Više ili niže

Promena se dešava automatski u ponoć po beogradskom vremenu (provera svakih 30 sekundi).
Igrice su implementirane lokalno, bez API-ja, baze i dodatnih npm zavisnosti. Rezultati su samo u trenutnoj sesiji igre, bez naloga, takmičarske liste i trajnog čuvanja.

## Instalacija u postojeći CMS

Iz ZIP-a kopirati samo:
- `components/DailyMiniGame.tsx`
- `app/[locale]/page.tsx`

Ne menjati `.env`, Prisma migracije ili bazu. Pokrenuti `npm run build` i `npm run dev`.

Igre su prototip. Nisu još potpuno lokalizovana sva pitanja/poruke i AI protivnik za iks-oks igra nasumično.
