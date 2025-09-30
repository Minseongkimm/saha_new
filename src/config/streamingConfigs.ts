import { StreamingConfig, TraditionalSajuData, TodayFortuneData } from '../types/streaming';

// 정통사주 초기 데이터
export const initialTraditionalSajuData: TraditionalSajuData = {
  overall: "",
  dayStem: "",
  fiveElements: "",
  sasin: "",
  sinsal: "",
  comprehensiveAdvice: "",
  generatedAt: "",
  llmModel: ""
};

// 오늘의 운세 초기 데이터
export const initialTodayFortuneData: TodayFortuneData = {
  date: "",
  score: 0,
  summary: "",
  explanation: "",
  categories: {
    career: { score: 0, description: "" },
    love: { score: 0, description: "" },
    relationship: { score: 0, description: "" },
    wealth: { score: 0, description: "" }
  },
  doList: [],
  dontList: [],
  generatedAt: "",
  llmModel: ""
};

// 정통사주 스트리밍 설정
export const traditionalSajuStreamingConfig: StreamingConfig = {
  score: { enabled: false },
  text: {
    enabled: true,
    chunkSize: 15,
    delay: 60,
    fields: ['overall', 'dayStem', 'fiveElements', 'sasin', 'sinsal', 'comprehensiveAdvice']
  },
  categories: { enabled: false },
  lists: { enabled: false },
  finalTransitionDelay: 2000
};

// 오늘의 운세 스트리밍 설정
export const todayFortuneStreamingConfig: StreamingConfig = {
  score: { enabled: true, duration: 50, steps: 20 },
  text: {
    enabled: true,
    chunkSize: 12,
    delay: 50,
    fields: ['summary', 'explanation']
  },
  categories: { enabled: true, delay: 200 },
  lists: { enabled: true, delay: 200 },
  finalTransitionDelay: 2000
};
