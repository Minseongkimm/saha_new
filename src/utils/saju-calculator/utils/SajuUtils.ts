import { FiveElement, YinYang } from '../types';

export class SajuUtils {
  static readonly SIBGAN_HANGUL = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
  static readonly SIBGAN_HANJA = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  static readonly SIBIJI_HANGUL = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
  static readonly SIBIJI_HANJA = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

  /**
   * 오행 속성 반환
   * @param c 천간 또는 지지
   * @return 0:화, 1:수, 2:목, 3:금, 4:토, 5:기타
   */
  static getProperty(c: string): FiveElement {
    switch (c) {
      case '丙': case '丁': case '巳': case '午': return FiveElement.FIRE; // 화
      case '壬': case '癸': case '子': case '亥': return FiveElement.WATER; // 수
      case '甲': case '乙': case '寅': case '卯': return FiveElement.WOOD; // 목
      case '庚': case '辛': case '申': case '酉': return FiveElement.METAL; // 금
      case '戊': case '己': case '丑': case '辰': case '未': case '戌': return FiveElement.EARTH; // 토
      default: return FiveElement.OTHER;
    }
  }

  /**
   * 오행 이름 반환
   * @param property 오행 속성
   * @return 오행 이름
   */
  static getPropertyName(property: FiveElement): string {
    const propertyNames = ['화', '수', '목', '금', '토', '기타'];
    return propertyNames[property] || '기타';
  }

  /**
   * 지지암장간 반환
   * @param ji 지지
   * @return 암장간 천간들
   */
  static getJijiAmJangan(ji: string): string {
    const amjanganMap: { [key: string]: string } = {
      '子': '壬癸',
      '丑': '癸辛己',
      '寅': '戊丙甲',
      '卯': '甲乙',
      '辰': '乙癸戊',
      '巳': '戊庚丙',
      '午': '丙己丁',
      '未': '丁己',
      '申': '戊壬庚',
      '酉': '庚辛',
      '戌': '辛丁戊',
      '亥': '戊甲壬'
    };
    return amjanganMap[ji] || '';
  }

  /**
   * 양음 판별
   * @param c 천간 또는 지지
   * @return 1: 양, -1: 음
   */
  static getSign(c: string): YinYang {
    const yangChars = '甲丙戊庚壬子寅辰午申戌';
    return yangChars.includes(c) ? YinYang.YANG : YinYang.YIN;
  }

  /**
   * 납음오행 반환
   * @param ganji 60갑자
   * @return 납음오행
   */
  static getFiveProperty(ganji: string): string {
    const fivePropertyMap: { [key: string]: string } = {
      "甲子": "海中金\n(해중금)",
      "乙丑": "海中金\n(해중금)",
      "甲戌": "山頭火\n(산두화)",
      "乙亥": "山頭火\n(산두화)",
      "甲申": "泉中水\n(천중수)",
      "乙酉": "泉中水\n(천중수)",
      "甲午": "砂中金\n(사중금)",
      "乙未": "砂中金\n(사중금)",
      "甲辰": "覆燈火\n(복등화)",
      "乙巳": "覆燈火\n(복등화)",
      "甲寅": "大溪水\n(대계수)",
      "乙卯": "大溪水\n(대계수)",
      "丙寅": "爐中火\n(노중화)",
      "丁卯": "爐中火\n(노중화)",
      "丙子": "澗下水\n(간하수)",
      "丁丑": "澗下水\n(간하수)",
      "丙戌": "屋上土\n(옥상토)",
      "丁亥": "屋上土\n(옥상토)",
      "丙申": "山下火\n(산하화)",
      "丁酉": "山下火\n(산하화)",
      "丙午": "天河水\n(천하수)",
      "丁未": "天河水\n(천하수)",
      "丙辰": "沙中土\n(사중토)",
      "丁巳": "沙中土\n(사중토)",
      "戊辰": "大林木\n(대림목)",
      "己巳": "大林木\n(대림목)",
      "戊寅": "城頭土\n(성두토)",
      "己卯": "城頭土\n(성두토)",
      "戊子": "霹靂火\n(벽력화)",
      "己丑": "霹靂火\n(벽력화)",
      "戊戌": "平地木\n(평지목)",
      "己亥": "平地木\n(평지목)",
      "戊申": "大驛土\n(대역토)",
      "己酉": "大驛土\n(대역토)",
      "戊午": "天上火\n(천상화)",
      "己未": "天上火\n(천상화)",
      "庚午": "路傍土\n(노방토)",
      "辛未": "路傍土\n(노방토)",
      "庚辰": "白蠟金\n(백랍금)",
      "辛巳": "白蠟金\n(백랍금)",
      "庚寅": "松柏木\n(송백목)",
      "辛卯": "松柏木\n(송백목)",
      "庚子": "壁上土\n(벽상토)",
      "辛丑": "壁上土\n(벽상토)",
      "庚戌": "釵釧金\n(채천금)",
      "辛亥": "釵釧金\n(채천금)",
      "庚申": "石榴木\n(석류목)",
      "辛酉": "石榴木\n(석류목)",
      "壬申": "劍鋒金\n(검봉금)",
      "癸酉": "劍鋒金\n(검봉금)",
      "壬午": "楊柳木\n(양류목)",
      "癸未": "楊柳木\n(양류목)",
      "壬辰": "長流水\n(장류수)",
      "癸巳": "長流水\n(장류수)",
      "壬寅": "金箔金\n(금박금)",
      "癸卯": "金箔金\n(금박금)",
      "壬子": "桑柘木\n(상자목)",
      "癸丑": "桑柘木\n(상자목)",
      "壬戌": "大海水\n(대해수)",
      "癸亥": "大海水\n(대해수)"
    };
    return fivePropertyMap[ganji] || '';
  }

