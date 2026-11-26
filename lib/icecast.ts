/** Icecast 2.4+ public /status-json.xsl reader (no Icecast credentials required). */
export type Track = { artist: string; title: string; artwork: string | null; listeners: number | null; durationSec: number | null; progressSec: number | null };
type Source = Record<string, unknown>;
function maybeFixMojibake(value: string): string {
  // Typical UTF-8 bytes misread as Latin-1/Windows-1252 (e.g. "Ä", "Ã¡").
  if (!/[ÃÄÅÐÑÂâ]/.test(value)) return value;
  try {
    const repaired = Buffer.from(value, 'latin1').toString('utf8');
    if (!repaired || repaired.includes('\uFFFD')) return value;
    return repaired;
  } catch {
    return value;
  }
}
const asString = (v: unknown) => typeof v === 'string' ? maybeFixMojibake(v).trim() : '';
function asNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
function pickNumber(source: Source, keys: string[]): number | null {
  for (const key of keys) {
    const n = asNumber(source[key]);
    if (n !== null && n >= 0) return n;
  }
  return null;
}
function webUrl(value: string): string | null {
  try { const u = new URL(value.startsWith('//') ? `https:${value}` : value); return /^https?:$/.test(u.protocol) ? u.toString() : null; } catch { return null; }
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
function sourceArtwork(source: Source): string | null {
  const keys = ['artwork','cover','image','album_art','albumart','artwork_url','cover_url','image_url'];
  for (const key of keys) {
    const url = webUrl(asString(source[key]));
    if (url) return url;
  }
  return null;
}
function parseTrack(source: Source): Track {
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
  const durationSec = pickNumber(source,['duration','duration_sec','track_duration','song_duration','length','len']);
  const progressSec = pickNumber(source,['elapsed','progress','position','played','offset']);
  return {
    artist,
    title,
    artwork: sourceArtwork(source),
    listeners: source.listeners === undefined || !Number.isFinite(listeners) ? null : listeners,
    durationSec,
    progressSec: progressSec!==null&&durationSec!==null?Math.min(progressSec,durationSec):progressSec
  };
}

export async function readIcecast(metadataUrl: string, streamUrl: string): Promise<Track | null> {
  const url = /^https?:\/\//.test(metadataUrl) ? metadataUrl : null; // server čita adresu, pa je dozvoljen i http
  if (!url) return null;
  const response = await fetch(url, { signal: AbortSignal.timeout(4500), next: { revalidate: 12 }, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Icecast metadata HTTP ' + response.status);
  const json: unknown = await response.json();
  const source = sourceFor(json,streamUrl);
  return source ? parseTrack(source) : null;
}
export function icecastStatusUrl(streamUrl: string): string | null {
  try { const u = new URL(streamUrl); return /^https?:$/.test(u.protocol) ? `${u.origin}/status-json.xsl` : null; } catch { return null; }
}
