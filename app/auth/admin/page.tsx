"use client";

import React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Loader2, Shield } from "lucide-react";
import { toast } from "sonner";

const ADMIN_SECRET_KEY = "G10ADMIN2024";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "create">("login");
  const router = useRouter();
  const supabase = createClient();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profile?.role !== "admin") {
      await supabase.auth.signOut();
      toast.error("Este usuario no tiene permisos de administrador");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Verify secret key locally first
    if (secretKey !== ADMIN_SECRET_KEY) {
      toast.error("Clave secreta incorrecta");
      setLoading(false);
      return;
    }

    try {
      // Use admin API to create user without email confirmation
      const response = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          full_name: "Administrador",
          role: "admin",
          adminSecret: secretKey,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Error al crear admin");
        setLoading(false);
        return;
      }

      toast.success("Admin creado exitosamente. Ahora puedes iniciar sesion.");
      setMode("login");
      setSecretKey("");
    } catch (error) {
      toast.error("Error de conexion");
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">
              {mode === "login" ? "Acceso Administrador" : "Crear Admin"}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Panel de control de G10 Flow
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {mode === "login" ? (
            <form onSubmit={handleAdminLogin} className="space-y-4">
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
                <Label htmlFor="password">Contrasena</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-background/50"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Ingresar como Admin"
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Tu email</Label>
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
                <Label htmlFor="password">Contrasena</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secretKey">Clave secreta de admin</Label>
                <Input
                  id="secretKey"
                  type="password"
                  placeholder="Clave secreta"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  required
                  className="bg-background/50"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  "Crear cuenta Admin"
                )}
              </Button>
            </form>
          )}

          <div className="text-center">
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "create" : "login")}
              className="text-sm text-primary hover:underline"
            >
              {mode === "login" 
                ? "No tienes cuenta? Crear admin" 
                : "Ya tienes cuenta? Ingresar"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
