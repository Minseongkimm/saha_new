import { ChatMessage } from '../types/chat';

const roomIdToMessages: Map<string, ChatMessage[]> = new Map();

export const getCachedMessages = (roomId: string): ChatMessage[] => {
  const cached: ChatMessage[] | undefined = roomIdToMessages.get(roomId);
  return cached ? [...cached] : [];
};

export const setCachedMessages = (roomId: string, messages: ChatMessage[]): void => {
  roomIdToMessages.set(roomId, [...messages]);
};

export const clearCachedMessages = (roomId: string): void => {
  roomIdToMessages.delete(roomId);
};


