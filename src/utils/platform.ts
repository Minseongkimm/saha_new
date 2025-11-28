import { Platform } from 'react-native';

/**
 * iPad인지 확인하는 유틸리티 함수
 * @returns {boolean} iPad이면 true, 아니면 false
 */
export const isIPad = (): boolean => {
  return Platform.OS === 'ios' && Platform.isPad;
};

