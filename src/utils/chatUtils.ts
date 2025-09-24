import { supabase } from './supabaseClient';
import { markChatListNeedsRefresh } from './chatListCache';
import { Alert } from 'react-native';

export const startChatWithExpert = async (
  navigation: any,
  expertCategory: string
) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    Alert.alert('오류', '로그인이 필요합니다.');
    return;
  }

  try {
    // 1. 전문가 정보 가져오기 (카테고리로 조회)
    const { data: expert, error: expertError } = await supabase
      .from('experts')
      .select('*')
      .eq('category', expertCategory)
      .single();

    if (expertError || !expert) {
      Alert.alert('오류', '전문가 정보를 찾을 수 없습니다.');
      return;
    }

    // 2. 기존 채팅방 확인
    const { data: existingRoom } = await supabase
      .from('chat_rooms')
      .select('id')
      .eq('user_id', user.id)
      .eq('expert_id', expert.id)
      .single();

    let chatRoomId;

    if (existingRoom) {
      chatRoomId = existingRoom.id;
    } else {
      // 3. 새 채팅방 생성
      const { data: newRoom, error } = await supabase
        .from('chat_rooms')
        .insert({
          user_id: user.id,
          expert_id: expert.id
        })
        .select()
        .single();

      if (error) throw error;
      chatRoomId = newRoom.id;
      markChatListNeedsRefresh();
    }

    // 4. 채팅방으로 이동
    navigation.navigate('ChatRoom', {
      roomId: chatRoomId,
      expert: expert
    });

  } catch (error) {
    console.error('Error starting chat:', error);
    Alert.alert('오류', '채팅을 시작할 수 없습니다.');
  }
};
