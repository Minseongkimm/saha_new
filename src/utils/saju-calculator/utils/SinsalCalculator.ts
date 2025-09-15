/**
 * 신살 계산 클래스 (보편적 계산 로직)
 * 전통 사주학의 신살 계산 규칙을 기반으로 한 보편적 계산
 */

import { SinsalType } from '../types';

export class SinsalCalculator {
  /**
   * 화개살 계산
   * @param dayGanji 일간지
   * @param targetGanji 대상 간지
   * @return 화개살 여부
   */
  calculateHwagaeSal(dayGanji: string, targetGanji: string): string | null {
    const dayGan = dayGanji[0];
    const targetJi = targetGanji[1];
    
    // 화개살 계산 (일간의 오행과 상극인 지지)
    const hwagaeMap: { [key: string]: string[] } = {
      '甲': ['申', '酉'],  // 갑목은 금(신유)이 화개살
      '乙': ['申', '酉'],  // 을목은 금(신유)이 화개살
      '丙': ['亥', '子'],  // 병화는 수(해자)가 화개살
      '丁': ['亥', '子'],  // 정화는 수(해자)가 화개살
      '戊': ['寅', '卯'],  // 무토는 목(인묘)이 화개살
      '己': ['寅', '卯'],  // 기토는 목(인묘)이 화개살
      '庚': ['巳', '午'],  // 경금은 화(사오)가 화개살
      '辛': ['巳', '午'],  // 신금은 화(사오)가 화개살
      '壬': ['辰', '戌', '丑', '未'],  // 임수는 토(진술축미)가 화개살
      '癸': ['辰', '戌', '丑', '未']   // 계수는 토(진술축미)가 화개살
    };

    const hwagaeJis = hwagaeMap[dayGan];
    if (hwagaeJis && hwagaeJis.includes(targetJi)) {
      return '화개살';
    }
    return null;
  }

  /**
   * 장성살 계산
   * @param dayGanji 일간지
   * @param targetGanji 대상 간지
   * @return 장성살 여부
   */
  calculateJangseongSal(dayGanji: string, targetGanji: string): string | null {
    const dayGan = dayGanji[0];
    const targetJi = targetGanji[1];
    
    // 장성살 계산 (일간의 오행과 같은 오행의 지지)
    const jangseongMap: { [key: string]: string[] } = {
      '甲': ['寅', '卯'],  // 갑목은 목(인묘)이 장성살
      '乙': ['寅', '卯'],  // 을목은 목(인묘)이 장성살
      '丙': ['巳', '午'],  // 병화는 화(사오)가 장성살
      '丁': ['巳', '午'],  // 정화는 화(사오)가 장성살
      '戊': ['辰', '戌', '丑', '未'],  // 무토는 토(진술축미)가 장성살
      '己': ['辰', '戌', '丑', '未'],  // 기토는 토(진술축미)가 장성살
      '庚': ['申', '酉'],  // 경금은 금(신유)이 장성살
      '辛': ['申', '酉'],  // 신금은 금(신유)이 장성살
      '壬': ['亥', '子'],  // 임수는 수(해자)가 장성살
      '癸': ['亥', '子']   // 계수는 수(해자)가 장성살
    };

    const jangseongJis = jangseongMap[dayGan];
    if (jangseongJis && jangseongJis.includes(targetJi)) {
      return '장성살';
    }
    return null;
  }

