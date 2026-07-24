/**
 * ChatRoomScreen - 채팅방 메인 화면
 * 채팅방의 전체 레이아웃과 컴포넌트들을 조합하여 구성
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  StatusBar,
  Keyboard,
  BackHandler,
  PanResponder,
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
import { isIPad } from '../../../utils/platform';
import { createChatRoomWithExpert, endChatRoom } from '../../../utils/chat/chatUtils';
import { markChatListNeedsRefresh } from '../../../utils/chat/chatListCache';
import { ChatMessage } from '../../../types/chat';
import { supabase } from '../../../utils/database/supabaseClient';
import { Expert, getExpertCategoryLabel } from '../../../types/expert';
import { removeBoldMarkup } from '../../../utils/text/removeBoldMarkup';
import { ChatRouteCategory, routeChatCategory } from '../../../utils/chat/routeChatCategory';
import { classifyInfoIntent } from '../../../utils/chat/classifyInfoIntent';
import { fetchUserBalance } from '../../../utils/payments/balance';
import { checkFreeMessageAvailable } from '../../../utils/payments/freeMessage';
import { getCurrentUserSafely } from '../../../utils/user/authUtils';
import { getPartnerById, getPartnerList } from '../../../utils/partner/partnerDatabase';
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
  title: string;
  lastMessage: string;
  timestamp: string;
  expert: Expert;
  sortTime?: string | null;
}

interface ActiveDirectChat {
  roomId: string;
  expert: Expert;
  initialMessage?: string;
  partnerData?: any;
}

type FortuneEntryCategory = 'traditional_saju' | 'today_fortune' | 'newyear_fortune';

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
const FORTUNE_ENTRY_CATEGORIES: FortuneEntryCategory[] = ['traditional_saju', 'today_fortune', 'newyear_fortune'];

const ASSIGNMENT_DESCRIPTIONS: Record<ChatRouteCategory, string> = {
  comprehensive: '인생의 큰 흐름과 지금의 선택을 함께 짚어드릴게요.',
  love: '마음의 거리와 관계의 흐름을 섬세하게 살펴드릴게요.',
  career: '일과 진로의 흐름을 차분히 짚어드릴게요.',
};
const SAHA_HELPER_NAME = '사바 도우미';
const SAHA_HELPER_IMAGE = require('../../../../assets/logo/logo_icon.png');
const INFO_CAPTURE_THANKS_MESSAGE = '입력 감사합니다. 정보를 반영해 이어서 살펴볼게요.';
const INFO_CLASSIFYING_MESSAGE = '상담 흐름을 살펴보고 있어요';
const INFO_CLASSIFYING_MIN_MS = 1500;
const INFO_CAPTURE_ANALYSIS_MESSAGE = '상대방 사주를 정리하고 있어요.\n두 분의 궁합 흐름을 맞춰보고 있으니 잠시만 기다려주세요.';
const INFO_CAPTURE_ANALYSIS_MIN_MS = 3000;
const PARTNER_CONNECTED_MESSAGE = (name?: string) => (
  `좋아요. ${name || '상대방'}님의 정보를 참고해서 이어서 봐드릴게요.`
);

const isFortuneEntryCategory = (value: unknown): value is FortuneEntryCategory => (
  typeof value === 'string' && FORTUNE_ENTRY_CATEGORIES.includes(value as FortuneEntryCategory)
);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const trimSidebarTitle = (value: string, maxLength = 28): string => {
  const normalized = removeBoldMarkup(value)
    .replace(/\s+/g, ' ')
    .replace(/^(사용자|AI|도사|상담사)\s*[:：]\s*/i, '')
    .trim();
  if (!normalized) return '';
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength).trim()}...` : normalized;
};

const getSidebarSummaryTitle = (summary?: string | null): string => {
  if (!summary) return '';
  const lines = removeBoldMarkup(summary)
    .split('\n')
    .map((line) => line
      .replace(/^[-•\s]*/, '')
      .replace(/^(현재 고민|결정 목표|이어갈 포인트|주요 인물\/관계|감정 상태|이전 조언|반복 금지|요약)\s*[:：]\s*/, '')
      .trim())
    .filter((line) => line && line !== '없음');

  return trimSidebarTitle(lines[0] || '');
};

const fetchSidebarChatItems = async (userId: string): Promise<SidebarChatItem[]> => {
  const { data: rooms, error: roomError } = await supabase
    .from('chat_rooms')
    .select(`
      id,
      expert_id,
      chat_context,
      partner_saju_id,
      conversation_summary,
      last_message,
      last_message_at,
      created_at,
      messages:chat_messages(message, created_at)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .order('created_at', { foreignTable: 'chat_messages', ascending: false })
    .limit(1, { foreignTable: 'chat_messages' });

  if (roomError) throw roomError;
  const roomList = rooms || [];
  if (roomList.length === 0) return [];

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

  const partnerIds = Array.from(new Set(
    roomList
      .filter((room: any) => room.chat_context === 'love_compatibility' && room.partner_saju_id)
      .map((room: any) => room.partner_saju_id)
  ));
  const partnerNameMap: Record<string, string> = {};
  if (partnerIds.length > 0) {
    const { data: partners } = await supabase
      .from('partner_saju')
      .select('id, partner_name')
      .in('id', partnerIds);
    (partners || []).forEach((partner: any) => {
      partnerNameMap[partner.id] = partner.partner_name;
    });
  }

  const items: SidebarChatItem[] = roomList
    .map((room: any) => {
      const itemExpert = expertMap[room.expert_id];
      if (!itemExpert) return null;

      const fallbackMsg = Array.isArray(room.messages) && room.messages.length > 0 ? room.messages[0]?.message ?? '' : '';
      const fallbackTs = Array.isArray(room.messages) && room.messages.length > 0 ? room.messages[0]?.created_at ?? null : null;
      const tsIso: string | null = room.last_message_at || fallbackTs || room.created_at || null;
      const tsStr = tsIso ? new Date(tsIso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '';
      const lastMessage = room.last_message || fallbackMsg || '아직 대화가 없습니다';
      const partnerName = room.partner_saju_id ? partnerNameMap[room.partner_saju_id] : undefined;
      const title = partnerName
        ? `${partnerName}와 궁합`
        : getSidebarSummaryTitle(room.conversation_summary) || trimSidebarTitle(lastMessage) || `${itemExpert.name} 상담`;

      return {
        id: room.id,
        name: itemExpert.name,
        title,
        lastMessage,
        timestamp: tsStr,
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

  return items;
};

const deleteChatRoomFully = async (chatRoomId: string): Promise<void> => {
  const { error: messageError } = await supabase
    .from('chat_messages')
    .delete()
    .eq('chat_room_id', chatRoomId);
  if (messageError) throw messageError;

  const { error: roomError } = await supabase
    .from('chat_rooms')
    .delete()
    .eq('id', chatRoomId);
  if (roomError) throw roomError;

  markChatListNeedsRefresh();
};

interface SidebarChatRowProps {
  item: SidebarChatItem;
  active?: boolean;
  onPress: () => void;
  onDelete: () => void;
}

const SidebarChatRow: React.FC<SidebarChatRowProps> = ({ item, active = false, onPress, onDelete }) => {
  return (
    <View style={[styles.sidebarChatItem, active ? styles.sidebarChatItemActive : undefined]}>
      <TouchableOpacity
        style={styles.sidebarChatPressArea}
        activeOpacity={0.76}
        onPress={onPress}
      >
        <View style={styles.sidebarChatInfo}>
          <View style={styles.sidebarChatTop}>
            <Text style={styles.sidebarChatName} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.sidebarChatTime}>{item.timestamp}</Text>
          </View>
          <Text style={styles.sidebarLastMessage} numberOfLines={1}>
            {removeBoldMarkup(item.lastMessage)}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.sidebarMoreButton}
        activeOpacity={0.72}
        onPress={onDelete}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Icon name="ellipsis-horizontal" size={IS_IPAD ? 24 : 20} color="#777777" />
      </TouchableOpacity>
    </View>
  );
};

const buildAssignmentMessage = (expert: Expert, category: ChatRouteCategory) => {
  const categoryLabel = getExpertCategoryLabel(expert.category);
  return `${expert.name}님이 상담을 도와주실 거예요.\n${categoryLabel}의 눈으로 먼저 읽어보고, 대화가 깊어지면 다른 고민도 자연스럽게 이어서 봐드릴게요.\n${ASSIGNMENT_DESCRIPTIONS[category]}`;
};

type InfoCaptureIntent = 'birth_info' | 'partner_info';
type InfoCaptureDecision =
  | { mode: 'none' }
  | { mode: 'direct'; intent: InfoCaptureIntent }
  | { mode: 'classify'; hints: InfoCaptureHints };

interface InfoCaptureHints {
  hasPartnerSignal: boolean;
  hasCompatibilitySignal: boolean;
  hasBirthEvidence: boolean;
  hasGanjiInfo: boolean;
}

const getInfoCaptureDecision = (text: string): InfoCaptureDecision => {
  const normalized = text.replace(/\s+/g, '').toLowerCase();
  const hasPartnerSignal = /(우리|상대|남친|여친|남자친구|여자친구|애인|남편|아내|배우자|썸|그사람|걔|오빠|좋아하는사람|헤어진사람|헤어진인연|연애상대|재회|고백|읽씹|연락두절|연락운|연락|헤어져|헤어저|헤어지|사귄|유부남|다시인연)/.test(normalized);
  const birthDatePattern = '(?:\\d{2,4}년[\\s\\S]{0,30}\\d{1,2}월[\\s\\S]{0,15}\\d{1,2}일|\\d{1,2}월\\s*\\d{1,2}일)';
  const partnerSubjectPattern = '(?:상대|남친|여친|남자친구|여자친구|애인|남편|아내|배우자|썸|그\\s*사람|오빠|좋아하는\\s*사람|헤어진\\s*사람|헤어진\\s*인연|어머니|엄마|아버지|아빠|딸|아들|아이|자식|아기|친구|전남친|전여친|전남자친구|전여자친구|전애인)';
  const hasPartnerSubjectSignal =
    new RegExp(`${partnerSubjectPattern}\\s*(은|는|이|가|도|의|인데|입니다|이고)?`).test(text);
  const hasOtherPersonSubjectSignal =
    hasPartnerSubjectSignal;
  const hasPartnerBirthEvidence =
    new RegExp(`${partnerSubjectPattern}[\\s\\S]{0,60}${birthDatePattern}`).test(text) ||
    new RegExp(`${birthDatePattern}[\\s\\S]{0,40}${partnerSubjectPattern}`).test(text);
  const hasSelfBirthEvidence =
    new RegExp(`(?:저는|나는|제가|내가|제)[\\s\\S]{0,60}${birthDatePattern}`).test(text) ||
    new RegExp(`${birthDatePattern}[\\s\\S]{0,30}(?:출생|생입니다|생이에요|태어났)`).test(text);
  const hasExplicitCompatibilitySignal = /(궁합|속궁합|관계궁합|연애궁합)/.test(normalized);
  const hasSoftCompatibilitySignal = /(잘맞|잘맞아)/.test(normalized);
  const hasBirthContext = /(출생|태어났|태어난|생년월일|생일|양력|음력|윤달|몇년생|몇 년생)/.test(text);
  const hasYear = /\d{2,4}년/.test(text);
  const hasMonthDay = /\d{1,2}월\s*\d{1,2}일/.test(text);
  const hasBirthTime = /(오전|오후|새벽|밤|저녁|아침)\s*\d{1,2}시|\d{1,2}시\s*\d{1,2}분/.test(text);
  const hasGanjiInfo =
    /(일주|월주|년주|시주|일간|천간|지지|사주정보)/.test(text) ||
    /(갑|을|병|정|무|기|경|신|임|계)(자|축|인|묘|진|사|오|미|신|유|술|해)(년|월|일|시|일주|시주|월주|년주)/.test(text);
  const hasDateWithTime = hasYear && hasMonthDay && hasBirthTime;
  const hasBirthEvidence = (hasBirthContext && (hasYear || hasMonthDay || hasBirthTime)) || hasDateWithTime;
  const hasCompatibilitySignal = hasExplicitCompatibilitySignal || hasSoftCompatibilitySignal;

  if (hasSelfBirthEvidence && hasPartnerBirthEvidence) {
    return {
      mode: 'classify',
      hints: {
        hasPartnerSignal,
        hasCompatibilitySignal,
        hasBirthEvidence,
        hasGanjiInfo,
      },
    };
  }

  if (hasSelfBirthEvidence) {
    return { mode: 'direct', intent: 'birth_info' };
  }

  if (hasPartnerBirthEvidence) {
    return { mode: 'direct', intent: 'partner_info' };
  }

  if (!hasOtherPersonSubjectSignal && hasBirthEvidence) {
    return { mode: 'direct', intent: 'birth_info' };
  }

  const maybeInfoCandidate =
    hasBirthContext ||
    hasGanjiInfo ||
    hasPartnerSignal ||
    hasCompatibilitySignal;

  if (!maybeInfoCandidate) {
    return { mode: 'none' };
  }

  return {
    mode: 'classify',
    hints: {
      hasPartnerSignal,
      hasCompatibilitySignal,
      hasBirthEvidence,
      hasGanjiInfo,
    },
  };
};

const resolveInfoCaptureIntent = async (
  text: string,
  decision: InfoCaptureDecision = getInfoCaptureDecision(text)
): Promise<InfoCaptureIntent | null> => {
  if (decision.mode === 'none') {
    return null;
  }
  if (decision.mode === 'direct') {
    return decision.intent;
  }

  const result = await classifyInfoIntent(text);
  if (result.source !== 'llm' || result.confidence < 0.72) {
    return null;
  }

  if (result.intent === 'self_birth_info') {
    return decision.hints.hasBirthEvidence || decision.hints.hasGanjiInfo ? 'birth_info' : null;
  }
  if (result.intent === 'partner_birth_info') {
    const hasPartnerInfoEvidence = decision.hints.hasPartnerSignal && (
      decision.hints.hasBirthEvidence || decision.hints.hasGanjiInfo
    );
    return hasPartnerInfoEvidence ? 'partner_info' : null;
  }
  if (result.intent === 'partner_selection_needed') {
    return decision.hints.hasPartnerSignal || decision.hints.hasCompatibilitySignal ? 'partner_info' : null;
  }

  return null;
};

const createInfoCaptureUserMessage = (
  roomId: string,
  text: string,
  now: number,
  userDraftId: string
): ChatMessage => ({
  id: userDraftId,
  chat_room_id: roomId,
  sender_type: 'user',
  message: text.trim(),
  created_at: new Date(now).toISOString(),
});

const createInfoCaptureHelperMessage = (
  roomId: string,
  text: string,
  kind: 'birth_info' | 'partner_info',
  expert: Expert,
  partners: PartnerSaju[] = [],
  now: number = Date.now(),
  helperDraftId: string = `info_capture_helper_${now}`,
  userDraftId?: string
): ChatMessage => {
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

  return {
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
  };
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

  return [
    createInfoCaptureUserMessage(roomId, text, now, userDraftId),
    createInfoCaptureHelperMessage(roomId, text, kind, expert, partners, now, helperDraftId, userDraftId),
  ];
};

const streamUiMessageText = async (
  setUiMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  messageId: string,
  fullText: string,
  minDurationMs: number = INFO_CLASSIFYING_MIN_MS
) => {
  const startedAt = Date.now();
  const stepMs = Math.max(35, Math.floor(minDurationMs / Math.max(fullText.length, 1)));

  for (let index = 1; index <= fullText.length; index += 1) {
    setUiMessages((prev) =>
      prev.map((message) =>
        message.id === messageId
          ? { ...message, message: fullText.slice(0, index) }
          : message
      )
    );
    await sleep(stepMs);
  }

  const elapsedMs = Date.now() - startedAt;
  if (elapsedMs < minDurationMs) {
    await sleep(minDurationMs - elapsedMs);
  }
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

const hydrateRoomPartnerData = async (roomId: string): Promise<any | null> => {
  try {
    const { data: room, error: roomError } = await supabase
      .from('chat_rooms')
      .select('partner_saju_id')
      .eq('id', roomId)
      .maybeSingle();

    if (roomError || !room?.partner_saju_id) {
      return null;
    }

    const partner = await getPartnerById(room.partner_saju_id);
    return partner ? buildChatPartnerData(partner as PartnerSaju) : null;
  } catch (error) {
    console.error('hydrateRoomPartnerData failed:', error);
    return null;
  }
};

const ChatRoomScreen: React.FC<ChatRoomScreenProps> = ({ navigation, route }) => {
  if (route.params?.directEntry === true) {
    return <DirectEntryChatRoomScreen navigation={navigation} route={route} />;
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
  const { roomId, expert, partnerData, initialMessage, infoCaptureMessage, pendingInfoCaptureText } = route.params;
  const routeDirectMode: boolean = route.params?.directMode === true;
  const onDirectNewChat: (() => void) | undefined = route.params?.onDirectNewChat;
  const onDirectSelectChat: ((roomId: string, expert: Expert) => void) | undefined = route.params?.onDirectSelectChat;
  const isEmbeddedDirectMode = routeDirectMode && Boolean(onDirectNewChat && onDirectSelectChat);
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
  const isEndingRef = useRef<boolean>(false);
  const hasEndedRef = useRef<boolean>(false);
  const initialMessageSentRef = useRef<boolean>(false);
  const pendingInfoCaptureSentRef = useRef<boolean>(false);
  const handledInfoActionIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const ensureActivePartnerData = useCallback(async () => {
    if (activePartnerData) return activePartnerData;

    const hydratedPartnerData = await hydrateRoomPartnerData(roomId);
    if (hydratedPartnerData) {
      setActivePartnerData(hydratedPartnerData);
    }
    return hydratedPartnerData;
  }, [activePartnerData, roomId]);

  useEffect(() => {
    if (partnerData) {
      setActivePartnerData(partnerData);
    }
  }, [partnerData]);

  useEffect(() => {
    let mounted = true;
    if (partnerData || activePartnerData) return undefined;

    hydrateRoomPartnerData(roomId).then((hydratedPartnerData) => {
      if (mounted && hydratedPartnerData) {
        setActivePartnerData(hydratedPartnerData);
      }
    });

    return () => {
      mounted = false;
    };
  }, [activePartnerData, partnerData, roomId]);

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

  useEffect(() => {
    if (
      !pendingInfoCaptureText ||
      pendingInfoCaptureSentRef.current ||
      loading ||
      isAiResponding
    ) {
      return undefined;
    }

    const partnerForReply = partnerData || activePartnerData;
    if (!partnerForReply) return undefined;

    let mounted = true;
    pendingInfoCaptureSentRef.current = true;
    const analysisMessageId = `info_capture_analysis_${roomId}_${Date.now()}`;

    setUiMessages((prev) => [
      ...prev,
      {
        id: analysisMessageId,
        chat_room_id: roomId,
        sender_type: 'expert',
        message: '',
        created_at: new Date().toISOString(),
        display_name: SAHA_HELPER_NAME,
        display_image: SAHA_HELPER_IMAGE,
      },
    ]);

    const runPendingReply = async () => {
      await streamUiMessageText(
        setUiMessages,
        analysisMessageId,
        INFO_CAPTURE_ANALYSIS_MESSAGE,
        INFO_CAPTURE_ANALYSIS_MIN_MS
      );
      if (!mounted) return;
      sendMessageWithText(pendingInfoCaptureText, {
        partnerDataOverride: partnerForReply,
      });
    };

    runPendingReply();

    return () => {
      mounted = false;
    };
  }, [
    activePartnerData,
    isAiResponding,
    loading,
    partnerData,
    pendingInfoCaptureText,
    sendMessageWithText,
  ]);

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
      directMode: isEmbeddedDirectMode,
      infoCaptureMessage: INFO_CAPTURE_THANKS_MESSAGE,
      pendingInfoCaptureText: actionPayload?.originalText,
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
  }, [activePartnerData, expert, isEmbeddedDirectMode, navigation, roomId, sendMessageWithText]);

  const handleChatSendMessage = useCallback(async (text: string) => {
    const decision = getInfoCaptureDecision(text);

    if (decision.mode === 'classify') {
      const now = Date.now();
      const userDraftId = `info_capture_user_${now}`;
      const helperDraftId = `info_capture_checking_${now}`;
      setUiMessages((prev) => [
        ...prev,
        createInfoCaptureUserMessage(roomId, text, now, userDraftId),
        {
          id: helperDraftId,
          chat_room_id: roomId,
          sender_type: 'expert',
          message: '',
          created_at: new Date(now + 1).toISOString(),
          display_name: SAHA_HELPER_NAME,
          display_image: SAHA_HELPER_IMAGE,
        },
      ]);

      const [intent] = await Promise.all([
        resolveInfoCaptureIntent(text, decision),
        streamUiMessageText(setUiMessages, helperDraftId, INFO_CLASSIFYING_MESSAGE),
      ]);

      if (intent === 'partner_info') {
        const existingPartnerData = await ensureActivePartnerData();
        if (existingPartnerData) {
          setUiMessages((prev) =>
            prev.filter((message) => message.id !== userDraftId && message.id !== helperDraftId)
          );
          sendMessage(text, { partnerDataOverride: existingPartnerData });
          return;
        }
      }

      if (intent) {
        const partners = intent === 'partner_info' ? await loadPartnerOptions() : [];
        setUiMessages((prev) =>
          prev.map((message) =>
            message.id === helperDraftId
              ? createInfoCaptureHelperMessage(
                  roomId,
                  text,
                  intent,
                  expert,
                  partners,
                  now,
                  helperDraftId,
                  userDraftId
                )
              : message
          )
        );
        return;
      }

      setUiMessages((prev) =>
        prev.filter((message) => message.id !== userDraftId && message.id !== helperDraftId)
      );
      sendMessage(text);
      return;
    }

    const intent = await resolveInfoCaptureIntent(text, decision);
    if (intent === 'partner_info') {
      const existingPartnerData = await ensureActivePartnerData();
      if (existingPartnerData) {
        sendMessage(text, { partnerDataOverride: existingPartnerData });
        return;
      }
    }

    if (intent) {
      const partners = intent === 'partner_info' ? await loadPartnerOptions() : [];
      setUiMessages((prev) => [
        ...prev,
        ...createInfoCaptureMessages(roomId, text, intent, expert, partners),
      ]);
      return;
    }

    sendMessage(text);
  }, [ensureActivePartnerData, expert, roomId, sendMessage]);

  const displayedMessages = sortMessagesByCreatedAt([...messages, ...uiMessages]);

  useEffect(() => {
    if (!initialMessage || initialMessageSentRef.current || loading || isAiResponding) return;
    initialMessageSentRef.current = true;
    const timer = setTimeout(() => {
      sendMessageWithText(initialMessage);
    }, 300);

    return () => clearTimeout(timer);
  }, [initialMessage, isAiResponding, loading, sendMessageWithText]);

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
  const headerContentHeight = isEmbeddedDirectMode
    ? (Platform.OS === 'android' ? 46 : (IS_IPAD ? 54 : 44))
    : (Platform.OS === 'android' ? 54 : (IS_IPAD ? 60 : 48));
  const headerTopPadding = isEmbeddedDirectMode
    ? 0
    : Platform.OS === 'android'
      ? Math.max(statusBarHeight + 14, 30)
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

      setSidebarChats(await fetchSidebarChatItems(user.id));
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

  const goHome = useCallback(() => {
    navigation.navigate('MainTabs', { screen: 'Home' });
  }, [navigation]);

  useEffect(() => {
    if (isEmbeddedDirectMode) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      goHome();
      return true;
    });
    return () => subscription.remove();
  }, [goHome, isEmbeddedDirectMode]);

  const chatScreenPanResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => (
        !isSidebarVisible &&
        gestureState.dx < -18 &&
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.35
      ),
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -64) {
          openSidebar();
        }
      },
    }),
    [isSidebarVisible, openSidebar]
  );

  const switchChatRoom = useCallback((item: SidebarChatItem) => {
    closeSidebar();
    if (item.id === roomId) return;
    if (isEmbeddedDirectMode && onDirectSelectChat) {
      onDirectSelectChat(item.id, item.expert);
      return;
    }
    navigation.replace('ChatRoom', {
      roomId: item.id,
      expert: item.expert,
    });
  }, [closeSidebar, isEmbeddedDirectMode, navigation, onDirectSelectChat, roomId]);

  const handleDeleteSidebarChat = useCallback((item: SidebarChatItem) => {
    Alert.alert(
      '대화 삭제',
      '이 대화를 삭제하시겠습니까?\n삭제하면 대화 내용도 함께 지워집니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteChatRoomFully(item.id);
              setSidebarChats((prev) => prev.filter((chat) => chat.id !== item.id));
              if (item.id === roomId) {
                hasEndedRef.current = true;
                closeSidebar();
                if (isEmbeddedDirectMode && onDirectNewChat) {
                  onDirectNewChat();
                  return;
                }
                goHome();
              }
            } catch (error) {
              console.error('delete sidebar chat error:', error);
              Alert.alert('오류', '대화 삭제에 실패했습니다. 잠시 후 다시 시도하세요.');
            }
          },
        },
      ]
    );
  }, [closeSidebar, goHome, isEmbeddedDirectMode, onDirectNewChat, roomId]);

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
    <SafeAreaView style={styles.container} {...chatScreenPanResponder.panHandlers}>
      <View style={[styles.header, { paddingTop: headerTopPadding, minHeight: headerTopPadding + headerContentHeight }]}>
        <View style={[styles.leftHeader, { width: leftWidth }]}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={isEmbeddedDirectMode && onDirectNewChat ? onDirectNewChat : goHome}
          >
            <Icon
              name={isEmbeddedDirectMode ? 'create-outline' : 'arrow-back'}
              size={IS_IPAD ? 28 : 19}
              color="#000000"
            />
          </TouchableOpacity>
        </View>
        <View pointerEvents="none" style={[styles.headerTitleContainer, { top: headerTopPadding, height: headerContentHeight }]}>
          <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
            {isEmbeddedDirectMode ? '대화' : expert.title}
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
              <View>
                <Text style={styles.sidebarTitle}>대화 기록</Text>
                <Text style={styles.sidebarSubtitle}>
                  {sidebarChats.length > 0 ? `${sidebarChats.length}개의 상담` : '상담 기록'}
                </Text>
              </View>
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
                  return (
                    <SidebarChatRow
                      item={item}
                      active={isActive}
                      onPress={() => switchChatRoom(item)}
                      onDelete={() => handleDeleteSidebarChat(item)}
                    />
                  );
                }}
              />
            )}
          </SafeAreaView>
          </Animated.View>
        </View>
      </Modal>
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

  const ensureActivePartnerData = useCallback(async () => {
    if (activePartnerData) return activePartnerData;

    const hydratedPartnerData = await hydrateRoomPartnerData(activeChat.roomId);
    if (hydratedPartnerData) {
      setActivePartnerData(hydratedPartnerData);
    }
    return hydratedPartnerData;
  }, [activeChat.roomId, activePartnerData]);

  useEffect(() => {
    setActivePartnerData(activeChat.partnerData);
  }, [activeChat.partnerData]);

  useEffect(() => {
    let mounted = true;
    if (activeChat.partnerData || activePartnerData) return undefined;

    hydrateRoomPartnerData(activeChat.roomId).then((hydratedPartnerData) => {
      if (mounted && hydratedPartnerData) {
        setActivePartnerData(hydratedPartnerData);
      }
    });

    return () => {
      mounted = false;
    };
  }, [activeChat.partnerData, activeChat.roomId, activePartnerData]);

  const handlePartnerSavedFromInput = useCallback((nextPartnerData: any, pendingText?: string) => {
    setActivePartnerData(nextPartnerData);
    const now = Date.now();
    const analysisMessageId = `info_capture_analysis_${activeChat.roomId}_${now}`;

    setUiMessages((prev) => [
      ...prev,
      {
        id: `info_capture_done_${activeChat.roomId}_${now}`,
        chat_room_id: activeChat.roomId,
        sender_type: 'expert',
        message: INFO_CAPTURE_THANKS_MESSAGE,
        created_at: new Date(now).toISOString(),
        display_name: SAHA_HELPER_NAME,
        display_image: SAHA_HELPER_IMAGE,
      },
      {
        id: analysisMessageId,
        chat_room_id: activeChat.roomId,
        sender_type: 'expert',
        message: '',
        created_at: new Date(now + 1).toISOString(),
        display_name: SAHA_HELPER_NAME,
        display_image: SAHA_HELPER_IMAGE,
      },
    ]);

    const runPendingReply = async () => {
      await streamUiMessageText(
        setUiMessages,
        analysisMessageId,
        INFO_CAPTURE_ANALYSIS_MESSAGE,
        INFO_CAPTURE_ANALYSIS_MIN_MS
      );
      if (!pendingText) return;
      sendMessageWithText(pendingText, {
        partnerDataOverride: nextPartnerData,
        suppressUserMessageUiAppend: true,
      });
    };

    runPendingReply();
  }, [activeChat.roomId, sendMessageWithText]);

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
      pendingInfoCaptureText: actionPayload?.originalText,
      onPartnerSaved: handlePartnerSavedFromInput,
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
  }, [activeChat.expert, activeChat.roomId, activePartnerData, handlePartnerSavedFromInput, navigation, sendMessageWithText]);

  const handleChatSendMessage = useCallback(async (
    text: string,
    options?: { includeUserMessage?: boolean }
  ) => {
    const decision = getInfoCaptureDecision(text);
    const includeUserMessage = options?.includeUserMessage !== false;

    if (decision.mode === 'classify') {
      const now = Date.now();
      const userDraftId = `info_capture_user_${now}`;
      const helperDraftId = `info_capture_checking_${now}`;
      setUiMessages((prev) => [
        ...prev,
        ...(includeUserMessage
          ? [createInfoCaptureUserMessage(activeChat.roomId, text, now, userDraftId)]
          : []),
        {
          id: helperDraftId,
          chat_room_id: activeChat.roomId,
          sender_type: 'expert',
          message: '',
          created_at: new Date(now + 1).toISOString(),
          display_name: SAHA_HELPER_NAME,
          display_image: SAHA_HELPER_IMAGE,
        },
      ]);

      const [intent] = await Promise.all([
        resolveInfoCaptureIntent(text, decision),
        streamUiMessageText(setUiMessages, helperDraftId, INFO_CLASSIFYING_MESSAGE),
      ]);

      if (intent === 'partner_info') {
        const existingPartnerData = await ensureActivePartnerData();
        if (existingPartnerData) {
          setUiMessages((prev) =>
            prev.filter((message) =>
              message.id !== helperDraftId && (!includeUserMessage || message.id !== userDraftId)
            )
          );
          sendMessage(text, {
            partnerDataOverride: existingPartnerData,
            suppressUserMessageUiAppend: !includeUserMessage,
          });
          return;
        }
      }

      if (intent) {
        const partners = intent === 'partner_info' ? await loadPartnerOptions() : [];
        setUiMessages((prev) =>
          prev.map((message) =>
            message.id === helperDraftId
              ? createInfoCaptureHelperMessage(
                  activeChat.roomId,
                  text,
                  intent,
                  activeChat.expert,
                  partners,
                  now,
                  helperDraftId,
                  includeUserMessage ? userDraftId : undefined
                )
              : message
          )
        );
        return;
      }

      setUiMessages((prev) =>
        prev.filter((message) =>
          message.id !== helperDraftId && (!includeUserMessage || message.id !== userDraftId)
        )
      );
      sendMessage(text);
      return;
    }

    const intent = await resolveInfoCaptureIntent(text, decision);
    if (intent === 'partner_info') {
      const existingPartnerData = await ensureActivePartnerData();
      if (existingPartnerData) {
        sendMessage(text, {
          partnerDataOverride: existingPartnerData,
          suppressUserMessageUiAppend: options?.includeUserMessage === false,
        });
        return;
      }
    }

    if (intent) {
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
  }, [activeChat.expert, activeChat.roomId, ensureActivePartnerData, sendMessage]);

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

const DirectEntryChatRoomScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route: tabRoute }) => {
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
  const handledEntryRequestRef = useRef<string | null>(null);

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

  const fetchExpertForCategory = useCallback(async (category: Expert['category']): Promise<Expert | null> => {
    const { data, error } = await supabase
      .from('experts')
      .select('*')
      .eq('category', category)
      .eq('is_online', true)
      .limit(1)
      .maybeSingle();

    if (data) return data as Expert;

    if (error) {
      console.error('Direct chat expert lookup error:', error, 'Category:', category);
      return null;
    }

    if (!isFortuneEntryCategory(category)) return null;

    const { data: fallbackData, error: fallbackError } = await supabase
      .from('experts')
      .select('*')
      .eq('category', category)
      .limit(1)
      .maybeSingle();

    if (fallbackError || !fallbackData) {
      console.error('Fortune entry expert lookup error:', fallbackError, 'Category:', category);
      return null;
    }

    return fallbackData as Expert;
  }, []);

  const fetchSidebarChats = useCallback(async () => {
    try {
      setIsSidebarLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        setSidebarChats([]);
        return;
      }

      setSidebarChats(await fetchSidebarChatItems(user.id));
    } catch (error) {
      console.error('fetchSidebarChats error:', error);
      Alert.alert('오류', '대화 목록을 불러오지 못했습니다.');
    } finally {
      setIsSidebarLoading(false);
    }
  }, []);

  useEffect(() => {
    const entryCategory = tabRoute.params?.entryCategory;
    if (!isFortuneEntryCategory(entryCategory)) return;

    const entryRequestId = tabRoute.params?.entryRequestId || entryCategory;
    if (handledEntryRequestRef.current === entryRequestId) return;
    handledEntryRequestRef.current = entryRequestId;

    let mounted = true;

    const openEntryChat = async () => {
      try {
        setIsMatching(true);
        setDraftMessages([]);

        const expert = await fetchExpertForCategory(entryCategory);
        if (!mounted) return;

        if (!expert) {
          Alert.alert('안내', '지금 연결 가능한 도사님을 찾지 못했습니다.');
          return;
        }

        const createdChat = await createChatRoomWithExpert(navigation, expert.id);
        if (!mounted || !createdChat) return;

        setActiveChat({
          roomId: createdChat.roomId,
          expert: createdChat.expert as Expert,
        });
      } catch (error) {
        console.error('Fortune entry chat open error:', error);
        Alert.alert('오류', '대화를 연결하지 못했습니다.');
      } finally {
        navigation.setParams?.({
          entryCategory: undefined,
          entryRequestId: undefined,
        });
        if (mounted) setIsMatching(false);
      }
    };

    openEntryChat();

    return () => {
      mounted = false;
    };
  }, [fetchExpertForCategory, navigation, tabRoute.params?.entryCategory, tabRoute.params?.entryRequestId]);

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

  const goHome = useCallback(() => {
    navigation.navigate('MainTabs', { screen: 'Home' });
  }, [navigation]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      goHome();
      return true;
    });
    return () => subscription.remove();
  }, [goHome]);

  const directSwipeResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => (
        !isSidebarVisible &&
        gestureState.dx < -18 &&
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.35
      ),
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -64) {
          openSidebar();
        }
      },
    }),
    [isSidebarVisible, openSidebar]
  );

  const handleNewChat = useCallback(() => {
    setActiveChat(null);
    setDraftMessages([]);
    setIsMatching(false);
  }, []);

  const handleSelectChat = useCallback((roomId: string, expert: Expert) => {
    closeSidebar();
    setActiveChat({ roomId, expert });
  }, [closeSidebar]);

  const handleDeleteSidebarChat = useCallback((item: SidebarChatItem) => {
    Alert.alert(
      '대화 삭제',
      '이 대화를 삭제하시겠습니까?\n삭제하면 대화 내용도 함께 지워집니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteChatRoomFully(item.id);
              setSidebarChats((prev) => prev.filter((chat) => chat.id !== item.id));
              if (activeChat?.roomId === item.id) {
                setActiveChat(null);
                setDraftMessages([]);
              }
            } catch (error) {
              console.error('delete sidebar chat error:', error);
              Alert.alert('오류', '대화 삭제에 실패했습니다. 잠시 후 다시 시도하세요.');
            }
          },
        },
      ]
    );
  }, [activeChat?.roomId]);

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
    <SafeAreaView style={styles.container} {...directSwipeResponder.panHandlers}>
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
              <View>
                <Text style={styles.sidebarTitle}>대화 기록</Text>
                <Text style={styles.sidebarSubtitle}>
                  {sidebarChats.length > 0 ? `${sidebarChats.length}개의 상담` : '상담 기록'}
                </Text>
              </View>
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
                  <SidebarChatRow
                    item={item}
                    active={activeChat?.roomId === item.id}
                    onPress={() => handleSelectChat(item.id, item.expert)}
                    onDelete={() => handleDeleteSidebarChat(item)}
                  />
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
    backgroundColor: 'rgba(0, 0, 0, 0.20)',
  },
  sidebarShell: {
    width: SIDEBAR_WIDTH,
  },
  sidebar: {
    flex: 1,
    width: SIDEBAR_WIDTH,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: IS_IPAD ? 26 : 20,
    borderBottomLeftRadius: IS_IPAD ? 26 : 20,
    shadowColor: '#000000',
    shadowOffset: { width: -6, height: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 14,
    overflow: 'hidden',
  },
  sidebarHandle: {
    width: IS_IPAD ? 40 : 30,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D7D7D7',
    alignSelf: 'center',
    marginTop: IS_IPAD ? 12 : 10,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: IS_IPAD ? 24 : 18,
    paddingTop: IS_IPAD ? 20 : 16,
    paddingBottom: IS_IPAD ? 16 : 12,
    backgroundColor: '#FFFFFF',
  },
  sidebarTitle: {
    fontSize: IS_IPAD ? 27 : 21,
    fontWeight: '800',
    color: '#222222',
  },
  sidebarSubtitle: {
    marginTop: IS_IPAD ? 4 : 2,
    fontSize: IS_IPAD ? 15 : 12,
    fontWeight: '600',
    color: '#8A8A8A',
  },
  sidebarCloseButton: {
    width: IS_IPAD ? 42 : 34,
    height: IS_IPAD ? 42 : 34,
    borderRadius: IS_IPAD ? 21 : 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F6F6',
  },
  sidebarList: {
    paddingHorizontal: IS_IPAD ? 14 : 10,
    paddingTop: IS_IPAD ? 10 : 8,
    paddingBottom: IS_IPAD ? 28 : 22,
  },
  sidebarEmptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  sidebarChatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: IS_IPAD ? 76 : 60,
    backgroundColor: '#FFFFFF',
    borderRadius: IS_IPAD ? 16 : 12,
    marginBottom: IS_IPAD ? 8 : 6,
  },
  sidebarChatItemActive: {
    backgroundColor: '#FFFFFF',
  },
  sidebarChatPressArea: {
    flex: 1,
    minHeight: IS_IPAD ? 76 : 60,
    justifyContent: 'center',
    paddingLeft: IS_IPAD ? 18 : 14,
    paddingVertical: IS_IPAD ? 8 : 6,
  },
  sidebarMoreButton: {
    width: IS_IPAD ? 50 : 42,
    minHeight: IS_IPAD ? 76 : 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: IS_IPAD ? 12 : 8,
  },
  sidebarChatInfo: {
    minWidth: 0,
  },
  sidebarChatTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: IS_IPAD ? 6 : 4,
  },
  sidebarChatName: {
    flex: 1,
    fontSize: IS_IPAD ? 18 : 14,
    fontWeight: '700',
    color: '#222222',
    marginRight: IS_IPAD ? 12 : 9,
  },
  sidebarChatTime: {
    fontSize: IS_IPAD ? 13 : 10,
    color: '#A1A1A1',
    fontWeight: '600',
  },
  sidebarLastMessage: {
    fontSize: IS_IPAD ? 15 : 12,
    color: '#707070',
    lineHeight: IS_IPAD ? 21 : 17,
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
