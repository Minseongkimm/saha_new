import { supabase } from '../database/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TodayFortuneCache } from '../today-fortune/todayFortuneCache';
import { SajuCache } from '../saju/sajuCache';

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

