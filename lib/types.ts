export type UserRole = "admin" | "trainer" | "student";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Routine {
  id: string;
  trainer_id: string;
  name: string;
  description: string | null;
  duration_type: "week" | "month" | "trimester";
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
  trainer?: Profile;
}

export interface RoutineAssignment {
  id: string;
  routine_id: string;
  student_id: string;
  assigned_at: string;
  visible?: boolean;
  routine?: Routine;
}

export interface WorkoutDay {
  id: string;
  routine_id: string;
  day_number: number;
  week_number: number;
  name: string | null;
  created_at: string;
  exercises?: Exercise[];
}

export interface SetConfiguration {
  sets: number | null;
  reps: string | null;
  weight: string | null;
}

export interface Exercise {
  id: string;
  workout_day_id: string;
  name: string;
  set_configurations?: SetConfiguration[];
  video_url: string | null;
  notes: string | null;
  order_index: number;
  created_at: string;
  completion?: ExerciseCompletion;
}

export interface ExerciseCompletion {
  id: string;
  exercise_id: string;
  student_id: string;
  completed_at: string;
  actual_sets: number | null;
  actual_reps: string | null;
  actual_weight: string | null;
}

export interface Comment {
  id: string;
  student_id: string;
  comment_type: "exercise" | "day" | "week";
  exercise_id: string | null;
  workout_day_id: string | null;
  routine_id: string | null;
  week_number: number | null;
  content: string;
  created_at: string;
}

export interface TrainerStudent {
  id: string;
  trainer_id: string;
  student_id: string;
  created_at: string;
  trainer?: Profile;
  student?: Profile;
}
