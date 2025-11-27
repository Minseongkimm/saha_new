// 서버(Edge Function) 통신 래퍼
// - verifyAndGrant: 스토어 영수증 검증 + 잔액 지급 요청
// - fetchBalance: 서버에서 현재 잔액 조회
import { VerifyPayload, VerifyResponse, BalanceResponse } from './types';
import { supabase } from '../database/supabaseClient';
import { SUPABASE_URL, USE_MOCK_IAP } from '../../config/env';
import { fetchUserBalance } from './balance';
import { mockVerifyAndGrant } from './mockIap';

// 타임아웃 설정 (업계 표준)
// - Apple 영수증 검증은 보통 5-15초 내 완료
// - Production → Sandbox 전환 시 최대 20초 소요 가능
// - 업계 표준: 30초 (안정적이고 사용자 경험 양호)
const DEFAULT_TIMEOUT_MS = 30000;

function withTimeout<T>(promise: Promise<T>, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
    promise.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}
/**
 * 스토어 영수증 검증 및 잔액 지급
 */
export async function verifyAndGrant(payload: VerifyPayload): Promise<VerifyResponse> {
  // Mock 모드에서는 Mock 검증 로직 사용
  if (USE_MOCK_IAP) {
    return mockVerifyAndGrant(payload);
  }

  // Sandbox 환경에서 Production → Sandbox 전환 시간을 고려하여 타임아웃 적용
  return withTimeout(
    (async () => {
      try {
        // 세션 토큰 가져오기
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('로그인이 필요합니다');
        }

        // Edge Function 호출
        const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-iap`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as { message?: string };
          throw new Error(errorData.message || `서버 오류: ${response.status}`);
        }

        const result = (await response.json()) as VerifyResponse;
        return result;
      } catch (error) {
        console.error('영수증 검증 실패:', error);
        throw error;
      }
    })()
  );
}

export async function fetchBalance(): Promise<BalanceResponse> {
  // balance.ts의 refreshBalance를 사용하므로 여기서는 사용하지 않음
  return withTimeout(Promise.resolve({ currentBalance: 0 }));
}


