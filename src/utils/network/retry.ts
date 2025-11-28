/**
 * 네트워크 에러 재시도 유틸리티
 */

/**
 * 네트워크 에러인지 확인
 */
function isNetworkError(error: any): boolean {
  if (!error) {
    return false;
  }
  
  // 에러 메시지 추출 (여러 가능한 경로 확인)
  const message = 
    error?.message || 
    error?.error_description || 
    error?.error || 
    error?.details ||
    '';
  
  // 문자열이 아니면 false
  if (typeof message !== 'string') {
    return false;
  }
  
  // 네트워크 관련 키워드 확인
  const hasNetworkKeyword = 
    message.includes('Network request failed') ||
    message.includes('Failed to fetch') ||
    message.includes('fetch failed') ||
    message.includes('NetworkError') ||
    message.includes('TypeError: Network') ||
    message.toLowerCase().includes('network');
  
  // 에러 코드 확인
  const hasNetworkCode = 
    error?.code === 'ECONNREFUSED' ||
    error?.code === '' ||
    error?.code === 'NETWORK_ERROR';
  
  return hasNetworkKeyword || hasNetworkCode;
}

/**
 * 일반 Promise 함수에 대한 재시도 헬퍼
 * @param fn - 재시도할 함수
 * @param maxRetries - 최대 재시도 횟수 (기본값: 2)
 * @param delayMs - 재시도 간 지연 시간 (밀리초, 기본값: 500)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  delayMs = 500
): Promise<T> {
  let lastError: any;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const result = await fn();
      return result;
    } catch (error: any) {
      lastError = error;
      if (isNetworkError(error) && i < maxRetries) {
        const delay = delayMs * (i + 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

/**
 * Supabase 쿼리에 대한 재시도 헬퍼
 * 네트워크 에러인 경우에만 자동으로 재시도합니다.
 * @param fn - Supabase 쿼리를 반환하는 함수
 * @param maxRetries - 최대 재시도 횟수 (기본값: 2)
 * @param delayMs - 재시도 간 지연 시간 (밀리초, 기본값: 500)
 */
export async function withSupabaseRetry<TData>(
  fn: () => Promise<{ data: TData | null; error: any }>,
  maxRetries = 2,
  delayMs = 500
): Promise<{ data: TData | null; error: any }> {
  let lastResult: { data: TData | null; error: any } | null = null;
  
  for (let i = 0; i <= maxRetries; i++) {
    const result = await fn();
    lastResult = result;
    
    // 에러가 없으면 성공
    if (!result.error) {
      return result;
    }
    
    // 네트워크 에러 확인
    const isNetworkErr = isNetworkError(result.error);
    
    // 네트워크 에러이고 재시도 가능하면 재시도
    if (isNetworkErr && i < maxRetries) {
      const delay = delayMs * (i + 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }
    
    // 네트워크 에러가 아니거나 재시도 횟수 초과면 즉시 반환
    return result;
  }
  
  return lastResult!;
}

