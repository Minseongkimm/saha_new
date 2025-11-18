/// <reference lib="deno.ns" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createOpenAIStream, transformToSSE } from '../_shared/openai-streaming.ts';
import { handleCorsPreFlight, getStreamingHeaders } from '../_shared/cors.ts';
import { createErrorResponse, validateRequest, validateEnvVars, StreamingError } from '../_shared/error-handler.ts';
import { getNewYearFortunePrompt } from '../_shared/prompts.ts';
import { AI_CONFIG, getEnvVar, log } from '../_shared/config.ts';

interface NewYearFortuneRequest {
  sajuData: Record<string, unknown>;
  calculatedResult: Record<string, unknown>;
  targetYear: number;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight();
  }

  try {
    log('info', 'New Year Fortune streaming request received');

    validateEnvVars(['OPENAI_API_KEY']);
    const apiKey = getEnvVar('OPENAI_API_KEY');

    const body: NewYearFortuneRequest = await req.json();
    validateRequest(body, ['sajuData', 'calculatedResult', 'targetYear']);

    const { sajuData, calculatedResult, targetYear } = body;
    
    if (!sajuData || !calculatedResult || !targetYear) {
      throw new StreamingError('필수 데이터가 누락되었습니다.', 400);
    }

    const prompt = getNewYearFortunePrompt(calculatedResult, sajuData, targetYear);

    const openaiStream = await createOpenAIStream({
      apiKey,
      model: AI_CONFIG.NEW_YEAR_FORTUNE_MODEL,
      messages: [
        {
          role: 'system',
          content: '당신은 전문 사주명리학자입니다. 반드시 JSON 형식으로만 응답해주세요.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: AI_CONFIG.TEMPERATURE,
      maxTokens: AI_CONFIG.NEW_YEAR_FORTUNE_MAX_TOKENS, // 신년운세 전용 토큰 제한 사용
      topP: AI_CONFIG.TOP_P,
      frequencyPenalty: AI_CONFIG.FREQUENCY_PENALTY,
      presencePenalty: AI_CONFIG.PRESENCE_PENALTY,
    });

    const sseStream = transformToSSE(openaiStream);

    return new Response(sseStream, {
      headers: getStreamingHeaders(),
    });

  } catch (error) {
    log('error', 'Error in new year fortune streaming', error);
    return createErrorResponse(error);
  }
});

