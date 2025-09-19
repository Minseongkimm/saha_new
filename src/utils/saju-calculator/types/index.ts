/**
 * 사주 계산기 타입 정의
 */

// 기본 사주 정보
export interface SajuInfo {
  yearGanji: string;    // 년주 (예: "甲子")
  monthGanji: string;   // 월주 (예: "丙寅")
  dayGanji: string;     // 일주 (예: "戊辰")
  timeGanji: string;    // 시주 (예: "庚午")
  gender: number;       // 0: 남자, 1: 여자
  birthYear: number;    // 출생년도
}

// 사주 분석 결과
export interface SajuAnalysis {
  sinsal: { [key: string]: string[] };      // 신살 정보
  gongmang: string;                         // 공망
  daewoon: DaewoonInfo[];                   // 대운 리스트
  fiveProperties: { [key: string]: string }; // 오행 정보
  jijiAmjangan: { [key: string]: string };   // 지지암장간
  jijiRelations: { [key: string]: string[] }; // 지지 관계
}

// 대운 정보
export interface DaewoonInfo {
  age: number;        // 나이
  year: number;       // 년도
  ganji: string;      // 대운 간지
  gan: string;        // 천간
  ji: string;         // 지지
}

// 공망 상세 정보
export interface GongmangDetail {
  ganji: string;           // 일간지
  gongmang: string;        // 공망 지지
  description: string;     // 설명
  affected_jiji: string[]; // 영향받는 지지들
}

// 신살 타입
export enum SinsalType {
  YEAR = 'YEAR',
  MONTH = 'MONTH', 
  DAY = 'DAY',
  TIME = 'TIME'
}

// 오행 타입
export enum FiveElement {
  FIRE = 0,    // 화
  WATER = 1,   // 수
  WOOD = 2,    // 목
  METAL = 3,   // 금
  EARTH = 4,   // 토
  OTHER = 5    // 기타
}

// 양음 타입
export enum YinYang {
  YANG = 1,    // 양
  YIN = -1     // 음
}

// 성별 타입
export enum Gender {
  MALE = 0,    // 남자
  FEMALE = 1   // 여자
}

// 사주 요약 정보
export interface SajuSummary {
  ganji: string;        // 전체 사주
  gongmang: string;     // 공망
  sinsalCount: number;  // 신살 개수
  daewoonCount: number; // 대운 개수
  gender: string;       // 성별
  birthYear: number;    // 출생년도
}

// 오행 균형 정보
export interface FiveElementBalance {
  elementCount: { [key: string]: number }; // 오행별 개수
  maxElement: string;                      // 가장 많은 오행
  minElement: string;                      // 가장 적은 오행
  balance: string;                         // 균형 상태
  weakElements?: string[];                 // 부족한 오행들
  strongElements?: string[];               // 강한 오행들
}

// 대운 분석 결과
export interface DaewoonAnalysis {
  age: number;
  year: number;
  ganji: string;
  gan: string;
  ji: string;
  description: string;
  analysis: string;
}

// 신살 정보
export interface SinsalInfo {
  yearSinsal: string[];   // 년살
  monthSinsal: string[];  // 월살
  daySinsal: string[];    // 일살
}

// 오행 정보
export interface FiveElementInfo {
  yearProperty: string;    // 년주 오행
  monthProperty: string;   // 월주 오행
  dayProperty: string;     // 일주 오행
  timeProperty: string;    // 시주 오행
  yearNapeum: string;      // 년주 납음오행
  monthNapeum: string;     // 월주 납음오행
  dayNapeum: string;       // 일주 납음오행
  timeNapeum: string;      // 시주 납음오행
}

// 지지암장간 정보
export interface JijiAmjanganInfo {
  yearAmjangan: string;    // 년지 암장간
  monthAmjangan: string;   // 월지 암장간
  dayAmjangan: string;     // 일지 암장간
  timeAmjangan: string;    // 시지 암장간
}
