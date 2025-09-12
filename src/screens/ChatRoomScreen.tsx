import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { Colors } from '../constants/colors';
import Icon from 'react-native-vector-icons/Ionicons';
import { ChatMessage } from '../types/chat';
import { getExpertImage } from '../utils/getExpertImage';
import { expertAIService, BirthInfo } from '../services/ai';
import { supabase } from '../utils/supabaseClient';

interface ChatRoomScreenProps {
  navigation: any;
  route: any;
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isImage?: boolean;
}

const ChatRoomScreen: React.FC<ChatRoomScreenProps> = ({ navigation, route }) => {
  const { roomId, expert } = route.params;
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

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
      setMessages((data || []).reverse());  // 시간순 정렬
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // 초기 메시지 로드 및 실시간 구독
  useEffect(() => {
    fetchMessages();

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
          setMessages(prev => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [roomId]);

  const [isAiResponding, setIsAiResponding] = useState(false);
  const [userBirthInfo, setUserBirthInfo] = useState<BirthInfo | null>(null);

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

  const sendMessage = async () => {
    if (!message.trim() || isAiResponding) return;

    const userMessage = {
      chat_room_id: roomId,
      sender_type: 'user',
      message: message.trim(),
      created_at: new Date().toISOString()
    };

    try {
      // 사용자 메시지 UI 업데이트 및 DB 저장
      setMessages(prev => [...prev, userMessage as ChatMessage]);
      setMessage('');

      const { error: userMessageError } = await supabase
        .from('chat_messages')
        .insert(userMessage);

      if (userMessageError) throw userMessageError;

      // AI 응답 생성 시작
      setIsAiResponding(true);

      // 이전 대화 내용 수집 (최근 5개 메시지)
      const recentMessages = messages.slice(-5).map(msg => msg.message);

      // AI 응답 생성
      const { message: aiResponse, error: aiError } = await expertAIService.generateResponse({
        expertCategory: expert.category,
        birthInfo: userBirthInfo,
        recentMessages: [...recentMessages, message.trim()]
      });

      if (aiError) {
        throw new Error(aiError);
      }

      // AI 응답 메시지 생성
      const aiMessage = {
        chat_room_id: roomId,
        sender_type: 'expert',
        message: aiResponse,
        created_at: new Date().toISOString()
      };

      // AI 응답 UI 업데이트 및 DB 저장
      setMessages(prev => [...prev, aiMessage as ChatMessage]);

      const { error: aiMessageError } = await supabase
        .from('chat_messages')
        .insert(aiMessage);

      if (aiMessageError) throw aiMessageError;

    } catch (error) {
      console.error('Error in message flow:', error);
      // 에러 시 메시지 롤백
      setMessages(prev => prev.filter(msg => msg !== userMessage));
      Alert.alert('오류', '메시지 처리 중 문제가 발생했습니다.');
    } finally {
      setIsAiResponding(false);
    }
  };

  // 새 메시지가 추가될 때마다 자동 스크롤
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <View style={styles.messageContainer}>
      {item.sender_type === 'expert' && (
        <View style={styles.expertInfo}>
          <Image source={getExpertImage(expert.image_name)} style={styles.messageExpertImage} />
          <Text style={styles.expertName}>{expert.name}</Text>
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
          {item.message}
        </Text>
      </View>
      <Text style={styles.timestamp}>
        {new Date(item.created_at).toLocaleTimeString('ko-KR', { 
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
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id || item.created_at}
            style={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            removeClippedSubviews={false}
          />
        
        <View style={styles.inputContainer}>
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
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: 'white',
    // borderTopWidth: 1,
    // borderTopColor: '#e9ecef',
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
});

export default ChatRoomScreen;
