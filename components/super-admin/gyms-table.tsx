"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Users } from "lucide-react";
import type { Tenant } from "@/lib/types";

interface TenantWithCount extends Tenant {
  user_count: number;
}

export function GymsTable() {
  const [tenants, setTenants] = useState<TenantWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/super-admin/tenants")
      .then((res) => res.json())
      .then((data) => setTenants(data.tenants || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = tenants.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "active"
          ? t.is_active
          : !t.is_active;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar gimnasio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="inactive">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Link href="/super-admin/gyms/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Gimnasio
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {tenants.length === 0
              ? "No hay gimnasios creados aún."
              : "No se encontraron resultados."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((tenant) => (
            <Link key={tenant.id} href={`/super-admin/gyms/${tenant.id}`}>
              <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{tenant.name}</h3>
                        <Badge variant={tenant.is_active ? "default" : "secondary"}>
                          {tenant.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                        <Badge variant="outline">{tenant.plan}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {tenant.slug}.lvh.me:3000
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {tenant.user_count}
                      </div>
                      <Badge variant="outline" className="hidden sm:inline-flex">
                        {tenant.payment_status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
