import type { ShortsHost, Stream } from '../host/types';
import type { Video } from '../core/preview';
export interface Session { server: string; token: string; userId: string; deviceId: string }
const ticks = 10_000_000;
function authorization(device: string, token?: string) {
  return `MediaBrowser Client="Jellyfin Shorts", Device="Browser", DeviceId="${device}", Version="0.1.0"${token ? `, Token="${token}"` : ''}`;
}
export function normalizeServer(input: string) {
  const u = new URL(input);
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || u.search || u.hash) throw new Error('Enter an HTTP or HTTPS server URL without credentials or query parameters.');
  return u.href.replace(/\/$/, '');
}
class SessionExpiredError extends Error {}
async function request(session: Session, path: string, signal?: AbortSignal, init: RequestInit = {}) {
  const response = await fetch(`${session.server}${path}`, { ...init, signal, headers: { 'Content-Type': 'application/json', Authorization: authorization(session.deviceId, session.token), ...init.headers } });
  if (response.status === 401) throw new SessionExpiredError('Session expired or credentials incorrect. Please sign in again.');
  if (!response.ok) throw new Error(`Jellyfin request failed (${response.status}).`);
  return response.status === 204 ? undefined : response.json();
}
export async function signIn(server: string, username: string, password: string): Promise<Session> {
  const session = { server: normalizeServer(server), deviceId: crypto.randomUUID(), token: '', userId: '' };
  const result = await request(session, '/Users/AuthenticateByName', undefined, { method: 'POST', body: JSON.stringify({ Username: username, Pw: password }) });
  return { ...session, token: result.AccessToken, userId: result.User.Id };
}
export async function signOut(session: Session) {
  await request(session, '/Sessions/Logout', undefined, {method:'POST'});
}
export function createJellyfinHost(session: Session, exit: () => void, onExpired = exit): ShortsHost {
  const api = async (path: string, signal?: AbortSignal, init?: RequestInit) => {
    try { return await request(session,path,signal,init); }
    catch (error) { if (error instanceof SessionExpiredError && !signal?.aborted) onExpired(); throw error; }
  };
  return {
    exit,
    async libraries(signal) {
      const data = await api(`/Users/${session.userId}/Views`, signal);
      return data.Items.map((x: any) => ({ id: x.Id, name: x.Name }));
    },
    async videos(library, signal) {
      const items: Video[] = [];
      let index = 0;
      // Fetch in bounded pages so large libraries do not require one huge response.
      while (true) {
        const q = new URLSearchParams({ UserId: session.userId, ParentId: library, Recursive: 'true', IncludeItemTypes: 'Movie,Episode,Video,MusicVideo', Fields: 'RunTimeTicks', StartIndex: String(index), Limit: '200', EnableTotalRecordCount: 'true' });
        const data = await api(`/Items?${q}`, signal);
        items.push(...data.Items.filter((x: any) => x.RunTimeTicks > 0).map((x: any) => ({ id: x.Id, name: x.Name, series: x.SeriesName, duration: x.RunTimeTicks / ticks })));
        index += data.Items.length;
        if (!data.Items.length || index >= data.TotalRecordCount) break;
      }
      return items;
    },
    async stream(video, start, signal): Promise<Stream> {
      const data = await api(`/Items/${video.id}/PlaybackInfo`, signal, { method: 'POST', body: JSON.stringify({ UserId: session.userId, StartTimeTicks: Math.round(start * ticks), IsPlayback: true, EnableDirectPlay: true, EnableDirectStream: true, EnableTranscoding: true, MaxStreamingBitrate: 12_000_000, DeviceProfile: { Name: 'Shorts browser', MaxStreamingBitrate: 12_000_000, DirectPlayProfiles: [{ Container: 'mp4,m4v', Type: 'Video', VideoCodec: 'h264', AudioCodec: 'aac,mp3' }], TranscodingProfiles: [{ Container: 'ts', Type: 'Video', VideoCodec: 'h264', AudioCodec: 'aac', Protocol: 'hls', Context: 'Streaming', MaxAudioChannels: '2', MinSegments: 1, SegmentLength: 2, BreakOnNonKeyFrames: true }] } }) });
      const source = data.MediaSources?.[0];
      if (!source) throw new Error('No playable media source returned.');
      const cleanup = async () => {
        await fetch(`${session.server}/Videos/ActiveEncodings?${new URLSearchParams({ DeviceId: session.deviceId, PlaySessionId: data.PlaySessionId })}`, { method: 'DELETE', headers: { Authorization: authorization(session.deviceId, session.token) } });
      };
      if (signal.aborted) { await cleanup(); throw new DOMException('Aborted', 'AbortError'); }
      if (source.SupportsDirectPlay) {
        const q = new URLSearchParams({ Static: 'true', MediaSourceId: source.Id, api_key: session.token });
        return { url: `${session.server}/Videos/${video.id}/stream?${q}`, hls: false, offset: start, dispose: cleanup };
      }
      if (!source.TranscodingUrl) { await cleanup(); throw new Error('This source requires a playback format the server did not provide.'); }
      const url = new URL(session.server + source.TranscodingUrl);
      url.searchParams.set('api_key', session.token);
      return { url: url.href, hls: true, offset: start, dispose: cleanup };
    },
    openVideo(video) { window.open(`${session.server}/web/#/details?id=${encodeURIComponent(video.id)}`, '_blank', 'noopener,noreferrer'); }
  };
}
