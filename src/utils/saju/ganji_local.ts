import { lunarToSolar } from "./manseryeok_local";
import { SajuCalculator } from "../saju-calculator/core/SajuCalculator";
import { SajuInfo } from "../saju-calculator/types";
import { getLichunKstMidnightUtcMs, getMonthBranchIndexBySolarTerms } from "./solar_terms";


export interface SajuInput {
  year: number;
  month: number;
  day: number;
  hour: number | null;
  minute: number | null;
  isLunar: boolean;
  isLeapMonth: boolean;
  gender: number; // 0: 남자, 1: 여자 (대운 순행/역행 방향 계산에 사용)
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
  hyeonchimSal?: string[];                    // 현침살 (甲辛卯午申 존재 여부)
  gwaegangSal?: boolean;                      // 괴강살 (일주가 庚辰·庚戌·壬辰·戊戌 중 하나)
  twelveSinsal?: { [key: string]: { [pillar: string]: string } }; // 12신살 (byYear/byDay/byMonth 기준)
  birthDate?: Date;                         // 계산에 사용된 (음력이면 변환된) 양력 출생 일시 - 대운 재계산 등에 사용
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

const calcYearGanji = (dt: Date): string => {
  const sibganForYear = ['庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁', '戊', '己'];
  const sibijiForYear = ['申', '酉', '戌', '亥', '子', '丑', '寅', '卯', '辰', '巳', '午', '未'];
  const year = dt.getFullYear();
  const targetUtcMs =
    Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()) - 9 * 60 * 60 * 1000;
  const ipchunUtcMs = getLichunKstMidnightUtcMs(year);
  const adjustedYear = targetUtcMs < ipchunUtcMs ? year - 1 : year;
  const stem = sibganForYear[adjustedYear % 10];
  const branch = sibijiForYear[adjustedYear % 12];
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

