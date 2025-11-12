// 천간합(갑기·을경·병신·정임·무계)과 변화 오행 정의
// 출처: 전통 명리학 일반 규범에 따른 5합
export type HeavenlyStem = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸';
export type CombinationElement = '목' | '화' | '토' | '금' | '수';

export interface HeavenlyStemCombinationInfo {
  pair: readonly [HeavenlyStem, HeavenlyStem];
  element: CombinationElement; // 변화 오행
  label: string;               // 관계 라벨
  description: string;         // 간단 설명
}

export const HEAVENLY_STEM_COMBINATIONS: readonly HeavenlyStemCombinationInfo[] = [
  {
    pair: ['甲', '己'],
    element: '토',
    label: '갑기합토',
    description: '안정과 기반을 만드는 합'
  },
  {
    pair: ['乙', '庚'],
    element: '금',
    label: '을경합금',
    description: '규범과 구조를 만드는 합'
  },
  {
    pair: ['丙', '辛'],
    element: '수',
    label: '병신합수',
    description: '감성과 지혜를 만드는 합'
  },
  {
    pair: ['丁', '壬'],
    element: '목',
    label: '정임합목',
    description: '성장과 확장을 만드는 합'
  },
  {
    pair: ['戊', '癸'],
    element: '화',
    label: '무계합화',
    description: '열정과 추진력을 만드는 합'
  }
] as const;

export function checkHeavenlyStemCombination(a: string, b: string): HeavenlyStemCombinationInfo | null {
  const x = a as HeavenlyStem;
  const y = b as HeavenlyStem;
  for (const info of HEAVENLY_STEM_COMBINATIONS) {
    const [p, q] = info.pair;
    if ((x === p && y === q) || (x === q && y === p)) {
      return info;
    }
  }
  return null;
}


