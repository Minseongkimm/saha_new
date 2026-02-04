import { supabase } from '../database/supabaseClient';
import { PaymentTransaction } from './types';
import { withSupabaseRetry } from '../network/retry';
import { REVIEW_REWARD_SAHA } from '../../constants/review_reward';

/**
 * 충전 내역 조회
 * purchases + review_rewards(리뷰 리워드)를 병합해 최신순 100건 반환
 */
export async function fetchChargeTransactions(): Promise<PaymentTransaction[]> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('fetchChargeTransactions auth error:', authError);
      return [];
    }
    if (!user) {
      return [];
    }

    // purchases 테이블에서 직접 조회 (재시도 로직 포함)
    const { data: purchasesData, error } = await withSupabaseRetry<any[]>(async () => {
      return await supabase
        .from('purchases')
        .select('id, saha_amount, bonus_saha, status, created_at, completed_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
    });
    if (error) {
      console.error('fetchChargeTransactions error:', error);
      return [];
    }

    const fromPurchases: PaymentTransaction[] = (purchasesData || []).map((item: any) => {
      const status = item.status === 'completed' ? 'success' : (item.status === 'pending' ? 'pending' : 'failed');
      const when = item.completed_at ?? item.created_at;
      const sahaAmount = item.saha_amount || 0;
      const bonusSaha = item.bonus_saha || 0;
      const totalSahaAmount = sahaAmount + bonusSaha;
      return {
        id: item.id,
        amount: totalSahaAmount,
        type: 'charge',
        description: '사바 충전',
        created_at: when,
        status,
      } as PaymentTransaction;
    });

    // review_rewards(리뷰 리워드) 조회 후 충전 내역 형태로 변환
    const { data: reviewRewardsData } = await supabase
      .from('review_rewards')
      .select('id, rewarded_at')
      .eq('user_id', user.id)
      .limit(100);
    const fromReviewRewards: PaymentTransaction[] = (reviewRewardsData || []).map((item: { id: string; rewarded_at: string }) => ({
      id: item.id,
      amount: REVIEW_REWARD_SAHA,
      type: 'charge' as const,
      description: '리뷰 리워드',
      created_at: item.rewarded_at,
      status: 'success' as const,
    }));

    // 병합 후 날짜 기준 내림차순 정렬, 상위 100건
    const merged = [...fromPurchases, ...fromReviewRewards].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return merged.slice(0, 100);
  } catch (err: any) {
    console.error('fetchChargeTransactions exception:', err);
    return [];
  }
}

/**
 * 사용 내역 조회
 * usages 테이블에서 사용자의 사바 사용 기록을 최신순으로 100건 조회
 */
export async function fetchUsageTransactions(): Promise<PaymentTransaction[]> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('fetchUsageTransactions auth error:', authError);
      return [];
    }
    if (!user) {
      return [];
    }

    // usages 테이블에서 직접 조회 (재시도 로직 포함)
    const { data, error } = await withSupabaseRetry<any[]>(async () => {
      return await supabase
        .from('usages')
        .select('id, delta, reason, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
    });
    if (error) {
      console.error('fetchUsageTransactions error:', error);
      return [];
    }

    const formatted: PaymentTransaction[] = (data || []).map((item: any) => ({
      id: item.id,
      amount: Math.abs(item.delta), // delta는 음수이므로 절댓값 사용
      type: 'use',
      description: item.reason === 'message' ? '사바 사용' : `사바 사용 - ${item.reason}`,
      created_at: item.created_at,
      status: 'success',
    }));

    return formatted;
  } catch (err: any) {
    console.error('fetchUsageTransactions exception:', err);
    return [];
  }
}

/**
 * @deprecated fetchChargeTransactions를 사용하세요
 * 호환성을 위해 유지되는 레거시 함수
 */
export async function fetchPaymentTransactions(): Promise<PaymentTransaction[]> {
  return fetchChargeTransactions();
}
