export type ExpertCategory = 'residence' | 'love' | 'life' | 'wealth';

export interface BirthInfo {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  isTimeUnknown: boolean;
  isLunar: boolean;
  isLeapMonth: boolean;
  gender: 'male' | 'female';
  saju?: any; // 사주 계산 결과
}

export interface AIResponse {
  message: string;
  error?: string;
  isStreaming?: boolean;
  followUpQuestions?: string[];
}

export type StreamCallback = (chunk: string) => void;

export interface ChatContext {
  expertCategory: ExpertCategory;
  birthInfo: BirthInfo | null;
  recentMessages: string[];
}
