import { defineConfig } from 'vite';
export default defineConfig({
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: 'plugin/Jellyfin.Plugin.Shorts/Web/dist',
    emptyOutDir: true,
    sourcemap: false,
    lib: { entry: 'src/plugin/index.ts', name: 'JellyfinShorts', formats: ['iife'], fileName: () => 'shorts.js', cssFileName: 'shorts' }
  }
});
