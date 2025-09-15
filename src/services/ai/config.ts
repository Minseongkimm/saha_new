export const AI_CONFIG = {
  // MODEL_NAME: LLM family/version. 추론력 강화 필요 시 상위 모델 사용
  MODEL_NAME: "gpt-4o",
  // TEMPERATURE: 창의성/다양성 제어(0=결정적, 높을수록 변주). 상담 톤은 0.5 권장
  TEMPERATURE: 0.5,
  // MAX_RECENT_MESSAGES: 프롬프트에 포함할 최근 대화 길이(맥락 유지 범위)
  MAX_RECENT_MESSAGES: 12,
  // RESPONSE_TIMEOUT(ms): LLM 응답 대기 타임아웃
  RESPONSE_TIMEOUT: 30000,
  // TARGET_CHAR_LENGTH: 답변 목표 길이(자). 장황함 방지용 가이드
  TARGET_CHAR_LENGTH: 450,
  // STREAM_*: 클라이언트 측 가짜 스트리밍(텍스트 점진 표시) 속도 제어
  STREAM_CHUNK_SIZE: 12,
  STREAM_DELAY_MS: 70,
  // 샘플링/패널티: 표현 중복 억제와 주제 다양성 유도
  TOP_P: 0.9,
  FREQUENCY_PENALTY: 0.6,
  PRESENCE_PENALTY: 0.3,
};

export const ERROR_MESSAGES = {
  NO_API_KEY: "OpenAI API 키가 설정되지 않았습니다.",
  RESPONSE_TIMEOUT: "응답 시간이 초과되었습니다.",
  INVALID_CATEGORY: "잘못된 전문가 카테고리입니다.",
  GENERAL_ERROR: "AI 응답 생성 중 오류가 발생했습니다.",
};
