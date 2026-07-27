/**
 * 통합 사주 계산기 (TypeScript 버전)
 * 비결만세력 프로젝트에서 추출한 모든 사주 계산 로직을 통합
 */

import { SajuInfo, SajuAnalysis, SajuSummary, FiveElementBalance, SinsalType } from '../types';
import { SinsalCalculator } from '../utils/SinsalCalculator';
import { GongmangCalculator } from '../utils/GongmangCalculator';
import { DaewoonCalculator } from '../utils/DaewoonCalculator';
import { BanghapCalculator } from '../utils/BanghapCalculator';
import { GuinCalculator } from '../utils/GuinCalculator';
import { SajuUtils } from '../utils/SajuUtils';
import { checkHeavenlyStemCombination } from '../constants/heavenly_stem_combinations';
import { isChung, isHae, isHyeong, isPa, isYukhap } from '../constants/branch_relations';

export class SajuCalculator {
  private sinsalCalculator: SinsalCalculator;
  private gongmangCalculator: GongmangCalculator;
  private daewoonCalculator: DaewoonCalculator;
  private banghapCalculator: BanghapCalculator;
  private guinCalculator: GuinCalculator;

  constructor() {
    this.sinsalCalculator = new SinsalCalculator();
    this.gongmangCalculator = new GongmangCalculator();
    this.daewoonCalculator = new DaewoonCalculator();
    this.banghapCalculator = new BanghapCalculator();
    this.guinCalculator = new GuinCalculator();
  }

  /**
   * 전체 사주 분석
   * @param sajuInfo 사주 정보
   * @return 사주 분석 결과
   */
  analyzeSaju(sajuInfo: SajuInfo): SajuAnalysis {
    // 신살 계산
    const sinsal = this.calculateAllSinsal(sajuInfo);
    
    // 공망 계산
    const gongmang = this.gongmangCalculator.calcGongmang(sajuInfo.dayGanji);
    
    // 대운 계산 (9세부터 시작)
    const daewoon = this.daewoonCalculator.calculateAccurateDaewoon(
      sajuInfo.yearGanji,
      sajuInfo.monthGanji,
      sajuInfo.birthYear,
      sajuInfo.gender,
      sajuInfo.birthDate
    );

    // 오행 분석
    const fiveProperties = this.calculateFiveProperties(sajuInfo);
    
    // 지지암장간 분석
    const jijiAmjangan = this.calculateJijiAmjangan(sajuInfo);
    
    // 지지 관계 분석
    const jijiRelations = this.calculateJijiRelations(sajuInfo);
    
    return {
      sinsal,
      gongmang,
      daewoon,
      fiveProperties,
      jijiAmjangan,
      jijiRelations
    };
  }

  /**
   * 모든 신살 계산
   * @param sajuInfo 사주 정보
   * @return 신살 맵
   */
  private calculateAllSinsal(sajuInfo: SajuInfo): { [key: string]: string[] } {
    const pillars = [sajuInfo.timeGanji, sajuInfo.dayGanji, sajuInfo.monthGanji, sajuInfo.yearGanji];
    const pillarNames = ['timeSinsal', 'daySinsal', 'monthSinsal', 'yearSinsal'];
    const sinsal: { [key: string]: string[] } = {
      yearSinsal: [],
      monthSinsal: [],
      daySinsal: [],
      timeSinsal: []
    };

    // 괴강살 계산 (일주가 庚辰·庚戌·壬辰·戊戌 중 하나인지 확인)
    if (this.calculateGwaegangSal(sajuInfo.dayGanji)) {
      sinsal.daySinsal.push('괴강살');
    }

    // 각 주별로 신살 계산
    pillars.forEach((pillar, index) => {
      const pillarSinsal: string[] = [];

      // 화개살 계산 (12신살 - 년지 기준)
      const hwagae = this.sinsalCalculator.calculateHwagaeSal(sajuInfo.yearGanji, pillar);
      if (hwagae) pillarSinsal.push(hwagae);

      // 장성살 계산 (12신살 - 년지 기준)
      const jangseong = this.sinsalCalculator.calculateJangseongSal(sajuInfo.yearGanji, pillar);
      if (jangseong) pillarSinsal.push(jangseong);

      // 백호살 계산
      const baekho = this.sinsalCalculator.calculateBaekhoSal(pillar);
      if (baekho) pillarSinsal.push(baekho);
      
      // 양인살 계산 (SinsalCalculator 사용)
      const yangin = this.sinsalCalculator.calculateYanginSal(sajuInfo.dayGanji, pillar);
      if (yangin) pillarSinsal.push(yangin);
      
      // 복성귀인 계산
      const bokseong = this.sinsalCalculator.calculateBokseongGuin(sajuInfo.dayGanji, pillar);
      if (bokseong) pillarSinsal.push(bokseong);
      
      // 천주귀인 계산
      const cheonju = this.sinsalCalculator.calculateCheonjuGuin(sajuInfo.dayGanji, pillar);
      if (cheonju) pillarSinsal.push(cheonju);
      
      sinsal[pillarNames[index]] = pillarSinsal;
    });

    return sinsal;
  }

  /**
   * 괴강살 계산 - 일주(日柱)가 庚辰·庚戌·壬辰·戊戌 중 하나면 해당
   * @param dayGanji 일주 간지
   * @return 괴강살 여부
   */
  private calculateGwaegangSal(dayGanji: string): boolean {
    return ['庚辰', '庚戌', '壬辰', '戊戌'].includes(dayGanji);
  }


