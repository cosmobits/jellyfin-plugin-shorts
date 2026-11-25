import { mount } from '../embed';
import { createPluginHost, type JellyfinWebApi } from './host';
let disposeCurrent: (() => void) | undefined;
export function mountJellyfin(container: HTMLElement, api: JellyfinWebApi): () => void {
  disposeCurrent?.();
  let storage: Storage | undefined;
  try { storage=window.localStorage; } catch { /* Private modes may deny storage. */ }
  const initialRoute=window.location.hash;
  const userId=api.getCurrentUserId();
  const host=createPluginHost(api,hash=>{ window.location.hash=hash; },storage);
  container.classList.add('shorts-plugin-root');
  const unmount=mount(container,host);
  let disposed=false;
  const dispose=()=>{
    if(disposed) return;
    disposed=true;
    observer.disconnect();
    window.removeEventListener('hashchange',routeChanged);
    window.removeEventListener('pagehide',dispose);
    unmount();
    if(disposeCurrent===dispose) disposeCurrent=undefined;
  };
  const routeChanged=()=>{ if(window.location.hash!==initialRoute || api.getCurrentUserId()!==userId) dispose(); };
  const observer=new MutationObserver(()=>{
    if(!container.isConnected || container.closest('.page.hide, [aria-hidden="true"]')) dispose();
  });
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','aria-hidden']});
  window.addEventListener('hashchange',routeChanged);
  window.addEventListener('pagehide',dispose);
  disposeCurrent=dispose;
  return dispose;
}
