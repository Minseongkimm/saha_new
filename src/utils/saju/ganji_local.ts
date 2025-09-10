import { lunarToSolar } from "./manseryeok_local";


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

// 천간의 오행을 반환
const getHeavenlyStemElement = (stem: string): string => {
  const STEM_ELEMENTS: { [key: string]: string } = {
    '갑': '목', '을': '목',
    '병': '화', '정': '화',
    '무': '토', '기': '토',
    '경': '금', '신': '금',
    '임': '수', '계': '수'
  };
  return STEM_ELEMENTS[stem] || '';
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
  
  const branchHangul = getHanjaToHangulChar(branch);
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

// 십이운성 계산 (manseryeok 라이브러리 로직 포팅)
const calculateSibun = (dayStem: string, otherBranches: string[]): string[] => {
  // 일간을 기준으로 지지들과의 관계
  const dayStems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const twelveGods = ['亥', '子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌'];
  
  const dayIdx = dayStems.indexOf(dayStem);
  
  // 십이운성 테이블 (manseryeok의 getTwelveShootingStar 함수와 동일)
  const sibunTable = [
    ['생', '사', '절', '태', '절', '태', '병', '욕', '관', '왕'],
    ['욕', '병', '태', '절', '태', '절', '사', '생', '왕', '관'],
    ['대', '쇠', '양', '묘', '양', '묘', '묘', '양', '쇠', '대'],
    ['관', '왕', '생', '사', '생', '사', '절', '태', '병', '욕'],
    ['왕', '관', '욕', '병', '욕', '병', '태', '절', '사', '생'],
    ['쇠', '대', '대', '쇠', '대', '쇠', '양', '묘', '묘', '양'],
    ['병', '욕', '관', '왕', '관', '왕', '생', '사', '절', '태'],
    ['사', '생', '왕', '관', '왕', '관', '욕', '병', '태', '절'],
    ['묘', '양', '쇠', '대', '쇠', '대', '대', '쇠', '양', '묘'],
    ['절', '태', '병', '욕', '병', '욕', '관', '왕', '생', '사'],
    ['태', '절', '사', '생', '사', '생', '왕', '관', '욕', '병'],
    ['양', '묘', '묘', '양', '묘', '양', '쇠', '대', '대', '쇠']
  ];
  
  return otherBranches.map(branch => {
    const twelveGodIdx = twelveGods.indexOf(branch);
    if (twelveGodIdx >= 0 && dayIdx >= 0) {
      return sibunTable[twelveGodIdx][dayIdx];
    }
    return '묘';
  });
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
  
  return {
    yearHangulGanji: getHanjaToHangul(yearHanjaGanji),
    monthHangulGanji: getHanjaToHangul(monthHanjaGanji),
    dayHangulGanji: getHanjaToHangul(dayHanjaGanji),
    timeHangulGanji: getHanjaToHangul(timeHanjaGanji),
    stemSasin: sasinResult.stemSasin,
    branchSasin: sasinResult.branchSasin,
    sibun
  };
};


