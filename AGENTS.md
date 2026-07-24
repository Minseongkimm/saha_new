# SAHA Agent Guide

이 문서는 Codex, Claude 등 AI 코딩 에이전트가 SAHA 프로젝트를 빠르게 이해하고 작업하기 위한 공용 안내서다. 작업 전 이 파일과 `docs/CODEX_STATE.md`를 먼저 확인한다.

## 기본 응답 방식

- 사용자는 한국어를 선호한다.
- 답변은 짧고 핵심 위주로 한다.
- 사용자가 "기획"이라고 말하면 코딩하지 말고 설계와 방향만 정리한다.
- 사용자가 명확히 구현을 요청하면 필요한 파일을 읽고 바로 수정한다.
- 불확실하면 먼저 현재 코드 구조를 확인하고 말한다.

## 프로젝트 한눈에 보기

- SAHA는 React Native 기반 사주/운세/AI 상담 앱이다.
- 앱 핵심은 홈의 사주 콘텐츠, AI 도사 채팅, Supabase Edge Function, 결제/무료 메시지 흐름이다.
- 메인 앱 repo 경로는 `/Users/minseongkim/Desktop/saha`다.
- 어드민 대시보드는 `/Users/minseongkim/Desktop/saha/saha-admin-dashboard`에 별도 git repo로 있다.
- 어드민 GitHub 원격은 `https://github.com/Minseongkimm/saha-admin-dashboard.git`이다.
- 메인 앱과 어드민은 같은 상위 폴더에 있지만 git 상태와 커밋은 별도로 관리한다.

## 주요 기술 스택

- React Native `0.80.x`
- React `19`
- TypeScript
- React Navigation
- Supabase Auth / Database / Edge Functions
- OpenAI API via Supabase Edge Functions
- React Native IAP
- AsyncStorage 캐시

## 자주 쓰는 명령어

- Metro 시작: `npm start`
- Metro 캐시 리셋: `npm run start:reset`
- Android 실행: `npm run android`
- 무선 Android 실행: `npm run android:wireless`
- iOS 실행: `npm run ios`
- 전체 lint: `npm run lint`
- 테스트: `npm test`
- 채팅 Edge Function 배포: `npm run deploy:chat`
- Supabase 로컬 시작: `npm run supabase:start`
- Supabase 로컬 종료: `npm run supabase:stop`

주의: 전체 `tsc --noEmit`은 현재 Supabase/Deno 함수 타입 설정 문제로 실패할 수 있다. React Native 수정은 관련 파일 lint를 우선 확인한다.

## 중요 폴더 구조

- `src/navigation/`: 앱 네비게이션
- `src/screens/saju/`: 홈, 사주 정보, 정통사주, 오늘의 운세, 신년운세 화면
- `src/screens/chat/ChatRoomScreen/`: 대화 탭과 채팅방 핵심 UI/훅
- `src/screens/expert/`: 전문가 상세, 배너 상세
- `src/screens/store/`: 상점 WebView/IAP 관련 화면
- `src/screens/partner/`: 궁합 상대방 정보 입력
- `src/services/ai/`: 앱에서 Edge Function 호출, 운세 서비스
- `src/services/chat/`: 환영 메시지, 초기 질문
- `src/hooks/`: 사주/운세 데이터 로딩 훅
- `src/utils/chat/`: 채팅방 생성, 라우팅, 캐시
- `src/utils/payments/`: 결제, 잔액, 무료 메시지
- `src/utils/saju/`, `src/utils/saju-calculator/`: 사주 계산
- `supabase/functions/`: Edge Functions
- `supabase/functions/_shared/prompts/`: 도사별/공통 프롬프트
- `saha-admin-dashboard/`: 별도 어드민 대시보드 repo
- `docs/`: 현재 결정사항과 작업 메모

## 핵심 사용자 흐름

### 홈 사주 콘텐츠

- 홈 화면: `src/screens/saju/HomeScreen.tsx`
- 정통사주: `src/screens/saju/TraditionalSajuScreen.tsx`
- 오늘의 운세: `src/screens/saju/TodayFortuneScreen.tsx`
- 신년운세: `src/screens/saju/NewYearFortuneScreen.tsx`
- 생년월일 정보가 없으면 `ensureBirthInfoOrNavigate`로 입력 화면으로 보낸다.
- 운세/분석 결과는 캐시와 `saju_analyses`를 함께 사용한다.

