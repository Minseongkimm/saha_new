/**
 * 오늘의 운세 계산기
 * 사주 정보와 오늘 날짜를 활용하여 운세를 계산합니다.
 */

import { SajuUtils } from './saju-calculator/utils/SajuUtils';
import { FiveElement } from './saju-calculator/types';

export interface UserSajuData {
  yearGanji: string;
  monthGanji: string;
  dayGanji: string;
  timeGanji: string;
  sinsal: {
    yearSinsal: string[];
    monthSinsal: string[];
    daySinsal: string[];
    timeSinsal: string[];
  };
  guin: {
    [key: string]: string[];  // 모든 귀인 종류를 포함
  };
  jijiRelations: {
    삼합: string[];
    육합: string[];
    삼형: string[];
    육충: string[];
    방합: string[];
  };
  fiveProperties: {
    yearProperty: string;
    monthProperty: string;
    dayProperty: string;
    timeProperty: string;
  };
  gongmang: string;
}

export interface InteractionResult {
  type: string;
  score: number;
  description: string;
}

export interface SinsalResult {
  activated: string[];
  score: number;
  description: string;
}

export interface TodayFortuneResult {
  totalScore: number;
  categoryScores: {
    career: number;
    love: number;
    wealth: number;
    relationship: number;
  };
  interactions: {
    ganInteraction: InteractionResult;
    jiInteraction: InteractionResult;
    sinsalInteraction: SinsalResult;
  };
  todayGanji: {
    yearGanji: string;
    monthGanji: string;
    dayGanji: string;
    timeGanji: string;
  };
  personalSaju: {
    dayGanji: string;
    sinsal: string[];
    guin: string[];
    jijiRelations: string[];
  };
}

export class TodayFortuneCalculator {
  /**
   * 오늘의 운세 계산 메인 메서드
   */
  calculateTodayFortune(userSajuData: UserSajuData, todayDate: string): TodayFortuneResult {
    // 1. 날짜 유효성 검사 및 오늘 간지 계산
    let validDate = todayDate;
    try {
      const testDate = new Date(todayDate);
      if (isNaN(testDate.getTime()) || !todayDate || typeof todayDate !== 'string') {
        validDate = new Date().toISOString().split('T')[0]; // 오늘 날짜로 fallback
      }
    } catch (error) {
      validDate = new Date().toISOString().split('T')[0]; // 오늘 날짜로 fallback
    }

    const todayGanji = SajuUtils.getTodayGanji(validDate);
    
    // 2. 상호작용 분석
    const ganInteraction = this.analyzeGanInteraction(todayGanji.dayGanji[0], userSajuData.dayGanji[0]);
    const jiInteraction = this.analyzeJiInteraction(todayGanji.dayGanji[1], userSajuData.jijiRelations);
    const sinsalInteraction = this.analyzeSinsalInteraction(todayGanji.dayGanji, userSajuData.sinsal);
    
    // 3. 비중 기반 점수 계산 (스케일링 적용)
    const baseScore = 50;
    const ganjiScore = Math.min((ganInteraction.score + jiInteraction.score) * 0.5, 25); // 50% 비중, 최대 25점
    const sinsalScore = Math.min(sinsalInteraction.score * 0.25, 12.5); // 25% 비중, 최대 12.5점
    const guinScore = Math.min(this.calculateGuinScore(todayGanji.dayGanji, userSajuData.guin) * 0.15, 7.5); // 15% 비중, 최대 7.5점
    const randomScore = Math.min(this.calculateRandomScore(todayDate) * 0.1, 5); // 10% 비중, 최대 5점
    
    const totalScore = Math.max(1, Math.min(100, 
      baseScore + ganjiScore + sinsalScore + guinScore + randomScore
    ));
    
    // 4. 카테고리별 점수 계산
    const careerScore = this.calculateCareerScore(totalScore, todayGanji, userSajuData);
    const loveScore = this.calculateLoveScore(totalScore, todayGanji, userSajuData);
    const wealthScore = this.calculateWealthScore(totalScore, todayGanji, userSajuData);
    const relationshipScore = this.calculateRelationshipScore(totalScore, todayGanji, userSajuData);
    
    return {
      totalScore,
      categoryScores: {
        career: careerScore,
        love: loveScore,
        wealth: wealthScore,
        relationship: relationshipScore
      },
      interactions: {
        ganInteraction,
        jiInteraction,
        sinsalInteraction
      },
      todayGanji: {
        yearGanji: todayGanji.yearGanji,
        monthGanji: todayGanji.monthGanji,
        dayGanji: todayGanji.dayGanji,
        timeGanji: todayGanji.timeGanji
      },
      personalSaju: {
        dayGanji: userSajuData.dayGanji,
        sinsal: Object.values(userSajuData.sinsal).flat(),
        guin: Object.values(userSajuData.guin).flat(),
        jijiRelations: Object.values(userSajuData.jijiRelations).flat()
      }
    };
  }

