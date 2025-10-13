/// <reference lib="deno.ns" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createOpenAIStream, transformToSSE } from '../_shared/openai-streaming.ts';
import { handleCorsPreFlight, getStreamingHeaders } from '../_shared/cors.ts';
import { createErrorResponse, validateRequest, validateEnvVars, StreamingError } from '../_shared/error-handler.ts';
import { getTodayFortunePrompt } from '../_shared/prompts.ts';
import { AI_CONFIG, getEnvVar, log } from '../_shared/config.ts';
import { OpenAIMessage } from '../_shared/types.ts';

interface TodayFortuneStreamRequest {
  calculatedFortune: Record<string, unknown>;
  sajuData: Record<string, unknown>;
  todayDate: string;
}

serve(async (req: Request) => {
  // CORS 프리플라이트 처리
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight();
  }

  try {
    // 환경 변수 검증
    validateEnvVars(['OPENAI_API_KEY']);
    const apiKey = getEnvVar('OPENAI_API_KEY');
    
    // 요청 본문 파싱
    const body: TodayFortuneStreamRequest = await req.json();
    
    // 필수 필드 검증
    validateRequest(body, ['calculatedFortune', 'sajuData', 'todayDate']);
    
    const { calculatedFortune, sajuData, todayDate } = body;

    log('오늘의 운세 스트리밍 시작', { todayDate });

    // 프롬프트 생성
    const promptText = getTodayFortunePrompt(calculatedFortune, sajuData, todayDate);
    
    const messages: OpenAIMessage[] = [
      {
        role: 'system',
        content: '당신은 전문 사주명리학자입니다. 계산된 운세 데이터를 바탕으로 더 자세하고 실용적인 조언을 제공해주세요.',
      },
      {
        role: 'user',
        content: promptText,
      },
    ];

    // OpenAI 스트리밍 생성
    const openaiStream = await createOpenAIStream({
      apiKey,
      model: AI_CONFIG.TODAY_FORTUNE_MODEL,
      messages,
      temperature: AI_CONFIG.TEMPERATURE,
      maxTokens: AI_CONFIG.MAX_TOKENS,
      topP: AI_CONFIG.TOP_P,
      frequencyPenalty: AI_CONFIG.FREQUENCY_PENALTY,
      presencePenalty: AI_CONFIG.PRESENCE_PENALTY,
    });

    // SSE 형식으로 변환
    const sseStream = transformToSSE(openaiStream);

    return new Response(sseStream, {
      headers: getStreamingHeaders(),
    });
  } catch (error) {
    log('오늘의 운세 스트리밍 오류', error);
    return createErrorResponse(error);
  }
});

