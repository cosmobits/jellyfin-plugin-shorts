import { mount } from '../embed';
import { createPluginHost, type JellyfinWebApi } from './host';
let disposeCurrent: (() => void) | undefined;
export function mountJellyfin(container: HTMLElement, api: JellyfinWebApi): () => void {
  disposeCurrent?.();
  let storage: Storage | undefined;
  try { storage=window.localStorage; } catch { /* Private modes may deny storage. */ }
  const initialRoute=window.location.hash;
  let unmount: (() => void) | undefined;
  let disposed=false;
  container.classList.add('shorts-plugin-root');
  const stop=()=>{ const previous=unmount; unmount=undefined; previous?.(); };
  // Jellyfin caches page DOM. Keep watching while hidden so returning can mount again.
  const sync=()=>{
    if(disposed) return;
    if(!container.isConnected) { dispose(); return; }
    const visible=window.location.hash===initialRoute && !container.closest('.page.hide, [aria-hidden="true"]');
    if(!visible) { stop(); return; }
    if(!unmount) {
      const host=createPluginHost(api,hash=>{ window.location.hash=hash; },storage);
      unmount=mount(container,host);
    }
  };
  const observer=new MutationObserver(sync);
  const dispose=()=>{
    if(disposed) return;
    disposed=true;
    observer.disconnect();
    window.removeEventListener('hashchange',sync);
    window.removeEventListener('pagehide',stop);
    window.removeEventListener('pageshow',sync);
    stop();
    if(disposeCurrent===dispose) disposeCurrent=undefined;
  };
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','aria-hidden']});
  window.addEventListener('hashchange',sync);
  window.addEventListener('pagehide',stop);
  window.addEventListener('pageshow',sync);
  disposeCurrent=dispose;
  sync();
  return dispose;
}
