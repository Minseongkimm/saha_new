/// <reference lib="deno.ns" />

import { handleCorsPreFlight, getJsonHeaders } from '../_shared/cors.ts';
import { AI_CONFIG, getEnvVar, log } from '../_shared/config.ts';
import { createErrorResponse, validateEnvVars, validateRequest } from '../_shared/error-handler.ts';

type ChatCategory = 'comprehensive' | 'love' | 'career';

interface RouteChatCategoryRequest {
  message: string;
}

interface RouteChatCategoryResponse {
  category: ChatCategory;
  confidence: number;
  reason: string;
}

const VALID_CATEGORIES: ChatCategory[] = ['comprehensive', 'love', 'career'];
const DEFAULT_ROUTE: RouteChatCategoryResponse = {
  category: 'comprehensive',
  confidence: 0.35,
  reason: '여러 영역으로 이어질 수 있는 첫 고민이라 인생 흐름으로 시작합니다.',
};

const ROUTER_SYSTEM_PROMPT = `너는 사주 AI 상담 앱의 첫 질문 도사 연결 라우터다.

할 일:
- 상담 답변이나 사주 해석을 하지 않는다.
- 사용자의 첫 질문을 보고 어떤 상담 렌즈로 시작하면 좋은지만 고른다.
- 도사는 고정된 주제 담당자가 아니라 첫 대화의 진입 렌즈다.

카테고리:
- comprehensive: 인생, 미래, 방향성, 선택, 가족, 전반 운세, 애매하거나 복합적인 고민
- love: 연애, 이별, 재회, 결혼, 궁합, 썸, 상대방 마음, 관계 고민
- career: 직업, 진로, 취업, 이직, 퇴사, 회사, 사업, 돈벌이와 연결된 일 고민

판단 규칙:
- 여러 영역이 섞였거나 애매하면 comprehensive을 고른다.
- "일", "돈"이 있어도 관계나 인생 전반 맥락이면 comprehensive을 고른다.
- 궁합, 상대방 생년월일, 남친/여친/배우자/썸은 love 가능성이 높다.
- 답변은 반드시 JSON 객체 하나만 반환한다.

형식:
{"category":"comprehensive|love|career","confidence":0.0,"reason":"짧은 한국어 이유"}`;

function isValidCategory(category: unknown): category is ChatCategory {
  return typeof category === 'string' && VALID_CATEGORIES.includes(category as ChatCategory);
}

function normalizeRoute(value: unknown): RouteChatCategoryResponse {
  if (!value || typeof value !== 'object') {
    return DEFAULT_ROUTE;
  }

  const route = value as Record<string, unknown>;
  const category = isValidCategory(route.category) ? route.category : DEFAULT_ROUTE.category;
  const rawConfidence = typeof route.confidence === 'number' ? route.confidence : DEFAULT_ROUTE.confidence;
  const confidence = Math.max(0, Math.min(1, rawConfidence));
  const reason = typeof route.reason === 'string' && route.reason.trim()
    ? route.reason.trim().slice(0, 80)
    : DEFAULT_ROUTE.reason;

  return { category, confidence, reason };
}

async function routeWithOpenAI(message: string, apiKey: string): Promise<RouteChatCategoryResponse> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: AI_CONFIG.ROUTER_MODEL,
      messages: [
        { role: 'system', content: ROUTER_SYSTEM_PROMPT },
        { role: 'user', content: `첫 질문: ${message}` },
      ],
      temperature: AI_CONFIG.ROUTER_TEMPERATURE,
      max_tokens: AI_CONFIG.ROUTER_MAX_TOKENS,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    log('error', 'Chat category routing failed', { status: response.status, errorText });
    return DEFAULT_ROUTE;
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    return DEFAULT_ROUTE;
  }

  try {
    return normalizeRoute(JSON.parse(content));
  } catch (error) {
    log('error', 'Chat category route JSON parse failed', { error, content });
    return DEFAULT_ROUTE;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight();
  }

  try {
    validateEnvVars(['OPENAI_API_KEY']);

    const body: RouteChatCategoryRequest = await req.json();
    validateRequest(body, ['message']);

    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) {
      return new Response(JSON.stringify(DEFAULT_ROUTE), {
        status: 200,
        headers: getJsonHeaders(),
      });
    }

    const apiKey = getEnvVar('OPENAI_API_KEY');
    const route = await routeWithOpenAI(message.slice(0, 500), apiKey);

    return new Response(JSON.stringify(route), {
      status: 200,
      headers: getJsonHeaders(),
    });
  } catch (error) {
    return createErrorResponse(error);
  }
});