  /**
   * 천간 상호작용 분석
   */
  private analyzeGanInteraction(todayGan: string, myDayGan: string): InteractionResult {
    const todayProperty = SajuUtils.getProperty(todayGan);
    const myProperty = SajuUtils.getProperty(myDayGan);
    
    if (SajuUtils.isSangsaeng(todayProperty, myProperty)) {
      return {
        type: "상생",
        score: 15,
        description: `오늘의 천간 ${todayGan}과 당신의 일간 ${myDayGan}이 상생관계로 서로 도움이 됩니다.`
      };
    } else if (SajuUtils.isSanggeuk(todayProperty, myProperty)) {
      return {
        type: "상극",
        score: -10,
        description: `오늘의 천간 ${todayGan}과 당신의 일간 ${myDayGan}이 상극관계로 주의가 필요합니다.`
      };
    } else if (todayGan === myDayGan) {
      return {
        type: "같음",
        score: 8,
        description: `오늘의 천간 ${todayGan}과 당신의 일간 ${myDayGan}이 같아 성향이 비슷합니다.`
      };
    } else {
      return {
        type: "중립",
        score: 0,
        description: `오늘의 천간 ${todayGan}과 당신의 일간 ${myDayGan}이 중립관계입니다.`
      };
    }
  }

  /**
   * 지지 상호작용 분석
   */
  private analyzeJiInteraction(todayJi: string, jijiRelations: any): InteractionResult {
    let score = 0;
    let type = "없음";
    let description = "특별한 지지 관계가 없습니다.";
    
    // 삼합 관계 확인
    if (this.hasSamhap(todayJi, jijiRelations.삼합)) {
      score += 12;
      type = "삼합";
      description = `오늘의 지지 ${todayJi}와 당신의 지지들이 삼합관계로 조화롭습니다.`;
    }
    
    // 육합 관계 확인
    if (this.hasYukhap(todayJi, jijiRelations.육합)) {
      score += 8;
      if (type === "없음") {
        type = "육합";
        description = `오늘의 지지 ${todayJi}와 당신의 지지들이 육합관계로 조화롭습니다.`;
      }
    }
    
    // 충 관계 확인
    if (this.hasChung(todayJi, jijiRelations.육충)) {
      score -= 15;
      type = "충";
      description = `오늘의 지지 ${todayJi}와 당신의 지지들이 충관계로 갈등이 있을 수 있습니다.`;
    }
    
    return { type, score, description };
  }

  /**
   * 신살 상호작용 분석
   */
  private analyzeSinsalInteraction(todayGanji: string, sinsal: any): SinsalResult {
    const todayGan = todayGanji[0];
    const todayJi = todayGanji[1];
    let score = 0;
    const activated: string[] = [];
    
    // 모든 신살을 하나의 배열로 합치기
    const allSinsal = Object.values(sinsal).flat();
    
    // 긍정적 신살 발동 확인 (귀인은 제외하고 신살만)
    // 신살은 부정적 요소만 계산
    
    // 부정적 신살 발동 확인
    if (allSinsal.includes("장성살") && this.isSinsalActivated(todayJi, "장성살")) {
      score -= 15;
      activated.push("장성살");
    }
    if (allSinsal.includes("화개살") && this.isSinsalActivated(todayJi, "화개살")) {
      score -= 10;
      activated.push("화개살");
    }
    if (allSinsal.includes("백호살") && this.isSinsalActivated(todayJi, "백호살")) {
      score -= 10;
      activated.push("백호살");
    }
    if (allSinsal.includes("양인살") && this.isSinsalActivated(todayJi, "양인살")) {
      score -= 8;
      activated.push("양인살");
    }
    
    const description = activated.length > 0 
      ? `오늘의 간지로 인해 ${activated.join(', ')}이 발동됩니다.`
      : "특별한 신살 발동이 없습니다.";
    
    return { activated, score, description };
  }

