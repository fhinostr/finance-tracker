import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the build works when served from a GitHub Pages subpath
  base: './',
  server: {
    host: true, // Exposes the server on local network (e.g., http://192.168.1.137:5173)
  },
  plugins: [react(), tailwindcss()],
})
