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
} from 'react-native';
import { Colors } from '../constants/colors';
import Icon from 'react-native-vector-icons/Ionicons';

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
  const { expert } = route.params;
  const [message, setMessage] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: '안녕하세요! 저는 후시도령입니다. 당신의 사주를 먼저 살펴보지요.',
      isUser: false,
      timestamp: new Date(),
    },
  ]);

  // 첫 메시지 후 이미지 표시
  useEffect(() => {
    const timer = setTimeout(() => {
      const imageMessage: Message = {
        id: '2',
        text: 'saju_example',
        isUser: false,
        timestamp: new Date(),
        isImage: true,
      };
      setMessages(prev => [...prev, imageMessage]);
    }, 2000); // 2초 후 이미지 표시

    // 이미지 후 사주 해석 메시지 표시
    const timer2 = setTimeout(() => {
      const sajuMessage: Message = {
        id: '3',
        text: '"당신은 물(水)의 기운이 강한 사주로구나. 물이 많으면 편안한 듯 보여도, 생각이 넘쳐 머리가 복잡해지기 쉽지. 그래서 흙(土)의 기운으로 균형을 잡는 게 필요하네.\n\n서울이라면, 강가나 물가보다는 남향으로 햇볕이 잘 드는 동네, 땅이 안정적인 지역이 좋겠어. 예를 들자면 관악·서초·동작 같이 산줄기와 토의 기운이 받쳐주는 곳이 잘 어울린다네."',
        isUser: false,
        timestamp: new Date(),
        isImage: false,
      };
      setMessages(prev => [...prev, sajuMessage]);
    }, 4000); // 4초 후 사주 해석 표시

    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, []);

  const sendMessage = () => {
    if (message.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        text: message.trim(),
        isUser: true,
        timestamp: new Date(),
      };
      setMessages([...messages, newMessage]);
      setMessage('');
      
      // 도사의 응답 시뮬레이션 (실제로는 API 호출)
      setTimeout(() => {
        const expertResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: '“올해는 작은 시도를 많이 해볼수록 큰 길이 열리는 해입니다. 서두르지 말고, 경험을 쌓는 데 집중하세요. 내년부터는 그 경험이 모여 예상치 못한 기회로 돌아올 것입니다.”',
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, expertResponse]);
      }, 1000);
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

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={styles.messageContainer}>
      {!item.isUser && (
        <View style={styles.expertInfo}>
          <Image source={expert.image} style={styles.messageExpertImage} />
          <Text style={styles.expertName}>{expert.title}</Text>
        </View>
      )}
      <View style={[
        styles.messageBubble,
        item.isUser ? styles.userMessage : styles.expertMessage
      ]}>
        {item.isImage ? (
          <Image 
            source={require('../../assets/saju/saju_example.png')} 
            style={styles.sajuImage}
            resizeMode="contain"
          />
        ) : (
          <Text style={[
            styles.messageText,
            item.isUser ? styles.userMessageText : styles.expertMessageText
          ]}>
            {item.text}
          </Text>
        )}
      </View>
      {item.isUser && (
        <Text style={styles.timestamp}>
          {item.timestamp.toLocaleTimeString('ko-KR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      )}
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
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={message}
            onChangeText={setMessage}
            placeholder="메시지를 입력하세요..."
            placeholderTextColor="#999"
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!message.trim()}
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
