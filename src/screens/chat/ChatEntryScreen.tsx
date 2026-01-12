import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { getDefaultExpert } from '../../utils/chat/chatUtils';
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
      const expertData = await getDefaultExpert();
      if (!expertData) {
        Alert.alert('오류', '대화할 AI를 찾을 수 없습니다.');
        setIsLoading(false);
        return;
      }
      
      setExpert(expertData);
    } catch (error) {
      console.error('Error loading default expert:', error);
      Alert.alert('오류', '전문가 정보를 불러올 수 없습니다. 잠시 후 다시 시도하세요.');
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

  if (isLoading || !expert) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primaryColor} />
      </View>
    );
  }

  return (
    <ChatRoomScreen
      navigation={navigation}
      route={{ params: { roomId: null, expert } }}
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
