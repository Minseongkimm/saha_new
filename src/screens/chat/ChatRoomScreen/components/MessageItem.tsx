/**
 * MessageItem - 개별 메시지 아이템 컴포넌트
 * 사용자/전문가 메시지를 렌더링하고 **볼드** 마크다운 처리
 */
import React, { memo, useMemo } from 'react';
import { View, Text, Image, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../../../constants/colors';
import { ChatMessage } from '../../../../types/chat';
import { formatBoldText } from '../../../../utils/text/textFormatUtils';
import { isIPad } from '../../../../utils/platform';

const IS_IPAD = isIPad();

interface MessageItemProps {
  item: ChatMessage;
  expertImage: any;
  expertName: string;
  onActionPress?: (item: ChatMessage, option?: NonNullable<ChatMessage['action_options']>[number]) => void;
}

const MessageItem: React.FC<MessageItemProps> = memo(({ item, expertImage, expertName, onActionPress }) => {
  const displayImage = item.display_image ?? expertImage;
  const displayName = item.display_name ?? expertName;
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
          <Image source={displayImage} style={styles.messageExpertImage} />
          <Text style={styles.expertName}>{displayName}</Text>
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
        {item.action_options && item.action_options.length > 0 && item.sender_type === 'expert' ? (
          <View style={styles.messageActionList}>
            {item.action_options.map((option, index) => (
              <TouchableOpacity
                key={`${option.action_kind}_${option.label}_${index}`}
                style={[
                  styles.messageActionButton,
                  option.action_kind === 'select_partner' ? styles.partnerSelectButton : undefined,
                  option.action_kind === 'partner_info' ? styles.partnerInputButton : undefined,
                ]}
                activeOpacity={0.85}
                onPress={() => onActionPress?.(item, option)}
              >
                {option.action_kind === 'partner_info' ? (
                  <Icon
                    name="add"
                    size={IS_IPAD ? 20 : 16}
                    color="#ffffff"
                    style={styles.partnerInputIcon}
                  />
                ) : null}
                <View style={option.action_kind === 'select_partner' ? styles.partnerSelectTextBlock : styles.partnerInputTextBlock}>
                  <Text
                    style={[
                      styles.messageActionText,
                      option.action_kind === 'select_partner' ? styles.partnerSelectText : undefined,
                      option.action_kind === 'partner_info' ? styles.partnerInputText : undefined,
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit={option.action_kind === 'partner_info'}
                    minimumFontScale={0.82}
                  >
                    {option.label}
                  </Text>
                  {option.action_kind === 'select_partner' && option.description ? (
                    <Text style={styles.partnerSelectMeta} numberOfLines={1}>
                      {option.description}
                    </Text>
                  ) : null}
                </View>
                {option.action_kind === 'select_partner' ? (
                  <Icon
                    name="chevron-forward"
                    size={IS_IPAD ? 18 : 15}
                    color="#9a8d80"
                    style={styles.partnerSelectIcon}
                  />
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        ) : item.action_label && item.sender_type === 'expert' ? (
          <TouchableOpacity
            style={styles.messageActionButton}
            activeOpacity={0.85}
            onPress={() => onActionPress?.(item)}
          >
            <Text style={styles.messageActionText}>{item.action_label}</Text>
          </TouchableOpacity>
        ) : null}
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
         prevProps.item.display_name === nextProps.item.display_name &&
         prevProps.item.action_kind === nextProps.item.action_kind &&
         prevProps.item.action_label === nextProps.item.action_label &&
         prevProps.item.action_options === nextProps.item.action_options &&
         prevProps.onActionPress === nextProps.onActionPress &&
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
  messageActionList: {
    marginTop: IS_IPAD ? 18 : 14,
    alignSelf: 'stretch',
    gap: IS_IPAD ? 9 : 7,
  },
  messageActionButton: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primaryColor,
    borderRadius: IS_IPAD ? 15 : 12,
    paddingHorizontal: IS_IPAD ? 17 : 14,
    paddingVertical: IS_IPAD ? 15 : 13,
    minHeight: IS_IPAD ? 54 : 46,
  },
  messageActionText: {
    color: 'white',
    fontSize: IS_IPAD ? 16 : 13,
    fontWeight: '700',
  },
  partnerSelectButton: {
    backgroundColor: '#fbfaf8',
    borderWidth: 1,
    borderColor: '#e9dfd2',
  },
  partnerSelectText: {
    color: '#2c2620',
    fontWeight: '700',
  },
  partnerSelectTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  partnerSelectMeta: {
    marginTop: IS_IPAD ? 5 : 3,
    color: '#9a8d80',
    fontSize: IS_IPAD ? 13 : 10,
    fontWeight: '600',
  },
  partnerSelectIcon: {
    marginLeft: IS_IPAD ? 10 : 8,
  },
  partnerInputButton: {
    marginTop: IS_IPAD ? 7 : 5,
    backgroundColor: Colors.primaryColor,
    borderWidth: 0,
    justifyContent: 'center',
    shadowColor: Colors.primaryColor,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 9,
    elevation: Platform.OS === 'android' ? 2 : 0,
  },
  partnerInputText: {
    color: '#ffffff',
    fontSize: IS_IPAD ? 15 : 12,
    textAlign: 'center',
  },
  partnerInputTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  partnerInputIcon: {
    marginRight: IS_IPAD ? 8 : 6,
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
