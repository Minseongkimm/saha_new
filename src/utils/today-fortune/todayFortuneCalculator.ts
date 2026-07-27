/**
 * 오늘의 운세 계산기
 * 사주 정보와 오늘 날짜를 활용하여 운세를 계산합니다.
 */

import { SajuUtils } from '../saju-calculator/utils/SajuUtils';
import { FiveElement } from '../saju-calculator/types';
import { getKoreanDateString } from '../date/koreanDate';
import { isHyeong, isPa, isHae } from '../saju-calculator/constants/branch_relations';
import { SinsalCalculator } from '../saju-calculator/utils/SinsalCalculator';

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
    tenGodInteraction: {
      label: string;
      score: number;
      description: string;
    };
    detailedJiRelations: {
      hasHyeong: boolean;
      hasPa: boolean;
      hasHae: boolean;
      summary: string;
      score: number;
    };
    fiveElementBalance?: {
      counts: Record<'WOOD' | 'FIRE' | 'EARTH' | 'METAL' | 'WATER', number>;
      todayElement: 'WOOD' | 'FIRE' | 'EARTH' | 'METAL' | 'WATER';
      weakest?: 'WOOD' | 'FIRE' | 'EARTH' | 'METAL' | 'WATER';
      strongest?: 'WOOD' | 'FIRE' | 'EARTH' | 'METAL' | 'WATER';
      score: number;
      explanation: string;
    };
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
  private sinsalCalculator = new SinsalCalculator();

  /**
   * 오늘의 운세 계산 메인 메서드
   */
  calculateTodayFortune(userSajuData: UserSajuData, todayDate: string): TodayFortuneResult {
    // 1. 날짜 유효성 검사 및 오늘 간지 계산
    let validDate = todayDate;
    try {
      const testDate = new Date(todayDate);
      if (isNaN(testDate.getTime()) || !todayDate || typeof todayDate !== 'string') {
        validDate = getKoreanDateString(); // 한국 시간 기준 오늘 날짜로 fallback
      }
    } catch (error) {
      validDate = getKoreanDateString(); // 한국 시간 기준 오늘 날짜로 fallback
    }

    const todayGanji = SajuUtils.getTodayGanji(validDate);
    
    // 2. 상호작용 분석
    const ganInteraction = this.analyzeGanInteraction(todayGanji.dayGanji[0], userSajuData.dayGanji[0]);
    const jiInteraction = this.analyzeJiInteraction(todayGanji.dayGanji[1], userSajuData.jijiRelations);
    const sinsalInteraction = this.analyzeSinsalInteraction(todayGanji.dayGanji, userSajuData.sinsal, userSajuData);
    const tenGodInteraction = this.analyzeTenGod(todayGanji.dayGanji[0], userSajuData.dayGanji[0]);
    const detailedJiRelations = this.analyzeJiDetails(todayGanji.dayGanji[1], userSajuData);
    const fiveElementBalance = this.analyzeFiveElementBalance(todayGanji.dayGanji[0], userSajuData);
    
    // 3. 비중 기반 보정 점수 계산 (컴포넌트 합을 10~100 구간으로 정규화)
    // 전통 사주 구조를 따르기 위해, 모든 보정은 오늘의 간지/오행/신살/귀인 관계에서만 파생된다.
    // - ganjiScore: 오늘 일간/일지와 내 일간/지지의 상생·상극·합·충 비중 (기본: 가장 큰 축)
    // - sinsalScore: 오늘 일진에 의해 발동하는 신살(장성살, 화개살 등)의 영향력
    // - guinScore: 오늘 일지에서 활성화되는 각종 귀인(천을귀인 등)의 영향력
    // - tenGodScore: 오늘 천간이 내 일간 기준 십신(비견, 재성, 관성, 인성 등)에서 차지하는 위치
    // - balanceScore: 오행 불균형 보정 (오늘 오행이 부족한 오행을 돕는지, 이미 강한 오행을 더 과하게 만드는지)
    // - jiDetailScore: 형/파/해 등의 지지 디테일 관계에 따른 감점/보정
    const ganjiScore = Math.round(Math.min((ganInteraction.score + jiInteraction.score) * 0.5, 25)); // 50% 비중, 최대 25점
    const sinsalScore = Math.round(Math.min(sinsalInteraction.score * 0.25, 13)); // 25% 비중, 최대 13점
    const guinScore = Math.round(Math.min(this.calculateGuinScore(todayGanji.dayGanji, userSajuData.guin, userSajuData) * 0.15, 8)); // 15% 비중, 최대 8점
    const tenGodScore = Math.round(Math.min(tenGodInteraction.score * 0.2, 6)); // 경미 반영
    const balanceScore = Math.round(Math.min(Math.max(fiveElementBalance?.score ?? 0, -10) * 0.2, 2)); // -2~+2
    const jiDetailScore = Math.round(Math.max(Math.min(detailedJiRelations.score, 5), -10)); // 안전 제한

    const componentSum =
      ganjiScore +
      sinsalScore +
      guinScore +
      tenGodScore +
      balanceScore +
      jiDetailScore;

    // 예상되는 컴포넌트 합의 최소/최대 범위를 설정 (-7 ~ +7)
    // minRawScore/maxRawScore를 조정하면 "전체 분포의 극단 정도"를 튜닝할 수 있다.
    // - 절댓값을 키우면: 같은 컴포넌트 합에서도 점수가 50 근처에 더 많이 모인다.
    // - 절댓값을 줄이면: 작은 차이에도 점수가 10/100 근처까지 더 크게 벌어진다.
    //
    // 기본값:
    // - minRawScore = -7, maxRawScore = 7
    //   → 전통 요소(상생/상극, 신살, 귀인, 오행, 형/충 등)만으로도
    //     10~100 전체 구간을 적극적으로 사용하되, -6/6보다 약간 더 완화된 극단 스케일
    const minRawScore = -7;
    const maxRawScore = 7;
    const clampedRawScore = Math.max(minRawScore, Math.min(maxRawScore, componentSum));

    // 10~100 사이로 선형 매핑
    // - 컴포넌트 합이 0 근처이면 약 55점
    // - 일반적인 분포는 대략 30~80 근처에서 움직이고, 극단적인 날은 10점/100점까지 도달 가능
    const normalized = (clampedRawScore - minRawScore) / (maxRawScore - minRawScore); // 0~1
    const totalScore = Math.round(10 + normalized * 90); // 10~100
    
    // 4. 카테고리별 점수 계산
    const careerScore = this.calculateCareerScore(totalScore, todayGanji, userSajuData, validDate);
    const loveScore = this.calculateLoveScore(totalScore, todayGanji, userSajuData, validDate);
    const wealthScore = this.calculateWealthScore(totalScore, todayGanji, userSajuData, validDate);
    const relationshipScore = this.calculateRelationshipScore(totalScore, todayGanji, userSajuData, validDate);
    
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
        sinsalInteraction,
        tenGodInteraction,
        detailedJiRelations,
        fiveElementBalance
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
   * 십신(천간) 관계 분석
   */
  private analyzeTenGod(todayGan: string, myDayGan: string): { label: string; score: number; description: string } {
    const todayElement = SajuUtils.getProperty(todayGan);
    const myElement = SajuUtils.getProperty(myDayGan);
    const todaySign = SajuUtils.getSign(todayGan);
    const mySign = SajuUtils.getSign(myDayGan);
    const sameSign = todaySign === mySign;
    let label = '중립';
    let score = 0;
    if (todayGan === myDayGan) {
      label = '비견';
      score = 10;
    } else if (todayElement === myElement) {
      label = sameSign ? '비견' : '겁재';
      score = sameSign ? 8 : 5;
    } else if (SajuUtils.isSangsaeng(myElement, todayElement)) {
      label = sameSign ? '식신' : '상관';
      score = sameSign ? 10 : 6;
    } else if (SajuUtils.isSanggeuk(myElement, todayElement)) {
      label = sameSign ? '정재' : '편재';
      score = sameSign ? 9 : 7;
    } else if (SajuUtils.isSanggeuk(todayElement, myElement)) {
      label = sameSign ? '정관' : '편관';
      score = sameSign ? -6 : -8;
    } else if (SajuUtils.isSangsaeng(todayElement, myElement)) {
      label = sameSign ? '정인' : '편인';
      score = sameSign ? 6 : 4;
    } else {
      label = '중립';
      score = 0;
    }
    const description = `오늘 천간 ${todayGan}은(는) 일간 ${myDayGan} 기준 ${label} 관계입니다.`;
    return { label, score, description };
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
   * 지지 상세 관계(형/파/해) 분석
   */
  private analyzeJiDetails(todayJi: string, userSaju: UserSajuData): {
    hasHyeong: boolean; hasPa: boolean; hasHae: boolean; summary: string; score: number;
  } {
    const branches = [
      userSaju.timeGanji[1],
      userSaju.dayGanji[1],
      userSaju.monthGanji[1],
      userSaju.yearGanji[1]
    ];
    let hasHyeong = false;
    let hasPa = false;
    let hasHae = false;
    let score = 0;
    for (const ji of branches) {
      if (isHyeong(todayJi, ji) || isHyeong(ji, todayJi)) {
        hasHyeong = true;
        score -= 8;
      }
      if (isPa(todayJi, ji) || isPa(ji, todayJi)) {
        hasPa = true;
        score -= 6;
      }
      if (isHae(todayJi, ji) || isHae(ji, todayJi)) {
        hasHae = true;
        score -= 5;
      }
    }
    const parts: string[] = [];
    if (hasHyeong) parts.push('형');
    if (hasPa) parts.push('파');
    if (hasHae) parts.push('해');
    const summary = parts.length > 0 ? `${parts.join('·')} 관계 유의` : '특이 관계 없음';
    return { hasHyeong, hasPa, hasHae, summary, score };
  }

  /**
   * 신살 상호작용 분석
   */
  private analyzeSinsalInteraction(todayGanji: string, sinsal: any, userSaju: UserSajuData): SinsalResult {
    let score = 0;
    const activated: string[] = [];

    // 모든 신살을 하나의 배열로 합치기
    const allSinsal = Object.values(sinsal).flat();

    // 긍정적 신살 발동 확인 (귀인은 제외하고 신살만)
    // 신살은 부정적 요소만 계산

    // 부정적 신살 발동 확인 (원국에 이미 있는 신살이, 오늘 간지 기준으로도 다시 성립하는지 확인)
    if (allSinsal.includes("장성살") && this.isSinsalActivated(todayGanji, "장성살", userSaju)) {
      score -= 15;
      activated.push("장성살");
    }
    if (allSinsal.includes("화개살") && this.isSinsalActivated(todayGanji, "화개살", userSaju)) {
      score -= 10;
      activated.push("화개살");
    }
    if (allSinsal.includes("백호살") && this.isSinsalActivated(todayGanji, "백호살", userSaju)) {
      score -= 10;
      activated.push("백호살");
    }
    if (allSinsal.includes("양인살") && this.isSinsalActivated(todayGanji, "양인살", userSaju)) {
      score -= 8;
      activated.push("양인살");
    }

    const description = activated.length > 0
      ? `오늘의 간지로 인해 ${activated.join(', ')}이 발동됩니다.`
      : "특별한 신살 발동이 없습니다.";

    return { activated, score, description };
  }

  /**
   * 오행 균형 분석 (소규모 보정)
   */
  private analyzeFiveElementBalance(todayGan: string, userSaju: UserSajuData): TodayFortuneResult['interactions']['fiveElementBalance'] {
    const toKey = (e: FiveElement): 'WOOD' | 'FIRE' | 'EARTH' | 'METAL' | 'WATER' => {
      switch (e) {
        case FiveElement.WOOD: return 'WOOD';
        case FiveElement.FIRE: return 'FIRE';
        case FiveElement.EARTH: return 'EARTH';
        case FiveElement.METAL: return 'METAL';
        case FiveElement.WATER: return 'WATER';
        default: return 'EARTH';
      }
    };
    const counts: Record<'WOOD' | 'FIRE' | 'EARTH' | 'METAL' | 'WATER', number> = {
      WOOD: 0, FIRE: 0, EARTH: 0, METAL: 0, WATER: 0
    };
    const props = userSaju.fiveProperties;
    const vals = [props.yearProperty, props.monthProperty, props.dayProperty, props.timeProperty];
    vals.forEach((p) => {
      const map: Record<string, 'WOOD'|'FIRE'|'EARTH'|'METAL'|'WATER'> = {
        '목': 'WOOD', '화': 'FIRE', '토': 'EARTH', '금': 'METAL', '수': 'WATER'
      };
      const key = map[p] || 'EARTH';
      counts[key] += 1;
    });
    const weakest = (Object.entries(counts).sort((a, b) => a[1] - b[1])[0]?.[0] ?? undefined) as
      'WOOD' | 'FIRE' | 'EARTH' | 'METAL' | 'WATER' | undefined;
    const strongest = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? undefined) as
      'WOOD' | 'FIRE' | 'EARTH' | 'METAL' | 'WATER' | undefined;
    const todayElement = toKey(SajuUtils.getProperty(todayGan));
    let score = 0;
    if (weakest && todayElement === weakest) score += 8;
    if (strongest && todayElement === strongest) score -= 6;
    const explanation = `오행 분포 ${JSON.stringify(counts)} 기준 오늘의 천간이 ${todayElement}를 보강/억제합니다.`;
    return { counts, todayElement, weakest, strongest, score, explanation };
  }

  /**
   * 직업운 점수 계산
   */
  private calculateCareerScore(baseScore: number, todayGanji: any, userSaju: UserSajuData, date: string): number {
    // 전통 구조를 따르기 위해, 모든 보정은 오늘 일진과 원국의 관계(십신/오행/합충)만 사용한다.
    let adjustment = 0;

    // 오늘 천간이 내 일간 기준 편관/정관(관성)에 해당하면 직업운 보너스
    const tenGod = this.analyzeTenGod(todayGanji.dayGanji[0], userSaju.dayGanji[0]);
    if (tenGod.label === '편관') {
      adjustment += 12;
    } else if (tenGod.label === '정관') {
      adjustment += 15;
    }

    // 천간 상생이면 직업운 보너스
    const todayProperty = SajuUtils.getProperty(todayGanji.dayGanji[0]);
    const myProperty = SajuUtils.getProperty(userSaju.dayGanji[0]);
    if (SajuUtils.isSangsaeng(todayProperty, myProperty)) {
      adjustment += 8;
    }
    
    const finalScore = Math.round(baseScore + adjustment);
    return Math.max(1, Math.min(100, finalScore));
  }

  /**
   * 연애운 점수 계산
   */
  private calculateLoveScore(baseScore: number, todayGanji: any, userSaju: UserSajuData, date: string): number {
    // 전통 구조를 따르기 위해, 보정은 오늘 일지와 원국 지지 관계(합/충)만 사용한다.
    let adjustment = 0;

    // 육합/삼합 관계
    if (this.hasYukhap(todayGanji.dayGanji[1], userSaju.jijiRelations.육합)) {
      adjustment += 15; // 육합은 연애운에 매우 유리
    }
    if (this.hasSamhap(todayGanji.dayGanji[1], userSaju.jijiRelations.삼합)) {
      adjustment += 12; // 삼합도 연애운에 유리
    }
    
    // 충 관계면 연애운 하락
    if (this.hasChung(todayGanji.dayGanji[1], userSaju.jijiRelations.육충)) {
      adjustment -= 15;
    }
    
    const finalScore = Math.round(baseScore + adjustment);
    return Math.max(1, Math.min(100, finalScore));
  }

  /**
   * 재물운 점수 계산
   */
  private calculateWealthScore(baseScore: number, todayGanji: any, userSaju: UserSajuData, date: string): number {
    // 전통 구조를 따르기 위해, 보정은 오늘 일간과 재물 관련 십신(재성)/오행 관계만 사용한다.
    let adjustment = 0;

    // 오늘 천간이 내 일간 기준 정재/편재(재성)에 해당하면 재물운 보너스
    const tenGod = this.analyzeTenGod(todayGanji.dayGanji[0], userSaju.dayGanji[0]);
    if (tenGod.label === '정재') {
      adjustment += 18; // 정재는 재물운에 매우 유리
    } else if (tenGod.label === '편재') {
      adjustment += 15; // 편재도 재물운에 유리
    }

    // 오행 상극이면 재물운 하락
    const todayProperty = SajuUtils.getProperty(todayGanji.dayGanji[0]);
    const myProperty = SajuUtils.getProperty(userSaju.dayGanji[0]);
    if (SajuUtils.isSanggeuk(todayProperty, myProperty)) {
      adjustment -= 10;
    }
    
    const finalScore = Math.round(baseScore + adjustment);
    return Math.max(1, Math.min(100, finalScore));
  }

  /**
   * 인간관계 점수 계산
   */
  private calculateRelationshipScore(baseScore: number, todayGanji: any, userSaju: UserSajuData, date: string): number {
    // 전통 구조를 따르기 위해, 보정은 오늘 일지와 원국 지지 관계(삼합/육합/형/충/파/해)만 사용한다.
    let adjustment = 0;

    // 삼합 관계
    if (this.hasSamhap(todayGanji.dayGanji[1], userSaju.jijiRelations.삼합)) {
      adjustment += 15; // 삼합은 인간관계에 매우 유리
    }
    
    // 육합 관계
    if (this.hasYukhap(todayGanji.dayGanji[1], userSaju.jijiRelations.육합)) {
      adjustment += 12; // 육합도 인간관계에 유리
    }
    
    // 충 관계 감점
    if (this.hasChung(todayGanji.dayGanji[1], userSaju.jijiRelations.육충)) {
      adjustment -= 18; // 충은 인간관계에 매우 불리
    }
    
    // 형 관계 감점
    if (userSaju.jijiRelations.삼형.length > 0) {
      adjustment -= 8;
    }
    
    const finalScore = Math.round(baseScore + adjustment);
    return Math.max(1, Math.min(100, finalScore));
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

  /**
   * 귀인 발동 확인 - 일간(또는 월지)을 기준으로 하는 정확한 전통 귀인표를 사용한다.
   * (ganji_local.ts의 calculateGuin과 동일한 전통 표를 오늘 일진 판정에 재사용)
   */
  private isGuinActivated(todayGanji: string, guinType: string, userSaju: UserSajuData): boolean {
    const todayGan = todayGanji[0];
    const todayJi = todayGanji[1];
    const dayStemHangul = SajuUtils.getHanjaToHangulChar(userSaju.dayGanji[0]);
    const monthJi = userSaju.monthGanji[1];

    const cheonEulGuinMap: { [key: string]: string[] } = {
      '갑': ['丑', '未'], '을': ['子', '申'], '병': ['亥', '酉'], '정': ['戌', '亥'],
      '무': ['丑', '未'], '기': ['申', '子'], '경': ['未', '丑'], '신': ['午', '寅'],
      '임': ['卯', '巳'], '계': ['辰', '巳']
    };
    const bokSeongGuinMap: { [key: string]: string[] } = {
      '갑': ['子', '午'], '을': ['丑', '未'], '병': ['寅', '申'], '정': ['卯', '酉'],
      '무': ['辰', '戌'], '기': ['巳', '亥'], '경': ['午', '子'], '신': ['未', '丑'],
      '임': ['申', '寅'], '계': ['酉', '卯']
    };
    const cheonjuGuinMap: { [key: string]: string } = {
      '갑': '巳', '을': '午', '병': '巳', '정': '午', '무': '申',
      '기': '酉', '경': '亥', '신': '子', '임': '寅', '계': '卯'
    };
    // 천덕귀인 (월지 기준 - 12개월 각각에 고정된 천간 또는 지지 하나)
    const cheonDeokGuinByMonthJi: { [key: string]: string } = {
      '寅': '丁', '卯': '申', '辰': '壬', '巳': '辛', '午': '亥', '未': '甲',
      '申': '癸', '酉': '寅', '戌': '丙', '亥': '乙', '子': '巳', '丑': '庚'
    };
    // 월덕귀인 (월지의 삼합 그룹 기준 - 화국/수국/금국/목국별 천간 하나)
    const wolDeokGuinByMonthGroup: { branches: string[]; stem: string }[] = [
      { branches: ['寅', '午', '戌'], stem: '丙' },
      { branches: ['申', '子', '辰'], stem: '壬' },
      { branches: ['巳', '酉', '丑'], stem: '庚' },
      { branches: ['亥', '卯', '未'], stem: '甲' }
    ];

    switch (guinType) {
      case '천을귀인':
        return (cheonEulGuinMap[dayStemHangul] || []).includes(todayJi);
      case '복성귀인':
        return (bokSeongGuinMap[dayStemHangul] || []).includes(todayJi);
      case '천주귀인':
        return cheonjuGuinMap[dayStemHangul] === todayJi;
      case '천덕귀인': {
        const value = cheonDeokGuinByMonthJi[monthJi];
        return value !== undefined && (value === todayGan || value === todayJi);
      }
      case '월덕귀인': {
        const stem = wolDeokGuinByMonthGroup.find(g => g.branches.includes(monthJi))?.stem;
        return stem === todayGan;
      }
      default:
        // 문창귀인/학당귀인/태극귀인 등은 일진 발동 판정 대상이 아니므로 미판정
        return false;
    }
  }

  /**
   * 신살 발동 확인 - SinsalCalculator와 동일한 전통 표를 오늘 일진 판정에 재사용한다.
   */
  private isSinsalActivated(todayGanji: string, sinsalType: string, userSaju: UserSajuData): boolean {
    switch (sinsalType) {
      case '장성살':
        return this.sinsalCalculator.calculateJangseongSal(userSaju.yearGanji, todayGanji) !== null;
      case '화개살':
        return this.sinsalCalculator.calculateHwagaeSal(userSaju.yearGanji, todayGanji) !== null;
      case '백호살':
        return this.sinsalCalculator.calculateBaekhoSal(todayGanji) !== null;
      case '양인살':
        return this.sinsalCalculator.calculateYanginSal(userSaju.dayGanji, todayGanji) !== null;
      default:
        return false;
    }
  }

  /**
   * 귀인 점수 계산 (15% 비중)
   */
  private calculateGuinScore(todayGanji: string, guinData: { [key: string]: string[] }, userSaju: UserSajuData): number {
    let score = 0;

    // 각 귀인별 점수 계산
    Object.entries(guinData).forEach(([guinType, guinList]) => {
      if (guinList.length > 0 && this.isGuinActivated(todayGanji, guinType, userSaju)) {
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

  // 랜덤성 요소 점수 계산은 전통 구조에서는 사용하지 않으므로 제거됐다.
}

export const todayFortuneCalculator = new TodayFortuneCalculator();
