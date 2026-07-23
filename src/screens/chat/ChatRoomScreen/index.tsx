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
  Animated,
  Dimensions,
  Modal,
  FlatList,
  Platform,
  Image,
  ImageSourcePropType,
  StatusBar,
  Keyboard,
  AppState,
  AppStateStatus,
  Alert,
  StyleProp,
  ViewStyle,
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
import { createChatRoomWithExpert, endChatRoom } from '../../../utils/chat/chatUtils';
import { ChatMessage } from '../../../types/chat';
import { supabase } from '../../../utils/database/supabaseClient';
import { Expert, getExpertCategoryLabel } from '../../../types/expert';
import { getExpertImage } from '../../../utils/expert/getExpertImage';
import { removeBoldMarkup } from '../../../utils/text/removeBoldMarkup';
import { ChatRouteCategory, routeChatCategory } from '../../../utils/chat/routeChatCategory';
import { fetchUserBalance } from '../../../utils/payments/balance';
import { checkFreeMessageAvailable } from '../../../utils/payments/freeMessage';
import { getCurrentUserSafely } from '../../../utils/user/authUtils';
import { openStoreForReview, REVIEW_REWARD_SAHA } from '../../../constants/review_reward';
import {
  hasUserReceivedReviewReward,
  grantReviewReward,
} from '../../../utils/reviewReward/reviewReward';
import { getPartnerList } from '../../../utils/partner/partnerDatabase';
import { PartnerSaju, RELATIONSHIP_STATUS_LABELS, RelationshipStatus } from '../../../types/partner';

const IS_IPAD = isIPad();
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = IS_IPAD ? 430 : Math.min(SCREEN_WIDTH * 0.84, 460);

interface ChatRoomScreenProps {
  navigation: any;
  route: any;
}

interface SidebarChatItem {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  profileImage: ImageSourcePropType;
  expert: Expert;
  sortTime?: string | null;
}

interface ActiveDirectChat {
  roomId: string;
  expert: Expert;
  initialMessage?: string;
  partnerData?: any;
}

interface DirectDraftMessage {
  id: string;
  text: string;
  role: 'user' | 'status' | 'assignment';
  expertName?: string;
  createdAt: string;
}

interface DirectInlineActiveChatProps {
  navigation: any;
  activeChat: ActiveDirectChat;
  draftMessages: DirectDraftMessage[];
  isKeyboardVisible: boolean;
  keyboardHeight: number;
  onBalanceInfoChange: (
    balance: number,
    freeMessageInfo: { usedCount: number; dailyLimit: number; available?: boolean }
  ) => void;
}

interface ChatConversationBodyProps {
  messages: ChatMessage[];
  isAiResponding: boolean;
  expert: Expert;
  flatListRef: React.RefObject<FlatList<ChatMessage>>;
  shouldAutoScroll: boolean;
  setShouldAutoScroll: (value: boolean) => void;
  scrollToBottom: (animated: boolean) => void;
  loading: boolean;
  onSendMessage: (message: string) => void;
  onSendMessageWithText: (message: string) => void;
  onMessageActionPress?: (item: ChatMessage, option?: NonNullable<ChatMessage['action_options']>[number]) => void;
  messageWrapperStyle?: StyleProp<ViewStyle>;
  inputWrapperStyle?: StyleProp<ViewStyle>;
}

const ROUTING_STATUS_MESSAGES = [
  '질문의 흐름을 살펴보고 있어요',
  '어울리는 도사님을 연결하고 있어요',
];
const ROUTING_STATUS_INTERVAL_MS = 1500;
const MIN_ROUTING_MS = 3000;
const CHAT_START_DELAY_MS = 800;

const ASSIGNMENT_DESCRIPTIONS: Record<ChatRouteCategory, string> = {
  comprehensive: '인생의 큰 흐름과 지금의 선택을 함께 짚어드릴게요.',
  love: '마음의 거리와 관계의 흐름을 섬세하게 살펴드릴게요.',
  career: '일과 진로의 흐름을 차분히 짚어드릴게요.',
};
const SAHA_HELPER_NAME = '사바 도우미';
const SAHA_HELPER_IMAGE = require('../../../../assets/logo/logo_icon.png');
const INFO_CAPTURE_THANKS_MESSAGE = '입력 감사합니다. 정보를 참고해서 말씀드리겠습니다. 무엇이 궁금하신가요?';
const PARTNER_CONNECTED_MESSAGE = (name?: string) => (
  `좋아요. ${name || '상대방'}님의 정보를 참고해서 이어서 봐드릴게요.`
);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const buildAssignmentMessage = (expert: Expert, category: ChatRouteCategory) => {
  const categoryLabel = getExpertCategoryLabel(expert.category);
  return `${expert.name}님이 상담을 도와주실 거예요.\n${categoryLabel}의 눈으로 먼저 읽어보고, 대화가 깊어지면 다른 고민도 자연스럽게 이어서 봐드릴게요.\n${ASSIGNMENT_DESCRIPTIONS[category]}`;
};

const detectInfoCaptureIntent = (text: string): 'birth_info' | 'partner_info' | null => {
  const normalized = text.replace(/\s+/g, '').toLowerCase();
  const hasPartnerSignal = /(우리|상대|남친|여친|남자친구|여자친구|애인|남편|아내|배우자|썸|그사람|걔|연애상대)/.test(normalized);
  const hasExplicitCompatibilitySignal = /(궁합|속궁합|관계궁합|연애궁합)/.test(normalized);
  const hasSoftCompatibilitySignal = /(잘맞|잘맞아)/.test(normalized);

  if (
    hasExplicitCompatibilitySignal ||
    (hasPartnerSignal && hasSoftCompatibilitySignal) ||
    (hasPartnerSignal && /(봐줘|봐주|알려줘|어때|흐름|관계|연애|사주)/.test(normalized))
  ) {
    return 'partner_info';
  }

  const hasBirthInfo =
    /\d{2,4}년/.test(text) ||
    /\d{1,2}월\s*\d{1,2}일/.test(text) ||
    /(오전|오후|새벽|밤|저녁|아침)?\s*\d{1,2}시/.test(text) ||
    /(갑|을|병|정|무|기|경|신|임|계)(자|축|인|묘|진|사|오|미|신|유|술|해)(년|월|일|시|일주|시주|월주|년주)?/.test(text) ||
    /(일주|월주|년주|시주|일간|천간|지지|사주정보|출생|태어났|태어난|생년월일|양력|음력|윤달)/.test(text);

  if (!hasBirthInfo) return null;

  return hasPartnerSignal ? 'partner_info' : 'birth_info';
};

