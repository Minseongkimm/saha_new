// 서버(Edge Function) 통신 래퍼
// - verifyAndGrant: 스토어 영수증 검증 + 잔액 지급 요청
// - fetchBalance: 서버에서 현재 잔액 조회
import { VerifyPayload, VerifyResponse, BalanceResponse } from './types';

// NOTE: Replace with your actual API base if you are not calling Supabase Edge functions directly.
const DEFAULT_TIMEOUT_MS = 15000;

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

export async function verifyAndGrant(payload: VerifyPayload): Promise<VerifyResponse> {
  // Placeholder implementation. Wire this to your Edge Function or server endpoint.
  // Example: const res = await fetch(`${API_BASE}/iap/verify-and-grant`, { ... })
  // For now, return a safe mocked shape to avoid runtime errors while wiring UI.
  void payload;
  return {
    status: 'approved',
    currentBalance: 0,
  };
}

export async function fetchBalance(): Promise<BalanceResponse> {
  // Placeholder implementation. In production, fetch from a secure endpoint or Supabase RPC.
  return withTimeout(Promise.resolve({ currentBalance: 0 }));
}


