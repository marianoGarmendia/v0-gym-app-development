export type UserRole = "admin" | "trainer" | "student" | "superadmin";

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  theme: Record<string, string> | null;
  logo_url: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  plan: string;
  payment_status: string;
  max_students: number;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
  // Student context fields
  objective: string | null;
  birth_date: string | null;
  gender: "male" | "female" | "other" | null;
  height_cm: number | null;
  weight_kg: number | null;
  experience_level: "beginner" | "intermediate" | "advanced" | null;
  injuries: string | null;
  medical_notes: string | null;
  desired_frequency: number | null;
  notes: string | null;
}

export interface TrainerProfile {
  id: string;
  tenant_id: string;
  user_id: string;
  bio: string | null;
  specialties: string[] | null;
  experience_years: number | null;
  certifications: string[] | null;
  rating: number | null;
  total_students: number;
  availability: string | null;
  social_links: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}

export interface Routine {
  id: string;
  tenant_id: string;
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
  tenant_id: string;
  routine_id: string;
  student_id: string;
  assigned_at: string;
  visible?: boolean;
  routine?: Routine;
}

export interface WorkoutDay {
  id: string;
  tenant_id: string;
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
  tenant_id: string;
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
  tenant_id: string;
  exercise_id: string;
  student_id: string;
  completed_at: string;
  actual_sets: number | null;
  actual_reps: string | null;
  actual_weight: string | null;
}

export interface Comment {
  id: string;
  tenant_id: string;
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
  tenant_id: string;
  trainer_id: string;
  student_id: string;
  created_at: string;
  trainer?: Profile;
  student?: Profile;
}

export interface TrainerNote {
  id: string;
  tenant_id: string;
  trainer_id: string;
  student_id: string;
  routine_id: string | null;
  content: string;
  created_at: string;
  trainer?: Profile;
  routine?: Routine;
}

export interface TenantMembership {
  id: string;
  user_id: string;
  tenant_id: string;
  role: UserRole;
  created_at: string;
}

export interface PushSubscriptionRecord {
  id: string;
  tenant_id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

export interface BodyMetric {
  id: string;
  tenant_id: string;
  student_id: string;
  recorded_at: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  notes: string | null;
}
