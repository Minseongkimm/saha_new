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
    
    // 사주 정보가 saju_data 안에 중첩되어 있는 경우 처리
    const actualSajuData = sajuData.saju_data || sajuData;
    
    // 기존 방식과 동일하게 사주 정보를 프롬프트에 치환
    const birthInfoStr = JSON.stringify(actualSajuData, null, 2);
    const lastQuestion = messages.length > 0 ? messages[messages.length - 1].content : '질문 없음';
    const prevHistory = messages.length > 1 ? messages.slice(0, -1).map(m => m.content).join('\n') : '이전 대화 없음';
    
  const filledPrompt = systemPrompt
    .replace('{target_len}', '300')
    .replace('{birth_info}', birthInfoStr)
    .replace('{gongmang}', actualSajuData.gongmang || '없음')
    .replace('{five_properties}', JSON.stringify(actualSajuData.fiveProperties) || '없음')
    .replace('{jiji_amjangan}', JSON.stringify(actualSajuData.jijiAmjangan) || '없음')
    .replace('{sal_analysis}', JSON.stringify(actualSajuData.sal) || '없음')
    .replace('{guin_analysis}', JSON.stringify(actualSajuData.guin) || '없음')
    .replace('{jiji_relations}', JSON.stringify(actualSajuData.jijiRelations) || '없음')
    .replace('{daewoon_info}', JSON.stringify(actualSajuData.daewoon) || '없음')
    .replace('{history}', prevHistory)
    .replace('{question}', lastQuestion);



    // 메시지 구성
    const openaiMessages: OpenAIMessage[] = [
      {
        role: 'system',
        content: filledPrompt,
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

