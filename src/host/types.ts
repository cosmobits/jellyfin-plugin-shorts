import type { Video, PreviewSettings } from '../core/preview';
export interface Library { id: string; name: string }
export interface Stream { url: string; hls: boolean; offset: number; dispose(): Promise<void> }
export interface CastMember { id: string; name: string; role?: string; image?: string }
export interface VideoDetails { favorite: boolean; cast: CastMember[] }
export interface ShortsHost {
  details?(id: string, signal: AbortSignal): Promise<VideoDetails>;
  setFavorite?(id: string, favorite: boolean): Promise<boolean>;
  libraries(signal: AbortSignal): Promise<Library[]>;
  videos(library: string, signal: AbortSignal): Promise<Video[]>;
  stream(video: Video, start: number, signal: AbortSignal): Promise<Stream>;
  openVideo(video: Video): void;
  exit(): void;
  exitLabel?: string;
  previewSettings?: PreviewSettings;
  savePreviewSettings?(settings: PreviewSettings): void;
}
