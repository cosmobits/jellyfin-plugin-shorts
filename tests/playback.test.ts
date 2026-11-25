import { afterEach, expect, it, vi } from 'vitest';
import { createJellyfinHost } from '../src/jellyfin/client';
afterEach(() => vi.unstubAllGlobals());
it('preserves distinct absolute seek positions for successive HLS excerpts', async () => {
  const fetchMock = vi.fn(async (_url: unknown, options?: RequestInit) => {
    if (options?.method === 'DELETE') return new Response(null, {status:204});
    const request = JSON.parse(String(options?.body));
    return new Response(JSON.stringify({PlaySessionId:`play-${request.StartTimeTicks}`,MediaSources:[{Id:'source',SupportsDirectPlay:false,TranscodingUrl:'/Videos/video/master.m3u8?MediaSourceId=source'}]}));
  });
  vi.stubGlobal('fetch', fetchMock);
  const host = createJellyfinHost({server:'https://example.test',token:'test-token',userId:'user',deviceId:'device'},()=>{});
  const video = {id:'video',name:'Movie',duration:7200};
  const first = await host.stream(video, 123, new AbortController().signal);
  const second = await host.stream(video, 3605, new AbortController().signal);
  expect(first.hls).toBe(true);
  expect(first.offset).toBe(123);
  expect(second.offset).toBe(3605);
  expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).StartTimeTicks).toBe(1230000000);
  expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body)).StartTimeTicks).toBe(36050000000);
  await first.dispose(); await second.dispose();
  expect(fetchMock.mock.calls[2][0]).toContain('PlaySessionId=play-1230000000');
});
it('retains the same absolute timeline for direct playback', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({PlaySessionId:'play',MediaSources:[{Id:'source',SupportsDirectPlay:true}]}))));
  const host = createJellyfinHost({server:'https://example.test',token:'test',userId:'user',deviceId:'device'},()=>{});
  const stream = await host.stream({id:'video',name:'Movie',duration:7200},2345,new AbortController().signal);
  expect(stream.hls).toBe(false); expect(stream.offset).toBe(2345);
});
