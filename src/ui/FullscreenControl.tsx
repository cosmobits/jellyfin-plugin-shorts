import { useEffect, useRef, useState } from 'react';
/** Fullscreen the stable player frame so controls and segment swaps remain available. */
export function FullscreenControl() {
  const button=useRef<HTMLButtonElement>(null);
  const [active,setActive]=useState(false);
  const [error,setError]=useState('');
  const [supported,setSupported]=useState(false);
  useEffect(()=>{
    setSupported(!!document.fullscreenEnabled);
    const sync=()=>{
      setActive(document.fullscreenElement===button.current?.closest('.shorts-stage'));
      setError('');
    };
    document.addEventListener('fullscreenchange',sync);
    sync();
    return ()=>document.removeEventListener('fullscreenchange',sync);
  },[]);
  if(!supported)return null;
  const toggle=async()=>{
    const frame=button.current?.closest<HTMLElement>('.shorts-stage');
    if(!frame)return;
    try {
      if(document.fullscreenElement===frame)await document.exitFullscreen();
      else await frame.requestFullscreen();
    }catch{setError('Fullscreen could not be opened. Please try again.');}
  };
  return <><button ref={button} className="shorts-fullscreen" aria-label={active?'Exit fullscreen':'Enter fullscreen'} aria-pressed={active} onPointerDown={e=>e.stopPropagation()} onPointerUp={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();void toggle();}}><svg viewBox="0 0 24 24" aria-hidden="true"><path d={active?'M4 9h5V4M15 4v5h5M20 15h-5v5M9 20v-5H4':'M9 4H4v5M20 9V4h-5M15 20h5v-5M4 15v5h5'} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>{error&&<div className="shorts-status" role="status">{error}</div>}</>;
}
