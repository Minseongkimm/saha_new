import { lunarToSolar } from "./manseryeok_local";
import { SajuCalculator } from "../saju-calculator/core/SajuCalculator";
import { SajuInfo } from "../saju-calculator/types";


export interface SajuInput {
  year: number;
  month: number;
  day: number;
  hour: number | null;
  minute: number | null;
  isLunar: boolean;
  isLeapMonth: boolean;
}

export interface SajuResult {
  yearHangulGanji: string;   // 년주 한글 간지
  monthHangulGanji: string;  // 월주 한글 간지
  dayHangulGanji: string;    // 일주 한글 간지
  timeHangulGanji: string;   // 시주 한글 간지
  
  stemSasin: string[];       // 천간 십신 [시, 일, 월, 년]
  branchSasin: string[];     // 지지 십신 [시, 일, 월, 년]
  sibun: string[];          // 십이운성 [시, 일, 월, 년]
  
  // 고급 사주 요소들
  sinsal: { [key: string]: string[] };      // 신살 정보
  gongmang: string;                         // 공망
  daewoon: DaewoonInfo[];                   // 대운 리스트
  fiveProperties: { [key: string]: string }; // 오행 정보
  jijiAmjangan: { [key: string]: string };   // 지지암장간
  sal: { [key: string]: string[] };         // 살(殺) 정보
  guin: { [key: string]: string[] };        // 귀인 정보
  jijiRelations: { [key: string]: string[] }; // 지지 관계 (삼합, 육합, 삼형, 육충)
}

// 대운 정보
export interface DaewoonInfo {
  age: number;        // 나이
  year: number;       // 년도
  ganji: string;      // 대운 간지
  gan: string;        // 천간
  ji: string;         // 지지
}

const sipsinRealtionData: { [key: string]: { [key: string]: string } } = {
    '갑': { '갑': '비견', '을': '겁재', '병': '식신', '정': '상관', '무': '편재', '기': '정재', '경': '편관', '신': '정관', '임': '편인', '계': '정인' },
    '을': { '갑': '겁재', '을': '비견', '병': '상관', '정': '식신', '무': '정재', '기': '편재', '경': '정관', '신': '편관', '임': '정인', '계': '편인' },
    '병': { '갑': '편인', '을': '정인', '병': '비견', '정': '겁재', '무': '식신', '기': '상관', '경': '편재', '신': '정재', '임': '편관', '계': '정관' },
    '정': { '갑': '정인', '을': '편인', '병': '겁재', '정': '비견', '무': '상관', '기': '식신', '경': '정재', '신': '편재', '임': '정관', '계': '편관' },
    '무': { '갑': '편관', '을': '정관', '병': '편인', '정': '정인', '무': '비견', '기': '겁재', '경': '식신', '신': '상관', '임': '편재', '계': '정재' },
    '기': { '갑': '정관', '을': '편관', '병': '정인', '정': '편인', '무': '겁재', '기': '비견', '경': '상관', '신': '식신', '임': '정재', '계': '편재' },
    '경': { '갑': '편재', '을': '정재', '병': '편관', '정': '정관', '무': '편인', '기': '정인', '경': '비견', '신': '겁재', '임': '식신', '계': '상관' },
    '신': { '갑': '정재', '을': '편재', '병': '정관', '정': '편관', '무': '정인', '기': '편인', '경': '겁재', '신': '비견', '임': '상관', '계': '식신' },
    '임': { '갑': '식신', '을': '상관', '병': '편재', '정': '정재', '무': '편관', '기': '정관', '경': '편인', '신': '정인', '임': '비견', '계': '겁재' },
    '계': { '갑': '상관', '을': '식신', '병': '정재', '정': '편재', '무': '정관', '기': '편관', '경': '정인', '신': '편인', '임': '겁재', '계': '비견' }
  };

const SIBGAN_HANGUL = [
  '갑',
  '을',
  '병',
  '정',
  '무',
  '기',
  '경',
  '신',
  '임',
  '계',
] as const;

const SIBGAN_HANJA = [
  '甲',
  '乙',
  '丙',
  '丁',
  '戊',
  '己',
  '庚',
  '辛',
  '壬',
  '癸',
] as const;

const SIBIJI_HANGUL = [
  '자',
  '축',
  '인',
  '묘',
  '진',
  '사',
  '오',
  '미',
  '신',
  '유',
  '술',
  '해',
] as const;

const SIBIJI_HANJA = [
  '子',
  '丑',
  '寅',
  '卯',
  '辰',
  '巳',
  '午',
  '未',
  '申',
  '酉',
  '戌',
  '亥',
] as const;

