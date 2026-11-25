import { describe, expect, it } from 'vitest';
import { createPreview, chooseVideo, normalizePreviewSettings } from '../src/core/preview';
describe('multi-excerpt previews', () => {
  it.each([0.5, 5, 6, 30, 31, 180, 181, 1200, 1201, 7200])('keeps every excerpt within a %s-second source', duration => {
    for (const random of [() => 0, () => 0.5, () => 1]) {
      const p = createPreview({id:'a',name:'A',duration}, random);
      expect(p.excerpts.reduce((n,s) => n+s.duration,0)).toBeLessThanOrEqual(60);
      p.excerpts.forEach((s,i) => { expect(s.start).toBeGreaterThanOrEqual(0); expect(s.start+s.duration).toBeLessThanOrEqual(duration); if(i) expect(s.start).toBeGreaterThanOrEqual(p.excerpts[i-1].start+p.excerpts[i-1].duration); });
    }
  });
  it('plays short sources in full', () => expect(createPreview({id:'a',name:'A',duration:3}).excerpts).toEqual([{start:0,duration:3}]));
  it('samples twelve regions for a movie', () => expect(createPreview({id:'a',name:'A',duration:7200}, () => 0).excerpts.map(s=>s.start)).toEqual(Array.from({length:12}, (_,i)=>i*600)));
  it('rejects missing runtime', () => expect(() => createPreview({id:'a',name:'A',duration:NaN})).toThrow());
  it('avoids recent items until exhausted', () => expect(chooseVideo([{id:'a',name:'A',duration:5},{id:'b',name:'B',duration:5}],['a'])?.id).toBe('b'));
});

it('applies configurable preview and excerpt caps', () => {
  const p = createPreview({id:'movie',name:'Movie',duration:7200}, () => 0.5, {maxDurations:[10,20,30,40,30],excerptDurations:[5,5,5,5,5]});
  expect(p.excerpts).toHaveLength(6);
  expect(p.excerpts.reduce((n,s)=>n+s.duration,0)).toBe(30);
  expect(p.excerpts.every(s=>s.duration <= 5)).toBe(true);
});
it('caps total duration at runtime and divides fractional budgets without overlap', () => {
  const p = createPreview({id:'short',name:'Short',duration:7}, () => 1, {maxDurations:[20,20,20,20,20],excerptDurations:[5,5,5,5,5]});
  expect(p.excerpts.reduce((n,s)=>n+s.duration,0)).toBe(7);
  expect(p.excerpts).toEqual([{start:0,duration:7}]);
});
it('normalizes invalid saved settings', () => {
  expect(normalizePreviewSettings({maxDurations:[NaN,0,999,20,60],excerptDuration:0})).toEqual({startMuted:true,preloadNext:true,aspectRatio:"auto",maxDurations:[10,1,120,20,60],excerptDurations:[1,1,1,1,1]});
});

it.each([[30,10],[31,20],[180,20],[181,30],[600,30],[601,40],[2399,40],[2400,60],[7200,60]])('uses correct budget at %s seconds', (duration,total) => {
 const p = createPreview({id:'a',name:'A',duration}, () => 0.5);
 expect(p.excerpts.reduce((n,s)=>n+s.duration,0)).toBe(total);
});
it('plays an eight-second video continuously', () => expect(createPreview({id:'a',name:'A',duration:8}).excerpts).toEqual([{start:0,duration:8}]));

it('maps preview seeks across separate source excerpts', async () => {
  const { locatePreviewTime } = await import('../src/core/preview');
  const preview = {video:{id:'a',name:'A',duration:7200},excerpts:[{start:100,duration:5},{start:300,duration:5},{start:900,duration:5}]};
  expect(locatePreviewTime(preview, 0)).toEqual({segment:0,within:0});
  expect(locatePreviewTime(preview, 5)).toEqual({segment:1,within:0});
  expect(locatePreviewTime(preview, 12)).toEqual({segment:2,within:2});
  expect(locatePreviewTime(preview, -10)).toEqual({segment:0,within:0});
  expect(locatePreviewTime(preview, 100).segment).toBe(2);
  expect(locatePreviewTime(preview, 100).within).toBeLessThan(5);
});

it('uses a different moment length for each video duration band', () => {
  const settings = {maxDurations:[10,20,30,40,60] as [number,number,number,number,number],excerptDurations:[2,4,5,10,15] as [number,number,number,number,number]};
  for (const [i,duration] of [20,120,500,1200,7200].entries()) {
    const p = createPreview({id:'a',name:'A',duration},()=>0,settings);
    expect(p.excerpts).toHaveLength(settings.maxDurations[i]/settings.excerptDurations[i]);
    expect(p.excerpts.every(e=>e.duration === settings.excerptDurations[i])).toBe(true);
  }
});
it('migrates a legacy global moment length into every band', () => {
 expect(normalizePreviewSettings({excerptDuration:10}).excerptDurations).toEqual([10,10,10,10,10]);
});
