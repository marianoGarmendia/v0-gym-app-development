import React from "react"
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dumbbell, Users, Calendar, MessageSquare, ChevronRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-xl">G10 Flow</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/auth/login">Ingresar</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/sign-up">Comenzar</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <span>Nueva version disponible</span>
            <ChevronRight className="w-4 h-4" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 text-balance">
            Gestiona tus rutinas de{" "}
            <span className="text-primary">entrenamiento</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 text-pretty max-w-2xl mx-auto">
            Conecta entrenadores y alumnos en una plataforma moderna. Crea, comparte y
            realiza seguimiento de rutinas personalizadas con facilidad.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild className="w-full sm:w-auto">
              <Link href="/auth/sign-up">
                Empezar gratis
                <ChevronRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="w-full sm:w-auto bg-transparent">
              <Link href="/auth/login">Ya tengo cuenta</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-card/30">
        <div className="container mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            Todo lo que necesitas para entrenar
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<Calendar className="w-6 h-6" />}
              title="Rutinas diarias"
              description="Navega por dias y semanas para ver tus ejercicios programados"
            />
            <FeatureCard
              icon={<Users className="w-6 h-6" />}
              title="Multiples entrenadores"
              description="Trabaja con diferentes profesionales segun tu objetivo"
            />
            <FeatureCard
              icon={<Dumbbell className="w-6 h-6" />}
              title="Seguimiento completo"
              description="Marca ejercicios completados y registra tu progreso"
            />
            <FeatureCard
              icon={<MessageSquare className="w-6 h-6" />}
              title="Feedback continuo"
              description="Deja comentarios en cada ejercicio, dia o semana"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-2xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Comienza tu transformacion hoy
          </h2>
          <p className="text-muted-foreground mb-8">
            Unete a cientos de atletas y entrenadores que ya usan G10 Flow
          </p>
          <Button size="lg" asChild>
            <Link href="/auth/sign-up">Crear cuenta gratis</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border/50">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-primary" />
            <span>G10 Flow</span>
          </div>
          <p>2026 G10 Flow. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/50 transition-colors">
      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
