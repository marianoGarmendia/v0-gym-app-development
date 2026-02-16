"use client";

import { usePWA } from "./pwa-provider";
import { WifiOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

export function OfflineBanner() {
  const { isOffline } = usePWA();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOffline) {
      setIsVisible(true);
    } else {
      // Esperar un poco antes de ocultar para que se vea la transición
      const timer = setTimeout(() => setIsVisible(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [isOffline]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[100]",
        "bg-amber-500 text-amber-950",
        "transition-all duration-300",
        isOffline ? "translate-y-0" : "-translate-y-full"
      )}
    >
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-center gap-2 text-sm font-medium">
          <WifiOff className="w-4 h-4" />
          <span>Sin conexión a internet</span>
          <span className="hidden sm:inline">· Algunas funciones pueden no estar disponibles</span>
        </div>
      </div>
    </div>
  );
}

export function UpdateBanner() {
  const { updateAvailable, updateApp } = usePWA();

  if (!updateAvailable) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[100]",
        "bg-primary text-primary-foreground",
        "animate-in slide-in-from-top"
      )}
    >
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Hay una nueva versión disponible</span>
          </div>
          <button
            onClick={updateApp}
            className="underline font-medium hover:no-underline"
          >
            Actualizar ahora
          </button>
        </div>
      </div>
    </div>
  );
}
