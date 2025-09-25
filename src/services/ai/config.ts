export const AI_CONFIG = {
  // MODEL_NAME: LLM family/version. 추론력 강화 필요 시 상위 모델 사용
  MODEL_NAME: "gpt-4o",
  // TRADITIONAL_SAJU_MODEL: 정통사주 해석 전용 모델 (빠른 응답을 위해)
  TRADITIONAL_SAJU_MODEL: "gpt-4o-mini",
  // TODAY_FORTUNE_MODEL: 오늘의 운세 전용 모델 (빠른 응답을 위해)
  TODAY_FORTUNE_MODEL: "gpt-4o-mini",
  // TEMPERATURE: 창의성/다양성 제어(0=결정적, 높을수록 변주). 상담 톤은 0.5 권장
  TEMPERATURE: 1.2,
  // MAX_RECENT_MESSAGES: 프롬프트 길이 단축으로 속도 향상
  MAX_RECENT_MESSAGES: 8,
  // RESPONSE_TIMEOUT(ms): LLM 응답 대기 타임아웃
  RESPONSE_TIMEOUT: 45000,
  // TARGET_CHAR_LENGTH: 답변 길이 단축으로 생성 속도 향상
  TARGET_CHAR_LENGTH: 300,
  // STREAM_*: 클라이언트 측 가짜 스트리밍(텍스트 점진 표시) 속도 제어
  STREAM_CHUNK_SIZE: 12,
  STREAM_DELAY_MS: 50,
  // 샘플링/패널티: 표현 중복 억제와 주제 다양성 유도
  TOP_P: 0.8,
  FREQUENCY_PENALTY: 0.3,
  PRESENCE_PENALTY: 0.2,
};

export const ERROR_MESSAGES = {
  NO_API_KEY: "OpenAI API 키가 설정되지 않았습니다.",
  RESPONSE_TIMEOUT: "응답 시간이 초과되었습니다.",
  INVALID_CATEGORY: "잘못된 전문가 카테고리입니다.",
  GENERAL_ERROR: "AI 응답 생성 중 오류가 발생했습니다.",
};
