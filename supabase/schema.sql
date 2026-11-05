-- PharmaAI-VideoStudio schema. Run in Supabase SQL editor.
create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  settings jsonb not null default '{}',
  script jsonb,
  status text not null default 'draft',   -- draft | script_ready | rendering | done
  video_path text,
  thumb_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.render_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'queued',  -- queued | rendering | done | failed
  stage text not null default 'Queued',
  progress int not null default 0,
  resolution int not null default 720,
  warnings jsonb not null default '[]',
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_idx on public.projects(user_id, created_at desc);
create index if not exists jobs_project_idx on public.render_jobs(project_id, created_at desc);

alter table public.projects enable row level security;
alter table public.render_jobs enable row level security;

create policy "own projects" on public.projects for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Users may read their jobs; only the server/worker (service role) writes them.
create policy "read own jobs" on public.render_jobs for select using (auth.uid() = user_id);

-- Private storage bucket. Files live at <user_id>/<project_id>/...
insert into storage.buckets (id, name, public) values ('videos', 'videos', false)
on conflict (id) do nothing;

create policy "read own files" on storage.objects for select
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "delete own files" on storage.objects for delete
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