  /**
   * 한자에서 한글로 변환 (문자열)
   * @param hanja 한자 문자열
   * @return 한글 문자열
   */
  static getHanjaToHangulString(hanja: string): string {
    let result = '';
    for (const hanjaChar of hanja) {
      result += this.getHanjaToHangulChar(hanjaChar);
    }
    return result;
  }

  /**
   * 한자에서 한글로 변환 (단일 문자)
   * @param hanja 한자
   * @return 한글
   */
  static getHanjaToHangulChar(hanja: string): string {
    const hanjaSibganIndex = this.SIBIJI_HANJA.indexOf(hanja);
    if (hanjaSibganIndex !== -1) return this.SIBIJI_HANGUL[hanjaSibganIndex];
    const hanjaSibijiIndex = this.SIBGAN_HANJA.indexOf(hanja);
    if (hanjaSibijiIndex !== -1) return this.SIBGAN_HANGUL[hanjaSibijiIndex];
    return ' ';
  }

  /**
   * 한글에서 한자로 변환 (문자열)
   * @param hangul 한글 문자열
   * @return 한자 문자열
   */
  static getHangulToHanjaString(hangul: string): string {
    let result = '';
    for (const hangulChar of hangul) {
      result += this.getHangulToHanjaChar(hangulChar);
    }
    return result;
  }

  /**
   * 한글에서 한자로 변환 (단일 문자)
   * @param hangul 한글
   * @return 한자
   */
  static getHangulToHanjaChar(hangul: string): string {
    const hangulSibganIndex = this.SIBIJI_HANGUL.indexOf(hangul);
    if (hangulSibganIndex !== -1) return this.SIBIJI_HANJA[hangulSibganIndex];
    const hangulSibijiIndex = this.SIBGAN_HANGUL.indexOf(hangul);
    if (hangulSibijiIndex !== -1) return this.SIBGAN_HANJA[hangulSibijiIndex];
    return ' ';
  }

  /**
   * 오행 상생 관계 확인
   * @param from 오행1
   * @param to 오행2
   * @return 상생 여부
   */
  static isSangsaeng(from: FiveElement, to: FiveElement): boolean {
    const sangsaengMap: { [key: number]: FiveElement[] } = {
      [FiveElement.FIRE]: [FiveElement.EARTH], // 화 -> 토
      [FiveElement.WATER]: [FiveElement.WOOD], // 수 -> 목
      [FiveElement.WOOD]: [FiveElement.FIRE], // 목 -> 화
      [FiveElement.METAL]: [FiveElement.WATER], // 금 -> 수
      [FiveElement.EARTH]: [FiveElement.METAL]  // 토 -> 금
    };
    return sangsaengMap[from]?.includes(to) || false;
  }

  /**
   * 오행 상극 관계 확인
   * @param from 오행1
   * @param to 오행2
   * @return 상극 여부
   */
  static isSanggeuk(from: FiveElement, to: FiveElement): boolean {
    const sanggeukMap: { [key: number]: FiveElement[] } = {
      [FiveElement.FIRE]: [FiveElement.WATER], // 화 -> 수
      [FiveElement.WATER]: [FiveElement.EARTH], // 수 -> 토
      [FiveElement.WOOD]: [FiveElement.EARTH], // 목 -> 토
      [FiveElement.METAL]: [FiveElement.WOOD], // 금 -> 목
      [FiveElement.EARTH]: [FiveElement.WATER]  // 토 -> 수
    };
    return sanggeukMap[from]?.includes(to) || false;
  }

