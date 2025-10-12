/// <reference lib="deno.ns" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createOpenAIStream, transformToSSE } from '../_shared/openai-streaming.ts';
import { handleCorsPreFlight, getStreamingHeaders } from '../_shared/cors.ts';
import { createErrorResponse, validateRequest, validateEnvVars, StreamingError } from '../_shared/error-handler.ts';
import { getExpertPrompt } from '../_shared/chat-prompts.ts';
import { AI_CONFIG, getEnvVar, log } from '../_shared/config.ts';
import { OpenAIMessage } from '../_shared/types.ts';

interface ChatStreamRequest {
  messages: OpenAIMessage[];
  sajuData: Record<string, unknown>;
  expertCategory: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight();
  }

  try {
    log('info', 'Chat streaming request received');

    validateEnvVars(['OPENAI_API_KEY']);
    const apiKey = getEnvVar('OPENAI_API_KEY');

    const body: ChatStreamRequest = await req.json();
    validateRequest(body, ['messages', 'sajuData', 'expertCategory']);

    const { messages, sajuData, expertCategory } = body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new StreamingError('대화 메시지가 필요합니다.', 400);
    }

    // 전문가별 시스템 프롬프트 가져오기
    const systemPrompt = getExpertPrompt(expertCategory as any);

    // 메시지 구성
    const openaiMessages: OpenAIMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...messages,
    ];

    const openaiStream = await createOpenAIStream({
      apiKey,
      model: AI_CONFIG.CHAT_MODEL,
      messages: openaiMessages,
      temperature: AI_CONFIG.TEMPERATURE,
      maxTokens: AI_CONFIG.MAX_TOKENS,
      topP: AI_CONFIG.TOP_P,
      frequencyPenalty: AI_CONFIG.FREQUENCY_PENALTY,
      presencePenalty: AI_CONFIG.PRESENCE_PENALTY,
    });

    const sseStream = transformToSSE(openaiStream);

    return new Response(sseStream, {
      headers: getStreamingHeaders(),
    });

  } catch (error) {
    log('error', 'Error in chat streaming', error);
    return createErrorResponse(error);
  }
});

