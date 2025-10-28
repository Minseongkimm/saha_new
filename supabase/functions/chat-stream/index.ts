/// <reference lib="deno.ns" />

// @deno-types="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/module/index.d.ts"
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { createOpenAIStream, transformToSSE } from '../_shared/openai-streaming.ts';
import { handleCorsPreFlight, getStreamingHeaders } from '../_shared/cors.ts';
import { createErrorResponse, validateRequest, validateEnvVars, StreamingError } from '../_shared/error-handler.ts';
import { buildChatPrompt } from '../_shared/prompts/index.ts';
import { AI_CONFIG, getEnvVar, log } from '../_shared/config.ts';
import { OpenAIMessage } from '../_shared/types.ts';
import { calculateTokenCost, formatTokenUsage } from '../_shared/token-calculator.ts';

interface ChatStreamRequest {
  roomId: string;
  messages: OpenAIMessage[];
  sajuData: Record<string, unknown>;
  expertCategory: string;
}

/**
 * 토큰 사용량 업데이트
 */
async function updateTokenUsage(
  supabase: any,
  roomId: string,
  usage: any,
  model: string
): Promise<void> {
  try {
    const tokenInfo = formatTokenUsage(usage, model);
    
    // 현재 토큰 사용량 조회
    const { data: currentRoom } = await supabase
      .from('chat_rooms')
      .select('total_prompt_tokens, total_completion_tokens, total_tokens, total_cost_usd')
      .eq('id', roomId)
      .single();
    
    if (currentRoom) {
      // 누적 업데이트
      const newPromptTokens = (currentRoom.total_prompt_tokens || 0) + tokenInfo.promptTokens;
      const newCompletionTokens = (currentRoom.total_completion_tokens || 0) + tokenInfo.completionTokens;
      const newTotalTokens = (currentRoom.total_tokens || 0) + tokenInfo.totalTokens;
      const newTotalCost = (currentRoom.total_cost_usd || 0) + tokenInfo.costUsd;
      
      await supabase
        .from('chat_rooms')
        .update({
          total_prompt_tokens: newPromptTokens,
          total_completion_tokens: newCompletionTokens,
          total_tokens: newTotalTokens,
          total_cost_usd: newTotalCost,
          last_token_update: new Date().toISOString()
        })
        .eq('id', roomId);
      
      log('info', `토큰 사용량 업데이트 완료`, {
        roomId,
        promptTokens: tokenInfo.promptTokens,
        completionTokens: tokenInfo.completionTokens,
        totalTokens: tokenInfo.totalTokens,
        cost: tokenInfo.costUsd,
        totalCost: newTotalCost
      });
    }
  } catch (error) {
    log('error', '토큰 사용량 업데이트 실패', error);
  }
}

/**
 * 토큰 추적이 포함된 SSE 변환 함수
 */
