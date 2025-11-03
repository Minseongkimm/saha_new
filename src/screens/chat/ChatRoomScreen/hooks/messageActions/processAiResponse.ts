/**
 * processAiResponse - AI 응답 스트리밍, 파싱, 저장
 * 
 * 역할:
 * - Edge Function을 통한 AI 응답 스트리밍 수신
 * - 실시간으로 UI에 스트리밍 텍스트 표시
 * - 팔로업 질문 추출 및 메시지 정리
 * - AI 응답을 DB에 저장
 * - 채팅방 마지막 메시지 정보 업데이트
 * - 채팅 리스트 캐시 업데이트
 */
import { Alert } from 'react-native';
import { supabase } from '../../../../../utils/database/supabaseClient';
import { streamChat } from '../../../../../services/ai/edgeFunctionClient';
import { extractFollowUpQuestions, removeFollowUpQuestionsFromText } from '../../utils/messageUtils';
import { ChatMessage } from '../../../../../types/chat';
import { BirthInfo } from '../../../../../services/ai';
import { updateChatListPreview } from '../../../../../utils/chat/chatListCache';
import { OpenAIMessage } from './prepareMessagesForAI';
import { removeBoldMarkup } from '../../../../../utils/text/removeBoldMarkup';

interface ProcessAiResponseParams {
  roomId: string;
  expertCategory: string;
  messages: OpenAIMessage[];
  userBirthInfo: BirthInfo | null;
  userMessageId: string | null;
  tempAiMessageId: string;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  scrollToBottom: (animated: boolean) => void;
}

export async function processAiResponse(params: ProcessAiResponseParams): Promise<{
  aiMessageId: string | null;
  finalText: string;
}> {
  const {
    roomId,
    expertCategory,
    messages,
    userBirthInfo,
    userMessageId,
    tempAiMessageId,
  setMessages,
  scrollToBottom
  } = params;
  
  let aiFinalText = '';
  let tempAiMessage: ChatMessage = {
    id: tempAiMessageId,
    chat_room_id: roomId,
    sender_type: 'expert',
    message: '',
    created_at: new Date().toISOString()
  };
  
  setMessages(prev => [...prev, tempAiMessage]);
  scrollToBottom(true);
  
  try {
    aiFinalText = await streamChat(
      roomId,
      expertCategory,
      messages,
      (userBirthInfo || {}) as Record<string, unknown>,
      (chunk: string) => {
        setMessages(prev => prev.map(msg => 
          msg.id === tempAiMessageId
            ? { ...msg, message: (msg as any).message + chunk }
            : msg
        ));
      },
      userMessageId || undefined
    );
  } catch (error: any) {
    if (error.message?.includes('잔액') || error.message?.includes('402')) {
      Alert.alert('잔액 부족', '사바 잔액이 부족합니다.');
      throw error;
    }
    throw new Error('AI 응답 생성 실패');
  }
  
  const followUpQuestions = extractFollowUpQuestions(aiFinalText);
  const cleanedMessage = removeFollowUpQuestionsFromText(aiFinalText);
  
  setMessages(prev => prev.map(msg => 
    msg.id === tempAiMessageId
      ? { ...msg, message: cleanedMessage, follow_up_questions: followUpQuestions }
      : msg
  ));
  
  const { id: _ignoreTempId, follow_up_questions: _ignoreFollowUp, ...dbAiMessage } = tempAiMessage as any;
  const { data: insertedAiMessage, error: aiMessageError } = await supabase
    .from('chat_messages')
    .insert({
      ...dbAiMessage,
      message: cleanedMessage,
    })
    .select('id')
    .single();
  
  if (aiMessageError) throw aiMessageError;
  
  if (aiFinalText) {
    const timestampLabel = new Date().toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    updateChatListPreview(roomId, aiFinalText, timestampLabel);
  }
  
  const cleanedText = removeBoldMarkup(cleanedMessage);
  const previewText = cleanedText.length > 30 ? cleanedText.substring(0, 30) + '...' : cleanedText;
  await supabase
    .from('chat_rooms')
    .update({
      last_message: previewText,
      last_message_at: tempAiMessage.created_at,
    })
    .eq('id', roomId);
  
  return {
    aiMessageId: insertedAiMessage?.id || null,
    finalText: aiFinalText
  };
}

