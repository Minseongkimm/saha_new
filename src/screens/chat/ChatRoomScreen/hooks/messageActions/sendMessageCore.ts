/**
 * sendMessageCore - 메시지 전송 전체 플로우 조율
 * 
 * 역할:
 * - 메시지 전송 프로세스의 전체 흐름 관리
 * - 각 단계 함수들을 순차적으로 호출 및 조율:
 *   1. 잔액/무료 대화 체크 (checkBalanceBeforeSend)
 *   2. 사용자 메시지 저장 (sendUserMessage)
 *   3. AI용 메시지 준비 (prepareMessagesForAI)
 *   4. AI 응답 처리 (processAiResponse)
 *   5. 무료 대화 ID 업데이트 (updateFreeMessageId)
 *   6. 잔액 및 무료 메시지 정보 UI 업데이트 (onBalanceUpdate)
 * - 에러 발생 시 사용자 메시지 롤백 처리
 */
import { Alert } from 'react-native';
import { ChatMessage } from '../../../../../types/chat';
import { BirthInfo } from '../../../../../services/ai';
import { checkBalanceBeforeSend } from './checkBalanceBeforeSend';
import { RefreshBalanceExpected } from '../useChatRoom';
import { sendUserMessage } from './sendUserMessage';
import { prepareMessagesForAI } from './prepareMessagesForAI';
import { processAiResponse } from './processAiResponse';
import { updateFreeMessageId } from './updateFreeMessageId';

interface SendMessageCoreParams {
  roomId: string;
  messageText: string;
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

export async function sendMessageCore(params: SendMessageCoreParams): Promise<void> {
  const {
    roomId,
    messageText,
    expert,
    userBirthInfo,
    messages,
    setMessages,
    setShouldAutoScroll,
    scrollToBottom,
    onBalanceUpdate,
    onBalanceInsufficient,
    partnerData
  } = params;
  
  if (!messageText.trim()) return;
  
  const balanceCheck = await checkBalanceBeforeSend();
  if (!balanceCheck.canSend) {
    if (onBalanceInsufficient) {
      onBalanceInsufficient(balanceCheck);
    }
    return;
  }
  const initialFreeMessageInfo = balanceCheck.freeMessageInfo;
  const initialBalance = balanceCheck.balance;
  
  let tempUserMessageId: string | null = null;
  let userMessageId: string | null = null;
  
  try {
    const userMessageResult = await sendUserMessage(roomId, messageText, setMessages, scrollToBottom);
    userMessageId = userMessageResult.userMessageId;
    tempUserMessageId = userMessageResult.tempUserMessageId;
    
    if (!userMessageId) throw new Error('사용자 메시지 저장 실패');
    
    setShouldAutoScroll(true);
    
    const preparedMessages = prepareMessagesForAI(messages, messageText);
    const tempAiMessageId = `temp_ai_${Date.now()}`;
    
    const { aiMessageId } = await processAiResponse({
      roomId,
      expertCategory: expert.category,
      messages: preparedMessages,
      userBirthInfo,
      userMessageId,
      tempAiMessageId,
      setMessages,
      scrollToBottom,
      partnerData
    });
    
    const didUseFreeMessage = initialFreeMessageInfo?.available ?? false;
    if (didUseFreeMessage && aiMessageId && userMessageId) {
      await updateFreeMessageId(roomId, userMessageId, aiMessageId);
    }
    
    // 잔액 및 무료 메시지 정보 업데이트
    // refreshBalance 함수가 전달되면 잔액과 무료 메시지 정보를 모두 업데이트
    if (onBalanceUpdate) {
      const expected: RefreshBalanceExpected = {};
      if (initialFreeMessageInfo) {
        if (didUseFreeMessage) {
          const nextUsedCount = initialFreeMessageInfo.usedCount + 1;
          expected.freeInfo = {
            available: nextUsedCount < initialFreeMessageInfo.dailyLimit,
            usedCount: nextUsedCount,
            dailyLimit: initialFreeMessageInfo.dailyLimit
          };
        } else {
          expected.freeInfo = initialFreeMessageInfo;
        }
      }

      if (typeof initialBalance === 'number') {
        expected.balance = didUseFreeMessage
          ? initialBalance
          : Math.max(0, initialBalance - 1);
      }

      const hasExpectedPayload = expected.freeInfo !== undefined || expected.balance !== undefined;
      await onBalanceUpdate(hasExpectedPayload ? expected : undefined);
    }
  } catch (error: any) {
    console.error('Error sending message:', error);
    if (tempUserMessageId) {
      setMessages(prev => prev.filter(msg => msg.id !== tempUserMessageId));
    }
    Alert.alert('오류', '메시지 전송에 실패했습니다.');
    throw error;
  }
}


