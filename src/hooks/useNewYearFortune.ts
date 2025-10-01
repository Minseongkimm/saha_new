/**
 * 신년운세 커스텀 훅
 * 캐시 → DB → AI 생성 순서로 데이터 로딩
 */

import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import newYearFortuneService, { NewYearFortuneData } from '../services/ai/newYearFortuneService';
import { getCachedNewYearFortune, setCachedNewYearFortune, isCacheValid } from '../utils/newYearFortuneCache';
import { useSajuData } from './useSajuData';

interface UseNewYearFortuneResult {
  fortuneData: NewYearFortuneData | null;
  sajuData: any;
  loading: boolean;
  sajuLoading: boolean;
  sajuInitializing: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useNewYearFortune = (targetYear?: number): UseNewYearFortuneResult => {
  const [fortuneData, setFortuneData] = useState<NewYearFortuneData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 사주 데이터 로드 (기존 훅 재사용)
  const { sajuData, loading: sajuLoading, initializing: sajuInitializing } = useSajuData();

  // 목표 연도 (기본값: 다음 해)
  const year = targetYear || new Date().getFullYear() + 1;

  useEffect(() => {
    if (!sajuInitializing && !sajuLoading && sajuData) {
      loadNewYearFortune();
    }
  }, [sajuInitializing, sajuLoading, sajuData, year]);

  /**
   * 신년운세 로드 (캐시 → DB → AI 생성)
   */
  const loadNewYearFortune = async () => {
    if (!sajuData) return;

    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('로그인이 필요합니다');
        return;
      }

      // 1단계: 캐시 확인
      const cached = await getCachedNewYearFortune(user.id, year);
      if (cached && isCacheValid(cached, year)) {
        console.log('✅ 캐시에서 신년운세 로드:', year);
        setFortuneData(cached);
        setLoading(false);
        return;
      }

      // 2단계: DB 확인
      const dbData = await newYearFortuneService.getFromDatabase(user.id, year);
      if (dbData) {
        console.log('✅ DB에서 신년운세 로드:', year);
        setFortuneData(dbData);
        
        // 캐시에 저장
        await setCachedNewYearFortune(user.id, year, dbData);
        setLoading(false);
        return;
      }

      // 3단계: AI로 새로 생성
      console.log('🤖 AI로 신년운세 생성 중:', year);
      const newData = await newYearFortuneService.generateNewYearFortune(
        user.id,
        sajuData,
        year
      );
      
      setFortuneData(newData);
      
      // 캐시에 저장
      await setCachedNewYearFortune(user.id, year, newData);
      
      console.log('✅ 신년운세 생성 완료:', year);
    } catch (err) {
      console.error('신년운세 로드 오류:', err);
      setError(err instanceof Error ? err.message : '운세를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 재조회
   */
  const refetch = async () => {
    if (sajuData) {
      await loadNewYearFortune();
    }
  };

  return {
    fortuneData,
    sajuData,
    loading,
    sajuLoading,
    sajuInitializing,
    error,
    refetch,
  };
};

