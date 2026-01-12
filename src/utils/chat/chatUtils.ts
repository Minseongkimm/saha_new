import { supabase } from '../database/supabaseClient';
import { markChatListNeedsRefresh } from './chatListCache';
import { Alert } from 'react-native';
import { ensureBirthInfoOrNavigate } from '../user/birthInfoGuard';
import { getCurrentUserSafely } from '../user/authUtils';
import { withSupabaseRetry } from '../network/retry';
import { removeBoldMarkup } from '../text/removeBoldMarkup';

/**
 * 카테고리로 전문가 조회
 * @param category - 전문가 카테고리 (today_fortune, newyear_fortune, traditional_saju 등)
 * @returns 전문가 정보 (id, name) 또는 null
 */
export const getExpertByCategory = async (category: string): Promise<{ id: string; name: string } | null> => {
  try {
    const { data: expert, error } = await supabase
      .from('experts')
      .select('id, name')
      .eq('category', category)
      .single();

    if (error || !expert) {
      console.error('Expert lookup error:', error, 'Category:', category);
      return null;
    }

    return expert;
  } catch (error) {
    console.error('Error in getExpertByCategory:', error);
    return null;
  }
};

/**
 * 기본 전문가 조회
 * 1) category === "main" 우선 조회
 * 2) 실패 시 지정된 기본 ID로 폴백
 */
const DEFAULT_EXPERT_FALLBACK_ID = 'f7184b56-c8bd-4637-b186-219058bcd047';

export const getDefaultExpert = async (): Promise<any | null> => {
  try {
    const { data: categoryExpert, error: categoryError } = await withSupabaseRetry<any>(async () => {
      return await supabase
        .from('experts')
        .select('*')
        .eq('category', 'main')
        .maybeSingle();
    });

    if (categoryError !== null && categoryError !== undefined) {
      console.error('Default expert query error (by category):', categoryError);
    }

    if (categoryExpert) {
      console.log('Default expert found by category:', categoryExpert.id, categoryExpert.name);
      return categoryExpert;
    }

    // category로 못 찾으면 ID 폴백
    const { data: idExpert, error: idError } = await withSupabaseRetry<any>(async () => {
      return await supabase
        .from('experts')
        .select('*')
        .eq('id', DEFAULT_EXPERT_FALLBACK_ID)
        .maybeSingle();
    });

    if (idError !== null && idError !== undefined) {
      console.error('Default expert query error (by ID fallback):', idError);
      return null;
    }

    if (!idExpert) {
      console.warn('Default expert not found. category=main, id fallback=', DEFAULT_EXPERT_FALLBACK_ID);
      return null;
    }

    console.log('Default expert found by ID fallback:', idExpert.id, idExpert.name);
    return idExpert;
  } catch (error) {
    console.error('Error in getDefaultExpert:', error);
    return null;
  }
};

interface StartChatResult {
  roomId: string;
  expert: any;
}

const createChatRoomWithExpertInternal = async (
  navigation: any,
  expertId: string,
  partnerData?: any
): Promise<StartChatResult | null> => {
  const ok = await ensureBirthInfoOrNavigate(navigation);
  if (!ok) return null;

  const { status, user } = await getCurrentUserSafely();
  if (status === 'network_error') {
    return null;
  }
  if (status === 'unauthenticated' || !user) {
    Alert.alert('오류', '로그인이 필요합니다.');
    return null;
  }

  try {
    const { data: expert, error: expertError } = await withSupabaseRetry<any>(async () => {
      return await supabase
        .from('experts')
        .select('*')
        .eq('id', expertId)
        .single();
    });

    if (expertError || !expert) {
      Alert.alert('오류', '전문가 정보를 찾을 수 없습니다.');
      return null;
    }

    const isLoveCategory: boolean = expert.category === 'love';
    const partnerSajuId: string | null = partnerData?.partnerId ?? partnerData?.partnerSajuId ?? null;
    const chatContext: string = isLoveCategory
      ? partnerSajuId
        ? 'love_compatibility'
        : 'love_personal'
      : 'general';

    const { data: newRoom, error } = await withSupabaseRetry<any>(async () => {
      return await supabase
        .from('chat_rooms')
        .insert({
          user_id: user.id,
          expert_id: expert.id,
          expert_name: expert.name,
          chat_context: chatContext,
          partner_saju_id: partnerSajuId,
          status: 'active'
        })
        .select()
        .single();
    });

    if (error || !newRoom) throw error || new Error('Failed to create chat room');
    const chatRoomId = newRoom.id;
    markChatListNeedsRefresh();

    return {
      roomId: chatRoomId,
      expert,
    };
  } catch (error) {
    console.error('Error starting chat:', error);
    Alert.alert('오류', '채팅을 시작할 수 없습니다.');
    return null;
  }
};

/**
 * 전문가와 채팅 시작
 * @param navigation - 네비게이션 객체
 * @param expertId - 전문가 ID
 * @param partnerData - 상대방 정보 (선택사항)
 */
export const startChatWithExpert = async (
  navigation: any,
  expertId: string,
  partnerData?: any
) => {
  const result = await createChatRoomWithExpert(navigation, expertId, partnerData);
  if (!result) return;
  navigation.navigate('ChatRoom', {
    roomId: result.roomId,
    expert: result.expert,
    partnerData: partnerData
  });
};

interface EndChatOptions {
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  endedReason?: string;
}

export const endChatRoom = async (roomId: string, options?: EndChatOptions): Promise<void> => {
  try {
    const nowIso: string = new Date().toISOString();
    const preview: string | undefined = options?.lastMessage
      ? removeBoldMarkup(options.lastMessage).slice(0, 120)
      : undefined;
    const lastMessageAt: string | undefined = options?.lastMessageAt || undefined;
    const payload: Record<string, unknown> = {
      status: 'ended',
      ended_at: nowIso
    };
    if (preview !== undefined) {
      payload.last_message = preview;
    }
    if (lastMessageAt !== undefined) {
      payload.last_message_at = lastMessageAt;
    }
    if (options?.endedReason) {
      payload.ended_reason = options.endedReason;
    }
    await withSupabaseRetry(async () => {
      return await supabase
        .from('chat_rooms')
        .update(payload)
        .eq('id', roomId);
    });
    markChatListNeedsRefresh();
  } catch (error) {
    console.error('Error ending chat room:', error);
  }
};

export const createChatRoomWithExpert = async (
  navigation: any,
  expertId: string,
  partnerData?: any
): Promise<StartChatResult | null> => {
  return await createChatRoomWithExpertInternal(navigation, expertId, partnerData);
};
