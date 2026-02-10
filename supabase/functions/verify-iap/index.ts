/// <reference lib="deno.ns" />

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { handleCorsPreFlight, getJsonHeaders } from '../_shared/cors.ts';

/** Service role client exposes auth.admin (getUserById); Deno ESM types may not. */
type SupabaseAuthAdmin = { admin: { getUserById(userId: string): Promise<{ data: { user: { user_metadata?: unknown } | null }; error: unknown }> } };
/** Anon client auth.getUser(); Deno ESM types may not expose it. */
type SupabaseAuthUser = { getUser(): Promise<{ data: { user: { id: string } | null }; error: unknown }> };
import { createErrorResponse, validateRequest, validateEnvVars } from '../_shared/error-handler.ts';
import { log, getEnvVar } from '../_shared/config.ts';

/**
 * 상품 정보 매핑
 * ⚠️ 소스: src/constants/payments.ts의 PRODUCT_INFO_MAP과 동일하게 유지
 * 상품 정보 변경 시 src/constants/payments.ts를 먼저 수정하고 여기도 동일하게 반영
 */
const PRODUCT_INFO_MAP: Record<string, { productId: string; productName: string; sahaAmount: number; bonusSaha: number; totalSaha: number; priceMinor: number; currency: string }> = {
  'com.saha.ai.coin_10_v1': {
    productId: 'com.saha.ai.coin_10_v1',
    productName: '10 사바 + 2 보너스',
    sahaAmount: 10,
    bonusSaha: 2,
    totalSaha: 12,
    priceMinor: 1100,
    currency: 'KRW',
  },
  'com.saha.ai.coin_30_v1': {
    productId: 'com.saha.ai.coin_30_v1',
    productName: '30 사바 + 6 보너스',
    sahaAmount: 30,
    bonusSaha: 6,
    totalSaha: 36,
    priceMinor: 3300,
    currency: 'KRW',
  },
  'com.saha.ai.coin_50_v1': {
    productId: 'com.saha.ai.coin_50_v1',
    productName: '50 사바 + 12 보너스',
    sahaAmount: 50,
    bonusSaha: 12,
    totalSaha: 62,
    priceMinor: 5500,
    currency: 'KRW',
  },
  'com.saha.ai.coin_100_v1': {
    productId: 'com.saha.ai.coin_100_v1',
    productName: '100 사바 + 25 보너스',
    sahaAmount: 100,
    bonusSaha: 25,
    totalSaha: 125,
    priceMinor: 11000,
    currency: 'KRW',
  },
  'com.saha.ai.coin_300_v1': {
    productId: 'com.saha.ai.coin_300_v1',
    productName: '300 사바 + 100 보너스',
    sahaAmount: 300,
    bonusSaha: 100,
    totalSaha: 400,
    priceMinor: 33000,
    currency: 'KRW',
  },
};

interface VerifyIapRequest {
  provider: 'apple' | 'google';
  receiptOrToken: string;
  productId: string;
  amountMinor?: number;
  currency?: string;
}

interface VerifyResponse {
  status: 'approved' | 'pending' | 'failed' | 'refunded';
  currentBalance: number;
  purchaseId?: string;
  paymentId?: string;
  message?: string;
}

