import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CachedSajuData {
  calculatedSaju: any;
  cachedAt: string;
}

export interface CachedAnalysisData {
  llmAnalysis: any;
  cachedAt: string;
}

export class SajuCache {
  private static readonly CALCULATED_SAJU_PREFIX = 'saju_calculated_';
  private static readonly LLM_ANALYSIS_PREFIX = 'saju_analysis_';
  // LLM 해석도 영구 캐시 (계산 데이터와 동일하게)

  // ===== 만세력 표 데이터 (계산된 사주) =====
  
  /**
   * 계산된 사주 데이터를 캐시에서 조회
   */
  static async getCachedCalculatedSaju(userId: string): Promise<any | null> {
    try {
      const key = `${this.CALCULATED_SAJU_PREFIX}${userId}`;
      const cached = await AsyncStorage.getItem(key);
      
      if (!cached) return null;
      
      const data: CachedSajuData = JSON.parse(cached);
      return data.calculatedSaju;
    } catch (error) {
      console.error('계산된 사주 캐시 조회 실패:', error);
      return null;
    }
  }

  /**
   * 계산된 사주 데이터를 캐시에 저장 (영구 저장)
   */
  static async setCachedCalculatedSaju(userId: string, calculatedSaju: any): Promise<void> {
    try {
      const key = `${this.CALCULATED_SAJU_PREFIX}${userId}`;
      const dataToCache: CachedSajuData = {
        calculatedSaju,
        cachedAt: new Date().toISOString()
      };
      await AsyncStorage.setItem(key, JSON.stringify(dataToCache));
    } catch (error) {
      console.error('계산된 사주 캐시 저장 실패:', error);
    }
  }

  // ===== 사주 해석 데이터 (LLM 분석) =====
  
  /**
   * LLM 사주 해석 데이터를 캐시에서 조회 (영구 캐시)
   */
  static async getCachedAnalysis(userId: string): Promise<any | null> {
    try {
      const key = `${this.LLM_ANALYSIS_PREFIX}${userId}`;
      const cached = await AsyncStorage.getItem(key);
      
      if (!cached) return null;
      
      const data: CachedAnalysisData = JSON.parse(cached);
      return data.llmAnalysis; // 영구 캐시 - 만료일 체크 없음
    } catch (error) {
      console.error('사주 해석 캐시 조회 실패:', error);
      return null;
    }
  }

  /**
   * LLM 사주 해석 데이터를 캐시에 저장
   */
  static async setCachedAnalysis(userId: string, llmAnalysis: any): Promise<void> {
    try {
      const key = `${this.LLM_ANALYSIS_PREFIX}${userId}`;
      const dataToCache: CachedAnalysisData = {
        llmAnalysis,
        cachedAt: new Date().toISOString()
      };
      await AsyncStorage.setItem(key, JSON.stringify(dataToCache));
    } catch (error) {
      console.error('사주 해석 캐시 저장 실패:', error);
    }
  }

  // ===== 캐시 관리 =====
  
  /**
   * 특정 사용자의 계산된 사주 캐시 삭제
   */
  static async clearCalculatedSajuCache(userId: string): Promise<void> {
    try {
      const key = `${this.CALCULATED_SAJU_PREFIX}${userId}`;
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('계산된 사주 캐시 삭제 실패:', error);
    }
  }

  /**
   * 특정 사용자의 사주 해석 캐시 삭제
   */
  static async clearAnalysisCache(userId: string): Promise<void> {
    try {
      const key = `${this.LLM_ANALYSIS_PREFIX}${userId}`;
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('사주 해석 캐시 삭제 실패:', error);
    }
  }

  /**
   * 특정 사용자의 모든 사주 캐시 삭제
   */
  static async clearAllCache(userId: string): Promise<void> {
    await Promise.all([
      this.clearCalculatedSajuCache(userId),
      this.clearAnalysisCache(userId)
    ]);
  }

  /**
   * 사주 해석 캐시 정리 (수동 정리용)
   */
  static async cleanupAnalysisCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const analysisKeys = keys.filter(key => key.startsWith(this.LLM_ANALYSIS_PREFIX));
      
      // 필요시 특정 조건으로 정리 (현재는 영구 캐시이므로 비워둠)
      // 향후 필요시 특정 조건으로 정리 로직 추가 가능
    } catch (error) {
      console.error('사주 해석 캐시 정리 실패:', error);
    }
  }
}
