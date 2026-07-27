/**
 * 신년운세 계산 로직
 * 사용자의 사주와 해당 연도의 간지를 분석하여 신년운세를 계산합니다.
 */

import { SajuUtils } from '../saju-calculator/utils/SajuUtils';
import { SAMHAP_GROUPS, isYukhap, isChung, isHyeong } from '../saju-calculator/constants/branch_relations';

/**
 * 신년운세 결과 인터페이스
 */
export interface NewYearFortuneResult {
  year: number;
  yearName: string;
  yearDescription: string;
  monthlyFortunes: MonthlyFortune[];
  yearGanji: {
    yearGanji: string;
    element: string;
    animal: string;
  };
  interactions: {
    yearInteraction: InteractionResult;
    elementInteraction: InteractionResult;
    daewoonInteraction: InteractionResult;
    sinsalInteraction: InteractionResult;
  };
  luckyMonths: number[];
  cautiousMonths: number[];
}

export interface MonthlyFortune {
  month: number;
  summary: string;
  monthGanji: string;
  interaction: InteractionResult;
}

export interface InteractionResult {
  type: string;
  score: number;
  description: string;
}

export interface UserSajuData {
  yearGanji: string;
  monthGanji: string;
  dayGanji: string;
  timeGanji: string;
  sinsal: Record<string, string[]>;
  guin: Record<string, string[]>;
  jijiRelations: Record<string, string[]>;
  fiveProperties: Record<string, number>;
  daewoon: Array<{ age: number; ganji: string }>;
  birthYear: number; // 출생 연도 추가
}

export class NewYearFortuneCalculator {
  /**
   * 신년운세 계산 메인 메서드
   */
  calculateNewYearFortune(userSajuData: UserSajuData, targetYear: number): NewYearFortuneResult {
    // 1. 해당 연도의 간지 계산
    const yearGanjiInfo = this.getYearGanjiInfo(targetYear);
    
    // 2. 월별 운세 계산
    const monthlyFortunes = this.calculateMonthlyFortunes(userSajuData, targetYear, yearGanjiInfo);
    
    // 3. 상호작용 분석
    const interactions = this.analyzeInteractions(userSajuData, yearGanjiInfo, targetYear);
    
    // 4. 길한 달과 조심할 달 추출
    const { luckyMonths, cautiousMonths } = this.identifyKeyMonths(monthlyFortunes);
    
    return {
      year: targetYear,
      yearName: yearGanjiInfo.name,
      yearDescription: yearGanjiInfo.description,
      monthlyFortunes,
      yearGanji: {
        yearGanji: yearGanjiInfo.ganji,
        element: yearGanjiInfo.element,
        animal: yearGanjiInfo.animal,
      },
      interactions,
      luckyMonths,
      cautiousMonths,
    };
  }

  /**
   * 해당 연도의 간지 정보 가져오기 (임의의 연도에 대해 일반적으로 동작)
   */
  private getYearGanjiInfo(year: number): {
    ganji: string;
    name: string;
    element: string;
    animal: string;
    description: string;
  } {
    const ganji = SajuUtils.getYearGanji(year);
    const gan = ganji[0];
    const ji = ganji[1];

    // 천간별 색상 (오행 기준: 갑을=청, 병정=적, 무기=황, 경신=백, 임계=흑)
    const stemColor: Record<string, string> = {
      '甲': '청', '乙': '청',
      '丙': '적', '丁': '적',
      '戊': '황', '己': '황',
      '庚': '백', '辛': '백',
      '壬': '흑', '癸': '흑',
    };

    // 지지별 동물 (12지신)
    const branchAnimal: Record<string, string> = {
      '子': '쥐', '丑': '소', '寅': '호랑이', '卯': '토끼',
      '辰': '용', '巳': '뱀', '午': '말', '未': '양',
      '申': '원숭이', '酉': '닭', '戌': '개', '亥': '돼지',
    };

    // 천간별 오행 (한자 표기)
    const stemElement: Record<string, string> = {
      '甲': '木', '乙': '木',
      '丙': '火', '丁': '火',
      '戊': '土', '己': '土',
      '庚': '金', '辛': '金',
      '壬': '水', '癸': '水',
    };

    const elementDescription: Record<string, string> = {
      '木': '변화와 성장의 기운',
      '火': '열정과 도약의 기운',
      '土': '안정과 결실의 기운',
      '金': '결단과 결실의 기운',
      '水': '지혜와 유연함의 기운',
    };

    const animal = `${stemColor[gan]}${branchAnimal[ji]}`;
    const element = stemElement[gan];
    const name = `${SajuUtils.getHanjaToHangulString(ganji)}년`;
    const description = `${animal}의 해. ${elementDescription[element]}`;

    return { ganji, name, element, animal, description };
  }


