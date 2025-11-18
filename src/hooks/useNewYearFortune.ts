/**
 * 신년운세 커스텀 훅
 * 캐시 → DB → AI 생성 순서로 데이터 로딩
 */

import { useState, useEffect } from 'react';
import { supabase } from '../utils/database/supabaseClient';
import newYearFortuneService, { NewYearFortuneData } from '../services/ai/newYearFortuneService';
import { streamNewYearFortune } from '../services/ai/edgeFunctionClient';
import { getCachedNewYearFortune, setCachedNewYearFortune, isCacheValid } from '../utils/new-year-fortune/newYearFortuneCache';
import { useSajuData } from './useSajuData';

interface UseNewYearFortuneResult {
  fortuneData: NewYearFortuneData | null;
  sajuData: any;
  loading: boolean;
  sajuLoading: boolean;
  sajuInitializing: boolean;
  isStreaming: boolean;
  streamingJsonText: string;
  calculatedResult: any;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useNewYearFortune = (targetYear?: number): UseNewYearFortuneResult => {
  const [fortuneData, setFortuneData] = useState<NewYearFortuneData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingJsonText, setStreamingJsonText] = useState<string>('');
  const [calculatedResult, setCalculatedResult] = useState<any>(null);
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
        setFortuneData(cached);
        setLoading(false);
        return;
      }

      // 2단계: DB 확인
      const dbData = await newYearFortuneService.getFromDatabase(user.id, year);
      if (dbData) {
        setFortuneData(dbData);
        
        // 캐시에 저장
        await setCachedNewYearFortune(user.id, year, dbData);
        setLoading(false);
        return;
      }

      // 3단계: Edge Function으로 스트리밍 생성
      await generateWithEdgeFunction(user.id, year);
    } catch (err) {
      console.error('신년운세 로드 오류:', err);
      setError(err instanceof Error ? err.message : '운세를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Edge Function으로 신년운세 생성 (실시간 스트리밍)
   */
  const generateWithEdgeFunction = async (userId: string, targetYear: number) => {
    if (!sajuData) return;

    try {
      setIsStreaming(true);
      setStreamingJsonText('');

      // 기존 서비스 활용 - 신년운세 계산만 수행
      const calcResult = newYearFortuneService.calculateNewYearFortuneOnly(sajuData, targetYear);
      setCalculatedResult(calcResult);

      // Edge Function 스트리밍
      const fullText = await streamNewYearFortune(
        sajuData as unknown as Record<string, unknown>, 
        calcResult as unknown as Record<string, unknown>, 
        targetYear, 
        (chunk) => {
          setStreamingJsonText((prev) => prev + chunk);
        }
      );

      // 최종 파싱
      const finalData = parseNewYearFortuneJson(fullText, calcResult, targetYear);
      setFortuneData(finalData);

      // 캐시 및 DB에 저장 (기존 서비스 활용)
      await setCachedNewYearFortune(userId, targetYear, finalData);
      await newYearFortuneService.saveToDatabase(userId, finalData);

      setIsStreaming(false);
      setStreamingJsonText('');
    } catch (error) {
      console.error('신년운세 생성 실패:', error);
      setIsStreaming(false);
      setStreamingJsonText('');
      throw error;
    }
  };

  /**
   * 최종 JSON 파싱
   */
  const parseNewYearFortuneJson = (
    jsonText: string,
    calculatedResult: any,
    targetYear: number
  ): NewYearFortuneData => {
    // JSON 블록 제거 및 정리
    let cleanedText = jsonText.replace(/```json|```/g, '').trim();
    
    // 불완전한 JSON 처리: 닫히지 않은 문자열이나 객체를 처리
    // 마지막 불완전한 문자열이나 객체를 제거
    if (!cleanedText.endsWith('}')) {
      // 가장 마지막 완전한 JSON 객체를 찾기
      const lastBraceIndex = cleanedText.lastIndexOf('}');
      if (lastBraceIndex > 0) {
        cleanedText = cleanedText.substring(0, lastBraceIndex + 1);
      } else {
        // 완전한 JSON이 없으면 기본값 반환
        console.warn('불완전한 JSON 응답:', cleanedText);
        throw new Error('JSON 응답이 불완전합니다. 다시 시도해주세요.');
      }
    }
    
    // JSON 문자열 내부의 제어 문자 처리
    // 먼저 JSON 파싱을 시도하고, 실패하면 제어 문자 제거 후 재시도
    let parsed: any;
    try {
      parsed = JSON.parse(cleanedText);
    } catch (e) {
      // 제어 문자 제거 (줄바꿈, 탭 등)
      cleanedText = cleanedText.replace(/[\u0000-\u001F]/g, ' ');
      try {
        parsed = JSON.parse(cleanedText);
      } catch (parseError) {
        console.error('JSON 파싱 실패:', parseError, '원본 텍스트:', jsonText.substring(0, 200));
        throw new Error('JSON 응답을 파싱할 수 없습니다. 다시 시도해주세요.');
      }
    }

    return {
      year: targetYear,
      yearName: calculatedResult.yearName,
      yearDescription: calculatedResult.yearDescription,
      yearGanji: calculatedResult.yearGanji,
      summary: parsed.summary || '',
      overall: parsed.overall || '',
      categories: {
        love: parsed.categories?.love || '',
        wealth: parsed.categories?.wealth || '',
        health: parsed.categories?.health || '',
        career: parsed.categories?.career || '',
      },
      luckyMonths: parsed.luckyMonths || [],
      cautiousMonths: parsed.cautiousMonths || [],
      generatedAt: new Date().toISOString(),
      llmModel: 'gpt-4o (Edge Function)',
    };
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
    isStreaming,
    streamingJsonText,
    calculatedResult,
    error,
    refetch,
  };
};

