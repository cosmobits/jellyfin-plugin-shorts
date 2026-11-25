export interface Excerpt { start: number; duration: number }
export interface Video { id: string; name: string; duration: number; series?: string }
export interface Preview { video: Video; excerpts: Excerpt[] }
export type DurationBands = [number, number, number, number, number];
export interface PreviewSettings { maxDurations: DurationBands; excerptDurations: DurationBands }
export const defaultPreviewSettings: PreviewSettings = { maxDurations: [10, 20, 30, 40, 60], excerptDurations: [5, 5, 5, 5, 5] };
export function normalizePreviewSettings(value?: Partial<PreviewSettings> & { excerptDuration?: number }): PreviewSettings {
  const limit = (v: unknown, fallback: number, max: number) => typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(1, Math.round(v))) : fallback;
  return { maxDurations: defaultPreviewSettings.maxDurations.map((d, i) => limit(value?.maxDurations?.[i], d, 120)) as PreviewSettings['maxDurations'], excerptDurations: defaultPreviewSettings.excerptDurations.map((d, i) => limit(value?.excerptDurations?.[i], limit(value?.excerptDuration, d, 30), 30)) as DurationBands };
}
export function createPreview(video: Video, random = Math.random, settings = defaultPreviewSettings): Preview {
  const d = video.duration;
  if (!Number.isFinite(d) || d <= 0) throw new Error('Video has no valid runtime');
  const config = normalizePreviewSettings(settings);
  const band = d <= 30 ? 0 : d <= 180 ? 1 : d <= 600 ? 2 : d < 2400 ? 3 : 4;
  const total = Math.min(d, config.maxDurations[band]);
  if (d <= config.maxDurations[band]) return { video, excerpts: [{ start: 0, duration: d }] };
  const count = Math.ceil(total / config.excerptDurations[band]);
  const length = total / count;
  const region = d / count;
  return { video, excerpts: Array.from({ length: count }, (_, i) => ({
    start: i * region + Math.min(1, Math.max(0, random())) * Math.max(0, region - length), duration: length
  })) };
}
export function chooseVideo(videos: Video[], recent: string[], random = Math.random): Video | undefined {
  const fresh = videos.filter(v => !recent.includes(v.id));
  const pool = fresh.length ? fresh : videos.filter(v => v.id !== recent.at(-1));
  const choices = pool.length ? pool : videos;
  return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
}
/** Map the combined preview timeline to an excerpt and an offset inside it. */
export function locatePreviewTime(preview: Preview, seconds: number) {
  const total = preview.excerpts.reduce((sum, e) => sum + e.duration, 0);
  let remaining = Math.max(0, Math.min(Number.isFinite(seconds) ? seconds : 0, Math.max(0, total - 0.05)));
  for (let segment = 0; segment < preview.excerpts.length; segment++) {
    if (remaining < preview.excerpts[segment].duration || segment === preview.excerpts.length - 1) return { segment, within: remaining };
    remaining -= preview.excerpts[segment].duration;
  }
  return { segment: 0, within: 0 };
}
