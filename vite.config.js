import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: process.cwd(),
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: resolve(process.cwd(), 'index.html')
    }
  }
})
