/**
 * useMessageActions - 메시지 액션 훅
 * 메시지 전송, AI 응답 처리, 팔로업 질문 파싱 등 메시지 관련 액션들
 */
import { useState, useRef } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../../../../utils/database/supabaseClient';
import { streamChat } from '../../../../services/ai/edgeFunctionClient';
import { updateChatListPreview } from '../../../../utils/chat/chatListCache';
import { extractFollowUpQuestions, removeFollowUpQuestionsFromText } from '../utils/messageUtils';
import { ChatMessage } from '../../../../types/chat';
import { BirthInfo } from '../../../../services/ai';
import { removeBoldMarkup } from '../../../../utils/text/removeBoldMarkup';

interface UseMessageActionsProps {
  roomId: string;
  expert: any;
  userBirthInfo: BirthInfo | null;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setShouldAutoScroll: (value: boolean) => void;
  scrollToBottom: (animated: boolean) => void;
}

export const useMessageActions = ({
  roomId,
  expert,
  userBirthInfo,
  messages,
  setMessages,
  setShouldAutoScroll,
  scrollToBottom
}: UseMessageActionsProps) => {
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [hasNewMessageThisSession, setHasNewMessageThisSession] = useState(false);

  // 마지막 메시지 저장 함수
  const saveLastMessage = (message: string, createdAt: string) => {
    if (!message || !message.trim()) return;
    
    const cleanedText = removeBoldMarkup(message);
    const previewText = cleanedText.length > 30 ? cleanedText.substring(0, 30) + '...' : cleanedText;
    
    supabase
      .from('chat_rooms')
      .update({
        last_message: previewText,
        last_message_at: createdAt,
      })
      .eq('id', roomId);
  };

  const sendMessageWithText = async (text: string) => {
    if (!text.trim() || isAiResponding) return;
    setHasNewMessageThisSession(true);

    const userMessage = {
      id: `temp_user_${Date.now()}`,
      chat_room_id: roomId,
      sender_type: 'user',
      message: text.trim(),
      created_at: new Date().toISOString()
    };

    try {
      // 사용자 메시지 UI 업데이트 및 DB 저장
      setMessages(prev => [...prev, userMessage as ChatMessage]);
      // 새 메시지 전송 시 자동 스크롤 활성화
      setShouldAutoScroll(true);
      scrollToBottom(true);

      const { id: _tempUserId, ...dbUserMessage } = userMessage;
      const { error: userMessageError } = await supabase
        .from('chat_messages')
        .insert(dbUserMessage);

      if (userMessageError) throw userMessageError;

      // AI 응답 생성 시작
      setIsAiResponding(true);

      // 이전 대화 내용 수집 (최근 10개 메시지를 OpenAI 형식으로 변환)
      const recentChatMessages = messages.slice(-10).map(msg => ({
        role: msg.sender_type === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.message
      }));
      
      // 현재 사용자 메시지 추가
      const currentMessages = [
        ...recentChatMessages,
        { role: 'user' as const, content: text.trim() }
      ];
      
      // 메시지가 6개 미만이면 아직 요약이 생성되지 않았을 가능성이 높음
      const recentMessages = currentMessages.length < 6 
        ? currentMessages.slice(1).slice(-6) // 인사말 제외
        : currentMessages.slice(-6); // 전체 메시지

      // AI 응답을 위한 임시 메시지 생성 (식별 가능한 임시 ID 부여)
      const tempId = `temp_ai_${Date.now()}`;
      const tempAiMessage = {
        id: tempId,
        chat_room_id: roomId,
        sender_type: 'expert' as const,
        message: '',
        created_at: new Date().toISOString()
      };
      
      // UI에 임시 메시지 추가
      setMessages(prev => [...prev, tempAiMessage as ChatMessage]);
      scrollToBottom(true);

      // Edge Function 스트리밍 응답 생성
      let aiFinalText = '';
      
      try {
        aiFinalText = await streamChat(
          roomId,
          expert.category,
          recentMessages,
          (userBirthInfo || {}) as Record<string, unknown>,
          (chunk: string) => {
            // 스트리밍으로 받은 텍스트를 메시지에 추가
            setMessages(prev => prev.map(msg => 
              (msg as any).id === tempId
                ? { ...msg, message: (msg as any).message + chunk }
                : msg
            ));
          }
        );
      } catch (error) {
        throw new Error('AI 응답 생성 실패');
      }

      // 팔로업 질문 파싱
      const followUpQuestions = extractFollowUpQuestions(aiFinalText);
      
      // 팔로업 질문 제거한 최종 메시지
      const cleanedMessage = removeFollowUpQuestionsFromText(aiFinalText);

      // 스트리밍 완료 후 최종 메시지로 업데이트
      setMessages(prev => prev.map(msg => 
        (msg as any).id === tempId
          ? { ...msg, message: cleanedMessage, follow_up_questions: followUpQuestions }
          : msg
      ));

      // 최종 메시지를 DB에 저장
      // DB 저장 시 임시 id와 follow_up_questions는 제외하고 저장 (DB 스키마에 없음)
      const { id: _ignoreTempId, follow_up_questions: _ignoreFollowUp, ...dbAiMessage } = tempAiMessage as any;
      const { error: aiMessageError } = await supabase
        .from('chat_messages')
        .insert({
          ...dbAiMessage,
          message: cleanedMessage,
        });

      if (aiMessageError) throw aiMessageError;

      // 대화 리스트 캐시 즉시 업데이트
      if (aiFinalText) {
        const timestampLabel = new Date().toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        updateChatListPreview(roomId, aiFinalText, timestampLabel);
      }

      // AI 응답 완료 후 마지막 메시지 저장
      saveLastMessage(cleanedMessage, tempAiMessage.created_at);

    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('오류', '메시지 전송에 실패했습니다.');
      // 에러 발생 시 임시 메시지 제거
      setMessages(prev => prev.filter(msg => (msg as any).id !== userMessage.id));
    } finally {
      setIsAiResponding(false);
    }
  };

  const sendMessage = async (message: string) => {
    if (!message.trim() || isAiResponding) return;
    setHasNewMessageThisSession(true);

    const userMessage = {
      id: `temp_user_${Date.now()}`,
      chat_room_id: roomId,
      sender_type: 'user',
      message: message.trim(),
      created_at: new Date().toISOString()
    };

    try {
      // 사용자 메시지 UI 업데이트 및 DB 저장
      setMessages(prev => [...prev, userMessage as ChatMessage]);
      // 새 입력 시는 자연스러운 애니메이션 스크롤
      scrollToBottom(true);

      const { id: _tempUserId, ...dbUserMessage } = userMessage;
      const { error: userMessageError } = await supabase
        .from('chat_messages')
        .insert(dbUserMessage);

      if (userMessageError) throw userMessageError;

      // AI 응답 생성 시작
      setIsAiResponding(true);

      // 이전 대화 내용 수집 (최근 10개 메시지를 OpenAI 형식으로 변환)
      const recentChatMessages = messages.slice(-10).map(msg => ({
        role: msg.sender_type === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.message
      }));
      
      // 현재 사용자 메시지 추가
      const currentMessages = [
        ...recentChatMessages,
        { role: 'user' as const, content: message.trim() }
      ];
      
      // 메시지가 6개 미만이면 아직 요약이 생성되지 않았을 가능성이 높음
      const recentMessages = currentMessages.length < 6 
        ? currentMessages.slice(1).slice(-6) // 인사말 제외
        : currentMessages.slice(-6); // 전체 메시지

      // AI 응답을 위한 임시 메시지 생성 (식별 가능한 임시 ID 부여)
      const tempId = `temp_ai_${Date.now()}`;
      const tempAiMessage = {
        id: tempId,
        chat_room_id: roomId,
        sender_type: 'expert' as const,
        message: '',
        created_at: new Date().toISOString()
      };
      
      // UI에 임시 메시지 추가
      setMessages(prev => [...prev, tempAiMessage as ChatMessage]);
      scrollToBottom(true);

      // Edge Function 스트리밍 응답 생성
      let aiFinalText = '';
      
      try {
        aiFinalText = await streamChat(
          roomId,
          expert.category,
          recentMessages,
          (userBirthInfo || {}) as Record<string, unknown>,
          (chunk: string) => {
            // 스트리밍으로 받은 텍스트를 메시지에 추가
            setMessages(prev => prev.map(msg => 
              (msg as any).id === tempId
                ? { ...msg, message: (msg as any).message + chunk }
                : msg
            ));
          }
        );
      } catch (error) {
        throw new Error('AI 응답 생성 실패');
      }

      // 팔로업 질문 파싱
      const followUpQuestions = extractFollowUpQuestions(aiFinalText);
      
      // 팔로업 질문 제거한 최종 메시지
      const cleanedMessage = removeFollowUpQuestionsFromText(aiFinalText);

      // 스트리밍 완료 후 최종 메시지로 업데이트
      setMessages(prev => prev.map(msg => 
        (msg as any).id === tempId
          ? { ...msg, message: cleanedMessage, follow_up_questions: followUpQuestions }
          : msg
      ));

      // 최종 메시지를 DB에 저장
      // DB 저장 시 임시 id와 follow_up_questions는 제외하고 저장 (DB 스키마에 없음)
      const { id: _ignoreTempId, follow_up_questions: _ignoreFollowUp, ...dbAiMessage } = tempAiMessage as any;
      const { error: aiMessageError } = await supabase
        .from('chat_messages')
        .insert({
          ...dbAiMessage,
          message: cleanedMessage,
        });

      if (aiMessageError) throw aiMessageError;

      // 대화 리스트 캐시 즉시 업데이트
      if (aiFinalText) {
        const timestampLabel = new Date().toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        updateChatListPreview(roomId, aiFinalText, timestampLabel);
      }

      // AI 응답 완료 후 마지막 메시지 저장
      saveLastMessage(cleanedMessage, tempAiMessage.created_at);

    } catch (error) {
      console.error('Error in message flow:', error);
      // 에러 시 메시지 롤백
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
      Alert.alert('오류', '메시지 처리 중 문제가 발생했습니다.');
    } finally {
      setIsAiResponding(false);
    }
  };

  return {
    isAiResponding,
    hasNewMessageThisSession,
    sendMessage,
    sendMessageWithText
  };
};
