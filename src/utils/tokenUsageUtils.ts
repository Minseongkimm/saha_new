import { supabase } from './supabaseClient';

/**
 * 토큰 사용량 조회 유틸리티
 */

export interface TokenUsageSummary {
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  totalCostUsd: number;
  chatRoomCount: number;
  lastUpdate: string | null;
}

export interface ChatRoomTokenUsage {
  id: string;
  expertName: string;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  totalCostUsd: number;
  lastTokenUpdate: string | null;
  createdAt: string;
}

/**
 * 사용자별 총 토큰 사용량 조회
 */
export const getUserTokenUsage = async (userId: string): Promise<TokenUsageSummary> => {
  try {
    const { data, error } = await supabase
      .from('chat_rooms')
      .select(`
        total_prompt_tokens,
        total_completion_tokens,
        total_tokens,
        total_cost_usd,
        last_token_update
      `)
      .eq('user_id', userId);

    if (error) throw error;

    const summary: TokenUsageSummary = {
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalTokens: 0,
      totalCostUsd: 0,
      chatRoomCount: data?.length || 0,
      lastUpdate: null
    };

    if (data && data.length > 0) {
      data.forEach((room: any) => {
        summary.totalPromptTokens += room.total_prompt_tokens || 0;
        summary.totalCompletionTokens += room.total_completion_tokens || 0;
        summary.totalTokens += room.total_tokens || 0;
        summary.totalCostUsd += room.total_cost_usd || 0;
        
        // 가장 최근 업데이트 시간 찾기
        if (room.last_token_update && (!summary.lastUpdate || room.last_token_update > summary.lastUpdate)) {
          summary.lastUpdate = room.last_token_update;
        }
      });
    }

    return summary;
  } catch (error) {
    console.error('사용자 토큰 사용량 조회 실패:', error);
    throw error;
  }
};

/**
 * 사용자별 채팅방별 토큰 사용량 조회
 */
export const getUserChatRoomTokenUsage = async (userId: string): Promise<ChatRoomTokenUsage[]> => {
  try {
    const { data, error } = await supabase
      .from('chat_rooms')
      .select(`
        id,
        expert_name,
        total_prompt_tokens,
        total_completion_tokens,
        total_tokens,
        total_cost_usd,
        last_token_update,
        created_at
      `)
      .eq('user_id', userId)
      .order('last_token_update', { ascending: false });

    if (error) throw error;

    return (data || []).map((room: any) => ({
      id: room.id,
      expertName: room.expert_name || '알 수 없음',
      totalPromptTokens: room.total_prompt_tokens || 0,
      totalCompletionTokens: room.total_completion_tokens || 0,
      totalTokens: room.total_tokens || 0,
      totalCostUsd: room.total_cost_usd || 0,
      lastTokenUpdate: room.last_token_update,
      createdAt: room.created_at
    }));
  } catch (error) {
    console.error('채팅방별 토큰 사용량 조회 실패:', error);
    throw error;
  }
};

/**
 * 특정 채팅방의 토큰 사용량 조회
 */
export const getChatRoomTokenUsage = async (roomId: string): Promise<ChatRoomTokenUsage | null> => {
  try {
    const { data, error } = await supabase
      .from('chat_rooms')
      .select(`
        id,
        expert_name,
        total_prompt_tokens,
        total_completion_tokens,
        total_tokens,
        total_cost_usd,
        last_token_update,
        created_at
      `)
      .eq('id', roomId)
      .single();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      expertName: data.expert_name || '알 수 없음',
      totalPromptTokens: data.total_prompt_tokens || 0,
      totalCompletionTokens: data.total_completion_tokens || 0,
      totalTokens: data.total_tokens || 0,
      totalCostUsd: data.total_cost_usd || 0,
      lastTokenUpdate: data.last_token_update,
      createdAt: data.created_at
    };
  } catch (error) {
    console.error('채팅방 토큰 사용량 조회 실패:', error);
    throw error;
  }
};

/**
 * 토큰 사용량을 한국어로 포맷팅
 */
export const formatTokenUsage = (usage: TokenUsageSummary) => {
  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const formatCost = (cost: number) => {
    if (cost < 0.001) {
      return `$${(cost * 1000).toFixed(2)}m`;
    }
    return `$${cost.toFixed(4)}`;
  };

  return {
    totalTokens: formatNumber(usage.totalTokens),
    totalCost: formatCost(usage.totalCostUsd),
    chatRoomCount: usage.chatRoomCount,
    lastUpdate: usage.lastUpdate ? new Date(usage.lastUpdate).toLocaleString('ko-KR') : '없음'
  };
};
