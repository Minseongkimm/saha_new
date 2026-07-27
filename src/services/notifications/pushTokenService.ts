import { Platform, Linking, PermissionsAndroid } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../utils/database/supabaseClient';

// Android는 "한 번도 요청 안 함"과 "거부됨"을 시스템 API로 구분할 수 없어서
// 직접 요청 여부를 기록해둬야 함 (iOS는 hasPermission()의 NOT_DETERMINED로 구분 가능)
const PERMISSION_REQUESTED_KEY = 'push_permission_requested';

// 알림 권한 요청 (이미 허용된 경우 즉시 통과)
// 주의: @react-native-firebase/messaging의 requestPermission()은 Android에서
// 실제 POST_NOTIFICATIONS 시스템 팝업을 띄우지 않음 (네이티브에 미구현, iOS 전용 동작).
// Android는 React Native 코어의 PermissionsAndroid로 직접 요청해야 함.
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    await AsyncStorage.setItem(PERMISSION_REQUESTED_KEY, 'true');
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  const authStatus = await messaging().requestPermission();
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
};

// 현재 OS 알림 권한 상태 조회 (팝업 없이 확인만)
export const getNotificationPermissionStatus = async (): Promise<
  'authorized' | 'denied' | 'not-determined'
> => {
  const authStatus = await messaging().hasPermission();
  if (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  ) {
    return 'authorized';
  }

  if (Platform.OS === 'android') {
    // Android는 시스템이 미요청/거부를 구분 안 해주므로 직접 기록한 값으로 판단
    const alreadyRequested = await AsyncStorage.getItem(PERMISSION_REQUESTED_KEY);
    return alreadyRequested === 'true' ? 'denied' : 'not-determined';
  }

  if (authStatus === messaging.AuthorizationStatus.DENIED) {
    return 'denied';
  }
  return 'not-determined';
};

// 앱의 시스템 알림 설정 화면으로 이동 (거부된 경우 앱에서 재요청 불가하므로 필요)
export const openSystemNotificationSettings = (): Promise<void> => {
  return Linking.openSettings();
};

const saveTokenToSupabase = async (userId: string, token: string): Promise<void> => {
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';

  const { error } = await supabase.from('push_tokens').upsert(
    {
      user_id: userId,
      device_token: token,
      platform,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'device_token' },
  );

  if (error) {
    console.error('푸시 토큰 등록 실패:', error);
  }
};

// OS 권한을 새로 요청(팝업 노출)하면서 토큰까지 등록. 프라이머 모달/설정 화면 등
// 사용자가 명시적으로 알림을 켜려는 시점에서만 호출해야 함.
export const registerPushToken = async (userId: string): Promise<void> => {
  const granted = await requestNotificationPermission();
  if (!granted) {
    return;
  }

  const token = await messaging().getToken();
  if (!token) {
    return;
  }

  await saveTokenToSupabase(userId, token);
};

// 이미 OS 알림 권한이 허용된 경우에만 조용히 토큰을 등록(팝업 없음).
// 로그인 시점처럼 사용자에게 권한을 새로 요청하면 안 되는 곳에서 사용.
export const registerTokenIfPermitted = async (userId: string): Promise<void> => {
  const status = await getNotificationPermissionStatus();
  if (status !== 'authorized') {
    return;
  }

  const token = await messaging().getToken();
  if (!token) {
    return;
  }

  await saveTokenToSupabase(userId, token);
};

// 토큰 갱신 리스너 (FCM 토큰은 주기적으로 재발급될 수 있음)
export const subscribeTokenRefresh = (userId: string): (() => void) => {
  return messaging().onTokenRefresh(async newToken => {
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    const { error } = await supabase.from('push_tokens').upsert(
      {
        user_id: userId,
        device_token: newToken,
        platform,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'device_token' },
    );
    if (error) {
      console.error('푸시 토큰 갱신 실패:', error);
    }
  });
};
