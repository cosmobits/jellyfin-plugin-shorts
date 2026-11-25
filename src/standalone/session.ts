import { normalizeServer, type Session } from '../jellyfin/client';
const key = 'shorts-session-v1';
type Store = Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export function readSession(storage: Store): Session | null {
  try {
    const data = JSON.parse(storage.getItem(key) || 'null');
    if (!data || !['server','token','userId','deviceId'].every(k => typeof data[k] === 'string' && data[k].length > 0)) return null;
    if ([data.token,data.userId,data.deviceId].some(v => /["\r\n]/.test(v))) return null;
    return {server:normalizeServer(data.server),token:data.token,userId:data.userId,deviceId:data.deviceId};
  } catch { return null; }
}
export function writeSession(storage: Store, session: Session | null) {
  try {
    if (!session) storage.removeItem(key);
    else storage.setItem(key, JSON.stringify({server:session.server,token:session.token,userId:session.userId,deviceId:session.deviceId}));
  } catch { /* Private browser modes can disable storage; in-memory sign-in still works. */ }
}
