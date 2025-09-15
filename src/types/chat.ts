export interface ChatRoom {
  id: string;
  user_id: string;
  expert_id: string;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
}

// DB에 저장되는 실제 메시지 타입
export interface ChatMessageDB {
  id: string;
  chat_room_id: string;
  sender_type: 'user' | 'expert';
  message: string;
  created_at: string;
}

// UI에서 사용되는 확장된 메시지 타입
export interface ChatMessage extends ChatMessageDB {
  follow_up_questions?: string[];
}
