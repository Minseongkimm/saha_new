// 결제/차감 후 잔액 조회·갱신 유틸 함수 모음
// - fetchUserBalance(userId): 특정 유저의 현재 보유 saha 조회
// - refreshBalance(): 현재 로그인 유저의 잔액 재조회
import { supabase } from '../database/supabaseClient';

export async function fetchUserBalance(userId: string): Promise<number> {
  const { data: row } = await supabase
    .from('user_balances')
    .select('current_balance')
    .eq('user_id', userId)
    .single();
  return (row?.current_balance as number) ?? 0;
}

export async function refreshBalance(): Promise<number | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return fetchUserBalance(user.id);
}


