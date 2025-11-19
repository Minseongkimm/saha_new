import { Alert } from 'react-native';
import { supabase } from '../database/supabaseClient';
import { getCurrentUserSafely } from './authUtils';

/**
 * BirthInfo 존재 여부 확인. 없으면 BirthInfo 화면으로 이동.
 * 존재하면 true를 반환하여 호출자가 계속 진행할 수 있고, 없으면 false를 반환.
 */
export const ensureBirthInfoOrNavigate = async (
  navigation: any,
  redirectTo?: string
): Promise<boolean> => {
  const { status, user } = await getCurrentUserSafely();
  if (status === 'network_error') {
    // 네트워크 문제일 때는 UX를 해치지 않기 위해 조용히 통과시킨다.
    return true;
  }
  if (status === 'unauthenticated' || !user) {
    Alert.alert('오류', '로그인이 필요합니다.');
    return false;
  }
  try {
    const { data } = await supabase
      .from('birth_info')
      .select('id, year, month, day')
      .eq('user_id', user.id)
      .single();
    
    // 레코드가 없거나 생년월일 정보가 없으면 입력 화면으로 이동
    if (!data || !data.year || !data.month || !data.day) {
      navigation.navigate('BirthInfo', redirectTo ? { redirectTo } : undefined);
      return false;
    }
    
    return true;
  } catch (_e) {
    // 조회 실패 시에는 일단 진행을 막지 않음 (서비스 가용성 우선)
    return true;
  }
};


