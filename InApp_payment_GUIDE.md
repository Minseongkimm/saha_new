# 인앱결제 구현 가이드

## 📋 전체 결제 플로우

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 사용자 충전 버튼 클릭                                       │
│    (1,100원 / 3,300원 / 5,500원 / 11,000원)                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. handleChargeFlow(amount) 호출                             │
│    - getProductIdFromAmount(amount) → 상품 ID 변환           │
│      예: 1,100원 → com.saha.ai.coin_10                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. startPurchase(productId) → 스토어 결제 화면 표시           │
│    📱 iOS: App Store In-App Purchase                        │
│       - react-native-iap의 requestPurchase() 호출          │
│       - 사용자가 결제 완료하면 JWS(JSON Web Signature) 획득   │
│    🤖 Android: Google Play Billing (현재 미지원)              │
│    🧪 Mock 모드: UUID 형식의 Mock 영수증 생성                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. finalizePurchase() → 서버 검증 요청                       │
│    - verifyAndGrant() 호출 (Edge Function 통신)             │
│    - Mock 모드: mockVerifyAndGrant() 직접 호출              │
│    - 실제 모드: Edge Function API 호출                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Edge Function: verify-iap 검증                            │
│    📱 iOS (실제 모드):                                        │
│       - generateAppleJWT() → JWT 토큰 생성                  │
│         (Key ID, Issuer ID, Private Key 사용)               │
│       - App Store Server API 호출                           │
│         GET /inApps/v1/transactions/{transactionId}          │
│       - JWS 디코딩하여 Transaction 정보 확인                │
│       - 취소/만료 상태 체크                                   │
│    🧪 Mock 모드:                                              │
│       - PRODUCT_INFO_MAP에서 상품 정보 조회                  │
│       - UUID 영수증으로 검증 (실제 검증 생략)                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. 중복 결제 체크                                             │
│    - payments 테이블에서 purchase_id 조회                   │
│    - 이미 존재하면 실패 처리                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. 서버에서 잔액 업데이트                                     │
│    - purchases 테이블에 구매 기록 저장 (upsert)              │
│      * id: transactionId                                     │
│      * saha_amount: 기본 사바                                │
│      * bonus_saha: 보너스 사바                               │
│      * total_price_minor: 실제 결제 금액 (원)                │
│    - payments 테이블에 결제 기록 저장                        │
│      * purchase_id: purchases.id 참조                        │
│      * amount_minor: 실제 결제 금액 (원)                     │
│      * provider: 'apple' 또는 'google'                      │
│    - user_balances.total_purchased 증가                      │
│      * totalSaha (기본 + 보너스)만큼 증가                   │
│    - current_balance 자동 계산 (DB Trigger)                   │
│    - 서버에서 새 잔액 반환                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. 클라이언트 잔액 확인                                      │
│    - verifyResult.currentBalance 사용 (서버 반환값)         │
│    - null/undefined인 경우 300ms 후 재조회                   │
│    - getTotalSahaFromProductId()로 총 사바 개수 계산         │
│    - Alert.alert('충전 완료', '{totalSaha} 사바가 충전되었습니다.')│
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 9. UI 갱신                                                  │
│    - onSuccess(newBalance) 콜백 호출                         │
│    - ChatRoomScreen / MyInfoScreen 잔액 자동 갱신            │
└─────────────────────────────────────────────────────────────┘
```

## ✅ 완료된 작업

1. **클라이언트 구현**
   - IAP 초기화 및 상품 조회 (`iapClient.ts`)
   - 결제 플로우 (`chargeFlow.ts`)
   - 상품 정보 상수화 (`constants/payments.ts`)
   - Mock IAP 로직 분리 (`mockIap.ts`)

2. **서버 구현**
   - Edge Function: `verify-iap` 완성
   - Apple App Store Server API 연동 구현
     - JWT 토큰 생성 (ES256 서명)
     - Transaction 정보 조회 API 호출
     - JWS 검증 및 상태 확인
   - Mock 검증 로직 구현
   - 중복 결제 체크
   - DB 잔액 업데이트 (purchases, payments, user_balances)

3. **테스트**
   - Mock 모드 테스트 완료
   - DB 잔액 업데이트 정상 동작 확인
   - 총 사바 개수 (기본 + 보너스) 정확히 반영 확인

## 📋 다음 단계

### 1. 실제 스토어 테스트 준비

**iOS (App Store Connect)**
- ✅ 상품 등록 완료 (4개)
- ⏳ Sandbox 테스트 계정 생성
- ⏳ 실제 기기에서 Sandbox 테스트

**Android (Google Play Console)**
- ⏳ 상품 등록 (4개)
- ⏳ 내부 테스트 트랙 설정
- ⏳ 실제 기기에서 테스트

### 2. Edge Function 배포 및 환경 변수 설정

**Apple Key 생성 (App Store Connect)**
1. App Store Connect → Users and Access → Keys
2. "In-App Purchase" 권한이 있는 Key 생성
3. Key ID와 Issuer ID 확인
4. Private Key 다운로드 (.p8 파일)

**Supabase 환경 변수 설정**
1. Supabase Dashboard → Edge Functions → verify-iap → Settings → Secrets
2. 다음 3개 환경 변수 추가:

```bash
APPLE_KEY_ID=your_key_id        # 예: ABC123XYZ (Key ID)
APPLE_ISSUER_ID=your_issuer_id  # 예: 12345678-1234-1234-1234-123456789012 (Issuer ID)
APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
(여기에 .p8 파일의 전체 내용을 붙여넣기)
-----END PRIVATE KEY-----
```

**⚠️ 주의사항**
- `.p8` 파일은 **절대 Git에 커밋하지 않음** (`.gitignore`에 추가됨)
- Private Key는 **한 번만 다운로드 가능** (분실 시 새로 생성 필요)
- 로컬에는 안전한 위치에 보관 (예: `~/Documents/keys/`)
- Supabase에는 환경 변수로만 저장 (파일 업로드 불가)

**Edge Function 배포**
```bash
npx supabase functions deploy verify-iap
```

**구현 완료된 기능**
- ✅ Apple App Store Server API 연동
- ✅ JWT 토큰 생성 (ES256 서명)
- ✅ Transaction 정보 조회 및 검증
- ✅ 취소/만료 상태 확인
- ⏳ Google Play Developer API (Android 개발자 승인 대기)

### 3. 상품 정보

현재 상품 정보는 `src/constants/payments.ts`에서 중앙 관리:
- `com.saha.ai.coin_10`: 10 사바 + 2 보너스 (1,100원)
- `com.saha.ai.coin_30`: 30 사바 + 5 보너스 (3,300원)
- `com.saha.ai.coin_50`: 50 사바 + 10 보너스 (5,500원)
- `com.saha.ai.coin_100`: 100 사바 + 15 보너스 (11,000원)

## 🔧 주요 파일

- `src/constants/payments.ts`: 상품 정보 상수
- `src/utils/payments/iapClient.ts`: IAP 클라이언트
- `src/utils/payments/chargeFlow.ts`: 결제 플로우
- `src/utils/payments/serverApi.ts`: 서버 API 래퍼
- `supabase/functions/verify-iap/index.ts`: 영수증 검증

## 📝 참고

- **Mock 모드**: `USE_MOCK_IAP=true` (개발 환경에서 자동 활성화)
  - 실제 스토어 연결 없이 테스트 가능
  - UUID 형식의 Mock 영수증 생성
  - DB 업데이트는 실제와 동일하게 동작

- **실제 모드**: `USE_MOCK_IAP=false` (프로덕션 환경)
  - Apple: App Store Server API 사용
  - Google: 미지원 (개발자 승인 대기)

- **상품 정보 동기화**
  - 클라이언트: `src/constants/payments.ts`
  - Edge Function: `supabase/functions/verify-iap/index.ts` 내부 PRODUCT_INFO_MAP
  - ⚠️ 상품 정보 변경 시 두 파일 모두 업데이트 필요

## 🔑 주요 상품 정보

| 상품 ID | 기본 사바 | 보너스 사바 | 총 사바 | 가격 |
|---------|----------|-----------|---------|------|
| `com.saha.ai.coin_10` | 10 | 2 | 12 | 1,100원 |
| `com.saha.ai.coin_30` | 30 | 5 | 35 | 3,300원 |
| `com.saha.ai.coin_50` | 50 | 10 | 60 | 5,500원 |
| `com.saha.ai.coin_100` | 100 | 15 | 115 | 11,000원 |
