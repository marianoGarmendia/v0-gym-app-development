import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Search, Home, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Gimnasio no encontrado | G10 Flow",
  description: "El gimnasio que buscas no existe o no está disponible.",
};

export default function TenantNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Gimnasio no encontrado</CardTitle>
          <p className="text-muted-foreground mt-2">
            El subdominio que ingresaste no corresponde a un gimnasio registrado.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">¿Eres dueño de un gimnasio?</strong>
              <br />
              Registra tu gimnasio en G10 Flow y empieza a gestionar tus entrenamientos.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button asChild className="w-full">
              <Link href="https://g10flow.app/register-gym">
                <Building2 className="w-4 h-4 mr-2" />
                Registrar mi gimnasio
              </Link>
            </Button>
            
            <Button variant="outline" asChild className="w-full">
              <Link href="https://g10flow.app">
                <Home className="w-4 h-4 mr-2" />
                Ir a G10 Flow
              </Link>
            </Button>
            
            <Button variant="ghost" asChild className="w-full">
              <Link href="javascript:history.back()">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver atrás
              </Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Si crees que esto es un error, contacta a{" "}
            <Link href="mailto:soporte@g10flow.app" className="text-primary hover:underline">
              soporte@g10flow.app
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
