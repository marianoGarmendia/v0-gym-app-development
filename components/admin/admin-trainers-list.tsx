"use client";

import React from "react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Shield, Dumbbell } from "lucide-react";
import type { Profile } from "@/lib/types";
import Link from "next/link";

export function AdminTrainersList() {
  const [trainers, setTrainers] = useState<(Profile & { routineCount: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchTrainers() {
      const { data: trainersData } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "trainer")
        .order("created_at", { ascending: false });

      if (trainersData) {
        // Get routine counts for each trainer
        const trainersWithCounts = await Promise.all(
          trainersData.map(async (trainer) => {
            const { count } = await supabase
              .from("routines")
              .select("*", { count: "exact", head: true })
              .eq("trainer_id", trainer.id);
            return { ...trainer, routineCount: count || 0 };
          })
        );
        setTrainers(trainersWithCounts);
      }
      setLoading(false);
    }

    fetchTrainers();
  }, [supabase]);

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Header */}
      <header className="flex items-center gap-4 pt-2">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">Entrenadores</h1>
          <p className="text-sm text-muted-foreground">
            {trainers.length} entrenadores registrados
          </p>
        </div>
      </header>

      {/* Trainers List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : trainers.length === 0 ? (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Shield className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-2">No hay entrenadores</h3>
            <p className="text-sm text-muted-foreground">
              Crea un usuario con rol de entrenador
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {trainers.map((trainer) => (
            <Link key={trainer.id} href={`/dashboard/admin/users/${trainer.id}`}>
              <Card className="border-border/50 hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Shield className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{trainer.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {trainer.email}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm">
                        <Dumbbell className="w-4 h-4 text-muted-foreground" />
                        <span>{trainer.routineCount}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">rutinas</p>
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
