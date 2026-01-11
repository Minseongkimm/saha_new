import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Image,
  ImageSourcePropType,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import { Colors } from '../../constants/colors';
import Icon from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../utils/database/supabaseClient';
import { Expert } from '../../types/expert';
import { getExpertImage } from '../../utils/expert/getExpertImage';
import { useNavigation } from '@react-navigation/native';
import { getChatListCache, setChatListCache, isChatListFresh, consumeChatListNeedsRefresh } from '../../utils/chat/chatListCache';
import { getCurrentUserSafely } from '../../utils/user/authUtils';
import { removeBoldMarkup } from '../../utils/text/removeBoldMarkup';
import SabaLoader from '../../components/common/SabaLoader';
import ConfirmModal from '../../components/common/ConfirmModal';
import { isIPad } from '../../utils/platform';
import { useAppConfig } from '../../contexts/AppConfigContext';

const IS_IPAD = isIPad();

interface ChatListScreenProps {
  navigation: any;
}

interface ChatItem {
  id: string; // chat room id
  name: string;
  lastMessage: string;
  timestamp: string;
  unreadCount?: number;
  profileImage: ImageSourcePropType;
  isRead: boolean;
  expert: Expert;
  status?: 'active' | 'ended';
  endedAt?: string | null;
  sortTime?: string | null;
}

