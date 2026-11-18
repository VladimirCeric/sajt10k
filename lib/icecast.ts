/** Icecast 2.4+ public /status-json.xsl reader (no Icecast credentials required). */
export type Track = { artist: string; title: string; artwork: string | null; listeners: number | null };
type Source = Record<string, unknown>;
const asString = (v: unknown) => typeof v === 'string' ? v.trim() : '';
const normalized = (v: string) => v.normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
function httpsUrl(value: string): string | null {
  try { const u = new URL(value); return u.protocol === 'https:' ? u.toString() : null; } catch { return null; }
}
function sourceFor(data: unknown, streamUrl: string): Source | null {
  if (!data || typeof data !== 'object') return null;
  const icestats = (data as Record<string,unknown>).icestats;
  if (!icestats || typeof icestats !== 'object') return null;
  const sources = (icestats as Record<string,unknown>).source;
  const list = (Array.isArray(sources) ? sources : sources ? [sources] : []).filter((x): x is Source => !!x && typeof x === 'object');
  if (!list.length) return null;
  let path = '';
  try { path = decodeURIComponent(new URL(streamUrl).pathname).replace(/\/$/, ''); } catch {}
  return list.find(s => {
    const listen = asString(s.listenurl);
    try { return path !== '' && decodeURIComponent(new URL(listen).pathname).replace(/\/$/, '') === path; } catch { return false; }
  }) ?? list.find(s => asString(s.server_name).toLowerCase().includes('10k')) ?? list[0];
}
function parseTrack(source: Source): Omit<Track,'artwork'> {
  const raw = asString(source.title) || asString(source.song);
  let artist = asString(source.artist);
  let title = raw;
  if (artist && title.startsWith(artist + ' - ')) title = title.slice(artist.length + 3).trim();
  if (!artist && raw.includes(' - ')) {
    const index = raw.indexOf(' - ');
    artist = raw.slice(0,index).trim();
    title = raw.slice(index + 3).trim();
  }
  const listeners = Number(source.listeners);
  return { artist, title, listeners: source.listeners === undefined || !Number.isFinite(listeners) ? null : listeners };
}

export async function readIcecast(metadataUrl: string, streamUrl: string): Promise<Omit<Track,'artwork'> | null> {
  const url = /^https?:\/\//.test(metadataUrl) ? metadataUrl : null; // server čita adresu, pa je dozvoljen i http
  if (!url) return null;
  const response = await fetch(url, { signal: AbortSignal.timeout(4500), next: { revalidate: 12 }, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Icecast metadata HTTP ' + response.status);
  const json: unknown = await response.json();
  const source = sourceFor(json,streamUrl);
  return source ? parseTrack(source) : null;
}

// Artwork lookup is optional and never blocks audio. Cache positive/negative results per process.
const artworkCache = new Map<string,{url:string|null;expires:number}>();
const inFlight = new Map<string,Promise<string|null>>();
export async function lookupArtwork(artist: string,title: string): Promise<string|null> {
  if (!artist || !title) return null;
  const key = normalized(artist) + '|' + normalized(title);
  const existing = artworkCache.get(key);
  if (existing && existing.expires > Date.now()) return existing.url;
  if (inFlight.has(key)) return inFlight.get(key)!;
  const task = (async () => {
    let url: string | null = null;
    try {
      const endpoint = 'https://itunes.apple.com/search?' + new URLSearchParams({term:`${artist} ${title}`,entity:'song',limit:'8'});
      const response = await fetch(endpoint,{signal:AbortSignal.timeout(4500),next:{revalidate:86400}});
      if (response.ok) {
        const data = await response.json() as {results?:Array<{artistName?:string;trackName?:string;artworkUrl100?:string}>};
        const match = data.results?.find(item => normalized(item.artistName??'') === normalized(artist) && normalized(item.trackName??'') === normalized(title));
        if (match?.artworkUrl100) url = httpsUrl(match.artworkUrl100.replace(/\/100x100(bb)?\./,'/600x600bb.'));
      }
    } catch { /* No external cover art available. */ }
    if (artworkCache.size > 500) artworkCache.clear();
    artworkCache.set(key,{url,expires:Date.now() + (url ? 24 * 3600_000 : 6 * 3600_000)});
    return url;
  })();
  inFlight.set(key,task);
  try { return await task; } finally { inFlight.delete(key); }
}
export function icecastStatusUrl(streamUrl: string): string | null {
  try { const u = new URL(streamUrl); return /^https?:$/.test(u.protocol) ? `${u.origin}/status-json.xsl` : null; } catch { return null; }
}
