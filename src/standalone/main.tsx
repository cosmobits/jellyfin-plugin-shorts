import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { signIn, createJellyfinHost, signOut, type Session } from '../jellyfin/client';
import { readSession, writeSession } from './session';
import { normalizePreviewSettings } from '../core/preview';
import { Shorts } from '../ui/Shorts';
import '../ui/styles.css';
function App() {
  const [session, setSession] = useState<Session | null>(() => { try { return readSession(sessionStorage); } catch { return null; } });
  const [server, setServer] = useState(localStorage.getItem('shorts-server') || '');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const host = useMemo(() => {
    if (!session) return null;
    let saved;
    try { saved = JSON.parse(localStorage.getItem('shorts-preview-settings-v2') || 'null'); } catch { /* Use defaults for malformed storage. */ }
    return { ...createJellyfinHost(session, () => {
      writeSession(sessionStorage,null); setSession(null);
      void signOut(session).catch(() => {});
    }, () => { writeSession(sessionStorage,null); setSession(null); setError('Your session expired. Please sign in again.'); }), previewSettings: normalizePreviewSettings(saved || undefined), savePreviewSettings: (settings: import('../core/preview').PreviewSettings) => { try { localStorage.setItem('shorts-preview-settings-v2', JSON.stringify(settings)); } catch { /* Settings still apply for this session. */ } } };
  }, [session]);
  if (host) return <Shorts host={host}/>;
  return <div className="shorts shorts-login"><div className="shorts-login-intro"><span className="shorts-eyebrow">JELLYFIN SHORTS</span><h1>Your library.<br/>A new rhythm.</h1><p>Five-second moments. Unexpected discoveries.<br/>A feed made from the videos you already own.</p><div className="shorts-pills"><span>Random discoveries</span><span>Custom preview durations</span></div></div><form onSubmit={async e => { e.preventDefault(); const form = e.currentTarget; const data = new FormData(form); setBusy(true); setError(''); try { const s = await signIn(server, String(data.get('username')), String(data.get('password'))); localStorage.setItem('shorts-server', s.server); writeSession(sessionStorage,s); form.reset(); setSession(s); } catch (err) { setError(err instanceof TypeError ? 'Could not reach Jellyfin. Check the URL, network access, HTTPS and browser CORS settings.' : (err as Error).message); } finally { setBusy(false); } }}><span className="shorts-mark">▥</span><h2>Connect your Jellyfin</h2><p>Sign in to start discovering your library.</p><label htmlFor="server">Server address</label><input id="server" type="url" required placeholder="https://jellyfin.example.com" value={server} onChange={e => setServer(e.target.value)} autoComplete="url"/><label htmlFor="username">Username</label><input name="username" id="username" autoComplete="username" required/><label htmlFor="password">Password</label><input name="password" id="password" type="password" autoComplete="current-password" required/>{error && <p role="alert" className="shorts-error">{error}</p>}<button className="shorts-primary" disabled={busy}>{busy ? 'Connecting…' : 'Start watching'}</button><small>Stay signed in when you refresh this tab. Your password is never saved; signing out clears the saved session.</small></form></div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
