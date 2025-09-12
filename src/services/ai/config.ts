export const AI_CONFIG = {
  MODEL_NAME: "gpt-4o-mini",
  TEMPERATURE: 0.3, // 전문성과 약간의 유연성 균형
  MAX_RECENT_MESSAGES: 5,
  RESPONSE_TIMEOUT: 30000, // 30초
  TARGET_CHAR_LENGTH: 600, // 응답 목표 길이(자)
  // 가짜 스트리밍 속도 조절 (글자나오는 속도)
  STREAM_CHUNK_SIZE: 10,
  STREAM_DELAY_MS: 90,
};

export const ERROR_MESSAGES = {
  NO_API_KEY: "OpenAI API 키가 설정되지 않았습니다.",
  RESPONSE_TIMEOUT: "응답 시간이 초과되었습니다.",
  INVALID_CATEGORY: "잘못된 전문가 카테고리입니다.",
  GENERAL_ERROR: "AI 응답 생성 중 오류가 발생했습니다.",
};
