/**
 * updateFreeMessageId - 무료 대화 기록에 AI 메시지 ID 연결
 * 
 * 역할:
 * - 무료 대화로 사용된 경우 free_messages 테이블에서 해당 레코드 찾기
 * - AI 응답 메시지 ID(ai_message_id) 업데이트
 * - 사용자 메시지와 AI 응답 메시지를 무료 대화 기록에 연결
 */
import { supabase } from '../../../../../utils/database/supabaseClient';

export async function updateFreeMessageId(
  roomId: string,
  userMessageId: string,
  aiMessageId: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  // Edge function과 동일한 방식으로 날짜 계산 (UTC 기준)
  const today = new Date().toISOString().split('T')[0];
  await supabase
    .from('free_messages')
    .update({ ai_message_id: aiMessageId })
    .eq('user_id', user.id)
    .eq('used_date', today)
    .eq('chat_room_id', roomId)
    .eq('user_message_id', userMessageId)
    .is('ai_message_id', null)
    .limit(1);
}

