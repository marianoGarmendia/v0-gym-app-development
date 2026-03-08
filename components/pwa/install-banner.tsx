"use client";

import { useState } from "react";
import { usePWA } from "@/components/providers/pwa-provider";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

export function InstallBanner() {
  const { isInstallable, isInstalled, installApp } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  if (!isInstallable || isInstalled || dismissed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 bg-primary text-primary-foreground rounded-2xl p-4 shadow-lg animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-start gap-3">
        <Download className="w-5 h-5 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Instalá la app</p>
          <p className="text-xs opacity-90 mt-0.5">
            Accedé más rápido desde tu pantalla de inicio
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-primary-foreground/10 rounded-lg shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <Button
        onClick={installApp}
        variant="secondary"
        size="sm"
        className="w-full mt-3"
      >
        Instalar
      </Button>
    </div>
  );
}
