import { useEffect, useRef, useState } from 'react';
import type { ShortsHost, Library } from '../host/types';
import { chooseVideo, createPreview, normalizePreviewSettings, type Preview, type Video } from '../core/preview';
import { SwipeStage, type SwipeHandle } from './SwipeStage';
import { PreviewSettingsDialog } from './PreviewSettingsDialog';
import { SeekBar } from './SeekBar';
import { Player, type PlayerHandle } from './Player';
import './styles.css';
export function Shorts({ host }: { host: ShortsHost }) {
  const [settings, setSettings] = useState(() => normalizePreviewSettings(host.previewSettings));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [feedback, setFeedback] = useState(false);
  useEffect(() => { if (!feedback) return; const timer = setTimeout(() => setFeedback(false), 650); return () => clearTimeout(timer); }, [feedback]);
  const togglePlayback = () => { setPaused(p => !p); setFeedback(true); };
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [library, setLibrary] = useState('');
  const [videos, setVideos] = useState<Video[]>([]);
  const [history, setHistory] = useState<Preview[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [replay, setReplay] = useState(0);
  const player = useRef<PlayerHandle>(null);
  const root = useRef<HTMLDivElement>(null);
  const swipe = useRef<SwipeHandle>(null);
  useEffect(() => { const c = new AbortController(); host.libraries(c.signal).then(x => { setLibraries(x); setLibrary(x[0]?.id ?? ''); if (!x.length) setLoading(false); }).catch(e => { if (!c.signal.aborted) { setError(e.message); setLoading(false); } }); return () => c.abort(); }, [host]);
  useEffect(() => {
    if (!library) return;
    const c = new AbortController(); setLoading(true); setError(''); setHistory([]); setVideos([]);
    host.videos(library, c.signal).then(items => {
      if (c.signal.aborted) return;
      setVideos(items); setIndex(0); setProgress(0); setPaused(false);
      const first = chooseVideo(items, []); setHistory(first ? [createPreview(first, Math.random, settings)] : []); setLoading(false);
    }).catch(e => { if (!c.signal.aborted) { setError(e.message); setLoading(false); } });
    return () => c.abort();
  }, [library, host, settings]);
  const commitNext = () => {
    if (settingsOpen || loading || !videos.length) return;
    if (index + 1 < history.length) setIndex(index + 1);
    else {
      const v = chooseVideo(videos, history.slice(-40).map(p => p.video.id));
      if (v) { const updated = [...history, createPreview(v, Math.random, settings)].slice(-60); setHistory(updated); setIndex(updated.length - 1); }
    }
    setProgress(0); setPaused(false);
  };
  const commitPrevious = () => { if (index > 0) { setIndex(index - 1); setProgress(0); setPaused(false); } };
  const next = () => swipe.current?.navigate(1);
  const previous = () => swipe.current?.navigate(-1);
  const current = history[index];
  return <div className="shorts shorts-viewer" data-aspect={settings.aspectRatio} ref={root} tabIndex={0} onKeyDown={e => {
    if ((e.target as HTMLElement).matches('input,select,button,a')) return;
    if (['ArrowDown','ArrowUp',' '].includes(e.key)) e.preventDefault();
    if (e.key === 'ArrowDown') next(); if (e.key === 'ArrowUp') previous(); if (e.key === ' ') togglePlayback();
  }}>
    <header className="shorts-header"><div className="shorts-brand"><span className="shorts-mark">▥</span> Shorts</div><div className="shorts-header-actions"><button onClick={() => setSettingsOpen(v => !v)} aria-expanded={settingsOpen} aria-controls="preview-settings">Settings</button><button onClick={host.exit}>{host.exitLabel || 'Sign out'}</button></div></header>
    {settingsOpen && <PreviewSettingsDialog settings={settings} libraries={libraries} library={library} onClose={() => setSettingsOpen(false)} onSave={(updated, selectedLibrary) => { setLibrary(selectedLibrary); setSettings(updated); host.savePreviewSettings?.(updated); setSettingsOpen(false); }}/>}
    <main className="shorts-layout">
    <SwipeStage ref={swipe} enabled={!!current && !loading && !settingsOpen} canPrevious={index > 0} onNavigate={direction => direction === 1 ? commitNext() : commitPrevious()} onTap={togglePlayback} previousTitle={history[index - 1]?.video.name} nextTitle={history[index + 1]?.video.name}>
      {current && !loading ? <><Player ref={player} key={`${library}-${index}-${replay}`} preview={current} host={host} muted={muted} paused={paused || settingsOpen || scrubbing} onComplete={next} onProgress={setProgress} onNeedsPlay={() => setPaused(true)}/><button className={`shorts-tap-toggle ${paused || feedback ? 'shorts-tap-visible' : ''}`} aria-label={paused ? 'Play video' : 'Pause video'} onClick={togglePlayback}><svg viewBox="0 0 24 24" aria-hidden="true">{paused ? <path d="M8 5v14l11-7z"/> : <path d="M6 5h4v14H6zm8 0h4v14h-4z"/>}</svg></button><button className="shorts-mute" aria-label={muted ? 'Unmute video' : 'Mute video'} aria-pressed={!muted} onClick={() => setMuted(v => !v)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9z"/>{muted ? <path d="m16 9 5 6m0-6-5 6" fill="none" stroke="currentColor" strokeWidth="2"/> : <path d="M16 8c4 2 4 6 0 8m2-11c7 4 7 10 0 14" fill="none" stroke="currentColor" strokeWidth="2"/>}</svg></button><div className="shorts-topline"><span>SHUFFLE PLAY</span><span>{current.excerpts.length} {current.excerpts.length === 1 ? 'moment' : 'moments'} · {current.excerpts.reduce((n,s) => n+s.duration,0).toFixed(0)}s</span></div><div className="shorts-caption">{current.video.series && <p>{current.video.series}</p>}<h2 className="shorts-video-title" onPointerDown={e => e.stopPropagation()} onPointerMove={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>{current.video.name}</h2><button onClick={() => host.openVideo(current.video)}>Go to movie</button></div><SeekBar onScrubbingChange={setScrubbing} key={`${library}-${index}`} progress={progress} duration={current.excerpts.reduce((n,s) => n+s.duration,0)} onSeek={seconds => { setProgress(seconds / current.excerpts.reduce((n,s) => n+s.duration,0)); player.current?.seek(seconds); }}/></> : <div className="shorts-empty" role="status"><span className="shorts-mark">▥</span><h2>{error ? 'Couldn’t load your library' : loading ? 'Finding your next moment…' : 'No videos here yet'}</h2><p>{error || (loading ? 'Reading videos from Jellyfin.' : 'Choose a library containing videos with a known runtime.')}</p>{error && <button onClick={host.exit}>Return to sign in</button>}</div>}
    </SwipeStage></main>
  </div>;
}
