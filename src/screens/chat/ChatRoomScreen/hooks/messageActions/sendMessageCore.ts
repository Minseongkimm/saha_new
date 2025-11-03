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
import { supabase } from '../../../../../utils/database/supabaseClient';
import { fetchUserBalance } from '../../../../../utils/payments/balance';
import { ChatMessage } from '../../../../../types/chat';
import { BirthInfo } from '../../../../../services/ai';
import { checkBalanceBeforeSend } from './checkBalanceBeforeSend';
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
  onBalanceUpdate?: ((newBalance: number) => void) | (() => Promise<void>);
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
    onBalanceUpdate
  } = params;
  
  if (!messageText.trim()) return;
  
  const canSend = await checkBalanceBeforeSend();
  if (!canSend) return;
  
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
      scrollToBottom
    });
    
    if (aiMessageId && userMessageId) {
      await updateFreeMessageId(roomId, userMessageId, aiMessageId);
    }
    
    // 잔액 및 무료 메시지 정보 업데이트
    // refreshBalance 함수가 전달되면 잔액과 무료 메시지 정보를 모두 업데이트
    if (onBalanceUpdate) {
      try {
        // refreshBalance 같은 함수인 경우 (파라미터 없음, Promise 반환)
        await (onBalanceUpdate as () => Promise<void>)();
      } catch {
        // 숫자를 받는 콜백인 경우 (기존 호환성을 위해)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const newBalance = await fetchUserBalance(user.id);
          (onBalanceUpdate as (balance: number) => void)(newBalance);
        }
      }
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

