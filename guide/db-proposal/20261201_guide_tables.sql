-- ============================================================================
-- USULAN (BELUM DITERAPKAN) — tabel SevnQuest Guide. Hanya penambahan; tidak menyentuh tabel yang ada.
-- Letakkan di supabase/migrations/ hanya setelah di-review dan disetujui pemilik proyek.
-- Semua tabel pengguna: RLS aktif, pengguna hanya mengakses barisnya sendiri. Idempoten (aman dijalankan ulang).
-- Catatan: learning_plan_flashcards.flashcard_id sengaja TANPA foreign key sampai struktur flashcard
-- SevnQuest (Buku Saku/deck + user_mastery) diaudit; jangan menebak nama tabel.
-- ============================================================================

create table if not exists public.guide_lessons (
  id           text primary key,
  title        text not null,
  level        text not null,
  category     text not null,
  content_json jsonb not null,
  is_published boolean not null default false,
  updated_at   timestamptz not null default now()
);
alter table public.guide_lessons enable row level security;
drop policy if exists guide_lessons_read_published on public.guide_lessons;
create policy guide_lessons_read_published on public.guide_lessons
  for select to anon, authenticated using (is_published);
revoke insert, update, delete, truncate on public.guide_lessons from anon, authenticated;

create table if not exists public.learning_plans (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  fingerprint    text not null,            -- planFingerprint(input): kunci idempotensi import
  target         text not null,
  starting_level text not null,
  duration_days  integer not null check (duration_days between 7 and 730),
  daily_minutes  integer not null check (daily_minutes between 10 and 480),
  days_per_week  integer not null check (days_per_week between 1 and 7),
  focus          text not null default 'balanced',
  start_date     date not null,
  end_date       date not null,
  status         text not null default 'active' check (status in ('active', 'paused', 'completed', 'archived')),
  created_at     timestamptz not null default now(),
  unique (user_id, fingerprint)            -- import dua kali tidak membuat rencana ganda
);

create table if not exists public.learning_plan_days (
  id                uuid primary key default gen_random_uuid(),
  plan_id           uuid not null references public.learning_plans (id) on delete cascade,
  user_id           uuid not null references auth.users (id) on delete cascade,
  day_number        integer not null,
  scheduled_date    date not null,
  kind              text not null check (kind in ('learn', 'evaluation', 'consolidation')),
  tasks             jsonb not null default '[]',  -- ItemRange[] + reviewOf
  estimated_minutes numeric not null,
  status            text not null default 'pending' check (status in ('pending', 'done', 'skipped')),
  unique (plan_id, day_number)
);

create table if not exists public.guide_lesson_progress (
  user_id      uuid not null references auth.users (id) on delete cascade,
  lesson_id    text not null,
  completed    boolean not null default false,
  last_scene   integer not null default 0,
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists public.learning_plan_flashcards (
  plan_id      uuid not null references public.learning_plans (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  flashcard_id text not null,              -- menautkan ke flashcard yang sudah ada; TIDAK menduplikasi
  source_type  text not null,
  primary key (plan_id, flashcard_id)
);

do $$
declare t text;
begin
  foreach t in array array['learning_plans', 'learning_plan_days', 'guide_lesson_progress', 'learning_plan_flashcards'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_own', t);
    execute format('create policy %I on public.%I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', t || '_own', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;
