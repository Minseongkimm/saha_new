import { useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { SajuCache } from '../utils/sajuCache';
import { traditionalSajuService } from '../services/ai/traditionalSajuService';
import { useSajuData } from './useSajuData';
import { useStreamingData } from './useStreamingData';
import { useAnalysisData } from './useAnalysisData';
import { TraditionalSajuData } from '../types/streaming';
import { initialTraditionalSajuData, traditionalSajuStreamingConfig } from '../config/streamingConfigs';

/**
 * 정통사주 데이터 및 스트리밍 관리 훅
 */
export const useTraditionalSaju = () => {
  // 사주 데이터 로딩
  const { sajuData, loading: sajuLoading, initializing: sajuInitializing, error: sajuError } = useSajuData();
  
  // 스트리밍 관리
  const { streamingData, finalData, isStreaming, startStreaming } = useStreamingData<TraditionalSajuData>(
    initialTraditionalSajuData,
    traditionalSajuStreamingConfig
  );
  
  // 분석 데이터 관리
  const {
    data: analysisData,
    loading: analysisLoading,
    setLoading: setAnalysisLoading,
    checkCache,
    checkDatabase,
    saveToDatabase,
    saveToCache
  } = useAnalysisData<TraditionalSajuData>(
    'traditional_analysis',
    'saju_analyses',
    'traditional_analysis'
  );

  // 사주 데이터가 로드되면 분석 데이터 확인
  useEffect(() => {
    if (sajuData && !analysisData && !analysisLoading) {
      loadAnalysisData();
    }
  }, [sajuData]);

  /**
   * 분석 데이터 로드 (캐시 → DB → 생성)
   */
  const loadAnalysisData = async () => {
    if (!sajuData) return;

    try {
      setAnalysisLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAnalysisLoading(false);
        return;
      }

      // 1. 캐시 확인
      const cachedAnalysis = await checkCache(
        SajuCache.getCachedAnalysis,
        user.id
      );
      if (cachedAnalysis) {
        setAnalysisLoading(false);
        return;
      }

      // 2. DB 확인
      const { data: birthData } = await supabase
        .from('birth_infos')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (birthData) {
        const dbAnalysis = await checkDatabase(user.id, birthData.id);
        if (dbAnalysis) {
          // 캐시에도 저장
          await SajuCache.setCachedAnalysis(user.id, dbAnalysis);
          setAnalysisLoading(false);
          return;
        }
      }

      // 3. 캐시와 DB 모두 없으면 생성
      setAnalysisLoading(false);
      await generateAnalysis();
    } catch (error) {
      console.error('분석 데이터 로드 실패:', error);
      setAnalysisLoading(false);
    }
  };

  /**
   * 정통사주 분석 생성
   */
  const generateAnalysis = async () => {
    if (!sajuData) return;

    try {
      // 분석 입력 데이터 구성
      const analysisInput = {
        name: sajuData.name,
        birthInfo: `${sajuData.birthYear}년 ${sajuData.birthMonth}월 ${sajuData.birthDay}일 ${sajuData.birthHour}:${sajuData.birthMinute} (${sajuData.gender === 'male' ? '남성' : '여성'})`,
        yearGanji: sajuData.calculatedSaju.yearHangulGanji,
        monthGanji: sajuData.calculatedSaju.monthHangulGanji,
        dayGanji: sajuData.calculatedSaju.dayHangulGanji,
        timeGanji: sajuData.calculatedSaju.timeHangulGanji,
        stemSasin: sajuData.calculatedSaju.stemSasin,
        branchSasin: sajuData.calculatedSaju.branchSasin,
        sibun: sajuData.calculatedSaju.sibun,
        fiveProperties: sajuData.calculatedSaju.fiveProperties,
        sinsal: sajuData.calculatedSaju.sinsal,
        guin: sajuData.calculatedSaju.guin,
        gongmang: sajuData.calculatedSaju.gongmang,
        jijiAmjangan: sajuData.calculatedSaju.jijiAmjangan,
        jijiRelations: sajuData.calculatedSaju.jijiRelations
      };

      // LLM 분석 생성
      const analysis = await traditionalSajuService.generateSajuAnalysis(analysisInput);

      // 스트리밍 시작
      startStreaming(analysis);

      // 저장
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: birthData } = await supabase
          .from('birth_infos')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (birthData) {
          // 캐시에 저장
          await SajuCache.setCachedAnalysis(user.id, analysis);
          
          // DB에 저장
          await saveToDatabase(user.id, birthData.id, analysis);
        }
      }
    } catch (error) {
      console.error('정통사주 분석 생성 실패:', error);
    }
  };

  return {
    sajuData,
    sajuLoading,
    sajuInitializing,
    sajuError,
    analysisData,
    analysisLoading,
    streamingData,
    finalData,
    isStreaming,
    generateAnalysis
  };
};
