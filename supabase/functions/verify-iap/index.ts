/// <reference lib="deno.ns" />

import { createClient } from '@supabase/supabase-js';
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

/**
 * Apple JWS 검증
 */
function verifyAppleReceipt(jws: string): {
  transactionId: string;
  productId: string;
  purchaseDate: number;
  isValid: boolean;
} {
  try {
    // Apple App Store Server API를 사용하여 JWS 검증
    // 실제 구현에서는 Apple의 공개 키로 JWT 서명 검증 필요
    // 여기서는 간단한 구조만 제공 (실제 검증은 Apple API 호출 필요)
    
    // JWS는 3부분으로 구성: header.payload.signature
    const parts = jws.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWS format');
    }

    // Payload 디코딩 (실제로는 서명 검증 후)
    const payload = JSON.parse(
      new TextDecoder().decode(
        base64UrlDecode(parts[1])
      )
    );

    return {
      transactionId: payload.transactionId || payload.originalTransactionId || '',
      productId: payload.productId || '',
      purchaseDate: payload.purchaseDate || Date.now(),
      isValid: true, // 실제로는 Apple 공개 키로 서명 검증 필요
    };
  } catch (error) {
    log('error', 'Apple JWS 검증 실패', error);
    throw new Error('Apple 영수증 검증 실패');
  }
}

/**
 * Google Purchase Token 검증
 */
function verifyGooglePurchase(
  _packageName: string,
  _productId: string,
  purchaseToken: string
): {
  purchaseId: string;
  purchaseTime: number;
  isValid: boolean;
} {
  try {
    // Google Play Developer API를 사용하여 검증
    // 실제 구현에서는 Google OAuth 토큰이 필요
    // 여기서는 구조만 제공 (실제 검증은 Google API 호출 필요)
    
    // Google API 호출 (실제로는 OAuth 토큰 필요)
    // const googleApiUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/products/${productId}/tokens/${purchaseToken}`;
    // const response = await fetch(googleApiUrl, {
    //   headers: {
    //     'Authorization': `Bearer ${googleAccessToken}`,
    //   },
    // });
    
    // 임시로 성공 반환 (실제 구현 필요)
    return {
      purchaseId: purchaseToken.substring(0, 20), // 임시 ID
      purchaseTime: Date.now(),
      isValid: true,
    };
  } catch (error) {
    log('error', 'Google Purchase Token 검증 실패', error);
    throw new Error('Google 영수증 검증 실패');
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
    validateEnvVars(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

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

    // 요청 본문 파싱
    const body: VerifyIapRequest = await req.json();
    validateRequest(body, ['provider', 'receiptOrToken', 'productId']);

    const { provider, receiptOrToken, productId } = body;

    log('info', 'IAP 검증 시작', { userId: user.id, provider, productId });

    // 1. 영수증 검증
    let purchaseId: string;

    if (provider === 'apple') {
      const verifyResult = verifyAppleReceipt(receiptOrToken);
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
    } else {
      // Google
      const packageName = 'com.saha'; // Android 패키지명
      const verifyResult = verifyGooglePurchase(
        packageName,
        productId,
        receiptOrToken
      );
      if (!verifyResult.isValid) {
        return new Response(
          JSON.stringify({
            status: 'failed',
            currentBalance: 0,
            message: 'Google 영수증 검증 실패',
          }),
          {
            status: 400,
            headers: getJsonHeaders(),
          }
        );
      }
      purchaseId = verifyResult.purchaseId;
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
      return createErrorResponse(new Error(`알 수 없는 상품 ID: ${productId}`), 400);
    }

    // 4. 잔액 업데이트
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