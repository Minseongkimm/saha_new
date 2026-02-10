#!/usr/bin/env bash
# verify-iap 로컬 호출 테스트 (인증·파싱 확인용)
# 사용: USER_TOKEN=<유저_액세스_토큰> ./scripts/test-verify-iap.sh
# USER_TOKEN은 앱 로그인 후 supabase.auth.getSession() → session.access_token

set -e
BASE_URL="${VERIFY_IAP_URL:-http://localhost:54321/functions/v1/verify-iap}"
TOKEN="${USER_TOKEN:?USER_TOKEN 필요 (앱 로그인 후 session.access_token)}"

curl -s -w "\n\nHTTP_CODE:%{http_code}\n" -X POST "$BASE_URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"provider":"apple","receiptOrToken":"test-receipt-local","productId":"com.saha.ai.coin_10_v1"}'