  /**
   * 오행 분석
   * @param sajuInfo 사주 정보
   * @return 오행 맵
   */
  private calculateFiveProperties(sajuInfo: SajuInfo): { [key: string]: string } {
    const properties: { [key: string]: string } = {};
    
    // 각 주의 오행
    properties.yearProperty = SajuUtils.getPropertyName(SajuUtils.getProperty(sajuInfo.yearGanji[0]));
    properties.monthProperty = SajuUtils.getPropertyName(SajuUtils.getProperty(sajuInfo.monthGanji[0]));
    properties.dayProperty = SajuUtils.getPropertyName(SajuUtils.getProperty(sajuInfo.dayGanji[0]));
    properties.timeProperty = SajuUtils.getPropertyName(SajuUtils.getProperty(sajuInfo.timeGanji[0]));
    
    // 납음오행
    properties.yearNapeum = SajuUtils.getFiveProperty(sajuInfo.yearGanji);
    properties.monthNapeum = SajuUtils.getFiveProperty(sajuInfo.monthGanji);
    properties.dayNapeum = SajuUtils.getFiveProperty(sajuInfo.dayGanji);
    properties.timeNapeum = SajuUtils.getFiveProperty(sajuInfo.timeGanji);
    
    return properties;
  }

  /**
   * 지지암장간 분석
   * @param sajuInfo 사주 정보
   * @return 지지암장간 맵
   */
  private calculateJijiAmjangan(sajuInfo: SajuInfo): { [key: string]: string } {
    const amjangan: { [key: string]: string } = {};
    
    amjangan.yearAmjangan = SajuUtils.getJijiAmJangan(sajuInfo.yearGanji[1]);
    amjangan.monthAmjangan = SajuUtils.getJijiAmJangan(sajuInfo.monthGanji[1]);
    amjangan.dayAmjangan = SajuUtils.getJijiAmJangan(sajuInfo.dayGanji[1]);
    amjangan.timeAmjangan = SajuUtils.getJijiAmJangan(sajuInfo.timeGanji[1]);
    
    return amjangan;
  }

  /**
   * 지지 관계 분석
   * @param sajuInfo 사주 정보
   * @return 지지 관계 맵
   */
  private calculateJijiRelations(sajuInfo: SajuInfo): { [key: string]: string[] } {
    const pillars = [sajuInfo.timeGanji, sajuInfo.dayGanji, sajuInfo.monthGanji, sajuInfo.yearGanji];
    const banghapResult = this.banghapCalculator.analyzeBanghapStrength(pillars);
    
    // 기존 형식으로 변환
    return {
      삼합: banghapResult.samhap || [],
      육합: banghapResult.yukhap || [],
      삼형: banghapResult.samhyeong || [],
      육충: banghapResult.yukchung || [],
      방합: banghapResult.banghap || []
    };
  }

  /**
   * 특정 신살만 계산
   * @param sajuInfo 사주 정보
   * @param sinsalType 신살 타입 ("year", "month", "day")
   * @return 신살 리스트
   */
  calculateSpecificSinsal(sajuInfo: SajuInfo, sinsalType: string): string[] {
    switch (sinsalType) {
      case 'year':
        const allSinsal = this.sinsalCalculator.getAllSinsal(
          sajuInfo.yearGanji,
          sajuInfo.monthGanji,
          sajuInfo.dayGanji,
          sajuInfo.timeGanji,
          sajuInfo.gender
        );
        return allSinsal.yearSinsal;
      case 'month':
        const monthSinsal = this.sinsalCalculator.getAllSinsal(
          sajuInfo.yearGanji,
          sajuInfo.monthGanji,
          sajuInfo.dayGanji,
          sajuInfo.timeGanji,
          sajuInfo.gender
        );
        return monthSinsal.monthSinsal;
      case 'day':
        const daySinsal = this.sinsalCalculator.getAllSinsal(
          sajuInfo.yearGanji,
          sajuInfo.monthGanji,
          sajuInfo.dayGanji,
          sajuInfo.timeGanji,
          sajuInfo.gender
        );
        return daySinsal.daySinsal;
      default:
        return [];
    }
  }

  /**
   * 공망 상세 분석
   * @param dayGanji 일간지
   * @return 공망 상세 정보
   */
  analyzeGongmang(dayGanji: string) {
    return this.gongmangCalculator.getGongmangDetail(dayGanji);
  }

  /**
   * 대운 상세 분석
   * @param sajuInfo 사주 정보
   * @param currentAge 현재 나이
   * @return 현재 대운 정보
   */
  getCurrentDaewoon(sajuInfo: SajuInfo, currentAge: number) {
    const daewoonList = this.daewoonCalculator.calculateAccurateDaewoon(
      sajuInfo.yearGanji,
      sajuInfo.monthGanji,
      sajuInfo.birthYear,
      sajuInfo.gender,
      sajuInfo.birthDate
    );
    return this.daewoonCalculator.getCurrentDaewoon(daewoonList, currentAge);
  }

  /**
   * 사주 요약 정보
   * @param sajuInfo 사주 정보
   * @return 사주 요약
   */
  getSajuSummary(sajuInfo: SajuInfo): SajuSummary {
    const analysis = this.analyzeSaju(sajuInfo);
    
    return {
      ganji: `${sajuInfo.yearGanji} ${sajuInfo.monthGanji} ${sajuInfo.dayGanji} ${sajuInfo.timeGanji}`,
      gongmang: analysis.gongmang,
      sinsalCount: Object.values(analysis.sinsal).flat().length,
      daewoonCount: analysis.daewoon.length,
      gender: sajuInfo.gender === 0 ? "남자" : "여자",
      birthYear: sajuInfo.birthYear
    };
  }

