-- Add set_configurations column to exercises
-- Allows multiple configurations per exercise (e.g. 2x6@50kg, 2x3@70kg)
-- Format: [{"sets": 2, "reps": "6", "weight": "50"}, {"sets": 2, "reps": "3", "weight": "70"}]

alter table public.exercises
  add column if not exists set_configurations jsonb default '[]'::jsonb;

-- Make original columns nullable for new format (optional, run if inserts fail)
-- alter table public.exercises alter column sets drop not null;
-- alter table public.exercises alter column reps drop not null;
