import { supabase } from '../database/supabaseClient';
import { PaymentTransaction } from './types';

export async function fetchPaymentTransactions(): Promise<PaymentTransaction[]> {
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
      console.error('fetchPaymentTransactions error:', error);
      return [];
    }

    const formatted: PaymentTransaction[] = (data || []).map((item: any) => {
      // payments 테이블은 충전 기록이므로 type은 'charge'로 고정
      const normalizedType = 'charge';
      const status = item.status === 'approved' ? 'success' : (item.status === 'pending' ? 'pending' : 'failed');
      const when = item.approved_at ?? item.created_at;
      return {
        id: item.id,
        amount: item.amount_minor, // minor unit (KRW 원 단위)
        type: normalizedType,
        description: '사바 충전',
        created_at: when,
        status,
      } as PaymentTransaction;
    });

    return formatted;
  } catch (err) {
    console.error('fetchPaymentTransactions exception:', err);
    return [];
  }
}