  /**
   * 직업운 점수 계산
   */
  private calculateCareerScore(baseScore: number, todayGanji: any, userSaju: UserSajuData): number {
    let score = baseScore;
    
    // 요일 보너스 (월요일)
    const dayOfWeek = new Date().getDay();
    if (dayOfWeek === 1) score += 5;
    
    // 편관살/정관살 발동
    const allSinsal = Object.values(userSaju.sinsal).flat();
    if (allSinsal.includes("편관살") && this.isSinsalActivated(todayGanji.dayGanji[1], "편관살")) {
      score += 8;
    }
    if (allSinsal.includes("정관살") && this.isSinsalActivated(todayGanji.dayGanji[1], "정관살")) {
      score += 10;
    }
    
    return Math.max(1, Math.min(100, score));
  }

  /**
   * 연애운 점수 계산
   */
  private calculateLoveScore(baseScore: number, todayGanji: any, userSaju: UserSajuData): number {
    let score = baseScore;
    
    // 요일 보너스 (금요일)
    const dayOfWeek = new Date().getDay();
    if (dayOfWeek === 5) score += 5;
    
    // 육합/삼합 관계
    if (this.hasYukhap(todayGanji.dayGanji[1], userSaju.jijiRelations.육합)) {
      score += 10;
    }
    if (this.hasSamhap(todayGanji.dayGanji[1], userSaju.jijiRelations.삼합)) {
      score += 8;
    }
    
    return Math.max(1, Math.min(100, score));
  }

  /**
   * 재물운 점수 계산
   */
  private calculateWealthScore(baseScore: number, todayGanji: any, userSaju: UserSajuData): number {
    let score = baseScore;
    
    // 월말 보너스
    const dayOfMonth = new Date().getDate();
    if (dayOfMonth >= 25) score += 3;
    
    // 정재살/편재살 발동
    const allSinsal = Object.values(userSaju.sinsal).flat();
    if (allSinsal.includes("정재살") && this.isSinsalActivated(todayGanji.dayGanji[1], "정재살")) {
      score += 12;
    }
    if (allSinsal.includes("편재살") && this.isSinsalActivated(todayGanji.dayGanji[1], "편재살")) {
      score += 8;
    }
    
    return Math.max(1, Math.min(100, score));
  }

  /**
   * 인간관계 점수 계산
   */
  private calculateRelationshipScore(baseScore: number, todayGanji: any, userSaju: UserSajuData): number {
    let score = baseScore;
    
    // 주말 보너스
    const dayOfWeek = new Date().getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) score += 3;
    
    // 삼합 관계
    if (this.hasSamhap(todayGanji.dayGanji[1], userSaju.jijiRelations.삼합)) {
      score += 10;
    }
    
    // 충 관계 감점
    if (this.hasChung(todayGanji.dayGanji[1], userSaju.jijiRelations.육충)) {
      score -= 8;
    }
    