  /**
   * 천간 상호작용 분석
   */
  private analyzeGanInteraction(myGan: string, yearGan: string): InteractionResult {
    // 오행 매핑
    const ganToElement: Record<string, string> = {
      '甲': '木', '乙': '木',
      '丙': '火', '丁': '火',
      '戊': '土', '己': '土',
      '庚': '金', '辛': '金',
      '壬': '水', '癸': '水',
    };

    const myElement = ganToElement[myGan];
    const yearElement = ganToElement[yearGan];

    // 상생/상극 관계
    const sangseong: Record<string, string> = {
      '木': '火', '火': '土', '土': '金', '金': '水', '水': '木'
    };
    
    const sangguk: Record<string, string> = {
      '木': '土', '土': '水', '水': '火', '火': '金', '金': '木'
    };

    if (myElement === yearElement) {
      return { type: '비겁(동기)', score: 5, description: '비슷한 기운. 경쟁과 협력이 공존' };
    } else if (sangseong[myElement] === yearElement) {
      return { type: '식상(생조)', score: 20, description: '내가 년을 생조. 발산과 표현의 해' };
    } else if (sangseong[yearElement] === myElement) {
      return { type: '인성(생원)', score: 15, description: '년이 나를 생조. 도움과 성장의 해' };
    } else if (sangguk[myElement] === yearElement) {
      return { type: '재성(극제)', score: 10, description: '내가 년을 극제. 재물과 통제의 해' };
    } else if (sangguk[yearElement] === myElement) {
      return { type: '관성(극압)', score: -10, description: '년이 나를 극제. 압박과 시련의 해' };
    }

    return { type: '무관계', score: 0, description: '특별한 상호작용 없음' };
  }

  /**
   * 지지 상호작용 분석
   */
  private analyzeJiInteraction(myJi: string, yearJi: string): InteractionResult {
    // 육합
    if (isYukhap(myJi, yearJi)) {
      return { type: '육합', score: 20, description: '조화로운 결합. 협력과 발전의 해' };
    }

    // 삼합 (반합 포함: 그룹에 둘 다 속하면 성립)
    for (const { group } of SAMHAP_GROUPS) {
      if (group.includes(myJi as any) && group.includes(yearJi as any) && myJi !== yearJi) {
        return { type: '삼합', score: 15, description: '강력한 합. 큰 성과의 해' };
      }
    }

    // 충
    if (isChung(myJi, yearJi)) {
      return { type: '충', score: -20, description: '충돌과 변화. 신중함이 필요한 해' };
    }

    // 형
    if (isHyeong(myJi, yearJi) || isHyeong(yearJi, myJi)) {
      return { type: '형', score: -10, description: '불편함과 마찰. 조심스러운 해' };
    }

    return { type: '무관계', score: 0, description: '특별한 상호작용 없음' };
  }

  /**
   * 신살 영향 분석
   */
  private analyzeSinsalEffect(userSajuData: UserSajuData, yearGanji: string): InteractionResult {
    let score = 0;
    const descriptions: string[] = [];

    // 귀인 분석
    const allGuin = Object.values(userSajuData.guin).flat();
    const guinCount = allGuin.length;
    
    if (guinCount > 0) {
      // 귀인이 많을수록 좋음
      score += Math.min(guinCount * 3, 15); // 최대 15점
      descriptions.push(`귀인 ${guinCount}개 작용`);
    }

    // 신살 분석 - 길신과 흉신 구분
    const allSinsal = Object.values(userSajuData.sinsal).flat();
    
    // 흉신 (凶神)
    const negativeSinsal = ['백호살', '양인살', '도화살', '역마살', '공망'];
    const negativeCount = allSinsal.filter(s => 
      negativeSinsal.some(neg => s.includes(neg))
    ).length;
    
    // 길신 (吉神)
    const positiveSinsal = ['천을귀인', '천덕귀인', '월덕귀인', '복성귀인', '문창귀인'];
    const positiveCount = allSinsal.filter(s => 
      positiveSinsal.some(pos => s.includes(pos))
    ).length;
    
    // 길신 점수
    if (positiveCount > 0) {
      score += Math.min(positiveCount * 2, 10); // 최대 10점
      descriptions.push(`길신 ${positiveCount}개`);
    }
    
    // 흉신 점수
    if (negativeCount > 0) {
      score -= Math.min(negativeCount * 3, 10); // 최대 -10점
      descriptions.push(`흉신 ${negativeCount}개`);
    }

    // 설명이 없으면 기본 메시지
    if (descriptions.length === 0) {
      descriptions.push('보통 수준의 신살');
    }

    return {
      type: descriptions.join(', '),
      score,
      description: descriptions.join(', '),
    };
  }

