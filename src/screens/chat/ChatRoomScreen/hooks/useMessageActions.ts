/**
 * useMessageActions - 메시지 액션 훅
 * 메시지 전송 오케스트레이션
 */
import { useState, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import { ChatMessage } from '../../../../types/chat';
import { BirthInfo } from '../../../../services/ai';
import { sendMessageCore } from './messageActions/sendMessageCore';
import { RefreshBalanceExpected } from './useChatRoom';

interface UseMessageActionsProps {
  roomId: string | null;
  expert: any;
  userBirthInfo: BirthInfo | null;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setShouldAutoScroll: (value: boolean) => void;
  scrollToBottom: (animated: boolean) => void;
  onBalanceUpdate?: (expected?: RefreshBalanceExpected) => Promise<void>;
  onBalanceInsufficient?: (balanceCheck: { freeMessageInfo?: any; balance?: number }) => void;
  onRoomCreated?: (newRoomId: string) => void;
  navigation?: any;
  partnerData?: any;
}

export const useMessageActions = ({
  roomId,
  expert,
  userBirthInfo,
  messages,
  setMessages,
  setShouldAutoScroll,
  scrollToBottom,
  onBalanceUpdate,
  onBalanceInsufficient,
  onRoomCreated,
  navigation,
  partnerData
}: UseMessageActionsProps) => {
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [hasNewMessageThisSession, setHasNewMessageThisSession] = useState(false);
  const currentRoomIdRef = useRef<string | null>(roomId);

  // roomId 업데이트 추적
  useEffect(() => {
    currentRoomIdRef.current = roomId;
  }, [roomId]);

  const sendMessage = async (message: string, options?: { suppressUserBubble?: boolean }) => {
    if (isAiResponding) return;
    
    setIsAiResponding(true);
    setHasNewMessageThisSession(true);
    
    try {
      let actualRoomId = currentRoomIdRef.current;
      
      // roomId가 없으면 방 생성
      if (!actualRoomId) {
        const { createChatRoomWithExpert } = await import('../../../../utils/chat/chatUtils');
        const result = await createChatRoomWithExpert(navigation, expert.id, partnerData);
        if (!result) {
          Alert.alert('오류', '대화방을 생성할 수 없습니다.');
          return;
        }
        actualRoomId = result.roomId;
        currentRoomIdRef.current = actualRoomId;
        if (onRoomCreated) {
          onRoomCreated(actualRoomId);
        }
      }
      
      await sendMessageCore({
        roomId: actualRoomId,
        messageText: message,
        expert,
        userBirthInfo,
        messages,
        setMessages,
        setShouldAutoScroll,
        scrollToBottom,
        onBalanceUpdate,
        onBalanceInsufficient,
        partnerData,
        suppressUserBubble: options?.suppressUserBubble
      });
    } finally {
      setIsAiResponding(false);
    }
  };

  const sendMessageWithText = sendMessage;

  return {
    isAiResponding,
    hasNewMessageThisSession,
    sendMessage,
    sendMessageWithText
  };
};
