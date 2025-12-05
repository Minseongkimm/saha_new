/**
 * MessageInput - 메시지 입력 컴포넌트
 * 텍스트 입력창과 전송 버튼을 포함한 메시지 입력 UI
 */
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../../../constants/colors';
import { isIPad } from '../../../../utils/platform';

const IS_IPAD = isIPad();

interface MessageInputProps {
  isAiResponding: boolean;
  onSendMessage: (message: string) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ isAiResponding, onSendMessage }) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (!message.trim() || isAiResponding) return;
    onSendMessage(message);
    setMessage('');
  };

  return (
    <View style={styles.messageInputRow}>
      <TextInput
        style={styles.textInput}
        value={message}
        onChangeText={setMessage}
        placeholder="메시지를 입력하세요."
        placeholderTextColor="#999"
        multiline
        editable={!isAiResponding}
        maxLength={150}
        keyboardType="default"
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="none"
      />
      <TouchableOpacity 
        style={[
          styles.sendButton, 
          (!message.trim() || isAiResponding) && styles.sendButtonDisabled
        ]}
        onPress={handleSend}
        disabled={!message.trim() || isAiResponding}
      >
        <Icon 
          name="send" 
          size={IS_IPAD ? 28 : 20} 
          color={message.trim() ? 'white' : '#ccc'} 
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  messageInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: IS_IPAD ? 24 : 16,
    paddingTop: IS_IPAD ? 12 : 8,
    paddingBottom: Platform.OS === 'android' ? (IS_IPAD ? 14 : 10) : (IS_IPAD ? 8 : 2),
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: IS_IPAD ? 24 : 20,
    paddingHorizontal: IS_IPAD ? 20 : 16,
    paddingVertical: IS_IPAD ? 16 : 12,
    marginRight: IS_IPAD ? 16 : 12,
    fontSize: IS_IPAD ? 18 : 14,
    maxHeight: IS_IPAD ? 120 : 100,
  },
  sendButton: {
    backgroundColor: Colors.primaryColor,
    width: IS_IPAD ? 56 : 40,
    height: IS_IPAD ? 56 : 40,
    borderRadius: IS_IPAD ? 28 : 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#e9ecef',
  },
});

export default MessageInput;
