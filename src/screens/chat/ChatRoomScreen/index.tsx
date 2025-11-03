/**
 * ChatRoomScreen - 채팅방 메인 화면
 * 채팅방의 전체 레이아웃과 컴포넌트들을 조합하여 구성
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../../constants/colors';
import { useChatRoom } from './hooks/useChatRoom';
import { useMessageActions } from './hooks/useMessageActions';
import MessageList from './components/MessageList';
import MessageInput from './components/MessageInput';
import InitialQuestions from './components/InitialQuestions';
import FollowUpQuestions from './components/FollowUpQuestions';
import InsufficientBalanceBottomSheet from '../../../components/bottomsheets/InsufficientBalanceBottomSheet';
import ChargeBottomSheet from '../../../components/bottomsheets/ChargeBottomSheet';

interface ChatRoomScreenProps {
  navigation: any;
  route: any;
}

const ChatRoomScreen: React.FC<ChatRoomScreenProps> = ({ navigation, route }) => {
  const { roomId, expert, partnerData } = route.params;
  const [showInsufficientBalanceSheet, setShowInsufficientBalanceSheet] = useState(false);
  const [showChargeSheet, setShowChargeSheet] = useState(false);
  const [insufficientBalanceInfo, setInsufficientBalanceInfo] = useState<{
    balance: number;
    freeMessageUsedCount: number;
    freeMessageDailyLimit: number;
  } | null>(null);
  
  // 전환 중인지 추적 (첫 번째가 닫히는 동안 두 번째를 미리 준비)
  const [isTransitioning, setIsTransitioning] = useState(false);

  // 커스텀 훅들
  const {
    messages,
    setMessages,
    loading,
    userBirthInfo,
    shouldAutoScroll,
    setShouldAutoScroll,
    flatListRef,
    scrollToBottom,
    currentBalance,
    freeMessageInfo,
    refreshBalance
  } = useChatRoom({ roomId, expert });

  const {
    isAiResponding,
    hasNewMessageThisSession,
    sendMessage,
    sendMessageWithText
  } = useMessageActions({
    roomId,
    expert,
    userBirthInfo,
    messages,
    setMessages,
    setShouldAutoScroll,
    scrollToBottom,
    onBalanceUpdate: refreshBalance,
    onBalanceInsufficient: (balanceCheck) => {
      setInsufficientBalanceInfo({
        balance: balanceCheck.balance ?? 0,
        freeMessageUsedCount: balanceCheck.freeMessageInfo?.usedCount ?? 0,
        freeMessageDailyLimit: balanceCheck.freeMessageInfo?.dailyLimit ?? 0,
      });
      setShowInsufficientBalanceSheet(true);
    }
  });

  const handleCharge = () => {
    // 즉시 전환 (첫 번째 닫는 애니메이션을 기다리지 않고 바로 두 번째 열기)
    setIsTransitioning(true);
    setShowInsufficientBalanceSheet(false);
    // React 상태 업데이트는 배칭되므로 동시에 업데이트 가능
    // 하지만 Modal이 닫히는 동안 열리면 겹칠 수 있으므로 최소 지연
    setTimeout(() => {
      setShowChargeSheet(true);
      setIsTransitioning(false);
    }, 50); // 첫 번째 닫히는 애니메이션이 시작되는 즉시 두 번째 열기
  };

  const handleChargeSelect = (amount: number) => {
    setShowChargeSheet(false);
    // TODO: 충전 로직 구현
    console.log(`충전 선택: ${amount} 사바`);
  };


  // 메시지 변경 시 항상 최신으로 스크롤 (메시지 개수 변경 시만)
  useEffect(() => {
    if (messages.length === 0) return;
    scrollToBottom(true);
  }, [messages.length]);

  // 팔로업 질문이 나타날 때 자동 스크롤
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.follow_up_questions && lastMessage.follow_up_questions.length > 0) {
        // 팔로업 질문이 나타나면 잠시 후 스크롤
        setTimeout(() => {
          scrollToBottom(true);
        }, 300);
      }
    }
  }, [messages]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.leftHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={19} color="#000000" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>{expert.title}</Text>
        <View style={styles.rightHeader}>
          <View style={styles.balanceContainer}>
            <Image
              source={require('../../../../assets/money/saha_money.png')}
              style={styles.balanceIcon}
              resizeMode="contain"
            />
            <Text style={styles.balanceText}>{currentBalance.toLocaleString()}</Text>
          </View>
          {freeMessageInfo.dailyLimit > 0 && (
            <Text style={styles.freeMessageText}>
              매일 무료 {freeMessageInfo.dailyLimit - freeMessageInfo.usedCount}/{freeMessageInfo.dailyLimit}
            </Text>
          )}
        </View>
      </View>
      
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <MessageList
          messages={messages}
          isAiResponding={isAiResponding}
          expert={expert}
          flatListRef={flatListRef}
          shouldAutoScroll={shouldAutoScroll}
          setShouldAutoScroll={setShouldAutoScroll}
          scrollToBottom={scrollToBottom}
          loading={loading}
        />
        
        <View style={styles.inputContainer}>
          <InitialQuestions
            expert={expert}
            messages={messages}
            onSendMessage={sendMessageWithText}
          />
          
          <FollowUpQuestions
            messages={messages}
            onSendMessage={sendMessageWithText}
          />
          
          <MessageInput
            isAiResponding={isAiResponding}
            onSendMessage={sendMessage}
          />
        </View>
      </KeyboardAvoidingView>

      <InsufficientBalanceBottomSheet
        visible={showInsufficientBalanceSheet && !isTransitioning}
        onClose={() => setShowInsufficientBalanceSheet(false)}
        onCharge={handleCharge}
        currentBalance={insufficientBalanceInfo?.balance ?? 0}
        freeMessageUsedCount={insufficientBalanceInfo?.freeMessageUsedCount ?? 0}
        freeMessageDailyLimit={insufficientBalanceInfo?.freeMessageDailyLimit ?? 0}
      />

      <ChargeBottomSheet
        visible={showChargeSheet || isTransitioning}
        onClose={() => {
          setShowChargeSheet(false);
          setIsTransitioning(false);
        }}
        onSelectCharge={handleChargeSelect}
      />
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
    position: 'relative',
  },
  leftHeader: {
    width: 60,
    alignItems: 'flex-start',
    zIndex: 2,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    zIndex: 0,
  },
  rightHeader: {
    width: 120,
    alignItems: 'flex-end',
    zIndex: 1,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 60,
    justifyContent: 'flex-end',
  },
  balanceIcon: {
    width: 20,
    height: 20,
    marginRight: 6,
  },
  balanceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  freeMessageText: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  inputContainer: {
    backgroundColor: 'white',
  },
});

export default ChatRoomScreen;