  /**
   * 대운과의 조화 분석
   */
  private analyzeDaewoonHarmony(
    daewoon: Array<{ age: number; ganji: string }>,
    yearGanji: string,
    birthYear: number,
    targetYear: number
  ): InteractionResult {
    // 실제 나이 계산
    const currentAge = targetYear - birthYear + 1; // 만 나이 + 1 (한국식 나이)
    const currentDaewoon = daewoon.find(d => d.age <= currentAge && currentAge < d.age + 10);

    if (!currentDaewoon) {
      return { type: '대운 정보 없음', score: 0, description: '대운 분석 불가' };
    }

    // 대운 천간/지지와 년 간지의 상호작용
    const daewoonGan = currentDaewoon.ganji[0];
    const yearGan = yearGanji[0];
    
    const ganInteraction = this.analyzeGanInteraction(daewoonGan, yearGan);
    
    return {
      type: `대운과 ${ganInteraction.type}`,
      score: ganInteraction.score * 0.5, // 대운 영향은 50% 반영
      description: `현재 대운과 ${ganInteraction.description}`,
    };
  }


  /**
   * 월별 운세 계산
   */
  private calculateMonthlyFortunes(
    userSajuData: UserSajuData,
    year: number,
    yearGanjiInfo: any
  ): MonthlyFortune[] {
    const monthlyFortunes: MonthlyFortune[] = [];
    
    // 월별 지지 (1월=寅月부터 시작)
    const monthJiList = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
    
    for (let month = 1; month <= 12; month++) {
      const monthJi = monthJiList[month - 1];
      const monthGanji = `?${monthJi}`; // 천간은 연도 천간에 따라 달라지므로 생략
      
      // 월별 상호작용 분석 (일지와 월지)
      const interaction = this.analyzeJiInteraction(userSajuData.dayGanji[1], monthJi);
      
      // 상호작용 타입에 따른 요약
      let summary = '';
      if (interaction.type === '육합' || interaction.type === '삼합') {
        summary = '매우 좋은 시기';
      } else if (interaction.type === '충' || interaction.type === '형') {
        summary = '신중한 시기';
      } else if (interaction.score > 0) {
        summary = '좋은 시기';
      } else if (interaction.score < 0) {
        summary = '조심스러운 시기';
      } else {
        summary = '보통 시기';
      }
      
      monthlyFortunes.push({
        month,
        summary,
        monthGanji,
        interaction,
      });
    }
    
    return monthlyFortunes;
  }


  /**
   * 상호작용 종합 분석
   */
  private analyzeInteractions(userSajuData: UserSajuData, yearGanjiInfo: any, targetYear: number): {
    yearInteraction: InteractionResult;
    elementInteraction: InteractionResult;
    daewoonInteraction: InteractionResult;
    sinsalInteraction: InteractionResult;
  } {
    const yearGan = yearGanjiInfo.ganji[0];
    const yearJi = yearGanjiInfo.ganji[1];
    const myDayGan = userSajuData.dayGanji[0];
    const myDayJi = userSajuData.dayGanji[1];

    return {
      yearInteraction: this.analyzeGanInteraction(myDayGan, yearGan),
      elementInteraction: this.analyzeJiInteraction(myDayJi, yearJi),
      daewoonInteraction: this.analyzeDaewoonHarmony(
        userSajuData.daewoon,
        yearGanjiInfo.ganji,
        userSajuData.birthYear,
        targetYear
      ),
      sinsalInteraction: this.analyzeSinsalEffect(userSajuData, yearGanjiInfo.ganji),
    };
  }

  /**
   * 길한 달과 조심할 달 추출
   */
  private identifyKeyMonths(monthlyFortunes: MonthlyFortune[]): {
    luckyMonths: number[];
    cautiousMonths: number[];
  } {
    // 상호작용 점수 기반으로 정렬
    const sorted = [...monthlyFortunes].sort((a, b) => b.interaction.score - a.interaction.score);
    
    // 점수가 높은 상위 3개월 (길한 달)
    const luckyMonths = sorted.slice(0, 3).map(m => m.month).sort((a, b) => a - b);
    
    // 점수가 낮은 하위 3개월 (조심할 달)
    const cautiousMonths = sorted.slice(-3).map(m => m.month).sort((a, b) => a - b);
    
    return { luckyMonths, cautiousMonths };
  }
}

