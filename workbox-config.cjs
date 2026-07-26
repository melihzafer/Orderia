module.exports = {
  globDirectory: 'dist',
  globPatterns: ['**/*.{html,js,json,ico,png,svg,ttf,woff,woff2}'],
  globIgnores: ['sw.js', 'workbox-*.js', '**/*.map'],
  swDest: 'dist/sw.js',
  cleanupOutdatedCaches: true,
  clientsClaim: false,
  skipWaiting: false,
  navigateFallback: '/index.html',
  navigateFallbackDenylist: [/^\/(?:auth|functions|rest|realtime|storage)\//],
  maximumFileSizeToCacheInBytes: 7 * 1024 * 1024,
  mode: 'production',
  sourcemap: false,
  runtimeCaching: [
    {
      urlPattern: ({ url }) =>
        url.hostname.endsWith('.supabase.co') ||
        url.pathname.startsWith('/auth/') ||
        url.pathname.startsWith('/functions/') ||
        url.pathname.startsWith('/rest/') ||
        url.pathname.startsWith('/realtime/') ||
        url.pathname.startsWith('/storage/'),
      handler: 'NetworkOnly',
    },
    {
      urlPattern: ({ request, url }) =>
        request.mode === 'navigate' && url.origin === self.location.origin,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'orderia-pages-v1',
        networkTimeoutSeconds: 3,
        expiration: {
          maxEntries: 8,
          maxAgeSeconds: 24 * 60 * 60,
          purgeOnQuotaError: true,
        },
      },
    },
  ],
};