function maskToken(token: string): string {
  if (!token) {
    return 'empty-token';
  }
  const trimmed = token.replace(/\s+/g, '');
  if (trimmed.length <= 12) {
    return `${trimmed.slice(0, 4)}***`;
  }
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-6)}`;
}

/**
 * Apple JWT 토큰 생성 (App Store Server API 인증용)
 */
async function generateAppleJWT(): Promise<string> {
  const keyId = getEnvVar('APPLE_KEY_ID', true);
  const issuerId = getEnvVar('APPLE_ISSUER_ID', true);
  const privateKey = getEnvVar('APPLE_PRIVATE_KEY', true);

  // JWT Header
  const header = {
    alg: 'ES256',
    kid: keyId,
    typ: 'JWT',
  };

  // JWT Payload
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: issuerId,
    iat: now,
    exp: now + 3600, // 1시간 유효
    aud: 'appstoreconnect-v1',
    bid: 'com.saha', // Bundle ID
  };

  // JWT 서명 생성 (Deno에서는 crypto.subtle 사용)
  const headerBase64 = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const payloadBase64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const message = `${headerBase64}.${payloadBase64}`;

  // PEM 형식의 Private Key를 CryptoKey로 변환
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = privateKey
    .replace(pemHeader, '')
    .replace(pemFooter, '')
    .replace(/\s/g, '');
  
  const keyData = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    false,
    ['sign']
  );

  // ECDSA 서명
  const signature = await crypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: 'SHA-256',
    },
    cryptoKey,
    new TextEncoder().encode(message)
  );

  // Base64 URL 인코딩
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${message}.${signatureBase64}`;
}

/**
 * App Store Server API를 사용하여 transaction 정보 조회 (환경별)
 */
async function fetchTransactionFromApple(
  transactionId: string,
  jwtToken: string,
  environment: 'production' | 'sandbox'
): Promise<{
  signedTransactionInfo: string;
  environment: string;
}> {
  const baseUrl = environment === 'production'
    ? 'https://api.storekit.itunes.apple.com'
    : 'https://api.storekit-sandbox.itunes.apple.com';
  
  const apiUrl = `${baseUrl}/inApps/v1/transactions/${transactionId}`;
  
  // 타임아웃 설정 (업계 표준)
  // - Production API: 5초 (404는 즉시 반환, 최대 3-5초)
  // - Sandbox API: 10초 (네트워크 지연 고려)
  const timeoutMs = environment === 'production' ? 5000 : 10000;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: { [key: string]: unknown } | null = null;
      try {
        errorData = JSON.parse(errorText) as { [key: string]: unknown };
      } catch {
        // JSON 파싱 실패 시 그대로 사용
      }
    
      // 404 오류 또는 Sandbox receipt 에러가 발생하면 sandbox 영수증일 가능성
      if (response.status === 404) {
        throw new Error('TRANSACTION_NOT_FOUND');
      }
      
      // "Sandbox receipt used in production" 에러 처리
      // Apple이 요구: production에서 검증 실패 시 sandbox로 재시도
      const errorMessage = errorText?.toLowerCase() || '';
      const errorCode = errorData?.['errorCode'] || errorData?.['code'];
      
      if (
        response.status === 400 && 
        (errorMessage.includes('sandbox receipt') || 
         errorMessage.includes('sandbox') ||
         errorCode === 'SANDBOX_RECEIPT_USED_IN_PRODUCTION')
      ) {
        log('info', 'Production 환경에서 Sandbox receipt 감지, Sandbox 환경으로 재시도');
        throw new Error('TRANSACTION_NOT_FOUND');
      }
    
      log('error', `Apple ${environment} API 호출 실패`, { 
        status: response.status, 
        error: errorText,
        errorData 
      });
      throw new Error(`Apple ${environment} API 호출 실패: ${response.status}`);
    }

    const apiData = await response.json();
    
    if (!apiData.signedTransactionInfo) {
      throw new Error('Transaction info not found in API response');
    }

    return {
      signedTransactionInfo: apiData.signedTransactionInfo,
      environment,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    
    // 타임아웃 에러 처리
    if (error instanceof Error && error.name === 'AbortError') {
      log('error', `Apple ${environment} API 호출 타임아웃`, { 
        timeoutMs,
        transactionId 
      });
      // Production 타임아웃이면 Sandbox로 전환하도록 TRANSACTION_NOT_FOUND로 처리
      if (environment === 'production') {
        throw new Error('TRANSACTION_NOT_FOUND');
      }
      throw new Error(`Apple ${environment} API 호출 타임아웃`);
    }
    
    // 다른 에러는 그대로 throw
    throw error;
  }
}

