import { useEffect } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../utils/supabaseClient';
import { TodayFortuneCache } from '../utils/todayFortuneCache';
import { todayFortuneService } from '../services/ai/todayFortuneService';
import { useStreamingData } from './useStreamingData';
import { useAnalysisData } from './useAnalysisData';
import { TodayFortuneData } from '../types/streaming';
import { initialTodayFortuneData, todayFortuneStreamingConfig } from '../config/streamingConfigs';
import { useSajuData } from './useSajuData';

/**
 * 오늘의 운세 데이터 및 스트리밍 관리 훅
 */
export const useTodayFortune = () => {
  // 사주 데이터 로딩
  const { sajuData, loading: sajuLoading, error: sajuError } = useSajuData();
  
  // 스트리밍 관리
  const { streamingData, finalData, isStreaming, startStreaming } = useStreamingData<TodayFortuneData>(
    initialTodayFortuneData,
    todayFortuneStreamingConfig
  );
  
  // 분석 데이터 관리
  const {
    data: fortuneData,
    loading: fortuneLoading,
    setLoading: setFortuneLoading,
    checkCache,
    checkDatabase,
    saveToDatabase,
    saveToCache
  } = useAnalysisData<TodayFortuneData>(
    'daily_fortune',
    'saju_analyses',
    'daily_fortune'
  );

  // 사주 데이터가 로드되면 오늘의 운세 확인
  useEffect(() => {
    if (sajuData && !fortuneData && !fortuneLoading) {
      loadTodayFortune();
    }
  }, [sajuData]);

  /**
   * 오늘의 운세 로드 (캐시 → DB → 생성)
   */
  const loadTodayFortune = async () => {
    if (!sajuData) return;

    try {
      setFortuneLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setFortuneLoading(false);
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      // 1. 캐시 확인
      const cachedFortune = await checkCache(
        TodayFortuneCache.getCachedTodayFortune,
        user.id,
        today
      );
      if (cachedFortune) {
        setFortuneLoading(false);
        return;
      }

      // 2. DB 확인
      const dbFortune = await checkDatabase(user.id, undefined, today);
      if (dbFortune) {
        // 캐시에도 저장
        await saveToCache(TodayFortuneCache.setCachedTodayFortune, user.id, dbFortune);
        setFortuneLoading(false);
        return;
      }

      // 3. 캐시와 DB 모두 없으면 생성
      setFortuneLoading(false);
      await generateFortune();
    } catch (error) {
      console.error('오늘의 운세 로드 실패:', error);
      setFortuneLoading(false);
    }
  };

  /**
   * 오늘의 운세 생성
   */
  const generateFortune = async () => {
    if (!sajuData) return;

    try {
      const calculatedSaju = sajuData.calculatedSaju;
      if (!calculatedSaju) {
        Alert.alert('오류', '사주 데이터가 없습니다.');
        return;
      }

      // 운세 생성용 데이터 변환
      const transformedSajuData = {
        yearGanji: calculatedSaju.yearHangulGanji,
        monthGanji: calculatedSaju.monthHangulGanji,
        dayGanji: calculatedSaju.dayHangulGanji,
        timeGanji: calculatedSaju.timeHangulGanji,
        sinsal: calculatedSaju.sinsal,
        guin: calculatedSaju.guin,
        jijiRelations: calculatedSaju.jijiRelations,
        fiveProperties: {
          yearProperty: calculatedSaju.fiveProperties.yearProperty,
          monthProperty: calculatedSaju.fiveProperties.monthProperty,
          dayProperty: calculatedSaju.fiveProperties.dayProperty,
          timeProperty: calculatedSaju.fiveProperties.timeProperty
        },
        gongmang: calculatedSaju.gongmang
      };

      // 필수 필드 확인
      if (!transformedSajuData.yearGanji || !transformedSajuData.monthGanji || 
          !transformedSajuData.dayGanji || !transformedSajuData.timeGanji) {
        Alert.alert('오류', '사주 데이터가 불완전합니다. 사주 정보를 다시 입력해주세요.');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 오늘의 운세 생성
      const fortune = await todayFortuneService.generateTodayFortune(user.id, transformedSajuData);

      // 스트리밍 시작
      startStreaming(fortune);

      // birth_info_id 가져오기
      const { data: birthData } = await supabase
        .from('birth_infos')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (birthData) {
        // 캐시에 저장
        await saveToCache(TodayFortuneCache.setCachedTodayFortune, user.id, fortune);
        
        // DB에 저장
        await saveToDatabase(user.id, birthData.id, fortune);
      }
    } catch (error) {
      console.error('오늘의 운세 생성 실패:', error);
      Alert.alert('오류', '오늘의 운세를 생성할 수 없습니다.');
    }
  };

  return {
    sajuData,
    sajuLoading,
    sajuError,
    fortuneData,
    fortuneLoading,
    streamingData,
    finalData,
    isStreaming,
    generateFortune
  };
};
