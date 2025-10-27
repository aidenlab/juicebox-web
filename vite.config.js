import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  // Multi-page app configuration
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        embed: resolve(__dirname, 'embed.html')
      }
    },
    outDir: 'dist',
    // Remove console.log and debugger statements in production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  
  // Public directory for static assets
  publicDir: 'public',
  
  // CSS preprocessing
  css: {
    preprocessorOptions: {
      scss: {
        // SCSS options if needed
      }
    }
  },
  
  // Development server configuration
  server: {
    port: 3000,
    open: true
  },
  
  // Asset handling
  assetsInclude: ['**/*.json', '**/*.svg'],
  
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'juicebox.js'
    ]
  }
})
