/**
 * 방합(方合) 및 지지 관계 계산 클래스
 * 사주(또는 두 사람의 지지 묶음)에서 삼합/반합/방합/육합/삼형/육충 관계를 계산하는 로직
 */

import { SAMHAP_GROUPS, BANGHAP_GROUPS, isYukhap, isChung } from '../constants/branch_relations';

export interface BanghapInfo {
  type: string;           // 방합 타입
  description: string;    // 설명
  strength: number;       // 강도 (1-5, 육충/삼형은 음수)
  effects: string[];      // 효과들
}

export interface BanghapAnalysis {
  totalBanghap: number;
  totalStrength: number;
  strengthLevel: string;
  banghapList: BanghapInfo[];
  samhap: string[];
  banhap: string[];
  banghap: string[];
  yukhap: string[];
  samhyeong: string[];
  yukchung: string[];
  description: string;
}

export class BanghapCalculator {
  /**
   * 두 지지 간의 관계 계산 (셋이 모두 있어야 성립하는 삼합/방합은 여기서는 2개만 겹쳐도 반합으로 판정)
   * @param ganji1 첫 번째 간지
   * @param ganji2 두 번째 간지
   * @return 관계 정보
   */
  calculateBanghap(ganji1: string, ganji2: string): BanghapInfo | null {
    const ji1 = ganji1[1];
    const ji2 = ganji2[1];
    if (ji1 === ji2) return null;

    // 육합 (六合)
    if (isYukhap(ji1, ji2)) {
      return {
        type: '육합',
        description: `${ji1}과 ${ji2}는 육합 관계입니다.`,
        strength: 3,
        effects: ['서로 조화를 이룹니다', '협력 관계가 좋습니다', '상호 보완적입니다']
      };
    }

    // 삼합 그룹에 두 지지가 모두 속하면 반합(半合)
    for (const samhap of SAMHAP_GROUPS) {
      if (samhap.group.includes(ji1 as any) && samhap.group.includes(ji2 as any)) {
        return {
          type: `반합(${samhap.name})`,
          description: `${ji1}과 ${ji2}는 ${samhap.name} 반합 관계입니다.`,
          strength: 2,
          effects: [`${samhap.name} 기운이 일부 형성됩니다`, '협력과 조화가 좋습니다']
        };
      }
    }

    // 방합 그룹(계절 방위)에 두 지지가 모두 속하면 방합
    for (const banghap of BANGHAP_GROUPS) {
      if (banghap.group.includes(ji1 as any) && banghap.group.includes(ji2 as any)) {
        return {
          type: `방합(${banghap.name})`,
          description: `${ji1}과 ${ji2}는 ${banghap.name} 방합 관계입니다.`,
          strength: 3,
          effects: ['서로 조화를 이루는 방합 관계입니다', '방향성이 일치합니다']
        };
      }
    }

    // 육충 (六沖)
    if (isChung(ji1, ji2)) {
      return {
        type: '육충',
        description: `${ji1}과 ${ji2}는 육충(충돌) 관계입니다.`,
        strength: -3,
        effects: ['서로 부딪히는 기운이 있습니다', '변동성과 긴장이 생길 수 있습니다']
      };
    }

    return null;
  }

