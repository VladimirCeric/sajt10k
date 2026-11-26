# Radio 10K — Next.js CMS

> **Postavljanje na server:** pogledati `UPUTSTVO-ZA-ADMINISTRATORA.md` (kompletna instalacija korak po korak). Ostatak ovog fajla je originalni opis projekta i delom je zastareo.

Functional starter implementation for the VIŠER student radio station. **Not yet a fully production-hardened CMS**. The site and admin UI include a PostgreSQL database, Serbian Cyrillic / Latin translations, live audio player, shows, recurring schedule, one-off schedule exceptions, podcast episodes, articles and admin/editor logins.

## Installation

Requirements: Node.js 20.9+ (Node 22 LTS preferred), PostgreSQL 15+, npm.

```bash
cp .env.example .env
# Edit DATABASE_URL, SESSION_SECRET (>=32 random chars), ADMIN_EMAIL, ADMIN_PASSWORD (>=12 chars)
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Website: http://localhost:3000/ | CMS: http://localhost:3000/admin/login

**IMPORTANT:** The actual live audio stream URL was not verified. Set your real HTTPS MP3/AAC endpoint in **Admin > Settings**. The player cannot work without a valid stream. The site itself is not an Icecast/Shoutcast server. Audio must allow browsers on the page's HTTPS origin to play it. Configure CORS on the audio/metadata origin if needed.

## What's included

- Three languages in the database (show titles/descriptions/hosts, episode metadata, article text)
- Responsive dark site and sticky player, browser audio and volume control
- Recurring program slots by weekday, time-offset and broadcast hours
- Date-specific overrides, including cancellation and replacement
- CMS login, HTTP-only sameSite session JWT, password hashes, Admin/Editor roles
- Show create/edit/delete, episode CRUD, article CRUD, stream settings
- Seeded *approximate* original Radio 10K broadcast pattern (09/12/15/18). Verify exact durations and which programs air on particular days.

## Important production tasks / known limitations

- Verify and configure live stream source, CORS and optional now-playing metadata. The metadata setting is stored but not wired to the UI.
- To edit existing schedule slots in the CMS, currently delete and recreate. Recurring slot UI is creation/deletion only.
- Language chooser currently navigates to each language's home page, not the equivalent translated page.
- News editor uses **plain text**; WYSIWYG HTML/media upload and images are not yet included.
- No file upload, post publishing scheduler, media library, audit trail, backups, user-management UI, rate limiting, password reset, or automatic stream reconnect.
- Schedule exceptions currently replace overlapping program occurrences, but exceptions referencing a show that has no recurring slot on that day need an extra lookup to show its localized title.
- The player polls the schedule every 30 seconds to update its current-show label; the main page schedule changes after reload.
- Protect admin sign-in with reverse-proxy rate limiting, HTTPS, monitoring and periodic patching before public deployment. Change seed password after deployment.
- This project is independent of the original WordPress/JS site and does not import existing media or logos.

## Database quick commands

```bash
npx prisma studio
npx prisma migrate deploy
npm run build
npm start
```

### Schedule model

`dayOfWeek`: Sunday=0 ... Saturday=6. `startMinute`: minute within each listed hour, `repeatHours`: comma-separated 24h hours. Example: `dayOfWeek=1, startMinute=15, repeatHours=9,12,15,18` means Monday at 09:15, 12:15, 15:15 and 18:15, local time Europe/Belgrade.

Seed data draws from public website https://10k.viser.edu.rs/ and is provided only as initial structure; descriptions are blank for editorial review.

## Icecast Now Playing and cover art

Open `/admin/settings` and configure:

- **HTTPS audio stream URL**: the actual playable Icecast mount, e.g. `https://radio.example.com/live.mp3`.
- **Icecast JSON URL**: `https://radio.example.com/status-json.xsl`. Leave blank to derive it from the stream's HTTPS origin.
- **Fallback album cover URL**: optional HTTPS image; built-in `/logo-radio-10k-player.jpg` is used if blank.

The `/api/now-playing` endpoint reads Icecast's public JSON (`icestats.source`) server-side, supports one or several mounts, and returns `track`, `current` scheduled show, and `next` show. The player refreshes every 30 seconds without interrupting live audio. If Icecast returns `Artist - Title` in `title`, the string is parsed; if separate `artist` is present it is used. Artwork is looked up by **exact artist and track title** using the public iTunes Search API; if there is no verified match, the station fallback image is used. Artwork lookups are optional, cached (positive 24h, negative 6h per server process), and may be unavailable due to provider restrictions. No album art is embedded in Icecast's standard JSON response. The player uses ordinary HTML images and does not require Next remote image configuration.

Test Icecast metadata with `curl -s https://YOUR-HOST/status-json.xsl | python3 -m json.tool`. Ensure the HTTPS status endpoint is available from the Next.js server. If multiple Icecast mounts exist, the CMS tries to match the `listenurl` path to the configured stream URL. Streaming and metadata can have separate origins.