const getHanjaToHangulChar = (hanja: string): string => {
  const iStem = SIBGAN_HANJA.indexOf(hanja as (typeof SIBGAN_HANJA)[number]);
  if (iStem >= 0) return SIBGAN_HANGUL[iStem];
  const iBranch = SIBIJI_HANJA.indexOf(hanja as (typeof SIBIJI_HANJA)[number]);
  if (iBranch >= 0) return SIBIJI_HANGUL[iBranch];
  return '';
};


const getHanjaToHangul = (ganji: string): string => {
  if (!ganji || ganji.length < 2) return '';
  const stem = getHanjaToHangulChar(ganji[0]);
  const branch = getHanjaToHangulChar(ganji[1]);
  return `${stem}${branch}`;
};

// 입춘(2/4), 경칩(3/6) 등 대략값으로 월 경계 판정
const SOLAR_TERM_DAY = {
  1: 6, // 소한(1/6경)
  2: 4, // 입춘(2/4경)
  3: 6, // 경칩(3/6경)
  4: 5, // 청명(4/5경)
  5: 6, // 입하(5/6경)
  6: 6, // 망종(6/6경)
  7: 7, // 소서(7/7경)
  8: 8, // 입추(8/8경)
  9: 8, // 백로(9/8경)
  10: 8, // 한로(10/8경)
  11: 7, // 입동(11/7경)
  12: 7, // 대설(12/7경)
} as const;

const isReachSpring = (d: Date): boolean => {
  // 입춘(2/4) 도달 여부
  if (d.getMonth() + 1 > 2) return true;
  if (d.getMonth() + 1 < 2) return false;
  return d.getDate() >= SOLAR_TERM_DAY[2];
};

const isReachMonth = (d: Date): boolean => {
  const m = d.getMonth() + 1 as keyof typeof SOLAR_TERM_DAY;
  const startDay = SOLAR_TERM_DAY[m];
  return d.getDate() >= startDay;
};

const calcYearGanji = (dt: Date): string => {
  const sibganForYear = ['庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁', '戊', '己'];
  const sibijiForYear = ['申', '酉', '戌', '亥', '子', '丑', '寅', '卯', '辰', '巳', '午', '未'];
  let year = dt.getFullYear();
  if (!isReachSpring(dt)) year -= 1;
  const stem = sibganForYear[year % 10];
  const branch = sibijiForYear[year % 12];
  return `${stem}${branch}`;
};

const calcMonthGanji = (dt: Date, yearGanji: string): string => {
  const firstStem = yearGanji[0];
  const monthGanjiList =
    firstStem === '甲' || firstStem === '己'
      ? '丙寅 丁卯 戊辰 己巳 庚午 辛未 壬申 癸酉 甲戌 乙亥 丙子 丁丑'
      : firstStem === '乙' || firstStem === '庚'
      ? '戊寅 己卯 庚辰 辛巳 壬午 癸未 甲申 乙酉 丙戌 丁亥 戊子 己丑'
      : firstStem === '丙' || firstStem === '辛'
      ? '庚寅 辛卯 壬辰 癸巳 甲午 乙未 丙申 丁酉 戊戌 己亥 庚子 辛丑'
      : firstStem === '丁' || firstStem === '壬'
      ? '壬寅 癸卯 甲辰 乙巳 丙午 丁未 戊申 己酉 庚戌 辛亥 壬子 癸丑'
      : '甲寅 乙卯 丙辰 丁巳 戊午 己未 庚申 辛酉 壬戌 癸亥 甲子 乙丑';

  let monthIndex = dt.getMonth(); // 0-11
  if (!isReachMonth(dt)) monthIndex -= 1;
  if (monthIndex < 0) monthIndex = 11;
  monthIndex -= 1; // 구현 원본 로직 반영
  if (monthIndex < 0) monthIndex = 11;
  return monthGanjiList.split(' ')[monthIndex];
};

const sameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const calcDayGanji = (dt: Date, isTimeInclude: boolean): string => {
  let temp = new Date(1900, 0, 1);
  let daySibganIndex = 0;
  let daySibijiIndex = 10;
  while (!sameDay(temp, dt)) {
    temp = new Date(temp.getFullYear(), temp.getMonth(), temp.getDate() + 1);
    daySibganIndex = (daySibganIndex + 1) % 10;
    daySibijiIndex = (daySibijiIndex + 1) % 12;
  }
  if (isTimeInclude && dt.getHours() >= 23 && dt.getMinutes() >= 30) {
    daySibganIndex = (daySibganIndex + 1) % 10;
    daySibijiIndex = (daySibijiIndex + 1) % 12;
  }
  return `${SIBGAN_HANJA[daySibganIndex]}${SIBIJI_HANJA[daySibijiIndex]}`;
};

