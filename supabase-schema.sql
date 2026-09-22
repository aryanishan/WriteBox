-- ──────────────────────────────────────────────────────────────
-- WriteBox — Supabase Database Schema
-- ──────────────────────────────────────────────────────────────
-- Run this script in the Supabase SQL Editor (Dashboard → SQL Editor)
-- to create the notes table and RLS policies.
-- ──────────────────────────────────────────────────────────────

-- Enable UUID extension (usually already enabled)
create extension if not exists "uuid-ossp";

-- ── Books Table ─────────────────────────────────────────────
create table if not exists public.books (
  id            text primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null,
  is_deleted    boolean not null default false,
  created_at    bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at    bigint not null default (extract(epoch from now()) * 1000)::bigint
);

-- ── Chapters Table ──────────────────────────────────────────
create table if not exists public.chapters (
  id            text primary key,
  book_id       text not null references public.books(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null,
  is_deleted    boolean not null default false,
  created_at    bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at    bigint not null default (extract(epoch from now()) * 1000)::bigint
);

-- ── Notes Table ─────────────────────────────────────────────
create table if not exists public.notes (
  id            text primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  chapter_id    text references public.chapters(id) on delete set null,
  title         text not null default 'Untitled',
  content       jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  plain_text_content text not null default '',
  is_favorite   boolean not null default false,
  is_deleted    boolean not null default false,
  created_at    bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at    bigint not null default (extract(epoch from now()) * 1000)::bigint
);

-- ── Indexes ─────────────────────────────────────────────────
create index if not exists idx_notes_user_id on public.notes(user_id);
create index if not exists idx_notes_user_updated on public.notes(user_id, updated_at desc);

-- ── Row-Level Security ──────────────────────────────────────
alter table public.notes enable row level security;

-- Users can only see their own notes
create policy "Users can view own notes"
  on public.notes for select
  using (auth.uid() = user_id);

-- Users can insert their own notes
create policy "Users can insert own notes"
  on public.notes for insert
  with check (auth.uid() = user_id);

-- Users can update their own notes
create policy "Users can update own notes"
  on public.notes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can delete their own notes
create policy "Users can delete own notes"
  on public.notes for delete
  using (auth.uid() = user_id);
-- ── Books RLS ────────────────────────────────────────────────
alter table public.books enable row level security;

create policy "Users can view own books" on public.books for select using (auth.uid() = user_id);
create policy "Users can insert own books" on public.books for insert with check (auth.uid() = user_id);
create policy "Users can update own books" on public.books for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own books" on public.books for delete using (auth.uid() = user_id);

-- ── Chapters RLS ─────────────────────────────────────────────
alter table public.chapters enable row level security;

create policy "Users can view own chapters" on public.chapters for select using (auth.uid() = user_id);
create policy "Users can insert own chapters" on public.chapters for insert with check (auth.uid() = user_id);
create policy "Users can update own chapters" on public.chapters for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own chapters" on public.chapters for delete using (auth.uid() = user_id);
