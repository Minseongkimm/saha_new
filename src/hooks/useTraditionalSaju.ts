import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { SajuCache } from '../utils/sajuCache';
import { streamTraditionalSaju } from '../services/ai/edgeFunctionClient';
import { useSajuData } from './useSajuData';
import { useAnalysisData } from './useAnalysisData';
import { TraditionalSajuData } from '../types/streaming';

/**
 * 정통사주 데이터 및 스트리밍 관리 훅 (Edge Function 버전)
 */
export const useTraditionalSaju = () => {
  // 사주 데이터 로딩
  const { sajuData, loading: sajuLoading, initializing: sajuInitializing, error: sajuError } = useSajuData();
  
  // Edge Function 스트리밍 상태
  const [streamingText, setStreamingText] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamingError, setStreamingError] = useState<Error | null>(null);
  
  // 분석 데이터 관리
  const {
    data: analysisData,
    loading: analysisLoading,
    setLoading: setAnalysisLoading,
    setData: setAnalysisData,
    checkCache,
    checkDatabase,
    saveToDatabase,
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
   * Edge Function으로 정통사주 분석 생성 (실시간 스트리밍)
   */
  const generateAnalysis = async () => {
    if (!sajuData) return;

    try {
      setIsStreaming(true);
      setStreamingError(null);
      setStreamingText('');

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

      let fullText = '';

      // Edge Function 실시간 스트리밍 (React Native 콜백 방식)
      fullText = await streamTraditionalSaju(analysisInput, (chunk) => {
        setStreamingText((prev) => prev + chunk);
      });

      // 스트리밍 완료 - 섹션별로 파싱
      const parsedAnalysis = parseTraditionalSajuText(fullText);
      setAnalysisData(parsedAnalysis);

      // 저장
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: birthData } = await supabase
          .from('birth_infos')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (birthData) {
          await SajuCache.setCachedAnalysis(user.id, parsedAnalysis);
          await saveToDatabase(user.id, birthData.id, parsedAnalysis);
        }
      }

      setIsStreaming(false);
    } catch (error) {
      console.error('정통사주 분석 생성 실패:', error);
      setStreamingError(error instanceof Error ? error : new Error('Unknown error'));
      setIsStreaming(false);
    }
  };

  /**
   * 스트리밍된 텍스트를 섹션별로 파싱
   */
  const parseTraditionalSajuText = (text: string): TraditionalSajuData => {
    const extractSection = (sectionTitle: string): string => {
      const patterns = [
        new RegExp(`###\\s*\\d*\\.?\\s*${sectionTitle}[\\s\\S]*?(?=###|$)`),
        new RegExp(`${sectionTitle}[\\s\\S]*?(?=###|$)`),
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          let content = match[0];
          content = content.replace(new RegExp(`###\\s*\\d*\\.?\\s*${sectionTitle}`, 'g'), '');
          content = content.replace(new RegExp(`${sectionTitle}`, 'g'), '');
          return content.trim() || '해당 섹션 내용이 비어있습니다.';
        }
      }

      return '해당 섹션을 찾을 수 없습니다.';
    };

    return {
      overall: extractSection('전체적인 풀이'),
      dayStem: extractSection('일간 풀이'),
      fiveElements: extractSection('오행 균형'),
      sasin: extractSection('십성 구조'),
      sinsal: extractSection('신살 해석'),
      comprehensiveAdvice: extractSection('종합 조언'),
      generatedAt: new Date().toISOString(),
      llmModel: 'gpt-4o (Edge Function)',
    };
  };

  return {
    sajuData,
    sajuLoading,
    sajuInitializing,
    sajuError,
    analysisData,
    analysisLoading,
    streamingText,
    isStreaming,
    streamingError,
    generateAnalysis
  };
};
