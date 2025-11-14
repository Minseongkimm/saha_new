import { SajuData } from '../../types/streaming';
import { supabase } from '../database/supabaseClient';
import { convertDbFormatToSajuResult } from './calculatedSajuUtils';

/**
 * DB에서 가져온 birth_info 데이터를 SajuData 형태로 변환
 * calculated_saju 테이블에서 사주 데이터 조회
 */
export const formatSajuData = async (birthData: any): Promise<SajuData> => {
  let parsedSajuData: any = {};

  // calculated_saju 테이블에서 사주 데이터 조회
  const { data: calculatedSaju, error: calculatedSajuError } = await supabase
    .from('calculated_saju')
    .select('*')
    .eq('birth_info_id', birthData.id)
    .single();

  if (calculatedSaju && !calculatedSajuError) {
    // 새 테이블 데이터를 SajuResult 형식으로 변환
    parsedSajuData = convertDbFormatToSajuResult(calculatedSaju);
  } else {
    // calculated_saju가 없으면 빈 객체 (마이그레이션 전 데이터는 없을 수 있음)
    console.warn('calculated_saju 데이터를 찾을 수 없습니다:', birthData.id);
    parsedSajuData = {};
  }

  return {
    name: birthData.name || '사용자',
    birthYear: birthData.year ?? null,
    birthMonth: birthData.month ?? null,
    birthDay: birthData.day ?? null,
    birthHour: birthData.hour ?? null,
    birthMinute: birthData.minute ?? null,
    gender: birthData.gender ?? null,
    calendarType: birthData.calendar_type ?? null,
    leapMonth: birthData.is_leap_month ?? false,
    timeUnknown: birthData.is_time_unknown ?? false,
    calculatedSaju: parsedSajuData,
    pillars: parsedSajuData?.pillars || {},
    tenGods: parsedSajuData?.ten_gods || {},
    lifeStages: parsedSajuData?.life_stages || {},
  };
};

/**
 * 사주 데이터 유효성 검사
 */
export const validateSajuData = (data: SajuData | null): boolean => {
  if (!data) return false;
  if (!data.calculatedSaju) return false;
  
  const { calculatedSaju } = data;
  
  // 필수 간지 데이터 확인
  if (!calculatedSaju.yearHangulGanji || 
      !calculatedSaju.monthHangulGanji || 
      !calculatedSaju.dayHangulGanji || 
      !calculatedSaju.timeHangulGanji) {
    return false;
  }
  
  return true;
};
