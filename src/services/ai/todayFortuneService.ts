import { ChatOpenAI } from "@langchain/openai";
import { getTodayFortunePrompt } from './prompts';
import { AI_CONFIG, ERROR_MESSAGES } from './config';
import { OPENAI_API_KEY } from '../../config/env';
import { supabase } from '../../utils/supabaseClient';

export interface TodayFortuneData {
  score: number; // 1-100 점수
  summary: string; // 한마디 요약
  explanation: string; // 사주 전문적 설명
  doList: string[]; // 해야할 것들
  dontList: string[]; // 하지말아야 할 것들
  generatedAt: string;
  date: string; // YYYY-MM-DD 형식
  llmModel: string;
}

class TodayFortuneService {
  private static instance: TodayFortuneService;
  private chatModel: ChatOpenAI;

  private constructor() {
    this.chatModel = new ChatOpenAI({
      apiKey: OPENAI_API_KEY,
      modelName: AI_CONFIG.TODAY_FORTUNE_MODEL,
      temperature: AI_CONFIG.TEMPERATURE,
      maxTokens: 1000,
    });
  }

  public static getInstance(): TodayFortuneService {
    if (!TodayFortuneService.instance) {
      TodayFortuneService.instance = new TodayFortuneService();
    }
    return TodayFortuneService.instance;
  }

  /**
   * 오늘의 운세 생성
   */
  public async generateTodayFortune(
    userId: string, 
    sajuData: any
  ): Promise<TodayFortuneData> {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const prompt = getTodayFortunePrompt(sajuData, today);
      
      const result = await Promise.race([
        this.chatModel.invoke([
          { 
            role: 'system', 
            content: '당신은 전문 사주명리학자입니다. 정확하고 실용적인 오늘의 운세를 제공해주세요.' 
          },
          { 
            role: 'user', 
            content: prompt 
          }
        ]),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(ERROR_MESSAGES.RESPONSE_TIMEOUT)), 
          AI_CONFIG.RESPONSE_TIMEOUT)
        )
      ]) as any;

      const content = (result && (result as any).content) ?? '';
      const responseText = Array.isArray(content)
        ? content.map((c: any) => (typeof c === 'string' ? c : c.text ?? '')).join('')
        : String(content);

      if (!responseText.trim()) {
        throw new Error('LLM 응답이 비어있습니다.');
      }

      // 응답을 구조화된 데이터로 파싱
      const fortuneData = this.parseFortuneResponse(responseText, today);
      
      return fortuneData;

    } catch (error) {
      console.error('오늘의 운세 생성 실패:', error);
      throw error;
    }
  }

  /**
   * LLM 응답을 구조화된 데이터로 파싱
   */
  private parseFortuneResponse(response: string, date: string): TodayFortuneData {
    try {
      // JSON 형태로 응답을 파싱
      const lines = response.split('\n').filter(line => line.trim());
      
      let score = 75; // 기본값
      let summary = '오늘은 평범한 하루입니다.';
      let explanation = '사주상 특별한 변화는 없습니다.';
      let doList: string[] = [];
      let dontList: string[] = [];

      // 점수 추출 (1-100)
      const scoreMatch = response.match(/점수[:\s]*(\d+)/);
      if (scoreMatch) {
        score = Math.max(1, Math.min(100, parseInt(scoreMatch[1])));
      }

      // 요약 추출
      const summaryMatch = response.match(/요약[:\s]*["']?([^"'\n]+)["']?/);
      if (summaryMatch) {
        summary = summaryMatch[1].trim();
      }

      // 설명 추출
      const explanationMatch = response.match(/설명[:\s]*([^해야할|하지말아야할]+)/);
      if (explanationMatch) {
        explanation = explanationMatch[1].trim();
      }

      // 해야할 것들 추출
      const doMatch = response.match(/해야할[:\s]*([^하지말아야할]+)/);
      if (doMatch) {
        doList = doMatch[1].split(/[•\-\*]/)
          .map(item => item.trim())
          .filter(item => item.length > 0);
      }

      // 하지말아야 할 것들 추출
      const dontMatch = response.match(/하지말아야할[:\s]*([^점수|요약|설명]+)/);
      if (dontMatch) {
        dontList = dontMatch[1].split(/[•\-\*]/)
          .map(item => item.trim())
          .filter(item => item.length > 0);
      }

      return {
        score,
        summary,
        explanation,
        doList,
        dontList,
        generatedAt: new Date().toISOString(),
        date,
        llmModel: AI_CONFIG.MODEL_NAME
      };

    } catch (error) {
      console.error('운세 응답 파싱 실패:', error);
      // 기본값 반환
      return {
        score: 75,
        summary: '오늘은 평범한 하루입니다.',
        explanation: '사주상 특별한 변화는 없습니다.',
        doList: ['긍정적인 마음가짐을 유지하세요'],
        dontList: ['성급한 판단을 피하세요'],
        generatedAt: new Date().toISOString(),
        date,
        llmModel: AI_CONFIG.MODEL_NAME
      };
    }
  }

  /**
   * 오늘의 운세를 DB에 저장
   */
  public async saveTodayFortuneToDatabase(
    userId: string, 
    fortuneData: TodayFortuneData
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('today_fortunes')
        .insert({
          user_id: userId,
          date: fortuneData.date,
          score: fortuneData.score,
          summary: fortuneData.summary,
          explanation: fortuneData.explanation,
          do_list: fortuneData.doList,
          dont_list: fortuneData.dontList,
          generated_at: fortuneData.generatedAt,
          llm_model: fortuneData.llmModel
        });

      if (error) {
        console.error('오늘의 운세 DB 저장 실패:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('오늘의 운세 DB 저장 중 오류:', error);
      return false;
    }
  }
}

export const todayFortuneService = TodayFortuneService.getInstance();
