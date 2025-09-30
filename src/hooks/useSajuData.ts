import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { SajuCache } from '../utils/sajuCache';
import { SajuData } from '../types/streaming';
import { formatSajuData } from '../utils/sajuDataUtils';

/**
 * 사주 데이터 로딩 훅
 * 캐시 → DB 순서로 데이터 조회
 */
export const useSajuData = () => {
  const [sajuData, setSajuData] = useState<SajuData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSajuData();
  }, []);

  const loadSajuData = async () => {
    try {
      // 사용자 인증 확인
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setError('사용자 인증에 실패했습니다.');
        return null;
      }

      // 1. 캐시에서 먼저 확인 (로딩 표시 없이)
      const cachedData = await SajuCache.getCachedCalculatedSaju(user.id);
      if (cachedData) {
        setSajuData(cachedData);
        return cachedData;
      }

      // 2. 캐시가 없을 때만 로딩 상태 시작
      setLoading(true);

      // 3. DB에서 조회
      const { data: birthData, error: birthError } = await supabase
        .from('birth_infos')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (birthData && !birthError) {
        // 데이터 변환
        const formattedData = formatSajuData(birthData);
        
        // 캐시에 저장
        await SajuCache.setCachedCalculatedSaju(user.id, formattedData);
        
        setSajuData(formattedData);
        setLoading(false);
        return formattedData;
      } else {
        setError('사주 정보를 찾을 수 없습니다.');
        setLoading(false);
        return null;
      }
    } catch (err) {
      console.error('Error loading saju data:', err);
      setError('사주 데이터 로딩 중 오류가 발생했습니다.');
      setLoading(false);
      return null;
    }
  };

  return { sajuData, loading, error, loadSajuData };
};