/**
 * unknown 타입에서 string 추출 (타입 안전)
 */
function getStringValue(obj: { [key: string]: unknown }, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value) {
      return value;
    }
  }
  return undefined;
}

/**
 * unknown 타입에서 number 추출 (타입 안전)
 */
function getNumberValue(obj: { [key: string]: unknown }, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const num = parseInt(value, 10);
      if (!isNaN(num)) {
        return num;
      }
    }
  }
  return undefined;
}

/**
 * Transaction 정보에서 유효성 검증
 */
function validateTransactionInfo(
  transactionPayload: { [key: string]: unknown },
  payload: { [key: string]: unknown }
): {
  transactionId: string;
  productId: string;
  purchaseDate: number;
  isValid: boolean;
} {
  // Transaction ID 추출
  const transactionId = 
    getStringValue(transactionPayload, 'transactionId', 'originalTransactionId') ||
    getStringValue(payload, 'transactionId', 'originalTransactionId');
  
  if (!transactionId) {
    throw new Error('Transaction ID not found');
  }

  // Product ID 추출
  const productId = 
    getStringValue(transactionPayload, 'productId') ||
    getStringValue(payload, 'productId') ||
    '';

  // Purchase Date 추출
  const purchaseDate = 
    getNumberValue(transactionPayload, 'purchaseDate', 'originalPurchaseDate') ||
    getNumberValue(payload, 'purchaseDate', 'originalPurchaseDate') ||
    Date.now();

  // Revocation Date 확인
  const revocationDate = getNumberValue(transactionPayload, 'revocationDate');
  
  // Expires Date 확인
  const expiresDate = getNumberValue(transactionPayload, 'expiresDate');

  // 취소되었거나 만료된 경우
  if (revocationDate) {
    return {
      transactionId,
      productId,
      purchaseDate,
      isValid: false,
    };
  }

  // 구독 상품인 경우 만료 확인 (소모품은 expiresDate 없음)
  if (expiresDate && expiresDate < Date.now()) {
    return {
      transactionId,
      productId,
      purchaseDate,
      isValid: false,
    };
  }

  return {
    transactionId,
    productId,
    purchaseDate,
    isValid: true,
  };
}

/**
 * Apple JWS 검증 (App Store Server API 사용)
 * Production 환경에서 먼저 시도하고, 실패 시 Sandbox 환경으로 재시도
 */
