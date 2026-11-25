import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { locatePreviewTime, type Preview } from '../core/preview';
import type { ShortsHost } from '../host/types';
import { PreparedMedia } from '../playback/PreparedMedia';
export interface PlayerHandle { seek(seconds: number): void }
export const Player=forwardRef<PlayerHandle,{preview:Preview;host:ShortsHost;muted:boolean;paused:boolean;preloadNext?:boolean;onComplete():void;onProgress(value:number):void;onNeedsPlay():void}>(function Player(props,handle){
  const refs=[useRef<HTMLVideoElement>(null),useRef<HTMLVideoElement>(null)];
  const [cursor,setCursor]=useState({segment:0,within:0,revision:0});
  const [active,setActive]=useState(0);
  const [status,setStatus]=useState('');const [error,setError]=useState('');
  const latest=useRef(props);latest.current=props;
  const playing=useRef<HTMLVideoElement|null>(null);
  useImperativeHandle(handle,()=>({seek(seconds){setCursor(c=>({...locatePreviewTime(props.preview,seconds),revision:c.revision+1}));}}),[props.preview]);
  useEffect(()=>{
    let cancelled=false;let frame=0;let indicator:ReturnType<typeof setTimeout>;
    let pending:PreparedMedia|undefined;
    let current:PreparedMedia|undefined;let prepared:PreparedMedia|undefined;let preparedSegment=-1;
    let segment=cursor.segment;let within=cursor.within;let slot=0;let transitioning=false;
    const elements=refs.map(r=>r.current!);
    const preview=props.preview;
    const total=preview.excerpts.reduce((n,e)=>n+e.duration,0);
    const showWaiting=()=>{clearTimeout(indicator);indicator=setTimeout(()=>{if(!cancelled)setStatus('Buffering…');},350);};
    const clearWaiting=()=>{clearTimeout(indicator);if(!cancelled)setStatus('');};
    const play=()=>{
      if(current && !latest.current.paused) void current.element.play().catch(()=>{if(!cancelled){setStatus('Tap Play to start');latest.current.onNeedsPlay();}});
    };
    const prepareNext=()=>{
      if(latest.current.preloadNext===false || segment+1>=preview.excerpts.length)return;
      preparedSegment=segment+1;
      prepared=new PreparedMedia(elements[1-slot],props.host,preview.video,preview.excerpts[preparedSegment].start);
      // A speculative failure is retried through the normal foreground path.
      void prepared.ready.catch(()=>{});
    };
    const activate=async(next:PreparedMedia,nextSlot:number,nextSegment:number,nextWithin:number)=>{
      pending=next;transitioning=true;showWaiting();
      try{
        await next.ready;if(cancelled)return;
        current?.dispose();current=next;pending=undefined;slot=nextSlot;segment=nextSegment;within=nextWithin;
        playing.current=next.element;next.element.muted=latest.current.muted;
        setActive(slot);setError('');clearWaiting();transitioning=false;play();prepareNext();
      }catch{
        next.dispose();if(!cancelled){clearWaiting();setError('Unable to play this moment. Try seeking or skip this video.');}
      }
    };
    const advance=async()=>{
      if(transitioning)return;
      if(segment+1>=preview.excerpts.length){transitioning=true;current?.element.pause();latest.current.onComplete();return;}
      transitioning=true;showWaiting();current?.element.pause();
      const nextSegment=segment+1;const nextSlot=1-slot;
      let next=preparedSegment===nextSegment?prepared:undefined;prepared=undefined;preparedSegment=-1;
      pending=next;
      if(next){try{await next.ready;}catch{next.dispose();next=undefined;}}
      if(cancelled)return;
      next??=new PreparedMedia(elements[nextSlot],props.host,preview.video,preview.excerpts[nextSegment].start);
      void activate(next,nextSlot,nextSegment,0);
    };
    const tick=()=>{
      if(!cancelled && current && !transitioning && !current.element.seeking){
        const elapsed=Math.max(0,current.element.currentTime-preview.excerpts[segment].start);
        latest.current.onProgress(Math.min(1,(preview.excerpts.slice(0,segment).reduce((n,e)=>n+e.duration,0)+elapsed)/total));
        if(elapsed>=preview.excerpts[segment].duration-.04 || current.element.ended)void advance();
      }
      if(!cancelled)frame=requestAnimationFrame(tick);
    };
    elements.forEach(v=>{v.addEventListener('waiting',showWaiting);v.addEventListener('playing',clearWaiting);});
    setError('');
    const initial=new PreparedMedia(elements[0],props.host,preview.video,preview.excerpts[segment].start+within);
    void activate(initial,0,segment,within);frame=requestAnimationFrame(tick);
    return ()=>{
      cancelled=true;clearTimeout(indicator);cancelAnimationFrame(frame);playing.current=null;
      elements.forEach(v=>{v.removeEventListener('waiting',showWaiting);v.removeEventListener('playing',clearWaiting);});
      initial.dispose();current?.dispose();prepared?.dispose();pending?.dispose();
    };
  },[props.preview,props.host,cursor,props.preloadNext]);
  useEffect(()=>{const v=playing.current;if(!v)return;v.muted=props.muted;if(props.paused)v.pause();else void v.play().catch(()=>latest.current.onNeedsPlay());},[props.paused,props.muted]);
  return <>{refs.map((ref,i)=><video key={i} ref={ref} playsInline preload="auto" aria-label={props.preview.video.name} aria-hidden={i!==active} style={{position:'absolute',inset:0,visibility:i===active?'visible':'hidden'}}/>)}{status&&!error&&<div className="shorts-status" role="status">{status}</div>}{error&&<div className="shorts-status shorts-error" role="alert">{error}</div>}</>;
});
