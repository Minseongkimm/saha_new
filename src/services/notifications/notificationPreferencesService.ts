import { supabase } from '../../utils/database/supabaseClient';

export interface NotificationPreferences {
  all_notifications: boolean;
  chat_notifications: boolean;
  daily_fortune_notifications: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  all_notifications: true,
  chat_notifications: true,
  daily_fortune_notifications: true,
};

export const getNotificationPreferences = async (
  userId: string,
): Promise<NotificationPreferences> => {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('all_notifications, chat_notifications, daily_fortune_notifications')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('알림 설정 조회 실패:', error);
    return DEFAULT_PREFERENCES;
  }

  return data ?? DEFAULT_PREFERENCES;
};

export const upsertNotificationPreferences = async (
  userId: string,
  preferences: NotificationPreferences,
): Promise<void> => {
  const { error } = await supabase.from('notification_preferences').upsert({
    user_id: userId,
    ...preferences,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error('알림 설정 저장 실패:', error);
    throw error;
  }
};
