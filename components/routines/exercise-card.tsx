"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Check, Play, MessageSquare, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import type { Exercise, ExerciseCompletion } from "@/lib/types";
import { toast } from "sonner";

interface ExerciseCardProps {
  exercise: Exercise;
  completion?: ExerciseCompletion;
  isStudent: boolean;
  studentId: string;
  onCompletionChange: (exerciseId: string, completion: ExerciseCompletion | null) => void;
}

export function ExerciseCard({
  exercise,
  completion,
  isStudent,
  studentId,
  onCompletionChange,
}: ExerciseCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);
  const supabase = createClient();

  const isCompleted = !!completion;

  const handleToggleComplete = async () => {
    if (!isStudent) return;
    setLoading(true);

    if (isCompleted) {
      // Remove completion
      const { error } = await supabase
        .from("exercise_completions")
        .delete()
        .eq("id", completion.id);

      if (error) {
        toast.error("Error al desmarcar ejercicio");
      } else {
        onCompletionChange(exercise.id, null);
        toast.success("Ejercicio desmarcado");
      }
    } else {
      // Add completion
      const { data, error } = await supabase
        .from("exercise_completions")
        .insert({
          exercise_id: exercise.id,
          student_id: studentId,
        })
        .select()
        .single();

      if (error) {
        toast.error("Error al completar ejercicio");
      } else {
        onCompletionChange(exercise.id, data);
        toast.success("Ejercicio completado!");
      }
    }

    setLoading(false);
  };

  const handleSaveComment = async () => {
    if (!comment.trim()) return;
    setLoading(true);

    const { error } = await supabase.from("comments").insert({
      student_id: studentId,
      comment_type: "exercise",
      exercise_id: exercise.id,
      content: comment.trim(),
    });

    if (error) {
      toast.error("Error al guardar comentario");
    } else {
      toast.success("Comentario guardado");
      setComment("");
      setShowComment(false);
    }
    setLoading(false);
  };

  return (
    <Card
      className={cn(
        "border-border/50 transition-all overflow-hidden",
        isCompleted && "border-primary/50 bg-primary/5"
      )}
    >
      <CardContent className="p-0">
        {/* Main content */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Complete button */}
            {isStudent && (
              <button
                onClick={handleToggleComplete}
                disabled={loading}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all",
                  isCompleted
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                )}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="w-3 h-3 rounded-full border-2 border-muted-foreground" />
                )}
              </button>
            )}

            {/* Exercise info */}
            <div className="flex-1 min-w-0">
              <h3 className={cn("font-semibold", isCompleted && "line-through text-muted-foreground")}>
                {exercise.name}
              </h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {exercise.set_configurations?.length ? (
                  exercise.set_configurations
                    .filter(
                      (c) =>
                        c.sets != null ||
                        c.reps ||
                        c.weight
                    )
                    .map((c, i) => (
                      <span
                        key={i}
                        className="text-xs bg-muted px-2 py-1 rounded-lg"
                      >
                        {[
                          c.sets != null && `${c.sets} series`,
                          c.reps && `de ${c.reps} reps`,
                          c.weight && `con ${c.weight}`,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      </span>
                    ))
                ) : null}
              </div>
            </div>

            {/* Expand button */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              {expanded ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
            {/* Notes */}
            {exercise.notes && (
              <div className="bg-muted/50 rounded-xl p-3">
                <p className="text-sm text-muted-foreground">{exercise.notes}</p>
              </div>
            )}

            {/* Video link */}
            {exercise.video_url && (
              <a
                href={exercise.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary text-sm hover:underline"
              >
                <Play className="w-4 h-4" />
                Ver video demostrativo
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            {/* Comment section for students */}
            {isStudent && (
              <div className="pt-2">
                {showComment ? (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Escribe tu comentario sobre este ejercicio..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      className="bg-background/50"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowComment(false)}
                        disabled={loading}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveComment}
                        disabled={loading || !comment.trim()}
                      >
                        Guardar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowComment(true)}
                    className="text-muted-foreground"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Agregar comentario
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
