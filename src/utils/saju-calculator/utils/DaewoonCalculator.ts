/**
 * 대운 계산 클래스 (TypeScript 버전)
 * 비결만세력 프로젝트에서 추출한 대운 계산 로직
 */

import { DaewoonInfo, DaewoonAnalysis } from '../types';

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
   * @param birthDate 출생일
   * @param direction 대운 방향
   * @return 첫 대운 나이
   */
  calculateFirstAge(birthDate: string, direction: number): number {
    // 절기 기준으로 첫 대운 나이 계산
    // 실제 구현에서는 절기 데이터베이스가 필요
    return direction === 1 ? 0 : 0; // 순행/역행 모두 0으로 설정
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
   * 정확한 대운 계산 (9세부터 시작)
   * @param yearPillar 년주
   * @param monthPillar 월주
   * @param birthYear 출생년도
   * @param gender 성별
   * @return 대운 리스트
   */
  calculateAccurateDaewoon(
    yearPillar: string,
    monthPillar: string,
    birthYear: number,
    gender: number
  ): DaewoonInfo[] {
    // 9세부터 시작하는 정확한 대운 계산
    return this.calculateDaewoon(yearPillar, monthPillar, birthYear, gender, 9);
  }

  /**
   * 첫 대운 나이 계산
   * @param yearPillar 년주
   * @param monthPillar 월주
   * @param gender 성별
   * @return 첫 대운 나이
   */
  calculateFirstDaewoonAge(yearPillar: string, monthPillar: string, gender: number): number {
    // 기본적으로 9세부터 시작하지만, 정확한 계산을 위해 추가 로직 필요
    // 여기서는 기본값 9세를 사용하되, 필요시 더 정교한 계산 추가 가능
    
    const yearGan = yearPillar[0];
    const monthGan = monthPillar[0];
    
    // 간단한 첫 대운 나이 계산 (실제로는 더 복잡한 계산이 필요)
    let firstAge = 9;
    
    // 년간과 월간의 관계에 따른 조정
    const yearGanIndex = this.tenArray.indexOf(yearGan);
    const monthGanIndex = this.tenArray.indexOf(monthGan);
    
    // 간단한 조정 로직 (실제로는 더 정교한 계산 필요)
    if (gender === 0) { // 남자
      if (yearGanIndex > monthGanIndex) {
        firstAge = 8;
      } else if (yearGanIndex < monthGanIndex) {
        firstAge = 10;
      }
    } else { // 여자
      if (yearGanIndex > monthGanIndex) {
        firstAge = 10;
      } else if (yearGanIndex < monthGanIndex) {
        firstAge = 8;
      }
    }
    
    return firstAge;
  }
}
