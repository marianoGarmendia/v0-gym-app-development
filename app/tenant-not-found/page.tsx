import { AlertTriangle } from "lucide-react";

export default function TenantNotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="text-center max-w-md">
        <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center mb-6">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Gimnasio no encontrado</h1>
        <p className="text-muted-foreground">
          Este gimnasio no existe o esta inactivo. Verifica la direccion e intenta nuevamente.
        </p>
      </div>
    </div>
  );
}
