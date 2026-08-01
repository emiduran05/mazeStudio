import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    // Keep hooks and the renderer on the same React instance even when a
    // package manager has left nested dependency links behind.
    dedupe: ['react', 'react-dom'],
  },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
})
