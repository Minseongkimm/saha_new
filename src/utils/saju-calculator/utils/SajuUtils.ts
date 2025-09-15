/**
 * 사주 유틸리티 클래스 (TypeScript 버전)
 * 비결만세력 프로젝트에서 추출한 오행, 지지관계 등 계산 로직
 */

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
}
