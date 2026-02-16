"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { GymForm } from "@/components/super-admin/gym-form";
import { CreateAdminForm } from "@/components/super-admin/create-admin-form";
import { toast } from "sonner";
import { ArrowLeft, Users } from "lucide-react";
import type { Tenant, Profile } from "@/lib/types";

export default function GymDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id as string;

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [toggling, setToggling] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/super-admin/tenants");
      const data = await res.json();
      const found = data.tenants?.find((t: Tenant) => t.id === tenantId);
      setTenant(found || null);

      // Fetch users for this tenant
      const usersRes = await fetch(`/api/super-admin/tenants/${tenantId}/users`);
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      }
    } catch {
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tenantId]);

  const toggleActive = async () => {
    if (!tenant) return;
    setToggling(true);
    try {
      const res = await fetch(`/api/super-admin/tenants/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !tenant.is_active }),
      });
      if (res.ok) {
        setTenant({ ...tenant, is_active: !tenant.is_active });
        toast.success(tenant.is_active ? "Gimnasio desactivado" : "Gimnasio activado");
      }
    } catch {
      toast.error("Error al cambiar estado");
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">Gimnasio no encontrado</p>
        <Button variant="link" onClick={() => router.push("/super-admin/gyms")}>
          Volver a gimnasios
        </Button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver
          </Button>
          <h1 className="text-2xl font-bold">Editar {tenant.name}</h1>
        </div>
        <GymForm tenant={tenant} mode="edit" />
      </div>
    );
  }

  const admins = users.filter((u) => u.role === "admin");
  const trainers = users.filter((u) => u.role === "trainer");
  const students = users.filter((u) => u.role === "student");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/super-admin/gyms")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Gimnasios
          </Button>
          <h1 className="text-2xl font-bold">{tenant.name}</h1>
          <Badge variant={tenant.is_active ? "default" : "secondary"}>
            {tenant.is_active ? "Activo" : "Inactivo"}
          </Badge>
        </div>
        <Button onClick={() => setEditing(true)}>Editar</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Información</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Slug</p>
                <p className="font-medium">{tenant.slug}</p>
              </div>
              <div>
                <p className="text-muted-foreground">URL</p>
                <p className="font-medium">{tenant.slug}.lvh.me:3000</p>
              </div>
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium">{tenant.email || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Teléfono</p>
                <p className="font-medium">{tenant.phone || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Plan</p>
                <Badge variant="outline">{tenant.plan}</Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Estado de pago</p>
                <Badge variant="outline">{tenant.payment_status}</Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Máx. alumnos</p>
                <p className="font-medium">{tenant.max_students}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Creado</p>
                <p className="font-medium">
                  {new Date(tenant.created_at).toLocaleDateString("es-AR")}
                </p>
              </div>
            </div>

            {tenant.description && (
              <div className="pt-2">
                <p className="text-muted-foreground text-sm">Descripción</p>
                <p className="text-sm">{tenant.description}</p>
              </div>
            )}

            {/* Branding preview */}
            {tenant.theme && (
              <div className="pt-2">
                <p className="text-muted-foreground text-sm mb-2">Branding</p>
                <div className="flex gap-3 items-center">
                  {tenant.theme.primaryColor && (
                    <div
                      className="h-8 w-8 rounded-full border"
                      style={{ backgroundColor: tenant.theme.primaryColor }}
                    />
                  )}
                  {tenant.theme.secondaryColor && (
                    <div
                      className="h-8 w-8 rounded-full border"
                      style={{ backgroundColor: tenant.theme.secondaryColor }}
                    />
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-4 border-t">
              <Switch
                checked={tenant.is_active}
                onCheckedChange={toggleActive}
                disabled={toggling}
              />
              <Label>{tenant.is_active ? "Activo" : "Inactivo"}</Label>
            </div>
          </CardContent>
        </Card>

        {/* Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuarios
            </CardTitle>
            <CreateAdminForm tenantId={tenantId} onCreated={fetchData} />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Admins</span>
                <Badge variant="outline">{admins.length}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Trainers</span>
                <Badge variant="outline">{trainers.length}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Alumnos</span>
                <Badge variant="outline">{students.length}</Badge>
              </div>
            </div>

            {users.length > 0 && (
              <div className="border-t pt-3 space-y-2">
                <p className="text-xs text-muted-foreground font-medium">
                  Últimos usuarios
                </p>
                {users.slice(0, 5).map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate">{u.full_name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {u.role}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
