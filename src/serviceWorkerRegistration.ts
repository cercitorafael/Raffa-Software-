/**
 * Service Worker Registration & Lifecycle Coordinator
 */

export function registerServiceWorker(
  onSuccess?: (registration: ServiceWorkerRegistration) => void,
  onUpdate?: (registration: ServiceWorkerRegistration) => void
) {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = '/sw.js';

      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          console.log('[SW] Service Worker registered with scope:', registration.scope);

          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker == null) {
              return;
            }
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.log('[SW] New content is available and will be used when all tabs are closed.');
                  if (onUpdate) onUpdate(registration);
                } else {
                  console.log('[SW] Content is cached for offline use.');
                  if (onSuccess) onSuccess(registration);
                }
              }
            };
          };

          if (onSuccess) onSuccess(registration);
        })
        .catch((error) => {
          console.warn('[SW] Service worker registration failed:', error);
        });
    });
  }
}

export function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}

export function requestBackgroundSync(tag: string = 'sync-pos-sales') {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready.then((reg: any) => {
      if (reg.sync) {
        reg.sync.register(tag).catch((err: any) => {
          console.warn('[SW] Background sync registration failed:', err);
        });
      }
    });
  }
}
