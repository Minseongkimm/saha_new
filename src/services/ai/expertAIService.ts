import { ChatOpenAI } from "@langchain/openai";

import { AI_CONFIG, ERROR_MESSAGES } from './config';
import { OPENAI_API_KEY } from '../../config/env';
import { getExpertPrompt } from './prompts';
import { AIResponse, ChatContext, ExpertCategory, StreamCallback } from './types';

class ExpertAIService {
  private static instance: ExpertAIService;
  private chatModel: ChatOpenAI;

  private constructor() {
    this.chatModel = new ChatOpenAI({ 
      apiKey: OPENAI_API_KEY,
      model: AI_CONFIG.MODEL_NAME, 
      temperature: AI_CONFIG.TEMPERATURE,
      topP: AI_CONFIG.TOP_P,
      frequencyPenalty: AI_CONFIG.FREQUENCY_PENALTY,
      presencePenalty: AI_CONFIG.PRESENCE_PENALTY,
      streaming: false
    });
  }

  public static getInstance(): ExpertAIService {
    if (!ExpertAIService.instance) {
      ExpertAIService.instance = new ExpertAIService();
    }
    return ExpertAIService.instance;
  }

  // Simplified: no Runnable chain; build messages directly

  private formatChatHistory(messages: string[]): string {
    return messages.slice(-AI_CONFIG.MAX_RECENT_MESSAGES).join("\n");
  }

  private formatAdvancedSajuInfo(birthInfo: any): any {
    if (!birthInfo.sajuResult) return '';

    const saju = birthInfo.sajuResult;
    
    // 공망 정보
    const gongmang = saju.gongmang || '없음';
    
    // 오행 분석
    const fiveProperties = saju.fiveProperties ? 
      `년주: ${saju.fiveProperties.yearProperty}(${saju.fiveProperties.yearNapeum}), 월주: ${saju.fiveProperties.monthProperty}(${saju.fiveProperties.monthNapeum}), 일주: ${saju.fiveProperties.dayProperty}(${saju.fiveProperties.dayNapeum}), 시주: ${saju.fiveProperties.timeProperty}(${saju.fiveProperties.timeNapeum})` : 
      '없음';
    
    // 지지암장간
    const jijiAmjangan = saju.jijiAmjangan ? 
      `년지: ${saju.jijiAmjangan.yearAmjangan}, 월지: ${saju.jijiAmjangan.monthAmjangan}, 일지: ${saju.jijiAmjangan.dayAmjangan}, 시지: ${saju.jijiAmjangan.timeAmjangan}` : 
      '없음';
    
    // 살(殺) 분석
    const salAnalysis = saju.sal ? 
      Object.entries(saju.sal)
        .filter(([_, values]) => (values as string[]).length > 0)
        .map(([key, values]) => `${key}: ${(values as string[]).join(', ')}`)
        .join('; ') || '없음' : 
      '없음';
    
    // 귀인 분석
    const guinAnalysis = saju.guin ? 
      Object.entries(saju.guin)
        .filter(([_, values]) => (values as string[]).length > 0)
        .map(([key, values]) => `${key}: ${(values as string[]).join(', ')}`)
        .join('; ') || '없음' : 
      '없음';
    
    // 지지 관계
    const jijiRelations = saju.jijiRelations ? 
      Object.entries(saju.jijiRelations)
        .filter(([_, values]) => (values as string[]).length > 0)
        .map(([key, values]) => `${key}: ${(values as string[]).join(', ')}`)
        .join('; ') || '없음' : 
      '없음';
    
    // 대운 정보
    const daewoonInfo = saju.daewoon && saju.daewoon.length > 0 ? 
      saju.daewoon.slice(0, 3).map((d: any) => `${d.age}세(${d.year}년): ${d.ganji}`).join(', ') + '...' : 
      '없음';

    return {
      gongmang,
      fiveProperties,
      jijiAmjangan,
      salAnalysis,
      guinAnalysis,
      jijiRelations,
      daewoonInfo
    };
  }

