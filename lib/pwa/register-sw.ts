export interface SWRegistration {
  registration: ServiceWorkerRegistration;
  updateAvailable: boolean;
}

export async function registerServiceWorker(): Promise<SWRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    let updateAvailable = false;

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New SW installed while old one still active = update available
          updateAvailable = true;
          window.dispatchEvent(new CustomEvent('sw-update-available'));
        }
      });
    });

    return { registration, updateAvailable };
  } catch (error) {
    console.error('SW registration failed:', error);
    return null;
  }
}

export function skipWaiting(registration: ServiceWorkerRegistration) {
  registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
}
