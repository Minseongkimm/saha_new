/**
 * useChatRoom - 채팅방 메인 로직 훅
 * 메시지 관리, 실시간 구독, 환영 메시지 생성, 사용자 정보 조회
 */
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../../utils/database/supabaseClient';
import { getCachedMessages, setCachedMessages } from '../../../../utils/chat/chatCache';
import { markChatListNeedsRefresh } from '../../../../utils/chat/chatListCache';
import { welcomeService } from '../../../../services/chat/welcomeService';
import { ChatMessage } from '../../../../types/chat';
import { BirthInfo } from '../../../../services/ai';
import { fetchUserBalance } from '../../../../utils/payments/balance';

interface UseChatRoomProps {
  roomId: string;
  expert: any;
}

export const useChatRoom = ({ roomId, expert }: UseChatRoomProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [userBirthInfo, setUserBirthInfo] = useState<BirthInfo | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const flatListRef = useRef<any>(null);

  const scrollToBottom = (animated: boolean) => {
    if (!shouldAutoScroll) return;
    
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated });
    });
  };

  // 초기 인사말 생성 (ExpertAIService 사용)
  const generateWelcomeMessage = async () => {
    try {
      // 임시 메시지 생성 (스트리밍 효과를 위해)
      const tempMessageId = `welcome_${Date.now()}`;
      let streamedText = '';
      
      const tempMessage: ChatMessage = {
        id: tempMessageId,
        chat_room_id: roomId,
        sender_type: 'expert' as const,
        message: '',
        created_at: new Date().toISOString()
      };
      
      // UI에 빈 메시지 추가
      setMessages(prev => [...prev, tempMessage]);
      
      // 스트리밍 효과로 환영 메시지 생성
      const welcomeText = await welcomeService.generateWelcomeMessage(
        expert.name,
        (chunk: string) => {
          // 청크가 들어올 때마다 업데이트
          streamedText += chunk;
          setMessages(prev => 
            prev.map(msg => 
              msg.id === tempMessageId 
                ? { ...msg, message: streamedText }
                : msg
            )
          );
        }
      );
      
      // 최종 메시지로 업데이트
      const finalMessage = {
        ...tempMessage,
        message: welcomeText.trim()
      };
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempMessageId ? finalMessage : msg
        )
      );
      
      // DB에 인사말 저장
      const { id: _ignoreId, ...dbWelcomeMessage } = finalMessage as any;
      await supabase
        .from('chat_messages')
        .insert(dbWelcomeMessage);
        
      // 캐시 업데이트
      setCachedMessages(roomId, [...messages, finalMessage]);
      
      scrollToBottom(true);
    } catch (error) {
      console.error('Error generating welcome message:', error);
    }
  };

  // 메시지 목록 가져오기
  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(30);  // 최근 30개만

      if (error) throw error;
      const ordered = (data || []).reverse();
      setMessages(ordered);
      setCachedMessages(roomId, ordered);
      
      // 메시지가 없으면 초기 인사말 생성
      if (ordered.length === 0) {
        await generateWelcomeMessage();
      }
      
      // 데이터 적용 직후 1회 무애니메이션으로 맨 아래 고정
      scrollToBottom(false);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // 초기 메시지 로드 및 실시간 구독
  useEffect(() => {
    // 캐시 우선 표시
    const cached = getCachedMessages(roomId);
    if (cached.length > 0) {
      setMessages(cached);
      setLoading(false);
      // 캐시 표시 직후 즉시 하단 고정
      scrollToBottom(false);
      // 백그라운드 새로고침
      fetchMessages();
    } else {
      fetchMessages();
    }

    // 실시간 메시지 구독
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_room_id=eq.${roomId}`
        },
        (payload) => {
          // 새 메시지를 바로 추가 (전체 새로고침 없이)
          setMessages(prev => {
            const newMessage = payload.new as ChatMessage;
            // 실시간으로 온 메시지는 follow_up_questions가 없을 수 있으므로
            // 기존 메시지에서 같은 ID를 가진 메시지가 있다면 follow_up_questions를 보존
            const existingMessage = prev.find(msg => msg.id === newMessage.id);
            const messageWithFollowUp = existingMessage 
              ? { ...newMessage, follow_up_questions: existingMessage.follow_up_questions }
              : newMessage;
            
            const next = [...prev.filter(msg => msg.id !== newMessage.id), messageWithFollowUp];
            setCachedMessages(roomId, next);
            return next;
          });
          // 실시간 도착 시에도 항상 하단 고정
          scrollToBottom(true);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      // 대화방 나갈 때 대화 리스트 새로고침 필요 표시
      markChatListNeedsRefresh();
    };
  }, [roomId]);

  // 사용자의 사주 정보 가져오기
  useEffect(() => {
    const fetchUserBirthInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('birth_infos')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching birth info:', error);
        return;
      }

      if (data) {
        setUserBirthInfo(data as BirthInfo);
      }

      const balance = await fetchUserBalance(user.id);
      setCurrentBalance(balance ?? 0);
    };

    fetchUserBirthInfo();
  }, []);

  const refreshBalance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const balance = await fetchUserBalance(user.id);
      setCurrentBalance(balance ?? 0);
    }
  };

  return {
    messages,
    setMessages,
    loading,
    userBirthInfo,
    shouldAutoScroll,
    setShouldAutoScroll,
    flatListRef,
    scrollToBottom,
    currentBalance,
    refreshBalance
  };
};
