import { expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({mount:vi.fn(),host:vi.fn(()=>({}))}));
vi.mock('../src/embed',()=>({mount:mocks.mount}));
vi.mock('../src/plugin/host',()=>({createPluginHost:mocks.host}));
import { mountJellyfin } from '../src/plugin';
it('remounts cached pages after route and visibility changes, and cleans up removed pages',()=>{
  const events=new EventTarget();
  const location={hash:'#/userpluginsettings?pageUrl=/Shorts/Page'};
  let observe:()=>void=()=>{};
  let hidden=false;
  const stop=vi.fn(); mocks.mount.mockReturnValue(stop);
  vi.stubGlobal('window',{location,addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events)});
  vi.stubGlobal('document',{body:{}});
  vi.stubGlobal('MutationObserver',class {constructor(callback:()=>void){observe=callback;} observe(){} disconnect(){} });
  const container={isConnected:true,classList:{add(){}},closest:()=>hidden?{}:null};
  try {
    const dispose=mountJellyfin(container as unknown as HTMLElement,{} as never);
    expect(mocks.mount).toHaveBeenCalledTimes(1);
    location.hash='#/details?id=movie';events.dispatchEvent(new Event('hashchange'));
    expect(stop).toHaveBeenCalledTimes(1);
    location.hash='#/userpluginsettings?pageUrl=/Shorts/Page';events.dispatchEvent(new Event('hashchange'));
    expect(mocks.mount).toHaveBeenCalledTimes(2);
    hidden=true;observe();hidden=false;observe();
    expect(mocks.mount).toHaveBeenCalledTimes(3);
    container.isConnected=false;observe();
    expect(stop).toHaveBeenCalledTimes(3);
    events.dispatchEvent(new Event('hashchange'));
    expect(mocks.mount).toHaveBeenCalledTimes(3);
    dispose();
  } finally {vi.unstubAllGlobals();}
});
