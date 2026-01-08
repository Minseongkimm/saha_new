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
  consumePurchase,
  getAvailablePurchases,
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
const ANDROID_PURCHASE_TIMEOUT_MS = 30000;

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
    
    if (!products || products.length === 0) {
      console.error('IAP 상품 조회 실패');
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
 * Android의 경우 서버 검증 후 finishTransaction을 호출해야 하므로 Purchase 객체도 반환
 */
export async function startPurchase(productId: string): Promise<{ 
  provider: Provider; 
  receiptOrToken: string;
  purchase?: Purchase; // 서버 검증 후 finishTransaction을 위해 저장
}> {
  if (!isIAPInitialized) {
    await initIAP();
  }

  // Mock 모드에서는 Mock 결제 로직 사용
  if (USE_MOCK_IAP) {
    return startMockPurchase(productId);
  }

  // Android에서 기존 미소비 구매가 남아 있으면 먼저 소비 후 진행
  // Mock 모드가 아닐 때만 실행 (실기기에서만 필요)
  if (Platform.OS === 'android') {
    await consumePendingAndroidPurchases();
  }

  // 상품 존재 확인 (결제 전에 상품이 있는지 확인)
  const availableProducts = await fetchProducts({ skus: [productId] });
  const productCount = availableProducts?.length ?? 0;
  
  if (!availableProducts || productCount === 0) {
    console.error('IAP 상품을 찾을 수 없음:', productId);
    throw new Error(`상품을 찾을 수 없습니다: ${productId}`);
  }

  // 리스너를 먼저 등록하고, 결제 요청을 나중에 수행
  // (결제 완료 이벤트가 빠르게 발생해도 놓치지 않도록)
  return new Promise((resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let isResolved = false;
    
    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      purchaseUpdateSubscription.remove();
      purchaseErrorSubscription.remove();
    };
    
    // 결제 완료 리스너 (먼저 등록)
    const purchaseUpdateSubscription = purchaseUpdatedListener(
      async (purchase: Purchase) => {
        if (isResolved) return;
        isResolved = true;
        
        try {
          // purchaseToken은 Android/iOS 모두 통합 필드로 제공됨
          const receiptOrToken = purchase.purchaseToken || '';

          // iOS는 즉시 finishTransaction 호출 (서버 검증과 무관)
          // Android는 서버 검증 후 finishTransaction 호출해야 함 (소모품 소비)
          if (Platform.OS === 'ios') {
            await finishTransaction({ purchase });
          }

          cleanup();

          resolve({
            provider: Platform.OS === 'android' ? 'google' : 'apple',
            receiptOrToken,
            purchase: Platform.OS === 'android' ? purchase : undefined, // Android만 Purchase 객체 저장
          });
        } catch (error) {
          console.error('IAP 결제 완료 처리 중 오류:', error);
          cleanup();
          reject(error);
        }
      }
    );

    // 에러 리스너 (먼저 등록)
    const purchaseErrorSubscription = purchaseErrorListener((error) => {
      if (isResolved) return;
      isResolved = true;
      
      if (error.code !== ErrorCode.UserCancelled) {
        console.error('IAP 결제 에러:', error.message);
      }
      cleanup();
      
      if (error.code === ErrorCode.UserCancelled) {
        reject(new Error('사용자가 결제를 취소했습니다'));
      } else {
        reject(error);
      }
    });

    // 타임아웃 (30초) - 업계 표준
    timeoutId = setTimeout(() => {
      if (isResolved) return;
      isResolved = true;
      
      console.error('IAP 결제 타임아웃');
      cleanup();
      reject(new Error('결제 시간이 초과되었습니다'));
    }, ANDROID_PURCHASE_TIMEOUT_MS);

    // 리스너 등록 후 결제 요청 수행
    requestPurchase({
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
    }).catch((error) => {
      if (isResolved) return;
      isResolved = true;
      
      console.error('결제 시작 실패:', error);
      cleanup();
      reject(error);
    });
  })
}

/**
 * 서버 검증 및 잔액 지급
 * Android의 경우 서버 검증 성공 후 finishTransaction 호출 (소모품 소비)
 * 서버 검증 실패 시에도 구매를 소비하여 재구매 가능하도록 함
 */
export async function finalizePurchase(
  payload: VerifyPayload,
  purchase?: Purchase
): Promise<VerifyResponse> {
  let verifyResult: VerifyResponse | null = null;
  let verifyError: unknown = null;
  const shouldConsume = Platform.OS === 'android' && Boolean(purchase?.purchaseToken);
  try {
    verifyResult = await verifyAndGrant(payload);
  } catch (error) {
    verifyError = error;
  }
  if (shouldConsume && purchase?.purchaseToken) {
    try {
      await consumePurchase(purchase.purchaseToken);
      await finishTransaction({ purchase });
    } catch (error) {
      console.error('Android 구매 소비 실패:', error);
    }
  }
  if (verifyError) {
    if (verifyError instanceof Error) {
      throw verifyError;
    }
    throw new Error('결제 검증 중 알 수 없는 오류가 발생했습니다.');
  }
  if (!verifyResult) {
    throw new Error('결제 검증 결과가 비어 있습니다.');
  }
  return verifyResult;
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

/**
 * Android에서 남아 있는 미소비 구매를 모두 소비 처리하여
 * "이미 구매한 상품입니다" 오류를 방지
 */
async function consumePendingAndroidPurchases(): Promise<void> {
  try {
    type IapModule = typeof import('react-native-iap') & {
      flushFailedPurchasesCachedAsPendingAndroid?: () => Promise<void>;
    };
    const iapModule: IapModule = await import('react-native-iap');
    const flushFn = iapModule.flushFailedPurchasesCachedAsPendingAndroid;
    if (flushFn) {
      await flushFn();
    }
    const purchases = await getAvailablePurchases();
    if (!purchases || purchases.length === 0) {
      return;
    }
    for (const availablePurchase of purchases) {
      if (!availablePurchase.purchaseToken) {
        continue;
      }
      try {
        await consumePurchase(availablePurchase.purchaseToken);
        await finishTransaction({ purchase: availablePurchase });
      } catch (error) {
        console.error('미소비 구매 소비 실패:', error);
      }
    }
  } catch (error) {
    console.error('미소비 구매 조회 실패:', error);
  }
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


