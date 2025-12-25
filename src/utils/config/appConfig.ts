/**
 * 앱 설정 조회 유틸리티
 * config 테이블에서 설정값을 조회하고 캐싱합니다
 */
import { supabase } from '../database/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { withSupabaseRetry } from '../network/retry';

const CONFIG_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24시간
const CONFIG_CACHE_KEY = 'app_config_cache';

interface ConfigCache {
  [key: string]: {
    value: string;
    expiresAt: number;
  };
}

/**
 * config 테이블에서 설정값 조회 (캐싱 포함)
 * @param key - 설정 키
 * @param forceRefresh - true면 캐시를 무시하고 DB에서 직접 조회
 */
export async function getAppConfig(key: string, forceRefresh: boolean = false): Promise<string | null> {
  try {
    // 1. 캐시 확인 (forceRefresh가 false일 때만)
    if (!forceRefresh) {
      const cacheData = await AsyncStorage.getItem(CONFIG_CACHE_KEY);
      if (cacheData) {
        const cache: ConfigCache = JSON.parse(cacheData);
        const cached = cache[key];
        if (cached && cached.expiresAt > Date.now()) {
          return cached.value;
        }
      }
    }

    // 2. DB 조회 (재시도 로직 포함)
    const { data, error } = await withSupabaseRetry<{ value: string }[]>(async () => {
      return await supabase
        .from('config')
        .select('value')
        .eq('key', key)
        .limit(1);
    });

    if (error) {
      console.warn(`Config 조회 실패 (key: ${key}):`, error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const value = data[0].value as string;

    // 3. 캐시 저장
    const cacheData = await AsyncStorage.getItem(CONFIG_CACHE_KEY);
    const currentCache: ConfigCache = cacheData ? JSON.parse(cacheData) : {};
    currentCache[key] = {
      value,
      expiresAt: Date.now() + CONFIG_CACHE_TTL_MS,
    };
    await AsyncStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(currentCache));

    return value;
  } catch (error) {
    console.error('Config 조회 오류:', error);
    return null;
  }
}


