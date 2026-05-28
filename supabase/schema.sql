-- HOW TO APPLY:
-- 1. Open Supabase dashboard → your project → SQL Editor
-- 2. Paste this entire file and click Run
-- 3. Verify all 3 tables appear in Table Editor

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Reminders table
create table if not exists reminders (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  category        text not null default 'other'
                  check (category in ('professional','personal','finance','health','other')),
  due_at          timestamptz not null,
  recurrence      text not null default 'none'
                  check (recurrence in ('none','daily','weekly','monthly','custom')),
  recurrence_rule text,
  status          text not null default 'pending'
                  check (status in ('pending','done','snoozed')),
  whatsapp_number text not null,
  created_at      timestamptz not null default now()
);

-- Conversations table (WhatsApp bot state machine)
create table if not exists conversations (
  id              uuid primary key default gen_random_uuid(),
  whatsapp_number text not null unique,
  state           text not null default 'idle',
  context         jsonb not null default '{}',
  updated_at      timestamptz not null default now()
);

-- Reminder logs (history)
create table if not exists reminder_logs (
  id          uuid primary key default gen_random_uuid(),
  reminder_id uuid references reminders(id) on delete cascade,
  action      text not null check (action in ('sent','done','snoozed','missed')),
  actioned_at timestamptz not null default now()
);

-- Index for cron query (find due reminders fast)
create index if not exists idx_reminders_due on reminders(due_at, status);