async function verifyAppleReceipt(jws: string): Promise<{
  transactionId: string;
  productId: string;
  purchaseDate: number;
  isValid: boolean;
}> {
  try {
    const parts = jws.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWS format');
    }

    const payload = JSON.parse(
      new TextDecoder().decode(
        base64UrlDecode(parts[1])
      )
    );

    const environment = typeof payload.environment === 'string' ? payload.environment.toLowerCase() : '';

    if (environment === 'xcode') {
      const baseTransactionId = payload.transactionId || payload.originalTransactionId || crypto.randomUUID();
      const simulatedTransactionId = crypto.randomUUID();
      const simulatedProductId = payload.productId || payload.productID || payload.productIdentifier || payload.product_id || '';
      return {
        transactionId: simulatedTransactionId,
        productId: simulatedProductId,
        purchaseDate: payload.purchaseDate || payload.originalPurchaseDate || Date.now(),
        isValid: true,
      };
    }

    // JWT 토큰 생성
    const jwtToken = await generateAppleJWT();

    const transactionId = payload.transactionId || payload.originalTransactionId;
    if (!transactionId) {
      throw new Error('Transaction ID not found in JWS');
    }

    // 1. 먼저 production 환경에서 검증 시도
    let transactionData: { signedTransactionInfo: string; environment: string };
    try {
      transactionData = await fetchTransactionFromApple(transactionId, jwtToken, 'production');
    } catch (error) {
      // Production 검증 실패 시 Sandbox 환경으로 재시도
      if (error instanceof Error && error.message === 'TRANSACTION_NOT_FOUND') {
        try {
          transactionData = await fetchTransactionFromApple(transactionId, jwtToken, 'sandbox');
        } catch (sandboxError) {
          log('error', 'Transaction 조회 실패 (Production 및 Sandbox 모두 실패)', {
            transactionId,
            error: sandboxError instanceof Error ? sandboxError.message : String(sandboxError)
          });
          throw new Error(`Transaction not found in both production and sandbox environments`);
        }
      } else {
        throw error;
      }
    }

    // Transaction 정보에서 상태 확인
    const signedTransactionInfo = transactionData.signedTransactionInfo;

    // JWS 디코딩하여 transaction 정보 확인
    const transactionParts = signedTransactionInfo.split('.');
    if (transactionParts.length !== 3) {
      throw new Error('Invalid transaction info JWS format');
    }

    const transactionPayload = JSON.parse(
      new TextDecoder().decode(
        base64UrlDecode(transactionParts[1])
      )
    );

    // Transaction 유효성 검증
    return validateTransactionInfo(transactionPayload, payload);
  } catch (error) {
    log('error', 'Apple JWS 검증 실패', error);
    throw new Error(`Apple 영수증 검증 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}


/**
 * Base64 URL 디코딩
 */
function base64UrlDecode(str: string): Uint8Array {
  // Base64 URL을 일반 Base64로 변환
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  
  // Padding 추가
  while (str.length % 4) {
    str += '=';
  }
  
  // Base64 디코딩
  const binaryString = atob(str);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Google 서비스 계정 JWT 토큰 생성 (Google Play Developer API 인증용)
 */
async function generateGoogleJWT(): Promise<string> {
  // 환경 변수에서 서비스 계정 정보 가져오기
  const serviceAccountJson = getEnvVar('GOOGLE_SERVICE_ACCOUNT_JSON', true);
  
  let serviceAccount: {
    project_id: string;
    private_key: string;
    client_email: string;
  };
  
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch (error) {
    // 개별 환경 변수로 시도
    const projectId = getEnvVar('GOOGLE_PROJECT_ID', false);
    const privateKey = getEnvVar('GOOGLE_PRIVATE_KEY', false);
    const clientEmail = getEnvVar('GOOGLE_CLIENT_EMAIL', false);
    
    if (!projectId || !privateKey || !clientEmail) {
      throw new Error('Google 서비스 계정 정보가 없습니다. GOOGLE_SERVICE_ACCOUNT_JSON 또는 개별 환경 변수를 설정하세요.');
    }
    
    serviceAccount = {
      project_id: projectId,
      private_key: privateKey,
      client_email: clientEmail,
    };
  }

  // JWT Header
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  // JWT Payload
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600, // 1시간 유효
    iat: now,
  };

  // JWT 서명 생성
  const headerBase64 = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const payloadBase64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const message = `${headerBase64}.${payloadBase64}`;

  // PEM 형식의 Private Key를 CryptoKey로 변환
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = serviceAccount.private_key
    .replace(pemHeader, '')
    .replace(pemFooter, '')
    .replace(/\s/g, '');
  
  const keyData = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  // RSA 서명
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(message)
  );

  // Base64 URL 인코딩
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${message}.${signatureBase64}`;
}

/**
 * Google OAuth2 액세스 토큰 획득
 */
async function getGoogleAccessToken(): Promise<string> {
  const jwt = await generateGoogleJWT();
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    log('error', 'Google OAuth2 토큰 획득 실패', { status: response.status, error: errorText });
    throw new Error(`Google OAuth2 토큰 획득 실패: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Google Play 구매 정보 조회
 */
async function fetchGooglePurchase(
  packageName: string,
  productId: string,
  purchaseToken: string,
  accessToken: string
): Promise<{
  purchaseId: string;
  productId: string;
  purchaseTime: number;
  purchaseState: number;
  consumptionState: number;
}> {
  const apiUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/products/${productId}/tokens/${purchaseToken}`;
  
  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    log('error', 'Google Play 구매 정보 조회 실패', { 
      status: response.status, 
      error: errorText,
      packageName,
      productId,
      purchaseToken: maskToken(purchaseToken)
    });
    
    if (response.status === 410) {
      throw new Error('구매가 이미 소비되었거나 취소되었습니다');
    }
    
    throw new Error(`Google Play 구매 정보 조회 실패: ${response.status}`);
  }

  const purchaseData = await response.json();
  
  return {
    purchaseId: purchaseToken, // Google Play는 purchaseToken을 ID로 사용
    productId: purchaseData.productId || productId,
    purchaseTime: parseInt(purchaseData.purchaseTimeMillis || '0', 10),
    purchaseState: purchaseData.purchaseState || 0, // 0: 구매됨, 1: 취소됨
    consumptionState: purchaseData.consumptionState || 0, // 0: 소비 안됨, 1: 소비됨
  };
}

/**
 * Google Play 구매 검증
 */
async function verifyGooglePurchase(
  purchaseToken: string,
  productId: string
): Promise<{
  transactionId: string;
  productId: string;
  purchaseDate: number;
  isValid: boolean;
}> {
  try {
    // 앱 패키지 이름 (Android applicationId)
    const packageName = 'com.saha.ai';
    
    // OAuth2 액세스 토큰 획득
    const accessToken = await getGoogleAccessToken();
    
    // 구매 정보 조회
    const purchaseData = await fetchGooglePurchase(
      packageName,
      productId,
      purchaseToken,
      accessToken
    );
    
    // 구매 상태 확인
    // purchaseState: 0 = 구매됨, 1 = 취소됨
    if (purchaseData.purchaseState !== 0) {
      return {
        transactionId: purchaseData.purchaseId,
        productId: purchaseData.productId,
        purchaseDate: purchaseData.purchaseTime,
        isValid: false,
      };
    }
    
    // 소비 상태 확인 (소모품의 경우)
    // consumptionState: 0 = 소비 안됨, 1 = 소비됨
    // 소비된 구매는 재사용 불가
    if (purchaseData.consumptionState === 1) {
      log('warn', '이미 소비된 구매', { purchaseToken: maskToken(purchaseToken) });
      return {
        transactionId: purchaseData.purchaseId,
        productId: purchaseData.productId,
        purchaseDate: purchaseData.purchaseTime,
        isValid: false,
      };
    }
    
    return {
      transactionId: purchaseData.purchaseId,
      productId: purchaseData.productId,
      purchaseDate: purchaseData.purchaseTime,
      isValid: true,
    };
  } catch (error) {
    log('error', 'Google Play 구매 검증 실패', error);
    throw new Error(`Google Play 구매 검증 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}


/**
 * 중복 결제 체크
 */
async function checkDuplicatePurchase(
  supabase: SupabaseClient,
  userId: string,
  purchaseId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('payments')
    .select('id')
    .eq('user_id', userId)
    .eq('purchase_id', purchaseId)
    .single();
  
  return !!data;
}

/**
 * UUID 생성 함수 (crypto.randomUUID 사용)
 */
function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * 잔액 업데이트
 */
async function updateUserBalance(
  supabase: SupabaseClient,
  userId: string,
  productId: string,
  purchaseToken: string,  // Google Play purchaseToken 또는 Apple transactionId
  provider: 'apple' | 'google'
): Promise<number> {
  // 상품 정보 조회
  const productInfo = PRODUCT_INFO_MAP[productId];
  if (!productInfo) {
    throw new Error(`알 수 없는 상품 ID: ${productId}`);
  }

  // 총 사바 코인 수량 계산 (기본 + 보너스)
  const totalSahaAmount = productInfo.totalSaha;

  // 중복 구매 확인 (동일 transaction_id로 이미 처리된 경우)
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id')
    .eq('transaction_id', purchaseToken)
    .single();

  if (existingPayment) {
    log('info', '이미 처리된 구매입니다', { purchaseToken: purchaseToken.slice(0, 20) + '...' });
    // 이미 처리된 경우 현재 잔액 반환
    const { data: currentBalance } = await supabase
      .from('user_balances')
      .select('total_purchased, total_usage')
      .eq('user_id', userId)
      .single();
    return (currentBalance?.total_purchased || 0) - (currentBalance?.total_usage || 0);
  }

  // user_balances 조회
  const { data: balanceData, error: balanceError } = await supabase
    .from('user_balances')
    .select('total_purchased')
    .eq('user_id', userId)
    .single();

  if (balanceError && balanceError.code !== 'PGRST116') {
    // PGRST116은 "no rows returned" 에러 (새 유저)
    log('error', '잔액 조회 실패', balanceError);
    throw new Error('잔액 조회 실패');
  }

  const newTotalPurchased = (balanceData?.total_purchased || 0) + totalSahaAmount;

  // 사용자 이름 조회 (purchases.user_name 저장용): birth_info.name 우선, 없으면 auth user_metadata
  const { data: birthRow } = await supabase
    .from('birth_info')
    .select('name')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  let user_name: string | null = birthRow?.name ?? null;
  if (user_name == null) {
    const { data: { user: authUser } } = await (supabase.auth as SupabaseAuthAdmin).admin.getUserById(userId);
    const meta = authUser?.user_metadata as Record<string, unknown> | undefined;
    const fromMeta =
      (typeof meta?.name === 'string' ? meta.name : null) ??
      (typeof meta?.full_name === 'string' ? meta.full_name : null) ??
      (typeof meta?.user_name === 'string' ? meta.user_name : null) ??
      (typeof meta?.preferred_username === 'string' ? meta.preferred_username : null);
    user_name = fromMeta ?? null;
  }

  // UUID 생성 (DB id용)
  const purchaseUUID = generateUUID();
  const paymentUUID = generateUUID();

  // purchases 테이블에 먼저 레코드 생성
  const { error: purchaseUpsertError } = await supabase
    .from('purchases')
    .upsert({
      id: purchaseUUID,
      user_id: userId,
      user_name,
      product_name: productInfo.productName,
      saha_amount: productInfo.sahaAmount,
      bonus_saha: productInfo.bonusSaha,
      total_price_minor: productInfo.priceMinor,
      currency: productInfo.currency,
      status: 'completed',
    }, { onConflict: 'id' });

  if (purchaseUpsertError) {
    log('error', 'purchases 테이블 저장 실패', purchaseUpsertError);
    // purchases 저장 실패해도 잔액은 업데이트 (부분 실패 허용)
  }

  // payments 테이블에 결제 기록 저장
  const { error: paymentError } = await supabase
    .from('payments')
    .insert({
      id: paymentUUID,
      user_id: userId,
      purchase_id: purchaseUUID,
      transaction_id: purchaseToken,  // Google Play purchaseToken 또는 Apple transactionId 저장
      amount_minor: productInfo.priceMinor, // 결제 금액 (원)
      currency: productInfo.currency,
      provider: provider,
      status: 'approved',
      approved_at: new Date().toISOString(),
    });

  if (paymentError) {
    log('error', 'payments 테이블 저장 실패', paymentError);
    throw new Error('구매 기록 저장 실패');
  }

  // user_balances 테이블 업데이트
  if (balanceData) {
    const { error: updateError } = await supabase
      .from('user_balances')
      .update({
        total_purchased: newTotalPurchased,
      })
      .eq('user_id', userId);

    if (updateError) {
      log('error', '잔액 업데이트 실패', updateError);
      throw new Error('잔액 업데이트 실패');
    }
  } else {
    // 새 유저: 초기 잔액 생성
    const { error: insertError } = await supabase
      .from('user_balances')
      .insert({
        user_id: userId,
        total_purchased: totalSahaAmount,
        total_usage: 0,
      });

    if (insertError) {
      log('error', '잔액 생성 실패', insertError);
      throw new Error('잔액 생성 실패');
    }
  }

  // 업데이트된 잔액 조회
  const { data: updatedBalance } = await supabase
    .from('user_balances')
    .select('current_balance')
    .eq('user_id', userId)
    .single();

  return (updatedBalance?.current_balance as number) || 0;
}

Deno.serve(async (req) => {
  // CORS preflight 처리
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight();
  }

  try {
    // 환경 변수 검증
    const requiredVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
    
    // Provider별 환경 변수 확인 (provider가 특정 값인 경우에만 필수)
    const body = await req.json().catch(() => null);
    if (body?.provider === 'apple') {
      requiredVars.push('APPLE_KEY_ID', 'APPLE_ISSUER_ID', 'APPLE_PRIVATE_KEY');
    }
    // Google은 나중에 generateGoogleJWT에서 확인 (JSON 또는 개별 필드 모두 가능)
    
    validateEnvVars(requiredVars);

    // 인증 확인
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createErrorResponse(new Error('Authorization header required'), 401);
    }

    // 토큰에서 사용자 확인 (먼저 액세스 토큰으로 클라이언트 생성)
    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = getEnvVar('SUPABASE_URL');
    const supabaseAnonKey = getEnvVar('SUPABASE_ANON_KEY');
    
    // 액세스 토큰으로 클라이언트 생성 (사용자 인증 확인용)
    const userClient: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data: { user }, error: userError } = await (userClient.auth as SupabaseAuthUser).getUser();
    if (userError || !user) {
      return createErrorResponse(new Error('Unauthorized'), 401);
    }

    // Supabase 클라이언트 생성 (SERVICE_ROLE_KEY 사용 - DB 작업용)
    const supabaseServiceKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');
    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // 요청 본문 파싱 (이미 위에서 파싱됨)
    const requestBody: VerifyIapRequest = body || await req.json();
    validateRequest(requestBody, ['provider', 'receiptOrToken', 'productId']);

    const { provider, receiptOrToken, productId } = requestBody;

    log('info', 'IAP 검증 요청 수신', {
      userId: user.id,
      provider,
      productId,
      receiptPreview: maskToken(receiptOrToken || ''),
    });

    // 1. 영수증 검증
    let purchaseId: string;
    let isDevelopmentMode = false;

    if (provider === 'apple') {
      // 개발 환경 감지 (StoreKit Configuration 사용 시)
      // JWS 형식이 아니거나, environment가 'xcode'인 경우 개발 환경으로 간주
      try {
        const parts = receiptOrToken.split('.');
        if (parts.length === 3) {
          try {
            const payload = JSON.parse(
              new TextDecoder().decode(
                base64UrlDecode(parts[1])
              )
            );
            const environment = typeof payload.environment === 'string' ? payload.environment.toLowerCase() : '';
            if (environment === 'xcode') {
              isDevelopmentMode = true;
            }
          } catch (_parseError) {
            // JWS 파싱 실패 시 개발 환경일 가능성 (간단한 테스트 영수증)
            // receiptOrToken이 UUID 형식이거나 짧은 문자열이면 개발 환경으로 간주
            if (receiptOrToken.length < 100 && !receiptOrToken.includes('eyJ')) {
              isDevelopmentMode = true;
            }
          }
        } else {
          // JWS 형식이 아니면 개발 환경으로 간주
          isDevelopmentMode = true;
        }
      } catch (e) {
        // 전체 파싱 실패 시 개발 환경으로 간주
        isDevelopmentMode = true;
      }

      // 개발 환경이 아닐 때만 실제 검증 수행
      if (!isDevelopmentMode) {
        const verifyResult = await verifyAppleReceipt(receiptOrToken);
        if (!verifyResult.isValid) {
          return new Response(
            JSON.stringify({
              status: 'failed',
              currentBalance: 0,
              message: 'Apple 영수증 검증 실패',
            }),
            {
              status: 400,
              headers: getJsonHeaders(),
            }
          );
        }
        purchaseId = verifyResult.transactionId;
        
        // productId 일치 확인
        if (verifyResult.productId !== productId) {
          log('warn', 'Product ID 불일치', {
            expected: productId,
            actual: verifyResult.productId,
          });
          return new Response(
            JSON.stringify({
              status: 'failed',
              currentBalance: 0,
              message: '상품 ID가 일치하지 않습니다',
            }),
            {
              status: 400,
              headers: getJsonHeaders(),
            }
          );
        }
      } else {
        // 개발 환경: 항상 새로운 UUID 생성 (DB의 UUID 타입 컬럼에 저장하기 위해)
        purchaseId = crypto.randomUUID();
      }
    } else if (provider === 'google') {
      // Google Play 구매 검증
      try {
        const verifyResult = await verifyGooglePurchase(receiptOrToken, productId);
        if (!verifyResult.isValid) {
          return new Response(
            JSON.stringify({
              status: 'failed',
              currentBalance: 0,
              message: 'Google Play 구매 검증 실패 (취소되었거나 이미 소비됨)',
            }),
            {
              status: 400,
              headers: getJsonHeaders(),
            }
          );
        }
        purchaseId = verifyResult.transactionId;
        
        // productId 일치 확인
        if (verifyResult.productId !== productId) {
          log('warn', 'Product ID 불일치', {
            expected: productId,
            actual: verifyResult.productId,
          });
          return new Response(
            JSON.stringify({
              status: 'failed',
              currentBalance: 0,
              message: '상품 ID가 일치하지 않습니다',
            }),
            {
              status: 400,
              headers: getJsonHeaders(),
            }
          );
        }
      } catch (error) {
        log('error', 'Google Play 구매 검증 오류', error);
        return new Response(
          JSON.stringify({
            status: 'failed',
            currentBalance: 0,
            message: `Google Play 구매 검증 실패: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }),
          {
            status: 400,
            headers: getJsonHeaders(),
          }
        );
      }
    } else {
      // 지원하지 않는 제공자
      log('warn', '지원하지 않는 결제 제공자 요청', { userId: user.id, provider });
      return new Response(
        JSON.stringify({
          status: 'failed',
          currentBalance: 0,
          message: `지원하지 않는 결제 제공자: ${provider}`,
        }),
        {
          status: 400,
          headers: getJsonHeaders(),
        }
      );
    }

    // 2. 중복 체크
    const isDuplicate = await checkDuplicatePurchase(supabase, user.id, purchaseId);
    if (isDuplicate) {
      log('warn', '중복 결제 시도', { userId: user.id, purchaseId });
      return new Response(
        JSON.stringify({
          status: 'failed',
          currentBalance: 0,
          message: '이미 처리된 결제입니다',
        }),
        {
          status: 400,
          headers: getJsonHeaders(),
        }
      );
    }

    // 3. 상품 정보 확인
    const productInfo = PRODUCT_INFO_MAP[productId];
    if (!productInfo) {
      log('error', '알 수 없는 상품 요청', { userId: user.id, productId });
      return createErrorResponse(new Error(`알 수 없는 상품 ID: ${productId}`), 400);
    }

    // 4. 잔액 업데이트
    log('info', '잔액 업데이트 시작', {
      userId: user.id,
      purchaseId,
      productId,
      totalSaha: productInfo.totalSaha,
    });
    const newBalance = await updateUserBalance(
      supabase,
      user.id,
      productId,
      purchaseId,
      provider
    );


    // 5. 성공 응답
    const response: VerifyResponse = {
      status: 'approved',
      currentBalance: newBalance,
      purchaseId,
      paymentId: purchaseId,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: getJsonHeaders(),
    });
  } catch (error) {
    log('error', 'IAP 검증 오류', error);
    return createErrorResponse(error);
  }
});

