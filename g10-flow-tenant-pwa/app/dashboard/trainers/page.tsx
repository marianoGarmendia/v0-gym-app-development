"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  Search, 
  Award, 
  Calendar, 
  ChevronRight,
  Dumbbell,
  Star
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Trainer {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email: string;
  // Trainer profile fields
  bio: string | null;
  specialties: string[] | null;
  experience_years: number | null;
  certifications: string[] | null;
  rating: number | null;
  total_students: number | null;
  // For display
  initials: string;
}

export default function TrainersPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [filteredTrainers, setFilteredTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const supabase = createClient();

  useEffect(() => {
    fetchTrainers();
  }, []);

  useEffect(() => {
    // Filter trainers based on search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = trainers.filter(
        (trainer) =>
          trainer.full_name.toLowerCase().includes(query) ||
          trainer.specialties?.some((s) => s.toLowerCase().includes(query)) ||
          trainer.bio?.toLowerCase().includes(query)
      );
      setFilteredTrainers(filtered);
    } else {
      setFilteredTrainers(trainers);
    }
  }, [searchQuery, trainers]);

  async function fetchTrainers() {
    try {
      setLoading(true);

      // Get trainers from the current tenant
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          avatar_url,
          email,
          trainer_profiles (
            bio,
            specialties,
            experience_years,
            certifications,
            rating,
            total_students
          )
        `)
        .eq("role", "trainer")
        .eq("is_active", true)
        .order("full_name");

      if (error) {
        throw error;
      }

      // Transform data
      const transformedTrainers: Trainer[] = (profiles || []).map((profile: any) => ({
        id: profile.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        email: profile.email,
        bio: profile.trainer_profiles?.[0]?.bio || null,
        specialties: profile.trainer_profiles?.[0]?.specialties || [],
        experience_years: profile.trainer_profiles?.[0]?.experience_years || null,
        certifications: profile.trainer_profiles?.[0]?.certifications || [],
        rating: profile.trainer_profiles?.[0]?.rating || null,
        total_students: profile.trainer_profiles?.[0]?.total_students || 0,
        initials: profile.full_name
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2),
      }));

      setTrainers(transformedTrainers);
      setFilteredTrainers(transformedTrainers);
    } catch (error) {
      console.error("Error fetching trainers:", error);
      toast.error("Error al cargar los entrenadores");
    } finally {
      setLoading(false);
    }
  }

  function renderStars(rating: number | null) {
    if (!rating) return null;
    
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "w-3 h-3",
              star <= rating
                ? "fill-amber-400 text-amber-400"
                : "fill-muted text-muted"
            )}
          />
        ))}
        <span className="text-xs text-muted-foreground ml-1">
          {rating.toFixed(1)}
        </span>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Header */}
      <header className="pt-2">
        <h1 className="text-2xl font-bold">Entrenadores</h1>
        <p className="text-muted-foreground text-sm">
          Conoce a los entrenadores disponibles en tu gimnasio
        </p>
      </header>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o especialidad..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      {!loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>
            {filteredTrainers.length} entrenador
            {filteredTrainers.length !== 1 ? "es" : ""} disponible
            {filteredTrainers.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Trainers List */}
      <div className="space-y-3">
        {loading ? (
          // Loading skeletons
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Skeleton className="w-16 h-16 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredTrainers.length === 0 ? (
          // Empty state
          <Card className="border-dashed border-2 border-border/50">
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">
                {searchQuery ? "No se encontraron entrenadores" : "No hay entrenadores disponibles"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? "Intenta con otros términos de búsqueda"
                  : "Los entrenadores aparecerán aquí cuando estén registrados"}
              </p>
            </CardContent>
          </Card>
        ) : (
          // Trainers list
          filteredTrainers.map((trainer) => (
            <Link key={trainer.id} href={`/dashboard/trainers/${trainer.id}`}>
              <Card className="border-border/50 hover:border-primary/50 transition-colors cursor-pointer group">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <Avatar className="w-16 h-16 border-2 border-border">
                      <AvatarImage src={trainer.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                        {trainer.initials}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold group-hover:text-primary transition-colors">
                            {trainer.full_name}
                          </h3>
                          {renderStars(trainer.rating)}
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      </div>

                      {/* Specialties */}
                      {trainer.specialties && trainer.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {trainer.specialties.slice(0, 3).map((specialty, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="text-xs"
                            >
                              {specialty}
                            </Badge>
                          ))}
                          {trainer.specialties.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{trainer.specialties.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Stats */}
                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        {trainer.experience_years && (
                          <div className="flex items-center gap-1">
                            <Award className="w-4 h-4" />
                            <span>{trainer.experience_years} años exp.</span>
                          </div>
                        )}
                        {trainer.total_students !== null && (
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{trainer.total_students} alumnos</span>
                          </div>
                        )}
                      </div>

                      {/* Bio preview */}
                      {trainer.bio && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {trainer.bio}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
