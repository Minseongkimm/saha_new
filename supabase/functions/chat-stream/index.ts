/// <reference lib="deno.ns" />

// @deno-types="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/module/index.d.ts"
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { createOpenAIStream, transformToSSE } from '../_shared/openai-streaming.ts';
import { handleCorsPreFlight, getStreamingHeaders } from '../_shared/cors.ts';
import { createErrorResponse, validateRequest, validateEnvVars, StreamingError } from '../_shared/error-handler.ts';
import { getExpertPrompt } from '../_shared/chat-prompts.ts';
import { AI_CONFIG, getEnvVar, log } from '../_shared/config.ts';
import { OpenAIMessage } from '../_shared/types.ts';

interface ChatStreamRequest {
  roomId: string;
  messages: OpenAIMessage[];
  sajuData: Record<string, unknown>;
  expertCategory: string;
}

/**
 * 대화 요약 생성
 */
async function generateConversationSummary(
  apiKey: string,
  messagesToSummarize: OpenAIMessage[],
  existingSummary: string | null
): Promise<string> {
  const summaryPrompt = existingSummary
    ? `다음은 기존 요약과 새로운 대화입니다. 두 내용을 합쳐서 업데이트된 요약을 3-4문장으로 만들어주세요.
중요한 정보(날짜, 숫자, 조언, 키워드)는 반드시 유지하세요.

기존 요약:
${existingSummary}

새로운 대화:
${messagesToSummarize.map((m, i) => `${i % 2 === 0 ? '사용자' : 'AI'}: ${m.content}`).join('\n')}

업데이트된 요약:`
    : `다음 대화의 핵심 내용을 3-4문장으로 요약해주세요.
중요한 정보(날짜, 숫자, 조언, 키워드)를 포함하세요.

대화:
${messagesToSummarize.map((m, i) => `${i % 2 === 0 ? '사용자' : 'AI'}: ${m.content}`).join('\n')}

요약:`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // 요약은 저렴한 모델 사용
      messages: [{ role: 'user', content: summaryPrompt }],
      temperature: 0.3,
      max_tokens: 300
    }),
  });

  if (!response.ok) {
    log('error', 'Failed to generate summary');
    return existingSummary || '';
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight();
  }

  try {
    log('info', 'Chat streaming request received');

    validateEnvVars(['OPENAI_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
    const apiKey = getEnvVar('OPENAI_API_KEY');
    const supabaseUrl = getEnvVar('SUPABASE_URL');
    const supabaseKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

    const body: ChatStreamRequest = await req.json();
    validateRequest(body, ['roomId', 'messages', 'sajuData', 'expertCategory']);

    const { roomId, messages, sajuData, expertCategory } = body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new StreamingError('대화 메시지가 필요합니다.', 400);
    }

    // Supabase 클라이언트 초기화
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. 채팅방 정보 및 요약 조회
    const { data: chatRoom } = await supabase
      .from('chat_rooms')
      .select('conversation_summary, last_summary_message_count')
      .eq('id', roomId)
      .single();

    // 2. 전체 메시지 수 조회
    const { count: totalMessageCount } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('chat_room_id', roomId);

    const currentMessageCount = (totalMessageCount || 0) + 1; // 지금 보내는 메시지 포함

    // 전문가별 시스템 프롬프트 가져오기
    const systemPrompt = getExpertPrompt(expertCategory as any);
    
    // 사주 정보가 saju_data 안에 중첩되어 있는 경우 처리
    const actualSajuData: any = sajuData.saju_data || sajuData;
    
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



    // 3. 메시지 구성 (요약 포함)
    const openaiMessages: OpenAIMessage[] = [
      {
        role: 'system',
        content: filledPrompt,
      }
    ];

    // 요약이 있으면 시스템 메시지로 추가
    if (chatRoom?.conversation_summary) {
      openaiMessages.push({
        role: 'system',
        content: `=== 이전 대화 요약 ===\n${chatRoom.conversation_summary}\n\n위 요약을 참고하여 맥락있는 대화를 이어가세요.`
      });
    }

    // 최근 메시지 추가
    openaiMessages.push(...messages);

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

    // 4. 응답 후 요약 업데이트 (백그라운드 처리)
    // 비동기로 처리하여 응답 속도에 영향 없음
    (async () => {
      try {
        const messagesSinceLastSummary = currentMessageCount - (chatRoom?.last_summary_message_count || 0);
        
        // 10개 메시지마다 요약 업데이트
        if (messagesSinceLastSummary >= 10) {
          log('info', `Updating summary (${messagesSinceLastSummary} messages since last summary)`);
          
          // 요약할 메시지 범위: 마지막 요약 이후 ~ 최근 5개 전까지
          const startIndex = chatRoom?.last_summary_message_count || 0;
          const endIndex = Math.max(startIndex, currentMessageCount - 5);
          
          // DB에서 해당 범위의 메시지 조회
          const { data: messagesToSummarize } = await supabase
            .from('chat_messages')
            .select('sender_type, message')
            .eq('chat_room_id', roomId)
            .order('created_at', { ascending: true })
            .range(startIndex, endIndex - 1);
          
          if (messagesToSummarize && messagesToSummarize.length > 0) {
            const messagesToSummarizeFormatted: OpenAIMessage[] = messagesToSummarize.map((m: any) => ({
              role: m.sender_type === 'user' ? 'user' : 'assistant',
              content: m.message
            }));
            
            // 요약 생성
            const newSummary = await generateConversationSummary(
              apiKey,
              messagesToSummarizeFormatted,
              chatRoom?.conversation_summary || null
            );
            
            // DB 업데이트
            await supabase
              .from('chat_rooms')
              .update({
                conversation_summary: newSummary,
                last_summary_message_count: endIndex
              })
              .eq('id', roomId);
            
            log('info', 'Summary updated successfully');
          }
        }
      } catch (summaryError) {
        log('error', 'Failed to update summary (non-critical)', summaryError);
        // 요약 실패해도 응답은 정상 진행
      }
    })();

    return new Response(sseStream, {
      headers: getStreamingHeaders(),
    });

  } catch (error) {
    log('error', 'Error in chat streaming', error);
    return createErrorResponse(error);
  }
});

