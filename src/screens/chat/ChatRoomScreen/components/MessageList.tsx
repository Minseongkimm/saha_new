/**
 * MessageList - 메시지 리스트 컴포넌트
 * FlatList를 사용하여 메시지 목록을 렌더링하고 스크롤 관리
 */
import React, { useCallback, useMemo } from 'react';
import {
  FlatList,
  View,
  Text,
  Image,
  StyleSheet,
  Platform,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { ChatMessage } from '../../../../types/chat';
import { getExpertImage } from '../../../../utils/expert/getExpertImage';
import MessageItem from './MessageItem';
import TypingIndicator from './TypingIndicator';
import { isIPad } from '../../../../utils/platform';

const IS_IPAD = isIPad();

interface MessageListProps {
  messages: ChatMessage[];
  isAiResponding: boolean;
  expert: any;
  flatListRef: React.RefObject<FlatList<ChatMessage>>;
  shouldAutoScroll: boolean;
  setShouldAutoScroll: (value: boolean) => void;
  scrollToBottom: (animated: boolean) => void;
  loading: boolean;
  onMessageActionPress?: (item: ChatMessage, option?: NonNullable<ChatMessage['action_options']>[number]) => void;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  isAiResponding,
  expert,
  flatListRef,
  shouldAutoScroll,
  setShouldAutoScroll,
  scrollToBottom,
  loading,
  onMessageActionPress
}) => {
  const expertImage = useMemo(() => getExpertImage(expert.image_name), [expert.image_name]);
  const updateAutoScrollFromPosition = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    const isNearBottom = distanceFromBottom < 80;
    if (isNearBottom !== shouldAutoScroll) {
      setShouldAutoScroll(isNearBottom);
    }
  }, [setShouldAutoScroll, shouldAutoScroll]);
  
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
        onActionPress={onMessageActionPress}
      />
    );
  }, [isAiResponding, expertImage, expert.name, onMessageActionPress]);

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
      showsVerticalScrollIndicator={false}
      onContentSizeChange={() => {
        if (shouldAutoScroll) {
          scrollToBottom(false);
        }
      }}
      onLayout={() => {
        if (shouldAutoScroll) {
          scrollToBottom(false);
        }
      }}
      onScroll={updateAutoScrollFromPosition}
      scrollEventThrottle={16}
      onScrollBeginDrag={() => setShouldAutoScroll(false)}
      onScrollEndDrag={updateAutoScrollFromPosition}
      onMomentumScrollEnd={updateAutoScrollFromPosition}
      onScrollToIndexFailed={(info) => {
        flatListRef.current?.scrollToOffset({
          offset: Math.max(info.averageItemLength * info.index, 0),
          animated: false,
        });
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: info.index,
            animated: false,
            viewPosition: 0,
          });
        }, 120);
      }}
      ListEmptyComponent={loading ? ListEmptyThinking : null}
    />
  );
};

const styles = StyleSheet.create({
  messagesList: {
    flex: 1,
    minHeight: 0,
  },
  messageContainer: {
    marginTop: IS_IPAD ? 14 : 10,
    marginBottom: IS_IPAD ? 8 : 5,
    paddingHorizontal: IS_IPAD ? 20 : 12,
  },
  expertInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: IS_IPAD ? 12 : 8,
  },
  messageExpertImage: {
    width: IS_IPAD ? 36 : 25,
    height: IS_IPAD ? 36 : 25,
    borderRadius: IS_IPAD ? 18 : 16,
    marginRight: IS_IPAD ? 10 : 6,
  },
  expertName: {
    fontSize: IS_IPAD ? 18 : 14,
    fontWeight: '600',
    color: '#333',
  },
  messageBubble: {
    maxWidth: IS_IPAD ? '75%' : '80%',
    paddingHorizontal: IS_IPAD ? 20 : 16,
    paddingVertical: IS_IPAD ? 16 : 12,
    borderRadius: IS_IPAD ? 22 : 18,
  },
  expertMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    borderBottomLeftRadius: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: Platform.OS === 'android' ? 1 : 0.3,
  },
  timestampBase: {
    fontSize: IS_IPAD ? 14 : 12,
    color: '#999',
    marginTop: IS_IPAD ? 6 : 4,
  },
  timestampExpert: {
    alignSelf: 'flex-start',
    textAlign: 'left',
  },
});

export default MessageList;
