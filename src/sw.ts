/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'
import { registerRoute } from 'workbox-routing'
import { createHandlerBoundToURL } from 'workbox-precaching'

// Ensure TypeScript knows about the injected manifest.
declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<import('workbox-precaching').PrecacheEntry | string>
}

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// SPA fallback to index.html for navigation requests.
registerRoute(
  ({ request }) => request.mode === 'navigate',
  createHandlerBoundToURL(`${import.meta.env.BASE_URL}index.html`)
)
