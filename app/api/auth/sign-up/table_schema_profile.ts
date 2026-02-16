// create table public.profiles (
//     id uuid not null,
//     email text not null,
//     full_name text not null,
//     avatar_url text null,
//     role text not null default 'student'::text,
//     created_at timestamp with time zone null default now(),
//     updated_at timestamp with time zone null default now(),
//     onboarding_completed boolean null default false,
//     objective text null,
//     birth_date date null,
//     gender text null,
//     height_cm numeric null,
//     weight_kg numeric null,
//     experience_level text null,
//     injuries text null,
//     medical_notes text null,
//     desired_frequency integer null,
//     notes text null,
//     constraint profiles_pkey primary key (id),
//     constraint profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE,
//     constraint profiles_experience_level_check check (
//       (
//         experience_level = any (
//           array[
//             'beginner'::text,
//             'intermediate'::text,
//             'advanced'::text
//           ]
//         )
//       )
//     ),
//     constraint profiles_gender_check check (
//       (
//         gender = any (
//           array['male'::text, 'female'::text, 'other'::text]
//         )
//       )
//     ),
//     constraint profiles_role_check check (
//       (
//         role = any (
//           array['admin'::text, 'trainer'::text, 'student'::text]
//         )
//       )
//     )
//   ) TABLESPACE pg_default;