/**
 * 귀인(貴人) 계산 클래스
 * 사주에서 귀인을 계산하는 로직
 */

export interface GuinInfo {
  type: string;           // 귀인 타입
  description: string;    // 설명
  strength: number;       // 강도 (1-5)
  effects: string[];      // 효과들
  position: string;       // 위치 (년/월/일/시)
}

export class GuinCalculator {
  /**
   * 천을귀인 계산
   * @param dayGan 일간
   * @param targetGanji 대상 간지
   * @return 천을귀인 정보
   */
  calculateCheonEulGuin(dayGan: string, targetGanji: string): GuinInfo | null {
    const cheonEulMap: { [key: string]: string[] } = {
      '甲': ['丑', '未'],  // 갑일간은 축미가 천을귀인
      '乙': ['子', '申'],  // 을일간은 자신이 천을귀인
      '丙': ['亥', '酉'],  // 병일간은 해유가 천을귀인
      '丁': ['亥', '酉'],  // 정일간은 해유가 천을귀인
      '戊': ['丑', '未'],  // 무일간은 축미가 천을귀인
      '己': ['子', '申'],  // 기일간은 자신이 천을귀인
      '庚': ['丑', '未'],  // 경일간은 축미가 천을귀인
      '辛': ['午', '寅'],  // 신일간은 오인이 천을귀인
      '壬': ['卯', '巳'],  // 임일간은 묘사가 천을귀인
      '癸': ['卯', '巳']   // 계일간은 묘사가 천을귀인
    };

    const targetJi = targetGanji[1];
    const guinJis = cheonEulMap[dayGan];
    
    if (guinJis && guinJis.includes(targetJi)) {
      return {
        type: '천을귀인',
        description: `${dayGan}일간의 천을귀인은 ${guinJis.join(', ')}입니다.`,
        strength: 5,
        effects: [
          '가장 강력한 귀인입니다',
          '도움을 주는 사람이 나타납니다',
          '어려운 상황에서 구원받습니다',
          '명예와 지위가 상승합니다'
        ],
        position: '일간 기준'
      };
    }
    return null;
  }

  /**
   * 월령 계산
   * @param monthGanji 월간지
   * @param targetGanji 대상 간지
   * @return 월령 정보
   */
  calculateWolRyeong(monthGanji: string, targetGanji: string): GuinInfo | null {
    const monthJi = monthGanji[1];
    const targetGan = targetGanji[0];
    
    // 월령 계산 (월지의 오행과 같은 오행의 간)
    const wolRyeongMap: { [key: string]: string[] } = {
      '寅': ['甲'],  // 인월은 갑이 월령
      '卯': ['乙'],  // 묘월은 을이 월령
      '辰': ['戊'],  // 진월은 무가 월령
      '巳': ['丙'],  // 사월은 병이 월령
      '午': ['丁'],  // 오월은 정이 월령
      '未': ['己'],  // 미월은 기가 월령
      '申': ['庚'],  // 신월은 경이 월령
      '酉': ['辛'],  // 유월은 신이 월령
      '戌': ['戊'],  // 술월은 무가 월령
      '亥': ['壬'],  // 해월은 임이 월령
      '子': ['癸'],  // 자월은 계가 월령
      '丑': ['己']   // 축월은 기가 월령
    };

    const wolRyeongGans = wolRyeongMap[monthJi];
    
    if (wolRyeongGans && wolRyeongGans.includes(targetGan)) {
      return {
        type: '월령',
        description: `${monthJi}월의 월령은 ${wolRyeongGans.join(', ')}입니다.`,
        strength: 4,
        effects: [
          '월의 기운을 대표하는 월령입니다',
          '해당 월의 주도권을 가집니다',
          '월간의 기운이 강화됩니다',
          '계절의 특성을 잘 나타냅니다'
        ],
        position: '월간 기준'
      };
    }
    return null;
  }