### 대화 탭과 채팅

- 하단 대화 탭은 `BottomTabNavigator`에서 `ChatRoomScreen`을 `directEntry: true`로 연다.
- 대화 탭 직접 진입 화면은 첫 메시지를 받아 `routeChatCategory()`로 도사를 배정한다.
- 특정 결과 화면에서 "대화 시작하기"를 누르면 `MainTabs > Chat`으로 이동하고 `entryCategory`를 넘긴다.
- `entryCategory`가 있으면 대화 탭에서 해당 도사를 찾고 새 `chat_rooms` row를 만든 뒤 바로 활성 채팅으로 연다.
- 일반 채팅 생성 유틸은 `src/utils/chat/chatUtils.ts`의 `createChatRoomWithExpert()`와 `startChatWithExpert()`다.

### AI 응답 생성

- 메시지 전송 흐름:
  - `useMessageActions`
  - `sendMessageCore`
  - `sendUserMessage`
  - `prepareMessagesForAI`
  - `processAiResponse`
  - `streamChat`
  - `supabase/functions/chat-stream/index.ts`
- Edge Function은 DB에서 `birth_info`, `calculated_saju`, `chat_rooms` 정보를 다시 조회해 프롬프트 컨텍스트를 만든다.
- 오늘의 운세 채팅은 `saju_analyses.daily_fortune` 요약을 추가한다.
- 신년운세 채팅은 `saju_analyses.new_year_fortune` 요약을 추가한다.
- 정통사주 채팅은 현재 기본 사주 요약 중심이며 `traditional_analysis` 전문을 별도로 붙이지 않는다.

### 결제와 무료 메시지

- 무료 메시지/잔액 체크는 메시지 전송 전 `checkBalanceBeforeSend`에서 수행한다.
- 무료 메시지 기록 업데이트는 `updateFreeMessageId`가 담당한다.
- 잔액 관련 유틸은 `src/utils/payments/`에 있다.
- 과금, 무료 메시지, 토큰 차감 로직은 서비스 핵심이므로 수정 전 전체 흐름을 반드시 확인한다.

### 궁합/상대방 정보

- 상대방 정보 입력은 `src/screens/partner/PartnerInputScreen.tsx`가 담당한다.
- 채팅 중 상대방 정보가 필요하면 정보 캡처 흐름을 통해 `PartnerInput` 또는 기존 partner 선택으로 이어진다.
- 궁합 상담은 `chat_context = love_compatibility`, `partner_saju_id`를 사용한다.

## Supabase / Edge Function 작업

- 채팅: `supabase/functions/chat-stream/index.ts`
- 질문 카테고리 라우팅: `supabase/functions/route-chat-category/index.ts`
- 정보 입력 의도 분류: `supabase/functions/classify-info-intent/index.ts`
- 정통사주 스트리밍: `supabase/functions/traditional-saju-stream/index.ts`
- 오늘의 운세 스트리밍: `supabase/functions/today-fortune-stream/index.ts`
- 신년운세 스트리밍: `supabase/functions/new-year-fortune-stream/index.ts`
- IAP 검증: `supabase/functions/verify-iap/index.ts`
- 공통 타입/설정/프롬프트: `supabase/functions/_shared/`

Edge Function 수정 시 가능하면 `deno fmt --check`와 `deno check`를 확인한다. 로컬 TypeScript와 Deno 타입은 섞여 있어 전체 `tsc` 기준으로 판단하지 않는다.

## 프롬프트 작업 원칙

- 프롬프트는 중복을 늘리지 않는다.
- 도사별 말투와 역할은 `supabase/functions/_shared/prompts/experts/`를 우선 확인한다.
- 공통 답변 규칙은 `supabase/functions/_shared/prompts/base/`를 확인한다.
- 대화 품질 개선 전에는 `docs/*.md`와 현재 `chat-stream` 조립 흐름을 먼저 본다.
- 확정적 예언, 과도한 단정, 반복 답변을 피하는 방향을 유지한다.

