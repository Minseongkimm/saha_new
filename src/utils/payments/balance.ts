// 결제/차감 후 잔액 조회·갱신 유틸 함수 모음
// - fetchUserBalance(userId): 특정 유저의 현재 보유 saha 조회
// - refreshBalance(): 현재 로그인 유저의 잔액 재조회
// user_balances 테이블 구조:
// - total_purchased: 총 구매 금액
// - total_usage: 총 사용 금액
// - current_balance: 잔액 (total_purchased - total_usage로 Generated Column으로 자동 계산됨)
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


