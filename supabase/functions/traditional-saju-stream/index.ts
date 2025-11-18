/// <reference lib="deno.ns" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createOpenAIStream, transformToSSE } from '../_shared/openai-streaming.ts';
import { handleCorsPreFlight, getStreamingHeaders } from '../_shared/cors.ts';
import { createErrorResponse, validateRequest, validateEnvVars, StreamingError } from '../_shared/error-handler.ts';
import { getTraditionalSajuPrompt } from '../_shared/prompts.ts';
import { AI_CONFIG, getEnvVar, log } from '../_shared/config.ts';
import { StreamingRequest } from '../_shared/types.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight();
  }

  try {
    log('info', 'Traditional Saju streaming request received');

    validateEnvVars(['OPENAI_API_KEY']);
    const apiKey = getEnvVar('OPENAI_API_KEY');

    const body: StreamingRequest = await req.json();
    validateRequest(body, ['sajuData']);

    const { sajuData } = body;
    
    if (!sajuData) {
      throw new StreamingError('사주 데이터가 필요합니다.', 400);
    }

    const prompt = getTraditionalSajuPrompt(sajuData);

    const openaiStream = await createOpenAIStream({
      apiKey,
      model: AI_CONFIG.TRADITIONAL_SAJU_MODEL,
      messages: [
        {
          role: 'system',
          content: '당신은 전문 정통사주명리학자입니다.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: AI_CONFIG.TEMPERATURE,
      maxTokens: AI_CONFIG.TRADITIONAL_SAJU_MAX_TOKENS, // 정통사주 전용 토큰 제한 사용
      topP: AI_CONFIG.TOP_P,
      frequencyPenalty: AI_CONFIG.FREQUENCY_PENALTY,
      presencePenalty: AI_CONFIG.PRESENCE_PENALTY,
    });

    const sseStream = transformToSSE(openaiStream);

    return new Response(sseStream, {
      headers: getStreamingHeaders(),
    });

  } catch (error) {
    log('error', 'Error in traditional saju streaming', error);
    return createErrorResponse(error);
  }
});

