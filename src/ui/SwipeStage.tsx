import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from 'react';
export interface SwipeHandle { navigate(direction: 1 | -1): void }
interface Props { children: ReactNode; enabled: boolean; canPrevious: boolean; onNavigate(direction: 1 | -1): void; onTap(): void; previousTitle?: string; nextTitle?: string }
/** Owns presentation gestures only; the parent owns feed history and selection. */
export const SwipeStage = forwardRef<SwipeHandle, Props>(function SwipeStage({ children, enabled, canPrevious, onNavigate, onTap, previousTitle, nextTitle }, ref) {
  const stage = useRef<HTMLElement>(null);
  const [offset, setOffset] = useState(0);
  const [animated, setAnimated] = useState(false);
  const busy = useRef(false);
  const drag = useRef<{ y: number; time: number; pointer: number; delta: number } | null>(null);
  const suppressClick = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastWheel = useRef(0);
  const action = useRef(onNavigate); action.current = onNavigate;
  const animate = (direction: 1 | -1) => {
    if (!enabled || busy.current || (direction === -1 && !canPrevious)) return;
    busy.current = true; setAnimated(true);
    setOffset(-direction * (stage.current?.clientHeight || 600));
    const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260;
    timer.current = setTimeout(() => {
      action.current(direction);
      setAnimated(false); setOffset(0); busy.current = false;
    }, duration);
  };
  useImperativeHandle(ref, () => ({ navigate: animate }));
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!enabled) { clearTimeout(timer.current); busy.current = false; drag.current = null; setOffset(0); setAnimated(false); }
  }, [enabled]);
  return <section ref={stage} className="shorts-stage" aria-label="Shorts player"
    onPointerDown={e => {
      if (!enabled || busy.current || e.button !== 0) return;
      suppressClick.current = false;
      drag.current = { y: e.clientY, time: performance.now(), pointer: e.pointerId, delta: 0 };
    }}
    onPointerMove={e => {
      const d = drag.current;
      if (!d || d.pointer !== e.pointerId || busy.current) return;
      d.delta = e.clientY - d.y;
      if (Math.abs(d.delta) < 8) return;
      suppressClick.current = true;
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.setPointerCapture(e.pointerId);
      setAnimated(false);
      const height = stage.current?.clientHeight || 600;
      setOffset(Math.max(-height, Math.min(height, d.delta > 0 && !canPrevious ? d.delta * 0.2 : d.delta)));
    }}
    onPointerUp={e => {
      const d = drag.current; if (!d || d.pointer !== e.pointerId) return;
      drag.current = null;
      const elapsed = Math.max(1, performance.now() - d.time);
      const threshold = Math.min(120, (stage.current?.clientHeight || 600) * 0.2);
      if (Math.abs(d.delta) >= threshold || (Math.abs(d.delta) > 35 && Math.abs(d.delta) / elapsed > 0.45)) {
        const direction = d.delta < 0 ? 1 : -1;
        if (direction === 1 || canPrevious) { animate(direction); return; }
      }
      setAnimated(true); setOffset(0);
    }}
    onPointerCancel={() => { drag.current = null; suppressClick.current = true; setAnimated(true); setOffset(0); }}
    onClickCapture={e => { if (suppressClick.current || busy.current) { e.preventDefault(); e.stopPropagation(); suppressClick.current = false; } }}
    onClick={e => { if (enabled && !(e.target as HTMLElement).closest('button,a')) onTap(); }}
    onWheel={e => { if (enabled && Math.abs(e.deltaY) > 25 && Date.now() - lastWheel.current > 650) { lastWheel.current = Date.now(); animate(e.deltaY > 0 ? 1 : -1); } }}>
    <div className={`shorts-reel-track ${animated ? 'shorts-reel-animated' : ''}`} style={{ transform: `translate3d(0,${offset}px,0)` }}>
      <div className="shorts-neighbor shorts-neighbor-previous" aria-hidden="true"><span>{canPrevious ? 'Previous video' : 'You’re at the beginning'}</span><h2>{previousTitle}</h2></div>
      <div className="shorts-reel-current">{children}</div>
      <div className="shorts-neighbor shorts-neighbor-next" aria-hidden="true"><span>Up next</span><h2>{nextTitle || 'Another moment from your library'}</h2></div>
    </div>
  </section>;
});
