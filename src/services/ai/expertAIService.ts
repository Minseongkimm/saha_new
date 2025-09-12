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
    return messages
      .slice(-AI_CONFIG.MAX_RECENT_MESSAGES)
      .join("\n");
  }

  public async generateResponse(
    context: ChatContext,
    onStream?: StreamCallback
  ): Promise<AIResponse> {
    try {
      const chatHistory = this.formatChatHistory(context.recentMessages);
      const birthInfoStr = context.birthInfo 
        ? JSON.stringify(context.birthInfo, null, 2)
        : "사주 정보가 없습니다.";

      let response = '';

      // Always use non-streaming request in RN; simulate streaming when needed
      const systemPrompt = getExpertPrompt(context.expertCategory)
        .replace('{target_len}', String(AI_CONFIG.TARGET_CHAR_LENGTH));
      const result = await Promise.race([
        this.chatModel.invoke([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `사용자 사주 정보: ${birthInfoStr}\n\n${chatHistory}` }
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

      if (onStream) {
        const step: number = AI_CONFIG.STREAM_CHUNK_SIZE;
        for (let i = 0; i < response.length; i += step) {
          const part = response.slice(i, i + step);
          onStream(part);
          // eslint-disable-next-line no-await-in-loop
          await new Promise((resolve) => setTimeout(resolve, AI_CONFIG.STREAM_DELAY_MS));
        }
      }
      return {
        message: response as string
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
