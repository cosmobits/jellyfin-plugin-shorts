import { useRef, useState } from 'react';
const format = (seconds: number) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
export function SeekBar({ progress, duration, onSeek, onScrubbingChange }: { progress: number; duration: number; onSeek(seconds: number): void; onScrubbingChange(value: boolean): void }) {
  const [draft, setDraft] = useState<number | null>(null);
  const dragging = useRef(false);
  const seconds = draft ?? progress * duration;
  return <div className="shorts-seek" onPointerDown={e => e.stopPropagation()} onPointerMove={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()} onClick={e => e.stopPropagation()} onWheel={e => e.stopPropagation()}>
    <span className="shorts-seek-time" aria-hidden="true">{format(seconds)} / {format(duration)}</span>
    <input aria-label="Seek within preview" type="range" min="0" max={duration} step="0.1" value={seconds} aria-valuetext={`${format(seconds)} of ${format(duration)}`} style={{'--seek-progress': `${Math.min(100, seconds / duration * 100)}%`} as React.CSSProperties}
      onPointerDown={e => { dragging.current = true; onScrubbingChange(true); e.currentTarget.setPointerCapture(e.pointerId); }}
      onChange={e => { const value = Number(e.currentTarget.value); if (dragging.current) setDraft(value); else onSeek(value); }}
      onPointerUp={e => { if (dragging.current) onSeek(Number(e.currentTarget.value)); dragging.current = false; onScrubbingChange(false); setDraft(null); }}
      onPointerCancel={() => { dragging.current = false; onScrubbingChange(false); setDraft(null); }}
      onBlur={() => { dragging.current = false; onScrubbingChange(false); setDraft(null); }}/>
  </div>;
}