  // 절기(입춘·경칩 등) 기준 정밀 월지 인덱스 (0~11, 寅=0 ... 丑=11)
  const monthIndex = getMonthBranchIndexBySolarTerms(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
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
  // 배열 순서는 [정기, 중기, 초기] - index 0(정기)이 지지 십신 판정의 기준이 된다.
  const hiddenStemsMap: { [key: string]: string[] } = {
    '子': ['癸', '壬'], // 자: 정기 계, 초기 임
    '丑': ['己', '辛', '癸'], // 축: 정기 기, 중기 신, 초기 계
    '寅': ['甲', '丙', '戊'], // 인: 정기 갑, 중기 병, 초기 무
    '卯': ['乙', '甲'], // 묘: 정기 을, 초기 갑
    '辰': ['戊', '癸', '乙'], // 진: 정기 무, 중기 계, 초기 을
    '巳': ['丙', '庚', '戊'], // 사: 정기 병, 중기 경, 초기 무
    '午': ['丁', '己', '丙'], // 오: 정기 정, 중기 기, 초기 병
    '未': ['己', '乙', '丁'], // 미: 정기 기, 중기 을, 초기 정
    '申': ['庚', '壬', '戊'], // 신: 정기 경, 중기 임, 초기 무
    '酉': ['辛', '庚'], // 유: 정기 신, 초기 경
    '戌': ['戊', '丁', '辛'], // 술: 정기 무, 중기 정, 초기 신
    '亥': ['壬', '甲', '戊'] // 해: 정기 임, 중기 갑, 초기 무
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

    // 지지 십신은 지장간 중 본기(정기) - getHiddenStems() 배열의 첫 번째 천간 - 기준으로 정한다.
    // (예: 丑의 지장간은 己·辛·癸지만 본기는 己이므로, 을일간 기준 丑의 십신은 己→편재가 맞다.)
    const jeonggiStem = hiddenStems[0];
    const jeonggiHangul = getHanjaToHangulChar(jeonggiStem);
    return sasinRules[jeonggiHangul] || '일원';
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

// 지지암장간 계산 - getHiddenStems()와 같은 표를 재사용한다 (별도 테이블을 두면 서로 어긋날 수 있음 -
// 예전엔 이 함수의 未 항목에서 을(乙)이 빠져 "丁己" 2글자만 나오는 불일치가 있었음).
// 화면 표기 순서(초기→중기→정기)는 getHiddenStems()의 [정기,중기,초기] 순서를 뒤집어서 만든다.
const getJijiAmjangan = (ji: string): string => {
  return getHiddenStems(ji).slice().reverse().join('');
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

// 귀인 계산
// 아래 표들은 전통 명리학의 고전적 정의를 따른다. 천덕귀인/월덕귀인은 월지(月支) 기준이며,
// 나머지(천을·복성·천주·문창·학당·태극·홍염·암록·비인)는 일간(日干) 기준이다.
const calculateGuin = (dayStem: string, pillars: string[]): { [key: string]: string[] } => {
  const guin: { [key: string]: string[] } = {
    '천을귀인': [],
    '천덕귀인': [],
    '월덕귀인': [],
    '복성귀인': [],
    '천주귀인': [],
    '문창귀인': [],
    '학당귀인': [],
    '태극귀인': [],
    '홍염살': [],
    '암록': [],
    '비인살': []
  };

  const dayStemHangul = getHanjaToHangulChar(dayStem);

  // 천을귀인 (일간 기준)
  const cheonEulGuinMap: { [key: string]: string[] } = {
    '갑': ['丑', '未'], '을': ['子', '申'], '병': ['亥', '酉'], '정': ['戌', '亥'],
    '무': ['丑', '未'], '기': ['申', '子'], '경': ['未', '丑'], '신': ['午', '寅'],
    '임': ['卯', '巳'], '계': ['辰', '巳']
  };

  // 천덕귀인 (월지 기준 - 12개월 각각에 고정된 천간/지지 하나)
  const cheonDeokGuinByMonthJi: { [key: string]: string } = {
    '寅': '丁', '卯': '申', '辰': '壬', '巳': '辛', '午': '亥', '未': '甲',
    '申': '癸', '酉': '寅', '戌': '丙', '亥': '乙', '子': '巳', '丑': '庚'
  };

  // 월덕귀인 (월지의 삼합 그룹 기준 - 화국/수국/금국/목국별 천간 하나)
  const wolDeokGuinByMonthGroup: { branches: string[]; stem: string }[] = [
    { branches: ['寅', '午', '戌'], stem: '丙' },
    { branches: ['申', '子', '辰'], stem: '壬' },
    { branches: ['巳', '酉', '丑'], stem: '庚' },
    { branches: ['亥', '卯', '未'], stem: '甲' }
  ];

  // 복성귀인 (일간 기준)
  const bokSeongGuinMap: { [key: string]: string[] } = {
    '갑': ['子', '午'], '을': ['丑', '未'], '병': ['寅', '申'], '정': ['卯', '酉'],
    '무': ['辰', '戌'], '기': ['巳', '亥'], '경': ['午', '子'], '신': ['未', '丑'],
    '임': ['申', '寅'], '계': ['酉', '卯']
  };

  // 천주귀인 (일간 기준 - 식신의 건록 위치)
  const cheonjuGuinMap: { [key: string]: string } = {
    '갑': '巳', '을': '午', '병': '巳', '정': '午', '무': '申',
    '기': '酉', '경': '亥', '신': '子', '임': '寅', '계': '卯'
  };

  // 문창귀인 (일간 기준)
  const munchangGuinMap: { [key: string]: string } = {
    '갑': '巳', '을': '午', '병': '申', '정': '酉', '무': '申',
    '기': '酉', '경': '亥', '신': '子', '임': '寅', '계': '卯'
  };

  // 학당귀인 (일간 기준)
  const hakdangGuinMap: { [key: string]: string } = {
    '갑': '亥', '을': '午', '병': '寅', '정': '酉', '무': '寅',
    '기': '酉', '경': '巳', '신': '子', '임': '申', '계': '卯'
  };

  // 태극귀인 (일간 기준)
  const taegeukGuinMap: { [key: string]: string[] } = {
    '갑': ['子', '亥'], '을': ['子', '亥'], '병': ['酉', '子'], '정': ['酉', '子'],
    '무': ['丑', '辰'], '기': ['丑', '辰'], '경': ['寅', '亥'], '신': ['寅', '亥'],
    '임': ['巳', '申'], '계': ['巳', '申']
  };

  // 홍염살 (일간 기준)
  const hongyeomMap: { [key: string]: string } = {
    '갑': '午', '을': '午', '병': '寅', '정': '未', '무': '辰',
    '기': '辰', '경': '戌', '신': '酉', '임': '子', '계': '申'
  };

  // 암록 (일간 기준 - 건록의 육합 지지)
  const amrokMap: { [key: string]: string } = {
    '갑': '亥', '을': '戌', '병': '申', '정': '未', '무': '申',
    '기': '未', '경': '巳', '신': '辰', '임': '寅', '계': '丑'
  };

  // 비인살 (일간 기준 - 양인의 충 지지)
  const biinMap: { [key: string]: string } = {
    '갑': '酉', '을': '戌', '병': '子', '정': '丑', '무': '子',
    '기': '丑', '경': '卯', '신': '辰', '임': '午', '계': '未'
  };

  const monthJi = pillars[2][1]; // 월지 (pillars는 [시,일,월,년] 순서이므로 index 2)
  const cheonDeokGuinStem = cheonDeokGuinByMonthJi[monthJi];
  const wolDeokGuinStem = wolDeokGuinByMonthGroup.find(g => g.branches.includes(monthJi))?.stem;

  const cheonEulGuin = cheonEulGuinMap[dayStemHangul] || [];
  const bokSeongGuin = bokSeongGuinMap[dayStemHangul] || [];
  const taegeukGuin = taegeukGuinMap[dayStemHangul] || [];

  pillars.forEach((pillar) => {
    const gan = pillar[0];
    const ji = pillar[1];
    const ganHangul = getHanjaToHangulChar(gan);
    const jiHangul = getHanjaToHangulChar(ji);

    if (cheonEulGuin.includes(ji)) guin['천을귀인'].push(`${ji}(${jiHangul})`);
    if (bokSeongGuin.includes(ji)) guin['복성귀인'].push(`${ji}(${jiHangul})`);
    if (taegeukGuin.includes(ji)) guin['태극귀인'].push(`${ji}(${jiHangul})`);
    if (cheonjuGuinMap[dayStemHangul] === ji) guin['천주귀인'].push(`${ji}(${jiHangul})`);
    if (munchangGuinMap[dayStemHangul] === ji) guin['문창귀인'].push(`${ji}(${jiHangul})`);
    if (hakdangGuinMap[dayStemHangul] === ji) guin['학당귀인'].push(`${ji}(${jiHangul})`);
    if (hongyeomMap[dayStemHangul] === ji) guin['홍염살'].push(`${ji}(${jiHangul})`);
    if (amrokMap[dayStemHangul] === ji) guin['암록'].push(`${ji}(${jiHangul})`);
    if (biinMap[dayStemHangul] === ji) guin['비인살'].push(`${ji}(${jiHangul})`);

    // 천덕귀인/월덕귀인은 사주 8글자(천간·지지) 어디에 있어도 인정한다
    if (cheonDeokGuinStem && (cheonDeokGuinStem === gan || cheonDeokGuinStem === ji)) {
      const label = cheonDeokGuinStem === gan ? `${gan}(${ganHangul})` : `${ji}(${jiHangul})`;
      guin['천덕귀인'].push(label);
    }
    if (wolDeokGuinStem && wolDeokGuinStem === gan) {
      guin['월덕귀인'].push(`${gan}(${ganHangul})`);
    }
  });

  return guin;
};

// 현침살 - 사주 8글자(천간·지지) 중 甲·辛·卯·午·申가 있으면 해당 글자마다 표시
const calculateHyeonchimSal = (pillars: string[]): string[] => {
  const HYEONCHIM_CHARS = ['甲', '辛', '卯', '午', '申'];
  const result: string[] = [];
  pillars.forEach((pillar) => {
    [pillar[0], pillar[1]].forEach((ch) => {
      if (HYEONCHIM_CHARS.includes(ch)) {
        result.push(`${ch}(${getHanjaToHangulChar(ch)})`);
      }
    });
  });
  return result;
};

// 괴강살 - 일주(日柱)가 庚辰·庚戌·壬辰·戊戌 중 하나면 해당
const calculateGwaegangSal = (dayGanji: string): boolean => {
  return ['庚辰', '庚戌', '壬辰', '戊戌'].includes(dayGanji);
};

// 12신살 - 년지/일지/월지 각각을 기준(삼합 그룹)으로 삼아, 시/일/월/년 4개 지지에 해당하는 신살을 구한다.
const TWELVE_SINSAL_GROUPS: { branches: string[]; gyeopsalStart: string }[] = [
  { branches: ['申', '子', '辰'], gyeopsalStart: '巳' },
  { branches: ['亥', '卯', '未'], gyeopsalStart: '申' },
  { branches: ['寅', '午', '戌'], gyeopsalStart: '亥' },
  { branches: ['巳', '酉', '丑'], gyeopsalStart: '寅' }
];
const TWELVE_SINSAL_ORDER = [
  '겁살', '재살', '천살', '지살', '년살', '월살',
  '망신살', '장성살', '반안살', '역마살', '육해살', '화개살'
];

const getTwelveSinsalMap = (referenceJi: string): { [ji: string]: string } => {
  const group = TWELVE_SINSAL_GROUPS.find(g => g.branches.includes(referenceJi));
  if (!group) return {};
  const startIdx = SIBIJI_HANJA.indexOf(group.gyeopsalStart as (typeof SIBIJI_HANJA)[number]);
  const map: { [ji: string]: string } = {};
  for (let i = 0; i < 12; i++) {
    const branch = SIBIJI_HANJA[(startIdx + i) % 12];
    map[branch] = TWELVE_SINSAL_ORDER[i];
  }
  return map;
};

// pillars: [시,일,월,년] 순
const calculateTwelveSinsal = (pillars: string[]): { [key: string]: { [pillar: string]: string } } => {
  const [timeJi, dayJi, monthJi, yearJi] = pillars.map(p => p[1]);
  const buildRow = (referenceJi: string) => {
    const map = getTwelveSinsalMap(referenceJi);
    return {
      time: map[timeJi] || '',
      day: map[dayJi] || '',
      month: map[monthJi] || '',
      year: map[yearJi] || ''
    };
  };
  return {
    byYear: buildRow(yearJi),
    byDay: buildRow(dayJi),
    byMonth: buildRow(monthJi)
  };
};

// 지지 관계 계산 (삼합, 반합, 육합, 삼형, 육충, 방합)
// 아래 그룹/쌍 테이블은 특정 사주 사례가 아니라 전통 명리학의 일반 정의이며,
// 사주의 4개 지지(시/일/월/년) 중 실제로 존재하는 것만 판정한다.
const calculateJijiRelations = (pillars: string[]): { [key: string]: string[] } => {
  const relations: { [key: string]: string[] } = {
    '삼합': [],
    '반합': [],
    '육합': [],
    '삼형': [],
    '육충': [],
    '방합': []
  };

  const jijiList = pillars.map(pillar => pillar[1]);
  const count = (ji: string) => jijiList.filter(j => j === ji).length;
  const hasAll = (group: string[]) => group.every(ji => jijiList.includes(ji));
  const hasAny = (group: string[]) => group.filter(ji => jijiList.includes(ji));

  // 삼합(三合) - 4국(局): 셋 다 있으면 삼합, 둘만 있으면 반합(半合)
  const samhapGroups: { group: string[]; name: string }[] = [
    { group: ['申', '子', '辰'], name: '수국' },
    { group: ['亥', '卯', '未'], name: '목국' },
    { group: ['寅', '午', '戌'], name: '화국' },
    { group: ['巳', '酉', '丑'], name: '금국' }
  ];
  samhapGroups.forEach(({ group, name }) => {
    if (hasAll(group)) {
      relations['삼합'].push(`${group.join('')}(${name})`);
    } else if (hasAny(group).length >= 2) {
      relations['반합'].push(`${hasAny(group).join('')}(${name} 반합)`);
    }
  });

  // 방합(方合) - 계절별 방위국: 동방목국/남방화국/서방금국/북방수국
  const banghapGroups: { group: string[]; name: string }[] = [
    { group: ['寅', '卯', '辰'], name: '동방목국' },
    { group: ['巳', '午', '未'], name: '남방화국' },
    { group: ['申', '酉', '戌'], name: '서방금국' },
    { group: ['亥', '子', '丑'], name: '북방수국' }
  ];
  banghapGroups.forEach(({ group, name }) => {
    if (hasAll(group)) {
      relations['방합'].push(`${group.join('')}(${name})`);
    }
  });

  // 육합(六合)
  const yukhapPairs = [
    ['子', '丑'], ['寅', '亥'], ['卯', '戌'], ['辰', '酉'],
    ['巳', '申'], ['午', '未']
  ];
  yukhapPairs.forEach(pair => {
    if (hasAll(pair)) {
      relations['육합'].push(pair.join(', '));
    }
  });

  // 육충(六沖)
  const yukchungPairs = [
    ['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'],
    ['辰', '戌'], ['巳', '亥']
  ];
  yukchungPairs.forEach(pair => {
    if (hasAll(pair)) {
      relations['육충'].push(pair.join(', '));
    }
  });

  // 삼형(三刑) - 무은지형/지세지형(3자 모두 필요), 무례지형(2자 쌍), 자형(같은 지지 2개 이상)
  if (hasAll(['寅', '巳', '申'])) relations['삼형'].push('寅巳申(무은지형)');
  if (hasAll(['丑', '戌', '未'])) relations['삼형'].push('丑戌未(지세지형)');
  if (hasAll(['子', '卯'])) relations['삼형'].push('子卯(무례지형)');
  ['辰', '午', '酉', '亥'].forEach(ji => {
    if (count(ji) >= 2) {
      relations['삼형'].push(`${ji}${ji}(자형)`);
    }
  });

  return relations;
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
    gender: input.gender,
    birthDate: dt
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
  
  // 귀인 계산 (기존 로직 유지 + 이번에 확장)
  const guin = calculateGuin(dayHanjaGanji[0], pillars);

  // 현침살 / 괴강살 / 12신살
  const hyeonchimSal = calculateHyeonchimSal(pillars);
  const gwaegangSal = calculateGwaegangSal(dayHanjaGanji);
  const twelveSinsal = calculateTwelveSinsal(pillars);

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
    jijiRelations,
    hyeonchimSal,
    gwaegangSal,
    twelveSinsal,
    birthDate: dt
  };
};


