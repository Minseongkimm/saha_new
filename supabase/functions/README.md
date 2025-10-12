# Supabase Edge Functions

## 📁 구조

```
functions/
├── _shared/               # 공통 유틸리티
│   ├── types.ts
│   ├── cors.ts
│   ├── error-handler.ts
│   ├── openai-streaming.ts
│   ├── prompts.ts
│   └── config.ts
│
├── traditional-saju-stream/
│   └── index.ts
│
├── new-year-fortune-stream/
│   └── index.ts
│
└── chat-stream/
    └── index.ts
```

## 🚀 배포 방법

### 1. 환경 변수 설정
```bash
supabase secrets set OPENAI_API_KEY=your_openai_api_key
```

### 2. 함수 배포
```bash
supabase functions deploy traditional-saju-stream
supabase functions deploy new-year-fortune-stream
supabase functions deploy chat-stream
```

### 3. 로컬 테스트
```bash
supabase functions serve traditional-saju-stream
```

## 📝 클라이언트 사용법

```typescript
import { streamTraditionalSaju } from '@/services/ai/edgeFunctionClient';

async function loadSaju(sajuData: any) {
  let fullText = '';
  
  for await (const chunk of streamTraditionalSaju(sajuData)) {
    fullText += chunk;
    setStreamingText(fullText);
  }
}
```

## 🔐 보안

- API 키는 Edge Function에서만 사용
- 클라이언트에 노출되지 않음
- CORS 설정 적용

## 📚 참고

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Deno 문서](https://deno.land/manual)

