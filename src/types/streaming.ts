// 스트리밍 설정 타입
export interface StreamingConfig {
  score?: {
    enabled: boolean;
    duration?: number;
    steps?: number;
  };
  text?: {
    enabled: boolean;
    chunkSize?: number;
    delay?: number;
    fields?: string[];
  };
  categories?: {
    enabled: boolean;
    delay?: number;
  };
  lists?: {
    enabled: boolean;
    delay?: number;
  };
  finalTransitionDelay?: number;
}

// 정통사주 데이터 타입
export interface TraditionalSajuData {
  overall: string;
  dayStem: string;
  fiveElements: string;
  sasin: string;
  sinsal: string;
  comprehensiveAdvice: string;
  generatedAt: string;
  llmModel: string;
}

// 오늘의 운세 데이터 타입
export interface TodayFortuneData {
  date: string;
  score: number;
  summary: string;
  explanation: string;
  categories?: {
    career: { score: number; description: string };
    love: { score: number; description: string };
    relationship: { score: number; description: string };
    wealth: { score: number; description: string };
  };
  doList: string[];
  dontList: string[];
  generatedAt: string;
  llmModel: string;
}

// 사주 데이터 타입
export interface SajuData {
  name: string;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: number;
  birthMinute: number;
  gender: string;
  calendarType: string;
  leapMonth: boolean;
  timeUnknown: boolean;
  calculatedSaju: any;
  pillars?: any;
  tenGods?: any;
  lifeStages?: any;
}
