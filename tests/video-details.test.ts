import { afterEach, expect, it, vi } from 'vitest';
import { createJellyfinHost } from '../src/jellyfin/client';
afterEach(()=>vi.unstubAllGlobals());
it('maps actor details and sends explicit favorite updates',async()=>{
 const fetcher=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({UserData:{IsFavorite:true},People:[{Id:'a',Name:'Actor',Type:'Actor',Role:'Lead'},{Id:'d',Name:'Director',Type:'Director'}]}))).mockResolvedValueOnce(new Response(JSON.stringify({IsFavorite:false})));
 vi.stubGlobal('fetch',fetcher);
 const host=createJellyfinHost({server:'https://example.test',userId:'viewer',token:'test-token',deviceId:'browser'},()=>{});
 expect(await host.details!('movie',new AbortController().signal)).toEqual({favorite:true,cast:[{id:'a',name:'Actor',role:'Lead',image:undefined}]});
 expect(await host.setFavorite!('movie',false)).toBe(false);
 expect(fetcher.mock.calls[1][0]).toBe('https://example.test/Users/viewer/FavoriteItems/movie');
 expect(fetcher.mock.calls[1][1].method).toBe('DELETE');
});
