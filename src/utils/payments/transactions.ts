import { supabase } from '../database/supabaseClient';
import { PaymentTransaction } from './types';
import { withSupabaseRetry } from '../network/retry';

/**
 * 충전 내역 조회
 * purchases 테이블에서 사용자의 충전 기록을 최신순으로 100건 조회
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
    const { data, error } = await withSupabaseRetry<any[]>(async () => {
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

    const formatted: PaymentTransaction[] = (data || []).map((item: any) => {
      const status = item.status === 'completed' ? 'success' : (item.status === 'pending' ? 'pending' : 'failed');
      const when = item.completed_at ?? item.created_at;
      
      // 사바 코인 수량 계산 (기본 + 보너스)
      const sahaAmount = item.saha_amount || 0;
      const bonusSaha = item.bonus_saha || 0;
      const totalSahaAmount = sahaAmount + bonusSaha;
      
      return {
        id: item.id,
        amount: totalSahaAmount, // 사바 코인 수량 (기본 + 보너스)
        type: 'charge',
        description: '사바 충전',
        created_at: when,
        status,
      } as PaymentTransaction;
    });

    return formatted;
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
