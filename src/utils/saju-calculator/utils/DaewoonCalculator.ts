/**
 * 대운 계산 클래스 (TypeScript 버전)
 * 비결만세력 프로젝트에서 추출한 대운 계산 로직
 */

import { DaewoonInfo, DaewoonAnalysis } from '../types';
import { getDaysToAdjacentSolarTerm } from '../../saju/solar_terms';

export class DaewoonCalculator {
  private tenArray = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  private twelveArray = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

  /**
   * 대운 계산
   * @param yearPillar 년주 (예: "甲子")
   * @param monthPillar 월주 (예: "丙寅")
   * @param birthYear 출생년도
   * @param gender 성별 (0: 남자, 1: 여자)
   * @param firstAge 첫 대운 나이
   * @return 대운 리스트
   */
  calculateDaewoon(
    yearPillar: string,
    monthPillar: string,
    birthYear: number,
    gender: number,
    firstAge: number = 9
  ): DaewoonInfo[] {
    let topPtr = this.tenArray.indexOf(monthPillar[0]);
    let bottomPtr = this.twelveArray.indexOf(monthPillar[1]);

    // 남자 순행, 여자 역행, 양 순행, 음 역행
    let direction = gender === 0 ? 1 : -1;
    direction *= this.getSign(yearPillar[0]);

    const daewoonList: DaewoonInfo[] = [];

    for (let index = 0; index < 12; index++) {
      const age = index * 10 + firstAge;
      const year = birthYear + age - 1;

      if (direction === 1) {
        topPtr++;
        bottomPtr++;

        if (topPtr >= 10) topPtr = 0;
        if (bottomPtr >= 12) bottomPtr = 0;
      } else {
        topPtr--;
        bottomPtr--;

        if (topPtr < 0) topPtr = 9;
        if (bottomPtr < 0) bottomPtr = 11;
      }

      const ganji = this.tenArray[topPtr] + this.twelveArray[bottomPtr];
      daewoonList.push({
        age,
        year,
        ganji,
        gan: this.tenArray[topPtr],
        ji: this.twelveArray[bottomPtr]
      });
    }

    return daewoonList;
  }

  /**
   * 첫 대운 나이 계산
   * 전통 명리학 규칙(삼명통회): 생일로부터 순행 시 다음 절, 역행 시 이전 절까지의
   * 일수를 3일=1년 기준으로 환산한다. 이때 나머지를 그냥 반올림하는 것이 아니라
   * "나머지가 8개월 이상이면 올림, 8개월 미만이면 버림"이라는 비대칭 규칙을 쓴다.
   * (예: 4년6월1일→4년(올림 안 함), 1년10월7일→2년(10개월≥8개월이므로 올림))
   * 0세도 유효한 값이다 (절기 당일 출생 등 나머지가 8개월 미만이면 정수 부분 그대로).
   * @param birthDate 출생 일시
   * @param direction 대운 방향 (1: 순행, -1: 역행)
   * @return 첫 대운 나이
   */
  calculateFirstAge(birthDate: Date, direction: 1 | -1): number {
    const days = getDaysToAdjacentSolarTerm(birthDate, direction);
    const years = days / 3;
    const wholeYears = Math.floor(years);
    const remainderMonths = (years - wholeYears) * 12;
    return remainderMonths >= 8 ? wholeYears + 1 : wholeYears;
  }

  /**
   * 양음 판별
   * @param gan 천간
   * @return 1: 양, -1: 음
   */
  private getSign(gan: string): number {
    return ['甲', '丙', '戊', '庚', '壬'].includes(gan) ? 1 : -1;
  }

  /**
   * 현재 대운 찾기
   * @param daewoonList 대운 리스트
   * @param currentAge 현재 나이
   * @return 현재 대운 정보
   */
  getCurrentDaewoon(daewoonList: DaewoonInfo[], currentAge: number): DaewoonInfo | null {
    return daewoonList.find(daewoon => 
      daewoon.age <= currentAge && currentAge < daewoon.age + 10
    ) || null;
  }

  /**
   * 대운 상세 분석
   * @param daewoonInfo 대운 정보
   * @param originalPillars 원국 사주 (년월일시)
   * @return 대운 분석 결과
   */
  analyzeDaewoon(daewoonInfo: DaewoonInfo, originalPillars: string[]): DaewoonAnalysis {
    return {
      age: daewoonInfo.age,
      year: daewoonInfo.year,
      ganji: daewoonInfo.ganji,
      gan: daewoonInfo.gan,
      ji: daewoonInfo.ji,
      description: `대운 ${daewoonInfo.age}세~${daewoonInfo.age + 9}세`,
      analysis: "대운 분석 결과..."
    };
  }

  /**
   * 대운 방향 계산
   * @param yearPillar 년주
   * @param gender 성별
   * @return 대운 방향 (1: 순행, -1: 역행)
   */
  getDaewoonDirection(yearPillar: string, gender: number): number {
    let direction = gender === 0 ? 1 : -1;
    direction *= this.getSign(yearPillar[0]);
    return direction;
  }

  /**
   * 특정 나이의 대운 찾기
   * @param daewoonList 대운 리스트
   * @param targetAge 찾을 나이
   * @return 해당 나이의 대운 정보
   */
  getDaewoonByAge(daewoonList: DaewoonInfo[], targetAge: number): DaewoonInfo | null {
    return daewoonList.find(daewoon => 
      targetAge >= daewoon.age && targetAge < daewoon.age + 10
    ) || null;
  }

  /**
   * 대운 흐름 분석
   * @param daewoonList 대운 리스트
   * @return 대운 흐름 정보
   */
  analyzeDaewoonFlow(daewoonList: DaewoonInfo[]): { [key: string]: any } {
    const flow = daewoonList.map((daewoon, index) => ({
      period: `${daewoon.age}세~${daewoon.age + 9}세`,
      ganji: daewoon.ganji,
      year: daewoon.year,
      index: index + 1
    }));

    return {
      flow,
      totalPeriods: daewoonList.length,
      description: "대운의 흐름을 분석한 결과입니다."
    };
  }

  /**
   * 정확한 대운 계산 (절기 기준 대운수부터 시작)
   * @param yearPillar 년주
   * @param monthPillar 월주
   * @param birthYear 출생년도
   * @param gender 성별
   * @param birthDate 출생 일시 (대운수 계산에 사용)
   * @return 대운 리스트
   */
  calculateAccurateDaewoon(
    yearPillar: string,
    monthPillar: string,
    birthYear: number,
    gender: number,
    birthDate: Date
  ): DaewoonInfo[] {
    const direction = this.getDaewoonDirection(yearPillar, gender);
    const firstAge = this.calculateFirstAge(birthDate, direction as 1 | -1);
    return this.calculateDaewoon(yearPillar, monthPillar, birthYear, gender, firstAge);
  }
}
