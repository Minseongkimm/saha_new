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
  summary: string;
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
   * 신년운세 계산만 수행 (LLM 없이)
   * Edge Function에서 사용하기 위한 public 메서드
   */
  public calculateNewYearFortuneOnly(
    sajuData: any,
    targetYear: number
  ): NewYearFortuneResult {
    const userSajuData = this.convertToUserSajuData(sajuData);
    return this.calculator.calculateNewYearFortune(userSajuData, targetYear);
  }

  /**
   * 사주 데이터를 UserSajuData 형식으로 변환 (재사용 가능)
   */
  private convertToUserSajuData(sajuData: any): UserSajuData {
    const convertHangulToHanja = (hangulGanji: string): string => {
      if (!hangulGanji || hangulGanji.length < 2) return '';
      
      const heavenlyStems: { [key: string]: string } = {
        '갑': '甲', '을': '乙', '병': '丙', '정': '丁', '무': '戊', 
        '기': '己', '경': '庚', '신': '辛', '임': '壬', '계': '癸'
      };
      
      const earthlyBranches: { [key: string]: string } = {
        '자': '子', '축': '丑', '인': '寅', '묘': '卯', '진': '辰', 
        '사': '巳', '오': '午', '미': '未', '신': '申', '유': '酉', 
        '술': '戌', '해': '亥'
      };
      
      const heavenly = heavenlyStems[hangulGanji[0]] || '';
      const earthly = earthlyBranches[hangulGanji[1]] || '';
      
      return heavenly + earthly;
    };

    const calculatedSaju = sajuData.calculatedSaju || sajuData;
    
    return {
      yearGanji: convertHangulToHanja(calculatedSaju.yearHangulGanji || ''),
      monthGanji: convertHangulToHanja(calculatedSaju.monthHangulGanji || ''),
      dayGanji: convertHangulToHanja(calculatedSaju.dayHangulGanji || ''),
      timeGanji: convertHangulToHanja(calculatedSaju.timeHangulGanji || ''),
      sinsal: calculatedSaju.sinsal || {},
      guin: calculatedSaju.guin || {},
      jijiRelations: calculatedSaju.jijiRelations || {},
      fiveProperties: calculatedSaju.fiveProperties || {},
      daewoon: calculatedSaju.daewoon || [],
      birthYear: sajuData.birthYear || new Date().getFullYear() - 30,
    };
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
      const userSajuData = this.convertToUserSajuData(sajuData);

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
        summary: parsed.summary,
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
    summary: string;
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
        summary: parsed.summary || '한 해의 운세를 준비하세요',
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
   * DB 저장 (saju_analyses 테이블의 new_year_fortune 컬럼)
   * Edge Function에서도 사용할 수 있도록 public으로 변경
   */
  public async saveToDatabase(userId: string, data: NewYearFortuneData): Promise<boolean> {
    try {
      // 먼저 기존 데이터가 있는지 확인
      const { data: existingData, error: selectError } = await supabase
        .from('saju_analyses')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        console.error('기존 데이터 조회 오류:', selectError);
        return false;
      }

      if (existingData) {
        // 기존 데이터가 있으면 업데이트
        const { error: updateError } = await supabase
          .from('saju_analyses')
          .update({
            new_year_fortune: data,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (updateError) {
          console.error('DB 업데이트 오류:', updateError);
          return false;
        }
      } else {
        // 기존 데이터가 없으면 새로 삽입
        const { error: insertError } = await supabase
          .from('saju_analyses')
          .insert({
            user_id: userId,
            new_year_fortune: data,
            updated_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error('DB 삽입 오류:', insertError);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('DB 저장 중 예외 발생:', error);
      return false;
    }
  }

  /**
   * DB에서 신년운세 조회 (saju_analyses 테이블의 new_year_fortune 컬럼)
   */
  public async getFromDatabase(userId: string, year: number): Promise<NewYearFortuneData | null> {
    try {
      const { data, error } = await supabase
        .from('saju_analyses')
        .select('new_year_fortune')
        .eq('user_id', userId)
        .single();

      if (error || !data || !data.new_year_fortune) {
        return null;
      }

      // 연도가 일치하는지 확인
      const fortuneData = data.new_year_fortune as NewYearFortuneData;
      if (fortuneData.year !== year) {
        return null;
      }

      return fortuneData;
    } catch (error) {
      console.error('DB 조회 오류:', error);
      return null;
    }
  }
}

export default NewYearFortuneService.getInstance();

