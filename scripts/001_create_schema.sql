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

alter table public.profiles enable row level security;

-- Profiles policies
create policy "Users can view their own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Admins can view all profiles" on public.profiles for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Trainers can view student profiles" on public.profiles for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'trainer')
);

-- Trainer-Student relationships (many-to-many)
create table if not exists public.trainer_students (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(trainer_id, student_id)
);

alter table public.trainer_students enable row level security;

create policy "Trainers can view their students" on public.trainer_students for select using (
  auth.uid() = trainer_id or auth.uid() = student_id
);
create policy "Trainers can add students" on public.trainer_students for insert with check (
  auth.uid() = trainer_id
);
create policy "Trainers can remove students" on public.trainer_students for delete using (
  auth.uid() = trainer_id
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

alter table public.routines enable row level security;

create policy "Trainers can manage their routines" on public.routines for all using (auth.uid() = trainer_id);
create policy "Students can view assigned routines" on public.routines for select using (
  exists (
    select 1 from public.routine_assignments 
    where routine_id = routines.id and student_id = auth.uid()
  )
);

-- Routine assignments (which students have which routines)
create table if not exists public.routine_assignments (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  assigned_at timestamptz default now(),
  unique(routine_id, student_id)
);

alter table public.routine_assignments enable row level security;

create policy "Trainers can assign routines" on public.routine_assignments for all using (
  exists (select 1 from public.routines where id = routine_id and trainer_id = auth.uid())
);
create policy "Students can view their assignments" on public.routine_assignments for select using (
  auth.uid() = student_id
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

alter table public.workout_days enable row level security;

create policy "Trainers can manage workout days" on public.workout_days for all using (
  exists (select 1 from public.routines where id = routine_id and trainer_id = auth.uid())
);
create policy "Students can view assigned workout days" on public.workout_days for select using (
  exists (
    select 1 from public.routine_assignments ra
    join public.routines r on r.id = ra.routine_id
    where r.id = workout_days.routine_id and ra.student_id = auth.uid()
  )
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

alter table public.exercises enable row level security;

create policy "Trainers can manage exercises" on public.exercises for all using (
  exists (
    select 1 from public.workout_days wd
    join public.routines r on r.id = wd.routine_id
    where wd.id = workout_day_id and r.trainer_id = auth.uid()
  )
);
create policy "Students can view assigned exercises" on public.exercises for select using (
  exists (
    select 1 from public.workout_days wd
    join public.routine_assignments ra on ra.routine_id = wd.routine_id
    where wd.id = workout_day_id and ra.student_id = auth.uid()
  )
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

alter table public.exercise_completions enable row level security;

create policy "Students can manage their completions" on public.exercise_completions for all using (auth.uid() = student_id);
create policy "Trainers can view student completions" on public.exercise_completions for select using (
  exists (
    select 1 from public.trainer_students 
    where trainer_id = auth.uid() and student_id = exercise_completions.student_id
  )
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

alter table public.day_comments enable row level security;

create policy "Students can manage their day comments" on public.day_comments for all using (auth.uid() = student_id);
create policy "Trainers can view student day comments" on public.day_comments for select using (
  exists (
    select 1 from public.trainer_students 
    where trainer_id = auth.uid() and student_id = day_comments.student_id
  )
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

alter table public.week_comments enable row level security;

create policy "Students can manage their week comments" on public.week_comments for all using (auth.uid() = student_id);
create policy "Trainers can view student week comments" on public.week_comments for select using (
  exists (
    select 1 from public.trainer_students 
    where trainer_id = auth.uid() and student_id = week_comments.student_id
  )
);

-- Trigger to auto-create profile on signup
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
