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
  // BirthInfo 검사: 없으면 입력 화면으로
  const ok = await ensureBirthInfoOrNavigate(navigation);
  if (!ok) return;

  const { status, user } = await getCurrentUserSafely();
  if (status === 'network_error') {
    // 네트워크 문제일 때는 유저에게 알림을 띄우지 않고 조용히 종료
    return;
  }
  if (status === 'unauthenticated' || !user) {
    Alert.alert('오류', '로그인이 필요합니다.');
    return;
  }

  try {
    // 1. 전문가 정보 가져오기 (ID로 조회)
    const { data: expert, error: expertError } = await withSupabaseRetry<any>(async () => {
      return await supabase
        .from('experts')
        .select('*')
        .eq('id', expertId)
        .single();
    });

    if (expertError || !expert) {
      Alert.alert('오류', '전문가 정보를 찾을 수 없습니다.');
      return;
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

    // 4. 채팅방으로 이동
    navigation.navigate('ChatRoom', {
      roomId: chatRoomId,
      expert: expert,
      partnerData: partnerData // 상대방 정보 전달
    });

  } catch (error) {
    console.error('Error starting chat:', error);
    Alert.alert('오류', '채팅을 시작할 수 없습니다.');
  }
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
