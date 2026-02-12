"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface WeekCommentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routineId: string;
  weekNumber: number;
  studentId: string;
}

export function WeekCommentModal({
  open,
  onOpenChange,
  routineId,
  weekNumber,
  studentId,
}: WeekCommentModalProps) {
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSave = async () => {
    if (!comment.trim()) return;
    setLoading(true);

    const { error } = await supabase.from("comments").insert({
      student_id: studentId,
      comment_type: "week",
      routine_id: routineId,
      week_number: weekNumber,
      content: comment.trim(),
    });

    if (error) {
      toast.error("Error al guardar comentario");
    } else {
      toast.success("Comentario de semana guardado");
      setComment("");
      onOpenChange(false);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Comentario de Semana {weekNumber}</DialogTitle>
          <DialogDescription>
            Comparte como te fue esta semana con tu entrenador
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            placeholder="Como te sentiste esta semana? Que ejercicios te costaron mas? Algun dolor o molestia?"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={5}
            className="bg-background/50"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading || !comment.trim()}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