  /**
   * 오행 균형 분석
   * @param sajuInfo 사주 정보
   * @return 오행 균형 정보
   */
  analyzeFiveElementBalance(sajuInfo: SajuInfo): FiveElementBalance {
    const pillars = [sajuInfo.yearGanji, sajuInfo.monthGanji, sajuInfo.dayGanji, sajuInfo.timeGanji];
    const elementCount: { [key: string]: number } = { '화': 0, '수': 0, '목': 0, '금': 0, '토': 0 };
    
    pillars.forEach(pillar => {
      const ganProperty = SajuUtils.getPropertyName(SajuUtils.getProperty(pillar[0]));
      const jiProperty = SajuUtils.getPropertyName(SajuUtils.getProperty(pillar[1]));
      
      if (elementCount.hasOwnProperty(ganProperty)) elementCount[ganProperty]++;
      if (elementCount.hasOwnProperty(jiProperty)) elementCount[jiProperty]++;
    });
    
    const maxCount = Math.max(...Object.values(elementCount));
    const minCount = Math.min(...Object.values(elementCount));
    const maxElement = Object.keys(elementCount).reduce((a, b) =>
      elementCount[a] > elementCount[b] ? a : b
    );
    const minElement = Object.keys(elementCount).reduce((a, b) =>
      elementCount[a] < elementCount[b] ? a : b
    );
    const strongElements = Object.keys(elementCount).filter(key => elementCount[key] === maxCount && maxCount > 0);
    const weakElements = Object.keys(elementCount).filter(key => elementCount[key] === minCount);
    
    return {
      elementCount,
      maxElement,
      minElement,
      balance: maxElement === minElement ? '균형' : '불균형',
      weakElements,
      strongElements
    };
  }

  /**
   * 사주 유효성 검사
   * @param sajuInfo 사주 정보
   * @return 유효성 검사 결과
   */
  validateSaju(sajuInfo: SajuInfo): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // 간지 유효성 검사
    const pillars = [sajuInfo.yearGanji, sajuInfo.monthGanji, sajuInfo.dayGanji, sajuInfo.timeGanji];
    pillars.forEach((pillar, index) => {
      if (!SajuUtils.isValidGanji(pillar)) {
        const pillarNames = ['년주', '월주', '일주', '시주'];
        errors.push(`${pillarNames[index]}가 유효하지 않습니다: ${pillar}`);
      }
    });
    
    // 성별 검사
    if (sajuInfo.gender !== 0 && sajuInfo.gender !== 1) {
      errors.push('성별은 0(남자) 또는 1(여자)이어야 합니다.');
    }
    