  /**
   * 백호살 계산
   * @param dayGanji 일간지
   * @param targetGanji 대상 간지
   * @return 백호살 여부
   */
  calculateBaekhoSal(dayGanji: string, targetGanji: string): string | null {
    const dayGan = dayGanji[0];
    const targetJi = targetGanji[1];
    
    // 백호살 계산 (일간의 오행을 생하는 지지)
    const baekhoMap: { [key: string]: string[] } = {
      '甲': ['亥', '子'],  // 갑목은 수(해자)가 백호살
      '乙': ['亥', '子'],  // 을목은 수(해자)가 백호살
      '丙': ['寅', '卯'],  // 병화는 목(인묘)이 백호살
      '丁': ['寅', '卯'],  // 정화는 목(인묘)이 백호살
      '戊': ['巳', '午'],  // 무토는 화(사오)가 백호살
      '己': ['巳', '午'],  // 기토는 화(사오)가 백호살
      '庚': ['辰', '戌', '丑', '未'],  // 경금은 토(진술축미)가 백호살
      '辛': ['辰', '戌', '丑', '未'],  // 신금은 토(진술축미)가 백호살
      '壬': ['申', '酉'],  // 임수는 금(신유)가 백호살
      '癸': ['申', '酉']   // 계수는 금(신유)가 백호살
    };

    const baekhoJis = baekhoMap[dayGan];
    if (baekhoJis && baekhoJis.includes(targetJi)) {
      return '백호살';
    }
    return null;
  }

  /**
   * 양인살 계산
   * @param dayGanji 일간지
   * @param targetGanji 대상 간지
   * @return 양인살 여부
   */
  calculateYanginSal(dayGanji: string, targetGanji: string): string | null {
    const dayGan = dayGanji[0];
    const targetJi = targetGanji[1];
    
    // 양인살 계산 (일간의 오행을 극하는 지지)
    const yanginMap: { [key: string]: string[] } = {
      '甲': ['辰', '戌', '丑', '未'],  // 갑목은 토(진술축미)가 양인살
      '乙': ['辰', '戌', '丑', '未'],  // 을목은 토(진술축미)가 양인살
      '丙': ['申', '酉'],  // 병화는 금(신유)이 양인살
      '丁': ['申', '酉'],  // 정화는 금(신유)이 양인살
      '戊': ['亥', '子'],  // 무토는 수(해자)가 양인살
      '己': ['亥', '子'],  // 기토는 수(해자)가 양인살
      '庚': ['寅', '卯'],  // 경금은 목(인묘)이 양인살
      '辛': ['寅', '卯'],  // 신금은 목(인묘)이 양인살
      '壬': ['巳', '午'],  // 임수는 화(사오)가 양인살
      '癸': ['巳', '午']   // 계수는 화(사오)가 양인살
    };

    const yanginJis = yanginMap[dayGan];
    if (yanginJis && yanginJis.includes(targetJi)) {
      return '양인살';
    }
    return null;
  }

  /**
   * 복성귀인 계산
   * @param dayGanji 일간지
   * @param targetGanji 대상 간지
   * @return 복성귀인 여부
   */
  calculateBokseongGuin(dayGanji: string, targetGanji: string): string | null {
    const dayGan = dayGanji[0];
    const targetJi = targetGanji[1];
    
    // 복성귀인 계산 (일간의 오행과 상생하는 지지)
    const bokseongMap: { [key: string]: string[] } = {
      '甲': ['巳', '午'],  // 갑목은 화(사오)가 복성귀인
      '乙': ['巳', '午'],  // 을목은 화(사오)가 복성귀인
      '丙': ['辰', '戌', '丑', '未'],  // 병화는 토(진술축미)가 복성귀인
      '丁': ['辰', '戌', '丑', '未'],  // 정화는 토(진술축미)가 복성귀인
      '戊': ['申', '酉'],  // 무토는 금(신유)가 복성귀인
      '己': ['申', '酉'],  // 기토는 금(신유)가 복성귀인
      '庚': ['亥', '子'],  // 경금은 수(해자)가 복성귀인
      '辛': ['亥', '子'],  // 신금은 수(해자)가 복성귀인
      '壬': ['寅', '卯'],  // 임수는 목(인묘)가 복성귀인
      '癸': ['寅', '卯']   // 계수는 목(인묘)가 복성귀인
    };

    const bokseongJis = bokseongMap[dayGan];
    if (bokseongJis && bokseongJis.includes(targetJi)) {
      return '복성귀인';
    }
    return null;
  }

