// 클라이언트 인앱결제(IAP) 스켈레톤
// - getProducts: 스토어 상품 조회
// - startPurchase: 결제 시작(영수증/토큰 획득)
// - finalizePurchase: 서버 검증 요청
import { Product, Provider, VerifyPayload, VerifyResponse } from './types';
import { verifyAndGrant } from './serverApi';

// Skeleton for wiring react-native-iap (or platform SDK) later.

export async function getProducts(): Promise<Product[]> {
  // TODO: Integrate react-native-iap getProducts.
  return [];
}

export async function startPurchase(productId: string): Promise<{ provider: Provider; receiptOrToken: string; }>{
  // TODO: Integrate react-native-iap requestPurchase / consume flows.
  void productId;
  return { provider: 'apple', receiptOrToken: '' };
}

export async function finalizePurchase(payload: VerifyPayload): Promise<VerifyResponse> {
  return verifyAndGrant(payload);
}


