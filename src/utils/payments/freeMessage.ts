// 무료 대화 관련 유틸 함수
// - checkFreeMessageAvailable: 오늘 무료 대화 사용 가능 여부 확인
// - getFreeMessagePolicy: 무료 대화 정책 조회
import { supabase } from '../database/supabaseClient';

export interface FreeMessagePolicy {
  daily_free_count: number;
  enabled: boolean;
}

/**
 * 무료 대화 정책 조회
 */
export async function getFreeMessagePolicy(): Promise<FreeMessagePolicy | null> {
  try {
    const { data, error } = await supabase
      .from('free_message_policy')
      .select('daily_free_count, enabled')
      .limit(1)
      .single();
    
    if (error) {
      console.error('무료 대화 정책 조회 오류:', error);
      // 기본값 반환
      return { daily_free_count: 1, enabled: true };
    }
    
    return data as FreeMessagePolicy;
  } catch (error) {
    console.error('무료 대화 정책 조회 예외:', error);
    return { daily_free_count: 1, enabled: true };
  }
}

/**
 * 오늘 무료 대화 사용 가능 여부 확인
 */
export async function checkFreeMessageAvailable(userId: string): Promise<{
  available: boolean;
  usedCount: number;
  dailyLimit: number;
}> {
  try {
    // 정책 조회
    const policy = await getFreeMessagePolicy();
    if (!policy || !policy.enabled) {
      return { available: false, usedCount: 0, dailyLimit: 0 };
    }
    
    // 오늘 사용한 무료 대화 수 조회 (UTC 기준으로 Edge function과 동일하게)
    // Edge function과 동일한 방식으로 날짜 계산
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('free_messages')
      .select('id')
      .eq('user_id', userId)
      .eq('used_date', today);
    
    if (error) {
      console.error('무료 대화 사용 내역 조회 오류:', error);
      return { available: false, usedCount: 0, dailyLimit: policy.daily_free_count };
    }
    
    const usedCount = data?.length || 0;
    const available = usedCount < policy.daily_free_count;
    
    return {
      available,
      usedCount,
      dailyLimit: policy.daily_free_count,
    };
  } catch (error) {
    console.error('무료 대화 사용 가능 여부 확인 예외:', error);
    return { available: false, usedCount: 0, dailyLimit: 0 };
  }
}

