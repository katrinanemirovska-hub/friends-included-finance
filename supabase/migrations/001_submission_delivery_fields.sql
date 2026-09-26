-- Run once in Supabase SQL Editor. These fields preserve the original bot chat
-- and make delivery/synchronisation failures visible and retryable.
alter table public.sales add column if not exists telegram_chat_id bigint;
alter table public.sales add column if not exists sync_status text not null default 'synced';
alter table public.sales add column if not exists notification_status text not null default 'not_required';
alter table public.expenses add column if not exists telegram_chat_id bigint;
alter table public.expenses add column if not exists sync_status text not null default 'synced';
alter table public.expenses add column if not exists notification_status text not null default 'not_required';
