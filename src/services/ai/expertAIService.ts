import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";

import { AI_CONFIG, ERROR_MESSAGES } from './config';
import { OPENAI_API_KEY } from '../../config/env';
import { getExpertPrompt } from './prompts';
import { AIResponse, ChatContext, ExpertCategory } from './types';

class ExpertAIService {
  private static instance: ExpertAIService;
  private chatModel: ChatOpenAI;

  private constructor() {
    this.chatModel = new ChatOpenAI({ 
      apiKey: OPENAI_API_KEY,
      model: AI_CONFIG.MODEL_NAME, 
      temperature: AI_CONFIG.TEMPERATURE 
    });
  }

  public static getInstance(): ExpertAIService {
    if (!ExpertAIService.instance) {
      ExpertAIService.instance = new ExpertAIService();
    }
    return ExpertAIService.instance;
  }

  private createExpertChain(category: ExpertCategory) {
    const promptTemplate = getExpertPrompt(category);
    if (!promptTemplate) {
      throw new Error(ERROR_MESSAGES.INVALID_CATEGORY);
    }

    const prompt = PromptTemplate.fromTemplate(promptTemplate);
    
    return RunnableSequence.from([
      prompt,
      this.chatModel,
      new StringOutputParser()
    ]);
  }

  private formatChatHistory(messages: string[]): string {
    return messages
      .slice(-AI_CONFIG.MAX_RECENT_MESSAGES)
      .join("\n");
  }

  public async generateResponse(
    context: ChatContext
  ): Promise<AIResponse> {
    try {
      const chain = this.createExpertChain(context.expertCategory);
      
      const chatHistory = this.formatChatHistory(context.recentMessages);
      const birthInfoStr = context.birthInfo 
        ? JSON.stringify(context.birthInfo, null, 2)
        : "사주 정보가 없습니다.";

      const response = await Promise.race([
        chain.invoke({
          birth_info: birthInfoStr,
          question: chatHistory
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(ERROR_MESSAGES.RESPONSE_TIMEOUT)), 
          AI_CONFIG.RESPONSE_TIMEOUT)
        )
      ]);

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
