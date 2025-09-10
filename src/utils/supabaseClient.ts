import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase 설정
const supabaseUrl = 'https://tdzkgyixpthhzzcfnotu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkemtneWl4cHRoaHp6Y2Zub3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyODI5NzQsImV4cCI6MjA3Mjg1ODk3NH0.qXnrCzQ9coN3s_IR_Fkezc6PNK_oLIAt4HB-1ZfFqvs';

// Supabase 클라이언트 생성 (React Native 최적화)
// 강제 로그아웃 함수
export const forceSignOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // AsyncStorage에서 auth 관련 데이터 삭제
    const keys = await AsyncStorage.getAllKeys();
    const authKeys = keys.filter(key => key.startsWith('sb-'));
    if (authKeys.length > 0) {
      await AsyncStorage.multiRemove(authKeys);
    }
    console.log('🔓 Forced sign out successful');
  } catch (error) {
    console.error('Force sign out error:', error);
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,          // RN에서 세션 저장
    autoRefreshToken: true,         // 토큰 자동 갱신
    persistSession: true,           // 세션 유지
    detectSessionInUrl: false,      // RN에서는 반드시 false
    flowType: 'pkce',               // 모바일 OAuth는 PKCE 권장
    debug: false,                 // 개발환경에서만 디버깅
  },
})
