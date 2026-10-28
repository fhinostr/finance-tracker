import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the build works when served from a GitHub Pages subpath
  base: './',
  plugins: [react(), tailwindcss()],
})
