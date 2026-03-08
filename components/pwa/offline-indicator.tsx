"use client";

import { usePWA } from "@/components/providers/pwa-provider";
import { WifiOff } from "lucide-react";

export function OfflineIndicator() {
  const { isOffline } = usePWA();

  if (!isOffline) return null;

  return (
    <div className="bg-yellow-500/90 text-yellow-950 px-4 py-2 text-center text-xs font-medium flex items-center justify-center gap-2">
      <WifiOff className="w-3.5 h-3.5" />
      Sin conexión — los datos se sincronizarán al reconectar
    </div>
  );
}