  public async generateResponse(
    context: ChatContext,
    onStream?: StreamCallback
  ): Promise<AIResponse> {
    try {
      const trimmed = context.recentMessages ?? [];
      const chatHistory = this.formatChatHistory(trimmed);
      const lastQuestion = trimmed.length > 0 ? trimmed[trimmed.length - 1] : '';
      const prevHistory = trimmed.length > 1 ? trimmed.slice(0, -1).join("\n") : '이전 대화 없음';
      const birthInfoStr = context.birthInfo
        ? JSON.stringify(context.birthInfo, null, 2)
        : '사주 정보가 없습니다.';

      // 고급 사주 분석 정보 포맷팅
      const advancedSajuInfo = context.birthInfo ? this.formatAdvancedSajuInfo(context.birthInfo) : {
        gongmang: '없음',
        fiveProperties: '없음',
        jijiAmjangan: '없음',
        salAnalysis: '없음',
        guinAnalysis: '없음',
        jijiRelations: '없음',
        daewoonInfo: '없음'
      };

      let response = '';

      // Always use non-streaming request in RN; simulate streaming when needed
      const systemPrompt = getExpertPrompt(context.expertCategory)
        .replace('{target_len}', String(AI_CONFIG.TARGET_CHAR_LENGTH))
        .replace('{birth_info}', birthInfoStr)
        .replace('{gongmang}', advancedSajuInfo.gongmang)
        .replace('{five_properties}', advancedSajuInfo.fiveProperties)
        .replace('{jiji_amjangan}', advancedSajuInfo.jijiAmjangan)
        .replace('{sal_analysis}', advancedSajuInfo.salAnalysis)
        .replace('{guin_analysis}', advancedSajuInfo.guinAnalysis)
        .replace('{jiji_relations}', advancedSajuInfo.jijiRelations)
        .replace('{daewoon_info}', advancedSajuInfo.daewoonInfo)
        .replace('{history}', prevHistory)
        .replace('{question}', lastQuestion);
      const result = await Promise.race([
        this.chatModel.invoke([
          { role: 'system', content: systemPrompt },
        ]),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(ERROR_MESSAGES.RESPONSE_TIMEOUT)), 
          AI_CONFIG.RESPONSE_TIMEOUT)
        )
      ]) as any;
      const content = (result && (result as any).content) ?? '';
      response = Array.isArray(content)
        ? content.map((c: any) => (typeof c === 'string' ? c : c.text ?? '')).join('')
        : String(content);

      // 팔로업 질문 추출
      const lastQuestionsRegex = /팔로업\s*질문:\s*\n\s*1\.\s*([^\n]+)\s*\n\s*2\.\s*([^\n]+)/;
      const followUpMatch = response.match(lastQuestionsRegex);
      let cleanResponse = response;
      const followUpQuestions: string[] = [];

      // 팔로업 질문이 있으면 추출하고, 없으면 무시
      if (followUpMatch && followUpMatch[1] && followUpMatch[2]) {
        followUpQuestions.push(followUpMatch[1].trim(), followUpMatch[2].trim());
        // 팔로업 질문 부분 제거
        cleanResponse = response.replace(/팔로업\s*질문:[\s\S]*$/, '').trim();
      }

      if (onStream) {
        const step: number = AI_CONFIG.STREAM_CHUNK_SIZE;
        for (let i = 0; i < cleanResponse.length; i += step) {
          const part = cleanResponse.slice(i, i + step);
          onStream(part);
          // eslint-disable-next-line no-await-in-loop
          await new Promise((resolve) => setTimeout(resolve, AI_CONFIG.STREAM_DELAY_MS));
        }
      }
      return {
        message: cleanResponse as string,
        followUpQuestions: followUpQuestions.length > 0 ? followUpQuestions : undefined
      };

    } catch (error) {
      console.error('Error generating AI response:', error);
      return {
        message: ERROR_MESSAGES.GENERAL_ERROR,
        error: error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL_ERROR
      };
    }
  }
}

export const expertAIService = ExpertAIService.getInstance();
