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
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../constants/colors';
import { supabase } from '../utils/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationSettingsScreenProps {
  navigation: any;
}

const NotificationSettingsScreen: React.FC<NotificationSettingsScreenProps> = ({ navigation }) => {
  const [notificationSettings, setNotificationSettings] = useState({
    allNotifications: true,
    chatNotifications: true,
    dailyFortuneNotifications: true,
  });
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // 설정 로드
  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    try {
      setLoading(true);
      
      // 사용자 ID 가져오기
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        navigation.goBack();
        return;
      }
      setUserId(user.id);

      // AsyncStorage에서 알림 설정 불러오기
      const savedSettings = await AsyncStorage.getItem(`notification_settings_${user.id}`);
      if (savedSettings) {
        setNotificationSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSetting = async (key: keyof typeof notificationSettings) => {
    let newSettings;
    
    if (key === 'allNotifications') {
      // 전체 알림 토글 시 모든 알림을 같은 값으로 설정
      const newValue = !notificationSettings.allNotifications;
      newSettings = {
        allNotifications: newValue,
        chatNotifications: newValue,
        dailyFortuneNotifications: newValue,
      };
    } else {
      // 개별 알림 토글 시
      newSettings = {
        ...notificationSettings,
        [key]: !notificationSettings[key]
      };
      
      // 개별 알림이 모두 꺼져있을 때만 전체 알림 OFF
      // 하나라도 켜져있으면 전체 알림 ON
      const anyIndividualOn = newSettings.chatNotifications || newSettings.dailyFortuneNotifications;
      newSettings.allNotifications = anyIndividualOn;
    }
    
    setNotificationSettings(newSettings);
    
    // AsyncStorage에 저장
    if (userId) {
      try {
        await AsyncStorage.setItem(`notification_settings_${userId}`, JSON.stringify(newSettings));
      } catch (error) {
        console.error('Error saving notification settings:', error);
        Alert.alert('오류', '설정 저장에 실패했습니다.');
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>알림 설정</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primaryColor} />
          <Text style={styles.loadingText}>설정을 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>알림 설정</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>알림 설정</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>전체 알림</Text>
              <Text style={styles.settingDescription}>모든 알림을 한 번에 제어합니다</Text>
            </View>
            <Switch
              value={notificationSettings.allNotifications}
              onValueChange={() => toggleSetting('allNotifications')}
              trackColor={{ false: '#e0e0e0', true: Colors.primaryColor }}
              thumbColor={notificationSettings.allNotifications ? 'white' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>채팅 알림</Text>
              <Text style={styles.settingDescription}>새로운 메시지 알림을 받습니다</Text>
            </View>
            <Switch
              value={notificationSettings.chatNotifications}
              onValueChange={() => toggleSetting('chatNotifications')}
              trackColor={{ false: '#e0e0e0', true: Colors.primaryColor }}
              thumbColor={notificationSettings.chatNotifications ? 'white' : '#f4f3f4'}
            />
          </View>

          <View style={[styles.settingItem, styles.settingItemLast]}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>오늘의 운세 알림</Text>
              <Text style={styles.settingDescription}>매일 오늘의 운세를 알려드립니다</Text>
            </View>
            <Switch
              value={notificationSettings.dailyFortuneNotifications}
              onValueChange={() => toggleSetting('dailyFortuneNotifications')}
              trackColor={{ false: '#e0e0e0', true: Colors.primaryColor }}
              thumbColor={notificationSettings.dailyFortuneNotifications ? 'white' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            • 전체 알림: 모든 알림을 한 번에 켜고 끌 수 있습니다{'\n'}
            • 채팅 알림: 새로운 메시지가 올 때 알림을 받습니다{'\n'}
            • 오늘의 운세: 매일 아침 오늘의 운세를 알려드립니다{'\n'}
            • 설정은 자동으로 저장됩니다
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: Colors.primaryColor,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerRight: {
    width: 40,
  },
  section: {
    backgroundColor: 'white',
    marginBottom: 0,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    paddingVertical: 20,
    paddingTop: 20,
    borderBottomColor: 'transparent',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingItemLast: {
    borderBottomWidth: 0,
  },
  settingLeft: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  infoSection: {
    backgroundColor: 'white',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});

export default NotificationSettingsScreen;
