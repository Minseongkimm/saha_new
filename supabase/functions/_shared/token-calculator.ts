/// <reference lib="deno.ns" />

/**
 * 토큰 비용 계산 유틸리티
 */

// OpenAI 모델별 토큰 비용 (2024년 기준)
export const TOKEN_COSTS: Record<string, { input: number; output: number }> = {
  "gpt-4o": {
    input: 0.005 / 1000, // $0.005 per 1K tokens (입력)
    output: 0.015 / 1000, // $0.015 per 1K tokens (출력)
  },
  "gpt-4o-mini": {
    input: 0.00015 / 1000, // $0.00015 per 1K tokens (입력)
    output: 0.0006 / 1000, // $0.0006 per 1K tokens (출력)
  },
  "gpt-5.6-luna": {
    input: 0.001 / 1000, // $1.00 per 1M tokens (입력)
    output: 0.006 / 1000, // $6.00 per 1M tokens (출력)
  },
  "gpt-5.6-terra": {
    input: 0.0025 / 1000, // $2.50 per 1M tokens (입력)
    output: 0.015 / 1000, // $15.00 per 1M tokens (출력)
  },
  "gpt-5.6-sol": {
    input: 0.005 / 1000, // $5.00 per 1M tokens (입력)
    output: 0.03 / 1000, // $30.00 per 1M tokens (출력)
  },
  "gpt-4": {
    input: 0.03 / 1000, // $0.03 per 1K tokens (입력)
    output: 0.06 / 1000, // $0.06 per 1K tokens (출력)
  },
  "gpt-3.5-turbo": {
    input: 0.0005 / 1000, // $0.0005 per 1K tokens (입력) - 수정됨
    output: 0.0015 / 1000, // $0.0015 per 1K tokens (출력) - 수정됨
  },
};

/**
 * 토큰 비용 계산
 * @param model - 사용된 모델명
 * @param promptTokens - 입력 토큰 수
 * @param completionTokens - 출력 토큰 수
 * @returns 계산된 비용 (USD)
 */
export function calculateTokenCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const costs = TOKEN_COSTS[model] || TOKEN_COSTS["gpt-4o"];
  const inputCost = promptTokens * costs.input;
  const outputCost = completionTokens * costs.output;

  return Math.round((inputCost + outputCost) * 1000000) / 1000000; // 소수점 6자리까지
}

/**
 * 토큰 사용량 정보를 포맷팅
 * @param usage - OpenAI usage 객체
 * @param model - 사용된 모델명
 * @returns 포맷팅된 토큰 정보
 */
export function formatTokenUsage(usage: any, model: string) {
  const cost = calculateTokenCost(
    model,
    usage.prompt_tokens,
    usage.completion_tokens,
  );

  return {
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
    costUsd: cost,
    model: model,
  };
}

/**
 * 토큰 사용량을 한국어로 포맷팅
 * @param tokens - 토큰 수
 * @returns 포맷팅된 문자열
 */
export function formatTokenCount(tokens: number): string {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}

/**
 * 비용을 한국어로 포맷팅
 * @param costUsd - USD 비용
 * @returns 포맷팅된 문자열
 */
export function formatCost(costUsd: number): string {
  if (costUsd < 0.001) {
    return `$${(costUsd * 1000).toFixed(2)}m`; // 밀리달러
  }
  return `$${costUsd.toFixed(4)}`;
}