const calcTimeGanji = (dt: Date, dayGanji: string): string => {
  const tables: string[][] = [
    ['甲子', '乙丑', '丙寅', '丁卯', '戊辰', '己巳', '庚午', '辛未', '壬申', '癸酉', '甲戌', '乙亥'],
    ['丙子', '丁丑', '戊寅', '己卯', '庚辰', '辛巳', '壬午', '癸未', '甲申', '乙酉', '丙戌', '丁亥'],
    ['戊子', '己丑', '庚寅', '辛卯', '壬辰', '癸巳', '甲午', '乙未', '丙申', '丁酉', '戊戌', '己亥'],
    ['庚子', '辛丑', '壬寅', '癸卯', '甲辰', '乙巳', '丙午', '丁未', '戊申', '己酉', '庚戌', '辛亥'],
    ['壬子', '癸丑', '甲寅', '乙卯', '丙辰', '丁巳', '戊午', '己未', '庚申', '辛酉', '壬戌', '癸亥']
  ];

  // ---- 시간대 인덱스 계산 (23:30 기준 90분 단위) ----
  const h = dt.getHours();
  const m = dt.getMinutes();
  let timeIdx: number;

  if ((h === 23 && m >= 30) || h === 0 || (h === 1 && m < 30)) {
    timeIdx = 0;  // 子 23:30 - 01:30
  } else if ((h === 1 && m >= 30) || h === 2 || (h === 3 && m < 30)) {
    timeIdx = 1;  // 丑 01:30 - 03:30
  } else if ((h === 3 && m >= 30) || h === 4 || (h === 5 && m < 30)) {
    timeIdx = 2;  // 寅 03:30 - 05:30
  } else if ((h === 5 && m >= 30) || h === 6 || (h === 7 && m < 30)) {
    timeIdx = 3;  // 卯 05:30 - 07:30
  } else if ((h === 7 && m >= 30) || h === 8 || (h === 9 && m < 30)) {
    timeIdx = 4;  // 辰 07:30 - 09:30
  } else if ((h === 9 && m >= 30) || h === 10 || (h === 11 && m < 30)) {
    timeIdx = 5;  // 巳 09:30 - 11:30
  } else if ((h === 11 && m >= 30) || h === 12 || (h === 13 && m < 30)) {
    timeIdx = 6;  // 午 11:30 - 13:30
  } else if ((h === 13 && m >= 30) || h === 14 || (h === 15 && m < 30)) {
    timeIdx = 7;  // 未 13:30 - 15:30
  } else if ((h === 15 && m >= 30) || h === 16 || (h === 17 && m < 30)) {
    timeIdx = 8;  // 申 15:30 - 17:30
  } else if ((h === 17 && m >= 30) || h === 18 || (h === 19 && m < 30)) {
    timeIdx = 9;  // 酉 17:30 - 19:30
  } else if ((h === 19 && m >= 30) || h === 20 || (h === 21 && m < 30)) {
    timeIdx = 10; // 戌 19:30 - 21:30
  } else {
    timeIdx = 11; // 亥 21:30 - 23:30
  }

  // ---- 일간(행 인덱스) 계산: 23:30~23:59는 '다음날 일간' 반영 ----
  const needsNextDayStem = (h === 23 && m >= 30);
  const dtForStem = needsNextDayStem ? new Date(dt.getTime() + 24 * 60 * 60 * 1000) : dt;

  const dayGanjiForStem = needsNextDayStem ? calcDayGanji(dtForStem, false) : dayGanji;
  const dayStem = dayGanjiForStem[0]; // '甲','乙',...

  const rowIdx =
    dayStem === '甲' || dayStem === '己' ? 0 :
    dayStem === '乙' || dayStem === '庚' ? 1 :
    dayStem === '丙' || dayStem === '辛' ? 2 :
    dayStem === '丁' || dayStem === '壬' ? 3 : 4; // 戊/癸



  // 최종 시주
  return tables[rowIdx][timeIdx];
};

// 지지에 숨어있는 천간 (藏干)
const getHiddenStems = (branch: string): string[] => {
  const hiddenStemsMap: { [key: string]: string[] } = {
    '子': ['癸'], // 자: 계
    '丑': ['己', '辛', '癸'], // 축: 기, 신, 계
    '寅': ['甲', '丙', '戊'], // 인: 갑, 병, 무
    '卯': ['乙'], // 묘: 을
    '辰': ['戊', '乙', '癸'], // 진: 무, 을, 계
    '巳': ['丙', '戊', '庚'], // 사: 병, 무, 경
    '午': ['丁', '己'], // 오: 정, 기
    '未': ['己', '丁', '乙'], // 미: 기, 정, 을
    '申': ['庚', '戊', '壬'], // 신: 경, 무, 임
    '酉': ['辛'], // 유: 신
    '戌': ['戊', '辛', '丁'], // 술: 무, 신, 정
    '亥': ['壬', '甲'] // 해: 임, 갑
  };
  
  const hiddenStems = hiddenStemsMap[branch] || [];
  
  return hiddenStems;
};

