"use client";

import type { Profile } from "@/lib/types";

interface BibliotecaListProps {
  profile: Profile;
}

export function BibliotecaList({ profile }: BibliotecaListProps) {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-2">Biblioteca</h1>
      <p className="text-muted-foreground text-sm">Próximamente.</p>
    </div>
  );
}
