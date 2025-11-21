/// <reference lib="deno.ns" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createOpenAIStream, transformToSSE } from '../_shared/openai-streaming.ts';
import { handleCorsPreFlight, getStreamingHeaders } from '../_shared/cors.ts';
import { createErrorResponse, validateRequest, validateEnvVars, StreamingError as _StreamingError } from '../_shared/error-handler.ts';
import { getTodayFortunePrompt } from '../_shared/prompts.ts';
import { AI_CONFIG, getEnvVar, log } from '../_shared/config.ts';
import { OpenAIMessage } from '../_shared/types.ts';

interface TodayFortuneStreamRequest {
  calculatedFortune: Record<string, unknown>;
  sajuData: Record<string, unknown>;
  todayDate: string;
}

type ToneLevel = 'very_bad' | 'bad' | 'neutral' | 'good' | 'very_good';

interface TodayFortuneWithTone extends Record<string, unknown> {
  totalScore?: number;
  categoryScores?: {
    career?: number;
    love?: number;
    wealth?: number;
    relationship?: number;
  };
  toneLevels?: {
    overall: ToneLevel;
    career: ToneLevel;
    love: ToneLevel;
    wealth: ToneLevel;
    relationship: ToneLevel;
  };
}

const getToneLevel = (score: unknown): ToneLevel => {
  const n = typeof score === 'number' ? score : 0;
  if (n <= 20) return 'very_bad';
  if (n <= 40) return 'bad';
  if (n <= 60) return 'neutral';
  if (n <= 80) return 'good';
  return 'very_good';
};

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

    const fortuneWithTone: TodayFortuneWithTone = { ...calculatedFortune } as TodayFortuneWithTone;
    try {
      const totalScore = fortuneWithTone.totalScore ?? 0;
      const careerScore = fortuneWithTone.categoryScores?.career ?? 0;
      const loveScore = fortuneWithTone.categoryScores?.love ?? 0;
      const wealthScore = fortuneWithTone.categoryScores?.wealth ?? 0;
      const relationshipScore = fortuneWithTone.categoryScores?.relationship ?? 0;

      fortuneWithTone.toneLevels = {
        overall: getToneLevel(totalScore),
        career: getToneLevel(careerScore),
        love: getToneLevel(loveScore),
        wealth: getToneLevel(wealthScore),
        relationship: getToneLevel(relationshipScore),
      };
    } catch {
      // toneLevels 설정 실패시 조용히 무시하고 기본값(neutral)로 처리되게 둔다.
    }

    log('info', '오늘의 운세 스트리밍 시작', { todayDate });

    // 프롬프트 생성 (toneLevels가 포함된 fortuneWithTone 사용)
    const promptText = getTodayFortunePrompt(
      fortuneWithTone as unknown as Record<string, unknown>,
      sajuData,
      todayDate,
    );
    
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
    log('error', '오늘의 운세 스트리밍 오류', error);
    return createErrorResponse(error);
  }
}
);

