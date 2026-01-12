/**
 * sendUserMessage - 사용자 메시지 UI 업데이트 및 DB 저장
 * 
 * 역할:
 * - 임시 사용자 메시지 객체 생성 (temp ID 포함)
 * - UI에 메시지 즉시 추가 (optimistic update)
 * - DB에 메시지 저장 후 실제 ID 반환
 * - 임시 ID와 실제 ID 모두 반환하여 에러 시 롤백 가능
 */
import { supabase } from '../../../../../utils/database/supabaseClient';
import { ChatMessage } from '../../../../../types/chat';
import { withSupabaseRetry } from '../../../../../utils/network/retry';

export interface SendUserMessageResult {
  userMessageId: string | null;
  tempUserMessageId: string;
}

export async function sendUserMessage(
  roomId: string,
  messageText: string,
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  scrollToBottom: (animated: boolean) => void,
  options?: { suppressUiUpdate?: boolean }
): Promise<SendUserMessageResult> {
  const tempUserMessageId = `temp_user_${Date.now()}`;
  const userMessage = {
    id: tempUserMessageId,
    chat_room_id: roomId,
    sender_type: 'user',
    message: messageText.trim(),
    created_at: new Date().toISOString()
  };
  if (!options?.suppressUiUpdate) {
    setMessages(prev => [...prev, userMessage as ChatMessage]);
    scrollToBottom(true);
  }
  const { id: _tempUserId, ...dbUserMessage } = userMessage;
  const { data: insertedUserMessage, error: userMessageError } = await withSupabaseRetry<{ id: string }>(async () => {
    return await supabase
      .from('chat_messages')
      .insert(dbUserMessage)
      .select('id')
      .single();
  });
  if (userMessageError) throw userMessageError;
  return {
    userMessageId: insertedUserMessage?.id || null,
    tempUserMessageId
  };
}

