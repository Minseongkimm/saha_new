/**
 * 채팅 프롬프트 메인 조합 함수
 */

// Base imports
import { getAnswerFramework } from './base/answer-framework.ts';
import { getFollowUpFormat } from './base/followup-format.ts';
import { getSecurityRules } from './base/security-rules.ts';
import { getNonRepetitiveRules } from './base/non-repetitive.ts';
import { getPunctuationRules } from './base/punctuation-rules.ts';
import { formatSajuContext } from './base/saju-context-formatter.ts';
import { getCurrentContext } from './base/current-context.ts';

// Expert imports
import { getTraditionalSajuPrompt } from './experts/traditional-saju.ts';
import { getTodayFortunePrompt } from './experts/today-fortune.ts';
import { getNewYearFortunePrompt } from './experts/newyear-fortune.ts';
import { getComprehensivePrompt } from './experts/comprehensive.ts';
import { getCareerPrompt } from './experts/career.ts';
import { getLovePrompt } from './experts/love.ts';
import { getHealthPrompt } from './experts/health.ts';
import { getMoneyPrompt } from './experts/money.ts';

/**
 * 최종 채팅 프롬프트 조합
 */
export function buildChatPrompt(
  expertCategory: string,
  expertInfo: any,
  sajuData: any,
  conversationSummary?: string
): string {
  let prompt = '';
  
  // === Layer 1: 현재 시점 (오늘 날짜) ===
  prompt += getCurrentContext();
  
  // === Layer 2: 전체 공통 규칙 ===
  prompt += getAnswerFramework();
  prompt += getFollowUpFormat();
  prompt += getPunctuationRules();
  prompt += getNonRepetitiveRules();
  prompt += getSecurityRules();
  
  // === Layer 3: 개별 전문가 (role + tone + 전문성) ===
  const expertPrompts: Record<string, (expertInfo: any) => string> = {
    'traditional_saju': getTraditionalSajuPrompt,
    'today_fortune': getTodayFortunePrompt,
    'newyear_fortune': getNewYearFortunePrompt,
    'comprehensive': getComprehensivePrompt,
    'career': getCareerPrompt,
    'love': getLovePrompt,
    'health': getHealthPrompt,
    'money': getMoneyPrompt,
  };
  
  if (expertPrompts[expertCategory]) {
    prompt += expertPrompts[expertCategory](expertInfo);
  } else {
    // fallback
    prompt += `
### 역할
- ${expertInfo.name || '사주 전문가'}
- ${expertInfo.expert_quote || ''}
`;
  }
  
  // === Layer 4: 사주 데이터 ===
  prompt += formatSajuContext();
  
  // === Layer 5: 이전 대화 요약 ===
  if (conversationSummary) {
    prompt += `\n### 이전 대화 요약\n${conversationSummary}\n위 요약을 참고하여 맥락있는 대화를 이어가세요.\n`;
  }
  
  return prompt;
}

