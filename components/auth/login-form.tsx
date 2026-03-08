"use client";

import React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Dumbbell } from "lucide-react";
import { toast } from "sonner";

interface LoginFormProps {
  tenantName: string | null;
}

export function LoginForm({ tenantName }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const appName = tenantName || "FitIA";

  const handleResetPassword = async () => {
    if (!email) {
      toast.error("Ingresa tu email primero");
      return;
    }
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo: `${window.location.origin}/auth/callback`,
      }
    );
    setResetLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Te enviamos un email para resetear tu contrasena");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Error al iniciar sesion");
        setLoading(false);
        return;
      }

      // Set session from API response
      if (data.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      // Redirect superadmin to super-admin panel
      if (data.user?.app_metadata?.role === "superadmin" || !tenantName) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        if (profile?.role === "superadmin") {
          if (tenantName) {
            await supabase.auth.signOut();
            toast.error("El superadmin solo puede ingresar desde el dominio principal");
            setLoading(false);
            return;
          }
          router.push("/super-admin");
          router.refresh();
          return;
        }
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Error al conectar con el servidor");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Dumbbell className="w-8 h-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">{appName}</CardTitle>
            <CardDescription className="text-muted-foreground">
              Inicia sesion para acceder a tus rutinas
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contrasena</Label>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={resetLoading}
                  className="text-xs text-primary hover:underline disabled:opacity-50"
                >
                  {resetLoading ? "Enviando..." : "Olvidaste tu contrasena?"}
                </button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-background/50"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesion...
                </>
              ) : (
                "Iniciar sesion"
              )}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            No tienes cuenta?{" "}
            <Link
              href="/auth/sign-up"
              className="text-primary hover:underline font-medium"
            >
              Registrate
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
