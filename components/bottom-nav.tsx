"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Dumbbell, Users, Settings, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";

interface BottomNavProps {
  role: UserRole;
}

export function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname();

  const studentLinks = [
    { href: "/dashboard", icon: Home, label: "Inicio" },
    { href: "/dashboard/routines", icon: Dumbbell, label: "Rutinas" },
    { href: "/dashboard/settings", icon: Settings, label: "Ajustes" },
  ];

  const trainerLinks = [
    { href: "/dashboard", icon: Home, label: "Inicio" },
    { href: "/dashboard/routines", icon: ClipboardList, label: "Rutinas" },
    { href: "/dashboard/students", icon: Users, label: "Alumnos" },
    { href: "/dashboard/settings", icon: Settings, label: "Ajustes" },
  ];

  const adminLinks = [
    { href: "/dashboard", icon: Home, label: "Inicio" },
    { href: "/dashboard/users", icon: Users, label: "Usuarios" },
    { href: "/dashboard/settings", icon: Settings, label: "Ajustes" },
  ];

  const links = role === "admin" ? adminLinks : role === "trainer" ? trainerLinks : studentLinks;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur border-t border-border/50 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {links.map((link) => {
          const isActive = pathname === link.href || 
            (link.href !== "/dashboard" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <link.icon className={cn("w-5 h-5", isActive && "stroke-[2.5]")} />
              <span className="text-xs font-medium">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
