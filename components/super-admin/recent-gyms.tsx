"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";
import type { Tenant } from "@/lib/types";

interface TenantWithCount extends Tenant {
  user_count: number;
}

export function RecentGyms() {
  const [tenants, setTenants] = useState<TenantWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/super-admin/tenants")
      .then((res) => res.json())
      .then((data) => setTenants((data.tenants || []).slice(0, 5)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No hay gimnasios creados aún. Creá el primero con el botón &quot;Nuevo Gimnasio&quot;.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {tenants.map((tenant) => (
        <Link
          key={tenant.id}
          href={`/super-admin/gyms/${tenant.id}`}
          className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-medium">{tenant.name}</span>
              <Badge variant={tenant.is_active ? "default" : "secondary"} className="text-xs">
                {tenant.is_active ? "Activo" : "Inactivo"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{tenant.slug}</p>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {tenant.user_count}
          </div>
        </Link>
      ))}
    </div>
  );
}
