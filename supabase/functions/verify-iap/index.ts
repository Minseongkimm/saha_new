/// <reference lib="deno.ns" />

// @deno-types="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/module/index.d.ts"
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { handleCorsPreFlight, getJsonHeaders } from '../_shared/cors.ts';
import { createErrorResponse, validateRequest, validateEnvVars } from '../_shared/error-handler.ts';
import { log, getEnvVar } from '../_shared/config.ts';

/**
 * 상품 정보 매핑
 * ⚠️ 소스: src/constants/payments.ts의 PRODUCT_INFO_MAP과 동일하게 유지
 * 상품 정보 변경 시 src/constants/payments.ts를 먼저 수정하고 여기도 동일하게 반영
 */
const PRODUCT_INFO_MAP: Record<string, { productId: string; productName: string; sahaAmount: number; bonusSaha: number; totalSaha: number; priceMinor: number; currency: string }> = {
  'com.saha.ai.coin_10': {
    productId: 'com.saha.ai.coin_10',
    productName: '10 사바 + 2 보너스',
    sahaAmount: 10,
    bonusSaha: 2,
    totalSaha: 12,
    priceMinor: 1100,
    currency: 'KRW',
  },
  'com.saha.ai.coin_30': {
    productId: 'com.saha.ai.coin_30',
    productName: '30 사바 + 5 보너스',
    sahaAmount: 30,
    bonusSaha: 5,
    totalSaha: 35,
    priceMinor: 3300,
    currency: 'KRW',
  },
  'com.saha.ai.coin_50': {
    productId: 'com.saha.ai.coin_50',
    productName: '50 사바 + 10 보너스',
    sahaAmount: 50,
    bonusSaha: 10,
    totalSaha: 60,
    priceMinor: 5500,
    currency: 'KRW',
  },
  'com.saha.ai.coin_100': {
    productId: 'com.saha.ai.coin_100',
    productName: '100 사바 + 15 보너스',
    sahaAmount: 100,
    bonusSaha: 15,
    totalSaha: 115,
    priceMinor: 11000,
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
 * Apple JWS 검증 (App Store Server API 사용)
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

      log('info', 'StoreKit Configuration 환경 감지, 원격 검증 건너뜀', {
        baseTransactionId,
        simulatedTransactionId,
        productId: simulatedProductId,
      });
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

    // App Store Server API 호출하여 transaction 정보 조회
    const apiUrl = `https://api.storekit.itunes.apple.com/inApps/v1/transactions/${transactionId}`;
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      log('error', 'Apple API 호출 실패', { status: response.status, error: errorText });
      throw new Error(`Apple API 호출 실패: ${response.status}`);
    }

    const apiData = await response.json();
    
    // Transaction 정보에서 상태 확인
    const signedTransactionInfo = apiData.signedTransactionInfo;
    if (!signedTransactionInfo) {
      throw new Error('Transaction info not found in API response');
    }

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

    // Transaction 상태 확인
    const productId = transactionPayload.productId || payload.productId;
    const purchaseDate = transactionPayload.purchaseDate || transactionPayload.originalPurchaseDate || Date.now();
    const revocationDate = transactionPayload.revocationDate;
    const expiresDate = transactionPayload.expiresDate;

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
 * 중복 결제 체크
 */
async function checkDuplicatePurchase(
  supabase: ReturnType<typeof createClient>,
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
 * 잔액 업데이트
 */
async function updateUserBalance(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  productId: string,
  purchaseId: string,
  provider: 'apple' | 'google'
): Promise<number> {
  // 상품 정보 조회
  const productInfo = PRODUCT_INFO_MAP[productId];
  if (!productInfo) {
    throw new Error(`알 수 없는 상품 ID: ${productId}`);
  }

  // 총 사바 코인 수량 계산 (기본 + 보너스)
  const totalSahaAmount = productInfo.totalSaha;

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

  // purchases 테이블에 먼저 레코드 생성
  const { error: purchaseUpsertError } = await supabase
    .from('purchases')
    .upsert({
      id: purchaseId,
      user_id: userId,
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
      user_id: userId,
      purchase_id: purchaseId,
      transaction_id: purchaseId,
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
    
    // Apple 검증을 위한 환경 변수 (provider가 apple인 경우에만 필수)
    const body = await req.json().catch(() => null);
    if (body?.provider === 'apple') {
      requiredVars.push('APPLE_KEY_ID', 'APPLE_ISSUER_ID', 'APPLE_PRIVATE_KEY');
    }
    
    validateEnvVars(requiredVars);

    // 인증 확인
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createErrorResponse(new Error('Authorization header required'), 401);
    }

    // Supabase 클라이언트 생성 (SERVICE_ROLE_KEY 사용)
    const supabaseUrl = getEnvVar('SUPABASE_URL');
    const supabaseServiceKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 토큰에서 사용자 확인
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await (supabase.auth as { getUser: (token: string) => Promise<{ data: { user: { id: string } | null }; error: unknown }> }).getUser(token);
    if (userError || !user) {
      return createErrorResponse(new Error('Unauthorized'), 401);
    }

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

    if (provider === 'apple') {
      const verifyResult = await verifyAppleReceipt(receiptOrToken);
      log('info', 'Apple 영수증 검증 결과', {
        userId: user.id,
        transactionId: verifyResult.transactionId,
        productId: verifyResult.productId,
        isValid: verifyResult.isValid,
        purchaseDate: verifyResult.purchaseDate,
      });
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
      // Google은 현재 미지원
      log('warn', '지원하지 않는 결제 제공자 요청', { userId: user.id, provider });
      return new Response(
        JSON.stringify({
          status: 'failed',
          currentBalance: 0,
          message: 'Google 결제는 현재 지원하지 않습니다',
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

    log('info', 'IAP 검증 완료', {
      userId: user.id,
      purchaseId,
      productId,
      totalSaha: productInfo.totalSaha,
      newBalance,
    });

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