  /**
   * 전체 지지 묶음의 삼합/반합/방합/육합/삼형/육충 관계 분석
   * (사주 4개 지지, 또는 궁합 비교를 위한 두 사람의 지지 8개 등 임의 길이 배열 지원)
   * @param pillars 간지 배열 (년월일시 등)
   * @return 관계 분석 결과
   */
  analyzeBanghapStrength(pillars: string[]): BanghapAnalysis {
    const jijiList = pillars.map(pillar => pillar[pillar.length - 1]);
    const count = (ji: string) => jijiList.filter(j => j === ji).length;
    const hasAll = (group: readonly string[]) => group.every(ji => jijiList.includes(ji));
    const present = (group: readonly string[]) => group.filter(ji => jijiList.includes(ji));

    const samhap: string[] = [];
    const banhap: string[] = [];
    const banghap: string[] = [];
    const yukhap: string[] = [];
    const samhyeong: string[] = [];
    const yukchung: string[] = [];
    const banghapList: BanghapInfo[] = [];

    SAMHAP_GROUPS.forEach(({ group, name }) => {
      if (hasAll(group)) {
        samhap.push(`${group.join('')}(${name})`);
        banghapList.push({ type: `삼합(${name})`, description: `${group.join('')} 삼합`, strength: 4, effects: [`${name} 기운이 강화됩니다`] });
      } else {
        const partial = present(group);
        if (partial.length >= 2) {
          banhap.push(`${partial.join('')}(${name} 반합)`);
          banghapList.push({ type: `반합(${name})`, description: `${partial.join('')} 반합`, strength: 2, effects: [`${name} 기운이 일부 형성됩니다`] });
        }
      }
    });

    BANGHAP_GROUPS.forEach(({ group, name }) => {
      if (hasAll(group)) {
        banghap.push(`${group.join('')}(${name})`);
        banghapList.push({ type: `방합(${name})`, description: `${group.join('')} 방합`, strength: 3, effects: ['방향성이 일치합니다'] });
      }
    });

    const yukhapPairs: Array<[string, string]> = [
      ['子', '丑'], ['寅', '亥'], ['卯', '戌'], ['辰', '酉'], ['巳', '申'], ['午', '未']
    ];
    yukhapPairs.forEach(([a, b]) => {
      if (hasAll([a, b])) {
        yukhap.push(`${a}, ${b}`);
        banghapList.push({ type: '육합', description: `${a}과 ${b} 육합`, strength: 3, effects: ['서로 조화를 이룹니다'] });
      }
    });

    const yukchungPairs: Array<[string, string]> = [
      ['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥']
    ];
    yukchungPairs.forEach(([a, b]) => {
      if (hasAll([a, b])) {
        yukchung.push(`${a}, ${b}`);
        banghapList.push({ type: '육충', description: `${a}과 ${b} 육충`, strength: -3, effects: ['부딪히는 기운이 있습니다'] });
      }
    });

    if (hasAll(['寅', '巳', '申'])) {
      samhyeong.push('寅巳申(무은지형)');
      banghapList.push({ type: '삼형', description: '寅巳申 무은지형', strength: -2, effects: ['긴장과 압박이 생길 수 있습니다'] });
    }
    if (hasAll(['丑', '戌', '未'])) {
      samhyeong.push('丑戌未(지세지형)');
      banghapList.push({ type: '삼형', description: '丑戌未 지세지형', strength: -2, effects: ['긴장과 압박이 생길 수 있습니다'] });
    }
    if (hasAll(['子', '卯'])) {
      samhyeong.push('子卯(무례지형)');
      banghapList.push({ type: '삼형', description: '子卯 무례지형', strength: -2, effects: ['긴장과 압박이 생길 수 있습니다'] });
    }
    ['辰', '午', '酉', '亥'].forEach(ji => {
      if (count(ji) >= 2) {
        samhyeong.push(`${ji}${ji}(자형)`);
        banghapList.push({ type: '삼형', description: `${ji}${ji} 자형`, strength: -2, effects: ['긴장과 압박이 생길 수 있습니다'] });
      }
    });

    const totalStrength = banghapList.reduce((sum, b) => sum + b.strength, 0);
    let strengthLevel = '약함';
    if (totalStrength >= 12) strengthLevel = '매우 강함';
    else if (totalStrength >= 8) strengthLevel = '강함';
    else if (totalStrength >= 4) strengthLevel = '보통';

    return {
      totalBanghap: banghapList.length,
      totalStrength,
      strengthLevel,
      banghapList,
      samhap,
      banhap,
      banghap,
      yukhap,
      samhyeong,
      yukchung,
      description: `지지 관계가 ${banghapList.length}개 있으며, 전체 강도는 ${strengthLevel}입니다.`
    };
  }

  /**
   * 전체 사주의 방합 관계 분석 (하위 호환용 alias)
   * @param pillars 사주 (년월일시)
   * @return 모든 관계 리스트
   */
  analyzeAllBanghap(pillars: string[]): BanghapInfo[] {
    return this.analyzeBanghapStrength(pillars).banghapList;
  }
}
