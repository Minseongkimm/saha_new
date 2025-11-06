// 클라이언트 인앱결제(IAP) 구현
// - getProducts: 스토어 상품 조회
// - startPurchase: 결제 시작(영수증/토큰 획득)
// - finalizePurchase: 서버 검증 요청
import { Platform } from 'react-native';
import {
  initConnection,
  fetchProducts,
  requestPurchase,
  finishTransaction,
  purchaseErrorListener,
  purchaseUpdatedListener,
  type Product as RNIAPProduct,
  type Purchase,
  ErrorCode,
} from 'react-native-iap';
import { Product, Provider, VerifyPayload, VerifyResponse } from './types';
import { verifyAndGrant } from './serverApi';
import { USE_MOCK_IAP } from '../../config/env';
import { PRODUCT_IDS, getProductIdFromAmount as getProductIdFromAmountConst, PRODUCT_INFO_MAP } from '../../constants/payments';
import { getMockProducts, startMockPurchase } from './mockIap';

// IAP 초기화 여부
let isIAPInitialized = false;

/**
 * IAP 초기화 (앱 시작 시 1회 호출)
 */
export async function initIAP(): Promise<void> {
  if (isIAPInitialized) {
    return;
  }

  // Mock 모드에서는 실제 초기화 건너뛰기
  if (USE_MOCK_IAP) {
    isIAPInitialized = true;
    return;
  }

  try {
    await initConnection();
    isIAPInitialized = true;
  } catch (error) {
    console.error('IAP 초기화 실패:', error);
    throw error;
  }
}
/**
 * 스토어 상품 조회
 * Android/iOS 동일한 코드로 작동
 */
export async function getProductsFromStore(): Promise<Product[]> {
  if (!isIAPInitialized) {
    await initIAP();
  }

  // Mock 모드에서는 Mock 데이터 반환
  if (USE_MOCK_IAP) {
    return getMockProducts();
  }

  try {
    const products = await fetchProducts({ skus: PRODUCT_IDS });
    if (!products) {
      return [];
    }

    // react-native-iap의 Product를 우리의 Product 타입으로 변환
    return products.map((product) => {
      // 가격을 minor currency unit으로 변환
      // displayPrice는 "₩1,000" 형식이므로 숫자만 추출
      // 또는 product.price를 사용 (이미 숫자일 수 있음)
      const priceString = product.displayPrice || '0';
      // 통화 기호와 쉼표 제거 후 숫자 추출
      const priceNumber = parseFloat(priceString.replace(/[^\d.]/g, '')) || 0;
      // price가 있으면 사용, 없으면 파싱한 값 사용
      const priceMinor = product.price ? Math.round(product.price) : Math.round(priceNumber);
      
      return {
        storeProductId: product.id,
        title: product.title || product.id,
        description: product.description,
        priceMinor,
        currency: product.currency || 'KRW',
        sahaAmount: parseSahaAmountFromProductId(product.id),
        bonusSaha: getBonusSahaAmount(product.id),
      };
    });
  } catch (error) {
    console.error('상품 조회 실패:', error);
    throw error;
  }
}

/**
 * 결제 시작
 * Android/iOS 동일한 코드로 작동
 */
export async function startPurchase(productId: string): Promise<{ provider: Provider; receiptOrToken: string }> {
  if (!isIAPInitialized) {
    await initIAP();
  }

  // Mock 모드에서는 Mock 결제 로직 사용
  if (USE_MOCK_IAP) {
    return startMockPurchase(productId);
  }

  try {
    // 결제 요청 (플랫폼별로 다른 파라미터 구조)
    await requestPurchase({
      type: 'in-app',
      request: Platform.OS === 'android' 
        ? {
            android: {
              skus: [productId],
            },
          }
        : {
            ios: {
              sku: productId,
            },
          },
    });

    // 결제 완료 대기 (purchaseUpdatedListener에서 처리)
    return new Promise((resolve, reject) => {
      const purchaseUpdateSubscription = purchaseUpdatedListener(
        async (purchase: Purchase) => {
          try {
            // purchaseToken은 Android/iOS 모두 통합 필드로 제공됨
            const receiptOrToken = purchase.purchaseToken || '';

            // 거래 완료 처리 (중복 결제 방지)
            await finishTransaction({ purchase });

            // 구독 취소
            purchaseUpdateSubscription.remove();

            resolve({
              provider: Platform.OS === 'android' ? 'google' : 'apple',
              receiptOrToken,
            });
          } catch (error) {
            purchaseUpdateSubscription.remove();
            reject(error);
          }
        }
      );

      // 에러 리스너
      const purchaseErrorSubscription = purchaseErrorListener((error) => {
        purchaseUpdateSubscription.remove();
        purchaseErrorSubscription.remove();
        
        if (error.code === ErrorCode.UserCancelled) {
          reject(new Error('사용자가 결제를 취소했습니다'));
        } else {
          reject(error);
        }
      });

      // 타임아웃 (30초)
      setTimeout(() => {
        purchaseUpdateSubscription.remove();
        purchaseErrorSubscription.remove();
        reject(new Error('결제 시간이 초과되었습니다'));
      }, 30000);
    });
  } catch (error) {
    console.error('결제 시작 실패:', error);
    throw error;
  }
}

/**
 * 서버 검증 및 잔액 지급
 */
export async function finalizePurchase(payload: VerifyPayload): Promise<VerifyResponse> {
  return verifyAndGrant(payload);
}

/**
 * 상품 ID에서 사바 코인 수량 추출
 * 예: "com.saha.ai.coin_10" → 10
 */
function parseSahaAmountFromProductId(productId: string): number {
  const productInfo = PRODUCT_INFO_MAP[productId];
  return productInfo?.sahaAmount || 0;
}

/**
 * 보너스 코인 계산
 */
function getBonusSahaAmount(productId: string): number | undefined {
  const productInfo = PRODUCT_INFO_MAP[productId];
  return productInfo?.bonusSaha || undefined;
}

// 기존 함수 호환성 유지 (export getProducts)
export { getProductsFromStore as getProducts };

/**
 * 충전 금액(원)을 상품 ID로 변환
 * @param amount 충전 금액 (예: 1100, 3300, 5500, 11000)
 * @returns 상품 ID (예: 'com.saha.ai.coin_10')
 */
export function getProductIdFromAmount(amount: number): string | null {
  return getProductIdFromAmountConst(amount);
}


