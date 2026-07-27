import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { supabase } from '../../utils/database/supabaseClient';
import Icon from 'react-native-vector-icons/Ionicons';
import SabaLoader from '../../components/common/SabaLoader';
import { safeGoBack } from '../../utils/navigation/safeGoBack';
import { isIPad } from '../../utils/platform';
import {
  getNotificationPermissionStatus,
  openSystemNotificationSettings,
  requestNotificationPermission,
  registerPushToken,
} from '../../services/notifications/pushTokenService';
import {
  getNotificationPreferences,
  upsertNotificationPreferences,
  NotificationPreferences,
} from '../../services/notifications/notificationPreferencesService';

const IS_IPAD = isIPad();

interface NotificationSettingsScreenProps {
  navigation: any;
}

type OsPermissionStatus = 'authorized' | 'denied' | 'not-determined';

const NotificationSettingsScreen: React.FC<NotificationSettingsScreenProps> = ({ navigation }) => {
  const [notificationSettings, setNotificationSettings] = useState<NotificationPreferences>({
    all_notifications: true,
    chat_notifications: true,
    daily_fortune_notifications: true,
  });
  const [osPermission, setOsPermission] = useState<OsPermissionStatus>('not-determined');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 8 : 10;

  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    try {
      setLoading(true);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        safeGoBack(navigation);
        return;
      }
      setUserId(user.id);

      const [permissionStatus, preferences] = await Promise.all([
        getNotificationPermissionStatus(),
        getNotificationPreferences(user.id),
      ]);

      setOsPermission(permissionStatus);
      setNotificationSettings(preferences);
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // OS 권한이 거부된 상태면 앱에서 재요청 불가 → 시스템 설정으로 안내
  const promptOpenSystemSettings = () => {
    Alert.alert(
      '알림 권한이 꺼져 있어요',
      '기기 설정에서 사바 앱의 알림을 허용해주세요.',
      [
        { text: '취소', style: 'cancel' },
        { text: '설정으로 이동', onPress: () => openSystemNotificationSettings() },
      ],
    );
  };

  const toggleSetting = async (key: keyof NotificationPreferences) => {
    if (!userId) return;

    // OS 권한이 아직 없는 상태에서 켜려는 경우: 시스템 권한부터 요청
    if (osPermission === 'not-determined') {
      const granted = await requestNotificationPermission();
      const newStatus: OsPermissionStatus = granted ? 'authorized' : 'denied';
      setOsPermission(newStatus);
      if (!granted) return;
      await registerPushToken(userId);
    } else if (osPermission === 'denied') {
      promptOpenSystemSettings();
      return;
    }

    let newSettings: NotificationPreferences;

    if (key === 'all_notifications') {
      const newValue = !notificationSettings.all_notifications;
      newSettings = {
        all_notifications: newValue,
        chat_notifications: newValue,
        daily_fortune_notifications: newValue,
      };
    } else {
      newSettings = {
        ...notificationSettings,
        [key]: !notificationSettings[key],
      };
      const anyIndividualOn = newSettings.chat_notifications || newSettings.daily_fortune_notifications;
      newSettings.all_notifications = anyIndividualOn;
    }

    setNotificationSettings(newSettings);

    try {
      await upsertNotificationPreferences(userId, newSettings);
    } catch {
      Alert.alert('오류', '설정 저장에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, { paddingTop: statusBarHeight }]}>
          <TouchableOpacity onPress={() => safeGoBack(navigation)} style={styles.backButton}>
            <Icon name="arrow-back" size={IS_IPAD ? 28 : 24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>알림 설정</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <SabaLoader message="설정을 불러오는 중" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { paddingTop: statusBarHeight }]}>
          <TouchableOpacity onPress={() => safeGoBack(navigation)} style={styles.backButton}>
            <Icon name="arrow-back" size={IS_IPAD ? 28 : 24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>알림 설정</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.section}>
          {/* <Text style={styles.sectionTitle}>알림 설정</Text> */}
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>전체 알림</Text>
              <Text style={styles.settingDescription}>모든 알림을 한 번에 제어합니다</Text>
            </View>
            <Switch
              value={osPermission === 'authorized' && notificationSettings.all_notifications}
              onValueChange={() => toggleSetting('all_notifications')}
              trackColor={{ false: '#e0e0e0', true: Colors.primaryColor }}
              thumbColor={notificationSettings.all_notifications ? 'white' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>채팅 알림</Text>
              <Text style={styles.settingDescription}>새로운 메시지 알림을 받습니다</Text>
            </View>
            <Switch
              value={osPermission === 'authorized' && notificationSettings.chat_notifications}
              onValueChange={() => toggleSetting('chat_notifications')}
              trackColor={{ false: '#e0e0e0', true: Colors.primaryColor }}
              thumbColor={notificationSettings.chat_notifications ? 'white' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>오늘의 운세 알림</Text>
              <Text style={styles.settingDescription}>매일 오늘의 운세를 알려드립니다</Text>
            </View>
            <Switch
              value={osPermission === 'authorized' && notificationSettings.daily_fortune_notifications}
              onValueChange={() => toggleSetting('daily_fortune_notifications')}
              trackColor={{ false: '#e0e0e0', true: Colors.primaryColor }}
              thumbColor={notificationSettings.daily_fortune_notifications ? 'white' : '#f4f3f4'}
            />
          </View>
        </View>

        {osPermission === 'denied' && (
          <View style={styles.infoSection}>
            <Text style={[styles.infoText, { color: '#e74c3c' }]}>
              기기 알림 권한이 꺼져있어요. 스위치를 켜면 설정 화면으로 안내해드려요.
            </Text>
          </View>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            {/* 전체 알림: 모든 알림을 한 번에 켜고 끌 수 있습니다{'\n'}
            채팅 알림: 새로운 메시지가 올 때 알림을 받습니다{'\n'}
            오늘의 운세: 매일 아침 오늘의 운세를 알려드립니다{'\n'} */}
            설정은 자동으로 저장됩니다
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: IS_IPAD ? 30 : 20,
    paddingBottom: 0,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    width: IS_IPAD ? 48 : 40,
    height: IS_IPAD ? 48 : 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: IS_IPAD ? 12 : 8,
  },
  headerTitle: {
    fontSize: IS_IPAD ? 22 : 18,
    fontWeight: '600',
    color: '#333',
  },
  headerRight: {
    width: IS_IPAD ? 48 : 40,
  },
  section: {
    backgroundColor: 'white',
    marginBottom: 0,
    paddingHorizontal: IS_IPAD ? 30 : 20,
  },
  sectionTitle: {
    fontSize: IS_IPAD ? 22 : 18,
    fontWeight: '600',
    color: '#333',
    paddingVertical: IS_IPAD ? 28 : 20,
    paddingTop: IS_IPAD ? 28 : 20,
    borderBottomColor: 'transparent',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: IS_IPAD ? 22 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingItemLast: {
    borderBottomWidth: 0,
  },
  settingLeft: {
    flex: 1,
    marginRight: IS_IPAD ? 20 : 16,
  },
  settingLabel: {
    fontSize: IS_IPAD ? 20 : 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: IS_IPAD ? 6 : 4,
  },
  settingDescription: {
    fontSize: IS_IPAD ? 16 : 14,
    color: '#666',
  },
  infoSection: {
    backgroundColor: 'white',
    marginTop: IS_IPAD ? 10 : 5,
    paddingHorizontal: IS_IPAD ? 30 : 20,
    paddingVertical: IS_IPAD ? 16 : 10,
  },
  infoText: {
    fontSize: IS_IPAD ? 16 : 14,
    color: '#666',
    lineHeight: IS_IPAD ? 24 : 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
});

export default NotificationSettingsScreen;
