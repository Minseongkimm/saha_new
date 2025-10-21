import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { supabase } from '../utils/supabaseClient';
import { getCachedNewYearFortune, clearNewYearFortuneCache } from '../utils/newYearFortuneCache';
import { SajuCache } from '../utils/sajuCache';
import { TodayFortuneCache } from '../utils/todayFortuneCache';

/**
 * 캐시 디버깅 패널 컴포넌트
 * 개발/테스트 시에만 사용
 */
const CacheDebugPanel: React.FC = () => {
  // 캐시 정보 확인
  const checkCacheInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const sajuCache = await SajuCache.getCachedCalculatedSaju(user.id);
    const todayCache = await TodayFortuneCache.getCachedTodayFortune(user.id, new Date().toISOString().split('T')[0]);
    const newYearCache = await getCachedNewYearFortune(user.id, 2026);

    console.log('=== 캐시 정보 ===');
    console.log('사주 캐시:', sajuCache ? '있음' : '없음');
    console.log('오늘운세 캐시:', todayCache ? '있음' : '없음');
    console.log('신년운세 캐시:', newYearCache ? '있음' : '없음');
    
    if (sajuCache) {
      console.log('사주 캐시 데이터:', sajuCache);
    }
    if (todayCache) {
      console.log('오늘운세 캐시 데이터:', todayCache);
    }
    if (newYearCache) {
      console.log('신년운세 캐시 데이터:', newYearCache);
    }
    console.log('================');
  };

  // 모든 캐시 삭제
  const clearAllCache = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      console.log('=== 캐시 삭제 시작 ===');
      await SajuCache.clearCalculatedSajuCache(user.id);
      console.log('사주 캐시 삭제 완료');
      
      await TodayFortuneCache.clearTodayFortuneCache(user.id);
      console.log('오늘운세 캐시 삭제 완료');
      
      await clearNewYearFortuneCache(user.id, 2026);
      console.log('신년운세 캐시 삭제 완료');
      
      console.log('=== 모든 캐시 삭제 완료 ===');
    } catch (error) {
      console.error('캐시 삭제 중 오류:', error);
    }
  };

  // 개별 캐시 삭제 함수들
  const clearSajuCache = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      console.log('=== 사주 캐시 삭제 ===');
      await SajuCache.clearCalculatedSajuCache(user.id);
      console.log('사주 캐시 삭제 완료');
    } catch (error) {
      console.error('사주 캐시 삭제 중 오류:', error);
    }
  };

  const clearTodayCache = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      console.log('=== 오늘운세 캐시 삭제 ===');
      await TodayFortuneCache.clearTodayFortuneCache(user.id);
      console.log('오늘운세 캐시 삭제 완료');
    } catch (error) {
      console.error('오늘운세 캐시 삭제 중 오류:', error);
    }
  };

  const clearNewYearCache = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      console.log('=== 신년운세 캐시 삭제 ===');
      await clearNewYearFortuneCache(user.id, 2026);
      console.log('신년운세 캐시 삭제 완료');
    } catch (error) {
      console.error('신년운세 캐시 삭제 중 오류:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* 전체 캐시 관리 버튼 */}
      <View style={styles.cacheSection}>
        <TouchableOpacity 
          style={styles.cacheButton} 
          onPress={checkCacheInfo}
        >
          <Text style={styles.cacheButtonText}>캐시 확인</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.cacheButton, styles.clearButton]} 
          onPress={clearAllCache}
        >
          <Text style={styles.cacheButtonText}>전체 삭제</Text>
        </TouchableOpacity>
      </View>

      {/* 개별 캐시 삭제 버튼 */}
      <View style={styles.individualCacheSection}>
        <TouchableOpacity 
          style={[styles.individualCacheButton, styles.sajuCacheButton]} 
          onPress={clearSajuCache}
        >
          <Text style={styles.individualCacheButtonText}>사주 캐시 삭제</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.individualCacheButton, styles.todayCacheButton]} 
          onPress={clearTodayCache}
        >
          <Text style={styles.individualCacheButtonText}>오늘운세 캐시 삭제</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.individualCacheButton, styles.newYearCacheButton]} 
          onPress={clearNewYearCache}
        >
          <Text style={styles.individualCacheButtonText}>신년운세 캐시 삭제</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  cacheSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  cacheButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  clearButton: {
    backgroundColor: '#ff6b6b',
  },
  cacheButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  individualCacheSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  individualCacheButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginHorizontal: 2,
    marginVertical: 2,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  sajuCacheButton: {
    backgroundColor: '#e3f2fd',
    borderColor: '#bbdefb',
  },
  todayCacheButton: {
    backgroundColor: '#f3e5f5',
    borderColor: '#ce93d8',
  },
  newYearCacheButton: {
    backgroundColor: '#e8f5e8',
    borderColor: '#a5d6a7',
  },
  individualCacheButtonText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
});

export default CacheDebugPanel;

