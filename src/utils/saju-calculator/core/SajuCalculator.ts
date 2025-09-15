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
      sajuInfo.gender
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

    // 괴강살 계산 (월주와 시주가 괴강살인지 확인)
    const isGwaegang = this.calculateGwaegangSal(sajuInfo.monthGanji, sajuInfo.timeGanji);
    if (isGwaegang) {
      sinsal.monthSinsal.push('괴강살');
      sinsal.timeSinsal.push('괴강살');
    }

    // 각 주별로 신살 계산
    pillars.forEach((pillar, index) => {
      const pillarSinsal: string[] = [];
      
      // 화개살 계산
      const hwagae = this.sinsalCalculator.calculateHwagaeSal(sajuInfo.dayGanji, pillar);
      if (hwagae) pillarSinsal.push(hwagae);
      
      // 장성살 계산
      const jangseong = this.sinsalCalculator.calculateJangseongSal(sajuInfo.dayGanji, pillar);
      if (jangseong) pillarSinsal.push(jangseong);
      
      // 백호살 계산
      const baekho = this.sinsalCalculator.calculateBaekhoSal(sajuInfo.dayGanji, pillar);
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
   * 괴강살 계산
   * @param monthGanji 월주 간지
   * @param timeGanji 시주 간지
   * @return 괴강살 여부
   */
  private calculateGwaegangSal(monthGanji: string, timeGanji: string): boolean {
    const gwaegangPairs = [
      ['壬辰', '戊戌'], ['庚戌', '庚辰'], ['戊戌', '壬辰'], ['庚辰', '庚戌']
    ];
    
    return gwaegangPairs.some(pair => 
      (pair[0] === monthGanji && pair[1] === timeGanji) ||
      (pair[0] === timeGanji && pair[1] === monthGanji)
    );
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
      sajuInfo.gender
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
    
    const maxElement = Object.keys(elementCount).reduce((a, b) => 
      elementCount[a] > elementCount[b] ? a : b
    );
    const minElement = Object.keys(elementCount).reduce((a, b) => 
      elementCount[a] < elementCount[b] ? a : b
    );
    
    return {
      elementCount,
      maxElement,
      minElement,
      balance: maxElement === minElement ? '균형' : '불균형'
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
    
    // 오행 상생/상극 분석
    const compatibility: {
      overall: string;
      details: string[];
      recommendations: string[];
    } = {
      overall: '보통',
      details: [],
      recommendations: []
    };
    
    // 간단한 호환성 분석 로직
    const dayGan1 = SajuUtils.getProperty(sajuInfo1.dayGanji[0]);
    const dayGan2 = SajuUtils.getProperty(sajuInfo2.dayGanji[0]);
    
    if (SajuUtils.isSangsaeng(dayGan1, dayGan2)) {
      compatibility.overall = '좋음';
      compatibility.details.push('일간 오행이 상생 관계입니다.');
    } else if (SajuUtils.isSanggeuk(dayGan1, dayGan2)) {
      compatibility.overall = '주의';
      compatibility.details.push('일간 오행이 상극 관계입니다.');
    }
    
    return compatibility;
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
      const sinsalList = this.sinsalCalculator.analyzeTraditionalSinsal(sajuInfo.dayGanji, pillar);
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
