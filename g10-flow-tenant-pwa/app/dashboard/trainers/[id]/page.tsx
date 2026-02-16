"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Award, 
  Calendar, 
  ArrowLeft,
  Dumbbell,
  Star,
  Mail,
  MapPin,
  Certificate,
  Clock
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TrainerProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email: string;
  bio: string | null;
  specialties: string[] | null;
  experience_years: number | null;
  certifications: string[] | null;
  rating: number | null;
  total_students: number | null;
  availability: string | null;
  location: string | null;
  initials: string;
}

export default function TrainerProfilePage() {
  const params = useParams();
  const trainerId = params.id as string;
  
  const [trainer, setTrainer] = useState<TrainerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (trainerId) {
      fetchTrainerProfile();
    }
  }, [trainerId]);

  async function fetchTrainerProfile() {
    try {
      setLoading(true);

      const { data: profile, error } = await supabase
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
            total_students,
            availability,
            location
          )
        `)
        .eq("id", trainerId)
        .eq("role", "trainer")
        .single();

      if (error) {
        throw error;
      }

      if (!profile) {
        toast.error("Entrenador no encontrado");
        return;
      }

      const transformedProfile: TrainerProfile = {
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
        availability: profile.trainer_profiles?.[0]?.availability || null,
        location: profile.trainer_profiles?.[0]?.location || null,
        initials: profile.full_name
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2),
      };

      setTrainer(transformedProfile);
    } catch (error) {
      console.error("Error fetching trainer profile:", error);
      toast.error("Error al cargar el perfil del entrenador");
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
              "w-4 h-4",
              star <= rating
                ? "fill-amber-400 text-amber-400"
                : "fill-muted text-muted"
            )}
          />
        ))}
        <span className="text-sm text-muted-foreground ml-1">
          {rating.toFixed(1)}
        </span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 space-y-6 pb-24">
        {/* Back button */}
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/trainers">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Link>
        </Button>

        {/* Profile skeleton */}
        <div className="text-center space-y-4">
          <Skeleton className="w-24 h-24 rounded-full mx-auto" />
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>

        {/* Content skeleton */}
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (!trainer) {
    return (
      <div className="p-4 space-y-6 pb-24">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/trainers">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Link>
        </Button>

        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">Entrenador no encontrado</h3>
            <p className="text-sm text-muted-foreground mb-4">
              El entrenador que buscas no existe o no está disponible.
            </p>
            <Button asChild>
              <Link href="/dashboard/trainers">Ver todos los entrenadores</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard/trainers">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a entrenadores
        </Link>
      </Button>

      {/* Profile Header */}
      <div className="text-center space-y-4">
        <Avatar className="w-24 h-24 mx-auto border-4 border-primary/20">
          <AvatarImage src={trainer.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
            {trainer.initials}
          </AvatarFallback>
        </Avatar>

        <div>
          <h1 className="text-2xl font-bold">{trainer.full_name}</h1>
          {renderStars(trainer.rating)}
        </div>

        {/* Specialties */}
        {trainer.specialties && trainer.specialties.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {trainer.specialties.map((specialty, idx) => (
              <Badge key={idx} variant="secondary">
                {specialty}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <Award className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-xl font-bold">
              {trainer.experience_years || 0}
            </p>
            <p className="text-xs text-muted-foreground">Años exp.</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-xl font-bold">{trainer.total_students || 0}</p>
            <p className="text-xs text-muted-foreground">Alumnos</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <Dumbbell className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-xl font-bold">
              {trainer.certifications?.length || 0}
            </p>
            <p className="text-xs text-muted-foreground">Certificados</p>
          </CardContent>
        </Card>
      </div>

      {/* Bio */}
      {trainer.bio && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Sobre mí</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              {trainer.bio}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Certifications */}
      {trainer.certifications && trainer.certifications.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Certificate className="w-5 h-5" />
              Certificaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {trainer.certifications.map((cert, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {cert}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Additional Info */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Información de contacto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {trainer.location && (
            <div className="flex items-center gap-3 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{trainer.location}</span>
            </div>
          )}
          {trainer.availability && (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{trainer.availability}</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-muted-foreground">
            <Mail className="w-4 h-4" />
            <span>{trainer.email}</span>
          </div>
        </CardContent>
      </Card>

      {/* Note */}
      <div className="bg-muted/50 rounded-lg p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Para contratar a este entrenador, contacta a la administración de tu gimnasio.
        </p>
      </div>
    </div>
  );
}
