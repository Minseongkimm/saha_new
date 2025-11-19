/**
 * checkBalanceBeforeSend - 메시지 전송 전 잔액 및 무료 대화 사전 체크
 * 
 * 역할:
 * - 현재 사용자의 로그인 상태 확인
 * - 무료 대화 사용 가능 여부 확인
 * - 사바 잔액 충분 여부 확인
 * - 조건 미충족 시 BalanceCheckResult 반환 (호출자가 UI 처리)
 */
import { supabase } from '../../../../../utils/database/supabaseClient';
import { checkFreeMessageAvailable, FreeMessageStatus } from '../../../../../utils/payments/freeMessage';
import { fetchUserBalance } from '../../../../../utils/payments/balance';
import { getCurrentUserSafely } from '../../../../../utils/user/authUtils';

export interface BalanceCheckResult {
  canSend: boolean;
  freeMessageInfo?: FreeMessageStatus;
  balance?: number;
}

export async function checkBalanceBeforeSend(): Promise<BalanceCheckResult> {
  try {
    const { status, user } = await getCurrentUserSafely();
    if (status !== 'authenticated' || !user) {
      return { canSend: false };
    }
    // 무료 메시지와 잔액을 한 번에 확인
    const [freeMessageCheck, currentBalance] = await Promise.all([
      checkFreeMessageAvailable(user.id),
      fetchUserBalance(user.id)
    ]);
    
    if (!freeMessageCheck.available && currentBalance < 1) {
      return {
        canSend: false,
        freeMessageInfo: freeMessageCheck,
        balance: currentBalance ?? 0
      };
    }
    return {
      canSend: true,
      freeMessageInfo: freeMessageCheck,
      balance: currentBalance ?? 0
    };
  } catch (error) {
    console.error('사전 체크 오류:', error);
    return { canSend: true };
  }
}

