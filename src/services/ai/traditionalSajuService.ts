import { ChatOpenAI } from "@langchain/openai";
import { getTraditionalSajuPrompt } from './prompts';
import { AI_CONFIG, ERROR_MESSAGES } from './config';
import { OPENAI_API_KEY } from '../../config/env';
import { supabase } from '../../utils/supabaseClient';

interface TraditionalSajuAnalysis {
  overall: string;
  dayStem: string;
  fiveElements: string;
  sasin: string;
  sinsal: string;
  comprehensiveAdvice: string;
  generatedAt: string;
  llmModel: string;
}

class TraditionalSajuService {
  private static instance: TraditionalSajuService;
  private chatModel: ChatOpenAI;

  private constructor() {
    this.chatModel = new ChatOpenAI({ 
      apiKey: OPENAI_API_KEY,
      model: AI_CONFIG.TRADITIONAL_SAJU_MODEL, // config에서 정통사주 전용 모델 가져오기
      temperature: AI_CONFIG.TEMPERATURE,
      topP: AI_CONFIG.TOP_P,
      frequencyPenalty: AI_CONFIG.FREQUENCY_PENALTY,
      presencePenalty: AI_CONFIG.PRESENCE_PENALTY,
      streaming: false
    });
  }

  public static getInstance(): TraditionalSajuService {
    if (!TraditionalSajuService.instance) {
      TraditionalSajuService.instance = new TraditionalSajuService();
    }
    return TraditionalSajuService.instance;
  }

  /**
   * DB에서 정통사주 해석 조회
   */
  public async getAnalysisFromDatabase(userId: string, birthInfoId: string): Promise<TraditionalSajuAnalysis | null> {
    try {
      const { data, error } = await supabase
        .from('saju_analyses')
        .select('traditional_analysis')
        .eq('user_id', userId)
        .eq('birth_info_id', birthInfoId)
        .single();

      if (error || !data?.traditional_analysis) {
        return null;
      }

      return data.traditional_analysis as TraditionalSajuAnalysis;
    } catch (error) {
      console.error('DB에서 정통사주 해석 조회 실패:', error);
      return null;
    }
  }