const ChatListScreen: React.FC<ChatListScreenProps> = ({ navigation }) => {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectionMode, setSelectionMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);
  const rowAnimMap = React.useRef<Map<string, Animated.Value>>(new Map());

  const fetchChatRooms = useCallback(async () => {
      try {
        const { status, user } = await getCurrentUserSafely();
        if (status === 'network_error') {
          // 네트워크 이슈 시에는 리스트를 건드리지 않고 조용히 종료
          setLoading(false);
          return;
        }
        const userId: string | undefined = status === 'authenticated' && user ? user.id : undefined;
        if (!userId) {
          setChats([]);
          setLoading(false);
          return;
        }
        // 캐시 선반영 (신선하면 즉시 사용)
        const FRESH_MS = 10 * 1000;
        if (isChatListFresh(FRESH_MS)) {
          const cached = getChatListCache();
          if (cached) setChats(cached as ChatItem[]);
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
            messages:chat_messages(message, created_at)
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .order('created_at', { foreignTable: 'chat_messages', ascending: false })
          .limit(1, { foreignTable: 'chat_messages' });
        
        if (roomError) throw roomError;
        const roomList = rooms || [];
        
        if (roomList.length === 0) {
          setChats([]);
          setChatListCache([]);
          setLoading(false);
          return;
        }
        const expertIds: string[] = Array.from(new Set(roomList.map(r => r.expert_id)));
        
        const { data, error: expertError } = await supabase
          .from('experts')
          .select('id, name, category, title, image_name, is_online, created_at')
          .in('id', expertIds);
        
        const experts: any[] = data || [];
        
        if (expertError) throw expertError;
        const expertMap: Record<string, Expert> = {};
        experts.forEach((e: any) => {
          expertMap[e.id] = e as Expert;
        });

        const compatibilityPartnerIds: string[] = Array.from(new Set(
          roomList
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

        const items: ChatItem[] = roomList.map((room: any) => {
          const expert: Expert | undefined = expertMap[room.expert_id];
          const baseName: string = expert ? expert.name : '전문가';
          let displayName: string = baseName;
          if (room.chat_context === 'love_compatibility') {
            const partnerLabel: string | undefined = room.partner_saju_id ? partnerNameMap[room.partner_saju_id] : undefined;
            displayName = partnerLabel ? `${baseName} · ${partnerLabel}` : `${baseName} · 궁합`;
          } else if (room.chat_context === 'love_personal') {
            displayName = `${baseName} · 연애상담`;
          }
          // 궁합 전용 전문가의 경우 원본 전문가 이미지 사용
          let imageName: string | undefined = expert?.image_name;
          if (!imageName && expert?.name) {
            // "(궁합 전용)" 제거하고 원본 이름으로 이미지 찾기
            const baseExpertName = expert.name.replace(/\s*\(궁합\s*전용\)\s*$/, '');
            // 원본 전문가 찾기 (같은 이름, 같은 카테고리)
            const originalExpert = (experts || []).find((e: any) => 
              e.name === baseExpertName && 
              e.category === expert.category &&
              e.image_name
            );
            if (originalExpert) {
              imageName = originalExpert.image_name;
            } else {
              // 원본 전문가를 찾지 못한 경우, 이름 기반으로 이미지 파일명 추정
              // 예: "연화낭자" -> "yeonhwa.jpg"
              const nameToImageMap: Record<string, string> = {
                '연화낭자': 'yeonhwa.jpg',
                '호시': 'hoshi.jpg',
              };
              const mappedImage = nameToImageMap[baseExpertName];
              if (mappedImage) {
                imageName = mappedImage;
              }
            }
          }
          const profile: ImageSourcePropType = expert && imageName ? getExpertImage(imageName) : require('../../../assets/people/hoosi_guy.jpg');
          const fallbackMsg = Array.isArray(room.messages) && room.messages.length > 0 ? room.messages[0]?.message ?? '' : '';
          const lastText: string = room.last_message || fallbackMsg || '';
          const fallbackTs = Array.isArray(room.messages) && room.messages.length > 0 ? room.messages[0]?.created_at ?? null : null;
          const tsIso: string | null = room.last_message_at || fallbackTs || room.created_at || null;
          const tsStr: string = tsIso ? new Date(tsIso).toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '';
          return {
            id: room.id,
            name: displayName,
            lastMessage: lastText,
            timestamp: tsStr,
            profileImage: profile,
            isRead: true,
            expert: expert as Expert,
            status: (room as any).status ?? 'active',
            endedAt: (room as any).ended_at ?? null,
            sortTime: tsIso || room.created_at,
          };
        });
        
        // JavaScript로 정렬: 최근 메시지가 위로 오도록
        items.sort((a, b) => {
          const timeA = new Date((a as any).sortTime || 0).getTime();
          const timeB = new Date((b as any).sortTime || 0).getTime();
          return timeB - timeA;
        });
        
        setChats(items);
        // 성공 시에만 캐시 저장
        setChatListCache(items);
      } catch (err) {
        console.error('Error fetching chat rooms:', err);
        Alert.alert('오류', '대화 목록을 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
  }, []);

  useEffect(() => {
    // 최초 진입: 캐시가 있고 비어있지 않으면 즉시 표시, 아니면 서버에서 가져오기
    const cached = getChatListCache();
    if (cached && cached.length > 0) {
      setChats(cached as ChatItem[]);
      setLoading(false);
    } else {
      setLoading(true);
      fetchChatRooms();
    }
    const unsubscribe = navigation.addListener('focus', () => {
      // 방에서 돌아온 경우에만 새로고침 (needsRefresh 소비)
      if (consumeChatListNeedsRefresh()) {
        setLoading(true);
        fetchChatRooms();
      } else {
        const cache = getChatListCache();
        if (cache && cache.length > 0) setChats(cache as ChatItem[]);
        else fetchChatRooms();
      }
    });
    return unsubscribe;
  }, [navigation, fetchChatRooms]);

  const isSelected = (id: string): boolean => selectedIds.has(id);
  const selectedCount = useMemo<number>(() => selectedIds.size, [selectedIds]);

  const toggleSelectionMode = () => {
    setSelectionMode((prev) => {
      if (prev) setSelectedIds(new Set());
      return !prev;
    });
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const executeDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    try {
      const ids = Array.from(selectedIds);
      const ensureAnim = (id: string) => {
        if (!rowAnimMap.current.has(id)) {
          rowAnimMap.current.set(id, new Animated.Value(0));
        }
        return rowAnimMap.current.get(id)!;
      };
      await Promise.all(
        ids.map((id) =>
          new Promise<void>((resolve) => {
            Animated.timing(ensureAnim(id), {
              toValue: 320,
              duration: 220,
              useNativeDriver: true,
            }).start(() => resolve());
          })
        )
      );
      // DB 삭제를 반드시 대기
      const { error: msgErr } = await supabase.from('chat_messages').delete().in('chat_room_id', ids);
      if (msgErr) throw msgErr;
      const { error: roomErr } = await supabase.from('chat_rooms').delete().in('id', ids);
      if (roomErr) throw roomErr;
      // 성공 시 UI/캐시 갱신
      setChats((prev) => {
        const next = prev.filter((c) => !selectedIds.has(c.id));
        setChatListCache(next as any);
        return next;
      });
      setSelectedIds(new Set());
      setSelectionMode(false);
      setDeleteModalVisible(false);
    } catch (err) {
      Alert.alert('오류', '대화 삭제에 실패했습니다. 잠시 후 다시 시도하세요.');
      setDeleteModalVisible(false);
    }
  };

  const categoryLabelMap: Record<Expert['category'], string> = {
    comprehensive: '종합사주',
    love: '연애',
    money: '금전운',
    career: '커리어',
    health: '건강운',
    traditional_saju: '정통사주',
    today_fortune: '오늘의 운세',
    newyear_fortune: '신년운세',
  };
  const getRowAnim = (id: string): Animated.Value => {
    if (!rowAnimMap.current.has(id)) {
      rowAnimMap.current.set(id, new Animated.Value(0));
    }
    return rowAnimMap.current.get(id)!;
  };
  const renderChatItem = ({ item }: { item: ChatItem }) => (
    <Animated.View style={{ transform: [{ translateX: getRowAnim(item.id) }], opacity: getRowAnim(item.id).interpolate({ inputRange: [0, 160, 320], outputRange: [1, 0.6, 0] }) }}>
    <TouchableOpacity
      style={[styles.chatItem, selectionMode && isSelected(item.id) ? styles.chatItemSelected : undefined]}
      onPress={() => {
        if (selectionMode) {
          toggleSelectItem(item.id);
          return;
        }
        navigation.navigate('ChatRoom', { roomId: item.id, expert: item.expert });
      }}
      onLongPress={() => {
        if (!selectionMode) {
          setSelectionMode(true);
          toggleSelectItem(item.id);
        }
      }}
    >
      {selectionMode && (
        <View
          style={[
            styles.checkboxBase,
            isSelected(item.id) ? styles.checkboxSelected : styles.checkboxUnselected,
          ]}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isSelected(item.id) }}
        >
          {isSelected(item.id) && (
            <Icon name="checkmark" size={IS_IPAD ? 20 : 14} color={'white'} />
          )}
        </View>
      )}
      <Image source={item.profileImage} style={styles.profileImage} />
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName}>{`${item.name}(${categoryLabelMap[item.expert.category]})`}</Text>
          <Text style={styles.chatTimestamp}>{item.timestamp}</Text>
        </View>
        <View style={styles.chatFooter}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {removeBoldMarkup(item.lastMessage)}
          </Text>
          <View style={styles.chatFooterRight}>
            {item.unreadCount && item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>{item.unreadCount}</Text>
              </View>
            )}
            {/* {item.isRead && (
              <Icon name="checkmark-done" size={16} color={Colors.primaryColor} style={styles.readIcon} />
            )} */}
          </View>
        </View>
      </View>
    </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>대화</Text>
        </View>
        <View style={styles.headerRight}>
          {selectionMode ? (
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.headerIconBtn} onPress={toggleSelectionMode}>
                <Icon name="close" size={IS_IPAD ? 28 : 20} color={'#333'} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerIconBtn} onPress={() => setDeleteModalVisible(true)} disabled={selectedCount === 0}>
                <Icon name="trash" size={IS_IPAD ? 28 : 20} color={selectedCount === 0 ? '#bbb' : Colors.primaryColor} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.headerIconBtn} onPress={toggleSelectionMode}>
              <Icon name="settings-outline" size={IS_IPAD ? 28 : 20} color={'#333'} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <SabaLoader
            message="대화속에 실마리가 있습니다"
          />
        </View>
      ) : (
        <FlatList
          data={chats}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.id}
          style={styles.chatList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.chatListContent, chats.length === 0 ? styles.emptyListContent : undefined]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>
                운명의 지도를 펼쳐보세요
              </Text>
              <Text style={styles.emptySubtitle}>
                AI 도사에게 편하게 말을 걸고 {'\n'}나를 이해하는 질문부터 시작해보세요.
              </Text>
              <TouchableOpacity 
                style={styles.startChatButton}
                onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
              >
                <Text style={styles.startChatButtonText}>대화하기</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
      <ConfirmModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        title="대화 삭제"
        message={`${selectedCount}개의 대화를 삭제하시겠습니까?\n진행 시 영구적으로 삭제됩니다.`}
        confirmText="삭제"
        onConfirm={executeDeleteSelected}
        confirmDisabled={selectedCount === 0}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: IS_IPAD ? 20 : 16,
    paddingHorizontal: IS_IPAD ? 30 : 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryColor,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: IS_IPAD ? 26 : 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBtn: {
    padding: 8,
    marginLeft: 8,
  },
  newChatButton: {
    padding: 8,
  },
  chatList: {
    flex: 1,
  },
  chatListContent: {
    paddingVertical: 0
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: IS_IPAD ? 20 : 10,
    paddingVertical: IS_IPAD ? 20 : 15,
    backgroundColor: 'white',
    marginHorizontal: 0,
    marginVertical: 0,
    borderBottomWidth: 0,
  },
  chatItemSelected: {
    backgroundColor: '#f6f8ff',
  },
  checkboxBase: {
    width: IS_IPAD ? 28 : 22,
    height: IS_IPAD ? 28 : 22,
    borderRadius: IS_IPAD ? 8 : 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: IS_IPAD ? 16 : 12,
  },
  checkboxSelected: {
    backgroundColor: Colors.primaryColor,
    borderColor: Colors.primaryColor,
  },
  checkboxUnselected: {
    backgroundColor: 'white',
    borderColor: '#ccc',
  },
  profileImage: {
    width: IS_IPAD ? 70 : 50,
    height: IS_IPAD ? 70 : 50,
    borderRadius: IS_IPAD ? 35 : 25,
    marginRight: IS_IPAD ? 20 : 16,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: IS_IPAD ? 8 : 6,
  },
  chatName: {
    fontSize: IS_IPAD ? 22 : 16,
    fontWeight: '600',
    color: '#333',
  },
  chatTimestamp: {
    fontSize: IS_IPAD ? 16 : 12,
    color: '#999',
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: IS_IPAD ? 18 : 14,
    color: '#666',
    flex: 1,
    marginRight: IS_IPAD ? 16 : 12,
  },
  chatFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadBadge: {
    backgroundColor: '#ff4757',
    borderRadius: IS_IPAD ? 14 : 10,
    paddingHorizontal: IS_IPAD ? 12 : 8,
    paddingVertical: IS_IPAD ? 6 : 4,
    marginRight: IS_IPAD ? 12 : 8,
    minWidth: IS_IPAD ? 28 : 20,
    alignItems: 'center',
  },
  unreadCount: {
    color: 'white',
    fontSize: IS_IPAD ? 16 : 12,
    fontWeight: '600',
  },
  readIcon: {
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: IS_IPAD ? 60 : 40,
    paddingVertical: IS_IPAD ? 120 : 80,
  },
  emptyImage: {
    width: IS_IPAD ? 160 : 120,
    height: IS_IPAD ? 160 : 120,
    marginBottom: IS_IPAD ? 32 : 24,
    opacity: 0.7,
  },
  emptyTitle: {
    fontSize: IS_IPAD ? 28 : 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: IS_IPAD ? 16 : 12,
  },
  emptySubtitle: {
    fontSize: IS_IPAD ? 22 : 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: IS_IPAD ? 32 : 24,
    marginBottom: IS_IPAD ? 40 : 32,
  },
  startChatButton: {
    backgroundColor: Colors.primaryColor,
    paddingHorizontal: IS_IPAD ? 32 : 24,
    paddingVertical: IS_IPAD ? 16 : 12,
    borderRadius: IS_IPAD ? 28 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 0.3,
  },
  startChatButtonText: {
    color: 'white',
    fontSize: IS_IPAD ? 20 : 16,
    fontWeight: '600',
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
  },
});

export default ChatListScreen;
