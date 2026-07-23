/**
 * useMessageActions - 메시지 액션 훅
 * 메시지 전송 오케스트레이션
 */
import { useState } from 'react';
import { ChatMessage } from '../../../../types/chat';
import { BirthInfo } from '../../../../services/ai';
import { sendMessageCore } from './messageActions/sendMessageCore';
import { RefreshBalanceExpected } from './useChatRoom';

interface UseMessageActionsProps {
  roomId: string;
  expert: any;
  userBirthInfo: BirthInfo | null;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setShouldAutoScroll: (value: boolean) => void;
  scrollToBottom: (animated: boolean) => void;
  onBalanceUpdate?: (expected?: RefreshBalanceExpected) => Promise<void>;
  onBalanceInsufficient?: (balanceCheck: { freeMessageInfo?: any; balance?: number }) => void;
  partnerData?: any;
}

interface SendMessageOptions {
  partnerDataOverride?: any;
  suppressUserMessageUiAppend?: boolean;
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
  partnerData
}: UseMessageActionsProps) => {
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [hasNewMessageThisSession, setHasNewMessageThisSession] = useState(false);

  const sendMessage = async (message: string, options?: SendMessageOptions) => {
    if (isAiResponding) return;
    
    setIsAiResponding(true);
    setHasNewMessageThisSession(true);
    
    try {
      await sendMessageCore({
        roomId,
        messageText: message,
        expert,
        userBirthInfo,
        messages,
        setMessages,
        setShouldAutoScroll,
        scrollToBottom,
        onBalanceUpdate,
        onBalanceInsufficient,
        partnerData: options?.partnerDataOverride ?? partnerData,
        suppressUserMessageUiAppend: options?.suppressUserMessageUiAppend
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
