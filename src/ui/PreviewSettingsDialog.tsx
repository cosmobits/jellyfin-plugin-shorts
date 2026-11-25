import { useEffect, useRef, useState } from 'react';
import type { Library } from '../host/types';
import { defaultPreviewSettings, normalizePreviewSettings, type PreviewSettings } from '../core/preview';
const bands = [
  {title:'Quick clips',range:'Up to 30 seconds'},
  {title:'Short videos',range:'Over 30 seconds to 3 minutes'},
  {title:'Medium videos',range:'Over 3 to 10 minutes'},
  {title:'Long videos',range:'Over 10 to under 40 minutes'},
  {title:'Movies & more',range:'40 minutes and above'}
];
export function PreviewSettingsDialog({settings,libraries,library,onSave,onClose}:{settings:PreviewSettings;libraries:Library[];library:string;onSave(settings:PreviewSettings,library:string):void;onClose():void}) {
  const [draftLibrary,setDraftLibrary] = useState(library);
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft,setDraft] = useState(() => normalizePreviewSettings(settings));
  useEffect(() => { dialog.current?.showModal(); }, []);
  const update = (key:'maxDurations'|'excerptDurations', index:number, value:number) => {
    setDraft(previous => {const values = [...previous[key]] as PreviewSettings[typeof key]; values[index]=value; return {...previous,[key]:values};});
  };
  return <dialog ref={dialog} className="shorts-settings-dialog" id="preview-settings" aria-labelledby="settings-title" aria-describedby="settings-description" onCancel={onClose} onClose={onClose} onClick={e => {if(e.target === e.currentTarget) {const r=e.currentTarget.getBoundingClientRect(); if(e.clientX<r.left || e.clientX>r.right || e.clientY<r.top || e.clientY>r.bottom) onClose();}}}>
    <div className="shorts-settings-heading"><div><p className="shorts-eyebrow">MAKE IT YOURS</p><h2 id="settings-title">Your preview rhythm</h2><p id="settings-description">Choose how much to see, and how often to jump to a new moment.</p></div><button className="shorts-settings-close" aria-label="Close settings" onClick={onClose}>×</button></div>
    <div className="shorts-settings-scroll"><section className="shorts-library-setting"><label htmlFor="settings-library">Your library</label><p>Choose which collection to explore.</p><select id="settings-library" value={draftLibrary} onChange={e=>setDraftLibrary(e.target.value)} disabled={!libraries.length}>{!libraries.length && <option value="">No libraries available</option>}{libraries.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></section><section className="shorts-library-setting"><label htmlFor="settings-aspect">Player shape</label><p>Fit your screen, or choose a vertical or horizontal frame. Videos keep their original proportions.</p><select id="settings-aspect" value={draft.aspectRatio} onChange={e=>setDraft({...draft,aspectRatio:e.target.value})}>{[["auto","Fit screen"],["9:16","Vertical · 9:16"],["4:5","Portrait · 4:5"],["1:1","Square · 1:1"],["4:3","Classic · 4:3"],["16:9","Horizontal · 16:9"],["21:9","Cinema · 21:9"]].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></section><div className="shorts-settings-explainer"><span aria-hidden="true">◷</span><p><strong>Preview length</strong> is the total time per video.<br/><strong>Moment length</strong> controls each excerpt before jumping ahead.</p></div>
    <div className="shorts-duration-cards">{bands.map((band,i) => {
      const total=draft.maxDurations[i]; const count=Math.ceil(total/draft.excerptDurations[i]); const actual=total/count;
      const seconds=Number(actual.toFixed(1));
      return <section className="shorts-duration-card" key={band.title} aria-labelledby={`band-${i}`}><div className="shorts-duration-title"><h3 id={`band-${i}`}>{band.title}</h3><span>{band.range}</span></div><div className="shorts-duration-inputs"><label>Preview length<select aria-label={`${band.title} preview length`} value={total} onChange={e=>update('maxDurations',i,Number(e.target.value))}>{Array.from(new Set([5,10,15,20,30,40,45,60,90,120,total])).sort((a,b)=>a-b).map(n=><option key={n} value={n}>{n} seconds</option>)}</select></label><label>Moment length<select aria-label={`${band.title} moment length`} value={draft.excerptDurations[i]} onChange={e=>update('excerptDurations',i,Number(e.target.value))}>{Array.from(new Set([2,3,5,10,15,20,30,draft.excerptDurations[i]])).sort((a,b)=>a-b).map(n=><option key={n} value={n}>Up to {n} seconds</option>)}</select></label></div><div className="shorts-duration-summary"><div className="shorts-moment-strip" aria-hidden="true">{Array.from({length:Math.min(count,24)},(_,j)=><span key={j}/>)}</div><p>{total}-second preview · {count === 1 ? '1 moment' : `${count} moments`} of {seconds} seconds</p></div></section>;
    })}</div><p className="shorts-settings-note">Shorter than the preview? The whole video plays in one go. Longer videos sample moments from across their timeline.</p></div>
    <footer className="shorts-settings-footer"><button className="shorts-reset" onClick={()=>setDraft(normalizePreviewSettings(defaultPreviewSettings))}>Reset defaults</button><div><button onClick={onClose}>Cancel</button><button className="shorts-save" onClick={()=>onSave(normalizePreviewSettings(draft),draftLibrary)}>Save changes</button></div><small>Saving starts a fresh feed. Your choices are remembered on this browser.</small></footer>
  </dialog>;
}
