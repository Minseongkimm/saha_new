/**
 * 프롬프트 통합 Export
 */

// 채팅 대화용 프롬프트
// INITIAL_QUESTIONS는 src/constants/initialQuestions.ts로 이동
// getWelcomePrompt, getExpertPrompt는 더 이상 사용하지 않음 (Edge Function에서 처리)

// 분석/생성용 프롬프트
export { getTraditionalSajuPrompt, getTodayFortunePrompt, getNewYearFortunePrompt } from './prompts/analysisPrompts';
