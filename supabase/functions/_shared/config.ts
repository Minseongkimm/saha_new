/// <reference lib="deno.ns" />

/**
 * Edge Function 공통 설정
 */

// AI 모델 설정
export const AI_CONFIG = {
  TRADITIONAL_SAJU_MODEL: "gpt-4o",
  NEW_YEAR_FORTUNE_MODEL: "gpt-4o",
  TODAY_FORTUNE_MODEL: "gpt-4o-mini",
  CHAT_MODEL: "gpt-5.6-luna",
  ROUTER_MODEL: "gpt-4o-mini",

  TEMPERATURE: 0.7,
  TOP_P: 1.0,
  FREQUENCY_PENALTY: 0.0,
  PRESENCE_PENALTY: 0.0,
  MAX_TOKENS: 1200, // 800자 응답 목표 + 팔로업 질문 여유분 (한글은 글자당 토큰 소비가 커서 여유를 둠, 단 비용 상한은 타이트하게)
  TRADITIONAL_SAJU_MAX_TOKENS: 2500, // 정통사주는 상세 해석이 필요하므로 더 높은 토큰 제한
  NEW_YEAR_FORTUNE_MAX_TOKENS: 2500, // 신년운세는 JSON 형식의 긴 응답이 필요하므로 더 높은 토큰 제한

  // 요약 관련 AI 설정
  SUMMARY_MODEL: "gpt-4o-mini",
  SUMMARY_TEMPERATURE: 0.3,
  SUMMARY_MAX_TOKENS: 200,
  ROUTER_TEMPERATURE: 0.1,
  ROUTER_MAX_TOKENS: 120,
};

export function getEnvVar(key: string, required: boolean = true): string {
  const value = Deno.env.get(key);

  if (required && !value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }

  return value || "";
}

export function log(level: string, message: string, data?: unknown): void {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  console.log(prefix, message, data ? JSON.stringify(data) : "");
}
