"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { registerServiceWorker, skipWaiting } from "@/lib/pwa/register-sw";
import { processPendingMutations } from "@/lib/pwa/mutation-queue";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PWAContextValue {
  isOffline: boolean;
  isInstallable: boolean;
  isInstalled: boolean;
  updateAvailable: boolean;
  installApp: () => Promise<void>;
  updateApp: () => void;
}

const PWAContext = createContext<PWAContextValue>({
  isOffline: false,
  isInstallable: false,
  isInstalled: false,
  updateAvailable: false,
  installApp: async () => {},
  updateApp: () => {},
});

export const usePWA = () => useContext(PWAContext);

export function PWAProvider({ children }: { children: ReactNode }) {
  const [isOffline, setIsOffline] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Check initial online status
    setIsOffline(!navigator.onLine);

    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    // Online/offline listeners
    const handleOnline = async () => {
      setIsOffline(false);
      // Process pending offline mutations
      try {
        const { processed } = await processPendingMutations();
        if (processed > 0) {
          toast.success(`${processed} cambio${processed > 1 ? 's' : ''} sincronizado${processed > 1 ? 's' : ''}`);
        }
      } catch {
        // Silent fail - will retry next time
      }
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Install prompt listener
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Detect when app is installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    // SW update listener
    const handleSWUpdate = () => setUpdateAvailable(true);
    window.addEventListener('sw-update-available', handleSWUpdate);

    // Register service worker
    registerServiceWorker().then((result) => {
      if (result) {
        setRegistration(result.registration);
        if (result.updateAvailable) setUpdateAvailable(true);
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('sw-update-available', handleSWUpdate);
    };
  }, []);

  const installApp = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const updateApp = useCallback(() => {
    if (registration) {
      skipWaiting(registration);
      // Reload to activate new SW
      window.location.reload();
    }
  }, [registration]);

  return (
    <PWAContext.Provider value={{ isOffline, isInstallable, isInstalled, updateAvailable, installApp, updateApp }}>
      {children}
    </PWAContext.Provider>
  );
}