  /**
   * 간지 유효성 검사
   * @param ganji 간지
   * @return 유효성 여부
   */
  static isValidGanji(ganji: string): boolean {
    if (ganji.length !== 2) return false;
    const gan = ganji[0];
    const ji = ganji[1];
    return this.SIBGAN_HANJA.includes(gan) && this.SIBIJI_HANJA.includes(ji);
  }

  /**
   * 모든 간지 리스트 반환
   * @return 60갑자 리스트
   */
  static getAllGanji(): string[] {
    const ganjiList: string[] = [];
    this.SIBGAN_HANJA.forEach(gan => {
      this.SIBIJI_HANJA.forEach(ji => {
        ganjiList.push(gan + ji);
      });
    });
    return ganjiList;
  }

  /**
   * 오늘 날짜를 간지로 변환
   * @param date 날짜 (YYYY-MM-DD 형식)
   * @return 오늘의 간지 정보
   */
  static getTodayGanji(date: string): {
    yearGanji: string;
    monthGanji: string;
    dayGanji: string;
    timeGanji: string;
    yearHangul: string;
    monthHangul: string;
    dayHangul: string;
    timeHangul: string;
  } {
    const targetDate = new Date(date);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;
    const day = targetDate.getDate();
    const hour = targetDate.getHours();

    // 년주 계산
    const yearGanji = this.calcYearGanji(year);
    
    // 월주 계산
    const monthGanji = this.calcMonthGanji(year, month, yearGanji);
    
    // 일주 계산
    const dayGanji = this.calcDayGanji(year, month, day);
    
    // 시주 계산
    const timeGanji = this.calcTimeGanji(dayGanji, hour);

    return {
      yearGanji,
      monthGanji,
      dayGanji,
      timeGanji,
      yearHangul: this.getHanjaToHangulString(yearGanji),
      monthHangul: this.getHanjaToHangulString(monthGanji),
      dayHangul: this.getHanjaToHangulString(dayGanji),
      timeHangul: this.getHanjaToHangulString(timeGanji)
    };
  }

  /**
   * 년주 계산
   * @param year 년도
   * @return 년주 간지
   */
  private static calcYearGanji(year: number): string {
    const sibganForYear = ['庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁', '戊', '己'];
    const sibijiForYear = ['申', '酉', '戌', '亥', '子', '丑', '寅', '卯', '辰', '巳', '午', '未'];
    
    // 입춘 기준으로 년도 조정 (간단화: 2월 4일 기준)
    let targetYear = year;
    const currentDate = new Date(year, 1, 4); // 2월 4일
    const today = new Date();
    if (today < currentDate) {
      targetYear--;
    }
    
    const sibgan = sibganForYear[targetYear % 10];
    const sibiji = sibijiForYear[targetYear % 12];
    return sibgan + sibiji;
  }

  /**
   * 월주 계산
   * @param year 년도
   * @param month 월
   * @param yearGanji 년주 간지
   * @return 월주 간지
   */
  private static calcMonthGanji(year: number, month: number, yearGanji: string): string {
    const monthGanjiMap: { [key: string]: string[] } = {
      '甲': ['丙寅', '丁卯', '戊辰', '己巳', '庚午', '辛未', '壬申', '癸酉', '甲戌', '乙亥', '丙子', '丁丑'],
      '己': ['丙寅', '丁卯', '戊辰', '己巳', '庚午', '辛未', '壬申', '癸酉', '甲戌', '乙亥', '丙子', '丁丑'],
      '乙': ['戊寅', '己卯', '庚辰', '辛巳', '壬午', '癸未', '甲申', '乙酉', '丙戌', '丁亥', '戊子', '己丑'],
      '庚': ['戊寅', '己卯', '庚辰', '辛巳', '壬午', '癸未', '甲申', '乙酉', '丙戌', '丁亥', '戊子', '己丑'],
      '丙': ['庚寅', '辛卯', '壬辰', '癸巳', '甲午', '乙未', '丙申', '丁酉', '戊戌', '己亥', '庚子', '辛丑'],
      '辛': ['庚寅', '辛卯', '壬辰', '癸巳', '甲午', '乙未', '丙申', '丁酉', '戊戌', '己亥', '庚子', '辛丑'],
      '丁': ['壬寅', '癸卯', '甲辰', '乙巳', '丙午', '丁未', '戊申', '己酉', '庚戌', '辛亥', '壬子', '癸丑'],
      '壬': ['壬寅', '癸卯', '甲辰', '乙巳', '丙午', '丁未', '戊申', '己酉', '庚戌', '辛亥', '壬子', '癸丑'],
      '戊': ['甲寅', '乙卯', '丙辰', '丁巳', '戊午', '己未', '庚申', '辛酉', '壬戌', '癸亥', '甲子', '乙丑'],
      '癸': ['甲寅', '乙卯', '丙辰', '丁巳', '戊午', '己未', '庚申', '辛酉', '壬戌', '癸亥', '甲子', '乙丑']
    };

    const yearGan = yearGanji[0];
    const monthGanjiList = monthGanjiMap[yearGan] || monthGanjiMap['甲'];
    
    // 입춘 기준으로 월 조정 (간단화: 매월 6일 기준)
    let monthIndex = month - 1;
    const currentDate = new Date(year, month - 1, 6);
    const today = new Date();
    if (today < currentDate) {
      monthIndex--;
    }
    if (monthIndex < 0) monthIndex = 11;
    
    return monthGanjiList[monthIndex];
  }

