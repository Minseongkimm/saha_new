/**
 * MessageInput - 메시지 입력 컴포넌트
 * 텍스트 입력창과 전송 버튼을 포함한 메시지 입력 UI
 */
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../../../constants/colors';

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
          size={20} 
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'android' ? 10 : 2,
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

export default MessageInput;
