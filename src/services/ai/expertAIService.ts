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

      let response = '';

      // Always use non-streaming request in RN; simulate streaming when needed
      const systemPrompt = getExpertPrompt(context.expertCategory)
        .replace('{target_len}', String(AI_CONFIG.TARGET_CHAR_LENGTH))
        .replace('{birth_info}', birthInfoStr)
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
      // 팔로업 질문 추출 디버깅
      console.log('AI Response:', response);
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
