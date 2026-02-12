"use client";

import React from "react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, User, Dumbbell, CheckCircle } from "lucide-react";
import type { Profile } from "@/lib/types";
import Link from "next/link";

export function AdminStudentsList() {
  const [students, setStudents] = useState<(Profile & { planCount: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchStudents() {
      const { data: studentsData } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "student")
        .order("created_at", { ascending: false });

      if (studentsData) {
        // Get assignment counts for each student
        const studentsWithCounts = await Promise.all(
          studentsData.map(async (student) => {
            const { count } = await supabase
              .from("routine_assignments")
              .select("*", { count: "exact", head: true })
              .eq("student_id", student.id);
            return { ...student, planCount: count || 0 };
          })
        );
        setStudents(studentsWithCounts);
      }
      setLoading(false);
    }

    fetchStudents();
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
          <h1 className="text-xl font-bold">Alumnos</h1>
          <p className="text-sm text-muted-foreground">
            {students.length} alumnos registrados
          </p>
        </div>
      </header>

      {/* Students List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : students.length === 0 ? (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <User className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-2">No hay alumnos</h3>
            <p className="text-sm text-muted-foreground">
              Los alumnos se registran desde la pagina principal
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {students.map((student) => (
            <Link key={student.id} href={`/dashboard/admin/users/${student.id}`}>
              <Card className="border-border/50 hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{student.full_name}</p>
                          {student.onboarding_completed && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {student.email}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm">
                        <Dumbbell className="w-4 h-4 text-muted-foreground" />
                        <span>{student.planCount}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">planes</p>
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
