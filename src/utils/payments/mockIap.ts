/**
 * Mock IAP 구현
 * 개발 환경에서 실제 스토어 없이 테스트하기 위한 Mock 로직
 */
import { Platform } from 'react-native';
import { Product, Provider, VerifyPayload, VerifyResponse } from './types';
import { supabase } from '../database/supabaseClient';
import { PRODUCT_IDS, PRODUCT_INFO_MAP } from '../../constants/payments';
import { fetchUserBalance } from './balance';

/**
 * Mock 상품 데이터 생성
 */
export function getMockProducts(): Product[] {
  return PRODUCT_IDS.map((productId) => {
    const productInfo = PRODUCT_INFO_MAP[productId];
    if (!productInfo) {
      return {
        storeProductId: productId,
        title: productId,
        description: '',
        priceMinor: 0,
        currency: 'KRW',
        sahaAmount: 0,
        bonusSaha: 0,
      };
    }

    return {
      storeProductId: productId,
      title: `${productInfo.sahaAmount} 사바 코인`,
      description: `${productInfo.priceMinor.toLocaleString()}원으로 ${productInfo.sahaAmount} 사바 코인을 구매하세요`,
      priceMinor: productInfo.priceMinor,
      currency: productInfo.currency,
      sahaAmount: productInfo.sahaAmount,
      bonusSaha: productInfo.bonusSaha,
    };
  });
}

/**
 * Mock 영수증 생성 (UUID v4 형식)
 */
export function generateMockReceipt(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Mock 결제 시작
 * 실제 결제 화면이 나타나는 것처럼 시뮬레이션
 */
export async function startMockPurchase(productId: string): Promise<{ provider: Provider; receiptOrToken: string }> {
  // 실제 결제 화면이 나타나는 것처럼 시뮬레이션 (2초 지연)
  await new Promise((resolve) => setTimeout(resolve, 2000));
  
  const mockReceipt = generateMockReceipt();
  
  return {
    provider: Platform.OS === 'android' ? 'google' : 'apple',
    receiptOrToken: mockReceipt,
  };
}

/**
 * Mock 영수증 검증 및 잔액 지급
 * 실제 DB에 잔액 업데이트 수행 (Mock 모드지만 실제 DB 업데이트)
 */
export async function mockVerifyAndGrant(payload: VerifyPayload): Promise<VerifyResponse> {
  // 세션 토큰 가져오기
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('로그인이 필요합니다');
  }

  // 상품 정보 조회
  const productInfo = PRODUCT_INFO_MAP[payload.productId];
  if (!productInfo) {
    throw new Error(`알 수 없는 상품 ID: ${payload.productId}`);
  }

  // 실제 DB에 잔액 업데이트 (Mock 모드지만 실제 DB 업데이트는 수행)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('로그인이 필요합니다');
    }

    const { data: balanceData } = await supabase
      .from('user_balances')
      .select('total_purchased, current_balance')
      .eq('user_id', user.id)
      .single();

    // 사용자 이름 조회 (purchases.user_name 저장용): birth_info.name 우선, 없으면 auth user_metadata
    const { data: birthRow } = await supabase
      .from('birth_info')
      .select('name')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const meta = user?.user_metadata;
    const user_name =
      birthRow?.name ??
      (typeof meta?.name === 'string' ? meta.name : null) ??
      (typeof meta?.full_name === 'string' ? meta.full_name : null) ??
      (typeof meta?.user_name === 'string' ? meta.user_name : null) ??
      (typeof meta?.preferred_username === 'string' ? meta.preferred_username : null) ??
      null;

    // 사바 코인 수량 계산 (기본 코인 + 보너스)
    const totalSahaAmount = productInfo.sahaAmount + productInfo.bonusSaha;
    const newTotalPurchased = (balanceData?.total_purchased || 0) + totalSahaAmount;

    // purchases 테이블에 먼저 레코드 생성 (purchase_id가 외래키이므로)
    const { error: purchaseUpsertError } = await supabase
      .from('purchases')
      .upsert({
        id: payload.receiptOrToken,
        user_id: user.id,
        user_name,
        product_name: productInfo.productName,
        saha_amount: productInfo.sahaAmount,
        bonus_saha: productInfo.bonusSaha,
        total_price_minor: productInfo.priceMinor,
        currency: productInfo.currency,
        status: 'completed',
      }, { onConflict: 'id' });

    if (purchaseUpsertError) {
      console.error('[Mock] purchases 테이블 저장 실패:', purchaseUpsertError);
      // purchases 저장 실패해도 잔액은 업데이트 (부분 실패 허용)
    }

    // payments 테이블에 기록
    const purchaseId = payload.receiptOrToken;
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        purchase_id: purchaseId,
        transaction_id: payload.receiptOrToken,
        amount_minor: productInfo.priceMinor, // 결제 금액 (원)
        currency: productInfo.currency,
        provider: payload.provider,
        status: 'approved',
        approved_at: new Date().toISOString(),
      });

    if (paymentError) {
      console.error('[Mock] payments 테이블 저장 실패:', paymentError);
      // payments 저장 실패해도 잔액은 업데이트 (부분 실패 허용)
    }

    // user_balances 업데이트
    if (balanceData) {
      await supabase
        .from('user_balances')
        .update({ total_purchased: newTotalPurchased })
        .eq('user_id', user.id);
    } else {
      await supabase.from('user_balances').insert({
        user_id: user.id,
        total_purchased: totalSahaAmount,
        total_usage: 0,
      });
    }

    // 업데이트된 잔액 조회
    const newBalance = await fetchUserBalance(user.id);

    return {
      status: 'approved',
      currentBalance: newBalance ?? 0,
      purchaseId: payload.receiptOrToken,
      paymentId: payload.receiptOrToken,
    };
  } catch (error) {
    console.error('[Mock] 검증 실패:', error);
    throw error;
  }
}

