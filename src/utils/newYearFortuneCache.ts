/**
 * 신년운세 캐시 관리
 * AsyncStorage를 사용하여 신년운세 데이터를 캐싱
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY_PREFIX = 'newyear_fortune_';

/**
 * 캐시 키 생성
 */
const getCacheKey = (userId: string, year: number): string => {
  return `${CACHE_KEY_PREFIX}${userId}_${year}`;
};

/**
 * 캐시에서 신년운세 조회
 */
export const getCachedNewYearFortune = async (
  userId: string,
  year: number
): Promise<any | null> => {
  try {
    const key = getCacheKey(userId, year);
    const cached = await AsyncStorage.getItem(key);
    
    if (!cached) {
      return null;
    }

    const data = JSON.parse(cached);
    
    // 연도 확인 (캐시된 연도와 요청 연도가 같은지)
    if (data.year !== year) {
      await AsyncStorage.removeItem(key);
      return null;
    }

    return data;
  } catch (error) {
    console.error('신년운세 캐시 조회 오류:', error);
    return null;
  }
};

/**
 * 신년운세 캐싱
 */
export const setCachedNewYearFortune = async (
  userId: string,
  year: number,
  data: any
): Promise<boolean> => {
  try {
    const key = getCacheKey(userId, year);
    await AsyncStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('신년운세 캐싱 오류:', error);
    return false;
  }
};

/**
 * 특정 연도 캐시 삭제
 */
export const clearNewYearFortuneCache = async (
  userId: string,
  year: number
): Promise<void> => {
  try {
    const key = getCacheKey(userId, year);
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('신년운세 캐시 삭제 오류:', error);
  }
};

/**
 * 특정 사용자의 모든 신년운세 캐시 삭제
 */
export const clearAllNewYearFortuneCache = async (userId: string): Promise<void> => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const userKeys = allKeys.filter(key => 
      key.startsWith(`${CACHE_KEY_PREFIX}${userId}_`)
    );
    
    if (userKeys.length > 0) {
      await AsyncStorage.multiRemove(userKeys);
    }
  } catch (error) {
    console.error('모든 신년운세 캐시 삭제 오류:', error);
  }
};

/**
 * 캐시가 유효한지 확인
 * (해당 연도가 지나면 캐시 무효화)
 */
export const isCacheValid = (cachedData: any, targetYear: number): boolean => {
  if (!cachedData || !cachedData.year) {
    return false;
  }

  const currentYear = new Date().getFullYear();
  
  // 요청한 연도와 캐시된 연도가 같아야 함
  if (cachedData.year !== targetYear) {
    return false;
  }

  // 과거 연도의 캐시는 항상 유효
  if (targetYear < currentYear) {
    return true;
  }

  // 현재 연도의 캐시는 연말까지 유효
  if (targetYear === currentYear) {
    return true;
  }

  // 미래 연도의 캐시는 해당 연도가 되면 재생성 필요
  if (targetYear > currentYear) {
    return true;
  }

  return false;
};