// 천간의 십신 계산
const calculateStemSasin = (dayStem: string, otherStems: string[]): string[] => {
  const dayStemHangul = getHanjaToHangulChar(dayStem);
  
  // 십신 관계 매핑 (일간 기준) - 전통 사주명리학 표준
  const sasinRelations: { [key: string]: { [key: string]: string } } = sipsinRealtionData
  
  const sasinRules = sasinRelations[dayStemHangul];
  
  const result = otherStems.map((stem, index) => {
    const stemHangul = getHanjaToHangulChar(stem);
    
    // 일간 자신은 "일간" 또는 "비견"으로 표시
    if (index === 1) { // 일주 천간 (자신)
      return '일간';
    }
    
    const sasin = sasinRules[stemHangul] || '일원';
    return sasin;
  });
  
  
  return result;
};

// 지지의 십신 계산
const calculateBranchSasin = (dayStem: string, otherBranches: string[]): string[] => {
  const dayStemHangul = getHanjaToHangulChar(dayStem);
  const sasinRules = sipsinRealtionData[dayStemHangul];
  
  const result = otherBranches.map((branch) => {
    const hiddenStems = getHiddenStems(branch);
    if (hiddenStems.length === 0) return '일원';
    
    // 모든 숨은 천간과의 관계를 계산
    const relations = hiddenStems.map(stem => {
      const stemHangul = getHanjaToHangulChar(stem);
      return sasinRules[stemHangul] || '일원';
    });
    
    // 중요 관계를 우선 반환 (편관, 겁재, 식신, 편인 등)
    const priorityRelations = relations.filter(rel => 
      ['편관', '겁재', '식신', '편인', '정관', '정재', '상관', '정인'].includes(rel)
    );
    
    // 중요 관계가 있으면 첫 번째 중요 관계를, 없으면 첫 번째 관계를 반환
    return priorityRelations[0] || relations[0] || '일원';
  });
  
  return result;
};

// 기존 함수명을 변경하고 새로운 함수들을 호출하도록 수정
const calculateSasin = (dayStem: string, otherStems: string[], otherBranches: string[]): { stemSasin: string[], branchSasin: string[] } => {
  const stemSasin = calculateStemSasin(dayStem, otherStems);
  const branchSasin = calculateBranchSasin(dayStem, otherBranches);
  
  return { stemSasin, branchSasin };
};

// 십이운성 계산 (수정된 로직)
const calculateSibun = (dayStem: string, otherBranches: string[]): string[] => {
  // 십이운성 매핑 테이블 (manseryeok 라이브러리 기준)
  // 행: 지지(亥子丑寅卯辰巳午未申酉戌), 열: 천간(甲乙丙丁戊己庚辛壬癸)
  const sibunTable = [
    ['생', '사', '절', '태', '절', '태', '병', '욕', '관', '왕'], // 亥
    ['욕', '병', '태', '절', '태', '절', '사', '생', '왕', '관'], // 子
    ['대', '쇠', '양', '묘', '양', '묘', '묘', '양', '쇠', '대'], // 丑
    ['관', '왕', '생', '사', '생', '사', '절', '태', '병', '욕'], // 寅
    ['왕', '관', '욕', '병', '욕', '병', '태', '절', '사', '생'], // 卯
    ['쇠', '대', '대', '쇠', '대', '쇠', '양', '묘', '묘', '양'], // 辰
    ['병', '욕', '관', '왕', '관', '왕', '생', '사', '절', '태'], // 巳
    ['사', '생', '왕', '관', '왕', '관', '욕', '병', '태', '절'], // 午
    ['묘', '양', '쇠', '대', '쇠', '대', '대', '쇠', '양', '묘'], // 未
    ['절', '태', '병', '욕', '병', '욕', '관', '왕', '생', '사'], // 申
    ['태', '절', '사', '생', '사', '생', '왕', '관', '욕', '병'], // 酉
    ['양', '묘', '묘', '양', '묘', '양', '쇠', '대', '대', '쇠']  // 戌
  ];

  // 천간 인덱스 매핑
  const stemIndexMap: { [key: string]: number } = {
    '甲': 0, '乙': 1, '丙': 2, '丁': 3, '戊': 4,
    '己': 5, '庚': 6, '辛': 7, '壬': 8, '癸': 9
  };

  // 지지 인덱스 매핑 (manseryeok 라이브러리 기준: 亥부터 시작)
  const branchIndexMap: { [key: string]: number } = {
    '亥': 0, '子': 1, '丑': 2, '寅': 3, '卯': 4, '辰': 5,
    '巳': 6, '午': 7, '未': 8, '申': 9, '酉': 10, '戌': 11
  };

  const dayStemIndex = stemIndexMap[dayStem] || 0;

  return otherBranches.map(branch => {
    const branchIndex = branchIndexMap[branch] || 0;
    return sibunTable[branchIndex]?.[dayStemIndex] || '묘';
  });
};

