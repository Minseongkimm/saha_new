/// <reference lib="deno.ns" />

/**
 * Edge Function 공통 설정
 */

// AI 모델 설정
export const AI_CONFIG = {
  DEFAULT_MODEL: 'gpt-4o',
  TRADITIONAL_SAJU_MODEL: 'gpt-4o',
  NEW_YEAR_FORTUNE_MODEL: 'gpt-4o',
  TODAY_FORTUNE_MODEL: 'gpt-4o',
  CHAT_MODEL: 'gpt-4o',
  
  TEMPERATURE: 0.7,
  TOP_P: 1.0,
  FREQUENCY_PENALTY: 0.0,
  PRESENCE_PENALTY: 0.0,
  MAX_TOKENS: 500,

  // 요약 관련 AI 설정
  SUMMARY_MODEL: 'gpt-4o-mini',
  SUMMARY_TEMPERATURE: 0.3,
  SUMMARY_MAX_TOKENS: 200,
};

export function getEnvVar(key: string, required: boolean = true): string {
  const value = Deno.env.get(key);
  
  if (required && !value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  
  return value || '';
}

export function log(level: string, message: string, data?: unknown): void {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  console.log(prefix, message, data ? JSON.stringify(data) : '');
}

