export interface ChatRoom {
  id: string;
  user_id: string;
  expert_id: string;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  chat_room_id: string;
  sender_type: 'user' | 'expert';
  message: string;
  created_at: string;
}
