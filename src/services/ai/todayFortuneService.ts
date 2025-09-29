import { ChatOpenAI } from "@langchain/openai";
import { getTodayFortunePrompt } from './prompts';
import { AI_CONFIG, ERROR_MESSAGES } from './config';
import { OPENAI_API_KEY } from '../../config/env';
import { supabase } from '../../utils/supabaseClient';
import { todayFortuneCalculator, TodayFortuneResult } from '../../utils/todayFortuneCalculator';

export interface TodayFortuneData {
  score: number; // 1-100 점수
  summary: string; // 한마디 요약
  explanation: string; // 사주 전문적 설명
  doList: string[]; // 해야할 것들
  dontList: string[]; // 하지말아야 할 것들
  categories?: { // 카테고리별 운세 정보
    career: { score: number; description: string };
    love: { score: number; description: string };
    wealth: { score: number; description: string };
    relationship: { score: number; description: string };
  };
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
      
      // 1. TodayFortuneCalculator로 운세 계산
      const calculatedFortune = todayFortuneCalculator.calculateTodayFortune(sajuData, today);
      
      // 2. 계산된 데이터를 LLM에 전달하여 텍스트 생성
      const aiEnhancedFortune = await this.enhanceWithAI(calculatedFortune, sajuData, today);
      
      return aiEnhancedFortune;

    } catch (error) {
      console.error('오늘의 운세 생성 실패:', error);
      throw error;
    }
  }

  /**
   * 계산된 운세 데이터를 LLM으로 보강
   */
  private async enhanceWithAI(
    calculatedFortune: TodayFortuneResult, 
    sajuData: any, 
    today: string
  ): Promise<TodayFortuneData> {
    try {
      // 계산된 데이터를 LLM이 이해하기 쉬운 형태로 변환
      const fortuneContext = this.formatFortuneContext(calculatedFortune, sajuData, today);
      
      const result = await Promise.race([
        this.chatModel.invoke([
          { 
            role: 'system', 
            content: '당신은 전문 사주명리학자입니다. 계산된 운세 데이터를 바탕으로 더 자세하고 실용적인 조언을 제공해주세요.' 
          },
          { 
            role: 'user', 
            content: fortuneContext 
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
        // AI 응답이 없으면 계산된 데이터 반환
        return this.createFortuneDataFromCalculation(calculatedFortune, today);
      }

      // AI 응답을 파싱하여 계산된 데이터와 결합
      const aiData = this.parseFortuneResponse(responseText, today);
      
      return {
        // 계산된 값들 (그대로 사용)
        score: calculatedFortune.totalScore,
        generatedAt: new Date().toISOString(),
        date: today,
        llmModel: AI_CONFIG.MODEL_NAME,
        
        // LLM이 생성한 값들
        summary: aiData.summary || this.generateSummaryFromScore(calculatedFortune.totalScore),
        explanation: aiData.explanation || this.generateExplanationFromCalculation(calculatedFortune),
        doList: (aiData.doList && aiData.doList.length > 0) ? aiData.doList : this.generateDoListFromCalculation(calculatedFortune),
        dontList: (aiData.dontList && aiData.dontList.length > 0) ? aiData.dontList : this.generateDontListFromCalculation(calculatedFortune),
        
        // 카테고리별: 점수는 계산값, 설명은 LLM 생성값
        categories: {
          career: { 
            score: calculatedFortune.categoryScores.career, 
            description: aiData.categories?.career || this.generateCategoryDescription('직업운', calculatedFortune.categoryScores.career)
          },
          love: { 
            score: calculatedFortune.categoryScores.love, 
            description: aiData.categories?.love || this.generateCategoryDescription('연애운', calculatedFortune.categoryScores.love)
          },
          wealth: { 
            score: calculatedFortune.categoryScores.wealth, 
            description: aiData.categories?.wealth || this.generateCategoryDescription('재물운', calculatedFortune.categoryScores.wealth)
          },
          relationship: { 
            score: calculatedFortune.categoryScores.relationship, 
            description: aiData.categories?.relationship || this.generateCategoryDescription('인간관계', calculatedFortune.categoryScores.relationship)
          }
        }
      };

    } catch (error) {
      console.error('AI 보강 실패, 계산된 데이터 반환:', error);
      // AI 보강 실패 시 계산된 데이터 반환
      return this.createFortuneDataFromCalculation(calculatedFortune, today);
    }
  }

  /**
   * 계산된 운세 데이터를 LLM 컨텍스트로 변환
   */
  private formatFortuneContext(calculatedFortune: TodayFortuneResult, sajuData: any, today: string): string {
    return getTodayFortunePrompt(calculatedFortune, sajuData, today);
  }

  /**
   * 계산된 데이터로 기본 운세 데이터 생성
   */
  private createFortuneDataFromCalculation(calculatedFortune: TodayFortuneResult, today: string): TodayFortuneData {
    return {
      score: calculatedFortune.totalScore,
      summary: this.generateSummaryFromScore(calculatedFortune.totalScore),
      explanation: this.generateExplanationFromCalculation(calculatedFortune),
      doList: this.generateDoListFromCalculation(calculatedFortune),
      dontList: this.generateDontListFromCalculation(calculatedFortune),
      categories: {
        career: { 
          score: calculatedFortune.categoryScores.career, 
          description: this.generateCategoryDescription('직업운', calculatedFortune.categoryScores.career) 
        },
        love: { 
          score: calculatedFortune.categoryScores.love, 
          description: this.generateCategoryDescription('연애운', calculatedFortune.categoryScores.love) 
        },
        wealth: { 
          score: calculatedFortune.categoryScores.wealth, 
          description: this.generateCategoryDescription('재물운', calculatedFortune.categoryScores.wealth) 
        },
        relationship: { 
          score: calculatedFortune.categoryScores.relationship, 
          description: this.generateCategoryDescription('인간관계', calculatedFortune.categoryScores.relationship) 
        }
      },
      generatedAt: new Date().toISOString(),
      date: today,
      llmModel: AI_CONFIG.MODEL_NAME
    };
  }

  /**
   * LLM 응답을 구조화된 데이터로 파싱 (LLM 생성 부분만)
   */
  private parseFortuneResponse(response: string, date: string): {
    summary?: string;
    explanation?: string;
    categories?: {
      career?: string;
      love?: string;
      wealth?: string;
      relationship?: string;
    };
    doList?: string[];
    dontList?: string[];
  } {
    try {
      // JSON 파싱 시도
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonData = JSON.parse(jsonMatch[0]);
        return {
          summary: jsonData.summary,
          explanation: jsonData.explanation,
          categories: jsonData.categories,
          doList: jsonData.doList,
          dontList: jsonData.dontList
        };
      }

      // JSON 파싱 실패 시 텍스트 파싱
      let summary = '';
      let explanation = '';
      let categories: any = {};
      let doList: string[] = [];
      let dontList: string[] = [];

      // 요약 추출
      const summaryMatch = response.match(/summary[:\s]*["']?([^"'\n]+)["']?/i);
      if (summaryMatch) {
        summary = summaryMatch[1].trim();
      }

      // 설명 추출
      const explanationMatch = response.match(/explanation[:\s]*["']?([^"'\n]+)["']?/i);
      if (explanationMatch) {
        explanation = explanationMatch[1].trim();
      }

      // 카테고리별 설명 추출
      const careerMatch = response.match(/career[:\s]*["']?([^"'\n]+)["']?/i);
      if (careerMatch) {
        categories.career = careerMatch[1].trim();
      }

      const loveMatch = response.match(/love[:\s]*["']?([^"'\n]+)["']?/i);
      if (loveMatch) {
        categories.love = loveMatch[1].trim();
      }

      const wealthMatch = response.match(/wealth[:\s]*["']?([^"'\n]+)["']?/i);
      if (wealthMatch) {
        categories.wealth = wealthMatch[1].trim();
      }

      const relationshipMatch = response.match(/relationship[:\s]*["']?([^"'\n]+)["']?/i);
      if (relationshipMatch) {
        categories.relationship = relationshipMatch[1].trim();
      }

      // 해야할 것들 추출
      const doMatch = response.match(/doList[:\s]*\[([^\]]+)\]/i);
      if (doMatch) {
        doList = doMatch[1].split(',')
          .map(item => item.trim().replace(/["']/g, ''))
          .filter(item => item.length > 0);
      }

      // 하지말아야 할 것들 추출
      const dontMatch = response.match(/dontList[:\s]*\[([^\]]+)\]/i);
      if (dontMatch) {
        dontList = dontMatch[1].split(',')
          .map(item => item.trim().replace(/["']/g, ''))
          .filter(item => item.length > 0);
      }

      return {
        summary,
        explanation,
        categories,
        doList,
        dontList
      };

    } catch (error) {
      console.error('운세 응답 파싱 실패:', error);
      // 기본값 반환
      return {
        summary: '오늘은 평범한 하루입니다.',
        explanation: '사주상 특별한 변화는 없습니다.',
        categories: {},
        doList: ['긍정적인 마음가짐을 유지하세요'],
        dontList: ['성급한 판단을 피하세요']
      };
    }
  }

  /**
   * 오늘의 운세를 saju_analyses 테이블에 저장
   * daily_fortune 필드에 JSON으로 저장
   */
  public async saveTodayFortuneToDatabase(
    userId: string, 
    birthInfoId: string,
    fortuneData: TodayFortuneData
  ): Promise<boolean> {
    try {
      // 1. 기존 saju_analyses 레코드 확인
      const { data: existingAnalysis, error: fetchError } = await supabase
        .from('saju_analyses')
        .select('id, daily_fortune')
        .eq('user_id', userId)
        .eq('birth_info_id', birthInfoId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('saju_analyses 조회 실패:', fetchError);
        return false;
      }

      // 2. daily_fortune JSON 구조 생성
      const dailyFortuneJson = {
        date: fortuneData.date,
        score: fortuneData.score,
        summary: fortuneData.summary,
        explanation: fortuneData.explanation,
        doList: fortuneData.doList,
        dontList: fortuneData.dontList,
        categories: fortuneData.categories,
        generatedAt: fortuneData.generatedAt,
        llmModel: fortuneData.llmModel
      };

      if (existingAnalysis) {
        // 3-1. 기존 레코드가 있으면 daily_fortune 업데이트
        const { error: updateError } = await supabase
          .from('saju_analyses')
          .update({
            daily_fortune: dailyFortuneJson,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('birth_info_id', birthInfoId);

        if (updateError) {
          console.error('daily_fortune 업데이트 실패:', updateError);
          return false;
        }
      } else {
        // 3-2. 기존 레코드가 없으면 새로 생성
        const { error: insertError } = await supabase
          .from('saju_analyses')
          .insert({
            user_id: userId,
            birth_info_id: birthInfoId,
            daily_fortune: dailyFortuneJson,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('saju_analyses 생성 실패:', insertError);
          return false;
        }
      }

      return true;

    } catch (error) {
      console.error('daily_fortune 저장 중 오류:', error);
      return false;
    }
  }

  // 헬퍼 메서드들
  private generateSummaryFromScore(score: number): string {
    if (score >= 80) return '매우 좋은 하루가 될 것 같습니다.';
    if (score >= 60) return '좋은 하루가 되겠습니다.';
    if (score >= 40) return '보통의 하루가 될 것 같습니다.';
    return '조심스러운 하루가 될 것 같습니다.';
  }

  private generateExplanationFromCalculation(calculatedFortune: TodayFortuneResult): string {
    const { totalScore, interactions } = calculatedFortune;
    let explanation = `오늘의 운세는 ${totalScore}점으로 `;
    
    if (totalScore >= 80) explanation += '매우 좋은 편입니다.';
    else if (totalScore >= 60) explanation += '좋은 편입니다.';
    else if (totalScore >= 40) explanation += '보통입니다.';
    else explanation += '주의가 필요합니다.';

    if (interactions.ganInteraction.score !== 0) {
      explanation += ` 천간 상호작용은 ${interactions.ganInteraction.type} 관계입니다.`;
    }
    if (interactions.jiInteraction.score !== 0) {
      explanation += ` 지지 상호작용은 ${interactions.jiInteraction.type} 관계입니다.`;
    }

    return explanation;
  }

  private generateDoListFromCalculation(calculatedFortune: TodayFortuneResult): string[] {
    const doList: string[] = [];
    
    if (calculatedFortune.totalScore >= 70) {
      doList.push('적극적인 행동을 취하세요');
      doList.push('새로운 기회를 모색하세요');
    } else {
      doList.push('신중한 판단을 하세요');
      doList.push('기존 계획을 점검하세요');
    }
    
    if (calculatedFortune.personalSaju.guin.length > 0) {
      doList.push('귀인의 도움을 활용하세요');
    }

    return doList;
  }

  private generateDontListFromCalculation(calculatedFortune: TodayFortuneResult): string[] {
    const dontList: string[] = [];
    
    if (calculatedFortune.totalScore < 50) {
      dontList.push('성급한 결정을 피하세요');
      dontList.push('큰 변화는 피하세요');
    }
    
    if (calculatedFortune.interactions.ganInteraction.score < 0) {
      dontList.push('감정적 대응을 피하세요');
    }

    return dontList;
  }

  private generateCategoryDescription(category: string, score: number): string {
    if (score >= 80) return `${category}이 매우 좋습니다. 적극적으로 활용하세요.`;
    if (score >= 60) return `${category}이 좋습니다. 기대해도 좋습니다.`;
    if (score >= 40) return `${category}이 보통입니다. 신중하게 접근하세요.`;
    return `${category}에 주의가 필요합니다. 조심스럽게 지내세요.`;
  }
}

export const todayFortuneService = TodayFortuneService.getInstance();