  /**
   * 천덕귀인 계산
   * @param dayGan 일간
   * @param targetGanji 대상 간지
   * @return 천덕귀인 정보
   */
  calculateCheonDeokGuin(dayGan: string, targetGanji: string): GuinInfo | null {
    const cheonDeokMap: { [key: string]: string[] } = {
      '甲': ['丁'],  // 갑일간은 정이 천덕귀인
      '乙': ['申'],  // 을일간은 신이 천덕귀인
      '丙': ['辛'],  // 병일간은 신이 천덕귀인
      '丁': ['壬'],  // 정일간은 임이 천덕귀인
      '戊': ['辛'],  // 무일간은 신이 천덕귀인
      '己': ['甲'],  // 기일간은 갑이 천덕귀인
      '庚': ['乙'],  // 경일간은 을이 천덕귀인
      '辛': ['丙'],  // 신일간은 병이 천덕귀인
      '壬': ['丁'],  // 임일간은 정이 천덕귀인
      '癸': ['戊']   // 계일간은 무가 천덕귀인
    };

    const targetGan = targetGanji[0];
    const guinGans = cheonDeokMap[dayGan];
    
    if (guinGans && guinGans.includes(targetGan)) {
      return {
        type: '천덕귀인',
        description: `${dayGan}일간의 천덕귀인은 ${guinGans.join(', ')}입니다.`,
        strength: 4,
        effects: [
          '하늘의 덕을 받는 귀인입니다',
          '자연스럽게 도움을 받습니다',
          '복록이 늘어납니다',
          '인덕이 쌓입니다'
        ],
        position: '일간 기준'
      };
    }
    return null;
  }

  /**
   * 월덕귀인 계산 (이미 구현됨)
   * @param monthGanji 월간지
   * @param targetGanji 대상 간지
   * @return 월덕귀인 정보
   */
  calculateWolDeokGuin(monthGanji: string, targetGanji: string): GuinInfo | null {
    const wolDeokMap: { [key: string]: string[] } = {
      '子': ['壬'],  // 자월은 임이 월덕귀인
      '丑': ['庚'],  // 축월은 경이 월덕귀인
      '寅': ['丙'],  // 인월은 병이 월덕귀인
      '卯': ['甲'],  // 묘월은 갑이 월덕귀인
      '辰': ['壬'],  // 진월은 임이 월덕귀인
      '巳': ['庚'],  // 사월은 경이 월덕귀인
      '午': ['丙'],  // 오월은 병이 월덕귀인
      '未': ['甲'],  // 미월은 갑이 월덕귀인
      '申': ['壬'],  // 신월은 임이 월덕귀인
      '酉': ['庚'],  // 유월은 경이 월덕귀인
      '戌': ['丙'],  // 술월은 병이 월덕귀인
      '亥': ['甲']   // 해월은 갑이 월덕귀인
    };

    const monthJi = monthGanji[1];
    const targetGan = targetGanji[0];
    const guinGans = wolDeokMap[monthJi];
    
    if (guinGans && guinGans.includes(targetGan)) {
      return {
        type: '월덕귀인',
        description: `${monthJi}월의 월덕귀인은 ${guinGans.join(', ')}입니다.`,
        strength: 3,
        effects: [
          '월의 덕을 받는 귀인입니다',
          '한 달 동안 도움을 받습니다',
          '월간의 기운이 좋아집니다',
          '계절의 혜택을 받습니다'
        ],
        position: '월간 기준'
      };
    }
    return null;
  }

