import { useState, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';

/**
 * 분석 데이터 관리 훅 (정통사주, 오늘의 운세 공통)
 * 캐시 → DB 확인 → 생성 → DB 저장 플로우 처리
 */
export const useAnalysisData = <T,>(
  cacheKey: string,
  dbTableName: string,
  dbFieldName: string
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 캐시에서 데이터 확인
   */
  const checkCache = useCallback(async (
    getCacheFn: (userId: string, ...args: any[]) => Promise<T | null>,
    userId: string,
    ...args: any[]
  ): Promise<T | null> => {
    try {
      const cachedData = await getCacheFn(userId, ...args);
      if (cachedData) {
        setData(cachedData);
        return cachedData;
      }
      return null;
    } catch (err) {
      console.error(`${cacheKey} 캐시 확인 실패:`, err);
      return null;
    }
  }, [cacheKey]);

  /**
   * DB에서 데이터 확인
   */
  const checkDatabase = useCallback(async (
    userId: string,
    birthInfoId?: string,
    dateFilter?: string
  ): Promise<T | null> => {
    try {
      let query = supabase
        .from(dbTableName)
        .select(`${dbFieldName}, birth_info_id`)
        .eq('user_id', userId);

      if (birthInfoId) {
        query = query.eq('birth_info_id', birthInfoId);
      }

      if (dbFieldName === 'daily_fortune' && dateFilter) {
        query = query.not(dbFieldName, 'is', null);
      } else {
        query = query.not(dbFieldName, 'is', null);
      }

      const { data: dbData, error: dbError } = await query.single();

      if (!dbError && dbData) {
        const fetchedData = (dbData as any)[dbFieldName];
        
        // 오늘의 운세인 경우 날짜 확인
        if (dbFieldName === 'daily_fortune' && dateFilter) {
          if (fetchedData.date === dateFilter) {
            setData(fetchedData);
            return fetchedData;
          }
          return null;
        }
        
        setData(fetchedData);
        return fetchedData;
      }
      
      return null;
    } catch (err) {
      console.error(`${dbTableName} DB 확인 실패:`, err);
      return null;
    }
  }, [dbTableName, dbFieldName]);

  /**
   * DB에 데이터 저장
   */
  const saveToDatabase = useCallback(async (
    userId: string,
    birthInfoId: string,
    analysisData: T
  ): Promise<boolean> => {
    try {
      // 기존 레코드 확인
      const { data: existingData } = await supabase
        .from(dbTableName)
        .select('id')
        .eq('user_id', userId)
        .eq('birth_info_id', birthInfoId)
        .single();

      let error;
      if (existingData) {
        // 업데이트
        const { error: updateError } = await supabase
          .from(dbTableName)
          .update({
            [dbFieldName]: analysisData,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('birth_info_id', birthInfoId);
        
        error = updateError;
      } else {
        // 삽입
        const { error: insertError } = await supabase
          .from(dbTableName)
          .insert({
            user_id: userId,
            birth_info_id: birthInfoId,
            [dbFieldName]: analysisData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        error = insertError;
      }

      if (error) {
        console.error(`${dbTableName} 저장 실패:`, error);
        return false;
      }

      return true;
    } catch (err) {
      console.error(`${dbTableName} 저장 실패:`, err);
      return false;
    }
  }, [dbTableName, dbFieldName]);

  /**
   * 캐시에 저장
   */
  const saveToCache = useCallback(async (
    setCacheFn: (userId: string, data: T, ...args: any[]) => Promise<void>,
    userId: string,
    analysisData: T,
    ...args: any[]
  ): Promise<void> => {
    try {
      await setCacheFn(userId, analysisData, ...args);
    } catch (err) {
      console.error(`${cacheKey} 캐시 저장 실패:`, err);
    }
  }, [cacheKey]);

  return {
    data,
    loading,
    error,
    setData,
    setLoading,
    setError,
    checkCache,
    checkDatabase,
    saveToDatabase,
    saveToCache
  };
};
