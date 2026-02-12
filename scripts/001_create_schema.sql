-- GymApp Database Schema
-- Roles: admin, trainer, student

-- Profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  avatar_url text,
  role text not null default 'student' check (role in ('admin', 'trainer', 'student')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Trainer-Student relationships (many-to-many)
create table if not exists public.trainer_students (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(trainer_id, student_id)
);

-- Routines table (workout programs)
create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  duration_type text not null check (duration_type in ('week', 'month', 'trimester')),
  duration_weeks int not null default 1,
  start_date date not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Routine assignments (which students have which routines)
create table if not exists public.routine_assignments (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  assigned_at timestamptz default now(),
  unique(routine_id, student_id)
);

-- Workout days (each day in a routine)
create table if not exists public.workout_days (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  week_number int not null default 1,
  day_of_week int not null check (day_of_week between 1 and 7),
  name text,
  notes text,
  created_at timestamptz default now()
);

-- Exercises table
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  workout_day_id uuid not null references public.workout_days(id) on delete cascade,
  name text not null,
  sets int not null default 3,
  reps text not null default '10',
  weight text,
  rest_seconds int,
  video_url text,
  notes text,
  order_index int not null default 0,
  created_at timestamptz default now()
);

-- Exercise completions (student progress tracking)
create table if not exists public.exercise_completions (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  completed_at timestamptz default now(),
  actual_sets int,
  actual_reps text,
  actual_weight text,
  comment text,
  date date not null default current_date,
  unique(exercise_id, student_id, date)
);

-- Day comments (student feedback on entire day)
create table if not exists public.day_comments (
  id uuid primary key default gen_random_uuid(),
  workout_day_id uuid not null references public.workout_days(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  comment text not null,
  date date not null default current_date,
  created_at timestamptz default now(),
  unique(workout_day_id, student_id, date)
);

-- Week comments (student feedback on entire week)
create table if not exists public.week_comments (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  week_number int not null,
  comment text not null,
  created_at timestamptz default now(),
  unique(routine_id, student_id, week_number)
);

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.trainer_students enable row level security;
alter table public.routines enable row level security;
alter table public.routine_assignments enable row level security;
alter table public.workout_days enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_completions enable row level security;
alter table public.day_comments enable row level security;
alter table public.week_comments enable row level security;

-- Simple permissive policies for authenticated users
create policy "profiles_all" on public.profiles for all to authenticated using (true) with check (true);
create policy "trainer_students_all" on public.trainer_students for all to authenticated using (true) with check (true);
create policy "routines_all" on public.routines for all to authenticated using (true) with check (true);
create policy "routine_assignments_all" on public.routine_assignments for all to authenticated using (true) with check (true);
create policy "workout_days_all" on public.workout_days for all to authenticated using (true) with check (true);
create policy "exercises_all" on public.exercises for all to authenticated using (true) with check (true);
create policy "exercise_completions_all" on public.exercise_completions for all to authenticated using (true) with check (true);
create policy "day_comments_all" on public.day_comments for all to authenticated using (true) with check (true);
create policy "week_comments_all" on public.week_comments for all to authenticated using (true) with check (true);

-- Trigger for auto-creating profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Usuario'),
    coalesce(new.raw_user_meta_data ->> 'role', 'student')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
