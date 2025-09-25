import AsyncStorage from '@react-native-async-storage/async-storage';
import { TodayFortuneData } from '../services/ai/todayFortuneService';

export interface CachedTodayFortune {
  fortuneData: TodayFortuneData;
  cachedAt: string;
}

export class TodayFortuneCache {
  private static readonly TODAY_FORTUNE_PREFIX = 'today_fortune_';

  /**
   * 오늘의 운세 캐시에서 조회
   */
  static async getCachedTodayFortune(userId: string, date: string): Promise<TodayFortuneData | null> {
    try {
      const key = `${this.TODAY_FORTUNE_PREFIX}${userId}_${date}`;
      const cached = await AsyncStorage.getItem(key);
      
      if (!cached) return null;
      
      const data: CachedTodayFortune = JSON.parse(cached);
      
      // 같은 날짜인지 확인
      if (data.fortuneData.date === date) {
        return data.fortuneData;
      }
      
      return null;
    } catch (error) {
      console.error('오늘의 운세 캐시 조회 실패:', error);
      return null;
    }
  }

  /**
   * 오늘의 운세를 캐시에 저장
   */
  static async setCachedTodayFortune(
    userId: string, 
    fortuneData: TodayFortuneData
  ): Promise<void> {
    try {
      const key = `${this.TODAY_FORTUNE_PREFIX}${userId}_${fortuneData.date}`;
      const dataToCache: CachedTodayFortune = {
        fortuneData,
        cachedAt: new Date().toISOString()
      };
      await AsyncStorage.setItem(key, JSON.stringify(dataToCache));
    } catch (error) {
      console.error('오늘의 운세 캐시 저장 실패:', error);
    }
  }

  /**
   * 특정 사용자의 오늘의 운세 캐시 삭제
   */
  static async clearTodayFortuneCache(userId: string, date?: string): Promise<void> {
    try {
      if (date) {
        // 특정 날짜만 삭제
        const key = `${this.TODAY_FORTUNE_PREFIX}${userId}_${date}`;
        await AsyncStorage.removeItem(key);
      } else {
        // 사용자의 모든 오늘의 운세 캐시 삭제
        const allKeys = await AsyncStorage.getAllKeys();
        const userFortuneKeys = allKeys.filter(key => 
          key.startsWith(`${this.TODAY_FORTUNE_PREFIX}${userId}_`)
        );
        
        if (userFortuneKeys.length > 0) {
          await AsyncStorage.multiRemove(userFortuneKeys);
        }
      }
    } catch (error) {
      console.error('오늘의 운세 캐시 삭제 실패:', error);
    }
  }

  /**
   * 모든 오늘의 운세 캐시 삭제
   */
  static async clearAllTodayFortuneCache(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const fortuneKeys = allKeys.filter(key => 
        key.startsWith(this.TODAY_FORTUNE_PREFIX)
      );
      
      if (fortuneKeys.length > 0) {
        await AsyncStorage.multiRemove(fortuneKeys);
        console.log(`모든 오늘의 운세 캐시 삭제 완료 (${fortuneKeys.length}개 키)`);
      }
    } catch (error) {
      console.error('전체 오늘의 운세 캐시 삭제 실패:', error);
    }
  }

  /**
   * 오래된 캐시 정리 (7일 이상 된 것들)
   */
  static async cleanupOldCache(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const fortuneKeys = allKeys.filter(key => 
        key.startsWith(this.TODAY_FORTUNE_PREFIX)
      );
      
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const keysToRemove: string[] = [];
      
      for (const key of fortuneKeys) {
        try {
          const cached = await AsyncStorage.getItem(key);
          if (cached) {
            const data: CachedTodayFortune = JSON.parse(cached);
            const cachedDate = new Date(data.cachedAt);
            
            if (cachedDate < sevenDaysAgo) {
              keysToRemove.push(key);
            }
          }
        } catch (error) {
          // 파싱 실패한 키는 삭제 대상에 추가
          keysToRemove.push(key);
        }
      }
      
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
        console.log(`오래된 오늘의 운세 캐시 ${keysToRemove.length}개 삭제 완료`);
      }
    } catch (error) {
      console.error('오늘의 운세 캐시 정리 실패:', error);
    }
  }
}
