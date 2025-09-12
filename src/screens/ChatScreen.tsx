import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  ImageSourcePropType,
  Modal,
  Animated,
} from 'react-native';
import { Colors } from '../constants/colors';
import Icon from 'react-native-vector-icons/Ionicons';
import { supabase } from '../utils/supabaseClient';
import { Expert } from '../types/expert';
import { getExpertImage } from '../utils/getExpertImage';
import { useNavigation } from '@react-navigation/native';

interface ChatScreenProps {
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
}

const ChatScreen: React.FC<ChatScreenProps> = ({ navigation }) => {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectionMode, setSelectionMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);
  const rowAnimMap = React.useRef<Map<string, Animated.Value>>(new Map());

  const fetchChatRooms = useCallback(async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId: string | undefined = userData.user?.id;
        if (!userId) {
          setChats([]);
          setLoading(false);
          return;
        }
        const { data: rooms, error: roomError } = await supabase
          .from('chat_rooms')
          .select(`
            id,
            expert_id,
            last_message,
            last_message_at,
            created_at,
            messages:chat_messages(message, created_at)
          `)
          .eq('user_id', userId)
          .order('last_message_at', { ascending: false })
          .order('created_at', { ascending: false })
          .order('created_at', { foreignTable: 'chat_messages', ascending: false })
          .limit(1, { foreignTable: 'chat_messages' });
        if (roomError) throw roomError;
        const roomList = rooms || [];
        if (roomList.length === 0) {
          setChats([]);
          setLoading(false);
          return;
        }
        const expertIds: string[] = Array.from(new Set(roomList.map(r => r.expert_id)));
        const { data: experts, error: expertError } = await supabase
          .from('experts')
          .select('id, name, category, title, description, image_name, is_online, created_at')
          .in('id', expertIds);
        if (expertError) throw expertError;
        const expertMap: Record<string, Expert> = {};
        (experts || []).forEach((e: Expert) => {
          expertMap[e.id] = e;
        });
        const items: ChatItem[] = roomList.map((room: any) => {
          const expert: Expert | undefined = expertMap[room.expert_id];
          const name: string = expert ? expert.name : '전문가';
          const profile: ImageSourcePropType = expert ? getExpertImage(expert.image_name) : require('../../assets/people/hoosi_guy.jpg');
          const fallbackMsg = Array.isArray(room.messages) && room.messages.length > 0 ? room.messages[0]?.message ?? '' : '';
          const lastText: string = room.last_message || fallbackMsg || '';
          const fallbackTs = Array.isArray(room.messages) && room.messages.length > 0 ? room.messages[0]?.created_at ?? null : null;
          const tsIso: string | null = room.last_message_at || fallbackTs || room.created_at || null;
          const tsStr: string = tsIso ? new Date(tsIso).toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '';
          return {
            id: room.id,
            name,
            lastMessage: lastText,
            timestamp: tsStr,
            profileImage: profile,
            isRead: true,
            expert: expert as Expert,
          };
        });
        setChats(items);
      } catch (err) {
        setChats([]);
      } finally {
        setLoading(false);
      }
  }, []);

  useEffect(() => {
    fetchChatRooms();
    const unsubscribe = navigation.addListener('focus', () => {
      setLoading(true);
      fetchChatRooms();
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
      setChats((prev) => prev.filter((c) => !selectedIds.has(c.id)));
      setSelectedIds(new Set());
      setSelectionMode(false);
      setDeleteModalVisible(false);
      void supabase.from('chat_messages').delete().in('chat_room_id', ids);
      void supabase.from('chat_rooms').delete().in('id', ids);
    } catch (err) {
      setDeleteModalVisible(false);
    }
  };

  const categoryLabelMap: Record<Expert['category'], string> = {
    love: '연애/궁합',
    residence: '이사/주거',
    life: '인생/진로',
    wealth: '재물/사업',
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
            <Icon name="checkmark" size={14} color={'white'} />
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
            {item.lastMessage}
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
                <Icon name="close" size={20} color={'#333'} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerIconBtn} onPress={() => setDeleteModalVisible(true)} disabled={selectedCount === 0}>
                <Icon name="trash" size={20} color={selectedCount === 0 ? '#bbb' : '#ff6b6b'} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.headerIconBtn} onPress={toggleSelectionMode}>
              <Icon name="settings-outline" size={20} color={'#333'} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primaryColor} />
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
              <Text style={styles.emptyText}>최근 대화가 없습니다.</Text>
            </View>
          }
        />
      )}
      <Modal visible={deleteModalVisible} transparent animationType="fade" onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>대화 삭제</Text>
            <Text style={styles.modalMessage}>{`${selectedCount}개의 대화를 삭제하시겠습니까?\n진행 시 영구적으로 삭제됩니다.`}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.modalCancelButton]} onPress={() => setDeleteModalVisible(false)}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalDeleteButton]} onPress={executeDeleteSelected} disabled={selectedCount === 0}>
                <Text style={styles.modalDeleteText}>삭제</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    paddingVertical: 16,
    paddingHorizontal: 20,
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
    fontSize: 24,
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
    paddingHorizontal: 10,
    paddingVertical: 15,
    backgroundColor: 'white',
    marginHorizontal: 0,
    marginVertical: 0,
    borderBottomWidth: 0,
  },
  chatItemSelected: {
    backgroundColor: '#f6f8ff',
  },
  checkboxBase: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.primaryColor,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxSelected: {
    backgroundColor: Colors.primaryColor,
    borderColor: Colors.primaryColor,
  },
  checkboxUnselected: {
    backgroundColor: 'white',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  chatTimestamp: {
    fontSize: 12,
    color: '#999',
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginRight: 12,
  },
  chatFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadBadge: {
    backgroundColor: '#ff4757',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  readIcon: {
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 14,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    minHeight: 220,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111',
    marginBottom: 14,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 22,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 12,
  },
  modalButton: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 10,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#f1f3f5',
  },
  modalDeleteButton: {
    backgroundColor: '#F85656FF',
  },
  modalCancelText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalDeleteText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
});

export default ChatScreen;