  /**
   * 일주 계산
   * @param year 년도
   * @param month 월
   * @param day 일
   * @return 일주 간지
   */
  private static calcDayGanji(year: number, month: number, day: number): string {
    // 1900년 1월 1일을 기준으로 계산 (갑자일)
    const baseDate = new Date(1900, 0, 1); // 1900년 1월 1일
    const targetDate = new Date(year, month - 1, day);
    
    // 일수 차이 계산
    const diffTime = targetDate.getTime() - baseDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // 60갑자 순환 계산
    const sibganIndex = (diffDays + 0) % 10; // 갑자일 기준
    const sibijiIndex = (diffDays + 10) % 12; // 갑자일 기준
    
    return this.SIBGAN_HANJA[sibganIndex] + this.SIBIJI_HANJA[sibijiIndex];
  }

  /**
   * 시주 계산
   * @param dayGanji 일주 간지
   * @param hour 시간
   * @return 시주 간지
   */
  private static calcTimeGanji(dayGanji: string, hour: number): string {
    const ganjiForTime = [
      ['甲子', '乙丑', '丙寅', '丁卯', '戊辰', '己巳', '庚午', '辛未', '壬申', '癸酉', '甲戌', '乙亥'],
      ['丙子', '丁丑', '戊寅', '己卯', '庚辰', '辛巳', '壬午', '癸未', '甲申', '乙酉', '丙戌', '丁亥'],
      ['戊子', '己丑', '庚寅', '辛卯', '壬辰', '癸巳', '甲午', '乙未', '丙申', '丁酉', '戊戌', '己亥'],
      ['庚子', '辛丑', '壬寅', '癸卯', '甲辰', '乙巳', '丙午', '丁未', '戊申', '己酉', '庚戌', '辛亥'],
      ['壬子', '癸丑', '甲寅', '乙卯', '丙辰', '丁巳', '戊午', '己未', '庚申', '辛酉', '壬戌', '癸亥']
    ];

    const dayIdx = this.getDayIndex(dayGanji[0]);
    const timeIdx = this.getTimeIndex(hour);
    
    return ganjiForTime[dayIdx][timeIdx];
  }

  /**
   * 일간에 따른 인덱스 반환
   * @param dayGan 일간
   * @return 인덱스
   */
  private static getDayIndex(dayGan: string): number {
    switch (dayGan) {
      case '甲': case '己': return 0;
      case '乙': case '庚': return 1;
      case '丙': case '辛': return 2;
      case '丁': case '壬': return 3;
      case '戊': case '癸': return 4;
      default: return 0;
    }
  }

  /**
   * 시간에 따른 인덱스 반환
   * @param hour 시간
   * @return 인덱스
   */
  private static getTimeIndex(hour: number): number {
    if (hour >= 23 || hour < 1) return 0;      // 자시 (23-01)
    if (hour >= 1 && hour < 3) return 1;       // 축시 (01-03)
    if (hour >= 3 && hour < 5) return 2;       // 인시 (03-05)
    if (hour >= 5 && hour < 7) return 3;       // 묘시 (05-07)
    if (hour >= 7 && hour < 9) return 4;        // 진시 (07-09)
    if (hour >= 9 && hour < 11) return 5;      // 사시 (09-11)
    if (hour >= 11 && hour < 13) return 6;     // 오시 (11-13)
    if (hour >= 13 && hour < 15) return 7;    // 미시 (13-15)
    if (hour >= 15 && hour < 17) return 8;    // 신시 (15-17)
    if (hour >= 17 && hour < 19) return 9;    // 유시 (17-19)
    if (hour >= 19 && hour < 21) return 10;   // 술시 (19-21)
    if (hour >= 21 && hour < 23) return 11;   // 해시 (21-23)
    return 0;
  }
}
