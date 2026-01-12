/**
 * ChatRoomScreen - 채팅방 메인 화면
 * 채팅방의 전체 레이아웃과 컴포넌트들을 조합하여 구성
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  StatusBar,
  Keyboard,
  AppState,
  AppStateStatus,
  Dimensions,
  FlatList,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { getCurrentUserSafely } from '../../../utils/user/authUtils';
import { getExpertImage } from '../../../utils/expert/getExpertImage';
import { removeBoldMarkup } from '../../../utils/text/removeBoldMarkup';

const IS_IPAD = isIPad();
const SCREEN_WIDTH = Dimensions.get('window').width;

interface HistoryItem {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  profileImage: any;
  expert: any;
}

interface ChatRoomScreenProps {
  navigation: any;
  route: any;
}

const ChatRoomScreen: React.FC<ChatRoomScreenProps> = ({ navigation, route }) => {
  const { roomId: initialRoomId, expert, partnerData } = route.params;
  const [roomId, setRoomId] = useState<string | null>(initialRoomId);
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
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [historySelectionMode, setHistorySelectionMode] = useState(false);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(new Set());
  const [showHistoryDeleteConfirm, setShowHistoryDeleteConfirm] = useState(false);
  const [showNewChatConfirm, setShowNewChatConfirm] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const drawerAnim = useRef<Animated.Value>(new Animated.Value(0)).current;

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
    onRoomCreated: (newRoomId) => {
      setRoomId(newRoomId);
    },
    navigation,
    partnerData
  });

  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const { status, user } = await getCurrentUserSafely();
      if (status === 'network_error' || !user) {
        setHistoryItems([]);
        return;
      }
      const { data: rooms, error: roomError } = await supabase
        .from('chat_rooms')
        .select(`
          id,
          expert_id,
          chat_context,
          partner_saju_id,
          last_message,
          last_message_at,
          status,
          ended_at,
          created_at,
          messages:chat_messages(message, created_at, sender_type)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .order('created_at', { foreignTable: 'chat_messages', ascending: false })
        .limit(10, { foreignTable: 'chat_messages' });

      if (roomError || !rooms) {
        setHistoryItems([]);
        return;
      }

      const expertIds: string[] = Array.from(new Set(rooms.map((r: any) => r.expert_id)));
      const { data: experts, error: expertError } = await supabase
        .from('experts')
        .select('id, name, category, title, image_name, is_online, created_at')
        .in('id', expertIds);
      if (expertError || !experts) {
        setHistoryItems([]);
        return;
      }
      const expertMap: Record<string, any> = {};
      experts.forEach((e: any) => {
        expertMap[e.id] = e;
      });

      const compatibilityPartnerIds: string[] = Array.from(new Set(
        rooms
          .filter((room: any) => room.chat_context === 'love_compatibility' && room.partner_saju_id)
          .map((room: any) => room.partner_saju_id)
      ));

      let partnerNameMap: Record<string, string> = {};
      if (compatibilityPartnerIds.length > 0) {
        const { data: partners, error: partnerError } = await supabase
          .from('partner_saju')
          .select('id, partner_name')
          .in('id', compatibilityPartnerIds);
        if (!partnerError && partners) {
          partners.forEach((partner: any) => {
            partnerNameMap[partner.id] = partner.partner_name;
          });
        }
      }

      const items: HistoryItem[] = rooms.map((room: any) => {
        const expertData: any = expertMap[room.expert_id];
        const baseName: string = expertData ? expertData.name : '전문가';
        let displayName: string = baseName;
        if (room.chat_context === 'love_compatibility') {
          const partnerLabel: string | undefined = room.partner_saju_id ? partnerNameMap[room.partner_saju_id] : undefined;
          displayName = partnerLabel ? `${baseName} · ${partnerLabel}` : `${baseName} · 궁합`;
        } else if (room.chat_context === 'love_personal') {
          displayName = `${baseName} · 연애상담`;
        }
        const profile: any = expertData?.image_name ? getExpertImage(expertData.image_name) : require('../../../../assets/people/hoosi_guy.jpg');
        // 마지막 사용자 메시지(없으면 빈 문자열)
        const userMessages = Array.isArray(room.messages)
          ? (room.messages as any[]).filter((m) => m?.sender_type === 'user')
          : [];
        const latestUserMessage = userMessages.length > 0 ? userMessages[0] : null;
        const lastText: string = latestUserMessage?.message ?? '';
        const tsIso: string | null =
          (latestUserMessage?.created_at as string | null | undefined) ||
          room.last_message_at ||
          room.created_at ||
          null;
        const tsStr: string = tsIso ? new Date(tsIso).toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '';
        return {
          id: room.id,
          name: displayName,
          lastMessage: removeBoldMarkup(lastText),
          timestamp: tsStr,
          profileImage: profile,
          expert: expertData,
        };
      });

      setHistoryItems(items);
    } catch (error) {
      setHistoryItems([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

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

  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0;
  const headerContentHeight = IS_IPAD ? 70 : 56;
  const headerTopPadding = Platform.OS === 'android' ? (statusBarHeight - 20) : (IS_IPAD ? 10 : 0);
  const leftWidth = IS_IPAD ? 180 : 150;
  const rightWidth = IS_IPAD ? 120 : 90;

  const openHistoryDrawer = () => {
    setShowHistoryDrawer(true);
    Animated.timing(drawerAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
    void fetchHistory();
  };

  const closeHistoryDrawer = () => {
    Animated.timing(drawerAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowHistoryDrawer(false);
      setHistorySelectionMode(false);
      setSelectedHistoryIds(new Set());
    });
  };

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

  const toggleHistorySelection = (id: string) => {
    setSelectedHistoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const executeHistoryDelete = async () => {
    if (selectedHistoryIds.size === 0) {
      setShowHistoryDeleteConfirm(false);
      return;
    }
    try {
      const ids = Array.from(selectedHistoryIds);
      await supabase.from('chat_messages').delete().in('chat_room_id', ids);
      await supabase.from('chat_rooms').delete().in('id', ids);
      setHistoryItems((prev) => prev.filter((item) => !selectedHistoryIds.has(item.id)));
      setSelectedHistoryIds(new Set());
      setHistorySelectionMode(false);
      setShowHistoryDeleteConfirm(false);
    } catch (error) {
      setShowHistoryDeleteConfirm(false);
    }
  };

  const executeEndChat = async (reason: string): Promise<void> => {
    if (isEndingRef.current || hasEndedRef.current || !roomId) return;
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

  const handleConfirmEnd = async () => {
    await executeEndChat('user_exit');
    setShowEndModal(false);
    const action = pendingNavActionRef.current;
    pendingNavActionRef.current = null;
    if (action) {
      navigation.dispatch(action);
    } else {
      safeGoBack(navigation);
    }
  };

  const handleCancelEnd = () => {
    pendingNavActionRef.current = null;
    setShowEndModal(false);
  };

  const handleConfirmNewChat = async () => {
    setShowNewChatConfirm(false);
    // 기존 채팅 종료 후 현재 화면에서 새 채팅을 시작하도록 리셋
    await executeEndChat('user_exit');
    setMessages([]);
    setRoomId(null);
    setShowHistoryDrawer(false);
    setHistorySelectionMode(false);
    setSelectedHistoryIds(new Set());
    hasEndedRef.current = false;
    isEndingRef.current = false;
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.header, { paddingTop: headerTopPadding, minHeight: headerTopPadding + headerContentHeight }]}>
        <View style={[styles.leftHeader, { width: leftWidth }]}>
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
        <View pointerEvents="none" style={[styles.headerTitleContainer, { top: headerTopPadding, height: headerContentHeight }]}>
          <Image
            source={require('../../../../assets/logo/logo_icon.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
        </View>
        <View style={[styles.rightHeader, { width: rightWidth }]}>
          <TouchableOpacity
            style={styles.newChatButton}
            onPress={() => setShowNewChatConfirm(true)}
          >
            <Icon name="add" size={IS_IPAD ? 26 : 20} color="#000000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.drawerButton} onPress={openHistoryDrawer}>
            <Icon name="menu" size={IS_IPAD ? 26 : 20} color="#000000" />
          </TouchableOpacity>
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
        visible={showHistoryDeleteConfirm}
        onClose={() => setShowHistoryDeleteConfirm(false)}
        title="대화 삭제"
        message={`${selectedHistoryIds.size}개의 대화를 삭제할까요?`}
        confirmText="삭제"
        onConfirm={executeHistoryDelete}
        confirmDisabled={selectedHistoryIds.size === 0}
      />
      <ConfirmModal
        visible={showNewChatConfirm}
        onClose={() => setShowNewChatConfirm(false)}
        title="새 채팅 시작"
        message="새 채팅을 시작하시겠습니까?"
        confirmText="네"
        onConfirm={handleConfirmNewChat}
      />
      {showHistoryDrawer && (
        <View style={styles.drawerOverlay}>
          <TouchableOpacity style={styles.drawerBackdrop} onPress={closeHistoryDrawer} />
          <Animated.View
            style={[
              styles.drawerPanel,
              {
                transform: [
                  {
                    translateX: drawerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [SCREEN_WIDTH * 0.75, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <SafeAreaView style={styles.drawerSafeArea} edges={['top']}>
              <View style={styles.drawerHeader}>
                <Text style={styles.drawerTitle}>대화 내역</Text>
                <View style={styles.drawerHeaderActions}>
                  <TouchableOpacity
                    onPress={() => {
                      if (historyItems.length === 0) return;
                      if (historySelectionMode) {
                        if (selectedHistoryIds.size > 0) {
                          setShowHistoryDeleteConfirm(true);
                        } else {
                          setHistorySelectionMode(false);
                          setSelectedHistoryIds(new Set());
                        }
                        return;
                      }
                      setHistorySelectionMode(true);
                    }}
                    style={styles.drawerDeleteBtn}
                  >
                    {historySelectionMode && selectedHistoryIds.size > 0 ? (
                      <Text style={styles.drawerDeleteText}>삭제</Text>
                    ) : (
                      <Icon name="trash" size={IS_IPAD ? 22 : 16} color={Colors.primaryColor} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={closeHistoryDrawer} style={styles.drawerCloseBtn}>
                    <Icon name="close" size={IS_IPAD ? 24 : 18} color="#000000" />
                  </TouchableOpacity>
                </View>
              </View>
              {historyLoading ? (
                <View style={styles.drawerLoading}>
                  <ActivityIndicator size="large" color={Colors.primaryColor} />
                </View>
              ) : (
                <FlatList
                  data={historyItems}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.drawerListContent}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.drawerItem,
                        historySelectionMode && selectedHistoryIds.has(item.id) ? styles.drawerItemSelected : undefined
                      ]}
                      onPress={() => {
                        if (historySelectionMode) {
                          toggleHistorySelection(item.id);
                          return;
                        }
                        closeHistoryDrawer();
                        if (item.id === roomId) return;
                        navigation.navigate('ChatRoom', { roomId: item.id, expert: item.expert });
                      }}
                    >
                      {historySelectionMode && (
                        <View
                          style={[
                            styles.historyCheckboxBase,
                            selectedHistoryIds.has(item.id) ? styles.historyCheckboxSelected : styles.historyCheckboxUnselected
                          ]}
                        >
                          {selectedHistoryIds.has(item.id) && (
                            <Icon name="checkmark" size={IS_IPAD ? 16 : 12} color="#FFFFFF" />
                          )}
                        </View>
                      )}
                      <View style={styles.drawerTextArea}>
                        <View style={styles.drawerRow}>
                          <Text style={styles.drawerName} numberOfLines={1}>{item.name}</Text>
                          <Text style={styles.drawerTime}>{item.timestamp}</Text>
                        </View>
                        <Text style={styles.drawerPreview} numberOfLines={1}>{item.lastMessage}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View style={styles.drawerEmpty}>
                      <Text style={styles.drawerEmptyText}>대화 기록이 없습니다.</Text>
                    </View>
                  }
                />
              )}
            </SafeAreaView>
          </Animated.View>
        </View>
      )}
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
  headerLogo: {
    width: IS_IPAD ? 48 : 36,
    height: IS_IPAD ? 48 : 36,
  },
  rightHeader: {
    width: IS_IPAD ? 120 : 90,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: IS_IPAD ? 8 : 6,
    zIndex: 1,
  },
  newChatButton: {
    padding: IS_IPAD ? 8 : 6,
  },
  drawerButton: {
    padding: IS_IPAD ? 8 : 6,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: IS_IPAD ? 80 : 60,
    justifyContent: 'flex-start',
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
    paddingBottom: Platform.OS === 'ios' ? 8 : 0,
  },
  drawerOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    zIndex: 30,
    elevation: 30,
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  drawerPanel: {
    width: SCREEN_WIDTH * 0.7,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
  },
  drawerSafeArea: {
    flex: 1,
    paddingHorizontal: 0,
    paddingBottom: IS_IPAD ? 0 : 0,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: IS_IPAD ? 18 : 12,
    paddingHorizontal: IS_IPAD ? 16 : 12,
  },
  drawerHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: IS_IPAD ? 10 : 6,
  },
  drawerTitle: {
    fontSize: IS_IPAD ? 22 : 18,
    fontWeight: '800',
    color: '#111827',
  },
  drawerCloseBtn: {
    padding: IS_IPAD ? 8 : 6,
  },
  drawerDeleteBtn: {
    padding: IS_IPAD ? 8 : 6,
  },
  drawerDeleteText: {
    fontSize: IS_IPAD ? 16 : 13,
    fontWeight: '700',
    color: Colors.primaryColor,
  },
  drawerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  drawerListContent: {
    paddingBottom: 0,
    paddingHorizontal: 0,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: IS_IPAD ? 12 : 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F3F5',
    paddingHorizontal: IS_IPAD ? 16 : 6,
    width: '100%',
  },
  drawerItemSelected: {
    backgroundColor: '#F2F8FF',
  },
  drawerAvatar: {
    width: IS_IPAD ? 56 : 44,
    height: IS_IPAD ? 56 : 44,
    borderRadius: IS_IPAD ? 28 : 22,
    marginRight: IS_IPAD ? 14 : 12,
  },
  historyCheckboxBase: {
    width: IS_IPAD ? 20 : 16,
    height: IS_IPAD ? 20 : 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: IS_IPAD ? 10 : 8,
  },
  historyCheckboxSelected: {
    backgroundColor: Colors.primaryColor,
    borderColor: Colors.primaryColor,
  },
  historyCheckboxUnselected: {
    backgroundColor: 'white',
  },
  drawerTextArea: {
    flex: 1,
    marginLeft: IS_IPAD ? 10 : 8,
  },
  drawerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: IS_IPAD ? 6 : 4,
  },
  drawerName: {
    fontSize: IS_IPAD ? 18 : 15,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 10,
  },
  drawerTime: {
    fontSize: IS_IPAD ? 14 : 11,
    color: '#9CA3AF',
  },
  drawerPreview: {
    fontSize: IS_IPAD ? 16 : 13,
    color: '#4B5563',
  },
  drawerEmpty: {
    paddingVertical: IS_IPAD ? 30 : 22,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  drawerEmptyText: {
    fontSize: IS_IPAD ? 16 : 13,
    color: '#9CA3AF',
  },
});

export default ChatRoomScreen;
