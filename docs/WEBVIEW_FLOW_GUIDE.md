# WebView Flow Guide (SAHA Store)

이 문서는 현재 프로젝트 기준으로 WebView 동작 흐름을 `App <--> WebView <--> Web` 관점으로 정리한 가이드입니다.

## 1) 한눈에 보는 구조

```text
[User Tap: Store Tab]
        |
        v
[App (React Native)]
  BottomTabNavigator
        |
        v
[StoreWebViewScreen]
  - URL 결정
  - UA suffix 부착
  - 도메인 화이트리스트
  - 브릿지 메시지 검증
        |
        v
[WebView Engine]
        |
        v
[Web (Next.js Store Page)]
  - UA 앱 감지
  - UI 렌더
  - NativeBridge.call(...)
```

## 2) 기본 로딩 흐름 (화면 관점)

```text
User
  -> App(RN): 상점 탭 클릭
  -> StoreWebViewScreen: WebView 생성
  -> storeWebViewConfig: 환경별 URL 선택
  -> WebView: 페이지 로딩 시작
  -> Web(Next.js): 상점 화면 렌더
  -> User: 상점 UI 확인
```

### 2-1. 요청 종류 2가지

1. 페이지 로딩 요청 (HTTP)

```text
App(RN)
  -> WebView
  -> Web Server(Next.js)
```

- 상점 탭 진입 시 WebView가 URL을 열고 웹 서버에 HTML/CSS/JS를 요청

2. 브릿지 요청 (앱 내부 메시지)

```text
Web(Next.js)
  -> WebView
  -> Native(RN)
```
- 페이지 로드 후 웹이 `NativeBridge.call(...)`로 네이티브 기능 요청

## 3) 통신 흐름 (Web <--> Native)

### 3-1. 방향만 먼저 보기
```text
Request  : Web -> WebView -> Native
Response : Native -> WebView -> Web
```

### 3-2. 상호작용 다이어그램 (텍스트)

```text
[STEP 1] Request 시작
Web
  -> WebView : NativeBridge.call(action, payload)

[STEP 2] Native로 전달
WebView
  -> Native : postMessage(requestJson)

[STEP 3] Native 내부 검증/처리
Native
  -> Native : 출처/스키마/version/timestamp/nonce 검증
  -> Native : action 처리

[STEP 4] Response 반환
Native
  -> WebView : injectJavaScript(responseScript)
WebView
  -> Web : __resolveNativeBridge(response)

[STEP 5] Web 마무리
Web
  -> Web : Promise resolve/reject 후 UI 갱신
```

### 3-3. 함수 매핑표

| 방향 | 주체 | 함수 | 설명 |
|---|---|---|---|
| Web -> WebView | Web | `NativeBridge.call(action, payload)` | 표준 호출 진입점 |
| WebView -> Native | WebView | `window.ReactNativeWebView.postMessage(...)` | RN으로 요청 전달 |
| Native -> WebView | Native | `webViewRef.injectJavaScript(...)` | 응답 스크립트 주입 |
| WebView -> Web | WebView | `window.__resolveNativeBridge(response)` | Promise resolve/reject |

### 3-4. 요청/응답 포맷

요청(request):
```json
{
  "bridge": "saha",
  "version": 1,
  "type": "request",
  "action": "GET_CUSTOMER_CONTEXT",
  "payload": {},
  "callbackId": "cb_xxx",
  "nonce": "n_xxx",
  "timestamp": 1713060000000
}
```

응답(response):
```json
{
  "bridge": "saha",
  "version": 1,
  "type": "response",
  "action": "GET_CUSTOMER_CONTEXT",
  "callbackId": "cb_xxx",
  "ok": true,
  "payload": { "customerName": "홍길동" },
  "timestamp": 1713060000100
}
```

### 3-5. 성공/실패 분기
```text
Web Request
  -> Native 검증 통과?
      YES -> action 실행 -> ok:true 응답 -> UI 반영
      NO  -> ok:false 응답(error.code/message) -> 에러 처리
```

검증 순서:

```text
1) 출처 URL 검증
   event.nativeEvent.url이 허용 도메인인지 확인

2) 메시지 스키마 검증
   bridge/type/callbackId/nonce/action 필수 필드 확인

3) timestamp 검증
   number 여부 + 허용 시간 윈도우(30초) 확인

4) replay 검증
   callbackId+nonce 중복 요청 여부 확인

5) version 검증
   request.version === BRIDGE_VERSION 확인
```

주요 실패 코드:

