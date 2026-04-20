# WebView Bridge Security And Token Flow

## 1. Security baseline in this project

- `StoreWebViewScreen`에서 `originWhitelist` + `onShouldStartLoadWithRequest`로 허용 도메인만 WebView 내부 로드
- 허용되지 않은 URL은 WebView 렌더를 차단하고 외부 브라우저 핸들러로 분리
- `onMessage` 수신 시 `event.nativeEvent.url`이 화이트리스트인지 다시 검증

핵심 파일:
- `src/screens/store/storeWebViewConfig.ts`
- `src/screens/store/StoreWebViewScreen.tsx`

## 2. Message protocol (current)

웹 -> 네이티브 요청 envelope:

```json
{
  "bridge": "saha",
  "version": 1,
  "type": "request",
  "action": "GET_CUSTOMER_CONTEXT",
  "payload": {},
  "callbackId": "cb_...",
  "nonce": "n_...",
  "timestamp": 1713060000000
}
```

네이티브 -> 웹 응답 envelope:

```json
{
  "bridge": "saha",
  "version": 1,
  "type": "response",
  "action": "GET_CUSTOMER_CONTEXT",
  "callbackId": "cb_...",
  "ok": true,
  "payload": { "customerName": "홍길동" },
  "timestamp": 1713060000100
}
```

## 3. Replay prevention logic

네이티브에서 다음 검증을 수행:

1. `timestamp` 유효성 확인 (number)
2. 현재 시간과 요청 시간 차이가 `30초`를 넘으면 거절 (`STALE_REQUEST`)
3. `callbackId + nonce`를 단기 캐시에 저장
4. 동일 키가 재수신되면 거절 (`DUPLICATE_REQUEST`)
5. 캐시는 TTL(`3분`)과 최대 사이즈(`300`)로 관리

## 4. Token delivery flow (interview answer template)

1. 앱 로그인 후 네이티브가 서버에서 세션 토큰/JWT를 발급받음
2. 토큰은 네이티브 보안 저장소(Keychain/Keystore)에 저장
3. WebView 진입 시 토큰 원문을 URL query로 전달하지 않음
4. 웹이 필요한 시점에 브릿지 액션으로 "세션 필요" 요청
5. 네이티브는 출처 검증(도메인/프로토콜) 후 단기 세션값 또는 서버 교환용 one-time code만 전달
6. 웹은 해당 값으로 백엔드 API 호출, 서버가 최종 세션 쿠키(`HttpOnly`, `Secure`, `SameSite`) 발급
7. 이후 인증은 쿠키 기반으로 처리하고, 토큰 원문 노출을 최소화

## 5. Why this design

- URL/LocalStorage에 민감 토큰이 남는 경로를 줄임
- 브릿지 요청 재전송 공격(replay)에 대한 최소 방어선 확보
- 허용 도메인 외 페이지에서 브릿지 호출 시도를 차단
- 액션/버전 중심으로 프로토콜을 고정해 기능 확장 시 회귀 리스크 감소
