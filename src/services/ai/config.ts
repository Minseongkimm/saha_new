export const AI_CONFIG = {
  MODEL_NAME: "gpt-4o-mini",
  TEMPERATURE: 0,
  MAX_RECENT_MESSAGES: 5,
  RESPONSE_TIMEOUT: 30000, // 30초
};

export const ERROR_MESSAGES = {
  NO_API_KEY: "OpenAI API 키가 설정되지 않았습니다.",
  RESPONSE_TIMEOUT: "응답 시간이 초과되었습니다.",
  INVALID_CATEGORY: "잘못된 전문가 카테고리입니다.",
  GENERAL_ERROR: "AI 응답 생성 중 오류가 발생했습니다.",
};