function transformToSSEWithTokenTracking(
  openaiStream: ReadableStream,
  supabase: any,
  roomId: string,
  model: string,
  openaiMessages: OpenAIMessage[]
): ReadableStream {
  const reader = openaiStream.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      let buffer = '';
      let responseText = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            // 스트리밍 완료 후 텍스트 길이 기반으로 토큰 추정 및 last_message 갱신
            try {
              // 프롬프트 텍스트 길이 계산
              const promptText = openaiMessages.map(m => m.content).join(' ');
              const estimatedPromptTokens = Math.ceil(promptText.length / 4);
              const estimatedCompletionTokens = Math.ceil(responseText.length / 4);

              const estimatedUsage = {
                prompt_tokens: estimatedPromptTokens,
                completion_tokens: estimatedCompletionTokens,
                total_tokens: estimatedPromptTokens + estimatedCompletionTokens
              };

              await updateTokenUsage(supabase, roomId, estimatedUsage, model);

              // last_message, last_message_at 갱신
              const preview = responseText.length > 40 ? responseText.slice(0, 40) : responseText;
              await supabase
                .from('chat_rooms')
                .update({
                  last_message: preview,
                  last_message_at: new Date().toISOString(),
                })
                .eq('id', roomId);
            } catch (estimationError) {
              log('error', '토큰/마지막 메시지 갱신 실패', estimationError);
            }
            
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            
            if (!trimmedLine || trimmedLine === 'data: [DONE]') {
              continue;
            }

            if (trimmedLine.startsWith('data: ')) {
              // 응답 청크에서 delta.content 누적 (마지막 메시지 및 completion 토큰 계산용)
              try {
                const jsonData = JSON.parse(trimmedLine.slice(6));
                const piece = jsonData?.choices?.[0]?.delta?.content
                  ?? jsonData?.choices?.[0]?.message?.content
                  ?? '';
                if (piece) {
                  responseText += piece as string;
                }
              } catch (_) {}
              controller.enqueue(encoder.encode(trimmedLine + '\n\n'));
            }
          }
        }
      } catch (error) {
        console.error('Stream transformation error:', error);
        controller.error(error);
      }
    },

    cancel() {
      reader.cancel();
    },
  });
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
    ? `기존 키워드: ${existingSummary}
새로운 대화에서 중요한 키워드만 추출해주세요:
- 날짜/시기
- 주제 (연애운, 직장운, 건강 등)
- 조언 (구체적인 방법이나 시기)
- 숫자 (점수, 나이, 시기 등)

새로운 대화:
${messagesToSummarize.map((m, i) => `${i % 2 === 0 ? '사용자' : 'AI'}: ${m.content}`).join('\n')}

업데이트된 키워드:`
    : `다음 대화에서 중요한 키워드만 추출해주세요:
- 날짜/시기
- 주제 (연애운, 직장운, 건강 등)
- 조언 (구체적인 방법이나 시기)
- 숫자 (점수, 나이, 시기 등)

대화:
${messagesToSummarize.map((m, i) => `${i % 2 === 0 ? '사용자' : 'AI'}: ${m.content}`).join('\n')}

키워드:`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: AI_CONFIG.SUMMARY_MODEL,
      messages: [{ role: 'user', content: summaryPrompt }],
      temperature: AI_CONFIG.SUMMARY_TEMPERATURE,
      max_tokens: AI_CONFIG.SUMMARY_MAX_TOKENS
    }),
  });

  if (!response.ok) {
    log('error', '요약 생성 실패');
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

    // 전문가 정보 조회 (role, tone 등을 위해)
    const { data: expertInfo } = await supabase
      .from('experts')
      .select('name, expert_quote, signature_phrase, category')
      .eq('category', expertCategory)
      .single();

    // 사주 정보가 saju_data 안에 중첩되어 있는 경우 처리
    const actualSajuData: any = sajuData.saju_data || sajuData;

    // 새로운 프롬프트 시스템으로 시스템 프롬프트 생성
    const systemPromptBase = buildChatPrompt(
      expertCategory,
      expertInfo || { name: '사주 전문가', expert_quote: '', signature_phrase: '' },
      actualSajuData,
      chatRoom?.conversation_summary
    );
    
    // 변수 치환 (사주 정보)
    const birthInfoStr = JSON.stringify(actualSajuData, null, 2);
    const lastQuestion = messages.length > 0 ? messages[messages.length - 1].content : '질문 없음';
    const prevHistory = messages.length > 1 ? messages.slice(0, -1).map(m => m.content).join('\n') : '이전 대화 없음';
    
    const filledPrompt = systemPromptBase
      .replace('{birth_info}', birthInfoStr)
      .replace('{yearHangulGanji}', actualSajuData.yearHangulGanji || '')
      .replace('{monthHangulGanji}', actualSajuData.monthHangulGanji || '')
      .replace('{dayHangulGanji}', actualSajuData.dayHangulGanji || '')
      .replace('{timeHangulGanji}', actualSajuData.timeHangulGanji || '')
      .replace('{stemSasin}', actualSajuData.stemSasin?.join(', ') || '없음')
      .replace('{branchSasin}', actualSajuData.branchSasin?.join(', ') || '없음')
      .replace('{sibun}', actualSajuData.sibun?.join(', ') || '없음')
      .replace('{gongmang}', actualSajuData.gongmang || '없음')
      .replace('{fiveProperties}', JSON.stringify(actualSajuData.fiveProperties) || '없음')
      .replace('{jijiAmjangan}', JSON.stringify(actualSajuData.jijiAmjangan) || '없음')
      .replace('{sal}', JSON.stringify(actualSajuData.sal) || '없음')
      .replace('{guin}', JSON.stringify(actualSajuData.guin) || '없음')
      .replace('{sinsal}', JSON.stringify(actualSajuData.sinsal) || '없음')
      .replace('{jijiRelations}', JSON.stringify(actualSajuData.jijiRelations) || '없음')
      .replace('{daewoon}', JSON.stringify(actualSajuData.daewoon) || '없음')
      .replace('{history}', prevHistory)
      .replace('{question}', lastQuestion);



    // 3. 메시지 구성 (요약은 이미 systemPrompt에 포함됨)
    const openaiMessages: OpenAIMessage[] = [
      {
        role: 'system',
        content: filledPrompt,
      },
      ...messages
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
    
    // 스트리밍 완료 후 토큰 정보 추출을 위한 래퍼
    const sseStream = transformToSSEWithTokenTracking(
      openaiStream, 
      supabase, 
      roomId, 
      AI_CONFIG.CHAT_MODEL,
      openaiMessages
    );

    // 4. 응답 후 요약 업데이트 (백그라운드 처리)
    // 비동기로 처리하여 응답 속도에 영향 없음
    (async () => {
      try {
        const messagesSinceLastSummary = currentMessageCount - (chatRoom?.last_summary_message_count || 0);
        
        // 6개 메시지마다 요약 업데이트
        if (messagesSinceLastSummary >= 6) {
          log('info', `요약 업데이트 중 (마지막 요약 이후 ${messagesSinceLastSummary}개 메시지)`);
          
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
            
            log('info', '요약 업데이트 완료');
          }
        }
      } catch (summaryError) {
        log('error', '요약 업데이트 실패 (비중요)', summaryError);
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