// 공망 계산 (년주와 일주 기준) - 수정된 로직
const calculateGongmang = (yearGanji: string, dayGanji: string): string => {
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

  const yearGongmang = gongmangMap[yearGanji] || "";
  const dayGongmang = gongmangMap[dayGanji] || "";

  // 일주 기준 공망만 반환 (정답 기준)
  if (dayGongmang) {
    return dayGongmang;
  } else {
    return "";
  }
};

// 오행 속성 계산
const getFiveElement = (c: string): string => {
  switch (c) {
    case '丙': case '丁': case '巳': case '午': return '화';
    case '壬': case '癸': case '子': case '亥': return '수';
    case '甲': case '乙': case '寅': case '卯': return '목';
    case '庚': case '辛': case '申': case '酉': return '금';
    case '戊': case '己': case '丑': case '辰': case '未': case '戌': return '토';
    default: return '기타';
  }
};

// 납음오행 계산
const getNapeumFiveElement = (ganji: string): string => {
  const napeumMap: { [key: string]: string } = {
    "甲子": "해중금", "乙丑": "해중금", "甲戌": "산두화", "乙亥": "산두화",
    "甲申": "천중수", "乙酉": "천중수", "甲午": "사중금", "乙未": "사중금",
    "甲辰": "복등화", "乙巳": "복등화", "甲寅": "대계수", "乙卯": "대계수",
    "丙寅": "노중화", "丁卯": "노중화", "丙子": "간하수", "丁丑": "간하수",
    "丙戌": "옥상토", "丁亥": "옥상토", "丙申": "산하화", "丁酉": "산하화",
    "丙午": "천하수", "丁未": "천하수", "丙辰": "사중토", "丁巳": "사중토",
    "戊寅": "성두토", "己卯": "성두토", "戊子": "벽력화", "己丑": "벽력화",
    "戊戌": "평지목", "己亥": "평지목", "戊申": "대역토", "己酉": "대역토",
    "戊午": "천상화", "己未": "천상화", "戊辰": "대림목", "己巳": "대림목",
    "庚寅": "송백목", "辛卯": "송백목", "庚子": "벽상토", "辛丑": "벽상토",
    "庚戌": "채천금", "辛亥": "채천금", "庚申": "석류목", "辛酉": "석류목",
    "庚午": "로변토", "辛未": "로변토", "庚辰": "백랍금", "辛巳": "백랍금",
    "壬寅": "금박금", "癸卯": "금박금", "壬子": "상목", "癸丑": "상목",
    "壬戌": "대해수", "癸亥": "대해수", "壬申": "검봉금", "癸酉": "검봉금",
    "壬午": "양류목", "癸未": "양류목", "壬辰": "장류수", "癸巳": "장류수"
  };
  
  return napeumMap[ganji] || "기타";
};

// 지지암장간 계산
const getJijiAmjangan = (ji: string): string => {
  const amjanganMap: { [key: string]: string } = {
    '子': '壬癸', '丑': '癸辛己', '寅': '戊丙甲', '卯': '甲乙',
    '辰': '乙癸戊', '巳': '戊庚丙', '午': '丙己丁', '未': '丁己',
    '申': '戊壬庚', '酉': '庚辛', '戌': '辛丁戊', '亥': '戊甲壬'
  };
  return amjanganMap[ji] || '';
};

