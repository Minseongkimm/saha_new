import { supabase } from '../database/supabaseClient';
import { PaymentTransaction } from './types';

/**
 * 충전 내역 조회
 * payments 테이블에서 사용자의 충전 기록을 최신순으로 100건 조회
 */
export async function fetchChargeTransactions(): Promise<PaymentTransaction[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('payments')
      .select('id, amount_minor, currency, provider, transaction_id, purchase_id, status, approved_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('fetchChargeTransactions error:', error);
      return [];
    }

    const formatted: PaymentTransaction[] = (data || []).map((item: any) => {
      const status = item.status === 'approved' ? 'success' : (item.status === 'pending' ? 'pending' : 'failed');
      const when = item.approved_at ?? item.created_at;
      return {
        id: item.id,
        amount: item.amount_minor, // minor unit (KRW 원 단위)
        type: 'charge',
        description: '사바 충전',
        created_at: when,
        status,
      } as PaymentTransaction;
    });

    return formatted;
  } catch (err) {
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('usages')
      .select('id, delta, reason, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

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
  } catch (err) {
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
