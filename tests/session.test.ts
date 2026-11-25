import { afterEach, expect, it, vi } from 'vitest';
import { readSession, writeSession } from '../src/standalone/session';
import { createJellyfinHost } from '../src/jellyfin/client';
function storage() {
 const data = new Map<string,string>();
 return {getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}};
}
afterEach(()=>vi.unstubAllGlobals());
it('restores only the session fields and clears on sign-out',()=>{
 const store=storage();
 const session={server:'https://example.test',token:'test-token',userId:'user',deviceId:'device',password:'must-not-persist'};
 writeSession(store,session);
 expect(readSession(store)).toEqual({server:session.server,token:session.token,userId:session.userId,deviceId:session.deviceId});
 expect(store.getItem('shorts-session-v1')).not.toContain('must-not-persist');
 writeSession(store,null); expect(readSession(store)).toBeNull();
});
it('ignores corrupt or unsafe saved sessions',()=>{
 const store=storage();store.setItem('shorts-session-v1','not-json');expect(readSession(store)).toBeNull();
 store.setItem('shorts-session-v1',JSON.stringify({server:'javascript:alert(1)',token:'test',userId:'user',deviceId:'device'}));expect(readSession(store)).toBeNull();
});
it('continues safely when storage is unavailable',()=>{
 const store={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');},removeItem(){throw Error('blocked');}};
 expect(readSession(store)).toBeNull();expect(()=>writeSession(store,null)).not.toThrow();
});
it('expires a rejected session without treating network errors as sign-out',async()=>{
 const expired=vi.fn();
 const host=createJellyfinHost({server:'https://example.test',token:'test',userId:'user',deviceId:'device'},()=>{},expired);
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(null,{status:401})));
 await expect(host.libraries(new AbortController().signal)).rejects.toThrow('Session expired');expect(expired).toHaveBeenCalledOnce();
 expired.mockClear();vi.stubGlobal('fetch',vi.fn(async()=>{throw new TypeError('network');}));
 await expect(host.libraries(new AbortController().signal)).rejects.toThrow('network');expect(expired).not.toHaveBeenCalled();
});