    // 출생년도 검사
    if (sajuInfo.birthYear < 1900 || sajuInfo.birthYear > 2100) {
      errors.push('출생년도는 1900년부터 2100년 사이여야 합니다.');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 사주 호환성 분석
   * @param sajuInfo1 사주1
   * @param sajuInfo2 사주2
   * @return 호환성 분석 결과
   */
  analyzeCompatibility(sajuInfo1: SajuInfo, sajuInfo2: SajuInfo): { [key: string]: any } {
    const analysis1 = this.analyzeSaju(sajuInfo1);
    const analysis2 = this.analyzeSaju(sajuInfo2);
    
    // 상세 호환성 분석
    const compatibility = {
      overall: '보통',
      score: 50,
      details: [] as string[],
      recommendations: [] as string[],
      strengths: [] as string[],
      weaknesses: [] as string[],
      categories: {
        dayPillar: { score: 50, description: '' },
        fiveElements: { score: 50, description: '' },
        jijiRelation: { score: 50, description: '' },
        sinsal: { score: 50, description: '' }
      },
      extras: {} as any,
      insights: {} as any
    };
    
    let totalScore = 0;
    
    // 1. 일주 궁합 분석 (가중치 30%)
    const dayPillarScore = this.analyzeDayPillarCompatibility(sajuInfo1, sajuInfo2);
    compatibility.categories.dayPillar = dayPillarScore;
    totalScore += dayPillarScore.score * 0.3;
    
    // 2. 오행 균형 궁합 (가중치 25%)
    const fiveElementScore = this.analyzeFiveElementCompatibility(sajuInfo1, sajuInfo2);
    compatibility.categories.fiveElements = fiveElementScore;
    totalScore += fiveElementScore.score * 0.25;
    
    // 3. 지지 관계 궁합 (가중치 25%)
    const jijiScore = this.analyzeJijiCompatibility(sajuInfo1, sajuInfo2);
    compatibility.categories.jijiRelation = jijiScore;
    totalScore += jijiScore.score * 0.25;
    
    // 4. 신살 궁합 (가중치 20%)
    const sinsalScore = this.analyzeSinsalCompatibility(analysis1, analysis2);
    compatibility.categories.sinsal = sinsalScore;
    totalScore += sinsalScore.score * 0.2;
    
    compatibility.score = Math.round(totalScore);
    
    // 5. 전체 주 교차 분석 (점수에는 중복 반영하지 않고 설명/데이터만 제공)
    const cross = this.analyzeCrossPillarRelations(sajuInfo1, sajuInfo2);
    compatibility.extras.cross = cross;
    // 6. 십신(오신) 교차 분석
    const sipsin = this.analyzeSipsinCrossRelations(sajuInfo1, sajuInfo2);
    compatibility.extras.sipsin = sipsin;
    // 7. 대운 교차 시기 요약
    const timeline = this.analyzeDaewoonInteraction(sajuInfo1, sajuInfo2);
    compatibility.extras.timeline = timeline;
    
    // 종합 평가
    if (compatibility.score >= 80) {
      compatibility.overall = '매우 좋음';
    } else if (compatibility.score >= 65) {
      compatibility.overall = '좋음';
    } else if (compatibility.score >= 50) {
      compatibility.overall = '보통';
    } else if (compatibility.score >= 35) {
      compatibility.overall = '주의';
    } else {
      compatibility.overall = '매우 주의';
    }
    
    // 상세 분석 결과 정리
    Object.values(compatibility.categories).forEach(category => {
      if (category.score >= 70) {
        compatibility.strengths.push(category.description);
      } else if (category.score < 40) {
        compatibility.weaknesses.push(category.description);
      }
      compatibility.details.push(category.description);
    });
    if (cross?.summary) {
      compatibility.details.push(cross.summary);
    }
    
    // 추천사항 생성
    this.generateCompatibilityRecommendations(compatibility);
    
    // 관계별 맞춤 인사이트 생성
    compatibility.insights = this.generateRelationshipInsights(compatibility);
    
    return compatibility;
  }

  /**
   * 일주 궁합 분석
   */
  private analyzeDayPillarCompatibility(sajuInfo1: SajuInfo, sajuInfo2: SajuInfo): { score: number; description: string } {
    const stemChar1 = sajuInfo1.dayGanji[0];
    const stemChar2 = sajuInfo2.dayGanji[0];
    const dayGan1 = SajuUtils.getProperty(stemChar1);
    const dayGan2 = SajuUtils.getProperty(stemChar2);
    const dayJi1 = SajuUtils.getProperty(sajuInfo1.dayGanji[1]);
    const dayJi2 = SajuUtils.getProperty(sajuInfo2.dayGanji[1]);
    
    let score = 50;
    let description = '';
    
    // 1) 천간합(5합) 우선 검사
    const stemCombo = checkHeavenlyStemCombination(stemChar1, stemChar2);
    if (stemCombo) {
      score += 20;
      description += `일간 천간합(${stemCombo.label})으로 ${stemCombo.element} 기운이 형성되어 ${stemCombo.description}. `;
    } else if (SajuUtils.isSangsaeng(dayGan1, dayGan2) || SajuUtils.isSangsaeng(dayGan2, dayGan1)) {
      // 2) 상생
      score += 20;
      description += '일간이 상생관계로 서로 도움이 됩니다. ';
    } else if (SajuUtils.isSanggeuk(dayGan1, dayGan2) || SajuUtils.isSanggeuk(dayGan2, dayGan1)) {
      // 3) 상극
      score -= 15;
      description += '일간이 상극관계로 갈등이 있을 수 있습니다. ';
    } else if (dayGan1 === dayGan2) {
      score += 10;
      description += '일간이 같아 성향이 비슷합니다. ';
    }
    
    // 일지 관계 분석
    if (SajuUtils.isSangsaeng(dayJi1, dayJi2) || SajuUtils.isSangsaeng(dayJi2, dayJi1)) {
      score += 15;
      description += '일지가 상생관계로 조화롭습니다.';
    } else if (SajuUtils.isSanggeuk(dayJi1, dayJi2) || SajuUtils.isSanggeuk(dayJi2, dayJi1)) {
      score -= 10;
      description += '일지가 상극관계로 주의가 필요합니다.';
    }
    
    return { score: Math.max(0, Math.min(100, score)), description };
  }

  /**
   * 오행 균형 궁합 분석
   */
  private analyzeFiveElementCompatibility(sajuInfo1: SajuInfo, sajuInfo2: SajuInfo): { score: number; description: string } {
    const balance1 = this.analyzeFiveElementBalance(sajuInfo1);
    const balance2 = this.analyzeFiveElementBalance(sajuInfo2);
    
    let score = 50;
    let description = '';
    
    // 부족한 오행을 서로 보완하는지 확인
    const weak1 = balance1.weakElements || [];
    const strong2 = balance2.strongElements || [];
    const weak2 = balance2.weakElements || [];
    const strong1 = balance1.strongElements || [];
    
    const complement1to2 = weak1.filter((element: string) => strong2.includes(element)).length;
    const complement2to1 = weak2.filter((element: string) => strong1.includes(element)).length;
    
    if (complement1to2 > 0 && complement2to1 > 0) {
      score += 25;
      description = '서로의 부족한 오행을 잘 보완합니다.';
    } else if (complement1to2 > 0 || complement2to1 > 0) {
      score += 15;
      description = '한쪽의 부족한 오행을 보완해줍니다.';
    } else {
      description = '오행 보완 관계가 약합니다.';
    }
    
    // 두 사람이 합쳐 5원소를 모두 갖추는지 검사
    const present1 = Object.entries(balance1.elementCount).filter(([, v]) => v > 0).map(([k]) => k);
    const present2 = Object.entries(balance2.elementCount).filter(([, v]) => v > 0).map(([k]) => k);
    const union = Array.from(new Set([...present1, ...present2]));
    if (union.length === 5) {
      score += 10;
      description += ' 함께하면 오행이 완비됩니다.';
    }
    
    // 강한 오행 상충 여부 검사
    let conflictFound = false;
    strong1.forEach((e1: string) => {
      strong2.forEach((e2: string) => {
        // 문자열 오행명을 FiveElement enum으로 변환
        const mapNameToEnum: { [k: string]: number } = { '화': 0, '수': 1, '목': 2, '금': 3, '토': 4 };
        const fe1 = mapNameToEnum[e1];
        const fe2 = mapNameToEnum[e2];
        if (fe1 !== undefined && fe2 !== undefined) {
          if (SajuUtils.isSanggeuk(fe1, fe2) || SajuUtils.isSanggeuk(fe2, fe1)) {
            conflictFound = true;
          }
        }
      });
    });
    if (conflictFound) {
      score -= 10;
      description += ' 강한 오행 간 상극이 있어 조율이 필요합니다.';
    }
    
    return { score: Math.max(0, Math.min(100, score)), description };
  }

  /**
   * 지지 관계 궁합 분석
   */
  private analyzeJijiCompatibility(sajuInfo1: SajuInfo, sajuInfo2: SajuInfo): { score: number; description: string } {
    const jiji1 = [sajuInfo1.yearGanji[1], sajuInfo1.monthGanji[1], sajuInfo1.dayGanji[1], sajuInfo1.timeGanji[1]];
    const jiji2 = [sajuInfo2.yearGanji[1], sajuInfo2.monthGanji[1], sajuInfo2.dayGanji[1], sajuInfo2.timeGanji[1]];
    
    let score = 50;
    let harmonious = 0;
    let conflicting = 0;
    let yukhapCount = 0;
    let hyeongCount = 0;
    let paCount = 0;
    let haeCount = 0;
    
    // 삼합, 육합 관계 확인
    const banghapResult1 = this.banghapCalculator.analyzeBanghapStrength([...jiji1, ...jiji2]);
    if (banghapResult1.totalStrength > 0) {
      harmonious += banghapResult1.totalStrength;
    }
    
    // 두 사주 간 모든 페어에서 충/형/파/해·육합 체크
    for (const ji1 of jiji1) {
      for (const ji2 of jiji2) {
        if (this.isJijiConflict(ji1, ji2)) conflicting += 1;
        if (isYukhap(ji1, ji2)) yukhapCount += 1;
        if (isHyeong(ji1, ji2)) hyeongCount += 1;
        if (isPa(ji1, ji2)) paCount += 1;
        if (isHae(ji1, ji2)) haeCount += 1;
      }
    }
    
    // 일지(배우자궁) 우선 가중치
    const dayJi1 = jiji1[2];
    const dayJi2 = jiji2[2];
    if (isYukhap(dayJi1, dayJi2)) { yukhapCount += 2; harmonious += 2; }
    if (this.isJijiConflict(dayJi1, dayJi2)) conflicting += 2;
    if (isHyeong(dayJi1, dayJi2)) hyeongCount += 2;
    if (isPa(dayJi1, dayJi2)) paCount += 2;
    if (isHae(dayJi1, dayJi2)) haeCount += 2;
    
    // 점수 반영: 방합 강도 + 육합 보너스 - 충/형/파/해 패널티
    score += harmonious * 10;
    score += yukhapCount * 3;
    score -= conflicting * 5;
    score -= hyeongCount * 4;
    score -= paCount * 3;
    score -= haeCount * 4;
    
    let description = '';
    const parts: string[] = [];
    if (yukhapCount > 0) parts.push('육합 기운이 있어 화합이 잘 맞습니다');
    if (banghapResult1.totalStrength > 0) parts.push('삼합/방합 기운이 조화를 돕습니다');
    if (conflicting > 0) parts.push('충이 있어 부딪힘이 있을 수 있습니다');
    if (hyeongCount > 0) parts.push('형이 있어 긴장감·압박이 생길 수 있습니다');
    if (paCount > 0) parts.push('파가 있어 균열·변동성이 있습니다');
    if (haeCount > 0) parts.push('해가 있어 상호 미스매치가 있습니다');
    if (parts.length === 0) parts.push('지지 관계가 평범합니다');
    description = parts.join(' · ');
    
    return { score: Math.max(0, Math.min(100, score)), description };
  }

  /**
   * 전체 사주 교차 분석 (년월일시 지지 간 관계 요약)
   * 점수에는 직접 반영하지 않고, 설명/데이터 제공
   */
  private analyzeCrossPillarRelations(sajuInfo1: SajuInfo, sajuInfo2: SajuInfo): { [key: string]: any } {
    const branches1 = [sajuInfo1.yearGanji[1], sajuInfo1.monthGanji[1], sajuInfo1.dayGanji[1], sajuInfo1.timeGanji[1]];
    const branches2 = [sajuInfo2.yearGanji[1], sajuInfo2.monthGanji[1], sajuInfo2.dayGanji[1], sajuInfo2.timeGanji[1]];
    let chung = 0, yukhap = 0, hyeong = 0, pa = 0, hae = 0;
    const pairs: Array<{ a: string; b: string; type: string }> = [];
    for (const a of branches1) {
      for (const b of branches2) {
        if (isYukhap(a, b)) { yukhap++; pairs.push({ a, b, type: '육합' }); }
        if (isChung(a, b)) { chung++; pairs.push({ a, b, type: '충' }); }
        if (isHyeong(a, b)) { hyeong++; pairs.push({ a, b, type: '형' }); }
        if (isPa(a, b)) { pa++; pairs.push({ a, b, type: '파' }); }
        if (isHae(a, b)) { hae++; pairs.push({ a, b, type: '해' }); }
      }
    }
    // 일지 우선 강조
    const day1 = branches1[2];
    const day2 = branches2[2];
    const highlights: string[] = [];
    if (isYukhap(day1, day2)) highlights.push('일지 육합');
    if (isChung(day1, day2)) highlights.push('일지 충');
    if (isHyeong(day1, day2)) highlights.push('일지 형');
    if (isPa(day1, day2)) highlights.push('일지 파');
    if (isHae(day1, day2)) highlights.push('일지 해');
    const parts: string[] = [];
    if (yukhap) parts.push(`육합 ${yukhap}개`);
    if (chung) parts.push(`충 ${chung}개`);
    if (hyeong) parts.push(`형 ${hyeong}개`);
    if (pa) parts.push(`파 ${pa}개`);
    if (hae) parts.push(`해 ${hae}개`);
    if (parts.length === 0) parts.push('특기할 교차 관계 없음');
    if (highlights.length > 0) parts.push(`(${highlights.join(', ')})`);
    return {
      counts: { yukhap, chung, hyeong, pa, hae },
      pairs,
      summary: `교차 관계 요약: ${parts.join(' · ')}`
    };
  }

  /**
   * 신살 궁합 분석
   */
  private analyzeSinsalCompatibility(analysis1: SajuAnalysis, analysis2: SajuAnalysis): { score: number; description: string } {
    let score = 50;
    let description = '신살 관계가 평범합니다.';
    
    // 긍정적인 신살 개수 비교
    const positive1 = this.countPositiveSinsal(analysis1.sinsal);
    const positive2 = this.countPositiveSinsal(analysis2.sinsal);
    
    if (positive1 > 2 && positive2 > 2) {
      score += 20;
      description = '둘 다 좋은 신살이 많아 길한 관계입니다.';
    } else if (positive1 > 2 || positive2 > 2) {
      score += 10;
      description = '한쪽에 좋은 신살이 많습니다.';
    }
    
    return { score: Math.max(0, Math.min(100, score)), description };
  }

  /**
   * 지지 충돌 확인 (간단한 버전)
   */
  private isJijiConflict(ji1: string, ji2: string): boolean {
    const conflicts: { [key: string]: string } = {
      '子': '午', '午': '子',
      '丑': '未', '未': '丑', 
      '寅': '申', '申': '寅',
      '卯': '酉', '酉': '卯',
      '辰': '戌', '戌': '辰',
      '巳': '亥', '亥': '巳'
    };
    return conflicts[ji1] === ji2;
  }

  /**
   * 긍정적인 신살 개수 계산
   */
  private countPositiveSinsal(sinsal: { [key: string]: string[] }): number {
    const positiveSinsal = ['천을귀인', '월덕귀인', '천덕귀인', '복성귀인', '월령'];
    let count = 0;
    
    Object.keys(sinsal).forEach(key => {
      if (positiveSinsal.some(positive => key.includes(positive))) {
        count += sinsal[key].length;
      }
    });
    
    return count;
  }

  /**
   * 궁합 추천사항 생성
   */
  private generateCompatibilityRecommendations(compatibility: any): void {
    if (compatibility.score >= 80) {
      compatibility.recommendations.push('매우 좋은 궁합입니다. 서로를 믿고 의지하세요.');
    } else if (compatibility.score >= 65) {
      compatibility.recommendations.push('좋은 궁합입니다. 소통을 통해 더욱 발전시키세요.');
    } else if (compatibility.score >= 50) {
      compatibility.recommendations.push('보통 궁합입니다. 서로의 차이점을 인정하고 노력하세요.');
    } else {
      compatibility.recommendations.push('주의가 필요한 궁합입니다. 서로 이해하려 노력하세요.');
      compatibility.recommendations.push('갈등이 생기면 냉정하게 대화로 해결하세요.');
    }
  }

  /**
   * 관계별 맞춤 인사이트 생성
   */
  private generateRelationshipInsights(compatibility: any): { [key: string]: string[] } {
    const insights: { [key: string]: string[] } = {
      marriage: [],
      dating: [],
      personality: [],
      future: []
    };
    const dayDesc = compatibility.categories.dayPillar.description as string;
    const fiveDesc = compatibility.categories.fiveElements.description as string;
    const jijiDesc = compatibility.categories.jijiRelation.description as string;
    const score = compatibility.score as number;
    // 결혼: 일지/안정성 중심
    if (dayDesc.includes('천간합') || jijiDesc.includes('육합')) {
      insights.marriage.push('장기적 안정감이 있습니다. 가정 운영에서 합이 잘 맞습니다.');
    }
    if (jijiDesc.includes('충') || jijiDesc.includes('갈등')) {
      insights.marriage.push('갈등 신호가 있어 역할 분담과 의사소통의 원칙이 필요합니다.');
    }
    // 연애: 조화/열정
    if (fiveDesc.includes('완비') || dayDesc.includes('상생')) {
      insights.dating.push('자연스러운 끌림과 상호 보완으로 연애 템포가 잘 맞습니다.');
    }
    if (fiveDesc.includes('상극') || jijiDesc.includes('충')) {
      insights.dating.push('감정 기복이 있을 수 있어 속도 조절과 공감 훈련이 필요합니다.');
    }
    // 성격: 오행·지지 기반
    insights.personality.push(fiveDesc || '오행 균형 관점에서 보통입니다.');
    insights.personality.push(jijiDesc || '지지 관계는 무난합니다.');
    // 미래: 종합 점수 기반 간단 전망
    if (score >= 80) insights.future.push('상승 곡선이 예상됩니다. 공동의 목표를 크게 잡아도 좋습니다.');
    else if (score >= 65) insights.future.push('안정 속 성장을 기대할 수 있습니다. 중기 계획에 유리합니다.');
    else if (score >= 50) insights.future.push('평균적 흐름입니다. 리스크 관리를 통해 개선 여지가 있습니다.');
    else insights.future.push('주요 변곡점에서 조율이 필요합니다. 합의된 규칙과 조정 장치를 마련하세요.');
    return insights;
  }

  /**
   * 십신(오신) 교차 분석
   * 간략화: 일간 오행 기준으로 상대 주요 천간의 오행 관계를 5분류(비겁/식상/재성/관성/인성)
   */
  private analyzeSipsinCrossRelations(sajuInfo1: SajuInfo, sajuInfo2: SajuInfo): { [key: string]: any } {
    const toName = (el: number): string => {
      switch (el) {
        case 0: return '화';
        case 1: return '수';
        case 2: return '목';
        case 3: return '금';
        case 4: return '토';
        default: return '기타';
      }
    };
    const classify = (me: number, other: number): 'peer' | 'output' | 'wealth' | 'officer' | 'resource' | 'other' => {
      // me -> other 상생이면 output(식상)
      if (SajuUtils.isSangsaeng(me, other)) return 'output';
      // other -> me 상생이면 resource(인성)
      if (SajuUtils.isSangsaeng(other, me)) return 'resource';
      // me -> other 상극이면 wealth(재성) (내가 극하는 오행)
      if (SajuUtils.isSanggeuk(me, other)) return 'wealth';
      // other -> me 상극이면 officer(관성) (나를 극하는 오행)
      if (SajuUtils.isSanggeuk(other, me)) return 'officer';
      // 동일 오행이면 peer(비겁)
      if (me === other) return 'peer';
      return 'other';
    };
    const pickStems = (s: SajuInfo): string[] => [s.yearGanji[0], s.monthGanji[0], s.dayGanji[0], s.timeGanji[0]];
    const me1 = SajuUtils.getProperty(sajuInfo1.dayGanji[0]);
    const me2 = SajuUtils.getProperty(sajuInfo2.dayGanji[0]);
    const stems1 = pickStems(sajuInfo1).map(c => SajuUtils.getProperty(c));
    const stems2 = pickStems(sajuInfo2).map(c => SajuUtils.getProperty(c));
    const summary = (me: number, others: number[]) => {
      const buckets: Record<string, number> = { peer: 0, output: 0, wealth: 0, officer: 0, resource: 0, other: 0 };
      others.forEach(o => buckets[classify(me, o)]++);
      return buckets;
    };
    const buckets1 = summary(me1, stems2);
    const buckets2 = summary(me2, stems1);
    const top1 = Object.entries(buckets1).sort((a, b) => b[1] - a[1])[0]?.[0] || 'peer';
    const top2 = Object.entries(buckets2).sort((a, b) => b[1] - a[1])[0]?.[0] || 'peer';
    const labelMap: Record<string, string> = {
      peer: '비겁 기류(유사 성향·경쟁/협력)',
      output: '식상 기류(표현·소통·생산성)',
      wealth: '재성 기류(책임·자원·실리)',
      officer: '관성 기류(규범·압박·목표)',
      resource: '인성 기류(지원·케어·학습)',
      other: '중립'
    };
    return {
      person1: {
        dayElement: toName(me1),
        counts: buckets1,
        dominantFlow: labelMap[top1]
      },
      person2: {
        dayElement: toName(me2),
        counts: buckets2,
        dominantFlow: labelMap[top2]
      }
    };
  }

  /**
   * 대운 교차 시기 분석: 상대 일지/일간과의 합·충·천간합을 기준으로
   * 긍정(+), 주의(-) 시기를 리스트업
   */
  private analyzeDaewoonInteraction(sajuInfo1: SajuInfo, sajuInfo2: SajuInfo): { [key: string]: any } {
    const getDaewoon = (s: SajuInfo) => this.daewoonCalculator.calculateAccurateDaewoon(
      s.yearGanji, s.monthGanji, s.birthYear, s.gender, s.birthDate
    );
    const d1 = getDaewoon(sajuInfo1);
    const d2 = getDaewoon(sajuInfo2);
    const dayStem1 = sajuInfo1.dayGanji[0];
    const dayStem2 = sajuInfo2.dayGanji[0];
    const dayJi1 = sajuInfo1.dayGanji[1];
    const dayJi2 = sajuInfo2.dayGanji[1];
    const evalEntry = (ganji: string, otherStem: string, otherJi: string) => {
      const stem = ganji[0];
      const ji = ganji[1];
      let score = 0;
      const tags: string[] = [];
      // 지지 간 관계
      if (isYukhap(ji, otherJi)) { score += 2; tags.push('육합(+2)'); }
      if (isChung(ji, otherJi)) { score -= 2; tags.push('충(-2)'); }
      if (isHyeong(ji, otherJi)) { score -= 1; tags.push('형(-1)'); }
      if (isPa(ji, otherJi)) { score -= 1; tags.push('파(-1)'); }
      if (isHae(ji, otherJi)) { score -= 1; tags.push('해(-1)'); }
      // 천간합
      const combo = checkHeavenlyStemCombination(stem, otherStem);
      if (combo) { score += 2; tags.push(`${combo.label}(+2)`); }
      return { score, tags };
    };
    const analyze = (mine: any[], otherStem: string, otherJi: string) => {
      const points = mine.map(dw => {
        const { score, tags } = evalEntry(dw.ganji, otherStem, otherJi);
        return { age: dw.age, year: dw.year, ganji: dw.ganji, score, tags };
      });
      const positives = points.filter(p => p.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
      const cautions = points.filter(p => p.score < 0).sort((a, b) => a.score - b.score).slice(0, 3);
      return { positives, cautions };
    };
    return {
      person1: analyze(d1, dayStem2, dayJi2),
      person2: analyze(d2, dayStem1, dayJi1)
    };
  }

  /**
   * 방합 분석
   * @param sajuInfo 사주 정보
   * @return 방합 분석 결과
   */
  analyzeBanghap(sajuInfo: SajuInfo): { [key: string]: any } {
    const pillars = [sajuInfo.yearGanji, sajuInfo.monthGanji, sajuInfo.dayGanji, sajuInfo.timeGanji];
    return this.banghapCalculator.analyzeBanghapStrength(pillars);
  }

  /**
   * 귀인 분석
   * @param sajuInfo 사주 정보
   * @return 귀인 분석 결과
   */
  analyzeGuin(sajuInfo: SajuInfo): { [key: string]: any } {
    return this.guinCalculator.analyzeGuinStrength(sajuInfo);
  }

  /**
   * 특정 간지 간의 방합 관계 확인
   * @param ganji1 첫 번째 간지
   * @param ganji2 두 번째 간지
   * @return 방합 정보
   */
  checkBanghap(ganji1: string, ganji2: string) {
    return this.banghapCalculator.calculateBanghap(ganji1, ganji2);
  }

  /**
   * 특정 간지의 귀인 여부 확인
   * @param sajuInfo 사주 정보
   * @param targetGanji 확인할 간지
   * @return 귀인 정보
   */
  checkGuin(sajuInfo: SajuInfo, targetGanji: string) {
    const allGuin = this.guinCalculator.analyzeAllGuin(sajuInfo);
    return allGuin.filter(guin => 
      guin.description.includes(targetGanji[0]) || guin.description.includes(targetGanji[1])
    );
  }

  /**
   * 종합 사주 분석 (모든 기능 포함)
   * @param sajuInfo 사주 정보
   * @return 종합 분석 결과
   */
  comprehensiveAnalysis(sajuInfo: SajuInfo): { [key: string]: any } {
    const basicAnalysis = this.analyzeSaju(sajuInfo);
    const banghapAnalysis = this.analyzeBanghap(sajuInfo);
    const guinAnalysis = this.analyzeGuin(sajuInfo);
    const fiveElementBalance = this.analyzeFiveElementBalance(sajuInfo);
    const summary = this.getSajuSummary(sajuInfo);

    return {
      basic: basicAnalysis,
      banghap: banghapAnalysis,
      guin: guinAnalysis,
      fiveElementBalance,
      summary,
      overallScore: this.calculateOverallScore(banghapAnalysis, guinAnalysis, fiveElementBalance)
    };
  }

  /**
   * 전체 점수 계산
   * @param banghap 방합 분석
   * @param guin 귀인 분석
   * @param balance 오행 균형
   * @return 전체 점수
   */
  private calculateOverallScore(banghap: any, guin: any, balance: FiveElementBalance): { [key: string]: any } {
    const banghapScore = banghap.totalStrength * 2;
    const guinScore = guin.totalStrength * 3;
    const balanceScore = balance.balance === '균형' ? 20 : 10;
    
    const totalScore = banghapScore + guinScore + balanceScore;
    
    let grade = 'C';
    if (totalScore >= 80) grade = 'A+';
    else if (totalScore >= 70) grade = 'A';
    else if (totalScore >= 60) grade = 'B+';
    else if (totalScore >= 50) grade = 'B';
    else if (totalScore >= 40) grade = 'C+';
    
    return {
      totalScore,
      grade,
      breakdown: {
        banghap: banghapScore,
        guin: guinScore,
        balance: balanceScore
      },
      description: `전체 점수는 ${totalScore}점으로 ${grade}등급입니다.`
    };
  }

  /**
   * 전통 신살 분석
   * @param sajuInfo 사주 정보
   * @return 전통 신살 분석 결과
   */
  analyzeTraditionalSinsal(sajuInfo: SajuInfo): { [key: string]: any } {
    const pillars = [sajuInfo.yearGanji, sajuInfo.monthGanji, sajuInfo.dayGanji, sajuInfo.timeGanji];
    const pillarNames = ['년주', '월주', '일주', '시주'];
    const allSinsal: { [key: string]: string[] } = {};

    pillars.forEach((pillar, index) => {
      const sinsalList = this.sinsalCalculator.analyzeTraditionalSinsal(sajuInfo.yearGanji, sajuInfo.dayGanji, pillar);
      if (sinsalList.length > 0) {
        allSinsal[pillarNames[index]] = sinsalList;
      }
    });

    return {
      traditionalSinsal: allSinsal,
      totalSinsal: Object.values(allSinsal).flat().length,
      description: "전통 신살 분석 결과입니다."
    };
  }
}
