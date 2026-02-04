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

// Admin credentials - in production, use environment variables
const ADMIN_EMAIL = "admin@g10flow.com";
const ADMIN_PASSWORD = "G10Admin2024!";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Check admin credentials locally first
    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      toast.error("Credenciales de administrador invalidas");
      setLoading(false);
      return;
    }

    // Try to sign in
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    if (signInError) {
      // If invalid credentials, admin might not exist - try to create it
      if (signInError.message.includes("Invalid login credentials")) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: {
              full_name: "Administrador",
              role: "admin",
            },
          },
        });

        if (signUpError) {
          if (signUpError.message.includes("rate") || signUpError.status === 429) {
            toast.error("Demasiados intentos. Espera unos minutos.");
          } else {
            toast.error(signUpError.message);
          }
          setLoading(false);
          return;
        }

        // Check if email confirmation is required
        if (signUpData.user && !signUpData.session) {
          toast.success("Admin creado. Revisa tu email para confirmar la cuenta.");
          setLoading(false);
          return;
        }
      } else {
        toast.error(signInError.message);
        setLoading(false);
        return;
      }
    }

    if (data?.session) {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center">
            <Shield className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">
              Acceso Administrador
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Panel de control de G10 Flow
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email de administrador</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@g10flow.com"
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
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-background/50"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-destructive hover:bg-destructive/90"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Acceder como Admin"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
