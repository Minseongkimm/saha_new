/**
 * 공망 계산 클래스 (TypeScript 버전)
 * 비결만세력 프로젝트에서 추출한 공망 계산 로직
 */

import { GongmangDetail } from '../types';

export class GongmangCalculator {
  /**
   * 십이지지 공망 계산
   * @param ganji 일간지 (예: "甲子")
   * @return 공망 지지 (예: "戌亥")
   */
  calcGongmang(ganji: string): string {
    const gongmangMap: { [key: string]: string } = {
      "甲子": "戌亥", "乙丑": "戌亥", "丙寅": "戌亥", "丁卯": "戌亥", "戊辰": "戌亥", 
      "己巳": "戌亥", "庚午": "戌亥", "辛未": "戌亥", "壬申": "戌亥", "癸酉": "戌亥",
      
      "甲戌": "申酉", "乙亥": "申酉", "丙子": "申酉", "丁丑": "申酉", "戊寅": "申酉",
      "己卯": "申酉", "庚辰": "申酉", "辛巳": "申酉", "壬午": "申酉", "癸未": "申酉",
      
      "甲申": "午未", "乙酉": "午未", "丙戌": "午未", "丁亥": "午未", "戊子": "午未",
      "己丑": "午未", "庚寅": "午未", "辛卯": "午未", "壬辰": "午未", "癸巳": "午未",
      
      "甲午": "辰巳", "乙未": "辰巳", "丙申": "辰巳", "丁酉": "辰巳", "戊戌": "辰巳",
      "己亥": "辰巳", "庚子": "辰巳", "辛丑": "辰巳", "壬寅": "辰巳", "癸卯": "辰巳",
      
      "甲辰": "寅卯", "乙巳": "寅卯", "丙午": "寅卯", "丁未": "寅卯", "戊申": "寅卯",
      "己酉": "寅卯", "庚戌": "寅卯", "辛亥": "寅卯", "壬子": "寅卯", "癸丑": "寅卯",
      
      "甲寅": "子丑", "乙卯": "子丑", "丙辰": "子丑", "丁巳": "子丑", "戊午": "子丑",
      "己未": "子丑", "庚申": "子丑", "辛酉": "子丑", "壬戌": "子丑", "癸亥": "子丑"
    };

    return gongmangMap[ganji] || "";
  }

  /**
   * 공망 여부 확인
   * @param ganji 확인할 간지
   * @param gongmang 공망 지지
   * @return 공망 여부
   */
  isGongmang(ganji: string, gongmang: string): boolean {
    const ganjiJi = ganji[1];
    return gongmang.includes(ganjiJi);
  }

  /**
   * 공망 상세 정보
   * @param ganji 일간지
   * @return 공망 상세 정보
   */
  getGongmangDetail(ganji: string): GongmangDetail {
    const gongmang = this.calcGongmang(ganji);
    return {
      ganji,
      gongmang,
      description: "공망은 해당 지지가 비어있다는 의미로, 그 지지의 기운이 약해집니다.",
      affected_jiji: gongmang.split('')
    };
  }

  /**
   * 모든 공망 정보 반환
   * @return 전체 공망 맵
   */
  getAllGongmang(): { [key: string]: string } {
    const allGongmang: { [key: string]: string } = {};
    
    const ganList = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const jiList = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    
    ganList.forEach(gan => {
      jiList.forEach(ji => {
        const ganji = gan + ji;
        allGongmang[ganji] = this.calcGongmang(ganji);
      });
    });
    
    return allGongmang;
  }

  /**
   * 공망 강도 분석
   * @param ganji 일간지
   * @param pillars 전체 사주 (년월일시)
   * @return 공망 강도 정보
   */
  analyzeGongmangStrength(ganji: string, pillars: string[]): { [key: string]: any } {
    const gongmang = this.calcGongmang(ganji);
    const affectedPillars: string[] = [];
    
    pillars.forEach((pillar, index) => {
      if (this.isGongmang(pillar, gongmang)) {
        affectedPillars.push(pillar);
      }
    });

    const strength = affectedPillars.length;
    let strengthLevel = '약함';
    
    if (strength >= 3) strengthLevel = '매우 강함';
    else if (strength >= 2) strengthLevel = '강함';
    else if (strength >= 1) strengthLevel = '보통';

    return {
      gongmang,
      affectedPillars,
      strength,
      strengthLevel,
      description: `공망이 ${strength}개 주에 영향을 미칩니다.`
    };
  }
}