const createInfoCaptureMessages = (
  roomId: string,
  text: string,
  kind: 'birth_info' | 'partner_info',
  expert: Expert,
  partners: PartnerSaju[] = []
): ChatMessage[] => {
  const now = Date.now();
  const userDraftId = `info_capture_user_${now}`;
  const helperDraftId = `info_capture_helper_${now}`;
  const helperMessage = kind === 'partner_info'
    ? '상대방 정보가 있으면 더 정확한 궁합 상담이 됩니다.\n누구와의 흐름을 함께 볼까요?'
    : '정확히 반영하려면 출생 정보를 입력해주세요.\n아래 버튼을 눌러서 입력해주세요.';
  const actionOptions = kind === 'partner_info'
    ? [
        ...partners.map((partner) => ({
          label: partner.partner_name || '이름 없음',
          description: RELATIONSHIP_STATUS_LABELS[
            (partner.relationship_status || 'interested') as RelationshipStatus
          ],
          action_kind: 'select_partner' as const,
          action_payload: { roomId, expert, partner, originalText: text.trim(), userDraftId },
        })),
        {
          label: partners.length > 0 ? '다른 사람 입력하기' : '상대방 정보 입력하기',
          action_kind: 'partner_info' as const,
          action_payload: { roomId, expert, originalText: text.trim(), userDraftId },
        },
      ]
    : undefined;

  return [
    {
      id: userDraftId,
      chat_room_id: roomId,
      sender_type: 'user',
      message: text.trim(),
      created_at: new Date(now).toISOString(),
    },
    {
      id: helperDraftId,
      chat_room_id: roomId,
      sender_type: 'expert',
      message: helperMessage,
      created_at: new Date(now + 1).toISOString(),
      display_name: SAHA_HELPER_NAME,
      display_image: SAHA_HELPER_IMAGE,
      action_label: kind === 'birth_info' ? '입력하기' : undefined,
      action_kind: kind,
      action_payload: { roomId, expert, originalText: text.trim(), userDraftId },
      action_options: actionOptions,
    },
  ];
};

const sortMessagesByCreatedAt = (items: ChatMessage[]) => (
  [...items].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
);

const loadPartnerOptions = async (): Promise<PartnerSaju[]> => {
  try {
    return await getPartnerList() as PartnerSaju[];
  } catch (error) {
    console.error('Partner option lookup failed:', error);
    return [];
  }
};

const buildChatPartnerData = (partner: PartnerSaju) => ({
  partnerInfo: {
    ...(partner.birth_info || {}),
    name: partner.partner_name || partner.birth_info?.name || '',
    relationshipStatus: partner.relationship_status,
  },
  partnerSajuData: partner.saju_data,
  partnerId: partner.id,
  compatibilityResult: partner.compatibility_result,
});

const ChatRoomScreen: React.FC<ChatRoomScreenProps> = ({ navigation, route }) => {
  if (route.params?.directEntry === true) {
    return <DirectEntryChatRoomScreen navigation={navigation} />;
  }

  return <ActiveChatRoomScreen navigation={navigation} route={route} />;
};

const ChatConversationBody: React.FC<ChatConversationBodyProps> = ({
  messages,
  isAiResponding,
  expert,
  flatListRef,
  shouldAutoScroll,
  setShouldAutoScroll,
  scrollToBottom,
  loading,
  onSendMessage,
  onSendMessageWithText,
  onMessageActionPress,
  messageWrapperStyle,
  inputWrapperStyle,
}) => {
  const messageList = (
    <MessageList
      messages={messages}
      isAiResponding={isAiResponding}
      expert={expert}
      flatListRef={flatListRef}
      shouldAutoScroll={shouldAutoScroll}
      setShouldAutoScroll={setShouldAutoScroll}
      scrollToBottom={scrollToBottom}
      loading={loading}
      onMessageActionPress={onMessageActionPress}
    />
  );

  return (
    <>
      {messageWrapperStyle ? (
        <View style={messageWrapperStyle}>{messageList}</View>
      ) : messageList}

      <View style={inputWrapperStyle ?? styles.inputContainer}>
        <InitialQuestions
          expert={expert}
          messages={messages}
          onSendMessage={onSendMessageWithText}
        />

        <FollowUpQuestions
          messages={messages}
          onSendMessage={onSendMessageWithText}
        />

        <MessageInput
          isAiResponding={isAiResponding}
          onSendMessage={onSendMessage}
        />
      </View>
    </>
  );
};

