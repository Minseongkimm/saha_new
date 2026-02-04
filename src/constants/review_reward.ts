import { Platform, Linking } from 'react-native';

/** 리뷰 작성 리워드로 지급하는 사바 개수 */
export const REVIEW_REWARD_SAHA = 3;

/** Android 플레이스토어 앱 페이지 (리뷰 작성 가능) */
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.saha.ai';

/** iOS 앱스토어 앱 페이지 (앱 등록 후 실제 앱 ID로 교체) */
const APP_STORE_URL = 'https://apps.apple.com/app/idXXXXXXXX';

/**
 * 현재 플랫폼에 맞는 스토어 리뷰 페이지 URL 반환
 * Linking.openURL(getStoreReviewUrl()) 로 스토어 이동
 */
export function getStoreReviewUrl(): string {
  return Platform.OS === 'android' ? PLAY_STORE_URL : APP_STORE_URL;
}

/**
 * 스토어 리뷰 페이지를 외부 앱/브라우저로 엽니다
 */
export async function openStoreForReview(): Promise<void> {
  const url = getStoreReviewUrl();
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  } else {
    throw new Error('스토어를 열 수 없습니다.');
  }
}
