-- 유저별 FCM 푸시 토큰 저장 테이블
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_tokens_user_id_idx on public.push_tokens(user_id);

alter table public.push_tokens enable row level security;

-- 본인 토큰만 조회/등록/갱신 가능 (발송은 service_role로 서버에서 수행)
create policy "push_tokens_select_own" on public.push_tokens
  for select using (auth.uid() = user_id);

create policy "push_tokens_insert_own" on public.push_tokens
  for insert with check (auth.uid() = user_id);

create policy "push_tokens_update_own" on public.push_tokens
  for update using (auth.uid() = user_id);
