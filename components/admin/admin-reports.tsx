"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, TrendingUp, Brain } from "lucide-react";
import Link from "next/link";

export function AdminReports() {
  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Header */}
      <header className="flex items-center gap-4 pt-2">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">Informes de IA</h1>
          <p className="text-sm text-muted-foreground">
            Analisis automatizados de rendimiento
          </p>
        </div>
      </header>

      {/* Coming Soon */}
      <Card className="border-border/50">
        <CardContent className="p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
            <Brain className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">Informes de IA</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Proximamente podras ver informes automatizados generados por IA
            sobre el progreso de cada alumno, analisis de tendencias y
            recomendaciones personalizadas.
          </p>
          <Badge variant="secondary" className="text-sm px-4 py-1">
            Proximamente
          </Badge>
        </CardContent>
      </Card>

      {/* Features Preview */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Funcionalidades planeadas</h2>
        <div className="space-y-3">
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Analisis de progreso</h3>
                <p className="text-sm text-muted-foreground">
                  Graficos y metricas de evolucion por alumno
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Informes semanales</h3>
                <p className="text-sm text-muted-foreground">
                  Resumen automatico de actividad y rendimiento
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Recomendaciones IA</h3>
                <p className="text-sm text-muted-foreground">
                  Sugerencias personalizadas basadas en datos
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
