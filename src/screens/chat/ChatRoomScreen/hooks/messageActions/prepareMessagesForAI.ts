/**
 * prepareMessagesForAI - AI 응답 생성을 위한 메시지 컨텍스트 준비
 * 
 * 역할:
 * - 최근 10개 채팅 메시지를 OpenAI 형식으로 변환 (role, content)
 * - 현재 사용자 메시지를 컨텍스트에 추가
 * - 메시지가 6개 미만일 경우 인사말 제외하고 최근 6개만 전송
 * - OpenAI API 형식의 메시지 배열 반환
 */
import { ChatMessage } from '../../../../../types/chat';

export interface OpenAIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function prepareMessagesForAI(
  messages: ChatMessage[],
  currentUserMessage: string
): OpenAIMessage[] {
  const recentChatMessages: OpenAIMessage[] = messages.slice(-10).map(msg => ({
    role: msg.sender_type === 'user' ? 'user' : 'assistant',
    content: msg.message
  }));
  const currentMessages = [
    ...recentChatMessages,
    { role: 'user' as const, content: currentUserMessage.trim() }
  ];
  const recentMessages = currentMessages.length < 6 
    ? currentMessages.slice(1).slice(-6)
    : currentMessages.slice(-6);
  return recentMessages;
}

