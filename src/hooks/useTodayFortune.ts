import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../utils/database/supabaseClient';
import { TodayFortuneCache } from '../utils/today-fortune/todayFortuneCache';
import { streamTodayFortune } from '../services/ai/edgeFunctionClient';
import { useAnalysisData } from './useAnalysisData';
import { TodayFortuneData } from '../types/streaming';
import { useSajuData } from './useSajuData';
import { todayFortuneCalculator, TodayFortuneResult } from '../utils/today-fortune/todayFortuneCalculator';
import { getCurrentUserSafely } from '../utils/user/authUtils';
import { getKoreanDateString } from '../utils/date/koreanDate';

type ToneLevel = 'very_bad' | 'bad' | 'neutral' | 'good' | 'very_good';

const getToneLevel = (score: number): ToneLevel => {
  if (score <= 20) return 'very_bad';
  if (score <= 40) return 'bad';
  if (score <= 60) return 'neutral';
  if (score <= 80) return 'good';
  return 'very_good';
};

/**
 * 오늘의 운세 데이터 및 스트리밍 관리 훅
 */
export const useTodayFortune = () => {
  // 사주 데이터 로딩
  const { sajuData, loading: sajuLoading, initializing: sajuInitializing, error: sajuError } = useSajuData();
  
  // 스트리밍 상태
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamingJsonText, setStreamingJsonText] = useState<string>('');
  const [calculatedResult, setCalculatedResult] = useState<TodayFortuneResult | null>(null);
  
  // 분석 데이터 관리
  const {
    data: fortuneData,
    setData: setFortuneData,
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

      const { status, user } = await getCurrentUserSafely();
      if (status === 'network_error') {
        setFortuneLoading(false);
        return;
      }
      if (status === 'unauthenticated' || !user) {
        setFortuneLoading(false);
        return;
      }

      const today = getKoreanDateString();

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
        await TodayFortuneCache.setCachedTodayFortune(user.id, dbFortune);
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
   * 오늘의 운세 생성 (Edge Function 사용)
   */
  const generateFortune = async () => {
    if (!sajuData) return;

    try {
      setIsStreaming(true);
      setStreamingJsonText('');

      const calculatedSaju = sajuData.calculatedSaju;
      if (!calculatedSaju) {
        Alert.alert('오류', '사주 데이터가 없습니다.');
        setIsStreaming(false);
        return;
      }

      const today = getKoreanDateString();

      // 1. 클라이언트에서 운세 계산 (점수만)
      const fiveProperties = calculatedSaju?.fiveProperties || {};
      const transformedSajuData = {
        yearGanji: calculatedSaju?.yearHangulGanji || '',
        monthGanji: calculatedSaju?.monthHangulGanji || '',
        dayGanji: calculatedSaju?.dayHangulGanji || '',
        timeGanji: calculatedSaju?.timeHangulGanji || '',
        sinsal: calculatedSaju?.sinsal || {
          yearSinsal: [],
          monthSinsal: [],
          daySinsal: [],
          timeSinsal: []
        },
        guin: calculatedSaju?.guin || {},
        jijiRelations: calculatedSaju?.jijiRelations || {
          삼합: [],
          육합: [],
          삼형: [],
          육충: [],
          방합: []
        },
        fiveProperties: {
          yearProperty: fiveProperties?.yearProperty || '',
          monthProperty: fiveProperties?.monthProperty || '',
          dayProperty: fiveProperties?.dayProperty || '',
          timeProperty: fiveProperties?.timeProperty || ''
        },
        gongmang: calculatedSaju?.gongmang || ''
      };

      const calculatedFortune = todayFortuneCalculator.calculateTodayFortune(transformedSajuData, today);
      setCalculatedResult(calculatedFortune);

      // 2. Edge Function으로 LLM 텍스트 생성 (스트리밍)
      const fullJsonText = await streamTodayFortune(
        calculatedFortune as unknown as Record<string, unknown>,
        sajuData as unknown as Record<string, unknown>,
        today,
        (chunk: string) => {
          setStreamingJsonText((prev) => {
            const newText = prev + chunk;
            // 실시간 파싱 시도
            tryParseAndUpdate(newText, calculatedFortune);
            return newText;
          });
        }
      );

      // 3. 최종 파싱 및 저장
      const llmData = parseTodayFortuneJson(fullJsonText);

      const overallToneLevel: ToneLevel = getToneLevel(calculatedFortune.totalScore);
      const careerToneLevel: ToneLevel = getToneLevel(calculatedFortune.categoryScores.career);
      const loveToneLevel: ToneLevel = getToneLevel(calculatedFortune.categoryScores.love);
      const wealthToneLevel: ToneLevel = getToneLevel(calculatedFortune.categoryScores.wealth);
      const relationshipToneLevel: ToneLevel = getToneLevel(calculatedFortune.categoryScores.relationship);

      const rawExplanation: string = llmData.explanation || '사주상 특별한 변화는 없습니다.';
      const explanation: string = rawExplanation;

      const careerDescription: string = llmData.categories?.career || '';
      const loveDescription: string = llmData.categories?.love || '';
      const wealthDescription: string = llmData.categories?.wealth || '';
      const relationshipDescription: string = llmData.categories?.relationship || '';

      const finalFortuneData: TodayFortuneData = {
        score: calculatedFortune.totalScore,
        summary: llmData.summary || '',
        explanation,
        doList: llmData.doList || ['긍정적인 마음가짐을 유지하세요'],
        dontList: llmData.dontList || ['성급한 판단을 피하세요'],
        categories: {
          career: {
            score: calculatedFortune.categoryScores.career,
            description: careerDescription
          },
          love: {
            score: calculatedFortune.categoryScores.love,
            description: loveDescription
          },
          wealth: {
            score: calculatedFortune.categoryScores.wealth,
            description: wealthDescription
          },
          relationship: {
            score: calculatedFortune.categoryScores.relationship,
            description: relationshipDescription
          }
        },
        interactions: {
          tenGod: {
            label: calculatedFortune.interactions.tenGodInteraction.label,
            score: calculatedFortune.interactions.tenGodInteraction.score,
            description: calculatedFortune.interactions.tenGodInteraction.description
          },
          jiDetails: {
            hasHyeong: calculatedFortune.interactions.detailedJiRelations.hasHyeong,
            hasPa: calculatedFortune.interactions.detailedJiRelations.hasPa,
            hasHae: calculatedFortune.interactions.detailedJiRelations.hasHae,
            summary: calculatedFortune.interactions.detailedJiRelations.summary,
            score: calculatedFortune.interactions.detailedJiRelations.score
          },
          fiveElementBalance: calculatedFortune.interactions.fiveElementBalance
            ? {
                counts: calculatedFortune.interactions.fiveElementBalance.counts,
                todayElement: calculatedFortune.interactions.fiveElementBalance.todayElement,
                weakest: calculatedFortune.interactions.fiveElementBalance.weakest,
                strongest: calculatedFortune.interactions.fiveElementBalance.strongest,
                score: calculatedFortune.interactions.fiveElementBalance.score,
                explanation: calculatedFortune.interactions.fiveElementBalance.explanation
              }
            : undefined
        },
        context: {
          todayGanji: calculatedFortune.todayGanji.dayGanji,
          personalDayGanji: calculatedFortune.personalSaju.dayGanji
        },
        generatedAt: new Date().toISOString(),
        date: today,
        llmModel: 'gpt-4o-mini'
      };

      setFortuneData(finalFortuneData);
      setIsStreaming(false);
      setStreamingJsonText('');

      // 4. 캐시 및 DB 저장
      const { status, user } = await getCurrentUserSafely();
      if (status !== 'authenticated' || !user) return;

      const { data: birthData } = await supabase
        .from('birth_info')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (birthData) {
        await TodayFortuneCache.setCachedTodayFortune(user.id, finalFortuneData);
        await saveToDatabase(user.id, birthData.id, finalFortuneData);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error || '알 수 없는 오류');
      console.error('❌ 오늘의 운세 생성 실패:', errorMessage);
      setIsStreaming(false);
      setStreamingJsonText('');
      Alert.alert('오류', '오늘의 운세를 생성할 수 없습니다.');
    }
  };

  /**
   * 실시간 JSON 파싱 및 업데이트 (제거 - 화면에서 직접 파싱)
   */
  const tryParseAndUpdate = (text: string, calculatedFortune: TodayFortuneResult) => {
    // 아무것도 안 함 - 화면에서 streamingJsonText를 직접 파싱
  };

  /**
   * JSON 파싱 헬퍼
   */
  const parseTodayFortuneJson = (text: string): {
    summary?: string;
    explanation?: string;
    categories?: {
      career?: string;
      love?: string;
      wealth?: string;
      relationship?: string;
    };
    doList?: string[];
    dontList?: string[];
  } => {
    try {
      // JSON 블록 추출
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        let jsonStr = jsonMatch[0];
        // 먼저 JSON 파싱 시도
        try {
          const parsed = JSON.parse(jsonStr);
          return parsed;
        } catch (e) {
          // 제어 문자 제거 후 재시도
          jsonStr = jsonStr.replace(/[\u0000-\u001F]/g, ' ');
          const parsed = JSON.parse(jsonStr);
          return parsed;
        }
      }
    } catch (e) {
      // JSON 파싱 실패 시 regex로 부분 추출
      const summary = text.match(/"summary":\s*"([^"]*)"/)?.[1];
      const explanation = text.match(/"explanation":\s*"([^"]*)"/)?.[1];
      
      const careerMatch = text.match(/"career":\s*"([^"]*)"/)?.[1];
      const loveMatch = text.match(/"love":\s*"([^"]*)"/)?.[1];
      const wealthMatch = text.match(/"wealth":\s*"([^"]*)"/)?.[1];
      const relationshipMatch = text.match(/"relationship":\s*"([^"]*)"/)?.[1];
      
      return {
        summary,
        explanation,
        categories: {
          career: careerMatch,
          love: loveMatch,
          wealth: wealthMatch,
          relationship: relationshipMatch
        }
      };
    }
    return {};
  };

  return {
    sajuData,
    sajuLoading,
    sajuInitializing,
    sajuError,
    fortuneData,
    fortuneLoading,
    isStreaming,
    streamingJsonText,
    calculatedResult,
    generateFortune
  };
};
