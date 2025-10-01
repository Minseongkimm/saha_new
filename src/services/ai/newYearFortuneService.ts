/**
 * 신년운세 AI 서비스
 * 계산된 신년운세 데이터를 LLM을 통해 자연어로 해석
 */

import { ChatOpenAI } from '@langchain/openai';
import { OPENAI_API_KEY } from '../../config/env';
import { supabase } from '../../utils/supabaseClient';
import { 
  NewYearFortuneCalculator, 
  NewYearFortuneResult,
  UserSajuData 
} from '../../utils/newYearFortuneCalculator';
import { getNewYearFortunePrompt } from './prompts';

export interface NewYearFortuneData {
  year: number;
  yearName: string;
  yearDescription: string;
  overall: string;
  categories: {
    love: string;
    wealth: string;
    health: string;
    career: string;
  };
  luckyMonths: Array<{
    month: number;
    advice: string;
  }>;
  cautiousMonths: Array<{
    month: number;
    advice: string;
  }>;
  yearGanji: {
    yearGanji: string;
    element: string;
    animal: string;
  };
  generatedAt: string;
  llmModel: string;
}

class NewYearFortuneService {
  private static instance: NewYearFortuneService;
  private calculator: NewYearFortuneCalculator;

  private constructor() {
    this.calculator = new NewYearFortuneCalculator();
  }

  public static getInstance(): NewYearFortuneService {
    if (!NewYearFortuneService.instance) {
      NewYearFortuneService.instance = new NewYearFortuneService();
    }
    return NewYearFortuneService.instance;
  }

  /**
   * 신년운세 생성 메인 메서드
   */
  public async generateNewYearFortune(
    userId: string,
    sajuData: any,
    targetYear: number
  ): Promise<NewYearFortuneData> {
    try {
      // 1. 사주 데이터를 UserSajuData 형식으로 변환
      const userSajuData: UserSajuData = {
        yearGanji: sajuData.yearHanjaGanji,
        monthGanji: sajuData.monthHanjaGanji,
        dayGanji: sajuData.dayHanjaGanji,
        timeGanji: sajuData.timeHanjaGanji,
        sinsal: sajuData.sinsal || {},
        guin: sajuData.guin || {},
        jijiRelations: sajuData.jijiRelations || {},
        fiveProperties: sajuData.fiveProperties || {},
        daewoon: sajuData.daewoon || [],
        birthYear: sajuData.birthYear || new Date().getFullYear() - 30,
      };

      // 2. 기본 계산 수행
      const calculatedResult = this.calculator.calculateNewYearFortune(userSajuData, targetYear);

      // 3. LLM을 통한 자연어 해석 생성
      const fortuneData = await this.enhanceWithAI(calculatedResult, sajuData, targetYear);

      // 4. DB 저장
      await this.saveToDatabase(userId, fortuneData);

      return fortuneData;
    } catch (error) {
      console.error('신년운세 생성 오류:', error);
      throw error;
    }
  }

  /**
   * LLM을 통한 자연어 해석 생성
   */
  private async enhanceWithAI(
    calculatedResult: NewYearFortuneResult,
    sajuData: any,
    targetYear: number
  ): Promise<NewYearFortuneData> {
    const chatModel = new ChatOpenAI({
      apiKey: OPENAI_API_KEY,
      modelName: 'gpt-4o-mini',
      temperature: 0.7,
    });

    const prompt = this.buildPrompt(calculatedResult, sajuData, targetYear);

    try {
      const response = await chatModel.invoke(prompt);
      const content = response.content as string;
      
      // JSON 파싱
      const parsed = this.parseResponse(content);

      return {
        year: calculatedResult.year,
        yearName: calculatedResult.yearName,
        yearDescription: calculatedResult.yearDescription,
        yearGanji: calculatedResult.yearGanji,
        overall: parsed.overall,
        categories: parsed.categories,
        luckyMonths: parsed.luckyMonths,
        cautiousMonths: parsed.cautiousMonths,
        generatedAt: new Date().toISOString(),
        llmModel: 'gpt-4o-mini',
      };
    } catch (error) {
      console.error('LLM 응답 오류:', error);
      throw error;
    }
  }

  /**
   * LLM 프롬프트 생성 (prompts.ts 사용)
   */
  private buildPrompt(
    result: NewYearFortuneResult,
    sajuData: any,
    targetYear: number
  ): string {
    return getNewYearFortunePrompt(result, sajuData, targetYear);
  }

  /**
   * LLM 응답 파싱
   */
  private parseResponse(response: string): {
    overall: string;
    categories: {
      love: string;
      wealth: string;
      health: string;
      career: string;
    };
    luckyMonths: Array<{ month: number; advice: string }>;
    cautiousMonths: Array<{ month: number; advice: string }>;
  } {
    try {
      // JSON 코드 블록 추출
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || response.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : response;
      
      const parsed = JSON.parse(jsonString);
      
      return {
        overall: parsed.overall || '운세 정보를 생성하는 중 오류가 발생했습니다.',
        categories: {
          love: parsed.categories?.love || '연애운 정보가 없습니다.',
          wealth: parsed.categories?.wealth || '재물운 정보가 없습니다.',
          health: parsed.categories?.health || '건강운 정보가 없습니다.',
          career: parsed.categories?.career || '직장운 정보가 없습니다.',
        },
        luckyMonths: parsed.luckyMonths || [],
        cautiousMonths: parsed.cautiousMonths || [],
      };
    } catch (error) {
      console.error('JSON 파싱 오류:', error);
      throw new Error('LLM 응답을 파싱할 수 없습니다.');
    }
  }

  /**
   * DB 저장
   */
  private async saveToDatabase(userId: string, data: NewYearFortuneData): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('newyear_fortunes')
        .upsert({
          user_id: userId,
          year: data.year,
          fortune_data: data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,year'
        });

      if (error) {
        console.error('DB 저장 오류:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('DB 저장 중 예외 발생:', error);
      return false;
    }
  }

  /**
   * DB에서 신년운세 조회
   */
  public async getFromDatabase(userId: string, year: number): Promise<NewYearFortuneData | null> {
    try {
      const { data, error } = await supabase
        .from('newyear_fortunes')
        .select('fortune_data')
        .eq('user_id', userId)
        .eq('year', year)
        .single();

      if (error || !data) {
        return null;
      }

      return data.fortune_data as NewYearFortuneData;
    } catch (error) {
      console.error('DB 조회 오류:', error);
      return null;
    }
  }
}

export default NewYearFortuneService.getInstance();

