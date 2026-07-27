-- 유저별 알림 수신 설정 (카테고리별)
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  all_notifications boolean not null default true,
  chat_notifications boolean not null default true,
  daily_fortune_notifications boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

create policy "notification_preferences_select_own" on public.notification_preferences
  for select using (auth.uid() = user_id);

create policy "notification_preferences_insert_own" on public.notification_preferences
  for insert with check (auth.uid() = user_id);

create policy "notification_preferences_update_own" on public.notification_preferences
  for update using (auth.uid() = user_id);
