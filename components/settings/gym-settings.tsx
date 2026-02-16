"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Loader2, Palette } from "lucide-react";
import { toast } from "sonner";
import type { Tenant } from "@/lib/types";

export function GymSettings() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [secondaryColor, setSecondaryColor] = useState("#1e40af");

  useEffect(() => {
    fetch("/api/tenant")
      .then((res) => res.json())
      .then((data) => {
        if (data.tenant) {
          const t = data.tenant as Tenant;
          setTenant(t);
          setName(t.name || "");
          setDescription(t.description || "");
          setEmail(t.email || "");
          setPhone(t.phone || "");
          setLogoUrl(t.logo_url || "");
          setPrimaryColor(t.theme?.primaryColor || "#3b82f6");
          setSecondaryColor(t.theme?.secondaryColor || "#1e40af");
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/tenant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          email: email || null,
          phone: phone || null,
          logo_url: logoUrl || null,
          theme: { primaryColor, secondaryColor },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }

      setTenant(data.tenant);
      toast.success("Configuración del gimnasio actualizada");
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!tenant) return null;

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Mi Gimnasio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gymName">Nombre del gimnasio</Label>
            <Input
              id="gymName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gymDesc">Descripción</Label>
            <Textarea
              id="gymDesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción de tu gimnasio..."
              rows={3}
              className="bg-background/50"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gymEmail">Email de contacto</Label>
              <Input
                id="gymEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contacto@gimnasio.com"
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gymPhone">Teléfono</Label>
              <Input
                id="gymPhone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+54 11 1234-5678"
                className="bg-background/50"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gymLogo">URL del logo</Label>
            <Input
              id="gymLogo"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
              className="bg-background/50"
            />
            {logoUrl && (
              <div className="mt-2">
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  className="h-16 w-16 object-contain rounded-lg border"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Colores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pc">Color primario</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  id="pc"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-14 rounded border cursor-pointer"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 bg-background/50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sc">Color secundario</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  id="sc"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="h-10 w-14 rounded border cursor-pointer"
                />
                <Input
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="flex-1 bg-background/50"
                />
              </div>
            </div>
          </div>
          {/* Preview */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div
              className="h-10 w-10 rounded-full border"
              style={{ backgroundColor: primaryColor }}
            />
            <div
              className="h-10 w-10 rounded-full border"
              style={{ backgroundColor: secondaryColor }}
            />
            <span className="text-sm text-muted-foreground">Vista previa</span>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={saving} className="w-full sm:w-auto">
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Guardando...
          </>
        ) : (
          "Guardar configuración"
        )}
      </Button>
    </form>
  );
}
