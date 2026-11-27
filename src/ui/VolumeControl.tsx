interface Props {
  muted: boolean;
  volume: number;
  onMute(): void;
  onVolume(value: number): void;
}
export function VolumeControl({muted,volume,onMute,onVolume}:Props) {
  return <div className="shorts-volume" onPointerDown={e=>e.stopPropagation()} onPointerMove={e=>e.stopPropagation()} onPointerUp={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()} onWheel={e=>e.stopPropagation()}>
    <button className="shorts-mute" aria-label={muted || volume===0 ? 'Unmute video' : 'Mute video'} aria-pressed={!muted && volume>0} onClick={onMute}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9z"/>{muted || volume===0 ? <path d="m16 9 5 6m0-6-5 6" fill="none" stroke="currentColor" strokeWidth="2"/> : <path d="M16 8c4 2 4 6 0 8m2-11c7 4 7 10 0 14" fill="none" stroke="currentColor" strokeWidth="2"/>}</svg></button>
    <div className="shorts-volume-panel"><input type="range" aria-label="Volume" min="0" max="100" step="1" value={muted?0:Math.round(volume*100)} aria-valuetext={`${muted?0:Math.round(volume*100)} percent`} onChange={e=>onVolume(Number(e.target.value)/100)}/></div>
  </div>;
}
