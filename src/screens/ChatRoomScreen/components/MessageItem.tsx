/**
 * MessageItem - 개별 메시지 아이템 컴포넌트
 * 사용자/전문가 메시지를 렌더링하고 **볼드** 마크다운 처리
 */
import React, { memo, useMemo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Colors } from '../../../constants/colors';
import { ChatMessage } from '../../../types/chat';
import { removeCommasFromMessage } from '../../../utils/removeCommas';

interface MessageItemProps {
  item: ChatMessage;
  expertImage: any;
  expertName: string;
}

const MessageItem: React.FC<MessageItemProps> = memo(({ item, expertImage, expertName }) => {
  const formattedText = useMemo(() => {
    if (!item.message) return '';
    
    // 먼저 쉼표를 제거
    const messageWithoutCommas = removeCommasFromMessage(item.message);
    
    const parts = messageWithoutCommas.split(/(\*\*.*?\*\*)/);
    
    return (
      <Text>
        {parts.map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            const boldText = part.slice(2, -2);
            return (
              <Text key={index} style={{ fontWeight: 'bold', color: Colors.primaryColor }}>
                {boldText}
              </Text>
            );
          }
          return part;
        })}
      </Text>
    );
  }, [item.message]);
  
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

const styles = StyleSheet.create({
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
});

export default MessageItem;
