import devServer from '@hono/vite-dev-server'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    devServer({
      entry: 'src/index.tsx',
      exclude: [/^\/(favicon\.ico|assets\/.+|.*\.(css|js|png|jpg|svg))$/]
    })
  ],
  build: {
    target: 'esnext',
    minify: true,
    lib: {
      entry: 'src/index.tsx',
      formats: ['es'],
      fileName: () => '_worker.js'
    }
  }
})
