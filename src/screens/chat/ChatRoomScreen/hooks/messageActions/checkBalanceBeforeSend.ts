/**
 * checkBalanceBeforeSend - 메시지 전송 전 잔액 및 무료 대화 사전 체크
 * 
 * 역할:
 * - 현재 사용자의 로그인 상태 확인
 * - 무료 대화 사용 가능 여부 확인
 * - 사바 잔액 충분 여부 확인
 * - 조건 미충족 시 Alert 표시 및 false 반환
 */
import { Alert } from 'react-native';
import { supabase } from '../../../../../utils/database/supabaseClient';
import { checkFreeMessageAvailable } from '../../../../../utils/payments/freeMessage';
import { fetchUserBalance } from '../../../../../utils/payments/balance';

export async function checkBalanceBeforeSend(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('오류', '로그인이 필요합니다.');
      return false;
    }
    // 무료 메시지와 잔액을 한 번에 확인
    const [freeMessageCheck, currentBalance] = await Promise.all([
      checkFreeMessageAvailable(user.id),
      fetchUserBalance(user.id)
    ]);
    
    if (!freeMessageCheck.available && currentBalance < 1) {
      Alert.alert(
        '잔액 부족',
        `사바 잔액이 부족합니다.\n현재 잔액: ${currentBalance}\n무료 대화: ${freeMessageCheck.usedCount}/${freeMessageCheck.dailyLimit} 사용 완료`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error('사전 체크 오류:', error);
    return true;
  }
}

