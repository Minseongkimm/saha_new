/// <reference lib="deno.ns" />

/**
 * 공통 타입 정의
 */

// OpenAI 메시지 타입
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// OpenAI 스트리밍 응답 타입
export interface OpenAIStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      content?: string;
      role?: string;
    };
    finish_reason: string | null;
  }>;
}

// Edge Function 요청 타입
export interface StreamingRequest {
  sajuData?: Record<string, unknown>;
  messages?: OpenAIMessage[];
  systemPrompt?: string;
  userPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

// 에러 응답 타입
export interface ErrorResponse {
  error: string;
  details?: string;
  timestamp: string;
}

