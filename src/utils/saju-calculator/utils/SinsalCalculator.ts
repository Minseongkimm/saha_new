/**
 * 신살 계산 클래스 (보편적 계산 로직)
 * 전통 사주학의 신살 계산 규칙을 기반으로 한 보편적 계산
 */

import { SinsalType } from '../types';

// 12지지 (子~亥) - 12신살 순환 계산에 사용
const TWELVE_JI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 12신살 기준 삼합 그룹과 겁살 시작 지지
const TWELVE_SINSAL_GROUPS: { branches: string[]; gyeopsalStart: string }[] = [
  { branches: ['申', '子', '辰'], gyeopsalStart: '巳' },
  { branches: ['亥', '卯', '未'], gyeopsalStart: '申' },
  { branches: ['寅', '午', '戌'], gyeopsalStart: '亥' },
  { branches: ['巳', '酉', '丑'], gyeopsalStart: '寅' }
];
const TWELVE_SINSAL_ORDER = [
  '겁살', '재살', '천살', '지살', '년살', '월살',
  '망신살', '장성살', '반안살', '역마살', '육해살', '화개살'
];

// 년지 기준 12신살 맵 - 화개살/장성살은 12신살 체계의 일부이므로 이 표에서 파생시킨다.
const getYearBasedTwelveSinsalMap = (yearJi: string): { [ji: string]: string } => {
  const group = TWELVE_SINSAL_GROUPS.find(g => g.branches.includes(yearJi));
  if (!group) return {};
  const startIdx = TWELVE_JI.indexOf(group.gyeopsalStart);
  const map: { [ji: string]: string } = {};
  for (let i = 0; i < 12; i++) {
    map[TWELVE_JI[(startIdx + i) % 12]] = TWELVE_SINSAL_ORDER[i];
  }
  return map;
};

export class SinsalCalculator {
  /**
   * 화개살 계산 (12신살 - 년지 기준 삼합 그룹의 마지막 지지)
   * @param yearGanji 년간지
   * @param targetGanji 대상 간지
   * @return 화개살 여부
   */
  calculateHwagaeSal(yearGanji: string, targetGanji: string): string | null {
    const map = getYearBasedTwelveSinsalMap(yearGanji[1]);
    return map[targetGanji[1]] === '화개살' ? '화개살' : null;
  }

  /**
   * 장성살 계산 (12신살 - 년지 기준 삼합 그룹의 가운데 지지)
   * @param yearGanji 년간지
   * @param targetGanji 대상 간지
   * @return 장성살 여부
   */
  calculateJangseongSal(yearGanji: string, targetGanji: string): string | null {
    const map = getYearBasedTwelveSinsalMap(yearGanji[1]);
    return map[targetGanji[1]] === '장성살' ? '장성살' : null;
  }

  /**
   * 백호살 계산 - 甲辰·乙未·丙戌·丁丑·戊辰·壬戌·癸丑, 이 7개 간지 중 하나와
   * 대상 주(柱)의 간지가 정확히 일치하면 백호살이다 (일간과는 무관).
   * @param targetGanji 대상 간지
   * @return 백호살 여부
   */
  calculateBaekhoSal(targetGanji: string): string | null {
    const BAEKHO_PILLARS = ['甲辰', '乙未', '丙戌', '丁丑', '戊辰', '壬戌', '癸丑'];
    return BAEKHO_PILLARS.includes(targetGanji) ? '백호살' : null;
  }

  /**
   * 양인살 계산 (일간 기준 - 겁재에 해당하는 단일 지지)
   * @param dayGanji 일간지
   * @param targetGanji 대상 간지
   * @return 양인살 여부
   */
  calculateYanginSal(dayGanji: string, targetGanji: string): string | null {
    const dayGan = dayGanji[0];
    const targetJi = targetGanji[1];

    const yanginMap: { [key: string]: string } = {
      '甲': '卯', '乙': '辰', '丙': '午', '丁': '未', '戊': '午',
      '己': '未', '庚': '酉', '辛': '戌', '壬': '子', '癸': '丑'
    };

    return yanginMap[dayGan] === targetJi ? '양인살' : null;
  }

  /**
   * 복성귀인 계산 (일간 기준)
   * @param dayGanji 일간지
   * @param targetGanji 대상 간지
   * @return 복성귀인 여부
   */
  calculateBokseongGuin(dayGanji: string, targetGanji: string): string | null {
    const dayGan = dayGanji[0];
    const targetJi = targetGanji[1];

    const bokseongMap: { [key: string]: string[] } = {
      '甲': ['子', '午'], '乙': ['丑', '未'], '丙': ['寅', '申'], '丁': ['卯', '酉'],
      '戊': ['辰', '戌'], '己': ['巳', '亥'], '庚': ['午', '子'], '辛': ['未', '丑'],
      '壬': ['申', '寅'], '癸': ['酉', '卯']
    };

    const bokseongJis = bokseongMap[dayGan];
    if (bokseongJis && bokseongJis.includes(targetJi)) {
      return '복성귀인';
    }
    return null;
  }

  /**
   * 천주귀인 계산 (일간 기준 - 식신의 건록 위치인 단일 지지)
   * @param dayGanji 일간지
   * @param targetGanji 대상 간지
   * @return 천주귀인 여부
   */
  calculateCheonjuGuin(dayGanji: string, targetGanji: string): string | null {
    const dayGan = dayGanji[0];
    const targetJi = targetGanji[1];

    const cheonjuMap: { [key: string]: string } = {
      '甲': '巳', '乙': '午', '丙': '巳', '丁': '午', '戊': '申',
      '己': '酉', '庚': '亥', '辛': '子', '壬': '寅', '癸': '卯'
    };

    return cheonjuMap[dayGan] === targetJi ? '천주귀인' : null;
  }

  /**
   * 전통 신살 종합 분석
   * @param yearGanji 년간지
   * @param dayGanji 일간지
   * @param targetGanji 대상 간지
   * @return 모든 전통 신살
   */
  analyzeTraditionalSinsal(yearGanji: string, dayGanji: string, targetGanji: string): string[] {
    const sinsalList: string[] = [];

    const hwagae = this.calculateHwagaeSal(yearGanji, targetGanji);
    if (hwagae) sinsalList.push(hwagae);

    const jangseong = this.calculateJangseongSal(yearGanji, targetGanji);
    if (jangseong) sinsalList.push(jangseong);

    const baekho = this.calculateBaekhoSal(targetGanji);
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
      const pillarSinsal = this.analyzeTraditionalSinsal(yearGanji, dayGanji, pillar);
      sinsal[pillarNames[index]] = pillarSinsal;
    });

    return sinsal;
  }
}