  /**
   * 복성귀인 계산
   * @param dayGan 일간
   * @param targetGanji 대상 간지
   * @return 복성귀인 정보
   */
  calculateBokSeongGuin(dayGan: string, targetGanji: string): GuinInfo | null {
    const bokSeongMap: { [key: string]: string[] } = {
      '甲': ['子'],  // 갑일간은 자가 복성귀인
      '乙': ['丑'],  // 을일간은 축이 복성귀인
      '丙': ['寅'],  // 병일간은 인이 복성귀인
      '丁': ['卯'],  // 정일간은 묘가 복성귀인
      '戊': ['辰'],  // 무일간은 진이 복성귀인
      '己': ['巳'],  // 기일간은 사가 복성귀인
      '庚': ['午'],  // 경일간은 오가 복성귀인
      '辛': ['未'],  // 신일간은 미가 복성귀인
      '壬': ['申'],  // 임일간은 신이 복성귀인
      '癸': ['酉']   // 계일간은 유가 복성귀인
    };

    const targetJi = targetGanji[1];
    const guinJis = bokSeongMap[dayGan];
    
    if (guinJis && guinJis.includes(targetJi)) {
      return {
        type: '복성귀인',
        description: `${dayGan}일간의 복성귀인은 ${guinJis.join(', ')}입니다.`,
        strength: 2,
        effects: [
          '복을 가져다주는 귀인입니다',
          '행운이 따릅니다',
          '재물운이 좋아집니다',
          '가족 관계가 좋아집니다'
        ],
        position: '일간 기준'
      };
    }
    return null;
  }

  /**
   * 전체 귀인 분석
   * @param sajuInfo 사주 정보
   * @return 모든 귀인 정보
   */
  analyzeAllGuin(sajuInfo: { yearGanji: string; monthGanji: string; dayGanji: string; timeGanji: string }): GuinInfo[] {
    const guinList: GuinInfo[] = [];
    const dayGan = sajuInfo.dayGanji[0];
    const pillars = [sajuInfo.yearGanji, sajuInfo.monthGanji, sajuInfo.dayGanji, sajuInfo.timeGanji];
    const pillarNames = ['년주', '월주', '일주', '시주'];

    pillars.forEach((pillar, index) => {
      // 천을귀인
      const cheonEul = this.calculateCheonEulGuin(dayGan, pillar);
      if (cheonEul) {
        cheonEul.position = pillarNames[index];
        guinList.push(cheonEul);
      }

      // 천덕귀인
      const cheonDeok = this.calculateCheonDeokGuin(dayGan, pillar);
      if (cheonDeok) {
        cheonDeok.position = pillarNames[index];
        guinList.push(cheonDeok);
      }

      // 월덕귀인
      const wolDeok = this.calculateWolDeokGuin(sajuInfo.monthGanji, pillar);
      if (wolDeok) {
        wolDeok.position = pillarNames[index];
        guinList.push(wolDeok);
      }

      // 월령
      const wolRyeong = this.calculateWolRyeong(sajuInfo.monthGanji, pillar);
      if (wolRyeong) {
        wolRyeong.position = pillarNames[index];
        guinList.push(wolRyeong);
      }

      // 복성귀인
      const bokSeong = this.calculateBokSeongGuin(dayGan, pillar);
      if (bokSeong) {
        bokSeong.position = pillarNames[index];
        guinList.push(bokSeong);
      }
    });

    return guinList;
  }

  /**
   * 귀인 강도 분석
   * @param sajuInfo 사주 정보
   * @return 귀인 강도 정보
   */
  analyzeGuinStrength(sajuInfo: { yearGanji: string; monthGanji: string; dayGanji: string; timeGanji: string }): { [key: string]: any } {
    const guinList = this.analyzeAllGuin(sajuInfo);
    const totalStrength = guinList.reduce((sum, guin) => sum + guin.strength, 0);
    
    let strengthLevel = '약함';
    if (totalStrength >= 15) strengthLevel = '매우 강함';
    else if (totalStrength >= 10) strengthLevel = '강함';
    else if (totalStrength >= 5) strengthLevel = '보통';
    
    const guinTypes = guinList.reduce((acc, guin) => {
      acc[guin.type] = (acc[guin.type] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    return {
      totalGuin: guinList.length,
      totalStrength,
      strengthLevel,
      guinTypes,
      guinList,
      description: `귀인이 ${guinList.length}개 있으며, 전체 강도는 ${strengthLevel}입니다.`
    };
  }
}
