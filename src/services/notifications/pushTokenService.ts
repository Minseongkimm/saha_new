import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { supabase } from '../../utils/database/supabaseClient';

// 알림 권한 요청 (이미 허용된 경우 즉시 통과)
export const requestNotificationPermission = async (): Promise<boolean> => {
  const authStatus = await messaging().requestPermission();
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
};

// FCM 토큰을 발급받아 Supabase push_tokens 테이블에 upsert
export const registerPushToken = async (userId: string): Promise<void> => {
  const granted = await requestNotificationPermission();
  if (!granted) {
    return;
  }

  const token = await messaging().getToken();
  if (!token) {
    return;
  }

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
