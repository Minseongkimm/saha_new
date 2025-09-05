import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native';
import { Colors } from '../constants/colors';
import Icon from 'react-native-vector-icons/Ionicons';

interface ChatScreenProps {
  navigation: any;
}

interface ChatItem {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unreadCount?: number;
  profileImage: any;
  isRead: boolean;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ navigation }) => {
  const [chats] = useState<ChatItem[]>([
    {
      id: '1',
      name: '후시도령(이사)',
      lastMessage: '사주를 보기 전에 먼저 생년월일시를 알려주세요.',
      timestamp: '2:14 PM',
      unreadCount: 1,
      profileImage: require('../../assets/people/hoosi_guy.jpg'),
      isRead: false,
    },
    {
      id: '2',
      name: '김철수',
      lastMessage: '네, 알겠습니다. 감사합니다.',
      timestamp: '1:30 PM',
      profileImage: require('../../assets/people/hoosi_guy.jpg'),
      isRead: true,
    },
    {
      id: '3',
      name: '이영희',
      lastMessage: '사주 상담이 정말 도움이 되었어요.',
      timestamp: '12:45 PM',
      unreadCount: 2,
      profileImage: require('../../assets/people/hoosi_guy.jpg'),
      isRead: false,
    },
    {
      id: '4',
      name: '박민수',
      lastMessage: '다음에 또 상담받고 싶습니다.',
      timestamp: 'Yesterday',
      profileImage: require('../../assets/people/hoosi_guy.jpg'),
      isRead: true,
    },
    {
      id: '5',
      name: '최지영',
      lastMessage: '사주 결과를 기다리고 있어요.',
      timestamp: '2 days ago',
      profileImage: require('../../assets/people/hoosi_guy.jpg'),
      isRead: true,
    },
  ]);

  const renderChatItem = ({ item }: { item: ChatItem }) => (
    <TouchableOpacity style={styles.chatItem}>
      <Image source={item.profileImage} style={styles.profileImage} />
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName}>{item.name}</Text>
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
            {item.isRead && (
              <Icon name="checkmark-done" size={16} color={Colors.primaryColor} style={styles.readIcon} />
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>      
      <FlatList
        data={chats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        style={styles.chatList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.chatListContent}
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
  newChatButton: {
    padding: 8,
  },
  chatList: {
    flex: 1,
  },
  chatListContent: {
    paddingVertical: 0
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 15,
    backgroundColor: 'white',
    marginHorizontal: 0,
    marginVertical: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
});

export default ChatScreen;
