import React, { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  AppState,
  AppStateStatus,
  InteractionManager,
} from 'react-native';
import { Colors } from '../constants/colors';
import Icon from 'react-native-vector-icons/Ionicons';
import { ChatMessage, ChatMessageDB } from '../types/chat';
import { getExpertImage } from '../utils/getExpertImage';
import { BirthInfo } from '../services/ai';
import { INITIAL_QUESTIONS } from '../services/ai/prompts';
import { streamChat } from '../services/ai/edgeFunctionClient';
import { expertAIService } from '../services/ai';
import { supabase } from '../utils/supabaseClient';
import { getCachedMessages, setCachedMessages } from '../utils/chatCache';
import { markChatListNeedsRefresh, updateChatListPreview } from '../utils/chatListCache';

interface ChatRoomScreenProps {
  navigation: any;
  route: any;
}

const ChatRoomScreen: React.FC<ChatRoomScreenProps> = ({ navigation, route }) => {
  const { roomId, expert } = route.params;
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList<ChatMessage> | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const scrollToBottom = (animated: boolean) => {
    if (!shouldAutoScroll) return;
    
    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToEnd({ animated });
      });
    });
  };

  // **text** 형태를 볼드 처리하는 함수
  const renderFormattedText = (text: string) => {
    if (!text) return '';
    
    const parts = text.split(/(\*\*.*?\*\*)/);
    
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2);
        return (
          <Text key={index} style={styles.boldText}>
            {boldText}
          </Text>
        );
      }
      return part;
    });
  };

  // 팔로업 질문 추출 함수
  const extractFollowUpQuestions = (text: string): string[] => {
    const followUpQuestions: string[] = [];
    
    // 형식 1: "팔로업 질문:" 형식 (4개)
    const format1Regex = /팔로업\s*질문:\s*\n\s*1\.\s*([^\n]+)\s*\n\s*2\.\s*([^\n]+)\s*\n\s*3\.\s*([^\n]+)\s*\n\s*4\.\s*([^\n]+)/;
    const format1Match = text.match(format1Regex);
    
    // 형식 2: "다음으로 궁금하신 점은 무엇인지요?" 형식 (4개)
    const format2Regex = /다음으로\s*궁금하신\s*점은\s*무엇인지요\?[\s\S]*?1\.\s*([^\n]+)[\s\S]*?2\.\s*([^\n]+)[\s\S]*?3\.\s*([^\n]+)[\s\S]*?4\.\s*([^\n]+)/;
    const format2Match = text.match(format2Regex);
    
    // 형식 3: 단순히 1. 2. 3. 4. 형식
    const format3Regex = /1\.\s*([^\n]+)[\s\S]*?2\.\s*([^\n]+)[\s\S]*?3\.\s*([^\n]+)[\s\S]*?4\.\s*([^\n]+)/;
    const format3Match = text.match(format3Regex);

    if (format1Match && format1Match[1] && format1Match[2] && format1Match[3] && format1Match[4]) {
      followUpQuestions.push(format1Match[1].trim(), format1Match[2].trim(), format1Match[3].trim(), format1Match[4].trim());
    } else if (format2Match && format2Match[1] && format2Match[2] && format2Match[3] && format2Match[4]) {
      followUpQuestions.push(format2Match[1].trim(), format2Match[2].trim(), format2Match[3].trim(), format2Match[4].trim());
    } else if (format3Match && format3Match[1] && format3Match[2] && format3Match[3] && format3Match[4]) {
      followUpQuestions.push(format3Match[1].trim(), format3Match[2].trim(), format3Match[3].trim(), format3Match[4].trim());
    }
    
    return followUpQuestions;
  };

  // 팔로업 질문 제거 함수
  const removeFollowUpQuestionsFromText = (text: string): string => {
    let cleanText = text;
    
    // 형식 1 제거
    cleanText = cleanText.replace(/팔로업\s*질문:[\s\S]*$/, '').trim();
    
    // 형식 2 제거
    cleanText = cleanText.replace(/다음으로\s*궁금하신\s*점은\s*무엇인지요\?[\s\S]*$/, '').trim();
    
    // 형식 3 제거 (끝부분의 1. 2. 3. 4. 패턴)
    cleanText = cleanText.replace(/\n\s*1\.\s*[^\n]+[\s\S]*?4\.\s*[^\n]+[\s\S]*$/, '').trim();
    
    return cleanText;
  };

  // 초기 인사말 생성 (ExpertAIService 사용)
  const generateWelcomeMessage = async () => {
    try {
      // ExpertAIService를 사용하여 환영 메시지 생성 (내부적으로 에러 처리됨)
      const welcomeText = await expertAIService.generateWelcomeMessage(expert.category as any);
      
      const welcomeMessage = {
        id: `welcome_${Date.now()}`,
        chat_room_id: roomId,
        sender_type: 'expert' as const,
        message: welcomeText.trim(),
        created_at: new Date().toISOString()
      };

      // UI에 인사말 추가
      setMessages(prev => [...prev, welcomeMessage as ChatMessage]);
      
      // DB에 인사말 저장
      const { id: _ignoreId, ...dbWelcomeMessage } = welcomeMessage as any;
      await supabase
        .from('chat_messages')
        .insert(dbWelcomeMessage);
        
      // 캐시 업데이트
      setCachedMessages(roomId, [...messages, welcomeMessage as ChatMessage]);
      
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

  const [isAiResponding, setIsAiResponding] = useState(false);
  const [userBirthInfo, setUserBirthInfo] = useState<BirthInfo | null>(null);

  // 방 이탈 시 최신 미리보기 갱신을 위한 마지막 메시지 보관
  const lastPreviewRef = useRef<{ text: string; at: string | null }>({ text: '', at: null });
  const lastSavedRef = useRef<{ text: string; at: string | null }>({ text: '', at: null });
  const saveLastPreviewIfAny = () => {
    const { text, at } = lastPreviewRef.current;
    const saved = lastSavedRef.current;
    if (!text) return;
    if (text === saved.text && at === saved.at) return;
    void supabase
      .from('chat_rooms')
      .update({
        last_message: text,
        last_message_at: at || new Date().toISOString(),
      })
      .eq('id', roomId);
    lastSavedRef.current = { text, at };
  };
  useEffect(() => {
    if (messages.length > 0) {
      const last = messages[messages.length - 1];
      lastPreviewRef.current = {
        text: last.message || '',
        at: last.created_at || null,
      };
    }
  }, [messages]);
  useEffect(() => {
    return () => {
      saveLastPreviewIfAny();
    };
  }, [roomId]);
  useEffect(() => {
    const onAppStateChange = (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        saveLastPreviewIfAny();
      }
    };
    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => {
      sub.remove();
    };
  }, []);
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      saveLastPreviewIfAny();
    });
    return unsubscribe;
  }, [navigation, roomId]);

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
    };

    fetchUserBirthInfo();
  }, []);

  const sendMessageWithText = async (text: string) => {
    if (!text.trim() || isAiResponding) return;

    const userMessage = {
      id: `temp_user_${Date.now()}`,
      chat_room_id: roomId,
      sender_type: 'user',
      message: text.trim(),
      created_at: new Date().toISOString()
    };

    try {
      // 사용자 메시지 UI 업데이트 및 DB 저장
      setMessages(prev => [...prev, userMessage as ChatMessage]);
      // 새 메시지 전송 시 자동 스크롤 활성화
      setShouldAutoScroll(true);
      scrollToBottom(true);
      setMessage('');

      const { id: _tempUserId, ...dbUserMessage } = userMessage;
      const { error: userMessageError } = await supabase
        .from('chat_messages')
        .insert(dbUserMessage);

      if (userMessageError) throw userMessageError;

      // 최근 메시지 갱신은 방 이탈 시 일괄 처리

      // AI 응답 생성 시작
      setIsAiResponding(true);

      // 이전 대화 내용 수집 (최근 10개 메시지를 OpenAI 형식으로 변환)
      const recentChatMessages = messages.slice(-10).map(msg => ({
        role: msg.sender_type === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.message
      }));
      
      // 현재 사용자 메시지 추가
      const currentMessages = [
        ...recentChatMessages,
        { role: 'user' as const, content: text.trim() }
      ];

      // AI 응답을 위한 임시 메시지 생성 (식별 가능한 임시 ID 부여)
      const tempId = `temp_ai_${Date.now()}`;
      const tempAiMessage = {
        id: tempId,
        chat_room_id: roomId,
        sender_type: 'expert' as const,
        message: '',
        created_at: new Date().toISOString()
      };
      
      // UI에 임시 메시지 추가
      setMessages(prev => [...prev, tempAiMessage as ChatMessage]);
      scrollToBottom(true);

      // Edge Function 스트리밍 응답 생성
      let aiFinalText = '';
      
      try {
        aiFinalText = await streamChat(
          expert.category,
          currentMessages,
          (userBirthInfo || {}) as Record<string, unknown>,
          (chunk: string) => {
            // 스트리밍으로 받은 텍스트를 메시지에 추가
            setMessages(prev => prev.map(msg => 
              (msg as any).id === tempId
                ? { ...msg, message: (msg as any).message + chunk }
                : msg
            ));
          }
        );
      } catch (error) {
        throw new Error('AI 응답 생성 실패');
      }

      // 팔로업 질문 파싱
      const followUpQuestions = extractFollowUpQuestions(aiFinalText);
      
      // 팔로업 질문 제거한 최종 메시지
      const cleanedMessage = removeFollowUpQuestionsFromText(aiFinalText);

      // 스트리밍 완료 후 최종 메시지로 업데이트
      setMessages(prev => prev.map(msg => 
        (msg as any).id === tempId
          ? { ...msg, message: cleanedMessage, follow_up_questions: followUpQuestions }
          : msg
      ));

      // 최종 메시지를 DB에 저장
      // DB 저장 시 임시 id와 follow_up_questions는 제외하고 저장 (DB 스키마에 없음)
      const { id: _ignoreTempId, follow_up_questions: _ignoreFollowUp, ...dbAiMessage } = tempAiMessage as any;
      const { error: aiMessageError } = await supabase
        .from('chat_messages')
        .insert({
          ...dbAiMessage,
          message: cleanedMessage,
        });

      if (aiMessageError) throw aiMessageError;

      // 대화 리스트 캐시 즉시 업데이트
      if (aiFinalText) {
        const timestampLabel = new Date().toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        updateChatListPreview(roomId, aiFinalText, timestampLabel);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('오류', '메시지 전송에 실패했습니다.');
      // 에러 발생 시 임시 메시지 제거
      setMessages(prev => prev.filter(msg => (msg as any).id !== userMessage.id));
    } finally {
      setIsAiResponding(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || isAiResponding) return;

    const userMessage = {
      id: `temp_user_${Date.now()}`,
      chat_room_id: roomId,
      sender_type: 'user',
      message: message.trim(),
      created_at: new Date().toISOString()
    };

    try {
      // 사용자 메시지 UI 업데이트 및 DB 저장
      setMessages(prev => [...prev, userMessage as ChatMessage]);
      // 새 입력 시는 자연스러운 애니메이션 스크롤
      scrollToBottom(true);
      setMessage('');

      const { id: _tempUserId, ...dbUserMessage } = userMessage;
      const { error: userMessageError } = await supabase
        .from('chat_messages')
        .insert(dbUserMessage);

      if (userMessageError) throw userMessageError;

      // 최근 메시지 갱신은 방 이탈 시 일괄 처리

      // AI 응답 생성 시작
      setIsAiResponding(true);

      // 이전 대화 내용 수집 (최근 10개 메시지를 OpenAI 형식으로 변환)
      const recentChatMessages = messages.slice(-10).map(msg => ({
        role: msg.sender_type === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.message
      }));
      
      // 현재 사용자 메시지 추가
      const currentMessages = [
        ...recentChatMessages,
        { role: 'user' as const, content: message.trim() }
      ];

      // AI 응답을 위한 임시 메시지 생성 (식별 가능한 임시 ID 부여)
      const tempId = `temp_ai_${Date.now()}`;
      const tempAiMessage = {
        id: tempId,
        chat_room_id: roomId,
        sender_type: 'expert' as const,
        message: '',
        created_at: new Date().toISOString()
      };
      
      // UI에 임시 메시지 추가
      setMessages(prev => [...prev, tempAiMessage as ChatMessage]);
      scrollToBottom(true);

      // Edge Function 스트리밍 응답 생성
      let aiFinalText = '';
      
      try {
        aiFinalText = await streamChat(
          expert.category,
          currentMessages,
          (userBirthInfo || {}) as Record<string, unknown>,
          (chunk: string) => {
            // 스트리밍으로 받은 텍스트를 메시지에 추가
            setMessages(prev => prev.map(msg => 
              (msg as any).id === tempId
                ? { ...msg, message: (msg as any).message + chunk }
                : msg
            ));
          }
        );
      } catch (error) {
        throw new Error('AI 응답 생성 실패');
      }

      // 팔로업 질문 파싱
      const followUpQuestions = extractFollowUpQuestions(aiFinalText);
      
      // 팔로업 질문 제거한 최종 메시지
      const cleanedMessage = removeFollowUpQuestionsFromText(aiFinalText);

      // 스트리밍 완료 후 최종 메시지로 업데이트
      setMessages(prev => prev.map(msg => 
        (msg as any).id === tempId
          ? { ...msg, message: cleanedMessage, follow_up_questions: followUpQuestions }
          : msg
      ));

      // 최종 메시지를 DB에 저장
      // DB 저장 시 임시 id와 follow_up_questions는 제외하고 저장 (DB 스키마에 없음)
      const { id: _ignoreTempId, follow_up_questions: _ignoreFollowUp, ...dbAiMessage } = tempAiMessage as any;
      const { error: aiMessageError } = await supabase
        .from('chat_messages')
        .insert({
          ...dbAiMessage,
          message: cleanedMessage,
        });

      if (aiMessageError) throw aiMessageError;

      // 대화 리스트 캐시 즉시 업데이트
      if (aiFinalText) {
        const timestampLabel = new Date().toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        updateChatListPreview(roomId, aiFinalText, timestampLabel);
      }

      // 최근 메시지 갱신은 방 이탈 시 일괄 처리

    } catch (error) {
      console.error('Error in message flow:', error);
      // 에러 시 메시지 롤백
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
      Alert.alert('오류', '메시지 처리 중 문제가 발생했습니다.');
    } finally {
      setIsAiResponding(false);
    }
  };

  // 메시지 변경 시 항상 최신으로 스크롤 (메시지 개수 변경 시만)
  useEffect(() => {
    if (messages.length === 0) return;
    scrollToBottom(true);
  }, [messages.length]);

  const TypingIndicator: React.FC = () => {
    const dot1Opacity = useRef(new Animated.Value(0)).current;
    const dot2Opacity = useRef(new Animated.Value(0)).current;
    const dot3Opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      const createLoop = (value: Animated.Value, startDelayMs: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(value, {
              toValue: 1,
              duration: 300,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
              delay: startDelayMs,
            }),
            Animated.timing(value, {
              toValue: 0,
              duration: 300,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ])
        );

      const a = createLoop(dot1Opacity, 0);
      const b = createLoop(dot2Opacity, 150);
      const c = createLoop(dot3Opacity, 300);
      a.start();
      b.start();
      c.start();
      return () => {
        a.stop();
        b.stop();
        c.stop();
      };
    }, [dot1Opacity, dot2Opacity, dot3Opacity]);

    return (
      <View style={styles.typingRow}>
        <Animated.View style={[styles.dot, { opacity: dot1Opacity }]} />
        <Animated.View style={[styles.dot, { opacity: dot2Opacity, marginLeft: 6 }]} />
        <Animated.View style={[styles.dot, { opacity: dot3Opacity, marginLeft: 6 }]} />
      </View>
    );
  };

  const MessageItem = memo(({ item, expertImage, expertName }: { 
    item: ChatMessage; 
    expertImage: any;
    expertName: string;
  }) => {
    const formattedText = useMemo(() => renderFormattedText(item.message), [item.message]);
    const timestamp = useMemo(() => 
      new Date(item.created_at).toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }), [item.created_at]
    );

    return (
      <View style={styles.messageContainer}>
        {item.sender_type === 'expert' && (
          <View style={styles.expertInfo}>
            <Image source={expertImage} style={styles.messageExpertImage} />
            <Text style={styles.expertName}>{expertName}</Text>
          </View>
        )}
        <View style={[
          styles.messageBubble,
          item.sender_type === 'user' ? styles.userMessage : styles.expertMessage
        ]}>
          <Text style={[
            styles.messageText,
            item.sender_type === 'user' ? styles.userMessageText : styles.expertMessageText
          ]}>
            {formattedText}
          </Text>
        </View>
        <Text style={[
          styles.timestampBase,
          item.sender_type === 'user' ? styles.timestampUser : styles.timestampExpert
        ]}>
          {timestamp}
        </Text>
      </View>
    );
  }, (prevProps, nextProps) => {
    // 커스텀 비교: message 내용이 같으면 재렌더링 안 함
    return prevProps.item.message === nextProps.item.message &&
           prevProps.item.id === nextProps.item.id;
  });

  const expertImage = useMemo(() => getExpertImage(expert.image_name), [expert.image_name]);
  
  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    // 빈 메시지이고 AI 응답 중이면 타이핑 인디케이터 표시
    if (item.sender_type === 'expert' && !item.message?.trim() && isAiResponding) {
      return (
        <View style={styles.messageContainer}>
          <View style={styles.expertInfo}>
            <Image source={expertImage} style={styles.messageExpertImage} />
            <Text style={styles.expertName}>{expert.name}</Text>
          </View>
          <View style={[styles.messageBubble, styles.expertMessage]}>
            <TypingIndicator />
          </View>
          <Text style={[styles.timestampBase, styles.timestampExpert]}>
            {new Date(item.created_at).toLocaleTimeString('ko-KR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>
      );
    }
    
    return (
      <MessageItem 
        item={item} 
        expertImage={expertImage}
        expertName={expert.name}
      />
    );
  }, [isAiResponding, expertImage, expert.name]);

  const ListEmptyThinking = () => (
    <View style={styles.messageContainer}>
      <View style={styles.expertInfo}>
        <Image source={getExpertImage(expert.image_name)} style={styles.messageExpertImage} />
        <Text style={styles.expertName}>{expert.name}</Text>
      </View>
      <View style={[styles.messageBubble, styles.expertMessage]}>
        <TypingIndicator />
      </View>
      <Text style={[styles.timestampBase, styles.timestampExpert]}>
        {new Date().toLocaleTimeString('ko-KR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={19} color={Colors.primaryColor} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{expert.title}</Text>
        <View style={styles.placeholder} />
      </View>
      
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
          <FlatList<ChatMessage>
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id || item.created_at}
            style={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollToBottom(false)}
            onLayout={() => scrollToBottom(false)}
            onScrollBeginDrag={() => setShouldAutoScroll(false)}
            onScrollEndDrag={() => {
              setTimeout(() => setShouldAutoScroll(true), 1000);
            }}
            onMomentumScrollEnd={() => {
              setTimeout(() => setShouldAutoScroll(true), 1000);
            }}
            ListEmptyComponent={loading ? ListEmptyThinking : null}
          />
        
        <View style={styles.inputContainer}>
          {/* 초기 질문 옵션 표시 (인사말만 있을 때) */}
          {(() => {
            if (messages.length !== 1) return null;
            const firstMessage = messages[0];
            if (firstMessage.sender_type !== 'expert') return null;
            const initialQuestions = INITIAL_QUESTIONS[expert.category as keyof typeof INITIAL_QUESTIONS];
            if (!initialQuestions?.length) return null;
            
            return (
              <View style={styles.initialQuestionsContainer}>
                <Text style={styles.initialQuestionsTitle}>궁금한 점을 선택해보세요</Text>
                <View style={styles.initialQuestionsGrid}>
                  {initialQuestions.map((question: string, index: number) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.initialQuestionButton}
                      onPress={async () => {
                        await sendMessageWithText(question);
                      }}
                    >
                      <Text style={styles.initialQuestionButtonText} numberOfLines={2}>
                        {question}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          })()}
          
          {/* 팔로업 질문이 있을 때만 표시 */}
          {(() => {
            if (messages.length <= 1) return null;
            const lastMessage = messages[messages.length - 1];
            if (!lastMessage.follow_up_questions?.length) return null;
            return (
                <View style={styles.followUpContainer}>
                  <Text style={styles.followUpTitle}>추천 질문</Text>
                  <View style={styles.followUpButtonsRow}>
                    {lastMessage.follow_up_questions.map((question, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.followUpButton}
                      onPress={async () => {
                        await sendMessageWithText(question);
                      }}
                    >
                      <Text style={styles.followUpButtonText} numberOfLines={2}>
                        {question}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  </View>
                </View>
            );
          })()}
          <View style={styles.messageInputRow}>
            <TextInput
              style={styles.textInput}
              value={message}
              onChangeText={setMessage}
              placeholder="메시지를 입력하세요."
              placeholderTextColor="#999"
              multiline
              editable={!isAiResponding}
            />
            <TouchableOpacity 
              style={[
                styles.sendButton, 
                (!message.trim() || isAiResponding) && styles.sendButtonDisabled
              ]}
              onPress={sendMessage}
              disabled={!message.trim() || isAiResponding}
            >
              <Icon 
                name="send" 
                size={20} 
                color={message.trim() ? 'white' : '#ccc'} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'white',
    // borderBottomWidth: 0.3,
    // borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 50,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messageContainer: {
    marginTop: 10,
    marginBottom: 5,
    paddingHorizontal: 12,
  },
  expertInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  messageExpertImage: {
    width: 25,
    height: 25,
    borderRadius: 16,
    marginRight: 6,
  },
  expertName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  sajuImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primaryColor,
    borderBottomRightRadius: 4,
  },
  expertMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    borderBottomLeftRadius: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 19,
  },
  userMessageText: {
    color: 'white',
  },
  expertMessageText: {
    color: '#333',
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#bbb',
  },
  timestampBase: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  timestampUser: {
    alignSelf: 'flex-end',
    textAlign: 'right',
  },
  timestampExpert: {
    alignSelf: 'flex-start',
    textAlign: 'left',
  },
  inputContainer: {
    backgroundColor: 'white',
    // borderTopWidth: 1,
    // borderTopColor: '#e9ecef',
  },
  initialQuestionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  initialQuestionsTitle: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  initialQuestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  initialQuestionButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: '48%',
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  initialQuestionButtonText: {
    color: '#333',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 16,
  },
  followUpContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  followUpTitle: {
    fontSize: 10,
    color: '#999',
    marginBottom: 6,
    fontWeight: '500',
  },
  followUpButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  followUpButton: {
    backgroundColor: '#f0f0f5',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: '48%',
    minHeight: 36,
    justifyContent: 'center',
  },
  followUpButtonText: {
    color: '#1a1a1a',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 16,
  },
  messageInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    paddingTop: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: Colors.primaryColor,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#e9ecef',
  },
  
  // **text** 볼드 처리 스타일
  boldText: {
    fontWeight: 'bold',
    color: Colors.primaryColor, // 강조색으로 표시
  },
});

export default ChatRoomScreen;
