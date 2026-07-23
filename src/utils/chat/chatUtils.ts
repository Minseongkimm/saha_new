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

export const createChatRoomWithExpert = async (
  navigation: any,
  expertId: string,
  partnerData?: any
): Promise<{ roomId: string; expert: any; partnerData?: any } | null> => {
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

    const partnerSajuId: string | null = partnerData?.partnerId ?? partnerData?.partnerSajuId ?? null;
    const chatContext: string = partnerSajuId
      ? 'love_compatibility'
      : expert.category === 'love'
        ? 'love_personal'
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
    markChatListNeedsRefresh();

    return {
      roomId: newRoom.id,
      expert,
      partnerData,
    };
  } catch (error) {
    console.error('Error creating chat room:', error);
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
  partnerData?: any,
  options?: { initialMessage?: string }
): Promise<boolean> => {
  const chatRoom = await createChatRoomWithExpert(navigation, expertId, partnerData);
  if (!chatRoom) return false;

  navigation.navigate('ChatRoom', {
    roomId: chatRoom.roomId,
    expert: chatRoom.expert,
    partnerData: chatRoom.partnerData,
    initialMessage: options?.initialMessage
  });
  return true;
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
