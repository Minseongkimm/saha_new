# verify-iap 테스트 가이드 (user_name 포함)

## 1. Mock IAP로 빠르게 확인 (앱 개발 빌드)

`user_name`이 **birth_info 없이 user_metadata**에서 채워지는지 확인하려면:

1. **앱을 디버그(개발) 빌드**로 실행 (`USE_MOCK_IAP = __DEV__` → true)
2. **birth_info에 이름을 저장하지 않은 계정**으로 로그인 (소셜 로그인만 한 상태)
3. 앱에서 **사바 충전** → Mock 결제 진행
4. **Supabase Dashboard** → Table Editor → `purchases` 테이블에서 방금 생긴 행의 `user_name` 확인
   - Mock 경로는 `src/utils/payments/mockIap.ts`를 타므로, 여기서도 동일한 폴백(name → full_name → user_name → preferred_username) 적용됨

이렇게 하면 **실제 스토어/verify-iap를 타지 않고** 같은 로직이 적용되는지 확인할 수 있음.

---

## 2. verify-iap 호출해 보기 (인증·파싱까지)

### A. 배포된 함수 URL로 테스트 (Docker 불필요)

```bash
# 유저 액세스 토큰만 넣으면 됨 (앱 로그인 후 session.access_token)
export USER_TOKEN="your_user_access_token_here"
VERIFY_IAP_URL="https://tdzkgyixpthhzzcfnotu.supabase.co/functions/v1/verify-iap" \
  ./scripts/test-verify-iap.sh
```

- **유저 토큰 얻는 법**: 앱에서 로그인 후 `supabase.auth.getSession()` → `session.access_token` 복사. 또는 Supabase Dashboard → Authentication → 사용자 → 토큰 재발급.
- anon 키로 호출하면 **401 Unauthorized** (정상 동작).

### B. 로컬에서 함수 서빙 후 테스트 (Docker 필요)

```bash
# 터미널 1: Docker Desktop 켠 뒤
supabase functions serve verify-iap

# 터미널 2
USER_TOKEN="your_user_access_token" ./scripts/test-verify-iap.sh
```

- 이 요청은 **영수증 검증(Apple/Google)** 단계에서 실패할 수 있지만, **인증 통과 → 본문 파싱 → provider 분기**까지는 확인 가능.

---

## 3. 실제/샌드박스 결제 후 DB로 확인 (실서비스 검증)

1. **verify-iap 배포**
   ```bash
   npx supabase functions deploy verify-iap
   ```
2. 앱을 **릴리스(또는 테스트플라이트/내부테스트) 빌드**로 설치 (`USE_MOCK_IAP = false`)
3. **birth_info에 이름이 없는 계정**으로 **실제 또는 샌드박스 인앱결제** 1건 진행
4. **Supabase Dashboard** → `purchases` 테이블에서 해당 행의 `user_name`이 채워졌는지 확인

이렇게 하면 **실제 결제 플로우 전체**가 verify-iap를 타고, `birth_info` 없을 때 `auth.admin.getUserById` → `user_metadata` 폴백이 적용되는지 확인할 수 있음.

---

## 4. 요약

| 방법 | 확인하는 것 | 난이도 |
|------|-------------|--------|
| Mock IAP + 앱 | user_name 폴백 로직(mockIap 쪽) | 쉬움 |
| 로컬 serve + curl | verify-iap 인증·라우팅·파싱 | 보통 |
| 실제/샌드박스 결제 + DB | verify-iap 전체 + user_name 저장 | 실제 결제 필요 |

**제대로 됐는지** 보려면:  
- 빠른 검증 → **1번(Mock IAP) + purchases 테이블**  
- 실서비스 검증 → **3번(실제/샌드박스 결제 후 DB)**  
- 배포 전 스모크 테스트 → **2번(로컬 curl)**