const ActiveChatRoomScreen: React.FC<ChatRoomScreenProps> = ({ navigation, route }) => {
  const { roomId, expert, partnerData, initialMessage, infoCaptureMessage } = route.params;
  const isDirectMode: boolean = route.params?.directMode === true;
  const onDirectNewChat: (() => void) | undefined = route.params?.onDirectNewChat;
  const onDirectSelectChat: ((roomId: string, expert: Expert) => void) | undefined = route.params?.onDirectSelectChat;
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
  const [isSidebarVisible, setIsSidebarVisible] = useState<boolean>(false);
  const [sidebarChats, setSidebarChats] = useState<SidebarChatItem[]>([]);
  const [isSidebarLoading, setIsSidebarLoading] = useState<boolean>(false);
  const [uiMessages, setUiMessages] = useState<ChatMessage[]>([]);
  const [activePartnerData, setActivePartnerData] = useState<any>(partnerData);
  const sidebarTranslateX = useRef(new Animated.Value(SIDEBAR_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

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
  const allowRoomSwitchRef = useRef<boolean>(false);
  const initialMessageSentRef = useRef<boolean>(false);
  const handledInfoActionIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (partnerData) {
      setActivePartnerData(partnerData);
    }
  }, [partnerData]);

  useEffect(() => {
    if (!infoCaptureMessage) return;
    setUiMessages((prev) => {
      if (prev.some((item) => item.id === `info_capture_done_${roomId}`)) return prev;
      return [
        ...prev,
        {
          id: `info_capture_done_${roomId}`,
          chat_room_id: roomId,
          sender_type: 'expert',
          message: infoCaptureMessage,
          created_at: new Date().toISOString(),
          display_name: SAHA_HELPER_NAME,
          display_image: SAHA_HELPER_IMAGE,
        },
      ];
    });
  }, [infoCaptureMessage, roomId]);

  const {
    isAiResponding,
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
    partnerData: activePartnerData
  });

  const handleInfoCaptureAction = useCallback(async (
    item: ChatMessage,
    option?: NonNullable<ChatMessage['action_options']>[number]
  ) => {
    const actionKind = option?.action_kind ?? item.action_kind;
    const actionPayload = option?.action_payload ?? item.action_payload;
    const actionId = `${item.id}:${actionKind}:${option?.label ?? item.action_label ?? 'default'}`;
    if (handledInfoActionIdsRef.current.has(actionId)) return;
    handledInfoActionIdsRef.current.add(actionId);
    setUiMessages((prev) =>
      prev.map((message) =>
        message.id === item.id
          ? { ...message, action_label: undefined, action_options: undefined }
          : message
      )
    );
    const returnToChat = {
      roomId,
      expert,
      partnerData: activePartnerData,
      directMode: isDirectMode,
      infoCaptureMessage: INFO_CAPTURE_THANKS_MESSAGE,
    };

    if (actionKind === 'select_partner') {
      const selectedPartner = actionPayload?.partner;
      if (!selectedPartner?.id) return;

      try {
        const { error } = await supabase
          .from('chat_rooms')
          .update({
            partner_saju_id: selectedPartner.id,
            chat_context: 'love_compatibility',
          })
          .eq('id', roomId);

        if (error) throw error;

        const nextPartnerData = buildChatPartnerData(selectedPartner);
        setActivePartnerData(nextPartnerData);
        setUiMessages((prev) => [
          ...prev,
          {
            id: `partner_connected_${roomId}_${Date.now()}`,
            chat_room_id: roomId,
            sender_type: 'expert',
            message: PARTNER_CONNECTED_MESSAGE(selectedPartner.partner_name),
            created_at: new Date().toISOString(),
            display_name: SAHA_HELPER_NAME,
            display_image: SAHA_HELPER_IMAGE,
          },
        ]);
        if (actionPayload?.originalText) {
          sendMessageWithText(actionPayload.originalText, {
            partnerDataOverride: nextPartnerData,
            suppressUserMessageUiAppend: true,
          });
        }
      } catch (error) {
        console.error('Partner selection failed:', error);
        Alert.alert('오류', '상대방 정보를 연결하지 못했습니다.');
      }
      return;
    }

    if (actionKind === 'partner_info') {
      navigation.navigate('PartnerInput', {
        expertId: expert.id,
        returnToChat,
      });
      return;
    }

    navigation.navigate('BirthInfo', {
      returnToChat,
    });
  }, [activePartnerData, expert, isDirectMode, navigation, roomId, sendMessageWithText]);

  const handleChatSendMessage = useCallback(async (text: string) => {
    const intent = detectInfoCaptureIntent(text);
    if (intent && !(intent === 'partner_info' && activePartnerData)) {
      const partners = intent === 'partner_info' ? await loadPartnerOptions() : [];
      setUiMessages((prev) => [
        ...prev,
        ...createInfoCaptureMessages(roomId, text, intent, expert, partners),
      ]);
      return;
    }

    sendMessage(text);
  }, [activePartnerData, expert, roomId, sendMessage]);

  const displayedMessages = sortMessagesByCreatedAt([...messages, ...uiMessages]);

  useEffect(() => {
    if (!initialMessage || initialMessageSentRef.current || loading || isAiResponding) return;
    initialMessageSentRef.current = true;
    const timer = setTimeout(() => {
      sendMessageWithText(initialMessage);
    }, 300);

    return () => clearTimeout(timer);
  }, [initialMessage, isAiResponding, loading, sendMessageWithText]);

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
  const headerContentHeight = isDirectMode
    ? (Platform.OS === 'android' ? 46 : (IS_IPAD ? 54 : 44))
    : (Platform.OS === 'android' ? 54 : (IS_IPAD ? 60 : 48));
  const headerTopPadding = isDirectMode
    ? 0
    : Platform.OS === 'android'
      ? Math.max(statusBarHeight - 8, 0)
      : (IS_IPAD ? 4 : 0);
  const leftWidth = IS_IPAD ? 80 : 60;
  const rightWidth = IS_IPAD ? 200 : 150;

  const fetchSidebarChats = useCallback(async () => {
    try {
      setIsSidebarLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        setSidebarChats([]);
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
          created_at,
          messages:chat_messages(message, created_at)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .order('created_at', { foreignTable: 'chat_messages', ascending: false })
        .limit(1, { foreignTable: 'chat_messages' });

      if (roomError) throw roomError;
      const roomList = rooms || [];
      if (roomList.length === 0) {
        setSidebarChats([]);
        return;
      }

      const expertIds = Array.from(new Set(roomList.map((room: any) => room.expert_id)));
      const { data: experts, error: expertError } = await supabase
        .from('experts')
        .select('id, name, category, title, image_name, is_online, created_at')
        .in('id', expertIds);

      if (expertError) throw expertError;
      const expertMap: Record<string, Expert> = {};
      (experts || []).forEach((item: any) => {
        expertMap[item.id] = item as Expert;
      });

      const items: SidebarChatItem[] = roomList
        .map((room: any) => {
          const itemExpert = expertMap[room.expert_id];
          if (!itemExpert) return null;
          const fallbackMsg = Array.isArray(room.messages) && room.messages.length > 0 ? room.messages[0]?.message ?? '' : '';
          const fallbackTs = Array.isArray(room.messages) && room.messages.length > 0 ? room.messages[0]?.created_at ?? null : null;
          const tsIso: string | null = room.last_message_at || fallbackTs || room.created_at || null;
          const tsStr = tsIso ? new Date(tsIso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '';
          const displayName = room.chat_context === 'love_compatibility'
            ? `${itemExpert.name} · 궁합`
            : itemExpert.name;

          return {
            id: room.id,
            name: displayName,
            lastMessage: room.last_message || fallbackMsg || '아직 대화가 없습니다',
            timestamp: tsStr,
            profileImage: itemExpert.image_name ? getExpertImage(itemExpert.image_name) : require('../../../../assets/people/hoosi_guy.jpg'),
            expert: itemExpert,
            sortTime: tsIso || room.created_at,
          };
        })
        .filter(Boolean) as SidebarChatItem[];

      items.sort((a, b) => {
        const timeA = new Date(a.sortTime || 0).getTime();
        const timeB = new Date(b.sortTime || 0).getTime();
        return timeB - timeA;
      });
      setSidebarChats(items);
    } catch (error) {
      console.error('fetchSidebarChats error:', error);
      Alert.alert('오류', '대화 목록을 불러오지 못했습니다.');
    } finally {
      setIsSidebarLoading(false);
    }
  }, []);

  const openSidebar = useCallback(() => {
    setIsSidebarVisible(true);
    fetchSidebarChats();
    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.timing(sidebarTranslateX, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [backdropOpacity, fetchSidebarChats, sidebarTranslateX]);

  const closeSidebar = useCallback(() => {
    Animated.parallel([
      Animated.timing(sidebarTranslateX, {
        toValue: SIDEBAR_WIDTH,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => setIsSidebarVisible(false));
  }, [backdropOpacity, sidebarTranslateX]);

  const switchChatRoom = useCallback((item: SidebarChatItem) => {
    closeSidebar();
    if (item.id === roomId) return;
    if (isDirectMode && onDirectSelectChat) {
      onDirectSelectChat(item.id, item.expert);
      return;
    }
    allowRoomSwitchRef.current = true;
    navigation.replace('ChatRoom', {
      roomId: item.id,
      expert: item.expert,
    });
  }, [closeSidebar, isDirectMode, navigation, onDirectSelectChat, roomId]);

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
    if (isDirectMode) return;
    const unsubscribe = navigation.addListener('beforeRemove', (event: any) => {
      if (allowRoomSwitchRef.current) {
        allowRoomSwitchRef.current = false;
        return;
      }
      if (hasEndedRef.current || isEndingRef.current) {
        return;
      }
      event.preventDefault();
      pendingNavActionRef.current = event.data.action;
      setShowEndModal(true);
    });
    return unsubscribe;
  }, [isDirectMode, navigation]);

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
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={isDirectMode && onDirectNewChat ? onDirectNewChat : () => safeGoBack(navigation)}
          >
            <Icon
              name={isDirectMode ? 'create-outline' : 'arrow-back'}
              size={IS_IPAD ? 28 : 19}
              color="#000000"
            />
          </TouchableOpacity>
        </View>
        <View pointerEvents="none" style={[styles.headerTitleContainer, { top: headerTopPadding, height: headerContentHeight }]}>
          <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
            {isDirectMode ? '대화' : expert.title}
          </Text>
        </View>
        <View style={[styles.rightHeader, { width: rightWidth }]}>
          <View style={styles.rightHeaderTop}>
            <View style={styles.balanceContainer}>
              <Image
                source={require('../../../../assets/money/saha_money.png')}
                style={styles.balanceIcon}
                resizeMode="contain"
              />
              <Text style={styles.balanceText}>{currentBalance.toLocaleString()}</Text>
            </View>
            <TouchableOpacity style={[styles.headerIconButton, styles.headerMenuButton]} onPress={openSidebar}>
              <Icon name="menu" size={IS_IPAD ? 30 : 22} color="#000000" />
            </TouchableOpacity>
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
        <ChatConversationBody
          messages={displayedMessages}
          isAiResponding={isAiResponding}
          expert={expert}
          flatListRef={flatListRef}
          shouldAutoScroll={shouldAutoScroll}
          setShouldAutoScroll={setShouldAutoScroll}
          scrollToBottom={scrollToBottom}
          loading={loading}
          onSendMessage={handleChatSendMessage}
          onSendMessageWithText={sendMessageWithText}
          onMessageActionPress={handleInfoCaptureAction}
        />
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
      <Modal
        visible={isSidebarVisible}
        transparent
        animationType="none"
        onRequestClose={closeSidebar}
      >
        <View style={styles.sidebarModal}>
          <Animated.View style={[styles.sidebarBackdrop, { opacity: backdropOpacity }]}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={closeSidebar}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.sidebarShell,
              { transform: [{ translateX: sidebarTranslateX }] },
            ]}
          >
          <SafeAreaView style={styles.sidebar}>
            <View style={styles.sidebarHandle} />
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarTitle}>대화</Text>
              <TouchableOpacity style={styles.sidebarCloseButton} onPress={closeSidebar}>
                <Icon name="close" size={IS_IPAD ? 28 : 22} color="#222222" />
              </TouchableOpacity>
            </View>
            {isSidebarLoading ? (
              <View style={styles.sidebarLoading}>
                <Text style={styles.sidebarLoadingText}>대화 목록을 불러오는 중</Text>
              </View>
            ) : (
              <FlatList
                data={sidebarChats}
                keyExtractor={(item) => item.id}
                contentContainerStyle={sidebarChats.length === 0 ? styles.sidebarEmptyList : styles.sidebarList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.sidebarEmpty}>
                    <Text style={styles.sidebarEmptyTitle}>아직 대화가 없습니다</Text>
                    <Text style={styles.sidebarEmptyText}>하단 대화 탭에서 새 상담을 시작해보세요.</Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const isActive = item.id === roomId;
                  const categoryLabel = getExpertCategoryLabel(item.expert.category);
                  return (
                    <TouchableOpacity
                      style={[styles.sidebarChatItem, isActive ? styles.sidebarChatItemActive : undefined]}
                      onPress={() => switchChatRoom(item)}
                    >
                      <Image source={item.profileImage} style={styles.sidebarProfileImage} />
                      <View style={styles.sidebarChatInfo}>
                        <View style={styles.sidebarChatTop}>
                          <Text style={styles.sidebarChatName} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={styles.sidebarChatTime}>{item.timestamp}</Text>
                        </View>
                        <Text style={styles.sidebarChatCategory} numberOfLines={1}>
                          {categoryLabel}
                        </Text>
                        <Text style={styles.sidebarLastMessage} numberOfLines={1}>
                          {removeBoldMarkup(item.lastMessage)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </SafeAreaView>
          </Animated.View>
        </View>
      </Modal>
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

const DirectInlineActiveChat: React.FC<DirectInlineActiveChatProps> = ({
  navigation,
  activeChat,
  draftMessages,
  isKeyboardVisible,
  keyboardHeight,
  onBalanceInfoChange,
}) => {
  const initialMessageSentRef = useRef<boolean>(false);
  const handledInfoActionIdsRef = useRef<Set<string>>(new Set());
  const [uiMessages, setUiMessages] = useState<ChatMessage[]>([]);
  const [activePartnerData, setActivePartnerData] = useState<any>(activeChat.partnerData);
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
  } = useChatRoom({ roomId: activeChat.roomId, expert: activeChat.expert });

  const {
    isAiResponding,
    sendMessage,
    sendMessageWithText
  } = useMessageActions({
    roomId: activeChat.roomId,
    expert: activeChat.expert,
    userBirthInfo,
    messages,
    setMessages,
    setShouldAutoScroll,
    scrollToBottom,
    onBalanceUpdate: refreshBalance,
    onBalanceInsufficient: () => {
      Alert.alert('안내', '무료 상담을 모두 사용했거나 사바가 부족합니다.');
    },
    partnerData: activePartnerData,
  });

  useEffect(() => {
    setActivePartnerData(activeChat.partnerData);
  }, [activeChat.partnerData]);

  const handleInfoCaptureAction = useCallback(async (
    item: ChatMessage,
    option?: NonNullable<ChatMessage['action_options']>[number]
  ) => {
    const actionKind = option?.action_kind ?? item.action_kind;
    const actionPayload = option?.action_payload ?? item.action_payload;
    const actionId = `${item.id}:${actionKind}:${option?.label ?? item.action_label ?? 'default'}`;
    if (handledInfoActionIdsRef.current.has(actionId)) return;
    handledInfoActionIdsRef.current.add(actionId);
    setUiMessages((prev) =>
      prev.map((message) =>
        message.id === item.id
          ? { ...message, action_label: undefined, action_options: undefined }
          : message
      )
    );
    const returnToChat = {
      roomId: activeChat.roomId,
      expert: activeChat.expert,
      partnerData: activePartnerData,
      directMode: true,
      infoCaptureMessage: INFO_CAPTURE_THANKS_MESSAGE,
    };

    if (actionKind === 'select_partner') {
      const selectedPartner = actionPayload?.partner;
      if (!selectedPartner?.id) return;

      try {
        const { error } = await supabase
          .from('chat_rooms')
          .update({
            partner_saju_id: selectedPartner.id,
            chat_context: 'love_compatibility',
          })
          .eq('id', activeChat.roomId);

        if (error) throw error;

        const nextPartnerData = buildChatPartnerData(selectedPartner);
        setActivePartnerData(nextPartnerData);
        setUiMessages((prev) => [
          ...prev,
          {
            id: `partner_connected_${activeChat.roomId}_${Date.now()}`,
            chat_room_id: activeChat.roomId,
            sender_type: 'expert',
            message: PARTNER_CONNECTED_MESSAGE(selectedPartner.partner_name),
            created_at: new Date().toISOString(),
            display_name: SAHA_HELPER_NAME,
            display_image: SAHA_HELPER_IMAGE,
          },
        ]);
        if (actionPayload?.originalText) {
          sendMessageWithText(actionPayload.originalText, {
            partnerDataOverride: nextPartnerData,
            suppressUserMessageUiAppend: true,
          });
        }
      } catch (error) {
        console.error('Direct partner selection failed:', error);
        Alert.alert('오류', '상대방 정보를 연결하지 못했습니다.');
      }
      return;
    }

    if (actionKind === 'partner_info') {
      navigation.navigate('PartnerInput', {
        expertId: activeChat.expert.id,
        returnToChat,
      });
      return;
    }

    navigation.navigate('BirthInfo', {
      returnToChat,
    });
  }, [activeChat.expert, activeChat.roomId, activePartnerData, navigation, sendMessageWithText]);

  const handleChatSendMessage = useCallback(async (
    text: string,
    options?: { includeUserMessage?: boolean }
  ) => {
    const intent = detectInfoCaptureIntent(text);
    if (intent && !(intent === 'partner_info' && activePartnerData)) {
      const partners = intent === 'partner_info' ? await loadPartnerOptions() : [];
      const nextUiMessages = createInfoCaptureMessages(activeChat.roomId, text, intent, activeChat.expert, partners);
      setUiMessages((prev) => [
        ...prev,
        ...(options?.includeUserMessage === false
          ? nextUiMessages.filter((message) => message.sender_type !== 'user')
          : nextUiMessages),
      ]);
      return;
    }

    sendMessage(text);
  }, [activeChat.expert, activeChat.roomId, activePartnerData, sendMessage]);

  useEffect(() => {
    onBalanceInfoChange(currentBalance, freeMessageInfo);
  }, [currentBalance, freeMessageInfo, onBalanceInfoChange]);

  useEffect(() => {
    if (!activeChat.initialMessage || initialMessageSentRef.current || loading || isAiResponding) return;
    initialMessageSentRef.current = true;
    const timer = setTimeout(() => {
      handleChatSendMessage(activeChat.initialMessage!, { includeUserMessage: false });
    }, 300);

    return () => clearTimeout(timer);
  }, [activeChat.initialMessage, handleChatSendMessage, isAiResponding, loading]);

  useEffect(() => {
    if (messages.length === 0) return;
    scrollToBottom(true);
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.follow_up_questions && lastMessage.follow_up_questions.length > 0) {
        setTimeout(() => {
          scrollToBottom(true);
        }, 300);
      }
    }
  }, [messages, scrollToBottom]);

  const draftChatMessages: ChatMessage[] = draftMessages
    .filter((item) => item.role === 'user' || item.role === 'assignment')
    .map((item) => ({
      id: item.id,
      chat_room_id: activeChat.roomId,
      sender_type: item.role === 'user' ? 'user' : 'expert',
      message: item.text,
      created_at: item.createdAt,
      ...(item.role === 'assignment'
        ? { display_name: SAHA_HELPER_NAME, display_image: SAHA_HELPER_IMAGE }
        : {}),
    }));

  let didHideInitialMessage = false;
  const visibleMessages = activeChat.initialMessage
    ? messages.filter((item) => {
        const isInitialMessageCopy =
          !didHideInitialMessage &&
          item.sender_type === 'user' &&
          item.message.trim() === activeChat.initialMessage?.trim();

        if (isInitialMessageCopy) {
          didHideInitialMessage = true;
          return false;
        }

        return true;
      })
    : messages;
  const mergedMessages = sortMessagesByCreatedAt([...draftChatMessages, ...visibleMessages, ...uiMessages]);

  return (
    <ChatConversationBody
      messages={mergedMessages}
      isAiResponding={isAiResponding}
      expert={activeChat.expert}
      flatListRef={flatListRef}
      shouldAutoScroll={shouldAutoScroll}
      setShouldAutoScroll={setShouldAutoScroll}
      scrollToBottom={scrollToBottom}
      loading={loading}
      onSendMessage={handleChatSendMessage}
      onSendMessageWithText={sendMessageWithText}
      onMessageActionPress={handleInfoCaptureAction}
      messageWrapperStyle={styles.directEntryMessageArea}
      inputWrapperStyle={[
        styles.inputContainer,
        styles.inputContainerCompact,
        Platform.OS === 'android' && isKeyboardVisible
          ? { marginBottom: Math.max(0, keyboardHeight + (IS_IPAD ? 18 : 14)) }
          : undefined,
      ]}
    />
  );
};

const DirectEntryChatRoomScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [draftMessages, setDraftMessages] = useState<DirectDraftMessage[]>([]);
  const [isMatching, setIsMatching] = useState<boolean>(false);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [freeMessageInfo, setFreeMessageInfo] = useState<{ usedCount: number; dailyLimit: number }>({
    usedCount: 0,
    dailyLimit: 1,
  });
  const [activeChat, setActiveChat] = useState<ActiveDirectChat | null>(null);
  const [sidebarChats, setSidebarChats] = useState<SidebarChatItem[]>([]);
  const [isSidebarVisible, setIsSidebarVisible] = useState<boolean>(false);
  const [isSidebarLoading, setIsSidebarLoading] = useState<boolean>(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState<boolean>(false);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const sidebarTranslateX = useRef(new Animated.Value(SIDEBAR_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const loadBalanceInfo = useCallback(async () => {
    const { status, user } = await getCurrentUserSafely();
    if (status !== 'authenticated' || !user) return;

    const [balance, freeInfo] = await Promise.all([
      fetchUserBalance(user.id),
      checkFreeMessageAvailable(user.id),
    ]);

    setCurrentBalance(balance ?? 0);
    setFreeMessageInfo({
      usedCount: freeInfo.usedCount,
      dailyLimit: freeInfo.dailyLimit,
    });
  }, []);

  useEffect(() => {
    loadBalanceInfo();
  }, [loadBalanceInfo]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (event) => {
      setIsKeyboardVisible(true);
      setKeyboardHeight(event.endCoordinates.height);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const fetchExpertForCategory = useCallback(async (category: ChatRouteCategory): Promise<Expert | null> => {
    const { data, error } = await supabase
      .from('experts')
      .select('id, name, category, title, image_name, is_online, created_at')
      .eq('category', category)
      .eq('is_online', true)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      console.error('Direct chat expert lookup error:', error, 'Category:', category);
      return null;
    }

    return data as Expert;
  }, []);

  const fetchSidebarChats = useCallback(async () => {
    try {
      setIsSidebarLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        setSidebarChats([]);
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
          created_at,
          messages:chat_messages(message, created_at)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .order('created_at', { foreignTable: 'chat_messages', ascending: false })
        .limit(1, { foreignTable: 'chat_messages' });

      if (roomError) throw roomError;
      const roomList = rooms || [];
      if (roomList.length === 0) {
        setSidebarChats([]);
        return;
      }

      const expertIds = Array.from(new Set(roomList.map((room: any) => room.expert_id)));
      const { data: experts, error: expertError } = await supabase
        .from('experts')
        .select('id, name, category, title, image_name, is_online, created_at')
        .in('id', expertIds);

      if (expertError) throw expertError;
      const expertMap: Record<string, Expert> = {};
      (experts || []).forEach((item: any) => {
        expertMap[item.id] = item as Expert;
      });

      const items: SidebarChatItem[] = roomList
        .map((room: any) => {
          const itemExpert = expertMap[room.expert_id];
          if (!itemExpert) return null;
          const fallbackMsg = Array.isArray(room.messages) && room.messages.length > 0 ? room.messages[0]?.message ?? '' : '';
          const fallbackTs = Array.isArray(room.messages) && room.messages.length > 0 ? room.messages[0]?.created_at ?? null : null;
          const tsIso: string | null = room.last_message_at || fallbackTs || room.created_at || null;
          const tsStr = tsIso ? new Date(tsIso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '';

          return {
            id: room.id,
            name: room.chat_context === 'love_compatibility' ? `${itemExpert.name} · 궁합` : itemExpert.name,
            lastMessage: room.last_message || fallbackMsg || '아직 대화가 없습니다',
            timestamp: tsStr,
            profileImage: itemExpert.image_name ? getExpertImage(itemExpert.image_name) : require('../../../../assets/people/hoosi_guy.jpg'),
            expert: itemExpert,
            sortTime: tsIso || room.created_at,
          };
        })
        .filter(Boolean) as SidebarChatItem[];

      items.sort((a, b) => {
        const timeA = new Date(a.sortTime || 0).getTime();
        const timeB = new Date(b.sortTime || 0).getTime();
        return timeB - timeA;
      });
      setSidebarChats(items);
    } catch (error) {
      console.error('fetchSidebarChats error:', error);
      Alert.alert('오류', '대화 목록을 불러오지 못했습니다.');
    } finally {
      setIsSidebarLoading(false);
    }
  }, []);

  const openSidebar = useCallback(() => {
    setIsSidebarVisible(true);
    fetchSidebarChats();
    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.timing(sidebarTranslateX, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [backdropOpacity, fetchSidebarChats, sidebarTranslateX]);

  const closeSidebar = useCallback(() => {
    Animated.parallel([
      Animated.timing(sidebarTranslateX, {
        toValue: SIDEBAR_WIDTH,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => setIsSidebarVisible(false));
  }, [backdropOpacity, sidebarTranslateX]);

  const handleNewChat = useCallback(() => {
    setActiveChat(null);
    setDraftMessages([]);
    setIsMatching(false);
  }, []);

  const handleSelectChat = useCallback((roomId: string, expert: Expert) => {
    closeSidebar();
    setActiveChat({ roomId, expert });
  }, [closeSidebar]);

  const handleBalanceInfoChange = useCallback((
    balance: number,
    nextFreeMessageInfo: { usedCount: number; dailyLimit: number; available?: boolean }
  ) => {
    setCurrentBalance(balance);
    setFreeMessageInfo({
      usedCount: nextFreeMessageInfo.usedCount,
      dailyLimit: nextFreeMessageInfo.dailyLimit,
    });
  }, []);

  const handleFirstMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isMatching) return;

    const statusMessageId = `status-${Date.now()}`;
    const startedAt = Date.now();
    const userMessageCreatedAt = new Date(startedAt).toISOString();
    const statusMessageCreatedAt = new Date(startedAt + 1).toISOString();
    setIsMatching(true);
    setDraftMessages((prev) => [
      ...prev,
      {
        id: `user-${startedAt}`,
        text: trimmed,
        role: 'user',
        createdAt: userMessageCreatedAt,
      },
      {
        id: statusMessageId,
        text: ROUTING_STATUS_MESSAGES[0],
        role: 'status',
        expertName: SAHA_HELPER_NAME,
        createdAt: statusMessageCreatedAt,
      },
    ]);

    const statusTimers = ROUTING_STATUS_MESSAGES.slice(1).map((statusText, index) => (
      setTimeout(() => {
        setDraftMessages((prev) =>
          prev.map((item) =>
            item.id === statusMessageId && item.role === 'status'
              ? { ...item, text: statusText }
              : item
          )
        );
      }, (index + 1) * ROUTING_STATUS_INTERVAL_MS)
    ));

    try {
      const route = await routeChatCategory(trimmed);
      const elapsedMs = Date.now() - startedAt;
      if (elapsedMs < MIN_ROUTING_MS) {
        await sleep(MIN_ROUTING_MS - elapsedMs);
      }
      statusTimers.forEach(clearTimeout);

      const assignedExpert = await fetchExpertForCategory(route.category);
      if (!assignedExpert) {
        Alert.alert('안내', '지금 연결 가능한 도사님을 찾지 못했습니다.');
        setDraftMessages((prev) => prev.filter((item) => item.id !== statusMessageId));
        setIsMatching(false);
        return;
      }

      setDraftMessages((prev) =>
        prev.map((item) =>
          item.id === statusMessageId
            ? {
                ...item,
                text: buildAssignmentMessage(assignedExpert, route.category),
                role: 'assignment',
                expertName: SAHA_HELPER_NAME,
              }
            : item
        )
      );

      setTimeout(() => {
        createChatRoomWithExpert(navigation, assignedExpert.id).then((chatRoom) => {
          if (!chatRoom) {
            setIsMatching(false);
            return;
          }
          setActiveChat({
            roomId: chatRoom.roomId,
            expert: chatRoom.expert as Expert,
            initialMessage: trimmed,
          });
          setIsMatching(false);
        });
      }, CHAT_START_DELAY_MS);
    } catch (error) {
      statusTimers.forEach(clearTimeout);
      console.error('Direct chat matching error:', error);
      Alert.alert('오류', '상담을 연결하지 못했습니다.');
      setIsMatching(false);
    }
  }, [fetchExpertForCategory, isMatching, navigation]);

  const renderDraftMessage = ({ item }: { item: DirectDraftMessage }) => (
    <View style={styles.directDraftMessageContainer}>
      {item.role !== 'user' && item.expertName ? (
        <View style={styles.directDraftExpertInfo}>
          <Image
            source={item.expertName === SAHA_HELPER_NAME
              ? SAHA_HELPER_IMAGE
              : require('../../../../assets/people/hoosi_guy.jpg')}
            style={styles.directDraftExpertImage}
          />
          <Text style={styles.directDraftExpertName}>{item.expertName}</Text>
        </View>
      ) : null}
      <View style={[
        styles.directDraftBubble,
        item.role === 'user' ? styles.directDraftUserBubble : styles.directDraftExpertBubble
      ]}>
        <Text style={[
          styles.directDraftText,
          item.role === 'user' ? styles.directDraftUserText : styles.directDraftExpertText
        ]}>
          {item.text}
        </Text>
      </View>
      <Text style={[
        styles.timestampBase,
        item.role === 'user' ? styles.timestampUser : styles.timestampExpert
      ]}>
        {new Date(item.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );

  const headerContentHeight = Platform.OS === 'android' ? 46 : (IS_IPAD ? 54 : 44);
  const headerTopPadding = 0;
  const leftWidth = IS_IPAD ? 80 : 60;
  const rightWidth = IS_IPAD ? 200 : 150;

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: headerTopPadding, minHeight: headerTopPadding + headerContentHeight }]}>
        <View style={[styles.leftHeader, { width: leftWidth }]}>
          <TouchableOpacity style={styles.headerIconButton} onPress={handleNewChat}>
            <Icon name="create-outline" size={IS_IPAD ? 28 : 19} color="#000000" />
          </TouchableOpacity>
        </View>
        <View pointerEvents="none" style={[styles.headerTitleContainer, { top: headerTopPadding, height: headerContentHeight }]}>
          <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">대화</Text>
        </View>
        <View style={[styles.rightHeader, { width: rightWidth }]}>
          <View style={styles.rightHeaderTop}>
            <View style={styles.balanceContainer}>
              <Image
                source={require('../../../../assets/money/saha_money.png')}
                style={styles.balanceIcon}
                resizeMode="contain"
              />
              <Text style={styles.balanceText}>{currentBalance.toLocaleString()}</Text>
            </View>
            <TouchableOpacity style={[styles.headerIconButton, styles.headerMenuButton]} onPress={openSidebar}>
              <Icon name="menu" size={IS_IPAD ? 30 : 22} color="#000000" />
            </TouchableOpacity>
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
        enabled={Platform.OS === 'ios'}
      >
        {activeChat ? (
          <DirectInlineActiveChat
            key={activeChat.roomId}
            navigation={navigation}
            activeChat={activeChat}
            draftMessages={draftMessages}
            isKeyboardVisible={isKeyboardVisible}
            keyboardHeight={keyboardHeight}
            onBalanceInfoChange={handleBalanceInfoChange}
          />
        ) : (
          <>
          <View style={styles.directEntryMessageArea}>
            {draftMessages.length === 0 ? (
            <View style={styles.directEntryEmpty}>
              <Text style={styles.directEntryTitle}>고민을 들려주세요</Text>
              <Text style={styles.directEntrySubtitle}>어울리는 도사님이 흐름을 짚어드릴게요.</Text>
            </View>
          ) : (
            <FlatList
              data={draftMessages}
              renderItem={renderDraftMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.directDraftList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          )}
          </View>
          <View
            style={[
              styles.inputContainer,
              styles.inputContainerCompact,
              Platform.OS === 'android' && isKeyboardVisible
                ? { marginBottom: Math.max(0, keyboardHeight + (IS_IPAD ? 18 : 14)) }
                : undefined,
            ]}
          >
            <MessageInput
              isAiResponding={isMatching}
              onSendMessage={handleFirstMessage}
            />
          </View>
          </>
        )}
      </KeyboardAvoidingView>

      <Modal
        visible={isSidebarVisible}
        transparent
        animationType="none"
        onRequestClose={closeSidebar}
      >
        <View style={styles.sidebarModal}>
          <Animated.View style={[styles.sidebarBackdrop, { opacity: backdropOpacity }]}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={closeSidebar}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.sidebarShell,
              { transform: [{ translateX: sidebarTranslateX }] },
            ]}
          >
          <SafeAreaView style={styles.sidebar}>
            <View style={styles.sidebarHandle} />
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarTitle}>대화</Text>
              <TouchableOpacity style={styles.sidebarCloseButton} onPress={closeSidebar}>
                <Icon name="close" size={IS_IPAD ? 28 : 22} color="#222222" />
              </TouchableOpacity>
            </View>
            {isSidebarLoading ? (
              <View style={styles.sidebarLoading}>
                <Text style={styles.sidebarLoadingText}>대화 목록을 불러오는 중</Text>
              </View>
            ) : (
              <FlatList
                data={sidebarChats}
                keyExtractor={(item) => item.id}
                contentContainerStyle={sidebarChats.length === 0 ? styles.sidebarEmptyList : styles.sidebarList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.sidebarEmpty}>
                    <Text style={styles.sidebarEmptyTitle}>아직 대화가 없습니다</Text>
                    <Text style={styles.sidebarEmptyText}>첫 질문을 남기고 상담을 시작해보세요.</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.sidebarChatItem}
                    onPress={() => handleSelectChat(item.id, item.expert)}
                  >
                    <Image source={item.profileImage} style={styles.sidebarProfileImage} />
                    <View style={styles.sidebarChatInfo}>
                      <View style={styles.sidebarChatTop}>
                        <Text style={styles.sidebarChatName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.sidebarChatTime}>{item.timestamp}</Text>
                      </View>
                      <Text style={styles.sidebarChatCategory} numberOfLines={1}>
                        {getExpertCategoryLabel(item.expert.category)}
                      </Text>
                      <Text style={styles.sidebarLastMessage} numberOfLines={1}>
                        {removeBoldMarkup(item.lastMessage)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </SafeAreaView>
          </Animated.View>
        </View>
      </Modal>
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
    flexShrink: 0,
    paddingBottom: IS_IPAD ? 14 : 10,
    paddingHorizontal: IS_IPAD ? 20 : 12,
    backgroundColor: 'white',
    position: 'relative',
    zIndex: 10,
  },
  leftHeader: {
    width: IS_IPAD ? 80 : 60,
    alignItems: 'flex-start',
    zIndex: 2,
  },
  headerIconButton: {
    padding: IS_IPAD ? 12 : 8,
  },
  headerMenuButton: {
    paddingRight: IS_IPAD ? 2 : 0,
    marginRight: IS_IPAD ? -2 : -4,
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
  rightHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
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
    fontSize: IS_IPAD ? 15 : 11,
    color: '#666',
    marginTop: IS_IPAD ? 1 : -1,
  },
  keyboardAvoidingView: {
    flex: 1,
    minHeight: 0,
  },
  inputContainer: {
    backgroundColor: 'white',
    ...(Platform.OS === 'android' && { paddingBottom: 15 }),
  },
  inputContainerCompact: {
    ...(Platform.OS === 'android' && { paddingBottom: IS_IPAD ? 6 : 4 }),
  },
  directEntryMessageArea: {
    flex: 1,
    minHeight: 0,
  },
  directEntryEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: IS_IPAD ? 56 : 30,
    paddingBottom: IS_IPAD ? 120 : 86,
  },
  directEntryTitle: {
    fontSize: IS_IPAD ? 30 : 23,
    fontWeight: '800',
    color: '#222222',
    marginBottom: IS_IPAD ? 12 : 8,
  },
  directEntrySubtitle: {
    fontSize: IS_IPAD ? 17 : 13,
    lineHeight: IS_IPAD ? 25 : 20,
    color: '#7A746D',
    textAlign: 'center',
  },
  directDraftList: {
    paddingTop: IS_IPAD ? 24 : 18,
    paddingBottom: IS_IPAD ? 16 : 12,
  },
  directDraftMessageContainer: {
    marginTop: IS_IPAD ? 14 : 10,
    marginBottom: IS_IPAD ? 8 : 5,
    paddingHorizontal: IS_IPAD ? 20 : 12,
  },
  directDraftExpertInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: IS_IPAD ? 12 : 8,
  },
  directDraftExpertImage: {
    width: IS_IPAD ? 36 : 25,
    height: IS_IPAD ? 36 : 25,
    borderRadius: IS_IPAD ? 18 : 16,
    marginRight: IS_IPAD ? 10 : 6,
  },
  directDraftExpertName: {
    fontSize: IS_IPAD ? 18 : 14,
    fontWeight: '600',
    color: '#333',
  },
  directDraftBubble: {
    maxWidth: IS_IPAD ? '75%' : '80%',
    borderRadius: IS_IPAD ? 22 : 18,
    paddingHorizontal: IS_IPAD ? 20 : 16,
    paddingVertical: IS_IPAD ? 16 : 12,
  },
  directDraftUserBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primaryColor,
    borderBottomRightRadius: 4,
  },
  directDraftExpertBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    borderBottomLeftRadius: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: Platform.OS === 'android' ? 1 : 0.3,
  },
  directDraftText: {
    fontSize: IS_IPAD ? 18 : 14,
    lineHeight: IS_IPAD ? 26 : 19,
  },
  directDraftUserText: {
    color: 'white',
  },
  directDraftExpertText: {
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
  sidebarModal: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  sidebarBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.24)',
  },
  sidebarShell: {
    width: SIDEBAR_WIDTH,
  },
  sidebar: {
    flex: 1,
    width: SIDEBAR_WIDTH,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: IS_IPAD ? 28 : 22,
    borderBottomLeftRadius: IS_IPAD ? 28 : 22,
    shadowColor: '#000000',
    shadowOffset: { width: -6, height: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 14,
    overflow: 'hidden',
  },
  sidebarHandle: {
    width: IS_IPAD ? 36 : 28,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DED7D0',
    alignSelf: 'center',
    marginTop: IS_IPAD ? 12 : 10,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: IS_IPAD ? 24 : 18,
    paddingTop: IS_IPAD ? 18 : 14,
    paddingBottom: IS_IPAD ? 18 : 14,
  },
  sidebarTitle: {
    fontSize: IS_IPAD ? 28 : 22,
    fontWeight: '800',
    color: '#252525',
  },
  sidebarCloseButton: {
    padding: IS_IPAD ? 8 : 6,
  },
  sidebarList: {
    paddingVertical: IS_IPAD ? 12 : 8,
  },
  sidebarEmptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  sidebarChatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: IS_IPAD ? 22 : 16,
    paddingVertical: IS_IPAD ? 16 : 13,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },
  sidebarChatItemActive: {
    backgroundColor: '#FFF8F2',
    borderLeftColor: Colors.primaryColor,
  },
  sidebarProfileImage: {
    width: IS_IPAD ? 58 : 46,
    height: IS_IPAD ? 58 : 46,
    borderRadius: IS_IPAD ? 29 : 23,
    marginRight: IS_IPAD ? 16 : 12,
  },
  sidebarChatInfo: {
    flex: 1,
    minWidth: 0,
  },
  sidebarChatTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  sidebarChatName: {
    flex: 1,
    fontSize: IS_IPAD ? 19 : 15,
    fontWeight: '700',
    color: '#252525',
    marginRight: 10,
  },
  sidebarChatTime: {
    fontSize: IS_IPAD ? 14 : 11,
    color: '#9A928B',
  },
  sidebarChatCategory: {
    fontSize: IS_IPAD ? 15 : 12,
    fontWeight: '700',
    color: Colors.primaryColor,
    marginBottom: 3,
  },
  sidebarLastMessage: {
    fontSize: IS_IPAD ? 16 : 13,
    color: '#6E6963',
  },
  sidebarLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sidebarLoadingText: {
    fontSize: IS_IPAD ? 18 : 14,
    color: '#6E6963',
    fontWeight: '600',
  },
  sidebarEmpty: {
    alignItems: 'center',
    paddingHorizontal: IS_IPAD ? 36 : 24,
  },
  sidebarEmptyTitle: {
    fontSize: IS_IPAD ? 22 : 17,
    fontWeight: '800',
    color: '#252525',
    marginBottom: 8,
  },
  sidebarEmptyText: {
    fontSize: IS_IPAD ? 17 : 13,
    color: '#7A746D',
    textAlign: 'center',
    lineHeight: IS_IPAD ? 25 : 20,
  },
});

export default ChatRoomScreen;