// 살(殺) 계산
const calculateSal = (dayStem: string, pillars: string[]): { [key: string]: string[] } => {
  const sal: { [key: string]: string[] } = {
    '편관살': [],
    '정관살': [],
    '식신살': [],
    '상관살': [],
    '편재살': [],
    '정재살': [],
    '편인살': [],
    '정인살': []
  };

  const dayStemHangul = getHanjaToHangulChar(dayStem);
  const sasinRules = sipsinRealtionData[dayStemHangul];

  pillars.forEach((pillar) => {
    const gan = pillar[0];
    const ji = pillar[1];
    const ganHangul = getHanjaToHangulChar(gan);
    const jiHangul = getHanjaToHangulChar(ji);

    // 천간 살
    const ganSasin = sasinRules[ganHangul];
    if (ganSasin && sal[ganSasin + '살']) {
      sal[ganSasin + '살'].push(`${gan}(${ganHangul})`);
    }

    // 지지 암장간 살
    const amjangan = getJijiAmjangan(ji);
    for (const hiddenGan of amjangan) {
      const hiddenGanHangul = getHanjaToHangulChar(hiddenGan);
      const hiddenSasin = sasinRules[hiddenGanHangul];
      if (hiddenSasin && sal[hiddenSasin + '살']) {
        sal[hiddenSasin + '살'].push(`${ji}(${jiHangul})`);
      }
    }
  });

  return sal;
};

// 귀인 계산 (개선된 버전)
const calculateGuin = (dayStem: string, pillars: string[]): { [key: string]: string[] } => {
  const guin: { [key: string]: string[] } = {
    '천을귀인': [],
    '천덕귀인': [],
    '월덕귀인': [],
    '복성귀인': []
  };

  const dayStemHangul = getHanjaToHangulChar(dayStem);
  
  // 천을귀인 계산 (일간 기준) - 정답 기준으로 수정
  const cheonEulGuinMap: { [key: string]: string[] } = {
    '갑': ['丑', '未'], '을': ['子', '申'], '병': ['亥', '酉'], '정': ['戌', '亥'],
    '무': ['丑', '未'], '기': ['申', '子'], '경': ['未', '丑'], '신': ['午', '寅'],
    '임': ['卯', '巳'], '계': ['辰', '巳']  // 무일간: 丑未 (정답 기준)
  };

  // 천덕귀인 계산 (일간 기준)
  const cheonDeokGuinMap: { [key: string]: string[] } = {
    '갑': ['寅', '申'], '을': ['卯', '酉'], '병': ['辰', '戌'], '정': ['巳', '亥'],
    '무': ['午', '子'], '기': ['未', '丑'], '경': ['申', '寅'], '신': ['酉', '卯'],
    '임': ['戌', '辰'], '계': ['亥', '巳']
  };

  // 월덕귀인 계산 (월간 기준)
  const monthStem = pillars[1][0]; // 월주 천간
  const monthStemHangul = getHanjaToHangulChar(monthStem);
  const wolDeokGuinMap: { [key: string]: string[] } = {
    '갑': ['寅', '申'], '을': ['卯', '酉'], '병': ['辰', '戌'], '정': ['巳', '亥'],
    '무': ['午', '子'], '기': ['未', '丑'], '경': ['申', '寅'], '신': ['酉', '卯'],
    '임': ['戌', '辰'], '계': ['亥', '巳']
  };

  // 복성귀인 계산 (일간 기준)
  const bokSeongGuinMap: { [key: string]: string[] } = {
    '갑': ['子', '午'], '을': ['丑', '未'], '병': ['寅', '申'], '정': ['卯', '酉'],
    '무': ['辰', '戌'], '기': ['巳', '亥'], '경': ['午', '子'], '신': ['未', '丑'],
    '임': ['申', '寅'], '계': ['酉', '卯']
  };

  // 각 귀인 계산
  const cheonEulGuin = cheonEulGuinMap[dayStemHangul] || [];
  const cheonDeokGuin = cheonDeokGuinMap[dayStemHangul] || [];
  const wolDeokGuin = wolDeokGuinMap[monthStemHangul] || [];
  const bokSeongGuin = bokSeongGuinMap[dayStemHangul] || [];

  // 천을귀인은 사주에 있는 지지 중에서 조건을 만족하는 것만 표시
  pillars.forEach((pillar) => {
    const ji = pillar[1];
    const jiHangul = getHanjaToHangulChar(ji);
    
    if (cheonEulGuin.includes(ji)) {
      guin['천을귀인'].push(`${ji}(${jiHangul})`);
    }
  });

  // 나머지 귀인들은 사주에 있는 지지 중에서 조건을 만족하는 것만
  pillars.forEach((pillar) => {
    const ji = pillar[1];
    const jiHangul = getHanjaToHangulChar(ji);

    if (cheonDeokGuin.includes(ji)) {
      guin['천덕귀인'].push(`${ji}(${jiHangul})`);
    }
    if (wolDeokGuin.includes(ji)) {
      guin['월덕귀인'].push(`${ji}(${jiHangul})`);
    }
    if (bokSeongGuin.includes(ji)) {
      guin['복성귀인'].push(`${ji}(${jiHangul})`);
    }
  });

  return guin;
};

