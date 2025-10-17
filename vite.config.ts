import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import { visualizer } from 'rollup-plugin-visualizer'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  const shouldAnalyze = process.env.ANALYZE === 'true';

  return {
    // Ensure React is deduplicated
    resolve: {
      dedupe: ['react', 'react-dom', 'react-router-dom'],
      alias: {
        '@': resolve(__dirname, './src'),
        '@components': resolve(__dirname, './src/components'),
        '@hooks': resolve(__dirname, './src/hooks'),
        '@lib': resolve(__dirname, './src/lib'),
        '@utils': resolve(__dirname, './src/utils'),
        '@services': resolve(__dirname, './src/services'),
        '@types': resolve(__dirname, './src/types'),
      },
    },

    plugins: [
      react(),
      // Sentry source maps (only in production builds)
      ...(isProduction && process.env.SENTRY_AUTH_TOKEN
        ? [
            sentryVitePlugin({
              org: process.env.SENTRY_ORG,
              project: process.env.SENTRY_PROJECT,
              authToken: process.env.SENTRY_AUTH_TOKEN,
              sourcemaps: {
                assets: './dist/**',
                filesToDeleteAfterUpload: ['./dist/**/*.map'],
              },
              release: {
                name: process.env.VITE_APP_VERSION || 'unknown',
              },
            }),
          ]
        : []),
      // Bundle visualizer (run with ANALYZE=true npm run build)
      ...(shouldAnalyze
        ? [
            visualizer({
              filename: './dist/stats.html',
              open: true,
              gzipSize: true,
              brotliSize: true,
              template: 'treemap', // 'sunburst', 'treemap', 'network'
            }),
          ]
        : []),
    ],

    // Build configuration
    build: {
      // Generate source maps for Sentry
      sourcemap: isProduction,

      // Target modern browsers for smaller bundle size
      target: 'es2020',

      // Minification options
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: isProduction, // Remove console.log in production
          drop_debugger: isProduction,
          pure_funcs: isProduction ? ['console.log', 'console.debug'] : [],
        },
        format: {
          comments: false, // Remove comments
        },
      },

      // Optimize chunks - simplified to prevent loading order issues
      rollupOptions: {
        output: {
          // Bundle all vendor code together to ensure proper loading
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          },

          // Optimize chunk file names
          chunkFileNames: () => {
            return `assets/[name]-[hash].js`;
          },
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            // Organize assets by type
            const info = assetInfo.name?.split('.') || [];
            const ext = info[info.length - 1];
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
              return 'assets/images/[name]-[hash][extname]';
            }
            if (/woff2?|ttf|otf|eot/i.test(ext)) {
              return 'assets/fonts/[name]-[hash][extname]';
            }
            return 'assets/[name]-[hash][extname]';
          },
        },
      },

      // Increase chunk size warning limit for vendor chunks
      chunkSizeWarningLimit: 1000,

      // CSS code splitting
      cssCodeSplit: true,

      // Rollup optimizations
      reportCompressedSize: true,
      cssMinify: true,
    },

    // Development server
    server: {
      port: 5173,
      strictPort: false,
      open: false,
    },
  };
})
