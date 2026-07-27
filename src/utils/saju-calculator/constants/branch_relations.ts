export type EarthlyBranch =
  | '子' | '丑' | '寅' | '卯' | '辰' | '巳'
  | '午' | '未' | '申' | '酉' | '戌' | '亥';

// 충(沖)
export const CHUNG_PAIRS: Readonly<Record<EarthlyBranch, EarthlyBranch>> = {
  '子': '午', '午': '子',
  '丑': '未', '未': '丑',
  '寅': '申', '申': '寅',
  '卯': '酉', '酉': '卯',
  '辰': '戌', '戌': '辰',
  '巳': '亥', '亥': '巳'
} as const;

// 육합(六合)
export const YUKHAP_PAIRS: Readonly<Record<EarthlyBranch, EarthlyBranch>> = {
  '子': '丑', '丑': '子',
  '寅': '亥', '亥': '寅',
  '卯': '戌', '戌': '卯',
  '辰': '酉', '酉': '辰',
  '巳': '申', '申': '巳',
  '午': '未', '未': '午'
} as const;

// 형(刑)
// 무은지형(子刑卯, 卯刑子) + 모욕지형(丑刑戌, 戌刑未, 未刑丑) + 진무지형(寅刑巳, 巳刑申, 申刑寅) + 자형(辰刑辰, 午刑午, 酉刑酉, 亥刑亥)
export const HYEONG_PAIRS: ReadonlyArray<readonly [EarthlyBranch, EarthlyBranch]> = [
  ['子', '卯'], ['卯', '子'],
  ['丑', '戌'], ['戌', '未'], ['未', '丑'],
  ['寅', '巳'], ['巳', '申'], ['申', '寅'],
  ['辰', '辰'], ['午', '午'], ['酉', '酉'], ['亥', '亥']
] as const;

// 파(破)
export const PA_PAIRS: ReadonlyArray<readonly [EarthlyBranch, EarthlyBranch]> = [
  ['子', '酉'], ['酉', '子'],
  ['丑', '辰'], ['辰', '丑'],
  ['寅', '亥'], ['亥', '寅'],
  ['卯', '午'], ['午', '卯'],
  ['申', '巳'], ['巳', '申'],
  ['未', '戌'], ['戌', '未']
] as const;

// 해(害)
export const HAE_PAIRS: ReadonlyArray<readonly [EarthlyBranch, EarthlyBranch]> = [
  ['子', '未'], ['未', '子'],
  ['丑', '午'], ['午', '丑'],
  ['寅', '巳'], ['巳', '寅'],
  ['卯', '辰'], ['辰', '卯'],
  ['申', '亥'], ['亥', '申'],
  ['酉', '戌'], ['戌', '酉']
] as const;

export function isYukhap(a: string, b: string): boolean {
  return (YUKHAP_PAIRS as any)[a] === b;
}

export function isChung(a: string, b: string): boolean {
  return (CHUNG_PAIRS as any)[a] === b;
}

export function isHyeong(a: string, b: string): boolean {
  return HYEONG_PAIRS.some(([x, y]) => x === a && y === b);
}

export function isPa(a: string, b: string): boolean {
  return PA_PAIRS.some(([x, y]) => x === a && y === b);
}

export function isHae(a: string, b: string): boolean {
  return HAE_PAIRS.some(([x, y]) => x === a && y === b);
}

// 삼합(三合) - 4국(局)
export const SAMHAP_GROUPS: ReadonlyArray<{ group: readonly [EarthlyBranch, EarthlyBranch, EarthlyBranch]; name: string }> = [
  { group: ['申', '子', '辰'], name: '수국' },
  { group: ['亥', '卯', '未'], name: '목국' },
  { group: ['寅', '午', '戌'], name: '화국' },
  { group: ['巳', '酉', '丑'], name: '금국' }
] as const;

// 방합(方合) - 계절별 방위국
export const BANGHAP_GROUPS: ReadonlyArray<{ group: readonly [EarthlyBranch, EarthlyBranch, EarthlyBranch]; name: string }> = [
  { group: ['寅', '卯', '辰'], name: '동방목국' },
  { group: ['巳', '午', '未'], name: '남방화국' },
  { group: ['申', '酉', '戌'], name: '서방금국' },
  { group: ['亥', '子', '丑'], name: '북방수국' }
] as const;


