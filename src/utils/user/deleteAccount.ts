import { supabase } from '../database/supabaseClient';
import { SUPABASE_URL } from '../../config/env';

interface DeleteAccountResult {
  success: boolean;
  message: string;
  retainedTables: string[];
  requestId: string;
}

interface DeleteAccountErrorResponse {
  message?: string;
  [key: string]: unknown;
}

/**
 * 계정 삭제 유틸
 * - Supabase Edge Function 호출하여 탈퇴 플래그 설정
 * - 구매 내역, 사용 내역, 잔액 정보 외 데이터는 삭제
 */
export async function deleteUserAccount(): Promise<DeleteAccountResult> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('사용자 인증이 필요합니다.');
    }

    const token = session.access_token;

    // Edge Function 호출
    const response = await fetch(`${SUPABASE_URL}/functions/v1/delete-account`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json() as DeleteAccountErrorResponse;
      throw new Error(errorData.message ?? '계정 삭제에 실패했습니다.');
    }

    const result = await response.json() as DeleteAccountResult;
    return result;
  } catch (error) {
    console.error('계정 삭제 오류:', error);
    throw error;
  }
}

