/**
 * 관계상태별 궁합 분석 가이드
 */
function getRelationshipGuidance(relationshipStatus: string): string {
  const guidanceMap: Record<string, string> = {
    'dating': `
**현재 연애중인 관계입니다.**
- 현재 관계를 더 발전시키는 방법에 대해 조언하세요
- 궁합이 좋은 부분을 활용하여 관계를 깊게 만드는 방법을 제시하세요
- 주의해야 할 부분이 있다면 함께 극복하는 방법을 알려주세요
- 결혼이나 장기적인 관계 발전에 대한 조언을 포함하세요`,

    'married': `
**부부 관계입니다.**
- 결혼 생활에서 궁합이 미치는 영향을 설명하세요
- 부부 관계를 더욱 조화롭게 만드는 방법을 제시하세요
- 갈등이 생겼을 때 궁합을 바탕으로 한 해결 방법을 알려주세요
- 자녀나 가족 계획에 대한 조언을 포함하세요`,

    'interested': `
**관심 있는 상대입니다.**
- 이 사람과의 궁합을 바탕으로 접근 방법을 조언하세요
- 언제 어떻게 다가가야 좋을지 타이밍을 알려주세요
- 궁합이 좋은 부분을 활용하여 어필하는 방법을 제시하세요
- 주의해야 할 부분이 있다면 미리 준비하는 방법을 알려주세요`,

    'breakup': `
**이별한 관계입니다.**
- 이별의 원인을 궁합 관점에서 분석해주세요
- 재회 가능성과 그 방법에 대해 조언하세요
- 궁합이 좋다면 다시 만날 수 있는 시기를 알려주세요
- 새로운 인연을 찾을 때 참고할 점을 제시하세요`,

    'other': `
**기타 관계입니다.**
- 현재 관계 상태를 고려하여 궁합 분석을 제공하세요
- 관계 발전 방향에 대한 조언을 포함하세요
- 궁합이 좋은 부분과 주의할 부분을 균형있게 설명하세요`
  };

  return guidanceMap[relationshipStatus] || `
**궁합 분석을 제공하세요.**
- 관계 상태에 맞는 구체적인 조언을 포함하세요
- 궁합이 좋은 부분과 주의할 부분을 균형있게 설명하세요`;
}

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
  
  // === Layer 4.5: 상대방 정보 (연애 도사인 경우) ===
  if (expertCategory === 'love' && sajuData.partnerInfo && sajuData.partnerSajuData) {
    const relationshipStatus = sajuData.partnerInfo.relationshipStatus;
    const relationshipGuidance = getRelationshipGuidance(relationshipStatus);
    
    prompt += `\n### 상대방 정보 (궁합 분석용)
상대방 이름: ${sajuData.partnerInfo.name}
관계 상태: ${relationshipStatus}
상대방 사주:
- 년주: ${sajuData.partnerSajuData.yearHangulGanji || ''}
- 월주: ${sajuData.partnerSajuData.monthHangulGanji || ''}
- 일주: ${sajuData.partnerSajuData.dayHangulGanji || ''}
- 시주: ${sajuData.partnerSajuData.timeHangulGanji || ''}
- 십성: ${Array.isArray(sajuData.partnerSajuData?.stemSasin) ? sajuData.partnerSajuData.stemSasin.join(', ') : ''}
- 십이운성: ${Array.isArray(sajuData.partnerSajuData?.sibun) ? sajuData.partnerSajuData.sibun.join(', ') : ''}
- 신살: ${JSON.stringify(sajuData.partnerSajuData.sinsal) || ''}
- 대운: ${JSON.stringify(sajuData.partnerSajuData.daewoon) || ''}

${relationshipGuidance}
`;

    // 궁합 계산 결과가 있으면 포함
    if (sajuData.compatibilityResult) {
      prompt += `\n### 궁합 분석 결과
전체 점수: ${sajuData.compatibilityResult.score}/100
전체 평가: ${sajuData.compatibilityResult.overall}
일주 궁합: ${(sajuData.compatibilityResult.categories as any)?.dayPillar?.score || 0}점 - ${(sajuData.compatibilityResult.categories as any)?.dayPillar?.description || ''}
오행 균형: ${(sajuData.compatibilityResult.categories as any)?.fiveElements?.score || 0}점 - ${(sajuData.compatibilityResult.categories as any)?.fiveElements?.description || ''}
지지 관계: ${(sajuData.compatibilityResult.categories as any)?.jijiRelation?.score || 0}점 - ${(sajuData.compatibilityResult.categories as any)?.jijiRelation?.description || ''}
신살 궁합: ${(sajuData.compatibilityResult.categories as any)?.sinsal?.score || 0}점 - ${(sajuData.compatibilityResult.categories as any)?.sinsal?.description || ''}

위 궁합 분석 결과를 바탕으로 구체적인 조언을 제공하세요.
`;
    }
  }
  
  // === Layer 5: 이전 대화 요약 ===
  if (conversationSummary) {
    prompt += `\n### 이전 대화 요약\n${conversationSummary}\n위 요약을 참고하여 맥락있는 대화를 이어가세요.\n`;
  }
  
  return prompt;
}

