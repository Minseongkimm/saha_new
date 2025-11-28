import { supabase } from '../database/supabaseClient';
import { markChatListNeedsRefresh } from './chatListCache';
import { Alert } from 'react-native';
import { ensureBirthInfoOrNavigate } from '../user/birthInfoGuard';
import { getCurrentUserSafely } from '../user/authUtils';
import { withSupabaseRetry } from '../network/retry';

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

    // 2. 기존 채팅방 확인
    const isLoveCategory: boolean = expert.category === 'love';
    const partnerSajuId: string | null = partnerData?.partnerId ?? partnerData?.partnerSajuId ?? null;
    const chatContext: string = isLoveCategory
      ? partnerSajuId
        ? 'love_compatibility'
        : 'love_personal'
      : 'general';

    let roomQuery = supabase
      .from('chat_rooms')
      .select('id, expert_name')
      .eq('user_id', user.id)
      .eq('expert_id', expert.id)
      .eq('chat_context', chatContext)
      .limit(1);

    if (chatContext === 'love_compatibility' && partnerSajuId) {
      roomQuery = roomQuery.eq('partner_saju_id', partnerSajuId);
    } else if (chatContext === 'love_personal') {
      roomQuery = roomQuery.is('partner_saju_id', null);
    }

    const { data: existingRoom, error: roomLookupError } = await withSupabaseRetry<{ id: string; expert_name: string } | null>(async () => {
      return await roomQuery.maybeSingle();
    });

    if (roomLookupError) {
      console.error('Chat room lookup error:', roomLookupError);
    }

    let chatRoomId: string;

    if (existingRoom) {
      chatRoomId = existingRoom.id;
    } else {
      // 3. 새 채팅방 생성
      const { data: newRoom, error } = await withSupabaseRetry<any>(async () => {
        return await supabase
          .from('chat_rooms')
          .insert({
            user_id: user.id,
            expert_id: expert.id,
            expert_name: expert.name,
            chat_context: chatContext,
            partner_saju_id: partnerSajuId,
          })
          .select()
          .single();
      });

      if (error || !newRoom) throw error || new Error('Failed to create chat room');
      chatRoomId = newRoom.id;
      markChatListNeedsRefresh();
    }

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
