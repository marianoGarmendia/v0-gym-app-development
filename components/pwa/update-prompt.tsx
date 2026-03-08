"use client";

import { usePWA } from "@/components/providers/pwa-provider";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export function UpdatePrompt() {
  const { updateAvailable, updateApp } = usePWA();

  if (!updateAvailable) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 bg-card border border-border rounded-2xl p-4 shadow-lg animate-in slide-in-from-top-4 duration-300">
      <div className="flex items-center gap-3">
        <RefreshCw className="w-5 h-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Nueva versión disponible</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Actualizá para obtener las últimas mejoras
          </p>
        </div>
        <Button onClick={updateApp} size="sm">
          Actualizar
        </Button>
      </div>
    </div>
  );
}
