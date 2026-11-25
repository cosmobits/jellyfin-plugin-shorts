import { normalizePreviewSettings } from '../core/preview';
import type { ShortsHost } from '../host/types';
import { createJellyfinHost, normalizeServer } from '../jellyfin/client';
/** Only the plugin adapter knows about Jellyfin Web's session API. */
export interface JellyfinWebApi {
  getUrl(path: string): string;
  getCurrentUserId(): string;
  accessToken(): string;
  deviceId(): string;
}
export function createPluginHost(api: JellyfinWebApi, navigate: (hash: string) => void, storage?: Pick<Storage,'getItem'|'setItem'>): ShortsHost {
  const server = normalizeServer(api.getUrl('/'));
  const userId = api.getCurrentUserId();
  const token = api.accessToken();
  if (!userId || !token) throw new Error('Sign in to Jellyfin before opening Shorts.');
  const settingsKey = `jellyfin-shorts:settings:${server}:${userId}`;
  let saved;
  try { saved = JSON.parse(storage?.getItem(settingsKey) || 'null'); } catch { /* Defaults remain usable. */ }
  const exit = () => navigate('#/home');
  return {
    ...createJellyfinHost({server,userId,token,deviceId:api.deviceId()},exit,exit),
    exitLabel:'Back to Jellyfin',
    previewSettings:normalizePreviewSettings(saved || undefined),
    savePreviewSettings(settings) { try { storage?.setItem(settingsKey,JSON.stringify(settings)); } catch { /* Keep session settings. */ } },
    openVideo(video) { navigate(`#/details?id=${encodeURIComponent(video.id)}`); }
  };
}