    return Math.max(1, Math.min(100, score));
  }

  // 헬퍼 메서드들
  private hasSamhap(todayJi: string, samhapList: string[]): boolean {
    // 간단한 삼합 확인 로직
    const samhapGroups = [
      ['申', '子', '辰'],
      ['亥', '卯', '未'],
      ['寅', '午', '戌'],
      ['巳', '酉', '丑']
    ];
    
    for (const group of samhapGroups) {
      if (group.includes(todayJi)) {
        return samhapList.some(item => group.some(ji => item.includes(ji)));
      }
    }
    return false;
  }

  private hasYukhap(todayJi: string, yukhapList: string[]): boolean {
    const yukhapPairs: { [key: string]: string } = {
      '子': '丑', '丑': '子',
      '寅': '亥', '亥': '寅',
      '卯': '戌', '戌': '卯',
      '辰': '酉', '酉': '辰',
      '巳': '申', '申': '巳',
      '午': '未', '未': '午'
    };
    
    const pairJi = yukhapPairs[todayJi];
    return pairJi ? yukhapList.some(item => item.includes(pairJi)) : false;
  }

  private hasChung(todayJi: string, chungList: string[]): boolean {
    const chungPairs: { [key: string]: string } = {
      '子': '午', '午': '子',
      '丑': '未', '未': '丑',
      '寅': '申', '申': '寅',
      '卯': '酉', '酉': '卯',
      '辰': '戌', '戌': '辰',
      '巳': '亥', '亥': '巳'
    };
    
    const pairJi = chungPairs[todayJi];
    return pairJi ? chungList.some(item => item.includes(pairJi)) : false;
  }

  private isGuinActivated(todayJi: string, guinType: string): boolean {
    // 귀인 발동 확인 로직 (정확한 조건 매칭)
    const guinMap: { [key: string]: string[] } = {
      '천을귀인': ['丑', '未', '子', '申', '亥', '酉', '午', '寅', '卯', '巳'],
      '월령': ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'],
      '천덕귀인': ['辰', '戌', '丑', '未'],
      '월덕귀인': ['辰', '戌', '丑', '未'],
      '복성귀인': ['巳', '午'],
      '천주귀인': ['申', '酉']
    };
    
    // 정확한 귀인 조건 확인
    const validJis = guinMap[guinType];
    if (!validJis) return false;
    
    return validJis.includes(todayJi);
  }

  private isSinsalActivated(todayJi: string, sinsalType: string): boolean {
    // 신살 발동 확인 로직 (간단화)
    const sinsalMap: { [key: string]: string[] } = {
      '장성살': ['寅', '卯'],
      '화개살': ['申', '酉'],
      '백호살': ['寅'],
      '양인살': ['辰', '戌', '丑', '未'],
      '편관살': ['申'],
      '정관살': ['寅'],
      '정재살': ['巳', '午'],
      '편재살': ['寅']
    };
    
    return sinsalMap[sinsalType]?.includes(todayJi) || false;
  }

  /**
   * 귀인 점수 계산 (15% 비중)
   */
  private calculateGuinScore(todayGanji: string, guinData: { [key: string]: string[] }): number {
    const todayJi = todayGanji[1];
    let score = 0;
    
    // 각 귀인별 점수 계산
    Object.entries(guinData).forEach(([guinType, guinList]) => {
      if (guinList.length > 0 && this.isGuinActivated(todayJi, guinType)) {
        switch (guinType) {
          case '천을귀인':
            score += 15; // 가장 강력한 귀인
            break;
          case '월령':
            score += 12; // 월령 귀인
            break;
          case '복성귀인':
            score += 10; // 복성귀인
            break;
          case '월덕귀인':
            score += 8;  // 월덕귀인
            break;
          case '천덕귀인':
            score += 8;  // 천덕귀인
            break;
          case '천주귀인':
            score += 5;  // 천주귀인
            break;
          default:
            score += 3; // 기타 모든 귀인 (DB에서 올 수 있는 모든 귀인)
        }
      }
    });
    
    return score;
  }

  /**
   * 랜덤성 요소 점수 계산 (10% 비중, 최대 50점)
   */
  private calculateRandomScore(todayDate: string): number {
    const date = new Date(todayDate);
    const dayOfWeek = date.getDay();
    const dayOfMonth = date.getDate();
    const month = date.getMonth() + 1;
    let score = 0;
    
    // 요일 보너스 (조정된 점수)
    switch (dayOfWeek) {
      case 1: // 월요일 - 직업운
        score += 3; // 5 → 3으로 조정
        break;
      case 5: // 금요일 - 연애운
        score += 3; // 5 → 3으로 조정
        break;
      case 0: // 일요일 - 인간관계
      case 6: // 토요일 - 인간관계
        score += 2; // 3 → 2로 조정
        break;
    }
    
    // 월말 보너스 (재물운)
    if (dayOfMonth >= 25) {
      score += 2; // 3 → 2로 조정
    }
    
    // 계절 보너스 (간단화)
    if (month >= 3 && month <= 5) { // 봄
      score += 1; // 2 → 1로 조정
    } else if (month >= 6 && month <= 8) { // 여름
      score += 1; // 2 → 1로 조정
    } else if (month >= 9 && month <= 11) { // 가을
      score += 1; // 2 → 1로 조정
    } else { // 겨울
      score += 0.5; // 1 → 0.5로 조정
    }
    
    // 날짜 특별 보너스 (1일, 15일 등)
    if (dayOfMonth === 1 || dayOfMonth === 15) {
      score += 1; // 2 → 1로 조정
    }
    
    // 최대 50점으로 제한 (10% 비중 유지)
    return Math.min(score, 50);
  }
}

export const todayFortuneCalculator = new TodayFortuneCalculator();