| 검증 항목 | 실패 코드 | 의미 |
|---|---|---|
| timestamp 타입 오류 | `INVALID_TIMESTAMP` | timestamp 값 형식이 잘못됨 |
| timestamp 만료/시간 불일치 | `STALE_REQUEST` | 너무 오래된 요청 또는 단말 시간 이상 |
| replay 감지 | `DUPLICATE_REQUEST` | 동일 요청 재전송으로 판단 |
| 버전 불일치 | `UNSUPPORTED_VERSION` | 브릿지 버전이 맞지 않음 |

## 4) 브릿지 필요/불필요 구간
브릿지 없이 동작:
- 상점 웹 렌더링
- 카테고리 이동/스크롤
- 카드/폼 UI
- 웹 내부 API 호출 및 쿠키 상태 표시

브릿지 필요:
- `GET_CUSTOMER_CONTEXT`
- `GET_APP_INFO`
- `OPEN_EXTERNAL_URL`
- `TRACK_EVENT`

정리:
- 순수 웹 기능 -> Web 단독 가능
- 앱 정보/OS 연동 -> Native 브릿지 필수

## 5) 보안/안정성 흐름
### 5-1. 네비게이션 보안 흐름
```text
WebView Navigation Request
  -> isAllowedStoreWebViewUrl?
      YES -> WebView 내부 로드 허용
      NO  -> Linking.openURL로 외부 브라우저 분리
```

### 5-2. 메시지 검증 보안 흐름

```text
onMessage 수신
  -> 출처 URL 허용?
      NO  -> 요청 차단
      YES -> 스키마/버전 유효?
              NO  -> 에러 응답
              YES -> timestamp 유효?
                      NO  -> STALE_REQUEST
                      YES -> callbackId+nonce 중복?
                              YES -> DUPLICATE_REQUEST
                              NO  -> action 처리 -> 표준 response envelope 반환
```

핵심 포인트:
- 허용 도메인 제어
- 메시지 출처 재검증
- replay 방어
- 공통 에러 포맷

## 6) 성능/UX 흐름

```text
App Start
  -> Hidden Preloader WebView 선로딩
  -> Store 탭 진입 시 체감 로딩 단축
  -> 웹 스켈레톤 노출
  -> 실패 시 로컬 fallback HTML
```

추가 UX:
- iOS input auto-zoom 방지 (input font-size 16px)
- Android 뒤로가기 시 WebView history 우선

## 7) 코드 위치

- RN 탭 연결: `src/navigation/BottomTabNavigator.tsx`
- RN WebView 핵심: `src/screens/store/StoreWebViewScreen.tsx`
- RN 설정/화이트리스트: `src/screens/store/storeWebViewConfig.ts`
- RN preload: `src/screens/store/StoreWebViewPreloader.tsx`
- Web bridge wrapper: `saha-store-web/src/lib/nativeBridge.ts`
- Web 앱 감지: `saha-store-web/src/hooks/useAppDetection.ts`
- Web 상점 페이지: `saha-store-web/src/app/page.tsx`

## 8) 표준화 스토리 (문제 -> 해결 -> 효과)

### 8-1. 한 줄 요약

기존에는 WebView 통신이 기능별로 달라 운영이 불안정했기 때문에, 통신 규격을 공통 프로토콜로 표준화했다.

### 8-2. 문제 중심 정리

| 어떤 문제가 있었나 | 그래서 어떻게 했나(표준화) | 결과 |
|---|---|---|
| 기능마다 `postMessage` 포맷이 달라서 유지보수가 어려웠다 | `NativeBridge.call(action, payload)` 단일 진입점으로 통일했다 | 신규 기능을 “액션 추가” 중심으로 빠르게 붙일 수 있게 됐다 |
| 응답이 어떤 요청의 결과인지 헷갈렸다 | 요청마다 `callbackId`를 강제하고 Promise 매칭 구조로 통일했다 | 동시 요청에서도 응답 혼선이 줄고 안정성이 올라갔다 |
| 에러 형식이 제각각이라 디버깅이 느렸다 | `ok / error.code / error.message` 공통 응답 규격을 적용했다 | 장애 분석과 예외 처리 로직이 단순해졌다 |
| 신뢰되지 않은 출처에서 브릿지 호출 가능성이 있었다 | 화이트리스트 기반 URL 검증 + 메시지 출처 재검증을 넣었다 | 외부/비허용 도메인에서의 브릿지 오용 위험을 줄였다 |
| 동일 요청 재전송(replay) 방어가 약했다 | `timestamp` 유효성 검사 + `callbackId+nonce` 중복 차단을 추가했다 | 재전송 공격성 요청을 차단할 수 있게 됐다 |