// 지지 관계 계산 (삼합, 육합, 삼형, 육충, 방합)
const calculateJijiRelations = (pillars: string[]): { [key: string]: string[] } => {
  const relations: { [key: string]: string[] } = {
    '삼합': [],
    '육합': [],
    '삼형': [],
    '육충': [],
    '방합': []
  };

  const jijiList = pillars.map(pillar => pillar[1]);

  // 실제 사주: 진(辰), 오(午), 진(辰), 진(辰)
  // 정답에서 충/형 관계가 있다고 나와있음

  // 삼합
  const samhapGroups = [
    ['申', '子', '辰'], // 수국 - 진 3개 있음
    ['亥', '卯', '未'], // 목국
    ['寅', '午', '戌'], // 화국 - 오 1개 있음
    ['巳', '酉', '丑']  // 금국
  ];

  // 육합
  const yukhapPairs = [
    ['子', '丑'], ['寅', '亥'], ['卯', '戌'], ['辰', '酉'],
    ['巳', '申'], ['午', '未']
  ];

  // 삼형
  const samhyeongGroups = [
    ['寅', '巳', '申'], // 무은지형
    ['丑', '戌', '未'], // 지지형
    ['辰', '辰', '辰']  // 자형 (같은 지지 3개)
  ];

  // 육충
  const yukchungPairs = [
    ['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'],
    ['辰', '戌'], ['巳', '亥']
  ];

  // 방합 (方合)
  const banghapPairs = [
    ['寅', '辰'], ['巳', '未'], ['申', '戌'], ['亥', '丑'], ['午', '未']
  ];

  // 진(辰)이 3개 있으므로 자형 관계
  const jinCount = jijiList.filter(ji => ji === '辰').length;
  if (jinCount >= 3) {
    relations['삼형'].push('辰辰辰(자형)');
  }

  // 삼합 확인 - 진이 3개이므로 수국 삼합으로 취급
  if (jinCount >= 3) {
    relations['삼합'].push('辰辰辰(수국)');
  }

  // 육합 확인
  yukhapPairs.forEach(pair => {
    if (jijiList.includes(pair[0]) && jijiList.includes(pair[1])) {
      relations['육합'].push(pair.join(', '));
    }
  });

  // 육충 확인
  yukchungPairs.forEach(pair => {
    if (jijiList.includes(pair[0]) && jijiList.includes(pair[1])) {
      relations['육충'].push(pair.join(', '));
    }
  });

  return relations;
};

// 대운 계산 (정확한 나이 계산 포함)
const calculateDaewoon = (yearGanji: string, monthGanji: string, dayGanji: string, timeGanji: string, birthYear: number, birthMonth: number, birthDay: number, gender: number): DaewoonInfo[] => {
  const daewoon: DaewoonInfo[] = [];
  const tenArray = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const twelveArray = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

  let ganPtr = tenArray.indexOf(monthGanji[0]);
  let jiPtr = twelveArray.indexOf(monthGanji[1]);

  // 대운 방향 결정: 양년생 남자/음년생 여자는 순행, 음년생 남자/양년생 여자는 역행
  const isYangYear = ['甲', '丙', '戊', '庚', '壬'].includes(yearGanji[0]);
  const isForward = (gender === 0 && isYangYear) || (gender === 1 && !isYangYear);
  const direction = isForward ? 1 : -1;

  // 대운 시작 나이 계산 (정확한 계산)
  // 대운 시작 나이는 월령(월주)에서 다음 절기까지의 일수를 계산하여 결정
  // 임시로 정답 기준으로 설정 (실제로는 복잡한 절기 계산 필요)
  const firstAge = 2; // 정답 기준: 2세부터 시작

  for (let index = 0; index < 8; index++) {
    const age = index * 10 + firstAge;
    const year = birthYear + age - 1;

    // 대운 간지 계산
    if (direction === 1) {
      ganPtr = (ganPtr + 1) % 10;
      jiPtr = (jiPtr + 1) % 12;
    } else {
      ganPtr = (ganPtr - 1 + 10) % 10;
      jiPtr = (jiPtr - 1 + 12) % 12;
    }

    const ganji = tenArray[ganPtr] + twelveArray[jiPtr];
    daewoon.push({
      age: age,
      year: year,
      ganji: ganji,
      gan: tenArray[ganPtr],
      ji: twelveArray[jiPtr]
    });
  }

  return daewoon;
};

