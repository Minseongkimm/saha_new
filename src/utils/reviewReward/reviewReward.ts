import { supabase } from '../database/supabaseClient';
import { fetchUserBalance } from '../payments/balance';
import { REVIEW_REWARD_SAHA } from '../../constants/review_reward';

/**
 * 해당 사용자가 이미 리뷰 리워드를 수령했는지 조회
 */
export async function hasUserReceivedReviewReward(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('review_rewards')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.error('hasUserReceivedReviewReward error:', error);
    throw error;
  }
  return data != null;
}

export interface GrantReviewRewardResult {
  newBalance: number;
}

/**
 * 리뷰 리워드(사바 N개) 지급. 이미 수령한 사용자는 에러 throw
 */
export async function grantReviewReward(
  userId: string,
  platform: 'android' | 'ios'
): Promise<GrantReviewRewardResult> {
  const alreadyReceived = await hasUserReceivedReviewReward(userId);
  if (alreadyReceived) {
    throw new Error('이미 리뷰 리워드를 받으셨습니다.');
  }
  const { data: balanceRow } = await supabase
    .from('user_balances')
    .select('total_purchased')
    .eq('user_id', userId)
    .single();
  const currentTotalPurchased = (balanceRow?.total_purchased as number) ?? 0;
  const newTotalPurchased = currentTotalPurchased + REVIEW_REWARD_SAHA;
  const { error: insertRewardError } = await supabase.from('review_rewards').insert({
    user_id: userId,
    platform,
  });
  if (insertRewardError) {
    console.error('review_rewards insert error:', insertRewardError);
    throw insertRewardError;
  }
  if (balanceRow) {
    const { error: updateBalanceError } = await supabase
      .from('user_balances')
      .update({ total_purchased: newTotalPurchased })
      .eq('user_id', userId);
    if (updateBalanceError) {
      console.error('user_balances update error:', updateBalanceError);
      throw updateBalanceError;
    }
  } else {
    const { error: insertBalanceError } = await supabase.from('user_balances').insert({
      user_id: userId,
      total_purchased: REVIEW_REWARD_SAHA,
      total_usage: 0,
    });
    if (insertBalanceError) {
      console.error('user_balances insert error:', insertBalanceError);
      throw insertBalanceError;
    }
  }
  const newBalance = await fetchUserBalance(userId);
  return { newBalance: newBalance ?? 0 };
}
