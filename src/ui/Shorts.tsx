import { useEffect, useRef, useState } from 'react';
import type { ShortsHost, Library } from '../host/types';
import { chooseVideo, createPreview, locatePreviewTime, normalizePreviewSettings, type Preview, type Video } from '../core/preview';
import { SwipeStage, type SwipeHandle } from './SwipeStage';
import { PreviewSettingsDialog } from './PreviewSettingsDialog';
import { SeekBar } from './SeekBar';
import { Player, type PlayerHandle } from './Player';
import { Cast, useVideoDetails } from './VideoDetails';
import { FullscreenControl } from './FullscreenControl';
import { VolumeControl } from './VolumeControl';
import './styles.css';
export function Shorts({ host }: { host: ShortsHost }) {
  const [settings, setSettings] = useState(() => normalizePreviewSettings(host.previewSettings));
  const settingsRef = useRef(settings); settingsRef.current = settings;
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
  const [muted, setMuted] = useState(() => settings.startMuted !== false);
  const [volume, setVolume] = useState(1);
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
      const first = chooseVideo(items, []); setHistory(first ? [createPreview(first, Math.random, settingsRef.current)] : []); setLoading(false);
    }).catch(e => { if (!c.signal.aborted) { setError(e.message); setLoading(false); } });
    return () => c.abort();
  }, [library, host]);
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
  const previewDuration = current?.excerpts.reduce((sum, excerpt) => sum + excerpt.duration, 0) ?? 0;
  const moment = current ? locatePreviewTime(current, progress * previewDuration).segment + 1 : 0;
  const metadata=useVideoDetails(host,loading?undefined:current?.video.id);
  return <div className="shorts shorts-viewer" data-aspect={settings.aspectRatio} ref={root} tabIndex={0} onKeyDown={e => {
    if ((e.target as HTMLElement).matches('input,select,button,a')) return;
    if (['ArrowDown','ArrowUp',' '].includes(e.key)) e.preventDefault();
    if (e.key === 'ArrowDown') next(); if (e.key === 'ArrowUp') previous(); if (e.key === ' ') togglePlayback();
  }}>
    <header className="shorts-header"><div className="shorts-brand"><span className="shorts-mark">▥</span> Shorts</div><div className="shorts-header-actions"><button onClick={() => setSettingsOpen(v => !v)} aria-expanded={settingsOpen} aria-controls="preview-settings">Settings</button><button onClick={host.exit}>{host.exitLabel || 'Sign out'}</button></div></header>
    {settingsOpen && <PreviewSettingsDialog settings={settings} libraries={libraries} library={library} onClose={() => setSettingsOpen(false)} onSave={(updated, selectedLibrary) => { setLibrary(selectedLibrary); if (updated.startMuted !== settings.startMuted) setMuted(updated.startMuted !== false); setSettings(updated); host.savePreviewSettings?.(updated); setSettingsOpen(false); }}/>}
    <main className="shorts-layout">
    <SwipeStage ref={swipe} enabled={!!current && !loading && !settingsOpen} canPrevious={index > 0} onNavigate={direction => direction === 1 ? commitNext() : commitPrevious()} onTap={togglePlayback} previousTitle={history[index - 1]?.video.name} nextTitle={history[index + 1]?.video.name}>
      {current && !loading ? <><Player ref={player} key={`${library}-${index}-${replay}`} preview={current} host={host} preloadNext={settings.preloadNext} muted={muted} volume={volume} paused={paused || settingsOpen || scrubbing} onComplete={next} onProgress={setProgress} onNeedsPlay={() => setPaused(true)}/><button className={`shorts-tap-toggle ${paused || feedback ? 'shorts-tap-visible' : ''}`} aria-label={paused ? 'Play video' : 'Pause video'} onClick={togglePlayback}><svg viewBox="0 0 24 24" aria-hidden="true">{paused ? <path d="M8 5v14l11-7z"/> : <path d="M6 5h4v14H6zm8 0h4v14h-4z"/>}</svg></button><FullscreenControl/><VolumeControl muted={muted} volume={volume} onMute={() => { if (volume === 0) { setVolume(1); setMuted(false); } else setMuted(v => !v); }} onVolume={value => { setVolume(value); setMuted(value === 0); }}/>{host.setFavorite && <button className="shorts-favorite" aria-label={metadata.details?.favorite?"Remove from favorites":"Add to favorites"} aria-pressed={!!metadata.details?.favorite} disabled={!metadata.details || metadata.pending} onClick={()=>void metadata.toggle()}><span aria-hidden="true">{metadata.details?.favorite?"♥":"♡"}</span></button>}<div className="shorts-topline"><span>Moment {moment}/{current.excerpts.length} · {previewDuration.toFixed(0)}s</span><button onClick={() => host.openVideo(current.video)}>Go to movie</button></div><div className="shorts-caption">{current.video.series && <p>{current.video.series}</p>}<h2 className="shorts-video-title" onPointerDown={e => e.stopPropagation()} onPointerMove={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>{current.video.name}</h2></div><SeekBar onScrubbingChange={setScrubbing} key={`${library}-${index}`} progress={progress} duration={current.excerpts.reduce((n,s) => n+s.duration,0)} onSeek={seconds => { setProgress(seconds / current.excerpts.reduce((n,s) => n+s.duration,0)); player.current?.seek(seconds); }}/></> : <div className="shorts-empty" role="status"><span className="shorts-mark">▥</span><h2>{error ? 'Couldn’t load your library' : loading ? 'Finding your next moment…' : 'No videos here yet'}</h2><p>{error || (loading ? 'Reading videos from Jellyfin.' : 'Choose a library containing videos with a known runtime.')}</p>{error && <button onClick={host.exit}>Return to sign in</button>}</div>}
    </SwipeStage></main><Cast details={metadata.details} error={metadata.error}/>
  </div>;
}
