import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { getDefaultExpert, createChatRoomWithExpert } from '../../utils/chat/chatUtils';
import ChatRoomScreen from './ChatRoomScreen';

interface ChatEntryScreenProps {
  navigation: any;
}

const ChatEntryScreen: React.FC<ChatEntryScreenProps> = ({ navigation }) => {
  const hasStartedRef = useRef<boolean>(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [expert, setExpert] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const startDefaultRoom = useCallback(async () => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    try {
      const defaultExpert = await getDefaultExpert();
      if (!defaultExpert) {
        Alert.alert('오류', '대화할 AI를 찾을 수 없습니다.');
        return;
      }
      const result = await createChatRoomWithExpert(navigation, defaultExpert.id);
      if (!result) {
        Alert.alert('오류', '새 대화를 시작할 수 없습니다. 잠시 후 다시 시도하세요.');
        return;
      }
      setRoomId(result.roomId);
      setExpert(result.expert);
    } catch (error) {
      Alert.alert('오류', '새 대화를 시작할 수 없습니다. 잠시 후 다시 시도하세요.');
    } finally {
      setIsLoading(false);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      void startDefaultRoom();
    }, [startDefaultRoom])
  );

  useEffect(() => {
    if (!isLoading && (!roomId || !expert)) {
      hasStartedRef.current = false;
    }
  }, [isLoading, roomId, expert]);

  if (isLoading || !roomId || !expert) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primaryColor} />
      </View>
    );
  }

  return (
    <ChatRoomScreen
      navigation={navigation}
      route={{ params: { roomId, expert } }}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
});

export default ChatEntryScreen;
