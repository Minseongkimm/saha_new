/**
 * MessageItem - 개별 메시지 아이템 컴포넌트
 * 사용자/전문가 메시지를 렌더링하고 **볼드** 마크다운 처리
 */
import React, { memo, useMemo } from 'react';
import { View, Text, Image, StyleSheet, Platform } from 'react-native';
import { Colors } from '../../../../constants/colors';
import { ChatMessage } from '../../../../types/chat';
import { formatBoldText } from '../../../../utils/text/textFormatUtils';
import { isIPad } from '../../../../utils/platform';

const IS_IPAD = isIPad();

interface MessageItemProps {
  item: ChatMessage;
  expertImage: any;
  expertName: string;
}

const MessageItem: React.FC<MessageItemProps> = memo(({ item, expertImage, expertName }) => {
  const formattedText = useMemo(() => {
    return formatBoldText(item.message);
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
         prevProps.item.id === nextProps.item.id &&
         prevProps.item.sender_type === nextProps.item.sender_type &&
         prevProps.expertName === nextProps.expertName;
});

const styles = StyleSheet.create({
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
    elevation: Platform.OS === 'android' ? 1 : 0.3,
  },
  messageText: {
    fontSize: IS_IPAD ? 18 : 14,
    lineHeight: IS_IPAD ? 26 : 19,
  },
  userMessageText: {
    color: 'white',
  },
  expertMessageText: {
    color: '#333',
  },
  timestampBase: {
    fontSize: IS_IPAD ? 14 : 12,
    color: '#999',
    marginTop: IS_IPAD ? 6 : 4,
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