  /**
   * 천주귀인 계산
   * @param dayGanji 일간지
   * @param targetGanji 대상 간지
   * @return 천주귀인 여부
   */
  calculateCheonjuGuin(dayGanji: string, targetGanji: string): string | null {
    const dayGan = dayGanji[0];
    const targetJi = targetGanji[1];
    
    // 천주귀인 계산 (일간의 오행과 상극당하는 지지)
    const cheonjuMap: { [key: string]: string[] } = {
      '甲': ['申', '酉'],  // 갑목은 금(신유)이 천주귀인
      '乙': ['申', '酉'],  // 을목은 금(신유)이 천주귀인
      '丙': ['亥', '子'],  // 병화는 수(해자)가 천주귀인
      '丁': ['亥', '子'],  // 정화는 수(해자)가 천주귀인
      '戊': ['寅', '卯'],  // 무토는 목(인묘)이 천주귀인
      '己': ['寅', '卯'],  // 기토는 목(인묘)이 천주귀인
      '庚': ['巳', '午'],  // 경금은 화(사오)가 천주귀인
      '辛': ['巳', '午'],  // 신금은 화(사오)가 천주귀인
      '壬': ['辰', '戌', '丑', '未'],  // 임수는 토(진술축미)가 천주귀인
      '癸': ['辰', '戌', '丑', '未']   // 계수는 토(진술축미)가 천주귀인
    };

    const cheonjuJis = cheonjuMap[dayGan];
    if (cheonjuJis && cheonjuJis.includes(targetJi)) {
      return '천주귀인';
    }
    return null;
  }

  /**
   * 전통 신살 종합 분석
   * @param dayGanji 일간지
   * @param targetGanji 대상 간지
   * @return 모든 전통 신살
   */
  analyzeTraditionalSinsal(dayGanji: string, targetGanji: string): string[] {
    const sinsalList: string[] = [];
    
    const hwagae = this.calculateHwagaeSal(dayGanji, targetGanji);
    if (hwagae) sinsalList.push(hwagae);
    
    const jangseong = this.calculateJangseongSal(dayGanji, targetGanji);
    if (jangseong) sinsalList.push(jangseong);
    
    const baekho = this.calculateBaekhoSal(dayGanji, targetGanji);
    if (baekho) sinsalList.push(baekho);
    
    const yangin = this.calculateYanginSal(dayGanji, targetGanji);
    if (yangin) sinsalList.push(yangin);
    
    const bokseong = this.calculateBokseongGuin(dayGanji, targetGanji);
    if (bokseong) sinsalList.push(bokseong);
    
    const cheonju = this.calculateCheonjuGuin(dayGanji, targetGanji);
    if (cheonju) sinsalList.push(cheonju);
    
    return sinsalList;
  }

  /**
   * 모든 신살 계산 (보편적 로직 사용)
   * @param yearGanji 년간지
   * @param monthGanji 월간지
   * @param dayGanji 일간지
   * @param timeGanji 시간지
   * @param gender 성별
   * @return 전체 신살 맵
   */
  getAllSinsal(yearGanji: string, monthGanji: string, dayGanji: string, timeGanji: string, gender: number): { [key: string]: string[] } {
    const pillars = [timeGanji, dayGanji, monthGanji, yearGanji];
    const pillarNames = ['timeSinsal', 'daySinsal', 'monthSinsal', 'yearSinsal'];
    const sinsal: { [key: string]: string[] } = {
      yearSinsal: [],
      monthSinsal: [],
      daySinsal: [],
      timeSinsal: []
    };

    // 각 주별로 신살 계산
    pillars.forEach((pillar, index) => {
      const pillarSinsal = this.analyzeTraditionalSinsal(dayGanji, pillar);
      sinsal[pillarNames[index]] = pillarSinsal;
    });

    return sinsal;
  }
}