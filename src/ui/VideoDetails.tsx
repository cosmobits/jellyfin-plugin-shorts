import { useEffect, useRef, useState } from 'react';
import type { ShortsHost, VideoDetails as Details } from '../host/types';
const caches = new WeakMap<ShortsHost, Map<string, Details>>();
export function useVideoDetails(host: ShortsHost, id?: string) {
  const [state,setState]=useState<{id?:string;details?:Details;error?:string;pending?:boolean}>({});
  const current=useRef(id); current.current=id;
  const busy=useRef(new Set<string>());
  const revisions=useRef(new Map<string,number>());
  let cache=caches.get(host); if(!cache){cache=new Map();caches.set(host,cache);}
  useEffect(()=>{
    const controller=new AbortController();
    setState({id,details:id?cache.get(id):undefined});
    const revision=id?revisions.current.get(id):undefined;
    if(id && host.details) void host.details(id,controller.signal).then(details=>{
      if(controller.signal.aborted || busy.current.has(id) || revisions.current.get(id)!==revision) return;
      cache.set(id,details); if(cache.size>60) cache.delete(cache.keys().next().value!);
      setState({id,details});
    }).catch(()=>{if(!controller.signal.aborted)setState(s=>({...s,error:'Video details could not be loaded.'}));});
    return ()=>controller.abort();
  },[host,id]);
  const toggle=async()=>{
    if(!id || !state.details || !host.setFavorite || busy.current.has(id))return;
    const previous=state.details; const updated={...previous,favorite:!previous.favorite};
    revisions.current.set(id,(revisions.current.get(id)||0)+1);
    busy.current.add(id);cache.set(id,updated);setState({id,details:updated,pending:true});
    try {
      const favorite=await host.setFavorite(id,updated.favorite);
      const saved={...updated,favorite};cache.set(id,saved);
      if(current.current===id)setState({id,details:saved});
    } catch {
      cache.set(id,previous);
      if(current.current===id)setState({id,details:previous,error:'Could not save favorite. Please try again.'});
    } finally {busy.current.delete(id);}
  };
  return {details:state.id===id?state.details:undefined,pending:state.pending || (!!id && busy.current.has(id)),error:state.id===id?state.error:undefined,toggle};
}
export function Cast({details,error}:{details?:Details;error?:string}) {
  return <div className="shorts-details">{error && <p role="status">{error}</p>}{!!details?.cast.length && <section aria-label="Cast"><h2>Cast</h2><div className="shorts-cast">{details.cast.map(person=><article key={person.id}><div className="shorts-cast-photo">{person.image?<img src={person.image} alt="" loading="lazy" onError={e=>{e.currentTarget.style.display='none';}}/>:<span aria-hidden="true">♙</span>}</div><strong>{person.name}</strong>{person.role && <p>{person.role}</p>}</article>)}</div></section>}</div>;
}
