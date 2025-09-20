/**
 * 오행별 색상 상수
 */

export const FiveElementColors = {
  // 오행별 메인 색상
  wood: '#2E7D32',      // 목 - 녹색
  fire: '#D32F2F',      // 화 - 빨간색
  earth: '#F57C00',     // 토 - 주황색
  metal: '#FFD700',     // 금 - 금색
  water: '#1976D2',     // 수 - 파란색
} as const;

export const FiveElementBackgroundColors = {
  // 오행별 배경 색상 (파스텔톤)
  wood: '#E8F5E8',      // 연한 녹색
  fire: '#FFEBEE',      // 연한 빨간색
  earth: '#FFF3E0',     // 연한 주황색
  metal: '#FFFDE7',     // 연한 금색
  water: '#E3F2FD',     // 연한 파란색
} as const;

export const FiveElementTextColors = {
  // 오행별 글자 색상 (진한 색상)
  wood: '#1B5E20',      // 진한 녹색
  fire: '#B71C1C',      // 진한 빨간색
  earth: '#E65100',     // 진한 주황색
  metal: '#F57F17',     // 진한 금색
  water: '#0D47A1',     // 진한 파란색
} as const;

// 한자 오행을 영문 키로 매핑
export const ElementMapping = {
  '木': 'wood',
  '火': 'fire', 
  '土': 'earth',
  '金': 'metal',
  '水': 'water',
} as const;

// 오행 색상 가져오기 함수
export const getElementColor = (element: string): string => {
  const elementKey = ElementMapping[element as keyof typeof ElementMapping] || 'water';
  return FiveElementColors[elementKey];
};

// 오행 배경 색상 가져오기 함수
export const getElementBackgroundColor = (element: string): string => {
  const elementKey = ElementMapping[element as keyof typeof ElementMapping] || 'water';
  return FiveElementBackgroundColors[elementKey];
};

// 오행 글자 색상 가져오기 함수
export const getElementTextColor = (element: string): string => {
  const elementKey = ElementMapping[element as keyof typeof ElementMapping] || 'water';
  return FiveElementTextColors[elementKey];
};

// 천간에서 오행 추출
export const getElementFromDayGan = (dayGanjiChar: string): string => {
  const elementMap: { [key: string]: string } = {
    '甲': '木', '乙': '木', // 갑을목
    '丙': '火', '丁': '火', // 병정화
    '戊': '土', '己': '土', // 무기토
    '庚': '金', '辛': '金', // 경신금
    '壬': '水', '癸': '水', // 임계수
  };
  return elementMap[dayGanjiChar] || '水';
};

// 한글 간지에서 한자로 변환
export const koreanToHanja = {
  '갑': '甲', '을': '乙', '병': '丙', '정': '丁', '무': '戊',
  '기': '己', '경': '庚', '신': '辛', '임': '壬', '계': '癸'
} as const;

// 지지 한글에서 한자로 변환
export const koreanToHanjaBranch = {
  '자': '子', '축': '丑', '인': '寅', '묘': '卯', '진': '辰', 
  '사': '巳', '오': '午', '미': '未', '신': '申', '유': '酉', '술': '戌', '해': '亥'
} as const;

// 지지에서 오행 추출
export const getElementFromBranch = (branchChar: string): string => {
  const branchElementMap: { [key: string]: string } = {
    '寅': '木', '卯': '木',     // 인묘목
    '巳': '火', '午': '火',     // 사오화  
    '辰': '土', '戌': '土', '丑': '土', '未': '土', // 진술축미토
    '申': '金', '酉': '金',     // 신유금
    '亥': '水', '子': '水',     // 해자수
  };
  return branchElementMap[branchChar] || '水';
};

// 천간에서 오행 추출 (기존 함수)
export const getElementFromStem = (stemChar: string): string => {
  const stemElementMap: { [key: string]: string } = {
    '甲': '木', '乙': '木', // 갑을목
    '丙': '火', '丁': '火', // 병정화
    '戊': '土', '己': '土', // 무기토
    '庚': '金', '辛': '金', // 경신금
    '壬': '水', '癸': '水', // 임계수
  };
  return stemElementMap[stemChar] || '水';
};

// 오행 한자와 한글 매핑
export const FiveElementNames = {
  '木': '나무',
  '火': '불',
  '土': '흙',
  '金': '쇠',
  '水': '물',
} as const;

// 오행 한자에 한글 표시 추가
export const getElementWithKorean = (element: string): string => {
  const koreanName = FiveElementNames[element as keyof typeof FiveElementNames] || '물';
  return `${element}, ${koreanName}`;
};
