import { afterEach, expect, it, vi } from 'vitest';
import { createPluginHost } from '../src/plugin/host';
const api={getUrl:()=> 'https://example.test/jellyfin/',getCurrentUserId:()=> 'viewer',accessToken:()=> 'runtime-only-test-token',deviceId:()=> 'browser-device'};
afterEach(()=>vi.unstubAllGlobals());
it('uses the existing session and server base path without logging out the host',async()=>{
  const navigate=vi.fn();
  const fetchMock=vi.fn(async(_url: unknown, _init?: RequestInit)=>new Response(JSON.stringify({Items:[{Id:'movies',Name:'Movies'}]})));
  vi.stubGlobal('fetch',fetchMock);
  const host=createPluginHost(api,navigate);
  expect(await host.libraries(new AbortController().signal)).toEqual([{id:'movies',name:'Movies'}]);
  expect(fetchMock.mock.calls[0]?.[0]).toBe('https://example.test/jellyfin/Users/viewer/Views');
  expect(host.exitLabel).toBe('Back to Jellyfin');
  host.exit(); expect(navigate).toHaveBeenLastCalledWith('#/home');
  host.openVideo({id:'item',name:'Item',duration:8});expect(navigate).toHaveBeenLastCalledWith('#/details?id=item');
  expect(fetchMock).toHaveBeenCalledOnce();
});
it('stores only preferences, scoped to server and viewer',()=>{
  const values=new Map<string,string>();
  const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};
  const host=createPluginHost(api,()=>{},storage);
  const settings={maxDurations:[10,20,30,40,60] as [number,number,number,number,number],excerptDurations:[2,3,5,10,15] as [number,number,number,number,number]};
  host.savePreviewSettings?.(settings);
  expect([...values.values()][0]).not.toContain(api.accessToken());
  expect(createPluginHost(api,()=>{},storage).previewSettings).toEqual(settings);
  expect(createPluginHost({...api,getCurrentUserId:()=> 'another-viewer'},()=>{},storage).previewSettings?.excerptDurations).toEqual([5,5,5,5,5]);
});
it('requires an existing login',()=>{
  expect(()=>createPluginHost({...api,accessToken:()=>''},()=>{})).toThrow('Sign in');
});
