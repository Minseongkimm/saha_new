import { useState } from 'react';
import { StreamingConfig } from '../types/streaming';

/**
 * 제네릭 스트리밍 데이터 훅
 * @param initialData - 초기 빈 데이터 구조
 * @param config - 스트리밍 설정
 */
export const useStreamingData = <T extends Record<string, any>>(
  initialData: T,
  config: StreamingConfig
) => {
  const [streamingData, setStreamingData] = useState<T | null>(null);
  const [finalData, setFinalData] = useState<T | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  /**
   * 스트리밍 시작
   */
  const startStreaming = async (data: T) => {
    setIsStreaming(true);
    setFinalData(null);
    setStreamingData({ ...initialData, date: (data as any).date } as T);

    // 설정에 따라 순차적으로 스트리밍
    await executeStreaming(data);

    // 최종 데이터로 전환
    setTimeout(() => {
      setStreamingData(null);
      setFinalData(data);
      setIsStreaming(false);
    }, config.finalTransitionDelay || 2000);
  };

  /**
   * 스트리밍 실행
   */
  const executeStreaming = async (data: T) => {
    // 1. 점수 스트리밍 (있으면)
    if (config.score?.enabled && 'score' in data) {
      await streamScore(data.score as number);
    }

    // 2. 텍스트 필드 스트리밍
    if (config.text?.enabled && config.text.fields) {
      for (const field of config.text.fields) {
        if (field in data && typeof data[field] === 'string') {
          await streamTextField(field, data[field] as string, config.text);
        }
      }
    }

    // 3. 카테고리 스트리밍
    if (config.categories?.enabled && 'categories' in data) {
      await streamCategories(data.categories);
    }

    // 4. 리스트 스트리밍
    if (config.lists?.enabled) {
      if ('dontList' in data && Array.isArray(data.dontList)) {
        await streamList('dontList', data.dontList);
      }
      if ('doList' in data && Array.isArray(data.doList)) {
        await streamList('doList', data.doList);
      }
    }
  };

  /**
   * 점수 스트리밍
   */
  const streamScore = async (targetScore: number) => {
    const step = Math.max(1, Math.floor(targetScore / (config.score?.steps || 20)));
    let currentScore = 0;

    while (currentScore < targetScore) {
      currentScore = Math.min(currentScore + step, targetScore);
      setStreamingData(prev => prev ? { ...prev, score: currentScore } as T : null);
      await new Promise(resolve => setTimeout(resolve, config.score?.duration || 50));
    }
  };

  /**
   * 텍스트 필드 스트리밍
   */
  const streamTextField = async (field: string, text: string, textConfig: any) => {
    const chunkSize = textConfig.chunkSize || 12;
    let currentText = "";

    for (let i = 0; i < text.length; i += chunkSize) {
      const chunk = text.slice(i, i + chunkSize);
      currentText += chunk;
      setStreamingData(prev => prev ? { ...prev, [field]: currentText } as T : null);
      await new Promise(resolve => setTimeout(resolve, textConfig.delay || 50));
    }
  };

  /**
   * 카테고리 스트리밍
   */
  const streamCategories = async (categories: any) => {
    setStreamingData(prev => prev ? { ...prev, categories } as T : null);
    await new Promise(resolve => setTimeout(resolve, config.categories?.delay || 200));
  };

  /**
   * 리스트 스트리밍
   */
  const streamList = async (field: string, list: any[]) => {
    setStreamingData(prev => prev ? { ...prev, [field]: list } as T : null);
    await new Promise(resolve => setTimeout(resolve, config.lists?.delay || 200));
  };

  return { 
    streamingData, 
    finalData, 
    isStreaming, 
    startStreaming 
  };
};
