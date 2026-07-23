/// <reference lib="deno.ns" />

import { handleCorsPreFlight, getJsonHeaders } from '../_shared/cors.ts';
import { AI_CONFIG, getEnvVar, log } from '../_shared/config.ts';
import { createErrorResponse, validateEnvVars, validateRequest } from '../_shared/error-handler.ts';

type InfoIntent =
  | 'normal_chat'
  | 'self_birth_info'
  | 'partner_birth_info'
  | 'partner_selection_needed';

interface ClassifyInfoIntentRequest {
  message: string;
}

interface ClassifyInfoIntentResponse {
  intent: InfoIntent;
  confidence: number;
  reason: string;
}

const VALID_INTENTS: InfoIntent[] = [
  'normal_chat',
  'self_birth_info',
  'partner_birth_info',
  'partner_selection_needed',
];

const DEFAULT_RESPONSE: ClassifyInfoIntentResponse = {
  intent: 'normal_chat',
  confidence: 0.35,
  reason: '애매하면 입력을 요구하지 않고 일반 상담으로 진행합니다.',
};

const INFO_INTENT_SYSTEM_PROMPT = `너는 사주 AI 상담 앱의 정보입력 플로우 분류기다.

할 일:
- 상담 답변을 하지 않는다.
- 사용자의 문장이 출생정보/상대방정보 입력 UI를 띄울 필요가 있는지만 판단한다.
- 애매하면 반드시 normal_chat을 선택한다.

intent:
- normal_chat: 일반 상담 질문. 입력 UI를 띄우지 않는다.
- self_birth_info: 사용자가 본인의 생년월일, 출생시간, 간지/일주 등 사주정보를 제공하거나 수정하려 한다.
- partner_birth_info: 사용자가 상대방의 생년월일, 출생시간, 간지/일주 등 사주정보를 제공하거나 수정하려 한다.
- partner_selection_needed: 사용자가 궁합/잘 맞는지/상대와의 관계 흐름을 보려 하지만 상대 정보가 아직 필요해 보인다.

중요 규칙:
- "지금 고민이 많아요 시기가 그런 시기인가요?", "요즘 힘든 시기인가요?", "오늘 3시에 연락할까요?" 같은 시기/타이밍 질문은 normal_chat이다.
- "시기", "시간", "언제"라는 말만으로 출생정보 입력이라고 판단하지 않는다.
- 특정 상대가 전제인 질문은 partner_selection_needed다. 예: "헤어진 상대 속마음", "상대 연락 언제 올까", "그 사람 마음", "재회 가능할까", "우리 관계 어떻게 될까", "우리 둘 운명인가", "궁합 봐줘", "궁합 점수".
- 특정 상대가 없는 연애운 질문은 normal_chat이다. 예: "새로운 인연 언제 올까", "언제 연애할까", "솔로탈출 가능할까", "결혼운 어때".
- 짧은 후속 질문이라도 연애/관계 맥락으로 보이는 연락·이별 표현은 partner_selection_needed다. 예: "연락 안오는데?", "연락..", "언제 연락 와?", "헤어져야 하나요?", "고백하긴 할까?".
- 업무/회사/시험/지원/상사/동료/주임/거래처/학교 행정처럼 비연애 대상의 연락 질문은 normal_chat이다.
- 실제 생년월일/출생시간/간지 정보가 보일 때만 self_birth_info 또는 partner_birth_info를 선택한다.
- 답변은 반드시 JSON 객체 하나만 반환한다.

형식:
{"intent":"normal_chat|self_birth_info|partner_birth_info|partner_selection_needed","confidence":0.0,"reason":"짧은 한국어 이유"}`;

function isValidIntent(intent: unknown): intent is InfoIntent {
  return typeof intent === 'string' && VALID_INTENTS.includes(intent as InfoIntent);
}

function normalizeClassification(value: unknown): ClassifyInfoIntentResponse {
  if (!value || typeof value !== 'object') {
    return DEFAULT_RESPONSE;
  }

  const classification = value as Record<string, unknown>;
  const intent = isValidIntent(classification.intent)
    ? classification.intent
    : DEFAULT_RESPONSE.intent;
  const rawConfidence = typeof classification.confidence === 'number'
    ? classification.confidence
    : DEFAULT_RESPONSE.confidence;
  const confidence = Math.max(0, Math.min(1, rawConfidence));
  const reason = typeof classification.reason === 'string' && classification.reason.trim()
    ? classification.reason.trim().slice(0, 100)
    : DEFAULT_RESPONSE.reason;

  return { intent, confidence, reason };
}

async function classifyWithOpenAI(message: string, apiKey: string): Promise<ClassifyInfoIntentResponse> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: AI_CONFIG.ROUTER_MODEL,
      messages: [
        { role: 'system', content: INFO_INTENT_SYSTEM_PROMPT },
        { role: 'user', content: `사용자 메시지: ${message}` },
      ],
      temperature: 0,
      max_tokens: 100,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    log('error', 'Info intent classification failed', { status: response.status, errorText });
    return DEFAULT_RESPONSE;
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    return DEFAULT_RESPONSE;
  }

  try {
    return normalizeClassification(JSON.parse(content));
  } catch (error) {
    log('error', 'Info intent JSON parse failed', { error, content });
    return DEFAULT_RESPONSE;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight();
  }

  try {
    validateEnvVars(['OPENAI_API_KEY']);

    const body = await req.json() as Partial<ClassifyInfoIntentRequest>;
    validateRequest(body, ['message']);

    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) {
      return new Response(JSON.stringify(DEFAULT_RESPONSE), {
        status: 200,
        headers: getJsonHeaders(),
      });
    }

    const apiKey = getEnvVar('OPENAI_API_KEY');
    const classification = await classifyWithOpenAI(message.slice(0, 500), apiKey);

    return new Response(JSON.stringify(classification), {
      status: 200,
      headers: getJsonHeaders(),
    });
  } catch (error) {
    return createErrorResponse(error);
  }
});
