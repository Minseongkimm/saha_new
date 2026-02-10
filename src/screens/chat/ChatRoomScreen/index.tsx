/**
 * ChatRoomScreen - 채팅방 메인 화면
 * 채팅방의 전체 레이아웃과 컴포넌트들을 조합하여 구성
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  StatusBar,
  Keyboard,
  AppState,
  AppStateStatus,
  Alert,
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
import PaymentLoadingModal from '../../../components/common/PaymentLoadingModal';
import { handleChargeFlow } from '../../../utils/payments/chargeFlow';
import { safeGoBack } from '../../../utils/navigation/safeGoBack';
import { isIPad } from '../../../utils/platform';
import ConfirmModal from '../../../components/common/ConfirmModal';
import { endChatRoom } from '../../../utils/chat/chatUtils';
import { ChatMessage } from '../../../types/chat';
import { supabase } from '../../../utils/database/supabaseClient';
import { openStoreForReview, REVIEW_REWARD_SAHA } from '../../../constants/review_reward';
import {
  hasUserReceivedReviewReward,
  grantReviewReward,
} from '../../../utils/reviewReward/reviewReward';

const IS_IPAD = isIPad();

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
  
  // 결제 로딩 상태
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  
  // Android 키보드 상태 추적
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasReceivedReviewReward, setHasReceivedReviewReward] = useState<boolean>(false);
  const [showReviewPromptModal, setShowReviewPromptModal] = useState<boolean>(false);
  const [showReviewConfirmModal, setShowReviewConfirmModal] = useState<boolean>(false);
  const [pendingReviewConfirm, setPendingReviewConfirm] = useState<boolean>(false);
  const [isGrantingReview, setIsGrantingReview] = useState<boolean>(false);

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

  const messagesRef = useRef<ChatMessage[]>([]);
  const pendingNavActionRef = useRef<any>(null);
  const isEndingRef = useRef<boolean>(false);
  const hasEndedRef = useRef<boolean>(false);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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
    },
    partnerData
  });

  const loadUserAndReviewRewardStatus = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    if (!user?.id) return;
    try {
      const received = await hasUserReceivedReviewReward(user.id);
      setHasReceivedReviewReward(received);
    } catch (e) {
      console.error('loadUserAndReviewRewardStatus error:', e);
    }
  }, []);

  useEffect(() => {
    loadUserAndReviewRewardStatus();
  }, [loadUserAndReviewRewardStatus]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active' && pendingReviewConfirm) {
        setShowReviewConfirmModal(true);
        setPendingReviewConfirm(false);
      }
    });
    return () => subscription.remove();
  }, [pendingReviewConfirm]);

  const handleCharge = () => {
    // 즉시 전환 (첫 번째 닫는 애니메이션을 기다리지 않고 바로 두 번째 열기)
    setIsTransitioning(true);
    setShowInsufficientBalanceSheet(false);
    // 하지만 Modal이 닫히는 동안 열리면 겹칠 수 있으므로 최소 지연
    setTimeout(() => {
      setShowChargeSheet(true);
      setIsTransitioning(false);
    }, 50); // 첫 번째 닫히는 애니메이션이 시작되는 즉시 두 번째 열기
  };

  const handleChargeSelect = async (amount: number) => {
    setShowChargeSheet(false);
    
    try {
      await handleChargeFlow(amount, {
        onSuccess: () => {
          // 잔액 업데이트 (refreshBalance가 자동으로 호출되지만, 명시적으로도 호출)
          refreshBalance();
        },
        onError: (error) => {
          console.error('[ChatRoomScreen] 충전 오류:', error);
        },
        onLoading: (isLoading) => {
          setIsPaymentLoading(isLoading);
        },
      });
    } catch (error) {
      console.error('[ChatRoomScreen] handleChargeFlow 예외:', error);
      setIsPaymentLoading(false);
    }
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

  // Android 키보드 이벤트 리스너
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
    });
    
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
    });
    
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;
  const headerContentHeight = Platform.OS === 'android' ? 70 : (IS_IPAD ? 70 : 56);
  const headerTopPadding = statusBarHeight + (IS_IPAD ? 10 : 0);
  const leftWidth = IS_IPAD ? 80 : 60;
  const rightWidth = IS_IPAD ? 160 : 120;

  const getLastMessageInfo = (): { text: string | null; createdAt: string | null } => {
    const latestMessages = messagesRef.current;
    if (latestMessages.length === 0) {
      return { text: null, createdAt: null };
    }
    const lastMessage = latestMessages[latestMessages.length - 1];
    return {
      text: lastMessage?.message ?? null,
      createdAt: lastMessage?.created_at ?? null
    };
  };

  const executeEndChat = async (reason: string): Promise<void> => {
    if (isEndingRef.current || hasEndedRef.current) return;
    isEndingRef.current = true;
    try {
      const lastMessageInfo = getLastMessageInfo();
      await endChatRoom(roomId, {
        lastMessage: lastMessageInfo.text,
        lastMessageAt: lastMessageInfo.createdAt,
        endedReason: reason
      });
      hasEndedRef.current = true;
    } catch (error) {
      console.error('Failed to end chat:', error);
    } finally {
      isEndingRef.current = false;
    }
  };

  const doNavigateAfterEnd = useCallback(() => {
    const action = pendingNavActionRef.current;
    pendingNavActionRef.current = null;
    if (action) {
      navigation.dispatch(action);
    } else {
      safeGoBack(navigation);
    }
  }, [navigation]);

  const handleConfirmEnd = async () => {
    await executeEndChat('user_exit');
    setShowEndModal(false);
    if (hasReceivedReviewReward) {
      doNavigateAfterEnd();
    } else {
      setShowReviewPromptModal(true);
    }
  };

  const handleReviewPromptLater = useCallback(() => {
    setShowReviewPromptModal(false);
    doNavigateAfterEnd();
  }, [doNavigateAfterEnd]);

  const handleReviewPromptConfirm = useCallback(async () => {
    try {
      await openStoreForReview();
      setPendingReviewConfirm(true);
      setShowReviewPromptModal(false);
    } catch (e) {
      console.error('openStoreForReview error:', e);
      Alert.alert('오류', '스토어를 열 수 없습니다.');
      doNavigateAfterEnd();
    }
  }, [doNavigateAfterEnd]);

  const handleConfirmReviewDone = useCallback(async () => {
    if (!userId) {
      setShowReviewConfirmModal(false);
      doNavigateAfterEnd();
      return;
    }
    setShowReviewConfirmModal(false);
    setIsGrantingReview(true);
    try {
      const platform = Platform.OS === 'android' ? 'android' : 'ios';
      const { newBalance } = await grantReviewReward(userId, platform);
      setHasReceivedReviewReward(true);
      Alert.alert(
        '리워드 지급 완료',
        `사바 ${REVIEW_REWARD_SAHA}개가 지급되었습니다. (잔액: ${newBalance})`
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '리워드 지급에 실패했습니다.';
      Alert.alert('안내', message);
    } finally {
      setIsGrantingReview(false);
    }
    doNavigateAfterEnd();
  }, [userId, doNavigateAfterEnd]);

  const handleCloseReviewConfirmModal = useCallback(() => {
    setShowReviewConfirmModal(false);
    doNavigateAfterEnd();
  }, [doNavigateAfterEnd]);

  const handleCancelEnd = () => {
    pendingNavActionRef.current = null;
    setShowEndModal(false);
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event: any) => {
      if (hasEndedRef.current || isEndingRef.current) {
        return;
      }
      event.preventDefault();
      pendingNavActionRef.current = event.data.action;
      setShowEndModal(true);
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    const onAppStateChange = async (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        await executeEndChat('app_background');
      }
    };
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: headerTopPadding, minHeight: headerTopPadding + headerContentHeight }]}>
        <View style={[styles.leftHeader, { width: leftWidth }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => safeGoBack(navigation)}>
            <Icon name="arrow-back" size={IS_IPAD ? 28 : 19} color="#000000" />
          </TouchableOpacity>
        </View>
        <View pointerEvents="none" style={[styles.headerTitleContainer, { top: headerTopPadding, height: headerContentHeight }]}>
          <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">{expert.title}</Text>
        </View>
        <View style={[styles.rightHeader, { width: rightWidth }]}>
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
        keyboardVerticalOffset={0}
        enabled={Platform.OS === 'ios' || isKeyboardVisible}
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

      <PaymentLoadingModal
        visible={isPaymentLoading}
        message="결제중입니다"
      />
      <ConfirmModal
        visible={showEndModal}
        onClose={handleCancelEnd}
        title="대화 종료"
        message="대화를 종료하고 목록으로 돌아갈까요?"
        confirmText="종료 후 나가기"
        onConfirm={handleConfirmEnd}
      />
      <ConfirmModal
        visible={showReviewPromptModal}
        onClose={handleReviewPromptLater}
        title="리뷰 작성하고 사바 받기"
        message={`대화를 종료했어요. 스토어에 리뷰를 남기시면 사바 ${REVIEW_REWARD_SAHA}개를 드려요 (1회 한정).`}
        cancelText="나중에"
        confirmText="리뷰 작성하기"
        onConfirm={handleReviewPromptConfirm}
      />
      <ConfirmModal
        visible={showReviewConfirmModal}
        onClose={handleCloseReviewConfirmModal}
        title="리뷰 작성 확인"
        message="소중한 리뷰 감사합니다. 작성 완료하셨으면 사바를 지급해 드려요."
        cancelText="아니요"
        confirmText="완료"
        onConfirm={handleConfirmReviewDone}
        confirmDisabled={isGrantingReview}
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
    paddingBottom: IS_IPAD ? 14 : 10,
    paddingHorizontal: IS_IPAD ? 20 : 12,
    backgroundColor: 'white',
    position: 'relative',
  },
  leftHeader: {
    width: IS_IPAD ? 80 : 60,
    alignItems: 'flex-start',
    zIndex: 2,
  },
  backButton: {
    padding: IS_IPAD ? 12 : 8,
  },
  headerTitleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
    overflow: 'visible',
    ...(Platform.OS === 'android' ? { transform: [{ translateY: -8 }] } : { transform: [{ translateY: -5 }] }),
  },
  headerTitle: {
    textAlign: 'center',
    fontSize: IS_IPAD ? 24 : 18,
    fontWeight: 'bold',
    color: '#333',
    ...(Platform.OS === 'android' && { 
      includeFontPadding: false, 
      textAlignVertical: 'center',
      lineHeight: IS_IPAD ? 28 : 22,
    }),
  },
  rightHeader: {
    width: IS_IPAD ? 160 : 120,
    alignItems: 'flex-end',
    zIndex: 1,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: IS_IPAD ? 80 : 60,
    justifyContent: 'flex-end',
  },
  balanceIcon: {
    width: IS_IPAD ? 28 : 20,
    height: IS_IPAD ? 28 : 20,
    marginRight: IS_IPAD ? 8 : 6,
  },
  balanceText: {
    fontSize: IS_IPAD ? 18 : 14,
    fontWeight: '600',
    color: '#000000',
  },
  freeMessageText: {
    fontSize: IS_IPAD ? 14 : 10,
    color: '#666',
    marginTop: IS_IPAD ? 4 : 2,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  inputContainer: {
    backgroundColor: 'white',
    ...(Platform.OS === 'android' && { paddingBottom: 15 }),
  },
});

export default ChatRoomScreen;
