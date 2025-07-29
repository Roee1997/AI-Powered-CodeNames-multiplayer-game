import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '', // זהו הנתיב המוחלט ב-URL
  plugins: [react()],
  build: {
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          // Keep sound files in sounds directory
          if (assetInfo.name && assetInfo.name.endsWith('.mp3')) {
            return 'sounds/[name].[ext]';
          }
          // Keep images in assets directory with hashed names
          return 'assets/[name]-[hash].[ext]';
        }
      }
    }
  },
  publicDir: 'public' // Ensure public directory is copied to build
});
