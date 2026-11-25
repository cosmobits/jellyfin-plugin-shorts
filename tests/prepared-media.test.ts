import { expect, it, vi } from 'vitest';
import { PreparedMedia } from '../src/playback/PreparedMedia';
import type { ShortsHost, Stream } from '../src/host/types';
class Media extends EventTarget {
  muted=false;seeking=false;readyState=0;currentTime=0;src='';
  pause=vi.fn();load=vi.fn();removeAttribute=vi.fn();canPlayType(){return '';}
}
it('waits for buffered media at the requested timestamp and disposes once',async()=>{
  const media=new Media();const dispose=vi.fn(async()=>{});
  const stream={url:'https://example.test/video',offset:50,hls:false,dispose};
  const prepared=new PreparedMedia(media as unknown as HTMLVideoElement,{stream:async()=>stream} as unknown as ShortsHost,{id:'v',name:'Video',duration:100},50);
  let ready=false;void prepared.ready.then(()=>{ready=true;});
  await Promise.resolve();media.dispatchEvent(new Event('loadedmetadata'));await Promise.resolve();
  expect(ready).toBe(false);expect(media.currentTime).toBe(50);
  media.readyState=3;media.dispatchEvent(new Event('canplay'));await prepared.ready;
  expect(ready).toBe(true);prepared.dispose();prepared.dispose();expect(dispose).toHaveBeenCalledOnce();
});
it('cleans up a stream that arrives after cancellation',async()=>{
  let resolve!:(stream:Stream)=>void;
  const stream=new Promise<Stream>(r=>{resolve=r;});const dispose=vi.fn(async()=>{});
  const prepared=new PreparedMedia(new Media() as unknown as HTMLVideoElement,{stream:()=>stream} as unknown as ShortsHost,{id:'v',name:'Video',duration:100},20);
  const rejected=expect(prepared.ready).rejects.toThrow('cancelled');prepared.dispose();
  resolve({url:'https://example.test/video',offset:20,hls:false,dispose});
  await rejected;await Promise.resolve();expect(dispose).toHaveBeenCalledOnce();
});
