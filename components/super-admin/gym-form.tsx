"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Tenant } from "@/lib/types";

interface GymFormProps {
  tenant?: Tenant;
  mode: "create" | "edit";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function GymForm({ tenant, mode }: GymFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(tenant?.name || "");
  const [slug, setSlug] = useState(tenant?.slug || "");
  const [description, setDescription] = useState(tenant?.description || "");
  const [email, setEmail] = useState(tenant?.email || "");
  const [phone, setPhone] = useState(tenant?.phone || "");
  const [plan, setPlan] = useState(tenant?.plan || "free");
  const [primaryColor, setPrimaryColor] = useState(
    tenant?.theme?.primaryColor || "#3b82f6"
  );
  const [secondaryColor, setSecondaryColor] = useState(
    tenant?.theme?.secondaryColor || "#1e40af"
  );

  // Admin fields (only for create mode)
  const [createAdmin, setCreateAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminName, setAdminName] = useState("");

  const handleNameChange = (value: string) => {
    setName(value);
    if (mode === "create") {
      setSlug(slugify(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const theme = { primaryColor, secondaryColor };

      if (mode === "create") {
        const res = await fetch("/api/super-admin/tenants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, slug, description, email, phone, theme, plan }),
        });

        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error);
          return;
        }

        // Create admin if requested
        if (createAdmin && adminEmail && adminPassword && adminName) {
          const adminRes = await fetch(
            `/api/super-admin/tenants/${data.tenant.id}/create-admin`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: adminEmail,
                password: adminPassword,
                full_name: adminName,
              }),
            }
          );
          const adminData = await adminRes.json();
          if (!adminRes.ok) {
            toast.error(`Gimnasio creado, pero error creando admin: ${adminData.error}`);
            router.push(`/super-admin/gyms/${data.tenant.id}`);
            return;
          }
        }

        toast.success("Gimnasio creado exitosamente");
        router.push(`/super-admin/gyms/${data.tenant.id}`);
      } else {
        const res = await fetch(`/api/super-admin/tenants/${tenant!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description, email, phone, theme, plan }),
        });

        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error);
          return;
        }

        toast.success("Gimnasio actualizado");
        router.refresh();
      }
    } catch {
      toast.error("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Información del Gimnasio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Mi Gimnasio"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL) *</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="mi-gimnasio"
                required
                disabled={mode === "edit"}
              />
              {slug && (
                <p className="text-xs text-muted-foreground">
                  {slug}.lvh.me:3000
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción del gimnasio..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contacto@gimnasio.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+54 11 1234-5678"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan">Plan</Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Color Primario</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  id="primaryColor"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-14 rounded border cursor-pointer"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondaryColor">Color Secundario</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  id="secondaryColor"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="h-10 w-14 rounded border cursor-pointer"
                />
                <Input
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          {/* Preview */}
          <div className="flex gap-3 items-center mt-2">
            <div
              className="h-10 w-10 rounded-full"
              style={{ backgroundColor: primaryColor }}
            />
            <div
              className="h-10 w-10 rounded-full"
              style={{ backgroundColor: secondaryColor }}
            />
            <span className="text-sm text-muted-foreground">Vista previa de colores</span>
          </div>
        </CardContent>
      </Card>

      {mode === "create" && (
        <Card>
          <CardHeader>
            <CardTitle>Administrador del Gimnasio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="createAdmin"
                checked={createAdmin}
                onChange={(e) => setCreateAdmin(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="createAdmin">
                Crear administrador del gimnasio ahora
              </Label>
            </div>

            {createAdmin && (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="adminName">Nombre completo</Label>
                  <Input
                    id="adminName"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Juan Pérez"
                    required={createAdmin}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="adminEmail">Email</Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@gimnasio.com"
                      required={createAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminPassword">Contraseña</Label>
                    <Input
                      id="adminPassword"
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required={createAdmin}
                      minLength={6}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading
            ? "Guardando..."
            : mode === "create"
              ? "Crear Gimnasio"
              : "Guardar Cambios"}
        </Button>
      </div>
    </form>
  );
}
