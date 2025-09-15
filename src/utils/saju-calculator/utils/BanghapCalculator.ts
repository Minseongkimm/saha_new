/**
 * 방합(方合) 계산 클래스
 * 사주에서 방합 관계를 계산하는 로직
 */

export interface BanghapInfo {
  type: string;           // 방합 타입
  description: string;    // 설명
  strength: number;       // 강도 (1-5)
  effects: string[];      // 효과들
}

export class BanghapCalculator {
  /**
   * 방합 관계 계산
   * @param ganji1 첫 번째 간지
   * @param ganji2 두 번째 간지
   * @return 방합 정보
   */
  calculateBanghap(ganji1: string, ganji2: string): BanghapInfo | null {
    const ji1 = ganji1[1];
    const ji2 = ganji2[1];
    
    // 삼합 (三合)
    const samhap = this.calculateSamhap(ji1, ji2);
    if (samhap) return samhap;
    
    // 육합 (六合)
    const yukhap = this.calculateYukhap(ji1, ji2);
    if (yukhap) return yukhap;
    
    // 방합 (方合) - 동일한 방향의 지지들
    const banghap = this.calculateBanghapDirection(ji1, ji2);
    if (banghap) return banghap;
    
    return null;
  }

  /**
   * 삼합 계산
   * @param ji1 첫 번째 지지
   * @param ji2 두 번째 지지
   * @return 삼합 정보
   */
  private calculateSamhap(ji1: string, ji2: string): BanghapInfo | null {
    const samhapGroups = [
      { group: ['申', '子', '辰'], name: '수국', element: '수' },
      { group: ['亥', '卯', '未'], name: '목국', element: '목' },
      { group: ['寅', '午', '戌'], name: '화국', element: '화' },
      { group: ['巳', '酉', '丑'], name: '금국', element: '금' }
    ];

    for (const samhap of samhapGroups) {
      if (samhap.group.includes(ji1) && samhap.group.includes(ji2) && ji1 !== ji2) {
        return {
          type: `삼합(${samhap.name})`,
          description: `${ji1}과 ${ji2}는 ${samhap.name} 삼합 관계입니다.`,
          strength: 4,
          effects: [
            `${samhap.element} 기운이 강화됩니다`,
            '협력과 조화가 좋습니다',
            '서로 보완하는 관계입니다'
          ]
        };
      }
    }
    return null;
  }

  /**
   * 육합 계산
   * @param ji1 첫 번째 지지
   * @param ji2 두 번째 지지
   * @return 육합 정보
   */
  private calculateYukhap(ji1: string, ji2: string): BanghapInfo | null {
    const yukhapPairs: { [key: string]: string } = {
      '子': '丑', '丑': '子',
      '寅': '亥', '亥': '寅',
      '卯': '戌', '戌': '卯',
      '辰': '酉', '酉': '辰',
      '巳': '申', '申': '巳',
      '午': '未', '未': '午'
    };

    if (yukhapPairs[ji1] === ji2) {
      return {
        type: '육합',
        description: `${ji1}과 ${ji2}는 육합 관계입니다.`,
        strength: 3,
        effects: [
          '서로 조화를 이룹니다',
          '협력 관계가 좋습니다',
          '상호 보완적입니다'
        ]
      };
    }
    return null;
  }

  /**
   * 방합 계산 (동일 방향)
   * @param ji1 첫 번째 지지
   * @param ji2 두 번째 지지
   * @return 방합 정보
   */
  private calculateBanghapDirection(ji1: string, ji2: string): BanghapInfo | null {
    // 정확한 방합 관계 정의
    const banghapPairs: { [key: string]: string[] } = {
      '寅': ['辰'],  // 인방합진
      '辰': ['寅'],  // 진방합인
      '巳': ['未'],  // 사방합미
      '未': ['巳'],  // 미방합사
      '申': ['戌'],  // 신방합술
      '戌': ['申'],  // 술방합신
      '亥': ['丑'],  // 해방합축
      '丑': ['亥'],  // 축방합해
      '子': ['午'],  // 자방합오
      '午': ['子'],  // 오방합자
      '卯': ['酉'],  // 묘방합유
      '酉': ['卯']   // 유방합묘
    };

    if (banghapPairs[ji1] && banghapPairs[ji1].includes(ji2)) {
      return {
        type: '방합',
        description: `${ji1}과 ${ji2}는 방합 관계입니다.`,
        strength: 3,
        effects: [
          '서로 조화를 이루는 방합 관계입니다',
          '협력과 조화가 좋습니다',
          '상호 보완적입니다',
          '방향성이 일치합니다'
        ]
      };
    }
    return null;
  }

  /**
   * 전체 사주의 방합 관계 분석
   * @param pillars 사주 (년월일시)
   * @return 모든 방합 관계
   */
  analyzeAllBanghap(pillars: string[]): BanghapInfo[] {
    const banghapList: BanghapInfo[] = [];
    
    for (let i = 0; i < pillars.length; i++) {
      for (let j = i + 1; j < pillars.length; j++) {
        const banghap = this.calculateBanghap(pillars[i], pillars[j]);
        if (banghap) {
          banghapList.push(banghap);
        }
      }
    }
    
    return banghapList;
  }

  /**
   * 방합 강도 분석
   * @param pillars 사주
   * @return 방합 강도 정보
   */
  analyzeBanghapStrength(pillars: string[]): { [key: string]: any } {
    const banghapList = this.analyzeAllBanghap(pillars);
    const totalStrength = banghapList.reduce((sum, banghap) => sum + banghap.strength, 0);
    
    let strengthLevel = '약함';
    if (totalStrength >= 12) strengthLevel = '매우 강함';
    else if (totalStrength >= 8) strengthLevel = '강함';
    else if (totalStrength >= 4) strengthLevel = '보통';
    
    return {
      totalBanghap: banghapList.length,
      totalStrength,
      strengthLevel,
      banghapList,
      description: `방합 관계가 ${banghapList.length}개 있으며, 전체 강도는 ${strengthLevel}입니다.`
    };
  }
}
