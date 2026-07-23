/**
 * prepareMessagesForAI - AI 응답 생성을 위한 메시지 컨텍스트 준비
 * 
 * 역할:
 * - 최근 8개 채팅 메시지를 OpenAI 형식으로 변환 (role, content)
 * - 메시지별 길이를 제한해 컨텍스트가 과하게 커지지 않도록 제어
 * - 현재 사용자 메시지를 컨텍스트에 추가
 * - OpenAI API 형식의 메시지 배열 반환
 */
import { ChatMessage } from '../../../../../types/chat';

export interface OpenAIMessage {
  role: 'user' | 'assistant';
  content: string;
}

const MAX_CONTEXT_MESSAGES = 8;
const MAX_USER_MESSAGE_LENGTH = 500;
const MAX_ASSISTANT_MESSAGE_LENGTH = 300;

function truncateContextMessage(content: string, role: OpenAIMessage['role']): string {
  const compact = content.replace(/\s+/g, ' ').trim();
  const maxLength = role === 'user' ? MAX_USER_MESSAGE_LENGTH : MAX_ASSISTANT_MESSAGE_LENGTH;
  if (compact.length <= maxLength) {
    return compact;
  }
  return `${compact.slice(0, maxLength - 3)}...`;
}

export function prepareMessagesForAI(
  messages: ChatMessage[],
  currentUserMessage: string
): OpenAIMessage[] {
  const recentChatMessages: OpenAIMessage[] = messages.slice(-(MAX_CONTEXT_MESSAGES - 1)).map(msg => {
    const role = msg.sender_type === 'user' ? 'user' : 'assistant';
    return {
      role,
      content: truncateContextMessage(msg.message, role)
    };
  });

  return [
    ...recentChatMessages,
    {
      role: 'user' as const,
      content: truncateContextMessage(currentUserMessage, 'user')
    }
  ];
}
