import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { visualizer } from 'rollup-plugin-visualizer';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';

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
      // PWA with service worker (Phase 2, Days 9-10)
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'logo.webp', 'logo.jpg'],
        manifest: {
          name: "D'Sierra Painting - Invoice Management",
          short_name: 'Sierra Painting',
          description: 'Professional painting company invoice and job management system',
          theme_color: '#1e40af',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: '/logo.webp',
              sizes: '800x800',
              type: 'image/webp',
              purpose: 'any maskable',
            },
            {
              src: '/logo.jpg',
              sizes: '800x800',
              type: 'image/jpeg',
              purpose: 'any',
            },
          ],
        },
        workbox: {
          // Cache strategy
          globPatterns: ['**/*.{js,css,html,ico,png,jpg,jpeg,webp,svg,woff,woff2}'],
          // Navigation fallback for SPA routing
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            // Cache Firebase API calls
            {
              urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'firebase-storage-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // Cache Firestore API calls with network-first strategy
            {
              urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'firestore-cache',
                networkTimeoutSeconds: 10,
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24, // 24 hours
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // Cache other API calls
            {
              urlPattern: /^https:\/\/.*\.googleapis\.com\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'googleapis-cache',
                networkTimeoutSeconds: 10,
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24, // 24 hours
                },
              },
            },
          ],
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
        },
        devOptions: {
          enabled: false, // Disable in dev to avoid conflicts with HMR
        },
      }),
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

      // Optimize chunks - Firebase tree shaking + vendor splitting
      rollupOptions: {
        output: {
          // Manual chunks for optimal code splitting
          manualChunks: (id) => {
            // Skip non-node_modules files
            if (!id.includes('node_modules')) {
              return undefined;
            }

            // Firebase modules - split by service for better caching
            // Note: Firebase uses @firebase/* scoped packages
            if (id.includes('/@firebase/firestore') || id.includes('/firebase/firestore')) {
              return 'firestore';
            }
            if (id.includes('/@firebase/auth') || id.includes('/firebase/auth')) {
              return 'auth';
            }
            if (id.includes('/@firebase/storage') || id.includes('/firebase/storage')) {
              return 'storage';
            }
            if (id.includes('/@firebase/analytics') || id.includes('/firebase/analytics')) {
              return 'analytics';
            }
            // Firebase core includes app, app-check, etc.
            if (id.includes('/@firebase/') || id.includes('/firebase/')) {
              return 'firebase-core';
            }

            // React ecosystem - critical path
            // Match /node_modules/react/ but not react-dom, react-router, etc.
            if (id.match(/\/node_modules\/react\//) && !id.includes('react-')) {
              return 'react-vendor';
            }
            if (id.includes('/node_modules/react-dom/')) {
              return 'react-vendor';
            }
            if (id.includes('/react-router')) {
              return 'router';
            }

            // State management & data fetching
            if (id.includes('/@tanstack/react-query')) {
              return 'react-query';
            }
            if (id.includes('/zustand/')) {
              return 'zustand';
            }

            // UI Component Libraries
            if (id.includes('/@radix-ui/')) {
              return 'radix';
            }
            if (id.includes('/@mui/')) {
              return 'mui';
            }
            if (id.includes('/lucide-react/')) {
              return 'icons';
            }

            // Form handling
            if (id.includes('/react-hook-form/') || id.includes('/@hookform/')) {
              return 'forms';
            }
            if (id.includes('/zod/')) {
              return 'zod';
            }

            // Date libraries
            if (id.includes('/date-fns/')) {
              return 'date-fns';
            }

            // Other vendor modules (fallback for anything else in node_modules)
            return 'vendor';
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

      // Performance budgets (Phase 2, Day 8)
      chunkSizeWarningLimit: 1000, // Warn at 1MB chunks

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
});
