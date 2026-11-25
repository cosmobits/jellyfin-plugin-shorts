import Hls from 'hls.js';
import type { ShortsHost, Stream } from '../host/types';
import type { Video } from '../core/preview';
/** Owns a single media element and its server session, including cancelled preparation. */
export class PreparedMedia {
  private abort=new AbortController();
  private stream?:Stream;
  private hls?:Hls;
  private listeners:Array<[string,EventListener]>=[];
  private timeout?:ReturnType<typeof setTimeout>;
  private reject?: (error:Error)=>void;
  readonly ready:Promise<void>;
  constructor(readonly element:HTMLVideoElement,host:ShortsHost,video:Video,start:number) {
    element.muted=true;
    this.ready=new Promise<void>((resolve,reject)=>{
      this.reject=reject;
      const fail=()=>{clearTimeout(this.timeout);reject(new Error('Unable to prepare this moment. Try another video.'));};
      const check=()=>{
        if(!this.stream || element.seeking || element.readyState<3)return;
        if(Math.abs(element.currentTime-this.stream.offset)>1)return;
        clearTimeout(this.timeout);this.reject=undefined;resolve();
      };
      const loaded=()=>{if(this.stream){try{element.currentTime=this.stream.offset;}catch{fail();}check();}};
      for(const [event,callback] of [['loadedmetadata',loaded],['seeked',check],['canplay',check],['progress',check],['error',fail]] as const){
        element.addEventListener(event,callback);this.listeners.push([event,callback]);
      }
      this.timeout=setTimeout(fail,30000);
      void host.stream(video,start,this.abort.signal).then(stream=>{
        if(this.abort.signal.aborted){void stream.dispose().catch(()=>{});return;}
        this.stream=stream;
        if(stream.hls && !element.canPlayType('application/vnd.apple.mpegurl') && Hls.isSupported()){
          this.hls=new Hls({startPosition:stream.offset,maxBufferLength:8,maxMaxBufferLength:12});
          this.hls.on(Hls.Events.ERROR,(_,data)=>{if(data.fatal)fail();});
          this.hls.loadSource(stream.url);this.hls.attachMedia(element);
        }else{element.src=`${stream.url}#t=${stream.offset}`;element.load();}
      }).catch(error=>{clearTimeout(this.timeout);reject(error);});
    });
  }
  dispose(){
    if(this.abort.signal.aborted)return;
    this.abort.abort();clearTimeout(this.timeout);this.reject?.(new Error('Preparation cancelled'));
    for(const [event,callback] of this.listeners)this.element.removeEventListener(event,callback);
    this.element.pause();this.element.muted=true;this.hls?.destroy();
    this.element.removeAttribute('src');this.element.load();
    void this.stream?.dispose().catch(()=>{});
  }
}
