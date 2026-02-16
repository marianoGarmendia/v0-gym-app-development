"use client";

import { useState, useEffect } from "react";
import { usePWA } from "./pwa-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, Download, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

export function InstallPrompt() {
  const { isInstallable, isInstalled, installPrompt } = usePWA();
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenDismissed, setHasBeenDismissed] = useState(false);

  useEffect(() => {
    // Verificar si el usuario ya descartó el prompt
    const dismissed = localStorage.getItem("g10flow-install-dismissed");
    const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0;
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    
    if (dismissedTime && Date.now() - dismissedTime < oneWeek) {
      setHasBeenDismissed(true);
      return;
    }

    // Mostrar después de 5 segundos si es instalable
    if (isInstallable && !isInstalled) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled]);

  const handleDismiss = () => {
    setIsVisible(false);
    setHasBeenDismissed(true);
    localStorage.setItem("g10flow-install-dismissed", Date.now().toString());
  };

  const handleInstall = async () => {
    await installPrompt();
    setIsVisible(false);
  };

  if (!isVisible || hasBeenDismissed) {
    return null;
  }

  return (
    <Card
      className={cn(
        "fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto",
        "border-primary/50 bg-card/95 backdrop-blur shadow-lg",
        "animate-in slide-in-from-bottom-4 duration-300"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-6 h-6 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">
              Instala G10 Flow en tu dispositivo
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Accede más rápido y recibe notificaciones de tus entrenamientos.
            </p>
            
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={handleInstall} className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Instalar
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss}>
                Ahora no
              </Button>
            </div>
          </div>
          
          <Button
            size="icon"
            variant="ghost"
            className="flex-shrink-0 -mt-1 -mr-1"
            onClick={handleDismiss}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
