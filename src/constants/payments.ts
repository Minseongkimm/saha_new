/**
 * 인앱결제 상품 정보 상수
 * 모든 상품 정보를 중앙에서 관리
 * 
 * ⚠️ Edge Function 동기화 주의:
 * supabase/functions/verify-iap/index.ts의 PRODUCT_INFO_MAP과 동기화 필요
 * 상품 정보 변경 시 이 파일을 먼저 수정하고, Edge Function에도 동일하게 반영
 */

export interface ChargeOption {
  id: number; // 금액 (원)
  sahaAmount: number; // 기본 사바 코인
  bonusSaha: number; // 보너스 사바 코인
  priceMinor: number; // 가격 (원)
  productId: string; // App Store Connect 제품 ID
  chip?: 'hot' | 'best' | null; // UI 표시용 칩
}

export interface ProductInfo {
  productId: string;
  productName: string;
  sahaAmount: number;
  bonusSaha: number;
  totalSaha: number;
  priceMinor: number; // 원 단위
  currency: string;
}

/**
 * 충전 옵션 목록 (UI 표시용)
 */
export const CHARGE_OPTIONS: ChargeOption[] = [
  { id: 1100, sahaAmount: 10, bonusSaha: 2, priceMinor: 1100, productId: 'com.saha.ai.coin_10_v1', chip: null },
  { id: 3300, sahaAmount: 30, bonusSaha: 6, priceMinor: 3300, productId: 'com.saha.ai.coin_30_v1', chip: 'hot' },
  { id: 5500, sahaAmount: 50, bonusSaha: 12, priceMinor: 5500, productId: 'com.saha.ai.coin_50_v1', chip: null },
  { id: 11000, sahaAmount: 100, bonusSaha: 25, priceMinor: 11000, productId: 'com.saha.ai.coin_100_v1', chip: 'best' },
  { id: 33000, sahaAmount: 300, bonusSaha: 100, priceMinor: 33000, productId: 'com.saha.ai.coin_300_v1', chip: 'best' },
];

/**
 * 상품 ID별 상세 정보
 */
export const PRODUCT_INFO_MAP: Record<string, ProductInfo> = {
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

/**
 * 금액(원)을 상품 ID로 변환
 */
export const AMOUNT_TO_PRODUCT_ID: Record<number, string> = {
  1100: 'com.saha.ai.coin_10_v1',
  3300: 'com.saha.ai.coin_30_v1',
  5500: 'com.saha.ai.coin_50_v1',
  11000: 'com.saha.ai.coin_100_v1',
  33000: 'com.saha.ai.coin_300_v1',
};

/**
 * 모든 상품 ID 목록
 */
export const PRODUCT_IDS: string[] = [
  'com.saha.ai.coin_10_v1',
  'com.saha.ai.coin_30_v1',
  'com.saha.ai.coin_50_v1',
  'com.saha.ai.coin_100_v1',
  'com.saha.ai.coin_300_v1',
];

/**
 * 상품 ID로 총 사바 개수 조회 (기본 + 보너스)
 */
export function getTotalSahaFromProductId(productId: string): number {
  const productInfo = PRODUCT_INFO_MAP[productId];
  return productInfo?.totalSaha || 0;
}

/**
 * 상품 ID로 기본 사바 개수 조회
 */
export function getSahaAmountFromProductId(productId: string): number {
  const productInfo = PRODUCT_INFO_MAP[productId];
  return productInfo?.sahaAmount || 0;
}

/**
 * 상품 ID로 보너스 사바 개수 조회
 */
export function getBonusSahaFromProductId(productId: string): number {
  const productInfo = PRODUCT_INFO_MAP[productId];
  return productInfo?.bonusSaha || 0;
}

/**
 * 금액(원)으로 상품 ID 조회
 */
export function getProductIdFromAmount(amount: number): string | null {
  return AMOUNT_TO_PRODUCT_ID[amount] || null;
}

