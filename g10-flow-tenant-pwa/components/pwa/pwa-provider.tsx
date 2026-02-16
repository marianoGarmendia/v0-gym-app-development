"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface PWAContextType {
  isInstalled: boolean;
  isInstallable: boolean;
  isOffline: boolean;
  installPrompt: () => Promise<void>;
  updateAvailable: boolean;
  updateApp: () => void;
}

const PWAContext = createContext<PWAContextType | null>(null);

export function usePWA() {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error("usePWA must be used within PWAProvider");
  }
  return context;
}

interface PWAProviderProps {
  children: ReactNode;
}

export function PWAProvider({ children }: PWAProviderProps) {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    // Verificar si ya está instalada
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Detectar si está offline
    setIsOffline(!navigator.onLine);
    
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Capturar el evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Detectar cuando se instala
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    // Registrar Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[PWA] Service Worker registered:", registration);

          // Detectar actualizaciones
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (
                  newWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  // Nueva versión disponible
                  setUpdateAvailable(true);
                  setWaitingWorker(newWorker);
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error("[PWA] Service Worker registration failed:", error);
        });

      // Escuchar mensajes del SW
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data === "update-available") {
          setUpdateAvailable(true);
        }
      });
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const installPrompt = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      console.log("[PWA] User accepted install");
    } else {
      console.log("[PWA] User dismissed install");
    }
    
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const updateApp = () => {
    if (waitingWorker) {
      waitingWorker.postMessage("skipWaiting");
      window.location.reload();
    }
  };

  return (
    <PWAContext.Provider
      value={{
        isInstalled,
        isInstallable,
        isOffline,
        installPrompt,
        updateAvailable,
        updateApp,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
}
