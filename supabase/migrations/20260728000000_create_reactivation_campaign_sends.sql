-- 재활성화 캠페인 발송 대상 스냅샷 (발송 전/후 활동 비교용)
create table if not exists public.reactivation_campaign_sends (
  id uuid primary key default gen_random_uuid(),
  campaign_name text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  sent_at timestamptz not null default now()
);

create index if not exists reactivation_campaign_sends_campaign_idx
  on public.reactivation_campaign_sends(campaign_name);

alter table public.reactivation_campaign_sends enable row level security;

-- 서비스 롤(Edge Function/관리자)만 접근, 일반 유저 접근 불가
create policy "reactivation_campaign_sends_service_only" on public.reactivation_campaign_sends
  for all using (false);