### 8-3. 면접용 문장 템플릿

원래는 WebView 통신이 기능마다 달라서 요청/응답 포맷이 제각각이었고, 동시 요청 매칭과 에러 처리, 보안 검증이 불안정했습니다.  
그래서 저는 `NativeBridge.call` 기반 공통 프로토콜로 표준화하고 `callbackId`, `nonce`, `timestamp`, 공통 에러 규격을 도입했습니다.  
그 결과 기능 추가 리드타임이 줄고, 운영 안정성과 보안 대응력이 함께 개선됐습니다.

### 8-4. 실제 사례 기반 설명

#### 사례 A) 동시 요청 응답 혼선 문제

발생 상황:
- 상점 진입 직후 웹에서 `GET_CUSTOMER_CONTEXT`, `GET_APP_INFO`를 거의 동시에 호출

문제:
- 예전 방식(비표준 postMessage)에서는 응답에 공통 매칭 키가 없어, 어떤 응답이 어떤 요청 결과인지 혼선 가능

표준화 조치:
- 요청마다 `callbackId`를 강제하고, 응답도 동일 `callbackId`를 포함하도록 프로토콜 고정
- 웹에서는 Promise 맵으로 `callbackId` 기준 resolve/reject 처리

개선:
- 동시 요청에서도 응답 매칭 정확도 확보
- “고객명은 들어왔는데 앱 정보가 덮어쓰였다” 같은 혼선성 버그 예방

#### 사례 B) 외부 도메인 브릿지 오용 위험

발생 상황:
- 웹뷰 내 링크로 비허용 외부 도메인 이동 시도 또는 악성 페이지에서 브릿지 호출 시도

문제:
- 출처 검증이 약하면 비신뢰 페이지에서도 네이티브 액션 호출 가능성

표준화 조치:
- `onShouldStartLoadWithRequest`에서 허용 도메인만 WebView 내부 로드
- 비허용 URL은 `Linking.openURL`로 외부 브라우저 분리
- `onMessage` 수신 시에도 출처 URL을 다시 검증

개선:
- 브릿지 호출 가능한 신뢰 범위를 명확히 제한
- 피싱/오용 시나리오에 대한 방어력 향상

#### 사례 C) 재전송(replay) 요청 문제

발생 상황:
- 동일 메시지가 네트워크/클라이언트 이슈 또는 공격성 재전송으로 반복 유입

문제:
- 같은 요청이 여러 번 처리되면 중복 이벤트 기록, 중복 액션 실행 위험

표준화 조치:
- `timestamp` 유효성 검사(허용 시간 윈도우)
- `callbackId + nonce` 중복 캐시로 replay 차단

개선:
- 오래된/중복 요청을 조기에 차단
- 운영 로그 노이즈와 중복 처리 리스크 감소

### 8-5. 면접용 스토리텔링 (그대로 말해도 되는 버전)

초반에는 상점 WebView 기능을 빠르게 붙이느라 통신을 기능별 `postMessage`로 개별 구현했습니다.  
이후 운영 관점에서 문제가 드러났습니다. 요청/응답 포맷이 기능마다 달라 유지보수가 어려웠고, 동시 요청 시 응답 매칭 혼선 가능성이 있었습니다.  
또 에러 포맷이 제각각이라 디버깅 비용이 컸고, WebView 특성상 출처 검증과 replay 방어가 부족하면 보안 리스크도 있었습니다.

그래서 통신을 기능 코드가 아니라 프로토콜로 바꾸는 방향으로 표준화를 진행했습니다.  
웹 호출을 `NativeBridge.call(action, payload)`로 통일하고, 요청/응답 envelope를 공통 규격으로 고정했습니다.  
`callbackId`로 요청-응답 매칭을 강제했고, `ok / error.code / error.message`로 에러 응답 형식을 통일했습니다.  
보안은 허용 도메인 화이트리스트, 메시지 출처 재검증, `timestamp + callbackId+nonce` 기반 replay 차단으로 공통 검증 파이프라인을 만들었습니다.

그 결과 신규 기능은 통신 구조를 다시 짜는 대신 액션 추가 중심으로 개발할 수 있게 되었고, 장애 분석 속도와 운영 안정성도 개선됐습니다.  
결론적으로 저는 WebView를 단순 연동한 것이 아니라, 팀이 계속 확장할 수 있는 통신 표준을 구축했습니다.
