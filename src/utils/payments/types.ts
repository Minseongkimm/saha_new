// 결제/IAP 관련 공통 타입 정의
// - 제품, 검증 요청/응답, 잔액 응답 등
export type Provider = 'apple' | 'google';

export interface Product {
  storeProductId: string;
  title: string;
  description?: string;
  priceMinor: number; // minor currency unit (e.g., KRW won, no decimals)
  currency: string;   // ISO 4217, e.g., 'KRW'
  sahaAmount: number;
  bonusSaha?: number;
}

export interface VerifyPayload {
  provider: Provider;
  receiptOrToken: string; // Apple JWS / Google purchaseToken
  productId: string;      // store product id
  amountMinor?: number;
  currency?: string;
}

export interface VerifyResponse {
  status: 'approved' | 'pending' | 'failed' | 'refunded';
  currentBalance: number;
  purchaseId?: string;
  paymentId?: string;
  message?: string;
}

export interface BalanceResponse {
  currentBalance: number;
}

// Payment history
export type PaymentTransactionType = 'charge' | 'use';

export interface PaymentTransaction {
  id: string;
  amount: number;
  type: PaymentTransactionType;
  description: string;
  created_at: string;
  status: 'success' | 'pending' | 'failed';
}


