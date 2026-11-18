# Radio 10K: uputstvo za postavljanje sajta (za administratora)

Sajt je Next.js aplikacija sa PostgreSQL bazom. Radi kao jedan proces (port 3000) iza nginx-a. Ovo uputstvo opisuje čistu instalaciju na Linux serveru (primer: Ubuntu 22.04 ili 24.04). Komande sa `sudo` pokreće korisnik sa administratorskim pravima.

## 1. Šta je potrebno

| Stavka | Zahtev |
| --- | --- |
| Operativni sistem | Linux (Ubuntu/Debian), sa `openssl` (potreban Prisma biblioteci) |
| Node.js | 22 LTS (najmanje 20.9) |
| PostgreSQL | 15 ili novija |
| Veb server | nginx (proksi + HTTPS) |
| Domen i sertifikat | `10k.viser.edu.rs`, HTTPS sertifikat (Let's Encrypt ili školski) |
| Resursi | oko 1 GB RAM-a, najmanje 5 GB slobodnog prostora (slike i snimci podkasta) |
| Izlazni pristup sa servera | `api.open-meteo.com` (443, vreme na naslovnoj; besplatno, bez naloga). Opciono `itunes.apple.com` (omoti pesama u plejeru) |
| Ulazni portovi | 80 i 443 javno. 3000 (aplikacija) i 5432 (baza) samo lokalno. |

Radio strim (Icecast, port 8000) već postoji i ne instalira se ovde. Sajt ga samo prikazuje (vidi odeljak 5).

## 2. Privremena strana (do dana puštanja)

Uz sajt dolazi fajl `privremena-strana/index.html`: jedna strana „Radio ponovo radi!“ sa odbrojavanjem. Nema baze ni servera. Datum se menja u liniji `var LAUNCH=` na početku skripte u fajlu.

```nginx
server {
    listen 443 ssl;
    server_name 10k.viser.edu.rs;
    # ssl_certificate ... ssl_certificate_key ...
    root /var/www/radio10k-privremena;   # u ovaj folder kopirati privremena-strana/index.html
    index index.html;
}
```

Na dan puštanja ovaj `server` blok se zameni blokom iz odeljka 4.7. Isti fajl služi i kao rezerva ako sajt padne: nginx se privremeno usmeri na njega.

## 3. Priprema servera

```bash
# Node.js 22 (primer za Ubuntu, preko NodeSource)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs postgresql nginx git openssl

# korisnik i folder za aplikaciju
sudo adduser --system --group --home /srv/radio10k radio10k
sudo mkdir -p /srv/radio10k && sudo chown radio10k:radio10k /srv/radio10k
```

## 4. Instalacija

### 4.1 Baza

```bash
sudo -u postgres psql
```

```sql
CREATE USER radio10k WITH PASSWORD 'IZABERI_JAKU_LOZINKU';
CREATE DATABASE radio10k OWNER radio10k;
\q
```

### 4.2 Kod

```bash
sudo -u radio10k -H bash
cd /srv/radio10k
git clone https://github.com/VladimirCeric/sajt10k.git app        # ili raspakovati dobijenu arhivu u /srv/radio10k/app
cd app
```

Repozitorijum je privatan. Vladimir mora da doda administratora kao saradnika (GitHub → repozitorijum → Settings → Collaborators), pa će `git clone` tražiti prijavu administratorovog GitHub naloga (kao lozinka služi „personal access token“, ne obična lozinka). Ako to nije moguće, Vladimir šalje arhivu koda umesto toga.

### 4.3 Podešavanja (`.env`)

```bash
cp .env.example .env
chmod 600 .env
nano .env
```

| Promenljiva | Vrednost |
| --- | --- |
| `DATABASE_URL` | `postgresql://radio10k:LOZINKA_IZ_4.1@127.0.0.1:5432/radio10k?schema=public` |
| `SESSION_SECRET` | nasumičan niz od najmanje 32 znaka: `openssl rand -base64 48` |
| `ADMIN_EMAIL` | adresa prvog administratora sajta |
| `ADMIN_PASSWORD` | lozinka tog administratora, najmanje 12 znakova (koristi se samo pri prvom pokretanju) |
| `NEXT_PUBLIC_SITE_URL` | `https://10k.viser.edu.rs` |

### 4.4 Instalacija paketa, baza i izgradnja

Redosled je važan. Za instalaciju paketa **ne** postavljati `NODE_ENV=production` (potreban je i alat za prvo punjenje baze).

```bash
npm ci
npx prisma migrate deploy      # pravi tabele; NE koristiti "migrate dev"
npm run db:seed                # pravi samo administratora i prazno podešavanje strima
npm run build
```

Posle uspešnog `db:seed` obrisati liniju `ADMIN_PASSWORD` iz `.env`.

### 4.5 Pokretanje kao servis (systemd)

Datoteka `/etc/systemd/system/radio10k.service`:

```ini
[Unit]
Description=Radio 10K sajt
After=network.target postgresql.service

[Service]
User=radio10k
WorkingDirectory=/srv/radio10k/app
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start -- -H 127.0.0.1 -p 3000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now radio10k
sudo systemctl status radio10k
```

`WorkingDirectory` mora biti koren projekta: tu se nalazi folder `uploads/` sa slikama i snimcima. Aplikacija ga sama pravi.

### 4.6 nginx: opšta podešavanja

U `http { ... }` bloku (npr. `/etc/nginx/conf.d/radio10k.conf`, izvan `server`):

```nginx
limit_req_zone $binary_remote_addr zone=r10k_login:10m rate=10r/m;
gzip on;
gzip_types text/css application/javascript application/json image/svg+xml;
```

### 4.7 nginx: sajt, otpremanje i strim

```nginx
server {
    listen 80;
    server_name 10k.viser.edu.rs;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name 10k.viser.edu.rs;
    # ssl_certificate ... ssl_certificate_key ...

    client_max_body_size 160m;        # snimci podkasta do 150 MB; slike do 2 MB

    # Icecast strim kroz isti domen (HTTPS, bez CORS problema).
    # Zameniti 127.0.0.1:8000 adresom Icecast servera ako nije na istoj mašini.
    location = /stream {
        proxy_pass http://127.0.0.1:8000/stream;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_read_timeout 1h;
    }

    # ograničenje pokušaja prijave
    location = /admin/login {
        limit_req zone=r10k_login burst=5 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### 4.7a Vatrozid

Otvoriti samo 80 i 443. Portovi 3000 i 5432 ne smeju biti dostupni spolja. Port 8000 je spolja potreban samo ako se strim i dalje daje direktno na toj adresi.

## 5. Prva prijava i podešavanje

1. Otvoriti `https://10k.viser.edu.rs/admin/login` i prijaviti se sa `ADMIN_EMAIL` i `ADMIN_PASSWORD`.
2. U **Podešavanja** upisati:
   - **Adresa audio strima:** `https://10k.viser.edu.rs/stream`. Strim mora biti HTTPS, jer pregledač blokira `http` strim na HTTPS strani. Adresa koja se završava na `.m3u` (lista za puštanje) se u adminu sama skraćuje na sam strim.
   - **Icecast JSON adresa** (naziv pesme i izvođač): `http://127.0.0.1:8000/status-json.xsl` (adresa se čita sa servera, pa može biti `http`). Ako je prazno, uzima se automatski sa adrese strima.
3. Prekidači menija i privremene strane su u istim Podešavanjima (odeljak 8).

## 6. Prenos postojećeg sadržaja (preporučeno)

Emisije, raspored, ljude, tekstove i slike Vladimir je već uneo na svom računaru. Najlakše ih je preneti kopijom baze i foldera `uploads/`.

Na Vladimirovom računaru (zameniti podatke iz svog `.env`):

```bash
pg_dump --no-owner --no-privileges -Fc "postgresql://KORISNIK:LOZINKA@127.0.0.1:5432/IMEBAZE" -f radio10k.dump
```

Na serveru, posle koraka 4.4 (migracije), **bez** `db:seed`:

```bash
pg_restore --clean --if-exists --no-owner --no-privileges -d "postgresql://radio10k:LOZINKA@127.0.0.1:5432/radio10k" radio10k.dump
cp -r uploads /srv/radio10k/app/        # folder uploads sa Vladimirovog računara
```

Administratorski nalog tada dolazi iz kopirane baze (e-mail i lozinka sa Vladimirovog računara). Da bi na serveru važili novi podaci, odmah posle vraćanja baze pokrenuti (u folderu aplikacije; e-mail i lozinku upisuje Vladimir, lozinka najmanje 12 znakova):

```bash
cd /srv/radio10k/app
ADMIN_EMAIL='nova@adresa.rs' ADMIN_PASSWORD='nova-duga-lozinka' npm run admin:set
```

Komanda zamenjuje postojećeg administratora novim podacima (stari e-mail i lozinka prestaju da važe). Može se ponoviti kad god treba promeniti lozinku.

## 7. Provera posle instalacije

- [ ] Početna strana se otvara preko HTTPS.
- [ ] Prijava u admin radi.
- [ ] Plejer svira radio i prikazuje pesmu (donja traka).
- [ ] „Beograd sada“ na naslovnoj prikazuje temperaturu (znači da server dosiže `api.open-meteo.com`).
- [ ] Otpremanje slike u adminu uspeva, i slika se vidi na sajtu.
- [ ] Otpremanje većeg fajla (npr. 20 MB snimak u Podkast) ne daje grešku 413 (ako daje: `client_max_body_size` nije postavljen).
- [ ] Posle `sudo systemctl restart radio10k` sve i dalje radi, a otpremljene slike su i dalje tu.

## 8. Prekidači u adminu

U **Podešavanja** (samo za administratora):

- **Meni sajta:** prikaz linkova „Podkast“ i „O nama“. Isključena strana i dalje postoji i otvara se direktnom adresom.
- **Privremena strana:** kad je uključena, posetioci vide samo nju (naslov, poruka, opciono odbrojavanje, bez plejera), a prijavljeni urednici vide pravi sajt sa podsetnikom na vrhu. Korisno ako radio ili održavanje zapne. Ako ceo server ne radi, koristi se samostalni `index.html` iz odeljka 2.

## 9. Održavanje

**Bekap** (najmanje dnevno):

```bash
pg_dump -Fc "postgresql://radio10k:LOZINKA@127.0.0.1:5432/radio10k" -f /backup/radio10k-$(date +%F).dump
rsync -a /srv/radio10k/app/uploads/ /backup/uploads/
```

**Ažuriranje** na novu verziju:

```bash
sudo -u radio10k -H bash
cd /srv/radio10k/app
git pull                         # ili raspakovati novu arhivu preko foldera (ne brisati .env i uploads)
npm ci
npx prisma migrate deploy
npm run build
exit
sudo systemctl restart radio10k
```

Folder `uploads/` i fajl `.env` se nikada ne brišu pri ažuriranju.

**Dnevnik rada:** `sudo journalctl -u radio10k -f`

## 10. Česti problemi

| Simptom | Uzrok i rešenje |
| --- | --- |
| Radio ne svira, a u adminu je upisana adresa | Strim je `http` na HTTPS strani, ili adresa završava na `.m3u`. Upisati `https://10k.viser.edu.rs/stream` (odeljak 4.7 i 5). |
| Greška 413 pri otpremanju | Nema `client_max_body_size 160m;` u nginx-u. |
| Vreme se ne prikazuje | Server ne dosiže `api.open-meteo.com` (zaštitni zid ili proksi). |
| Aplikacija ne startuje, „SESSION_SECRET must contain at least 32 characters“ | `SESSION_SECRET` nije podešen ili je prekratak. |
| Greška o bazi | Proveriti `DATABASE_URL` i da PostgreSQL radi: `sudo systemctl status postgresql`. |
| Slike nestale posle ažuriranja | Folder `uploads/` je obrisan ili je promenjen `WorkingDirectory`. Vratiti iz bekapa. |

## 11. Napomene

- Vremenska prognoza dolazi sa besplatnog servisa Open-Meteo (nekomercijalna upotreba, ispod 10.000 poziva dnevno). Na sajtu stoji obavezna oznaka „Prognoza: Open-Meteo“ i ne sme se ukloniti.
- Pesme na plejeru imaju omot koji se traži preko javne iTunes pretrage. Ako taj servis nije dostupan, prikazuje se podrazumevana slika.
- Tabele `Episode` i `EpisodeTranslation` u bazi se više ne koriste. Ne smetaju, i nije ih potrebno brisati.