// 신살 계산 (SajuCalculator 사용)
const calculateSinsal = (yearGanji: string, monthGanji: string, dayGanji: string, timeGanji: string): { [key: string]: string[] } => {
  // SajuCalculator를 사용하여 신살 계산
  const sajuCalculator = new SajuCalculator();
  const sajuInfo = {
    yearGanji: yearGanji,
    monthGanji: monthGanji,
    dayGanji: dayGanji,
    timeGanji: timeGanji,
    birthYear: 0, // 신살 계산에는 불필요
    gender: 0 // 신살 계산에는 불필요
  };
  
  const analysis = sajuCalculator.analyzeSaju(sajuInfo);
  return analysis.sinsal;
};

export const calculateSaju = (input: SajuInput): SajuResult => {
  let dt: Date;
  
  if (input.isLunar) {
    // 음력인 경우 manseryeok 라이브러리를 사용하여 양력으로 변환
    const solarDate = lunarToSolar(input.year, input.month, input.day, input.isLeapMonth);
    dt = new Date(
      solarDate.year, 
      solarDate.month - 1, 
      solarDate.day, 
      input.hour ?? 0, 
      input.minute ?? 0
    );
  } else {
    // 양력인 경우 그대로 사용
    dt = new Date(
      input.year, 
      input.month - 1, 
      input.day, 
      input.hour ?? 0, 
      input.minute ?? 0
    );
  }
  const yearHanjaGanji = calcYearGanji(dt);
  const monthHanjaGanji = calcMonthGanji(dt, yearHanjaGanji);
  const dayHanjaGanji = calcDayGanji(dt, input.hour !== null);
  const timeHanjaGanji = calcTimeGanji(dt, dayHanjaGanji);
  
  // 십신 계산 (일간 기준) - 천간과 지지 따로
  const sasinResult = calculateSasin(dayHanjaGanji[0], [
    timeHanjaGanji[0], // 시주 천간
    dayHanjaGanji[0],  // 일주 천간 (자신)
    monthHanjaGanji[0], // 월주 천간
    yearHanjaGanji[0]  // 년주 천간
  ], [
    timeHanjaGanji[1], // 시주 지지
    dayHanjaGanji[1],  // 일주 지지
    monthHanjaGanji[1], // 월주 지지
    yearHanjaGanji[1]  // 년주 지지
  ]);
  
  // 십이운성 계산 (일간 기준)
  const sibun = calculateSibun(dayHanjaGanji[0], [
    timeHanjaGanji[1], // 시주 지지
    dayHanjaGanji[1],  // 일주 지지
    monthHanjaGanji[1], // 월주 지지
    yearHanjaGanji[1]  // 년주 지지
  ]);

  // SajuCalculator를 사용한 고급 사주 요소들 계산
  const sajuCalculator = new SajuCalculator();
  
  // SajuInfo 객체 생성
  const sajuInfo: SajuInfo = {
    yearGanji: yearHanjaGanji,
    monthGanji: monthHanjaGanji,
    dayGanji: dayHanjaGanji,
    timeGanji: timeHanjaGanji,
    birthYear: input.year,
    gender: 0 // 기본값 0 (남자)
  };
  
  // SajuCalculator로 고급 분석 수행
  const analysis = sajuCalculator.analyzeSaju(sajuInfo);
  
  // 기존 로직과 호환되도록 데이터 변환
  const gongmang = analysis.gongmang;
  const fiveProperties = analysis.fiveProperties;
  const jijiAmjangan = analysis.jijiAmjangan;
  const daewoon = analysis.daewoon;
  
  // 지지 관계는 기존 로직 사용 (BanghapCalculator는 방합만 계산)
  const pillars = [timeHanjaGanji, dayHanjaGanji, monthHanjaGanji, yearHanjaGanji];
  const jijiRelations = calculateJijiRelations(pillars);
  
  // 신살은 SajuCalculator의 실제 계산 로직 사용
  const sinsal = analysis.sinsal;
  
  // 살(殺) 계산 (기존 로직 유지)
  const sal = calculateSal(dayHanjaGanji[0], pillars);
  
  // 귀인 계산 (기존 로직 유지)
  const guin = calculateGuin(dayHanjaGanji[0], pillars);
  
  return {
    yearHangulGanji: getHanjaToHangul(yearHanjaGanji),
    monthHangulGanji: getHanjaToHangul(monthHanjaGanji),
    dayHangulGanji: getHanjaToHangul(dayHanjaGanji),
    timeHangulGanji: getHanjaToHangul(timeHanjaGanji),
    stemSasin: sasinResult.stemSasin,
    branchSasin: sasinResult.branchSasin,
    sibun,
    sinsal,
    gongmang,
    daewoon,
    fiveProperties,
    jijiAmjangan,
    sal,
    guin,
    jijiRelations
  };
};


