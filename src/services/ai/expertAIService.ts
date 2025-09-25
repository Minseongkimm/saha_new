import { ChatOpenAI } from "@langchain/openai";

import { AI_CONFIG, ERROR_MESSAGES } from './config';
import { OPENAI_API_KEY } from '../../config/env';
import { getExpertPrompt, getWelcomePrompt } from './prompts';
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

  private getModelForCategory(category: ExpertCategory): string {
    if (category === 'traditional_saju') {
      return AI_CONFIG.TRADITIONAL_SAJU_MODEL;
    } else if (category === 'today_fortune') {
      return AI_CONFIG.TODAY_FORTUNE_MODEL;
    }
    return AI_CONFIG.MODEL_NAME;
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

  public async generateWelcomeMessage(expertCategory: ExpertCategory): Promise<string> {
    try {
      const welcomePrompt = getWelcomePrompt(expertCategory);
      
      // 전통사주 카테고리일 때는 다른 모델 사용
      const modelToUse = this.getModelForCategory(expertCategory);
      const chatModel = new ChatOpenAI({ 
        apiKey: OPENAI_API_KEY,
        model: modelToUse,
        temperature: AI_CONFIG.TEMPERATURE,
        topP: AI_CONFIG.TOP_P,
        frequencyPenalty: AI_CONFIG.FREQUENCY_PENALTY,
        presencePenalty: AI_CONFIG.PRESENCE_PENALTY,
        streaming: false
      });
      
      const result = await Promise.race([
        chatModel.invoke([
          { role: 'system', content: welcomePrompt },
        ]),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(ERROR_MESSAGES.RESPONSE_TIMEOUT)), 
          AI_CONFIG.RESPONSE_TIMEOUT)
        )
      ]) as any;
      
      const content = (result && (result as any).content) ?? '';
      const response = Array.isArray(content)
        ? content.map((c: any) => (typeof c === 'string' ? c : c.text ?? '')).join('')
        : String(content);
      
      return response.trim();
    } catch (error) {
      console.error('Error generating welcome message:', error);
      return '안녕하세요! 궁금한 점이 있으시면 언제든 말씀해 주세요.';
    }
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
      
      // 전통사주 카테고리일 때는 다른 모델 사용
      const modelToUse = this.getModelForCategory(context.expertCategory);
      const chatModel = new ChatOpenAI({ 
        apiKey: OPENAI_API_KEY,
        model: modelToUse,
        temperature: AI_CONFIG.TEMPERATURE,
        topP: AI_CONFIG.TOP_P,
        frequencyPenalty: AI_CONFIG.FREQUENCY_PENALTY,
        presencePenalty: AI_CONFIG.PRESENCE_PENALTY,
        streaming: false
      });
      
      const result = await Promise.race([
        chatModel.invoke([
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

      // 팔로업 질문 추출 - 다양한 형식 지원
      const followUpQuestions: string[] = [];
      let cleanResponse = response;

      // 형식 1: "팔로업 질문:" 형식 (4개)
      const format1Regex = /팔로업\s*질문:\s*\n\s*1\.\s*([^\n]+)\s*\n\s*2\.\s*([^\n]+)\s*\n\s*3\.\s*([^\n]+)\s*\n\s*4\.\s*([^\n]+)/;
      const format1Match = response.match(format1Regex);
      
      // 형식 2: "다음으로 궁금하신 점은 무엇인지요?" 형식 (4개)
      const format2Regex = /다음으로\s*궁금하신\s*점은\s*무엇인지요\?[\s\S]*?1\.\s*([^\n]+)[\s\S]*?2\.\s*([^\n]+)[\s\S]*?3\.\s*([^\n]+)[\s\S]*?4\.\s*([^\n]+)/;
      const format2Match = response.match(format2Regex);
      
      // 형식 3: 단순히 1. 2. 3. 4. 형식
      const format3Regex = /1\.\s*([^\n]+)[\s\S]*?2\.\s*([^\n]+)[\s\S]*?3\.\s*([^\n]+)[\s\S]*?4\.\s*([^\n]+)/;
      const format3Match = response.match(format3Regex);

      if (format1Match && format1Match[1] && format1Match[2] && format1Match[3] && format1Match[4]) {
        followUpQuestions.push(format1Match[1].trim(), format1Match[2].trim(), format1Match[3].trim(), format1Match[4].trim());
        cleanResponse = response.replace(/팔로업\s*질문:[\s\S]*$/, '').trim();
      } else if (format2Match && format2Match[1] && format2Match[2] && format2Match[3] && format2Match[4]) {
        followUpQuestions.push(format2Match[1].trim(), format2Match[2].trim(), format2Match[3].trim(), format2Match[4].trim());
        cleanResponse = response.replace(/다음으로\s*궁금하신\s*점은\s*무엇인지요\?[\s\S]*$/, '').trim();
      } else if (format3Match && format3Match[1] && format3Match[2] && format3Match[3] && format3Match[4]) {
        followUpQuestions.push(format3Match[1].trim(), format3Match[2].trim(), format3Match[3].trim(), format3Match[4].trim());
        cleanResponse = response.replace(/1\.\s*[^\n]+[\s\S]*?4\.\s*[^\n]+[\s\S]*$/, '').trim();
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
