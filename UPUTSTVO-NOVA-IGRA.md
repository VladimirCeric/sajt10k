# Kako se dodaje nova igra nedelje

Igre su deo sajta (kod), pa se novi folder kopira u projekat i upiše u jedan spisak. Admin, smena po nedeljama i naslovna se posle toga sami popune.

## Šta igra mora da ima (kao Zvukožder i 2048)
- folder **`components/<ime-igre>/`** — glavna komponenta (npr. `NovaIgra.tsx`), njen `.module.css` i `Dialog.tsx`
- folder **`lib/<ime-igre>/`** — logika igre (ako je ima)
- (ako igra ima dodatne fajlove: u folder **`public/<ime-igre>/`**)
- glavna komponenta mora da prima `locale` i `autoHelp` (isto kao ostale dve)

## Koraci
1. Kopiraj folder igre u `components/` (i `lib/`, `public/` ako ih ima).
2. Otvori **`lib/games.tsx`**. Odmah ispod ostalih `import` redova dodaj:
   ```
   import NovaIgra from '@/components/nova-igra/NovaIgra';
   ```
3. U istom fajlu, u listi `WEEKLY_GAMES`, dodaj jedan red (već postoji primer u komentaru):
   ```
   {id:'nova-igra',name:{cyr:'Нова игра',lat:'Nova igra'},Component:NovaIgra as ComponentType<GameProps>},
   ```
   - `id` je kratko ime bez razmaka i kvačica (upisuje se u bazu, posle se ne menja)
   - `name` je naziv na ćirilici i latinici
4. Sačuvaj fajl. To je sve.

## Šta se dešava samo
- na stranici **Admin → Igra nedelje** pojavljuje se u izboru
- uključuje se u **automatsku smenu** po nedeljama (ako ništa nije izabrano)
- na naslovnoj se prikazuje u kartici „Igra nedelje“

## Provera (Terminal)
```
cd ~/Downloads/radio10k-sajt
npm run dev
```
Otvori `http://localhost:3000/admin/igra-nedelje`, izaberi novu igru za ovu nedelju, pa `http://localhost:3000/sr-latn` — igra treba da bude u kartici „Igra nedelje“. Brza provera bez menjanja izbora: `http://localhost:3000/sr-latn?igra=nova-igra`.

Ako igra ne radi, najčešće fali neki fajl iz `lib/` ili `public/` pa ga treba dokopirati.

> Napomena: **Tajna reč** je dnevna igra i nije u ovom spisku (stalno je prva kartica).
