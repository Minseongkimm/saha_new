import { supabase } from '../database/supabaseClient';

export type ChatRouteCategory = 'comprehensive' | 'love' | 'career';

export interface ChatCategoryRoute {
  category: ChatRouteCategory;
  confidence: number;
  reason: string;
  source: 'llm' | 'fallback';
}

const VALID_CATEGORIES: ChatRouteCategory[] = ['comprehensive', 'love', 'career'];
const DEFAULT_ROUTE: ChatCategoryRoute = {
  category: 'comprehensive',
  confidence: 0.35,
  reason: '여러 방향으로 이어질 수 있는 고민이라 인생 흐름으로 시작합니다.',
  source: 'fallback',
};

const isValidCategory = (category: unknown): category is ChatRouteCategory => (
  typeof category === 'string' && VALID_CATEGORIES.includes(category as ChatRouteCategory)
);

export const routeChatCategory = async (message: string): Promise<ChatCategoryRoute> => {
  try {
    const { data, error } = await supabase.functions.invoke('route-chat-category', {
      body: { message },
    });

    if (error) {
      throw error;
    }

    if (!isValidCategory(data?.category)) {
      return DEFAULT_ROUTE;
    }

    const rawConfidence = typeof data.confidence === 'number' ? data.confidence : DEFAULT_ROUTE.confidence;
    const confidence = Math.max(0, Math.min(1, rawConfidence));

    if (confidence < 0.35) {
      return DEFAULT_ROUTE;
    }

    return {
      category: data.category,
      confidence,
      reason: typeof data.reason === 'string' ? data.reason : '',
      source: 'llm',
    };
  } catch (error) {
    console.error('routeChatCategory error:', error);
    return DEFAULT_ROUTE;
  }
};
