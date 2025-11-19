import { supabase } from '../database/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TodayFortuneCache } from '../today-fortune/todayFortuneCache';
import { SajuCache } from '../saju/sajuCache';
import type { User } from '@supabase/supabase-js';

/**
 * 로그아웃
 * Supabase Auth 세션 종료
 */
export async function handleLogout(): Promise<void> {
  try {
    // 현재 사용자 ID 확보 (캐시 제거용)
    const { data: { user } } = await supabase.auth.getUser();

    if (user?.id) {
      const userId = user.id;
      // 사용자별 캐시 제거
      await Promise.all([
        // 사주 관련 캐시
        SajuCache.clearUserCache(userId),
        // 오늘의 운세 캐시 (전체 날짜)
        TodayFortuneCache.clearTodayFortuneCache(userId),
        // 화면/설정 등 사용자 키 기반 로컬 스토리지
        AsyncStorage.removeItem(`birth_info_${userId}`),
        AsyncStorage.removeItem(`notification_settings_${userId}`),
      ]);
    }

    // 세션 종료
    await supabase.auth.signOut();
    // navigation.replace 대신 세션 상태 변경을 기다림
    // App.tsx의 onAuthStateChange가 자동으로 Login 화면으로 전환
  } catch (error) {
    console.error('로그아웃 오류:', error);
    throw new Error('로그아웃에 실패했습니다.');
  }
}

const NETWORK_ERROR_KEYWORDS: readonly string[] = [
  'Network request failed',
  'Failed to fetch',
  'timeout',
];

export type SafeUserStatus = 'authenticated' | 'unauthenticated' | 'network_error';

export interface SafeUserResult {
  status: SafeUserStatus;
  user: User | null;
}

const isNetworkError = (error: unknown): boolean => {
  if (!error) {
    return false;
  }
  const message =
    (error as any)?.message ??
    (error as any)?.error_description ??
    (error as any)?.error ??
    '';
  if (typeof message !== 'string') {
    return false;
  }
  return NETWORK_ERROR_KEYWORDS.some((keyword) => message.includes(keyword));
};

/**
 * Supabase의 getUser를 안전하게 호출하는 헬퍼
 * - 네트워크 이슈일 때는 조용히 한 번 재시도 후, 실패 시 status: 'network_error' 반환
 * - 실제로 세션이 없거나 인증 문제가 있을 때만 status: 'unauthenticated' 반환
 * - Alert는 여기서 절대 띄우지 않고, 호출하는 쪽에서 UX를 결정하도록 위임
 */
export const getCurrentUserSafely = async (): Promise<SafeUserResult> => {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      if (isNetworkError(error)) {
        const { data: retryData, error: retryError } = await supabase.auth.getUser();
        if (!retryError && retryData?.user) {
          return { status: 'authenticated', user: retryData.user };
        }
        return { status: 'network_error', user: null };
      }
      return { status: 'unauthenticated', user: null };
    }

    if (!data?.user) {
      return { status: 'unauthenticated', user: null };
    }

    return { status: 'authenticated', user: data.user };
  } catch (error) {
    if (isNetworkError(error)) {
      return { status: 'network_error', user: null };
    }
    return { status: 'unauthenticated', user: null };
  }
};

