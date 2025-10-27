/**
 * MessageList - 메시지 리스트 컴포넌트
 * FlatList를 사용하여 메시지 목록을 렌더링하고 스크롤 관리
 */
import React, { useCallback, useMemo } from 'react';
import { FlatList, View, Text, Image, StyleSheet } from 'react-native';
import { ChatMessage } from '../../../types/chat';
import { getExpertImage } from '../../../utils/getExpertImage';
import MessageItem from './MessageItem';
import TypingIndicator from './TypingIndicator';

interface MessageListProps {
  messages: ChatMessage[];
  isAiResponding: boolean;
  expert: any;
  flatListRef: React.RefObject<FlatList<ChatMessage>>;
  shouldAutoScroll: boolean;
  setShouldAutoScroll: (value: boolean) => void;
  scrollToBottom: (animated: boolean) => void;
  loading: boolean;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  isAiResponding,
  expert,
  flatListRef,
  shouldAutoScroll,
  setShouldAutoScroll,
  scrollToBottom,
  loading
}) => {
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
    <FlatList<ChatMessage>
      ref={flatListRef}
      data={messages}
      renderItem={renderMessage}
      keyExtractor={(item) => item.id || item.created_at}
      style={styles.messagesList}
      contentContainerStyle={styles.messagesContentContainer}
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
  );
};

const styles = StyleSheet.create({
  messagesList: {
    flex: 1,
  },
  messagesContentContainer: {
    paddingBottom: 20, // 하단 여백 추가
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
  timestampBase: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  timestampExpert: {
    alignSelf: 'flex-start',
    textAlign: 'left',
  },
});

export default MessageList;
