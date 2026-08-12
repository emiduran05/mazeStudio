import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const hmrHost = env.VITE_HMR_HOST?.trim()

  return {
  server: {
    host: true,
    allowedHosts: true,
    // Dev Tunnels terminate TLS on port 443. Without clientPort, Vite's
    // browser client tries the local development port and HMR cannot connect.
    hmr: hmrHost ? {
      protocol: 'wss',
      host: hmrHost,
      clientPort: 443,
    } : undefined,
  },
  resolve: {
    // Keep hooks and the renderer on the same React instance even when a
    // package manager has left nested dependency links behind.
    dedupe: ['react', 'react-dom'],
  },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  }
})
