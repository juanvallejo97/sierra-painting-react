/**
 * Size Limit Configuration
 *
 * Tracks bundle sizes and enforces performance budgets
 * Run: npm run size
 *
 * Phase 2 Exit Criteria:
 * - Initial bundle < 500KB brotli compressed
 * - Largest single chunk < 180KB brotli
 */

module.exports = [
  {
    name: 'Initial Bundle (brotli)',
    path: 'dist/index.html',
    limit: '500 KB',
    brotli: true,
  },
  {
    name: 'Main JS Bundle',
    path: 'dist/assets/index-*.js',
    limit: '180 KB',
    brotli: true,
  },
  {
    name: 'React Vendor',
    path: 'dist/assets/react-vendor-*.js',
    limit: '150 KB',
    brotli: true,
  },
  {
    name: 'Firebase Core',
    path: 'dist/assets/firebase-core-*.js',
    limit: '100 KB',
    brotli: true,
  },
  {
    name: 'Firestore',
    path: 'dist/assets/firestore-*.js',
    limit: '120 KB',
    brotli: true,
  },
  {
    name: 'Auth',
    path: 'dist/assets/auth-*.js',
    limit: '80 KB',
    brotli: true,
  },
  {
    name: 'Vendor (Other)',
    path: 'dist/assets/vendor-*.js',
    limit: '320 KB',
    brotli: true,
  },
];
