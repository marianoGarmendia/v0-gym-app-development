-- Migration: Student context data for AI agent
-- Adds student profile fields, trainer notes, and body metrics tracking

-- 1. Extend profiles with student context fields
alter table public.profiles
  add column if not exists objective text,
  add column if not exists birth_date date,
  add column if not exists gender text check (gender in ('male', 'female', 'other')),
  add column if not exists height_cm numeric,
  add column if not exists weight_kg numeric,
  add column if not exists experience_level text check (experience_level in ('beginner', 'intermediate', 'advanced')),
  add column if not exists injuries text,
  add column if not exists medical_notes text,
  add column if not exists desired_frequency int,
  add column if not exists notes text;

-- 2. Trainer notes/observations about students (timestamped)
create table if not exists public.trainer_notes (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  routine_id uuid references public.routines(id) on delete set null,
  content text not null,
  created_at timestamptz default now()
);

alter table public.trainer_notes enable row level security;
create policy "trainer_notes_all" on public.trainer_notes for all to authenticated using (true) with check (true);

-- 3. Body metrics tracking (historical, timestamped)
create table if not exists public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  recorded_at timestamptz default now(),
  weight_kg numeric,
  body_fat_pct numeric,
  chest_cm numeric,
  waist_cm numeric,
  hips_cm numeric,
  arm_cm numeric,
  thigh_cm numeric,
  notes text
);

alter table public.body_metrics enable row level security;
create policy "body_metrics_all" on public.body_metrics for all to authenticated using (true) with check (true);

-- Index for fast AI context queries by student
create index if not exists idx_trainer_notes_student on public.trainer_notes(student_id, created_at desc);
create index if not exists idx_body_metrics_student on public.body_metrics(student_id, recorded_at desc);
create index if not exists idx_exercise_completions_student on public.exercise_completions(student_id, completed_at desc);
