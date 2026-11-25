import { createRoot } from 'react-dom/client';
import type { ShortsHost } from '../host/types';
import { Shorts } from '../ui/Shorts';
export function mount(container: HTMLElement, host: ShortsHost) {
  const root = createRoot(container);
  root.render(<Shorts host={host}/>);
  return () => root.unmount();
}
export type { ShortsHost } from '../host/types';