  /**
   * DB에 정통사주 해석 저장
   */
  public async saveAnalysisToDatabase(userId: string, birthInfoId: string, analysis: TraditionalSajuAnalysis): Promise<boolean> {
    try {
      // 먼저 기존 데이터가 있는지 확인
      const { data: existingData } = await supabase
        .from('saju_analyses')
        .select('id')
        .eq('user_id', userId)
        .eq('birth_info_id', birthInfoId)
        .single();

      let error;
      if (existingData) {
        // 기존 데이터가 있으면 업데이트
        const { error: updateError } = await supabase
          .from('saju_analyses')
          .update({
            traditional_analysis: analysis,
            traditional_model: AI_CONFIG.TRADITIONAL_SAJU_MODEL,
            traditional_generated_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('birth_info_id', birthInfoId);
        
        error = updateError;
      } else {
        // 기존 데이터가 없으면 새로 삽입
        const { error: insertError } = await supabase
          .from('saju_analyses')
          .insert({
            user_id: userId,
            birth_info_id: birthInfoId,
            traditional_analysis: analysis,
            traditional_model: AI_CONFIG.TRADITIONAL_SAJU_MODEL,
            traditional_generated_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        error = insertError;
      }

      if (error) {
        console.error('DB에 정통사주 해석 저장 실패:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('DB에 정통사주 해석 저장 실패:', error);
      return false;
    }
  }

  /**
   * 정통사주 해석 생성
   */
  public async generateSajuAnalysis(sajuData: any): Promise<TraditionalSajuAnalysis> {
    const startTime = Date.now(); // 시작 시간 기록
    
    try {
      const prompt = getTraditionalSajuPrompt(sajuData);
      
      // 정통사주 해석 프롬프트 생성 완료

      // LangChain ChatOpenAI 사용 (expertAIService와 동일한 방식)
      const llmStartTime = Date.now();
      const result = await Promise.race([
        this.chatModel.invoke([
          { 
            role: 'system', 
            content: '당신은 전문 정통사주명리학자입니다. 정확하고 상세한 사주 해석을 제공해주세요.' 
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
      const llmEndTime = Date.now();
      const llmDuration = (llmEndTime - llmStartTime) / 1000;

      const content = (result && (result as any).content) ?? '';
      const analysisText = Array.isArray(content)
        ? content.map((c: any) => (typeof c === 'string' ? c : c.text ?? '')).join('')
        : String(content);

      if (!analysisText.trim()) {
        throw new Error('LLM 응답이 비어있습니다.');
      }

      // 응답을 구조화된 데이터로 파싱
      
      const parseStartTime = Date.now();
      const analysis = this.parseAnalysisResponse(analysisText);
      const parseEndTime = Date.now();
      const parseDuration = (parseEndTime - parseStartTime) / 1000;
      
      // 파싱 완료

      return {
        ...analysis,
        generatedAt: new Date().toISOString(),
        llmModel: AI_CONFIG.TRADITIONAL_SAJU_MODEL
      };

    } catch (error) {
      console.error('정통사주 해석 생성 실패:', error);
      throw error;
    }
  }

  /**
   * LLM 응답을 구조화된 데이터로 파싱
   */
  private parseAnalysisResponse(response: string): Omit<TraditionalSajuAnalysis, 'generatedAt' | 'llmModel'> {
    try {
      
      // 섹션별로 파싱 (귀인성, 공망 제거)
      const sections = {
        overall: this.extractSection(response, '전체적인 풀이'),
        dayStem: this.extractSection(response, '일간 풀이'),
        fiveElements: this.extractSection(response, '오행 균형'),
        sasin: this.extractSection(response, '십성 구조'),
        sinsal: this.extractSection(response, '신살 해석'),
        comprehensiveAdvice: this.extractSection(response, '종합 조언')
      };


      return sections;
    } catch (error) {
      console.error('응답 파싱 실패:', error);
      // 파싱 실패 시 전체 응답을 overall에 저장하고 나머지는 안전한 기본값 제공
      return {
        overall: response || '사주 해석을 생성할 수 없습니다.',
        dayStem: '일간 분석을 불러올 수 없습니다.',
        fiveElements: '오행 분석을 불러올 수 없습니다.',
        sasin: '십성 분석을 불러올 수 없습니다.',
        sinsal: '신살 분석을 불러올 수 없습니다.',
        comprehensiveAdvice: '종합 조언을 불러올 수 없습니다.'
      };
    }
  }

  /**
   * 특정 섹션 추출
   */
  private extractSection(text: string, sectionTitle: string): string {
    // 안전성 검사
    if (!text || typeof text !== 'string') {
      return '해당 섹션을 불러올 수 없습니다.';
    }

    const patterns = [
      new RegExp(`###\\s*\\d*\\.?\\s*${sectionTitle}[\\s\\S]*?(?=###|$)`),
      new RegExp(`${sectionTitle}[\\s\\S]*?(?=###|$)`),
      new RegExp(`\\*\\*${sectionTitle}\\*\\*[\\s\\S]*?(?=\\*\\*|$)`),
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let content = match[0];
        // 섹션 제목 제거
        content = content.replace(new RegExp(`###\\s*\\d*\\.?\\s*${sectionTitle}`, 'g'), '');
        content = content.replace(new RegExp(`${sectionTitle}`, 'g'), '');
        content = content.replace(new RegExp(`\\*\\*${sectionTitle}\\*\\*`, 'g'), '');
        
        return content.trim() || '해당 섹션 내용이 비어있습니다.';
      }
    }

    return '해당 섹션을 찾을 수 없습니다.';
  }
}

export const traditionalSajuService = TraditionalSajuService.getInstance();
export type { TraditionalSajuAnalysis };
