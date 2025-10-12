# 🚀 Edge Functions 설치 및 설정 가이드

## ✅ 완료된 작업

### 1단계: Supabase CLI 설치 ✅
```bash
brew install supabase/tap/supabase
```

### 2단계: 디렉토리 구조 생성 ✅
```
supabase/functions/
├── _shared/               # 공통 유틸리티
├── traditional-saju-stream/
├── new-year-fortune-stream/
└── chat-stream/
```

### 3단계: 파일 생성 완료 ✅
- 9개 TypeScript 파일 생성
- Deno 타입 참조 포함 (`/// <reference lib="deno.ns" />`)
- `any` 타입 사용 금지, 명시적 타입 사용

## 🎯 다음 단계

### 4단계: Supabase 프로젝트 설정

```bash
# Supabase 로그인
supabase login

# 프로젝트 링크 (Supabase 대시보드에서 Project ID 확인)
supabase link --project-ref YOUR_PROJECT_ID
```

### 5단계: 환경 변수 설정

```bash
# OpenAI API 키 설정
supabase secrets set OPENAI_API_KEY=your_openai_api_key
```

### 6단계: Edge Functions 배포

```bash
# 개별 배포
supabase functions deploy traditional-saju-stream
supabase functions deploy new-year-fortune-stream
supabase functions deploy chat-stream

# 또는 한 번에 배포
supabase functions deploy
```

### 7단계: 로컬 테스트 (선택사항)

```bash
# 로컬에서 실행
supabase functions serve traditional-saju-stream

# 다른 터미널에서 테스트
curl -i --location --request POST 'http://localhost:54321/functions/v1/traditional-saju-stream' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: 'application/json' \
  --data '{"sajuData": {}}'
```

## 📱 React Native에서 사용

```typescript
import { streamTraditionalSaju } from '@/services/ai/edgeFunctionClient';

// 사용 예제
async function fetchSaju(sajuData: any) {
  let fullText = '';
  
  try {
    for await (const chunk of streamTraditionalSaju(sajuData)) {
      fullText += chunk;
      setStreamingText(fullText); // 실시간 UI 업데이트
    }
    
    // 스트리밍 완료
    console.log('최종 텍스트:', fullText);
    
  } catch (error) {
    console.error('스트리밍 에러:', error);
  }
}
```

## 🐛 문제 해결

### "Cannot find name 'Deno'" 에러
- 각 파일 상단에 `/// <reference lib="deno.ns" />` 추가됨 ✅

### 배포 실패
```bash
# 로그 확인
supabase functions logs traditional-saju-stream

# 환경 변수 확인
supabase secrets list
```

### 로컬 테스트 실패
```bash
# Docker가 실행 중인지 확인
docker ps

# Supabase 로컬 서버 시작
supabase start
```

## 📊 파일 목록

### Edge Functions (Deno)
- `_shared/types.ts` - 타입 정의
- `_shared/cors.ts` - CORS 헤더
- `_shared/error-handler.ts` - 에러 처리
- `_shared/openai-streaming.ts` - OpenAI 스트리밍 ⭐
- `_shared/prompts.ts` - 프롬프트 생성
- `_shared/config.ts` - 설정
- `traditional-saju-stream/index.ts` - 정통사주
- `new-year-fortune-stream/index.ts` - 신년운세
- `chat-stream/index.ts` - 채팅

### 클라이언트 (React Native)
- `src/services/ai/edgeFunctionClient.ts` - 클라이언트 ⭐

## 🎓 주요 개념

### 1. Server-Sent Events (SSE)
```
data: {"choices":[{"delta":{"content":"안녕"}}]}

data: {"choices":[{"delta":{"content":"하세요"}}]}

data: [DONE]
```

### 2. AsyncGenerator
```typescript
async function* generator() {
  yield "첫 번째";
  yield "두 번째";
}

for await (const item of generator()) {
  console.log(item);
}
```

### 3. Deno vs Node.js
- Deno: Edge Functions 런타임
- TypeScript 네이티브 지원
- `Deno.env.get()` 사용

## 💡 다음 할 일

1. ✅ Supabase 설치
2. ✅ 파일 생성
3. ⏳ `supabase login`
4. ⏳ `supabase link --project-ref YOUR_PROJECT_ID`
5. ⏳ `supabase secrets set OPENAI_API_KEY=...`
6. ⏳ `supabase functions deploy`
7. ⏳ React Native에서 테스트

---

**작성일**: 2025-10-11  
**Supabase CLI**: 2.48.3  
**상태**: ✅ 파일 생성 완료, 배포 대기 중

