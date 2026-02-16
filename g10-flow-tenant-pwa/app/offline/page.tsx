"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WifiOff, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
            <WifiOff className="w-8 h-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">Sin conexión</CardTitle>
          <p className="text-muted-foreground mt-2">
            No tienes conexión a internet en este momento.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Algunas funciones de la app están disponibles sin conexión:
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Ver tu rutina guardada
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Marcar ejercicios completados
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Ver información de entrenadores
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <Button onClick={handleRetry} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Intentar de nuevo
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/dashboard">
                <Home className="w-4 h-4 mr-2" />
                Ir al inicio
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
