import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import Hls from 'hls.js';
import { locatePreviewTime, type Preview } from '../core/preview';
import type { ShortsHost, Stream } from '../host/types';
export interface PlayerHandle { seek(seconds: number): void }
export const Player = forwardRef<PlayerHandle, { preview: Preview; host: ShortsHost; muted: boolean; paused: boolean; onComplete(): void; onProgress(value: number): void; onNeedsPlay(): void }>(function Player({ preview, host, muted, paused, onComplete, onProgress, onNeedsPlay }, handle) {
  const ref = useRef<HTMLVideoElement>(null);
  const [cursor, setCursor] = useState({ segment: 0, within: 0, revision: 0 });
  const { segment, within } = cursor;
  useImperativeHandle(handle, () => ({ seek(seconds) {
    const target = locatePreviewTime(preview, seconds);
    setCursor(previous => ({ ...target, revision: previous.revision + 1 }));
  } }), [preview]);
  const [status, setStatus] = useState('Loading excerpt…');
  const [error, setError] = useState('');
  const complete = useRef(onComplete); complete.current = onComplete;
  const progress = useRef(onProgress); progress.current = onProgress;
  const needsPlay = useRef(onNeedsPlay); needsPlay.current = onNeedsPlay;
  const readyRef = useRef(false);
  const pauseRef = useRef(paused); pauseRef.current = paused;
  useEffect(() => {
    const video = ref.current!;
    const controller = new AbortController();
    let stream: Stream | undefined;
    let hls: Hls | undefined;
    let finished = false;
    let ready = false; readyRef.current = false;
    let frame = 0;
    let timeout = window.setTimeout(() => { ready = false; readyRef.current = false; video.pause(); setError('Playback or seeking took too long. Try another video.'); }, 30000);
    const excerpt = preview.excerpts[segment];
    setStatus(`Loading excerpt ${segment + 1}…`); setError('');
    const fail = () => { if (!controller.signal.aborted) { ready = false; readyRef.current = false; video.pause(); clearTimeout(timeout); setError('Unable to play this excerpt. Try replay or skip this video.'); } };
    const play = () => { if (!pauseRef.current) void video.play().catch(() => { setStatus('Tap Play to start'); needsPlay.current(); }); };
    const seekFinished = () => {
      if (!stream || controller.signal.aborted || ready) return;
      // A failed seek must not silently replay the beginning for every excerpt.
      if (Math.abs(video.currentTime - stream.offset) > 1) return;
      ready = true; readyRef.current = true; clearTimeout(timeout); setStatus(''); play();
    };
    const loaded = () => {
      if (!stream || controller.signal.aborted) return;
      if (Math.abs(video.currentTime - stream.offset) <= 0.05) { seekFinished(); return; }
      try { video.currentTime = stream.offset; } catch { fail(); }
    };
    const playing = () => { clearTimeout(timeout); setStatus(''); };
    const waiting = () => setStatus('Buffering…');
    const tick = () => {
      if (ready && stream && !finished && !video.seeking) {
        const elapsed = Math.max(0, within + video.currentTime - stream.offset);
        const before = preview.excerpts.slice(0, segment).reduce((n, s) => n + s.duration, 0);
        const total = preview.excerpts.reduce((n, s) => n + s.duration, 0);
        progress.current(Math.min(1, (before + elapsed) / total));
        if (elapsed >= excerpt.duration - 0.04) advance();
      }
      frame = requestAnimationFrame(tick);
    };
    const advance = () => {
      if (finished || !ready) return;
      finished = true; video.pause();
      if (segment + 1 < preview.excerpts.length) setCursor(previous => ({ segment: segment + 1, within: 0, revision: previous.revision + 1 })); else complete.current();
    };
    video.addEventListener('loadedmetadata', loaded);
    video.addEventListener('seeked', seekFinished);
    video.addEventListener('playing', playing);
    video.addEventListener('waiting', waiting);
    video.addEventListener('ended', advance);
    video.addEventListener('error', fail);
    void host.stream(preview.video, excerpt.start + within, controller.signal).then(s => {
      if (controller.signal.aborted) { void s.dispose().catch(() => {}); return; }
      stream = s;
      if (s.hls && !video.canPlayType('application/vnd.apple.mpegurl') && Hls.isSupported()) {
        hls = new Hls({ startPosition: s.offset, maxBufferLength: 10, maxMaxBufferLength: 15 });
        hls.loadSource(s.url); hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, (_, data) => { if (data.fatal) fail(); });
      } else { video.src = `${s.url}#t=${s.offset}`; video.load(); }
    }).catch(e => { if (!controller.signal.aborted) { clearTimeout(timeout); setError(e.message); } });
    frame = requestAnimationFrame(tick);
    return () => {
      controller.abort(); readyRef.current = false; clearTimeout(timeout); cancelAnimationFrame(frame);
      video.removeEventListener('loadedmetadata', loaded); video.removeEventListener('seeked', seekFinished); video.removeEventListener('playing', playing);
      video.removeEventListener('waiting', waiting); video.removeEventListener('ended', advance); video.removeEventListener('error', fail);
      video.pause(); hls?.destroy(); video.removeAttribute('src'); video.load();
      void stream?.dispose().catch(() => {});
    };
  }, [preview, host, cursor]);
  useEffect(() => {
    const v = ref.current!;
    if (paused) v.pause(); else if (readyRef.current && v.readyState >= 2) void v.play().catch(() => { setStatus('Tap Play to start'); needsPlay.current(); });
  }, [paused]);
  return <><video ref={ref} muted={muted} playsInline preload="metadata" aria-label={preview.video.name} />{status && !error && <div className="shorts-status" role="status">{status}</div>}{error && <div className="shorts-status shorts-error" role="alert">{error}</div>}</>;
});