## 코드 탐색 규칙

- 파일 검색은 먼저 `rg` 또는 `rg --files`를 사용한다.
- 검색 범위는 작게 시작한다. `docs/prompt-backups/`처럼 큰 백업 폴더는 필요할 때만 본다.
- 전체 repo를 무작정 읽지 말고 요청과 관련된 폴더부터 본다.
- 채팅 관련 작업은 우선 아래를 확인한다.
  - `src/screens/chat/ChatRoomScreen/`
  - `src/services/chat/`
  - `src/utils/chat/`
  - `supabase/functions/chat-stream/`
  - `supabase/functions/_shared/prompts/`
- Supabase/DB 관련 작업은 Edge Function과 관련 utils를 함께 확인한다.

## 구현 원칙

- 기존 코드 스타일과 패턴을 따른다.
- 필요한 범위만 수정한다.
- 관련 없는 리팩토링은 하지 않는다.
- 새 abstraction은 꼭 필요할 때만 만든다.
- 사용자가 만든 변경사항은 되돌리지 않는다.
- UI 수정은 기존 디자인 톤을 유지하고 과한 장식은 피한다.
- 프롬프트, 과금, 무료 메시지, 토큰, Supabase 연동은 특히 조심해서 수정한다.

## 검증 원칙

- 수정 후 가능한 범위에서 lint, typecheck, format check를 실행한다.
- React Native 수정 시 관련 파일 lint를 우선 확인한다.
- Edge Function 수정 시 가능하면 `deno fmt --check`와 `deno check`를 확인한다.
- 테스트를 못 돌리면 왜 못 돌렸는지 말한다.
- 전체 `npm run lint`가 너무 넓거나 기존 경고가 많으면 수정 파일 대상으로 먼저 확인한다.

## Git 규칙

- 커밋 메시지는 한국어로 쓴다.
- 커밋 전 `git status`를 확인한다.
- 관련 없는 삭제 파일이나 미추적 파일은 스테이징하지 않는다.
- 사용자가 요청한 범위만 커밋한다.
- 메인 앱 repo와 `saha-admin-dashboard` repo는 별도로 커밋한다.

## 모바일 실행 / ADB

- 폰 실행 요청 시 Metro 8081 상태를 확인한다.
- 무선 연결은 `adb mdns services`, `adb connect`, `adb reverse tcp:8081 tcp:8081` 흐름으로 확인한다.
- 와이파이가 바뀌면 무선 ADB 주소가 바뀔 수 있음을 고려한다.

## 어드민 대시보드 Worklog / 배포 마커

- Worklog(업무 기록)와 배포 마커는 별개 기능이다. 배포 여부를 표시하려고 워크로그 항목을 만들지 않는다.
- 배포 마커는 `saha-admin-dashboard/data/deploys.json`에 `{ id, date, created_at }`만 저장하는 최소 구조다. 플랫폼 구분 없이 "배포" 하나로만 표시한다.
- API는 `GET/POST /api/deploys`, `DELETE /api/deploys/:id` (`server.js`). 워크로그 API와 패턴은 같지만 완전히 분리된 라우트/파일이다.
- 프론트엔드(`public/app.js`)에서 날짜 셀 hover 시 `+`(배포 없음) 또는 "배포" 칩(있음)이 뜨고, 클릭으로 추가/삭제 토글한다. `.calendar-day` 자체가 `<button>`이라 내부 컨트롤은 `<span role="button">`로 만들어야 한다 (버튼 중첩 금지).
- Worklog 캘린더 요일은 일요일 시작이다 (`renderCalendar`의 `weekdays` 배열과 `sundayOffset` 기준).

## 현재 참고 문서

- `docs/CODEX_STATE.md`: 현재 결정사항, 어드민 repo 정보
- `docs/AI_CHAT_REVIEW_NOTES.md`: AI 채팅 리뷰/개선 메모
- `docs/WEBVIEW_FINAL_SUMMARY.md`: WebView 관련 최종 메모
- `supabase/functions/README.md`: Edge Function 참고
- `saha-admin-dashboard/README.md`: 어드민 대시보드 참고
